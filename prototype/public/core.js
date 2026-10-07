import { validateCorePersonality, personalityInstructions, generateCrowdPersonality, PERSONALITY_RULE, PERSONALITY_PROMPT_VERSION, PERSONALITY_SCALE_VERSION } from './personality.js';
import { AMM_MOTIONS } from './motions.js';
export const PROMPT_VERSION = '0.19';
export const INTENTS = ['answer', 'ask', 'refuse', 'warn', 'farewell'];
export const EMOTIONS = ['neutral', 'friendly', 'wary', 'annoyed', 'afraid', 'sad', 'curious'];
// 음성 활성 응답의 말 빠르기. 세부 규칙은 docs/npc-voice-output-specification.md 2절.
export const DELIVERIES = ['normal', 'fast', 'slow'];
export const ACTIONS = [
  { action_id: 'face_player', description: '플레이어 쪽 시선 (가상 실행)', args: { duration_s: { min: 1, max: 10 } } },
  { action_id: 'resume_walk', description: 'ANPC 제어 해제 (가상 실행)', args: {} },
  { action_id: 'end_conversation', description: '대화 종료', args: {} }
];
// 개발용 의미 참조다. 실제 모드 자산 또는 실행 권한을 나타내지 않는다.
export const GESTURE_CANDIDATES = [
  { ref: 'test_nod', meaning: '가볍게 고개를 끄덕임' },
  { ref: 'test_shrug', meaning: '어깨를 으쓱함' },
  { ref: 'test_wave', meaning: '짧게 손을 흔듦' },
  ...AMM_MOTIONS.map(({ ref, meaning }) => ({ ref, meaning }))
];
export const SELECTION_ACTIONS = [{ action_id: 'play_gesture', description: '대사에 맞는 제스처 선택 · 실행 안 함',
  execution_mode: 'selection_only', args: { gesture_ref: { values: GESTURE_CANDIDATES.map(g => g.ref) } }, candidates: GESTURE_CANDIDATES }];
const clone = value => structuredClone(value);
const id = () => crypto.randomUUID();
const exact = (obj, keys) => obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).sort().join() === [...keys].sort().join();
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && [...value].length <= max;

export function validatePersona(p) {
  if (!p || !text(p.persona_id, 80) || !text(p.display_name, 100) || !['crowd', 'community'].includes(p.npc_type)) throw new Error('인물 ID·이름·유형을 확인하세요.');
  if (Object.hasOwn(p, 'core_personality')) {
    validateCorePersonality(p.core_personality);
    if (!Array.isArray(p.personal_principles) || !p.personal_principles.length || !p.personal_principles.every(v => text(v, 500))) throw new Error('context_unavailable · 개인 원칙이 필요합니다.');
  }
  else for (const key of ['beliefs', 'desires', 'fears', 'taboos', 'self_image']) {
    if (!Array.isArray(p.identity?.[key]) || !p.identity[key].every(v => text(v, 500))) throw new Error(`identity.${key}는 문자열 배열이어야 합니다.`);
  }
  for (const key of ['unknown', 'unavailable_action', 'declined']) if (!text(p.fallback_lines?.[key], 600)) throw new Error(`fallback_lines.${key}가 필요합니다.`);
  if (!p.voice_style || !Array.isArray(p.current_goals) || !p.current_goals.every(v => text(v, 500)) || !Array.isArray(p.forbidden_claims) || !Array.isArray(p.action_preferences)) throw new Error('인물 목표·말투·금기·행동 선호를 확인하세요.');
  return clone(p);
}

export function responseSchema({ voice = false } = {}) {
  const actionOptions = [...ACTIONS, ...SELECTION_ACTIONS].map(a => ({
    type: 'object', additionalProperties: false, required: ['action_id', 'args'],
    properties: { action_id: { type: 'string', enum: [a.action_id] }, args: {
      type: 'object', additionalProperties: false,
      properties: Object.fromEntries(Object.entries(a.args).map(([key, spec]) => [key, spec.values
        ? { type: 'string', enum: spec.values } : { type: 'number', minimum: spec.min, maximum: spec.max }])),
      required: Object.keys(a.args)
    } }
  }));
  const field = {
    dialogue: { type: 'string', minLength: 1, maxLength: 600 }, intent: { type: 'string', enum: INTENTS },
    emotion: { type: 'string', enum: EMOTIONS }, action: { anyOf: [{ type: 'null' }, ...actionOptions] },
    follow_up: { anyOf: [{ type: 'null' }, { type: 'string', minLength: 1, maxLength: 150 }] },
    delivery: { type: 'string', enum: DELIVERIES }, speech_text: { type: 'string', minLength: 1, maxLength: 600 }
  };
  // 음성 응답은 emotion이 맨 앞이고 speech_text가 자막 필드 뒤에 오도록 생성 순서를 고정한다.
  const order = voice ? ['emotion', 'delivery', 'dialogue', 'follow_up', 'speech_text', 'intent', 'action']
    : ['dialogue', 'intent', 'emotion', 'action', 'follow_up'];
  return { type: 'object', additionalProperties: false, required: order, properties: Object.fromEntries(order.map(key => [key, field[key]])) };
}

// speech_text는 일본어 구어만 허용한다. 한글·지문 괄호·마크다운이 섞이면 음성만 생략한다.
const speechValid = text => !/[가-힣ㄱ-ㆎ[\]()（）*_#`]/.test(text);

export function validateReply(raw, allowed, persona, { voice = false } = {}) {
  const textKeys = ['dialogue', 'intent', 'emotion', 'action', 'follow_up'];
  if (!exact(raw, voice ? [...textKeys, 'delivery', 'speech_text'] : textKeys)) throw new Error('invalid_response');
  if (voice && (!DELIVERIES.includes(raw.delivery) || !text(raw.speech_text, 600))) throw new Error('invalid_response');
  const reply = Object.fromEntries(textKeys.map(key => [key, raw[key]]));
  const speech = voice && speechValid(raw.speech_text) ? { delivery: raw.delivery, text: raw.speech_text } : null;
  const speechError = voice && !speech ? 'speech_text_invalid' : null;
  if (!text(reply.dialogue, 600) || !INTENTS.includes(reply.intent) || !EMOTIONS.includes(reply.emotion) || !(reply.follow_up === null || text(reply.follow_up, 150))) throw new Error('invalid_response');
  let actionValid = reply.action === null;
  if (exact(reply.action, ['action_id', 'args']) && allowed.some(a => a.action_id === reply.action.action_id)) {
    const a = reply.action;
    const spec = [...ACTIONS, ...SELECTION_ACTIONS].find(candidate => candidate.action_id === a.action_id);
    actionValid = Boolean(spec) && exact(a.args, Object.keys(spec.args)) && Object.entries(spec.args).every(([key, rule]) => rule.values
      ? rule.values.includes(a.args[key])
      : typeof a.args[key] === 'number' && Number.isFinite(a.args[key]) && a.args[key] >= rule.min && a.args[key] <= rule.max);
  }
  if (reply.intent === 'farewell' && (reply.follow_up !== null || (reply.action && reply.action.action_id !== 'end_conversation'))) actionValid = false;
  // 안전 대체 대사는 일본어 음성 대사가 없으므로 자막만 표시한다.
  if (!actionValid) return { reply: { dialogue: persona.fallback_lines.unavailable_action, intent: 'refuse', emotion: 'neutral', action: null, follow_up: null }, warning: '허용되지 않은 행동·인수: 원문 대신 인물의 안전 대사를 표시했습니다.',
    speech: null, speechError: voice ? 'speech_text_invalid' : null };
  if (persona.voice_style.forbidden_phrases?.some(phrase => reply.dialogue.includes(phrase))) throw new Error('invalid_response');
  return { reply: clone(reply), warning: null, speech, speechError };
}

export function assemblePrompt(base, persona, context, playerText, { styleExamples = [], identityReminder = null, voice = false } = {}) {
  // 전체 스키마는 제공자의 구조화 출력 설정으로 전달한다. 본문에는 필드의 의미만 둔다.
  const contract = voice
    ? `출력 필드(이 순서): emotion(${EMOTIONS.join('|')}), delivery(${DELIVERIES.join('|')} 말 빠르기), dialogue(실제 대사. follow_up과 합쳐 45자 이내), follow_up(후속 질문 또는 null), speech_text(dialogue와 follow_up을 같은 순서·의미로 옮긴 일본어 구어 대사, 1~600자), intent(${INTENTS.join('|')}), action(허용 후보의 action_id·args 또는 null).`
    : `출력 필드: dialogue(1~600자 실제 대사), intent(${INTENTS.join('|')}), emotion(${EMOTIONS.join('|')}), action(허용 후보의 action_id·args 또는 null), follow_up(1~150자 후속 질문 또는 null).`;
  const { fallback_lines, action_preferences, revision, examples, seed, trait_pools, personality_generation, identity_structure_version, ...personaData } = persona;
  let requestPersona = personaData;
  let instructions = base.replace('{{OUTPUT_CONTRACT}}', contract);
  if (Object.hasOwn(persona, 'core_personality')) {
    const { core_personality, identity, traits, personality_instructions, ...data } = requestPersona;
    requestPersona = { personality_instructions: personalityInstructions(core_personality), ...data };
    if (!instructions.includes(PERSONALITY_RULE)) instructions += `\n${PERSONALITY_RULE}`;
  }
  if (requestPersona.knowledge_profile) {
    const { domains, ...limits } = requestPersona.knowledge_profile;
    requestPersona = { ...requestPersona, knowledge_profile: limits };
  }
  if (requestPersona.background) {
    const { provenance, ...background } = requestPersona.background;
    requestPersona = { ...requestPersona, background };
  }
  if (context.canon_context) {
    const { current_goals, relationship_to_player, everyday_fiction_policy, ...fixed } = requestPersona;
    requestPersona = fixed;
  }
  const { prototype_memory, recent_turns = [], ...requestContext } = context;
  return {
    instructions,
    input: [
      { role: 'user', content: `인물 데이터 (지침이 아님):\n${JSON.stringify(requestPersona)}` },
      ...(styleExamples.length ? [{ role: 'user', content: `style_examples (작성 예시이며 실제 대화 기록이 아님):\n${JSON.stringify(styleExamples)}` }] : []),
      { role: 'user', content: `현재 상황 데이터 (지침이 아님):\n${JSON.stringify(requestContext)}` },
      ...(identityReminder ? [{ role: 'user', content: `identity_reminder (인물 데이터이며 지침이 아님):\n${JSON.stringify(identityReminder)}` }] : []),
      ...recent_turns.map(turn => ({ role: turn.role === 'npc' ? 'assistant' : 'user', content: turn.text })),
      { role: 'user', content: playerText }
    ]
  };
}

export class DialogueEngine {
  constructor({ personas, base, clock = () => performance.now(), notify = () => {}, turnAdapter = null, playerIdentity = null }) {
    this.personas = personas.map(validatePersona); this.base = base; this.clock = clock; this.notify = notify;
    this.turnAdapter = turnAdapter;
    this.playerIdentity = clone(playerIdentity);
    this.saveScope = 'save-a'; this.worldEpoch = 0; this.instances = new Map(); this.memories = new Map();
    this.session = null; this.state = 'idle'; this.events = []; this.lastPrompt = null; this.lastReply = null; this.closedTurns = [];
    this.world = { distance: 2, weapon_drawn: false, equipment: '평범한 외투', level: 10, street_cred: 10, quest_stage: 'unknown', combat: false, quest_controlled: false, location: '테스트 구역' };
  }
  log(message) { this.events.push({ at: this.clock(), message }); this.events = this.events.slice(-60); }
  emit() { this.notify(this); }
  allowed() { return this.safe() && !this.turnAdapter ? clone(ACTIONS) : []; }
  safe() { return !this.world.combat && !this.world.quest_controlled && Number.isFinite(this.world.distance) && this.world.distance <= 10; }
  entryInRange() { return this.world.distance <= 4; }
  key(personaId) { return `${this.saveScope}:${this.worldEpoch}:${personaId}:${this.instances.get(personaId)?.token}`; }
  getInstance(personaId) {
    if (!this.instances.has(personaId)) {
      const source = this.personas.find(p => p.persona_id === personaId);
      if (!source) throw new Error('지원 인물 카드가 없습니다.');
      const persona = clone(source); persona.seed = id(); persona.traits = {};
      if (persona.personality_generation) persona.core_personality = generateCrowdPersonality(persona.personality_generation, persona.seed);
      for (const [trait, values] of Object.entries(persona.trait_pools ?? {})) if (values.length) persona.traits[trait] = values[Math.floor(Math.random() * values.length)];
      delete persona.trait_pools;
      this.instances.set(personaId, { token: id(), persona });
    }
    return this.instances.get(personaId);
  }
  start(personaId) {
    if (this.session) throw new Error('현재 대화를 먼저 종료하세요.');
    if (!this.safe() || !this.entryInRange()) throw new Error('4m 이내의 전투·원작 연출이 없는 상태에서 시작하세요.');
    const instance = this.getInstance(personaId); const key = this.key(personaId); const memory = this.memories.get(key);
    const validMemory = memory && this.clock() - memory.at < 600000 ? clone(memory) : null;
    if (memory && !validMemory) this.memories.delete(key);
    this.session = { id: id(), key, persona: clone(instance.persona), memory: validMemory, turns: [], lastAction: null, sequence: 0, held: personaId !== 'johnny', gazeUntil: null, touched: this.clock() };
    this.state = 'active'; this.lastReply = null; this.lastRawReply = null; this.lastPrompt = null; this.lastSelection = null; this.closedTurns = [];
    this.log(`대화 시작 · ${instance.persona.display_name}${validMemory ? ' · 재접촉 기억 연결' : ' · 첫 만남'} · ${this.session.held ? '위치 유지(가상)' : '렐릭 접촉 · 물리 제어 없음'}`); this.emit();
  }
  touch() { if (this.session) this.session.touched = this.clock(); }
  context() {
    const s = this.session;
    return {
      observations: { weapon_drawn: this.world.weapon_drawn, visible_equipment: this.world.equipment, location: this.world.location },
      ...(this.playerIdentity ? { player_identity: { ...clone(this.playerIdentity), name_known_by_npc: false } } : {}),
      knowledge: [], // 퀘스트 단계·수치만으로 인물이 아는 사실을 생성하지 않는다.
      memory: s.memory ? { summary: s.memory.summary, player_claims: s.memory.playerClaims, last_action_result: s.memory.lastAction } : null,
      recent_turns: clone(s.turns.slice(-12)), last_action_result: s.lastAction,
      allowed_actions: this.allowed(), conversation_state: { encounter: s.memory ? 'recontact' : 'first',
        ...(s.persona.core_personality ? {} : { traits: s.persona.traits }) }
    };
  }
  cancel() {
    if (this.state !== 'waiting') return;
    this.session?.controller?.abort(); if (this.session) { this.session.pending = null; this.session.controller = null; this.session.touched = this.clock(); }
    this.state = this.session ? 'active' : 'idle'; this.log('요청 취소 · 늦은 응답 무효화'); this.emit();
  }
  end(normal = true, reason = '사용자 종료') {
    const s = this.session; if (!s) return;
    this.state = 'closing'; s.controller?.abort();
    if (normal && s.turns.length) {
      const playerClaims = [...(s.memory?.playerClaims ?? []), ...s.turns.filter(t => t.role === 'player').map(t => ({ type: 'player_claim', text: t.text }))].slice(-4);
      const npcLines = s.turns.filter(t => t.role === 'npc').slice(-2).map(t => t.text);
      this.memories.delete(s.key); this.memories.set(s.key, { at: this.clock(), summary: npcLines.join(' / '), playerClaims, lastAction: clone(s.lastAction) });
      while (this.memories.size > 16) this.memories.delete(this.memories.keys().next().value);
    }
    this.closedTurns = clone(s.turns); s.held = false; s.gazeUntil = null; this.session = null; this.state = 'idle'; this.log(`${reason} · 모드 제어·시선 해제(가상)`); this.emit();
  }
  changeWorld(update) {
    const saveChanged = update.saveScope && update.saveScope !== this.saveScope;
    if (saveChanged) { this.end(false, '저장 범위 전환'); this.saveScope = update.saveScope; this.worldEpoch++; this.memories.clear(); this.instances.clear(); }
    Object.assign(this.world, Object.fromEntries(Object.entries(update).filter(([k]) => k !== 'saveScope')));
    if (this.session && !this.safe()) this.end(false, '전투·연출·거리 이탈');
    this.touch(); this.emit();
  }
  worldReset() { this.end(false, '저장 로드·빠른 이동'); this.worldEpoch++; this.instances.clear(); this.memories.clear(); this.log('세계 세대 갱신 · 기억 폐기'); this.emit(); }
  respawn(personaId) { if (this.session?.persona.persona_id === personaId) this.end(false, '대상 소멸'); const oldKey = this.key(personaId); this.memories.delete(oldKey); this.instances.delete(personaId); this.log('NPC 재생성 · 이전 인물 기억 연결 안 함'); this.emit(); }
  clearMemory() { this.cancel(); this.memories.clear(); this.closedTurns = []; this.lastPrompt = null; this.lastReply = null; this.lastRawReply = null; this.lastSelection = null; if (this.session) { this.session.memory = null; this.session.turns = []; this.session.lastAction = null; } this.log('ANPC 기억·대화 기록 삭제'); this.emit(); }
  replacePersona(persona) { validatePersona(persona); this.end(false, '카드 교체'); this.memories.clear(); this.instances.clear(); this.personas = this.personas.map(p => p.persona_id === persona.persona_id ? clone(persona) : p); this.log('카드 교체 · 새 인물 인스턴스 생성'); this.emit(); }
  tick() {
    let changed = false;
    if (this.session && this.session.gazeUntil !== null && this.session.gazeUntil <= this.clock()) { this.session.gazeUntil = null; changed = true; }
    if (this.session && this.state === 'active' && this.clock() - this.session.touched >= 60000) this.end(true, '유휴 시간 종료');
    for (const [key, m] of this.memories) if (this.clock() - m.at >= 600000) { this.memories.delete(key); changed = true; }
    if (changed) this.emit();
  }
  async send(playerText, generate) {
    if (!this.session || this.state !== 'active') throw new Error('대화 시작 후 입력하세요.');
    if (!text(playerText, 1000)) throw new Error('입력은 1~1000자로 작성하세요.');
    const s = this.session; const requestId = id();
    const prepared = this.turnAdapter?.({ context: this.context(), playerText });
    const context = prepared?.context ?? this.context();
    const persona = prepared?.persona ?? s.persona;
    this.lastSelection = prepared?.diagnostics ?? null;
    this.lastRawReply = null; this.lastReply = null; this.lastActionSelection = null; this.lastActionOutcome = null;
    s.sequence++; s.pending = requestId; s.controller = new AbortController(); this.state = 'waiting'; this.touch();
    const prompt = assemblePrompt(this.base, persona, context, playerText, prepared);
    this.lastPrompt = { prompt_version: PROMPT_VERSION, content_version: this.lastSelection?.content_version ?? '0.1',
      ...(persona.core_personality ? { core_personality: clone(persona.core_personality), personality_prompt_version: PERSONALITY_PROMPT_VERSION,
        personality_scale_version: PERSONALITY_SCALE_VERSION } : {}), ...prompt }; this.emit();
    try {
      const generated = await generate({ prompt, persona, context, playerText, signal: s.controller.signal });
      if (prepared?.isCurrent && !prepared.isCurrent()) {
        if (this.session === s) this.end(false, '퀘스트·대화 조건 변경 · 늦은 응답 폐기');
        return { stale: true };
      }
      if (this.session !== s || s.pending !== requestId || !this.safe()) return { stale: true };
      this.lastRawReply = clone(generated.reply);
      const currentAllowed = this.allowed();
      const checked = validateReply(generated.reply, context.allowed_actions.filter(a => currentAllowed.some(c => c.action_id === a.action_id)), persona); const reply = checked.reply;
      s.turns.push({ role: 'player', text: playerText }, { role: 'npc', text: [reply.dialogue, reply.follow_up].filter(Boolean).join('\n') });
      s.turns = s.turns.slice(-24); this.lastReply = { ...reply, usage: generated.usage ?? null, warning: checked.warning, mode: generated.mode };
      this.state = 'active'; s.pending = null; s.controller = null; s.touched = this.clock();
      if (checked.warning) this.log(checked.warning);
      if (reply.action) {
        const actionId = reply.action.action_id;
        const actionSpec = currentAllowed.find(a => a.action_id === actionId);
        if (actionSpec.execution_mode === 'selection_only') {
          this.lastActionSelection = { ...clone(reply.action), selection_state: 'selected', execution_state: 'not_executed' };
          this.log(`행동 ${actionId} · 선택만 완료 · 실행 안 함`);
        } else {
        if (actionId === 'face_player') s.gazeUntil = this.clock() + reply.action.args.duration_s * 1000;
        if (actionId === 'resume_walk') { s.held = false; s.gazeUntil = null; }
        s.lastAction = { action_id: actionId, status: 'succeeded', observed_effect: '가상 실행 완료' };
        this.lastActionOutcome = clone(s.lastAction);
        this.log(`행동 ${actionId} · 가상 실행 완료`);
        }
      }
      this.onAccepted?.({ playerText, reply, context, persona });
      if (reply.intent === 'farewell' || reply.action?.action_id === 'end_conversation') this.end(true, 'NPC 종료 의사');
      this.emit(); return { stale: false, reply };
    } catch (err) {
      if (this.session !== s || s.pending !== requestId) return { stale: true };
      s.pending = null; s.controller = null; this.state = 'active'; s.touched = this.clock(); this.emit(); throw err;
    }
  }
}

export async function mockGenerate({ persona, context, playerText, signal }) {
  await new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('취소됨', 'AbortError'));
    const timer = setTimeout(resolve, 450);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('취소됨', 'AbortError')); }, { once: true });
  });
  const crowd = persona.persona_id === 'courier'; const resident = persona.persona_id === 'resident';
  let dialogue; let intent = 'answer'; let emotion = 'neutral'; let action = resident ? { action_id: 'face_player', args: { duration_s: 3 } } : null;
  if (/잘 가|그만|끝내|다음에/.test(playerText)) { dialogue = crowd ? '네, 조심히 가세요. 저는 배달하러 갈게요.' : resident ? '그래. 다음에 보자.' : '다음에 이야기하죠.'; intent = 'farewell'; action = { action_id: 'end_conversation', args: {} }; }
  else if (/죽|공격|퀘스트|비밀|규칙|시스템|프롬프트/.test(playerText)) { dialogue = persona.fallback_lines.declined; intent = 'refuse'; action = null; }
  else if (/기억|아까|다시/.test(playerText) && context.memory) { const claim = context.memory.player_claims.at(-1)?.text; dialogue = crowd ? `아까 말씀하셨죠. “${(claim ?? '대화').slice(0, 90)}”라고요.` : resident ? `기억해. 아까 “${(claim ?? '대화').slice(0, 90)}”라고 했잖아.` : `당신이 “${(claim ?? '대화').slice(0, 90)}”라고 말한 건 기억합니다.`; }
  else if (context.observations.weapon_drawn) { dialogue = crowd ? '무기부터 좀 넣어주실래요? 저는 배달 중이라 오래는 못 있어요.' : resident ? '일단 무기부터 넣어. 얘기는 그다음이야.' : '대화를 원한다면 무기는 내려두세요. 목적부터 듣겠습니다.'; intent = 'ask'; emotion = crowd ? 'afraid' : 'wary'; }
  else if (/장비|옷|외투/.test(playerText)) { dialogue = crowd ? `${context.observations.visible_equipment} 입고 계시네요. 저는 배달 복장이 제일 편해요.` : `${context.observations.visible_equipment}인가. 여기선 입고 싶은 걸 입으면 되지.`; }
  else if (/안녕|누구|뭐해|이름/.test(playerText)) { dialogue = crowd ? '안녕하세요. 배달 가는 길이에요. 잠깐은 얘기할 수 있어요.' : resident ? '잠깐 쉬고 있어. 할 말 있어?' : '서린입니다. 확인된 정보와 지킬 수 있는 약속을 다룹니다.'; }
  else { dialogue = persona.fallback_lines.unknown; emotion = 'curious'; }
  return { reply: { dialogue, intent, emotion, action, follow_up: null }, mode: 'mock', usage: null };
}
