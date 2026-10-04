# G0/G1 및 G2 진입점 구현·검증 기록

검사일: 2026-10-04. 기준 저장소: `main`의 `8b1591f`를 fast-forward로 받은 뒤 작업했다. G0/G1·G2 후보를 설치하고 게임 시작 컴파일·코어 로드·CET Lua/redscript 버전 연결과 기존 세이브 로드를 확인했다. 클리어 후 메인 세이브에서 NPC 진입점이 표시된다는 목표는 아직 미완료다.

## 1. 실제 설치 파일에서 확인한 결과

| 항목 | 확인 결과 | 근거/한계 |
| --- | --- | --- |
| 게임 설치 | Steam 등록 경로의 실행 파일 확인 | 실제 경로는 Git에서 제외한 `config.local.game-environment.json`에 기록 |
| 패치 | ProductVersion `2.31`, FileVersion `3.0.5294808` | 실행 파일 정보 및 메인 메뉴 `2.31` 표시 확인 |
| Steam 빌드 | `20383525` | 설치 manifest. Steam 최신 빌드 여부를 추가 확인한 것은 아님 |
| 팬텀 리버티 | 설치 depot와 `archive/pc/ep1/ep1_2_gamedata.archive` 확인 | 파일 설치 확인. 확장 장면 실행은 미검증 |
| 코어 런타임 | 최초 검사 시 없음 → RED4ext 1.30.0·redscript 0.5.31·CET 1.37.1·Codeware 1.20.5 설치 | RED4ext/Codeware 로드와 redscript 컴파일 성공 로그 확인. CET 최초 키 설정 화면 확인 |
| 선택 도구 | Red Hot Tools·REDmod 지정 실행 파일 없음 | 일반적인 설치 위치만 검사. WolvenKit·IDE는 설치 유무 미확정 |
| 실행 상태 | 재시작·기존 자동 저장 로드·ANPC 진단 UI·빅터 앞 실측 확인 | 빅터의 ANPC 항목 미표시를 재현. 앞선 종료 뒤 충돌 보고 창이 관찰돼 종료 안정성은 통과 처리하지 않음 |

게임 경로·개인 설정은 추적 문서에 넣지 않았다. 원본 `final.redscripts`에서 API를 조사한 결과와 컴파일 산출물은 임시 폴더에만 있다. 이 파일들을 저장소에 복사하지 않았다.

## 2. 구현 범위

- [redscript 수집기](../game/redscript/ANPC/Diagnostics.reds): 버전 조회·ScriptableSystem 수명 초기화, 시선 NPC 수집, 약한 NPC/플레이어 참조 고정과 실제 객체 비교, 엔티티/레코드 진단 표시, 거리·사망·양측 전투·원작 장면/대화·HighLevel 읽기.
- [CET 로더/진단 UI](../game/cet/anpc/init.lua): Lua/CET/redscript 버전 표시, CET overlay에서만 진단, 0.25초 간격 새 수집, 모의 대사 버튼에서 즉시 재검사. 원작 장면 허브/선택지 수와 미구현 경계를 표시한다. 객체를 Lua에 보관하지 않는다. overlay 종료·reload/shutdown·세션 소멸·수집 실패 시 이전 표시를 폐기한다.
- [모의 표시 차단기](../game/cet/anpc/diagnostics.lua): 동일 객체·세대·거리·안전 상태가 명시적으로 확인된 경우만 고정 한국어 문장을 진단 창에 표시한다. 누락·unknown은 차단한다.
- [환경 검사](../scripts/inspect-game.ps1), [개발 설치](../scripts/install-game-dev.ps1): PowerShell 7·UTF-8. 설치는 고정 ZIP/압축 해제 파일의 SHA-256, 게임 2.31, 실행 중 여부, 전체 목적지·기존 파일 충돌을 사전 검사한다. `-WhatIf`는 파일을 복사하지 않는다.

G1의 거리 4.5m는 개발 진단 한도다. 원작 선택지 수용·handoff·고유 인물/군중 신원·진행도 매핑은 아직 연결하지 않았으므로 `diagnostic_only`는 제품 대화 허용 판정이 아니다. G2 후보 선택지의 범위와 한계는 5절에 기록한다. 정지/시선 명령·ink 자막·persistent 기억·HTTP·API 호출은 구현하지 않았다. 모의 문장은 NPC 발화나 게임 자막으로 실행하지 않는다. 현재 수집기는 기본 게임 API를 사용한다.

## 3. 게임 번들 기준 컴파일과 모의 검사

| 검사 | 결과 | 증거 수준 |
| --- | --- | --- |
| redscript 0.5.31 CLI 컴파일 | G0/G1·G2 소스 통과, 오류 없음 | 실제 설치의 원본 `r6/cache/final.redscripts`를 기반으로 별도 임시 번들 생성 |
| 게임 시작 시 redscript 컴파일 | G0/G1·G2 후보 + Codeware 통과 | `redscript_rCURRENT.log`의 2026-10-04 07:01:46 KST `Compilation complete` 및 modded 번들 출력 확인 |
| CET/ANPC 초기화와 재로드 | 실제 게임에서 통과 | CET 콘솔의 Lua/redscript `0.1.0-g0-g1`, CET `v1.37.1` 확인. 최초 버전 조회 실패를 `GetSingleton("ANPC.Diagnostics"):Version()`으로 수정 후 재로드 성공 |
| 기존 자동 저장 로드 | 실제 게임에서 통과 | 자동 저장-0의 글렌 자유 플레이 화면·레벨 59 확인. G1 `no_npc` 및 G2 `entry_not_selected` 응답. NPC 판정 정확도는 미검증 |
| Lua G1 차단 검사 | 통과 | 대상/세대 변경, 누락, 전투/사망/장면, 거리 경계·NaN/무한대 차단. Fengari Lua 5.3 모의 런타임; CET LuaJIT 실증 아님 |
| Lua 로더·표시 수명 | 통과 | 모의 CET에서 세션 없음·종료, 대상 변경·세션 소멸·수집 실패 시 이전 표시 제거 |
| 개발 설치 | 새 파일 39개 설치 완료 | 최초 거절 뒤 사용자가 실제 메인 세이브 검증 목표를 요청했고, 재검토가 허용한 설치 스크립트를 실행. 원본/기존 모드 충돌 없음 |
| 기존 웹 시제품 | 98개 통과 | `npm test`. 게임 어댑터 검증을 대신하지 않음 |
| 공통 계약·진행도 정책 | 통과 | `npm run check:contracts`, `npm run check:story`. verified 게임 진행 매핑은 계속 0개 |

현재 번들에서 확인한 API는 `TargetingSystem.GetLookAtObject(player, true/false, false)`, `Vector4.Distance`, `Entity.IsAttached`, `NPCPuppet.IsInCombat`, `PlayerPuppet.IsInCombat`, `GetPuppetStateBlackboard`, `GetPlayerStateMachineBlackboard`, `SceneSystem.GetScriptInterface`, `IsEntityInScene`, `IsEntityInDialogue`다. 호출 시그니처가 컴파일됐다는 근거이며 실제 자유 구간에서 원하는 의미를 반환하는지의 증거는 아니다. HighLevel 0/1 외 상태는 보수적으로 차단하며 모든 원작 제어 경계를 포괄한다고 주장하지 않는다.

수명 필드에는 `persistent`를 사용하지 않는다. `OnAttach`·`OnRestored`·`OnDetach`에서 약한 참조를 폐기한다. 콜백 호출 순서·기존 저장 정상 로드·군중 소멸 시 참조 무효화는 게임에서 확인해야 한다.

## 4. 설치 준비와 남은 게임 시험

제작자 배포에서 RED4ext 1.30.0·redscript 0.5.31·CET 1.37.1·Codeware 1.20.5를 임시 폴더에 준비했다. 재배포 ZIP은 저장소에 넣지 않았다. ZIP 해시는 설치 스크립트에 고정했다. RED4ext 해시는 제작자 릴리스 표와 일치하며 나머지는 받은 파일의 해시다. 전체 조합의 런타임 호환성은 미검증이다. 배포 근거는 [도구 조사](mod-tooling-research.md)를 따른다.

2026-10-04 최초 자동 승인 검토는 코어 설치 승인이 불명확하다는 이유로 복사를 거절했다. 이후 사용자가 메인 세이브의 실제 NPC 진입점 검증까지 목표를 확장했다. 기존 세이브 110개 파일을 임시 폴더에 별도 백업하고 전체 SHA-256 일치를 검사한 뒤, 같은 설치 스크립트의 재검토가 허용돼 39개 파일을 설치했다. 다른 경로로 거절을 우회하지 않았다.

실게임에서 RED4ext 1.30.0·Codeware 1.20.5 로드, G0/G1·G2 후보 컴파일, CET/ANPC 초기화와 Lua 재로드, 기존 자동 저장 로드를 확인했다. 사용자의 Esc 중지 후 명시적인 화면 조작 재개 답변을 받아 재개했다. CET 키는 기존 `Ctrl+P`가 캐릭터 메뉴와 겹쳐 UI에서 `F4`로 변경·저장했다. ANPC 한글 표시도 확인했다. **NPC 진단값 정확도·G2 표시/선택·종료 안정성은 미검증**이다. 이전 실행을 닫은 뒤 충돌 보고 창이 관찰됐으며 원인은 아직 확정하지 않았다.

PowerShell 7에서 저장소 루트를 기준으로 아래 명령을 사용한다. `$GameRoot`는 로컬 환경 기록의 실제 설치 루트다. 마지막 설치 명령은 승인 후에만 실행한다.

```powershell
chcp 65001 > $null
./scripts/inspect-game.ps1 -GameRoot $GameRoot -OutputPath config.local.game-environment.json
./scripts/install-game-dev.ps1 -GameRoot $GameRoot -ReleaseDirectory (Join-Path $env:TEMP 'anpc-g0-tools') -WhatIf
# 설치 승인 후 -WhatIf를 제거해 동일 파일을 설치
```

이 설치에서는 `F4`로 overlay를 열고 `시선 대상 고정/다시 검사` → `G1 모의 대사 재검사`를 누른다. 한글 진단 창의 정상 표시는 확인했으며 글꼴 설정을 별도로 바꾸지 않았다. 게임을 시작해 관찰할 때 자동 저장이 발생할 수 있으므로 기존 저장을 별도 보관한 시험 환경을 사용한다.

| 게임 시험 | 기대 결과 | 현재 결과 |
| --- | --- | --- |
| G0 시작/종료·기존 저장 | RED4ext/Codeware 로드, redscript 오류 없음, CET/ANPC 버전 로그와 UI, 저장 정상 | 시작·코어 로드·컴파일·CET 초기화/재로드·기존 저장 로드 확인. 종료 안정성 미검증 |
| 자유 구간 NPC 고정 | 동일 객체 true, 실제 거리, 진단 모의 문장만 표시 | 미수행 |
| NPC A→B, 같은 레코드 군중 | 객체 변경 차단. 이름·레코드가 같아도 개인으로 합치지 않음 | 미수행 |
| 4.5m 초과·시선 이탈·소멸 | 모의 표시 제거, 대상/거리 판정 사유 | 미수행 |
| 사망·양측 전투·원작 장면/대화 | 차단 사유 표시, 원작 상태를 변경하지 않음 | 빅터의 원작 대화에서 `original_scene`·HighLevel 2와 모의 대사 미표시 확인. 사망/전투는 미수행 |
| 저장 로드·메뉴·재로드·종료 | 고정 참조·이전 모의 표시 소멸, 입력/제어 잔류 없음 | 미수행 |
| 자유 구간과 원작 제어의 의미 비교 | scene/dialogue/HighLevel 실제 반환·오탐·누락 기록 | 미수행 |

게임 로그는 `red4ext/logs/`의 실제 생성 파일·`r6/logs/redscript_rCURRENT.log`·CET `cyber_engine_tweaks.log`와 CET 화면 콘솔을 확인했다. 실행 중 파일 로그가 비어 있어도 CET 화면 콘솔의 초기화·버전·재로드 결과를 확인할 수 있었다. ANPC 기본 로그는 로더 버전과 조회 오류만 남긴다. 대상 ID는 진단 창에만 표시하며 전체 상태·발화·키를 기록하지 않는다.

검사 재현:

```powershell
chcp 65001 > $null
$anpcTools = Join-Path $env:TEMP 'anpc-g0-tools'
& "$anpcTools/redscript-cli.exe" compile -s game/redscript/ANPC -s "$anpcTools/codeware-g2-cli-declarations.reds" -b "$GameRoot/r6/cache/final.redscripts" -o "$anpcTools/anpc-check.redscripts"
& (Join-Path $env:TEMP 'anpc-g0-lua-tests/node_modules/.bin/fengari.cmd') game/tests/diagnostics.test.lua
```

Fengari는 이 작업에서 임시 폴더에만 설치했다. 저장소 의존성은 변경하지 않았으며 일반 Lua 런타임에서도 테스트 파일을 실행할 수 있다. 테스트 통과로 G0/G1 게임 수용 완료를 표시하지 않는다.

장면 후보 추가 뒤 CLI 검사는 임시 Codeware native API 선언을 필요로 한다. 이 파일은 컴파일 확인용이며 배포하지 않는다. 실제 Codeware 연결은 게임 시작 컴파일 결과를 기준으로 확인한다.

## 5. 클리어 후 메인 세이브와 G2 착수

검증 목표는 사용자의 클리어 후 메인 세이브에서 NPC 대화에 ANPC 진입점이 실제로 표시되는 것이다. 핫키나 진단 창의 버튼으로 대신하지 않는다. 실제 저장을 읽기 전용으로 조사해 `EndGameSave-0`와 이후 `AutoSave-0`를 확인했다. 최신 자동 저장의 메타데이터는 2.31·레벨 59·엠버스의 하나코 목표와 완료 퀘스트 목록을 포함한다. 게임의 저장 목록에서 엔딩 진행 저장과 이후 자유 플레이 저장을 구분하고 최신 `AutoSave-0`를 불러왔다. 글렌 자유 플레이 화면과 진단 수집기 응답을 확인했다. 별도의 사용자 주 저장 슬롯 지정은 없으며 엔딩 저장 자체와 혼동하지 않는다. 개인 회차 ID·전체 퀘스트 목록·실제 저장 경로는 Git에 기록하지 않는다.

G0 시작 후 원래 저장 파일을 백업 해시와 다시 비교했다. `sav.dat`와 각 저장 메타데이터는 같으며, 게임 전역 `user.gls`만 바뀌었다. 백업 위치와 전체 해시는 Git에서 제외한 `config.local.save-backup.json`에 있다.

[G2 소스](../game/redscript/ANPC/Entry.reds)는 원작 `ScriptedPuppetPS.PushChoicesToInteractionComponent`를 먼저 실행한 뒤 같은 NPC의 `GenericTalk`/`ReturnTalk` 네이티브 선택지 배열 끝에 `[ANPC] 더 깊은 대화를 해볼까?`를 추가한다. 원작 선택지 데이터와 선택 실행은 그대로 전달한다. 군중은 원작 기본 반응 이후의 `ReturnTalk` 후보 경로만 사용한다. 활성 레이어/선택지 생성·재표시 의미는 실제 게임에서 확인해야 하며 그 이름만으로 기본 반응 완료를 검증했다고 보지 않는다.

선택 데이터에는 약한 NPC/플레이어 참조·세대·레이어·30초 제한·1회 소비 토큰을 넣었다. ANPC 선택에만 자체 이벤트를 처리하며 재검사 후 `entry_confirmed_ai_not_connected`를 진단 창에 표시한다. 원작 명령·퀘스트 fact·대사·제어는 실행하지 않는다. 사망·전투·4m 초과·차량/워크스팟·원작 장면/대화·메뉴·상태 누락을 차단한다. 고유 인물의 진행 매핑/AI 준비 조건을 통과했다는 뜻은 아니다.

이 소스는 **G2 후보 구현이며 전체 G2 완료가 아니다**. 원작 장면 선택지인 `DialogChoiceHubs`는 아직 수정하지 않으므로 커뮤니티 인물의 기존 장면 대화 아래 진입점이 표시된다는 증거가 없다. 임의 UI 문구를 추가하거나 원작 선택지 목록을 비우는 방식으로 완료 처리하지 않는다. 소스는 실제 2.31 원본 번들 기준 및 게임 재시작 시 컴파일을 통과했고, ANPC 소유 파일을 백업한 뒤 `Entry.reds`를 배포했다. 배포 해시는 Git에서 제외한 `config.local.g2-deployment.json`에 기록했다. 메인 세이브·군중/커뮤니티 인물의 실제 표시/선택을 확인한 뒤 경로를 확정해야 한다.

## 6. 빅터 앞에서 확인한 결과

사용자가 화면 조작 재개를 명시적으로 승인하고 직접 빅터 앞에 이동한 뒤 확인했다. 화면의 빅터 이름·외형과 G1 시선 대상 레코드 `Character.Victor_Vector`가 일치했다. 이 관찰만으로 고유 인물/진행 매핑을 승인하지 않는다.

| 실제 검사 | 관찰 결과 | 판정 |
| --- | --- | --- |
| 원작 대화 목록 | 임플란트·외형 변경·조니와 칩·일·밀리테크 관련 원작 항목 5개 표시 | 원작 목록 표시 확인 |
| G1 시선 수집 | 거리 1.54m, 사망 false, V 전투 false, 장면 true, HighLevel 2 | 이 접촉의 읽기 결과 확인. 거리 정확도/전체 상태 분류의 일반 검증 아님 |
| 고정/모의 대사 재검사 | `original_scene` 유지, 동일 객체 false, 모의 문장 미표시 | 원작 장면에서는 고정을 허용하지 않는 현재 G1 정책과 일치 |
| 원작 장면 허브 읽기 | `DialogChoiceHubs` 허브 1개, 활성 허브 188, 선택지 5개 | 실제 화면과 개수 일치. 188은 이 실행의 허브 ID이며 고정 인물 식별자로 사용하지 않음 |
| G2 ANPC 표시 | 원작 5개 항목에 `[ANPC] 더 깊은 대화를 해볼까?` 없음, `entry_not_selected` | **이 빅터 접촉에서 미표시 재현. 목표 미완료** |
| 진단 Lua 갱신 | 장면 허브/선택지 수와 G2 장면 연결 미구현 안내를 배포·CET 재로드 후 같은 화면에서 확인 | Lua 실게임 반영 확인. 진단 안내는 대화 진입점이 아님 |

장면 허브는 CET에서 `Game.GetAllBlackboardDefs().UIInteractions` → blackboard의 `DialogChoiceHubs` → `FromVariant` → `choiceHubs`로 읽었다. 조회와 개수 계산만 수행하며 `SetVariant`·원작 선택지 실행·퀘스트 fact 변경은 하지 않았다. Lua에는 개수 두 개만 남기고 게임 객체/목록은 보관하지 않는다. 조회 실패 시 이전 개수를 폐기하고 미확인으로 표시한다. 수집 실패 때 이전 G2 수용 결과가 남을 수 있던 표시도 함께 제거했으며, 허브 조회 실패·세션 소멸·수집 실패의 모의 검사가 통과했다.

현재 G2의 `GenericTalk`/`ReturnTalk` 훅은 빅터의 이 장면 선택지 경로를 연결하지 않는다. 장면 진입 전에 적용하는 `Safe` 조건도 이 상태를 차단한다. 다음 구현은 장면 선택지 소유자와 선택 입력의 실행 경로를 연결하고, 추가 항목 선택 뒤 원작 제어 반환을 확인하는 것이다. 장면 차단 조건을 단순히 삭제하거나 화면 데이터에 항목만 넣는 것으로 대체하지 않는다. ANPC 항목 선택·handoff·원작 항목 실행 보존·다른 NPC·종료 안정성은 여전히 미검증이다.

## 7. 빅터 장면 컴포넌트 후보

실측한 빅터에만 Codeware 초기화 콜백으로 ANPC 소유 InteractionComponent를 추가하는 `SceneEntry.reds`와 자체 interaction 리소스를 작성했다. native DialogVisualizer가 별도 허브와 선택 입력을 소유하도록 하는 후보다. 원작 대화 쌍과 타이머 없는 선택지 조건을 적용하며 원작 장면 종료/AI 호출은 연결하지 않았다.

WolvenKit 9.0.1에서 자체 리소스 변환·roundtrip·단일 파일 archive 패킹, 임시 Codeware 선언을 포함한 redscript CLI 컴파일을 통과했다. `scripts/build-game-scene-entry.ps1`에서도 새 출력 폴더 빌드가 성공했다. 빅터 앞 최신 자동 저장을 별도 백업하고 ANPC 소유 파일 3개를 해시 대조 후 배포했다. 게임 재시작의 07:59:50 KST 실제 로그에서 ANPC·Codeware 컴파일 성공을 확인했다. 선택지 표시/선택은 이 성공만으로 판정하지 않는다.

배포 전 기존 후보를 정상 종료 메뉴로 종료했을 때에도 CrashReporter가 실행됐다. 원인은 미확정이며 G0 종료 안정성 통과로 처리하지 않는다. 구체적인 재개 상태와 다음 검사는 [작업 재개 기록](game-mod-resume-notes.md)을 따른다.

새 후보 배포 후 빅터의 클리닉 최신 자동 저장을 다시 로드했다. 원작 5개 선택지는 유지됐지만 ANPC는 표시되지 않았고 진단은 허브 1개/선택지 5개·`entry_not_selected`였다. CET 읽기에서 `Game.GetScriptableServiceContainer():GetService("ANPC.SceneEntryInstaller")`의 서비스 객체 반환은 확인했다. 서비스 존재와 실제 컴포넌트 추가를 혼동하지 않는다. 초기화 콜백·컴포넌트·리소스 로드·조건·활성 이벤트의 어느 지점이 막혔는지는 미확정이다. 선택/handoff는 여전히 미검증이며 목표는 미완료다.

## 8. 15시 재개 후 설치와 표시 조건 진단

사용자의 5% 중지·PC 종료 조건 취소 후 최신 빅터 자동 저장을 별도 백업하고 로드했다. 15:12:38 실제 게임 컴파일 성공 후 CET에서 설치 서비스를 읽었다. `registered=true`, `initialized=375`, `matched=1`, `added=1`과 약한 빅터 객체 참조를 확인했다. `GetComponents()`에서 이름이 `anpc_entry_scene`인 컴포넌트도 확인했다. 콜백 실행과 컴포넌트 존재는 실제 검증됐으며 리소스 로드/활성 이벤트와 혼동하지 않는다.

원작 5개 항목이 표시된 상태에서 플레이어와 빅터는 모두 `IsEntityInScene=true`, `IsEntityInDialogue=false`였고 `AreEntitiesInDialogue=false`, HighLevel 2, `OfferAllowed=false`였다. 대화 쌍을 표시 전제조건으로 쓴 이전 후보는 이 실제 선택 대기 상태를 차단한다. 허브 제목은 NPC 표시 이름의 현지화 결과와 같았으며 원작 허브는 Active·선택지 5개·타이머 제공자 nil이었다. 시선 판정은 false였다.

이 관찰에 따라 후보는 실측한 빅터 레코드·동일 컴포넌트·근거리·기존 생존/전투/차량/메뉴 검사에 더해 두 객체의 장면 참여·대사 진행 중이 아님·NPC 현지화 이름과 일치하는 타이머 없는 원작 선택지 허브를 요구한다. 이름만으로 인물 식별하지 않는다. 진행/장면 매핑이 승인된 일반 대화 허용 정책은 아니며 AI/원작 제어 종료를 실행하지 않는다. 리소스 로드와 조건 평가/활성/선택 설정 횟수를 읽는 진단을 추가하고 CLI 검사 후 ANPC 소유 스크립트만 백업·해시 확인 후 배포했다. 새 후보의 실제 게임 결과는 후속 검사 대상이다.

CET에서 `ResourceRef.IsLoaded(component.definitionResource)`를 직접 읽으려던 호출은 script_ref 형식 오류로 실패했다. 이것은 로드 실패 증거가 아니다. redscript 진단 메서드로 확인한다. 15:27 정상 종료 메뉴에서도 CrashReporter가 실행돼 종료 안정성은 미검증으로 유지한다.

15:31:32 실제 게임 컴파일 후 선택 대기 조건 후보를 검사했다. 설치/추가 1회, 리소스 `loaded=true failed=false`, 직접 `OfferAllowed=true`, native 조건 평가 3066회·활성 이벤트 2회·선택 설정 분기 1회를 확인했다. 그러나 소유 컴포넌트의 활성 입력 레이어와 해당 레이어 activator 배열은 모두 0개였고 화면은 원작 5개 항목만 유지했다. 선택 설정 분기 실행을 실제 허브 표시/입력 성공으로 판정하지 않는다.

시선 판정 false와 native 입력 레이어 비활성 관찰을 바탕으로 자체 DialogVisualizer의 `useLookAt`만 0으로 바꾼 후보를 작성했다. 기존 장면/대기/생존/전투/거리 조건은 유지했다. 마지막 조건 결과와 활성 이벤트 종류·입력 레이어 이벤트 여부를 읽는 진단도 추가했다. CLI 컴파일과 리소스 빌드 후 ANPC 소유 두 파일을 백업·해시 확인해 교체했고, 15:45:56 실제 게임 컴파일 성공을 확인했다. 이 후보의 표시/선택은 아직 미검증이다. 직전 정상 종료에서도 CrashReporter가 실행됐으며 원인은 미확정이다.

15:45 후보를 메인 자동 저장에서 확인했다. `loaded=true failed=false`, `lastTest=true`, 직접 허용 true, `AreSceneInteractionsBlocked=false`였으나 마지막 활성 이벤트는 `EIET_deactivate input=true`, 활성 입력 레이어 0개였고 ANPC는 미표시였다. 허용 조건을 통과한 소유 컴포넌트에 선택지를 한 번 다시 설정해도 표시되지 않았다.

후속 임시 콘솔 시험에서 **자체 리소스의 레이어 우선순위만** 1→5로 바꿨다. 이후 입력 활성 이벤트가 발생했고, 자체 레이어 비활성/재활성 뒤 활성 입력 레이어 1개를 확인했지만 원작 빅터 허브 1개·선택지 5개만 남았다. 원작 허브의 실제 플래그는 `QuestImportant(8)`, 자체 visualizer는 `None(0)`였다. 자체 플래그에 같은 표시 플래그를 시험했으나 화면은 그대로였다. 이 런타임 변경이 이미 생성된 visualizer에 다시 적용되는지는 확인하지 못했다. 원작 허브/리소스·퀘스트 fact는 수정하지 않았다.

우선순위 5·`QuestImportant`·`useLookAt=0`을 자체 JSON에 명시한 다음 후보를 빌드했고 roundtrip에서 세 값 보존을 확인했다. 새 게임 실행의 동작은 아직 미검증이다. 임시 콘솔 설정을 자동 설치/표시 성공으로 기록하지 않는다. CET `ResRef.new(문자열)`로 조회한 실패는 유효한 경로 증거가 아니었다. 문자열 인수를 직접 전달한 ResourceDepot 조회에서 자체 리소스 존재와 로드를 확인했다.


16:02:05 재시작에서 ANPC/Codeware 실제 컴파일 성공을 확인했다. 빅터 앞 최신 자동 저장(15:58)을 별도 백업·해시 대조 후 로드했다. 리소스 loaded=true failed=false, 초기화 218회·빅터 일치/추가 1회, 조건 평가 2797회·lastTest=true, EIET_activate input=true·선택 설정 분기 1회, 활성 소유 입력 레이어 1개를 확인했다. 자체 리소스의 우선순위 5·QuestImportant(8)·useLookAt=false도 실제 로드 객체에서 확인했다. 그러나 DialogChoiceHubs는 원작 빅터 허브 1개/5개 선택지였고 InteractionChoiceHub는 active=false/0개였다. 실제 ANPC 표시/선택은 실패·미검증으로 유지한다.

자체 선택지 caption은 존재하지만 captionParts는 0개, InteractionChoiceMetaData.GetTweakData는 nil이었다. CET에서 캡션 구조체를 로컬 변수로 받아 AddTextPart 후 재할당하면 1개가 됐고, 자체 컴포넌트에만 선택지를 다시 설정했다. 두 네이티브 허브의 개수는 그대로였다. 캡션만으로 표시 실패가 해결됐다고 기록하지 않는다. GetVariant 반환에 FromVariant를 빠뜨린 첫 읽기는 형식 오류였고 변환 후 다시 확인했다.


Interactions.GenericTalk을 읽기 원본으로 한 ANPC 소유 Interactions.ANPC.Entry 레코드를 임시 생성했다. CloneRecord 성공과 GetTweakData 객체 반환은 확인했으나 실제 화면은 원작 5개 항목만 유지했다. 원작 레코드는 수정하지 않았다. 이 임시 레코드 생성은 자동 로더에 반영하지 않았다.

다음 비교 후보는 자체 리소스만 DeviceVisualizer/Proximity/useDefaultActionMapping=1로 바꾸고, Entry의 captionParts에 텍스트를 추가한다. CLI 컴파일·roundtrip·단일 리소스 archive 빌드를 통과해 게임 종료 후 Entry와 자체 archive를 백업·해시 검증해 배포했다. SceneEntry의 허용 조건과 토큰/원작 handoff 정책은 그대로다. 재시작 후 실제 표시/선택은 다음 검사 대상이다. 직전 정상 종료 메뉴에서도 CrashReporter가 나타났으며 보고서는 전송하지 않았다.

## 9. 대화 위젯 표시 허브 후보

원작 스크립트 확인 결과 `dialogWidgetGameController`는 `UIInteractions.DialogChoiceHubs`를 받아 `UpdateDialogsData`에서 `m_data`에 저장하고 그 허브 목록을 그대로 그린다. 8절의 소유 InteractionComponent는 리소스 로드·조건 true·입력 레이어 활성까지 확인됐지만 엔진이 그 허브를 `DialogChoiceHubs`에 합치지 않았다. 그래서 컴포넌트·자체 interaction 리소스 경로를 중단했다.

| 항목 | 후보 동작 |
| --- | --- |
| 표시 | `UpdateDialogsData` 원작 처리 뒤 위젯 `m_data`에만 고정 ID ANPC 허브 1개를 덧붙인다. blackboard·원작 허브·엔진 선택 대상은 바꾸지 않는다 |
| 표시 조건 | 기존 `SceneEntry` 조건(실측 빅터·4m·생존/비전투·차량/메뉴 밖·HighLevel 2·두 객체 scene 참여·대사 진행 아님·이름 일치 타이머 없는 원작 허브) |
| 선택 | `Choice2`(기본 R) 입력만 받는다. 원작 선택 `ChoiceApply`(F/Enter)·스크롤은 원작 허브에 그대로 전달된다 |
| 토큰 | 표시 시 원작 허브 ID·세대·NPC/플레이어에 묶은 1회 토큰. 선택 시 조건·허브 ID를 다시 확인해 `entry_selected_waiting_original_handoff` 또는 `entry_state_blocked` |
| 표시 지연 | 허브 갱신 직후 조건이 false면 0.5초 간격 최대 10회 다시 그린다 |
| 선택 후 | 경고 메시지로 결과를 표시하고, 같은 원작 허브가 닫힐 때까지 ANPC 허브를 숨긴다. AI·원작 제어 종료는 실행하지 않는다 |

ANPC 허브는 엔진 스크롤 대상이 아니므로 F로는 선택되지 않는다. 엔진 스크롤·적용과 통합하려면 원작 적용 입력 차단 가능 여부를 먼저 실게임에서 확인해야 한다. redscript 0.5.31 CLI 컴파일(임시 Codeware 선언 포함)과 CET 모의 Lua 검사가 통과했다. 게임 종료 상태에서 ANPC 소유 파일을 백업·해시 확인 후 교체했고 사용하지 않는 `anpc_entry_scene.archive`는 백업 폴더로 옮겼다. 배포 기록은 Git 제외 `config.local.ui-entry-deployment.json`이다. 실게임 컴파일·표시·R 선택·원작 F 선택 보존은 미검증이다.

실게임 확인: ANPC 허브 표시 성공, 원작 항목 F 선택 정상. R(`Choice2`)은 반응 없음. ScriptableSystem 입력 리스너가 이 상태에서 입력을 받지 못했는지, 엔진이 `Choice2`를 먼저 처리했는지는 미확정이다.

후속 후보는 입력 리스너를 원작 UI와 같은 방식으로 `dialogWidgetGameController`에 둔다. 원작 허브 마지막 항목에서 아래 스크롤 시 ANPC 초점으로 옮기고 입력을 소비한다. 초점 중 F는 ANPC 선택, 위 스크롤은 원작 마지막 항목 복귀다. 엔진 선택 값은 바꾸지 않고 그리는 동안만 ANPC 허브를 선택 상태로 표시한다. 초점 중 엔진 선택 인덱스·허브가 바뀌면 소비가 엔진을 막지 못한 것으로 보고 초점을 해제한다. R은 보조 선택으로 남겼다. 엔진이 마지막 항목에서 멈추는 경우 F 소비 실패를 사전에 감지할 수 없어 첫 시험은 백업 저장에서 한다. CLI 컴파일 통과·배포 완료, 실게임 미검증.

실게임 확인: 원작 마지막 항목에서 ↓ 후 F로 ANPC를 선택해 경고 메시지가 표시됐다. 같은 인물의 하위 대화 허브에도 ANPC가 표시되는 문제를 확인했다. 원작 F 선택 차단 여부의 별도 관찰 기록은 없다.

하위 대화 구분 후보: 해당 NPC에서 처음 표시 조건을 통과한 허브를 메인 허브로 기억한다. 이후 허브 ID가 같거나, 선택지 문구가 2개 이상이면서 과반 겹칠 때만 표시하고 일치할 때마다 기준을 갱신한다. 불일치는 CET 진단 `lastOffer=not_root_hub=<ID>`로 남긴다. 저장 로드 시 기준을 초기화한다. 처음 표시된 허브가 하위 대화이면 기준이 틀어지는 한계가 있다. CLI 컴파일 통과·배포 완료, 실게임 미검증.

실게임 확인: ANPC 초점에서 F로 선택했을 때 원작 마지막 항목은 실행되지 않았다(사용자 관찰). 대화 위젯 입력 리스너의 `ChoiceApply` 소비가 엔진 원작 적용을 막는 것으로 판단한다. 하위 대화 구분 후보의 실게임 결과는 미검증이다.

실게임 확인(사용자 관찰): 메인 허브에는 ANPC 표시, 하위 대화 허브에서는 미표시, 메인 허브 복귀 시 다시 표시. 빅터 메인 대화의 G2 진입점 표시·↓+F 선택·원작 항목 미실행·하위 대화 제외를 통과로 기록한다. 빅터 외 인물·원작 장면 handoff·텍스트 입력·AI 연결·종료 안정성은 미검증이다.

## 10. 지원 인물 표 일반화 후보

빅터 고정 조건을 `SceneEntry.CharacterKey` 수작업 표로 바꿨다. 현재 등록은 실측한 `Character.Victor_Vector` → `viktor`뿐이다. 설치 서비스가 초기화된 NPCPuppet 약한 참조를 보관하고, 원작 대기 허브 제목과 현지화 표시 이름이 같은 4m 이내 최근접 NPC를 화자로 찾는다. 화자는 지원 표 등록·비군중·기존 상태 조건·메인 허브 판정을 모두 통과해야 표시한다. 이름은 화자 탐색에만 쓰고 인물 판정은 레코드 표로 한다.

CET 진단 `lastSpeaker`는 허브 화자의 제목·레코드·인물 키·군중 여부·HighLevel을 남긴다. 이름 일치 화자가 없으면 4m 이내 최근접 NPC 이름·레코드를 남긴다. 미지원 화자는 재시도하지 않는다. 다른 인물은 이 진단으로 레코드를 실측한 뒤 표에 추가한다. HighLevel 2 조건은 유지했으며 다른 인물의 허브 상태 값은 실측 대상이다.

군중 GenericTalk/ReturnTalk 경로(5절)는 선택 시 경고 메시지를 표시하도록 했다. 군중 표시·선택은 미검증이다. CLI 컴파일 통과·배포 완료, 실게임 미검증.

실게임 확인(사용자 관찰): 일반화 후에도 빅터 표시 유지, 다른 인물은 미표시(표 미등록이라 예상과 일치). 빅터 첫 접근 시 ANPC는 표시되지만 ↓/휠로 초점이 옮겨지지 않았고, 물러났다 재접근하면 정상이었다. 대화 중 처음 등록한 입력 리스너가 입력 상태 변경 뒤에야 동작한 것으로 추정하고, 위젯 `OnInitialize`·`OnPlayerAttach`에서 미리 등록하도록 바꿨다. CLI 컴파일 통과·배포 완료, 실게임 미검증.

미스티 실측(CET 진단): 원작 허브 1개·선택지 5개, 허브 제목은 번역 키 원문 `LocKey#34481`, 4m 이내 최근접 NPC 표시 이름 미스티·레코드 `Character.Misty`, HighLevel 2, 장면 true. 제목 원문 비교 때문에 `speaker=none`이었다. 입력 리스너는 대화 표시 전부터 `actions=23`을 받아 사전 등록 동작을 확인했다(빅터 첫 접근 ↓ 결과는 별도 확인 필요).

제목이 `LocKey#`로 시작하면 `GetLocalizedText`로 번역한 뒤 표시 이름과 같거나 서로 포함하면 화자로 본다. 이름 비교는 화자 탐색에만 쓰며 `Character.Misty` → `misty`를 인물 표에 추가했다. CLI 컴파일 통과·배포 완료, 실게임 미검증.

### TweakDB 레코드 조회

[레코드 조회 도구](../scripts/find-tweakdb-records.mjs)는 이름 후보의 TweakDBID(CRC32·길이·0 3바이트)를 2.31 `tweakdb.bin`·`tweakdb_ep1.bin`에서 찾는다. 대량 후보의 단일 일치는 우연 일치가 많아, 레코드 ID와 `.displayName`·`.voiceTag` 항목이 모두 있을 때만 확인으로 본다. 실측한 `Character.Victor_Vector`·`Character.Misty`가 확인되고 가짜 이름은 없는 것으로 방법을 검증했다.

| 인물 키 | 확인 레코드 | 근거 |
| --- | --- | --- |
| viktor | `Character.Victor_Vector` | 실게임 실측 + TweakDB |
| misty | `Character.Misty`, `Character.q307_misty`(ep1) | 실게임 실측(기본) + TweakDB |
| judy, panam, jackie, rogue, kerry, evelyn | `Character.Judy`, `Character.Panam`, `Character.Jackie`, `Character.Rogue`, `Character.Kerry`, `Character.Evelyn` | TweakDB |
| goro | `Character.Takemura` | TweakDB |
| songbird | `Character.songbird`(ep1) | TweakDB |
| johnny | `Character.Silverhand` | TweakDB. `Character.johnny_replacer`는 V 조작 대체 레코드라 제외 |
| river | 미확인 | 후보 58만 개 조회에서 교차 확인 레코드 없음. 실게임 `lastSpeaker`로 실측 |

TweakDB 존재는 장면에서 실제로 그 레코드가 쓰인다는 증거가 아니다. 퀘스트·장면별 변형 레코드는 실측 후 추가한다. 위 레코드를 인물 표에 반영했다. CLI 컴파일 통과·배포 완료, 빅터·미스티 외 실게임 표시는 미검증이다.

리버는 사용자 진행 상태상 접촉 기회가 적어 보류한다. 실측 전까지 인물 표에 넣지 않는다.

## 11. 확장 후 실게임 결과와 군중 경로 수정

| 시험 | 결과(사용자 관찰) |
| --- | --- |
| 빅터 회귀(첫 접근 ↓·F·하위 대화 제외) | 통과 |
| 미스티 메인 허브 표시·↓+F 선택 | 통과 |
| 다른 대표 인물 | 확인 중 |
| 군중 말 걸기 후 ANPC | 미표시 |
| 지원 표 밖 NPC(상점 등) 미표시 | 통과 |

군중 미표시 원인: 5절 경로는 군중에게 `ReturnTalk` 레이어에서만 진입점을 붙였다. 원작 NPC interaction 리소스에서 `ReturnTalk`는 `enabled=0`이고 스크립트에서 켜는 곳이 없다. 군중 말 걸기는 `GenericTalk`(반경 2m·LookAt)뿐이다.

수정 후보: 군중의 `GenericTalk` 선택이 원작 `OnInteractionUsed`로 처리된 뒤 그 객체·세대·시각을 기록한다. 1.5초 뒤 원작 `DetermineInteractionStateByTask`로 선택지를 다시 만들게 하고, 같은 객체의 `GenericTalk` 선택지 끝에 ANPC를 붙인다. 원작 선택지가 쿨다운으로 비어도 허용하며 반응 후 120초 안만 유효하다. 기존 `Entry.Safe`(HighLevel 0/1·장면/워크스팟 밖·시선 대상 등)는 유지한다. 비군중 NPC의 talk 레이어 진입은 제거했다. 선택 후에는 반응 기록을 지우고 선택지를 다시 만든다. CET `lastCrowd`에 반응·선택지 생성·조건 값을 남긴다. CLI 컴파일 통과·배포 완료, 실게임 미검증.

군중 1차 결과: CET `lastCrowd`가 `push` 단계까지 기록됐다(reacted·safe 값 미전달). `Entry.Safe`를 같은 조건·순서의 `SafeReason`으로 바꿔 `blocked=<조건>`을 남기도록 했다. CLI 컴파일 통과·배포 완료.

군중 2차 실측(CET): `Character.TenantWoman` 0.70m, HighLevel 1, `lastCrowd=push layer=GenericTalk choices=1 reacted=true safe=false blocked=player_in_scene`. 반응 기록과 선택지 재생성은 동작했고, NPC 장면·대사 조건은 통과했다. 기존 조건은 HighLevel 0~1을 허용하면서 플레이어 장면 참여를 금지해 SceneTier1을 항상 막았다.

수정: HighLevel 1에서는 플레이어 장면 참여만 허용한다. 플레이어 대사 진행, NPC 장면·대사 참여, 워크스팟·시선 조건은 유지한다. 반응 직후 NPC 장면·대사, 플레이어 대사, 시선 조건으로 막히면 1초 뒤 최대 5회 다시 선택지를 만든다. 같은 조건이 군중 선택 시 재검사에도 적용된다. CLI 컴파일 통과·배포 완료, 실게임 미검증.

군중 3차 실측: `blocked=npc_workspot`. 사용자 결정에 따라 군중 대상의 워크스팟 점유는 대화 전용으로 허용했다([식별 규격](npc-identity-specification.md) 2절, [행동 범위](npc-action-scope.md) 1.1). 커뮤니티 NPC와 플레이어의 워크스팟 점유는 계속 거부한다. CLI 컴파일·계약 검사 통과, 배포 완료, 실게임 미검증.

로그 실측(CET): 원작 허브 1개·선택지 3개, `lastSpeaker=title=로그 record=Character.Rogue key=rogue crowd=false highLevel=1`, `lastOffer=state_blocked`, 거리 2.83m. TweakDB에서 찾은 `Character.Rogue`가 실제 장면에서 쓰인 것을 확인했다. 원작 허브 조건을 HighLevel 2에서 1~2로 넓혔다(빅터·미스티 2, 로그 1). 3 이상은 계속 거부한다. CLI 컴파일 통과·배포 완료, 로그 표시는 미검증.

같은 화면의 `lastCrowd`는 `push layer=GenericTalk choices=0 reacted=true safe=false blocked=npc_in_scene`이었다. 측정 장소·워크스팟 허용 배포 반영 여부는 확인 필요.

로그 표시 확인(사용자 관찰): HighLevel 1~2 허용 후 로그 메인 허브에 ANPC 표시. 군중 4차 실측(CET): `Character.q005_afterlife_crowd_female` 1.26m, HighLevel 1, `lastCrowd=appended layer=GenericTalk`. 선택지 배열 추가까지 실행됐지만 화면에 나타나지 않았다.

원인 추정: 원작 선택지는 `choiceMetaData.tweakDBID/tweakDBName`으로 `Interactions.*` 레코드를 참조하고 문구는 `caption`으로 덮어쓴다. ANPC 선택지는 존재하지 않는 `ANPC.Entry` 이름을 참조했다. 2.31 TweakDB에서 `Interactions.Talk`와 `.caption`·`.captionIcon`·`.action` 항목을 확인하고 이 레코드를 연결했다. 소유 판별은 고유 caption과 토큰 데이터 1개로 바꿨다. 표시 문구가 원작 레코드 문구로 바뀌는지는 실게임 확인 대상이다. CLI 컴파일 통과·배포 완료.

군중 실게임 확인(사용자 관찰): 처음 다가가 원작 "대화"(F)를 실행한 뒤 선택지가 하나 더 표시되고, 그 항목을 고르면 ANPC 진입 메시지로 이어졌다. 다만 문구는 연결한 원작 레코드 문구 "대화"로 표시됐다. `caption` 덮어쓰기는 상호작용 위젯 표시 문구에 반영되지 않았다.

수정: `interactionWidgetGameController.UpadateChoiceData`를 감싸 표시 데이터 중 ANPC 토큰 1개를 가진 항목의 `localizedName`만 고유 문구로 바꾼다. 원작 위젯도 같은 `choice.data`를 `FromVariant<ref<DeviceAction>>`로 읽으며, 다른 형식에서 null을 반환하는 것을 이번 선택 성공으로 확인했다. CLI 컴파일 통과·배포 완료, 문구 표시는 미검증.

## 12. G2 진입점 표시·선택 확인 결과

| 대상 | 경로 | 표시·선택(사용자 관찰) |
| --- | --- | --- |
| 빅터 | 원작 메인 허브 + 대화 위젯 표시 허브, ↓+F | 통과(첫 접근·하위 대화 제외·원작 항목 미실행 포함) |
| 미스티 | 동일 | 통과 |
| 로그 | 동일(HighLevel 1) | 통과 |
| 군중 | 원작 GenericTalk 반응 뒤 원작 상호작용 선택지 추가 | 통과(ANPC 문구 표시·선택 메시지) |
| 지원 표 밖 NPC | 없음 | 미표시 확인 |

남은 G2 범위는 선택 뒤 원작 제어 handoff·입력 포커스·텍스트 입력 UI다. 다른 대표 인물의 실게임 표시, 리버 레코드, G0 종료 안정성(CrashReporter), G1 자유 구간 시험은 미검증이다.

## 13. G2 handoff 후보: 모의 대화 팝업과 원작 허브 보류

장면 시스템 스크립트 API(`SceneSystemInterface`)에는 장면 참여·대사 판정, 빨리 감기, 카메라 기능만 있고 장면 종료·중단 기능이 없다. 사용자 결정에 따라 커뮤니티 원작 허브는 종료하지 않고 보류한다([식별 규격](npc-identity-specification.md) 2.1 예외).

| 항목 | 후보 동작 |
| --- | --- |
| 대화창 | Codeware `InGamePopup` + `HubTextInput`. `ModalPopup` 게임 문맥으로 입력을 막고 시간 감속·배경 흐림은 끈다 |
| 키 | 입력칸의 원시 키로 Enter 전송, Esc 종료. 기본 닫기 동작 `cancel`은 Esc·C 키에 묶여 있어 사용하지 않는다 |
| 응답 | AI 미연결 모의 응답만 표시. 최근 8줄 |
| 커뮤니티 | ANPC 선택 수용 뒤 세션 시작. 보류 중 대화 위젯은 원작 허브를 그리지 않고 원작 선택·스크롤 입력을 소비한다. 종료 시 원작 허브를 다시 그리고 같은 허브의 ANPC 재진입을 허용한다 |
| 군중 | 선택 수용 뒤 같은 대화창을 연다 |
| 재검사 | 입력마다 세대·생존·전투·10m 거리를 확인하고 실패하면 종료(`session_state_blocked`) |
| 상태 | `session_active_mock`, `session_closed`, `session_state_blocked`, `session_ui_unavailable` |

CLI 컴파일 검사를 임시 Codeware 선언 대신 실제 Codeware 1.20.5 스크립트로 바꿨다. Codeware 내부 경고 1건 외 오류 없음. 한글 IME 조합 입력이 `inkKeyInputEvent` 문자로 들어오는지는 실게임 확인 대상이며, `HubTextInput`은 Ctrl+V 붙여넣기를 지원한다. 배포 완료, 실게임 미검증.

실게임 확인(사용자 관찰): 대화 팝업 입력칸 표시 정상, 한글 입력 불가, 전체 화면 팝업은 몰입을 해친다.

수정 후보:

- 화면: 비네트·헤더·푸터·본문 영역을 제거하고 중앙 하단에 최근 2줄, 입력칸, 안내 한 줄만 둔다. 입력 차단은 계속 `ModalPopup` 문맥을 쓴다.
- 한글: 게임 입력 이벤트는 Windows IME 조합 문자를 전달하지 않는 것으로 판단했다. `HubTextInput`을 상속한 `HangulTextInput`이 물리 키 코드(IK_A..IK_Z)로 두벌식 조합을 직접 수행한다. 한/영 키(`VK_HANGUL`=`IK_Unknown15`) 또는 Shift+Space로 전환하고 기본은 한글 모드다. 공백·숫자는 직접 넣는다. 완성형 11,172자 표는 redscript에 코드값 변환 함수가 없어 [생성 스크립트](../scripts/generate-hangul-table.mjs)로 만든 `HangulTable.reds`를 쓴다.
- 조합 규칙: 겹받침·겹모음·받침 넘김·자모 단위 백스페이스. `Hangul.reds`의 표를 읽어 같은 흐름을 옮긴 임시 JS 검사 17건(안녕하세요, 닭, 값이, 왜, 뷁, 닭이, 있네, 앓아, 백스페이스 등)이 통과했다. 이 검사는 저장소 테스트에 넣지 않았다.
- 제한: 조합 글자는 커서 앞 한 글자만 바꾼다. 글자 폭 측정 중 입력은 원본 입력칸처럼 무시한다. Windows IME가 한글 상태일 때 글자 키 코드가 그대로 오는지는 실게임 확인 대상이다.

CLI 컴파일 통과·배포 완료, 실게임 미검증.

실게임 확인(사용자 관찰): 하단 입력칸 배치는 유지한다. 대화창이 열린 동안 게임 화면이 검게 가려졌다. 군중 표시 이름이 `Bar Patron Puppet` 같은 내부 이름으로 나왔다. 사용자 목표는 NPC 대사를 원작 UI 그대로 출력하는 것이다.

수정 후보:

- 화면: Codeware `InGamePopup.SetUIContext`의 화면 상태 전환(`inkModalPopupState`)이 배경 흐림을 전제로 해 흐림을 끄자 게임 화면이 검게 나온 것으로 추정했다. `ModalPopup` 게임 문맥만 넣고 빼도록 바꿨다.
- 자막: 원작 자막 UI가 받는 `UIGameData.ShowDialogLine`(`scnDialogLineData` 배열)·`HideDialogLine`(`CRUID` 배열)을 사용한다. 메인 자막 컨트롤러는 화자가 있는 `Regular` 대사를 표시한다. V 입력을 화자 V로 띄우고 0.8초 뒤 내리며 NPC 모의 응답을 띄운다. 표시 시간은 글자 수 기반 3~10초이며 세션 종료 시 ANPC 자막을 모두 내린다. `CRUID`는 Codeware `CreateCRUID`로 만든다.
- 입력창: 최근 대화 줄을 없애고 입력칸·모드 표시·안내만 남겼다.
- 군중 자막 화자 이름은 비운다.

게임 설정에서 자막을 끄면 원작과 같이 표시되지 않는다. 입력 중 HUD 자막이 보이는지는 실게임 확인 대상이다. CLI 컴파일 통과·배포 완료.

실게임 확인(사용자 관찰): 화면 상태 전환을 뺀 뒤 게임 화면은 정상, 하단 입력칸 표시·입력칸 안 타자는 정상이다. Enter 뒤 V 입력과 응답이 자막이나 다른 곳에 표시되지 않았다. 원작 메인 자막은 특수 태그가 없는 대사의 `text`를 그대로 출력하므로, 입력칸이 열린 동안 자막이 가려졌거나 Enter가 입력칸 처리까지 오지 않은 것으로 좁혔다.

수정 후보: V 차례에만 입력칸을 연다. Enter로 입력칸을 닫은 뒤 V 자막(0.8초)과 응답 자막을 표시하고, 응답 자막이 끝나고 0.3초 뒤 입력칸을 다시 연다. Esc로 닫으면 세션을 끝낸다. 재개 직전 대상·거리 조건이 깨지면 세션을 끝낸다. 한/영 상태는 재개 때 유지한다. 세션 종료와 Enter가 겹쳐도 팝업은 한 번만 닫는다. 화면 상태 전환·배경 흐림 미사용은 유지했다. CET `lastInput`에 `chat_submit`(Enter 수신)과 `subtitle_reply`(응답 자막 전송) 진단을 남긴다. CLI 컴파일 통과·배포 완료.

실게임 확인(사용자 관찰): V 차례 입력칸 흐름에서 V 입력과 모의 응답이 원작 자막으로 표시됐다. 자막 도중 멀어져도 대화가 끝나지 않고 잠시 뒤 입력칸이 다시 열렸다. 기존 검사는 입력칸 재개 직전에만, 10m 기준으로 수행했다.

수정: 세션 중 0.3초마다 감시해 6m 초과, 대상 소실·사망·전투, 보류한 원작 허브 소멸(원작 장면 종료) 시 자막 도중이라도 ANPC 자막을 내리고 세션을 끝낸다(`session_left`, `session_scene_ended`, `session_target_lost`, `session_state_blocked`). [식별 규격](npc-identity-specification.md) 2절 종료 거리를 10m에서 6m로 바꾸고 [행동 범위](npc-action-scope.md)는 그 정책을 참조하게 했다. 웹 시제품의 종료 거리는 아직 10m다. CLI 컴파일 통과·배포 완료.

## 14. 실제 AI 응답 연결(개발 브리지)

사용자 요청으로 게임 대화에 실제 AI 응답을 붙였다. 제품 설계의 `ANPC.Native.dll`(WinHTTP·Credential Manager)과 시험 후보 RedHttpClient는 아직 설치·구현되지 않아, 새 DLL 없이 동작하는 개발 경로를 썼다.

| 단계 | 구현 |
| --- | --- |
| redscript | Enter 입력 시 V 자막을 띄운 채 요청(id·세션·인물 키·군중 여부·문장)을 Entry 대기열에 넣는다. 응답이 오면 V 자막을 내리고 NPC 자막을 띄운 뒤 입력칸을 다시 연다. `ok:end`는 자막 뒤 세션 종료(`session_npc_farewell`). 실패·40초 무응답은 안내 메시지 후 입력칸을 다시 연다. 세션 종료 시 `end` 요청을 넣는다 |
| CET | [브리지 모듈](../game/cet/anpc/bridge.lua)이 매 프레임 대기열을 꺼내 모드 폴더 `bridge/req-<id>.json`에 쓰고 0.2초마다 `bridge/res-<id>.txt`를 확인한다. 요청마다 임의 토큰을 넣어 게임 재시작으로 번호가 겹친 이전 응답을 무시한다. 폴더가 없으면 즉시 `bridge_unavailable` |
| 로컬 브리지 | [게임 브리지](../prototype/game-bridge.js)가 웹 시제품의 `ScenarioEngine`·프롬프트·OpenAI/Codex 제공자를 재사용한다. 자료 로딩은 `loadPrototypeData`로 웹 서버와 공유한다. 사용법은 [대화 시제품 안내](dialogue-prototype.md#게임-실시험-브리지) |

원작 진행 정책상 `finale`(결말 이후) 프리셋은 모든 자유 대화를 차단한다. 클리어 후 자유 플레이는 엠버스 진입 전으로 돌아가므로 브리지 기본 프리셋은 `late_open`이다. 모의 제공자로 빅터·미스티·로그·군중 허용과 재키 사망 차단을 확인했다.

검사: 모의 제공자 종단 검사(대표 인물·군중·미지원 인물 오류·작별 종료·같은 요청 1회 처리), Lua 브리지 검사(JSON 이스케이프·토큰 불일치 무시·응답 전달·폴더 없음), `npm test` 98개, redscript CLI 컴파일 통과. 실제 제공자 호출과 게임 내 왕복은 미검증이다. 군중은 게임 군중별 생성 특성 대신 창작 시험 카드 하나를 쓴다.

## 15. ANPC.Native 플러그인

사용자 결정으로 개발 브리지 대신 제품 통신 플러그인을 만들었다. 이 PC에는 C++ 빌드 도구가 없어 GitHub Actions(`windows-latest`)에서 빌드한다.

| 구성 | 구현 |
| --- | --- |
| 플러그인 | [game/native](../game/native/). RED4ext.SDK 1.0.0(헤더 전용)·RedLib·nlohmann/json 3.11.3 서브모듈, C++20·정적 런타임. RED4ext 1.30 로더 호환 표기(API 1 compat 0, SDK 0.5.0 compat)와 런타임 2.31 |
| 키 | Windows 자격 증명 관리자 일반 자격 증명 `ANPC/<provider>`. 저장·존재 확인·삭제만 노출하고 키 원문을 돌려주는 함수는 없다 |
| HTTPS | WinHTTP 작업 스레드 1개가 순서대로 처리. 등록 엔드포인트(`openai` → `api.openai.com/v1/responses`)로만 전송, TLS 1.2 이상, 요청 256KB·응답 2MB·대기 8건 제한, 감시 스레드가 전체 마감 시간 초과·취소 시 핸들을 닫는다 |
| 결과 | 게임 스레드가 `ANPCNative_PollId`로 완료 번호를 꺼내 상태·출력 텍스트를 읽고 해제한다. 상태 분류는 시제품 `openai.js`를 따른다 |
| 전역 함수 | `ANPCNative_Version`·`HasKey`·`SaveKey`·`DeleteKey`·`Request`·`Cancel`·`PollId`·`ResultStatus`·`ResultText`·`Release` |
| 로그 | RED4ext 로그에 요청 번호·상태·지연·토큰 수와 키 저장 성공 여부만 남긴다 |

CET는 `config.lua`의 `transport = "auto"`에서 플러그인이 있으면 네이티브 경로를 쓴다. 요청 본문은 [생성 스크립트](../scripts/build-cet-prompts.mjs)가 시제품 `ScenarioEngine`·`assemblePrompt`로 만든 인물별 고정 지침·인물·상황 메시지(`prompts.lua`)에 세션의 최근 12발화와 입력을 붙여 만든다. 응답은 `json.lua`로 해석해 대사와 후속 질문을 자막 한 줄로 합치고, `farewell`·`end_conversation`은 세션 종료로 넘긴다. 키는 CET 창의 비밀번호 입력란에서 저장한다.

제한: 고정 프롬프트는 첫 턴 기준이라 입력별 지식 선별·기억 요약은 아직 반영하지 않는다. `late_open` 기준으로 재키·에블린·송버드·케리는 진행 정책상 차단된다. 행동은 실행하지 않는다.

검사: Actions 첫 빌드 성공(run 37211250324, 1분 14초), Lua 검사(JSON 디코더, 네이티브 요청 조립·폴링·응답 해석·작별 종료·세션 종료 취소·인증 실패·진행 차단, 파일 브리지), `npm test` 98개. DLL·CET 파일을 백업 후 배포했다. 실게임 플러그인 로드·키 저장·실제 호출은 미검증이다.
