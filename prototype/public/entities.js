import { normalize } from './retrieval.js';

// 공백 변형은 등록된 한글 개체 이름에만 만든다. 일반 문장의 공백을 없애거나 짧은 이름의 경계를 느슨하게 하지 않는다.
export function entityAliases(entity) {
  return [...new Set(entity.aliases.flatMap(alias => /^[가-힣 ]+$/.test(alias) && alias.includes(' ')
    ? [alias, alias.replaceAll(' ', '')] : [alias]))];
}
export function indexFactEntities(facts, book) {
  const entities = new Map((book?.entities ?? []).map(entity => [entity.entity_id, entity]));
  return facts.map(fact => ({ ...fact, ...(fact.entity_ids?.length ? { entity_aliases: [...new Set([
    ...(fact.entity_aliases ?? []), ...fact.entity_ids.flatMap(id => {
      const entity = entities.get(id);
      if (!entity) throw new Error(`미등록 개체: ${id}`);
      return entityAliases(entity);
    })])] } : {}) }));
}
// 정규화된 별칭이 다른 개체를 뜻하면 자동 선택하지 않고 작성 오류로 처리한다.
export function validateEntities(book, facts, readings) {
  const errors = [], ids = new Set(), aliases = new Map();
  const factIds = new Set(facts.map(f => f.id));
  const readingTerms = new Set(readings.entries.map(entry => entry.term));
  for (const entity of book.entities ?? []) {
    if (!/^[a-z][a-z0-9_.]*$/.test(entity.entity_id ?? '') || ids.has(entity.entity_id)) errors.push(`개체 ID 누락/중복: ${entity.entity_id}`);
    ids.add(entity.entity_id);
    if (!['person', 'place', 'organization', 'concept'].includes(entity.type)) errors.push(`개체 종류: ${entity.entity_id}`);
    if (!Array.isArray(entity.aliases) || !entity.aliases.length || !entity.aliases.every(a => typeof a === 'string' && a.trim())) {
      errors.push(`별칭 누락: ${entity.entity_id}`); continue;
    }
    if (new Set(entity.aliases.map(normalize)).size !== entity.aliases.length) errors.push(`개체 내부 별칭 중복: ${entity.entity_id}`);
    for (const alias of entityAliases(entity)) {
      const key = normalize(alias), previous = aliases.get(key);
      if (previous && previous !== entity.entity_id) errors.push(`개체 별칭 충돌: ${alias}`);
      aliases.set(key, entity.entity_id);
    }
    if (!entity.evidence_refs?.length || entity.evidence_refs.some(id => !factIds.has(id))) errors.push(`개체 근거 참조: ${entity.entity_id}`);
    if (!Array.isArray(entity.reading_terms) || entity.reading_terms.some(term => !readingTerms.has(term))) errors.push(`개체 읽기 참조: ${entity.entity_id}`);
  }
  for (const fact of facts) {
    if (fact.entity_ids?.some(id => !ids.has(id))) errors.push(`사실 개체 참조: ${fact.id}`);
    if (fact.search_phrases !== undefined && (!Array.isArray(fact.search_phrases) || !fact.search_phrases.length
      || !fact.search_phrases.every(t => typeof t === 'string' && t.trim()) || new Set(fact.search_phrases.map(normalize)).size !== fact.search_phrases.length)) errors.push(`질문 표현 오류: ${fact.id}`);
  }
  return errors;
}
