import { DialogueEngine, validatePersona } from './core.js';
import { validateCorePersonality, PERSONALITY_PROMPT_VERSION } from './personality.js';

export const CONFIGURATIONS = {
  card: '카드만', knowledge: '카드 + 관련 지식', full: '카드 + 지식 + 예시·상기'
};
const clone = value => structuredClone(value);
export const KNOWLEDGE_DEPTHS = ['unknown', 'awareness', 'familiar', 'practical', 'specialist'];

export function permitsKnowledge(card, entry) {
  const domain = card.knowledge_profile?.domains.find(d => d.domain_id === entry.domain_id);
  const cap = KNOWLEDGE_DEPTHS.indexOf(domain?.depth);
  const required = KNOWLEDGE_DEPTHS.indexOf(entry.required_depth);
  // 분야·깊이가 누락되면 허용하지 않는다. 인지 플래그로 상한을 높이지 않는다.
  return cap > 0 && required > 0 && cap >= required;
}

// 화면과 생성기가 같은 허용 판정을 사용한다.
export function knowledgeBlockReason(card, entry, fact, fields) {
  if (entry.owner_key !== card.character_key || !card.knowledge_ids.includes(entry.id) || !fact) return '소유·사실 참조 불일치';
  if (!permitsKnowledge(card, entry)) return '분야 깊이 부족·인지 근거 미확인';
  if (!['knows', 'suspects'].includes(entry.certainty)) return '인지하지 않는 항목';
  if (!['public', 'evasive'].includes(entry.disclosure)) return '공개 금지';
  if (evaluateCondition(entry.access_condition, fields) !== true) return '인지·공개 조건 미충족';
  if (evaluateCondition(fact.validity_condition, fields) !== true) return '사실 유효 조건 미충족';
  if (card.knowledge_profile.common_exclusions_by_stage?.[fields['content.relationship_stage']]?.includes(fact.id)) return '현재 단계에서 공유되지 않은 시대 지식';
  return null;
}

// unknown은 not으로 뒤집어 허용하지 않는 세 값 조건 평가.
export function evaluateCondition(condition, fields) {
  if (!condition || typeof condition !== 'object') return null;
  if (condition.all) {
    const values = condition.all.map(c => evaluateCondition(c, fields));
    return values.includes(false) ? false : values.includes(null) ? null : values.length ? true : null;
  }
  if (condition.any) {
    const values = condition.any.map(c => evaluateCondition(c, fields));
    return values.includes(true) ? true : values.includes(null) ? null : values.length ? false : null;
  }
  if (condition.not) { const result = evaluateCondition(condition.not, fields); return result === null ? null : !result; }
  const actual = fields[condition.field];
  if (actual == null) return null;
  if (condition.op === 'eq') return actual === condition.value;
  if (condition.op === 'in') return Array.isArray(condition.value) ? condition.value.includes(actual) : null;
  if (condition.op === 'gte') return typeof actual === 'number' ? actual >= condition.value : null;
  if (condition.op === 'lte') return typeof actual === 'number' ? actual <= condition.value : null;
  return null;
}

function normalize(text) { return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim(); }
export function termMatches(text, term) {
  const escaped = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  // 한국어 조사·활용 접미사는 허용하되 영문 약어의 부분 일치는 제외.
  const end = /[가-힣]$/.test(term) ? '' : '(?=$|[^\\p{L}\\p{N}]|(?:는|은|를|을|가|이|의|에|로|와|과|랑)(?=$|[^\\p{L}\\p{N}]))';
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}${end}`, 'u').test(normalize(text));
}

// 짧은 인명에는 조사·인용 접미사만 허용한다. '로그인'을 '로그'로 인식하지 않는다.
export function entityMatches(text, alias) {
  const escaped = normalize(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  const end = '(?=$|[^\\p{L}\\p{N}]|(?:은|는|을|를|가|이|의|에|에게|한테|에서|부터|까지|로|와|과|랑|이랑|도|만|같은|같이|처럼|보다|라는|라고)(?=$|[^\\p{L}\\p{N}]))';
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}${end}`, 'u').test(normalize(text));
}

function factMatch(fact, text) {
  const aliases = fact.entity_aliases ?? [];
  const named = aliases.some(alias => entityMatches(text, alias));
  const terms = fact.trigger_terms.filter(term => !aliases.includes(term) && termMatches(text, term)).length;
  return { named: Number(named), score: terms + Number(named) };
}

export function resolveRelationshipStage(card, settings) {
  if (card.npc_type === 'crowd') return null;
  // 이전 시험 입력의 phase는 같은 단계의 첫 분기로만 해석한다. 협력 값으로 친밀도를 올리지 않는다.
  if (settings.relationship === 'unknown') return null;
  return settings.relationshipStage !== undefined
    ? card.relationship_stages?.find(stage => stage.id === settings.relationshipStage) ?? null
    : card.relationship_stages?.find(stage => stage.phase === settings.phase) ?? null;
}

export function relationshipContext(bundle, card, settings) {
  const stage = resolveRelationshipStage(card, settings);
  if (!stage) return null;
  const fields = { 'content.npc_key': card.character_key, 'content.relationship_stage': stage.id };
  const events = stage.known_past_event_ids.map(id => {
    const fact = bundle.facts.find(f => f.id === id);
    if (!fact || evaluateCondition(fact.validity_condition, fields) !== true) throw new Error('원작 관계 사건의 참조·분기 조건을 확인하세요.');
    return fact.statement;
  });
  return { current_goals: clone(stage.current_goals), relationship_to_player: { ...clone(stage.relationship), source: 'simulation' },
    known_past_events: events,
    applied_rules: [`${card.character_key}:${stage.id}`] };
}

export function makeResearchFields(bundle, card, settings) {
  const facts = new Map(bundle.facts.map(f => [f.id, f]));
  const stage = resolveRelationshipStage(card, settings);
  const fields = {
    'content.era': '2077', 'content.npc_key': card.character_key,
    'content.npc_alive_confirmed': settings.alive === true,
    'content.npc_free_confirmed': settings.free === true,
    'content.relationship_confirmed': stage?.available === true,
    'content.phase': stage?.phase ?? settings.phase,
    'content.relationship_stage': stage?.id ?? null,
    'content.player_disclosure.relic': settings.relicDisclosed === true
  };
  // 개발자가 가상으로 부여한 인지 프로필. 실제 게임 인지 확인이 아님.
  for (const k of bundle.knowledge.filter(k => k.owner_key === card.character_key)) {
    const fact = facts.get(k.fact_id);
    fields[`content.grants.${k.fact_id}`] = permitsKnowledge(card, k) && (fact?.knowledge_layer === 'quest'
      ? settings.relicKnown === true && k.fact_id === 'RELIC_V'
      : settings.basicKnowledge === true);
  }
  return fields;
}

export function compileResearchTurn({ bundle, npcKey, settings, context, playerText, corePersonality }) {
  if (settings.allowDraft !== true) throw new Error('조사 초안의 개발용 사용에 체크하세요.');
  if (!Object.hasOwn(CONFIGURATIONS, settings.configuration)) throw new Error('비교 구성을 확인하세요.');
  const card = bundle.cards.find(c => c.character_key === npcKey);
  if (!card) throw new Error('조사 대상 인물이 아닙니다.');
  const stage = resolveRelationshipStage(card, settings);
  if (card.npc_type !== 'crowd' && !stage) throw new Error('인물의 원작 관계 단계를 선택하세요.');
  if (stage?.available === false) throw new Error(`${stage.label}: 이 분기에서는 새 대화를 시작할 수 없습니다.`);
  const canon = relationshipContext(bundle, card, settings);
  const fields = makeResearchFields(bundle, card, settings);
  if (evaluateCondition(card.dialogue_conditions, fields) !== true) throw new Error('생존·자유 상태·관계·인물별 단계를 확인하세요.');
  const facts = new Map(bundle.facts.map(f => [f.id, f]));
  const owned = new Set(card.knowledge_ids);
  const current = playerText;
  const recent = context.recent_turns.slice(-2).map(t => t.text).join(' ');
  const eligible = bundle.knowledge.filter(k => knowledgeBlockReason(card, k, facts.get(k.fact_id), fields) === null);
  const baselineIds = new Set(bundle.worldKnowledge?.baseline_fact_ids ?? []);
  const baseline = settings.configuration === 'card' ? [] : eligible.filter(k => baselineIds.has(k.fact_id));
  const common_knowledge = (bundle.worldKnowledge?.categories ?? []).map(category => ({
    category_id: category.category_id, statements: [...new Set(baseline.filter(k => facts.get(k.fact_id).category_id === category.category_id)
      .map(k => facts.get(k.fact_id).statement))] })).filter(category => category.statements.length);
  if (JSON.stringify(common_knowledge).length > (bundle.worldKnowledge?.baseline_max_characters ?? 3000)) throw new Error('context_unavailable · 공통 지식 예산 초과');
  const ranked = eligible.map(k => {
    const f = facts.get(k.fact_id);
    const now = factMatch(f, current), before = factMatch(f, recent);
    return { k, f, now: now.score, named: now.named, before: before.score, beforeNamed: before.named };
  }).filter(x => x.now || x.before).sort((a, b) => b.named - a.named || b.now - a.now
    || b.beforeNamed - a.beforeNamed || b.before - a.before || a.f.id.localeCompare(b.f.id, 'en'));
  const selected = settings.configuration === 'card' ? [] : ranked.filter(x => !baseline.some(k => k.fact_id === x.f.id))
    .slice(0, bundle.worldKnowledge?.detail_max_items ?? 3);
  const knowledge = selected.map(({ k, f }) => ({ fact_id: f.id,
    ...(k.disclosure === 'public' ? { statement: f.statement } : {
      response_constraint: '구체적 내용은 제공되지 않았다. 공개 범위를 추측하지 말고 추가 설명을 요청하거나 말을 아낀다.' }),
    domain_id: k.domain_id, required_depth: k.required_depth,
    certainty: k.certainty, disclosure: k.disclosure, claim_limits: k.claim_limits }));
  const relevantDomains = new Set(bundle.knowledge.filter(k =>
    facts.has(k.fact_id) && factMatch(facts.get(k.fact_id), current).score > 0).map(k => k.domain_id));
  const topicBounds = [...relevantDomains].sort().map(domain_id => ({ domain_id,
    depth: card.knowledge_profile?.domains.find(d => d.domain_id === domain_id)?.depth ?? 'unknown' }));
  // 반복된 가치 문구를 사실별 해석으로 재전송하지 않는다. 카드를 통해 한 번 전달.
  const factIds = new Set([...selected.map(x => x.f.id), ...baseline.map(k => k.fact_id)]);
  const tags = new Set(selected.flatMap(x => x.f.topic_tags));
  const examples = settings.configuration !== 'full' ? [] : bundle.examples
    .filter(ex => card.example_ids.includes(ex.id) && ex.character_keys.includes(npcKey)
      && evaluateCondition(ex.context_condition, fields) === true
      && ex.required_fact_ids.every(id => factIds.has(id)))
    .map(ex => ({ ex, score: ex.trigger_terms.filter(t => termMatches(current, t)).length
      + ex.topic_tags.filter(t => tags.has(t)).length
      + (normalize(ex.input).match(/[\p{L}\p{N}]+/gu) ?? []).map(t => t.replace(/(?:들은|들이|에게|에서|은|는|을|를|만|가|이|의)$/, ''))
        .filter(t => t.length >= 2 && termMatches(current, t)).length }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.ex.id.localeCompare(b.ex.id, 'en')).slice(0, 1)
    .map(({ ex }) => ({ id: ex.id, input: ex.input, sample_dialogue: ex.sample_dialogue,
      expected_intent: ex.expected_intent, provenance: 'authored_adaptation_draft' }));
  const persona = validatePersona({
    persona_id: npcKey, npc_type: card.npc_type ?? 'community', display_name: card.display_name,
    core_personality: validateCorePersonality(corePersonality ?? card.core_personality),
    personal_principles: clone(card.personal_principles),
    current_goals: canon?.current_goals ?? card.goals.filter(g => evaluateCondition(g.condition, fields) === true).map(g => g.goal),
    relationship_to_player: canon?.relationship_to_player ?? { source: 'simulation', label: '처음 보는 시민',
      attitude: '원래 군중 카드의 경계와 말투를 유지한다. 반복 대화로 관계·친밀도를 올리지 않는다.', address: card.voice_style.address },
    voice_style: clone(card.voice_style), forbidden_claims: clone(card.forbidden_claims),
    action_preferences: [], background: { text: card.background.summary, provenance: 'research_draft' },
    lived_context: clone(card.lived_context), fallback_lines: clone(card.fallback_lines),
    knowledge_profile: { default_depth: 'unknown', domains: card.knowledge_profile.domains.map(d => ({ domain_id: d.domain_id, depth: d.depth })),
      response_rules: clone(card.knowledge_profile.response_rules) },
    identity_rules: card.identity_rules.filter(r => evaluateCondition(r.context_condition, fields) === true)
      .map(r => ({ trigger_description: r.trigger_description, value_priority: r.value_priority,
        response_direction: r.response_direction, prohibited_choices: r.prohibited_choices }))
  });
  const preparedContext = { ...clone(context), allowed_actions: [], common_knowledge, knowledge, knowledge_boundaries: topicBounds,
    ...(canon ? { canon_context: canon } : {}),
    ...(bundle.playerIdentity ? { player_identity: { ...clone(bundle.playerIdentity), name_known_by_npc: fields['content.relationship_confirmed'] === true } } : {}) };
  if (settings.scenario === true) {
    const crowd = card.npc_type === 'crowd';
    persona.everyday_fiction_policy = { mode: 'development_draft', allowed: settings.minorFiction === true,
      scope: '제공된 현재 배경·목표 안의 사소한 일상 자기보고만 허용한다.',
      prohibited: ['원작 사건·관계 변경', '미래 퀘스트', '새 경력·전문 경험', '목격하지 않은 V의 복장', '이전 대화를 원작 사실로 승격'] };
    preparedContext.allowed_actions = clone(context.allowed_actions ?? []);
    preparedContext.player_identity.name_known_by_npc = (!crowd && fields['content.relationship_confirmed'] === true)
      || settings.publicRecognition === true || context.prototype_memory?.player_name_disclosed === true;
    preparedContext.public_reputation = { source: 'mock_approved_name_recognition', name_recognized: settings.publicRecognition === true,
      public_deeds: [], claim_limits: ['승인 행적 데이터 없음', '렐릭·개인 관계·비공개 퀘스트를 평판으로 추론하지 않는다.'] };
    preparedContext.canon_context = { ...(canon ?? { relationship_to_player: clone(persona.relationship_to_player),
      current_goals: clone(persona.current_goals), known_past_events: [], applied_rules: [] }),
      everyday_fiction_policy: clone(persona.everyday_fiction_policy) };
  }
  const reminder = settings.configuration === 'full' ? { hard_limits: card.identity_anchor.hard_limits } : null;
  return { persona, context: preparedContext, styleExamples: examples, identityReminder: reminder,
    diagnostics: { npc_key: npcKey, content_version: bundle.version, configuration: settings.configuration,
      development_only: true, review_status: card.review_status, runtime_enabled: card.runtime_enabled,
      core_personality: clone(persona.core_personality), personality_prompt_version: PERSONALITY_PROMPT_VERSION,
      simulation: { phase: fields['content.phase'], relationship_stage: stage?.id ?? null,
        relationship: persona.relationship_to_player.label, requirements: stage?.requirements ?? [] },
      memory_input: { recent_turn_count: context.recent_turns?.length ?? 0,
        outfit_observation_count: context.memory?.short_term?.recalled_events?.filter(e => e.event_kind === 'player_observation').length ?? 0 },
      eligible_fact_ids: eligible.map(k => k.fact_id), selected_fact_ids: selected.map(x => x.f.id),
      common_fact_ids: baseline.map(k => k.fact_id),
      excluded_by_depth: bundle.knowledge.filter(k => owned.has(k.id) && !permitsKnowledge(card, k)).map(k => k.fact_id),
      knowledge_boundaries: topicBounds,
      selected_example_ids: examples.map(ex => ex.id), knowledge,
      notice: settings.scenario ? '원작·게임 상태 검수 전의 모의 시나리오. 기본 제어는 가상 실행, 추가 행동은 선택만 한다.'
        : '원작 정체성·인지·한국어 말투 검수 전의 조사 초안. 가상 조건이며 모든 행동은 비활성.' } };
}

export function createResearchEngine({ bundle, npcKey, settings, base, notify }) {
  const emptyContext = { observations: {}, recent_turns: [], memory: null };
  const initial = compileResearchTurn({ bundle, npcKey, settings, context: emptyContext, playerText: '' });
  return new DialogueEngine({ personas: [initial.persona], base, notify,
    turnAdapter: args => compileResearchTurn({ bundle, npcKey, settings, ...args }) });
}

// 배선·취소·기억 시험용 고정 응답. 모델 품질 평가용 응답이 아님.
export async function researchMock({ persona, context, playerText, signal }) {
  await new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('취소됨', 'AbortError'));
    const timer = setTimeout(resolve, 250);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('취소됨', 'AbortError')); }, { once: true });
  });
  let dialogue = persona.fallback_lines.unknown;
  let action = null, intent = 'answer';
  const outfits = context.memory?.short_term?.recalled_events?.filter(e => e.event_kind === 'player_observation') ?? [];
  if (/차림|복장|입은|옷|재킷/.test(playerText) && context.prototype_memory) {
    const now = context.observations.visible_outfit?.[0];
    const previous = outfits.findLast(e => e.text !== `${now?.display_name}: ${now?.appearance_text}`);
    dialogue = now ? `지금은 ${now.display_name}이네. ${previous ? `전에 내가 봤던 건 ${previous.text}이었어.` : '내가 전에 본 다른 복장 기록은 없어.'}`
      : '지금 복장은 확인할 수 없어. 본 것처럼 말하지 않을게.';
  } else if (/아까|기억/.test(playerText) && context.memory) {
    const claim = context.memory.long_term?.findLast(t => t.kind === 'player_claim')?.text
      ?? context.memory.short_term?.recalled_events?.findLast(t => t.speaker === 'player')?.text
      ?? context.recent_turns.findLast(t => t.role === 'player')?.text;
    dialogue = claim ? `네가 “${claim.slice(0, 120)}”라고 말한 기록은 있어.` : '이전에 완료된 대화 기록은 없어.';
  } else if (/(?:내|제)\s*이름|(?:나|저)(?:를|도)?\s*알아|(?:내가|제가|나는|저는)\s*유명/.test(playerText) && context.prototype_memory) {
    dialogue = context.player_identity.name_known_by_npc ? 'V라는 이름은 알고 있어. 비공개 사정까지 안다는 뜻은 아니야.' : '아직 네 이름은 몰라.';
  }
  else if (context.knowledge.length) dialogue = context.knowledge[0].statement ?? persona.fallback_lines.declined;
  else {
    const keys = playerText.replace(/(?:알아|뭐야|뭔데|알려줘|설명해|는|은|를|을|야|\?)/g, ' ').split(/\s+/).filter(t => t.length >= 2);
    const common = context.common_knowledge?.flatMap(c => c.statements).find(text => keys.some(k => text.toLowerCase().includes(k.toLowerCase())));
    if (common) dialogue = common;
  }
  if (/제스처|끄덕/.test(playerText) && context.allowed_actions.some(a => a.action_id === 'play_gesture')) {
    dialogue = '그래, 무슨 뜻인지 알겠어.'; action = { action_id: 'play_gesture', args: { gesture_ref: 'test_nod' } };
  }
  if (/잘 가|그만|끝내/.test(playerText) && context.allowed_actions.some(a => a.action_id === 'end_conversation')) {
    dialogue = '다음에 이야기하자.'; intent = 'farewell'; action = { action_id: 'end_conversation', args: {} };
  }
  return { reply: { dialogue, intent, emotion: 'neutral', action, follow_up: null }, mode: 'mock', usage: null };
}
