# main 기준 콘텐츠·게임 연결 코드 리뷰

2026-10-05. 기준 main: `e7ebb8f`, 콘텐츠 준비 커밋: `662eea9`(main 위로 rebase). 콘텐츠 변경 전체와 관련된 CET 생성 프롬프트·Lua 브리지·redscript 세션·Native 응답 파서·개발 파일 브리지를 검토했다. 외부 SDK 전체·게임 ABI·원작 자료 전체의 정확성을 감사한 결과는 아니다. P1은 출시 전 해결할 항목, P2는 후속 구현·신뢰성 보완 항목이다.

## 발견한 결함과 처리

| ID | 심각도·상태 | 근거·발생 조건 | 영향과 처리 |
| --- | --- | --- | --- |
| R1 | P1 · 잔여 | [고정 프롬프트 생성기](../scripts/build-cet-prompts.mjs)의 settingsFor는 late_open 프리셋·첫 단계·allowDraft=true·모의 생존/자유/인지값을 사용한다. 실행 중에는 대화만 추가한다. | 실제 저장의 진행·관계·공개 여부와 다른 대사가 나올 수 있다. manifest의 runtime_enabled=false만으로 이 개발 경로의 전송을 막지는 못한다. G6의 실제 상태 수집·승인 선별이 필요하다. 이번 병합은 출시 승인이 아니다. |
| R2 | P1 · 수정, Native 실행 미검증 | [Native 응답 파서](../game/native/src/Provider.cpp)는 기존에 status/type을 value<string>으로 읽었다. `{"status":0}` 같은 유효 JSON에서 타입 예외가 발생하며 [WorkerLoop](../game/native/src/HttpWorker.cpp)는 예외를 잡지 않는다. | uncaught 스레드 예외로 게임 프로세스가 종료될 수 있는 코드 경로다. 문자열 변환 없이 JSON 값을 비교하도록 수정했다. 숫자·null·배열 타입과 정상 응답을 검사하는 CTest를 추가하고 Actions에 연결했다. 로컬 C++ 도구가 없어 이 수정의 빌드·CTest는 아직 실행하지 못했다. 실제 게임 충돌 재현을 의미하지 않는다. |
| R3 | P1 · 수정·모의 검사 통과 | [Lua readReply](../game/cet/anpc/bridge.lua)는 dialogue만 있으면 성공 처리했고, 생성기는 웹의 face_player/resume_walk/play_gesture 스키마도 내보냈다. | 잘못된 열거값·누락 필드·지원하지 않는 행동을 포함한 원문이 자막·최근 발화에 반영될 수 있었다. 필수/추가 필드·intent/emotion·코드포인트 길이·작별 후속 질문을 검사하고, 게임 행동 후보·스키마·수신 허용을 null/end_conversation으로 제한했다. 형식/행동이 틀리면 원문을 표시하지 않고 invalid_response로 실패한다. 대사의 원작 충실도까지 판정하는 의미 검사는 아니다. |
| R4 | P1 · 잔여 | [Entry](../game/redscript/ANPC/Entry.reds)의 Reset(L67)은 대기 요청 outbox를 비우거나 대기 세션을 명시적으로 종료하지 않는다. OnAIResponse(L493)는 현재 pendingRequest 번호만 비교하고 SessionEndReason을 적용 직전에 호출하지 않는다. 유지 검사에는 attach/메뉴/차량/군중의 새 원작 장면 진입 확인이 없다. | 로드·대상 이탈·장면 전환과 완료가 경합하면 이전 작업이나 잠깐의 잘못된 자막 적용이 가능하다. 세이브/세계/대상 세대에 요청을 묶고 응답 수용 직전에 재검사해야 한다. 0.3초 watcher가 일부 위험을 종료하지만 완료 경계 검사를 대체하지 못한다. G3/G4의 미완료 항목이며 이번에 게임에서 재현하지 않았다. |
| R5 | P2 · 일부 수정 | [bridge.reset](../game/cet/anpc/bridge.lua)는 기존에 nativePending을 버리기만 했다. receiveNative는 Entry가 응답을 수용했는지 확인하기 전에 remember를 수행한다. | 재로드 때 처리 중 Native 요청의 취소를 호출하도록 수정하고 늦은 결과 폐기를 모의 검사했다. 취소가 이미 전송된 요청의 과금 취소를 보장하지 않는다. 응답 수용 후에만 최근 발화를 확정하는 절차, 게임 세이브 전환과 CET 세션 상태의 동기화는 잔여다. |
| R6 | P2 · 잔여 | [HttpWorker](../game/native/src/HttpWorker.cpp)의 deadline(L120)은 실제 통신 시작 때 계산한다. 단일 worker·대기열 최대 8개이며 Entry는 접수 후 40초에 실패 처리한다. 이 timeout은 Native 취소 요청으로 연결되지 않는다. Cancel(L311)는 완료/미등록 번호도 gCancelled에 남긴다. | 대기 시간은 timeout_ms에 포함되지 않아 화면 실패 후 요청이 실행될 수 있다. 취소 tombstone이 계속 쌓일 수 있다. 접수 시점 deadline·만료 시 취소·완료 상태 정리가 필요하다. 스레드/종료 경합은 실증 검사도 필요하다. |
| R7 | P2 · 잔여, 개발 경로 | [파일 브리지](../prototype/game-bridge.js)의 end 요청도 같은 세션 promise chain 뒤에 들어간다(L109). sessions/seen은 세대 없는 정수/파일명을 키로 사용한다. | 실행 중 요청을 즉시 중단하지 못한다. Entry 재생성으로 요청 번호가 재사용되면 seen이 새 요청을 무시할 수 있다. 모의 장소도 게임 관찰값으로 대체되지 않았다. 이 경로를 유지한다면 end의 즉시 취소, 세대 포함 식별, 완료·seen 정리를 구현해야 한다. |
| R8 | P2 · 잔여, G6 | [군중 원형](../content/cyberpunk2077/crowd-archetypes.json) 9개는 runtime_enabled=false, knowledge_ids/example_ids가 비어 있다. 게임 브리지는 모든 군중을 resident 한 카드로 처리한다. | 역할별 지식·원형·인스턴스별 성향은 아직 게임에 연결되지 않는다. Native 고정 카드의 성향은 빌드 시 한 번 추첨되므로 군중들이 공유한다. 동일 seed의 오프라인 재현 통과를 실제 NPC 재접촉·저장 보존의 성공으로 볼 수 없다. |
| R9 | P2 · 수정·검사 통과 | 콘텐츠 카드 변경은 기존 [prompts.lua](../game/cet/anpc/prompts.lua)에 자동 반영되지 않는다. | 병합만 하면 웹/자료와 Native 고정 프롬프트의 성격·지침이 달라진다. 생성 파일을 갱신하고 최신 생성 결과와 고정 인물/스키마 부분을 비교하는 Node 회귀 검사를 추가했다. resident 부분은 빌드 시 추첨되므로 고정 비교에서 제외한다. |

리버 미지원은 누락 버그로 분류하지 않았다. [SceneEntry의 지원 표](../game/redscript/ANPC/SceneEntry.reds)는 기본 레코드 실측 전 리버를 제외한다고 명시한다. 자료에 12명이 있다는 사실은 게임 접촉 12명 지원을 뜻하지 않는다. speech_rules도 현재 정규화기가 읽는 실행 필드가 아니라 명시된 조사 메타데이터다.

## 설계와 구현 공백 구분

실제 진행/인지 수집, 세대 검사, 저장별 기억, 군중 유지, 승인된 자료만 출시하는 정책은 이미 [구현 계획 G3~G6](game-mod-implementation-plan.md)에 있다. 이를 “설계 없음”으로 표현하지 않는다. 현재 게임 코드가 아직 계약을 충족하지 못한다는 것이 R1/R4/R8의 문제다.

구현 전에 구체화할 연결 설계는 다음과 같다.

- 군중 원형의 required_evidence는 작성 문장이다. 어떤 관찰 필드/레코드가 직업·거주를 증명하는지, 여러 원형이 맞을 때의 선택 우선순위와 unknown 처리, 승인된 knowledge grant로의 변환표가 없다. 외형·현재 좌표만으로 역할이나 인지를 부여하지 않고, 공통 등록표에 확인된 매핑을 등록해야 한다.
- 공통 WorldFence·저장 계약을 현재 AnpcRequest/Native 정수 번호에 연결하는 어댑터가 없다. 요청 접수→취소→완료→게임 수용→기억 확정의 순서와 세이브 계보/세계/대상 세대 검사를 하나의 경계로 구현해야 한다. 새 필드/포트가 필요하면 등록표·스키마·예시를 함께 개정한다.
- 출시 콘텐츠 승인과 개발 draft 허용을 게임 설정에서 어떻게 구분할지 구체화해야 한다. 빌드가 allowDraft를 고정해서 쓰는 동안 runtime_enabled=false는 출시 차단 장치가 아니다. 인물별 인지·한국어 호칭·관계·비밀 검수의 승인 결과를 선별기가 읽도록 연결해야 한다.

## 검증 결과

| 검사 | 결과 | 범위 |
| --- | --- | --- |
| Node 회귀 | 99/99 통과 | 기존 98개 + 생성 프롬프트 동기화/게임 행동 권한 1개 |
| 공통 계약 | 통과 | 27개 계약·25개 포트·등록 필드 295개 |
| 스토리 정책 | 통과 | 의미 후보 82개·관계 단계 63개·프리셋 8개. verified_game_bindings=0 |
| 콘텐츠 | 통과 | 12명·사실 221개·지식 887개·예시 52개·원형 9개. 신규 예시 조건 24개·군중 seed 288개 검사 |
| Lua 브리지 | 통과 | Fengari Lua 5.3 모의 CET/DLL. 잘못된 필드/열거값/길이/행동·작별·재로드 취소·늦은 응답 폐기 |
| G1 Lua 회귀 | 통과 | 기존 diagnostics 모의 검사. 실제 게임 판정·CET LuaJIT 검사 아님 |
| 자료 보존·인코딩 | 통과 | 인물 12명의 core_personality·relationship_stages 원본과 동일. 변경 파일 38개 UTF-8/BOM/대체 문자 검사·문서 로컬 링크 150개·git diff --check |
| Native C++ | 미실행 | 타입 오류 회귀 CTest와 Actions 실행 단계는 추가. 로컬 빌드 도구 없음, 새 Actions 실행·DLL 배포 없음 |
| 실제 게임/유료 API | 미실행 | 이번 리뷰에서 게임 조작·설치 파일 변경·실제 모델 호출을 하지 않음 |

기존 main의 게임 확인은 [게임 검증 기록](game-mod-validation.md)에 있다. 그 결과를 이번 콘텐츠·Lua/Native 수정의 게임 검증으로 전용하지 않는다. 자료는 draft/runtime_enabled=false를 유지하며, 개발 생성 경로에는 일부 강화된 카드 문구가 반영된다. 출시 수용은 R1/R4/R8 해결 및 G3~G7 실증 후 별도로 판정한다.
