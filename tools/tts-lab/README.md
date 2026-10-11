# TTS 실험 도구

개발용 NPC 음성(TTS) 보조 프로세스와 로컬 자원을 만드는 스크립트다. 규격은 [음성 출력 규격](../../docs/npc-voice-output-specification.md), 실측은 [개발·검증 계획](../../docs/development-validation.md)을 따른다.

- 코드만 저장소에 둔다. 모델·가상환경·참조 음성·원작 대사·실행 기록은 실험 폴더에 두며 Git에 넣지 않는다(`.gitignore`).
- 실험 폴더 위치는 환경 변수 `ANPC_TTS_LAB`이다. 없으면 `%USERPROFILE%\anpc-tts-lab`을 쓴다.
- 원작 음성·대사로 만든 결과물(참조 음성, `profiles.json`, `crowd_voices.json`, 입모양 아카이브 등)은 배포하지 않는다.

| 경로 | 내용 |
| --- | --- |
| `helper/tts_helper.py` | 보조 프로세스. ANPC.Native가 게임 시작 때 `red4ext/plugins/ANPC/tts-helper.local.json`의 명령으로 실행한다. 데이터는 실험 폴더 `helper/`(profiles.json·crowd_voices.json·로그)에서 읽고 쓴다 |
| `helper/speak_test.py` | HTTP 요청 시험 |
| `work/build_crowd_voices.py` | 군중 원작 목소리별 참조 음성 목록(`helper/crowd_voices.json`·`crowd_refs/`) |
| `work/lipsync/build_talk.py` | 말하기 입모양 로컬 아카이브(`game/archive/ANPC_talk.local.archive`) |
| `work/ja_style/extract_ja_style.py` | 일본어 말투 예시 원문(`game/cet/anpc/ja_style_examples.local.json`) |
| `work/refpool_extract.py`·`refpool_rank.py`·`label/refpool_subs.py`·`make_ref.py` | 인물 참조 음성 후보 추출·순위·라벨링 자료 |
| `work/train_extract.py`·`genie_convert_v1.py`·`bench/quantize_v1.py` | 파인튜닝 학습 자료 추출, Genie 변환, GPT int8 양자화 |
| `work/postfx/` | 음색 보정 설계·적용 |
| `work/rdar.py`·`cr2w.py`·`viktor_lines_lib.py`·`shims/` | 게임 아카이브·자막 읽기, 라이브러리 보정 |

생성 스크립트는 실험 폴더의 `work`를 현재 폴더로 두고 실행한다. 예: `cd %ANPC_TTS_LAB%\work` 후 `..\venv\Scripts\python.exe <저장소>\tools\tts-lab\work\build_crowd_voices.py --rebuild`.
