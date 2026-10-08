# 게임 배포 절차

개발 중인 ANPC 파일을 게임 폴더에 반영하는 작업 절차다. 규격은 [DIST-26](mod-distribution-specification.md#2-최초-설치와-업데이트), 배포 기록 형식은 [AGENTS.md의 배포 이력 기록](../AGENTS.md#배포-이력-기록)이 기준이다. 공개 패키지 설치/제거는 이 절차가 아니다.

## 1. 원칙

- 게임에 들어가는 파일은 저장소 소스(`game/`)에서만 고친다. 게임 폴더의 ANPC 파일을 직접 고치지 않는다.
- 게임 폴더 반영은 `scripts/deploy-game-dev.ps1`로만 한다. 배포마다 파일 목록을 적은 별도 복사 스크립트를 만들지 않는다.
- 배포 한 번은 [배포 변경 이력](game-mod-validation.md)의 항목 하나다.

## 2. 대상 경로

| 소스 | 게임 루트 상대 경로 | 비고 |
| --- | --- | --- |
| `game/cet/anpc/` | `bin/x64/plugins/cyber_engine_tweaks/mods/anpc/` | `anpc.log`·`db.sqlite3`·`tts/` 등 실행 중 생기는 파일은 관리하지 않는다 |
| `game/redscript/ANPC/` | `r6/scripts/ANPC/` | 바뀌면 시험 컴파일(DIST-25) 후 배포 |
| `game/audioware/ANPC/` | `r6/audioware/ANPC/` | `slots/*.wav`는 TTS 보조 프로세스가 덮어쓰므로 없을 때만 설치 |
| `game/red4ext/ANPC/` | `red4ext/plugins/ANPC/` | Native 플러그인의 로컬 설정(`*.local.json`, Git 제외)만 둔다. 예: TTS 보조 프로세스 실행 명령 `tts-helper.local.json`(command·args·cwd·env·log). Native DLL 자체는 `-NativeDll`로만 바꾼다. 실행 중 생기는 `usage.local.jsonl`(요청별 지연·토큰 기록)은 관리하지 않는다 |
| `game/archive/` | `archive/pc/mod/` | 원작 자원으로 이 PC에서 만든 로컬 빌드 아카이브(`*.local.archive`, Git 제외)만 둔다. 예: UF-75 말하기 입모양 `ANPC_talk.local.archive`. 폴더가 없으면 건너뛴다 |
| `-NativeDll`로 지정한 빌드 DLL | `red4ext/plugins/ANPC/ANPC.Native.dll` | 지정하지 않으면 건드리지 않는다 |

게임 폴더 밖의 개발용 TTS 보조 프로세스·참조 음성 목록은 이 스크립트 대상이 아니다. 바꾸면 보조 프로세스만 다시 실행한다.

## 3. 절차

1. 소스를 고친다. 프롬프트·콘텐츠 원천(`prototype/public/`의 프롬프트·성격·동작 모듈, `content/`, `scripts/build-cet-prompts.mjs`와 그 입력 스크립트)을 바꿨으면 `npm run build:cet-prompts`로 `game/cet/anpc/prompts.lua`를 다시 만든다.
2. 커밋한다. 미커밋 상태로도 배포되지만 manifest에 기준 커밋과 미커밋 파일이 함께 남는다.
3. 게임을 종료한다.
4. 변경 계획을 확인한다. 아무것도 바꾸지 않는다.

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/deploy-game-dev.ps1 -Plan
   ```

5. 배포한다. 이름은 배포 이력 항목 제목에 쓰인다.

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/deploy-game-dev.ps1 -Name '<배포 이름>'
   ```

   Native DLL을 함께 바꿀 때는 `-NativeDll <빌드한 DLL 경로>`를 붙인다. CET Lua(`…/mods/anpc/*.lua`)와 `*.local.json`만 바뀐 경우에는 `-Live`로 게임을 켠 채 배포할 수 있다. 반영은 CET 오버레이의 모드 다시 불러오기(Lua) 또는 디버그 창의 TTS 재시작(보조 프로세스 설정)으로 한다.
6. 출력된 `config.local.backups/<배포 ID>/history.md` 초안의 변경 내용·이유·영향을 채워 [배포 변경 이력](game-mod-validation.md) 끝에 옮긴다. 일시·파일 목록·구분은 초안 그대로 쓴다.
7. 게임을 시작해 확인한다. 실게임 확인 결과는 [개발·검증 계획](development-validation.md)에 남긴다. 배포 이력의 `확인` 줄은 배포 시점 상태만 적는다.

## 4. 스크립트 동작

| 단계 | 동작 | 멈추는 경우 |
| --- | --- | --- |
| 비교 | 소스와 게임 파일의 SHA-256을 비교해 추가·수정 대상을 고른다. 마지막 배포의 소유 목록에 있으나 소스에서 사라진 파일은 삭제 대상이다 | 게임 루트가 아님 |
| 충돌 | 마지막 배포 뒤 게임 쪽에서 바뀐 소유 파일을 충돌로 표시한다 | 충돌이 있고 `-Force`가 없음 |
| 검사 | 생성 프롬프트가 소스와 일치하는지, 바뀐 `.reds`가 있으면 `scripts/check-redscript.ps1` 시험 컴파일(Audioware 있음·없음) | 프롬프트가 최신이 아님, 컴파일 실패 |
| 백업 | 바뀌기 전 파일을 `config.local.backups/<배포 ID>/files/`에 복사하고 해시를 확인한다 | 게임 실행 중, 백업 검증 실패 |
| 교체 | 파일을 복사·삭제하고 해시를 다시 확인한다 | 교체 실패 시 이번 변경을 백업으로 되돌리고 `rolled_back`(일부 미복구면 `partial`)으로 기록 |
| 기록 | `manifest.json`·`history.md`를 쓰고 소유 목록(`config.local.game-deploy-state.json`)을 갱신한다 | — |

변경이 없으면 배포 ID를 만들지 않는다.

## 5. 충돌 처리

충돌은 게임 폴더의 ANPC 파일이 스크립트 밖에서 바뀌었다는 뜻이다. 실험 중 직접 고친 내용이라면 소스에 옮겨 커밋한 뒤 다시 배포한다. 버려도 되는 변경이면 `-Force`로 배포한다. 이때도 지금 파일은 백업에 남는다.

## 6. 되돌리기

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-game-dev.ps1 -Restore <배포 ID> [-Plan]
```

지정한 배포 직전의 파일로 되돌린다. 그 배포가 추가한 파일은 지우고, 수정·삭제한 파일은 백업에서 복원한다. 배포 직후 해시와 지금 해시가 다른 파일은 충돌로 멈춘다. 되돌리기도 새 배포 ID와 이력 항목으로 기록한다. 소스는 그대로이므로 다음 배포 때 다시 적용된다. 계속 빼려면 소스도 되돌린다.

## 7. 반영 시점

| 바뀐 파일 | 게임 반영 |
| --- | --- |
| redscript·Audioware 정의·Native DLL | 게임 재시작 |
| CET Lua | 게임 재시작. CET 오버레이의 모드 다시 불러오기로도 반영되지만 대화 상태가 초기화된다 |

## 8. 기록 파일

모두 `config.local.*`라 Git에 올라가지 않는 개인 로컬 자료다.

| 파일 | 내용 |
| --- | --- |
| `config.local.game-deploy-state.json` | 소유 목록. 스크립트가 마지막으로 게임에 쓴 파일과 해시 |
| `config.local.backups/<배포 ID>/manifest.json` | 이름·종류(배포/되돌리기)·기준 커밋·미커밋 파일·검사 결과·상태·시작/완료 시각·파일별 구분과 변경 전/후 SHA-256·백업 경로 |
| `config.local.backups/<배포 ID>/files/` | 바뀌기 전 파일(게임 루트 상대 경로 구조) |
| `config.local.backups/<배포 ID>/history.md` | 배포 이력 항목 초안 |

DIST-26 이전 배포의 `config.local.deploy-*.ps1`과 그 manifest는 과거 기록 대조용이며 새 배포에 쓰지 않는다.
