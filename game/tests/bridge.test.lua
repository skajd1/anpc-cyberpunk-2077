package.path = "game/cet/anpc/?.lua;" .. package.path
local bridge = require("bridge")

local request = { id = 7, kind = "say", session = 3, npcKey = "viktor", crowd = false, text = '안녕 "빅"\n\\' }
local encoded = bridge.encode(request, "tok")
assert(encoded == '{"id":7,"type":"say","session":3,"npc_key":"viktor","crowd":false,"text":"안녕 \\"빅\\"\\n\\\\","token":"tok"}', encoded)
assert(bridge.encode({ id = 1, kind = "end", session = 2, crowd = true }, "t"):find('"crowd":true,"text":""', 1, true))

local status, text = bridge.parse("tok\nok\n대사 한 줄", "tok")
assert(status == "ok" and text == "대사 한 줄")
assert(bridge.parse("old\nok\n이전 응답", "tok") == nil)
status, text = bridge.parse("tok\nerror:timeout\n", "tok")
assert(status == "error:timeout" and text == "")
print("브리지 인코딩·응답 해석 검사 통과")

-- 모의 CET: Entry 요청을 파일로 쓰고, 토큰이 맞는 응답만 Entry로 돌려준다.
local files, removed, responses = {}, {}, {}
local queue = { { id = 1, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "타로 봐줄래?" } }
function IsDefined(value) return value ~= nil end
local entry = {
  TakeRequest = function() return table.remove(queue, 1) end,
  OnAIResponse = function(_, id, s, t) responses[#responses + 1] = { id = id, status = s, text = t } end
}
Game = {
  GetPlayer = function() return {} end,
  GetSystemRequestsHandler = function() return { IsPreGame = function() return false end } end,
  GetScriptableSystemsContainer = function() return { Get = function() return entry end } end
}
io = { open = function(path, mode)
  if mode == "w" then
    return { write = function(_, content) files[path] = content end, close = function() end }
  end
  if files[path] then return { read = function() return files[path] end, close = function() end } end
  return nil
end }
os.remove = function(path) removed[#removed + 1] = path; files[path] = nil end

assert(bridge.update(0.3))
local written = files["bridge/req-1.json"]
assert(written and written:find('"npc_key":"misty"', 1, true))
local token = written:match('"token":"([^"]+)"')
assert(token)
assert(bridge.pendingCount() == 1)

files["bridge/res-1.txt"] = "stale\nok\n이전 실행 응답"
assert(bridge.update(0.3))
assert(#responses == 0 and bridge.pendingCount() == 1)

files["bridge/res-1.txt"] = token .. "\nok\n카드를 섞어 볼게."
assert(bridge.update(0.3))
assert(#responses == 1 and responses[1].id == 1 and responses[1].status == "ok" and responses[1].text == "카드를 섞어 볼게.")
assert(removed[1] == "bridge/res-1.txt" and bridge.pendingCount() == 0)

-- 폴더가 없어 요청 파일을 못 쓰면 즉시 실패를 돌려준다.
queue[1] = { id = 2, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "또 보자" }
io.open = function() return nil end
assert(bridge.update(0.3))
assert(responses[2].id == 2 and responses[2].status == "error:bridge_unavailable")
bridge.reset()
print("브리지 요청 쓰기·토큰 검사·응답 전달 검사 통과 (모의 CET)")
