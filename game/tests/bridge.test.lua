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

-- JSON 디코더: 모델 응답 형식·유니코드 이스케이프·잘못된 입력.
local json = require("json")
local decoded = json.decode('{"dialogue":"\\uc548\\ub155 \\"V\\"","intent":"answer","action":null,"follow_up":null,"n":[1,2.5,-3e2]}')
assert(decoded.dialogue == '안녕 "V"' and decoded.intent == "answer" and decoded.action == json.null)
assert(decoded.n[2] == 2.5 and decoded.n[3] == -300)
assert(json.decode('{"a":') == nil and json.decode('{"a":1} x') == nil)
assert(json.decode('"\\ud83d\\ude00"') == "😀")
print("JSON 디코더 검사 통과")

-- 네이티브 경로: 요청 본문 조립, 완료 폴링, 응답 해석, 최근 발화 누적, 세션 종료 시 취소.
local nativeCalls, results, cancelled = {}, {}, {}
Game.ANPCNative_Version = function() return "0.1.0" end
Game.ANPCNative_Request = function(id, provider, body, timeout)
  nativeCalls[#nativeCalls + 1] = { id = id, provider = provider, body = body, timeout = timeout }
  return true
end
Game.ANPCNative_PollId = function()
  for id in pairs(results) do return id end
  return -1
end
Game.ANPCNative_ResultStatus = function(id) return results[id].status end
Game.ANPCNative_ResultText = function(id) return results[id].text end
Game.ANPCNative_Release = function(id) results[id] = nil end
Game.ANPCNative_Cancel = function(id) cancelled[#cancelled + 1] = id return true end
io.open = function() error("네이티브 경로에서는 파일을 쓰지 않는다") end
responses = {}
queue[1] = { id = 10, kind = "say", session = 5, npcKey = "viktor", crowd = false, text = "임플란트 점검 받을 수 있어?" }
assert(bridge.update(0.3))
assert(#nativeCalls == 1 and nativeCalls[1].provider == "openai" and nativeCalls[1].timeout == 30000)
local body = json.decode(nativeCalls[1].body)
assert(body and body.model == "gpt-4.1-mini" and body.store == false and body.text.format.name == "npc_reply")
assert(body.text.format.schema.properties.dialogue.type == "string")
assert(body.input[#body.input].content == "임플란트 점검 받을 수 있어?" and body.input[#body.input].role == "user")
assert(type(body.instructions) == "string" and #body.instructions > 100)
local fixed = #body.input

results[10] = { status = "ok", text = '{"dialogue":"앉아. 금방 봐줄게.","intent":"answer","emotion":"friendly","action":null,"follow_up":"요즘 통증은 없고?"}' }
assert(bridge.update(0.3))
assert(responses[1].id == 10 and responses[1].status == "ok" and responses[1].text == "앉아. 금방 봐줄게. 요즘 통증은 없고?")

queue[1] = { id = 11, kind = "say", session = 5, npcKey = "viktor", crowd = false, text = "고마워, 다음에 올게" }
assert(bridge.update(0.3))
body = json.decode(nativeCalls[2].body)
assert(#body.input == fixed + 2 and body.input[fixed].role == "user" and body.input[fixed + 1].role == "assistant")

results[11] = { status = "ok", text = '{"dialogue":"그래, 조심해.","intent":"farewell","emotion":"neutral","action":{"action_id":"end_conversation","args":{}},"follow_up":null}' }
assert(bridge.update(0.3))
assert(responses[2].status == "ok:end")

queue[1] = { id = 12, kind = "say", session = 6, npcKey = "", crowd = true, text = "여기 뭐야?" }
queue[2] = { id = 13, kind = "end", session = 6 }
assert(bridge.update(0.3))
assert(json.decode(nativeCalls[3].body) and cancelled[1] == 12 and bridge.pendingCount() == 0)

queue[1] = { id = 14, kind = "say", session = 7, npcKey = "misty", crowd = false, text = "안녕" }
assert(bridge.update(0.3))
results[14] = { status = "auth_failed", text = "" }
assert(bridge.update(0.3))
assert(responses[3].id == 14 and responses[3].status == "error:auth_failed")

results[99] = { status = "ok", text = '{"dialogue":"모르는 요청"}' }
queue[1] = { id = 15, kind = "say", session = 8, npcKey = "jackie", crowd = false, text = "재키?" }
assert(bridge.update(0.3))
assert(responses[4].id == 15 and responses[4].status == "error:story_blocked" and results[99] == nil)
print("네이티브 요청 조립·폴링·응답 해석·취소 검사 통과 (모의 DLL)")
