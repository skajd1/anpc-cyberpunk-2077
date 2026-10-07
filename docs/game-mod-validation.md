# 배포 변경 이력

게임·모드·테스트 웹에 실제로 적용한 변경을 배포 단위로 기록한다. 시각 기준은 Asia/Seoul, KST(UTC+09:00)다. 과거 자료에 없는 시각은 `시각 미기록`으로 남긴다.

## DEP-20261004-L01 — 코어 런타임 및 G0/G1 설치

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| bin/x64/winmm.dll | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/LICENSE.txt | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/RED4ext.dll | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/THIRD_PARTY_LICENSES.txt | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| engine/config/base/scripts.ini | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| engine/tools/scc_lib.dll | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| engine/tools/scc.exe | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| r6/config/cybercmd/scc.toml | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/global.ini | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/LICENSE | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/version.dll | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks.asi | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/ThirdParty_LICENSES | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/fonts/materialdesignicons.ttf | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/fonts/NotoSans-Regular.ttf | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/fonts/NotoSansJP-Regular.otf | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/fonts/NotoSansKR-Regular.otf | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/fonts/NotoSansMono-Regular.ttf | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/fonts/NotoSansSC-Regular.otf | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/fonts/NotoSansTC-Regular.otf | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/fonts/NotoSansThai-Regular.ttf | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/scripts/IconGlyphs/icons.lua | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/scripts/json/json.lua | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/scripts/json/LICENSE | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/scripts/json/README.md | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/tweakdb/tweakdbstr.kark | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/tweakdb/usedhashes.kark | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/plugins/Codeware/Codeware.dll | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/plugins/Codeware/LICENSE | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/plugins/Codeware/THIRD_PARTY_LICENSES | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/plugins/Codeware/Data/KnownHashes.txt | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/plugins/Codeware/Scripts/Codeware.Global.reds | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/plugins/Codeware/Scripts/Codeware.Localization.reds | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/plugins/Codeware/Scripts/Codeware.reds | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/plugins/Codeware/Scripts/Codeware.UI.reds | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| red4ext/plugins/Codeware/Scripts/Codeware.UI.TextInput.reds | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/diagnostics.lua | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/init.lua | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |
| r6/scripts/ANPC/Diagnostics.reds | 설치(기존 상태 미기록) | 코어 런타임 또는 ANPC 최소 로더·진단 파일 설치 | 게임에서 모드를 로드하고 대상 NPC 상태를 확인하기 위한 기반 구성 |

- 배포 manifest·해시: config.local.game-install.json
- 백업·복원 자료: 백업 위치 미기록

## DEP-20261004-L02 — G2 대화 진입점 추가

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/init.lua | 수정 | 대화 진입점과 진단 표시 연결 | 대상 NPC에게 ANPC 대화를 시작할 경로 제공 |
| r6/scripts/ANPC/Diagnostics.reds | 재배치(내용 동일) | 대화 진입점과 진단 표시 연결 | 대상 NPC에게 ANPC 대화를 시작할 경로 제공 |
| r6/scripts/ANPC/Entry.reds | 추가 | 대화 진입점과 진단 표시 연결 | 대상 NPC에게 ANPC 대화를 시작할 경로 제공 |

- 배포 manifest·해시: config.local.g2-deployment.json
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-g2-deploy-backup-20261004

## DEP-20261004-L03 — 장면 기반 진입점 추가

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 장면 진입 스크립트와 대화 선택지 자원 배치 | 오리지널 NPC 대화에서 ANPC 진입점을 연결 |
| r6/scripts/ANPC/SceneEntry.reds | 추가 | 장면 진입 스크립트와 대화 선택지 자원 배치 | 오리지널 NPC 대화에서 ANPC 진입점을 연결 |
| archive/pc/mod/anpc_entry_scene.archive | 추가 | 장면 진입 스크립트와 대화 선택지 자원 배치 | 오리지널 NPC 대화에서 ANPC 진입점을 연결 |

- 배포 manifest·해시: config.local.scene-entry-deployment.json
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-g2-scene-deploy-backup-20261004

## DEP-20261004-L04 — 대화 위젯 기반 진입 전환

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 위젯 대화 선택지 경로로 전환하고 기존 진입 archive 제거 | 오리지널 대화 선택지에 ANPC 항목 연결 |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 위젯 대화 선택지 경로로 전환하고 기존 진입 archive 제거 | 오리지널 대화 선택지에 ANPC 항목 연결 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/init.lua | 수정 | 위젯 대화 선택지 경로로 전환하고 기존 진입 archive 제거 | 오리지널 대화 선택지에 ANPC 항목 연결 |
| archive/pc/mod/anpc_entry_scene.archive | 삭제 | 위젯 대화 선택지 경로로 전환하고 기존 진입 archive 제거 | 오리지널 대화 선택지에 ANPC 항목 연결 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[0]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-ui-entry-deploy-backup-20261004

## DEP-20261004-L05 — 선택지 포커스 처리

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 선택 항목 포커스와 입력 전달 수정 | ANPC 항목을 실제로 선택할 수 있도록 처리 |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 선택 항목 포커스와 입력 전달 수정 | ANPC 항목을 실제로 선택할 수 있도록 처리 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[1]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-ui-focus-deploy-backup-20261004

## DEP-20261004-L06 — 입력 알림 전달

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 입력 알림의 상위 컨트롤러 전달 경로 수정 | 선택한 ANPC 항목이 대화 진입으로 이어지도록 처리 |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 입력 알림의 상위 컨트롤러 전달 경로 수정 | 선택한 ANPC 항목이 대화 진입으로 이어지도록 처리 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[2]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-ui-root-deploy-backup-20261004

## DEP-20261004-L07 — NPC 진입 대상 확장

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 화자별 대화 선택지 처리 일반화 | 빅터 외 지원 NPC에도 진입점을 표시 |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 화자별 대화 선택지 처리 일반화 | 빅터 외 지원 NPC에도 진입점을 표시 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[3]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-multi-npc-deploy-backup-20261004

## DEP-20261004-L08 — 입력 리스너 등록 시점 수정

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 위젯 초기화/플레이어 부착 시 입력 등록 | 첫 접근에서 선택 입력이 누락되지 않도록 처리 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[4]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-early-input-deploy-backup-20261004

## DEP-20261004-L09 — 미스티 식별 보완

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 미스티 레코드와 현지화된 화자 이름 반영 | 미스티의 오리지널 대화 선택지에 진입점 연결 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[5]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-misty-deploy-backup-20261004

## DEP-20261004-L10 — 지원 NPC 레코드 표 반영

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 지원 인물 레코드 매핑 추가 | 대상 인물을 식별해 대응 프롬프트를 선택 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[6]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-table-deploy-backup-20261004

## DEP-20261004-L11 — 군중 대화 진입

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 군중 상호작용 진입 경로 추가 | 시민 NPC에게도 대화를 시작할 선택지 제공 |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 군중 상호작용 진입 경로 추가 | 시민 NPC에게도 대화를 시작할 선택지 제공 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[7]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-crowd-deploy-backup-20261004

## DEP-20261004-L12 — 군중 진입 진단

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 군중 진입 거부 사유 표시 추가 | 진입 조건과 차단 원인을 확인 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[8]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-crowd-diag-deploy-backup-20261004

## DEP-20261004-L13 — 군중 상태 허용 보완

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | HighLevel 1 상태의 군중 진입 조건 수정 | 조작 가능한 자유 상태 군중의 진입 차단 해소 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[9]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-crowd-tier1-deploy-backup-20261004

## DEP-20261004-L14 — 군중 워크스팟 대화

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 워크스팟 군중의 대화 전용 진입 허용 | 기존 행동을 끊지 않고 대사만 진행 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[10]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-crowd-workspot-deploy-backup-20261004

## DEP-20261004-L15 — 로그 식별 보완

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 로그의 화자 식별·지원 대상 매핑 수정 | 로그의 오리지널 대화 선택지에 진입점 연결 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[11]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-rogue-deploy-backup-20261004

## DEP-20261004-L16 — 군중 레코드 처리

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 군중 레코드와 진입 정보 처리 수정 | 군중 진입 대상 정보 처리 보완 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[12]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-crowd-record-deploy-backup-20261004

## DEP-20261004-L17 — 군중 선택지 문구

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 군중 대화 선택지 표시 문구 수정 | 군중 대상의 진입 항목을 구분 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[13]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-crowd-caption-deploy-backup-20261004

## DEP-20261004-L18 — 대화 세션·입력창

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | NPC 대화 세션과 입력창 연결 | 입력·취소·종료를 같은 세션에서 처리 |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | NPC 대화 세션과 입력창 연결 | 입력·취소·종료를 같은 세션에서 처리 |
| r6/scripts/ANPC/Session.reds | 추가 | NPC 대화 세션과 입력창 연결 | 입력·취소·종료를 같은 세션에서 처리 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[14]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-session-deploy-backup-20261004

## DEP-20261004-L19 — 한글 입력 조합

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 한글 조합기와 변환표 배치 | 게임 입력창에서 한국어 대화 입력 지원 |
| r6/scripts/ANPC/Session.reds | 수정 | 한글 조합기와 변환표 배치 | 게임 입력창에서 한국어 대화 입력 지원 |
| r6/scripts/ANPC/Hangul.reds | 추가 | 한글 조합기와 변환표 배치 | 게임 입력창에서 한국어 대화 입력 지원 |
| r6/scripts/ANPC/HangulTable.reds | 추가 | 한글 조합기와 변환표 배치 | 게임 입력창에서 한국어 대화 입력 지원 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[15]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-hangul-deploy-backup-20261004

## DEP-20261004-L20 — 오리지널 자막 연결

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | V 입력과 NPC 응답을 자막으로 표시 | 게임 자막 흐름에 대화 출력 연결 |
| r6/scripts/ANPC/Session.reds | 수정 | V 입력과 NPC 응답을 자막으로 표시 | 게임 자막 흐름에 대화 출력 연결 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[16]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-subtitle-deploy-backup-20261004

## DEP-20261004-L21 — 대화 차례 전환

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | Enter 이후 입력창을 닫고 자막 뒤 재개 | 입력창이 대사 자막을 가리지 않도록 처리 |
| r6/scripts/ANPC/Session.reds | 수정 | Enter 이후 입력창을 닫고 자막 뒤 재개 | 입력창이 대사 자막을 가리지 않도록 처리 |
| r6/scripts/ANPC/Hangul.reds | 수정 | Enter 이후 입력창을 닫고 자막 뒤 재개 | 입력창이 대사 자막을 가리지 않도록 처리 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[17]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-turn-deploy-backup-20261004

## DEP-20261004-L22 — 대화 유지 조건 감시

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 거리·소멸·전투·장면 종료에 따른 세션 정리 | 유효하지 않은 대상에게 입력창·자막이 복귀하지 않도록 처리 |
| r6/scripts/ANPC/Session.reds | 수정 | 거리·소멸·전투·장면 종료에 따른 세션 정리 | 유효하지 않은 대상에게 입력창·자막이 복귀하지 않도록 처리 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[18]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-watch-deploy-backup-20261004

## DEP-20261004-L23 — AI 응답 브리지 연결

- 일시: 2026-10-04 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | AI 요청 대기열과 응답 전달 경로 추가 | 로컬 제공자의 응답을 게임 자막에 연결 |
| r6/scripts/ANPC/Session.reds | 수정 | AI 요청 대기열과 응답 전달 경로 추가 | 로컬 제공자의 응답을 게임 자막에 연결 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[19]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-ai-deploy-backup-20261004

## DEP-20261005-L24 — ANPC.Native 통신 플러그인

- 일시: 2026-10-05 · 시각 미기록
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| red4ext/plugins/ANPC/ANPC.Native.dll | 추가 | Native HTTPS 통신·JSON 응답·프롬프트·설정 배치 | 게임 내부 비동기 AI 요청과 개인 API 키 저장 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/init.lua | 수정 | Native HTTPS 통신·JSON 응답·프롬프트·설정 배치 | 게임 내부 비동기 AI 요청과 개인 API 키 저장 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | Native HTTPS 통신·JSON 응답·프롬프트·설정 배치 | 게임 내부 비동기 AI 요청과 개인 API 키 저장 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/json.lua | 추가 | Native HTTPS 통신·JSON 응답·프롬프트·설정 배치 | 게임 내부 비동기 AI 요청과 개인 API 키 저장 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 추가 | Native HTTPS 통신·JSON 응답·프롬프트·설정 배치 | 게임 내부 비동기 AI 요청과 개인 API 키 저장 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/config.lua | 추가 | Native HTTPS 통신·JSON 응답·프롬프트·설정 배치 | 게임 내부 비동기 AI 요청과 개인 API 키 저장 지원 |

- 배포 manifest·해시: config.local.ui-entry-deployment.json · Deployments[20]
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-native-deploy-backup-20261005

## DEP-20261005014440 — 행동 목록 표시

- 일시: 2026-10-05 01:44:40 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 입력/응답/종료 상태의 행동 안내 표시 | 대화 입력 뒤 어떤 행동 상태인지 확인 |

- 배포 manifest·해시: config.local.action-list-deployment.json
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/index.json
- 확인: 실게임 미검증

## DEP-20261005025249 — 단일 응답 행동 패널·한글 입력 수정

- 일시: 2026-10-05 02:52:49 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 구조화 대사/행동 응답·읽기 전용 행동 패널·Shift 한글 조합 반영 | 추가 요청 없이 행동을 표시하고 쌍자음/겹모음 입력 오류 수정 |
| r6/scripts/ANPC/Session.reds | 수정 | 구조화 대사/행동 응답·읽기 전용 행동 패널·Shift 한글 조합 반영 | 추가 요청 없이 행동을 표시하고 쌍자음/겹모음 입력 오류 수정 |
| r6/scripts/ANPC/Hangul.reds | 수정 | 구조화 대사/행동 응답·읽기 전용 행동 패널·Shift 한글 조합 반영 | 추가 요청 없이 행동을 표시하고 쌍자음/겹모음 입력 오류 수정 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 구조화 대사/행동 응답·읽기 전용 행동 패널·Shift 한글 조합 반영 | 추가 요청 없이 행동을 표시하고 쌍자음/겹모음 입력 오류 수정 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/init.lua | 수정 | 구조화 대사/행동 응답·읽기 전용 행동 패널·Shift 한글 조합 반영 | 추가 요청 없이 행동을 표시하고 쌍자음/겹모음 입력 오류 수정 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | 구조화 대사/행동 응답·읽기 전용 행동 패널·Shift 한글 조합 반영 | 추가 요청 없이 행동을 표시하고 쌍자음/겹모음 입력 오류 수정 |

- 배포 manifest·해시: config.local.actions-hangul-deployment.json
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-actions-hangul-backup-20261005-025249
- 확인: 실게임 미검증

## DEP-20261005032849 — 게임 관찰·평판과 GPT-6 Luna 연결

- 일시: 2026-10-05 03:28:49 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 표시 복장/무장·관찰·평판 수집 및 모델 설정 변경 | 현재 게임 정보를 반영하고 군중 평판 40 이상에서 V 이름 인지 |
| r6/scripts/ANPC/Session.reds | 수정 | 표시 복장/무장·관찰·평판 수집 및 모델 설정 변경 | 현재 게임 정보를 반영하고 군중 평판 40 이상에서 V 이름 인지 |
| r6/scripts/ANPC/Context.reds | 추가 | 표시 복장/무장·관찰·평판 수집 및 모델 설정 변경 | 현재 게임 정보를 반영하고 군중 평판 40 이상에서 V 이름 인지 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 표시 복장/무장·관찰·평판 수집 및 모델 설정 변경 | 현재 게임 정보를 반영하고 군중 평판 40 이상에서 V 이름 인지 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/context.lua | 추가 | 표시 복장/무장·관찰·평판 수집 및 모델 설정 변경 | 현재 게임 정보를 반영하고 군중 평판 40 이상에서 V 이름 인지 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/config.lua | 수정 | 표시 복장/무장·관찰·평판 수집 및 모델 설정 변경 | 현재 게임 정보를 반영하고 군중 평판 40 이상에서 V 이름 인지 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/init.lua | 수정 | 표시 복장/무장·관찰·평판 수집 및 모델 설정 변경 | 현재 게임 정보를 반영하고 군중 평판 40 이상에서 V 이름 인지 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | 표시 복장/무장·관찰·평판 수집 및 모델 설정 변경 | 현재 게임 정보를 반영하고 군중 평판 40 이상에서 V 이름 인지 |

- 배포 manifest·해시: config.local.context-luna-deployment.json
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-context-luna-backup-20261005-032849

## DEP-20261005041439 — 군중 생성·고유 NPC 정체성 연결

- 일시: 2026-10-05 04:14:39 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 군중별 성격/지식·재접촉 유지와 고유 인물 고정 정체성 적용 | NPC별 성향과 인지 범위를 구분해 대화에 반영 |
| r6/scripts/ANPC/Session.reds | 수정 | 군중별 성격/지식·재접촉 유지와 고유 인물 고정 정체성 적용 | NPC별 성향과 인지 범위를 구분해 대화에 반영 |
| r6/scripts/ANPC/Context.reds | 수정 | 군중별 성격/지식·재접촉 유지와 고유 인물 고정 정체성 적용 | NPC별 성향과 인지 범위를 구분해 대화에 반영 |
| r6/scripts/ANPC/Identity.reds | 추가 | 군중별 성격/지식·재접촉 유지와 고유 인물 고정 정체성 적용 | NPC별 성향과 인지 범위를 구분해 대화에 반영 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 군중별 성격/지식·재접촉 유지와 고유 인물 고정 정체성 적용 | NPC별 성향과 인지 범위를 구분해 대화에 반영 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/context.lua | 수정 | 군중별 성격/지식·재접촉 유지와 고유 인물 고정 정체성 적용 | NPC별 성향과 인지 범위를 구분해 대화에 반영 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/identity.lua | 추가 | 군중별 성격/지식·재접촉 유지와 고유 인물 고정 정체성 적용 | NPC별 성향과 인지 범위를 구분해 대화에 반영 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/json.lua | 수정 | 군중별 성격/지식·재접촉 유지와 고유 인물 고정 정체성 적용 | NPC별 성향과 인지 범위를 구분해 대화에 반영 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/config.lua | 수정 | 군중별 성격/지식·재접촉 유지와 고유 인물 고정 정체성 적용 | NPC별 성향과 인지 범위를 구분해 대화에 반영 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | 군중별 성격/지식·재접촉 유지와 고유 인물 고정 정체성 적용 | NPC별 성향과 인지 범위를 구분해 대화에 반영 |

- 배포 manifest·해시: config.local.identity-deployment.json
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-identity-backup-20261005-041439

## DEP-20261005043700 — 스캔 신원 수집

- 일시: 2026-10-05 04:37:00 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | NPC 표시 이름·소속·역할·태도·특성 수집 | 스캔 UI를 열지 않아도 게임의 현재 NPC 신원을 대화에 반영 |
| r6/scripts/ANPC/Context.reds | 수정 | NPC 표시 이름·소속·역할·태도·특성 수집 | 스캔 UI를 열지 않아도 게임의 현재 NPC 신원을 대화에 반영 |
| r6/scripts/ANPC/ScannerIdentity.reds | 추가 | NPC 표시 이름·소속·역할·태도·특성 수집 | 스캔 UI를 열지 않아도 게임의 현재 NPC 신원을 대화에 반영 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/context.lua | 수정 | NPC 표시 이름·소속·역할·태도·특성 수집 | 스캔 UI를 열지 않아도 게임의 현재 NPC 신원을 대화에 반영 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/identity.lua | 수정 | NPC 표시 이름·소속·역할·태도·특성 수집 | 스캔 UI를 열지 않아도 게임의 현재 NPC 신원을 대화에 반영 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | NPC 표시 이름·소속·역할·태도·특성 수집 | 스캔 UI를 열지 않아도 게임의 현재 NPC 신원을 대화에 반영 |

- 배포 manifest·해시: config.local.scanner-deployment.json
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-scanner-backup-20261005-043700

## DEP-20261005043858 — 스캔 이름의 자막 동기화

- 일시: 2026-10-05 04:38:58 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 입력별 최신 스캔 이름으로 NPC 자막 화자 갱신 | 대사와 자막에 같은 NPC 표시 이름 사용 |

- 배포 manifest·해시: config.local.scanner-deployment.json
- 백업·복원 자료: config.local.backups/preserved-20261005-045319/anpc-scanner-name-backup-20261005-043858

## DEP-20261005064159 — Tab 캐릭터·인벤토리 메뉴 연결

- 일시: 2026-10-05 06:41:59 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 입력/커서/한영 보관·메뉴 중 대화 보류·닫은 뒤 재검사 | 대화 중 Tab 메뉴 사용과 동일 세션 복귀 지원 |
| r6/scripts/ANPC/Session.reds | 수정 | 입력/커서/한영 보관·메뉴 중 대화 보류·닫은 뒤 재검사 | 대화 중 Tab 메뉴 사용과 동일 세션 복귀 지원 |
| r6/scripts/ANPC/Hangul.reds | 수정 | 입력/커서/한영 보관·메뉴 중 대화 보류·닫은 뒤 재검사 | 대화 중 Tab 메뉴 사용과 동일 세션 복귀 지원 |
| r6/scripts/ANPC/GameMenu.reds | 추가 | 입력/커서/한영 보관·메뉴 중 대화 보류·닫은 뒤 재검사 | 대화 중 Tab 메뉴 사용과 동일 세션 복귀 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 입력/커서/한영 보관·메뉴 중 대화 보류·닫은 뒤 재검사 | 대화 중 Tab 메뉴 사용과 동일 세션 복귀 지원 |

- 배포 manifest·해시: config.local.tab-menu-deployment.json
- 백업·복원 자료: config.local.backups/tab-menu-20261005-064159
- 확인: 실게임 미검증

## DEP-20261005140037 — 인물별 말투·군중 성인 유머

- 일시: 2026-10-05 14:00:37 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/ScannerIdentity.reds | 수정 | 인물별 욕설/은어 지침·군중 말투·성인 분류 반영 | 인물 정체성과 세계관에 맞는 말투를 유지하고 성인 유머 조건 제한 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/context.lua | 수정 | 인물별 욕설/은어 지침·군중 말투·성인 분류 반영 | 인물 정체성과 세계관에 맞는 말투를 유지하고 성인 유머 조건 제한 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/identity.lua | 수정 | 인물별 욕설/은어 지침·군중 말투·성인 분류 반영 | 인물 정체성과 세계관에 맞는 말투를 유지하고 성인 유머 조건 제한 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | 인물별 욕설/은어 지침·군중 말투·성인 분류 반영 | 인물 정체성과 세계관에 맞는 말투를 유지하고 성인 유머 조건 제한 |

- 배포 manifest·해시: config.local.npc-tone-deployment.json
- 백업·복원 자료: config.local.backups/npc-tone-20261005-140037
- 확인: 실게임 미검증

## DEP-20261005170154 — AMM 동작 어댑터

- 일시: 2026-10-05 17:01:54 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | 동적 모션 후보·응답 검증·임시 워크스팟 실행/중단 연결 | 선택한 외부 동작을 허용된 NPC 상태에서 수행하도록 연결 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 동적 모션 후보·응답 검증·임시 워크스팟 실행/중단 연결 | 선택한 외부 동작을 허용된 NPC 상태에서 수행하도록 연결 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/identity.lua | 수정 | 동적 모션 후보·응답 검증·임시 워크스팟 실행/중단 연결 | 선택한 외부 동작을 허용된 NPC 상태에서 수행하도록 연결 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | 동적 모션 후보·응답 검증·임시 워크스팟 실행/중단 연결 | 선택한 외부 동작을 허용된 NPC 상태에서 수행하도록 연결 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/actions.lua | 추가 | 동적 모션 후보·응답 검증·임시 워크스팟 실행/중단 연결 | 선택한 외부 동작을 허용된 NPC 상태에서 수행하도록 연결 |

- 배포 manifest·해시: config.local.amm-deployment.json
- 백업·복원 자료: config.local.backups/amm-adapter-20261005-170154
- 대응 패키지: dist/ANPC-0.1.0-dev-amm-adapter.zip
- 확인: 실게임 미검증

## DEP-20261005174657 — AMM 2.12.5·ArchiveXL 1.27.3 설치

- 일시: 2026-10-05 17:46:57 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/credits.lua | 추가 | 제작자·외부 라이선스 고지 설치 | 외부 의존성의 저작권/라이선스 정보 보존 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/db.sqlite3 | 추가 | AMM 모션·리그·엔티티 DB 설치 | 호환 동작 후보를 조회할 카탈로그 제공 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/init.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/update_notes.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Collabs/API.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Collabs/Custom Appearances/appearance_template.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Collabs/Custom Entities/entity_template.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Collabs/Custom Locations/location_template.json | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Collabs/Custom Poses/pose_template.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Collabs/Custom Props/prop_template.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/External/Cron.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/External/GameSession.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/External/GameSettings.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/External/Inspect.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Localization/en_US.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Localization/ru_RU.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Localization/tr_TR.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Localization/zh_CN.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/anims.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/camera.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/director.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/entity.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/light.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/props.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/scan.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/spawn.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/swap.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/tools.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Modules/util.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Themes/Computer Blue.json | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Themes/Cyberpunk.json | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Themes/Default.json | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Themes/Deus Ex.json | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Themes/editor.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Themes/Midori.json | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Themes/Original.json | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Themes/Purpura.json | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Themes/Silverhand.json | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/Themes/ui.lua | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/User/Decor/vortex_needs_this.txt | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/User/Decor/Backup/vortex_needs_this.txt | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/User/Locations/vortex_needs_this.txt | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/User/Scripts/Judy and Nibbles - Mansion.json | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod/User/Themes/vortex_needs_this.txt | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| archive/pc/mod/basegame_AMM_Props.archive | 추가 | AMM Props·워크스팟 자원 설치 | 동작 재생에 필요한 기본 자원 제공 |
| archive/pc/mod/basegame_johnny_companion.archive | 추가 | AMM Johnny 기본 자원 설치 | AMM 필수 archive 구성 충족 |
| archive/pc/mod/basegame_AMM_requirement.archive | 추가 | 정식 AMM 기본 구성 파일 설치 | AMM 런타임 초기화·카탈로그 조회 지원 |
| archive/pc/mod/AMM_PlayerBodyTag.xl | 추가 | AMM 플레이어 엔티티 자원 스코프 설정 설치 | 기본 AMM 엔티티 자원 참조 지원 |
| r6/config/redsUserHints/ArchiveXL.toml | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/ArchiveXL.dll | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/LICENSE | 추가 | 제작자·외부 라이선스 고지 설치 | 외부 의존성의 저작권/라이선스 정보 보존 |
| red4ext/plugins/ArchiveXL/THIRD_PARTY_LICENSES | 추가 | 제작자·외부 라이선스 고지 설치 | 외부 의존성의 저작권/라이선스 정보 보존 |
| red4ext/plugins/ArchiveXL/Bundle/ArchiveXL.archive | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/Migration.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PhotoModeScope.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerBaseScope.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationBeardFix.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationBeardScope.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationBrowsFix.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationBrowsPatch.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationBrowsScope.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationEyesFix.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationEyesPatch.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationEyesScope.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationHairFix.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationHairPatch.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationHairScope.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationLashesFix.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationLashesPatch.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationLashesScope.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/PlayerCustomizationScope.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/QuestBaseScope.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Bundle/VisualTags.xl | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Scripts/ArchiveXL.DynamicAppearance.reds | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Scripts/ArchiveXL.Global.reds | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |
| red4ext/plugins/ArchiveXL/Scripts/ArchiveXL.reds | 추가 | ArchiveXL 1.27.3 기본 구성 설치 | AMM의 자원 확장 의존성 충족 |

- 배포 manifest·해시: config.local.amm-dependencies.json
- 백업·복원 자료: config.local.backups/amm-dependencies-20261005-174656
- 확인: 실게임 미검증; 선택용 외형 archive 14개 제외

## DEP-20261005230409 — 주디·팬앰·조니 진행·관계·인지 연결

- 일시: 2026-10-05 23:04:09 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Context.reds | 수정 | 게임 진행 스냅샷 수집 호출 추가 | 현재 게임 상태를 대화 입력에 연결 |
| r6/scripts/ANPC/Story.reds | 추가 | 일지 24개·fact 13개의 읽기 전용 수집기 추가 | 세 인물의 진행·선택 상태 조회 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/story.lua | 추가 | 관계·개별 공개·실패/결말·미확인 분기 판정 추가 | 친구/연인과 비밀 인지를 독립적으로 처리 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/context.lua | 수정 | 이름 인지·응답 재검사 지문에 진행 상태 반영 | 만남/상태 변경에 따른 호칭·늦은 응답 처리 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/identity.lua | 수정 | 관계 카드·인지 지식·현재 목표를 게임 상태로 투영 | 수동 가정 대신 현재 조건에 맞는 대사 생성 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | 우선 상태 조회 목록을 포함해 생성 데이터 갱신 | 조회 대상과 프롬프트 자료 동기화 |

- 배포 manifest·해시: config.local.priority-story-deployment.json
- 백업·복원 자료: config.local.backups/priority-story-20261005-230409
- 대응 패키지: dist/ANPC-0.1.0-dev-priority-story.zip
- 확인: 실게임 미검증

## DEP-20261005-L36 — 테스트 웹 대사별 행동 표시

- 일시: 2026-10-05 · 시각 미기록
- 대상/상태: 로컬 테스트 웹 / 반영 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| prototype/public/compare.js | 수정 | 대사별 행동 의미/결과와 AMM 후보·정적 모듈 경로 반영 | 대사 아래 선택 행동을 확인하고 모의 실행과 게임 실행을 구분 |
| prototype/public/test-tools.js | 수정 | 대사별 행동 의미/결과와 AMM 후보·정적 모듈 경로 반영 | 대사 아래 선택 행동을 확인하고 모의 실행과 게임 실행을 구분 |
| prototype/public/core.js | 수정 | 대사별 행동 의미/결과와 AMM 후보·정적 모듈 경로 반영 | 대사 아래 선택 행동을 확인하고 모의 실행과 게임 실행을 구분 |
| prototype/public/motions.js | 추가 | 대사별 행동 의미/결과와 AMM 후보·정적 모듈 경로 반영 | 대사 아래 선택 행동을 확인하고 모의 실행과 게임 실행을 구분 |
| prototype/public/research.js | 수정 | 대사별 행동 의미/결과와 AMM 후보·정적 모듈 경로 반영 | 대사 아래 선택 행동을 확인하고 모의 실행과 게임 실행을 구분 |
| prototype/server.js | 수정 | 대사별 행동 의미/결과와 AMM 후보·정적 모듈 경로 반영 | 대사 아래 선택 행동을 확인하고 모의 실행과 게임 실행을 구분 |

- 배포 manifest·해시: 당시 웹 반영 manifest 없음
- 백업·복원 자료: 백업 위치 미기록

## DEP-20261008011224 — NPC 일본어 음성 개발 시험 연결

- 일시: 2026-10-08 01:12:25 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 음성 활성 시 출력 필드 안내·스키마를 음성 형태로 바꾸고, delivery·speech_text 검사와 일본어 구어 검사 추가. 수용된 대사의 음성 요청을 tts/req-<id>.json으로 쓰고 새 입력·종료·초기화 때 tts/stop.json을 씀 | UF-67~UF-73 개발 시험. 로컬 TTS 보조 프로세스가 스트리밍·버퍼링 재생. speech_text가 부적합하면 음성만 생략하고 자막은 유지 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/config.lua | 수정 | voice_enabled=true, 주디·빅터·로그와 군중의 개발용 voice_profile 연결 추가 | 연결이 없는 인물은 자막만 표시 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | 프롬프트 0.18, 음성 출력 스키마(voice_schema)와 출력 필드 안내(contracts) 추가 | 음성 활성 요청에 일본어 speech_text와 45자 대사 안내 적용 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/tts/ | 추가 | 음성 요청 파일 폴더 생성 | CET와 보조 프로세스 사이의 개발용 파일 요청 경로 |

- 배포 manifest·해시: config.local.voice-dev-deployment.json
- 백업·복원 자료: config.local.backups/voice-dev-20261008-011224
- 확인: 실게임 미검증. Lua 단위 검사는 로컬 Lua 실행기가 없어 미실행. 보조 프로세스는 저장소 밖 개발 도구로 배포물에 포함하지 않음
