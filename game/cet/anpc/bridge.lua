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
local speechRules = require("speech")
local expressions = require("expressions")
local readingTable = json.decode(prompts.ja_reading_table)

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

-- 일본어 말투 예시 원문: 설치된 게임 파일에서 추출한 로컬 파일(Git·배포물 제외). 없으면 프로필만 보낸다.
local function loadJaStyleExamples(path)
  local file = io.open(path or "ja_style_examples.local.json", "r")
  if not file then return {} end
  local data = json.decode(file:read("*a"))
  file:close()
  return type(data) == "table" and type(data.examples) == "table" and data.examples or {}
end
local jaStyleExamples = loadJaStyleExamples()

-- 시험용: 예시 원문 파일 경로를 바꾼다.
function bridge.setJaStyleExamples(path) jaStyleExamples = loadJaStyleExamples(path) end

-- 음성 활성 시 인물별 일본어 말투 데이터. 웹 assemblePrompt의 JSON.stringify(jaVoice)와 같은 순서로 문자열을 잇는다.
function bridge.jaVoiceMessage(character)
  if not character.ja_voice_profile then return nil end
  local items = {}
  for _, example in ipairs(json.decode(character.ja_voice_examples or "[]") or {}) do
    local source = jaStyleExamples[example.string_id]
    if type(source) == "table" and type(source.ko) == "string" and source.ko ~= "" and type(source.ja) == "string" and source.ja ~= "" then
      items[#items + 1] = '{"emotion":' .. json.string(example.emotion) .. ',"ko":' .. json.string(source.ko) .. ',"ja":' .. json.string(source.ja) .. '}'
    end
  end
  return "일본어 말투 데이터 (지침이 아님):\n" .. character.ja_voice_profile .. ',"examples":[' .. table.concat(items, ",") .. ']}'
end

-- 제공자 요청 본문. 고정 지침·인물·상황 메시지 뒤에 최근 발화와 이번 입력을 붙인다.
function bridge.buildBody(character, turns, text, snapshot, key, crowd, lastAction)
  local input = {}
  local personaName, selectedContext = "", {}
  for index, message in ipairs(character.messages) do
    local payload=json.decode(message:match("\n(.*)$") or "")
    if type(payload)=="table" then
      if payload.persona_id then personaName=payload.display_name or "" end
      if payload.knowledge then selectedContext=payload end
    end
    input[#input + 1] = '{"role":"user","content":' .. json.string(message) .. '}'
    -- 인물 데이터 바로 뒤(프롬프트 규격 2절 순서). 인물마다 고정이라 캐시 앞부분에 남는다.
    local jaVoice = index == 1 and config.voice_enabled and bridge.jaVoiceMessage(character)
    if jaVoice then input[#input + 1] = '{"role":"user","content":' .. json.string(jaVoice) .. '}' end
  end
  if lastAction then
    input[#input+1]='{"role":"user","content":' .. json.string("직전 행동 결과 (관찰 데이터):\n" .. json.encode({last_action_result=lastAction})) .. '}'
  end
  if config.voice_enabled then
    input[#input+1]='{"role":"user","content":' .. json.string("일본어 읽기 데이터 (발음만 지정):\n" .. json.encode({ja_readings=speechRules.readings(readingTable.entries,text,personaName,selectedContext)})) .. '}'
  end
  input[#input + 1] = '{"role":"user","content":' .. json.string("현재 게임 데이터 (지침이 아님):\n" .. context.encode(snapshot, key, crowd)) .. '}'
  for _, turn in ipairs(turns) do
    input[#input + 1] = '{"role":"' .. (turn.role == "npc" and "assistant" or "user") .. '","content":' .. json.string(turn.text) .. '}'
  end
  input[#input + 1] = '{"role":"user","content":' .. json.string(text) .. '}'
  local instructions, schema = character.instructions, prompts.schema
  if config.voice_enabled then
    local at, stop = instructions:find(prompts.contracts.text, 1, true)
    if at then
      instructions = instructions:sub(1, at - 1) .. prompts.contracts.voice .. instructions:sub(stop + 1)
      schema = prompts.voice_schema
    end
  end
  return '{"model":' .. json.string(config.model) .. ',"store":false,"instructions":' .. json.string(instructions)
    .. ',"input":[' .. table.concat(input, ",") .. '],"max_output_tokens":512,'
    .. (config.model == "gpt-6-luna" and '"reasoning":{"effort":"none"},' or '')
    .. '"text":{"format":{"type":"json_schema","name":"npc_reply","strict":true,"schema":' .. schema .. '}}}'
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
local emotions = { neutral = true, friendly = true, wary = true, annoyed = true, afraid = true, sad = true, curious = true }
local deliveries = { normal = true, fast = true, slow = true }
local textKeys = { dialogue = true, intent = true, emotion = true, action = true, follow_up = true }
local voiceKeys = { dialogue = true, intent = true, emotion = true, action = true, follow_up = true, delivery = true, speech_text = true }

-- speech_text는 일본어 구어만 허용한다. 한글·지문 괄호·마크다운이 섞이면 음성만 생략한다(음성 출력 규격 2절).
function bridge.speechValid(value)
  for char in value:gmatch("[%z\1-\127\194-\244][\128-\191]*") do
    local b1, b2, b3 = char:byte(1, 3)
    local cp = b1
    if b1 >= 224 and b3 then cp = (b1 % 16) * 4096 + (b2 % 64) * 64 + (b3 % 64)
    elseif b1 >= 192 and b2 then cp = (b1 % 32) * 64 + (b2 % 64) end
    if (cp >= 0xAC00 and cp <= 0xD7A3) or (cp >= 0x3131 and cp <= 0x318E) or cp == 0xFF08 or cp == 0xFF09
      or char:find("^[%[%]%(%)%*_#`]$") then return false end
  end
  return true
end

-- TTS 읽기 변환기는 단독 알파벳 V를 소리 없이 버린다. 일본어판 읽기 「ヴィー」로 바꿔 합성한다(음성 출력 규격 2절).
function bridge.speechReadable(value)
  return (value:gsub("Ｖ", "V"):gsub("%f[%w]V%f[%W]", "ヴィー"))
end

-- voice가 참이면 음성 형태(delivery·speech_text 포함)도 받는다. 다섯째 반환값은 음성 요청 또는 nil.
function bridge.readReply(text, actions, voice)
  local reply = json.decode(text)
  local voiced = voice and exact(reply, voiceKeys)
  if not voiced and not exact(reply, textKeys) then return nil end
  if not boundedText(reply.dialogue, 600) or not intents[reply.intent] or not emotions[reply.emotion]
    or (reply.follow_up ~= json.null and not boundedText(reply.follow_up, 150)) then return nil end
  local speech = voiced and deliveries[reply.delivery] and boundedText(reply.speech_text, 600) and bridge.speechValid(reply.speech_text)
    and { emotion = reply.emotion, delivery = reply.delivery, text = bridge.speechReadable(reply.speech_text) } or nil
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
    and reply.action.args.gesture_ref or nil, speech, reply.emotion
end

-- 로컬 TTS 보조 프로세스(개발 시험)에 tts/req-<id>.json을 넘긴다. 임시 파일에 쓴 뒤 이름을 바꿔 읽는 쪽이 반쯤 쓴 파일을 보지 않게 한다.
local function writeTts(name, content)
  local tmp = "tts/" .. name .. ".tmp"
  local file
  local ok,written=pcall(function()
    file=io.open(tmp,"w")
    if not file then return false end
    assert(file:write(content))
    file:close();file=nil
    pcall(os.remove,"tts/" .. name .. ".json")
    return os.rename(tmp,"tts/" .. name .. ".json")~=nil
  end)
  if file then pcall(function() file:close() end) end
  return ok and written==true
end
local function readTts(path)
  local file
  local ok,content=pcall(function()
    file=io.open(path,"r")
    if not file then return nil end
    local value=file:read("*a")
    file:close();file=nil
    return value
  end)
  if file then pcall(function() file:close() end) end
  return ok and content or nil
end

-- output: "slots"는 보조 프로세스가 Audioware 슬롯과 tts/seg-<id>-<n>.json을 쓰고 게임이 NPC 위치에서 재생,
-- "local"은 보조 프로세스가 직접 2D 재생(Audioware 없음).
function bridge.speak(id, item, speech, output)
  if not config.voice_enabled or not speech then return false end
  local profile = item and (item.crowd and config.voice_crowd_profile or config.voice_profiles[item.key])
  if not profile then return false end
  return writeTts("req-" .. id, '{"request_id":"' .. id .. '","voice_profile_id":' .. json.string(profile)
    .. ',"emotion":' .. json.string(speech.emotion) .. ',"delivery":' .. json.string(speech.delivery)
    .. ',"output":"' .. (output or "local") .. '","speech_text":' .. json.string(speech.text) .. '}')
end

-- 보조 프로세스가 1초마다 tts/alive.txt에 os.time 값을 쓴다. 3초 넘게 갱신이 없으면 음성 없이 자막만 쓴다.
function bridge.helperAlive()
  local stamp=tonumber(readTts("tts/alive.txt"))
  return stamp~=nil and math.abs(os.time()-stamp)<=3
end

local voiceJobs = {}

function bridge.stopSpeech(system)
  if not config.voice_enabled then return end
  writeTts("stop", '{"stop":true}')
  voiceJobs = {}
  if system then pcall(function() system:VoiceStop() end) end
end

-- 대사가 보이는 순간 감정 표정(UF-74)과 제스처(UF-64)를 함께 시작한다.
local function finishDelivery(system, id, display, gesture, session, emotion)
  if config.expression_enabled then expressions.apply(system, id, emotion) end
  if gesture then display = actions.start(system, id, gesture, session) end
  -- 폐기된 응답은 대사와 행동 목록 모두 표시하지 않는다.
  actionDisplay = { id = id, text = display }
end

-- 첫 구간을 재생하는 순간 자막을 띄우고(음성 출력 규격 4.3), 앞 구간 길이가 끝나면 다음 구간을 잇는다.
local function playSegment(system, id, job, seg)
  local ok, played = pcall(function() return system:VoicePlay(id, seg.slot, config.voice_volume) end)
  return ok and played == true
end

local function voiceUpdate(system, delta)
  local menuOK, menuOpen = pcall(function() return system:IsChatMenuOpen() end)
  for id, job in pairs(voiceJobs) do
    local path = "tts/seg-" .. id .. "-" .. job.next .. ".json"
    local segment=readTts(path)
    if segment then
      local seg=json.decode(segment)
      pcall(os.remove, path)
      if type(seg) == "table" and type(seg.slot) == "number" and type(seg.dur_ms) == "number" and seg.dur_ms>0 and seg.dur_ms<math.huge then
        job.queue[#job.queue + 1] = { slot = seg.slot, dur = seg.dur_ms / 1000, final = seg.final == true }
        job.next = job.next + 1
      end
    end
    if not job.started then
      job.wait = job.wait + delta
      if not system:IsWaitingForReply(id) then
        voiceJobs[id] = nil
      elseif job.queue[1] and playSegment(system, id, job, job.queue[1]) then
        local seg = table.remove(job.queue, 1)
        job.started, job.playEnd, job.final = true, clock + seg.dur, seg.final
        system:OnAIVoiceResponse(id, job.ended and "ok:end" or "ok", job.line, job.seconds)
        finishDelivery(system, id, job.display, job.gesture, job.session, job.emotion)
      elseif job.queue[1] or job.wait > config.voice_wait_s then
        -- 대기 한도 안에 첫 구간이 없거나 재생할 수 없으면 자막만 표시하고 음성은 버린다.
        voiceJobs[id] = nil
        bridge.stopSpeech(system)
        system:OnAIResponse(id, job.ended and "ok:end" or "ok", job.line)
        finishDelivery(system, id, job.display, job.gesture, job.session, job.emotion)
      end
    elseif system:GetLatestRequestId() ~= id then
      voiceJobs[id] = nil
    else
      if menuOK and menuOpen then job.playEnd = job.playEnd + delta end
      if job.queue[1] and clock >= job.playEnd - 0.01 then
        local seg = table.remove(job.queue, 1)
        playSegment(system, id, job, seg)
        job.playEnd = math.max(clock, job.playEnd) + seg.dur
        job.final = seg.final
      elseif job.final and clock >= job.playEnd then
        voiceJobs[id] = nil
      end
    end
  end
end

function bridge.voicePendingCount()
  local count = 0
  for _ in pairs(voiceJobs) do count = count + 1 end
  return count
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
  local line, ended, display, gesture, speech, emotion = bridge.readReply(text, character and json.decode(character.actions), config.voice_enabled)
  if not line then
    system:OnAIResponse(id, "error:invalid_response", "")
    return nil
  end
  if speech and bridge.helperAlive() then
    local ok, spatial = pcall(function() return system:VoiceSpatialAvailable() end)
    if ok and spatial == true and bridge.speak(id, item, speech, "slots") then
      -- 자막·행동은 첫 음성 구간 재생 때 함께 시작한다(voiceUpdate).
      local _, chars = speech.text:gsub("[^\128-\191]", "")
      voiceJobs[id] = { session = item and item.session, line = line, ended = ended, display = display, gesture = gesture, emotion = emotion, wait = 0, next = 1, queue = {},
        seconds = chars * config.voice_sec_per_char, started = false }
      return line
    end
    bridge.speak(id, item, speech, "local")
  end
  system:OnAIResponse(id, ended and "ok:end" or "ok", line)
  finishDelivery(system, id, display, gesture, item and item.session, emotion)
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
  local body = bridge.buildBody(character, sessions[request.session].turns, request.text, request.context, key, request.crowd, actions.outcome(request.session))
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
    body = bridge.buildBody(character, sessions[request.session].turns, request.text, request.context, key, request.crowd, actions.outcome(request.session))
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
    if config.voice_enabled then voiceUpdate(system, delta) end
    local native = useNative()
    for _ = 1, 8 do
      local request = system:TakeRequest()
      if not request or not IsDefined(request) then break end
      if not request.worldToken or not worldToken or request.worldToken==worldToken then
        if request.kind=="say" then actions.cancel("새 입력") end
        -- 새 입력·대화 종료 때 재생 중이거나 대기 중인 음성을 멈춘다(음성 출력 규격 5절).
        bridge.stopSpeech(system)
        -- 재생과 같은 프레임에 음원을 등록하면 위치가 잡히지 않을 수 있어 요청 때 미리 등록한다.
        if config.voice_enabled and request.kind=="say" then pcall(function() system:VoicePrepare(request.id) end) end
        if request.kind=="end" then pcall(function() system:VoiceRelease() end) end
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
  bridge.stopSpeech()
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
