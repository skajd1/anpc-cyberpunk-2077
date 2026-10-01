import { DialogueEngine, ACTIONS, SELECTION_ACTIONS } from './core.js';
import { compileResearchTurn } from './research.js';

const clone = value => structuredClone(value);
export const OUTFITS = [
  { id: 'plain', slot: 'outerwear', display_name: '평범한 검은 재킷', appearance_text: '무광 검은색의 단정한 재킷' },
  { id: 'bright', slot: 'outerwear', display_name: '화려한 빨간 재킷', appearance_text: '광택 있는 빨간색과 밝은 장식이 돋보이는 재킷' },
  { id: 'nomad', slot: 'outerwear', display_name: '낡은 가죽 재킷', appearance_text: '먼지와 사용 흔적이 있는 갈색 가죽 재킷' }
];
export function resolveOutfit(settings) {
  if (settings.outfitId !== 'custom') return OUTFITS.find(o => o.id === settings.outfitId) ?? null;
  const display_name = settings.outfitName?.trim(), appearance_text = settings.outfitDescription?.trim();
  if (!display_name || display_name.length > 150 || !appearance_text || appearance_text.length > 500) return null;
  return { id: `custom:${display_name}:${appearance_text}`, slot: 'outerwear', display_name, appearance_text };
}

// 원작 자료와 분리된 창작 군중 카드. 기존 특성 풀 전환 전의 개발용 예시다.
export function withTestCrowds(bundle, personas) {
  const crowds = personas.filter(p => p.npc_type === 'crowd').map(p => ({
    character_key: p.persona_id, display_name: `${p.display_name} · 군중 예시`, npc_type: 'crowd',
    review_status: 'draft', runtime_enabled: false, identity_structure_version: '1.0',
    identity: clone(p.identity), voice_style: clone(p.voice_style), fallback_lines: clone(p.fallback_lines),
    forbidden_claims: clone(p.forbidden_claims), phase_labels: ['일상'], trait_pools: clone(p.trait_pools),
    goals: p.current_goals.map(goal => ({ goal, condition: { field: 'content.phase', op: 'eq', value: '일상' } })),
    dialogue_conditions: { all: [
      { field: 'content.npc_alive_confirmed', op: 'eq', value: true },
      { field: 'content.npc_free_confirmed', op: 'eq', value: true },
      { field: 'content.phase', op: 'eq', value: '일상' }
    ] },
    background: { summary: p.background.text }, lived_context: { occupation: p.current_goals.join(' · ') },
    identity_anchor: { core_values: p.identity.beliefs, hard_limits: p.identity.taboos }, identity_rules: [],
    knowledge_ids: [], example_ids: [], knowledge_profile: { domains: [], response_rules: ['제공되지 않은 전문 지식·비밀을 아는 척하지 않는다.'] }
  }));
  return { ...bundle, cards: [...bundle.cards, ...crowds] };
}

export class ScenarioEngine extends DialogueEngine {
  constructor({ bundle, npcKey, settings, base, notify, clock }) {
    const readSettings = typeof settings === 'function' ? settings : () => settings;
    const initial = compileResearchTurn({ bundle, npcKey, settings: { ...readSettings(), scenario: true },
      context: { observations: {}, recent_turns: [], memory: null, allowed_actions: [] }, playerText: '' });
    const card = bundle.cards.find(c => c.character_key === npcKey);
    super({ personas: [{ ...initial.persona, trait_pools: card.trait_pools }], base, notify, clock });
    this.bundle = bundle; this.npcKey = npcKey; this.npcType = card.npc_type ?? 'community'; this.journal = []; this.lastEncounterAt = null;
    this.readSettings = readSettings;
    this.turnAdapter = args => {
      this.observeOutfit();
      const prepared = compileResearchTurn({ bundle, npcKey, settings: { ...readSettings(), scenario: true }, ...args,
        context: this.context() });
      prepared.persona.traits = clone(this.session.persona.traits);
      return prepared;
    };
  }
  allowed() {
    return this.safe() ? [...clone(ACTIONS).map(a => ({ ...a, execution_mode: 'execute', description: `${a.description} · 모의 제어` })),
      ...(this.readSettings().selectActions ? clone(SELECTION_ACTIONS) : [])] : [];
  }
  start(key) {
    this.assertCanEnter();
    if (this.npcType === 'crowd' && this.lastEncounterAt != null && this.clock() - this.lastEncounterAt >= 600000) this.journal = [];
    super.start(key); this.observeOutfit();
  }
  assertCanEnter() {
    compileResearchTurn({ bundle: this.bundle, npcKey: this.npcKey, settings: { ...this.readSettings(), scenario: true },
      context: { observations: {}, recent_turns: [], memory: null, allowed_actions: [] }, playerText: '' });
    if (!this.safe() || this.world.distance > 4) throw new Error('안전 상태로 복귀한 뒤 4m 이내에서 진입하세요.');
  }
  observeOutfit() {
    if (!this.session) return;
    const s = this.readSettings();
    if (s.outfitVisible !== true) return;
    const outfit = resolveOutfit(s);
    if (!outfit) return;
    const last = this.journal.findLast(e => e.event_type === 'outfit_observation');
    if (last?.outfit.id === outfit.id) return;
    this.journal.push({ event_id: crypto.randomUUID(), event_type: 'outfit_observation', kind: 'observation',
      epistemic_status: 'runtime_confirmed', source: 'mock_displayed_outfit', observed_at_ms: this.clock(), outfit: clone(outfit) });
  }
  context() {
    const context = super.context(), s = this.readSettings(), outfit = resolveOutfit(s);
    const observations = { weapon_drawn: this.world.weapon_drawn, location: this.world.location,
      visible_outfit: s.outfitVisible === true && outfit ? [{ slot: outfit.slot, display_name: outfit.display_name,
        appearance_text: outfit.appearance_text, description_source: 'mock_displayed_item_text' }] : null,
      outfit_status: s.outfitVisible === true && outfit ? 'observed' : 'unknown', source: 'mock_game_context' };
    // 원문과 관찰을 구분해 로컬에서 선별한다. 자기보고를 사실로 승격하지 않는다.
    const utterances = this.journal.filter(e => /_utterance$/.test(e.event_type));
    const raw = utterances.slice(-6);
    const outfits = this.journal.filter(e => e.event_type === 'outfit_observation').slice(-2).map(e => {
      const copy = clone(e); delete copy.outfit.id; return copy;
    });
    return { ...context, observations, recent_turns: raw.map(e => ({ role: e.role, text: e.text })),
      memory: { memory_view_version: '1.2', short_term: { active_state: { relationship_source: 'current_canon_context' },
        recalled_events: clone(outfits) }, long_term: [] },
      // 운영 규격의 요약/검색기가 아닌 원문 기반 시험 저장소임을 표시한다.
      prototype_memory: { implementation: 'raw_local_test_journal', npc_type: this.npcType, event_count: this.journal.length,
        player_name_disclosed: utterances.some(e => e.role === 'player' && /(?:이름은|나는)\s*V(?:야|입니다|예요|다|\b)/i.test(e.text)) },
      allowed_actions: this.allowed(), conversation_state: { ...context.conversation_state,
        encounter: utterances.length ? 'recontact' : 'first', traits: clone(this.session.persona.traits) } };
  }
  onAccepted({ playerText, reply, context }) {
    this.journal.push({ event_id: crypto.randomUUID(), event_type: 'player_utterance', role: 'player', text: playerText,
      kind: 'player_claim', epistemic_status: 'reported', source: 'player_text' },
    { event_id: crypto.randomUUID(), event_type: 'npc_utterance', role: 'npc', text: [reply.dialogue, reply.follow_up].filter(Boolean).join('\n'),
      kind: 'npc_statement', epistemic_status: 'reported', source: 'model_or_mock' });
    if (reply.action && context.allowed_actions.find(a => a.action_id === reply.action.action_id)?.execution_mode === 'execute')
      this.journal.push({ event_id: crypto.randomUUID(), event_type: 'action_result', ...clone(this.session.lastAction), source: 'mock_control' });
    // 현재 시험 원문 한도. 잘린 기록을 요약됐다고 주장하지 않는다.
    this.journal = this.journal.slice(-512);
  }
  end(normal = true, reason) {
    if (this.session) this.lastEncounterAt = this.clock();
    super.end(normal, reason);
  }
  respawn(key) { super.respawn(key); this.journal = []; this.lastEncounterAt = null; }
  changeWorld(update) {
    const invalidated = (update.saveScope && update.saveScope !== this.saveScope)
      || (this.npcType === 'crowd' && Number.isFinite(update.distance) && update.distance > 10);
    super.changeWorld(update);
    if (invalidated) { this.journal = []; this.lastEncounterAt = null; this.emit(); }
  }
  worldReset() { this.journal = []; this.lastEncounterAt = null; super.worldReset(); }
  clearMemory() { this.journal = []; this.lastEncounterAt = null; super.clearMemory(); }
  restore(journal = [], world) {
    this.end(false, '모의 저장 로드'); this.worldEpoch++; this.instances.clear(); this.memories.clear();
    this.journal = this.npcType === 'community' ? clone(journal) : []; this.closedTurns = [];
    this.lastEncounterAt = null;
    if (world) this.world = clone(world);
    this.lastActionSelection = null; this.lastReply = null; this.lastRawReply = null; this.lastPrompt = null; this.lastSelection = null;
  }
}

// 저장 호출 순간의 완료된 사건만 복사한다. 대기 요청과 군중 인스턴스는 복원하지 않는다.
export function captureTestSave(engines, scenario) {
  return { scenario: clone(scenario), worlds: Object.fromEntries(Object.entries(engines).map(([key, e]) => [key, clone(e.world)])), journals: Object.fromEntries(Object.entries(engines)
    .filter(([, e]) => e.npcType === 'community').map(([key, e]) => [key, clone(e.journal)])) };
}
