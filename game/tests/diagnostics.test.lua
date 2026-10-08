package.path = "game/cet/anpc/?.lua;" .. package.path
local labels = require("labels")
local function safe()
  return { epoch = 4, sameObject = true, sceneKnown = true, dead = false,
    playerCombat = false, npcCombat = false, npcStateKnown = true, inScene = false, distance = 4.5,
    diagnosticAllowed = true, reason = "diagnostic_only" }
end
-- 디버그 창 표시 이름: 코드만 바꾸고 모르는 코드·한국어 문장은 그대로 둔다.
assert(labels.text("session_left") == "멀어져서 종료(6m)" and labels.text("entry_unknown_code") == "entry_unknown_code")
assert(labels.text("AI 응답 #3 ok:end · 음성") == "AI 응답 #3 정상(대화 끝) · 음성")
assert(labels.text("error:story_blocked") == "오류(스토리 조건으로 막힘)" and labels.text("error:http_429") == "오류(http_429)")
assert(labels.text("exited:3") == "종료됨(코드 3)" and labels.text("failed:create_process_2") == "실행 실패(프로세스 생성 2)")
assert(labels.text("대상 불가: npc_combat") == "대상 불가: NPC 전투 중" and labels.text(nil) == "모름")
assert(labels.text("not_root_hub(3) · 등록 true") == "첫 선택지 화면 아님(3) · 등록 예")
assert(labels.yes(true) == "예" and labels.yes(false) == "아니오" and labels.yes(nil) == "모름")
print("디버그 창 상태 코드 한국어 표시 검사 통과")

-- CET가 게임에 진입하지 않은 상태에서도 로더/수명 콜백이 동작해야 한다.
local events = {}
function registerForEvent(name, callback) events[name] = callback end
function GetVersion() return "test" end
function IsDefined(value) return value ~= nil end
Game = { GetPlayer = function() return nil end }
dofile("game/cet/anpc/init.lua")
events.onInit()
events.onOverlayOpen()
events.onUpdate(1)
events.onOverlayClose()
events.onShutdown()
print("CET 세션 없음/종료 검사 통과 (모의 런타임)")

local current = safe()
current.entityID, current.recordID, current.highLevel = "test_entity", "test_record", 1
local system = {
  Pin = function() return current end,
  Collect = function() return current end,
  Reset = function() end
}
local receipt = "entry_confirmed_ai_not_connected"
local hubs = {choiceHubs = {{choices = {1, 2, 3, 4, 5}}}}
local hubFailed = false
function FromVariant(value) return value end
Game = {
  GetPlayer = function() return {} end,
  GetSystemRequestsHandler = function() return { IsPreGame = function() return false end } end,
  GetScriptableSystemsContainer = function() return { Get = function(_, name)
    if name == "ANPC.Entry" then return { GetStatus = function() return {reason = receipt} end } end
    assert(name == "ANPC.Diagnostics")
    return system
  end } end,
  GetScriptableServiceContainer = function() return { GetService = function(_, name)
    assert(name == "ANPC.SceneEntryInstaller")
    return { GetStatus = function() return "ANPC 선택지: 표시 1회 · 최근 consumed" end }
  end } end,
  GetAllBlackboardDefs = function() return {UIInteractions = {DialogChoiceHubs = "test_hubs"}} end,
  GetBlackboardSystem = function() return { Get = function() return { GetVariant = function(_, field)
    assert(field == "test_hubs")
    if hubFailed then error("hub collector failed") end
    return hubs
  end } end } end
}
function GetSingleton(name)
  assert(name == "ANPC.Diagnostics")
  return { Version = function() return "test-redscript" end }
end
local pressed, drawn = nil, {}
ImGui = {
  Begin = function() return true end,
  End = function() end,
  Text = function(text) drawn[#drawn + 1] = text end,
  TextWrapped = function(text) drawn[#drawn + 1] = text end,
  Button = function(label) return pressed == label end
}
local function draw(button)
  pressed, drawn = button, {}
  events.onDraw()
  return table.concat(drawn, "\n")
end
events.onInit()
events.onOverlayOpen()
assert(draw():find("redscript test%-redscript"))
assert(not draw():find("읽기 전용", 1, true) and not draw():find("미구현", 1, true))
assert(draw():find("원작 선택지 화면 1개 · 선택지 5개", 1, true))
assert(draw():find("ANPC 선택지: 표시 1회 · 최근 이미 사용함", 1, true))
assert(draw():find("대화: 선택됨 · AI 연결 없음", 1, true) and draw():find("상태: 대화 가능", 1, true))
assert(not draw():find("G1", 1, true) and not draw():find("시험", 1, true) and not draw():find("허브", 1, true))
hubFailed = true
events.onUpdate(0.25)
assert(not draw():find("선택지 5개", 1, true))
assert(draw():find("원작 선택지: 읽지 못함", 1, true))
hubFailed = false
assert(draw("다시 검사"):find("레코드 test_record · 엔티티 test_entity", 1, true))
assert(draw():find("사망 아니오 · V 전투 아니오 · NPC 전투 아니오 · 장면 중 아니오", 1, true))
current = nil
events.onUpdate(0.25)
assert(not draw():find("test_entity"))
assert(not draw():find("AI 연결 없음", 1, true))
assert(not draw():find("선택지 5개", 1, true))
assert(not draw():find("표시 1회", 1, true))
current = safe()
current.entityID, current.recordID, current.highLevel = "test_entity", "test_record", 1
events.onUpdate(0.25)
assert(draw():find("AI 연결 없음", 1, true))
system.Collect = function() error("collector failed") end
events.onUpdate(0.25)
assert(draw():find("읽기 실패", 1, true))
assert(not draw():find("AI 연결 없음", 1, true))
assert(not draw():find("선택지 5개", 1, true))
events.onShutdown()
print("대상 변경/세션 소멸/수집 실패 시 오래된 표시 폐기 검사 통과 (모의 런타임)")
