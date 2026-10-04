local diagnostics = require("diagnostics")
local bridge = require("bridge")
local version = "0.1.0-g0-g1"
local overlay, elapsed = false, 0
local state, pinnedEpoch, mockText
local sceneHubs, sceneChoices
local entryStatus = "entry_not_selected"
local sceneEntryStatus
local status = "초기화 대기"
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
    state, pinnedEpoch, mockText = nil, nil, nil
    sceneHubs, sceneChoices = nil, nil
    entryStatus = "entry_collector_unavailable"
    sceneEntryStatus = nil
    status = "수집 실패: redscript/CET 로그를 확인하세요."
    return
  end
  state = result
  status = state and state.reason or "게임 세션/ANPC 수집기 없음"
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
  if pin then pinnedEpoch = state and state.epoch or nil end
  if not state then pinnedEpoch, mockText = nil, nil end
  if mockText then mockText = diagnostics.mock(state, pinnedEpoch) end
end

registerForEvent("onInit", function()
  cetVersion = tostring(GetVersion())
  local ok, redVersion = pcall(function() return GetSingleton("ANPC.Diagnostics"):Version() end)
  if ok then redscriptVersion = tostring(redVersion) end
  status = ok and ("redscript " .. tostring(redVersion)) or "redscript 로더 미확인"
  print("[ANPC] Lua " .. version .. "; CET " .. cetVersion .. "; " .. status)
  if not ok then print("[ANPC] redscript 버전 조회 실패: " .. tostring(redVersion)) end
end)

registerForEvent("onOverlayOpen", function() overlay = true; refresh(false) end)
registerForEvent("onOverlayClose", function()
  overlay = false
  state, pinnedEpoch, mockText = nil, nil, nil
  sceneHubs, sceneChoices = nil, nil
  entryStatus = "entry_not_selected"
  sceneEntryStatus = nil
  pcall(function() local system = collector(); if system then system:Reset() end end)
end)
registerForEvent("onShutdown", function()
  overlay = false
  bridge.reset()
  state, pinnedEpoch, mockText = nil, nil, nil
  sceneHubs, sceneChoices = nil, nil
  entryStatus = "entry_not_selected"
  sceneEntryStatus = nil
  pcall(function() local system = collector(); if system then system:Reset() end end)
end)
registerForEvent("onUpdate", function(delta)
  -- AI 요청 전달은 진단 창과 무관하게 매 프레임 처리한다.
  bridge.update(delta)
  if not overlay then return end
  elapsed = elapsed + delta
  if elapsed >= 0.25 then elapsed = 0; refresh(false) end
end)

registerForEvent("onDraw", function()
  if not overlay then return end
  local expanded = ImGui.Begin("ANPC G0/G1 진단")
  if expanded then
    ImGui.Text("ANPC " .. version .. " | CET " .. cetVersion)
    ImGui.Text("redscript " .. redscriptVersion)
    ImGui.TextWrapped("읽기 전용 개발 진단. 모의 대사는 이 창에만 표시합니다.")
    ImGui.TextWrapped("상태: " .. status)
    ImGui.TextWrapped("G2 선택 결과: " .. entryStatus)
    ImGui.TextWrapped("AI 브리지 대기 요청: " .. bridge.pendingCount())
    if sceneHubs then
      ImGui.TextWrapped(string.format("원작 장면 허브 %d개 | 선택지 %d개", sceneHubs, sceneChoices))
      if sceneHubs > 0 then
        ImGui.TextWrapped("G2 장면 진입: 대화 위젯 표시 전용 허브, 마지막 항목에서 ↓ 후 F (보조 R)")
      end
      ImGui.TextWrapped("G2 장면 진입 진단: " .. (sceneEntryStatus or "미확인"))
    else
      ImGui.TextWrapped("원작 장면 선택지 수집: 미확인")
    end
    if ImGui.Button("시선 대상 고정/다시 검사") then mockText = nil; refresh(true) end
    if state and state.entityID ~= "" then
      ImGui.TextWrapped("엔티티: " .. state.entityID .. " | 레코드: " .. state.recordID)
      ImGui.Text(string.format("거리 %.2f m | 동일 객체 %s | 세대 %s", state.distance,
        tostring(state.sameObject), tostring(state.epoch)))
      ImGui.Text("사망: " .. tostring(state.dead) .. " | V 전투: " .. tostring(state.playerCombat)
        .. " | NPC 전투: " .. (state.npcStateKnown and tostring(state.npcCombat) or "unknown"))
      ImGui.Text("장면: " .. (state.sceneKnown and tostring(state.inScene) or "unknown")
        .. " | HighLevel: " .. tostring(state.highLevel))
      if ImGui.Button("G1 모의 대사 재검사") then
        refresh(false)
        mockText, status = diagnostics.mock(state, pinnedEpoch)
      end
    end
    if mockText then ImGui.TextWrapped(mockText) end
    ImGui.TextWrapped("인물/진행 매핑·원작 선택지 handoff·저장 기억: 미구현/미검증")
  end
  ImGui.End()
end)
