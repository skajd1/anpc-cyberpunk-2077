import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestionPresets, requestMetrics } from '../public/test-tools.js';

test('이름 프리셋은 공통 플레이어 신원에서 받아 구성한다', () => {
  assert.equal(buildQuestionPresets('V').find(p=>p.id==='memory-intro').question,'내 이름은 V야. 기억해줘.');
  assert.throws(()=>buildQuestionPresets(''));
});

test('미제공 사용량을 0으로 처리하지 않고 실제 0·부분 제공과 구별한다', () => {
  const done = { status: 'completed', mode: 'openai', elapsed_ms: 1234 };
  assert.match(requestMetrics(done, 9000), /입력 미제공 \/ 출력 미제공 토큰/);
  assert.match(requestMetrics({ ...done, usage: { input_tokens: 1500, output_tokens: 0 } }, 9000), /입력 1,500 \/ 출력 0 토큰/);
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
