import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PERSONALITY_AXES, PERSONALITY_TABLE, PERSONALITY_RULE, PERSONALITY_PROMPT_VERSION, validateCorePersonality, personalityInstructions, generateCrowdPersonality } from '../public/personality.js';
import { assemblePrompt } from '../public/core.js';
import { compileResearchTurn } from '../public/research.js';
import { ScenarioEngine, withTestCrowds } from '../public/scenario.js';
import { buildCharacterProfile } from '../public/profile.js';
import { generateOpenAI } from '../openai.js';
const read = async f => JSON.parse(await readFile(new URL(`../../content/cyberpunk2077/${f}`, import.meta.url), 'utf8'));
const manifest = await read('manifest.json');
const bundle = { version: manifest.content_version, cards: await Promise.all(manifest.files.filter(f => f.startsWith('characters/')).map(read)), facts: await read('world-facts.json'), knowledge: await read('knowledge.json'), examples: await read('dialogue-examples.json') };
const player = bundle.facts.find(f => f.id === manifest.player_identity_fact_id);
bundle.playerIdentity = { ...player.player_identity, fact_id: player.id };
const personas = JSON.parse(await readFile(new URL('../personas.json', import.meta.url), 'utf8'));
const settings = { allowDraft: true, configuration: 'full', relationship: 'acquaintance', alive: true, free: true, basicKnowledge: true, scenario: true };
const context = { recent_turns: [], observations: {}, memory: null, allowed_actions: [] };
const core = Object.fromEntries(Object.keys(PERSONALITY_AXES).map((axis, i) => [axis, i + 1]));

test('공통 25문구와 한 번의 적용 규칙은 기준 명세와 정확히 일치한다', async () => {
  const spec = await readFile(new URL('../../docs/personality-specification.md', import.meta.url), 'utf8');
  const rows = [...spec.matchAll(/^\| (openness|conscientiousness|extraversion|agreeableness|neuroticism) \| ([1-5]) \| (.+) \|$/gm)];
  assert.equal(rows.length, 25);
  for (const [, axis, level, instruction] of rows) assert.equal(PERSONALITY_TABLE[axis][level], instruction);
  assert.ok(spec.includes(`> ${PERSONALITY_RULE}`));
  const promptSpec = await readFile(new URL('../../docs/prompt-specification.md', import.meta.url), 'utf8');
  const base = promptSpec.match(/```text\r?\n([\s\S]*?)\r?\n```/)[1];
  const prompt = assemblePrompt(base, { core_personality: core }, context, '안녕');
  assert.equal(prompt.instructions.split(PERSONALITY_RULE).length, 2);
});

test('누락·실수·범위 밖·추가 축·잘못된 버전은 기본값 없이 차단한다', () => {
  for (const invalid of [null, {}, [], { ...core, openness: 0 }, { ...core, openness: 6 }, { ...core, openness: 2.5 }, { ...core, openness: '3' }, { ...core, sixth: 3 }]) assert.throws(() => validateCorePersonality(invalid), /context_unavailable/);
  assert.throws(() => personalityInstructions(core, 'missing-version'), /context_unavailable/);
  const original = personalityInstructions(core); original[0] = '캐시 변조';
  assert.deepEqual(personalityInstructions(core), Object.keys(PERSONALITY_AXES).map(axis => PERSONALITY_TABLE[axis][core[axis]]));
  assert.notEqual(personalityInstructions({ ...core, openness: 2 })[0], personalityInstructions(core)[0]);
});

test('모든 인물의 화면과 실제 요청은 같은 다섯 문구를 사용하고 옛 정의·수치·버전은 전송하지 않는다', async () => {
  for (const card of bundle.cards) {
    const s = { ...settings, phase: card.phase_labels[0] };
    const prepared = compileResearchTurn({ bundle, npcKey: card.character_key, settings: s, context, playerText: '안녕' });
    const before = structuredClone(prepared);
    const prompt = assemblePrompt('공통 {{OUTPUT_CONTRACT}}', { ...prepared.persona, identity: card.identity, seed: 'local-only' }, prepared.context, '안녕', prepared);
    const transmitted = JSON.parse(prompt.input[0].content.split('\n').slice(1).join('\n'));
    assert.equal(Object.keys(transmitted)[0], 'personality_instructions');
    assert.deepEqual(transmitted.personality_instructions, personalityInstructions(card.core_personality));
    assert.deepEqual(buildCharacterProfile(bundle, card.character_key, s).personality.map(g => g.instruction), transmitted.personality_instructions);
    for (const key of ['identity', 'core_personality', 'identity_structure_version', 'traits', 'seed', 'personality_generation']) assert.equal(transmitted[key], undefined);
    assert.ok(!JSON.stringify(prompt).includes(PERSONALITY_PROMPT_VERSION));
    assert.ok(!JSON.stringify(prepared.identityReminder).includes('personality_instructions'));
    assert.deepEqual(transmitted.personal_principles, card.personal_principles);
    for (const key of ['fallback_lines', 'action_preferences', 'revision', 'examples']) assert.equal(transmitted[key], undefined);
    assert.equal(transmitted.knowledge_profile.domains, undefined);
    assert.equal(transmitted.knowledge_profile.default_depth, 'unknown');
    assert.deepEqual(transmitted.knowledge_profile.response_rules, prepared.persona.knowledge_profile.response_rules);
    assert.equal(transmitted.background.provenance, undefined);
    assert.equal(transmitted.background.text, prepared.persona.background.text);
    for (const key of ['voice_style', 'lived_context', 'identity_rules', 'forbidden_claims']) assert.deepEqual(transmitted[key], prepared.persona[key]);
    assert.equal(transmitted.current_goals, undefined);
    assert.ok(Array.isArray(prepared.context.canon_context.current_goals));
    let body;
    await generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt, fetchImpl: async (_, options) => {
      body = JSON.parse(options.body);
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ dialogue: '확인.', intent: 'answer', emotion: 'neutral', action: null, follow_up: null }) }] }] });
    } });
    assert.equal(body.instructions, prompt.instructions); assert.deepEqual(body.input, prompt.input);
    assert.deepEqual(prepared, before);
  }
  const incomplete = structuredClone(bundle); delete incomplete.cards[0].core_personality;
  assert.throws(() => compileResearchTurn({ bundle: incomplete, npcKey: incomplete.cards[0].character_key, settings: { ...settings, phase: incomplete.cards[0].phase_labels[0] }, context, playerText: '안녕' }), /context_unavailable/);
});

test('군중 추첨은 seed에 대해 결정적이며 금지 조합을 제외하고 유효한 기본값만 허용한다', () => {
  for (const p of personas.filter(p => p.npc_type === 'crowd')) {
    assert.deepEqual(generateCrowdPersonality(p.personality_generation, 'same'), generateCrowdPersonality(p.personality_generation, 'same'));
    for (let i = 0; i < 100; i++) {
      const result = generateCrowdPersonality(p.personality_generation, `seed-${i}`);
      validateCorePersonality(result); assert.ok(!(result.agreeableness === 1 && result.neuroticism === 5));
    }
    const reordered = structuredClone(p.personality_generation);
    for (const axis of Object.keys(PERSONALITY_AXES)) reordered.candidates[axis].reverse();
    assert.deepEqual(generateCrowdPersonality(reordered, 'same'), generateCrowdPersonality(p.personality_generation, 'same'));
    const empty = structuredClone(p.personality_generation); empty.candidates.openness = [];
    assert.deepEqual(generateCrowdPersonality(empty, 'same'), empty.default);
    empty.default.openness = 6;
    assert.throws(() => generateCrowdPersonality(empty, 'same'), /context_unavailable/);
  }
});

test('군중 성격은 첫 진입·여러 턴·재접촉에서 동일하고 세계 초기화는 인스턴스를 버린다', async () => {
  const extended = withTestCrowds(bundle, personas), s = { ...settings, phase: '일상' };
  const engine = new ScenarioEngine({ bundle: extended, npcKey: 'courier', settings: s, base: '공통 {{OUTPUT_CONTRACT}}' });
  assert.ok(buildCharacterProfile(extended, 'courier', s).personality.every(g => g.level === null));
  engine.start('courier'); const initial = structuredClone(engine.session.persona);
  const reply = { dialogue: '배달 중이에요.', intent: 'answer', emotion: 'neutral', action: null, follow_up: null };
  for (const input of ['안녕', '아까 뭐 했어?']) await engine.send(input, async ({ persona }) => {
    assert.deepEqual(persona.core_personality, initial.core_personality); return { reply, mode: 'mock' };
  });
  assert.deepEqual(engine.lastSelection.core_personality, initial.core_personality);
  const transmitted = JSON.parse(engine.lastPrompt.input[0].content.split('\n').slice(1).join('\n'));
  assert.deepEqual(transmitted.personality_instructions, personalityInstructions(initial.core_personality));
  engine.end(); engine.start('courier');
  assert.equal(engine.session.persona.seed, initial.seed);
  assert.deepEqual(engine.session.persona.core_personality, initial.core_personality);
  assert.deepEqual(buildCharacterProfile(extended, 'courier', s, [], initial.core_personality).personality.map(g => g.level), Object.values(initial.core_personality));
  engine.worldReset(); assert.equal(engine.instances.size, 0);
  engine.start('courier'); assert.notEqual(engine.session.persona.seed, initial.seed);
});
