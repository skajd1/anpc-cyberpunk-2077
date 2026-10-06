package.path = "game/cet/anpc/?.lua;" .. package.path
local callbacks, calls = {}, {}
function registerForEvent(name, callback) callbacks[name] = callback end
local bridge = require("bridge")
local result = "가볍게 고개를 끄덕임 · 선택만 됨 (실행 미지원)"
bridge.actionText = function() return result end
ImGuiCond = { Always = 1 }
ImGuiWindowFlags = { NoTitleBar = 1, NoResize = 2, NoMove = 4, NoInputs = 8, NoSavedSettings = 16, AlwaysAutoResize = 32 }
ImGui = {
  SetNextWindowPos = function() end, SetNextWindowSize = function() end, SetNextWindowBgAlpha = function() end,
  Begin = function(title, flags) calls[#calls + 1] = { title = title, flags = flags }; return true end,
  Text = function(text) calls[#calls + 1] = text end,
  TextWrapped = function(text) calls[#calls + 1] = text end,
  End = function() calls[#calls + 1] = "end" end
}
dofile("game/cet/anpc/init.lua")
callbacks.onDraw() -- F4 진단 창을 열지 않은 기본 상태.
assert(#calls == 4 and calls[1].flags == 63 and calls[2] == "행동" and calls[3] == "• " .. result and calls[4] == "end")
result = nil
callbacks.onDraw()
assert(#calls == 4) -- 대기/종료 중에는 패널과 대기 문구를 그리지 않는다.
print("F4 없이 행동 패널 표시·입력 포커스 비점유·대기 표시 없음 검사 통과")
