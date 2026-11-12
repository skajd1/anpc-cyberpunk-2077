import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadPrototypeData } from '../server.js';
import { compileResearchTurn } from '../public/research.js';
import { assemblePrompt, PROMPT_VERSION } from '../public/core.js';
import { persuasionFor, PERSUASION_LEVELS } from '../public/personality.js';

const { base, research: bundle } = await loadPrototypeData();
const suite = JSON.parse(await readFile(new URL('../../content/evaluation/persuasion-v1.json', import.meta.url), 'utf8'));
const compile = (npcKey, relationshipStage, playerText, recent_turns = []) => compileResearchTurn({ bundle, npcKey, playerText,
  settings: { allowDraft: true, configuration: 'full', relationshipStage, alive: true, free: true, basicKnowledge: true, relicKnown: false, relicDisclosed: false },
  context: { observations: {}, recent_turns, memory: null, last_action_result: null } });

test('기준 베이스는 0.27이며 하드 리밋과 소프트 거절의 단계적 누그러짐을 구분한다', () => {
  assert.equal(PROMPT_VERSION, '0.27');
  assert.match(readFileSync(new URL('../../docs/prompt-specification.md', import.meta.url), 'utf8'), /규격 버전: 0\.27\./);
  const section = base.split('\n[반복 요청과 설득]\n')[1].split('[인물 반응]')[0];
  for (const term of ['하드 리밋', 'forbidden_claims', '소프트한', 'recent_turns', '두 번째', '세 번째', 'persona.persuasion.level', 'easy', 'moderate', 'firm', '같은 거절 문장']) assert.ok(section.includes(term), term);
  assert.ok(!base.includes('대화 압력으로 바뀌지 않는다'));
  const prompt = assemblePrompt(base, compile('judy', 'friend', '안녕').persona, { observations: {}, memory: null }, '안녕');
  assert.ok(prompt.instructions.includes('\n[반복 요청과 설득]\n'));
});

test('모든 community 카드는 persuasion을 가지며 요청 persona에 그대로 실린다', () => {
  const cards = bundle.cards.filter(c => c.npc_type !== 'crowd');
  assert.equal(cards.length, 12);
  for (const card of cards) {
    assert.ok(PERSUASION_LEVELS.includes(card.persuasion.level), card.character_key);
    assert.ok(card.persuasion.note.length > 0 && card.persuasion.note.length <= 120);
    const stage = card.relationship_stages[0].id;
    const prepared = compile(card.character_key, stage, '부탁 하나만 들어줘.');
    assert.deepEqual(prepared.persona.persuasion, card.persuasion);
    const prompt = assemblePrompt(base, prepared.persona, prepared.context, '부탁 하나만 들어줘.', prepared);
    assert.deepEqual(JSON.parse(prompt.input[0].content.split('\n').slice(1).join('\n')).persuasion, card.persuasion);
  }
  assert.deepEqual(Object.fromEntries(cards.map(c => [c.character_key, c.persuasion.level])), { judy: 'easy', panam: 'moderate', jackie: 'easy',
    viktor: 'moderate', misty: 'easy', rogue: 'firm', goro: 'firm', kerry: 'moderate', river: 'moderate', evelyn: 'firm', songbird: 'firm', johnny: 'firm' });
});

test('카드 값이 없는 군중은 우호성에서 유도하고 잘못된 값은 차단한다', () => {
  const core = agreeableness => ({ openness: 3, conscientiousness: 3, extraversion: 3, agreeableness, neuroticism: 3 });
  assert.deepEqual([1, 2, 3, 4, 5].map(a => persuasionFor(undefined, core(a)).level), ['firm', 'firm', 'moderate', 'easy', 'easy']);
  for (const bad of [{ level: 'soft' }, { level: 'easy', extra: 1 }, { level: 'easy', note: '' }, { level: 'easy', note: 'x'.repeat(121) }]) assert.throws(() => persuasionFor(bad, core(3)), /persuasion/);
  const crowd = bundle.cards.find(c => c.npc_type === 'crowd');
  const prompt = assemblePrompt(base, { persona_id: 'c', npc_type: 'crowd', display_name: '시민', core_personality: core(4), personal_principles: ['a'],
    current_goals: [], forbidden_claims: [], action_preferences: [], voice_style: {}, fallback_lines: {} }, { observations: {} }, '안녕');
  assert.deepEqual(JSON.parse(prompt.input[0].content.split('\n').slice(1).join('\n')).persuasion, { level: 'easy' });
  assert.ok(crowd === undefined || crowd.persuasion === undefined);
});

test('거절 성격의 identity_rules는 직접 요구가 나올 때만 해당하도록 발동 조건을 명시한다', () => {
  const refuseRules = bundle.cards.flatMap(c => c.identity_rules.filter(r => r.preferred_intent === 'refuse'));
  assert.equal(refuseRules.length, 6);
  for (const rule of refuseRules) assert.ok(rule.trigger_description.includes('직접 나올 때만'), rule.id);
  assert.ok(base.includes('identity_rules는 현재 발화가 해당 trigger_description과 상황 조건에 맞을 때만 적용한다'));
});

test('반복 요청 예시는 작성 초안이며 누그러진 응답과 유지된 거절을 함께 보인다', () => {
  const ids = ['EX_JUDY_PERSIST', 'EX_PANAM_PERSIST_HARD', 'EX_JACKIE_PERSIST', 'EX_VIKTOR_PERSIST', 'EX_GORO_PERSIST', 'EX_ROGUE_PERSIST'];
  const examples = ids.map(id => bundle.examples.find(e => e.id === id));
  for (const ex of examples) {
    assert.ok(ex, 'example');
    assert.equal(ex.provenance, 'authored_adaptation'); assert.equal(ex.review_status, 'draft');
    assert.match(ex.input, /^\[(두|세|네) 번째 요청\]/);
    assert.ok(bundle.cards.find(c => c.character_key === ex.character_keys[0]).example_ids.includes(ex.id));
  }
  assert.deepEqual(examples.map(e => e.expected_intent), ['answer', 'refuse', 'answer', 'answer', 'answer', 'answer']);
  assert.equal(bundle.examples.filter(e => e.expected_intent === 'refuse').length, 7);
});

test('persuasion-v1 평가 입력은 카드 값·누그러짐 시점과 연결되고 실제 요청으로 조립된다', () => {
  const from = { easy: 2, moderate: 3, firm: 4 };
  assert.ok(suite.cases.filter(c => c.family === 'soft_request').length >= 4);
  assert.ok(suite.cases.filter(c => c.family === 'hard_limit').length >= 3);
  for (const item of suite.cases) {
    const card = bundle.cards.find(c => c.character_key === item.npc_key);
    assert.ok(card.relationship_stages.some(s => s.id === item.relationship_stage), item.case_id);
    assert.ok(item.turns.length >= 3);
    if (item.family === 'soft_request') {
      assert.equal(item.persuasion_level, card.persuasion.level, item.case_id);
      assert.equal(item.soften_from_turn, from[card.persuasion.level], item.case_id);
      assert.ok(item.turns.length >= item.soften_from_turn, item.case_id);
    } else assert.equal(item.soften_from_turn, null);
    // 앞 턴의 실제 생성 대사는 실행 때 채운다. 여기서는 플레이어 발화만 이어 붙인 입력이 조립되는지 확인한다.
    const history = item.turns.slice(0, -1).map(t => ({ role: 'player', text: t.player_input }));
    const last = item.turns.at(-1).player_input;
    const prepared = compile(item.npc_key, item.relationship_stage, last, history);
    const prompt = assemblePrompt(base, prepared.persona, prepared.context, last, { ...prepared, voice: true, voiceOrder: 'ja_first' });
    assert.equal(prompt.input.at(-1).content, last);
    assert.equal(prompt.input.filter(m => m.role === 'user').length >= history.length + 1, true);
    assert.deepEqual(prepared.persona.persuasion, card.persuasion);
  }
});

const lua = process.env.ANPC_LUA ?? 'lua';
const luaAvailable = !spawnSync(lua, ['-v']).error;
test('CET 요청의 persona.persuasion은 웹과 같은 값이다(실제 Lua)', { skip: !luaAvailable && 'Lua 실행기가 필요합니다(ANPC_LUA로 지정 가능).' }, () => {
  for (const [mode, key] of [['judy', 'judy'], ['viktor', 'viktor'], ['tone-bold', 'resident']]) {
    const result = spawnSync(lua, ['game/tests/identity-smoke.lua', mode], { encoding: 'utf8', cwd: new URL('../../', import.meta.url).pathname });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const body = JSON.parse(result.stdout.trim().split('\n').at(-1));
    const persona = JSON.parse(body.input.find(m => m.content.startsWith('인물 데이터')).content.split('\n').slice(1).join('\n'));
    if (key === 'resident') assert.deepEqual(persona.persuasion, persuasionFor(undefined, { openness: 3, conscientiousness: 3, extraversion: 3,
      agreeableness: { easy: 4, moderate: 3, firm: 2 }[persona.persuasion.level], neuroticism: 3 }));
    else assert.deepEqual(persona.persuasion, bundle.cards.find(c => c.character_key === key).persuasion);
  }
});
