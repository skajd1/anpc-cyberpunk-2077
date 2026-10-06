# 프롬프트 캐싱 적용 규격

규격 버전: 1.1 (2026-10-05). 상위 문서: [NPC 대사·행동 생성 프롬프트 명세](prompt-specification.md). 공통 입출력은 [모듈 규격](module-interface-specification.md)의 PromptAssembly → ModelInput → ProviderResult를 따른다. 근거: [참고 분석](prompt-caching-analysis.md). 구현·시험 상태: [개발·검증 계획](development-validation.md#프롬프트-캐싱-적용-계획). 이 문서는 적용할 목표를 확정하며, 실행 코드와 계약 스키마는 아직 변경하지 않았다.

## 1. 적용 결정

| 항목 | 확정 규칙 |
| --- | --- |
| 적용 경로 | 웹 OpenAI 대사 생성과 게임 OpenAI 대사 생성 모두 Responses API에 동일 정책 적용 |
| 기본 모델 | 기존 gpt-6-luna·reasoning.effort=none 유지 |
| 기본 캐싱 | 명시적 방식. 공통 지침 끝 A와 인물 데이터 끝 B, 최대 두 경계 |
| 가변 데이터 | 예시·현재 상황/인지/지식/관계/관찰·기억·허용 행동·최근 대화·현재 입력은 B 뒤에 전송 |
| 캐시 수명 옵션 | 기본 모델에 prompt_cache_options.ttl=30m |
| 연결 상태 | 매 요청 전체 입력·store:false 유지. previous_response_id·서버 대화 저장 도입 없음 |
| 예열·미스 처리 | 자동 예열/빈 요청 없음. 미스는 정상 생성이며 재전송하지 않음 |
| 모의/Codex | 기존 요청 경로 유지. OpenAI 캐시 옵션 전달 없음 |

명시적 경계를 채택하는 이유는 현재 프로젝트가 상황과 최근 대화를 매 턴 다시 조립하기 때문이다. 가변 뒷부분의 반복 쓰기보다 공통 지침과 인물의 재사용을 목표로 한다. 적중률은 실행 결과이며 이 규격은 적중을 보장하지 않는다. [OpenAI 공식 캐싱 문서](https://developers.openai.com/api/docs/guides/prompt-caching).

## 2. 메시지 조립 규칙

ModelInput.instructions와 data_messages의 공통 타입·권한은 변경하지 않는다. OpenAI 어댑터에서 다음 순서의 제공자 입력으로 변환한다.

| 순서 | 제공자 role/content | 내용 | 경계 |
| ---: | --- | --- | --- |
| 1 | developer / input_text | 완성된 instructions: 베이스·출력 필드 안내·해당 실행 경로의 공통 게임 지침 | A |
| 2 | user / input_text | 인물 데이터 접두문 + 직렬화한 PersonaView | B |
| 3 | user | 선별된 style_examples; 없으면 메시지 생략 | 없음 |
| 4 | user | 이번 요청의 context. recent_turns 제외 | 없음 |
| 5 | user | 선별된 identity_reminder; 없으면 메시지 생략 | 없음 |
| 6 | user/assistant | 확정된 최근 최대 6발화, 원래 시간순 | 없음 |
| 7 | user | 현재 플레이어 입력 원문, 정확히 한 번 | 없음 |

- 1번을 developer 메시지로 옮기고 최상위 instructions는 생략한다. 같은 지침을 두 채널에 중복 전송하지 않는다. instructions 문자열의 내용은 보존한다.
- 전체 출력 스키마는 기존 text.format에 유지한다. 베이스 본문에는 필드 안내만 둔다. 스키마를 A의 텍스트에 복사하지 않는다.
- PersonaView의 필드 선별·성격 변환·목표/관계의 context 배치는 상위 명세를 따른다. persona의 내용은 user 데이터이며 developer로 이동하지 않는다.
- 공통 지식도 context에 유지한다. 게임 생성기의 초기 context와 실시간 context는 필드별 현재 값으로 합쳐 4번에 한 번만 전달한다. unknown·현재 금기·빈 행동 목록을 캐시를 위해 삭제하지 않는다.
- 초기 context에서는 해당 NPC의 인지 선필터를 통과한 common_knowledge만 기본값으로 사용한다. canon_context·관찰·기억·knowledge·allowed_actions는 현재 스냅샷/로컬 선별 결과를 사용한다. 현재의 null/unknown/빈 배열도 이전 값보다 우선하며, 필수 현재 필드 누락은 context_unavailable로 처리한다. 초기 관계/행동으로 대체하지 않는다.
- style_examples와 identity_reminder는 선별 결과에 따라 매 요청 바뀔 수 있다. B에 포함하지 않는다. 최근 대화나 요약을 적중 때문에 이전 값으로 고정하지 않는다.
- 기본 모델의 persona별 말투는 PersonaView에 둔다. 새 인물별 developer 지침을 추가하지 않는다. 기존 실행 경로에 꼭 필요한 높은 지침은 1번의 실제 내용으로 보존하고 변경 시 A도 갱신한다.

## 3. 요청 옵션과 경계 생성

### 3.1. 기본 모델 및 등록된 명시적 지원 모델

OpenAI 모델 프로필에 explicit 지원이 등록된 모델만 이 경로를 사용한다. 기본 gpt-6-luna 프로필은 explicit으로 지정한다. 알 수 없는 사용자 입력 모델은 3.2의 호환 경로를 사용하며 모델을 자동 교체하지 않는다.

| 요청 위치 | 값 |
| --- | --- |
| prompt_cache_options.mode | explicit |
| prompt_cache_options.ttl | 30m |
| input[0].content[0].prompt_cache_breakpoint | mode=explicit; A의 길이 조건 충족 시 |
| input[1].content[0].prompt_cache_breakpoint | mode=explicit; B의 길이 조건 충족 시 |
| prompt_cache_key / prompt_cache_retention / prewarm | 전송하지 않음 |
| reasoning / max_output_tokens / text.format | 해당 모델·비용·출력 계약의 기존 값. 캐싱 때문에 변경하지 않음 |

A는 공통 developer 메시지 끝까지, B는 그 뒤 persona 메시지 끝까지의 누적 앞부분이다. 최소 길이 1,024토큰 조건은 persona 단독 길이가 아니라 각 경계까지의 재사용 가능한 앞부분에 적용한다. A가 짧아도 B가 충족하면 B만 둔다. 둘 다 짧으면 표식을 두지 않고 explicit 요청으로 정상 생성한다. 길이를 맞추기 위한 문구 추가는 금지한다. [공식 경계·길이 규칙](https://developers.openai.com/api/docs/guides/prompt-caching).

등록 모델의 정확한 토크나이저로 해당 경계까지의 공개 입력을 계측한다. 내부 시스템 토큰을 추정해 더하지 않는다. 계측이 불가능하면 A/B 표식을 그대로 보내되 길이 판정은 unknown으로 남긴다. 제공자의 실제 usage를 적중 근거로 사용한다.

### 3.2. 구형 및 미등록 모델의 호환 경로

- gpt-4.1/mini·gpt-4o-mini와 캐시 기능 미등록 모델은 현재의 최상위 instructions + input 형식을 유지한다. 명시적 경계·prompt_cache_options·강제 보존 설정은 보내지 않는다.
- prompt_cache_key 지원이 등록된 구형 모델에는 `anpc:dialogue:<prompt_version>:<schema_digest>`를 보낸다. schema_digest는 출력 스키마의 안정된 직렬화에 대한 SHA-256 소문자 16진 문자열이다. NPC·세션·턴·시각·API 키·사용자 발화는 키에 넣지 않는다.
- 키는 같은 프롬프트/스키마에서 NPC를 교체해도 유지한다. 개인 키로 직접 연결하는 현재 구조에서는 요청을 사용자별 서버 버킷으로 분할하지 않는다.
- 옵션 거부 시 기존 provider_rejected로 종료한다. 옵션 제거 후 자동 재호출은 하지 않는다. 모델 프로필 수정은 다음 사용자 요청부터 적용한다.

### 3.3. 기억 요약

memory_consolidation은 이번 명시적 캐싱 대상에서 제외한다. 기존 instructions·memory_summary 스키마·전체 종료 세션 입력을 유지한다. 별도 예열/길이 확장/대사 캐시 키 재사용 없음. 제공자가 반환한 사용량은 대사와 같은 방식으로 정산하고 요청 종류만 분리한다.

## 4. 로컬 직렬화와 갱신

- PersonaView와 출력 스키마는 JSON 객체 키를 UTF-8 바이트 오름차순으로 재귀 정렬해 공백 없는 JSON으로 직렬화한다. 배열의 순서는 보존한다. 한글은 그대로 UTF-8로 기록하며 줄바꿈·따옴표·역슬래시·제어문자만 JSON 규칙대로 이스케이프한다.
- 베이스 문자열은 읽은 원문을 보존한다. 요청마다 trim·줄바꿈 치환·문구 재정렬을 하지 않는다. 첫 조립 결과를 재사용한다.
- 로컬에는 실행 경로의 공통 지침과 현재 유효 NPC의 persona 직렬화만 보관한다. 조회 식별은 실행 프롬프트 버전과 최종 전송 문자열의 SHA-256으로 한다. 콘텐츠 revision은 재투영 판단에만 사용하고 모델 본문에 추가하지 않는다.
- API 키/연결 교체 시 개발 진단의 응답 비교 id를 폐기한다. 로컬 공통 문자열 재사용 여부와 제공자 캐시 적중 여부는 별도로 판단한다.

| 사건 | 로컬 처리 | 다음 요청 |
| --- | --- | --- |
| 같은 NPC·같은 전송 persona | B 문자열 재사용 | A/B 동일, 새 뒷부분 생성 |
| NPC 교체·군중 인스턴스 교체 | 현재 persona 캐시 교체, 이전 비교 id 폐기 | 새 B, 해당 NPC 기억만 전송 |
| 성격/말투/배경/인지 투영 변경 | persona 재검사·직렬화 | 변경된 B; A는 같으면 유지 |
| 베이스·공통 게임 지침 변경 | 지침 캐시 교체, 비교 id 폐기 | 새 A/B |
| 모델·추론 설정·출력 스키마 변경 | 계측 재수행, 비교 id 폐기 | 새 요청 설정; 모델 간 적중 기대 없음 |
| 관찰·관계·퀘스트·지식·행동·요약 변경 | context 다시 생성 | B 뒤에 즉시 새 값 반영 |
| 오래된 발화 제외·새 발화 추가 | 최근 창 다시 생성 | 최대 6발화 유지 |
| 저장 로드·세션 종료 | 이전 응답 비교 id 폐기, 기억 정책대로 복원/정리 | 복원된 현재 사실·해당 NPC 기억 사용 |

로컬 캐시를 폐기해도 제공자 캐시 삭제를 뜻하지 않는다. store:false·ttl과 제공자 데이터 보존의 관계는 [공식 데이터 정책](https://developers.openai.com/api/docs/guides/your-data)을 따른다.

## 5. 사용량 전달과 정산

대사 검증·취소·맥락 변경에 따른 출력 폐기 전에 반환된 usage를 수집한다. 표시하지 않은 대사도 실제 생성 비용에는 포함한다. 미제공 값은 null이며 0으로 대체하지 않는다.

| API 응답 | 전달 위치 |
| --- | --- |
| usage.input_tokens / output_tokens | 기존 공통 Usage와 비용 원장 |
| usage.input_tokens_details.cached_tokens | 기존 Usage.cached_tokens |
| usage.input_tokens_details.cache_write_tokens | OpenAI 어댑터 내부 과금 기록의 cache_write_tokens; 공통 Usage에 임의 필드 추가 없음 |
| id / prompt_cache_diagnostics | 개발 진단 상태; 게임 기억·대사·저장 데이터 제외 |

어댑터 내부 과금 기록은 요청 식별·요청 종류·모델·입력/출력/읽기/쓰기 토큰·소요 시간·설정 버전으로 구성한다. 네이티브 요청도 파서 → 완료 큐 → 비용/진단 소비자까지 이 기록을 전달한 뒤 Release한다. 문자열 원문이나 응답 JSON 전체를 로그에 남기지 않는다.

입력 토큰 I, 읽기 R, 쓰기 W가 유효하고 R+W≤I이면 일반 입력 U=I−R−W로 정산한다. 입력 비용은 U×일반 단가 + R×읽기 단가 + W×쓰기 단가다. 출력 비용은 별도 합산한다. 과금 범주의 배타성은 [공식 요금표](https://developers.openai.com/api/docs/pricing)를 따른다.

- 구형 모델처럼 별도 쓰기 과금이 없는 등록 프로필은 W를 정산상 0으로 처리한다. 제공된 원시 값은 보존한다.
- 필요한 I/R/W가 누락되거나 음수·잘못된 타입·R+W>I이면 확정 정산하지 않는다. 관측 입력에 대해 적용 가능한 최고 단가로 보수 추정하고 미확정 표시한다. 입력 총량도 없으면 기존 예약액을 미확정으로 유지한다.
- 요청 예약은 읽기 적중 0을 가정하고 일반/쓰기 중 높은 입력 단가와 기존 최대 출력으로 산정한다. 상세 한도·재시도·로드 후 원장 유지 정책은 [비용 규격](api-cost-specification.md)을 따른다.
- 화면 사용량은 입력·출력·캐시 읽기 토큰을 표시한다. 쓰기 과금 모델은 쓰기 토큰과 비용의 확정/추정 상태도 표시한다. 적중이 0이어도 오류 안내를 띄우지 않는다.

## 6. 진단 모드

개발 진단 기본값은 꺼짐이다. 켰을 때만 같은 연결·모델·요청 종류·유효 NPC의 직전 완료 응답 id 하나를 메모리에 보관하고 다음 대사 요청의 prompt_cache_options.comparison_response_id에 넣는다. 첫 요청·NPC 교체·로드·연결/모델/베이스/스키마 변경 후에는 생략한다. 공식 지원이 등록된 모델만 진단 옵션을 전송한다. [공식 진단 문서](https://developers.openai.com/api/docs/guides/prompt-caching/diagnostics).

- 기록 항목은 type·reason·comparison_reusable_tokens·cache_missed_tokens·실제 읽기/쓰기량이다. 미제공 필드는 null로 남긴다.
- unavailable·comparison_response_not_found는 진단 미측정으로 처리한다. 정상 대사의 표시/행동 검사를 방해하지 않는다.
- 진단 id는 대화 이력 조회에 사용하지 않는다. 기본 실행에서는 비교 id를 보내지 않으며, 별도 진단 요청·유료 재시도·예열도 만들지 않는다.

## 7. 적용할 코드 경로

아래는 후속 구현의 필수 변경 위치다. 이번 문서 개정에서는 파일을 변경하지 않았다.

| 경로 | 구현할 규칙 |
| --- | --- |
| prototype/public/core.js | 기존 의미 조립 유지, persona/스키마 결정적 직렬화. 실행 투영 변경 시 PROMPT_VERSION 갱신 |
| prototype/public/api-models.js | 모델별 explicit·키·진단 지원 프로필 등록. 미등록은 호환 경로 |
| prototype/openai.js | 2·3절의 요청 변환, usage 보존, 내부 과금 기록과 선택 진단 처리 |
| prototype/server.js·public/app.js·public/compare.js | 사용량 전달/표시와 진단 상태 수명 연결. 플레이어 입력을 developer로 이동하지 않음 |
| scripts/build-cet-prompts.mjs → game/cet/anpc/prompts.lua | 지침·persona·초기 context를 구분해 생성. 현재의 역할 없는 messages 목록에서 persona 경계를 추측하지 않음 |
| game/cet/anpc/bridge.lua | 동일 모델별 정책으로 요청 조립. 초기/현재 context 통합, A/B 표식, 최근 대화와 현재 입력 유지 |
| game/native/src/Provider.hpp·Provider.cpp | 읽기/쓰기 사용량과 선택 진단 결과 추출. 대사 유효성과 과금 계측 분리 |
| game/native/src/HttpWorker.hpp·HttpWorker.cpp·Main.cpp | 완료 큐와 게임 스레드까지 사용량 전달. 결과 Release 전에 계측 소비, 게임 스레드에서 통신 대기 없음 |
| prototype/game-bridge.js | 개발 파일 브리지도 같은 OpenAI 옵션·사용량 정책 적용 |

공통 ModelInput/Usage 타입을 확장하지 않고 제공자 변환과 내부 과금 기록으로 구현한다. 향후 공통 원장 포트에 새 타입이 필요하면 별도 계약 개정으로 스키마·포트·예시를 함께 갱신한다.

## 8. 수용 기준

| 확인 대상 | 통과 조건 |
| --- | --- |
| 기본 요청 | developer 베이스 한 번·user persona 한 번, explicit/30m, 적격 A/B 표식만 존재 |
| 짧은 앞부분 | A 미달/B 충족이면 B만; 둘 다 미달이면 표식 없음. 입력 확장·추가 요청 없음 |
| 권한과 정체성 | 기존 지침 내용·데이터 권한·출력 스키마·선별·unknown 제한 보존 |
| 갱신 | 같은 persona의 B 동일. NPC/성격 변경은 B 변경, 현재 관찰/기억 변경은 context에 즉시 반영 |
| 구형/미등록/요약/Codex | 각 경로에서 금지된 옵션 없음. 지원 프로필의 구형 키는 턴/NPC 교체에도 동일 |
| 정산 | 누락/null/0 구분, 읽기/쓰기/일반 입력 중복 없음. 출력 폐기 후에도 비용 기록 유지 |
| 진단 | 기본 꺼짐, 켰을 때만 직전 적합 id 비교. 진단 미측정으로 대사 실패 없음 |
| 게임 회귀 | UF-21/22/25의 단일 요청·현재 조건 검사, UF-23/24 취소, UF-54/55 로드 후 폐기, UF-57/58 오류 정책 유지 |

실제 API 검증은 반복 대화에서 읽기 사용량이 관측되는지 확인한다. 모든 요청의 적중이나 특정 절감률을 필수 조건으로 두지 않는다. implicit 기준의 비용·지연 대조를 출시 검증에 포함한다. 비스트리밍 완료 지연을 TTFT로 표시하지 않는다.
