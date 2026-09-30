# 콘텐츠 데이터 규격

규격 버전: 0.1 (2026-09-30). 콘텐츠 파일은 UTF-8 JSON으로 저장한다. 이 문서는 인물·세계관·반응 규칙의 기준이며 게임 상태는 [게임 정보 규격](game-context-specification.md), 응답 객체는 [통신 규격](runtime-specification.md)을 따른다.

## 1. 공통 데이터 계약

모든 콘텐츠 객체에 schema_version, id, revision, kind를 필수로 둔다. schema_version은 현재 "0.1", id는 패키지 내 고유한 문자열, revision은 1 이상의 정수다. 다른 객체는 ID로 참조한다. 참조 누락·중복 ID·지원하지 않는 버전은 해당 패키지 로드를 거부한다. 자유 텍스트에는 코드 실행, 파일 경로 실행, 게임 명령 실행 권한이 없다.

kind는 character_card, crowd_archetype, world_fact, knowledge_entry, reaction_rule, dialogue_example 중 하나다. 원작 사실은 출처가 있는 world_fact로만 등록한다. 창작 배경과 인물의 해석은 원작 사실과 별도로 저장한다.

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

핵심 정체성은 모델이 수정하지 않는다. 목표·관계·지식은 작성된 상태 조건에 따라 변경한다. 카드가 금지한 행동은 모델의 의도나 플레이어 요청으로 해제하지 않는다. 행동 선호는 권한이 아니며 현재 허용 목록 안에서만 작동한다.

## 3. 군중 원형과 생성 특성

crowd_archetype에는 적용 지역·활동·관찰 소속 조건, 가중치, trait_pools, background_bounds, voice_styles, action_policy, knowledge_ids, fallback_lines를 둔다. fallback_lines는 커뮤니티 카드와 같은 필수 대체 대사 구조다. trait_pools는 기질·현재 목적·관심사·플레이어 태도의 허용 값 목록이다. 원형이 없으면 기본 시민 원형을 사용하고 관찰되지 않은 소속은 부여하지 않는다.

첫 대화 때 원형 선택과 특성 추출을 한 번 수행한다. 결과 객체에는 persona_id, archetype_id, seed, traits, background, voice_style을 저장한다. 같은 npc_instance_key의 재접촉에는 원래 결과를 재사용한다. 개인 배경은 창작으로 표시하고 유명 인물과의 관계·원작 사건 참여·퀘스트 비밀을 임의로 생성하지 않는다.

## 4. 세계관 사실과 인물 지식

| 객체 | 필수 필드 | 규칙 |
| --- | --- | --- |
| world_fact | statement, source, validity_condition, spoiler_scope | source는 자료 위치·식별자와 근거 요약을 포함 |
| knowledge_entry | fact_id, access_condition, certainty, interpretation, disclosure | 인물의 인지·해석·공개 여부를 표현 |

조건은 all/any/not과 등록된 상태 필드의 eq/in/gte/lte만 허용한다. 리프 조건은 field, op, value로 표현하고 all·any는 조건 배열, not은 단일 조건을 값으로 가진다. 빈 all·any는 거부한다. 임의 스크립트는 허용하지 않는다. 필드가 unknown이면 해당 조건은 충족되지 않으며 not으로 뒤집어 허용하지도 않는다. 필수 공개 조건이 없거나 모호한 퀘스트 사실은 기본적으로 비공개다.

certainty는 knows, suspects, unaware다. disclosure는 public, evasive, withheld다. knows는 출처와 인지 조건이 모두 맞아야 한다. suspects는 추측임을 드러내며, unaware 항목의 실제 사실은 프롬프트에 넣지 않는다. 인물의 interpretation은 사실 자체를 수정하지 않는다. 같은 사건을 두 인물이 다르게 판단할 근거는 identity와 interpretation에 저장한다.

## 5. 반응 규칙과 대사 예시

reaction_rule은 priority, condition, attitude_delta, topic_ids, action_preferences, prohibited_claims를 포함한다. 변화는 ANPC 대화 태도에만 적용하며 원작 관계·퀘스트 값을 변경하지 않는다. 규칙 적용 순서는 금기·지식 제한 → 단계별 목표·관계 → 장비·평판 반응 → 말투다. 같은 우선순위에서는 ID 순서를 적용하고 금지는 선호보다 우선한다.

dialogue_example에는 input, context_condition, expected_intent, sample_dialogue, preferred_actions, rationale을 둔다. sample_dialogue는 문체 참고이며 정답 문장을 항상 반복하도록 강제하지 않는다. 행동 선호에도 실행되지 않은 일을 이미 했다는 표현을 넣지 않는다.

## 6. 프롬프트 조립 계약

콘텐츠 원본을 정규화한 persona, 인지·공개 조건을 통과한 지식과 현재 상황을 프롬프트 조립기에 전달한다. 고정 베이스, 메시지 배치, 정규화 필드, 턴별 규칙과 예산 처리는 [NPC 대사·행동 생성 프롬프트 명세](prompt-specification.md)를 기준으로 한다.

## 7. 기억 작성 규칙

기억에는 요약, 플레이어가 말한 정보, 호칭, ANPC 태도, 약속과 실제 행동 결과를 구분해 저장한다. 플레이어 주장에는 player_claim 표시를 붙인다. 행동 요청은 완료 결과가 없으면 사실로 저장하지 않는다. 약속은 원작 퀘스트나 영구 보상으로 승격하지 않는다.

요약 실패 시 직전 정상 기억과 제한된 최근 대화를 유지한다. 잘못된 요약으로 인물 정체성을 갱신하지 않는다. 기억 보관 조건과 용량은 [NPC 식별 규격](npc-identity-specification.md)을 따른다.
