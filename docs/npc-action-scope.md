# NPC 행동 범위 명세

규격 버전: 0.2 (2026-10-01). 타입/포트: [공통 규격](module-interface-specification.md). 게임/모드 구현 상태: [개발·검증 계획](development-validation.md). 단위: 미터·초. 수치는 설계 기본값.

## 1. 범위와 권한

execute 허용=배포 실행 지원 ∩ NPC 기능 ∩ 카드 ∩ 현재 상태. selection_only도 승인 선택 목록·카드·대상 조건 검사. 커뮤니티 오리지널 금기 보존, 군중은 살아 있는 인스턴스만.

요청당 제안 최대 1개. 원시 좌표/엔티티/아이템 ID·자산 경로·코드 생성 금지. 위치/차량/워크스팟/소품/제스처는 로컬 발급 후보 참조만 사용.

### 1.1. 행동 선택과 실행 모드

- 첫 게임판 기본 실제 제어: stop_and_listen, face_player, resume_walk, end_conversation.
- 워크스팟 점유 중인 군중 대상: end_conversation만 execute. 워크스팟 동작을 끊거나 이동·회전시키는 행동은 거부하고 대사·자막만 진행.
- 추가 행동: selection_only 기본, 지원 어댑터의 후속 execute. 항목별 ActionOption.execution_mode가 최종 권한.
- selection_only: 검수 통과 시 로컬 selection_state=selected. 실행 상태 proposed 유지. 명령·성공 효과/기억·자막 실행 서술 없음.
- catalog_version 변경 시 재검사. 선택 결과 자동 실행 금지. execute 전환은 새 요청+현재 권한 검사.
- 대사/행동 한 생성 요청. 관련 후보 없음은 null. 매턴 동작 강제/관계·대사 왜곡 금지.

### AMM 최초 실행 어댑터

UF-64의 구현 대상은 AMM 2.12.5 등록 목록과 실제 설치 자원을 교차 확인한 손 흔들기·박수·회상 대화 제스처다. 정확한 AnimatedComponent 리그가 Man Average/Woman Average인 자유 군중을 대상으로 하며 Big은 박수만 등록한다. 고유 NPC·장면·기존 워크스팟·현재 무장·미확인 리그는 제외한다. Lua 내부 임시 객체는 Codeware DynamicEntitySystem으로 생성하며 ANPC 고유 태그와 GetDeviceUser로 소유권을 확인한 대상만 정리한다. AMM 자체 재생 함수의 비동기 작업·V 재대상 설정은 사용하지 않는다.

객체 생성/재생 시작 확인은 각각 최대 2초, 시작 요청 후 재생 점유는 최대 5초다. 점유 확인은 실제 클립 재생/완료 확인과 다르다. 현재 어댑터는 succeeded를 만들지 않고 제한 도달 시 cancelled로 정리한다. 자연 완료·반복 방지·시작 블렌딩·위치 보존은 실제 자원 설치 후 검증해야 한다. 공통 ActionRequest/Outcome 포트 전환은 별도 미완료이며 현재 CET 로컬 결과를 공통 계약 구현으로 간주하지 않는다. 외부 자원이 없으면 game allowed_actions에 추가 모션이 없다. 웹은 같은 등록 참조를 selection_only로 제공한다.

## 2. 공통 행동 계약

ActionProposal → 로컬 검사 → ActionRequest → ActionOutcome. 대상은 Envelope.scope, 요청/세대는 Call.fence. 같은 action_request_id는 원래 결과 반환/중복 실행 금지. selection_only 실행 요청 거부.

상태: proposed → accepted → running → succeeded/failed/cancelled. 조건 거부 rejected. 완료 조건 확인 전 성공 대사/기억 금지.

사유: unsupported, forbidden, invalid_args, stale_target, unsafe_state, unreachable, occupied, timeout, interrupted, adapter_error.

이동/전신 동시 최대 1개. 이전 ANPC 제어 정리 후 새 실행. 시선은 지원 시 병행. 오리지널 명령 일괄 취소 금지. 유효 독립 대사는 행동 거부만으로 삭제하지 않는다.

## 3. 기본 행동

| ID | 허용 인수 | 명세 | 완료·한도 |
| --- | --- | --- | --- |
| stop_and_listen | 없음 | 대화 동안 ANPC 소유 위치 유지 | 유지 상태 진입 시 완료. 세션 종료 시 해제 |
| face_player | duration_s: 1~10 | 플레이어에게 머리·눈 시선 설정. 전신 회전은 포함하지 않음 | 시선 설정 확인. 기본 3초 후 해제 |
| look_at_target | target_ref, duration_s: 1~10 | 허용된 주변 대상에게 시선 설정 | 대상 유효·시선 설정 확인. 기본 3초 |
| resume_walk | 없음 | ANPC 소유 정지·이동·시선 제어 해제 | 제어 잔류 없음. 실제 보행 재개를 의미하지 않음 |
| end_conversation | 없음 | 세션 종료 요청 | 통신 응답 무효화와 모드 제어 해제 |
| move_to_point | destination_ref | 같은 로컬 공간의 안전 후보로 이동 | 출발점에서 최대 5m, 도착 오차 0.75m, 제한 10초 |
| step_back | distance_m: 0.5~2 | 후방의 안전 위치로 짧게 이동 | 기본 1m, 도착 오차 0.75m, 제한 5초 |
| approach_player | stop_distance_m: 1.5~3 | 플레이어의 현재 위치 근처로 접근 | 기본 간격 2m, 이동 최대 5m, 제한 10초 |
| wait_here | duration_s: 1~30 | 지정 시간 현재 위치 유지 | 시간 경과 후 해제. 기본 5초 |
| return_to_anchor | 없음 | 세션 시작 시 기록한 안전 위치로 이동 | 최대 5m, 도착 오차 0.75m, 제한 10초 |

안전 이동: 같은 높이·길찾기 가능·차도/낙차/닫힌 장애물/점유 제외. 판정 불명은 거부. 실패는 제어 해제, 순간이동 없음. stop_and_listen은 세션 관리자가 대기 제어로 실행하며 완료 후에도 종료 정리 대상으로 유지.

## 4. 이동 확장

| ID | 허용 인수 | 명세 | 완료·한도 |
| --- | --- | --- | --- |
| follow_player | duration_s: 1~60 | 플레이어와 2~4m 간격을 목표로 동행 | 기본 30초 또는 세션 종료. 종료 거리 정책 우선 |
| guide_to_location | route_ref | 작성된 지역 경로를 따라 안내 | 경로 최대 30m·60초. 플레이어 8m 이탈 시 대기 |
| walk_short_route | route_ref | 작성된 경유점을 순서대로 이동 | 최대 5개 경유점·30m·60초 |

추격/순간이동/새 지역 제외. [식별 규격](npc-identity-specification.md) 2절 종료 거리 정책 우선. 안내 대기 최대 10초, 미복귀는 interrupted.

## 5. 제스처·생활 동작 확장

| ID | 허용 인수 | 명세 | 완료·한도 |
| --- | --- | --- | --- |
| play_gesture | gesture_ref | 호환 자산의 짧은 제스처 | 종료 이벤트 또는 자산의 명시된 끝. 최대 10초 |
| play_idle | idle_ref, duration_s: 1~30 | 지정 대기 자세 | 기본 5초 후 종료 |
| sit_at_spot | spot_ref, duration_s: 1~30 | 지정 워크스팟에서 앉기 | 기본 10초. 퇴장·제어 해제까지 완료 |
| lean_at_spot | spot_ref, duration_s: 1~30 | 지정 워크스팟에 기대기 | 기본 10초. 퇴장·제어 해제까지 완료 |
| use_prop_animation | prop_action_ref | 지정 소품과 동작을 함께 사용 | 소품·슬롯 상태 정리까지 완료. 최대 30초 |
| play_authored_sequence | sequence_ref | 작성된 배우·자산의 짧은 연출 | 최대 30초. 강제 퀘스트 장면 진입 금지 |
| react_with_expression | expression_ref, duration_s: 1~10 | 호환 얼굴 자산의 지정 표정 | 기본 3초 후 기본 상태 복구 |
| play_custom_animation | animation_ref | 기존 연동 모드가 배포한 호환 애니메이션.ANPC 신규 모션 제작은 필수 아님 | 최대 30초. 즉석 생성 불가 |

자산 필수: 호환 인물/골격·점유 슬롯·길이·종료 이벤트·퇴장·복구. 길이 기반 종료는 메타데이터+해제 확인. 워크스팟 강탈/미등록 동작·표정·소품 금지.

## 6. 차량·거래 확장

| ID | 허용 인수 | 명세 | 완료·한도 |
| --- | --- | --- | --- |
| enter_vehicle_passenger | vehicle_ref, seat_ref | 정지 차량의 빈 승객 좌석 탑승 | 실제 탑승 상태 확인. 최대 15초 |
| exit_vehicle | 없음 | 정지 차량에서 안전하게 하차 | 실제 하차 확인. 최대 15초 |
| drive_authored_route | vehicle_ref, route_ref | 운전 지원 전용 프로필의 작성 경로 이동 | 경로 메타데이터 상한, 최대 120초 |
| equip_allowed_item | equipment_ref | 허용 슬롯·장비 프리셋 적용 | 실제 슬롯 확인. 최대 5초 |
| transfer_authored_item | transaction_ref | 작성된 보상·거래 1건 | 플레이어 확인 후 단일 실행. 수량·가격은 콘텐츠에 고정 |
| open_authored_vendor | vendor_ref | 등록된 상인의 오리지널 거래 UI 진입 | UI 진입 성공 후 ANPC 대화 제어 종료 |

군중 운전/무장/보상 기본 금지. 퀘스트 장비/경제 덮어쓰기 금지. 지급에 건네기 모션 포함 없음. 거래 완료 불명은 재실행 금지+오류. 운전은 별도 후속 이동 세션만.

## 7. 콘텐츠 조합

실행 ID는 표의 27개만. react_to_other_npc/greet_on_recontact는 콘텐츠 의도이며 action_id로 거부. 각각 허용 시선/제스처/대사와 유효 기억을 조합.

## 8. 중단·복구 의무

종료·전투·퀘스트 제어·세계 전환·소멸은 행동 취소. ANPC 소유 명령/시선/장비 변경/임시 소품·엔티티만 반복 안전하게 정리. 오리지널 충돌 시 복원 덮어쓰기 금지. 소멸 객체 호출 없이 참조만 폐기.

## 9. 범위 밖

임의 퀘스트·도망/엄폐/항복/공격·문/터미널·동시 배우·실시간 립싱크·자율 일정·군중 영속화 제외. 실제 권한은 배포 지원 프로필로 결정.

## 10. 기존 게임·모드 행동 연동

- 기존 게임/모드 자산 재사용. 신규 모션/런타임 생성·특정 외부 모드 설치 필수 없음.
- 공개 호출·취소·사용 조건을 확인한 어댑터만 활성. AI에는 의미/인수 후보/모드만, 함수/경로/원시 ID/코드 제외.
- 로컬 자산: candidate_ref, 의미/화제 태그, 호환 인물/골격, 점유 슬롯, 길이/종료, adapter_id/version, 취소/복구. 미검수 등록 제외.
- 공통 포트/입출력은 등록표. handle은 내부 보관. describeCapabilities는 내부 조회이며 공통 경계는 ActionCatalog.describe/ActionSelector.select.
- 후보는 의도/감정/화제/승인 태그로 로컬 선별. 수동 UI 재생만으로 호출/취소 지원 인정 금지.
- 타 모드/오리지널 점유는 occupied/unsafe_state. 지원 소실은 새 실행 차단+취소/복구.
- 확실한 취소/제어 반환이 없는 전신/생활 동작은 execute 제외. 타임아웃 성공 처리 금지. 독립 대사는 유지, 연동 오류는 UI.
