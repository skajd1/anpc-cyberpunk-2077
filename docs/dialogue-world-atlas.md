# 대화용 세계관 자료 지도

2026-10-04, research-1.3. [사실 원본](../content/cyberpunk2077/world-facts.json), [분류 색인](../content/cyberpunk2077/dialogue-preparation.json), [인지·공개 배분](../content/cyberpunk2077/knowledge.json)을 연결하는 조사 안내다. 이 문서 전체를 프롬프트에 넣지 않는다.

기존 사실 217개를 11개 범주·6개 지식 층으로 재분류하고 공식 도시 안내의 장소 개요 4개를 추가했다. 현재 221개 사실 중 공통 기본 주입은 기존 35개 그대로이며, 상세 지식은 승인·인지·분야 깊이·공개·관련 화제를 통과한 항목에서 최대 3개만 고른다. 분류가 인지 권한을 부여하지 않는다.

| 지식 층 | 사실 수 | 사용하는 기준 |
| --- | ---: | --- |
| 공통 | 70 | 인물별 인지 예외·공개 조건. 이름 인지와 직접 친분 구분 |
| 지역 | 22 | 거주·활동 인지 근거. 현재 위치만으로 부여 금지 |
| 직업 | 23 | 역할·개별 사실·분야 상한. 전문 경험 자동 생성 금지 |
| 선택 관심 | 2 | 허용 후보에서 최대 2개. 확실성과 선택 ID 유지 |
| 개인 | 30 | 당사자별 개인 경험·공개 조건. 군중 추첨 제외 |
| 퀘스트 | 74 | 확인된 진행·분기·개별 인지. 군중 추첨 제외 |

기본/세부의 구분은 injection_mode를 따른다. 직업 층에도 주디의 작업·재키의 가족처럼 특정 인물의 경험이 포함되어 있다. 이 항목은 individual_profession_fact_scopes의 기존 소유자·인지 조건만 사용하고 군중 직업 지식으로 일반화하지 않는다. 아래 개인·퀘스트 항목은 개수만 안내하며 실제 내용과 공개 조건은 인물 카드·사실 원본에서 확인한다. 공통 상식의 숫자·기관·기술 개요를 현재 가격·안전·실시간 경로·성공 결과로 확대하지 않는다. 2020/RED 자료의 수치나 제도를 2077년 현재 규칙으로 가져오지 않는다.

## 인물

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| SAMURAI_JOHNNY | 조니 실버핸드는 SAMURAI의 프런트맨으로 알려진 반기업 로커보이다 | 공통·기본 | [CDPR_GAME](https://www.cyberpunk.net/en/cyberpunk-2077) |
| ROGUE_BACKGROUND | 로그 아멘디아레스는 애프터라이프를 운영하는 유명 픽서이며, 나이트 시티에서 전설적인 솔로 출신이자 픽서들의 여왕으로 알려져 있다. | 공통·기본 | [WIKI_ROGUE](https://cyberpunk.fandom.com/wiki/Rogue_Amendiares) |
| KERRY_BACKGROUND | 케리 유로다인은 SAMURAI 출신이며, 2077년에는 성공한 솔로 음악가로 널리 알려져 있다. | 공통·기본 | [WIKI_KERRY](https://cyberpunk.fandom.com/wiki/Kerry_Eurodyne) |
| PLAYER_V | 사이버펑크 2077의 플레이어 주인공 이름은 V다. | 공통·선별 | [CDPR_GAME](https://www.cyberpunk.net/us/en/cyberpunk-2077) |
| JUDY_BD_LAYERS | BD 분석에서는 재생·되감기·빨리 감기를 사용하고 시각·청각·열감지 레이어의 단서를 따로 살핀다 | 직업·선별 | [WIKI_INFORMATION](https://cyberpunk.fandom.com/wiki/The_Information) |
| JUDY_BD_CALIBRATION | 주디는 BD 체험 전 이용자의 감각 프로필을 보정하며 기록 분석을 안내한다 | 직업·선별 | [WIKI_INFORMATION](https://cyberpunk.fandom.com/wiki/The_Information) |
| JUDY_WORKSHOP | 주디는 목스와 함께 일하며 리즈 바 지하에 BD 작업 장비를 두었다 | 직업·선별 | [WIKI_JUDY](https://cyberpunk.fandom.com/wiki/Judy_%C3%81lvarez) |
| PANAM_CLAN_FRIENDS | 미치 앤더슨과 스콜피온은 팬앰이 가까이 지내 온 알데칼도 동료들이다 | 직업·선별 | [WIKI_PANAM](https://cyberpunk.fandom.com/wiki/Panam_Palmer) |
| PANAM_CARGO_EXPERIENCE | 팬앰은 미치와 도시 사이의 화물을 운반한 경험이 있다 | 직업·선별 | [WIKI_PANAM](https://cyberpunk.fandom.com/wiki/Panam_Palmer) |
| JACKIE_MAMA_BAR | 마마 웰스는 재키의 어머니이며 헤이우드의 엘 코요테 코호를 운영한다 | 직업·선별 | [WIKI_JACKIE](https://cyberpunk.fandom.com/wiki/Jackie_Welles) |
| VIKTOR_CLINIC_LOCATION | 빅터의 진료소는 왓슨 리틀 차이나에 있는 미스티의 에소테리카 뒤편 지하에 있다 | 직업·선별 | [WIKI_VIKTOR](https://cyberpunk.fandom.com/wiki/Viktor_Vektor) |
| VIKTOR_BOXING_TEAM | 빅터는 왓슨의 나이트 시티 데블스에서 헤비급 복서로 활동했으며 지금도 복싱에 관심이 있다 | 직업·선별 | [WIKI_VIKTOR](https://cyberpunk.fandom.com/wiki/Viktor_Vektor) |
| MISTY_TAROT_PRACTICE | 미스티는 타로 카드와 오라 읽기를 사용해 상담한다 | 직업·선별 | [WIKI_MISTY](https://cyberpunk.fandom.com/wiki/Misty_Olszewski) |
| MISTY_FOOL_SYMBOL | 타로의 광대는 세상에 호기심을 가진 순수함과 무모함을 함께 나타내는 상징으로 해석된다 | 직업·선별 | [WIKI_TAROT](https://cyberpunk.fandom.com/wiki/Tarot_Cards) |
| MISTY_FOOL_JOURNEY | 미스티는 광대의 여정이 세계에 이르는 과정으로 타로를 설명한다 | 직업·선별 | [WIKI_FOOL_HILL](https://cyberpunk.fandom.com/wiki/Fool_on_the_Hill) |
| ROGUE_AFTERLIFE_STAFF | 애프터라이프에서는 에머릭 브론슨이 출입을 관리하고 클레어 러셀이 바텐더로 일한다 | 직업·선별 | [WIKI_ROGUE](https://cyberpunk.fandom.com/wiki/Rogue_Amendiares) |
| ROGUE_EXPERT_NETWORK | 로그는 애프터라이프의 넷러너 닉스와 솔로 겸 경호원 크리스핀 웨이랜드 같은 전문가들과 일을 한다 | 직업·선별 | [WIKI_ROGUE](https://cyberpunk.fandom.com/wiki/Rogue_Amendiares) |
| KERRY_SAMURAI_MEMBERS | SAMURAI에는 케리와 조니 실버핸드 외에 낸시 하틀리, 데니, 헨리가 참여했다 | 직업·선별 | [WIKI_SAMURAI](https://cyberpunk.fandom.com/wiki/Samurai) |
| KERRY_RECORD_LABEL | 케리는 MSM 레코드와 계약한 솔로 음악가다 | 직업·선별 | [WIKI_MSM](https://cyberpunk.fandom.com/wiki/MSM_Records) |
| KERRY_SOLO_SONGS | 케리의 솔로 곡에는 Holdin’ On과 User Friendly가 있다 | 직업·선별 | [WIKI_KERRY](https://cyberpunk.fandom.com/wiki/Kerry_Eurodyne) |
| RIVER_HAN_PARTNER | 리버는 NCPD 형사로 일할 때 해럴드 한과 함께 수사했다 | 직업·선별 | [WIKI_RIVER](https://cyberpunk.fandom.com/wiki/River_Ward) |
| PUBLIC_SMASHER | 아담 스매셔는 아라사카에 고용된 전신 개조 용병으로 악명 높다. | 공통·기본 | [CDPR_GAME](https://www.cyberpunk.net/en/cyberpunk-2077) |
| PUBLIC_BARTMOSS | 레이치 바트모스는 데이터크래시와 연결된 전설적인 넷러너다. | 공통·선별 | [LORE_BARTMOSS](https://cyberpunk.fandom.com/wiki/Rache_Bartmoss) |

개인·퀘스트 전용 102개: [인물별 준비 자료](dialogue-content-preparation.md)와 해당 카드의 인지·관계 단계 참조.

## 기업

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| ARASAKA_SECURITY | 아라사카는 기업·개인 보안 서비스를 제공하는 거대 기업이다 | 공통·기본 | [WIKI_ARASAKA](https://cyberpunk.fandom.com/wiki/Arasaka) |
| MILITECH_ARMS | 밀리테크는 무기·군사 장비와 전투 서비스를 제공한다 | 공통·기본 | [WIKI_MILITECH](https://cyberpunk.fandom.com/wiki/Militech) |
| TT_SERVICE | 트라우마 팀은 무장 응급 의료 서비스를 제공한다 | 공통·선별 | [WIKI_TT](https://cyberpunk.fandom.com/wiki/Trauma_Team) |
| CORP_ARASAKA_BRANCHES | 아라사카는 보안뿐 아니라 금융과 무기 제조에도 사업을 펼친다. | 공통·선별 | [LORE_ARASAKA](https://cyberpunk.fandom.com/wiki/Arasaka) |
| CORP_MILITECH_NUSA | 밀리테크는 NUSA 정부에 병력·무기·군사 장비를 공급하며 민간 보안·전투 계약도 맡는다. | 공통·선별 | [LORE_MILITECH](https://cyberpunk.fandom.com/wiki/Militech) |
| CORP_KANG_TAO | 캉 타오는 스마트 무기와 관련 무기 시스템으로 알려진 기업이다. | 공통·기본 | [LORE_KANG_TAO](https://cyberpunk.fandom.com/wiki/Kang_Tao) |
| CORP_KANG_TAO_PRODUCTS | 캉 타오의 스마트 무기에는 A-22B 차오, G-58 디안, L-69 주오가 있다. | 공통·선별 | [LORE_KANG_TAO](https://cyberpunk.fandom.com/wiki/Kang_Tao) |
| CORP_KIROSHI | 키로시는 광학 임플란트 제품으로 알려져 있다. | 공통·기본 | [LORE_KIROSHI](https://cyberpunk.fandom.com/wiki/Kiroshi) |
| CORP_KIROSHI_OPTICS | 2077년 키로시 광학 제품에는 기본형과 클레어보이언트·콕커트리스·오라클 등의 제품이 있다. | 공통·선별 | [LORE_KIROSHI](https://cyberpunk.fandom.com/wiki/Kiroshi) |
| CORP_BIOTECHNICA | 바이오테크니카는 유전공학·생명공학과 식량·연료 관련 사업을 하는 기업이다. | 공통·기본 | [LORE_BIOTECHNICA](https://cyberpunk.fandom.com/wiki/Biotechnica) |
| CORP_NIGHT_CORP | 나이트 코프는 나이트 시티의 도로·철도·상하수도 같은 공공 기반시설 사업에 관여한다. | 공통·선별 | [LORE_NIGHT_CORP](https://cyberpunk.fandom.com/wiki/Night_Corp) |

## 직업

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| RIPPERDOC | 리퍼닥은 사이버웨어를 이식하는 의료 기술자다 | 공통·기본 | [WIKI_RIPPER](https://cyberpunk.fandom.com/wiki/Ripperdoc) |
| FIXER | 픽서는 의뢰인과 용병 사이에서 일거리를 중개한다 | 공통·기본 | [WIKI_FIXER](https://cyberpunk.fandom.com/wiki/Fixer) |
| NETRUNNER | 넷러너는 신경 인터페이스와 컴퓨터 기술을 사용하는 해커다 | 공통·기본 | [WIKI_RUNNER](https://cyberpunk.fandom.com/wiki/Netrunner) |
| JOB_ROCKERBOY | 로커보이는 음악·공연과 선동으로 권력에 맞서는 반항적 예술가다. | 공통·기본 | [LORE_ROCKER](https://cyberpunk.fandom.com/wiki/Rocker) |
| JOB_MERC_TEAM | 용병 팀은 픽서의 중개 아래 넷러너·테키·의료 담당·전투 담당이 역할을 나눌 수 있다. | 공통·선별 | [LORE_MERCS](https://cyberpunk.fandom.com/wiki/Mercenary) |
| JOB_SOLO | 솔로는 전투·경호 같은 위험한 일을 맡는 전문 용병을 가리킨다. | 공통·기본 | [LORE_MERCS](https://cyberpunk.fandom.com/wiki/Mercenary) |
| JOB_TECHIE | 테키는 장비·무기의 기술 작업을 맡으며 용병 팀의 기술 역할을 담당할 수 있다. | 공통·선별 | [LORE_MERCS](https://cyberpunk.fandom.com/wiki/Mercenary) |
| JOB_MEDTECH | 용병 팀의 의료 담당은 부상과 사이버웨어 문제에 대응한다. | 공통·선별 | [LORE_MERCS](https://cyberpunk.fandom.com/wiki/Mercenary) |

## 나이트 시티

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| NC_CITY | 나이트 시티는 권력·부·신체 개조가 두드러지는 대도시다 | 공통·기본 | [CDPR_GAME](https://www.cyberpunk.net/en/cyberpunk-2077) |
| NC_DISTRICTS | 나이트 시티의 주요 구역은 왓슨·웨스트브룩·시티 센터·헤이우드·산토 도밍고·퍼시피카다. | 공통·기본 | [CDPR_TRAVEL](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) |
| WATSON_AREAS | 왓슨에는 리틀 차이나·가부키·노스사이드·아라사카 워터프런트가 있다 | 지역·선별 | [WIKI_WATSON](https://cyberpunk.fandom.com/wiki/Watson_%282077%29) |
| KABUKI_MARKET | 가부키는 시장과 암시장 거래가 두드러지는 지역이다 | 지역·선별 | [WIKI_WATSON](https://cyberpunk.fandom.com/wiki/Watson_%282077%29) |
| HEYWOOD_HOME | 헤이우드는 다양한 주거 형태와 상점이 있는 주거 지역이다 | 지역·선별 | [WIKI_HEYWOOD](https://cyberpunk.fandom.com/wiki/Heywood_%282077%29) |
| JIGJIG | 지그지그 스트리트는 웨스트브룩의 재팬타운에 있다 | 지역·선별 | [CDPR_TRAVEL](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) |
| RANCHO_HOUSING | 란초 코로나도는 산토 도밍고의 주거 지역이다 | 지역·선별 | [WIKI_RANCHO](https://cyberpunk.fandom.com/wiki/Rancho_Coronado_%282077%29) |
| ARROYO_WORK | 아로요의 공장들은 란초 코로나도 주민들의 주요 일터다 | 지역·선별 | [WIKI_RANCHO](https://cyberpunk.fandom.com/wiki/Rancho_Coronado_%282077%29) |
| PACIFICA_ABANDONED | 퍼시피카는 개발 투자가 중단되어 방치된 지역이다 | 지역·선별 | [WIKI_PACIFICA](https://cyberpunk.fandom.com/wiki/Pacifica_%282077%29) |
| BADLANDS | 배드랜드에는 사막과 도시 외곽의 넓은 황무지가 있다 | 지역·선별 | [CDPR_TRAVEL](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) |
| ROCKY_RIDGE | 로키 리지는 배드랜드의 버려진 마을이다 | 지역·선별 | [CDPR_TRAVEL](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) |
| DOGTOWN | 도그타운은 퍼시피카에서 분리된 장벽 안의 지역이며 민병대가 지배한다 | 지역·선별 | [CDPR_TRAVEL](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) |
| DOGTOWN_MARKET | 도그타운 스타디움에는 암시장이 있다 | 지역·선별 | [CDPR_TRAVEL](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) |
| LIZZIES | 리즈 바는 목스의 거점이자 BD 클럽이다 | 지역·선별 | [WIKI_MOX](https://cyberpunk.fandom.com/wiki/The_Mox) |
| TIGER_JAPANTOWN | 타이거 클로는 재팬타운을 중심으로 활동한다 | 지역·선별 | [WIKI_TIGER](https://cyberpunk.fandom.com/wiki/Tyger_Claws) |
| MAELSTROM_WATSON | 멜스트롬은 왓슨의 산업 지역에서 활동하며 극단적인 신체 개조로 알려져 있다 | 지역·선별 | [WIKI_MAELSTROM](https://cyberpunk.fandom.com/wiki/Maelstrom) |
| VALENTINOS_HEYWOOD | 발렌티노는 헤이우드를 주요 활동 지역으로 삼는다 | 지역·선별 | [WIKI_VALENTINOS](https://cyberpunk.fandom.com/wiki/Valentinos) |
| SIXTH_SANTO | 식스 스트리트는 산토 도밍고에서 영향력이 있는 갱이다 | 지역·선별 | [WIKI_SIXTH](https://cyberpunk.fandom.com/wiki/6th_Street) |
| VOODOO_PACIFICA | 부두 보이즈는 퍼시피카와 연결된 넷러너 집단이다 | 지역·선별 | [WIKI_VOODOO](https://cyberpunk.fandom.com/wiki/Voodoo_Boys) |
| AFTERLIFE | 애프터라이프는 왓슨 리틀 차이나에 있는 클럽이다 | 지역·선별 | [WIKI_AFTERLIFE](https://cyberpunk.fandom.com/wiki/Afterlife) |
| CITY_MEGABUILDINGS | 메가빌딩은 많은 주민과 생활 시설을 모은 거대한 복합 주거 건물이다. | 공통·기본 | [LORE_MEGABUILDING](https://cyberpunk.fandom.com/wiki/Megabuilding) |
| CITY_H10 | 메가빌딩 H10은 2077년 왓슨 리틀 차이나에 있다. | 공통·선별 | [LORE_MEGABUILDING](https://cyberpunk.fandom.com/wiki/Megabuilding) |
| CITY_H8 | 메가빌딩 H8은 2077년 웨스트브룩 재팬타운에 있다. | 공통·선별 | [LORE_MEGABUILDING](https://cyberpunk.fandom.com/wiki/Megabuilding) |
| CHERRY_BLOSSOM_MARKET | 체리 블로섬 마켓은 재팬타운의 지그지그 스트리트 맞은편에 있으며, 벚꽃 홀로그램과 등불이 있는 시장이다. | 지역·선별 | [CDPR_TRAVEL](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) |
| RECONCILIATION_PARK | 리컨실리에이션 파크는 헤이우드에 있는 녹지 공원으로 호수와 나무다리가 있다. | 지역·선별 | [CDPR_TRAVEL](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) |
| BADLANDS_WIND_FARMS | 배드랜드에는 풍력 터빈들이 모여 있는 풍력 발전 지대가 있다. | 지역·선별 | [CDPR_TRAVEL](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) |
| DOGTOWN_LANDMARKS | 도그타운의 장소에는 유리 피라미드 형태의 헤비 하츠, 블랙 사파이어, 롱쇼어 스택스가 있다. | 지역·선별 | [CDPR_TRAVEL](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) |

## 역사

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| HISTORY_FOUNDING | 나이트 시티는 1994년 코로나다 시티로 건설되기 시작했고, 리처드 나이트가 죽은 뒤 1998년 이름을 바꿨다. | 공통·기본 | [LORE_MORRO](https://cyberpunk.fandom.com/wiki/Morro_Bay%2C_California) |
| HISTORY_BOMBING | 2023년 8월 20일 아라사카 타워에서 핵폭발이 일어나 도심이 파괴됐다. 책임 소재에 관한 공개 설명은 서로 다르다. | 공통·기본 | [LORE_BOMBING](https://cyberpunk.fandom.com/wiki/Night_City_Holocaust) |
| HISTORY_BOMBING_DISPUTE | 아라사카 본부 폭파에 관한 공개 기록은 책임자·피해 규모를 둘러싼 소문과 기업 홍보를 확정된 사실과 구별한다. | 공통·선별 | [LORE_BOMBING](https://cyberpunk.fandom.com/wiki/Night_City_Holocaust) |
| HISTORY_RED | 붉은 시대는 제4차 기업 전쟁 뒤 대기 오염과 붉은 하늘, 파괴된 공급망을 겪던 역사적 시기다. | 공통·선별 | [LORE_RED](https://cyberpunk.fandom.com/wiki/Time_of_the_Red) |
| HISTORY_RED_DATES | 붉은 시대는 2023년부터 2040년대 후반에 걸친 과거 시기이며 2077년 현재 제도와 같다고 볼 수 없다. | 공통·선별 | [LORE_RED](https://cyberpunk.fandom.com/wiki/Time_of_the_Red) |
| HISTORY_UNIFICATION | 통일 전쟁은 2069~2070년 NUSA와 자유주 사이의 전쟁이며 밀리테크·아라사카가 각각 관여했다. | 공통·기본 | [LORE_UNIFICATION](https://cyberpunk.fandom.com/wiki/Unification_War) |
| HISTORY_NC_AUTONOMY | 통일 전쟁 이후 나이트 시티는 자치 도시로 남았으며 아라사카는 북미로 돌아와 본부를 세웠다. | 공통·선별 | [LORE_UNIFICATION](https://cyberpunk.fandom.com/wiki/Unification_War) |
| HISTORY_DATAKRASH | 데이터크래시는 바트모스와 R.A.B.I.D.S.에 연결된 대규모 넷 붕괴 사건이다. | 공통·선별 | [LORE_BARTMOSS](https://cyberpunk.fandom.com/wiki/Rache_Bartmoss) |

## 사회·문화

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| CULTURE_KITSCH | 키치는 강한 색·네온·화려한 개조로 외형을 과시하는 거리의 미학이다. | 공통·기본 | [LORE_KITSCH](https://cyberpunk.fandom.com/wiki/Kitsch) |
| CULTURE_ENTROPISM | 엔트로피즘은 빈곤과 자원 부족 속에서 외형보다 실용을 우선하는 미학이다. | 공통·선별 | [LORE_ENTROPISM](https://cyberpunk.fandom.com/wiki/Entropism) |
| CULTURE_NEOMILITARISM | 네오밀리터리즘은 기업·군사적 권위와 차갑고 정제된 고급 실용성을 드러낸다. | 공통·선별 | [LORE_NEOMILITARISM](https://cyberpunk.fandom.com/wiki/Neomilitarism) |
| CULTURE_NEOKITSCH | 네오키치는 극소수 부유층이 희귀한 천연 소재와 사치스러운 외형으로 부를 과시하는 미학이다. | 공통·선별 | [LORE_NEOKITSCH](https://cyberpunk.fandom.com/wiki/Neokitsch) |
| CULTURE_KITSCH_DIFFERENCE | 키치의 값싸고 접근하기 쉬운 화려함과 달리 네오키치는 진짜 목재·대리석·천연 직물 같은 희귀한 재료를 사용한다. | 공통·선별 | [LORE_NEOKITSCH](https://cyberpunk.fandom.com/wiki/Neokitsch) |
| FOOD_SYNTHETIC | 합성 식품은 일상적인 먹거리이며 진짜 신선한 식재료는 주로 고급 식당에서 접한다. | 공통·기본 | [LORE_FOOD](https://cyberpunk.fandom.com/wiki/Food) |
| FOOD_SCOP | 2077년 SCOP는 합성육과 관련 제품을 가리키며 저렴한 종류에는 단백질 농장에서 기른 벌레·곤충이 쓰인다. | 공통·선별 | [LORE_FOOD](https://cyberpunk.fandom.com/wiki/Food) |
| FOOD_SCOP_PROCESS | SCOP는 맛과 질감을 조절해 유기농 식품처럼 만들 수 있고 2077년에는 값싼 식품 선택지로 널리 쓰인다. | 공통·선별 | [LORE_FOOD](https://cyberpunk.fandom.com/wiki/Food) |
| CULTURE_AFTERLIFE_DRINKS | 애프터라이프에는 이름을 남긴 죽은 용병을 칵테일 이름으로 기리는 전통이 있다. | 공통·선별 | [LORE_AFTERLIFE](https://cyberpunk.fandom.com/wiki/Afterlife_%28Central_Night_City%29) |

## 기술·사이버웨어

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| CYBERWARE | 사이버웨어는 신체 기능을 강화하는 임플란트다 | 공통·기본 | [CDPR_GAME](https://www.cyberpunk.net/en/cyberpunk-2077) |
| BD_EXPERIENCE | 브레인댄스는 기록한 사람의 감각·경험을 재체험하는 기술이다 | 공통·기본 | [WIKI_BD](https://cyberpunk.fandom.com/wiki/Braindance) |
| BD_EDITING | BD 편집은 감각 정보를 조절하고 원본을 분석하는 작업을 포함한다 | 직업·선별 | [WIKI_BD](https://cyberpunk.fandom.com/wiki/Braindance) |
| BD_RISK | 안전하게 기록·편집되지 않은 BD는 이용자에게 위험할 수 있다 | 직업·선별 | [WIKI_BD](https://cyberpunk.fandom.com/wiki/Braindance) |
| NET_CORP_DEFENSE | 기업은 데이터 보안을 위해 넷러너를 고용한다 | 직업·선별 | [WIKI_RUNNER](https://cyberpunk.fandom.com/wiki/Netrunner) |
| NET_BLACKWALL | 2077년의 넷에는 블랙월로 격리된 위험한 영역이 있다 | 직업·선별 | [WIKI_RUNNER](https://cyberpunk.fandom.com/wiki/Netrunner) |
| EVELYN_BD_RECORDING | 에블린은 자신의 시점에서 BD를 기록한 경험이 있으며 그 기록을 의뢰 준비에 사용했다 | 직업·선별 | [WIKI_INFORMATION](https://cyberpunk.fandom.com/wiki/The_Information) |
| EVELYN_JUDY_BD_COLLAB | 에블린이 제공한 BD의 보정·편집과 분석 안내는 주디가 맡았다 | 직업·선별 | [WIKI_INFORMATION](https://cyberpunk.fandom.com/wiki/The_Information) |
| BLACKWALL_PUBLIC | 블랙월은 안전하게 쓰는 넷과 위험한 AI가 돌아다니는 옛 넷을 격리하는 장벽으로 알려져 있다. | 공통·기본 | [LORE_BLACKWALL](https://cyberpunk.fandom.com/wiki/Blackwall) |
| TECH_SMART_WEAPONS | 스마트 무기는 유도 탄환을 사용하며 스마트 조준에는 호환되는 스마트 링크가 필요하다. | 공통·선별 | [LORE_DIAN](https://cyberpunk.fandom.com/wiki/Kang_Tao_G-58_Dian) |
| TECH_TECH_WEAPONS | 테크 무기는 전자기 가속을 사용해 탄환을 발사하는 무기 유형이다. | 공통·선별 | [LORE_WEAPONS](https://cyberpunk.fandom.com/wiki/Cyberpunk_2077_Weapons) |
| BD_PLAYBACK | BD 재생에는 전용 플레이어나 신경 인터페이스·헤드셋 같은 연결 장치가 사용된다. | 공통·선별 | [LORE_BD](https://cyberpunk.fandom.com/wiki/Braindance) |
| BD_RECORDING_SENSORY | BD는 기록자의 경험을 담으며 단순한 영상 파일과 같은 방식으로 체험하지 않는다. | 공통·선별 | [LORE_BD](https://cyberpunk.fandom.com/wiki/Braindance) |

개인·퀘스트 전용 2개: [인물별 준비 자료](dialogue-content-preparation.md)와 해당 카드의 인지·관계 단계 참조.

## 갱·노마드

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| MOX | 목스는 성노동자 등 소외된 사람들의 보호를 표방하는 집단이다 | 공통·기본 | [WIKI_MOX](https://cyberpunk.fandom.com/wiki/The_Mox) |
| ANIMALS_WORK | 애니멀은 육체적 힘을 중시하며 경호·문지기 일을 맡기도 한다 | 선택 관심·선별 | [WIKI_ANIMALS](https://cyberpunk.fandom.com/wiki/Animals) |
| SCAVS | 스캐빈저는 사람을 납치하고 사이버웨어를 강탈하는 집단들로 알려져 있다 | 선택 관심·선별 | [WIKI_SCAVS](https://cyberpunk.fandom.com/wiki/Scavengers) |
| ALDECALDOS | 알데칼도는 가족·공동체를 이루는 노마드 집단이다 | 공통·기본 | [CDPR_GAME](https://www.cyberpunk.net/en/cyberpunk-2077) |

## 치안·법집행

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| NCPD | NCPD는 나이트 시티의 경찰 조직이다 | 공통·기본 | [WIKI_POLICE](https://cyberpunk.fandom.com/wiki/Night_City_Police_Department) |
| MAXTAC | 맥스택은 사이버사이코 등 고위험 상황에 대응하는 NCPD 특수 조직이다 | 공통·기본 | [WIKI_MAXTAC](https://cyberpunk.fandom.com/wiki/MaxTac) |
| TT_AV_DISPATCH | 트라우마 팀은 고객의 건강 악화 신호와 위치를 받아 무장 AV 구조팀을 출동시킨다. | 공통·선별 | [LORE_TT](https://cyberpunk.fandom.com/wiki/Trauma_Team) |
| NETWATCH_PUBLIC | 넷워치는 블랙월과 넷의 안전을 지키며 위험한 AI의 침입과 장벽 훼손에 대응한다. | 공통·기본 | [LORE_BLACKWALL](https://cyberpunk.fandom.com/wiki/Blackwall) |

## 경제·생활

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| EDDIES | 유로달러는 나이트 시티의 통화이며 에디라고도 부른다 | 공통·기본 | [WIKI_MONEY](https://cyberpunk.fandom.com/wiki/Eurodollar) |
| TT_COVERAGE | 트라우마 팀의 서비스 범위는 가입한 보장 상품에 따라 다르다 | 공통·기본 | [WIKI_TT](https://cyberpunk.fandom.com/wiki/Trauma_Team) |
| TT_PLANS | 트라우마 팀의 실버·골드·플래티넘 상품은 비용과 보장 내용이 다르다. | 공통·선별 | [LORE_TT](https://cyberpunk.fandom.com/wiki/Trauma_Team) |
| TT_PLATINUM_DETAIL | 플래티넘 상품에는 상시 모니터링·응급 이송·수술·재활과 빠른 대응이 포함되며 저렴한 상품은 혜택이 적다. | 공통·선별 | [LORE_TT](https://cyberpunk.fandom.com/wiki/Trauma_Team) |
| ENERGY_CHOOH2 | CHOOH2는 바이오테크니카가 개발한 합성 알코올 기반 연료다. | 공통·기본 | [LORE_CHOOH2](https://cyberpunk.fandom.com/wiki/CHOOH2) |
| ENERGY_CHOOH2_LICENSE | 바이오테크니카의 CHOOH2 기술은 유전적으로 바꾼 작물을 이용하며 다른 생산 기업들이 라이선스를 받아 제조한다. | 공통·선별 | [LORE_CHOOH2](https://cyberpunk.fandom.com/wiki/CHOOH2) |

## 교통

| 사실 ID | 최소 진술 | 층·주입 | 출처 |
| --- | --- | --- | --- |
| TRANSIT_DELAMAIN | 델라메인은 AI가 운영하는 택시 서비스이며 방탄·강화 차량으로 알려져 있다. | 공통·기본 | [LORE_DELAMAIN](https://cyberpunk.fandom.com/wiki/Delamain_Corporation) |
| DELAMAIN_VEHICLES | 델라메인 택시는 빌포르 코르테스를 바탕으로 하며 밀리테크와 협력해 방탄 유리와 차체를 강화했다. | 공통·선별 | [LORE_DELAMAIN](https://cyberpunk.fandom.com/wiki/Delamain_Corporation) |
| TRANSIT_NCART | NCART는 나이트 코프 소유의 나이트 시티 대중교통망이다. | 공통·기본 | [LORE_NCART](https://cyberpunk.fandom.com/wiki/Night_City_Area_Rapid_Transit) |
| NCART_DETAIL | NCART에는 도시 구역을 잇는 철도·트램 교통이 있으며 도시의 확장과 함께 노선 확장이 논의된다. | 공통·선별 | [LORE_NCART](https://cyberpunk.fandom.com/wiki/Night_City_Area_Rapid_Transit) |

## 출처와 현재 검수 수준

이번에 본문을 확인한 자료는 [CDPR 인물 소개](https://www.cyberpunk.net/en/cyberpunk-2077), [팬텀 리버티 인물 소개](https://www.cyberpunk.net/en/phantom-liberty), [2024-03-29 도시 장소 안내](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography)다. 재확인 범위는 색인의 source_audit 및 sources.json의 last_recheck_scope에 기록했다. 인물 소개는 성향 해석의 자료이며 Big Five 점수나 한국어 대사의 공식 설정이 아니다.

기존 나머지 source_checked 자료의 출처·시대·접근 기록을 보존했다. 과거 위키 검색 발췌와 안내 PDF 열람을 이번 본문 재검증으로 표시하지 않았다. Ultimate Edition 안내서와 빅터·미스티·타케무라·케리 코스플레이 PDF는 이번 웹 접근에서 크기 제한으로 실패했다. 충돌하는 케리의 악기와 미확인 현지화 지명은 검수 대상이다.

새 지역 지식 후보 6개는 네 사실을 주디·에블린·재키·리버·팬앰·소미에게 나눠 참조한다. 지역 노출에 따른 작성 후보이며 grants 확인 전 실제 인지로 사용하지 않는다. 새 사실의 source_checked와 카드·예시·배분의 draft를 구분한다.
