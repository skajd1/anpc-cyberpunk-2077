import { entityMatches } from './retrieval.js';

// 읽기 표는 발음 사전일 뿐 새 지식을 허용하지 않는다. 승인 항목만, 현재 턴의 공개 텍스트만 사용.
export function selectReadings(table, currentText, personaName = '', context = {}) {
  const sources = [currentText, personaName, ...(context.knowledge ?? []).map(k => k.statement ?? '')];
  return (table?.entries ?? []).filter(entry => entry.review_status === 'approved'
    && sources.some(text => entityMatches(text, entry.term)))
    .sort((a, b) => [...b.term].length - [...a.term].length || (a.term < b.term ? -1 : a.term > b.term ? 1 : 0))
    .slice(0, 12).map(({ term, reading }) => ({ term, reading }));
}

// 음성 활성 시 인물별 일본어 말투 데이터. 프로필은 콘텐츠, 예시 원문은 사용자 PC의 게임 파일에서 추출한 로컬 파일이다.
// 원문을 찾지 못한 예시는 뺀다. 프로필이 없는 인물은 null.
export function jaVoiceData(profiles, localExamples, characterKey) {
  const profile = (profiles?.profiles ?? []).find(p => p.character_key === characterKey);
  if (!profile) return null;
  const { first_person, address_v, sentence_endings, interjections, politeness, profanity, avoid, style_notes } = profile;
  const examples = profile.examples.map(e => ({ emotion: e.emotion, text: localExamples?.examples?.[e.string_id] }))
    .filter(e => e.text?.ko && e.text?.ja).map(({ emotion, text }) => ({ emotion, ko: text.ko, ja: text.ja }));
  return { first_person, address_v, sentence_endings, interjections, politeness, profanity, avoid, style_notes, examples };
}
