// 게임 CET 모드용 인물별 고정 프롬프트 데이터를 만든다.
// 웹 시제품의 ScenarioEngine·assemblePrompt로 첫 턴 프롬프트를 조립하고, 최근 대화·플레이어 입력을 뺀
// 고정 부분(지침·인물·상황 메시지)과 응답 스키마를 Lua 파일로 저장한다. 실행 중에는 CET가 대화만 덧붙인다.
// 사용: node scripts/build-cet-prompts.mjs [--story late_open] > game/cet/anpc/prompts.lua
import { parseArgs } from 'node:util';
import { loadPrototypeData } from '../prototype/server.js';
import { ScenarioEngine, withTestCrowds } from '../prototype/public/scenario.js';
import { assemblePrompt, responseSchema, PROMPT_VERSION } from '../prototype/public/core.js';

const { values: options } = parseArgs({ options: { story: { type: 'string', default: 'late_open' } } });
const data = await loadPrototypeData();
const bundle = withTestCrowds(data.research, data.personas);
const preset = bundle.storyPolicy.presets.find(p => p.id === options.story);
if (!preset) throw new Error(`알 수 없는 --story: ${options.story}`);

// 게임에서 지원 표에 있는 인물 키와 군중 대체 카드.
const KEYS = ['viktor', 'misty', 'judy', 'panam', 'jackie', 'rogue', 'goro', 'kerry', 'evelyn', 'songbird', 'johnny', 'resident'];

function settingsFor(card) {
  return () => ({ allowDraft: true, storyState: { fields: preset.fields }, configuration: 'full',
    phase: card.phase_labels[0], relationshipStage: preset.relationship_stages?.[card.character_key] ?? card.relationship_stages?.[0]?.id,
    alive: true, free: true, basicKnowledge: true, relicKnown: false, relicDisclosed: false, outfitId: 'plain', outfitVisible: false,
    publicRecognition: false, minorFiction: false, selectActions: false });
}

const characters = {};
const blocked = {};
for (const key of KEYS) {
  const card = bundle.cards.find(c => c.character_key === key);
  if (!card) { blocked[key] = 'card_missing'; continue; }
  let engine;
  try {
    engine = new ScenarioEngine({ bundle, npcKey: key, settings: settingsFor(card), base: data.base, notify: () => {} });
    // 게임 관찰값은 아직 연결하지 않았으므로 시험 장소·복장을 넣지 않는다.
    engine.world.location = 'unknown';
    engine.start(key);
  } catch (error) { blocked[key] = error.message; continue; }
  const prepared = engine.turnAdapter({ context: engine.context(''), playerText: '' });
  // 게임의 행동 실행기에는 대화 종료만 있다. 웹의 모의 제어 후보를 내보내지 않는다.
  prepared.context.allowed_actions = prepared.context.allowed_actions.filter(a => a.action_id === 'end_conversation');
  const prompt = assemblePrompt(engine.base, prepared.persona, prepared.context, '', prepared);
  // 마지막 항목은 빈 플레이어 입력이다. 최근 대화가 없으므로 나머지가 고정 메시지다.
  characters[key] = { instructions: prompt.instructions, messages: prompt.input.slice(0, -1).map(m => m.content) };
}

function long(text) {
  let level = 1;
  while (text.includes(`]${'='.repeat(level)}]`)) level += 1;
  const eq = '='.repeat(level);
  // Lua 긴 문자열은 첫 줄바꿈을 버리므로 앞에 줄바꿈을 하나 둔다.
  return `[${eq}[\n${text}]${eq}]`;
}

const lines = [];
const schema = responseSchema();
schema.properties.action.anyOf = schema.properties.action.anyOf.filter(a => a.type === 'null' || a.properties?.action_id.enum[0] === 'end_conversation');
lines.push('-- 생성 파일: scripts/build-cet-prompts.mjs. 직접 수정하지 않는다.');
lines.push(`-- prompt_version ${PROMPT_VERSION} · story ${options.story}`);
lines.push('return {');
lines.push(`  prompt_version = ${JSON.stringify(PROMPT_VERSION)},`);
lines.push(`  story = ${JSON.stringify(options.story)},`);
lines.push(`  schema = ${long(JSON.stringify(schema))},`);
lines.push('  blocked = {');
for (const [key, reason] of Object.entries(blocked)) lines.push(`    ${key} = ${long(reason)},`);
lines.push('  },');
lines.push('  characters = {');
for (const [key, value] of Object.entries(characters)) {
  lines.push(`    ${key} = {`);
  lines.push(`      instructions = ${long(value.instructions)},`);
  lines.push('      messages = {');
  for (const message of value.messages) lines.push(`        ${long(message)},`);
  lines.push('      },');
  lines.push('    },');
}
lines.push('  },');
lines.push('}');
process.stdout.write(lines.join('\n') + '\n');
