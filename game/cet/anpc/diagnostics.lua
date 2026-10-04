local diagnostics = {}

-- 공통 계약의 대화 허용 판정이 아닌 G1 모의 표시의 보수적 차단기다.
function diagnostics.mock(state, epoch)
  if not state then return nil, "collector_unavailable" end
  if state.epoch ~= epoch then return nil, "world_changed" end
  if state.sameObject ~= true then return nil, "target_changed" end
  if state.sceneKnown ~= true then return nil, "scene_unknown" end
  if state.dead ~= false or state.playerCombat ~= false or state.npcCombat ~= false then
    return nil, "unsafe_state"
  end
  if state.inScene ~= false then return nil, "original_scene" end
  if type(state.distance) ~= "number" or state.distance ~= state.distance
      or state.distance < 0 or state.distance > 4.5 then
    return nil, "too_far"
  end
  if state.diagnosticAllowed ~= true or state.reason ~= "diagnostic_only" then
    return nil, state.reason or "unknown"
  end
  return "[G1 모의 대사] 대상과 상태를 다시 확인했습니다. API 호출과 NPC 제어는 없습니다.", "diagnostic_only"
end

return diagnostics
