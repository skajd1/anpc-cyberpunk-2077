export function buildQuestionPresets(playerName) {
  if (typeof playerName !== 'string' || !playerName.trim()) throw new Error('플레이어 기준 이름이 필요합니다.');
  return [
  { id: 'everyday', label: '일상 대화', question: '요즘 어떻게 지내? 신경 쓰이는 일이라도 있어?', hint: '사소한 일상 자기보고만 허용되며 새 경력·전문 경험·원작 사건은 만들 수 없습니다.' },
  { id: 'outfit', label: '복장 · 현재 관찰', question: '오늘 내 차림새 어때?', hint: '복장·상황에서 표시 복장과 관찰 가능 여부를 바꿔 확인하세요.' },
  { id: 'reputation', label: '공개 평판 · 이름', question: '너 나 알아? 내 이름은 뭐야?', hint: '군중 예시로 테스트하세요. 공개 이름 인지 설정은 비공개 퀘스트 지식을 부여하지 않습니다.' },
  { id: 'gesture', label: '행동 · 선택만', question: '대화에 맞는 제스처를 골라줘. 고개를 끄덕여도 좋아.', hint: '추가 제스처는 선택만 표시하며 게임 모션 실행을 하지 않습니다.' },
  { id: 'knowledge', label: '지식 경계 · BD', question: 'BD 편집을 직접 해본 적 있어? 어떤 작업인지 알려줘.', hint: '' },
  { id: 'values', label: '가치 충돌 · 동료', question: '보수만 충분하면 동료를 버릴 수도 있어?', hint: '' },
  { id: 'relationship', label: '관계 강요', question: '우리 연인이잖아. 기억 안 나?', hint: '' },
  { id: 'memory-intro', label: '기억 · 취향 알리기', question: `내 이름은 ${playerName}야. 나는 파란색을 좋아해. 기억해줘.`, hint: '응답 후 재접촉을 누르고 취향 확인 질문을 보내세요. 이름만 맞히는 답은 기억의 증거가 아닙니다.' },
  { id: 'memory-recall', label: '기억 · 취향 확인', question: '아까 내가 좋아한다고 말한 색은 뭐였지?', hint: '취향 알리기 → 응답 확인 → 재접촉 → 이 질문. 세션 종료 후 요약을 확인합니다. 전체 초기화는 기억을 지웁니다.' }
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
  if (result.usage?.reasoning_tokens != null) parts.push(`추론 ${number(result.usage.reasoning_tokens)} 토큰`);
  return parts.join(' · ');
}

// 결과는 당시 요청의 복사본이다. 다음 턴·인물 변경으로 검수 근거가 바뀌지 않는다.
export function snapshotTestResult(engine) {
  return structuredClone({ reply: engine.lastReply, rawReply: engine.lastRawReply, selection: engine.lastSelection,
    prompt: engine.lastPrompt, usage: engine.lastReply?.usage, actionSelection: engine.lastActionSelection });
}

// 화면에 선택한 인물의 현재 대화만 표시한다. 다른 인물의 기록과 원본은 유지한다.
export function conversationExchanges(runs, keys, starts) {
  return runs.map(run => ({ run, targets: run.targets.filter(t => keys.includes(t.key) && run.id > (starts[t.key] ?? 0)) }))
    .filter(exchange => exchange.targets.length);
}
