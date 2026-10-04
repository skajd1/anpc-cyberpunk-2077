-- 개발용 파일 브리지. redscript Entry의 AI 요청을 bridge/req-<id>.json으로 쓰고,
-- 로컬 브리지(prototype/game-bridge.js)가 쓴 bridge/res-<id>.txt를 읽어 Entry에 돌려준다.
-- 응답 형식: 1줄 요청 토큰, 2줄 ok | ok:end | error:<code>, 나머지 NPC 대사.
-- 게임 객체를 Lua에 보관하지 않고 매번 Entry를 다시 찾는다.
local bridge = {}
local pending = {}
local elapsed = 0
local TIMEOUT = 60

local function escape(value)
  return (tostring(value or ""):gsub('[%c"\\]', function(c)
    if c == '"' then return '\\"' end
    if c == "\\" then return "\\\\" end
    if c == "\n" then return "\\n" end
    if c == "\r" then return "\\r" end
    if c == "\t" then return "\\t" end
    return string.format("\\u%04x", c:byte())
  end))
end

function bridge.encode(request, token)
  return string.format('{"id":%d,"type":"%s","session":%d,"npc_key":"%s","crowd":%s,"text":"%s","token":"%s"}',
    request.id, escape(request.kind), request.session, escape(request.npcKey),
    request.crowd and "true" or "false", escape(request.text), escape(token))
end

-- 토큰이 다르면 이전 실행의 응답이므로 nil.
function bridge.parse(content, token)
  local first, rest = content:match("^([^\n]*)\n(.*)$")
  if first ~= token or not rest then return nil end
  local status, text = rest:match("^([^\n]*)\n?(.*)$")
  return status, text or ""
end

local function entry()
  local player = Game.GetPlayer()
  if not player or not IsDefined(player) then return nil end
  if Game.GetSystemRequestsHandler():IsPreGame() then return nil end
  local system = Game.GetScriptableSystemsContainer():Get("ANPC.Entry")
  if not system or not IsDefined(system) then return nil end
  return system
end

local function send(system, request)
  local token = string.format("%d-%d-%d", os.time(), request.id, math.random(1, 1000000000))
  local file = io.open("bridge/req-" .. request.id .. ".json", "w")
  if not file then
    if request.kind == "say" then system:OnAIResponse(request.id, "error:bridge_unavailable", "") end
    return
  end
  file:write(bridge.encode(request, token))
  file:close()
  if request.kind == "say" then pending[request.id] = { token = token, age = 0 } end
end

local function receive(system, id, item)
  local path = "bridge/res-" .. id .. ".txt"
  local file = io.open(path, "r")
  if not file then return false end
  local content = file:read("*a")
  file:close()
  local status, text = bridge.parse(content, item.token)
  if not status then return false end
  pcall(os.remove, path)
  system:OnAIResponse(id, status, text)
  return true
end

function bridge.update(delta)
  local ok = pcall(function()
    local system = entry()
    if not system then return end
    for _ = 1, 8 do
      local request = system:TakeRequest()
      if not request or not IsDefined(request) then break end
      send(system, request)
    end
    elapsed = elapsed + delta
    if elapsed < 0.2 then return end
    for id, item in pairs(pending) do
      item.age = item.age + elapsed
      if receive(system, id, item) or item.age > TIMEOUT then pending[id] = nil end
    end
    elapsed = 0
  end)
  return ok
end

function bridge.reset()
  pending = {}
  elapsed = 0
end

function bridge.pendingCount()
  local count = 0
  for _ in pairs(pending) do count = count + 1 end
  return count
end

return bridge
