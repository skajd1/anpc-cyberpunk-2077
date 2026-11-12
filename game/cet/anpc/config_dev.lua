-- 개발 시험판 전용 덮어쓰기. 공개 패키지에 포함하지 않는다(scripts/build-game-package.ps1).
-- 현재 게임판은 조사 초안을 쓰는 개발 시험판이다. 이 파일이 없으면 공개 채널로 동작하며 초안·불명 콘텐츠를 차단한다.
return { channel = "development", allow_draft_content = true }
