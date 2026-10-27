import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { captureFeedbackRequests, pairFeedbackRequests, applySavedFeedbackInstructions, DIVERSE_FEEDBACK_SUITE } from '../../scripts/prepare-feedback-evaluation.mjs';
import { sha256 } from '../../scripts/prepare-lore-evaluation.mjs';
import { runLoreEvaluation } from '../../scripts/run-lore-evaluation.mjs';
import { loreDialogueReport } from '../../scripts/lore-dialogue-report.mjs';

const after = await captureFeedbackRequests();
const before = structuredClone(after);
before.prompt_version = 'test-baseline';
for (const pair of before.pairs) {
  pair.prompt.instructions += '\n검사 전용 기준 지침';
  pair.prompt_sha256 = sha256(pair.prompt);
}
const prepared = pairFeedbackRequests(before, after);
const diverse = await captureFeedbackRequests({ suitePath: DIVERSE_FEEDBACK_SUITE });

test('다양한 상황의 앞선 대화를 두 비교안에 그대로 전달하고 검수표에도 표시한다', () => {
  const originalHash = sha256(before);
  const result = applySavedFeedbackInstructions(before, diverse);
  assert.equal(result.pairs.length, 12);
  assert.equal(new Set(result.pairs.map(p => p.family)).size, 12);
  assert.equal(result.pairs.filter(p => p.history.length).length, 4);
  assert.equal(sha256(before), originalHash);
  assert.equal(result.baseline_origin_sha256, originalHash);
  assert.match(result.review_intro, /12개 상황/);
  const html = loreDialogueReport(result);
  assert.match(html, /앞선 대화 · 검수용 가상 상황/);
  for (const pair of result.pairs) {
    assert.deepEqual(pair.preflight_errors, []);
    assert.deepEqual(pair.arms[0].prompt.input, pair.arms[1].prompt.input);
    assert.equal(pair.arms[0].prompt.instructions, before.pairs[0].prompt.instructions);
    assert.equal(pair.arms[1].prompt.instructions, after.pairs[0].prompt.instructions);
    if (pair.history.length) {
      assert.deepEqual(pair.arms[1].prompt.input.slice(-pair.history.length - 1, -1),
        pair.history.map(t => ({ role: t.role === 'npc' ? 'assistant' : 'user', content: t.text })));
      for (const turn of pair.history) assert.ok(html.includes(turn.text));
    }
  }
});

test('저장 지침이 손상됐거나 출력 언어·계약이 다른 경우 새 상황에 적용하지 않는다', () => {
  const changed = structuredClone(before);
  changed.pairs[0].prompt.instructions += '변경';
  assert.throws(() => applySavedFeedbackInstructions(changed, diverse), /원본 해시/);
  const koFirst = { ...diverse, voice_order: 'ko_first' };
  assert.throws(() => applySavedFeedbackInstructions(before, koFirst), /언어 순서/);
  const otherSchema = structuredClone(diverse); otherSchema.pairs[0].schema.required = [];
  assert.throws(() => applySavedFeedbackInstructions(before, otherSchema), /출력 계약/);
});

test('피드백 비교 10개는 필요한 사실을 검색하고 타 인물 관점을 차단한다', () => {
  assert.equal(prepared.pairs.length, 10);
  assert.equal(prepared.planned_requests, 20);
  assert.equal(new Set(prepared.pairs.map(p => p.case_id)).size, 10);
  assert.equal(prepared.voice_order, 'ja_first');
  for (const pair of prepared.pairs) {
    assert.deepEqual(pair.preflight_errors, [], pair.case_id);
    assert.deepEqual(pair.arms[0].prompt.input, pair.arms[1].prompt.input);
    assert.notEqual(pair.arms[0].prompt.instructions, pair.arms[1].prompt.instructions);
  }
});

test('피드백 비교는 질문·사실·관계·출력 계약·기준 해시가 달라지면 중단한다', () => {
  const changes = [
    current => { current.suite_sha256 = 'changed'; },
    current => { current.pairs[0].reference.relationship = 'changed'; },
    current => { current.pairs[0].schema.required = []; },
    current => { current.pairs[0].prompt.input.at(-1).content = '바뀐 질문'; current.pairs[0].prompt_sha256 = sha256(current.pairs[0].prompt); },
    current => { current.pairs[0].prompt_sha256 = 'changed'; }
  ];
  for (const change of changes) {
    const current = structuredClone(after); change(current);
    assert.throws(() => pairFeedbackRequests(before, current));
  }
  assert.throws(() => pairFeedbackRequests(after, after), /동일/);
});

test('수정 전후 실행은 두 비교안을 집계하고 검수표에 길이 초과를 표시한다', async () => {
  const out = await mkdtemp(join(tmpdir(), 'anpc-feedback-'));
  try {
    const result = await runLoreEvaluation({ out, apiKey: 'not-a-real-key', limit: 1, repetitions: 1,
      prepare: async () => structuredClone(prepared), generate: async () => ({ status: 'completed',
        reply: { dialogue: '검사용 대사', follow_up: null, speech_text: '確認用。' },
        diagnostics: { ko_chars: 46, ko_over_limit: true } }) });
    assert.equal(result.completed_requests, 2);
    assert.equal(result.baseline_prompt_version, 'test-baseline');
    assert.deepEqual(Object.keys(result.arms), ['before_feedback', 'after_feedback']);
    assert.equal(result.arms.after_feedback.ko_over_limit, 1);
    const html = await readFile(join(out, 'review.html'), 'utf8');
    assert.match(html, /피드백 반영 전후/);
    assert.match(html, /자막 46자 · 45자 초과/);
    assert.doesNotMatch(html, /관점 필드 유무만/);
    const data = JSON.parse(html.match(/<script id="review-data" type="application\/json">([^]*?)<\/script>/)[1]);
    assert.equal(data.items.length, 1);
    assert.deepEqual(new Set(Object.values(data.items[0].labels)), new Set(['before_feedback', 'after_feedback']));
    assert.ok(!html.includes('not-a-real-key'));
    const unsafe = loreDialogueReport({ ...prepared, review_title: '<img src=x>', review_intro: '</script><b>x</b>' });
    assert.ok(!unsafe.includes('<img src=x>')); assert.ok(!unsafe.includes('</script><b>x</b>'));
  } finally { await rm(out, { recursive: true, force: true }); }
});
