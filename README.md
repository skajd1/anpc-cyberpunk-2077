# ANPC

ANPC(Autonomous Non-Player Character)는 V가 NPC에게 먼저 말을 걸어 실제 복장·진행도·공개 평판·이전 만남에 맞는 대사 자막을 받는 사이버펑크 2077 모드 프로젝트다. 길거리 군중은 생성 정체성을 유지하고 커뮤니티 인물은 원작 성격·퀘스트·관계를 보존한다. 향후 대화에 맞는 행동을 기존 게임 모션·모드 연동으로 실행한다.

현재 저장소에는 설계 문서와 게임 없이 실행하는 대화 시제품이 있다. 플레이 가능한 게임 모드는 아직 구현하거나 게임에서 검증하지 않았다. 프로젝트 문서는 한국어로 작성한다.

현재 시제품·첫 게임판·후속 음성/행동의 범위는 [초기 명세](docs/initial-design.md), 전체 요구사항과 기준 문서는 [전체 명세](docs/full-specification.md)에 있다. 전체 문서 검토와 인터뷰 요구사항 추적은 [개발·검증 기록](docs/development-validation.md#6-인터뷰-반영과-전체-문서-검토)을 참조한다.

## 대화 시제품 실행

Node.js 22 이상에서 `npm start`를 실행하고 브라우저로 http://127.0.0.1:4173 을 연다. 기본 모의 응답은 API 키 없이 동작한다. 개인 키로 OpenAI API를 사용하거나 설치된 Codex CLI의 계정 로그인으로 대화할 수 있다. 추가 패키지 설치는 필요 없다.

비교 화면 /compare에서 인물을 고르고 조사 초안 사용을 켠 뒤 “더 깊은 대화를 해볼까?”로 진입한다. 복장 목격·현재 원작 조건·제스처 선택·모의 저장/로드를 시험할 수 있다. 사용법과 미구현 경계는 아래 안내를 따른다.

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
- [NPC Big Five 핵심 성격 규격](docs/personality-specification.md)
- [NPC 세계관 지식 부여 규격](docs/npc-knowledge-specification.md)
- [API 비용 및 응답 효율 규격](docs/api-cost-specification.md)
- [NPC 대화 정체성 평가 규격](docs/dialogue-evaluation-specification.md)
- [NPC 대사·행동 생성 프롬프트 명세](docs/prompt-specification.md)
- [NPC 행동 범위 명세](docs/npc-action-scope.md)

## 참고 분석과 개발 계획

- [벤치마크 및 구현 가능성 분석](docs/benchmark-analysis.md)
- [개발 및 검증 계획](docs/development-validation.md)
