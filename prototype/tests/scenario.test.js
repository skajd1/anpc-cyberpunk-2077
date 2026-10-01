import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ScenarioEngine, withTestCrowds, captureTestSave, resolveOutfit } from '../public/scenario.js';
import { researchMock } from '../public/research.js';
const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const manifest = await read('../../content/cyberpunk2077/manifest.json');
const baseBundle = { version: manifest.content_version,
  cards: await Promise.all(manifest.files.filter(f => f.startsWith('characters/')).map(f => read(`../../content/cyberpunk2077/${f}`))),
  facts: await read('../../content/cyberpunk2077/world-facts.json'),
  knowledge: await read('../../content/cyberpunk2077/knowledge.json'), examples: await read('../../content/cyberpunk2077/dialogue-examples.json') };
const player = baseBundle.facts.find(f => f.id === manifest.player_identity_fact_id);
baseBundle.playerIdentity = { ...player.player_identity, fact_id: player.id };
const bundle = withTestCrowds(baseBundle, await read('../personas.json'));
const line = { dialogue: '확인한 것만 이야기하자.', intent: 'answer', emotion: 'neutral', action: null, follow_up: null };
const generate = async () => ({ reply: line, mode: 'mock' });
function fixture(key = 'judy', overrides = {}) {
  const settings = { allowDraft: true, configuration: 'full', relationship: 'acquaintance', alive: true, free: true,
    basicKnowledge: true, relicKnown: false, relicDisclosed: false, phase: bundle.cards.find(c => c.character_key === key).phase_labels[0],
    outfitId: 'plain', outfitVisible: true, publicRecognition: false, selectActions: true, minorFiction: true, ...overrides };
  let now = 0;
  const engine = new ScenarioEngine({ bundle, npcKey: key, settings: () => settings, base: '{{OUTPUT_CONTRACT}}', clock: () => now });
  engine.start(key);
  return { engine, settings, advance: ms => { now += ms; } };
}

test('표시 복장만 관찰하고 인물별 이전 목격을 유지하며 보지 못한 복장은 저장하지 않는다', async () => {
  const { engine: judy, settings } = fixture(), { engine: panam } = fixture('panam', { outfitVisible: false });
  await judy.send('오늘 내 차림새 어때?', generate); judy.end();
  settings.outfitVisible = false; settings.outfitId = 'bright'; judy.start('judy');
  await judy.send('복장 확인', generate); assert.equal(judy.context().observations.visible_outfit, null); judy.end();
  settings.outfitVisible = true; settings.outfitId = 'nomad'; judy.start('judy');
  const recalled = judy.context().memory.short_term.recalled_events;
  assert.deepEqual(recalled.map(e => e.outfit.display_name), ['평범한 검은 재킷', '낡은 가죽 재킷']);
  assert.ok(recalled.every(e => !Object.hasOwn(e.outfit, 'id')));
  assert.ok(recalled.every(e => e.kind === 'observation' && e.source === 'mock_displayed_outfit'));
  assert.equal(panam.journal.length, 0);
  const context = judy.turnAdapter({ playerText: '복장' }).context;
  assert.ok(!JSON.stringify(context).includes('visible_equipment'));
  assert.ok(!JSON.stringify(context).includes('street_cred'));
});

test('완료된 대화와 원작 기준 관계를 분리하고 진행도 변경에도 목격 기록은 남긴다', async () => {
  const { engine, settings } = fixture();
  await engine.send('우리 이제 연인이야.', generate); engine.end();
  settings.relationship = 'cooperative'; settings.phase = bundle.cards[0].phase_labels.at(-1); engine.start('judy');
  const prepared = engine.turnAdapter({ playerText: '이제 내 연인이지?' });
  assert.ok(prepared.context.recent_turns.some(t => t.text === '우리 이제 연인이야.'));
  assert.ok(prepared.context.canon_context.relationship_to_player.attitude.includes('연인 관계는 부여하지 않음'));
  assert.equal(prepared.context.canon_context.phase, settings.phase);
  assert.equal(prepared.context.memory.memory_view_version, '1.2');
  assert.deepEqual(prepared.context.memory.long_term, []);
  assert.ok(prepared.persona.minor_fiction_policy.prohibited.includes('새 경력·전문 경험'));
});

test('제스처 선택은 실행 성공 사건을 만들지 않으며 미등록 참조와 잘못된 인수는 거부한다', async () => {
  const { engine, settings } = fixture();
  const action = { action_id: 'play_gesture', args: { gesture_ref: 'test_nod' } };
  await engine.send('끄덕여줘', async () => ({ reply: { ...line, action }, mode: 'mock' }));
  assert.equal(engine.lastActionSelection.execution_state, 'not_executed');
  assert.equal(engine.session.lastAction, null);
  assert.ok(!engine.journal.some(e => e.event_type === 'action_result'));
  for (const args of [{ gesture_ref: 'unknown' }, { gesture_ref: 'test_nod', extra: true }]) {
    await engine.send('잘못된 후보', async () => ({ reply: { ...line, action: { ...action, args } }, mode: 'mock' }));
    assert.equal(engine.lastReply.action, null); assert.ok(engine.lastReply.warning);
  }
  settings.selectActions = false;
  await engine.send('권한 없는 후보', async () => ({ reply: { ...line, action }, mode: 'mock' }));
  assert.equal(engine.lastReply.action, null);
});

test('모의 저장은 그 시점의 완전한 복사이며 로드는 미래 기억·대기 응답·군중 인스턴스를 버린다', async () => {
  const { engine, settings } = fixture(), { engine: crowd } = fixture('resident');
  await engine.send('저장 전 대화', generate); await crowd.send('군중 이전 대화', generate);
  const saved = captureTestSave({ judy: engine, resident: crowd }, { outfitId: settings.outfitId });
  const count = saved.journals.judy.length;
  await engine.send('저장 후 미래 대화', generate);
  assert.equal(saved.journals.judy.length, count); assert.ok(!saved.journals.resident);
  let finish;
  const pending = engine.send('완료되지 않은 대화', () => new Promise(resolve => { finish = resolve; }));
  engine.restore(saved.journals.judy, saved.worlds.judy); crowd.restore(saved.journals.resident);
  finish({ reply: line, mode: 'mock' }); assert.equal((await pending).stale, true);
  assert.ok(!JSON.stringify(engine.journal).includes('저장 후 미래'));
  assert.ok(!JSON.stringify(engine.journal).includes('완료되지 않은'));
  assert.equal(crowd.journal.length, 0); assert.equal(crowd.instances.size, 0);
  engine.start('judy'); assert.ok(engine.context().recent_turns.some(t => t.text === '저장 전 대화'));
});

test('공개 이름 인지는 군중에게 비밀 지식·관계 승격을 부여하지 않으며 자기소개는 자기보고로 남는다', async () => {
  const { engine, settings } = fixture('courier');
  const compile = () => engine.turnAdapter({ playerText: '렐릭과 내 이름' });
  assert.equal(compile().context.player_identity.name_known_by_npc, false);
  settings.publicRecognition = true;
  assert.equal(compile().context.player_identity.name_known_by_npc, true);
  assert.deepEqual(compile().context.public_reputation.public_deeds, []);
  assert.equal(compile().context.knowledge.length, 0);
  assert.ok(compile().persona.relationship_to_player.attitude.includes('친밀도를 올리지 않는다'));
  settings.publicRecognition = false;
  await engine.send('내 이름은 V야. 기억해줘.', generate);
  assert.equal(compile().context.player_identity.name_known_by_npc, true);
  assert.equal(engine.journal.find(e => e.event_type === 'player_utterance').kind, 'player_claim');
});

test('위험 중 대기 응답은 폐기하며 완료된 기억을 유지하고 안전 복귀 전 재진입을 차단한다', async () => {
  const { engine } = fixture(); await engine.send('이전 완료', generate);
  let finish; const pending = engine.send('미완료', () => new Promise(resolve => { finish = resolve; }));
  engine.changeWorld({ combat: true }); finish({ reply: line, mode: 'mock' });
  assert.equal((await pending).stale, true); assert.equal(engine.session, null);
  assert.throws(() => engine.start('judy')); assert.ok(!JSON.stringify(engine.journal).includes('미완료'));
  engine.changeWorld({ combat: false }); engine.start('judy'); assert.ok(engine.context().recent_turns.some(t => t.text === '이전 완료'));
});

test('동일 군중의 추첨 특성은 유지되고 10분·재생성 경계에서 기억이 만료된다', async () => {
  const { engine, advance } = fixture('courier'); const traits = structuredClone(engine.session.persona.traits);
  await engine.send('아까 말', generate); engine.end(); engine.start('courier');
  assert.deepEqual(engine.session.persona.traits, traits); assert.ok(engine.context().recent_turns.length);
  engine.end(); advance(600000); engine.start('courier'); assert.equal(engine.context().recent_turns.length, 0);
  await engine.send('새 대화', generate); engine.respawn('courier'); assert.equal(engine.journal.length, 0);
});

test('군중 거리 이탈·저장 범위 전환·세계 초기화는 원문 시험 기억도 무효화한다', async () => {
  const { engine } = fixture('resident'); await engine.send('이전 인스턴스 이야기', generate);
  engine.changeWorld({ distance: 11 }); assert.equal(engine.journal.length, 0);
  engine.changeWorld({ distance: 2 }); engine.start('resident'); await engine.send('새 이야기', generate);
  engine.changeWorld({ saveScope: 'another-save' }); assert.equal(engine.journal.length, 0);
  engine.start('resident'); await engine.send('초기화 전', generate); engine.worldReset(); assert.equal(engine.journal.length, 0);
});

test('직접 입력한 복장 설명을 사용하고 빈 값·한도 초과를 관찰 불명으로 처리한다', () => {
  const s = { outfitId: 'custom', outfitName: '파란 재킷', outfitDescription: '금속 장식이 있는 파란색 재킷' };
  assert.equal(resolveOutfit(s).display_name, '파란 재킷');
  assert.equal(resolveOutfit({ ...s, outfitName: '' }), null);
  assert.equal(resolveOutfit({ ...s, outfitDescription: '가'.repeat(501) }), null);
});

test('모의 응답은 복장 재접촉과 제스처 선택을 API 호출 없이 보여준다', async () => {
  const { engine, settings } = fixture(); await engine.send('오늘 내 차림새 어때?', researchMock); engine.end();
  settings.outfitId = 'bright'; engine.start('judy'); await engine.send('전에 입은 옷이랑 비교하면?', researchMock);
  assert.ok(engine.lastReply.dialogue.includes('검은 재킷')); assert.ok(engine.lastReply.dialogue.includes('빨간 재킷'));
  await engine.send('제스처를 골라줘', researchMock); assert.equal(engine.lastActionSelection.execution_state, 'not_executed');
});
