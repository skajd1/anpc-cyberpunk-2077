# 콘텐츠 데이터 규격

규격 버전: 0.5 (2026-10-02). 작성 파일: UTF-8 JSON. 모듈 출력: [공통 규격](module-interface-specification.md)의 IdentityProfile/PersonaView/KnowledgeView. 작성 메타데이터·seed·출처 전문은 전송 제외.

신규 성격은 [Big Five 규격](personality-specification.md). 기존 identity/군중 세 슬롯은 호환 입력이며 신규 성격과 동시 적용·자동 환산 금지. 구현 상태: [개발·검증 계획](development-validation.md).

### 전환 전 정체성 구조 1.0의 구성

| 구성 | 커뮤니티 NPC | 군중 NPC | 변경 기준 |
| --- | --- | --- | --- |
| 생활 배경·원형 | 원작 근거로 작성한 인물 배경 | 관찰 조건에 맞는 승인 원형과 창작 배경 범위 | 카드 개정 또는 생성 데이터 무효화 |
| 성격·핵심 가치 | 작성·검수한 인물의 고정 정체성 | 기질·핵심 가치·대인 태도에서 각각 1개씩 추첨 | 유효한 동일 생성 데이터에서 고정 |
| 구체적인 판단 규칙 | 원작 근거로 작성한 상황별 선택 기준 | 원형과 특성 조합에 맞는 승인 규칙 | 정체성 규칙은 고정, 적용 상황은 매 턴 계산 |
| 말투·대화 예시 | 한국어 원작 문체와 검수한 예시 | 원형·특성에 맞는 작성 문체와 예시 | 문체는 고정, 관련 예시만 매 턴 선별 |
| 현재 목표·상태 | 원작 단계·현재 관찰로 계산 | 원형의 승인 목표와 현재 관찰로 계산 | 현재 상황에 따라 갱신 |
| 지식·관계·기억 | 원작 인지·관계 조건과 유효 대화 기억 | 승인 지식·플레이어 태도와 인스턴스 기억 | 인지·공개·기억 계약에 따라 갱신 |

identity_structure_version=1.0은 호환 형식에만 적용. schema_version과 분리. 슬롯은 배경·판단·말투를 대체하지 않으며 커뮤니티에 무작위 추첨을 적용하지 않는다.

## 1. 공통 데이터 계약

| 필드 | 값/검사 |
| --- | --- |
| schema_version | 작성 객체는 0.1. 공통 Envelope.contract_version과 분리 |
| id | 패키지 내 고유 문자열 |
| revision | 정수 ≥1 |
| kind | character_card, crowd_archetype, world_fact, knowledge_entry, reaction_rule, dialogue_example |

참조는 ID 사용. 누락/중복/미지원 버전은 패키지 로드 거부. 자유 텍스트에 코드/경로/게임 명령 실행 권한 없음. 원작 사실은 출처 있는 world_fact, 창작 배경/해석은 별도 저장.

source_checked는 출처 확인만 의미한다. draft 카드/규칙/예시/인지 조건은 런타임 제외. 승인·배분: [NPC 지식 규격](npc-knowledge-specification.md).

## 2. 커뮤니티 캐릭터 카드

아래 표는 작성 입력이다. 로더가 승인/조건 판정 후 공통 타입으로 변환한다.

| 필드 | 형식 | 의미 |
| --- | --- | --- |
| character_key | 문자열 | NPC 식별 규격의 고유 인물 매핑 |
| core_personality | 신규 필수 객체 | Big Five 규격의 작성된 고정 다섯 수준. 기존 카드에는 별도 전환 필요 |
| personal_principles | 문자열 목록 | 작성된 개인 원칙. core_personality와 분리하며 금지·지식·관계의 상한을 해제하지 않음 |
| identity | 전환 전 객체 | 기존 신념·욕구·두려움·금기·자기 인식의 조사·호환 자료. 신규 요청의 핵심 성격으로 전송하지 않음 |
| goals | 조건부 목표 목록 | 현재 단계에서 추구하는 목적과 우선순위 |
| relationship_stages | 단계 목록 | 아래 2.1절. 인물별 원작 분기와 관계·사건·목표의 단일 기준 |
| voice_style | 객체 | 말 길이, 어휘, 호칭, 문체, 금지 표현. direction에 인물별 말 리듬·조건부 멈춤/쿠션어 방향 포함 |
| dialogue_conditions | 조건 객체 | 대화 가능한 퀘스트·활동 상태 |
| knowledge_ids | ID 목록 | 인물이 접근할 지식 항목 |
| forbidden_claims | 규칙 목록 | 원작 충돌·스포일러·인물이 할 수 없는 주장 |
| action_policy | 객체 | 행동 ID·금지·선호. 선택 권한과 실제 실행 권한은 행동 규격에 따라 구별 |
| reaction_rule_ids | ID 목록 | 장비·평판·관계·상황 반응 규칙 |
| example_ids | ID 목록 | 상황별 대사·판단 예시 |
| fallback_lines | 객체 | unknown, unavailable_action, declined의 작성된 안전 대사. 각각 필수 문자열 |
| source_ids | 사실 ID 목록 | 정체성과 관계의 원작 근거 |
| lived_context | 선택 객체 | 직업·생활 관심·당면 문제·일상 소재. 원작 근거와 창작 생활 설정을 구분 |
| everyday_fiction_policy | 정책 참조 또는 객체 | 9.1절의 일상 창작 허용 소재·금지 주장·시점 조건 |
| speech_rules | 선택 객체 | 직업 어휘·화제 전환·설명 수준·은어 밀도·유머/욕설 한도 |
| identity_rules | 목록 | 상황 조건·가치 우선순위·금지 선택·원작 근거·승인 상태를 가진 판단 기준. 정체성 구조 1.0 출시 카드에 필수 |
| identity_anchor | 선택 객체 | core_values, hard_limits의 짧은 작성 요약. 승인된 identity에서만 유도 |
| presentation | 선택 객체 | 화면에서만 사용하는 인물 역할 요약. 핵심 성격은 core_personality의 다섯 수준을 표시하며 임의 특성 태그로 대체하지 않음 |

- 정체성 모델 수정 금지. 목표·관계·지식은 승인 상태 조건으로 계산. 행동 선호는 권한 아님.
- 호환 구조 1.0 출시 카드: 승인 배경·identity·identity_rules·voice_style·예시·목표/관계/지식 조건·대체 대사 필수. 누락 원작 정체성 무작위 보충 금지.
- 선택 필드 누락은 창작 경험으로 보충하지 않는다. 창작은 provenance/허용 변경 범위 명시. speech_rules 중복은 voice_style로 통합.
- 화면 presentation.role은 짧은 역할, identity_slots는 원본 identity 목록 키의 비어 있지 않은 짧은 문자열 목록. 누락 슬롯은 원문 표시. 새 특성/관계 추가 및 생성/승인 권한 변경 금지. 신규 성격은 다섯 수준 표시.

### 2.1. 원작 관계 단계

| 필드 | 형식·조건 |
| --- | --- |
| id / phase / label | 인물 내 고유 분기 ID / 인지 조건용 의미 단계 / 화면 이름 |
| available | boolean. false인 사망·발화 불가·연락 단절 분기는 모델 호출 전 차단 |
| relationship | label·attitude·address 문자열. 태도·호칭은 원작 근거의 작성 해석 |
| requirements | 선택·사건·연애 자격을 명시한 비어 있지 않은 문자열 목록 |
| known_past_event_ids | world_fact ID 목록. usage_mode=canon_context, 인물·분기 조건과 출처 필수 |
| current_goals | 해당 시점의 목표 문자열 목록 |
| source_ids / review_status | 출처 ID 목록 / draft 또는 승인 상태 |

- 선택한 분기 하나를 CanonView로 변환한다. 관계·목표·알려진 과거 사건·적용 규칙만 전달하며 전체 단계·선택 조건·출처 전문은 보내지 않는다.
- 실제 게임은 사건·선택·자격을 확인해 ID를 매핑한다. 미확인은 unknown. 테스트 웹은 명시적 선택으로 조건을 충족한 상황을 모의하며 source=simulation을 유지한다.
- 친구와 연인은 별도 분기다. 조니의 관계를 V에게 이전하지 않는다. 대화 횟수·돈·기억·모델 응답으로 관계를 승격하지 않는다.
- 다른 분기·미래 사건은 제공하지 않는다. 사건 참조·조건 누락은 로드/조립 거부. 선택한 원작 단계가 ANPC 대화 기억보다 관계의 기준이다.

### 플레이어 고정 신원

기준: world-facts.json의 PLAYER_V.player_identity(character_key=v, display_name=V). manifest.player_identity_fact_id로 참조. 화면·입력·문맥 모두 같은 기준 사용. 카드/추첨/사용자 발화로 변경 금지. 다른 이름 발화는 주장/별칭.

name_known_by_npc는 별도 게임 인지 조건. true일 때만 이름 호칭. 고정 신원으로 친밀도·성별·출신·렐릭 인지 추정 금지.

## 3. 군중 원형과 생성 특성

crowd_archetype: 적용 지역/활동/관찰 소속 조건, weight, trait_pools, compatibility_rules, default_traits, background_bounds, voice_styles, identity_rules, example_ids, action_policy, knowledge_ids, fallback_lines.

승인 원형만 사용. LLM 원형 생성 없음. 미일치 시 승인 기본 시민 원형. 관찰되지 않은 직업/소속 부여 금지. fallback_lines는 카드와 같은 필수 구조.

### 3.1. 전환 전 형식의 고정 특성 슬롯

trait_pools 키: temperament/core_value/social_attitude. 후보: trait_id, 양수 유한 weight, identity_effects, rule_ids, voice_constraints. 참조 유효성 필수.

traits는 슬롯별 ID 하나, 슬롯 간 중복 금지. 직업·지역·목표·관심·비밀은 슬롯 추첨 제외.

### 3.2. 조합과 생성 계약

1. 첫 준비 시 관찰 조건을 통과한 원형을 가중 선택. 필수 unknown 제외.
2. 슬롯별 한 후보 조합. 금지/관찰 모순/판단·문체 미비 조합 제외.
3. 슬롯 키/trait_id 정렬. 후보 weight 곱으로 seed 추첨. 반복 재추첨/LLM 모순 수정 금지.
4. 조합 없음은 검수 default_traits. 기본도 부적합이면 원형 거부 → 승인 기본 시민 → 미유효 시 대화 거부.
5. 원형/특성의 identity·판단·말투·예시 로컬 정규화. 배경→원형→특성 금기 합집합. 금지 우선. 문체 충돌은 사전 제외.
6. 저장: persona_id, npc_instance_key, archetype_id/revision, content_version, identity_structure_version, generator_version, seed, traits, background, identity, identity_rules, voice_style, example_ids. 동일 입력/버전/seed는 동일 결과.

compatibility_rules는 금지 trait_id 집합+조건. 작성 갈등 해소 기준이 있으면 복합 성격 허용. traits로 판단 규칙 대체 금지.

### 3.3. 유지와 무효화

같은 유효 인스턴스의 생성 데이터 재사용. 턴/장비/평판/발화에 따른 성격 재추첨·누적 기본 태도 변경 금지. 현재 목표/감정은 상황 규칙 적용.

무효화 후 새 군중은 새 생성 대상. 외형/레코드로 과거 복원 금지. 유효 세션은 기존 콘텐츠 버전 유지, 미지원 시 종료 후 재등록. 개인 배경은 창작 표시; 유명 인물 관계/사건 참여/비밀 생성 금지. 재접촉/만료: [NPC 식별 규격](npc-identity-specification.md).

### 3.4. 신규 Big Five 군중 생성

- 승인 원형별 다섯 축 1~5 후보 가중치·금지 조합·검수 기본 조합·생성기 버전 등록.
- 원형/조건 필터 → 축/값 정렬 → 후보 weight 곱의 seed 추첨. 조합 없음은 같은 원형 기본값 → 승인 시민 → 대화 거부.
- core_personality에는 다섯 정수만 저장. seed·원형/생성기/콘텐츠 버전·분포/추첨 자료는 로컬 생성 레코드.
- 동일 입력/버전/seed는 동일 결과. 유효 대화/재접촉 중 재추첨 없음. 배경·지식·말투·원칙은 별도 데이터. 커뮤니티 수치는 고정 작성.

## 4. 세계관 사실과 인물 지식

| 객체 | 필수 필드 | 규칙 |
| --- | --- | --- |
| world_fact | statement, source, validity_condition, spoiler_scope | source는 자료 위치·식별자와 근거 요약을 포함 |
| knowledge_entry | fact_id, domain_id, required_depth, access_condition, certainty, interpretation, disclosure | 인물의 인지·해석·공개 여부와 설명에 필요한 깊이를 표현 |

- 조건 형태는 공통 Condition 참조. 등록 필드만 사용. 빈 all/any·스크립트 금지. unknown은 충족하지 않으며 not 반전 금지.
- 필수 공개 조건 누락/불명은 비공개. knows는 출처+인지 조건 충족, suspects는 추정 유지, unaware 실제 내용 제외.
- disclosure: public/evasive/withheld. interpretation으로 사실 수정 금지.
- 선택 색인: 역할/지역/화제 태그, usage_mode(background/answer/restricted). 접근 조건 대체 금지.
- 요청은 허용 최소 진술·확실성·해석·주장 한도만. 출처는 로컬 보존.

### 4.1. 인물별 분야와 지식 깊이

knowledge_profile: version, default_depth, exposure_background, domains, response_rules.

exposure_background: 출처 배경·생활/업무 맥락·evidence_refs·provenance. domains 항목: domain_id, depth, basis, evidence_refs, rationale, review_status.

basis: source_role(확인 역할), authored_candidate(작성 후보), unverified(개인 근거 미확보). source_role도 개별 사실/경험 검수 필수. unverified의 depth=unknown.

| depth | 허용하는 범위 |
| --- | --- |
| unknown | 개인 인지 근거가 부족함. 분야 사실을 주입하지 않음. 원작상 무지·처음 듣는 이름으로 확정하지 않음 |
| awareness | 근거가 있는 이름·존재의 인지. 개요·작동 원리·사용 경험으로 확대 금지 |
| familiar | 제공된 개요와 생활 수준의 설명. 실무 절차·직접 경험 창작 금지 |
| practical | 제공된 실무·이용 경험 범위. 전문 이론·미확인 교육/자격으로 확대 금지 |
| specialist | 제공된 전문 설명 범위. 전문직이라는 이유로 미등록 사실까지 생성 금지 |

미등록 default_depth=unknown. required_depth는 unknown 제외. 승인 분야 상한 ≥ required_depth일 때만 제공. 높은 사실을 낮은 수준으로 재표시 금지. 이름 인지는 별도 awareness 진술 작성.

certainty=확실성, depth=설명 범위, disclosure=공개. unknown은 근거 부족, unaware는 확인된 무지. 배분/갱신은 NPC 지식 규격.

## 5. 반응 규칙과 대사 예시

| 객체 | 필드/규칙 |
| --- | --- |
| reaction_rule | priority, condition, topic_ids, action_preferences, prohibited_claims, reaction_tone. 기존 attitude_delta 누적 적용 금지 |
| 적용 순서 | 금기/지식 → 단계 목표/관계 → 장비/평판 → 말투. 동률 ID순. 금지 우선 |
| dialogue_example | input, context_condition, expected_intent, sample_dialogue, preferred_actions, rationale. 문체 참고이며 반복 강제/미실행 성공 표현 금지 |

### 5.1. 상황별 판단 기준과 근거

identity_rules: trigger_tags, context_condition, value_priority, preferred_intent, prohibited_choices, evidence_refs, review_status(draft/approved).

- 카드 가치/금기·현재 목표/관계 우선. 금지 선택으로 행동 권한 확대 금지.
- evidence_refs: 원작 사실 ID/장면. 장면에는 작품·언어·퀘스트/장면 ID·전후 맥락·관계·검수 요약. 해석/원작 구분.
- 새 커뮤니티 규칙/요약은 approved+유효 근거만 제공. 모델로 누락 보충 금지.
- identity_anchor는 승인 가치/금기만 요약. 현재 목표/관계는 상태 계산. 군중은 첫 승인 생성 데이터에서 작성 후 유지.

### 5.2. 상황별 예시와 검색 메타데이터

선택 확장: character_keys, topic_tags, trigger_terms, required_fact_ids, review_status, provenance, evidence_refs.

provenance: canon_excerpt/authored_adaptation/reviewed_adaptation/fictional_example. authored_adaptation은 draft/생성 제외. 검수 rationale/근거는 로컬, 요청에는 상황/입력/응답만.

커뮤니티 예시는 현재 인물 명시+approved+단계/관계/필요 사실 공개 조건 필수. 군중은 같은 원형/선택 특성만 사용. 예시를 사건·실행·기억으로 등록 금지. 용어/별칭은 작성 등록. 검색 순서는 프롬프트 규격.

### 5.3. 관계 기준과 공개 평판 반응

관계/호칭/기본 거리감은 현재 원작 상태. 현재 감정·과거 발화 기억은 별도. 누적 호감/불신/연애/협력 성장 없음. 군중도 생성 기본 성향+현재 상황/인지 적용.

공개 평판 규칙: rule_id, street_cred_threshold, 대상/지역 조건, recognition(name_only/public_profile), public_fact_ids, validity_condition. 임계는 승인 배포 프로필에서 명시.

평판 임계+적용/단계/인지/공개 조건 충족 시 첫 만남도 이름/공개 행적 허용. name_only는 이름만. 비밀·렐릭·사적 관계·직접 목격 권한 없음. 미달/unknown/규칙 누락은 확인된 소개 조건만 사용.

## 6. 프롬프트 조립 계약

정규화 PersonaView + 조건을 통과한 KnowledgeView/CanonView를 전달한다. 베이스·배치·선별·예산: [프롬프트 규격](prompt-specification.md).

## 7. 기억 작성 규칙

원문·유형·정리·조회: [기억 규격](memory-specification.md). 기억으로 승인 카드·인지·분야·공개·퀘스트·관계·보상 변경 금지.

## 8. 세계관 지식 자료와 승인 조건

자료 위치: [콘텐츠 안내](../content/README.md). 조사 상태: [인물 조사](community-npc-catalog.md).

승인 조건: 실제 NPC 키/단계 매핑 + 개인 인지 + 원작 장면 + 한국어 문체 검수. source_checked만으로 카드/인지/예시 승인 금지. 현재 위치·생존·소속·친밀도는 게임 상태 기준.

## 9. 생활 표현과 인물 해석

원작 사실·인물 해석·승인 창작 분리. 카드별 거절 이유·직업 표현·종료 조건 구분. 발화 길이·호칭·욕설·말끝은 한국어/관계 단계 검수. 고유명사 빈도로 캐릭터성을 판정하지 않는다.

### 9.1. 사소한 일상 창작 정책

정책 필드: policy_id, allowed_topics, prohibited_claims, validity_condition. 승인 정책+현재 조건을 통과한 소재/제한만 요청에 제공. 미설정은 감상/취향/농담만 허용, 구체적 일상 사건 금지. 원작/분야 근거 보충 용도 금지.

| 구분 | 허용 범위 |
| --- | --- |
| 감상·취향·농담 | 현재 복장 평가·가벼운 농담·인물다운 의견 |
| 사소한 일상 이야기 | 승인된 생활 소재의 가벼운 작업 상태·불편·근황. 세계 상태나 보상을 바꾸지 않음 |
| 원작·관계·전문 경험 | 새 가족·연인·유명 인물과의 접점·퀘스트 결과·자격/교육·인지 근거가 없는 기술 이용 경험 생성 금지 |
| 실제 장면·행동 | 관찰하지 않은 복장·목격·날씨·범죄, 실행하지 않은 이동·거래·제스처 완료 생성 금지 |

- 인물·단계·관계·생활/직업에 맞는 소재만 사용. 불가능 장소/활동/위험 상태에서는 제외.
- 창작 꼬리표/추가 출력 필드 없음. 로컬에는 npc_statement로 기록. world_fact/runtime_confirmed/전문성 승격 금지.
- 유효 기억에서만 구체 이야기 이어가기. 현재 게임/원작 충돌은 철회/제외하며 원작 상태 수정 금지.
