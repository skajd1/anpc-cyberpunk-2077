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

## DEP-20261008014811 — TweakXL 1.11.4·Audioware 1.9.9 설치

- 일시: 2026-10-08 01:48:11 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| red4ext/plugins/TweakXL/ (7개) · r6/tweaks/ | 추가 | TweakXL 1.11.4 공식 릴리스 압축 해제 | Audioware 필수 의존성 |
| red4ext/plugins/audioware/audioware.dll · r6/scripts/Audioware/ (19개) | 추가 | Audioware 1.9.9 공식 릴리스 압축 해제 | 설계안 A(개발·검증 계획 6.4.1)의 NPC 위치 음성 재생 시험. 기존 파일 변경 없음 |

- 배포 manifest·해시: config.local.audioware-deployment.json (릴리스 ZIP SHA-256·설치 파일 26개 해시·생성 폴더 4개)
- 백업·복원 자료: 기존 파일 덮어쓰기 없음. manifest의 파일·생성 폴더 삭제로 복원
- 확인: 실게임 로드 미검증

## DEP-20261008015427 — NPC 음성 Audioware 3D 재생 개발 시험

- 일시: 2026-10-08 01:54:27 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | Audioware가 있고 보조 프로세스가 살아 있으면 output=slots로 요청하고, tts/seg-<id>-<n>.json 구간을 앞 구간 길이에 맞춰 이어 재생. 첫 구간 재생 때 자막·행동 시작, 3초 안에 구간이 없으면 자막만. 요청 때 음원 등록, 종료 때 해제 | 설계안 A(개발·검증 계획 6.4.1). 음성이 대화 NPC 위치에서 들리고 자막이 첫 음성과 함께 표시 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/config.lua | 수정 | voice_wait_s=3.0, voice_sec_per_char=0.16 추가 | 첫 구간 대기 한도와 자막 표시 시간 계산 |
| r6/scripts/ANPC/Voice.reds | 추가 | Entry 확장: VoiceSpatialAvailable·VoicePrepare·VoicePlay·VoiceStop·VoiceRelease·OnAIVoiceResponse. Audioware 참조는 @if(ModuleExists("Audioware"))로 분리 | Audioware 없으면 false를 돌려 보조 프로세스 2D 재생으로 대체 |
| r6/audioware/ANPC/manifest.yaml | 추가 | anpc_voice_0~7 슬롯을 on-demand로 선언 | 재생할 때마다 슬롯 파일을 다시 읽어 보조 프로세스가 덮어쓴 음성을 재생 |
| r6/audioware/ANPC/slots/slot_0~7.wav | 추가 | 0.2초 무음 자리 표시 파일 | 시작 시 manifest 검증 통과. 실행 중 보조 프로세스가 덮어씀 |

- 배포 manifest·해시: config.local.voice-spatial-deployment.json
- 백업·복원 자료: config.local.backups/voice-spatial-20261008-015427 (수정 2개 백업, 추가 10개는 삭제로 복원)
- 확인: 실게임 미검증(redscript 컴파일·Audioware 로드 포함). Lua 단위 검사 미실행

## DEP-20261008015726 — 군중 NPC 대화 중 정지·V 시선

- 일시: 2026-10-08 01:57:27 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/NpcControl.reds | 추가 | 군중 세션 시작 시 제자리 대기 명령(20초, 10초마다 갱신)·V 시선·제자리 몸통 정렬, 종료 시 자기 명령·시선 해제 | UF-14·SR-11. 걷는 군중이 입력 중 멀어지지 않음. 해제 누락 시에도 20초 뒤 자동 만료 |
| r6/scripts/ANPC/Entry.reds | 수정 | 군중 StartSession에서 제어 시작, 세션 감시마다 유지, EndSession·Reset에서 해제 | 장면 허브 NPC는 UF-15에 따라 제어하지 않음 |
| r6/scripts/ANPC/Session.reds | 수정 | ChatSession에 제어 상태 필드 추가 | 세션별 제어 추적 |

- 배포 manifest·해시: config.local.crowd-hold-deployment.json
- 백업·복원 자료: config.local.backups/crowd-hold-20261008-015726 (수정 2개 백업, 추가 1개는 삭제로 복원)
- 확인: 실게임 미검증(redscript 컴파일 포함)

## DEP-20261008020223 — 음성 redscript 컴파일 오류 수정

- 일시: 2026-10-08 02:02:23 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Voice.reds | 수정 | Audioware 호출을 조건부 static 클래스 AnpcAudioware로 옮기고 Audioware 형식을 조건부 import | DEP-20261008015427 배포본이 같은 모듈 클래스에 @addMethod를 써 UNRESOLVED_REF로 전체 ANPC 스크립트 컴파일 실패 |
| r6/scripts/ANPC/Entry.reds | 수정 | 음성 메서드(VoiceSpatialAvailable·VoicePrepare·VoicePlay·VoiceStop·VoiceRelease·OnAIVoiceResponse)를 Entry 클래스 안에 추가 | 컴파일 복구. 동작은 DEP-20261008015427 설계와 같음 |

- 배포 manifest·해시: config.local.voice-fix-deployment.json
- 백업·복원 자료: config.local.backups/voice-fix-20261008-020223
- 확인: 게임 scc로 Audioware 있음·없음 두 경우 시험 컴파일 통과. 실게임 동작 미검증

## DEP-20261008021503 — NPC 음성 환경 효과·가림·음량 설정

- 일시: 2026-10-08 02:15:03 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Voice.reds | 수정 | 음원 등록에 환경 프리셋·가림(occlusion) 적용, 슬롯 재생에 음량 인수 추가 | 원작 음성과 같은 실내외 효과·벽 뒤 감쇠로 공간감 차이를 줄임 |
| r6/scripts/ANPC/Entry.reds | 수정 | VoicePlay에 음량 인수 추가 | CET 설정 음량 전달 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 구간 재생 시 voice_volume 전달 | 원작 음성과 크기 맞춤 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/config.lua | 수정 | voice_volume=1.0 추가 | 청취로 조정 |

- 배포 manifest·해시: config.local.voice-env-deployment.json
- 백업·복원 자료: config.local.backups/voice-env-20261008-021503
- 확인: scripts/check-redscript.ps1 통과(Audioware 있음·없음). 실게임 동작 미검증

## DEP-20261008030606 — 군중 차선 정지·커뮤니티 허브 진입 재확인

- 일시: 2026-10-08 03:06:07 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/NpcControl.reds | 수정 | 정지 명령 전에 CrowdMemberComponent.TryStopTrafficMovement로 차선 이동 정지, 정지 지점에서 0.5m 넘게 벗어나면 1초 간격 이상으로 재정지, 워크스팟 중 시작이면 벗어난 뒤 적용 | UF-14·SR-11. DEP-20261008015726의 정지 명령만으로는 차선을 걷는 군중이 대화 중 계속 걸어감 |
| r6/scripts/ANPC/Entry.reds | 수정 | 원작 허브 표시 때 화자 미발견·상태 차단이면 허브가 떠 있는 동안 0.5초(5초 뒤 1초) 간격으로 재확인하고 통과할 때만 대화 위젯 갱신 | UF-11·SR-16. 로그 첫 접근에서 ANPC 항목이 안 뜨고 물러났다 재접근해야 표시되던 문제 |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 선택 대기 원작 허브 존재 확인 함수 추가 | 허브가 닫히면 재확인 중지 |

- 배포 manifest·해시: config.local.crowd-stop-deployment.json
- 백업·복원 자료: config.local.backups/crowd-stop-20261008-030606 (수정 3개 백업)
- 확인: scripts/check-redscript.ps1 통과(Audioware 있음·없음). 실게임 동작 미검증

## DEP-20261008032457 — 군중 대화 종료 뒤 차선 재합류·입력칸 키 고착 방지

- 일시: 2026-10-08 03:24:58 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/NpcControl.reds | 수정 | 해제 때 ANPC가 멈춘 군중을 ReactionSystem.TryAndJoinTraffic으로 차선에 재합류(0.2초 뒤 시작, 실패 시 0.5초 간격 최대 8회). 같은 NPC의 새 세션·워크스팟 중이면 중단 | UF-14·SR-11. DEP-20261008030606 이후 대화가 끝나도 군중이 30초 넘게 서 있음 |
| r6/scripts/ANPC/Entry.reds | 수정 | 세션 동안 이동 축(MoveX/MoveY) 입력 감시, 이동 중이면 입력칸 열기를 미루고 세션 감시에서 뗀 뒤 열기. 재합류 중단 판정용 제어 대상 확인 추가 | UF-17·SR-17. 이동 키를 누른 채 입력칸이 열리면 뗌을 입력칸이 가져가 키가 눌린 채 남음 |
| r6/scripts/ANPC/Session.reds | 수정 | 입력칸이 누름을 받은 키를 추적해 Enter/Esc 때 모두 뗀 뒤(최대 1초) 닫기. 이동 축 감시 객체와 세션 열기 지연 상태 추가 | UF-17·SR-17. Enter 뒤 가끔 V가 옆으로 계속 이동하던 문제 |

- 배포 manifest·해시: config.local.crowd-rejoin-deployment.json
- 백업·복원 자료: config.local.backups/crowd-rejoin-20261008-032457 (수정 3개 백업)
- 확인: scripts/check-redscript.ps1 통과(Audioware 있음·없음). 실게임 동작 미검증

## DEP-20261008040617 — 감정 sad·프롬프트 0.19와 배포 스크립트 기준 동기화

- 일시: 2026-10-08 04:06:17 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 응답 검사의 감정 허용값에 sad 추가 | 공통 계약의 감정 열거값과 일치. sad 응답을 검사 실패로 버리지 않음 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | prompt_version 0.18 → 0.19, 출력 스키마·생성 지침의 emotion에 sad 추가 | NPC가 슬픔 감정을 선택해 해당 참조 음성 키로 쓸 수 있음 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/config.lua, diagnostics.lua | 수정 | 줄바꿈만 LF → CRLF(내용 동일) | 배포 스크립트(DIST-26) 첫 실행으로 게임 파일을 저장소 소스와 같은 바이트로 맞춤. 동작 변화 없음 |
| r6/scripts/ANPC/Diagnostics.reds, HangulTable.reds, Voice.reds | 수정 | 줄바꿈만 LF → CRLF(내용 동일) | 같음 |
| r6/audioware/ANPC/manifest.yaml | 수정 | 줄바꿈만 LF → CRLF(내용 동일) | 같음 |

- 백업·복원·해시: config.local.backups/DEP-20261008040617/manifest.json
- 확인: scripts/check-redscript.ps1 통과(Audioware 있음·없음). 실게임 동작 미검증

## DEP-20261008223949 — 일본어 원문 우선·인물별 일본어 말투 데이터와 지식 선별·읽기 개선

- 일시: 2026-10-08 22:39:49 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | 프롬프트 0.20 → 0.21, 음성 출력 순서를 speech_text(일본어 원문) → dialogue·follow_up(한국어 자막)으로 변경, 일본어 구어 지침, 주디·빅터·로그의 일본어 말투 프로필과 예시 string_id | 일본어 대사의 번역투·인물 말투 불일치 개선(비교 결과 채택). 원작 대사 원문은 포함하지 않음 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 음성 요청에 인물 데이터 뒤 일본어 말투 데이터 메시지 추가, 합성 직전 단독 V를 ヴィー로 보정, 지식·읽기 선별 모듈 연결과 직전 행동 결과 전달 | 말투 데이터 전달과 TTS가 V를 빼먹는 문제 해결 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/ja_style_examples.local.json | 추가 | 설치된 게임 파일에서 추출한 말투 예시 원문(인물당 6쌍) | 로컬 생성 파일. 저장소·배포물에 포함하지 않음 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/retrieval.lua | 추가 | 상세 지식·예시 선별과 고유명사 경계 일치 | 웹과 같은 지식 선별 순서 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/speech.lua | 추가 | 승인 읽기 선별(현재 입력·인물 이름·선별 공개 지식 기준, 최대 12개) | 무관한 읽기 사전 항목 전달 방지 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/actions.lua | 수정 | 행동 요청 결과(수용·실행 중·실패·취소)를 같은 세션의 다음 턴에 전달, 세션이 다르면 넘기지 않음 | 실행 결과를 성공으로 오인하지 않음 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/identity.lua | 수정 | 용어 일치 함수를 retrieval.lua로 이동 | 중복 제거, 동작 동일 |

- 백업·복원·해시: config.local.backups/DEP-20261008223949/manifest.json
- 확인: 배포 후 계획 변경 0. 실게임 동작 미검증

## DEP-20261008235433 — 응답 감정 표정·AMM 제스처 18종·표정/제스처 확인 도구

- 일시: 2026-10-08 23:54:33 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Expression.reds | 추가 | NpcExpression: 원작 FacialReaction으로 얼굴 표정만 적용(초기화 후 0.5초 뒤), ANPC가 건 표정만 ResetFacial로 복구 | UF-74 응답 감정 표정. 몸·위치·워크스팟을 건드리지 않음 |
| r6/scripts/ANPC/Entry.reds | 수정 | ExpressionApply·ExpressionReset, 대화 종료·초기화 때 표정 복구, 확인 도구용 DebugPinTarget·DebugMotionTarget·DebugExpression | 세션 NPC(군중·커뮤니티 인물)에 안전 조건에서만 표정 적용 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/expressions.lua | 추가 | emotion → 표정 대응 7종(무표정·미소·긴장·분노·공포·슬픔·관심) | AI 변경 없이 기존 감정값으로 표정 결정 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 응답 감정을 받아 첫 음성 또는 자막 표시 순간 표정 적용 | 표정·자막·음성·제스처 동시 시작 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/prompts.lua | 수정 | 행동 후보의 AMM 제스처 3 → 18종 | 대사에 맞는 동작 선택 폭 확대 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/actions.lua | 수정 | 확인 도구가 고정한 NPC 대상 경로, 재생 가능 제스처 조회 | 대화 밖 제스처 시험 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/devtools.lua | 추가 | 바라보는 NPC 고정·다음 표정·다음 제스처·해제(CET 단축키 `[ANPC 시험]`·오버레이 버튼), 결과 8초 표시 | 실게임 확인 도구 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/init.lua | 수정 | 확인 도구 등록·갱신·표시 | 같음 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/config.lua | 수정 | expression_enabled=true, dev_tools=true | 기능·도구 켜기 |

- 백업·복원·해시: config.local.backups/DEP-20261008235433/manifest.json
- 확인: scripts/check-redscript.ps1 통과(Audioware 있음·없음). 실게임 동작 미검증

## DEP-20261009010542 — 말하기 입모양(UF-75)과 로컬 입모양 자원

- 일시: 2026-10-09 01:05:42 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| archive/pc/mod/ANPC_talk.local.archive | 추가 | 남녀 원작 얼굴 표정 묶음·표정 대응표에 말하기 표정 3종(분류 4)을 더한 로컬 빌드 아카이브. 원작 일본어 립싱크 클립으로 이 PC에서 생성 | 표정 기능으로 말하는 입모양을 재생. 원작 자원이 들어 있어 저장소·배포물에는 포함하지 않음. 같은 원작 표정 파일을 고치는 다른 모드와 충돌 가능 |
| r6/scripts/ANPC/Expression.reds | 수정 | Talk/EndTalk: 말하기 표정 즉시 적용, 끝나면 기억한 감정 표정 복귀 | 음성 시작·끝에 맞춘 입모양 |
| r6/scripts/ANPC/Entry.reds | 수정 | TalkStart·TalkStop·DebugTalk | 세션 NPC의 안전 조건에서만 입모양 적용 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 첫 음성 구간 재생 때 입모양 시작, 마지막 구간 끝·다른 요청·새 입력·종료 때 멈춤 | 같음 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/expressions.lua | 수정 | 입모양 자원 확인, 변형 1~3 순환 시작·멈춤 | 자원이 없으면 입모양 없이 진행 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/devtools.lua | 수정 | 확인 도구에 다음 말하기 입모양 시험 | 실게임 확인 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/config.lua | 수정 | lipsync_enabled=true | 기능 켜기 |

- 백업·복원·해시: config.local.backups/DEP-20261009010542/manifest.json
- 확인: scripts/check-redscript.ps1 통과(Audioware 있음·없음). 실게임 동작 미검증

## DEP-20261009015550 — TTS 보조 프로세스 자동 실행(Native TtsHelper)

- 일시: 2026-10-09 01:55:50 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| red4ext/plugins/ANPC/ANPC.Native.dll | 수정 | GitHub Actions 빌드(실행 37812299900). TtsHelper: 플러그인 로드 때 보조 프로세스 실행, Job Object로 게임 종료 시 함께 종료, ANPCNative_TtsStatus·ANPCNative_TtsRestart 추가 | 게임을 켜면 TTS가 함께 준비되고, 수동 실행·종료가 필요 없음 |
| red4ext/plugins/ANPC/tts-helper.local.json | 추가 | 보조 프로세스 실행 명령·작업 폴더·환경·로그 경로(로컬 설정) | 개인 경로라 저장소·배포물 제외 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/init.lua | 수정 | 진단 창에 TTS 상태·응답 여부·재시작 버튼 | 상태 확인과 복구 |

- 백업·복원·해시: config.local.backups/DEP-20261009015550/manifest.json
- 확인: GitHub Actions 빌드·테스트 통과. 실게임 동작 미검증

## DEP-20261009020207 — TTS 보조 프로세스 설정 파일 JSON 형식 수정

- 일시: 2026-10-09 02:02:07 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| red4ext/plugins/ANPC/tts-helper.local.json | 수정 | 경로 백슬래시를 JSON 이스케이프로 저장한 올바른 JSON으로 교체(설정 값은 같음) | DEP-20261009015550 배포본이 JSON 형식 오류라 Native가 failed:config_invalid로 보조 프로세스를 띄우지 못함 |

- 백업·복원·해시: config.local.backups/DEP-20261009020207/manifest.json
- 확인: 배포 전 JSON 형식 검사 통과. 실게임 자동 실행 미검증

## DEP-20261009020746 — CET 첫 음성 대기 한도 4초로 수정

- 일시: 2026-10-09 02:07:46 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료(게임 실행 중 배포, CET 모드 다시 불러오기 필요)

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/config.lua | 수정 | voice_wait_s 3.0 → 4.0 | 보조 프로세스가 3초 시한에 맞춰 낸 첫 음성 구간 직전에 CET가 같은 3초로 포기해 자막만 나오던 경쟁 해소 |

- 백업·복원·해시: config.local.backups/DEP-20261009020746/manifest.json
- 확인: 실게임 동작 미검증

## DEP-20261009021528 — 장면 안 주요 인물 표정·입모양 허용과 진단 창 정리

- 일시: 2026-10-09 02:15:28 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| r6/scripts/ANPC/Entry.reds | 수정 | FaceSafeReason(사망·전투·거리만 검사) 추가, ExpressionApply·TalkStart·확인 도구 고정에 사용 | 원작 대화 허브를 보류한 장면 안의 커뮤니티 인물에게 npc_in_scene으로 표정·입모양이 막히던 문제 해결. 제스처는 기존 안전 검사 유지 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 최근 음성·얼굴 처리 결과 기록(재생 시작·자막만 사유·생략 사유·완료, 표정·입모양 결과) | 진단 창에서 원인 확인 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/init.lua | 수정 | 진단 창을 요약·최근 결과·접는 구역(대상·장면 진입·API 키·시험)으로 재구성, 고정 안내 문구 삭제 | 디버깅 단순화 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/devtools.lua | 수정 | 시험 구역 안내 문구 정리 | 같음 |

- 백업·복원·해시: config.local.backups/DEP-20261009021528/manifest.json
- 확인: scripts/check-redscript.ps1 통과(Audioware 있음·없음). 직전 게임 종료 때 TTS 보조 프로세스 동반 종료 확인. 실게임 표정·입모양 미검증

## DEP-20261009023015 — 입모양 소리 구간 연동과 종료 시 닫기

- 일시: 2026-10-09 02:30:15 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 구간 알림의 소리 구간(talk)을 읽어 재생 위치에 맞춰 입 열기·닫기, 메뉴로 음성이 멈추면 닫기, 진단 창에 입모양 구간 수 표시 | 말하는 중 쉼과 음성이 끝난 뒤에도 입이 움직이던 문제 해결. talk가 없으면 구간 전체를 소리로 봄 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/expressions.lua | 수정 | talkBegin·talkOpen·talkPause와 소리 구간 판단(0.05초 먼저 열기, 0.2초 미만 쉼 연결) | 같음 |
| r6/scripts/ANPC/Entry.reds | 수정 | TalkStart를 TalkBegin·TalkOpen·TalkPause로 분리, 확인 도구 말하기는 변형 전환 | 같음 |
| r6/scripts/ANPC/Expression.reds | 수정 | 입 닫기·감정 표정 복귀를 ResetFacial 경유로 변경(복귀 0.5초 뒤, 감정 표정이 보일 때 입 열기 0.3초 뒤) | 말하기 표정에서 감정 표정으로 바로 바꾸면 무시돼 입이 계속 움직이던 문제 해결 |

- 백업·복원·해시: config.local.backups/DEP-20261009023015/manifest.json
- 확인: scripts/check-redscript.ps1 통과(Audioware 있음·없음). 소리 구간을 보내는 TTS 보조 프로세스(게임 폴더 밖)와 함께 동작. 실게임 동작 미검증

## DEP-20261009023956 — 디버그 창 용어 정리와 상태 코드 한국어 표시

- 일시: 2026-10-09 02:39:56 KST (UTC+09:00)
- 대상/상태: 게임 / 적용 완료

| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |
| --- | --- | --- | --- |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/init.lua | 수정 | 창 이름 "ANPC 디버그", 버전 표기에서 G0/G1 제거, G1 모의 대사 버튼 삭제, 구역을 바라보는 NPC·원작 선택지 연결·API 키·테스트로 정리, 예/아니오/모름 표시 | 쓰지 않는 개발 단계 용어 제거와 디버깅 가독성 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/labels.lua | 추가 | 대화·대상 검사·원작 선택지·AI 응답·TTS 상태 코드의 한국어 표시 이름 | 영어 상태 코드 대신 뜻이 보이게 함. 모르는 코드는 원문 표시 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/diagnostics.lua | 삭제 | G1 모의 대사 판정 모듈 | 쓰지 않는 기능 제거 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/devtools.lua | 수정 | 시험 → 테스트, 버튼·단축키·결과 문구 정리, 대상 불가 사유 한국어 표시 | 같음 |
| bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge.lua | 수정 | 주석 용어만 변경 | 동작 변화 없음 |
| r6/scripts/ANPC/Diagnostics.reds | 수정 | 버전 문자열 0.1.0-g0-g1 → 0.1.0 | 같음 |
| r6/scripts/ANPC/SceneEntry.reds | 수정 | 원작 선택지 연결 기록을 항목별 줄(ANPC 선택지·화자·대화 입력·키 입력·군중·감시 NPC)과 한국어 표기로 변경 | 같음 |
| r6/scripts/ANPC/Entry.reds | 수정 | 원작 선택지·군중·입력 기록 문구 한국어화 | 같음 |

- 백업·복원·해시: config.local.backups/DEP-20261009023956/manifest.json
- 확인: scripts/check-redscript.ps1 통과(Audioware 있음·없음). 실게임 표시 미검증
