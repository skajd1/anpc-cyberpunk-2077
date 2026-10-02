# 게임 정보 수집 및 NPC 인지 규격

규격 버전: 0.5 (2026-10-02). 출력: [공통 규격](module-interface-specification.md)의 StateSnapshot/ObservedField → ObservationView/CanonView. 필드명은 어댑터 field_id. 실제 매핑/구현 상태: [개발·검증 계획](development-validation.md).

## 1. 상태 스냅샷

대화 시작/입력 수용 때 생성. 공통 메타데이터/출처/TimeRef/상태 사용. observed_at_ms는 로컬 단조 시간. 값 타입·단위·관찰 조건은 [상태 필드 등록표](../contracts/v1/cyberpunk2077-fields.json), 검사/누락 처리는 [공통 규격 3.1절](module-interface-specification.md#31-상태-필드-등록)을 따른다.

## 2. 수집 필드

| 필드 | 형식 | 사실의 기준 | 모델 전달 방식 |
| --- | --- | --- | --- |
| player.visible_equipment | 장비 목록 | 현재 외부에 노출된 무장 등 장착 상태 | 관찰 가능한 종류·외형만 전달 |
| player.visible_outfit | 복장 항목 목록 | 외형 덮어쓰기를 반영한 현재 표시 복장 | 아이템 이름·외형 텍스트. 3.1절 계약 적용 |
| player.visible_appearance | 외형 항목 목록 또는 null | 어댑터가 확인하고 NPC가 관찰할 수 있는 생김새 텍스트 | 확인된 특징만 전달. 이미지 분석·숨겨진 신체 정보 제외 |
| npc.can_observe_outfit | 불리언 또는 null | 대상의 거리·시야·관찰 가능 상태 | true인 관찰만 이전 복장 기억으로 등록 |
| npc.can_observe_appearance | 불리언 또는 null | 생김새 범주를 실제로 관찰 가능한 상태 | true인 항목만 현재/과거 관찰로 제공 |
| npc.can_observe_equipment | 불리언 또는 null | 외부 무장 범주를 실제로 관찰 가능한 상태 | true인 항목만 현재/과거 관찰로 제공 |
| player.public_reputation | 인지 결과 객체 또는 null | 승인 평판 임계·지역/대상·공개 행적 규칙 | 이름 인지와 허용된 공개 평판만 전달 |
| player.weapon_drawn | 불리언 | 현재 무기를 꺼낸 상태 | 알려진 경우 경계 반응에 사용 |
| player.level | 정수 | 게임 레벨 | internal. 원시 숫자 전달 금지 |
| player.street_cred | 정수 | 게임 평판 수치 | internal. 카드 규칙으로 인지 수준 변환 |
| player.name_known_by_npc | 불리언 또는 null | 확인된 만남·소개·원작 관계 또는 승인 공개 평판 규칙 | true일 때만 고정 신원의 이름으로 호칭 |
| quests | 관련 퀘스트 ID·단계 목록 | 게임이 확인한 진행 상태 | 인물 지식 필터 후 관련 사실만 전달 |
| relationship | 원작 관계 상태 또는 null | 게임·작성된 단계 규칙 | 현재 관계·호칭·기본 태도. AI 누적 호감 필드 없음 |
| location | 지역·하위 지역 ID | 현재 위치 조회 | 인물이 알 법한 지역명만 전달 |
| game_time | 게임 날짜·시간 또는 null | 게임 시간 조회 | 시간대 표현으로 변환 |
| npc.activity | 활동 열거값 | 현재 AI·워크스팟 상태 | 관찰 가능한 활동만 전달 |
| nearby_events | 제한된 관찰 이벤트 목록 | 실행 중 실제 수집한 사건 | 참여·거리·인지 규칙 통과 후 전달 |
| safety | 전투·연출·퀘스트 제어·탑승·참조 유효성 | 게임 실행 계층 | internal. 행동·대화 권한 판정에만 사용 |

위 표는 수집 범주다. safety는 등록된 safety.* 불리언으로 분리한다. quests는 매핑한 개별 조건 필드, relationship/public_reputation은 CanonView·PlayerIdentity·KnowledgeView로 투영하며 임의 객체를 ObservedField.value에 넣지 않는다. nearby_events는 승인된 사건 계약으로 수집한다. location/game_time/npc.activity는 확인된 표시 문자열로 정규화한다.

전체 가방·숨은 장비·무관 퀘스트·전체 NPC 제외. 빈 이벤트와 수집 불가 구분. 실제 관찰 근거 없는 범죄/참여 추정 금지.

## 3. 인지 변환

- 원시 레벨 제외, 승인 규칙으로 인상 변환. 평판/이름은 [공개 정책](content-specification.md#53-관계-기준과-공개-평판-반응). 필수 상태/규칙 미확인은 인지 확정 금지.
- 이름 기준은 [고정 신원](content-specification.md#플레이어-고정-신원). 이름 unknown은 호칭 근거 아님.
- 단계 unknown이면 의존 사실 제외, 필수 대화 조건이면 시작 거부.
- 현재 게임/승인 단계가 관계/기본 태도 기준. 기억 누적 관계 없음. 현재 감정 분리. 관찰 충돌은 최신 확인 게임 상태 우선.

### 3.1. 복장 텍스트와 관찰 기록

- 텍스트 수집. 로컬 항목: slot, item_ref, display_name, appearance_text, description_source. 모델에는 슬롯/이름/외형만.
- 표시 덮어쓰기/의상 시스템 결과 우선. 미확인 슬롯 unavailable. 확인된 외형만 사용. 스탯/희귀도/이력/비밀 제외. 외형 미확인은 이름/종류만.
- 작성 외형 매핑은 출처/콘텐츠 버전 포함. 이미지 API 없음.
- active 진입/입력 수용 때 can_observe_outfit=true+대상/거리/시야/안전 확인 시 사건 확정. 수집/기본 반응만으로 기억 등록 금지.
- 동일 세션/서명 중복 및 타 NPC 공유 금지. 실제 관찰은 이후 요청 실패와 별도 보존.
- 관찰 불가면 현재 복장 제외+제약 제공. 대화가 안전하면 유지 가능. 과거는 당시 시점만 사용.
- 비교는 현재+같은 NPC 유효 과거 필요. 미확인은 현재만 평가. 취향/표현은 인물/원작 관계 적용.
- 현재 observations/과거 MemoryView 분리. outfit_change·반응 의무/소비·추가 변화 호출 없음.

### 3.2. 진행도에 따른 원작 맥락

게임의 승인 단계/관계/인지 매핑 → 과거 원작 요약·현재 목표/호칭·공개 지식 → CanonView. ANPC 기억과 분리. 원작 전체 대사 recent_turns 복사/플레이어 설명으로 퀘스트 진행 금지. 변경 시 재계산, 미래/다른 분기/인지 불가 제외. 로드도 현재 게임 단계 우선.

### 3.3. 외형·복장·무장의 현재 관찰과 과거 기억

- appearance/outfit/equipment 독립 수집. 외부 특징·보이는 종류/이름/외형·확인된 들고 있음/수납만 허용.
- 몸 내부 장비·인벤토리·공격력·숨은 무기·미제공 피부/재질 추정 금지. 미확인은 unknown/unavailable, 확인된 없음과 구분.
- 원시 아이템 키는 로컬. 과거는 실제 본 범주·당시 시점만 PlayerObservation으로 보관.
- 새 현재값 등록 전 이전 기준 확보. 중복/조회는 [기억 정책](memory-specification.md#52-질문-없이도-제공하는-이전-관찰). 과거로 현재 unknown 채우기 금지.
- 같은 이름이라도 다른 외형은 다른 기록. 발화 설명은 관찰 근거 아님.

## 4. 갱신과 무효화

dialogue_context_revision은 세션별 1에서 시작. 표시/실행 직전 대상·안전·적용 조건 재조회. world_epoch 불일치는 즉시 폐기.

| revision 증가 | 증가하지 않음 |
| --- | --- |
| 적용 인지/공개·이름·관계·단계 목표·대화 조건·허용 행동 변경 | 단순 시각/진단·무관 퀘스트·워커 기억 반영 |
| 관련 known→unknown/unavailable | 생성 중 입력 스냅샷의 임의 갱신 |
| 요청에 제공한 외형/복장/무장/관찰 가능 상태 변경 | 없음 |

- 관련 이벤트 및 표시 직전 재계산. 요청/현재 버전 불일치는 응답 전체 폐기, 대사/행동/기억 등록 금지. 부분 사용 없음.
- 대화 조건 유효면 active+사용자 재전송. 자동 유료 재생성 없음. 금지/필수 보호 불명은 종료. 최신 검사 불가면 수용 금지.
- 수집 실패는 해당 필드만 반영. 필수 보호 실패는 시작 거부/종료. 모델 추정 상태 저장 금지.
