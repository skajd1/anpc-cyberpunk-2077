# 모드 공통 데이터 및 모듈 입출력 규격

규격 버전: 1.2 (2026-10-08). 목표 계약. 구현 상태: [개발·검증 계획](development-validation.md).

## 1. 기준과 범위

| 기준 | 정의 대상 |
| --- | --- |
| [JSON Schema](../contracts/v1/module-contracts.schema.json) | 필드·타입·필수 여부·열거값 |
| [등록표](../contracts/v1/registry.json) | 계약 이름·포트·입출력 순서/개수·Fence 필요 여부 |
| [구성 스키마](../contracts/v1/integration-configuration.schema.json) | FieldRegistry·ModuleManifest·ModulePlan |
| [상태 필드 등록표](../contracts/v1/cyberpunk2077-fields.json) | 사이버펑크 필드별 의미·값 타입·단위·공개·관찰 조건 |
| 이 문서 | 의미·소유권·수명·저장/전송 경계 |
| 분야별 명세 | 선택·검사·보존·실행 정책 |

범위: 대상·상태·인물·지식·기억·행동·프롬프트·생성 결과. 게임 객체·DB·UI·통신 방식은 어댑터 내부 구현이다. 공통 형태와 정책은 각 기준에만 정의한다.

## 2. 공통 전달 단위와 호출 결과

### 2.1. 데이터 봉투 Envelope

| 타입/필드 | 규칙 |
| --- | --- |
| Envelope | contract, contract_version, scope, data. 호출·저장에 사용. LLM에는 전송 뷰만 제공 |
| contract_version | 공통 형태 버전. 콘텐츠·정책·성격 변환·memory_view_version과 분리 |
| Scope.game_id/mod_id | 게임/모드 이름 공간. 가져오기 시 원본 범위·출처 보존 및 정책 검사 필수 |
| Scope.save_scope | 확인된 저장 계보 또는 휘발 범위 |
| ActorRef | community 또는 살아 있는 instance의 논리 키. 원시 객체·표시 이름 사용 금지 |
| OwnerScope | actor와 save_scope 필수. null은 대상 미확정·전역 자료에만 허용 |

게임·모드·저장·소유자별 자료와 권한을 격리한다. 군중 재생성 뒤 기존 키를 재사용하지 않는다.

### 2.2. Call과 Reply

| 항목 | 규칙 |
| --- | --- |
| Call | call_id, port, fence, inputs. 입력은 등록표 순서의 Envelope 배열 |
| 반복 입력 | 등록표의 repeat_input에 선언한 종류만 허용 |
| Reply | 호출자의 call_id를 유지. ok: 선언된 outputs + error=null. error/cancelled/discarded: outputs=[] + Fault |
| Fence | world_epoch, snapshot_id, memory_generation, memory_revision 고정. 필요 여부는 requires_fence 참조 |
| Fence.session | 전경 요청은 SessionRef. 비동기 기억 정리는 null 허용. 정상 세션 종료만으로 유효 정리 작업을 무효화하지 않음 |
| 결과 수용 | 불변 입력 사용. 커밋·표시·실행 직전에 Fence와 분야별 권한 재검사 |
| 취소 | 호출 수명의 호스트 신호 사용. 제공자 취소와 늦은 결과 폐기를 별도 처리 |
| Fault | code, 민감정보를 제거한 message, retryable. 자동 유료 재시도 권한 없음 |
| 표준 오류 | cancelled, stale_result, unsupported_contract, invalid_contract. 상세 코드는 분야별 규격 참조 |

키·실행 handle·취소 신호는 JSON에 넣지 않는다. null/빈 객체를 성공·실패 공용 결과로 사용하지 않는다.

### 2.3. 선택 음성 입력의 호스트 인터페이스

호스트 확장 인터페이스 버전 1.0. 마이크/UI의 프로세스 내부 수명이며 Envelope/Call/Reply 포트가 아니다. contracts/v1 등록표·기존 데이터 계약 버전은 변경하지 않는다. 향후 프로세스 간 일반 모듈 계약으로 승격하면 별도 스키마·포트·예시를 발행한다. 정책·제공자 변환은 [음성 인식 규격](speech-recognition-specification.md) 참조.

| 타입 | 필드·규칙 |
| --- | --- |
| SpeechCaptureRef | capture_id, context_token: 호스트 발급 비어 있지 않은 문자열, 각 160자 이하. 캡처마다 고유 |
| SpeechEvent 공통 | interface_version=1.0, ref: SpeechCaptureRef, type. ref는 start 입력 그대로 |
| ready | type=ready. 실제 캡처/전송 시작 가능. 한 번 |
| partial | type=partial, text: 해당 항목의 전체 누적 전사 문자열. 표시용이며 최종 결과 아님 |
| final | type=final, text: 제공자 최종 전사 문자열. 호스트가 기존 입력 검증 적용 |
| error | type=error, error: Fault. 원본 제공자 오류/인증 정보 포함 금지 |
| cancelled | type=cancelled. final/error와 배타적인 종결 이벤트 |
| SpeechInput | interface_version=1.0; start(ref), stop(capture_id), cancel(capture_id), dispose(). 모두 비차단 |
| SpeechHost | onEvent(event), isContextCurrent(context_token), submitPlayerText(text, context_token) |

- start는 idle에서만 수용하고 참조를 복사한다. 반환 Promise는 ready 방출 뒤 resolve. 시작 실패/취소는 error/cancelled 방출 뒤 reject; 호스트는 이벤트로 UI를 한 번만 갱신한다.
- stop은 listening 캡처의 마이크를 즉시 정지하고 최종 확정을 시작한다. Promise는 종결 이벤트 처리 뒤 resolve. opening에서는 cancel과 동일. 반복 stop은 같은 작업을 공유한다.
- cancel은 즉시 해당 캡처를 무효화하고 마이크/버퍼를 해제한다. 네트워크 종료는 비동기. 알려진 종결 캡처에 대한 stop/cancel은 무해하며 새 캡처를 건드리지 않는다.
- 수용된 start마다 final/error/cancelled 중 정확히 하나. 종결 후 ready/partial 금지. 중복 start는 capture_busy로 reject하며 기존 캡처 이벤트를 종결하지 않는다. 잘못된 ref/알 수 없는 stop ID는 invalid_contract로 reject한다.
- dispose는 재호출 가능. 진행 캡처를 취소하고 모든 자원 해제 뒤 Promise resolve. 완료 뒤 start는 거부한다.
- onEvent는 호스트 큐에서 순서대로 전달. isContextCurrent는 동기 검사. submitPlayerText는 현재 토큰·세션·입력 잠금을 원자적으로 검사하고 수용 시 true, 거부 시 false를 반환한다. 수용 뒤 기존 비동기 대화 요청을 시작한다. 부분 전사를 제출하지 않는다.
- 키 접근기·마이크/전사 어댑터·시계·설정·호스트 콜백·사용량 기록기는 생성 시 주입한다. 제공자/브리지 item_id는 모듈 내부 매핑이며 공통 게임 데이터/모델 입력에 넣지 않는다.

## 3. 원본과 전송 뷰의 분리

| 원본/입력 | 전송/결과 | 용도 |
| --- | --- | --- |
| IdentityProfile | PersonaView | 다섯 성격 지침·개인 원칙·말투·배경 |
| StateSnapshot / ObservedField | ObservationView / CanonView | 공개 관찰·현재 목표·오리지널 관계 |
| 승인 지식 자료 | KnowledgeView | 관련 진술·확실성·공개/분야 제한 |
| SourceEvent / MemoryRecord / MemorySnapshot | MemoryView | 활성 문맥·관련 과거 원문/요약·조회 제약 |
| SummaryInput | SummaryCandidates | 고정 근거 범위의 정리 후보 |
| ActionCatalog | ActionOption[] | 현재 허용 행동·인수·실행 모드 |
| ActionProposal / ActionRequest | ActionOutcome | 제안·실행 명령·실제 결과 분리 |
| PromptAssembly | ModelInput | 지침·데이터 메시지·출력 계약·상한 |
| ProviderResult | DialogueReply | 원시 결과/사용량 → 검사한 대사/제안 |

- 전송 뷰는 허용 필드만 새 객체로 생성한다. 원본 전체·extra/raw·물리 저장/큐 정보를 넣지 않는다.
- ObservedField: known은 null 아닌 값, unknown/unavailable은 null. 확인된 없음은 false/빈 목록 등 등록된 필드 의미로 표현한다.
- ObservationView: field_id/status/value만 전송. 어댑터 필드 등록표의 의미·값 타입·공개·관찰 조건을 검사한다.
- TimeRef: 세션/소유자 순서와 확인된 게임/UTC 시각을 분리한다. 시각 미확인은 null. 경과 시간을 UTC로 변환하지 않는다.
- SourceRef는 출처 참조다. 사실성·인지 권한은 별도 검사한다.
- Condition은 all/any/not 및 eq/in/gte/lte만 사용한다. unknown을 not으로 반전해 허용하지 않는다.

### 3.1. 상태 필드 등록

FieldRegistry는 game_id/mod_id/revision별 불변 구성이다. FieldDefinition의 형태는 구성 스키마를 따른다. 필드 등록은 수집 구현·값 확인·콘텐츠 승인을 의미하지 않는다.

| 항목 | 규칙 |
| --- | --- |
| field_id | 같은 등록표에서 유일. 정확한 ID로 조회. 표시 이름·와일드카드·객체 경로의 자동 탐색 금지 |
| value_type | boolean/integer/number/string/visible_items. visible_items는 공통 VisibleItem[]이며 임의 객체·문자열 배열 금지 |
| unit | none/metres/seconds/milliseconds. 숫자만 단위 허용. 등록 단위로 변환 후 저장·조건 평가 |
| minimum/maximum | 숫자 범위. 제한 없음은 null. integer 경계도 정수. minimum ≤ maximum |
| visibility | public=관찰 뷰 후보, character_known=인지·공개 정책 통과 후 별도 뷰, internal=정책 판정 전용. 원시 internal 값 전송 금지 |
| observation_guard | null 또는 같은 등록표의 boolean 필드. 조건 필드는 다른 관찰 조건을 갖지 않음. known+true일 때만 대상 값을 관찰/기억으로 사용 |
| 값 검사 | known의 타입·유한 수·범위·VisibleItem 형태 검사. 미등록 필드·잘못된 타입은 invalid_contract. 소비자 임의 변환 금지 |
| 미수집/실패 | 미확정=unknown, 미지원/수집 실패=unavailable. 둘 다 value=null. 필드 누락은 unknown으로 평가하며 기본값 주입 금지 |
| 없음/거짓 | known+false/[]는 실제 확인한 부재. 빈 문자열·0·[]로 미확인을 대체하지 않음. 빈 문자열을 유효 표현으로 사용하는 필드 없음 |
| 조건 연산 | boolean/string=eq/in, integer/number=eq/in/gte/lte. visible_items 직접 비교 금지. 피연산자도 등록 타입·단위 사용 |
| 동적 필드 | 콘텐츠의 실제 fact_id마다 content.grants.<fact_id>를 개별 등록. 새 콘텐츠/퀘스트 필드는 수집 매핑과 함께 등록표 개정 |

public도 대상의 인지·거리·시야·분야별 정책을 통과해야 한다. 조건 미확인 시 해당 현재 관찰 제외. 관찰 조건으로 과거 기억의 당시 값을 변경하지 않는다. 의미·타입·단위 변경은 새 field_id로 발행하며 등록표 revision만으로 기존 의미를 교체하지 않는다.

## 4. 장기 기억의 저장과 전송 계약

| 타입 | 규칙 |
| --- | --- |
| SourceEvent | player_utterance=player/player_claim, npc_utterance=npc/npc_statement, 관찰·실행·해결=runtime/runtime_confirmed |
| SessionSummary | session_id + summary. 한 세션의 전체 대화를 짧게 정리한 보고. 지식·관계 수정 권한 없음 |
| MemoryRecord | 이전 세부 기억 구현의 호환 타입. 현재 세션 요약 정책에서 새 항목을 생성하지 않음 |
| MemorySnapshot | session_summaries에 세션 요약, events에 진행 중 수용 발화. revision·generation은 로컬용 |
| MemoryView | session_summaries에 최신 세션 요약 문자열. 기존 long_term/active_items/recalled_events는 현재 정책에서 비움 |
| 전송 제외 | validity·importance·근거 ID 목록·체크포인트·세대·저장/작업 정보 |
| 전송 참조 | 요청 내 짧은 참조 사용 가능. 원본 대응표는 로컬 보존. 같은 참조의 의미 교체 금지 |
| SaveBundle | 확인된 game_save_ref + 소유자별 MemorySnapshot. 봉투 actor=null, owners는 같은 game_id/mod_id/save_scope |
| 저장/복원 | 게임 저장 직렬화 경계용 불변 자료를 캡처하고 성공한 저장에 남은 game_save_ref로 복원. 런타임 세대·객체·진행 호출 복원 및 미확인 슬롯 대체 금지 |

생성 대사를 관찰/실행 사실로 승격하지 않는다. 조회·중복 제거는 [기억 규격](memory-specification.md)을 따른다. 전달한 기억을 소비하거나 변화 반응을 강제하지 않는다.

## 5. 모듈 포트와 책임

| 포트 그룹 | 책임 |
| --- | --- |
| TargetResolver.resolve | 대상 키·허용 판정 |
| StateCollector.collect | 요청 시점 관찰/출처 확정 |
| IdentityResolver.resolve | 고정 카드 또는 동일 군중 생성 프로필 반환 |
| PersonaProjector.project | 고정 PersonaView / 현재 CanonView 분리 |
| KnowledgeSelector.select | 공통 핵심 CommonKnowledgeView + 조건·분야 상한 내 KnowledgeView.items |
| MemoryStore.appendEvents/readSnapshot | 사건 중복 차단·불변 스냅샷 |
| MemorySelector.select | 쿼리·스냅샷·예산으로 MemoryView 선택 |
| SessionSummarizer.propose / MemoryStore.commitSession | 한 세션 전체 정리 / 같은 세션 ID로 요약 저장 |
| MemoryConsolidator.propose / MemoryStore.commit | 이전 세부 기억 구현 호환 포트 |
| MemoryStore.captureSaveBundle/restoreSaveBundle | 다중 소유자 캡처 / 대상 소유자 복원 |
| MemoryStore.invalidate/delete | 세대 증가·무효화/삭제·늦은 재삽입 차단 |
| ActionCatalog.describe / ActionSelector.select | 등록 의미 / 현재 허용 후보 |
| PromptAssembler.assemble | 허용 뷰 조립·최종 예산 계측 |
| Provider.generate | 제공자 형식/통신·원시 결과/사용량 |
| ReplyValidator.validate | 해당 요청의 출력 계약·후보 검사 |
| ActionAdapter.validate/execute/cancel/release | 현재 권한 검사·명령 실행·취소/정리 |

- 오케스트레이터가 공개 관찰, identity.view/state.canon, knowledge.view, memory.view, action.options, 최근 발화·현재 입력·출력 상한으로 PromptAssembly를 구성한다.
- 모듈은 선언된 입력/의존성만 사용한다. 콘텐츠 카탈로그·정책·필드 등록표·저장소·연결 설정/키 접근기·취소 신호는 구성 시 주입한다.
- 콘텐츠/정책 버전은 호출 동안 고정한다. 미지원 버전은 거부한다. persona_id/content_version으로 불변 카탈로그 조회 가능. 가변 게임/기억의 우회 조회 금지. 저장소는 MemoryStore만 접근한다.
- ModelInput.instructions는 높은 지침 채널, data_messages는 낮은 데이터 채널이다. 순서: persona → 선택 style_examples → 음성 요청의 선택 ja_voice(JaVoiceData) → context → 선택 identity_reminder → recent_turn 반복 → player_input.
- 모델은 dialogue.reply@1.0의 데이터만 생성한다. Envelope·Call·Fence·요청 ID는 호스트가 관리한다.
- ActionRequest는 execute만 허용한다. selection_only는 로컬 선택 결과로 표시한다. succeeded는 실제 완료 검증을 요구한다.
- accepted/running 진행 이벤트는 같은 call_id를 사용한다. 최종 Reply는 한 번 확정하고 결과 상태는 역행시키지 않는다.

### 5.1. 구현 등록과 연결

ModuleManifest/ModulePlan은 호스트 구성 자료이며 Envelope·LLM 입력에 포함하지 않는다. 구성 버전 1.0은 데이터 계약 버전 1.0과 별도로 관리한다.

| 구성 | 규칙 |
| --- | --- |
| ModuleManifest | module_id/module_version 조합 유일, 지원 contract_versions, environment, 포트·의존성 선언. 포트는 공통 등록표의 정확한 이름 |
| environment | portable=게임 접근 없는 공통 처리, simulation=모의 상태/실행, game=실게임 접근. test는 portable/simulation, game은 portable/game만 연결 |
| dependencies | dependency_id·kind·required. kind는 필드 등록표/콘텐츠/정책/기억 저장소/제공자 설정/키 접근기. 중복 ID 금지 |
| ModulePlan | game_id/mod_id, test/game, required_ports, bindings. 필수 포트는 호스트의 선택한 기능 구성에서 결정하며 모듈이 축소하지 못함 |
| PortBinding | 포트→module_id/module_version, config_ref, 의존성별 resource_ref. 구현/자원은 호스트의 신뢰된 로컬 등록 목록에서 조회 |
| 연결 검사 | 포트당 정확히 하나. 필수 포트 누락·중복·미등록 구현·미지원 계약/구성 버전·환경 불일치·필수 의존성 누락은 시작 거부 |
| 자원 검사 | kind·게임/모드 범위·콘텐츠/정책/등록표 버전·승인 상태·환경 검사. 미선언 의존성·다른 소유자 저장소 접근 금지 |
| 구성 공유 | 동일 module_id/module_version을 여러 포트에 연결하면 config_ref와 자원 집합 동일. 연결 뒤 해당 구성 불변 |
| 선택 기능 | 미연결 선택 포트는 기능 비활성. 읽기만 가능한 기억 구성에서 영구 저장/정리 활성화 금지. 실게임 실행에는 검사·실행·취소·해제 포트 모두 필수 |
| 키/교체 | 키 문자열 저장 금지, credential_resolver 참조만 사용. 세션/작업 취소·행동 해제·늦은 결과 무효화 후 구성 교체 |
| 오류 | invalid_configuration, unsupported_module, unsupported_contract, missing_dependency. 민감정보 제거. 다른 구현·유료 제공자로 자동 대체 금지 |

게임 구성은 모의 상태·관계·행동 및 개발용 draft 자원을 거부한다. 테스트 구성의 저장 범위는 실게임과 분리한다. [가상 구성 예시](../contracts/v1/integration-examples.json)는 형식 검사용 부분 구성이다.

## 6. 분야별 명세가 소유하는 정책

| 기준 | 정책 |
| --- | --- |
| [NPC 식별](npc-identity-specification.md) | 매핑·진입·거리·재접촉·만료 |
| [콘텐츠](content-specification.md)·[성격](personality-specification.md) | 작성·승인·수준 변환·군중 생성 |
| [게임 정보](game-context-specification.md) | 수집·공개·단계 변환·재검사 |
| [NPC 지식](npc-knowledge-specification.md) | 인지·분야 깊이·공개·화제 선택 |
| [기억](memory-specification.md) | 정리·조회·보존·용량·저장 시점 |
| [행동](npc-action-scope.md) | 인수·호환·권한·완료/취소·제어 반환 |
| [프롬프트](prompt-specification.md) | 베이스·배치·중복 제거·직렬화 |
| [비용](api-cost-specification.md)·[통신](runtime-specification.md) | 예산·원장·재시도·오류·연결 수명 |

## 7. 버전과 어댑터 전환

- 지원 계약/버전/포트를 명시한다. v1은 1.0만 수용한다. 필드·의미·필수 여부 변경은 새 계약 버전으로 발행한다.
- 정책/콘텐츠 버전으로 공통 의미를 변경하지 않는다. 추가/알 수 없는 필드를 무시하지 않는다. 확장은 별도 등록 계약 또는 새 버전으로 정의한다.
- 기존 형식은 명시적 경계 어댑터로 변환한다. 누락 근거·시각·승인 상태 생성 금지. 변환 불가는 unknown/보류/기능 비활성으로 처리한다.
- 기존 초안·부분 memory_view_version=1.2를 승인 계약으로 자동 전환하지 않는다. 동일 스냅샷에서 기존/신규 출력의 의미·근거를 비교한다.
- 형식 전환만으로 영구 기억·실행 권한을 활성화하지 않는다.

### 7.1. 현재 테스트 웹의 변환 규칙

변환 입력은 인물 카드·현재 스냅샷·저널·호스트 소유자/세션이다. 최종 프롬프트 문자열을 역분석하지 않는다. 변환기는 대상의 허용 필드만 새 객체로 생성하고 원본 출처·검수/환경·ID 대응표를 로컬 보존한다.

| 현재 원본 | 목표 | 변환/누락 처리 |
| --- | --- | --- |
| engine.saveScope/worldEpoch/session/instances | Scope·ActorRef·SessionRef·Fence | 호스트에서 game_id/mod_id/휘발 저장 범위와 실제 인스턴스 키 지정. 표시 이름 사용 금지. 없는 기억 revision/generation은 신규 테스트 저장소에서 발급 |
| persona 핵심 성격·원칙·말투·금기·fallback | IdentityProfile → PersonaView | 카드 revision/묶음 content_version 보존. 성격은 등록된 25문구 중 다섯 지침으로 변환. fallback·검수·원점수는 뷰 제외 |
| persona.background.provenance=research_draft | IdentityProfile.background | 작성 요약은 authored로 분류하고 review_status=draft 유지. 오리지널 승인으로 승격 금지. 개발용 테스트 예외에만 연결 |
| persona.lived_context 객체 | lived_context:string[] | 확인된 occupation·concerns·interests의 문자열을 작성 순서로 추출. provenance는 로컬 보존. 모르는 키/다른 타입은 보류, 객체 전체 직렬화 금지 |
| persona.current_goals/relationship_to_player | CanonView | 정적 인물에서 제거. 관계 단계의 label/attitude/address와 목표를 한 번 전달. 시험 source=simulation. 현재 context와 중복 값이 다르면 거부 |
| research.canon_context | CanonView | 관계 단계의 current_goals·관계·유효한 오리지널 사건·적용 규칙만 제공. 선택 조건/전체 분기/출처 전문/phase/notice는 전송 제외. 오리지널 확인 없는 항목 생성 금지 |
| everyday_fiction_policy | CanonView.everyday_fiction_policy | allowed/scope/prohibited만 제공. development_draft 상태는 로컬 구성에 유지 |
| 카드 identity_rules/action_preferences | CanonView.applied_rules·행동 선택 정책 | 조건을 통과한 규칙의 우선 가치·응답 방향·금지만 문자열로 투영. 행동 선호는 persona_id로 로컬 카탈로그 조회. 초안은 개발 구성에서만 허용 |
| world 거리·무기·레벨·평판·지역·안전 | StateSnapshot.fields | distance→npc.distance_m, weapon_drawn→player.weapon_drawn, level/street_cred→player.*, location→location, combat/quest_controlled→safety.*. 각각 모의 출처 보존 |
| world.equipment/기본 context.visible_equipment 문자열 | 미확정 관찰 | 복장 설명을 무장 목록으로 변환 금지. 확인된 슬롯/종류와 관찰 근거 없으면 unavailable, 원문은 로컬 보류 |
| scenario.visible_outfit/outfit_status | player.visible_outfit 및 관찰 조건 → ObservationView | 실제 모의 관찰 성공에만 known. 각 항목은 slot/display_name/appearance_text만 유지. id/description_source는 로컬. unknown은 []로 변환 금지 |
| 연구 설정의 시대·인물·생존·관계·단계·인지·렐릭 공개 | content.* 등록 필드 | 기존 정확한 논리 ID 유지. SourceRef의 runtime 출처 ID로 모의 수집기 식별. 테스트 환경만 허용. 미수집 실게임 값은 unknown |
| research.knowledge/knowledge_profile.domains | KnowledgeView | 조회된 사실·인지 깊이·확실성·공개·주장 한도 유지. 없는 statement/response_constraint=null. withheld 진술 및 미인지 사실 제외 |
| player_identity/public_reputation | PromptContext.player_identity·KnowledgeView | name은 name_known_by_npc=true일 때만 display_name. 공개 행적은 확인·허용된 진술만 known_facts로 제공. character_key/fact_id/모의 진단 제외 |
| session.turns/scenario 최근 발화 | TurnView[] | role/text만. follow_up은 원래 NPC 발화의 일부. 최근 발화와 조회 기억의 중복 제거는 프롬프트 정책 적용 |
| conversation_state/engine.state | PromptContext.conversation_state | encounter 유지, topic_tags는 실제 선택 질의의 태그 또는 [], closing은 호스트 상태가 closing일 때 true. traits 제외 |
| scenario.journal 현재 세션 발화 / memory.records | SourceEvent / SessionSummary → MemorySnapshot·MemoryView.session_summaries | 현재 세션 ID·화자·순서 유지. 종료한 세션은 한 줄만 투영하며 관찰 이력을 생성하지 않음. 모의 저장 전용 |
| memory_view_version=1.2/짧은 summary·player_claims | 원문 재조회 또는 보류 | 1.3으로 버전만 변경 금지. 검증 가능한 원문으로 새 뷰 구성. 근거 없는 합친 대사/요약은 MemoryRecord·관찰 사실로 가져오지 않음 |
| allowed_actions의 args 객체 | ActionCatalog/ActionOption의 ArgSpec[] | duration_s:number/필수/1..10, gesture_ref:string/필수/등록 후보. 없는 수치 한도=null, 무제한 후보=[]. 가상 기본 행동은 simulation에서만 execute, 제스처는 selection_only 유지 |
| lastAction의 가상 성공/lastActionSelection | 테스트 진단 또는 검증된 ActionOutcome | observed_effect가 문자열이면 확인된 결과 문장 배열로 변환. 선택을 실행으로 승격 금지. 요청 ID·완료 근거 없는 옛 성공은 실행 사건/실게임 결과로 가져오지 않음 |
| styleExamples/identityReminder | StyleExample[]/IdentityReminder | 예시는 input/sample_dialogue/expected_intent만, reminder는 hard_limits만. 초안 상태는 로컬 유지. 반복 목표·관계·원칙 제거 |
| assemblePrompt의 instructions/input | PromptAssembly → ModelInput | 위 뷰에서 새 조립. instructions 유지·공통 출력 계약 적용. data_messages는 선언 순서. 고정 데이터는 압축 JSON, recent_turn과 마지막 player_input은 발화 원문. 제공자 어댑터에서 요청 형식 변환 |
| 모의 captureTestSave | 테스트 전용 저장 자료 | 확인된 game_save_ref가 없어 SaveBundle로 변환 금지. 실게임 저장/로드에 적용 금지 |
| diagnostics/prototype_memory/seed/traits | 로컬 정책·진단 | 허용 전송 필드가 아님. 생성/정책 입력은 해당 모듈 구성에서만 참조 |

필수 프로필/오리지널 맥락을 구성할 자료가 없으면 요청 보류. 플레이어 신원 미제공은 name=null/name_known_by_npc=null/known_facts=[]; 검증된 마지막 실행 결과가 없으면 last_action_result=null. 출력 언어·토큰 상한은 호스트 요청 설정에서 주입한다.

전환 수용 조건: 같은 입력의 허용 진술·대화/게임 사실 구분·행동 후보가 일치하고, 소유자/초안/모의 출처와 선택 전용 권한이 보존되어야 한다. 불일치·잘못된 형태는 거부, 원본 근거 부족은 보류한다. 두 경로를 동시에 실행·저장·유료 호출하지 않는다.

## 8. 계약 검증과 구현 경계

형식 검사와 분야별 정책 검사를 모두 통과해야 한다. 정책 검사: 범위/세대 일치·공개·근거 실재·후보 권한·요약 충실도.

[설계 검사](../scripts/validate-contracts.mjs)는 사용 중인 JSON Schema 부분집합·등록표/예시 및 구성의 중복·관찰 조건·연결·의존성·환경을 검증한다. 실제 구현/자원 존재·상태값·이전 웹 변환은 검사하지 않는다. 미지원 키워드는 거부한다. 런타임은 Draft 2020-12 검사기와 위 의미 검사 또는 동일 타입/검사 구현을 사용한다.

## 10. 공통 핵심 지식·최근 대화의 전송 확장

- CommonKnowledgeView: category_id + statements[]의 배열. category_id와 범위는 공통 스키마 참조. 허용된 공개 개요만 포함.
- KnowledgeView.common_knowledge·PromptContext.common_knowledge는 선택 필드. 생략 시 빈 배열. 상세 items/knowledge와 사실 중복 제외.
- PromptContext.recent_turns는 조립 전의 내부 TurnView 배열. ModelInput의 context는 recent_turns를 제외한 PromptContextData로 직렬화.
- ModelInput.data_messages 순서: persona → 선택 style_examples → 음성 요청의 선택 ja_voice → context → 선택 identity_reminder → recent_turn 반복 → player_input.
- recent_turn: kind=recent_turn, role=user/assistant, content=실제 표시한 원문. player→user, npc→assistant. 역할을 높은 지침으로 변환하거나 현재 입력을 중복 추가하지 않음.
- 포트 계약 1.0은 유지하며 v1 스키마의 전송 메시지 종류를 확장. 신규 어댑터는 recent_turn을 반드시 지원. 예전 메시지 배열은 여전히 유효하되 context에서 recent_turns는 제거해야 함.
- 웹 내부 journal/슬롯 형식은 테스트 어댑터 전용. SummaryInput·MemoryRecord·MemoryView는 공통 타입 사용. 실제 SourceEvent 등록·SaveBundle 연결을 구현한 것으로 간주하지 않음.

## 11. 세션 요약 확장

`memory.session-summary`와 SessionSummary를 추가 등록한다. SummaryInput은 같은 세션 source_events 전체를 사용하며 기존 의미를 변경하지 않는다. MemorySnapshot/MemoryView의 session_summaries는 선택 확장이다. 이전 MemoryRecord·SummaryCandidates 계약은 호환 검사용으로 유지한다. 새 포트의 출력은 호스트가 세션 ID를 부여한 SessionSummary다. 모델 출력 `{summary}`를 직접 봉투로 사용하지 않는다. 현재 웹 저장 버전 2와 목표 SaveBundle의 변환은 테스트 어댑터 경계이며 실게임 연결이 아니다.
