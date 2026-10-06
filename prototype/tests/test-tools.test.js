import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestionPresets, requestMetrics, snapshotTestResult, conversationExchanges, actionResultText } from '../public/test-tools.js';

test('캐릭터를 바꾸면 해당 인물의 대화만 시간순으로 표시하고 원본은 유지한다', () => {
  const runs = [{ id: 1, targets: [{ key: 'judy' }, { key: 'panam' }] }, { id: 2, targets: [{ key: 'judy' }] }];
  const before = structuredClone(runs);
  assert.deepEqual(conversationExchanges(runs, ['panam'], {}).map(e => [e.run.id, e.targets.map(t => t.key)]), [[1, ['panam']]]);
  assert.deepEqual(conversationExchanges(runs, ['judy'], {}).map(e => e.run.id), [1, 2]);
  assert.deepEqual(runs, before);
});

test('새 대화는 선택 인물의 이전 화면 기록만 제외하고 다른 인물의 기록을 보존한다', () => {
  const runs = [{ id: 1, targets: [{ key: 'judy' }, { key: 'panam' }] }, { id: 2, targets: [{ key: 'judy' }] }];
  assert.deepEqual(conversationExchanges(runs, ['judy'], { judy: 2 }), []);
  assert.deepEqual(conversationExchanges(runs, ['judy', 'panam'], { judy: 1 }).map(e => [e.run.id, e.targets.map(t => t.key)]),
    [[1, ['panam']], [2, ['judy']]]);
});

test('이름 프리셋은 공통 플레이어 신원에서 받아 구성한다', () => {
  assert.equal(buildQuestionPresets('V').find(p=>p.id==='memory-intro').question,'내 이름은 V야. 나는 파란색을 좋아해. 기억해줘.');
  assert.throws(()=>buildQuestionPresets(''));
});

test('미제공 사용량을 0으로 처리하지 않고 실제 0·부분 제공과 구별한다', () => {
  const done = { status: 'completed', mode: 'openai', elapsed_ms: 1234 };
  assert.match(requestMetrics(done, 9000), /입력 미제공 \/ 출력 미제공 토큰/);
  assert.match(requestMetrics({ ...done, usage: { input_tokens: 1500, output_tokens: 0 } }, 9000), /입력 1,500 \/ 출력 0 토큰/);
  assert.match(requestMetrics({ ...done, usage: { input_tokens: 1500, output_tokens: 500, reasoning_tokens: 480 } }, 9000), /추론 480 토큰/);
  assert.match(requestMetrics({ ...done, usage: { input_tokens: null, output_tokens: 24 } }, 9000), /입력 미제공 \/ 출력 24 토큰/);
  assert.match(requestMetrics({ ...done, mode: 'mock' }, 9000), /API 사용 없음/);
});

test('대기 시간만 증가하고 완료·취소·실패 시간은 고정한다', () => {
  assert.match(requestMetrics({ status: 'pending', started_ms: 1000 }, 3500), /요청 중 · 2.5초/);
  assert.match(requestMetrics({ status: 'pending', started_ms: 1000, cancelling: true }, 3500), /취소 중/);
  for (const [status, label] of [['cancelled', '취소됨'], ['failed', '실패']]) {
    const result = { status, mode: 'codex', elapsed_ms: 1250 };
    const text = requestMetrics(result, 9000);
    assert.ok(text.startsWith(`${label} · 1.3초`));
    assert.match(text, /토큰 미확인/);
    assert.equal(requestMetrics(result, 12000), text);
  }
});

test('다음 대화가 진행되어도 이전 답변과 주입 지식 스냅샷을 보존한다', () => {
  const engine = { lastReply: { dialogue: '첫 답변', usage: { input_tokens: 10 } }, lastSelection: { knowledge: [{ statement: '첫 근거' }] }, lastPrompt: { user: '첫 질문' } };
  const saved = snapshotTestResult(engine);
  engine.lastReply.dialogue = '두 번째 답변'; engine.lastSelection.knowledge[0].statement = '두 번째 근거'; engine.lastPrompt.user = '두 번째 질문';
  assert.equal(saved.reply.dialogue, '첫 답변'); assert.equal(saved.selection.knowledge[0].statement, '첫 근거'); assert.equal(saved.prompt.user, '첫 질문');
});

test('UF-65 대사별 행동 의미·없음·모의 실행을 구분하고 이전 행동 결과를 보존한다', () => {
  assert.equal(actionResultText({ reply: { action: null } }), '행동: 없음');
  const engine = { lastReply: { action: { action_id: 'play_gesture', args: { gesture_ref: 'amm_wave' } } }, lastActionOutcome: null };
  const selected = snapshotTestResult(engine);
  assert.match(actionResultText(selected), /서서 짧게 손을 흔듦 · 선택됨 · 웹에서는 재생 안 함/);
  engine.lastReply = { action: { action_id: 'end_conversation', args: {} } };
  engine.lastActionOutcome = { status: 'succeeded' };
  const ended = snapshotTestResult(engine);
  assert.match(actionResultText(ended), /대화 종료 · 모의 실행 완료/);
  engine.lastActionOutcome.status = 'failed';
  assert.equal(ended.actionOutcome.status, 'succeeded');
  assert.match(actionResultText(selected), /손을 흔듦/);
});
