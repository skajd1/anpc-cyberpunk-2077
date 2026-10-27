import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareLoreEvaluation, withoutPerspectives } from '../../scripts/prepare-lore-evaluation.mjs';
import { generateLoreReply, runLoreEvaluation } from '../../scripts/run-lore-evaluation.mjs';
import { loreDialogueReport } from '../../scripts/lore-dialogue-report.mjs';

const prepared = await prepareLoreEvaluation();
const fixture = { emotion: 'neutral', delivery: 'normal', speech_text: '感覚情報を調整するんだ。',
  dialogue: '감각 정보를 조절하는 일이야.', follow_up: null, intent: 'answer', action: null };
const temporary = async fn => {
  const out = await mkdtemp(join(tmpdir(), 'anpc-lore-dialogue-'));
  try { await fn(out); } finally { await rm(out, { recursive: true, force: true }); }
};

test('관점 비교 18개는 질문·관계·이력·베이스·예시·읽기·출력 스키마를 고정하고 관점만 바꾼다', () => {
  assert.equal(prepared.pairs.length, 18); assert.equal(prepared.planned_requests, 72);
  assert.equal(new Set(prepared.pairs.map(p => p.case_id)).size, 18);
  for (const pair of prepared.pairs) {
    assert.deepEqual(withoutPerspectives(pair.arms[1].prompt), pair.arms[0].prompt);
    assert.equal(pair.arms[0].prompt.instructions, pair.arms[1].prompt.instructions);
    assert.equal(pair.arms[0].prompt.input.at(-1).content, pair.player_input);
    if (pair.family === 'direct') {
      assert.deepEqual(pair.preflight_errors, []);
      assert.notEqual(pair.arms[0].prompt_sha256, pair.arms[1].prompt_sha256);
    }
  }
  assert.equal(prepared.pairs.find(p => p.case_id === 'panam_corp_stage_early').preflight_errors.length, 0);
  for (const pair of prepared.pairs.filter(p => p.family === 'owner_boundary')) assert.deepEqual(pair.preflight_errors, []);
});

test('고정한 18개 입력에서 BD 안전 지식·화제 전환·관계·소유 경계를 모두 충족한다', () => {
  for (const pair of prepared.pairs) assert.deepEqual(pair.preflight_errors, [], pair.case_id);
  for (const pair of prepared.pairs.filter(p => p.family === 'topic_shift')) assert.deepEqual(pair.reference.allowed_knowledge, []);
});

const lua = process.env.ANPC_LUA ?? 'lua';
test('18개 비교 입력의 최종 웹·CET 사실과 관점이 일치한다', { skip: Boolean(spawnSync(lua, ['-v']).error) && 'Lua 실행기가 필요합니다.' }, () => temporary(async out => {
  const path = join(out, 'cases.json');
  await writeFile(path, JSON.stringify({ cases: prepared.pairs.map(pair => ({ case_id: pair.case_id, npc_key: pair.npc_key,
    state: { relationship_stage: pair.relationship_stage }, player_input: pair.player_input, history: pair.history })) }));
  const result = spawnSync(lua, ['game/tests/retrieval-cases.lua', path], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const cet = JSON.parse(result.stdout);
  assert.equal(cet.length, prepared.pairs.length);
  for (const [i, pair] of prepared.pairs.entries()) {
    assert.deepEqual(cet[i].context.knowledge.map(k => [k.fact_id, k.statement, k.perspective]),
      pair.reference.allowed_knowledge.map(k => [k.fact_id, k.statement, k.perspective]), pair.case_id);
  }
}));

test('키가 없으면 준비 자료만 남기고 실제 생성·모의 응답 기록을 만들지 않는다', () => temporary(async out => {
  const result = await runLoreEvaluation({ out, apiKey: '', limit: 1, repetitions: 1,
    generate: () => { throw new Error('키 없이 호출하면 안 됨'); } });
  assert.equal(result.status, 'blocked_missing_key'); assert.equal(result.completed_requests, 0);
  assert.match(await readFile(join(out, 'review.html'), 'utf8'), /생성 미실행/);
  await assert.rejects(readFile(join(out, 'responses.jsonl')), { code: 'ENOENT' });
}));

test('키·Authorization은 저장하지 않고 음성 스키마·store:false로 요청하며 거절·미완료를 실패로 구분한다', async () => {
  const job = { pair: prepared.pairs[0], arm: prepared.pairs[0].arms[1] };
  const send = payload => generateLoreReply({ job, model: 'gpt-6-luna', effort: 'none', apiKey: 'not-a-real-key',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      const body = JSON.parse(options.body);
      assert.equal(body.store, false); assert.ok(body.text.format.schema.properties.speech_text);
      assert.equal(body.input.at(-1).content, job.pair.player_input);
      return { ok: true, json: async () => payload };
    } });
  const result = await send({ status: 'completed', model: 'fixture-model', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(fixture) }] }] });
  assert.equal(result.status, 'completed'); assert.equal(result.validation_error, null);
  assert.equal(result.speech_error, null); assert.equal(result.usage, null);
  assert.ok(!JSON.stringify(result).includes('not-a-real-key'));
  assert.equal((await send({ status: 'incomplete', output: [] })).error, 'incomplete_response');
  assert.equal((await send({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] })).error, 'provider_refused');
});

test('부재 토큰은 null로 보존하고 모든 반복·비교안 기록 및 A/B 검수표를 만들며 기존 결과 덮어쓰기를 막는다', () => temporary(async out => {
  const options = { out, apiKey: 'not-a-real-key', limit: 1, repetitions: 2, concurrency: 2,
    generate: async () => ({ status: 'completed', reply: fixture, usage: null, latency_ms: 1 }) };
  const result = await runLoreEvaluation(options);
  assert.equal(result.completed_requests, 4); assert.equal(result.quality_verdict, 'unreviewed');
  assert.equal(result.arms.with_perspective.input_tokens, null);
  const records = (await readFile(join(out, 'responses.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(new Set(records.map(r => r.repetition + r.arm)).size, 4);
  assert.ok(!JSON.stringify(result).includes('not-a-real-key'));
  const html = await readFile(join(out, 'review.html'), 'utf8');
  assert.match(html, /판정 가능한 쌍 2개/);
  assert.equal((html.match(/data-pair=/g) ?? []).length, 2);
  const source = JSON.parse(html.match(/<script id="review-data" type="application\/json">([^]*?)<\/script>/)[1]);
  assert.deepEqual(new Set(Object.values(source.items[0].labels)), new Set(['with_perspective','without_perspective']));
  await assert.rejects(runLoreEvaluation(options), { code: 'EEXIST' });
}));

test('인증 실패는 후속 유료 요청을 중단하고 미실행을 성공으로 집계하지 않는다', () => temporary(async out => {
  let calls = 0;
  const result = await runLoreEvaluation({ out, apiKey: 'not-a-real-key', limit: 2, repetitions: 1, concurrency: 1,
    generate: async () => { calls++; return { status: 'failed', error: 'http_401' }; } });
  assert.equal(calls, 1); assert.equal(result.completed_requests, 0);
  assert.equal(result.unrun_requests, 3); assert.equal(result.status, 'partial');
  const html = loreDialogueReport(prepared, [{ case_id: prepared.pairs[0].case_id, repetition: 1, arm: 'with_perspective', status: 'failed', error: '</script><b>unsafe</b>' }]);
  assert.ok(!html.includes('</script><b>unsafe</b>'));
  assert.match(html, /판정 가능한 쌍 0개/);
}));
