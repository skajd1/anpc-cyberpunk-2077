# NPC 음성 출력 규격

규격 버전: 1.1 (2026-10-08). 첫 게임판 기본 기능의 목표 계약. 게임 기능: [UF-67~UF-73](gameplay-functional-specification.md#10-npc-음성). 설치물: [DIST-23~DIST-24](mod-distribution-specification.md#1-배포-범위와-소유권). 실측·남은 확인 항목: [개발·검증 계획 6.4·8.1·8.2](development-validation.md#81-npc-음성-tts-로컬-실측-2026-10-06).

공통 스키마 전환 상태: `contracts/v1`의 DialogueReply는 자막 전용(DialogueReplyText)과 음성(DialogueReplyVoice) 두 형태 중 하나다. 웹 시제품의 응답 스키마·검사·출력 안내는 음성 옵션을 지원하지만 기본값은 꺼짐이다. 게임 CET 응답 검사와 TTS 연결은 아직 음성 형태를 받지 않는다.

## 1. 범위와 역할 분담

AI 대화 세션에서 수용된 NPC 대사를 한국어 자막과 일본어 음성으로 출력한다. 자막 계약은 [실행 규격 7절](runtime-specification.md#7-대사-자막과-게임-진행)을 따르며 음성은 같은 subtitle_id에 연결한다.

| 담당 | 결정 범위 |
| --- | --- |
| 대사 생성(LLM) | 대사 내용·말투·습관·비속어, emotion, delivery, 일본어 speech_text |
| 음성 합성(TTS) | 참조 음성에 따른 화자별 음색·억양·발성. 대사 내용·감정 값을 바꾸지 않음 |

- 엔진 구성은 ANPC 음성 모델 하나를 Genie-TTS(ONNX)로 사용자 PC의 CPU에서 실행하는 것이다(engine_profile=`genie_v2proplus_cpu`). ANPC 음성 모델은 GPT-SoVITS v2ProPlus를 주요 인물 음성으로 함께 파인튜닝한 다화자 모델이다(3.1절). 합성은 스트리밍·버퍼링 재생으로 한다(4.2절). 모든 NPC가 같은 모델을 쓰고 화자는 참조 음성으로만 구분한다.
- V의 음성은 생성하지 않는다. V의 대사는 참조·학습 자료로 쓰지 않는다.
- 오리지널 대사·장면 음성을 대체하거나 끊지 않는다. 음성 출력은 ANPC 대화 세션 안에서만 한다.
- 배포판에서 쓰지 않는 것: 인물마다 따로 둔 모델, 원격·제작자 운영 TTS 서버, 상용 TTS 제공자, 한국어 음성.
- 음성 실패는 대화 실패가 아니다. 어떤 음성 오류도 자막·기억·행동 처리를 막거나 되돌리지 않는다.

## 2. 응답 계약 추가

DialogueReply의 구조화 출력 필드 순서는 `emotion → delivery → dialogue → follow_up → speech_text → intent → action`이다. 음성 합성은 speech_text 완성 뒤 시작할 수 있고, 재생은 전체 응답이 수용된 뒤에만 한다.

| 필드 | 형식 | 규칙 |
| --- | --- | --- |
| emotion | 열거값 | neutral·friendly·wary·annoyed·afraid·sad·curious. 응답 하나에 값 하나이며 참조 음성 선택 키로 쓴다 |
| delivery | `normal`·`fast`·`slow` | 말하는 빠르기. 속삭임·외침 같은 발성 지시는 값으로 두지 않는다 |
| speech_text | 문자열 1~600자 | dialogue와 follow_up을 같은 순서·같은 의미로 옮긴 일본어 구어 대사 |

speech_text 작성 규칙:

- 의미 보존·구어 변환·인칭/호칭과 읽기 선별은 [프롬프트 규격](prompt-specification.md)의 일본어 생성 규칙을 따른다.
- 실제로 읽을 말만 쓴다. 지문·괄호 설명·마크다운·이모지·속도 지시·한글을 넣지 않는다.
- 고유명사는 [콘텐츠 규격](content-specification.md#2-커뮤니티-캐릭터-카드)의 ja_reading_table에서 승인되고 현재 요청에 선택된 reading(가나)으로 쓴다. 읽기가 여러 개인 한자는 가나로 쓴다. V는 일본어판 공식 표기 「V（ヴィー）」에 따라 「ヴィー」로 쓴다.

응답 검사:

| 조건 | 처리 |
| --- | --- |
| 필드 누락·추가 또는 대사/의도/감정/행동의 형식·열거값 위반 | 기존 [응답 계약](runtime-specification.md#5-요청응답-계약)대로 응답 전체 거부 |
| 음성 전용 delivery 값 오류 또는 speech_text 형식/길이 오류·한글·금지 문자 포함, 문장 구분 불가 | 자막·행동은 수용하고 해당 대사의 음성만 생략(`speech_text_invalid`) |
| 음성 비활성 | 출력 스키마에서 delivery·speech_text를 제외한 변형을 사용. 같은 베이스 지침의 출력 필드 안내만 다르다 |

생성 규칙의 프롬프트 반영은 [프롬프트 명세 6절](prompt-specification.md#6-턴별-생성-절차)을 따른다.

## 3. 참조 음성 자료

화자 단위는 voice_profile이다. 커뮤니티 인물은 NPC 키마다 하나, 군중은 목소리 묶음의 항목마다 하나다. 인물 카드·군중 원형에는 voice_profile_id만 연결한다.

| 필드 | 규칙 |
| --- | --- |
| voice_profile_id | 콘텐츠 안에서 고유한 ID |
| speaker_kind | `community` 또는 `crowd` |
| npc_key | community 필수. [NPC 식별 규격](npc-identity-specification.md)의 키 |
| crowd_tags | crowd 필수. gender, age_band, voice_type |
| language | `ja` 고정 |
| refs | 참조 목록. 각 항목: ref_id, emotion, string_id, duration_ms, review_status |
| content_version | 콘텐츠 버전과 같다 |

- emotion별 참조는 0~3개다. `neutral` 참조는 1개 이상 필수다. 실행에는 review_status가 승인인 참조만 쓴다.
- 참조 조건은 다음과 같다. 일본어 더빙 원작 대사, 해당 화자 단독 발화, 3~10초, 효과음·배경음악·무전/통신 필터 없음.
- 참조 대본은 같은 string_id의 일본어 게임 자막 원문을 쓴다. 대본을 작성하거나 받아쓰지 않는다.
- 배포물에는 voice_profile과 string_id 메타데이터만 넣는다. 참조 오디오는 설치된 게임 파일에서 사용자 PC가 추출한다. 추출물과 처리 결과는 [DIST-24](mod-distribution-specification.md#1-배포-범위와-소유권)의 음성 캐시에만 둔다.

### 3.1. 음성 모델과 학습 자료

| 항목 | 규칙 |
| --- | --- |
| 기반 | GPT-SoVITS v2ProPlus 공개 사전학습 가중치 |
| 학습 화자 | 학습 목록에 승인된 커뮤니티 인물. 첫 모델은 주요 인물부터 시작하고, 인물을 더할 때 전체를 다시 학습한다. 군중·V는 학습하지 않는다 |
| 학습 자료 | 해당 인물의 일본어 더빙 원작 대사. 단독 발화·효과음/배경음악/무전 필터 없음. 대본은 같은 string_id의 일본어 자막 원문 |
| 화자 균형 | 화자별 학습 분량에 상한을 두어 대사가 많은 인물로 음색이 쏠리지 않게 한다. 상한 값은 학습 목록에 기록한다 |
| 배포 형식 | 파인튜닝 가중치를 Genie ONNX로 변환한 파일. GPT(T2S) 디코더 두 개는 상수 접기 후 가중치 int8 동적 양자화(MatMul·Gemm, 채널별), 나머지는 fp32. VITS는 양자화하지 않는다. 학습용 오디오·대본·체크포인트는 배포하지 않는다 |
| 학습 목록 | voice_model_version, 기반 버전, 화자별 voice_profile_id·string_id 목록·분량, 화자별 상한. 모델과 함께 배포하는 메타데이터 |

- 모델 업데이트는 voice_model_version과 engine_profile 버전을 함께 올린다. engine_profile 버전은 런타임·모델·후처리 값을 함께 식별한다.
- 학습한 인물과 학습하지 않은 인물·군중 모두 3절의 참조 음성으로 화자를 지정한다. 학습 여부로 참조 선택 순서를 바꾸지 않는다.
- 학습 절차·시간·품질 비교 기준은 [파인튜닝 작업 절차](voice-model-finetuning-guide.md)에 둔다.

## 4. 참조 선택과 합성

### 4.1. 참조 선택

| 화자 | 선택 순서 | 모두 실패 |
| --- | --- | --- |
| 커뮤니티 | (해당 profile, emotion) → (해당 profile, neutral) | 음성 생략, 자막만. 다른 인물·군중 목소리로 대체하지 않음 |
| 군중 | (배정 profile, emotion) → (배정 profile, neutral) | 음성 생략, 자막만 |

- 군중 profile 배정은 군중 정체성 생성 시 함께 한다. crowd_tags가 생성 특성·관찰 정보와 일치하는 후보 중에서 생성 seed로 추첨한다. 일치 후보가 없으면 gender만 일치하는 후보에서 추첨한다. 그래도 없으면 배정하지 않는다. 배정 결과는 [콘텐츠 규격 3.2](content-specification.md#32-조합과-생성-계약)의 생성 저장 항목으로 보존한다. 유효 인스턴스와 재접촉 동안 바꾸지 않는다.
- 같은 (profile, emotion)에 참조가 여러 개면 대화 세션에서 처음 고른 참조를 세션 끝까지 유지한다. 새 세션에서는 다시 고를 수 있다.
- 참조는 응답 단위로 정한다. 한 응답 안에서 문장마다 참조를 바꾸지 않는다.

### 4.2. 합성과 재생 순서

1. speech_text를 합성 단위로 나눈다. 일본어 문장 끝 기호(。！？…)와 줄바꿈에서만 자르고, 앞 문장부터 이어 붙여 단위당 unit_max_chars 이하로 만든다. 한 문장이 상한을 넘으면 그 문장 하나를 단위로 쓴다. 빈 문장은 버린다.
2. 단위 순서대로 합성한다. 동시 합성은 1개다. 단위 안에서는 스트리밍 합성한다. GPT 토큰이 chunk_tokens개 쌓일 때마다 앞 context_tokens개를 겹쳐 VITS로 변환해 조각을 만들고, 마지막 hold_tokens개는 다음 조각까지 보류한다. 조각 경계는 crossfade_ms로 잇는다.
3. 엔진 프로필의 후처리를 적용한다. 고정 EQ, 고정 이득, 피크 -1dBFS 제한, 대사 앞 0.15초·뒤 0.25초 무음이다.
4. 버퍼링 후 재생을 시작한다. 확보된 음성 길이가 (예측 RTF − 1) × 남은 예상 음성 길이 이상이면 시작한다. 예측 RTF는 현재 대사에서 잰 최근 조각의 생성 시간 ÷ 조각 길이이고, 첫 조각 전에는 rtf_prior다. 남은 예상 음성 길이는 아직 조각이 되지 않은 speech_text 글자 수 × sec_per_char다. 예측 RTF가 1 이하이면 첫 조각이 준비되는 즉시 시작한다. 재생은 전체 응답 수용 뒤에만 한다(2절).
5. 시작 뒤에는 조각을 순서대로 이어 재생한다. 다음 조각이 늦으면 준비될 때까지 기다린다. 합성 단위 사이 쉼은 delivery 값을 따른다.

| delivery | speed_factor | 합성 단위 사이 쉼 |
| --- | --- | --- |
| normal | 1.0 | 0.30초 |
| fast | 1.15 | 0.20초 |
| slow | 0.9 | 0.45초 |

| 스트리밍·버퍼링 값 | 기본값 |
| --- | --- |
| unit_max_chars | 80 |
| chunk_tokens | 25 (음성 약 1초) |
| context_tokens | 10 |
| hold_tokens | 3 |
| crossfade_ms | 10 |
| rtf_prior | 1.4 |
| sec_per_char | 0.16 |

수치는 engine_profile의 기본값이다. 실측에 따라 엔진 프로필 버전을 올려 조정하며 사용자 설정으로 노출하지 않는다.

### 4.3. 자막 동기

- 자막은 첫 음성 재생 시작과 함께 표시한다.
- 응답 수용 후 subtitle_wait_ms가 지나도 4.2의 시작 조건을 채우지 못하면, 준비된 조각이 있을 때는 그 시점에 재생과 자막을 시작한다(이후 조각 대기 허용). 준비된 조각이 없으면 자막을 먼저 표시하고 그 대사의 음성은 버린다. 자막 표시 뒤 늦게 도착한 음성을 재생하지 않는다.
- 재생 중 자막을 유지한다. 자막 수명은 실행 규격을 따른다.

### 4.4. 로드·예열·캐시

| 대상 | 시점·규칙 |
| --- | --- |
| 엔진·기본 모델 | 음성이 활성화된 게임 세션 시작 시 비동기 로드. 「ヴィー」가 들어간 고정 문장으로 1회 예열. 로드 완료 전 대사는 자막만 |
| 참조 처리 결과 | (voice_profile_id, ref_id, engine_profile 버전) 키로 로컬 캐시. 대화 진입(entry_pending) 시 대상 profile의 캐시를 준비 |
| 합성 결과 | 선택 캐시. (engine_profile 버전, ref_id, delivery, 합성 단위 해시) 키. utterance_cache_mb 상한 초과 시 최근 미사용부터 제거 |

engine_profile 버전 또는 content_version이 바뀌면 해당 캐시를 무효화한다. 캐시는 게임 세이브에 넣지 않는다.

## 5. 재생 수명과 중단

| 상황 | 동작 |
| --- | --- |
| 응답 폐기·요청 취소·stale 응답 | 해당 합성 작업 취소, 결과 폐기. 재생하지 않음 |
| 재생 중 다음 플레이어 입력 제출 | 현재 재생·대기 중 합성 중단, 큐 비움 |
| 대화 종료·거리 이탈·대상 변경·전투·사망·소멸 | 즉시 중단, 큐 비움 |
| 로드·빠른 이동·세계 전환 | 즉시 중단, 큐 비움. 이전 world_epoch의 결과 폐기 |
| UF-62 메뉴 열림 | 재생 일시정지·합성 계속. 메뉴를 닫은 뒤 재검사를 통과하면 이어서 재생, 실패하면 폐기 |
| 오리지널 대화·퀘스트 제어 시작 | 즉시 중단. 오리지널 음성과 겹쳐 재생하지 않음 |

- 동시에 재생하는 ANPC 음성은 1개다. 재생 출력은 화자 위치를 쓰지 않는 2D 음성이다.
- 합성·재생 작업은 session_id, request_id, subtitle_id, world_epoch를 가진다. 결과 적용 직전에 현재 값과 다르면 폐기한다.
- 게임 프레임 스레드에서 합성·디코딩·프로세스 통신을 기다리지 않는다.

## 6. 실행 구조

- TTS 런타임은 게임 프로세스 밖의 로컬 보조 프로세스다. ANPC.Native가 시작·종료·상태 감시를 맡는다.
- 통신은 로컬 파이프 또는 루프백으로만 한다. 루프백 외 바인딩, 원격 주소 설정, 외부 네트워크 전송을 두지 않는다.
- 보조 프로세스는 낮은 우선순위와 cpu_threads 스레드로 실행한다. 게임 종료·모드 비활성화·연속 실패 시 종료한다.
- 플레이어에게 Python·CUDA·GPU·별도 TTS 설치를 요구하지 않는다. 설치 구성은 [DIST-23](mod-distribution-specification.md#1-배포-범위와-소유권)을 따른다.
- TTS는 유료 API를 호출하지 않는다. speech_text 생성 토큰은 대사 요청의 출력 토큰으로 [비용 규격](api-cost-specification.md)에 계측한다.

## 7. 설정

| 필드 | 기본값·범위·규칙 |
| --- | --- |
| voice_enabled | true. 엔진 로드 실패 시 해당 게임 세션 동안 자동 비활성 후 안내 |
| voice_language | `ja` 고정 |
| engine_profile | `genie_v2proplus_cpu`. 패키지에 든 voice_model_version을 사용. 사용자 변경 불가 |
| cpu_threads | 4, 범위 1~8 |
| voice_volume | 1.0, 범위 0.0~1.0 |
| subtitle_wait_ms | 3000, 범위 500~5000 |
| utterance_cache_mb | 256, 범위 0~1024. 0이면 합성 결과 캐시 미사용 |

설정 변경은 현재 대사의 재생이 끝난 뒤 적용한다. voice_enabled 변경은 다음 요청의 출력 스키마부터 적용한다.

## 8. 오류

| 코드 | 처리 |
| --- | --- |
| tts_unavailable | 엔진·모델 로드 실패 또는 보조 프로세스 종료. 음성 비활성·진단 안내, 자막 유지 |
| voice_profile_missing | 대상 profile·참조 없음. 해당 대사 음성 생략 |
| reference_unavailable | 게임 파일에서 참조 추출 실패. 해당 참조 제외 후 4.1 순서 계속 |
| speech_text_invalid | 2절 내용 검사 실패. 해당 대사 음성 생략 |
| synthesis_failed / synthesis_timeout | 해당 대사의 남은 조각 폐기. 자동 재합성·대사 재요청 없음 |
| audio_device_unavailable | 재생 장치 없음. 해당 대사 음성 생략 |

- 음성 오류로 NPC 대사를 다시 요청하지 않는다. NPC가 음성 오류를 대사로 말하지 않는다.
- 진단 기록은 오류 코드·지연·조각 수만 남긴다. speech_text 원문·오디오는 기본으로 기록하지 않는다.

## 9. 측정 항목

로컬 단조 시계로 response_accepted, first_chunk_ready, npc_first_audio, playback_end와 재생 중 조각 대기 합계(playback_stall_ms)를 기록한다. 첫 음성 지연은 npc_first_audio − player_input_accepted이다. 음성을 생략하면 npc_first_audio는 null이다. 시험 방법과 출시 판정 수치는 [개발·검증 계획](development-validation.md)에 둔다.
