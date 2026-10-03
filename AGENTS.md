# ANPC 프로젝트

ANPC는 V가 먼저 시작하는 텍스트 대화·NPC 대사 자막과 상황별 행동을 목표로 하는 사이버펑크 2077 모드 프로젝트다. 현재 시제품과 첫 게임판·후속 확장을 구분한다.

## 주요 디렉터리

- `docs/`: 설계, 제품 요구사항, 구현 가능성 분석 문서.
- `prototype/`: 게임 없이 실행하는 Node.js 대화 시제품, 화면·인물 카드·자동 검사.
- `content/`: 원작 출처·세계관 사실·대표 인물 카드·지식·예시의 조사 묶음. 승인 상태와 실행 활성 상태를 확인한다.
- `scripts/`: 콘텐츠 자료의 참조·조건·배분 검사 도구.
- 이전 Codex 프로젝트의 `sources/` 참고 자료는 이 작업 폴더로 복사하지 않았다. 원본은 읽기 전용으로 보존한다.

## 공통 제약

- 모든 프로젝트 문서는 한국어로 작성한다. `README.md`, `AGENTS.md`, `docs/`의 신규·수정 문서에 적용한다. 코드 식별자, API 이름, 제품명과 경로는 원래 표기를 유지할 수 있다. 읽기 전용 `sources/`의 원문은 보존한다.
- 커뮤니티 NPC의 기존 성격·원작 퀘스트·관계를 보존한다. 대화 기억으로 누적 친밀도·기본 태도를 변경하지 않는다.
- 군중 NPC의 생성된 특성은 대화와 유효한 근거리 재접촉 동안 유지한다.
- 게임 상태를 사실의 기준으로 삼고 AI 행동은 검증된 모딩 기능으로 제한한다.
- 첫 게임판의 플레이어 입력은 텍스트다. NPC 출력은 초기 대사 자막, 음성은 후속이다. 플레이어 음성 인식은 선택 후속 확장으로 별도 규격을 따르며 첫 게임판 필수 범위가 아니다.
- 기본 대화 제어와 추가 행동 선택/실행을 구분한다. 후속 모션은 기존 게임·모드 연동을 우선하며 게임 진행·원작 제어를 보존한다.
- AI 연결은 플레이어 개인 API 키 사용을 우선한다. 제작자가 운영하는 중계·추론 서버는 두지 않는다.
- 규격 문서는 타입 참조·범위·조건·한도·결과 중심으로 간결하게 작성한다. 중복 설명·설명용 예시·개정 경과는 넣지 않는다. 실행용 프롬프트·변환표·행동 목록은 원문을 보존한다. 구현 근거는 참고 분석, 시험·진행 상태는 개발·검증 계획에 둔다. 동일 계약은 한 기준 문서에서만 정의한다.
- 공통 데이터·모듈 입출력은 `docs/module-interface-specification.md`와 `contracts/v1/`을 기준으로 참조한다. 분야별 명세는 이 형식을 재정의하지 않고 정책을 정의한다. 계약 변경 시 스키마·포트·예시를 함께 갱신하고 `npm run check:contracts`를 실행한다. 현재 웹 형식과 목표 공통 형식의 전환 상태를 명시한다.

## 문서 안내

- [초기 버전 명세](docs/initial-design.md): 현재 시제품·첫 게임판·후속 행동/음성의 포함 기능과 제외 범위.
- [전체 제품 명세](docs/full-specification.md): 제품 요구사항과 분야별 기준 문서 안내.
- [모드 공통 데이터 및 모듈 입출력 규격](docs/module-interface-specification.md): 저장·교환·전송 뷰의 고정 타입, 모듈 포트, 범위·버전·교체/전환 계약.
- [기술 구조 및 AI 통신 규격](docs/runtime-specification.md): 실행 모듈, 진입 상태, 키·요청·응답·오류, 대사 자막과 게임 진행 계약.
- [게임 모드 구현 계획](docs/game-mod-implementation-plan.md): 실제 모딩 도구·Lua/redscript/네이티브 배치·선택지·저장·첫 게임 실증 순서.
- [모딩 도구와 게임 연결 조사](docs/mod-tooling-research.md): 제작자 문서/릴리스·후보 버전·HTTP/저장 제약과 확인한 공개 소스.
- [플레이어 음성 인식 구현 규격](docs/speech-recognition-specification.md): 선택 후속 PTT 모듈·실시간 전사·기존 텍스트 입력 연결·취소·설정·검증 기준.
- [NPC 식별 및 대화 허용 규격](docs/npc-identity-specification.md): NPC 키, 고유/군중 추가 선택지·원작 제어 전환, 대화 조건·재접촉 기억.
- [NPC 단기·장기 기억 및 비동기 정리 규격](docs/memory-specification.md): 세션당 한 줄 요약·인물별 보관·저장 시점 복원.
- [메인 퀘스트 진행에 따른 NPC 대화 분석](docs/story-progression-analysis.md): 주요 사건·인물별 지원 창·게임 매핑 후보·후속 검증.
- [게임 정보 수집 및 NPC 인지 규격](docs/game-context-specification.md): 표시 복장 텍스트·관찰, 원작 진행도 맥락·공개 평판 인지, 상태·출처와 갱신.
- [콘텐츠 데이터 규격](docs/content-specification.md): 인물·군중과 성격 전환, 고정 신원·분야 깊이, 원작 관계·공개 평판·사소한 일상 창작 정책.
- [NPC Big Five 핵심 성격 규격](docs/personality-specification.md): 다섯 축의 수준 기록·정량 해석, 25개 수준별 행동 지침, 로컬 변환·재사용과 기존 형식 전환 경계.
- [NPC 세계관 지식 부여 규격](docs/npc-knowledge-specification.md): 저장 위치, 공통·지역·직업·선택·개인·퀘스트 지식, 출신·경험별 분야 깊이, 군중 추첨과 인지 조건.
- [대표 인물 12명 및 세계관 조사](docs/community-npc-catalog.md): 인물별 정체성·지식 방향, 출처 접근 방식·충돌·미검수 항목과 군중 확장 순서.
- [송버드 스토리라인·정체성 조사](docs/songbird-storyline-identity.md): 팬텀 리버티 분기·결말·소미 호칭·인지 제한과 검수 상태.
- [콘텐츠 자료 안내](content/README.md): JSON 묶음, 승인 상태, 시제품 연결 상태와 기준 문서.
- [NPC 대사·행동 생성 프롬프트 명세](docs/prompt-specification.md): 고정 베이스, 인물·상황 주입, Big Five 변환 문구 배치·버전, 생성·예외 규칙과 예시.
- [API 비용 및 응답 효율 규격](docs/api-cost-specification.md): 토큰 예산·문맥 선별·캐시·중복 요청·재시도·개인 사용 한도와 비용 원장.
- [NPC 행동 범위 명세](docs/npc-action-scope.md): 행동 ID·인수, 선택 전용/실행 모드, 기존 게임·모드 어댑터, 중단·복구.
- [벤치마크 및 구현 가능성 분석](docs/benchmark-analysis.md): 공개 모드·도구의 구현 근거와 미확인 사항.
- [외부 모드 제스처·애니메이션 조사](docs/external-animation-research.md): AMM·CyberScript 재생/중단 근거, 실제 동작 후보와 촬영용 모드의 적용 한계.
- [캐릭터 정체성 벤치마킹 및 적용 분석](docs/character-identity-benchmark.md): Character.AI·Chub·SillyTavern의 공개 설계·코드, 역할 학습 연구, 주디·팬앰 자료 작성과 적용 한계.
- [NPC 대화 정체성 평가 규격](docs/dialogue-evaluation-specification.md): 원작·작성·군중 근거 구분, 중대 위반, 7개 품질 축·채점 앵커, 평가 데이터와 AI·사람 판정 계약.
- [개발 및 검증 계획](docs/development-validation.md): 구현 순서·모의/게임 시험·출시 판정, 인터뷰 요구사항 추적·전체 문서 검토와 검증 상태.
- [대화 시제품 사용 및 구현 안내](docs/dialogue-prototype.md): 로컬 실행, 원작 12명/군중 예시 선택·3열 화면·복장 목격/원작 조건/행동 선택·모의 저장/로드·프리셋/사용량·확장, API·Codex 연결과 게임판의 차이.
