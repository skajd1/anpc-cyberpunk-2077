-- redscript Entry의 AI 요청을 처리한다.
-- 네이티브: ANPC.Native(RED4ext)에 제공자 요청 본문을 넘기고 완료 결과를 폴링한다. 키는 DLL만 읽는다.
-- 개발 파일: bridge/req-<id>.json을 쓰고 로컬 브리지(prototype/game-bridge.js)의 bridge/res-<id>.txt를 읽는다.
-- 게임 객체를 Lua에 보관하지 않고 매번 Entry를 다시 찾는다.
local json = require("json")
local prompts = require("prompts")
local config = require("config")
local context = require("context")
local story = require("story")
local memory = require("memory")
local identity = require("identity")
local actions = require("actions")
local budget = require("budget")
local speechRules = require("speech")
local readingTable = json.decode(prompts.ja_reading_table)
local readingEntities = json.decode(prompts.ja_reading_entities)

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

-- 제공자 요청 본문과 선택된 예산 프로필(비용 규격 2절). 고정 지침·인물·상황 메시지 뒤에 최근 발화와 이번 입력을 붙인다.
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
    input[#input+1]='{"role":"user","content":' .. json.string("일본어 읽기 데이터 (발음만 지정):\n" .. json.encode({ja_readings=speechRules.readings(readingTable.entries,text,personaName,selectedContext,readingEntities)})) .. '}'
  end
  input[#input + 1] = '{"role":"user","content":' .. json.string("현재 게임 데이터 (지침이 아님):\n" .. context.encode(snapshot, key, crowd)) .. '}'
  for _, turn in ipairs(turns) do
    input[#input + 1] = '{"role":"' .. (turn.role == "npc" and "assistant" or "user") .. '","content":' .. json.string(turn.text) .. '}'
  end
  input[#input + 1] = '{"role":"user","content":' .. json.string(text) .. '}'
  local profile = budget.profile(text, selectedContext)
  local instructions, schema = character.instructions, prompts.schema
  if config.voice_enabled then
    local at, stop = instructions:find(prompts.contracts.text, 1, true)
    if at then
      instructions = instructions:sub(1, at - 1) .. prompts.contracts.voice .. instructions:sub(stop + 1)
      schema = prompts.voice_schema
    end
  end
  return '{"model":' .. json.string(config.model) .. ',"store":false,"instructions":' .. json.string(instructions)
    .. ',"input":[' .. table.concat(input, ",") .. '],"max_output_tokens":' .. budget.outputLimit(profile) .. ','
    .. (config.model == "gpt-6-luna" and '"reasoning":{"effort":"none"},' or '')
    .. '"text":{"format":{"type":"json_schema","name":"npc_reply","strict":true,"schema":' .. schema .. '}}}', profile
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

-- 실행 약속·성공 주장·행동 지시 표지(프롬프트 명세 8절 목록과 같다. 시험이 명세와 일치를 검사한다).
-- 행동을 제거한 뒤 대사에 이 표지가 있으면 대사가 제거한 행동에 의존한다고 보고 함께 폐기한다.
bridge.actionMarkers = { "줄게", "할게", "해줄", "해 줄", "보여줄", "따라와", "따라갈", "같이 가", "가자", "안내", "데려", "열어", "흔들", "박수", "멈출", "멈춰", "앉을게", "서 있을게" }
function bridge.dependsOnAction(...)
  for _, text in ipairs({ ... }) do
    if type(text) == "string" then
      for _, marker in ipairs(bridge.actionMarkers) do
        if text:find(marker, 1, true) then return true end
      end
    end
  end
  return false
end

-- 행동 제안 하나를 허용 목록·인수·권한으로 검사한다. 통과하면 선택된 ActionOption, 아니면 nil(호출자가 행동만 제거한다).
local function checkAction(action, options)
  if not exact(action, { action_id = true, args = true }) then return nil end
  for _, option in ipairs(options) do
    if option.action_id == action.action_id then
      if option.action_id == "end_conversation" then
        return exact(action.args, {}) and option or nil
      elseif option.action_id == "play_gesture" and (option.execution_mode == "selection_only" or option.execution_mode == "execute") then
        if not exact(action.args, { gesture_ref = true }) then return nil end
        for _, candidate in ipairs(option.candidates or {}) do
          if candidate.ref == action.args.gesture_ref then return option end
        end
      end
      return nil
    end
  end
  return nil
end

-- voice가 참이면 음성 형태(delivery·speech_text 포함)도 받는다. 다섯째 반환값은 음성 요청 또는 nil.
-- 대사·필드·열거 위반은 전체 거부(nil)이고, 허용 밖 행동은 행동만 제거한다(런타임 5절·프롬프트 8절).
-- 제거 뒤 대사에 실행 약속 표지가 있으면 fallbackLine(작성된 안전 대사)로 대체하며 fallbackLine이 없으면 전체 거부한다.
function bridge.readReply(text, actions, voice, fallbackLine)
  local reply = json.decode(text)
  local voiced = voice and exact(reply, voiceKeys)
  if not voiced and not exact(reply, textKeys) then return nil end
  if not boundedText(reply.dialogue, 600) or not intents[reply.intent] or not emotions[reply.emotion]
    or (reply.follow_up ~= json.null and not boundedText(reply.follow_up, 150)) then return nil end
  -- 이별 대사 뒤에 후속 질문을 잇는 것은 대사 형식 위반이다.
  if reply.intent == "farewell" and reply.follow_up ~= json.null then return nil end
  local speech = voiced and deliveries[reply.delivery] and boundedText(reply.speech_text, 600) and bridge.speechValid(reply.speech_text)
    and { emotion = reply.emotion, delivery = reply.delivery, text = bridge.speechReadable(reply.speech_text) } or nil
  local selected, removed
  if reply.action ~= json.null then
    selected = checkAction(reply.action, actions or { { action_id = "end_conversation", args = {}, execution_mode = "execute" } })
    -- 이별 대사의 다른 행동은 충돌이므로 제거한다.
    if selected and reply.intent == "farewell" and selected.action_id ~= "end_conversation" then selected = nil end
    removed = selected == nil
  end
  local line = reply.dialogue
  if reply.follow_up ~= json.null then line = line .. " " .. reply.follow_up end
  if removed then
    if bridge.dependsOnAction(reply.dialogue, reply.follow_up) then
      if type(fallbackLine) ~= "string" or fallbackLine == "" then return nil end
      -- 안전 대체 대사는 일본어 음성이 없으므로 자막만 표시하고 대화를 이어간다.
      return fallbackLine, false, "허용되지 않은 행동 · 안전 대사 표시", nil, nil
    end
    local display = "허용되지 않은 행동 제거 · 대사만 표시"
    return line, reply.intent == "farewell", display, nil, speech
  end
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
    and reply.action.args.gesture_ref or nil, speech
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

-- 표시되지 않은 응답의 발화 기록을 되돌린다(음성 첫 구간을 기다리는 중 요청이 취소된 경우).
local function forget(sessionId)
  local session = sessions[sessionId]
  if not session then return end
  for _ = 1, 2 do
    table.remove(session.turns)
    if session.allTurns then table.remove(session.allTurns) end
  end
end

local voiceJobs = {}

function bridge.stopSpeech(system)
  if not config.voice_enabled then return end
  writeTts("stop", '{"stop":true}')
  voiceJobs = {}
  if system then pcall(function() system:VoiceStop() end) end
end

local function finishDelivery(system, id, display, gesture, session)
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
        -- 취소·종료·보호 조건 변화로 표시되지 못한 응답은 발화 기록에서도 뺀다.
        forget(job.session)
        voiceJobs[id] = nil
      elseif job.queue[1] and playSegment(system, id, job, job.queue[1]) then
        local seg = table.remove(job.queue, 1)
        job.started, job.playEnd, job.final = true, clock + seg.dur, seg.final
        system:OnAIVoiceResponse(id, job.ended and "ok:end" or "ok", job.line, job.seconds)
        finishDelivery(system, id, job.display, job.gesture, job.session)
      elseif job.queue[1] or job.wait > config.voice_wait_s then
        -- 대기 한도 안에 첫 구간이 없거나 재생할 수 없으면 자막만 표시하고 음성은 버린다.
        voiceJobs[id] = nil
        bridge.stopSpeech(system)
        system:OnAIResponse(id, job.ended and "ok:end" or "ok", job.line)
        finishDelivery(system, id, job.display, job.gesture, job.session)
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

-- 저장 연결 시스템(ANPC.MemorySave). 없거나 조회가 실패하면 nil이며 이때 월드 변경은 기억을 모두 비운다(저장별 기억 보류).
local function memorySystem()
  local ok, system = pcall(function() return Game.GetScriptableSystemsContainer():Get("ANPC.MemorySave") end)
  if ok and system and IsDefined(system) then return system end
  return nil
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
  local line, ended, display, gesture, speech = bridge.readReply(text, character and json.decode(character.actions), config.voice_enabled, character and character.fallback_line)
  if not line then
    system:OnAIResponse(id, "error:invalid_response", "")
    return nil
  end
  if speech and bridge.helperAlive() then
    local ok, spatial = pcall(function() return system:VoiceSpatialAvailable() end)
    if ok and spatial == true and bridge.speak(id, item, speech, "slots") then
      -- 자막·행동은 첫 음성 구간 재생 때 함께 시작한다(voiceUpdate).
      local _, chars = speech.text:gsub("[^\128-\191]", "")
      voiceJobs[id] = { session = item and item.session, line = line, ended = ended, display = display, gesture = gesture, wait = 0, next = 1, queue = {},
        seconds = chars * config.voice_sec_per_char, started = false }
      return line
    end
    bridge.speak(id, item, speech, "local")
  end
  system:OnAIResponse(id, ended and "ok:end" or "ok", line)
  finishDelivery(system, id, display, gesture, item and item.session)
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

local turnRevision = 0
local function remember(sessionId, playerText, npcLine)
  local session = sessions[sessionId]
  if not session then return end
  turnRevision = turnRevision + 1
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
  if prompts.blocked[key] and (not request.context or story.relationship(request.context,key).status~="known") then
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

-- 요청 본문 크기로 입력 토큰을 추정해 예약한다(비용 규격 6절). 실패하면 Entry에 오류를 돌려주고 nil.
local function reserveBudget(system, request, body, profile)
  local reservation, code = budget.reserve({ session = request.session, kind = "dialogue", profile = profile,
    inputTokens = budget.estimateTokens(body), outputTokens = budget.outputLimit(profile) })
  if not reservation then system:OnAIResponse(request.id, "error:" .. code, "") end
  return reservation
end

-- Entry의 요청 취소(Esc)·응답 시한 만료. 통신을 취소하고 대기 기록·미재생 음성·미표시 기억을 버린다.
-- 이미 끝났거나 모르는 요청은 아무 일도 하지 않는다. 늦게 온 결과는 대기 기록이 없어 무시된다.
local function cancelRequest(system, request)
  for id, item in pairs(nativePending) do
    if item.requestId == request.id and item.session == request.session then
      pcall(function() Game.ANPCNative_Cancel(id) end)
      -- 취소 전에 제공자가 이미 처리했을 수 있다. 예약액을 미확정으로 남긴다(비용 규격 5절).
      if item.reservation then budget.keepUnsettled(item.reservation, "cancelled") end
      nativePending[id] = nil
    end
  end
  local item = pending[request.id]
  if item and item.session == request.session then
    if item.reservation then budget.keepUnsettled(item.reservation, "cancelled") end
    pending[request.id] = nil
    pcall(os.remove, "bridge/res-" .. request.id .. ".txt")
  end
  local job = voiceJobs[request.id]
  if job and job.session == request.session and not job.started then forget(request.session) end
  voiceJobs[request.id] = nil
end

local function sendNative(system, request)
  if request.kind == "end" then
    for id, item in pairs(nativePending) do
      if item.session == request.session then
        pcall(function() Game.ANPCNative_Cancel(id) end)
        if item.reservation then budget.keepUnsettled(item.reservation, "cancelled") end
        nativePending[id] = nil
      end
    end
    budget.endSession(request.session)
    finishSession(request.session)
    return
  end
  actionDisplay = nil
  local key = request.crowd and CROWD_KEY or request.npcKey
  local character = prepareCharacter(system,request,key)
  if not character then return end
  local body, profile = bridge.buildBody(character, sessions[request.session].turns, request.text, request.context, key, request.crowd, actions.outcome(request.session))
  local reservation = reserveBudget(system, request, body, profile)
  if not reservation then return end
  nativeSequence=math.max(nativeSequence+1,request.id)
  local wireId=nativeSequence
  local ok, accepted = pcall(function()
    return Game.ANPCNative_Request(wireId, config.provider, body, config.timeout_ms)
  end)
  if not ok or not accepted then
    budget.release(reservation)
    system:OnAIResponse(request.id, "error:request_rejected", "")
    return
  end
  nativePending[wireId] = { requestId=request.id, session = request.session, reservation = reservation, text = request.text, character = character, key = key, crowd = request.crowd,
    fingerprint = request.context and context.fingerprint(request.context, key, request.crowd) }
end

local function receiveNative(system)
  for _ = 1, 4 do
    local id = Game.ANPCNative_PollId()
    if not id or id < 0 then return end
    local status = Game.ANPCNative_ResultStatus(id)
    local text = Game.ANPCNative_ResultText(id)
    -- 사용량은 Native가 제공자 응답의 usage에서 읽는다. 없거나 함수가 없으면 nil이며 미확정으로 남긴다.
    local usageOK, inputTokens, outputTokens = pcall(function()
      return Game.ANPCNative_ResultInputTokens(id), Game.ANPCNative_ResultOutputTokens(id)
    end)
    if not usageOK then inputTokens, outputTokens = nil, nil end
    Game.ANPCNative_Release(id)
    local item = nativePending[id]
    nativePending[id] = nil
    if item then
      if item.reservation then budget.finish(item.reservation, status, inputTokens, outputTokens) end
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
  local reservation
  if request.kind == "say" then
    character = prepareCharacter(system,request,key)
    if not character then return end
    local profile
    body, profile = bridge.buildBody(character, sessions[request.session].turns, request.text, request.context, key, request.crowd, actions.outcome(request.session))
    reservation = reserveBudget(system, request, body, profile)
    if not reservation then return end
  else budget.endSession(request.session); finishSession(request.session) end
  local token = string.format("%d-%d-%d", os.time(), request.id, math.random(1, 1000000000))
  local file = io.open("bridge/req-" .. request.id .. ".json", "w")
  if not file then
    if request.kind == "say" then
      budget.release(reservation)
      system:OnAIResponse(request.id, "error:bridge_unavailable", "")
    end
    return
  end
  file:write(bridge.encode(request, token, body))
  file:close()
  if request.kind == "say" then
    pending[request.id] = { token = token, age = 0, reservation = reservation,
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
  -- 개발 파일 브리지는 사용량을 돌려주지 않는다. 정산하지 못한 예약은 미확정으로 남는다.
  if item.reservation then budget.finish(item.reservation, status == "ok:reply" and "ok" or tostring(status):gsub("^error:", "")) end
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
    -- 로드 화면·메인 메뉴로 Entry가 사라지면 진행 중인 행동 어댑터(워크스팟·도우미 객체)를 정리한다(행동 규격 8절).
    if not system then actions.cancel("게임 상태 변경");return end
    local scopeOK,scope=pcall(function() return system:GetWorldToken() end)
    if scopeOK and scope and scope~="" then
      if worldToken and worldToken~=scope then bridge.reset(memorySystem()~=nil) end
      worldToken=scope
    end
    -- 저장 연결: 로드·새 게임이면 저장 자료로 교체(없으면 빈 기억), 평소에는 다음 저장용 묶음을 최신으로 둔다.
    local memorySystemNow=memorySystem()
    if memorySystemNow then
      local memoryOK=pcall(memory.sync,memorySystemNow,function(sessionId)
        local session=sessions[sessionId];return session and session.allTurns or nil
      end,function() return turnRevision end)
      if not memoryOK then pcall(identity.reset) end
    end
    actions.update(delta,system)
    if config.voice_enabled then voiceUpdate(system, delta) end
    local native = useNative()
    for _ = 1, 8 do
      local request = system:TakeRequest()
      if not request or not IsDefined(request) then break end
      if request.kind=="cancel" and (not request.worldToken or not worldToken or request.worldToken==worldToken) then
        cancelRequest(system, request)
        bridge.stopSpeech(system)
      elseif not request.worldToken or not worldToken or request.worldToken==worldToken then
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
      if receiveFile(system, id, item) then pending[id] = nil
      elseif item.age > TIMEOUT then
        if item.reservation then budget.keepUnsettled(item.reservation, "timeout") end
        pending[id] = nil
      end
    end
    elapsed = 0
  end)
  return ok
end

-- keepMemory: 빠른 이동 같은 세계 전환에서는 저장 연결이 있을 때 커뮤니티 기억을 유지하고 군중·진행 중 세션만 버린다.
function bridge.reset(keepMemory)
  bridge.stopSpeech()
  actions.reset()
  for id, item in pairs(nativePending) do
    pcall(function() Game.ANPCNative_Cancel(id) end)
    if item.reservation then budget.keepUnsettled(item.reservation, "reset") end
  end
  for _, item in pairs(pending) do
    if item.reservation then budget.keepUnsettled(item.reservation, "reset") end
  end
  -- 게임 로드·세계 전환으로 일일 원장·예약·설정을 되돌리지 않는다. 세션 번호가 재사용되므로 세션 누적만 비운다.
  budget.resetSessions()
  pending = {}
  nativePending = {}
  sessions = {}
  if keepMemory then identity.suspend() else identity.reset(); memory.reset() end
  worldToken = nil
  actionDisplay = nil
  elapsed = 0
end

-- 80% 안내 한 번(비용 규격 6절). CET 창이 표시한다.
function bridge.budgetNotice() return budget.takeNotice() end

function bridge.pendingCount()
  local count = 0
  for _ in pairs(pending) do count = count + 1 end
  for _ in pairs(nativePending) do count = count + 1 end
  return count
end

return bridge
