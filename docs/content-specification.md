# 콘텐츠 데이터 규격

규격 버전: 0.2 (2026-10-01). 콘텐츠 파일은 UTF-8 JSON으로 저장한다. 이 문서는 인물·세계관·반응 규칙의 기준이며 게임 상태는 [게임 정보 규격](game-context-specification.md), 응답 객체는 [통신 규격](runtime-specification.md)을 따른다.

정체성 구조 버전: 1.0 확정 (2026-09-30). 아래 정체성 구성과 군중 조합 계약을 개발 기준으로 고정한다. 구조 변경은 버전 변경과 이전 생성 데이터 처리 정책을 함께 명시한다. 콘텐츠 객체의 schema_version과 정체성 구조 버전은 별개다. 현재 시제품이 이 계약을 모두 구현했다는 의미는 아니다.

### 공통 정체성 구성

| 구성 | 커뮤니티 NPC | 군중 NPC | 변경 기준 |
| --- | --- | --- | --- |
| 생활 배경·원형 | 원작 근거로 작성한 인물 배경 | 관찰 조건에 맞는 승인 원형과 창작 배경 범위 | 카드 개정 또는 생성 데이터 무효화 |
| 성격·핵심 가치 | 작성·검수한 인물의 고정 정체성 | 기질·핵심 가치·대인 태도에서 각각 1개씩 추첨 | 유효한 동일 생성 데이터에서 고정 |
| 구체적인 판단 규칙 | 원작 근거로 작성한 상황별 선택 기준 | 원형과 특성 조합에 맞는 승인 규칙 | 정체성 규칙은 고정, 적용 상황은 매 턴 계산 |
| 말투·대화 예시 | 한국어 원작 문체와 검수한 예시 | 원형·특성에 맞는 작성 문체와 예시 | 문체는 고정, 관련 예시만 매 턴 선별 |
| 현재 목표·상태 | 원작 단계·현재 관찰로 계산 | 원형의 승인 목표와 현재 관찰로 계산 | 현재 상황에 따라 갱신 |
| 지식·관계·기억 | 원작 인지·관계 조건과 유효 대화 기억 | 승인 지식·플레이어 태도와 인스턴스 기억 | 인지·공개·기억 계약에 따라 갱신 |

정체성은 위 구성 전체로 표현한다. 3개 슬롯은 군중의 성격을 조합하는 재료이며 배경·판단 규칙·말투를 대체하지 않는다. 커뮤니티 NPC에는 슬롯 수 제한과 무작위 추첨을 적용하지 않는다. 감정·대화 태도·현재 목표의 변화는 핵심 가치 변경과 구별한다.

## 1. 공통 데이터 계약

모든 콘텐츠 객체에 schema_version, id, revision, kind를 필수로 둔다. schema_version은 현재 "0.1", id는 패키지 내 고유한 문자열, revision은 1 이상의 정수다. 다른 객체는 ID로 참조한다. 참조 누락·중복 ID·지원하지 않는 버전은 해당 패키지 로드를 거부한다. 자유 텍스트에는 코드 실행, 파일 경로 실행, 게임 명령 실행 권한이 없다.

kind는 character_card, crowd_archetype, world_fact, knowledge_entry, reaction_rule, dialogue_example 중 하나다. 원작 사실은 출처가 있는 world_fact로만 등록한다. 창작 배경과 인물의 해석은 원작 사실과 별도로 저장한다.

저장 위치·지식 층·인물별 배분은 [NPC 세계관 지식 부여 규격](npc-knowledge-specification.md)을 따른다. 현재 자료 묶음과 조사 상태는 [대표 인물 조사](community-npc-catalog.md)에 둔다. source_checked는 출처 진술을 확인한 상태이며 출시용 approved를 대신하지 않는다. 카드·규칙·예시·인지 조건이 draft이면 런타임에 제공하지 않는다.

## 2. 커뮤니티 캐릭터 카드

| 필드 | 형식 | 의미 |
| --- | --- | --- |
| character_key | 문자열 | NPC 식별 규격의 고유 인물 매핑 |
| identity | 객체 | 핵심 신념·욕구·두려움·금기·자기 인식. 필수 |
| goals | 조건부 목표 목록 | 현재 단계에서 추구하는 목적과 우선순위 |
| relationships | 관계 목록 | 대상 키, 인물의 태도, 적용 조건 |
| voice_style | 객체 | 말 길이, 어휘, 호칭, 문체, 금지 표현 |
| dialogue_conditions | 조건 객체 | 대화 가능한 퀘스트·활동 상태 |
| knowledge_ids | ID 목록 | 인물이 접근할 지식 항목 |
| forbidden_claims | 규칙 목록 | 원작 충돌·스포일러·인물이 할 수 없는 주장 |
| action_policy | 객체 | 허용 행동 ID, 금지 행동 ID, 조건부 선호 |
| reaction_rule_ids | ID 목록 | 장비·평판·관계·상황 반응 규칙 |
| example_ids | ID 목록 | 상황별 대사·판단 예시 |
| fallback_lines | 객체 | unknown, unavailable_action, declined의 작성된 안전 대사. 각각 필수 문자열 |
| source_ids | 사실 ID 목록 | 정체성과 관계의 원작 근거 |
| lived_context | 선택 객체 | 직업·생활 관심·당면 문제·일상 소재. 원작 근거와 창작 생활 설정을 구분 |
| speech_rules | 선택 객체 | 직업 어휘·화제 전환·설명 수준·은어 밀도·유머/욕설 한도 |
| identity_rules | 목록 | 상황 조건·가치 우선순위·금지 선택·원작 근거·승인 상태를 가진 판단 기준. 정체성 구조 1.0 출시 카드에 필수 |
| identity_anchor | 선택 객체 | core_values, hard_limits의 짧은 작성 요약. 승인된 identity에서만 유도 |
| presentation | 선택 객체 | 화면에서만 사용하는 인물 역할·정체성 슬롯 표시 요약 |

핵심 정체성은 모델이 수정하지 않는다. 목표·관계·지식은 작성된 상태 조건에 따라 변경한다. 카드가 금지한 행동은 모델의 의도나 플레이어 요청으로 해제하지 않는다. 행동 선호는 권한이 아니며 현재 허용 목록 안에서만 작동한다.

정체성 구조 1.0을 적용하는 출시용 커뮤니티 카드에는 승인된 배경, identity, identity_rules, voice_style, example_ids, 목표·관계·지식 조건과 대체 대사가 준비되어야 한다. identity_rules와 예시의 승인·근거 조건은 5절을 따른다. 누락된 원작 정체성을 무작위 특성으로 보충하지 않는다. 주디·팬앰의 현재 작성 초안과 기존 시제품 카드가 출시용 계약을 충족한다고 간주하지 않는다.

확장 필드는 선택 사항이며 기존 카드도 유지한다. 누락된 lived_context를 유명 인물의 새 원작 과거로 채우지 않는다. 창작 생활 설정은 창작 표시·변경 가능 범위를 가지고 원작 증거로 사용되지 않는다. speech_rules와 voice_style의 공통 항목은 정규화 시 voice_style로 합쳐 중복 전송하지 않는다. 군중 원형에도 이 두 선택 필드를 둘 수 있다.


presentation.role은 짧은 역할 문자열, presentation.identity_slots는 identity의 목록 키를 참조하는 객체다. 각 값은 비어 있지 않은 짧은 문자열 목록이며 원본 카드에 있는 정체성을 요약한다. 새 성격·경험·관계를 추가하지 않는다. 없는 슬롯은 identity 원문을 표시하고 새 identity 목록 키도 같은 방식으로 확장한다. presentation은 화면 전용이며 생성 프롬프트·판단 규칙·지식 권한·승인 상태를 바꾸지 않는다. 조사 초안의 표시 요약도 초안 상태를 유지한다.

### 플레이어 고정 신원

주인공의 이름 기준은 world-facts.json의 PLAYER_V 한 곳에 저장한다. 이 world_fact의 player_identity는 character_key와 display_name을 포함하며 현재 값은 v와 V다. manifest.player_identity_fact_id로 참조한다. 이 값은 군중 추첨·인물 카드 교체·질문 프리셋·사용자 발화로 바꾸지 않는다. 테스트 입력·화면 호칭·생성 문맥은 같은 기준을 사용한다. 다른 이름을 말한 발화는 player_claim 또는 별칭으로만 남긴다.

NPC가 이름을 알고 있는지는 별도 name_known_by_npc로 명시한다. 고정 신원은 이름 인지·친밀 관계·본명·성별·출신·렐릭 인지의 근거가 아니다. 인지가 확인되지 않으면 이름 호칭을 사용하지 않는다. 이름 인지의 실게임 근거는 게임 정보 계층이 제공한다.

## 3. 군중 원형과 생성 특성

crowd_archetype에는 적용 지역·활동·관찰 소속 조건, 가중치, trait_pools, compatibility_rules, default_traits, background_bounds, voice_styles, identity_rules, example_ids, action_policy, knowledge_ids, fallback_lines를 둔다. 원형은 작성·승인된 콘텐츠이며 온라인 LLM이 매번 생성하지 않는다. fallback_lines는 커뮤니티 카드와 같은 필수 대체 대사 구조다. 적용 가능한 원형이 없으면 승인된 기본 시민 원형을 사용하고 관찰되지 않은 직업·소속은 부여하지 않는다.

### 3.1. 고정된 특성 슬롯

trait_pools는 다음 세 키만 갖는다. 각 후보는 trait_id, weight, identity_effects, rule_ids, voice_constraints를 포함한다. weight는 유한한 양수이고 참조는 유효해야 한다. 예시는 후보의 의미를 설명하며 확정된 전체 후보 목록이 아니다.

| 슬롯 키 | 의미 | 후보 예시 |
| --- | --- | --- |
| temperament | 기질과 반응 속도·강도 | 신중함, 다혈질, 느긋함 |
| core_value | 주요 가치와 선택 동기 | 생계, 독립, 의리, 안정 |
| social_attitude | 낯선 사람을 대하는 기본 태도 | 경계, 사교적, 무심함 |

추첨 결과 traits는 세 키마다 trait_id 한 개를 저장한다. 한 슬롯에서 여러 개를 뽑거나 같은 ID를 슬롯 간 중복 적용하지 않는다. 직업·지역·현재 목표·관심사·숨은 원작 정보는 이 세 슬롯의 값으로 추첨하지 않는다. 원형에 승인된 배경·관심사를 별도로 둘 수 있다.

### 3.2. 조합과 생성 계약

1. 첫 대화 준비 시 관찰 조건을 만족하는 원형을 가중치로 선택한다. 필수 관찰이 unknown이면 그 조건부 원형을 제외한다.
2. 원형의 세 슬롯에서 각각 한 후보를 포함하는 조합을 만든다. compatibility_rules가 금지한 조합, 원형·관찰과 모순되는 조합, 필요한 판단 규칙·문체가 없는 조합을 제외한다.
3. 유효 조합의 가중치는 세 후보 weight의 곱이다. 조합은 슬롯 키 순서와 trait_id 순서로 정렬한 뒤 seed 기반 추첨으로 하나를 선택한다. 임의 재추첨을 반복하거나 별도 LLM 호출로 모순을 고치지 않는다.
4. 유효 조합이 없으면 같은 원형의 검수된 default_traits를 사용한다. default_traits도 같은 조건·정체성 검사를 통과해야 한다. 기본 조합마저 잘못된 원형은 로드를 거부하고 승인된 기본 시민 원형을 사용한다. 기본 시민 원형도 유효하지 않으면 대화를 시작하지 않는다.
5. 승인된 원형과 선택 특성을 합쳐 identity·판단 규칙·말투·예시 후보를 로컬에서 정규화한다. 배경의 금기 → 원형의 금기 → 특성의 금지를 합쳐 적용하고 금지는 선호보다 우선한다. 나머지 규칙의 우선순위는 5절을 따른다. 문체 충돌은 compatibility_rules로 사전에 제외한다.
6. persona_id, npc_instance_key, archetype_id와 revision, content_version, identity_structure_version, generator_version, seed, traits, background, identity, identity_rules, voice_style, example_ids를 저장한다. identity_structure_version은 "1.0"이다. 같은 입력·콘텐츠 버전·생성기 버전·seed에서는 같은 생성 데이터를 구성한다.

compatibility_rules는 금지 trait_id 집합과 적용 조건으로 표현한다. 대립하는 요소를 무조건 제거하지는 않는다. 승인된 갈등 해소 기준이 있는 복합 성격은 허용한다. 예를 들어 생계를 중시하는 신중한 인물에게 위험을 감수할지 여부는 작성된 판단 규칙이 결정한다. traits는 그 규칙의 대체물이 아니다.

### 3.3. 유지와 무효화

대화와 유효한 같은 npc_instance_key의 재접촉에서는 원래 생성 데이터를 재사용한다. 턴마다 추첨하지 않으며 플레이어의 장비·평판·새 발화로 슬롯을 바꾸지 않는다. 현재 목표·감정·플레이어 태도는 상황·반응 규칙으로 바뀔 수 있다. 저장·만료·소멸·용량 제한과 재접촉 범위는 [NPC 식별 규격](npc-identity-specification.md)이 기준이다.

생성 데이터가 무효화된 뒤 새로 등록한 군중은 새 생성 대상으로 취급한다. 외형이나 레코드가 같다는 이유로 이전 정체성을 복원하지 않는다. 콘텐츠 개정 중 유효한 세션은 기존 버전을 유지하고, 이전 버전을 사용할 수 없으면 세션을 종료·무효화한 뒤 새로 등록한다. 대화 중 조용히 새 성격으로 교체하지 않는다.

개인 배경은 창작으로 표시하고 유명 인물과의 관계·원작 사건 참여·퀘스트 비밀을 임의로 생성하지 않는다.

## 4. 세계관 사실과 인물 지식

| 객체 | 필수 필드 | 규칙 |
| --- | --- | --- |
| world_fact | statement, source, validity_condition, spoiler_scope | source는 자료 위치·식별자와 근거 요약을 포함 |
| knowledge_entry | fact_id, domain_id, required_depth, access_condition, certainty, interpretation, disclosure | 인물의 인지·해석·공개 여부와 설명에 필요한 깊이를 표현 |

조건은 all/any/not과 등록된 상태 필드의 eq/in/gte/lte만 허용한다. 리프 조건은 field, op, value로 표현하고 all·any는 조건 배열, not은 단일 조건을 값으로 가진다. 빈 all·any는 거부한다. 임의 스크립트는 허용하지 않는다. 필드가 unknown이면 해당 조건은 충족되지 않으며 not으로 뒤집어 허용하지도 않는다. 필수 공개 조건이 없거나 모호한 퀘스트 사실은 기본적으로 비공개다.

certainty는 knows, suspects, unaware다. disclosure는 public, evasive, withheld다. knows는 출처와 인지 조건이 모두 맞아야 한다. suspects는 추측임을 드러내며, unaware 항목의 실제 사실은 프롬프트에 넣지 않는다. 인물의 interpretation은 사실 자체를 수정하지 않는다. 같은 사건을 두 인물이 다르게 판단할 근거는 identity와 interpretation에 저장한다.

사실에는 역할·지역·화제 태그와 usage_mode를 색인용으로 추가할 수 있다. usage_mode는 background(생활 표현 배경), answer(직접 답할 지식), restricted(조건부 공개)다. 태그는 access_condition을 대신하지 않는다. 매 턴 출처 원문 전체 대신 fact_id·최소 진술·확실성·인물 해석·주장 한도만 전송하고 원래 출처는 로컬 검수 자료에 보존한다.

### 4.1. 인물별 분야와 지식 깊이

카드의 `knowledge_profile`은 `version`, `default_depth`, `exposure_background`, `domains`, `response_rules`를 포함한다. 출신·직업·소속·직접 경험에서 얻은 인지 범위를 정체성의 신념·말투와 구분한다. `exposure_background`는 출처 있는 배경 요약·생활/업무 맥락·evidence_refs·provenance를 보관한다. 추정한 경험을 원작 배경으로 기록하지 않는다.

각 domains 항목은 `domain_id`, `depth`, `basis`, `evidence_refs`, `rationale`, `review_status`를 가진다. `basis`는 source_role(자료에서 확인한 역할을 기반으로 작성), authored_candidate(인지 검수 전 작성 후보), unverified(개인 인지 근거 미확보)다. source_role에도 개별 사실·실무 경험의 인지 검수는 필요하다. 분야의 승인 상태와 해당 지식의 인지·공개 조건을 함께 확인한다. unverified의 깊이는 unknown이다.

| depth | 허용하는 범위 |
| --- | --- |
| unknown | 개인 인지 근거가 부족함. 분야 사실을 주입하지 않음. 원작상 무지·처음 듣는 이름으로 확정하지 않음 |
| awareness | 근거가 있는 이름·존재의 인지. 개요·작동 원리·사용 경험으로 확대 금지 |
| familiar | 제공된 개요와 생활 수준의 설명. 실무 절차·직접 경험 창작 금지 |
| practical | 제공된 실무·이용 경험 범위. 전문 이론·미확인 교육/자격으로 확대 금지 |
| specialist | 제공된 전문 설명 범위. 전문직이라는 이유로 미등록 사실까지 생성 금지 |

미등록 분야는 `default_depth=unknown`으로 처리한다. knowledge_entry의 required_depth는 unknown을 제외한 깊이 중 하나이며, 해당 최소 진술을 설명하는 데 필요한 수준이다. 분야 상한이 required_depth 이상이어야 사실을 제공한다. 높은 수준의 사실을 자르지 않고 낮은 수준으로 표시하는 것은 금지한다. 이름만 인지하는 응답에는 별도 awareness 진술을 작성한다.

certainty는 사실에 대한 확실성, depth는 설명 가능한 범위, disclosure는 공개 가능성이다. unknown과 certainty=unaware를 동일시하지 않는다. 전자는 조사 근거 부족이고 후자는 근거에 따라 실제로 모르는 항목이다. 이 구조의 배분·갱신 규칙은 [NPC 지식 부여 규격](npc-knowledge-specification.md)이 기준이다.

## 5. 반응 규칙과 대사 예시

reaction_rule은 priority, condition, attitude_delta, topic_ids, action_preferences, prohibited_claims를 포함한다. 변화는 ANPC 대화 태도에만 적용하며 원작 관계·퀘스트 값을 변경하지 않는다. 규칙 적용 순서는 금기·지식 제한 → 단계별 목표·관계 → 장비·평판 반응 → 말투다. 같은 우선순위에서는 ID 순서를 적용하고 금지는 선호보다 우선한다.

dialogue_example에는 input, context_condition, expected_intent, sample_dialogue, preferred_actions, rationale을 둔다. sample_dialogue는 문체 참고이며 정답 문장을 항상 반복하도록 강제하지 않는다. 행동 선호에도 실행되지 않은 일을 이미 했다는 표현을 넣지 않는다.

### 5.1. 상황별 판단 기준과 근거

identity_rules는 trigger_tags, context_condition, value_priority, preferred_intent, prohibited_choices, evidence_refs, review_status를 포함한다. value_priority는 해당 상황에서 먼저 고려하는 카드의 가치 목록이다. 금지 선택은 게임의 행동 권한을 확장하지 않는다. 서로 충돌하면 금기·현재 단계의 목표·관계 제약을 우선한다. 모델에게 우선순위나 원작 관계를 재작성하게 하지 않는다.

evidence_refs는 원작 사실 ID와 장면 위치를 참조한다. 장면 자료에는 작품·언어·퀘스트/장면 식별자·발화 전후 상황·관계 조건·검수 요약을 둔다. 작성자의 정체성 해석을 실제 원작 사건과 구분한다. review_status는 draft 또는 approved다. 커뮤니티 인물의 새 규칙·요약은 approved이고 근거 참조가 유효할 때만 생성용으로 제공한다. 기존 카드의 필수 계약은 유지하지만 새 필드를 모델이 임의로 채우지 않는다.

identity_anchor는 고정 가치와 금기를 간결하게 표현한다. 현재 목표·플레이어와의 관계는 원작 상태 조건에서 별도로 얻는다. 요약에 새로운 성격·경험·관계를 추가하지 않는다. 군중은 승인된 원형과 처음 추출한 특성에서 요약을 만들고 재접촉 때 같은 값으로 유지한다.

### 5.2. 상황별 예시와 검색 메타데이터

dialogue_example에 character_keys, topic_tags, trigger_terms, required_fact_ids, review_status, provenance, evidence_refs를 선택 확장으로 둔다. provenance는 canon_excerpt, authored_adaptation, reviewed_adaptation, fictional_example 중 하나다. 실제 원작 발화, 검수 전 작성 예시, 원작 근거로 검수한 새 상황의 대사, 창작 인물 예시를 각각 구분한다. authored_adaptation은 draft이며 생성기에 제공하지 않는다. rationale과 evidence_refs는 검수용으로 보존하며 생성 입력에는 상황·입력·응답만 전달한다.

커뮤니티 인물의 새 예시는 character_keys에 현재 인물이 명시되고 approved이며 단계·관계 조건과 required_fact_ids의 공개 조건이 충족되어야 한다. 근거 없는 예시를 원작 예시로 표시하지 않는다. 군중 예시는 같은 원형·선택된 특성에 맞을 때만 사용한다. 예시는 이번 턴의 새 원작 사건·실제 행동 결과·기억으로 등록하지 않는다.

지식 항목에도 topic_tags와 trigger_terms를 색인 메타데이터로 둘 수 있다. 한국어 용어·별칭은 작성자가 등록한다. 지식 접근 계약은 4절이 기준이고 선별 순서는 프롬프트 명세를 따른다. 서비스·공개 코드와 학습 접근의 근거는 [캐릭터 정체성 벤치마킹 분석](character-identity-benchmark.md)에 둔다.

## 6. 프롬프트 조립 계약

콘텐츠 원본을 정규화한 persona, 인지·공개 조건을 통과한 지식과 현재 상황을 프롬프트 조립기에 전달한다. 고정 베이스, 메시지 배치, 정규화 필드, 턴별 규칙과 예산 처리는 [NPC 대사·행동 생성 프롬프트 명세](prompt-specification.md)를 기준으로 한다.

## 7. 기억 작성 규칙

기억 항목·출처·주장과 실행 결과의 구분·정리·조회는 [NPC 기억 규격](memory-specification.md)을 기준으로 한다. 기억 정리기는 승인 카드·세계관 사실·지식 깊이·인지·공개 조건을 수정하지 않는다. 기억이 원작 퀘스트나 관계·보상을 바꾸는 콘텐츠 권한을 만들지 않는다. 대상 식별과 근거리 재접촉 조건은 [NPC 식별 규격](npc-identity-specification.md)을 따른다.

## 8. 세계관 지식 자료와 승인 조건

조사 자료는 [콘텐츠 자료 안내](../content/README.md)에 연결된 JSON에 저장한다. 현재 묶음은 커뮤니티 NPC 10명, 세계관 사실 53개, 인물별 지식 후보 154개, 작성 대사 예시 20개와 군중 지식 묶음 후보 13개다. 인물별 조사와 출처 한계는 [커뮤니티 NPC 조사](community-npc-catalog.md), 보유·추첨·인지·공개·프롬프트 선별 규칙은 [NPC 지식 부여 규격](npc-knowledge-specification.md)이 기준이다.

world_fact의 source_checked는 출처 확인 상태다. 캐릭터 카드·인지 조건·작성 대사는 draft이며 런타임 사용을 승인한 상태가 아니다. 게임 NPC 키와 단계 조건 매핑, 인물의 실제 인지 범위, 원작 장면과 한국어 말투 검수를 거쳐 승인한다. 현재 자료에는 runtime_enabled=false를 적용한다.

현재 위치·생존·소속·친밀도는 게임 상태로 확인한다. 공개된 인물 소개만으로 군중에게 해당 인물의 사적 지식이나 퀘스트 정보를 부여하지 않는다. 세계관 전체 사건을 수록한 자료가 아니며 2077년 일반 배경과 선정한 인물의 핵심 설정을 우선 다룬다.

## 9. 생활 표현과 인물 해석

원작 사실·인물 해석·승인한 창작 생활 설정을 분리해 작성한다. 같은 사실에 다른 이해관계를 적용해도 사실 자체는 바꾸지 않는다. 세계관 이름을 반복하는 횟수로 캐릭터성을 평가하지 않는다.

| 인물 | 우선 관심 | 생활 소재·반응 방식 |
| --- | --- | --- |
| 군중 배달원 | 배달·벌이·안전 | 도시 설명보다 자기 일정·물건 파손·귀가에 반응 |
| 군중 정비 노동자 | 부품·대금·작업 책임 | 작업 기준으로 말하지만 숨은 장비·개인 병력을 읽지 않음 |
| 군중 기업 근로자 | 계약·평가·안정 | 기업을 일괄 비난하지 않고 자기 이해관계에 따라 말을 아낌 |
| 주디 작성 초안 | 기술적 판단·부당함에 대한 반응 | BD에는 작업자 관점, 사람을 거래 대상으로 보는 제안에는 경계 |
| 팬앰 작성 초안 | 자유·함께 움직이는 사람 | 보상만보다 누가 위험을 떠안는지·동료를 버리는지에 주목 |

군중 생활 소재는 승인된 창작 원형이다. 주디·팬앰의 반응은 공식 소개를 바탕으로 작성한 해석이며 원작 인용이 아니다. 발화 길이·반말/존댓말·욕설·호칭은 한국어판 대화와 관계 단계 검수 후 확정한다. 카드마다 거절 이유·직업 표현·대화 종료 조건이 구별되어야 한다. 예시는 [프롬프트 명세](prompt-specification.md), 품질 시험은 [개발 및 검증 계획](development-validation.md)에 둔다.
