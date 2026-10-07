# 기술 구조 및 AI 통신 규격

규격 버전: 0.6 (2026-10-07). 목표 계약. 타입/포트: [공통 규격](module-interface-specification.md). 구현/시험: [개발·검증 계획](development-validation.md).

## 1. 실행 구조

| 계층 | 책임 |
| --- | --- |
| 게임 실행 | NPC 조회·세션·기본 제어·행동·자막 |
| 대화 | 콘텐츠·기억·프롬프트·응답 검사 |
| 통신 어댑터 | 비동기 HTTPS·개인 키 접근·제공자 변환 |

기본: 게임 내부 모드+로컬 설정/콘텐츠. UI/대화 정책=CET Lua, 실제 수집/제어/자막/저장 연결=redscript+Codeware. 제품 HTTPS/키 보관은 RED4ext 플러그인 ANPC.Native.dll의 WinHTTP/Credential Manager로 구현한다. 작업 완료 큐를 CET onUpdate에서 읽고 현재 세션 검사 후 게임에 적용한다. 별도 C#·제작자 서버 필수 없음. NPC 음성은 ANPC.Native가 관리하는 로컬 TTS 보조 프로세스로 [음성 출력 규격](npc-voice-output-specification.md)을 따른다. 로컬 대사 모델은 후속.

| 구성 | 소유 범위 | 수명 |
| --- | --- | --- |
| CET Lua | UI·입력·공통 계약 검사·콘텐츠/지식 선별·프롬프트·세션 요약 | 모드 로드 후. 세션/세계 세대로 작업 격리 |
| redscript | 실제 대상 참조·상태 수집·오리지널 선택지 전환·기본 제어·자막·저장 앵커 | 게임 세션별 ScriptableSystem·살아 있는 객체 |
| Codeware | 게임/엔티티/입력 이벤트·ink 접근 | 콜백 범위 지정. 게임 종료 때 참조 해제 |
| ANPC.Native | HTTPS 전송·키 참조 해석·취소·제한 시간·완료 보관·문자/해시·원장 I/O·TTS 보조 프로세스 관리 | 프로세스 수명 |

- 대화 정책은 Lua, 실제 게임값과 제어는 redscript가 소유한다. 같은 퀘스트/기억 규칙을 두 언어에서 따로 구현하지 않는다.
- 웹 시제품의 JSON 콘텐츠·베이스·스키마·예시는 재사용하되 JS 엔진·Node 서버를 게임에 넣지 않는다.
- Native 작업 스레드는 게임 객체·Lua 상태에 접근하지 않는다. 게임 타입을 임의 포인터/오프셋으로 다루지 않고 RED4ext.SDK의 export/RTTI 규약을 따른다.
- RedHttpClient는 초기 통신 실증용이며 제품의 취소·제한 시간·키 보관을 대신하지 않는다. 게임 구성에 실증용과 제품용 통신을 동시에 연결하지 않는다.

선택 플레이어 음성 입력은 [음성 인식 규격](speech-recognition-specification.md)과 [호스트 인터페이스 2.3](module-interface-specification.md#23-선택-음성-입력의-호스트-인터페이스)을 따른다. 마이크/전사 모듈은 확정 텍스트만 기존 요청 경로에 전달하며 대화 엔진·NPC 출력 계약을 변경하지 않는다.

## 2. 모듈 인터페이스

공통 Envelope/Call/Reply/Fence와 [등록표](../contracts/v1/registry.json) 사용. 추가 실행 수명: 세션 관리·진입/제어 전환·자막. 분야별 정책은 NPC 식별/게임 정보/기억/행동 규격 참조.

## 3. 세션과 동시성

| 상태/조건 | 동작 |
| --- | --- |
| idle → targeting → entry_pending | 대상 선택·추가 선택지. AI 요청/제어 없음 |
| handoff | 오리지널 제어 반환+대화 조건 재판정. AI 요청/제어 없음 |
| active → waiting | 단일 NPC·전경 요청 1개. waiting은 새 입력 금지, 취소/종료 제공 |
| 요청 취소 | active 복귀 |
| 세션 종료 | closing → idle. UI/제어 정리 |
| 유휴 | active에서 입력/UI 조작 없이 60초 초과 시 종료. waiting은 요청 제한 시간 적용 |
| 정리 | 별도 비동기. 완료 대기로 waiting 전환 금지. 동시성/우선순위는 [기억 규격](memory-specification.md) |

세션 필드: session_id, save_scope, world_epoch, npc_instance_key, request_sequence, dialogue_context_revision. 요청별 새 request_id. 응답은 전체 값+현재 대기 요청 일치 및 [표시 전 검사](game-context-specification.md#4-갱신과-무효화) 통과 시만 수용.

소멸·퀘스트 제어·전투는 종료. 로드·빠른 이동·세계 전환은 종료+world_epoch 증가. 늦은 응답은 통신 취소 가능 여부와 무관하게 폐기. 진입/복원은 [NPC 식별](npc-identity-specification.md#21-ai-대화-진입과-오리지널-제어-전환)/[저장 규칙](memory-specification.md#31-게임-저장과-기억-묶음의-연결) 참조.

## 4. 연결 설정과 API 키

| 필드 | 형식 | 규칙 |
| --- | --- | --- |
| provider_id | 문자열 | 등록된 제공자 어댑터 ID |
| model_id | 문자열 | 사용자가 선택한 모델 ID |
| credential_ref | 문자열 | 키 값이 아닌 로컬 보안 저장소 참조 |
| endpoint_profile | 문자열 | 어댑터에 등록된 HTTPS 연결 프로필 |
| timeout_ms | 정수 | 기본 15000, 범위 3000~60000 |
| output_token_limit | 정수 | 기본 512, 범위 128~2048 |

- 비스트리밍 구조화 텍스트 기본. 실제 상한/예산은 [비용 규격](api-cost-specification.md). 인증 헤더/원시 응답 로그 금지.
- 정상 인증서 검증과 등록된 endpoint_profile만 사용한다. 리디렉션으로 인증 헤더를 다른 호스트에 전달하지 않는다.
- 연결·수신 제한과 별도로 접수 시점 기준 전체 마감 시간(timeout_ms)을 적용한다. 만료·취소는 Native 요청 핸들을 닫고 결과를 폐기한다. 취소가 이미 사용한 토큰의 미청구를 보장하지 않는다.
- 키는 Windows 보안 저장소/계정 암호화. 미지원은 실행 메모리만 사용. 평문 저장 기본 금지. UI는 마스킹·등록/삭제, 저장 키 재표시 없음.
- 키/모델 변경은 현재 요청 종료 후 적용.
- 지원 프로필: provider_id, model_id, prompt_version, content_version, crowd_enabled, community_profile_ids, actions_enabled. 명시된 인물/행동만 활성. 품질 미달은 비활성+설정 안내. 형식/권한 검사는 항상 적용.

## 5. 요청·응답 계약

PromptAssembly → ModelInput → ProviderResult → DialogueReply. 공통 스키마의 필드/길이/열거값 적용. 오리지널 canon_context와 ANPC MemoryView 분리. 로컬 ID·세대·저장/작업 정보는 외부 전송/모델 생성 금지.

- 모델 출력은 dialogue/intent/emotion/action/follow_up만. 음성 활성 시 delivery/speech_text를 더하며 필드 순서·검사는 [음성 출력 규격 2절](npc-voice-output-specification.md#2-응답-계약-추가)을 따른다. 봉투/식별자는 호스트 부여. action은 제안이며 완료 아님.
- 빈 대사·미등록 필드/열거·잘못된 인수 거부. 금기/대사 형식 위반은 전체 거부.
- 잘못된 행동은 제거. 대사가 독립적일 때만 유지, 불명이면 안전 대체 대사. 정적 검사+지원 품질 프로필 적용.
- execution_mode/candidate는 ActionOption, catalog_version은 ActionRequest. 모델의 모드/어댑터/자산 경로 변경 금지.
- 현재 일상 허용은 CanonView만 전달. 출력 필드/평가 모델 추가 없음.
- 실제 표시 대사와 실행기 확정 결과만 사건 등록. 요약은 SessionSummarizer.propose의 SessionSummary이며 모델의 {summary}에 세션 ID를 호스트가 부여한다. SummaryCandidates는 이전 구현 호환용이다.

## 6. 오류와 재시도

코드: auth_failed, rate_limited, timeout, network_error, invalid_response, stale_response, context_unavailable, budget_exceeded, memory_capacity_exceeded.

- 재시도는 비용 규격. 이미 실행된 행동 요청 재시도 금지.
- 기억 정리 오류는 대사 오류에 전파하지 않는다.
- 실패는 기존 기록 유지+한국어 UI+재전송/종료. NPC 서비스 오류 대사 없음.
- 미제공 사용량은 알 수 없음. 진단 기본: 요청/어댑터/모델 ID·지연·오류·행동/결과. 원문/상태 로그 기본 비활성.

## 7. 대사 자막과 게임 진행

자막 필드: session_id, request_id, subtitle_id, speaker_key, display_name, text, sequence.

- 자막은 ANPC 소유 ink 위젯으로 표시하며 오리지널 자막을 덮어쓰거나 숨기지 않는다.

- text는 수용된 dialogue+중복 없는 follow_up. 폐기 응답/선택 행동 설명/서비스 오류 제외. 화자/요청 중복 차단.
- 다음 수용 대사/세션 종료까지 유지. 활성 기록 열람 가능. 긴 대사는 동일 발화 순서로 분할.
- NPC 음성은 같은 subtitle_id에 연결. 재생 중 자막 유지, 실패 시 텍스트 유지. 자막 동기·중단은 [음성 출력 규격](npc-voice-output-specification.md#43-자막-동기).
- 입력 포커스는 게임 키 중복 차단, 세계 시간 정지 없음. 전투·위험·오리지널 제어·소멸 시 세션/자막/행동 정리.
- UF-62의 Tab/오리지널 캐릭터·인벤토리 메뉴는 입력 차단 예외다. 작성 중 텍스트/한영 상태를 보관하고 메뉴 중 출력/입력 복귀를 보류한다. 메뉴 종료 후 동일 세션/세계/대상·안전·현재 관찰을 재검사한다. 메뉴 열기 자체로 추가 생성 요청하지 않는다.
- 기본 멈춤/시선은 세션 제어. 추가 행동 선택 모드와 분리. 오리지널 대사/퀘스트 결과 변경 금지.
