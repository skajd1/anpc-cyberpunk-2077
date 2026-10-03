import { DialogueEngine, ACTIONS, SELECTION_ACTIONS } from './core.js';
import { compileResearchTurn, resolveRelationshipStage } from './research.js';
import { evaluateStoryPolicy, storySignature, storyRequiresReset } from './story.js';
import { TestMemory } from './memory.js';

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

// 원작 자료와 분리된 창작 군중 카드. Big Five 생성 원형은 개발용 작성 초안이다.
export function withTestCrowds(bundle, personas) {
  const common = bundle.facts.filter(f => f.knowledge_layer === 'common' && f.spoiler_scope === 'none'
    && f.usage_mode === 'answer' && f.id !== bundle.playerIdentity?.fact_id);
  const crowdKnowledge = [];
  const crowds = personas.filter(p => p.npc_type === 'crowd').map(p => ({
    character_key: p.persona_id, display_name: `${p.display_name} · 군중 예시`, npc_type: 'crowd',
    review_status: 'draft', runtime_enabled: false, identity_structure_version: '1.0',
    identity: clone(p.identity), voice_style: clone(p.voice_style), fallback_lines: clone(p.fallback_lines),
    core_personality: clone(p.personality_generation.default), personality_generation: clone(p.personality_generation),
    personal_principles: clone(p.personal_principles),
    forbidden_claims: clone(p.forbidden_claims), phase_labels: ['일상'], trait_pools: clone(p.trait_pools),
    goals: p.current_goals.map(goal => ({ goal, condition: { field: 'content.phase', op: 'eq', value: '일상' } })),
    dialogue_conditions: { all: [
      { field: 'content.npc_alive_confirmed', op: 'eq', value: true },
      { field: 'content.npc_free_confirmed', op: 'eq', value: true },
      { field: 'content.phase', op: 'eq', value: '일상' }
    ] },
    background: { summary: p.background.text }, lived_context: { occupation: p.current_goals.join(' · ') },
    identity_anchor: { core_values: p.identity.beliefs, hard_limits: p.identity.taboos }, identity_rules: [],
    knowledge_ids: [], example_ids: [], knowledge_profile: { domains: ['city_life', 'public_figures'].map(domain_id => ({ domain_id, depth: 'familiar' })),
      response_rules: ['공개 개요만 알고 직접 만남·전문 경험·비밀을 만들어내지 않는다.'] }
  }));
  for (const card of crowds) for (const fact of common) {
    const id = `K_${card.character_key.toUpperCase()}_${fact.id}`;
    card.knowledge_ids.push(id);
    crowdKnowledge.push({ id, fact_id: fact.id, owner_key: card.character_key,
      domain_id: fact.topic_tags.includes('public_figure') ? 'public_figures' : 'city_life', required_depth: 'familiar',
      access_condition: { all: [
        { field: 'content.era', op: 'eq', value: '2077' },
        { field: 'content.npc_key', op: 'eq', value: card.character_key },
        { field: `content.grants.${fact.id}`, op: 'eq', value: true }
      ] }, certainty: 'knows', disclosure: 'public', claim_limits: fact.claim_limits, review_status: 'draft' });
  }
  return { ...bundle, cards: [...bundle.cards, ...crowds], knowledge: [...bundle.knowledge, ...crowdKnowledge] };
}

export class ScenarioEngine extends DialogueEngine {
  constructor({ bundle, npcKey, settings, base, notify, clock, summarize, persist }) {
    const readSettings = typeof settings === 'function' ? settings : () => settings;
    const initial = compileResearchTurn({ bundle, npcKey, settings: { ...readSettings(), scenario: true },
      context: { observations: {}, recent_turns: [], memory: null, allowed_actions: [] }, playerText: '' });
    const card = bundle.cards.find(c => c.character_key === npcKey);
    super({ personas: [{ ...initial.persona, trait_pools: card.trait_pools, personality_generation: card.personality_generation }], base, notify, clock });
    this.bundle = bundle; this.npcKey = npcKey; this.npcType = card.npc_type ?? 'community'; this.journal = []; this.lastEncounterAt = null;
    this.readSettings = readSettings; this.lastStorySettings = clone(readSettings());
    this.longMemory = new TestMemory(); this.summarize = summarize; this.persist = persist;
    this.turnAdapter = args => {
      if ([...JSON.stringify(this.journal)].length + [...args.playerText].length + 2000 > 192000) throw new Error('memory_capacity_exceeded');
      this.synchronizeStoryMemory();
      const signature = storySignature(readSettings());
      this.observeOutfit();
      const prepared = compileResearchTurn({ bundle, npcKey, settings: { ...readSettings(), scenario: true }, ...args,
        context: this.context(args.playerText), corePersonality: this.session.persona.core_personality });
      if (this.npcType === 'crowd') prepared.persona.lived_context.interests = Object.values(this.session.persona.traits);
      prepared.isCurrent = () => storySignature(readSettings()) === signature && this.storyStatus().allowed;
      return prepared;
    };
  }
  synchronizeStoryMemory() {
    const next = this.readSettings();
    if (storyRequiresReset(this.lastStorySettings, next)) this.clearMemory();
    this.lastStorySettings = clone(next);
  }
  storyStatus() {
    const card = this.bundle.cards.find(c => c.character_key === this.npcKey), settings = this.readSettings();
    return evaluateStoryPolicy(this.bundle, card, settings, resolveRelationshipStage(card, settings));
  }
  safe() {
    if (!this.readSettings || !this.bundle) return super.safe();
    const story = this.storyStatus();
    if (!story.allowed) return false;
    return story.enabled && story.channel === 'engram'
      ? !this.world.combat && !this.world.quest_controlled : super.safe();
  }
  entryInRange() { return this.readSettings?.().storyState && this.storyStatus().channel === 'engram' || super.entryInRange(); }
  tick() {
    this.synchronizeStoryMemory();
    if (this.session && this.readSettings().storyState && this.activeStorySignature !== storySignature(this.readSettings())) this.end(false, '퀘스트 상태 변경');
    if (this.session && !this.safe()) this.end(false, '대화 지원 구간 종료');
    super.tick();
  }
  allowed() {
    if (this.npcKey === 'johnny') return this.safe() ? clone(ACTIONS.filter(a => a.action_id === 'end_conversation')).map(a => ({ ...a, execution_mode: 'execute' })) : [];
    return this.safe() ? [...clone(ACTIONS).map(a => ({ ...a, execution_mode: 'execute', description: `${a.description} · 모의 제어` })),
      ...(this.readSettings().selectActions ? clone(SELECTION_ACTIONS) : [])] : [];
  }
  start(key) {
    this.synchronizeStoryMemory();
    this.assertCanEnter();
    if (this.npcType === 'crowd' && this.lastEncounterAt != null && this.clock() - this.lastEncounterAt >= 600000) this.clearMemory();
    this.activeStorySignature = storySignature(this.readSettings());
    super.start(key); this.observeOutfit();
  }
  assertCanEnter() {
    compileResearchTurn({ bundle: this.bundle, npcKey: this.npcKey, settings: { ...this.readSettings(), scenario: true },
      context: { observations: {}, recent_turns: [], memory: null, allowed_actions: [] }, playerText: '' });
    if (!this.safe() || !this.entryInRange()) throw new Error('안전 상태로 복귀한 뒤 4m 이내에서 진입하세요.');
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
  context(playerText = '') {
    const context = super.context(), s = this.readSettings(), outfit = resolveOutfit(s);
    const observations = { weapon_drawn: this.world.weapon_drawn, location: this.world.location,
      visible_outfit: s.outfitVisible === true && outfit ? [{ slot: outfit.slot, display_name: outfit.display_name,
        appearance_text: outfit.appearance_text, description_source: 'mock_displayed_item_text' }] : null,
      outfit_status: s.outfitVisible === true && outfit ? 'observed' : 'unknown', source: 'mock_game_context' };
    // 원문과 관찰을 구분해 로컬에서 선별한다. 자기보고를 사실로 승격하지 않는다.
    const utterances = this.journal.filter(e => /_utterance$/.test(e.event_type));
    const recalled = this.longMemory.recall(this.journal, playerText), raw = recalled.recent;
    const outfitEvents = this.journal.filter(e => e.event_type === 'outfit_observation');
    const outfits = outfitEvents.slice(-2).map(e => {
      return { event_ref: e.event_id, event_kind: 'player_observation', speaker: 'runtime',
        text: `${e.outfit.display_name}: ${e.outfit.appearance_text}`, epistemic_status: 'runtime_confirmed',
        temporal_scope: `과거 관찰 순서 ${this.journal.indexOf(e)}`, is_excerpt: false };
    });
    return { ...context, observations, recent_turns: raw.map(e => ({ role: e.role, text: e.text })),
      memory: { memory_view_version: '1.3', short_term: { topic_tags: [], active_items: [],
        recalled_events: [...outfits, ...recalled.recalled_events] }, long_term: recalled.long_term, recall_constraints: [] },
      prototype_memory: { implementation: 'local_journal_summary_recall', npc_type: this.npcType, event_count: this.journal.length,
        summary_count: this.longMemory.records.length, summary_status: this.longMemory.status,
        player_name_disclosed: utterances.some(e => e.role === 'player' && /(?:이름은|나는)\s*V(?:야|입니다|예요|다|\b)/i.test(e.text)) },
      allowed_actions: this.allowed(), conversation_state: { ...context.conversation_state,
        encounter: utterances.length ? 'recontact' : 'first' } };
  }
  onAccepted({ playerText, reply, context }) {
    this.journal.push({ event_id: crypto.randomUUID(), event_type: 'player_utterance', role: 'player', text: playerText,
      kind: 'player_claim', epistemic_status: 'reported', source: 'player_text' },
    { event_id: crypto.randomUUID(), event_type: 'npc_utterance', role: 'npc', text: [reply.dialogue, reply.follow_up].filter(Boolean).join('\n'),
      kind: 'npc_statement', epistemic_status: 'reported', source: 'model_or_mock' });
    if (reply.action && context.allowed_actions.find(a => a.action_id === reply.action.action_id)?.execution_mode === 'execute')
      this.journal.push({ event_id: crypto.randomUUID(), event_type: 'action_result', ...clone(this.session.lastAction), source: 'mock_control' });
    this.persist?.(this);
    if (this.longMemory.needsSummary(this.journal)) void this.consolidateMemory();
  }
  async consolidateMemory() {
    const result = await this.longMemory.consolidate(this.journal, this.summarize);
    if (!result.stale) { this.persist?.(this); this.emit(); }
    return result;
  }
  memorySnapshot() { return { journal: clone(this.journal), memory: this.longMemory.snapshot(), storyState: clone(this.readSettings().storyState ?? null) }; }
  end(normal = true, reason) {
    if (this.session) this.lastEncounterAt = this.clock();
    super.end(normal, reason);
  }
  respawn(key) { super.respawn(key); this.clearMemory(); }
  changeWorld(update) {
    const invalidated = (update.saveScope && update.saveScope !== this.saveScope)
      || (this.npcType === 'crowd' && Number.isFinite(update.distance) && update.distance > 10);
    super.changeWorld(update);
    if (invalidated) { this.clearMemory(); this.emit(); }
  }
  worldReset() { this.clearMemory(); super.worldReset(); }
  clearMemory() { this.journal = []; this.longMemory.clear(); this.lastEncounterAt = null; super.clearMemory(); this.persist?.(this); }
  restore(journal = [], world, memory) {
    this.lastStorySettings = clone(this.readSettings());
    this.end(false, '모의 저장 로드'); this.worldEpoch++; this.instances.clear(); this.memories.clear();
    this.journal = this.npcType === 'community' ? clone(journal) : []; this.closedTurns = [];
    this.longMemory.restore(this.npcType === 'community' ? memory : null);
    this.lastEncounterAt = null;
    if (world) this.world = clone(world);
    this.lastActionSelection = null; this.lastReply = null; this.lastRawReply = null; this.lastPrompt = null; this.lastSelection = null;
  }
}

// 저장 호출 순간의 완료된 사건만 복사한다. 대기 요청과 군중 인스턴스는 복원하지 않는다.
export function captureTestSave(engines, scenario) {
  return { scenario: clone(scenario), memories: Object.fromEntries(Object.entries(engines).filter(([, e]) => e.npcType === 'community').map(([key, e]) => [key, e.longMemory.snapshot()])), worlds: Object.fromEntries(Object.entries(engines).map(([key, e]) => [key, clone(e.world)])), journals: Object.fromEntries(Object.entries(engines)
    .filter(([, e]) => e.npcType === 'community').map(([key, e]) => [key, clone(e.journal)])) };
}
