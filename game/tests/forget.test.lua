-- UF-56: 기억 삭제. 선택 범위만 지우고, 대기 요청을 무효화하며, 키·비용 원장은 건드리지 않는다.
package.path = "game/cet/anpc/?.lua;" .. package.path
local json = require("json")
local config = require("config")
config.voice_enabled = false
config.budget_file = false
local identity, memory, bridge, budget = require("identity"), require("memory"), require("bridge"), require("budget")
local reusable = { IsIdentityReusable = function() return true end, IsIdentityAlive = function() return true end }

local nextSession = 0
local function talk(key, player, npc)
  nextSession = nextSession + 1
  identity.prepare({ npcKey = key, crowd = false, session = nextSession, text = "안녕", context = { npcAliveConfirmed = true, npcFreeConfirmed = true } }, {}, 0, reusable)
  identity.finish(nextSession, { { role = "player", text = player }, { role = "npc", text = npc } }, 0)
end
local function summaries(key)
  for _, item in ipairs(identity.exportCommunity()) do if item.npc_key == key then return item.summaries end end
  return {}
end

identity.reset()
talk("viktor", "임플란트 기억해?", "그래.")
talk("judy", "브레인댄스 얘기", "그건 알아.")
local revision = identity.revision()
local list = identity.memoryList()
assert(#list == 2 and list[1].npc_key == "judy" and list[2].npc_key == "viktor" and list[2].summaries == 1)

-- 범위 삭제: 선택한 NPC만 지우고 나머지는 남는다. 없는 범위는 아무 일도 하지 않는다.
assert(identity.forget("viktor") == 1)
assert(#summaries("viktor") == 0 and #summaries("judy") == 1 and identity.revision() > revision)
local unchanged = identity.revision()
assert(identity.forget("nobody") == 0 and identity.revision() == unchanged)
assert(identity.forget() == 1 and #summaries("judy") == 0 and #identity.memoryList() == 0)

-- 삭제 뒤 같은 NPC와 다시 대화하면 삭제 전 요약이 프롬프트에 없다.
talk("viktor", "처음 보는 척해", "누구지?")
local function promptSummaries(key)
  local ch = identity.prepare({ npcKey = key, crowd = false, session = 9000, text = "기억나?", context = { npcAliveConfirmed = true, npcFreeConfirmed = true } }, {}, 0, reusable)
  return json.decode(ch.messages[#ch.messages]:match("\n(.*)$")).memory.session_summaries
end
identity.forget("viktor")
assert(#promptSummaries("viktor") == 0)

-- 저장 연결: 삭제하면 세대가 오르고 다음 저장용 묶음이 삭제 결과로 다시 만들어진다.
local g = memory.generation()
memory.forget()
assert(memory.generation() == g + 1)
talk("judy", "다시 한 번", "좋아.")
local bundle = json.decode(memory.capture("pt-1:cp-1", "pt-1"))
assert(#bundle.data.owners == 1 and bundle.data.owners[1].scope.actor.key == "judy")
identity.reset()

-- 비용 원장·설정은 기억 삭제와 무관하다.
budget.set({ day_limit_usd = 5 })
local before = budget.summary()
bridge.forgetMemory()
local after = budget.summary()
assert(after.calls == before.calls and after.settled_usd == before.settled_usd)
print("UF-56 범위 삭제·세대 증가·저장 묶음 재생성·비용 원장 보존 검사 통과")

-- 모의 CET: 대기 중인 요청과 진행 중 대화 기록이 삭제와 함께 무효화된다.
local files, responses = {}, {}
local queue = { { id = 1, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "타로 봐줄래?" },
  { id = 2, kind = "say", session = 2, npcKey = "viktor", crowd = false, text = "수술 얘기 해줘" } }
function IsDefined(value) return value ~= nil end
local entry = {
  TakeRequest = function() return table.remove(queue, 1) end,
  GetLatestRequestId = function() return -1 end,
  IsWaitingForReply = function() return true end,
  OnAIResponse = function(_, id, s, t) responses[#responses + 1] = { id = id, status = s, text = t } end
}
Game = {
  GetPlayer = function() return {} end,
  GetSystemRequestsHandler = function() return { IsPreGame = function() return false end } end,
  GetScriptableSystemsContainer = function() return { Get = function() return entry end } end
}
io = { open = function(path, mode)
  if mode == "w" then return { write = function(_, content) files[path] = content end, close = function() end } end
  if files[path] then return { read = function() return files[path] end, close = function() end } end
  return nil
end }
local removed = {}
os.remove = function(path) removed[#removed + 1] = path; files[path] = nil end

assert(bridge.update(0.3))
assert(bridge.pendingCount() == 2)
local mistyToken = files["bridge/req-1.json"]:match('"token":"([^"]+)"')
bridge.forgetMemory("misty")
assert(bridge.pendingCount() == 1, "삭제 범위의 대기 요청만 무효화")
assert(#responses == 1 and responses[1].id == 1 and responses[1].status == "error:memory_cleared")
-- 무효화된 요청의 늦은 응답은 표시·기억되지 않는다.
files["bridge/res-1.txt"] = mistyToken .. "\nok\n카드를 섞어 볼게."
bridge.update(0.3)
assert(#responses == 1 and #summaries("misty") == 0)
-- 다른 NPC의 대기 요청은 유지된다. 전체 삭제는 나머지도 무효화한다.
bridge.forgetMemory()
assert(bridge.pendingCount() == 0 and responses[#responses].id == 2 and responses[#responses].status == "error:memory_cleared")
bridge.reset()
print("UF-56 대기 요청 무효화·늦은 응답 폐기 검사 통과")
