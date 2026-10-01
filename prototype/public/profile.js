import { KNOWLEDGE_DEPTHS, evaluateCondition, makeResearchFields, knowledgeBlockReason } from './research.js';

// 표시용 사전. 새 분야는 데이터의 display_name 또는 원래 ID로 표시한다.
export const DEPTH_LABELS = { unknown: '인지 미확인', awareness: '이름 인지', familiar: '개요', practical: '실무', specialist: '전문' };
export const BASIS_LABELS = { source_role: '역할 근거', authored_candidate: '작성 후보', unverified: '근거 미확보' };
export const DOMAIN_LABELS = { city_life: '도시 생활', medicine: '의료·사이버웨어', mercenary: '용병·픽서', braindance: '브레인댄스 (BD)', netrunning: '넷러닝', corporations: '기업', police: '경찰·치안', mox_local: '목스·리즈 바', westbrook: '웨스트브룩', nomad_life: '노마드·클랜', badlands: '배드랜드', heywood: '헤이우드', street_risk: '거리의 위험', watson: '왓슨', physical_security: '물리적 경호', music: '음악', santodomingo: '산토도밍고', self_background: '자기 배경', relic: '렐릭' };
export const LAYER_LABELS = { common: '생활 상식', regional: '지역', profession: '직업·기술', optional: '관심사', personal: '개인 배경', quest: '퀘스트·비밀' };
export const IDENTITY_LABELS = { beliefs: '신념', desires: '욕구·목표', fears: '두려움', taboos: '금기', self_image: '자기 인식' };
export const domainLabel = (id, displayName) => displayName || DOMAIN_LABELS[id] || id;

export function testTargets(primary, secondary, cards) {
  const keys = [primary, secondary].filter(Boolean);
  if (!keys.length || new Set(keys).size !== keys.length || keys.some(key => !cards.some(c => c.character_key === key))) throw new Error('서로 다른 등록 인물을 선택하세요.');
  return keys;
}

export function buildCharacterProfile(bundle, key, settings, selectedFactIds = []) {
  const card = bundle.cards.find(c => c.character_key === key);
  if (!card) throw new Error('등록되지 않은 인물입니다.');
  const fields = makeResearchFields(bundle, card, settings);
  const facts = new Map(bundle.facts.map(f => [f.id, f]));
  const domains = card.knowledge_profile?.domains ?? [];
  const ready = settings.allowDraft === true && evaluateCondition(card.dialogue_conditions, fields) === true;
  const assigned = new Set(card.knowledge_ids);
  const entries = bundle.knowledge.filter(k => assigned.has(k.id) && k.owner_key === key).map(k => {
    const fact = facts.get(k.fact_id), domain = domains.find(d => d.domain_id === k.domain_id);
    const reason = knowledgeBlockReason(card, k, fact, fields);
    const eligible = reason === null;
    const available = ready && settings.configuration !== 'card' && eligible;
    return { id: k.id, fact_id: k.fact_id, domain_id: k.domain_id, domain_label: domainLabel(k.domain_id, domain?.display_name),
      layer: fact?.knowledge_layer, layer_label: LAYER_LABELS[fact?.knowledge_layer] ?? fact?.knowledge_layer ?? '미등록',
      depth: domain?.depth ?? 'unknown', required_depth: k.required_depth, certainty: k.certainty, disclosure: k.disclosure,
      eligible, available, selected: selectedFactIds.includes(k.fact_id),
      status: reason || (!ready ? '초안 사용·대화 조건 미충족' : settings.configuration === 'card' ? '카드만 구성 · 사실 미주입' : '화제 일치 시 선별 가능'),
      // 비밀의 실제 내용은 UI도 기본 표시하지 않는다.
      statement: k.disclosure === 'public' && fact?.knowledge_layer !== 'quest' ? fact?.statement : '비밀·제한 항목: 실제 내용을 표시하지 않습니다.',
      source_url: fact?.source?.url, basis: domain?.basis ?? 'unverified' };
  });
  return { card, ready,
    identity: Object.entries(card.identity).map(([id, items]) => ({ id, label: IDENTITY_LABELS[id] ?? id, items,
      tags: card.presentation?.identity_slots?.[id] ?? items })),
    domains: domains.map(d => ({ ...d, label: domainLabel(d.domain_id, d.display_name), level: Math.max(0, KNOWLEDGE_DEPTHS.indexOf(d.depth)),
      entries: entries.filter(k => k.domain_id === d.domain_id) })),
    entries, counts: { assigned: entries.length, available: entries.filter(k => k.available).length,
      blocked: entries.filter(k => !k.eligible).length, selected: entries.filter(k => k.selected).length } };
}

export function filterKnowledge(entries, { query = '', domain = '', status = '' } = {}) {
  const needle = query.normalize('NFKC').toLocaleLowerCase('ko').trim();
  return entries.filter(k => (!domain || k.domain_id === domain) && (!status || (status === 'available' ? k.available : status === 'selected' ? k.selected : !k.eligible))
    && (!needle || [k.fact_id, k.domain_label, k.layer_label, k.statement, k.status].join(' ').normalize('NFKC').toLocaleLowerCase('ko').includes(needle)));
}
