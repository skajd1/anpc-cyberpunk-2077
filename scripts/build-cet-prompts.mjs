// 게임 CET 모드용 인물별 고정 프롬프트 데이터를 만든다.
// 고정 정체성과 단계에 의존하지 않는 공통 지식만 저장한다. 현재 관찰·인지·최근 발화는 CET가 붙인다.
// 사용: node scripts/build-cet-prompts.mjs > game/cet/anpc/prompts.lua
import { loadPrototypeData } from '../prototype/server.js';
import { withTestCrowds } from '../prototype/public/scenario.js';
import { knowledgeBlockReason, evaluateCondition } from '../prototype/public/research.js';
import { PERSONALITY_TABLE, PERSONALITY_PROMPT_VERSION } from '../prototype/public/personality.js';
import { buildIdentityData } from './cet-identity-data.mjs';
import { AMM_MOTIONS } from '../prototype/public/motions.js';
import { buildGameStoryData } from './game-story-data.mjs';
import { assemblePrompt, responseSchema, PROMPT_VERSION, SELECTION_ACTIONS, validatePersona } from '../prototype/public/core.js';

const data = await loadPrototypeData();
const bundle = withTestCrowds(data.research, data.personas);
const identityData = await buildIdentityData(bundle);

// 게임에서 지원 표에 있는 인물 키와 군중 대체 카드.
const KEYS = ['viktor', 'misty', 'judy', 'panam', 'jackie', 'rogue', 'goro', 'kerry', 'evelyn', 'songbird', 'river', 'johnny', 'resident'];

const characters = {};
const blocked = {};
// 기존 미지원 인물은 가상 진행도 판정 대신 실제 단계 연결 부족으로 차단한다.
const UNBOUND = new Set(['jackie', 'kerry', 'evelyn', 'songbird']);
for (const key of KEYS) {
  const card = bundle.cards.find(c => c.character_key === key);
  if (!card) { blocked[key] = 'card_missing'; continue; }
  if (UNBOUND.has(key)) blocked[key] = 'runtime_story_binding_unavailable';
  const fields = { 'content.era': '2077', 'content.npc_key': key };
  const baselineIds = new Set(bundle.worldKnowledge?.baseline_fact_ids ?? []);
  for (const fact of bundle.facts) {
    if (fact.knowledge_layer === 'common' && fact.spoiler_scope === 'none') fields[`content.grants.${fact.id}`] = true;
  }
  const baseline = bundle.knowledge.filter(k => baselineIds.has(k.fact_id)
    && knowledgeBlockReason(card, k, bundle.facts.find(f => f.id === k.fact_id), fields) === null);
  const common = (bundle.worldKnowledge?.categories ?? []).map(category => ({ category_id: category.category_id,
    statements: [...new Set(baseline.map(k => bundle.facts.find(f => f.id === k.fact_id))
      .filter(f => f.category_id === category.category_id).map(f => f.statement))] })).filter(c => c.statements.length);
  const persona = validatePersona({ persona_id: key, npc_type: card.npc_type ?? 'community', display_name: card.display_name,
    core_personality: card.core_personality,
    personal_principles: card.personal_principles, voice_style: card.voice_style, forbidden_claims: card.forbidden_claims,
    background: { text: card.background.summary }, lived_context: { ...card.lived_context,
      },
    knowledge_profile: card.knowledge_profile, fallback_lines: card.fallback_lines, current_goals: [], action_preferences: [],
    identity_rules: card.identity_rules.filter(r => evaluateCondition(r.context_condition, fields) === true)
      .map(({ trigger_description, value_priority, response_direction, prohibited_choices }) =>
        ({ trigger_description, value_priority, response_direction, prohibited_choices })) });
  const actions = [{ action_id: 'end_conversation', args: {}, execution_mode: 'execute', description: '대사 후 대화 종료' },
    ...(key === 'johnny' ? [] : SELECTION_ACTIONS)];
  const context = { common_knowledge: common, knowledge: [], allowed_actions: actions,
    canon_context: { status: 'unknown', relationship_to_player: null, known_past_events: [], current_goals: [],
      everyday_fiction_policy: { allowed: false } } };
  const instructions = data.base + '\n게임 상태는 매 입력의 현재 게임 데이터만 기준으로 삼는다. 단계·관계 unknown은 처음 만남이라는 뜻이 아니다. 확인되지 않은 원작 관계·진행·비밀은 인정하거나 부정하지 않는다. player_identity.name_known_by_npc=true일 때만 V라는 이름으로 부른다. game_identity는 이 NPC의 현재 게임상 표시 신원이며 군중의 생성 배경보다 우선한다. 표시 이름이 시민·직업 같은 범주명이면 개인 실명으로 단정하지 않는다. 소속만으로 직책·거주·전문 자격·사적 관계를 만들지 않는다. 표시 특성은 게임 능력이며 성격 점수나 실행 가능한 행동을 추가하는 근거가 아니다. 현재 우호/중립/적대 표시는 사적인 친밀도가 아니다. 자료에서 모르는 정보는 실제로 없다는 뜻이 아니며 모드의 확인·검수 상태를 대사로 설명하지 않는다.';
  const prompt = assemblePrompt(instructions, persona, context, '');
  // 마지막 항목은 빈 플레이어 입력이다. 최근 대화가 없으므로 나머지가 고정 메시지다.
  characters[key] = { instructions: prompt.instructions, messages: prompt.input.slice(0, -1).map(m => m.content),
    actions };
}

function long(text) {
  let level = 1;
  while (text.includes(`]${'='.repeat(level)}]`)) level += 1;
  const eq = '='.repeat(level);
  // Lua 긴 문자열은 첫 줄바꿈을 버리므로 앞에 줄바꿈을 하나 둔다.
  return `[${eq}[\n${text}]${eq}]`;
}

const lines = [];
const gameSchema = voice => {
  const s = responseSchema({ voice });
  s.properties.action.anyOf = s.properties.action.anyOf.filter(a => a.type === 'null'
    || ['end_conversation', 'play_gesture'].includes(a.properties?.action_id.enum[0]));
  return s;
};
const schema = gameSchema(false);
// 음성 활성 시 CET가 인물 지침의 출력 필드 안내(text)를 voice로 바꾸고 voice_schema를 쓴다.
const contract = voice => assemblePrompt('{{OUTPUT_CONTRACT}}', {}, {}, '', { voice }).instructions;
if (!Object.values(characters).every(c => c.instructions.includes(contract(false)))) throw new Error('출력 필드 안내를 찾지 못했습니다.');
lines.push('-- 생성 파일: scripts/build-cet-prompts.mjs. 직접 수정하지 않는다.');
lines.push(`-- prompt_version ${PROMPT_VERSION} · runtime context`);
lines.push('return {');
lines.push(`  prompt_version = ${JSON.stringify(PROMPT_VERSION)},`);
lines.push('  story = "runtime",');
lines.push(`  identity_data = ${long(JSON.stringify(identityData))},`);
lines.push(`  personality_table = ${long(JSON.stringify(PERSONALITY_TABLE))},`);
lines.push(`  personality_prompt_version = ${JSON.stringify(PERSONALITY_PROMPT_VERSION)},`);
lines.push(`  schema = ${long(JSON.stringify(schema))},`);
lines.push(`  voice_schema = ${long(JSON.stringify(gameSchema(true)))},`);
lines.push(`  contracts = { text = ${long(contract(false))}, voice = ${long(contract(true))} },`);
lines.push(`  motions = ${long(JSON.stringify(AMM_MOTIONS))},`);
lines.push(`  story_data = ${long(JSON.stringify(buildGameStoryData()))},`);
lines.push('  blocked = {');
for (const [key, reason] of Object.entries(blocked)) lines.push(`    ${key} = ${long(reason)},`);
lines.push('  },');
lines.push('  characters = {');
for (const [key, value] of Object.entries(characters)) {
  lines.push(`    ${key} = {`);
  lines.push(`      instructions = ${long(value.instructions)},`);
  lines.push(`      actions = ${long(JSON.stringify(value.actions))},`);
  lines.push('      messages = {');
  for (const message of value.messages) lines.push(`        ${long(message)},`);
  lines.push('      },');
  lines.push('    },');
}
lines.push('  },');
lines.push('}');
process.stdout.write(lines.join('\n') + '\n');
