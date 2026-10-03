import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileResearchTurn, resolveRelationshipStage } from '../public/research.js';
import { evaluateStoryPolicy, normalizeStoryFields, storyRequiresReset } from '../public/story.js';
import { ScenarioEngine, captureTestSave } from '../public/scenario.js';
import { buildCharacterProfile } from '../public/profile.js';
const read = async file => JSON.parse(await readFile(new URL(`../../content/cyberpunk2077/${file}`, import.meta.url), 'utf8'));
const manifest = await read('manifest.json');
const bundle = { version: manifest.content_version, cards: await Promise.all(manifest.files.filter(f => f.startsWith('characters/')).map(read)),
  facts: await read('world-facts.json'), knowledge: await read('knowledge.json'), examples: await read('dialogue-examples.json'),
  worldKnowledge: await read('world-knowledge-policy.json'), storyPolicy: await read('story-progression-policy.json') };
const player = bundle.facts.find(f => f.id === manifest.player_identity_fact_id);
bundle.playerIdentity = { ...player.player_identity, fact_id: player.id };
const context = { observations: {}, recent_turns: [], memory: null, allowed_actions: [] };
const line = { dialogue: '확인한 상황 안에서 이야기하자.', intent: 'answer', emotion: 'neutral', action: null, follow_up: null };
const generate = async () => ({ reply: line, mode: 'mock' });
function fixture(preset, key, stage) {
  const p = structuredClone(bundle.storyPolicy.presets.find(p => p.id === preset));
  return { allowDraft: true, configuration: 'full', alive: true, free: true, basicKnowledge: true,
    relationshipStage: stage ?? p.relationship_stages[key], storyState: { fields: p.fields } };
}
function status(key, settings) { const card = bundle.cards.find(c => c.character_key === key); return evaluateStoryPolicy(bundle, card, settings, resolveRelationshipStage(card, settings)); }
function compile(key, settings) { return compileResearchTurn({ bundle, npcKey: key, settings, context, playerText: '지금 어떤 상황이야?' }); }
function done(settings, ...quests) { for (const q of quests) settings.storyState.fields[`content.quests.${q}`] = 'completed'; }

test('지원 프리셋은 지정한 인물·단계를 실제 판정하며 결말은 모두 차단한다', () => {
  for (const p of bundle.storyPolicy.presets) for (const [key, stage] of Object.entries(p.relationship_stages)) {
    const settings = fixture(p.id, key, stage), result = status(key, settings);
    assert.equal(result.allowed, p.id !== 'finale', `${p.id}/${key}: ${result.reason}`);
    assert.equal(buildCharacterProfile(bundle, key, settings).ready, result.allowed);
    if (result.allowed) assert.equal(compile(key, settings).diagnostics.story_policy.enabled, true);
    else assert.throws(() => compile(key, settings));
  }
});

test('재키는 초반만 지원하며 수동 관계·생존 설정으로 사망 이후를 우회할 수 없다', () => {
  assert.equal(status('jackie', fixture('before_heist', 'jackie')).allowed, true);
  const after = fixture('after_heist', 'jackie', 'partner'); after.storyState.fields['content.contact.jackie'] = 'nearby';
  assert.match(status('jackie', after).reason, /사망/);
  assert.throws(() => compile('jackie', after), /사망/);
  after.storyState.fields['content.story.period'] = 'pre_heist';
  assert.equal(status('jackie', after).allowed, false);
});

test('2막 세 경로와 개인 퀘스트는 독립적으로 판정하고 먼저 선택한 후기 목표는 주입하지 않는다', () => {
  const settings = fixture('panam_track', 'panam');
  assert.equal(status('panam', settings).allowed, true);
  settings.relationshipStage = 'saved'; settings.storyState.fields['content.contact.goro'] = 'nearby';
  assert.equal(status('goro', settings).allowed, false);
  settings.relationshipStage = 'hellman';
  assert.equal(status('panam', settings).allowed, true);
  settings.relationshipStage = 'partner'; settings.storyState.fields['content.choices.panam_relationship'] = 'partner';
  assert.throws(() => compile('panam', settings), /퀘스트/);
  done(settings, 'riders_storm', 'little_help', 'queen_highway');
  assert.equal(status('panam', settings).allowed, true);
  assert.match(compile('panam', settings).persona.relationship_to_player.label, /연인/);
});

test('빅터의 상환은 진단과 독립이며 상환했다고 미래 렐릭 진단을 알지 않는다', () => {
  const settings = fixture('before_heist', 'viktor', 'paid'); done(settings, 'paid_full');
  const early = compile('viktor', settings);
  assert.equal(early.diagnostics.simulation.relationship_stage, 'friend');
  assert.ok(early.context.canon_context.applied_rules.includes('viktor_debt_paid'));
  assert.ok(!early.context.canon_context.applied_rules.includes('viktor_diagnosis'));
  assert.ok(!early.context.canon_context.known_past_events.some(s => /직접 진단/.test(s)));
  const late = fixture('after_heist', 'viktor', 'paid'); done(late, 'paid_full');
  assert.equal(compile('viktor', late).diagnostics.simulation.relationship_stage, 'relic');
  assert.ok(!compile('misty', fixture('after_heist', 'misty')).context.canon_context.applied_rules.includes('viktor_debt_paid'));
});

test('누락·잘못된 타입·충돌하는 선행 상태는 unknown으로 차단하며 원작 장면을 덮지 않는다', () => {
  for (const field of ['content.contact.viktor', 'content.story.scene_free', 'content.quests.playing_for_time', 'content.story.period']) {
    const settings = fixture('after_heist', 'viktor'); delete settings.storyState.fields[field];
    assert.equal(status('viktor', settings).allowed, false, field);
  }
  const settings = fixture('after_heist', 'viktor'); settings.storyState.fields['content.story.scene_free'] = 'true';
  assert.equal(normalizeStoryFields(bundle.storyPolicy, settings.storyState)['content.story.scene_free'], null);
  settings.storyState.fields['content.story.scene_free'] = true; settings.storyState.fields['content.quests.heist'] = 'not_started';
  assert.match(status('viktor', settings).reason, /선행/);
});

test('주디 원격·타케무라 미구출·소미 원작 장면과 떠난 상태는 대화 가능 관계와 구별한다', () => {
  const judy = fixture('judy_track', 'judy', 'friend');
  done(judy, 'both_sides_now', 'ex_factor', 'talkin_revolution', 'pisces', 'pyramid_song');
  judy.storyState.fields['content.choices.judy_relationship'] = 'friend'; judy.storyState.fields['content.contact.judy'] = 'remote';
  assert.equal(status('judy', judy).allowed, false);
  const goro = fixture('goro_track', 'goro'); goro.storyState.fields['content.choices.goro_fate'] = 'abandoned';
  assert.match(status('goro', goro).reason, /구출하지/);
  const somi = fixture('pl_planning', 'songbird', 'matrix_confession'); done(somi, 'seen_face', 'firestarter');
  somi.storyState.fields['content.choices.songbird_route'] = 'songbird';
  assert.match(status('songbird', somi).reason, /장면 전용/);
  somi.storyState.fields['content.choices.songbird_route'] = 'moon_departed';
  assert.equal(status('songbird', somi).allowed, false);
});

test('조니의 확인된 렐릭 접촉은 근거리 신체 제어를 요구하지 않는다', () => {
  const settings = fixture('after_heist', 'johnny');
  const engine = new ScenarioEngine({ bundle, npcKey: 'johnny', settings, base: '{{OUTPUT_CONTRACT}}' });
  engine.world.distance = 100; engine.start('johnny');
  assert.equal(engine.session.held, false);
  assert.deepEqual(engine.allowed().map(a => a.action_id), ['end_conversation']);
  engine.changeWorld({ combat: true }); assert.equal(engine.session, null);
});

test('요청 도중 퀘스트가 변하면 응답·행동·기억에 반영하지 않는다', async () => {
  const settings = fixture('before_heist', 'jackie');
  const engine = new ScenarioEngine({ bundle, npcKey: 'jackie', settings: () => settings, base: '{{OUTPUT_CONTRACT}}' });
  engine.start('jackie'); let complete;
  const pending = engine.send('나중에 만나자.', () => new Promise(resolve => { complete = resolve; }));
  done(settings, 'heist'); complete({ reply: line, mode: 'mock' });
  assert.equal((await pending).stale, true);
  assert.equal(engine.session, null); assert.equal(engine.lastReply, null);
  assert.ok(!engine.journal.some(e => /_utterance$/.test(e.event_type)));
});

test('진행도 되돌림은 미래 기억을 지우고 모의 저장 로드는 저장 시점의 기억을 복원한다', async () => {
  const settings = fixture('before_heist', 'viktor');
  const engine = new ScenarioEngine({ bundle, npcKey: 'viktor', settings: () => settings, base: '{{OUTPUT_CONTRACT}}' });
  engine.start('viktor'); await engine.send('습격 전 내 이야기', generate);
  const saved = captureTestSave({ viktor: engine }, { settings }); engine.end();
  Object.assign(settings, fixture('after_heist', 'viktor')); engine.start('viktor'); await engine.send('습격 후 내 이야기', generate); engine.end();
  Object.assign(settings, fixture('before_heist', 'viktor')); engine.start('viktor'); assert.equal(engine.journal.length, 0); engine.end();
  engine.restore(saved.journals.viktor, saved.worlds.viktor, saved.memories.viktor); engine.start('viktor');
  assert.ok(engine.journal.some(e => e.text === '습격 전 내 이야기'));
  assert.ok(!engine.journal.some(e => e.text === '습격 후 내 이야기'));
  assert.equal(storyRequiresReset(fixture('after_heist', 'viktor'), fixture('before_heist', 'viktor')), true);
});

test('확정된 관계 단절과 유전 대화 이후를 초기 관계 선택으로 우회하지 않는다', () => {
  for (const [preset, key, stage, choice, value] of [
    ['judy_track', 'judy', 'rescue', 'judy_pisces', 'maiko_paid'],
    ['panam_track', 'panam', 'hellman', 'panam_relationship', 'betrayed'],
    ['panam_track', 'river', 'randy', 'river_rescue', 'failed']
  ]) {
    const settings = fixture(preset, key, stage); settings.storyState.fields[`content.contact.${key}`] = 'nearby';
    settings.storyState.fields[`content.choices.${choice}`] = value;
    assert.equal(status(key, settings).allowed, false);
  }
  const settings = fixture('late_open', 'johnny', 'cooperation'); done(settings, 'tapeworm', 'chippin_in');
  settings.storyState.fields['content.choices.johnny_relationship'] = 'rejected';
  assert.equal(status('johnny', settings).allowed, false);
  settings.relationshipStage = 'rejected'; assert.equal(status('johnny', settings).allowed, true);
});
