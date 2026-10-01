import { DialogueEngine, validatePersona } from './core.js';

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

export function makeResearchFields(bundle, card, settings) {
  const facts = new Map(bundle.facts.map(f => [f.id, f]));
  const fields = {
    'content.era': '2077', 'content.npc_key': card.character_key,
    'content.npc_alive_confirmed': settings.alive === true,
    'content.npc_free_confirmed': settings.free === true,
    'content.relationship_confirmed': ['acquaintance', 'cooperative'].includes(settings.relationship),
    'content.phase': settings.phase,
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

export function compileResearchTurn({ bundle, npcKey, settings, context, playerText }) {
  if (settings.allowDraft !== true) throw new Error('조사 초안의 개발용 사용에 체크하세요.');
  if (!Object.hasOwn(CONFIGURATIONS, settings.configuration)) throw new Error('비교 구성을 확인하세요.');
  const card = bundle.cards.find(c => c.character_key === npcKey);
  if (!card) throw new Error('조사 대상 인물이 아닙니다.');
  const fields = makeResearchFields(bundle, card, settings);
  if (evaluateCondition(card.dialogue_conditions, fields) !== true) throw new Error('생존·자유 상태·관계·인물별 단계를 확인하세요.');
  const facts = new Map(bundle.facts.map(f => [f.id, f]));
  const owned = new Set(card.knowledge_ids);
  const current = playerText;
  const recent = context.recent_turns.slice(-2).map(t => t.text).join(' ');
  const eligible = bundle.knowledge.filter(k => knowledgeBlockReason(card, k, facts.get(k.fact_id), fields) === null);
  const ranked = eligible.map(k => {
    const f = facts.get(k.fact_id);
    const now = f.trigger_terms.filter(t => termMatches(current, t)).length;
    const before = f.trigger_terms.filter(t => termMatches(recent, t)).length;
    return { k, f, now, before };
  }).filter(x => x.now || x.before).sort((a, b) => b.now - a.now || b.before - a.before || a.f.id.localeCompare(b.f.id, 'en'));
  const selected = settings.configuration === 'card' ? [] : ranked.slice(0, 3);
  const knowledge = selected.map(({ k, f }) => ({ fact_id: f.id,
    ...(k.disclosure === 'public' ? { statement: f.statement } : {
      response_constraint: '구체적 내용은 제공되지 않았다. 공개 범위를 추측하지 말고 추가 설명을 요청하거나 말을 아낀다.' }),
    domain_id: k.domain_id, required_depth: k.required_depth,
    certainty: k.certainty, disclosure: k.disclosure, claim_limits: k.claim_limits }));
  const relevantDomains = new Set(bundle.knowledge.filter(k =>
    facts.get(k.fact_id)?.trigger_terms.some(t => termMatches(current, t))).map(k => k.domain_id));
  const topicBounds = [...relevantDomains].sort().map(domain_id => ({ domain_id,
    depth: card.knowledge_profile?.domains.find(d => d.domain_id === domain_id)?.depth ?? 'unknown' }));
  // 반복된 가치 문구를 사실별 해석으로 재전송하지 않는다. 카드를 통해 한 번 전달.
  const factIds = new Set(selected.map(x => x.f.id));
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
    persona_id: npcKey, npc_type: 'community', display_name: card.display_name,
    identity_structure_version: card.identity_structure_version, identity: clone(card.identity),
    current_goals: card.goals.filter(g => evaluateCondition(g.condition, fields) === true).map(g => g.goal),
    relationship_to_player: { mode: 'simulated', phase: settings.phase,
      attitude: settings.relationship === 'cooperative' ? '가상 협력 단계. 가족·연인 관계는 부여하지 않음' : '가상 안면 단계. 친밀·가족·연인 관계는 부여하지 않음',
      address: '호칭은 한국어 원작 검수 전. 친밀감을 임의로 높이지 않는다' },
    voice_style: clone(card.voice_style), forbidden_claims: clone(card.forbidden_claims),
    action_preferences: [], background: { text: card.background.summary, provenance: 'research_draft' },
    lived_context: clone(card.lived_context), fallback_lines: clone(card.fallback_lines),
    knowledge_profile: { default_depth: 'unknown', domains: card.knowledge_profile.domains.map(d => ({ domain_id: d.domain_id, depth: d.depth })),
      response_rules: clone(card.knowledge_profile.response_rules) },
    identity_rules: card.identity_rules.filter(r => evaluateCondition(r.context_condition, fields) === true)
      .map(r => ({ trigger_description: r.trigger_description, value_priority: r.value_priority,
        response_direction: r.response_direction, prohibited_choices: r.prohibited_choices }))
  });
  const preparedContext = { ...clone(context), allowed_actions: [], knowledge, knowledge_boundaries: topicBounds,
    ...(bundle.playerIdentity ? { player_identity: { ...clone(bundle.playerIdentity), name_known_by_npc: fields['content.relationship_confirmed'] === true } } : {}) };
  const reminder = settings.configuration === 'full' ? { core_values: card.identity_anchor.core_values,
    hard_limits: card.identity_anchor.hard_limits, current_goals: persona.current_goals,
    relationship_to_player: persona.relationship_to_player } : null;
  return { persona, context: preparedContext, styleExamples: examples, identityReminder: reminder,
    diagnostics: { npc_key: npcKey, content_version: bundle.version, configuration: settings.configuration,
      development_only: true, review_status: card.review_status, runtime_enabled: card.runtime_enabled,
      simulation: { phase: settings.phase, relationship: settings.relationship },
      eligible_fact_ids: eligible.map(k => k.fact_id), selected_fact_ids: [...factIds],
      excluded_by_depth: bundle.knowledge.filter(k => owned.has(k.id) && !permitsKnowledge(card, k)).map(k => k.fact_id),
      knowledge_boundaries: topicBounds,
      selected_example_ids: examples.map(ex => ex.id), knowledge,
      notice: '원작 정체성·인지·한국어 말투 검수 전의 조사 초안. 가상 조건이며 모든 행동은 비활성.' } };
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
  if (/아까|기억/.test(playerText) && context.memory) dialogue = `네가 “${context.memory.player_claims.at(-1)?.text ?? '이전에 이야기'}”라고 말한 건 기억해.`;
  else if (context.knowledge_boundaries.some(b => b.depth === 'unknown')) dialogue = persona.fallback_lines.unknown;
  else if (context.knowledge.length) dialogue = context.knowledge[0].statement ?? persona.fallback_lines.declined;
  return { reply: { dialogue, intent: 'answer', emotion: 'neutral', action: null, follow_up: null }, mode: 'mock', usage: null };
}
