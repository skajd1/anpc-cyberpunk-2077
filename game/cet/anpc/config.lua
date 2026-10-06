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
  recent_turns = 6
}
