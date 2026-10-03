import test from 'node:test';
import assert from 'node:assert/strict';
import { TestMemory, extractLocalSummary, makeSummaryInput } from '../public/memory.js';
import { generateOpenAI } from '../openai.js';
const journal = (session_id = 'session-a') => Array.from({ length: 20 }, (_, i) => ({ event_id: `e${i}`, session_id,
  event_type: i % 2 ? 'npc_utterance' : 'player_utterance', role: i % 2 ? 'npc' : 'player',
  text: i === 0 ? '나는 파란색을 좋아해.' : i === 18 ? '이제 라면 이야기를 했네.' : `대화 내용 ${i}` }));

test('한 세션 전체를 한 요약으로 정리하고 이전 원문·세부 항목은 저장하지 않는다', async () => {
  const memory = new TestMemory(), events = journal(); let source;
  const result = await memory.finish('session-a', events, async input => { source = input; return { reply: { summary: 'V가 색 취향과 라면에 관해 이야기했다.' }, mode: 'mock' }; });
  assert.equal(result.committed, true); assert.equal(source.length, 20); assert.equal(source.at(-1).event_id, 'e19');
  assert.deepEqual(memory.records, [{ session_id: 'session-a', summary: 'V가 색 취향과 라면에 관해 이야기했다.' }]);
  assert.deepEqual(Object.keys(memory.snapshot()).sort(), ['records', 'version']);
  assert.equal(memory.recall([]).recent.length, 0); assert.deepEqual(memory.recall([]).session_summaries, [memory.records[0].summary]);
  await memory.finish('session-a', events); assert.equal(memory.records.length, 1);
});

test('요약 실패·빈 값·추가 필드·여러 줄이면 로컬 한 줄을 유지하고 재시도하지 않는다', async () => {
  for (const reply of [{ summary: '' }, { summary: '가'.repeat(321) }, { summary: '첫 줄\n둘째 줄' }, { summary: '짧은 기억', knowledge: '새 지식' }]) {
    const memory = new TestMemory(); let calls = 0;
    await memory.finish('session-a', journal(), async () => { calls++; return { reply }; });
    assert.equal(memory.records.length, 1); assert.equal(memory.records[0].summary, extractLocalSummary(journal()).summary);
    assert.equal(calls, 1); assert.equal(memory.status, 'local_extract');
  }
  const memory = new TestMemory(); await memory.finish('session-a', journal(), async () => { throw new Error('network_error'); });
  assert.equal(memory.records.length, 1);
});

test('다른 세션을 합치지 않고 요약이 진행 중이어도 다음 세션은 즉시 로컬 기록한다', async () => {
  const memory = new TestMemory();
  await assert.rejects(memory.finish('wrong-session', journal()), /session_scope_mismatch/);
  let finish; const pending = memory.finish('session-a', journal(), () => new Promise(resolve => { finish = resolve; }));
  await memory.finish('session-b', journal('session-b'), async () => { throw new Error('호출하면 안 됨'); });
  assert.equal(memory.records.length, 2); assert.equal(memory.records[1].session_id, 'session-b');
  finish({ reply: { summary: '첫 세션 요약이다.' }, mode: 'mock' }); await pending;
  assert.equal(memory.records[0].summary, '첫 세션 요약이다.');
});

test('로드·삭제 뒤 늦은 요약을 폐기하고 저장 순간의 로컬 요약을 정확히 복원한다', async () => {
  const memory = new TestMemory(); let finish;
  const pending = memory.finish('session-a', journal(), () => new Promise(resolve => { finish = resolve; }));
  const saved = memory.snapshot(); memory.restore(saved);
  finish({ reply: { summary: '저장 이후의 미래 요약' } }); assert.equal((await pending).stale, true);
  assert.deepEqual(memory.snapshot(), saved);
  memory.records[0].summary = '작업 사본'; assert.notEqual(saved.records[0].summary, memory.records[0].summary);
});

test('최근 세션 3개만 전달하고 빈 세션은 기록하지 않으며 보관은 64개로 제한한다', async () => {
  const memory = new TestMemory(); await memory.finish('empty', []);
  assert.equal(memory.records.length, 0);
  for (let i = 0; i < 67; i++) await memory.finish(`s${i}`, journal(`s${i}`));
  assert.equal(memory.records.length, 64); assert.equal(memory.records[0].session_id, 's3');
  assert.equal(memory.recall([]).session_summaries.length, 3);
  assert.equal(memory.recall(journal()).recent.length, 6);
});

test('요약 입력은 같은 세션 전체의 발화와 화자·digest만 사용한다', async () => {
  const events = journal(); events.push({ event_id: 'outfit', session_id: 'session-a', event_type: 'outfit_observation', text: '검은 재킷' });
  const input = await makeSummaryInput(events);
  assert.equal(input.source_events.length, 20); assert.equal(input.source_events.at(-1).payload.text, '대화 내용 19');
  assert.ok(input.source_events.every(e => e.session_id === 'session-a'));
  assert.match(input.source_digest, /^[a-f0-9]{64}$/); assert.deepEqual(input.existing_relevant_memories, []);
});

test('요약 API는 한 줄 summary 구조와 512토큰·none을 사용한다', async () => {
  let body; const reply = { summary: 'V가 색 취향과 근황을 이야기했다.' };
  const result = await generateOpenAI({ prompt: { instructions: '세션 요약', input: [] }, apiKey: 'test-only', model: 'gpt-6-luna', memorySummary: true,
    fetchImpl: async (_url, options) => { body = JSON.parse(options.body); return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reply) }] }] }); } });
  assert.equal(body.text.format.name, 'memory_summary'); assert.equal(body.max_output_tokens, 512);
  assert.equal(body.reasoning.effort, 'none'); assert.equal(body.store, false); assert.equal(body.previous_response_id, undefined);
  assert.deepEqual(body.text.format.schema.required, ['summary']); assert.deepEqual(result.reply, reply);
});
