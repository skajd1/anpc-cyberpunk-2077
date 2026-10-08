local labels = require("labels")
local bridge = require("bridge")
local config = require("config")
local devtools = require("devtools")
if config.dev_tools then devtools.register() end
local version = "0.1.0"
local overlay, elapsed = false, 0
local state
local sceneHubs, sceneChoices
local entryStatus = "entry_not_selected"
local sceneEntryStatus
local status = "초기화 대기"
local keyInput, keyNotice = "", ""
local cetVersion = "unknown"
local redscriptVersion = "unknown"

-- 세션 사이에 ScriptableSystem이나 게임 객체를 Lua에 보관하지 않는다.
local function collector()
  local player = Game.GetPlayer()
  if not player or not IsDefined(player) then return nil end
  if Game.GetSystemRequestsHandler():IsPreGame() then return nil end
  return Game.GetScriptableSystemsContainer():Get("ANPC.Diagnostics")
end

local function refresh(pin)
  local ok, result = pcall(function()
    local system = collector()
    if not system then return nil end
    return pin and system:Pin() or system:Collect()
  end)
  if not ok then
    state = nil
    sceneHubs, sceneChoices = nil, nil
    entryStatus = "entry_collector_unavailable"
    sceneEntryStatus = nil
    status = "읽기 실패(redscript·CET 로그 확인)"
    return
  end
  state = result
  status = state and state.reason or "게임 불러오기 전"
  sceneHubs, sceneChoices = nil, nil
  if state then
    local hubOK, hubs, choices = pcall(function()
      local definition = Game.GetAllBlackboardDefs().UIInteractions
      local blackboard = Game.GetBlackboardSystem():Get(definition)
      if not blackboard or not IsDefined(blackboard) then return nil, nil end
      local data = FromVariant(blackboard:GetVariant(definition.DialogChoiceHubs))
      local count = 0
      for _, hub in ipairs(data.choiceHubs) do count = count + #hub.choices end
      return #data.choiceHubs, count
    end)
    if hubOK then sceneHubs, sceneChoices = hubs, choices end
  end
  local entryOK, entryResult = pcall(function()
    if not state then return "entry_not_selected" end
    local entry = Game.GetScriptableSystemsContainer():Get("ANPC.Entry")
    if not entry or not IsDefined(entry) then return "entry_not_installed" end
    local receipt = entry:GetStatus()
    return receipt and receipt.reason or "entry_not_selected"
  end)
  entryStatus = entryOK and entryResult or "entry_collector_unavailable"
  local sceneOK, sceneResult = pcall(function()
    if not state then return nil end
    local service = Game.GetScriptableServiceContainer():GetService("ANPC.SceneEntryInstaller")
    if not service or not IsDefined(service) then return nil end
    return service:GetStatus()
  end)
  sceneEntryStatus = sceneOK and sceneResult or nil
end

registerForEvent("onInit", function()
  cetVersion = tostring(GetVersion())
  local ok, redVersion = pcall(function() return GetSingleton("ANPC.Diagnostics"):Version() end)
  if ok then redscriptVersion = tostring(redVersion) end
  status = ok and ("redscript " .. tostring(redVersion)) or "redscript 불러오기 실패"
  print("[ANPC] Lua " .. version .. "; CET " .. cetVersion .. "; " .. status)
  if not ok then print("[ANPC] redscript 버전 조회 실패: " .. tostring(redVersion)) end
end)

registerForEvent("onOverlayOpen", function() overlay = true; refresh(false) end)
registerForEvent("onOverlayClose", function()
  overlay = false
  state = nil
  sceneHubs, sceneChoices = nil, nil
  entryStatus = "entry_not_selected"
  sceneEntryStatus = nil
  pcall(function() local system = collector(); if system then system:Reset() end end)
end)
registerForEvent("onShutdown", function()
  overlay = false
  bridge.reset()
  state = nil
  sceneHubs, sceneChoices = nil, nil
  entryStatus = "entry_not_selected"
  sceneEntryStatus = nil
  pcall(function() local system = collector(); if system then system:Reset() end end)
end)
registerForEvent("onUpdate", function(delta)
  -- AI 요청 전달은 디버그 창과 무관하게 매 프레임 처리한다.
  bridge.update(delta)
  devtools.update(delta)
  if not overlay then return end
  elapsed = elapsed + delta
  if elapsed >= 0.25 then elapsed = 0; refresh(false) end
end)

-- 접는 구역. ImGui에 CollapsingHeader가 없는 환경(테스트)에서는 항상 펼친다.
local function section(label)
  if ImGui.CollapsingHeader then return ImGui.CollapsingHeader(label) end
  return true
end

registerForEvent("onDraw", function()
  local actions = bridge.actionText()
  if actions then
    ImGui.SetNextWindowPos(32, 320, ImGuiCond.Always)
    ImGui.SetNextWindowSize(420, 0, ImGuiCond.Always)
    ImGui.SetNextWindowBgAlpha(0.75)
    local flags = ImGuiWindowFlags.NoTitleBar + ImGuiWindowFlags.NoResize + ImGuiWindowFlags.NoMove
      + ImGuiWindowFlags.NoInputs + ImGuiWindowFlags.NoSavedSettings + ImGuiWindowFlags.AlwaysAutoResize
    if ImGui.Begin("ANPC 행동##anpc_actions", flags) then
      ImGui.Text("행동")
      ImGui.TextWrapped("• " .. actions)
    end
    ImGui.End()
  end
  devtools.draw()
  if not overlay then return end
  local expanded = ImGui.Begin("ANPC 디버그")
  if expanded then
    -- 요약: 한 줄에 한 구성 요소. 문제 원인은 '최근 음성/얼굴'에서 먼저 본다.
    ImGui.Text(("버전: ANPC %s · CET %s · redscript %s"):format(version, cetVersion, redscriptVersion))
    ImGui.TextWrapped("대화: " .. labels.text(entryStatus))
    local native = bridge.nativeVersion()
    ImGui.TextWrapped(("AI: %s · 모델 %s · API 키 %s · 응답 대기 %d"):format(native and ("Native " .. native) or "Native 없음(파일 연결)",
      config.model, native and (bridge.hasKey() and "있음" or "없음") or "-", bridge.pendingCount()))
    local ttsOK, ttsStatus = pcall(function() return Game.ANPCNative_TtsStatus() end)
    ImGui.TextWrapped(("TTS: %s · 응답 %s · 재생 대기 %d"):format(ttsOK and labels.text(ttsStatus) or "Native 미지원",
      bridge.helperAlive() and "있음" or "없음", bridge.voicePendingCount()))
    if ttsOK and ImGui.Button("TTS 재시작") then pcall(function() Game.ANPCNative_TtsRestart() end) end
    local recent = bridge.recent()
    ImGui.TextWrapped("최근 음성: " .. recent.voice)
    ImGui.TextWrapped("최근 얼굴: " .. recent.face)

    if section("바라보는 NPC") then
      if ImGui.Button("다시 검사") then refresh(true) end
      ImGui.TextWrapped("상태: " .. labels.text(status))
      if state and state.entityID ~= "" then
        ImGui.TextWrapped(("레코드 %s · 엔티티 %s · 거리 %.2fm · 로드 %s"):format(state.recordID, state.entityID,
          state.distance, tostring(state.epoch)))
        ImGui.TextWrapped(("사망 %s · V 전투 %s · NPC 전투 %s · 장면 중 %s · V 장면 단계 %s"):format(labels.yes(state.dead),
          labels.yes(state.playerCombat), state.npcStateKnown and labels.yes(state.npcCombat) or "모름",
          state.sceneKnown and labels.yes(state.inScene) or "모름", tostring(state.highLevel)))
        local voice = state.voice
        if voice then
          ImGui.TextWrapped(("목소리: %s (%s) · 인물 데이터 %s · 성별 %s"):format(voice.tag ~= "" and voice.tag or "모름",
            labels.text(voice.source), voice.recordTag ~= "" and voice.recordTag or "없음", voice.gender ~= "" and voice.gender or "모름"))
          if voice.detail ~= "" then ImGui.TextWrapped(voice.detail) end
        end
      end
    end
    if section("원작 선택지 연결") then
      if sceneHubs then
        ImGui.TextWrapped(string.format("원작 선택지 화면 %d개 · 선택지 %d개", sceneHubs, sceneChoices))
        ImGui.TextWrapped(labels.text(sceneEntryStatus or "ANPC 선택지 기록 없음"))
      else
        ImGui.TextWrapped("원작 선택지: 읽지 못함")
      end
    end
    if native and section("API 키") then
      -- 키는 입력 즉시 자격 증명 관리자에 저장하고 Lua 변수에서 지운다. 저장된 키는 다시 읽지 않는다.
      if keyNotice ~= "" then ImGui.TextWrapped(keyNotice) end
      keyInput = ImGui.InputText("##anpc_api_key", keyInput, 256, ImGuiInputTextFlags.Password)
      if ImGui.Button("키 저장") then
        keyNotice = (keyInput ~= "" and bridge.saveKey(keyInput)) and "저장했습니다" or "저장 실패"
        keyInput = ""
      end
      ImGui.SameLine()
      if ImGui.Button("키 삭제") then keyNotice = bridge.deleteKey() and "삭제했습니다" or "삭제 실패" end
    end
    if config.dev_tools and section("테스트: 표정·제스처·입모양") then devtools.buttons() end
  end
  ImGui.End()
end)
