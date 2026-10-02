# NPC 식별 및 대화 허용 규격

규격 버전: 0.4 (2026-10-01). 공통 Scope/ActorRef/TargetResolution/Fence는 [공통 규격](module-interface-specification.md) 참조. 아래 키는 게임 어댑터 내부 매핑.

## 1. 식별 구조

| 필드 | 정의 | 사용 |
| --- | --- | --- |
| save_scope | 현재 저장 계보를 구분하는 키 | 다른 플레이 기록과 기억 분리 |
| world_epoch | 로드·빠른 이동·세계 전환마다 갱신되는 세대 | 이전 객체·응답 무효화 |
| instance_token | 살아 있는 객체의 참조와 생성 세대를 묶은 키 | 현재 NPC 구분 |
| npc_instance_key | 위 세 필드의 조합 | 세션·임시 기억·행동 대상 |
| character_key | 수작업 매핑한 고유 인물 키 또는 null | 커뮤니티 카드·저장 연동 기억 |
| record_id | 게임 레코드 ID 또는 null | 유형·프로필 조회 보조 |
| npc_type | crowd, community, unsupported | 콘텐츠 정책 선택 |

character_key 검증 시 community, 미확인은 살아 있는 instance. 이름/외형/위치/record_id로 동일 인물 판정 금지. 기존 인물 카드 누락은 community_profile_missing. 군중 카드 대체 금지.

## 2. 대화 허용 판정

시작 필수 조건:

- 살아 있는 단일 선택 대상, crowd/community 확정, 거리 ≤4m. 군중은 조준/상호작용, 커뮤니티는 원작 대상 연결.
- 기존 세션 없음. 모델/키/콘텐츠 준비.
- 플레이어/대상 전투·원작 대화·시네마틱·퀘스트 제어·운전 없음.
- 차량/워크스팟 점유 없음. 명시 지원 프로필만 예외.
- 커뮤니티 대화 조건/단계 일치. 필수 안전 unknown은 거부.

거리 기본값은 설정 가능. 진행 중 동일 조건 감시. 거리 >10m는 종료. 주변 자동 선택/발화 없음.

결과는 TargetResolution. reason_code: invalid_target, unsupported_type, too_far, busy, combat, quest_controlled, mounted, workspot_busy, state_unknown, community_profile_missing, model_unavailable.

### 2.1. AI 대화 진입과 원작 제어 전환

1. 기본 선택지: “더 깊은 대화를 해볼까?”. 커뮤니티 기존 선택지 아래 비파괴 추가. 원작 문구/순서/결과/플래그 보존. 강제 장면 중단/금지 시점 삽입 없음.
2. 군중은 원작 또는 승인 로컬 기본 반응 후 선택지. 기본 반응에 모델 호출·AI 세션·호감/관찰 기억 없음. 반응 변경은 지원 프로필 검수.
3. 토큰: 대상 키/world_epoch/entry_source(community_option/crowd_option)/발급 시각. 1회 소비. 선택지 단계에서 AI 요청/정지/시선 없음.
4. 선택 후 원작 안전 종료/제어 반환 확인 → 모든 시작 조건 재검사 → active. 동시 제어 금지.
5. 반환/상태 확인 불가 시 거부. 취소/대상·세계 변경 시 토큰/선택지 폐기. 종료는 ANPC UI/제어만 정리.

재접촉도 동일 흐름. 선택지 미지원 시 조준 즉시 채팅으로 자동 대체 금지.

## 3. 재접촉과 기억

| 조건 | 정책 |
| --- | --- |
| 대상 | 같은 살아 있는 npc_instance_key |
| 보관 | 정상 종료 최근 최대 16명. 성격/판단/말투·버전·이름 인지·대화/관찰/약속 |
| 재접촉 | 종료 후 10분 이내, 거리 ≤10m. 시작은 ≤4m. 시간은 실행 경과 |
| 이탈 | 거리 이탈만으로 기억 삭제하지 않음 |
| 휘발 폐기 | 소멸·언로드·빠른 이동·로드·save_scope 변경·만료·사용자 삭제 |
| 용량 | 가장 오래 미사용부터 제거 |
| 영구 | 안정 character_key+정확한 저장 대응+활성 설정만. [기억 규격](memory-specification.md#31-게임-저장과-기억-묶음의-연결) 적용. 임시 한도로 묶음 삭제 금지 |

미확인 저장 계보는 새 save_scope/이전 영구 연결 금지. 원작 관계/호칭/기본 태도는 현재 상태 재계산. 군중 재생성 후 승계 금지. 단기/장기 접근과 휘발/영구 보존을 구분한다.
