-- redscript Entry의 AI 요청을 처리한다.
-- 네이티브: ANPC.Native(RED4ext)에 제공자 요청 본문을 넘기고 완료 결과를 폴링한다. 키는 DLL만 읽는다.
-- 개발 파일: bridge/req-<id>.json을 쓰고 로컬 브리지(prototype/game-bridge.js)의 bridge/res-<id>.txt를 읽는다.
-- 게임 객체를 Lua에 보관하지 않고 매번 Entry를 다시 찾는다.
local json = require("json")
local prompts = require("prompts")
local config = require("config")

local bridge = {}
local pending = {}
local nativePending = {}
local sessions = {}
local elapsed = 0
local keyCache = { at = -1, value = false }
local clock = 0
local TIMEOUT = 60
local CROWD_KEY = "resident"

local function escape(value)
  return json.string(value):sub(2, -2)
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

-- 제공자 요청 본문. 고정 지침·인물·상황 메시지 뒤에 최근 발화와 이번 입력을 붙인다.
function bridge.buildBody(character, turns, text)
  local input = {}
  for _, message in ipairs(character.messages) do
    input[#input + 1] = '{"role":"user","content":' .. json.string(message) .. '}'
  end
  for _, turn in ipairs(turns) do
    input[#input + 1] = '{"role":"' .. (turn.role == "npc" and "assistant" or "user") .. '","content":' .. json.string(turn.text) .. '}'
  end
  input[#input + 1] = '{"role":"user","content":' .. json.string(text) .. '}'
  return '{"model":' .. json.string(config.model) .. ',"store":false,"instructions":' .. json.string(character.instructions)
    .. ',"input":[' .. table.concat(input, ",") .. '],"max_output_tokens":512,'
    .. '"text":{"format":{"type":"json_schema","name":"npc_reply","strict":true,"schema":' .. prompts.schema .. '}}}'
end

-- 구조화 출력(npc_reply)을 자막 한 줄과 대화 종료 여부로 바꾼다. 형식이 맞지 않으면 nil.
function bridge.readReply(text)
  local reply = json.decode(text)
  if type(reply) ~= "table" or type(reply.dialogue) ~= "string" or reply.dialogue == "" then return nil end
  local line = reply.dialogue
  if type(reply.follow_up) == "string" and reply.follow_up ~= "" then line = line .. " " .. reply.follow_up end
  local ended = reply.intent == "farewell" or (type(reply.action) == "table" and reply.action.action_id == "end_conversation")
  return line, ended
end

local function entry()
  local player = Game.GetPlayer()
  if not player or not IsDefined(player) then return nil end
  if Game.GetSystemRequestsHandler():IsPreGame() then return nil end
  local system = Game.GetScriptableSystemsContainer():Get("ANPC.Entry")
  if not system or not IsDefined(system) then return nil end
  return system
end

function bridge.nativeVersion()
  local ok, version = pcall(function() return Game.ANPCNative_Version() end)
  if ok and type(version) == "string" and version ~= "" then return version end
  return nil
end

local function useNative()
  return config.transport ~= "file" and bridge.nativeVersion() ~= nil
end

function bridge.hasKey()
  if clock - keyCache.at < 1 and keyCache.at >= 0 then return keyCache.value end
  local ok, value = pcall(function() return Game.ANPCNative_HasKey(config.provider) end)
  keyCache = { at = clock, value = ok and value == true }
  return keyCache.value
end

function bridge.saveKey(key)
  keyCache.at = -1
  local ok, saved = pcall(function() return Game.ANPCNative_SaveKey(config.provider, key) end)
  return ok and saved == true
end

function bridge.deleteKey()
  keyCache.at = -1
  local ok, deleted = pcall(function() return Game.ANPCNative_DeleteKey(config.provider) end)
  return ok and deleted == true
end

local function remember(sessionId, playerText, npcLine)
  local session = sessions[sessionId]
  if not session then return end
  session.turns[#session.turns + 1] = { role = "player", text = playerText }
  session.turns[#session.turns + 1] = { role = "npc", text = npcLine }
  while #session.turns > config.recent_turns do table.remove(session.turns, 1) end
end

local function sendNative(system, request)
  if request.kind == "end" then
    for id, item in pairs(nativePending) do
      if item.session == request.session then
        pcall(function() Game.ANPCNative_Cancel(id) end)
        nativePending[id] = nil
      end
    end
    sessions[request.session] = nil
    return
  end
  local key = request.crowd and CROWD_KEY or request.npcKey
  local character = prompts.characters[key]
  if not character then
    system:OnAIResponse(request.id, prompts.blocked[key] and "error:story_blocked" or "error:community_profile_missing", "")
    return
  end
  sessions[request.session] = sessions[request.session] or { turns = {} }
  local body = bridge.buildBody(character, sessions[request.session].turns, request.text)
  local ok, accepted = pcall(function()
    return Game.ANPCNative_Request(request.id, config.provider, body, config.timeout_ms)
  end)
  if not ok or not accepted then
    system:OnAIResponse(request.id, "error:request_rejected", "")
    return
  end
  nativePending[request.id] = { session = request.session, text = request.text }
end

local function receiveNative(system)
  for _ = 1, 4 do
    local id = Game.ANPCNative_PollId()
    if not id or id < 0 then return end
    local status = Game.ANPCNative_ResultStatus(id)
    local text = Game.ANPCNative_ResultText(id)
    Game.ANPCNative_Release(id)
    local item = nativePending[id]
    nativePending[id] = nil
    if item then
      if status == "ok" then
        local line, ended = bridge.readReply(text)
        if line then
          remember(item.session, item.text, line)
          system:OnAIResponse(id, ended and "ok:end" or "ok", line)
        else
          system:OnAIResponse(id, "error:invalid_response", "")
        end
      else
        system:OnAIResponse(id, "error:" .. tostring(status), "")
      end
    end
  end
end

local function sendFile(system, request)
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

local function receiveFile(system, id, item)
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
  clock = clock + delta
  local ok = pcall(function()
    local system = entry()
    if not system then return end
    local native = useNative()
    for _ = 1, 8 do
      local request = system:TakeRequest()
      if not request or not IsDefined(request) then break end
      if native then sendNative(system, request) else sendFile(system, request) end
    end
    elapsed = elapsed + delta
    if elapsed < 0.2 then return end
    if native then receiveNative(system) end
    for id, item in pairs(pending) do
      item.age = item.age + elapsed
      if receiveFile(system, id, item) or item.age > TIMEOUT then pending[id] = nil end
    end
    elapsed = 0
  end)
  return ok
end

function bridge.reset()
  pending = {}
  nativePending = {}
  sessions = {}
  elapsed = 0
end

function bridge.pendingCount()
  local count = 0
  for _ in pairs(pending) do count = count + 1 end
  for _ in pairs(nativePending) do count = count + 1 end
  return count
end

return bridge
