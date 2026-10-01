# ANPC

ANPC(Autonomous Non-Player Character)는 텍스트 대화와 상황에 따른 NPC 행동을 목표로 하는 사이버펑크 2077 모드다. 길거리 군중 NPC에게는 생성된 특성을 부여하고, 기존 커뮤니티 NPC는 원작의 인물 특성을 유지한다.

현재 저장소에는 설계 문서와 게임 없이 실행하는 대화 시제품이 있다. 플레이 가능한 게임 모드는 아직 구현하거나 게임에서 검증하지 않았다. 프로젝트 문서는 한국어로 작성한다.

## 대화 시제품 실행

Node.js 22 이상에서 `npm start`를 실행하고 브라우저로 http://127.0.0.1:4173 을 연다. 기본 모의 응답은 API 키 없이 동작한다. 개인 키로 OpenAI API를 사용하거나 설치된 Codex CLI의 계정 로그인으로 대화할 수 있다. 추가 패키지 설치는 필요 없다.

- [시제품 사용 및 구현 안내](docs/dialogue-prototype.md)
- 자동 검사: `npm test`

## 명세 문서

- [전체 제품 명세](docs/full-specification.md)
- [초기 버전 명세](docs/initial-design.md)
- [기술 구조 및 AI 통신 규격](docs/runtime-specification.md)
- [NPC 식별 및 대화 허용 규격](docs/npc-identity-specification.md)
- [NPC 단기·장기 기억 및 비동기 정리 규격](docs/memory-specification.md)
- [게임 정보 수집 및 NPC 인지 규격](docs/game-context-specification.md)
- [콘텐츠 데이터 규격](docs/content-specification.md)
- [NPC 대사·행동 생성 프롬프트 명세](docs/prompt-specification.md)
- [NPC 행동 범위 명세](docs/npc-action-scope.md)

## 참고 분석과 개발 계획

- [벤치마크 및 구현 가능성 분석](docs/benchmark-analysis.md)
- [개발 및 검증 계획](docs/development-validation.md)
