# ANPC 콘텐츠 자료

`cyberpunk2077/`은 대표 인물 12명·세계관·군중 생성 자료를 UTF-8 JSON으로 관리한다. 현재 버전/집계/승인 상태의 기준은 [manifest](cyberpunk2077/manifest.json)다. research-1.4 기준 사실 221개·인지 항목 887개·작성 예시 52개·지식 묶음 17개·관계 단계 63개·군중 원형 9개다.

## 기준 자료

| 자료 | 역할 |
| --- | --- |
| [sources.json](cyberpunk2077/sources.json) | 공식/2차 출처·확인일·접근 방식·열람 한계 |
| [world-facts.json](cyberpunk2077/world-facts.json) | 최소 사실 진술·근거·시대·인지/사용 범위 |
| [knowledge.json](cyberpunk2077/knowledge.json) | 인물별 사실 참조·분야 깊이·인지/공개 조건 |
| [dialogue-examples.json](cyberpunk2077/dialogue-examples.json) | 오리지널 대사 인용과 구분한 작성 예시 |
| [world-knowledge-policy.json](cyberpunk2077/world-knowledge-policy.json) | 공통 지식 11개 범주·기본/상세 주입 한도 |
| [dialogue-preparation.json](cyberpunk2077/dialogue-preparation.json) | 세계관 분류·인물별 우선 지식·근거/검수 색인 |
| [crowd-archetypes.json](cyberpunk2077/crowd-archetypes.json) | 원형별 Big Five 생성·원칙·말투 후보·배경/지식 경계 |
| [crowd-knowledge-policy.json](cyberpunk2077/crowd-knowledge-policy.json) | 군중의 공통·지역·직업·선택 지식 묶음 |
| [story-progression-policy.json](cyberpunk2077/story-progression-policy.json) | 진행 의미 후보 82개·지원/관계 조건·모의 진행 프리셋 |
| [game-state-bindings.json](cyberpunk2077/game-state-bindings.json) | 게임 2.31 파일에서 찾은 일지 82개 경로·fact 후보 36개·인물별 인지/관계 조사 범위와 근거. 런타임 미활성 |

`characters/`의 카드가 인물별 고정 성격·원칙·말투·관계 단계·지식 참조의 기준이다. [송버드 카드](cyberpunk2077/characters/songbird.json)의 분기/호칭과 `SONGBIRD_*`/`K_SONGBIRD_*`/`EX_SONGBIRD_*`의 사실·인지·예시도 해당 JSON에서 조회한다. 중복 인물 설명·세계관 지도·성향 준비 문서는 별도로 유지하지 않는다.

## 승인과 실행 경계

`source_checked`는 출처 진술의 확인이며 출시 승인인 `approved`와 다르다. 현재 조사/작성 자료의 draft/runtime_enabled=false를 유지한다. Big Five 수치·판단·말투·태도·예시는 작성 해석이며 공식 심리검사값·오리지널 대사로 표시하지 않는다. PDF 전체 원문이나 추출 텍스트를 이 저장소에 복제하지 않는다. 개별 접근 제한·검색 발췌·본문 확인 여부는 sources와 source_audit에 보존한다.

게임/웹의 명시적인 개발 초안 허용 경로에서만 시험한다. 실제 게임 인물 식별·진행/인지·한국어 문체 검수와 출시 승인은 별도다. 자료 12명 보유는 게임 진입 12명 지원을 뜻하지 않는다. 현재 구현·검증·공백은 [명세 대조 리뷰](../docs/game-mod-spec-review-2026-10-05.md), 실제 배포 파일 변경은 [배포 변경 이력](../docs/game-mod-validation.md)에서 구분한다.

정책은 [콘텐츠 규격](../docs/content-specification.md), [Big Five 규격](../docs/personality-specification.md), [지식 규격](../docs/npc-knowledge-specification.md), [프롬프트 규격](../docs/prompt-specification.md)을 따른다. 코드 매핑 전의 진행/접촉 근거는 [진행도 분석](../docs/story-progression-analysis.md)에 남긴다. 원형 생성·대화 기억·성인 유머가 인지/관계/행동 권한을 추가하지 않는다.

참조·조건·집계·seed 검사는 `node scripts/validate-content.mjs`, 진행 후보 검사는 `npm run check:story`로 수행한다. 원본 JSON·출처·기준 스펙을 보존하며 문서 정리를 콘텐츠 승인이나 게임 검증으로 처리하지 않는다.
