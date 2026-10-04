# 게임 모드 작업 재개 기록

2026-10-04 15시 이후 작업을 재개했다. 사용자가 5% 중지·PC 종료 조건을 취소했으며 감시 자동화는 삭제됐다. 이전 종료 요청을 재실행하지 않는다. 커밋·push는 하지 않았다. 최신 실게임 결과는 문서 마지막과 게임 검증 기록 8절을 우선한다.

## 목표와 실제 확인

클리어 후 메인 저장에서 NPC 원작 대화에 선택 가능한 ANPC 진입점을 표시하는 것이 현재 목표다. G0 로더와 G1 대상/상태 진단만으로 이 목표를 완료 처리하지 않는다.

- 게임 2.31·팬텀 리버티, RED4ext 1.30.0·redscript 0.5.31·CET 1.37.1·Codeware 1.20.5 설치와 시작 로드를 확인했다.
- G0 Lua/redscript 버전 연결과 CET 재로드, 기존 메인 자동 저장 로드를 확인했다.
- 빅터의 실측 record는 `Character.Victor_Vector`다. 원작 장면 상태·HighLevel 2 때문에 G1 고정/모의 대사가 차단되는 것을 확인했다.
- 원작 대화 선택지 5개, 장면 허브 1개를 실제 화면과 블랙보드에서 확인했다. 타이머 제공자는 `nil`이었다. 허브 ID는 실행 중 임시 값이며 인물 키로 쓰지 않는다.
- 기존 GenericTalk/ReturnTalk 후보로는 빅터 장면에 ANPC가 표시되지 않았다. 이 실패를 재현했다.
- 정상 종료 메뉴에서도 CrashReporter가 실행됐다. 새 장면 후보를 배포하기 전 발생했으므로 원인은 특정하지 않았다. 종료 안정성은 미검증이다.

## 새 장면 후보

`game/redscript/ANPC/SceneEntry.reds`는 Codeware `Entity/Initialize` 단계에서 실측한 빅터에만 ANPC 소유 `InteractionComponent`를 추가한다. `game/resources/anpc/entry_scene.interaction.json`은 별도의 native DialogVisualizer를 정의한다. 원작 장면 허브의 UI 자료만 덧붙이는 방식은 엔진 선택 실행을 보장하지 못하므로 이 후보를 작성했다.

활성 조건은 거리·생존·비전투·차량/메뉴 밖·HighLevel 2·플레이어/빅터 대화 쌍·타이머 없는 원작 선택지다. 대화 쌍 조건과 컴포넌트 초기화/허브 표시 순서는 실게임 검증이 필요하다. 화면의 현재 시선 대상으로 빅터가 잡히지 않아 CET 읽기에서 대화 쌍 조건을 확인하지 못했다. 추측으로 통과시키지 않는다.

`Entry.reds`는 ANPC 소유 선택의 토큰을 검증하고 `entry_selected_waiting_original_handoff`를 남기는 후보다. 원작 장면 종료, AI 호출, 텍스트 입력 UI는 연결하지 않았다. 원작 제어를 강제로 끊지 않는다. 다른 고유 NPC·군중 지원을 이 후보의 성과로 간주하지 않는다.

## 검사와 배포

- redscript CLI 0.5.31에서 원본 게임 캐시와 임시 Codeware native API 선언을 사용한 후보 컴파일 성공. 임시 선언은 게임에 배포하지 않았다.
- WolvenKit CLI 9.0.1에서 자체 interaction JSON 변환·다시 JSON으로 읽기·archive 패킹 성공. 사용자 정의 조건 이름도 보존됐다. archive에는 `anpc/entry_scene.interaction`만 있다.
- `scripts/build-game-scene-entry.ps1`로 새 출력 폴더에서 동일 빌드를 확인했다. 생성물은 `game/build/` 아래에서 Git 제외한다.
- 게임을 종료한 뒤 `Entry.reds`, 신규 `SceneEntry.reds`, 신규 `anpc_entry_scene.archive` 3개를 백업/해시 확인 후 실제 게임에 배포했다. 원본 게임 파일을 수정하지 않았다.
- 07:59:50 KST 재시작 로그에서 ANPC 3개와 Codeware의 실제 게임 컴파일 성공을 확인했다. 이 성공만으로 진입점 표시를 판정하지 않는다.
- 새 후보 배포 후 저장 목록에서 빅터의 클리닉·최신 자동 저장을 확인하고 다시 로드했다. 원작 5개 항목은 유지됐지만 ANPC는 표시되지 않았다. CET 진단도 허브 1개/선택지 5개, `entry_not_selected`였다.
- CET 읽기에서 `Game.GetScriptableServiceContainer():GetService("ANPC.SceneEntryInstaller")`가 `nil`이 아닌 서비스 객체를 반환했다. 서비스 존재만 확인했으며 초기화 콜백 실행/빅터 컴포넌트 존재는 아직 확인하지 못했다. 원작 캐시 해시는 로컬 manifest에 기록했다.

로컬 경로·배포 해시·세이브 백업은 Git 제외된 `config.local.scene-entry-deployment.json`, `config.local.viktor-save-backup.json`, `config.local.save-backup.json`, `config.local.g2-deployment.json`, `config.local.game-install.json`을 읽는다. 최신 빅터 자동 저장도 별도 백업 후 파일 해시 일치를 확인했다. 기존 G2 manifest의 Entry 해시는 이전 배포 값이므로 새 scene-entry manifest를 우선한다.

## 재개 순서

1. `AGENTS.md`, `docs/game-mod-implementation-plan.md`, `docs/game-mod-validation.md`, 이 기록을 읽고 `git status --short`를 확인한다. 로컬 변경을 초기화하거나 기존 작업 위에 무조건 pull하지 않는다.
2. 이전 사용량 중지 기록과 새 작업 상태를 구분한다. 사용자가 한도 회복 후 종료 조건 취소와 재진행을 요청해 `5-pc` 자동화는 삭제했다. 이전 종료 요청을 재실행하지 않는다.
3. 로컬 manifest의 실제 배포 해시와 소스를 대조한다. 이전 Entry만 복원할 때 SceneEntry 참조를 남기지 않는다. 신규 ANPC 파일만 제거할 수 있으며 다른 모드/게임 파일은 건드리지 않는다.
4. 게임 실제 시작 로그의 컴파일 결과와 Codeware 로그를 확인하고, 빅터 앞 최신 자동 저장을 로드한다. PC 화면 조작은 Computer Use skill의 최신 반환 window와 스크린샷으로 진행한다. 물리 Esc 중단 시 입력을 멈춘다.
5. 원작 5개 선택지가 유지되는지와 ANPC가 별도 엔진 허브로 표시되는지 확인한다. 미표시라면 컴포넌트 존재 → 리소스 로드 → 조건 값 → 활성 이벤트 → 선택 생성 순서로 좁혀 조사한다. 조건을 모두 해제하는 임시 통과는 하지 않는다.
6. 표시되면 키보드 선택과 엔진 입력으로 ANPC만 선택하고 소유 토큰 결과를 확인한다. 원작 handoff가 확인되기 전 AI를 시작하지 않는다. 실제 표시/선택, 실패, 미검증을 따로 기록한다.

빌드 예시는 PowerShell에서 `chcp 65001 > $null`을 먼저 적용하고 `scripts/build-game-scene-entry.ps1 -DotnetExe <로컬 dotnet.exe> -WolvenKitCli <로컬 WolvenKit.CLI.dll> -BuildDirectory <새 출력 경로>`를 실행한다. 이미 있는 출력 폴더에는 쓰지 않는다. 도구 위치와 CLI 컴파일 인수는 로컬 재개 manifest를 참조한다.

## 08시 중지 기록

새 후보의 실제 게임 컴파일과 빅터 저장 재로드는 성공했다. 로드 직후 ANPC 미표시를 재현했다. 표시 실패 원인은 아직 특정하지 못했고 실제 선택/handoff는 미검증이다. 현재 목표는 미완료다. 마지막 게임 화면은 빅터 앞 CET 콘솔이며 서비스 존재 조회까지 실행했다.

사용량 도구에서 300분 창 `usedPercent=95`를 확인해 구현과 게임 입력을 중지했다. 목표를 사용자 요청에 따른 `paused`로 기록하고 종료 감시 `5-pc`를 비활성화한 뒤 PC 종료를 요청한다. 종료 명령은 `/f` 없이 `shutdown.exe /s /t 0`을 사용한다. 앱의 미저장 내용 때문에 Windows가 종료를 막을 수 있으므로 전원이 실제 꺼졌다고 검증한 것으로 기록하지 않는다. 명령 실행 결과는 로컬 `config.local.game-resume.json`을 확인한다. 다음 재개는 이 채팅에서 작업 계속을 요청하면 된다.

2026-10-04 15시 재개: 로컬 종료 결과의 반환 코드 0을 확인했다. 사용자가 5% 조건 취소와 재진행을 요청해 감시를 삭제했고 목표는 active다. 설치 서비스의 콜백 횟수·빅터 일치/컴포넌트 추가 횟수·약한 빅터 참조를 읽는 진단을 추가했다. CLI 검사와 15:12:38 게임 실제 컴파일은 성공했다. 이 진단의 실행 결과는 아직 미확인이다.


15시 추가 진단: 설치 콜백 375회, 빅터 일치/추가 1회와 실제 소유 컴포넌트 존재를 확인했다. 빅터 원작 선택 대기에서 대화 쌍 판정이 false인 것을 확인해 두 객체 scene 참여와 이름이 일치하는 타이머 없는 원작 허브로 후보 조건을 수정했다. 리소스/조건/활성 횟수 진단을 포함해 CLI 검사 후 배포했다. 새 후보 실게임 표시/선택은 아직 미검증이다. 현재 배포 해시는 scene-entry manifest를 우선한다.


## 16시 최신 상태

16:02:05 실제 컴파일 후 빅터 앞 최신 자동 저장을 로드했다. 설치/추가 1회, 리소스 로드 성공, 허용 true, native 입력 활성 이벤트와 활성 소유 입력 레이어 1개를 확인했다. 원작 허브 1개/선택지 5개만 보여 ANPC 실제 표시/선택은 미검증이다. 자체 캡션 구성과 임시 소유 TweakDB 레코드도 표시를 해결하지 못했다. 원작 레코드/허브/fact를 수정하지 않았다.

자체 표시기를 DeviceVisualizer/Proximity로 바꾸고 캡션 parts를 설정한 비교 후보를 작성했다. CLI 컴파일·archive 빌드·roundtrip은 통과했고 게임 배포/실행 결과는 다음 검사 대상이다. 최신 배포는 config.local.scene-entry-deployment.json이 기준이다. AutoSave-19와 AutoSave-2(15:58)도 파일 3개씩 백업·해시 검증했으며 각각의 config.local.viktor-*-backup.json에 기록했다. 빅터 외 인물·원작 제어 handoff·AI 연결·종료 안정성은 미검증이다.

## 대화 위젯 표시 허브 후보

소유 InteractionComponent 경로를 중단하고 `dialogWidgetGameController.UpdateDialogsData` 래핑으로 ANPC 허브를 표시 데이터에만 덧붙이는 후보로 바꿨다. 선택은 `Choice2`(R)로만 받는다. 상세는 게임 검증 기록 9절을 따른다. 최신 배포 기준은 `config.local.ui-entry-deployment.json`이며 이전 scene-entry manifest보다 우선한다. `game/resources/anpc/entry_scene.interaction.json`과 `scripts/build-game-scene-entry.ps1`은 현재 배포에 쓰지 않는다.

다음 실게임 확인: 시작 컴파일 로그 → 빅터 앞 저장 로드 → 원작 5개 아래 `ANPC` 허브 표시 → R 선택 후 경고 메시지·CET `entry_selected_waiting_original_handoff` → 원작 항목 F 선택이 기존대로 실행되는지 확인. 미표시면 CET `G2 장면 진입 진단`의 `lastOffer`를 본다.

후속: 허브 표시·원작 F 정상, R 무반응 확인. 입력을 대화 위젯 리스너로 옮기고 스크롤 초점·F 선택 후보를 배포했다(검증 기록 9절). 확인 순서: 원작 마지막 항목에서 ↓로 ANPC 초점 → F → 경고 메시지·`entry_selected_waiting_original_handoff`, 원작 항목이 실행되지 않는지. 실패 시 CET 진단의 `actions`·`lastAction`·`lastInput`을 본다.

후속: ↓+F 선택 성공, 하위 대화 허브에도 표시되는 문제 확인. 메인 허브 기억 방식으로 하위 대화 표시를 막는 후보를 배포했다(검증 기록 9절).
F 소비 확인: ANPC 선택 시 원작 마지막 항목 미실행(사용자 관찰). ↓+F 방식을 기본 선택 방식으로 유지한다.
하위 대화 제외 확인(사용자 관찰): 메인 허브만 표시, 복귀 시 재표시. 빅터 대상 G2 진입점 표시·선택은 통과. 다음은 선택 뒤 원작 장면 handoff와 텍스트 입력 UI 연결이다.

## 지원 인물 확장

빅터 고정을 인물 표로 일반화하고 화자 레코드 진단(`lastSpeaker`)을 배포했다(검증 기록 10절). 다음: 미스티 등 대표 인물 앞 원작 대화에서 `lastSpeaker`를 읽어 표에 추가, 군중 말 걸기 후 ANPC 표시 여부 확인.
