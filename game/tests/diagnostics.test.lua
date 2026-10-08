package.path = "game/cet/anpc/?.lua;" .. package.path
local diagnostics = require("diagnostics")
local function safe()
  return { epoch = 4, sameObject = true, sceneKnown = true, dead = false,
    playerCombat = false, npcCombat = false, inScene = false, distance = 4.5,
    diagnosticAllowed = true, reason = "diagnostic_only" }
end
assert(diagnostics.mock(safe(), 4))
assert(not diagnostics.mock(nil, 4))
assert(not diagnostics.mock(safe(), 3))
for _, field in ipairs({"sameObject", "sceneKnown", "diagnosticAllowed"}) do
  local state = safe(); state[field] = false; assert(not diagnostics.mock(state, 4))
  state[field] = nil; assert(not diagnostics.mock(state, 4))
end
for _, field in ipairs({"dead", "playerCombat", "npcCombat", "inScene"}) do
  local state = safe(); state[field] = true; assert(not diagnostics.mock(state, 4))
  state[field] = nil; assert(not diagnostics.mock(state, 4))
end
for _, distance in ipairs({-1, 4.501, math.huge, 0/0, "1"}) do
  local state = safe(); state.distance = distance; assert(not diagnostics.mock(state, 4))
end
local state = safe(); state.reason = "scene_unknown"; assert(not diagnostics.mock(state, 4))
print("G1 차단 검사 통과 (모의 상태, 실제 게임 결과 아님)")

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
    return { GetStatus = function() return "decorated=1 lastOffer=test" end }
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
assert(draw():find("원작 장면 허브 1개 | 선택지 5개", 1, true))
assert(draw():find("진입 진단: decorated=1 lastOffer=test", 1, true))
hubFailed = true
events.onUpdate(0.25)
assert(not draw():find("선택지 5개", 1, true))
assert(draw():find("원작 장면 선택지 수집: 미확인", 1, true))
hubFailed = false
draw("대상 고정·다시 검사")
assert(draw("G1 모의 대사 재검사"):find("%[G1 모의 대사%]"))
current.sameObject = false
events.onUpdate(0.25)
assert(not draw():find("%[G1 모의 대사%]"))
current = nil
events.onUpdate(0.25)
assert(not draw():find("test_entity"))
assert(not draw():find("entry_confirmed_ai_not_connected", 1, true))
assert(not draw():find("선택지 5개", 1, true))
assert(not draw():find("decorated=1", 1, true))
current = safe()
current.entityID, current.recordID, current.highLevel = "test_entity", "test_record", 1
events.onUpdate(0.25)
assert(draw():find("entry_confirmed_ai_not_connected", 1, true))
system.Collect = function() error("collector failed") end
events.onUpdate(0.25)
assert(draw():find("수집 실패"))
assert(not draw():find("entry_confirmed_ai_not_connected", 1, true))
assert(not draw():find("선택지 5개", 1, true))
events.onShutdown()
print("대상 변경/세션 소멸/수집 실패 시 오래된 표시 폐기 검사 통과 (모의 런타임)")
