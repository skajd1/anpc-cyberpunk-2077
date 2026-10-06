# 메인 퀘스트 진행에 따른 NPC 대화 분석

기준일: 2026-10-03. 본편·팬텀 리버티의 스포일러를 포함한다. 오리지널 인물 12명, 기존 관계 분기 63개를 대상으로 한다. [진행 정책](../content/cyberpunk2077/story-progression-policy.json)은 조사·작성 초안이며 실제 게임 모드에는 활성화하지 않았다.

## 현재 상태와 적용한 보완

기존 시제품은 관계 분기를 선택하면 그 분기의 태도·호칭·목표·과거 사건을 전달했다. 퀘스트 조건은 설명 문자열이고 `available`은 관계 분기의 시험 가능 여부였다. 살아 있는 인물이 가까이 있는지, 오리지널 대화가 끝났는지, 그 분기에 실제로 도달했는지까지 확인하지 않았다.

현재는 관계 단계와 별도로 본편 구간·개별 퀘스트 완료·오리지널 선택·접촉 경로·장면 제어를 판정한다. 기존 63개 단계마다 시작 조건을 두고, 초기 목표가 더 이상 맞지 않는 주요 구간에는 종료 조건을 둔다. 2막의 세 조사 경로와 개인 퀘스트는 독립된 상태다. 통화, 근처 NPC, 오리지널 장면, 부재, 조니의 렐릭 접촉을 구별한다. 원격 연락 기능은 아직 구현하지 않았다.

화면의 기본 모드는 퀘스트 진행 시험이다. 주요 시점 프리셋 8개와 세부 퀘스트·선택·접촉 입력을 제공한다. 조건이 맞지 않으면 인물 정보에 이유를 표시하고 요청 전에 차단한다. 관계 카드만 따로 시험하는 모드는 오리지널 장면의 말투를 비교하기 위한 격리된 가정 시험이다. 이 모드로 전환할 때 기억을 초기화한다.

웹 진행 입력은 브라우저의 모의값이다. 2026-10-05의 게임 2.31 정적 분석에서 후보 82개의 실제 일지 경로를 확인했고, 인지/관계/생존 fact 후보 36개를 별도 등록했다. 게임 수집기와의 전체 연결·의미 검토·실게임 상태 판정은 아직 미완료다. 후보 목록은 본편 주요 경로·개인 퀘스트·확장·결말의 지원 경계 분석용이며 모든 부업·대사 장면의 완전한 데이터베이스는 아니다.

## 본편 주요 사건표

| 진행 구간 | 주요 퀘스트·경로 | 대화 정책에 미치는 영향 |
| --- | --- | --- |
| 인생 경로·초반 | The Nomad / The Streetkid / The Corpo-Rat → The Rescue → The Ripperdoc → The Ride | 재키·빅터·미스티의 기존 안면을 사용. 렐릭 진단·조니·후반 사건을 미리 주입하지 않음 |
| 습격 준비 | The Information / The Pickup → The Heist | 에블린·주디의 첫 의뢰/BD 관계. 재키는 습격 전 동료로만 지원 |
| 습격과 회복 | The Heist → Love Like Fire / Playing for Time | 재키 사망으로 신규 대화 종료. 에블린의 습격 이후 자유 대화도 지원 밖. 빅터는 진단, 미스티는 상실, 조니는 각성 맥락 |
| 에블린·부두 보이즈 경로 | Automatic Love → The Space in Between → Disasterpiece → Double Life → M’ap Tann Pèlen → I Walk the Line → Transmission | 주디의 구출 협력 맥락. 에블린 구출은 대화 가능 회복을 뜻하지 않음. Never Fade Away는 과거 체험 장면이며 현재의 자유 NPC 관계로 처리하지 않음 |
| 헬맨 경로 | Ghost Town → Lightning Breaks → Life During Wartime | 로그 계약과 팬앰의 직접 협력 경험. 주디/타케무라 경로가 같은 정도로 진행했다고 추정하지 않음 |
| 아라사카 경로 | Down on the Street → Gimme Danger → Play It Safe → Search and Destroy | 타케무라의 조사·퍼레이드·구출 분기. 구출 성공도 현재 가까이 있다는 증거는 아님 |
| 개인 퀘스트 | 주디·팬앰·리버·케리·조니/로그의 각 경로 | 별도 완료·선택 조건으로 관계/목표 갱신. 대화 횟수나 호감 표현으로 친구·연인으로 승격하지 않음 |
| 결말 진입 | Nocturne Op55N1에서 엠버스의 되돌릴 수 없는 지점 → 옥상 선택 | 퀘스트가 일지에 생겼다는 사실과 실제 결말 진입을 구별. 구간이 finale이면 전체 자유 대화를 차단 |
| 결말·에필로그 | 아라사카 / 알데칼도 / 로그 / 단독 / 자살 및 확장 치료 경로 | 오리지널 제어를 유지. 엔딩별 별도 지원 창이 검증될 때까지 지원 밖. 엔딩 이전 저장으로 돌아갈 때 미래의 대화·관찰을 승계하지 않음 |

`Tapeworm`은 여러 주요 사건 뒤의 조니 대화가 합쳐지는 작업이다. 후보 선행 목록은 최소 지원 경계만 기록하며 실제 게임의 복수 트리거·시간 지연·장면 하위 단계를 재현하는 실행 순서표로 쓰지 않는다. 결말 후보도 경로별 장면을 식별하는 목록이며 일괄 선행 조건으로 결말을 자동 선택하지 않는다.

## NPC별 지원 구간표

| NPC | 지원 후보 창 | 종료·별도 처리 | 대화에 반영할 맥락 |
| --- | --- | --- | --- |
| 재키 | The Rescue 이후, The Heist 사망 이전의 확인된 자유·근거리 구간 | 사망 이후 영구 차단. 회상·음성 메시지는 살아 있는 재키 대화로 처리하지 않음 | 습격 준비와 기존 동료 관계만. 후반 목표를 만들 필요 없음 |
| 빅터 | The Ripperdoc 이후 진료소의 자유 구간, Playing for Time 진단 이후 자유 구간 | 오리지널 진료/연출 중 차단. Paid in Full은 진단과 독립된 사건 | 원래 우정 유지. 상환했다고 친밀도 상승·렐릭 진단 선취를 하지 않음 |
| 미스티 | 초반 가게 안면 / Playing for Time 이후 위로 | 옥상·아라사카 선택 장면은 오리지널 전용, 결말 구간 차단 | 재키 상실은 미스티에게만 확인된 단계에서 적용 |
| 주디 | The Information의 만남 이후 / Double Life 구출 협력 / Clouds 및 개인 퀘스트 / 오리지널 연인 분기 | Pisces 보수 수령 단절, 비연애 Pyramid Song 이후는 보수적으로 원격 창만 기록. 출발 전 잠깐의 근거리 창은 미검증 | 협력·마이코 선택·친구/연인과 현재 목표. 원격 가능과 근거리 가능을 혼동하지 않음 |
| 팬앰 | Ghost Town 만남 / 헬맨 협력 / 사울 구출 / Queen of the Highway 이후 확인된 캠프 접촉 | 사울에게 계획 공개한 단절 분기, 이동·전투·결말 장면 차단 | 의뢰와 클랜 보호, 오리지널 상호 선택 관계 |
| 타케무라 | 식당 만남 / 조사 / 퍼레이드 준비 / 구출 성공 뒤 실제 접촉이 확인된 창 | 미구출 차단. 구출 성공만으로 상시 등장·연락 가능을 만들지 않음 | 조사 목적과 구출 분기. 한동안 화면 밖이면 부재 |
| 로그 | 초기 계약 / 팬앰 소개 이후 / Chippin’ In 공개 이후 / Blistering Love 이후 V가 몸을 제어하는 자유 구간 | 조니가 몸을 빌린 오리지널 장면·결말 차단 | V와의 계약 및 공개된 조니 과거. 조니의 연애를 V의 연애로 바꾸지 않음 |
| 케리 | Holdin’ On 만남 이후 / 공연 / Us Cracks / Boat Drinks 이후 | 개인 퀘스트 전에는 명성을 안다고 직접 친구 취급하지 않음 | 음악 협력과 오리지널 친구/연인 분기 |
| 리버 | I Fought the Law 협력 / The Hunt 진행 / 구출 성공 / Following the River 이후 | 랜디 구출 실패·단절 분기 차단. 가족 오리지널 연출 중 차단 | 수사·가족 걱정·구출 결과와 친구/연인 분기 |
| 에블린 | The Information의 의뢰·덱스 제외 제안 이후, 습격 전 | 습격 이후 자유 대화 지원 밖. 구출 뒤 비언어 상태와 사망은 신규 대화 불가 | 초기 의뢰와 당시 공개한 제안만 |
| 조니 | Playing for Time 이후 확인된 렐릭 접촉, 유전 선택·공연 이후 단계 | 렐릭 분리·오리지널 장면/전투 중 차단. 독립 NPC 몸의 거리·시선·정지 제어를 요구하지 않음 | 공유된 경험과 유전 대화의 실제 선택. 시대 지식·비밀은 기존 인지 필터 유지 |
| 소미 | Transmission 이후 확장 경로. 자유 대화 후보는 탈출 계획을 공유한 뒤, Firestarter 전의 확인된 접촉 | 초반 원격·구출 중 연락 두절, 블랙 사파이어·공항/고백·Cynosure는 오리지널 장면 전용. 달 출발·FIA 인계·사망 이후 차단 | 탈출 협력의 현재 목적. 소미 애칭과 V 호칭 유지. 일회용 치료 등 후반 비밀은 단계 선택으로 공개하지 않음 |

기존 63개 카드로 표현되지 않는 중간 구간은 지원 밖이다. 예를 들어 Both Sides, Now 뒤 주디의 애도에서 Clouds 계획 합의 전까지는 별도의 목표·인지 자료를 검수해 추가해야 한다. 게임 내 짧은 틈까지 전부 지원한다고 주장하지 않는다. 최초 만남 퀘스트의 완료를 하한으로 잡은 창은 도중의 특정 대화 종료 플래그가 검증되면 더 세밀하게 넓힐 수 있다. 자유 구간 후보도 대상 접촉·오리지널 제어가 별도로 확인되어야 한다.

## 진행도와 대화 내용의 연결

성격·원칙은 고정하고, 조건을 통과한 관계 단계의 현재 목표·태도·호칭·알려진 사건을 전달한다. 추가 사건도 인물별로 제한한다. 빅터의 상환·진단과 미스티의 상실을 해당 인물에게만 전달하며 전체 게임 사건 목록을 모든 NPC에게 넣지 않는다. 플레이어가 말한 사건은 기억의 자기보고로 남고 오리지널 진행 플래그를 변경하지 않는다.

관계의 후기 분기를 직접 골라도 퀘스트/오리지널 선택 조건이 맞지 않으면 주입 전에 거부한다. 상환 단계를 선택한 빅터는 현재 진단 전/후 단계로 투영하고 상환만 독립적으로 추가한다. 진행 시험의 렐릭 지식 체크도 Playing for Time 완료 전에는 허용하지 않는다. 인지의 세부 게임 근거 수집은 여전히 후속 작업이다.

생성 요청 후 진행 상태가 바뀌면 응답을 표시·행동·기억에 반영하지 않는다. 화면 변경과 주기 검사에서 대화를 종료한다. 진행도를 되돌리거나 이미 정해진 분기를 바꾸면 미래 기억을 지우며, 모의 저장 로드는 해당 시점의 저장된 기억을 복원한다. 브라우저에 남긴 인물 기억에도 진행 출처를 보존해 새로고침 후 초기 진행도로 후기 기억이 들어가지 않게 한다.

## 게임 정보 연결표와 미검증 경계

공통 형식은 [모듈 입출력 규격](module-interface-specification.md)과 [필드 등록표](../contracts/v1/cyberpunk2077-fields.json)를 따른다. 현재 웹 입력은 `storyState.fields`의 평면 모의값으로만 투영되어 있으며 공통 `StateSnapshot.fields`의 `ObservedField`를 실제 수집하는 어댑터로 전환하지 않았다. 수집 실패·출처 불명·기한 지난 값은 미확인으로 유지해야 한다.

| 의미 필드 | 실제 게임에서 읽어야 할 근거 | 현재 연결 상태 |
| --- | --- | --- |
| content.quests.* | 퀘스트 일지·작업 상태 및 완료/실패 판정 | 후보 제목·정규화 값만 작성. game_binding은 전부 null |
| content.choices.* | 구출, 보수 수령, 유전 대화, 오리지널 연애 성립, Firestarter/최종 처분의 개별 결과 | 모의 선택. 누적 친밀도나 AI 추정으로 대체 불가 |
| content.story.period | 습격 전 / Playing for Time 후 / 엠버스 실제 진입 / 에필로그 | 모의 프리셋. Nocturne 일지 등록만으로 finale로 바꾸면 안 됨 |
| content.story.scene_free | 오리지널 대화·퀘스트 씬·퍼펫 제어·전투/활동 및 선택지 소유권 | 모의 확인 체크. 실제 오리지널 제어 판정·복구 수집 필요 |
| content.contact.* | 동일 NPC의 현재 엔티티·근거리 접근·상호작용 허용 또는 확인된 렐릭 접촉 | 모의 선택. 생존/관계/전화 가능으로 근거리 접근을 추정하지 않음 |
| content.grants.* | 해당 인물의 경험·공개·수집 출처와 사실별 인지 | 기존 개발용 인지 프로필. 퀘스트 전체 완료로 모든 비밀을 공개하지 않음 |
| 저장 범위·세계 세대 | 실제 저장 로드·되돌림·NPC 재생성의 이벤트 | 브라우저 슬롯/모의 세대만 구현. 게임 저장 연동 필요 |

## 앞으로 추가해야 할 사항

| 순서 | 추가 작업 | 완료를 판단할 근거 |
| --- | --- | --- |
| 1 | Jackie / The Heist를 첫 실증 대상으로 실제 퀘스트·사망·오리지널 제어 수집기를 구현 | 습격 전 자유 접촉과 사망 직전/후 게임 저장에서 추가 선택지·종료·늦은 응답 폐기 확인 |
| 2 | 빅터·미스티의 초반/진단/상실 및 상환을 검증 | 진단 전 상환과 진단 후 상환 저장을 각각 확인. 성격/우정 불변·미래 지식 미노출 |
| 3 | 2막 세 경로를 독립 매핑하고 실제 관계 단계를 자동 해석 | 경로 순서를 바꾼 저장들, 타케무라 구출/미구출과 화면 밖 접촉 상태 확인 |
| 4 | 개인 퀘스트·오리지널 연애·단절 결과와 NPC 이동/시간 조건을 검증 | 주디 도시 출발, 캠프/아파트/가족 집, 재접촉에 대해 지원 창의 시작/끝 기록 |
| 5 | 팬텀 리버티의 원격/장면/전투/부재 세부 단계 및 조니 렐릭 경로를 검증 | 소미와 조니의 오리지널 씬 중 추가 제어 금지, 비밀별 인지·공개 및 분기별 접촉 종료 확인 |
| 6 | 게임 저장 연동 및 검수·출시 승인 | 결말 전 저장 복귀·로드 중 요청·오리지널 컨트롤 복원, 한국어 말투/인지 사람 검수 |

원격 연락과 결말별 별도 대화는 위 검증 뒤에 기능 범위를 결정한다. 현재 사망·부재를 임의 생성 대화로 채우거나 모든 엔딩 NPC에 새 목표를 만드는 작업은 필요하지 않다.

실제 모딩 도구와 수집기·선택지·제어·저장 연결은 [게임 모드 구현 계획](game-mod-implementation-plan.md)의 G0~G7에 따라 진행한다. 이 계획 작성만으로 현재 game_binding=null 후보를 검증 완료로 바꾸지 않는다.

## 조사 근거와 한계

기존 조사 묶음의 인물별 퀘스트 출처와 [Nocturne Op55N1](https://cyberpunk.fandom.com/wiki/Nocturne_Op55N1), [팬텀 리버티 결말 공략](https://www.gamesradar.com/cyberpunk-2077-phantom-liberty-endings/), [PC Gamer 결말 공략](https://www.pcgamer.com/cyberpunk-2077-phantom-liberty-endings/)을 기준으로 경계를 정리했다. 후자의 두 본문은 이전 소미 조사에서 확인했다. 위키 본문 접근 제한은 원본 sources.json에 기록되어 있다.

이번 웹검색의 Paid in Full 발췌는 The Ripperdoc에서 비용을 지급하지 않았을 때 발생하는 부업임을 확인해 상환과 렐릭 진단을 분리하는 근거로 사용했다. [검색 결과](https://duckduckgo.com/?q=Cyberpunk+2077+Paid+in+Full+before+The+Heist+Viktor)는 원문 전체 검수나 게임 내부 ID 검증의 증거가 아니다. 메인 경로·확장 시작·주디 출발 검색은 보조 조사이며 모든 시작/끝 플래그의 사실성을 새로 검증한 것으로 간주하지 않는다.

## 게임 2.31 파일에서 확인한 상태 연결

[연결 자료](../content/cyberpunk2077/game-state-bindings.json)는 runtime_enabled=false인 정적 조사 결과다. 본편/확장 주요 quest·questphase·scene 3062개, 일지와 영문 표시 자료를 읽기 전용으로 추출했다. 7613개 fact 이름, 선택 노드 15182개, 일지 변경 참조 24557개를 색인했다. 이 수에는 개발 테스트·구버전·동일 장면의 다른 버전도 포함되므로 실제 선택지 개수나 지원 기능 수로 사용하지 않는다. 원본 추출/JSON은 config.local.story-reference에만 보관하고 배포하지 않는다. 등록표에는 자원 경로·노드/JSON 포인터·쓰기/검사 값·SHA-256만 남긴다.

### 선택지와 저장된 상태

선택 노드의 scnNodeId와 옵션의 screenplayOptionId는 장면 안의 식별자다. 파일에 같은 번호가 있거나 화면 자막 ID가 같다는 것만으로 전역 선택 ID로 취급하지 않는다. 선택 뒤 실행되는 questSetVar_NodeType의 setExactValue/value, 이후 questVarComparison_ConditionType의 조건을 추적한다. setExactValue=0은 대입이 아니라 가산이므로 구분한다. fact=0은 미기록 기본값과 명시적 0을 구분하지 못할 수 있어 선행 일지/분기 해결 상태가 필요하다.

주디의 sq026_08_plan.scene에서는 선택 노드 1180의 screenplayOptionId 5378, 출력 소켓 ordinal 2 → 대사 구간 1185 → fact 기록 노드 2696으로 연결되어 judy_knows_johnny=1을 기록한다. 옵션의 내부 caption은 doesnt know이며, 이를 플레이어의 거절로 읽으면 안 된다. 현재 주디가 모르는 분기에서 설명을 전달한 뒤 인지가 바뀌는 경로다. 다른 경로인 sq030_09_pier.scene에서도 같은 fact를 기록한다. 하나의 최초 선택 ID만 추적하면 나중의 공개를 놓친다.

### 인지·관계에 사용할 실제 후보

| 인물/조건 | 실제 키·근거 | 판정 한계 |
| --- | --- | --- |
| 주디의 조니 인지 | judy_knows_johnny, sq026_08_plan.scene 2696 / sq030_09_pier.scene 1271 | 조니의 전체 과거·치료 방법까지 아는 근거가 아님 |
| 주디에게 전달한 진실 | q105_02_judy_truth_told, q105_02_lizzy_meet_judy.scene 2498/2501 | 어떤 내용을 공개했는지 장면 내용별 의미 검토 필요 |
| 팬앰의 칩 인지 | sq027_panam_knows_about_chip, sq027_09_new_camp_wakeup.scene 1004 | 조니 설명과 분리 |
| 팬앰의 조니 비인지 | sq027_panam_doesnt_know_about_johnny, 같은 장면 3205 | 값 0만으로 인지를 확정하지 않음 |
| 리버의 조니 인지 | sq029_river_knows_johnny, sq029_05_morning_after.scene 32 | 연인·성관계·정보 공개는 별개 |
| 주디/팬앰/리버 연인 | sq030_judy_lover / sq027_panam_lover / sq029_river_lover | 연애 가능성 romanceable과 관계 확정은 별개 |
| 케리 친구/관계 | sq028_kerry_friend / sq028_kerry_relationship, sq028_07_trashy_beach.scene 115/66 | sq028_kerry_sex와 분리. sq028_kerry_lover는 이 범위에서 테스트 쓰기만 발견하여 제외 |
| 조니의 두 번째 기회 | sq032_johnny_friend, sq031_05_grave.scene 1483 | 일반적인 친밀도 점수나 모든 좋은 선택의 합계로 사용하지 않음 |
| 로그와 조니의 사건 | sq031_rogue_met_johnny / sq031_rogue_lover | V 자신의 연인 관계로 투영하지 않음 |
| 주디의 보수 수령 | sq026_13_maiko_money, sq026_13_hiromi.scene 367 | Pisces 분기·완료와 함께 단절 의미를 확인 |
| 타케무라 생존 | q112_takemura_dead, q112_10_safe_house.scene의 1/0 기록 경로 | 분기 해결 전 0을 구출 완료로 해석하지 않음 |
| 랜디 구출 | sq021_randy_saved / sq021_randy_kaputt | 리버 관계와 독립 판정 |
| 소미의 치료 설명·생존/경로 | q303_somi_told_about_cure / q306_somi_betrayed / q305_fact_songbird_dead / q305_songbird_alive | 치료 한계·FIA 인계·달 출발의 별도 경로 검토 필요 |

빅터·미스티·재키·에블린과 소미의 최초 인지는 전용 fact 이름 하나가 아니라 필수 장면/일지 목표/후속 대사의 경로에서 확인해야 하는 항목이 남아 있다. 관련 퀘스트를 끝냈다는 사실을 모든 비밀의 인지로 대체하지 않는다. 인물 12명별 확인 키·검토할 퀘스트·현재 한계는 연결 자료의 npc_scopes에 기록했다.

### 관계와 메인 진행의 기준

게임의 조리된 일지와 실제 영문 표시를 대조해 기존 정책 82개의 실제 경로를 찾았다. Phantom Liberty 아카이브에 포함된 본편 일지와 ep1 일지를 함께 사용했고 기본 아카이브의 이전 본편 일지만 사용하지 않았다. 동명 Blistering Love는 메타 일지와 sq031_cinema가 둘 다 있어 실제 개인 퀘스트 경로를 명시했다. 대표 경로는 다음과 같다.

| 정책 ID | 실제 JournalQuest 경로 |
| --- | --- |
| playing_for_time | quests/main_quest/act_01/q101_resurrection |
| heist | quests/main_quest/prologue/q005_heist |
| pisces | quests/side_quest/sq026_04_hiromi |
| boat_drinks | quests/side_quest/sq028_kerry_romance |
| search_and_destroy | quests/main_quest/act_01/q112_04_hideout |
| nocturne | quests/meta/02_sickness |
| firestarter | ep1/quests/main_quest/q304_deal |

조회 후보는 JournalManager.GetEntryByString(path, gameJournalQuest) → GetEntryState와 QuestsSystem.GetFact다. 현재 저장에서 다시 평가하며 이전 모드 기억으로 게임 상태를 대체하지 않는다. q115_point_of_no_return은 Nocturne의 일지 등록과 분리한다. q101_done 같은 fact도 개발용 .quest에서 값을 주입하는 예가 있어 실제 쓰기/검사 경로를 확인해야 한다.

현재 82개 경로는 파일 참조 확인, 36개 fact는 쓰기/검사 후보 등록 단계다. 관계 단계 63개의 완전한 자동 선택·모든 비밀의 의미 검토·게임 수집기 연결은 미완료다. 사용자 지시에 따라 실게임 검증은 수행하지 않았고 정적 자료를 runtime_enabled/approved로 자동 승격하지 않는다.

기술 근거: [Quest facts와 파일](https://github.com/CDPR-Modding-Documentation/Cyberpunk-Modding-Docs/blob/main/for-mod-creators-theory/files-and-what-they-do/file-formats/quests-.scene-files/quests-facts-and-files.md)、[Quest Editor](https://github.com/CDPR-Modding-Documentation/WolvenKit-8-Wiki/blob/main/wolvenkit-app/editor/quest-editor.md)。문서 설명은 구조 이해의 보조이며 개별 fact의 근거는 설치된 게임 파일을 우선한다.
## 세 인물 우선 연결 상태

2026-10-05. 사용자가 주디·팬앰·조니를 우선 대상으로 선택했다. scripts/game-story-data.mjs의 제한된 경로/키가 game/redscript/ANPC/Story.reds와 생성 프롬프트로 들어가며, game/cet/anpc/story.lua → identity.lua/context.lua에서 실제 스냅샷을 투영한다. 현재 게임 수집기와 연결된 개발 범위는 docs/game-context-specification.md의 우선 연결 절을 참조한다. 전체 연구 등록표와 다른 인물의 runtime_enabled/verified 상태는 자동 승격하지 않는다.

팬앰의 sq027_09_new_camp_wakeup.scene에서 칩 공개 기록 노드 1004는 설명 대사 구간 615 뒤에 있다. 조니 설명 선택 노드 609의 두 선택과 일반적인 구성체 설명 노드 619의 두 선택이 이 구간으로 합쳐진다. 일반 설명의 별도 출력은 sq027_panam_doesnt_know_about_johnny 기록 노드 3205로 연결된다. 따라서 칩 공개가 확인되기 전에는 조니 비인지 키의 기본 0으로 인지를 만들지 않고, 칩 설명이 완료된 기록과 함께 분기를 판정한다.

완전 지원하지 않는 창: 주디가 Both Sides, Now 이후 클라우드 계획에 합의하기 전, Pisces의 V 계획 이후 Pyramid Song 완료 전 일부 구간, 조니의 초기 각성 이후 Tapeworm 완료 전 중간 변화 등은 기존 authored 카드의 정확한 대응이 없어 관계 unknown으로 유지한다. 확인된 비밀 공개는 관계 단계와 독립적으로 반영한다. 현재 자동 검사/컴파일로 확인했으며 실게임 검증은 사용자 요청에 따라 제외했다.