# 프롬프트 캐싱 참고 분석

확인일: 2026-10-05. 대상: 주 작업 폴더 anpc-cyberpunk-2077. 적용 정책은 [프롬프트 명세의 하위 캐싱 규격](prompt-caching-specification.md), 후속 작업은 [개발·검증 계획](development-validation.md#프롬프트-캐싱-적용-계획)을 따른다. 아래 코드 근거는 확인 시점의 작업 트리이며 실제 API 적중 결과가 아니다.

## 1. 공식 근거와 프로젝트 판단

입력 앞부분의 정확한 일치가 재사용의 기준이다. 현재 베이스 → 인물 → 상황 배치는 A/B 재사용에 유리하지만, 상황 변경 뒤의 최근 대화까지 재사용된다고 기대할 수는 없다. [이전 모델 대상 공식 Cookbook](https://developers.openai.com/cookbook/examples/prompt_caching_201)은 고정 직렬화·스키마와 가변 정보의 후방 배치를 설명한다. 이 자료는 보관된 이전 모델용이므로 최신 설정의 기준으로 사용하지 않는다.

GPT-5.6 이후에는 explicit 경계를 선택할 수 있고, implicit은 변경되는 마지막 입력까지 쓰기 대상으로 삼을 수 있다. 프로젝트는 현재 상황과 짧은 최근 대화를 다시 조립하므로 기본 대사 경로에 A/B 두 경계의 explicit 방식을 채택한다. 상황·공통 지식·예시·기억은 B 뒤에 두고, 요약과 구형 모델은 호환 경로를 유지한다. implicit 비교는 이 결정의 비용·지연 검증이다. 절감 효과는 아직 실측하지 않았다. [최신 캐싱 가이드](https://developers.openai.com/api/docs/guides/prompt-caching).

읽기 할인만으로 이득을 계산하지 않는다. gpt-6-luna의 읽기·쓰기 단가 비율을 각각 일반 입력의 0.1·1.25로 놓으면 동일 고정 토큰을 한 번 쓰고 한 번 전부 읽는 입력 비용은 일반 처리 두 번의 2 대비 1.35다. 부분 적중·만료·다른 기계로 라우팅·가변 입력·출력 비용은 이 계산 밖이며, 전체 대화 비용 절감률로 환산하지 않는다. [공식 요금표](https://developers.openai.com/api/docs/pricing).

## 2. 현재 구현과 계측 공백

| 확인한 파일 | 현재 근거 | 적용 판단 |
| --- | --- | --- |
| [웹 프롬프트 조립](../prototype/public/core.js) | 베이스는 instructions, persona는 첫 user 메시지. 선택 예시가 context 앞에 위치 | A/B 뒤의 예시·상황 변경은 수용; 예시를 적중 때문에 고정하지 않음 |
| [웹 OpenAI 어댑터](../prototype/openai.js) | Responses API, store:false, 구조화 출력. 캐시 옵션 없음. usage는 입력/출력/추론만 추출 | 캐싱 자동 동작 가능성과 계측 구현 여부를 구분; 캐시 읽기/쓰기 정보 보존 필요 |
| [게임 전송 조립](../game/cet/anpc/bridge.lua) | character.instructions와 고정 messages 뒤에 현재 게임 데이터·최근 발화·입력 추가 | 명시 경계 적용을 Lua 요청 경로에도 반영해야 함 |
| [게임 프롬프트 생성기](../scripts/build-cet-prompts.mjs) | 인물 데이터와 초기 context를 묶은 메시지를 생성하고 게임 공통 지침 추가 | context 메시지 전체를 B에 묶지 말고 실제 고정 전송 내용을 구분해야 함 |
| [네이티브 응답 파서](../game/native/src/Provider.cpp) | 입력/출력 토큰만 보존. [로컬 결과형](../game/native/src/Provider.hpp)에 캐시 토큰 없음 | 웹만 개선해서 게임 적중·정산이 구현됐다고 판정할 수 없음 |
| [공통 계약](../contracts/v1/module-contracts.schema.json) | Usage.cached_tokens는 이미 integer/null 허용. 쓰기량은 정의되지 않음 | 읽기량은 기존 계약 활용, 쓰기/진단 필드는 제공자 계측과 공통 계약의 경계 검토 |
| [기존 토큰 추정](../prototype/artifacts/prompt-token-estimate.json) | prompt_version 0.13, gpt-4.1-mini, 로컬 계측, 베이스 1,749토큰, 외부 호출 0 | 당시 베이스 길이의 참고만 가능; 현재 0.16·gpt-6-luna의 적중/길이/비용 근거 아님 |

고정 메시지를 인물마다 보관하는 로컬 방식 자체는 문제로 단정하지 않는다. 실제 API에 전송한 베이스·스키마·모델 설정이 같아야 공통 A를 재사용할 수 있다. NPC별 인지 결과·군중 신원·단계 조건의 차이를 공유 지식이라는 이름으로 제거하지 않는다.

## 3. 진단 도구와 이번 작업의 한계

공식 진단은 GPT-5.6 이후 지원 모델의 Responses API 비교 기능이다. `comparison_response_id`는 과거 대화를 불러오는 옵션이 아니다. 결과의 reason과 실제 usage를 함께 봐야 한다. [공식 진단 문서](https://developers.openai.com/api/docs/guides/prompt-caching/diagnostics).

현재 세션에는 직접 호출할 캐싱 진단 전용 도구가 노출되지 않았고, 확인한 어댑터는 진단에 필요한 응답 id/진단 결과를 보존하지 않는다. 이번에는 API 호출·어댑터 변경·예열을 실행하지 않았다. 계정별 모델 지원·진단 기록 가용성·보존 설정·실제 적중률·TTFT·비용 절감은 후속 측정 대상이다.

`store:false`를 캐싱 비활성이나 즉시 삭제 보장으로 해석하지 않는다. 보존은 연결 계정과 모델의 데이터 정책을 별도로 확인한다. [공식 데이터 제어 문서](https://developers.openai.com/api/docs/guides/your-data).
