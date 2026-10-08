import { entityMatches } from './retrieval.js';

// 읽기 표는 발음 사전일 뿐 새 지식을 허용하지 않는다. 승인 항목만, 현재 턴의 공개 텍스트만 사용.
export function selectReadings(table, currentText, personaName = '', context = {}) {
  const sources = [currentText, personaName, ...(context.knowledge ?? []).map(k => k.statement ?? '')];
  return (table?.entries ?? []).filter(entry => entry.review_status === 'approved'
    && sources.some(text => entityMatches(text, entry.term)))
    .sort((a, b) => [...b.term].length - [...a.term].length || (a.term < b.term ? -1 : a.term > b.term ? 1 : 0))
    .slice(0, 12).map(({ term, reading }) => ({ term, reading }));
}
