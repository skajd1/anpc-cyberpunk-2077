# 외부 모드 제스처·애니메이션 조사

조사일: 2026-10-02. 공개 제작자 설명, 제작 가이드와 배포 코드를 확인했다. 모드 설치·실게임 재생·ANPC 호출 시험은 수행하지 않았다. 행동 계약은 [NPC 행동 명세](npc-action-scope.md), 검증 상태는 [개발·검증 계획](development-validation.md)이 기준이다.

## 적용 방향

대화가 완성된 뒤 **AMM의 NPC별 재생 방식부터 시험하고, 동작이 많이 필요하면 CyberScript를 비교**하는 순서가 적절하다. 이는 아래 조사에 따른 ANPC의 우선순위 제안이며 필수 의존성 선정은 아니다. 두 모드를 동시에 요구할 이유는 아직 없다.

외부 모드는 새로운 모션 자산을 추가하기도 하지만, 기존 게임 모션을 골라 재생하도록 제공하기도 한다. 아래 실제 동작 이름은 CyberScript가 제공하는 기존 게임 애니메이션 목록에서 찾은 것이다. 외부 모드가 전부 새로 제작한 모션으로 해석하지 않는다.

## 모드별 비교

| 모드·자료 | 확인한 기능 | ANPC 적용 판단 |
| --- | --- | --- |
| [Appearance Menu Mod (AMM)](https://www.nexusmods.com/cyberpunk2077/mods/790) + [Collab 제작 가이드](https://wiki.redmodding.org/cyberpunk-2077-modding/modding-guides/animations/animations/amm-collab-anims-poses) | NPC 대상 Pose 탭, 골격별 동작 목록, 사용자 `.anims`·`.workspot`·`.ent` 연결. 정지 포즈와 움직이는 애니메이션 모두 등록 가능한 구조다. 배포 코드에서 재생·중단·보조 객체 제거를 확인했다. | **첫 연동 시험 후보.** 내부 함수는 확인했지만 외부 모드용 안정 API·완료 통지 계약은 미확인이다. 최신 정식 배포와 코드 대응도 확인해야 한다. |
| [CyberScript](https://www.nexusmods.com/cyberpunk2077/mods/6475) + [Core Animation Archive](https://www.nexusmods.com/cyberpunk2077/mods/7691) | Lua/CET 기반 JSON 동작 실행. 배포 코드에 `play_anim_entity`, `play_custom_anim_entity`, `change_anim_entity`, `stop_anim_entity`와 골격별 동작 목록이 있다. | **다양한 생활 동작 후보.** 태그로 등록된 대상과 보조 워크스팟을 사용한다. ANPC의 기존 NPC 참조·소유권·중단 처리에 연결할 작업이 남는다. |
| [Photomode Facial Expression Mega Pack - V and NPCs](https://www.nexusmods.com/cyberpunk2077/mods/7912) | 제작자 설명상 표정 195개. 정지형과 반복 애니메이션을 포함하고 정지형만 제공하는 버전도 있다. Photo Mode의 V/NPC 대상이다. | **표정 자료 후보.** 자유 탐험 중 ANPC NPC에게 적용·해제하는 API는 미확인. 표정 수가 대화용 제스처 수는 아니다. |
| [Facial Expression Swaps for AMM](https://www.nexusmods.com/cyberpunk2077/mods/3039) | AMM 표정 도구용 교체 파일. 선택 파일에 Talking 동작이 있으며 제작자 댓글에서도 이를 확인했다. 제작자는 일반 게임 NPC 표정에도 영향을 준다고 명시한다. | **대화 실행 후보에서 보류.** 촬영·참고에 적합하다. Talking은 생성 대사에 맞춘 실시간 립싱크 근거가 아니다. |
| [M.P.A.F.](https://www.nexusmods.com/cyberpunk2077/mods/6227) | 여러 대응 포즈·애니메이션 팩을 Photo Mode에서 함께 사용하고 일부 NPC 모션을 Photo Mode V에 적용하는 프레임워크다. | **촬영·모션 비교용.** 자유 탐험 NPC의 재생·중단 API로 확인된 것은 아니다. ANPC 동작 실행 때문에 필수로 추가하지 않는다. |
| [Animated poses for MascV](https://www.nexusmods.com/cyberpunk2077/mods/4816) | 제작자 설명상 Photo Mode의 일반 남성 V용이며 Spawned V용이 아니다. 사용자 포즈 팩이 필요하고 한 번에 파일 하나만 사용한다. | **대상 불일치로 제외.** NPC 동작 후보와 혼동하지 않는다. |
| [Poses - Quality Time - 2.31](https://www.nexusmods.com/cyberpunk2077/mods/8357) | 양쪽 체형의 포즈 12개, AMM/Photo Mode 등록. 짝 포즈는 두 NPC를 따로 생성·배치하고 각각 적용하는 절차다. | **장면 참고용으로 보류.** 자동으로 두 배우를 동기화·복구하는 대화 제스처 API는 아니다. |
| [(POSES REPLACER) Generic Average Female](https://www.nexusmods.com/cyberpunk2077/mods/4755?tab=posts) | 제작자가 같은 locomotion을 쓰는 모든 인물의 idle을 바꾸는 방식이라고 설명하고, 이를 피하려면 AMM Pose 방식을 쓰라고 권한다. | **전역 idle 교체 방식 제외.** 대화하지 않는 NPC와 원작 장면까지 바뀔 수 있다. |

### 확인된 버전과 의존성

다음은 조사 때 읽힌 페이지 표시값이며 현재 설치 가능한 최신 호환 조합을 보증하지 않는다. 버전이 다른 설명·과거 변경 기록을 최신 실행 계약으로 쓰지 않는다.

| 자료 | 페이지·코드 기준 | 표시된 주요 의존성·제약 |
| --- | --- | --- |
| AMM | 아래 미러 커밋 기준. Nexus 상세 본문은 조사 도구에서 충분히 열리지 않았다. | CET 모드 배포 경로 확인. Collab 가이드의 AMM ≥2.2는 해당 기능의 역사적 최소값이며 전체 의존성·현재 권장 버전은 정식 배포에서 재확인한다. |
| CyberScript | Nexus 5.1.4, 갱신 2025-05-20. 공식 연결 저장소 커밋도 같은 날짜. | CET, Codeware, Native Settings UI, Animation Archive, Audioware. 엔진과 Archive는 별도이며 Archive 최신 버전·게임 2.31 호환은 이번 조사로 확정하지 못했다. |
| Facial Expression Mega Pack | 2.1, 갱신 2025-09-16 | 설치 설명상 ArchiveXL·TweakXL 및 그 의존성. Photo Mode 대상. |
| Facial Expression Swaps | 1.0.0, 갱신 2023-10-21 | AMM. 사용자 표정 교체 파일은 한 번에 하나. |
| M.P.A.F. | 3.2, 갱신 2023-12-09 | ArchiveXL·RED4ext·TweakXL. 다른 Photo Mode/골격 모드 조합별 패치 확인 필요. |
| Animated poses for MascV | 1, 갱신 2022-07-11 | 대응 사용자 Photo Mode 포즈 팩 중 하나. 일반 NPC 지원 근거 없음. |
| Quality Time | 2.2.3, 갱신 2026-06-25 | 설명상 AMM ≥2.2, Photo Mode는 ArchiveXL ≥1.4.5. 과거 최소값을 최신 설치 조합으로 고정하지 않는다. |

## 코드에서 확인한 재생·중단 경로

### AMM

[배포 미러](https://github.com/MaximiliumM/appearancemenumod)는 공식 원저장소로 간주하지 않는다. README도 공개 배포의 미러임을 밝히고 사용 조건은 정식 모드 페이지를 참조하도록 한다. 확인 커밋은 `54272353d7e4a5c85ab32248eff3c2d8d2541cd7`(2025-07-08)이다.

- [anims.lua 재생](https://github.com/MaximiliumM/appearancemenumod/blob/54272353d7e4a5c85ab32248eff3c2d8d2541cd7/Release/bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/anims.lua#L328): `Poses:PlayAnimationOnTarget`이 보조 엔티티를 생성한 뒤 `PlayInDeviceSimple`과 `SendJumpToAnimEnt`를 호출한다. 동일 대상의 기존 AMM 동작을 중단·정리하는 경로도 있다.
- [anims.lua 중단](https://github.com/MaximiliumM/appearancemenumod/blob/54272353d7e4a5c85ab32248eff3c2d8d2541cd7/Release/bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/anims.lua#L394): `Poses:StopAnimation`이 `StopInDevice`를 호출한다. `shouldKeep`이 거짓이면 보조 엔티티 제거·Dispose와 활성 목록 제거가 이어진다. 단순 정지와 정리를 구별해야 한다.
- [Collab 템플릿](https://github.com/MaximiliumM/appearancemenumod/blob/54272353d7e4a5c85ab32248eff3c2d8d2541cd7/Release/bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Collabs/Custom%20Poses/pose_template.lua): 제작자·분류·엔티티 경로와 골격별 동작 이름을 등록한다. 남녀 구분만으로 모든 인물의 호환을 보장하지 않는다.

따라서 수동 UI만 확인한 상태에서 한 단계 진전해 **배포 코드의 내부 호출·중단 구현 근거**를 확보했다. 외부 호출 진입점, 비동기 생성 중 취소, 정상 완료 판정과 원작 제어 복구는 여전히 ANPC 실험 대상이다.

### CyberScript

제작자 Nexus 설명의 SOURCE REPOSITORY 링크가 [cyberscript77/release](https://github.com/cyberscript77/release)로 연결된다. 확인 커밋은 `6054a10b6ea8c1837925f2889a9b08dc31b62da9`(2025-05-20)이다.

- [동작 실행기](https://github.com/cyberscript77/release/blob/6054a10b6ea8c1837925f2889a9b08dc31b62da9/bin/x64/plugins/cyber_engine_tweaks/mods/cyberscript/mod/modules/see.lua#L10623): `play_anim_entity`는 기본 워크스팟을, `play_custom_anim_entity`는 지정된 엔티티·워크스팟을 사용한다. [stop_anim_entity 분기](https://github.com/cyberscript77/release/blob/6054a10b6ea8c1837925f2889a9b08dc31b62da9/bin/x64/plugins/cyber_engine_tweaks/mods/cyberscript/mod/modules/see.lua#L10853)도 있다.
- [NPC 모듈](https://github.com/cyberscript77/release/blob/6054a10b6ea8c1837925f2889a9b08dc31b62da9/bin/x64/plugins/cyber_engine_tweaks/mods/cyberscript/mod/modules/npc.lua#L139): 태그로 찾은 대상에 보조 엔티티를 비동기 생성하고 동작을 재생한다. [뒤쪽 stopWorkSpotAnims 정의](https://github.com/cyberscript77/release/blob/6054a10b6ea8c1837925f2889a9b08dc31b62da9/bin/x64/plugins/cyber_engine_tweaks/mods/cyberscript/mod/modules/npc.lua#L275)는 동작 상태 제거·`StopInDevice`·보조 엔티티 despawn을 수행한다. 같은 파일 앞쪽에도 동명 함수가 있으므로 전체 로딩 순서와 실제 정의를 시험해야 한다.
- [API 모듈](https://github.com/cyberscript77/release/blob/6054a10b6ea8c1837925f2889a9b08dc31b62da9/bin/x64/plugins/cyber_engine_tweaks/mods/cyberscript/mod/modules/api.lua)은 `runActionList` 래퍼를 제공한다. 이것만으로 ANPC에서 즉시 호출 가능한 안정 API가 확보됐다고 판단하지 않는다.

[워크스팟 제작 가이드](https://wiki.redmodding.org/cyberpunk-2077-modding/modding-guides/animations/animations/abusing-workspots)에는 Codeware로 보이지 않는 엔티티를 생성하고 동작·소품을 연결하는 예제도 있다. 소수 동작만 필요하면 자체 어댑터가 더 작을 수 있다는 설계 대안이다. 가이드의 플레이어 흡연 예제를 임의 NPC에서 검증된 구현으로 취급하지 않는다.

## 대화에 검토할 구체 동작 15개

출처는 위 CyberScript 커밋의 [기본 워크스팟 목록](https://github.com/cyberscript77/release/blob/6054a10b6ea8c1837925f2889a9b08dc31b62da9/bin/x64/plugins/cyber_engine_tweaks/mods/cyberscript/mod/data/anims/workspot/cyberscript_workspot_base.json)이다. 표의 **M/F는 `man_base`/`woman_base` 목록에 해당 이름이 있다는 의미**다. 전 인물 호환, 소품 자동 제공, 길이·반복·시각적 품질의 검증 결과가 아니다. 동작 의미는 이름에 따른 해석이므로 게임에서 확인해야 한다. 자원 이름은 모델에 직접 제공하지 않고 검증 후 내부 후보 ID에 연결한다.

| 검토할 동작 | 실제 자원 이름 | 목록 골격 | ANPC 행동 연결·제약 |
| --- | --- | --- | --- |
| 손 흔들기 | `stand__2h_on_sides__01__crowd_wave__01` | M/F | `play_gesture`. 군중의 큰 손짓일 수 있어 짧은 인사로 적합한지 확인. |
| 고개 끄덕이기 | `sit_chair_lean0__rh_on_chin__01__nod__01` | M/F | `play_gesture`. 앉아 턱에 손을 둔 자세용이며 서 있는 NPC에 그대로 사용하지 않음. |
| 어깨 으쓱하기 | `stand_bar_lean0__2h_on_bar_wide__01__shrug__01` | M/F | `play_gesture`. 바에 기대는 자세·높이 조건 필요. |
| 앞으로 가리키기 | `dirt__stand__2h_on_hip__01__point_forward__01` | M | `play_gesture`. 방향과 상체 자세 확인. 여성용 동일 동작은 별도 선별. |
| 박수 | `stand__2h_on_sides__01__2h_clap__happy__01` | M/F | `play_gesture`. 반복 여부·종료 자세 확인. |
| 웃는 몸동작 | `sit_couch_lean180__arms_crossed_front__01__laugh__01` | M/F | `play_gesture`. 소파에 앉은 자세용. 얼굴·음성 웃음까지 보장하지 않음. |
| 회상하며 말하는 몸동작 | `stand__lh_crossed_front__01__talk__nostalgic__01` | M/F | `play_gesture` 또는 `play_idle` 검토. 생성 대사와 입 모양 동기화는 별도. |
| 불안하게 전화 확인 | `stand__arms_crossed_front__01__phone_check__nervous__01` | M/F | `use_prop_animation`. 실제 소품 사용 여부·손 슬롯 확인. |
| 전화로 사진 찍기 | `stand__take_photo__phone__01` | M/F | `use_prop_animation`. 사진 저장·실제 촬영 기능으로 기록하지 않음. |
| 캔으로 마시기 | `stand_lean180__rh_can__01__drink__01` | M/F | `use_prop_animation`. 기대는 자세·캔·장착 복구 필요. |
| 난간에 기대어 흡연 | `stand_lean0__balcony_rail__smoke__cigarette__relaxed__01` | M/F | `use_prop_animation`. 난간·담배·부가 효과와 인물 설정 확인. |
| 의자에 앉아 쉬기 | `sit_chair__2h_on_lap__01` | M/F | `sit_at_spot`. 검증된 의자 위치·진입/이탈 필요. |
| 벽에 기대어 팔짱 | `stand_wall_lean180__arms_crossed_front__01` | M/F | `lean_at_spot`. 벽 위치·방향·충돌 확인. |
| 춤추기 | `stand__dance__02__dancing__01` | M/F | `play_idle` 또는 `play_custom_animation`. 대화 상황과 종료·복구 확인. |
| 팬앰의 고개 젓기 | `panam__sit_cliff__2h_on_ground__02__head_shake__01` | F | `play_authored_sequence` 검토. 팬앰의 특정 착석 장면용 이름이며 범용 거절 제스처로 등록하지 않음. |

손 흔들기·박수·말하는 상체 동작을 첫 시각 검토 대상으로 제안한다. 끄덕임·으쓱임은 원하는 의미가 있어도 현재 찾은 자원이 착석·바 자세에 묶여 있으므로 범용 버전을 더 선별해야 한다. 장면 접두어가 있는 긴 퀘스트 모션·배우가 둘 필요한 `synced` 모션은 자동 후보로 넣지 않는다.

## 도입 전에 남은 확인

1. 실제 설치 게임·정식 모드 버전과 골격을 고정하고 후보별 재생 영상·길이·반복·종료 자세를 확인한다. 목록에 이름이 있는 것과 정상 재생을 구별한다.
2. 대상 한 명만 제어하는지, 원작 워크스팟·장면을 덮어쓰지 않는지 확인한다. 이동·전투·거리 이탈·NPC 소멸·생성 대기 중 취소에서 ANPC 소유 객체만 정리하는지 시험한다.
3. 의자·벽·난간·소품 슬롯이 필요한 동작은 해당 상황에서만 허용한다. 종료 뒤 기존 장비·자세·AI 제어를 복구하고 실제 완료만 결과로 기록한다.
4. 코드·자산을 복사하거나 재배포할 때 각 제작자의 조건을 확인한다. Swaps·MascV·M.P.A.F. 페이지는 수정·자산 사용에 제작자 허락을 요구한다. Mega Pack은 크레딧 조건의 사용·수정을 허용하는 항목이 있으나 모드 자체 재배포 금지도 명시하므로 원본 팩을 ANPC에 묶지 않는다. Quality Time은 일반 권한 표와 추가 저자 안내가 달라 구체 재사용 범위를 확인해야 한다.

현재 테스트 웹의 끄덕임·으쓱임·손 흔들기 후보는 의미를 시험하는 선택 전용 예시다. 이 문서의 실제 자원과 연결하거나 새로운 실행 동작을 활성화하지 않았다. 대화 품질을 먼저 완성한다는 적용 순서를 유지한다.

## 조사 한계

Nexus 일부 페이지는 본문 대신 공통 화면만 반환했다. AMM은 가이드와 명시된 배포 미러로, CyberScript는 열린 제작자 설명과 그 설명에서 연결된 저장소로 보완했다. Animation Archive의 최신 파일·권한·게임 호환은 미확인이다. 공식 Wiki 웹 페이지는 본문이 반환되지 않아 API 확인 근거로 사용하지 않았다. 출처에 나온 모든 NPC 지원·동작 개수를 ANPC 환경의 검증 결과로 승격하지 않는다.
