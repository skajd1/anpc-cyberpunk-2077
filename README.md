# ANPC

ANPC(Autonomous Non-Player Character)는 V가 NPC에게 먼저 말을 걸어 실제 복장·진행도·공개 평판·이전 만남에 맞는 대사 자막과 일본어 음성을 받는 사이버펑크 2077 모드 프로젝트다. 길거리 군중은 생성 정체성을 유지하고 커뮤니티 인물은 오리지널 성격·퀘스트·관계를 보존한다. 향후 대화에 맞는 행동을 기존 게임 모션·모드 연동으로 실행한다.

현재 저장소에는 설계 문서·웹 시제품·게임 진입/입력/자막·Native 통신·행동 선택 패널·군중 생성 정체성·게임 관찰/스캔 신원 수집 소스가 있다. 실제 게임에서 기존 모델의 AI 자막을 확인했고 최신 구성은 CLI/자동/모의 상태의 실제 API 검사까지 진행했다. 최신판 실게임 회귀·진행/저장 연결·제품 설치/복원·출시 승인은 미완료다. 현재 구현·검증·공백은 [명세 대조 리뷰](docs/game-mod-spec-review-2026-10-05.md), 실제 적용된 파일 변경은 [배포 변경 이력](docs/game-mod-validation.md)을 기준으로 구분한다. 프로젝트 문서는 한국어로 작성한다.

현재 시제품·첫 게임판·후속 음성/행동의 범위는 [초기 명세](docs/initial-design.md), 전체 요구사항과 기준 문서는 [전체 명세](docs/full-specification.md)에 있다. 전체 문서 검토와 인터뷰 요구사항 추적은 [개발·검증 기록](docs/development-validation.md#6-인터뷰-반영과-전체-문서-검토)을 참조한다.

## 대화 시제품 실행

Node.js 22 이상에서 `npm start`를 실행하고 브라우저로 http://127.0.0.1:4173 을 연다. 기본 모의 응답은 API 키 없이 동작한다. 개인 키로 OpenAI API를 사용하거나 설치된 Codex CLI의 계정 로그인으로 대화할 수 있다. 추가 패키지 설치는 필요 없다.

비교 화면 /compare에서 인물을 고르고 조사 초안 사용을 켠 뒤 “더 깊은 대화를 해볼까?”로 진입한다. 복장 목격·현재 오리지널 조건·제스처 선택·모의 저장/로드를 시험할 수 있다. 사용법과 미구현 경계는 아래 안내를 따른다.

- [시제품 사용 및 구현 안내](docs/dialogue-prototype.md)
- 자동 검사: `npm test`

## 명세 문서

- [전체 제품 명세](docs/full-specification.md)
- [플레이어 행동별 게임 기능 명세](docs/gameplay-functional-specification.md)
- [모드 패키지·설치·백업·복원 규격](docs/mod-distribution-specification.md)
- [현재 코드와 명세 대조 리뷰](docs/game-mod-spec-review-2026-10-05.md)
- [모드 공통 데이터 및 모듈 입출력 규격](docs/module-interface-specification.md)
- [초기 버전 명세](docs/initial-design.md)
- [기술 구조 및 AI 통신 규격](docs/runtime-specification.md)
- [NPC 음성 출력 규격](docs/npc-voice-output-specification.md) — 첫 게임판 일본어 음성, 아직 미구현
- [NPC 음성 모델 파인튜닝 작업 절차](docs/voice-model-finetuning-guide.md) — 사내 GPU 서버 학습 절차와 학습 기록
- [플레이어 음성 인식 구현 규격](docs/speech-recognition-specification.md) — 선택 후속 모듈 설계, 아직 미구현
- [NPC 식별 및 대화 허용 규격](docs/npc-identity-specification.md)
- [NPC 단기·장기 기억 및 비동기 정리 규격](docs/memory-specification.md)
- [메인 퀘스트 진행에 따른 NPC 대화 분석](docs/story-progression-analysis.md): 주요 사건·인물별 지원 창·게임 매핑 후보·후속 검증.
- [게임 정보 수집 및 NPC 인지 규격](docs/game-context-specification.md)
- [콘텐츠 데이터 규격](docs/content-specification.md)
- [NPC Big Five 핵심 성격 규격](docs/personality-specification.md)
- [NPC 세계관 지식 부여 규격](docs/npc-knowledge-specification.md)
- [API 비용 및 응답 효율 규격](docs/api-cost-specification.md)
- [NPC 대화 정체성 평가 규격](docs/dialogue-evaluation-specification.md)
- [NPC 대사·행동 생성 프롬프트 명세](docs/prompt-specification.md)
- [NPC 행동 범위 명세](docs/npc-action-scope.md)

공통 데이터 형태와 모듈 포트는 [contracts/v1](contracts/v1/registry.json)을 기준으로 참조한다. 계약 설계 자료는 `npm run check:contracts`로 검사한다. 현재 웹 전체의 공통 인터페이스 전환은 아직 진행하지 않았다.

## 개발 게임 패키지

PowerShell 7과 Node.js 22 이상에서 `scripts/build-game-package.ps1 -NativeDll <빌드한 DLL 경로> -OutputZip <새 ZIP 경로>`로 개발 ZIP을 생성한다. 최신 생성 프롬프트·게임 루트 상대 파일 목록·해시·개인 파일/코어 도구 제외를 검사한다. 동일 소스/DLL의 ZIP은 같은 해시로 재현된다. `-Channel public`은 현재 출시 미승인 상태에서 거부한다.

제품 설치/업데이트/자동 복원/제거·라이선스/콘텐츠·지원 흐름 수용은 아직 미완료다. 개발 ZIP 생성이나 수동 압축 해제를 공개 배포 완료로 보지 않는다. 세부 조건은 [배포 규격](docs/mod-distribution-specification.md)을 따른다.

## 개발 계획과 미검증 연동 근거

- [게임 모드 구현 계획](docs/game-mod-implementation-plan.md) — 도구 설치·실제 게임 연결·첫 구현 단계
- [배포 변경 이력](docs/game-mod-validation.md) — 배포별 일시·변경 파일·변경 이유/영향·백업과 복원 기록
- [모딩 도구와 게임 연결 조사](docs/mod-tooling-research.md) — 공식 문서·릴리스·공개 코드 근거
- [개발 및 검증 계획](docs/development-validation.md)

인물·세계관·군중의 기준 데이터와 검수 상태는 [콘텐츠 안내](content/README.md)에서 조회한다. 스펙/JSON에 반영된 중복 조사와 구버전 리뷰/재개 메모는 유지하지 않는다. 진행 매핑·모딩 API·실제 애니메이션의 미검증 근거는 후속 구현을 위해 남긴다.
