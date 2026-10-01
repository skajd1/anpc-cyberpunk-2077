# ANPC 콘텐츠 자료

`cyberpunk2077/`은 대표 인물 10명과 기본 세계관의 출처 기반 초기 자료 묶음이다. UTF-8 JSON으로 저장한다. 파일·집계·활성 상태는 [목록](cyberpunk2077/manifest.json)이 기준이다.

- [세계관 사실](cyberpunk2077/world-facts.json): 출처를 확인한 최소 진술·시대·주장 한도.
- [인물별 지식](cyberpunk2077/knowledge.json): 사실 참조·인지·공개 조건과 작성 해석.
- `cyberpunk2077/characters/`: 인물 10명의 정체성·판단 규칙·말투 방향·단계·지식 참조.
- [대사 예시](cyberpunk2077/dialogue-examples.json): 원작 인용이 아닌 작성 초안 20개.
- [군중 지식 배분](cyberpunk2077/crowd-knowledge-policy.json): 공통·지역·직업·선택 지식 묶음.
- [출처 목록](cyberpunk2077/sources.json): 공식/2차 자료, 접근 방식·확인일.

`source_checked`는 원작 출처의 진술을 확인한 상태이고 `approved`는 출시용 검수 상태다. 현재 카드는 `draft`, `runtime_enabled=false`다. 판단·욕구·두려움·문체·예시는 작성 해석을 포함하며 원작 문장으로 취급하지 않는다. 일부 팬 위키는 본문 접근이 제한되어 검색 도구가 제공한 설명·Database Entry 발췌만 확인했다. 공식 안내 PDF는 웹 도구 크기 제한 이후 별도로 텍스트를 추출해 읽었다. PDF 원문과 전체 추출 텍스트는 저장소에 넣지 않는다.

기존 `prototype/personas.json`과 형식이 다르다. 대표 10명은 [개발용 인물 설정·테스트 화면](../docs/dialogue-prototype.md#인물-설정과-대화-테스트)의 정규화기를 통해 명시적인 초안 사용 상태에서만 시험한다. 게임 어댑터는 연결하지 않았다. 출시용 사용은 원작 장면·한국어 문체·게임 상태 매핑 검수 후 승인한다. [정체성·콘텐츠 규격](../docs/content-specification.md), [지식 부여 규격](../docs/npc-knowledge-specification.md), [인물 조사 안내](../docs/community-npc-catalog.md)를 따른다.
