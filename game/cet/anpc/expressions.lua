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

-- UF-75 말하기 입모양: 로컬 자원 아카이브(ANPC_talk)가 표정 대응표에 추가한 분류 4번 행. 소리 구간마다 돌려 쓴다.
expressions.TALK_ARCHIVE = "ANPC_talk.local.archive"
expressions.TALK_VARIANTS = 3
-- 소리 구간보다 이만큼 먼저 입을 열고(초), 이보다 짧은 쉼은 닫지 않는다(초).
expressions.TALK_LEAD = 0.05
expressions.TALK_PAUSE = 0.2
local talkTurn = 0

function expressions.talkAvailable()
  local ok, exists = pcall(function() return Game.GetResourceDepot():ArchiveExists(expressions.TALK_ARCHIVE) end)
  return ok and exists == true
end

-- 첫 음성 구간 재생 순간 호출한다. 자원이 없거나 실패하면 입은 움직이지 않고 음성·자막은 그대로다.
function expressions.talkBegin(system, id)
  if not system or not expressions.talkAvailable() then return false end
  local ok, begun = pcall(function() return system:TalkBegin(id) end)
  return ok and begun == true
end

-- 소리 구간이 시작될 때 입을 연다.
function expressions.talkOpen(system, id)
  if not system then return false end
  talkTurn = talkTurn % expressions.TALK_VARIANTS + 1
  local ok, opened = pcall(function() return system:TalkOpen(id, talkTurn) end)
  return ok and opened == true
end

-- 말하는 중 쉼에 입을 닫는다.
function expressions.talkPause(system)
  if system then pcall(function() system:TalkPause() end) end
end

-- 마지막 음성 구간 종료·중단 때 호출한다. 감정 표정으로 돌아간다.
function expressions.talkStop(system)
  if system then pcall(function() system:TalkStop() end) end
end

-- 재생 중인 구간(시작 시각 at)과 대기 구간의 소리 구간을 이어 now에 입이 열려 있어야 하는지 판단한다.
-- 구간의 talk가 없으면(이전 보조 프로세스) 구간 전체를 소리로 본다. 짧은 쉼은 잇는다.
function expressions.talkWanted(segments, at, now)
  local s0, s1
  for _, seg in ipairs(segments) do
    for _, span in ipairs(seg.talk or { { 0, seg.dur } }) do
      local a, b = at + span[1], at + span[2]
      if s0 and a - s1 < expressions.TALK_PAUSE then
        s1 = math.max(s1, b)
      else
        if s0 and now >= s0 - expressions.TALK_LEAD and now < s1 then return true end
        s0, s1 = a, b
      end
    end
    at = at + seg.dur
  end
  return s0 ~= nil and now >= s0 - expressions.TALK_LEAD and now < s1
end

-- 대사가 표시되는 순간(첫 음성 또는 자막) 호출한다. 실패해도 대사·행동에 영향을 주지 않는다.
function expressions.apply(system, id, emotion)
  local face = expressions.MAP[emotion]
  if not face or not system then return false end
  local ok, applied = pcall(function() return system:ExpressionApply(id, face.category, face.idle) end)
  return ok and applied == true
end

return expressions
