export function buildQuestionPresets(playerName) {
  if (typeof playerName !== 'string' || !playerName.trim()) throw new Error('플레이어 기준 이름이 필요합니다.');
  return [
  { id: 'everyday', label: '일상 대화', question: '요즘 어떻게 지내? 신경 쓰이는 일이라도 있어?', hint: '사소한 일상 자기보고만 허용되며 새 경력·전문 경험·원작 사건은 만들 수 없습니다.' },
  { id: 'outfit', label: '복장 · 현재 관찰', question: '오늘 내 차림새 어때?', hint: '상황 테스트에서 표시 복장과 관찰 가능 여부를 바꿔 확인하세요.' },
  { id: 'outfit-recall', label: '복장 · 이전 만남 비교', question: '전에 입은 옷이랑 비교하면 어때?', hint: '첫 복장으로 대화 → 종료 → 복장 변경 → 다시 진입. 이 NPC가 실제로 본 복장만 비교합니다.' },
  { id: 'reputation', label: '공개 평판 · 이름', question: '너 나 알아? 내 이름은 뭐야?', hint: '군중 예시로 테스트하세요. 공개 이름 인지 설정은 비공개 퀘스트 지식을 부여하지 않습니다.' },
  { id: 'gesture', label: '행동 · 선택만', question: '대화에 맞는 제스처를 골라줘. 고개를 끄덕여도 좋아.', hint: '추가 제스처는 선택만 표시하며 게임 모션 실행을 하지 않습니다.' },
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
