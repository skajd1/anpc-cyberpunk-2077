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
  voice_crowd_profile = "crowd_m2",
  -- 응답 수용 후 첫 음성 구간 대기 한도(음성 출력 규격 subtitle_wait_ms). 넘으면 자막만.
  voice_wait_s = 3.0,
  -- 자막 표시 시간 계산용 일본어 1자당 음성 길이(초).
  voice_sec_per_char = 0.16
}
