import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadPrototypeData } from '../server.js';
import { compileResearchTurn } from '../public/research.js';
import { assemblePrompt } from '../public/core.js';

const { research: bundle, base } = await loadPrototypeData();
const review = JSON.parse(await readFile(new URL('../../content/evaluation/lore-review-result-v1.json', import.meta.url), 'utf8'));
const context = { recent_turns: [], observations: {}, memory: null };
const cases = [
  ['judy', 'first', 'BD 원본 감각 편집은?', 'BD_EDITING'],
  ['judy', 'first', '불법 BD의 안전은?', 'BD_RISK'],
  ['judy', 'first', 'BD 체험 전에 감각 프로필 보정은?', 'JUDY_BD_CALIBRATION'],
  ['panam', 'saul_saved', '스콜피온과 미치는 어떤 동료야?', 'PANAM_CLAN_FRIENDS'],
  ['panam', 'saul_saved', '사울과 바이오테크니카 기업 의존에 대한 이견은?', 'PANAM_CORP_INDEPENDENCE'],
  ['panam', 'saul_saved', '미치랑 화물 운송한 적 있어?', 'PANAM_CARGO_EXPERIENCE']
];
function compile([npcKey, relationshipStage, playerText], data = bundle, overrides = {}) {
  return compileResearchTurn({ bundle: data, npcKey, playerText, context,
    settings: { allowDraft: true, configuration: 'knowledge', relationshipStage, alive: true, free: true,
      basicKnowledge: true, relicKnown: false, relicDisclosed: false, ...overrides } });
}
const row = fact => review.items.find(item => item.knowledge_id === bundle.knowledge.find(k => k.fact_id === fact && k.perspective)?.id);

test('UF-36 검수된 6개 관점을 원래 진술과 함께 최종 모델 입력에 보내고 승인 메타데이터는 제외한다', () => {
  assert.equal(bundle.knowledge.filter(k => k.perspective).length, 6);
  for (const sample of cases) {
    const turn = compile(sample);
    const item = turn.context.knowledge.find(k => k.fact_id === sample[3]);
    assert.ok(item, sample[3]);
    assert.equal(item.statement, bundle.facts.find(f => f.id === sample[3]).statement);
    assert.equal(item.perspective, row(sample[3]).final_perspective);
    const original = bundle.knowledge.find(k => k.id === row(sample[3]).knowledge_id);
    assert.equal(item.certainty, original.certainty);
    assert.equal(item.disclosure, original.disclosure);
    assert.equal(original.review_status, 'draft', '관점 채택은 지식 전체 승인이 아니다.');
    const prompt = assemblePrompt(base, turn.persona, turn.context, sample[2]);
    const text = prompt.input.find(m => m.content.startsWith('현재 상황 데이터')).content.split('\n').slice(1).join('\n');
    const sent = JSON.parse(text).knowledge.find(k => k.fact_id === sample[3]);
    assert.equal(sent.perspective, item.perspective);
    assert.equal(sent.statement, item.statement);
    for (const metadata of ['review_status', 'review_ref', 'source_sha256', 'edited_perspective', 'original_perspective']) assert.ok(!text.includes(metadata));
    assert.match(prompt.instructions, /관점 문장을 그대로 반복하거나 반드시 발화하지 않는다/);
  }
});

test('UF-37 관점 채택은 인지·분야·소유·단계·관련성 선별을 우회하지 않는다', () => {
  for (const sample of cases) {
    for (const overrides of [{ basicKnowledge: false }, { configuration: 'card' }]) {
      assert.ok(!JSON.stringify(compile(sample, bundle, overrides).context).includes(row(sample[3]).final_perspective));
    }
    const greeting = [...sample]; greeting[2] = '안녕';
    assert.ok(!JSON.stringify(compile(greeting).context).includes(row(sample[3]).final_perspective));
    const otherNpc = [...sample]; otherNpc[0] = sample[0] === 'judy' ? 'panam' : 'judy'; otherNpc[1] = otherNpc[0] === 'judy' ? 'first' : 'saul_saved';
    assert.ok(!JSON.stringify(compile(otherNpc).context).includes(row(sample[3]).final_perspective));
    for (const mutate of [
      (b, k) => { k.access_condition = { field: 'content.unregistered', op: 'eq', value: true }; },
      (b, k) => { b.cards.find(c => c.character_key === k.owner_key).knowledge_profile.domains.find(d => d.domain_id === k.domain_id).depth = 'unknown'; },
      (b, k) => { b.cards.find(c => c.character_key === k.owner_key).knowledge_ids = []; },
      (b, k) => { b.facts.find(f => f.id === k.fact_id).validity_condition = { field: 'content.era', op: 'eq', value: '2020' }; }
    ]) {
      const altered = structuredClone(bundle), k = altered.knowledge.find(k => k.id === row(sample[3]).knowledge_id);
      mutate(altered, k);
      assert.ok(!JSON.stringify(compile(sample, altered).context).includes(row(sample[3]).final_perspective));
    }
  }
  assert.ok(!JSON.stringify(compile(cases[4], bundle, { relationshipStage: 'first' }).context).includes(row(cases[4][3]).final_perspective));
});

test('미검수·보류 관점과 회피·비공개 지식에서 관점 원문이 새지 않는다', () => {
  for (const sample of cases) {
    for (const mutate of [
      k => { k.perspective.review_status = 'draft'; },
      k => { k.perspective.review_status = 'hold'; },
      k => { k.disclosure = 'evasive'; },
      k => { k.disclosure = 'withheld'; },
      k => { k.perspective.text = '가'.repeat(61); },
      k => { k.perspective.text = ' '; }
    ]) {
      const altered = structuredClone(bundle), k = altered.knowledge.find(k => k.id === row(sample[3]).knowledge_id);
      mutate(k);
      const turn = compile(sample, altered), item = turn.context.knowledge.find(k => k.fact_id === sample[3]);
      assert.equal(item?.perspective, undefined);
      assert.ok(!JSON.stringify(turn.context).includes(row(sample[3]).final_perspective));
      if (k.disclosure === 'evasive') { assert.equal(item.statement, undefined); assert.ok(item.response_constraint); }
    }
  }
});

const lua = process.env.ANPC_LUA ?? 'lua';
const available = !spawnSync(lua, ['-v']).error;
test('검수된 6개와 단계 차단 사례를 실제 CET identity → bridge 모델 입력과 비교한다', { skip: !available && 'Lua 실행기가 필요합니다.' }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'anpc-perspective-'));
  try {
    const input = [...cases, ['panam', 'first', cases[4][2], cases[4][3]], ['judy', 'first', '안녕', 'none']];
    const path = join(directory, 'cases.json');
    await writeFile(path, JSON.stringify({ cases: input.map(([npc_key, relationship_stage, player_input], index) => ({
      case_id: String(index), npc_key, player_input, state: { relationship_stage }, history: [] })) }));
    const result = spawnSync(lua, ['game/tests/retrieval-cases.lua', path], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const results = JSON.parse(result.stdout);
    for (const [index, sample] of input.entries()) {
      const web = compile(sample).context.knowledge, cet = results[index].context.knowledge;
      assert.deepEqual(cet.map(k => [k.fact_id, k.perspective]), web.map(k => [k.fact_id, k.perspective]), sample[3]);
      const sent = JSON.stringify(results[index].context);
      for (const metadata of ['review_ref', 'source_sha256', 'original_perspective']) assert.ok(!sent.includes(metadata));
    }
    const blocked = spawnSync(lua, ['game/tests/lore-perspective.test.lua'], { encoding: 'utf8' });
    assert.equal(blocked.status, 0, blocked.stdout + blocked.stderr);
    assert.match(blocked.stdout, /CET 관점 차단 10개 통과/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
