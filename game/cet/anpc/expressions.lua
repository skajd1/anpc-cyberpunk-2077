-- UF-74: 응답 emotion을 원작 얼굴 표정(FacialReaction category·idle)으로 옮긴다. 적용·해제는 redscript NpcExpression이 한다.
-- 값은 AMM 2.12.5의 OG Expressions 목록과 같다. 감정과 표정의 대응은 실게임 확인 뒤 조정한다.
local expressions = {}

expressions.MAP = {
  neutral = { name = "무표정", category = 2, idle = 2 },
  friendly = { name = "미소", category = 3, idle = 6 },
  wary = { name = "긴장", category = 3, idle = 10 },
  annoyed = { name = "분노", category = 3, idle = 1 },
  afraid = { name = "공포", category = 3, idle = 11 },
  sad = { name = "슬픔", category = 3, idle = 3 },
  curious = { name = "관심", category = 1, idle = 3 },
}
expressions.ORDER = { "neutral", "friendly", "wary", "annoyed", "afraid", "sad", "curious" }

-- 대사가 표시되는 순간(첫 음성 또는 자막) 호출한다. 실패해도 대사·행동에 영향을 주지 않는다.
function expressions.apply(system, id, emotion)
  local face = expressions.MAP[emotion]
  if not face or not system then return false end
  local ok, applied = pcall(function() return system:ExpressionApply(id, face.category, face.idle) end)
  return ok and applied == true
end

return expressions
