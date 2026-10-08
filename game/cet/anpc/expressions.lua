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

-- UF-75 말하기 입모양: 로컬 자원 아카이브(ANPC_talk)가 표정 대응표에 추가한 분류 4번 행. 대사마다 돌려 쓴다.
expressions.TALK_ARCHIVE = "ANPC_talk.local.archive"
expressions.TALK_VARIANTS = 3
local talkTurn = 0

function expressions.talkAvailable()
  local ok, exists = pcall(function() return Game.GetResourceDepot():ArchiveExists(expressions.TALK_ARCHIVE) end)
  return ok and exists == true
end

-- 첫 음성 구간 재생 순간 호출한다. 자원이 없거나 실패하면 입은 움직이지 않고 음성·자막은 그대로다.
function expressions.talkStart(system, id)
  if not system or not expressions.talkAvailable() then return false end
  talkTurn = talkTurn % expressions.TALK_VARIANTS + 1
  local ok, started = pcall(function() return system:TalkStart(id, talkTurn) end)
  return ok and started == true
end

-- 마지막 음성 구간 종료·중단 때 호출한다. 감정 표정으로 돌아간다.
function expressions.talkStop(system)
  if system then pcall(function() system:TalkStop() end) end
end

-- 대사가 표시되는 순간(첫 음성 또는 자막) 호출한다. 실패해도 대사·행동에 영향을 주지 않는다.
function expressions.apply(system, id, emotion)
  local face = expressions.MAP[emotion]
  if not face or not system then return false end
  local ok, applied = pcall(function() return system:ExpressionApply(id, face.category, face.idle) end)
  return ok and applied == true
end

return expressions
