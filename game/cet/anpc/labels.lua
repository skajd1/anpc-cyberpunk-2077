-- 디버그 창 표시용 한국어 이름. redscript·Native가 돌려주는 상태 코드를 그대로 두고 보여 줄 때만 바꾼다.
-- 게임 동작에는 쓰지 않는다. 표에 없는 코드는 원문 그대로 보인다.
local labels = {}

local NAMES = {
  -- 대화 선택·세션 상태(Entry)
  entry_not_selected = "선택 전",
  entry_not_installed = "대화 시스템 없음",
  entry_collector_unavailable = "상태 읽기 실패",
  entry_invalid = "잘못된 선택",
  entry_state_blocked = "상태 조건으로 막힘",
  entry_confirmed_ai_not_connected = "선택됨 · AI 연결 없음",
  entry_selected_waiting_original_handoff = "선택됨 · 원작 대화 끝 대기",
  session_active = "대화 중",
  session_ui_unavailable = "대화창 열기 실패",
  session_context_limit = "대화 길이 한도로 종료",
  session_npc_farewell = "NPC 작별로 종료",
  session_closed = "대화창 닫음",
  session_left = "멀어져서 종료(6m)",
  session_scene_ended = "원작 장면이 끝나 종료",
  session_state_blocked = "사망·전투로 종료",
  session_target_lost = "대상이 사라져 종료",
  -- 바라보는 NPC 검사(Diagnostics)와 안전 조건(Entry)
  no_player = "플레이어 없음",
  no_npc = "바라보는 NPC 없음",
  npc_state_unknown = "NPC 상태 모름",
  scene_unknown = "장면 상태 모름",
  dead = "사망",
  combat = "전투 중",
  original_scene = "원작 장면 중",
  player_state_restricted = "V 상태 제한",
  too_far = "너무 멂",
  diagnostic_only = "대화 가능",
  missing = "대상 없음",
  player_combat = "V 전투 중",
  npc_combat = "NPC 전투 중",
  menu = "메뉴 열림",
  mounted = "탑승 중",
  system_missing = "게임 시스템 없음",
  npc_in_scene = "NPC 장면 중",
  npc_in_dialogue = "NPC 대화 중",
  player_in_scene = "V 장면 중",
  player_in_dialogue = "V 대화 중",
  player_workspot = "V 고정 동작 중",
  npc_workspot = "NPC 고정 동작 중",
  not_look_at = "바라보지 않음",
  -- 원작 대화 선택지에 ANPC 선택지 붙이기(SceneEntry)
  no_native_hub = "원작 선택지 없음",
  no_supported_speaker = "지원 인물 아님",
  state_blocked = "상태 조건으로 막힘",
  not_root_hub = "첫 선택지 화면 아님",
  consumed = "이미 사용함",
  native_index_moved = "원작 선택지로 이동",
  native_hub_moved = "선택지 화면 바뀜",
  -- AI 응답
  ok = "정상",
  ["ok:end"] = "정상(대화 끝)",
  context_changed = "대상 바뀜",
  invalid_response = "응답 형식 오류",
  context_unavailable = "상황 정보 없음",
  community_profile_missing = "인물 정보 없음",
  story_blocked = "스토리 조건으로 막힘",
  request_rejected = "요청 거부",
  bridge_unavailable = "AI 연결 없음",
  -- TTS 보조 프로세스(ANPC.Native)
  not_configured = "실행 설정 없음",
  external = "따로 실행 중",
  running = "실행 중",
  not_started = "시작 안 함",
  config_invalid = "설정 파일 형식 오류",
  command_missing = "실행 명령 없음",
  -- 원작 목소리 이름을 읽은 곳(NpcVoice)
  ps = "목소리 상태값",
  record = "인물 데이터",
  none = "못 읽음",
  ["true"] = "예",
  ["false"] = "아니오",
}

local function word(token)
  if NAMES[token] then return NAMES[token] end
  local head, rest = token:match("^(%a+):(.+)$")
  if head == "error" then return "오류(" .. (NAMES[rest] or rest) .. ")" end
  if head == "exited" then return "종료됨(코드 " .. rest .. ")" end
  if head == "failed" then
    local code = rest:match("^create_process_(%d+)$")
    return "실행 실패(" .. (code and ("프로세스 생성 " .. code) or NAMES[rest] or rest) .. ")"
  end
  return nil
end

-- 코드 하나 또는 코드가 섞인 문장의 코드 부분만 바꾼다.
function labels.text(value)
  if value == nil then return "모름" end
  return (tostring(value):gsub("[%a_][%w_:]*", word))
end

function labels.yes(value)
  if value == nil then return "모름" end
  return value and "예" or "아니오"
end

return labels
