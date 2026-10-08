-- 개발 확인 도구(config.dev_tools). 대화 세션 밖에서 바라보는 NPC를 고정하고 감정 표정·제스처를 하나씩 걸어 본다.
-- 단축키는 CET 설정의 Hotkeys에서 지정한다. 결과는 화면 왼쪽 위에 8초간 표시한다.
local actions = require("actions")
local expressions = require("expressions")
local devtools = {}
local message, remaining = nil, 0
local faceIndex, gestureIndex, talkIndex = 0, 0, 0

local function entry()
  local player = Game.GetPlayer()
  if not player or not IsDefined(player) then return nil end
  local system = Game.GetScriptableSystemsContainer():Get("ANPC.Entry")
  return system and IsDefined(system) and system or nil
end

local function say(text) message, remaining = text, 8 end

local function run(fn)
  local ok, err = pcall(function()
    local system = entry()
    if not system then say("ANPC Entry 없음 (게임 세션 확인)"); return end
    fn(system)
  end)
  if not ok then say("오류: " .. tostring(err)) end
end

function devtools.pin()
  run(function(system)
    faceIndex, gestureIndex = 0, 0
    local pinned = system:DebugPinTarget()
    say(pinned .. " · 제스처 " .. #actions.debugOptions(system) .. "개 가능")
  end)
end

function devtools.face()
  run(function(system)
    faceIndex = faceIndex % #expressions.ORDER + 1
    local emotion = expressions.ORDER[faceIndex]
    local face = expressions.MAP[emotion]
    local ok = system:DebugExpression(face.category, face.idle)
    say(("표정 %d/%d %s → %s (category %d, idle %d)%s"):format(faceIndex, #expressions.ORDER, emotion, face.name,
      face.category, face.idle, ok and "" or " · 적용 불가: NPC를 먼저 고정"))
  end)
end

function devtools.gesture()
  run(function(system)
    local list = actions.debugOptions(system)
    if #list == 0 then say("재생 가능한 제스처 없음 (고정 NPC·AMM 2.12.5·체형·워크스팟·무장 확인)"); return end
    gestureIndex = gestureIndex % #list + 1
    local motion = list[gestureIndex]
    local text = actions.start(system, "debug", motion.ref, nil)
    say(("제스처 %d/%d %s · %s"):format(gestureIndex, #list, motion.ref, text or ""))
  end)
end

function devtools.talk()
  run(function(system)
    if not expressions.talkAvailable() then say("말하기 자원 없음: archive/pc/mod/" .. expressions.TALK_ARCHIVE .. " 확인"); return end
    talkIndex = talkIndex % expressions.TALK_VARIANTS + 1
    local ok = system:DebugTalk(talkIndex)
    say(("말하기 %d/%d (category 4, idle %d)%s"):format(talkIndex, expressions.TALK_VARIANTS, talkIndex,
      ok and " · 멈추려면 해제" or " · 적용 불가: NPC를 먼저 고정"))
  end)
end

function devtools.reset()
  run(function(system)
    system:ExpressionReset()
    actions.cancel("시험 중단")
    say("표정·말하기 해제·제스처 중단")
  end)
end

-- CET는 모듈 최상위(초기 로드)에서만 단축키를 등록할 수 있다.
function devtools.register()
  if type(registerHotkey) ~= "function" then return end
  registerHotkey("anpc_dev_pin", "[ANPC 시험] 바라보는 NPC 고정", devtools.pin)
  registerHotkey("anpc_dev_face", "[ANPC 시험] 다음 감정 표정", devtools.face)
  registerHotkey("anpc_dev_gesture", "[ANPC 시험] 다음 제스처", devtools.gesture)
  registerHotkey("anpc_dev_talk", "[ANPC 시험] 다음 말하기 입모양", devtools.talk)
  registerHotkey("anpc_dev_reset", "[ANPC 시험] 표정·말하기 해제·제스처 중단", devtools.reset)
end

-- CET 오버레이 진단 창 안의 같은 버튼.
function devtools.buttons()
  ImGui.TextWrapped("대화 밖에서 바라보는 NPC에 시험한다.")
  if ImGui.Button("시험: NPC 고정") then devtools.pin() end
  if ImGui.Button("시험: 다음 표정") then devtools.face() end
  if ImGui.Button("시험: 다음 제스처") then devtools.gesture() end
  if ImGui.Button("시험: 다음 말하기 입모양") then devtools.talk() end
  if ImGui.Button("시험: 표정·말하기 해제·제스처 중단") then devtools.reset() end
  if remaining > 0 and message then ImGui.TextWrapped(message) end
end

function devtools.update(delta)
  if remaining > 0 then remaining = remaining - delta end
end

function devtools.draw()
  if remaining <= 0 or not message then return end
  local progress = actions.result("debug")
  ImGui.SetNextWindowPos(32, 220, ImGuiCond.Always)
  ImGui.SetNextWindowSize(460, 0, ImGuiCond.Always)
  ImGui.SetNextWindowBgAlpha(0.75)
  local flags = ImGuiWindowFlags.NoTitleBar + ImGuiWindowFlags.NoResize + ImGuiWindowFlags.NoMove
    + ImGuiWindowFlags.NoInputs + ImGuiWindowFlags.NoSavedSettings + ImGuiWindowFlags.AlwaysAutoResize
  if ImGui.Begin("ANPC 시험##anpc_devtools", flags) then
    ImGui.TextWrapped(message)
    if progress then ImGui.TextWrapped("제스처 상태: " .. progress) end
  end
  ImGui.End()
end

return devtools
