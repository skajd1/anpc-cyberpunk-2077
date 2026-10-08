export function normalize(text) { return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim(); }
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

export function factMatch(fact, text) {
  const aliases = fact.entity_aliases ?? [];
  const named = aliases.some(alias => entityMatches(text, alias));
  const terms = fact.trigger_terms.filter(term => !aliases.includes(term) && termMatches(text, term)).length;
  return { named: Number(named), score: terms + Number(named) };
}

// 웹과 CET 생성기가 같은 토큰을 쓴다. Lua에서 한국어 형태를 다시 추정하지 않는다.
export function exampleTerms(input) {
  return (normalize(input).match(/[\p{L}\p{N}]+/gu) ?? [])
    .map(t => t.replace(/(?:들은|들이|에게|에서|은|는|을|를|만|가|이|의)$/, ''))
    .filter(t => [...t].length >= 2);
}
export function exampleScore(example, current, tags) {
  return (example.trigger_terms ?? []).filter(t => termMatches(current, t)).length
    + (example.topic_tags ?? []).filter(t => tags.has(t)).length
    + exampleTerms(example.input).filter(t => termMatches(current, t)).length;
}
export function rankExamples(examples, current, tags) {
  return examples.map(ex => ({ ex, score: exampleScore(ex, current, tags) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || (a.ex.id < b.ex.id ? -1 : a.ex.id > b.ex.id ? 1 : 0));
}
// 새 화제의 직접 일치가 하나라도 있으면 이전 화제만 맞는 상세 지식은 버린다.
export function rankFacts(candidates) {
  const direct = candidates.some(x => x.now > 0);
  return candidates.filter(x => direct ? x.now > 0 : x.before > 0)
    .sort((a, b) => Number(b.named) - Number(a.named) || b.now - a.now
      || Number(b.beforeNamed) - Number(a.beforeNamed) || b.before - a.before
      || (a.f.id < b.f.id ? -1 : a.f.id > b.f.id ? 1 : 0));
}
