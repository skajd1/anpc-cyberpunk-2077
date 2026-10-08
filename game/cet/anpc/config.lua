-- ANPC AI 연결 설정. 키는 여기에 넣지 않는다(CET 창에서 Windows 자격 증명 관리자에 저장).
return {
  -- auto: ANPC.Native가 있으면 사용하고, 없으면 개발 파일 브리지(prototype/game-bridge.js)를 쓴다.
  transport = "auto",
  provider = "openai",
  model = "gpt-6-luna",
  -- 현재 게임판은 조사 초안을 쓰는 개발 시험판이다. false에서는 승인 자료만 허용한다.
  allow_draft_content = true,
  -- 제공자 요청 전체 제한 시간. redscript는 40초 뒤 실패로 처리한다.
  timeout_ms = 30000,
  -- 한 세션에서 다음 요청에 넣을 최근 발화 수.
  recent_turns = 6,
  -- NPC 일본어 음성(개발 시험). 켜면 음성 출력 스키마를 요청하고 tts/req-<id>.json을 써서 로컬 TTS 보조 프로세스에 넘긴다.
  voice_enabled = true,
  -- 개발 시험용 NPC 키 → voice_profile_id. 없는 인물은 자막만.
  voice_profiles = { judy = "vp_judy", viktor = "vp_viktor", rogue = "vp_rogue" },
  -- 군중은 NPC의 원작 목소리 이름으로 보조 프로세스가 참조 음성을 고른다(crowd_voices.json, 로컬 생성).
  voice_crowd_profile = "crowd",
  -- 응답 수용 후 첫 음성 구간 대기 한도. 시작 판단은 보조 프로세스가 subtitle_wait_ms(3초)로 하고,
  -- 게임 쪽은 구간 파일 전달 여유 1초를 더 기다린다(같은 3초면 첫 구간 직전에 포기하는 경쟁이 생긴다). 넘으면 자막만.
  voice_wait_s = 4.0,
  -- 자막 표시 시간 계산용 일본어 1자당 음성 길이(초).
  voice_sec_per_char = 0.16,
  -- 3D 음성 재생 음량(Audioware 1.0 기준). 원작 NPC 음성과 비교해 맞춘다.
  voice_volume = 1.0,
  -- UF-74: 응답 감정에 맞춘 NPC 얼굴 표정. 대화가 끝나면 되돌린다.
  expression_enabled = true,
  -- UF-75: 음성 재생 동안 말하기 입모양. 로컬 자원 아카이브(ANPC_talk.local.archive)가 있어야 동작한다.
  lipsync_enabled = true,
  -- 개발 확인 단축키(CET 설정의 단축키에서 지정): 바라보는 NPC 고정, 감정 표정·제스처 차례로 시험.
  dev_tools = true
}
