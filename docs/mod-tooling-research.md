# 사이버펑크 2077 모딩 도구와 게임 연결 조사

조사일: 2026-10-04. 웹검색으로 자료를 찾고 제작자 문서·GitHub 릴리스·공개 소스를 확인했다. 실제 게임 설치·컴파일·호환 시험은 수행하지 않았다. 적용 설계는 [게임 모드 구현 계획](game-mod-implementation-plan.md), 공통 계약은 [모듈 입출력 규격](module-interface-specification.md)을 따른다.

## 1. 도구와 역할

버전은 조사일의 GitHub `releases/latest` 응답을 확인한 설치 후보다. 아래 전체 조합이 ANPC에서 검증됐다는 뜻은 아니다. 게임 패치가 다르면 설치 전에 각 제작자의 호환 정보를 다시 확인한다.

검색 결과는 자료 탐색에만 사용했다. 아래 소스 링크는 확인한 커밋으로 고정하며 그 HEAD와 각 릴리스 바이너리의 완전한 일치를 별도로 검증한 것은 아니다. 릴리스 API·README·wiki의 버전 표기가 다르면 실제 설치 버전의 동작/로그로 판정한다.

| 도구 | 확인한 버전 | 확인한 역할 | ANPC 적용 |
| --- | --- | --- | --- |
| [RED4ext](https://github.com/WopsS/RED4ext/releases/tag/v1.30.0) | 1.30.0 | DLL 플러그인 로더·게임 API 확장 | 런타임 기반 |
| [redscript](https://github.com/jac3km4/redscript/releases/tag/v0.5.31) | 0.5.31 | 게임 스크립트 컴파일·기존 메서드 확장 | 대상·상태·선택지·NPC 제어·저장 연결 |
| [Cyber Engine Tweaks](https://github.com/maximegmd/CyberEngineTweaks/releases/tag/v1.37.1) | 1.37.1 | Lua·ImGui·게임 객체 접근·키 바인딩 | 채팅 UI·대화 정책·개발 계측 |
| [Codeware](https://github.com/psiberx/cp2077-codeware/releases/tag/v1.20.5) | 1.20.5 | 수명 이벤트·게임 UI·리플렉션 확장 | 세션 경계·자막 HUD·객체 추적 |
| [WolvenKit](https://github.com/WolvenKit/WolvenKit/releases/tag/9.0.1) | 9.0.1 | 게임 자산 탐색·변환·패키징 | 개발용. 출시 모드의 런타임 의존성 아님 |
| [Redscript IDE](https://github.com/jac3km4/redscript-ide) | 설치 시 호환 버전 고정 | VS Code 타입 검사·완성·정의 이동 | 개발용. 게임 경로와 스크립트 폴더 지정 |
| [Red Hot Tools](https://github.com/psiberx/cp2077-red-hot-tools) | latest 응답 1.3.0-rc.2 | 엔티티·ink Inspector·스크립트/자산 재로드 | 선택 개발용. RC와 오래된 README 호환표를 실제 게임에서 대조 |
| [RedHttpClient](https://github.com/rayshader/cp2077-red-httpclient/releases/tag/v0.7.1) | 0.7.1 | CET/redscript에서 비동기 HTTPS | 네트워크 실증용. 제품 통신의 제약은 3절 |
| [RedData](https://github.com/rayshader/cp2077-red-data/releases/tag/v0.10.1) | 0.10.1 | JSON 파싱·직렬화·UUID | RedHttpClient의 JSON 실증에 선택 사용 |
| [RedFileSystem](https://github.com/rayshader/cp2077-red-filesystem/releases/tag/v0.15.1) | 0.15.1 | 모드별 UTF-8/JSON 파일 접근 | RedHttpClient 설정·파일 실증에 사용. 제품 저장소와 구분 |

Codeware·RedHttpClient·RedData·RedFileSystem의 현재 호환 안내는 게임 2.31을 명시한다. 이를 첫 Windows x64 시험 후보로 삼되 사용자의 실제 게임 빌드를 우선 확인한다. WolvenKit 9.0.1 릴리스는 .NET 10 런타임을 요구한다. 개발 도구의 .NET 요구가 ANPC에 C# 서버가 필요하다는 뜻은 아니다.

## 2. REDmod와 도구 선택

[CDPR 모딩 지원](https://www.cyberpunk.net/en/modding-support)은 REDmod를 무료 DLC·배포/자산 제작 도구로 설명하며 WolvenKit과의 사용을 안내한다. REDmod의 `mods/<name>/info.json` 방식과 CET/redscript/RED4ext의 설치 경로는 서로 다르다.

ANPC의 첫 작업은 기존 게임 객체에 대화 UI와 상태 검사를 연결하는 스크립트 모드다. RED4ext·redscript·CET·Codeware를 먼저 사용한다. 신규 자산이 필요해질 때 WolvenKit으로 만들고 REDmod/아카이브 배포를 별도 결정한다. REDmod만 설치하면 실시간 HTTPS·NPC 제어·선택지 삽입이 제공되는 것으로 가정하지 않는다. ArchiveXL·TweakXL·AMM도 첫 런타임 필수로 일괄 추가하지 않는다.

공통 도구 역할의 근거: [Core Mods explained](https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/core-mods-explained.md), [WolvenKit 소개](https://wiki.redmodding.org/wolvenkit), [모드 제작 흐름](https://wiki.redmodding.org/wolvenkit/getting-started/creating-a-mod.md).

## 3. API 통신에서 확인한 제약

[RedHttpClient README](https://github.com/rayshader/cp2077-red-httpclient/blob/b33afe186b21450e70b36f8f8fd26800a14212ca/README.md)는 HTTPS와 TLS 1.2 이상, `AsyncHttpClient.Post`·`HttpCallback.Create`를 제공한다. 동기 `HttpClient`는 호출 스레드를 막으므로 게임 흐름에 사용하지 않는다.

| 공개 구현에서 확인한 것 | 설계 판단 |
| --- | --- |
| 기본 요청/응답 로그 활성 | 개인 키 호출 전 logging=false를 실제 설정/로그에서 확인. 원문·인증 헤더 없는 자체 진단만 사용 |
| AsyncHttpClient는 Void 반환, 공개 취소 핸들·요청별 timeout 매개변수 없음 | UI 취소·늦은 응답 폐기는 가능하나 전송 중단·전체 제한 시간을 완료했다고 판정하지 않음 |
| 소스에서 JobQueue 작업이 HTTP future를 기다린 뒤 스크립트 콜백 실행 | 콜백이 UI/게임 객체를 즉시 수정해도 안전한지 보장하지 않음. 호스트 게임 업데이트 큐로 전달 |
| 0.7.1의 `-no-tls`/`-self-signed`는 개발용 연결 옵션 | 개인 키를 보내는 제품 연결은 정상 HTTPS 검증 유지 |

소스 근거: [AsyncHttpClient.cpp](https://github.com/rayshader/cp2077-red-httpclient/blob/b33afe186b21450e70b36f8f8fd26800a14212ca/src/AsyncHttpClient.cpp), [HttpCallback.h](https://github.com/rayshader/cp2077-red-httpclient/blob/b33afe186b21450e70b36f8f8fd26800a14212ca/src/HttpCallback.h), [Settings.h](https://github.com/rayshader/cp2077-red-httpclient/blob/b33afe186b21450e70b36f8f8fd26800a14212ca/src/Settings.h).

RedFileSystem 0.15.1 안내의 저장 경로는 `r6/storages/<mod>`다. RedHttpClient README에는 이전 `red4ext/plugins/RedFileSystem/storages/RedHttpClient/config.json` 경로가 남아 있다. 설치한 버전이 생성한 실제 설정 경로와 로그를 확인해야 한다. 설명의 옛 경로만 수정하고 로그 비활성을 판정하지 않는다.

제품 연결은 Windows의 [WinHTTP 제한 시간](https://learn.microsoft.com/en-us/windows/win32/api/winhttp/nf-winhttp-winhttpsettimeouts)·[요청 핸들 종료](https://learn.microsoft.com/en-us/windows/win32/api/winhttp/nf-winhttp-winhttpclosehandle)·[Credential Manager](https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credwritew)를 사용하는 작은 RED4ext 플러그인으로 설계한다. WinHTTP의 단계별 timeout만으로 전체 요청 시간을 보장하지 않으므로 전체 마감 시간도 호스트에서 관리한다. 핸들 종료 후에도 도착할 수 있는 콜백은 폐기 검사를 거친다. 초안을 `game/native/`에 구현했고 GitHub Actions Windows 빌드를 통과했다. 배포 파일 변경은 [배포 변경 이력](game-mod-validation.md), 현재 검증 상태는 [명세 대조 리뷰](game-mod-spec-review-2026-10-05.md)를 따른다.

## 4. 게임 저장과 문자열

[Persistence](https://wiki.redmodding.org/scripting-cyberpunk/redscript/language-reference/persistence.md)와 [ScriptableSystem](https://wiki.redmodding.org/scripting-cyberpunk/redscript/language-reference/scriptables/scriptablesystem.md)에서 다음을 확인했다.

| 저장 수단 | 실제 범위 | ANPC 적용 |
| --- | --- | --- |
| ScriptableSystem의 persistent 필드 | 게임 저장 파일별. OnRestored에서 복원 상태 접근 | 플레이 회차·기억 체크포인트의 숫자 식별자와 기억 묶음 바이트 |
| Codeware ScriptableService의 persistent 필드 | 여러 저장이 공유하는 전역 저장 | 대화 기억 저장에 사용하지 않음 |
| String·Variant·ResRef 및 그 배열 | 위 persistent 저장의 지원 대상 아님 | 요약 문자열을 persistent String으로 선언하지 않음. UTF-8 바이트 배열 직렬화를 첫 시험 후보로 사용 |
| 외부 모드 파일 | 슬롯/로드와 자동 동기화되지 않음 | 게임에 저장한 체크포인트가 가리키는 불변 SaveBundle만 복원 |

문서는 문자열을 CName으로 변환하는 우회도 안내한다. ANPC는 저장별 ScriptableSystem에 숫자 식별자와 UTF-8 기억 묶음의 바이트 배열을 넣는 방향을 선택한다. 별도 기억 파일과 슬롯을 맞추는 작업을 줄일 수 있다. Uint8 배열·한글·크기·이전 저장·모드 제거의 실제 직렬화 시험이 통과해야 채택 구현으로 활성화한다. 모드를 제거한 상태에서 다시 저장하면 커스텀 persistent 필드가 사라질 수 있으므로 설치/제거 안내와 빈 기억 복원이 필요하다.

[Codeware 수명 문서](https://github.com/psiberx/cp2077-codeware/wiki#lifecycle)·[GameSessionController](https://github.com/psiberx/cp2077-codeware/blob/613a1cb830ecf33508ffca839d3ea631073504ef/src/App/Callback/Controllers/GameSessionController.hpp)·[GameSessionEvent](https://github.com/psiberx/cp2077-codeware/blob/613a1cb830ecf33508ffca839d3ea631073504ef/scripts/Callback/Events/GameSessionEvent.reds)는 Session/BeforeSave·AfterSave·Start·BeforeEnd·End와 IsRestored를 제공한다. 이벤트 객체에는 슬롯 식별자나 성공 결과가 없다. AfterSave만으로 정확한 파일과 성공 여부가 확인됐다고 주장할 수 없으며 자동/수동/빠른 저장의 호출 순서를 실증해야 한다.

## 5. 선택지·대상·제어의 선행 근거

[Real Talk](https://github.com/swillunderscore/realtalk/tree/1eea7f3611b4601c9b025702ce0d0226d12c431e) 공개 코드를 참고했다. ANPC 정책과 다른 부분까지 도입하지 않으며 코드를 복사하지 않는다.

| 코드 | 확인한 후보 API/문제 | ANPC 판단 |
| --- | --- | --- |
| [RealTalkTarget.reds](https://github.com/swillunderscore/realtalk/blob/1eea7f3611b4601c9b025702ce0d0226d12c431e/r6/scripts/RealTalk/RealTalkTarget.reds) | TargetingSystem.GetLookAtObject·NPC 상태/거리 판정 | 군중 시선 대상의 첫 실증 후보 |
| [RealTalkActions.reds](https://github.com/swillunderscore/realtalk/blob/1eea7f3611b4601c9b025702ce0d0226d12c431e/r6/scripts/RealTalk/RealTalkActions.reds) | AIHoldPositionCommand·LookAtAddEvent·해제 | ANPC 소유 제어만 실행/해제. 자연스러운 회전·오리지널 복구는 별도 시험 |
| [RealTalkDialog.reds](https://github.com/swillunderscore/realtalk/blob/1eea7f3611b4601c9b025702ce0d0226d12c431e/r6/scripts/RealTalk/RealTalkDialog.reds) | InteractionUIBase.OnDialogsData를 감싸 대화 목록을 비우는 방식 | 오리지널 선택지 보존 요구와 다름. 추가 선택지 삽입이 검증된 근거로 사용하지 않음 |
| [RealTalkInput.reds](https://github.com/swillunderscore/realtalk/blob/1eea7f3611b4601c9b025702ce0d0226d12c431e/r6/scripts/RealTalk/RealTalkInput.reds) | 입력 중 오리지널 선택 중복 실행·UIInteractions.DialogChoiceHubs 복원 문제 | 입력 소유·종료/로드·오리지널 제어 복귀를 첫 실증 항목으로 둠 |
| [RealTalkMemory.reds](https://github.com/swillunderscore/realtalk/blob/1eea7f3611b4601c9b025702ce0d0226d12c431e/r6/scripts/RealTalk/RealTalkMemory.reds) | 단일 memory.json·인물 식별을 이용한 지속 기억 | 게임 저장 시점의 기억 복원을 자동 보장하지 않음 |

퀘스트 변화 관찰은 [Quests](https://wiki.redmodding.org/scripting-cyberpunk/scripting-cyberpunk/observables/quests.md)의 JournalManager/QuestTracker 이벤트를 후보로 사용한다. 일지 변화와 세부 선택·실제 NPC 인지는 별도다. NativeDB·사용자 설치 빌드의 디컴파일 자료·전후 저장을 함께 확인해 실제 필드를 연결한다. 검색 발췌나 다른 모드의 문자열만으로 ANPC의 82개 후보를 verified로 바꾸지 않는다.

## 6. 개발 도구 사용과 검증 경계

- [NativeDB](https://nativedb.red4ext.com/)는 타입·함수 후보 탐색용이다. 이번 직접 접속은 JavaScript 앱 초기 화면만 확인했으며 내부 함수의 존재/시그니처를 NativeDB에서 전수 검증하지 않았다.
- [UI Scripting](https://wiki.redmodding.org/scripting-cyberpunk/scripting/game-systems/ui-scripting.md)과 Codeware UI 문서에서 inkHUDLayer·위젯 생성·입력 컴포넌트의 근거를 확인했다. Red Hot Tools의 Ink Inspector로 사용자의 실제 UI 트리를 조사한다.
- Red Hot Tools는 struct 필드 변경과 일부 요청 핸들러의 핫 리로드에 제한이 있다. 저장·수명·타입 구조 변경 뒤에는 게임을 재시작하고 이전 저장도 다시 시험한다.
- [RED4ext 플러그인 제작](https://docs.red4ext.com/mod-developers/creating-a-plugin.md)은 x64 출력·SDK·플러그인 export·red4ext/plugins 설치를 안내한다. ANPC.Native는 Windows CMake/MSVC 빌드와 VC++ 런타임 조건을 기록한다.
- 공식 REDmod 안내와 제작자 저장소를 근거로 선정했으나 도구 바이너리를 이 Linux 작업 환경에 설치하거나 실제 게임에 연결하지 않았다. 게임에서의 성공은 개발 계획의 단계별 수용 결과로만 기록한다.
