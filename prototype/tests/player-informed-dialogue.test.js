import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadPrototypeData } from '../server.js';
import { compileResearchTurn } from '../public/research.js';
import { assemblePrompt, responseSchema } from '../public/core.js';
import { makeSummaryInput, TestMemory } from '../public/memory.js';
import { captureFeedbackRequests } from '../../scripts/prepare-feedback-evaluation.mjs';

const suitePath = new URL('../../content/evaluation/player-informed-v1.json', import.meta.url);
const suite = JSON.parse(await readFile(suitePath, 'utf8'));
const { base, research: bundle } = await loadPrototypeData();
const compile = item => compileResearchTurn({ bundle, npcKey: item.npc_key, playerText: item.player_input,
  settings: { allowDraft: true, configuration: 'full', relationshipStage: item.relationship_stage,
    alive: true, free: true, basicKnowledge: true, relicKnown: false, relicDisclosed: false },
  context: { observations: {}, recent_turns: item.history, memory: item.memory ?? null, last_action_result: null } });

test('플레이어 설명은 입력으로 전달되며 보유 지식·관계·행동 권한을 직접 갱신하지 않는다', () => {
  const original = structuredClone(bundle);
  for (const item of suite.cases) {
    const prepared = compile(item);
    const prompt = assemblePrompt(base, prepared.persona, prepared.context, item.player_input,
      { ...prepared, voice: true, voiceOrder: 'ja_first' });
    assert.equal(prompt.input.at(-1).content, item.player_input);
    assert.equal(prompt.input.at(-1).role, 'user');
    assert.deepEqual(prepared.context.allowed_actions, []);
    assert.equal(prepared.context.canon_context.relationship_to_player.label,
      bundle.cards.find(c => c.character_key === item.npc_key).relationship_stages.find(s => s.id === item.relationship_stage).relationship.label);
    assert.ok(prepared.context.knowledge.every(k => bundle.knowledge.some(source => source.owner_key === item.npc_key && source.fact_id === k.fact_id)));
    assert.deepEqual(prepared.persona.core_personality, bundle.cards.find(c => c.character_key === item.npc_key).core_personality);
  }
  assert.deepEqual(bundle, original);
  const unfamiliar = compile(suite.cases.find(c => c.case_id === 'bd_explained_to_panam'));
  assert.equal(unfamiliar.context.knowledge_boundaries.find(d => d.domain_id === 'braindance').depth, 'unknown');
  assert.ok(!unfamiliar.context.knowledge.some(k => k.domain_id === 'braindance'));
});

test('후속 발화와 출처가 남은 요약을 평가 입력에서 누락하거나 원작 기억으로 옮기지 않는다', async () => {
  const captured = await captureFeedbackRequests({ suitePath });
  assert.equal(captured.pairs.length, 12);
  for (const pair of captured.pairs) assert.deepEqual(pair.preflight_errors, []);
  const history = captured.pairs.find(p => p.case_id === 'sensor_followup');
  assert.deepEqual(history.prompt.input.slice(-3, -1), history.history.map(t => ({ role: t.role === 'player' ? 'user' : 'assistant', content: t.text })));
  const memory = captured.pairs.find(p => p.case_id === 'memory_report_source');
  const contextMessage = memory.prompt.input.find(m => m.content.startsWith('현재 상황 데이터'));
  const context = JSON.parse(contextMessage.content.split('\n').slice(1).join('\n'));
  assert.deepEqual(context.memory, memory.memory);
  assert.ok(!JSON.stringify(context.canon_context).includes('동쪽 다리'));
  assert.deepEqual(memory.schema, responseSchema({ voice: true, voiceOrder: 'ja_first' }));
});

test('설명을 배운 세션도 화자·출처를 유지해 요약 입력과 재접촉으로 전달한다', async () => {
  const events = [
    { event_id: 'p', session_id: 'learn', event_type: 'player_utterance', role: 'player', text: '센서는 두 신호가 있어야 비교 경고가 떠.' },
    { event_id: 'n', session_id: 'learn', event_type: 'npc_utterance', role: 'npc', text: '한쪽 신호가 빠지면 경고가 없다고 안심할 수는 없겠네.' }
  ];
  const input = await makeSummaryInput(events);
  assert.deepEqual(input.source_events.map(e => [e.speaker, e.epistemic_status]), [['player', 'player_claim'], ['npc', 'npc_statement']]);
  assert.deepEqual(input.source_events.map(e => e.payload.text), events.map(e => e.text));
  assert.equal(input.policy_version, 'session-memory-1.1');
  const memory = new TestMemory();
  const summary = 'V에게 두 센서 신호가 있어야 경고를 비교한다는 설명을 듣고, 한쪽이 빠지면 경고가 없어도 안심할 수 없겠다고 답했다.';
  await memory.finish('learn', events, async () => ({ reply: { summary }, mode: 'fixture' }));
  const restored = new TestMemory(); restored.restore(memory.snapshot());
  assert.deepEqual(restored.recall([]).session_summaries, [summary]);
  assert.deepEqual(Object.keys(restored.records[0]).sort(), ['session_id', 'summary']);
});
