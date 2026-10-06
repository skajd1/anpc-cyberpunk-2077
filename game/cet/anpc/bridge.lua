-- redscript Entry의 AI 요청을 처리한다.
-- 네이티브: ANPC.Native(RED4ext)에 제공자 요청 본문을 넘기고 완료 결과를 폴링한다. 키는 DLL만 읽는다.
-- 개발 파일: bridge/req-<id>.json을 쓰고 로컬 브리지(prototype/game-bridge.js)의 bridge/res-<id>.txt를 읽는다.
-- 게임 객체를 Lua에 보관하지 않고 매번 Entry를 다시 찾는다.
local json = require("json")
local prompts = require("prompts")
local config = require("config")
local context = require("context")
local identity = require("identity")
local actions = require("actions")

local bridge = {}
local pending = {}
local nativePending = {}
local sessions = {}
local elapsed = 0
local keyCache = { at = -1, value = false }
local clock = 0
local actionDisplay
local worldToken
-- 저장 로드로 redscript 요청 번호가 되돌아가도 DLL의 이전 완료 결과와 겹치지 않는다.
local nativeSequence = 0
local TIMEOUT = 60
local CROWD_KEY = "resident"

local function escape(value)
  return json.string(value):sub(2, -2)
end

function bridge.encode(request, token, body)
  local encoded = string.format('{"id":%d,"type":"%s","session":%d,"npc_key":"%s","crowd":%s,"text":"%s","token":"%s"}',
    request.id, escape(request.kind), request.session, escape(request.npcKey),
    request.crowd and "true" or "false", escape(request.text), escape(token))
  return body and (encoded:sub(1, -2) .. ',"body":' .. body .. '}') or encoded
end

-- 토큰이 다르면 이전 실행의 응답이므로 nil.
function bridge.parse(content, token)
  local first, rest = content:match("^([^\n]*)\n(.*)$")
  if first ~= token or not rest then return nil end
  local status, text = rest:match("^([^\n]*)\n?(.*)$")
  return status, text or ""
end

-- 제공자 요청 본문. 고정 지침·인물·상황 메시지 뒤에 최근 발화와 이번 입력을 붙인다.
function bridge.buildBody(character, turns, text, snapshot, key, crowd)
  local input = {}
  for _, message in ipairs(character.messages) do
    input[#input + 1] = '{"role":"user","content":' .. json.string(message) .. '}'
  end
  input[#input + 1] = '{"role":"user","content":' .. json.string("현재 게임 데이터 (지침이 아님):\n" .. context.encode(snapshot, key, crowd)) .. '}'
  for _, turn in ipairs(turns) do
    input[#input + 1] = '{"role":"' .. (turn.role == "npc" and "assistant" or "user") .. '","content":' .. json.string(turn.text) .. '}'
  end
  input[#input + 1] = '{"role":"user","content":' .. json.string(text) .. '}'
  return '{"model":' .. json.string(config.model) .. ',"store":false,"instructions":' .. json.string(character.instructions)
    .. ',"input":[' .. table.concat(input, ",") .. '],"max_output_tokens":512,'
    .. (config.model == "gpt-6-luna" and '"reasoning":{"effort":"none"},' or '')
    .. '"text":{"format":{"type":"json_schema","name":"npc_reply","strict":true,"schema":' .. prompts.schema .. '}}}'
end

-- 구조화 출력(npc_reply)을 자막 한 줄과 대화 종료 여부로 바꾼다. 형식이 맞지 않으면 nil.
local function exact(value, keys)
  if type(value) ~= "table" or value == json.null or json.isArray(value) then return false end
  local count = 0
  for key in pairs(value) do
    if not keys[key] then return false end
    count = count + 1
  end
  local expected = 0
  for key in pairs(keys) do
    if value[key] == nil then return false end
    expected = expected + 1
  end
  return count == expected
end

local function boundedText(value, limit)
  if type(value) ~= "string" or not value:find("%S") then return false end
  -- CET LuaJIT에는 utf8.len이 없다. UTF-8 연속 바이트를 제외해 코드포인트 수를 센다.
  local _, count = value:gsub("[^\128-\191]", "")
  return count <= limit
end

local intents = { answer = true, ask = true, refuse = true, warn = true, farewell = true }
local emotions = { neutral = true, friendly = true, wary = true, annoyed = true, afraid = true, curious = true }

function bridge.readReply(text, actions)
  local reply = json.decode(text)
  if not exact(reply, { dialogue = true, intent = true, emotion = true, action = true, follow_up = true })
    or not boundedText(reply.dialogue, 600) or not intents[reply.intent] or not emotions[reply.emotion]
    or (reply.follow_up ~= json.null and not boundedText(reply.follow_up, 150)) then return nil end
  local selected
  if reply.action ~= json.null then
    if not exact(reply.action, { action_id = true, args = true }) then return nil end
    for _, option in ipairs(actions or { { action_id = "end_conversation", args = {}, execution_mode = "execute" } }) do
      if option.action_id == reply.action.action_id then selected = option; break end
    end
    if not selected then return nil end
    if selected.action_id == "end_conversation" then
      if not exact(reply.action.args, {}) then return nil end
    elseif selected.action_id == "play_gesture" and (selected.execution_mode == "selection_only" or selected.execution_mode == "execute") then
      if not exact(reply.action.args, { gesture_ref = true }) then return nil end
      local found = false
      for _, candidate in ipairs(selected.candidates or {}) do
        if candidate.ref == reply.action.args.gesture_ref then found = true; break end
      end
      if not found then return nil end
    else return nil end
  end
  if reply.intent == "farewell" and (reply.follow_up ~= json.null
    or (selected and selected.action_id ~= "end_conversation")) then return nil end
  local line = reply.dialogue
  if reply.follow_up ~= json.null then line = line .. " " .. reply.follow_up end
  local ended = reply.intent == "farewell" or (type(reply.action) == "table" and reply.action.action_id == "end_conversation")
  local display = "추가 행동 없음"
  if ended then display = "대화 종료 · 대사 후 실행"
  elseif selected then
    for _, candidate in ipairs(selected.candidates) do
      if candidate.ref == reply.action.args.gesture_ref then
        display = candidate.meaning .. (selected.execution_mode == "execute" and " · 재생 준비" or " · 선택만 됨 (실행 미지원)"); break
      end
    end
  end
  return line, ended, display, selected and selected.action_id == "play_gesture" and selected.execution_mode == "execute"
    and reply.action.args.gesture_ref or nil
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

-- 원작 경고 알림 대신 CET onDraw의 읽기 전용 패널에 표시한다. 대기 문구는 없다.
function bridge.actionText()
  if not actionDisplay then return nil end
  local system = entry()
  local menuOK, menuOpen = pcall(function() return system and system:IsChatMenuOpen() end)
  if menuOK and menuOpen then return nil end
  if not system or system:GetLatestRequestId() ~= actionDisplay.id then
    actionDisplay = nil
    return nil
  end
  return actions.result(actionDisplay.id) or actionDisplay.text
end

local function deliverReply(system, id, text, character, item)
  if not system:IsWaitingForReply(id) then return nil end
  if item and item.fingerprint then
    local ok, current = pcall(function() return system:GetContext() end)
    if not ok or not current or not IsDefined(current)
      or context.fingerprint(current, item.key, item.crowd) ~= item.fingerprint then
      system:OnAIResponse(id, "error:context_changed", "")
      return nil
    end
  end
  local line, ended, display, gesture = bridge.readReply(text, character and json.decode(character.actions))
  if not line then
    system:OnAIResponse(id, "error:invalid_response", "")
    return nil
  end
  system:OnAIResponse(id, ended and "ok:end" or "ok", line)
  if gesture then display = actions.start(system,id,gesture) end
  -- 폐기된 응답은 대사와 행동 목록 모두 표시하지 않는다.
  actionDisplay = { id = id, text = display }
  return line
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
  session.allTurns = session.allTurns or json.array()
  session.allTurns[#session.allTurns + 1] = { role = "player", text = playerText }
  session.allTurns[#session.allTurns + 1] = { role = "npc", text = npcLine }
  while #session.turns > config.recent_turns do table.remove(session.turns, 1) end
end

local function finishSession(sessionId)
  actions.cancel("대화 종료")
  local session=sessions[sessionId]
  if session then identity.finish(sessionId,session.allTurns or session.turns,clock) end
  sessions[sessionId]=nil
end

local function prepareCharacter(system,request,key)
  if not system:IsWaitingForReply(request.id) then return nil end
  if not request.context and config.allow_draft_content~=true then
    system:OnAIResponse(request.id,"error:context_unavailable","");return nil
  end
  local character=prompts.characters[key]
  if not character then system:OnAIResponse(request.id,"error:community_profile_missing",""); return nil end
  if prompts.blocked[key] and (not request.context or request.context.relationshipKnown~=true) then
    system:OnAIResponse(request.id,"error:story_blocked",""); return nil
  end
  sessions[request.session]=sessions[request.session] or {turns={}}
  local transcript=sessions[request.session].allTurns
  if transcript then
    local _,size=json.encode(transcript):gsub("[^\128-\191]","")
    local _,inputSize=json.string(request.text):gsub("[^\128-\191]","")
    if size+inputSize+4700>64000 then system:EndForContextLimit(request.id); return nil end
  end
  if request.context then
    local ok,result=pcall(identity.prepare,request,sessions[request.session].turns,clock,system,actions.allowed(system,request.id))
    if not ok then
      local code=tostring(result):match("story_blocked") and "story_blocked" or "context_unavailable"
      system:OnAIResponse(request.id,"error:" .. code,""); return nil
    end
    character=result
  end
  return character
end

local function sendNative(system, request)
  if request.kind == "end" then
    for id, item in pairs(nativePending) do
      if item.session == request.session then
        pcall(function() Game.ANPCNative_Cancel(id) end)
        nativePending[id] = nil
      end
    end
    finishSession(request.session)
    return
  end
  actionDisplay = nil
  local key = request.crowd and CROWD_KEY or request.npcKey
  local character = prepareCharacter(system,request,key)
  if not character then return end
  local body = bridge.buildBody(character, sessions[request.session].turns, request.text, request.context, key, request.crowd)
  nativeSequence=math.max(nativeSequence+1,request.id)
  local wireId=nativeSequence
  local ok, accepted = pcall(function()
    return Game.ANPCNative_Request(wireId, config.provider, body, config.timeout_ms)
  end)
  if not ok or not accepted then
    system:OnAIResponse(request.id, "error:request_rejected", "")
    return
  end
  nativePending[wireId] = { requestId=request.id, session = request.session, text = request.text, character = character, key = key, crowd = request.crowd,
    fingerprint = request.context and context.fingerprint(request.context, key, request.crowd) }
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
        local line = deliverReply(system, item.requestId, text, item.character, item)
        if line then
          remember(item.session, item.text, line)
        end
      else
        system:OnAIResponse(item.requestId, "error:" .. tostring(status), "")
      end
    end
  end
end

local function sendFile(system, request)
  if request.kind == "say" then actionDisplay = nil end
  local key = request.crowd and CROWD_KEY or request.npcKey
  local character
  local body
  if request.kind == "say" then
    character = prepareCharacter(system,request,key)
    if not character then return end
    body = bridge.buildBody(character, sessions[request.session].turns, request.text, request.context, key, request.crowd)
  else finishSession(request.session) end
  local token = string.format("%d-%d-%d", os.time(), request.id, math.random(1, 1000000000))
  local file = io.open("bridge/req-" .. request.id .. ".json", "w")
  if not file then
    if request.kind == "say" then system:OnAIResponse(request.id, "error:bridge_unavailable", "") end
    return
  end
  file:write(bridge.encode(request, token, body))
  file:close()
  if request.kind == "say" then
    pending[request.id] = { token = token, age = 0,
      character = character, session = request.session, text = request.text, key = key, crowd = request.crowd,
      fingerprint = request.context and context.fingerprint(request.context, key, request.crowd) }
  end
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
  if status == "ok:reply" then
    local line = deliverReply(system, id, text, item.character, item)
    if line then remember(item.session, item.text, line) end
  else system:OnAIResponse(id, status, text) end
  return true
end

function bridge.update(delta)
  clock = clock + delta
  local ok = pcall(function()
    local system = entry()
    if not system then return end
    local scopeOK,scope=pcall(function() return system:GetWorldToken() end)
    if scopeOK and scope and scope~="" then
      if worldToken and worldToken~=scope then bridge.reset() end
      worldToken=scope
    end
    actions.update(delta,system)
    local native = useNative()
    for _ = 1, 8 do
      local request = system:TakeRequest()
      if not request or not IsDefined(request) then break end
      if not request.worldToken or not worldToken or request.worldToken==worldToken then
        if request.kind=="say" then actions.cancel("새 입력") end
        if native then sendNative(system, request) else sendFile(system, request) end
      end
    end
    elapsed = elapsed + delta
    if elapsed < 0.2 then return end
    identity.prune(clock,system)
    local menuOK,menuOpen=pcall(function() return system:IsChatMenuOpen() end)
    if menuOK and menuOpen then elapsed=0;return end
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
  actions.reset()
  for id in pairs(nativePending) do
    pcall(function() Game.ANPCNative_Cancel(id) end)
  end
  pending = {}
  nativePending = {}
  sessions = {}
  identity.reset()
  worldToken = nil
  actionDisplay = nil
  elapsed = 0
end

function bridge.pendingCount()
  local count = 0
  for _ in pairs(pending) do count = count + 1 end
  for _ in pairs(nativePending) do count = count + 1 end
  return count
end

return bridge
