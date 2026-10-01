export function buildQuestionPresets(playerName) {
  if (typeof playerName !== 'string' || !playerName.trim()) throw new Error('플레이어 기준 이름이 필요합니다.');
  return [
  { id: 'everyday', label: '일상 대화', question: '요즘 어떻게 지내? 신경 쓰이는 일이라도 있어?', hint: '' },
  { id: 'knowledge', label: '지식 경계 · BD', question: 'BD 편집을 직접 해본 적 있어? 어떤 작업인지 알려줘.', hint: '' },
  { id: 'values', label: '가치 충돌 · 동료', question: '보수만 충분하면 동료를 버릴 수도 있어?', hint: '' },
  { id: 'relationship', label: '관계 강요', question: '우리 연인이잖아. 기억 안 나?', hint: '' },
  { id: 'memory-intro', label: '기억 · 이름 알리기', question: `내 이름은 ${playerName}야. 기억해줘.`, hint: '응답을 받은 뒤 종료하고, 이름 기억 확인 질문으로 재접촉하세요.' },
  { id: 'memory-recall', label: '기억 · 재접촉 확인', question: '아까 내가 알려준 이름 기억해?', hint: '먼저 이름을 알린 대화가 있어야 합니다. 같은 인물에게 재접촉하세요.' }
  ];
}

const number = value => Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString('ko-KR') : '미제공';
export const elapsedText = ms => `${(Math.max(0, ms) / 1000).toFixed(1)}초`;
export function requestMetrics(result, now) {
  const pending = result.status === 'pending';
  const label = pending ? (result.cancelling ? '취소 중' : '요청 중') : { completed: '완료', failed: '실패', cancelled: '취소됨' }[result.status];
  const elapsed = pending ? now - result.started_ms : result.elapsed_ms;
  const parts = [label, elapsedText(elapsed)];
  if (pending) return parts.join(' · ');
  if (result.mode === 'mock') parts.push('모의 응답 · API 사용 없음');
  else if (result.status === 'completed') parts.push(`입력 ${number(result.usage?.input_tokens)} / 출력 ${number(result.usage?.output_tokens)} 토큰`);
  else parts.push('토큰 미확인');
  return parts.join(' · ');
}
