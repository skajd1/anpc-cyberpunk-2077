import test from 'node:test';
import assert from 'node:assert/strict';
import { TestMemory, extractLocalSummary, makeSummaryInput } from '../public/memory.js';
import { generateOpenAI } from '../openai.js';
const journal = () => Array.from({ length: 20 }, (_, i) => ({ event_id: `e${i}`, event_type: i % 2 ? 'npc_utterance' : 'player_utterance',
  role: i % 2 ? 'npc' : 'player', text: i === 0 ? '나는 라면을 좋아해. 기억해 둬.' : `별도 화제 ${i}` }));

test('최근 6개 원문을 제외한 기억을 요약·검색하며 같은 사건을 중복 전송하지 않는다', async () => {
  const memory = new TestMemory(), events = journal();
  assert.equal((await memory.consolidate(events)).committed, true);
  assert.ok(memory.records.every(r => !r.evidence_event_ids.some(id => ['e14','e15','e16','e17','e18','e19'].includes(id))));
  const recalled = memory.recall(events, '내가 좋아하는 라면 기억해?');
  assert.equal(recalled.recent.length, 6); assert.ok(recalled.long_term.some(r => r.text.includes('라면')));
  assert.ok(!recalled.recalled_events.some(e => e.event_ref === 'e0'));
  assert.equal(memory.records[0].epistemic_status, 'player_claim');
  assert.equal(events.length, 20); assert.equal(new TestMemory().recall([], '라면').long_term.length, 0);
});

test('요약의 누락을 원문 검색으로 보완하고 실패 뒤 자동 유료 재시도를 예약하지 않는다', async () => {
  const memory = new TestMemory(), events = journal();
  await memory.consolidate(events, async () => ({ reply: { candidates: [] } }));
  assert.ok(memory.recall(events, '라면').recalled_events.some(e => e.text.includes('라면')));
  const failed = new TestMemory();
  await failed.consolidate(events, async () => { throw new Error('network_error'); });
  assert.equal(failed.needsSummary(events), false); assert.equal(failed.records.length, 0); assert.equal(events.length, 20);
});

test('없는 근거·다른 화자·관찰 사실 승격은 원자적으로 거부한다', async () => {
  for (const alter of [c => c.evidence_event_ids.push('other-npc'), c => c.epistemic_status = 'runtime_confirmed',
    c => c.evidence_event_ids.push('e1'), c => c.evidence_event_ids.push('e0'), c => c.extra = true, c => c.topic_tags = ['x'.repeat(161)]]) {
    const memory = new TestMemory(), events = journal();
    const reply = extractLocalSummary(events.slice(0, 2)); alter(reply.candidates[0]);
    const result = await memory.consolidate(events, async () => ({ reply }));
    assert.equal(result.committed, false); assert.equal(memory.records.length, 0); assert.equal(memory.processed.size, 0);
  }
});

test('저장 복원과 삭제 후 늦게 완료한 요약은 미래 기억을 삽입하지 않는다', async () => {
  const memory = new TestMemory(), events = journal(); await memory.consolidate(events);
  const saved = memory.snapshot(); const other = new TestMemory(); other.restore(saved);
  let finish; const pending = other.consolidate([...events, ...journal().map(e => ({ ...e, event_id: 'new-'+e.event_id }))],
    async () => new Promise(resolve => { finish = resolve; }));
  other.restore(saved); finish({ reply: extractLocalSummary(events.slice(0, 2)) });
  assert.equal((await pending).stale, true); assert.deepEqual(other.snapshot(), saved);
  other.records[0].text = '작업 사본 변경'; assert.notEqual(saved.records[0].text, other.records[0].text);
});

test('자동 정리는 최근 보존분과 무관하게 마지막 정상 정리 이후 8회 대화를 센다', async () => {
  const memory = new TestMemory(), events = journal().slice(0, 16);
  assert.equal(memory.needsSummary(events), true); await memory.consolidate(events);
  assert.equal(memory.needsSummary(events), false);
  const more = journal().map(e => ({ ...e, event_id: 'next-'+e.event_id }));
  assert.equal(memory.needsSummary([...events, ...more.slice(0, 14)]), false);
  assert.equal(memory.needsSummary([...events, ...more.slice(0, 16)]), true);
});

test('요약 입력은 공통 SourceEvent·SummaryInput 형식으로 화자·시점·digest를 보존한다', async () => {
  const input = await makeSummaryInput(journal().slice(0, 2));
  assert.match(input.source_digest, /^[a-f0-9]{64}$/);
  assert.equal(input.source_events[0].epistemic_status, 'player_claim');
  assert.equal(input.source_events[1].speaker, 'npc');
  assert.equal(input.source_events[0].payload.text, journal()[0].text);
  assert.equal((await makeSummaryInput(journal().slice(0, 2))).source_digest, input.source_digest);
});

test('요약 API는 대사와 다른 구조화 출력 계약을 쓰고 세션 없이 none으로 호출한다', async () => {
  let body;
  const reply = extractLocalSummary(journal().slice(0, 2));
  const result = await generateOpenAI({ prompt: { instructions: '요약', input: [] }, apiKey: 'test-only', model: 'gpt-6-luna', memorySummary: true,
    fetchImpl: async (_url, options) => { body = JSON.parse(options.body); return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reply) }] }] }); } });
  assert.equal(body.text.format.name, 'memory_summary'); assert.equal(body.max_output_tokens, 2048);
  assert.equal(body.reasoning.effort, 'none'); assert.equal(body.store, false); assert.equal(body.previous_response_id, undefined);
  assert.deepEqual(result.reply, reply);
});
