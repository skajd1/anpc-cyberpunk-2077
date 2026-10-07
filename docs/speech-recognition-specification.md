# 플레이어 음성 인식 구현 규격

규격 버전: 1.0 (2026-10-03). 선택 후속 확장의 목표 계약. 호스트 인터페이스: [공통 규격 2.3](module-interface-specification.md#23-선택-음성-입력의-호스트-인터페이스). 구현·시험 계획: [개발·검증 계획](development-validation.md#63-플레이어-음성-입력).

## 1. 범위와 연결 경계

플레이어 마이크 → 실시간 음성 인식 → 확정 텍스트 → 기존 플레이어 입력 검증/대화 요청. Luna·프롬프트·기억·행동 검사·NPC 자막을 재사용한다. NPC TTS는 별도이며 이 모듈을 사용하기 위한 필수 조건이 아니다.

기본은 누르고 말하기(PTT). 버튼을 놓으면 전사를 확정하고 자동 제출한다. 확인 후 제출은 선택 설정. 첫 게임판의 텍스트 입력은 유지한다. 상시 청취·자동 발화 종료·NPC 발화 중 끼어들기·화자 구분·음성 감정 추론·네이티브 음성 답변은 이 버전의 범위 밖이다.

음성 모듈은 대화 엔진·NPC 기억·행동 실행기를 직접 호출하지 않는다. 호스트가 최종 텍스트를 기존 입력 경로에 전달한다. 등록되지 않은 공통 포트나 음성 필드를 ModelInput에 추가하지 않는다.

## 2. 구성 요소와 주입

| 요소 | 책임·필수 주입 |
| --- | --- |
| SpeechInput | 캡처 수명·전사 이벤트·취소·자원 해제. 인터페이스 버전 1.0 |
| MicrophoneAdapter | 장치 선택·권한·마이크 캡처·단일 채널 PCM 변환. 게임 음성/루프백 입력 금지 |
| TranscriptionAdapter | 제공자 연결·청크 전송·최종 확정·이벤트 정규화. 텍스트만 반환 |
| 호스트 연결부 | PTT 바인딩·입력 잠금·현재 세션 토큰·미리보기·최종 텍스트 제출 |
| 설정/키 접근기 | 불변 음성 설정과 credential_ref 해석. 텍스트 생성 설정과 분리 |
| 사용량 기록기 | 음성 요청별 사용량/알 수 없음·지연·오류. [비용 규격](api-cost-specification.md)의 개인 한도 적용 |

호스트 시작 시 신뢰된 로컬 SpeechInput 구현 하나를 주입한다. enabled=false 또는 미설치는 음성 UI/연결/마이크를 만들지 않는다. 설치·인터페이스 호환 검사·장치/키 설정·활성화·PTT 바인딩을 완료하면 연결한다. 파일 복사만으로 마이크를 자동 활성화하지 않는다.

웹은 브라우저 마이크 어댑터, 게임은 마이크 접근이 검증된 네이티브/로컬 어댑터를 주입한다. CET/redscript의 마이크·WebSocket 지원은 전제하지 않는다. 게임에 필요한 로컬 브리지는 사용자 PC에서만 실행하며 제작자 중계 서버를 사용하지 않는다.

## 3. 설정

| 필드 | 기본값·한도·규칙 |
| --- | --- |
| enabled | false. 사용자가 설정에서 활성화 |
| provider_id / model_id | openai / gpt-live-transcribe. 제공자 지원 확인 실패 시 음성 비활성; 다른 유료 모델로 자동 전환 금지 |
| credential_ref | 개인 API 키의 보안 저장소 참조. 키 문자열을 NPC 카드/게임 저장에 넣지 않음 |
| endpoint_profile | openai_realtime_transcription. 승인된 WSS 연결 프로필만 사용; 임의 URL 금지 |
| microphone_device_id | null=OS 기본 입력. 장치 제거 시 실패 처리; 녹음 중 다른 장치로 자동 전환 금지 |
| input_mode | push_to_talk 고정 |
| ptt_binding | 호스트 키 설정에서 명시. 기존 게임/대화 키와 충돌하면 활성화 거부 |
| languages | [ko]. 추가 언어는 제공자 지원 검사 후 설정 |
| transcription_delay | low. 제공자 지원값만 허용; 설정을 밀리초 지연 보장으로 해석하지 않음 |
| confirm_before_submit | false. true이면 확정 전사문을 편집 가능한 입력란에 넣고 명시적 제출 대기 |
| max_capture_ms | 30000, 범위 1000~30000. 초과하면 전체 취소; 잘린 문장을 자동 제출하지 않음 |
| connect_timeout_ms | 10000, 범위 3000~15000. 권한 대기·장치 열기·제공자 준비 전체 상한 |
| finalize_timeout_ms | 10000, 범위 3000~15000. PTT 해제 후 마지막 청크 처리와 최종 전사 수신 전체 상한 |

언어·모델·장치·키 변경은 진행 중 캡처를 취소하고 다음 캡처부터 적용한다. PCM 형식·청크 크기는 어댑터 프로필 소유이며 사용자 임의 설정으로 노출하지 않는다. 입력 길이는 기존 플레이어 입력 검사의 1~1000 유니코드 코드 포인트를 따른다.

## 4. 실행 수명과 UI

| 상태/입력 | 동작 |
| --- | --- |
| idle + PTT 누름 | 호스트의 유효 대화 세션·현재 NPC·한도·입력 잠금 검사. capture_id/context_token 발급 후 opening |
| opening | 마이크 권한·장치·제공자 세션 준비. 아직 말하지 않도록 연결 상태 표시; 대화 입력 잠금 |
| 준비 완료 | listening. 녹음 표시·시작 신호 뒤 마이크 청크만 전송. 키 반복은 무시 |
| listening | 부분 전사를 별도 미리보기에 표시. 기존 작성 중 텍스트 덮어쓰기·LLM 호출·기억 저장 금지 |
| PTT 해제 | finalizing. 마이크 즉시 정지, 마지막 청크 전달 후 한 번 commit. 최종 결과 전 입력 잠금 유지 |
| 최종 전사 | 현재 토큰·대화 조건·입력 길이 검사. 자동 제출 또는 편집 대기. 처리 후 모듈 idle |
| 취소/실패 | 해당 캡처 폐기·입력 잠금 해제·텍스트 경로 복구. 실패 원문으로 NPC 대사 생성 금지 |
| dispose | 현재 캡처 취소·마이크 트랙/연결/버퍼 해제. disposed 이후 start 거부 |

- opening 중 PTT 해제는 취소다. 권한 창/연결이 나중에 완료되어도 녹음을 시작하지 않고 자원을 해제한다.
- Escape·포커스 상실·장치 제거·세션 종료·전투·대상 변경·로드/세계 전환은 즉시 취소한다. 키 해제 누락에도 max_capture_ms로 종료한다.
- 전사 중에는 새 녹음·텍스트 제출 금지. 기존 NPC 생성 대기/음성 재생 중에도 PTT 거부한다. 텍스트 엔진 waiting 상태는 최종 문장이 제출된 뒤에만 진입한다.
- 마이크 청크 도착은 활성 입력으로 처리한다. 기존 세션 유휴 종료 정책은 [통신 규격](runtime-specification.md)을 따르며 캡처가 세션을 무기한 연장하지 않는다.
- 시작 전에 수동 작성 중인 텍스트가 있으면 PTT를 거부하고 전송/비우기 안내. 확인 대기 중에는 새 음성 입력을 거부하고 편집/전송/취소만 허용한다.
- 무음/빈 결과는 no_speech. 잡음으로 인식한 단어를 확실한 발화로 판정하지 않는다. confidence 필드를 임의 생성하지 않는다.
- 앞뒤 공백만 제거한다. 번역·문장 재작성·인명 강제 교정·긴 입력 자동 절단 금지. 초과 문장은 편집 대상으로 제시하고 자동 제출하지 않는다.

## 5. 세션 격리와 한 번 제출

context_token은 호스트가 저장 범위·세계 세대·NPC 논리 키·대화 세션·입력 세대를 묶어 발급하는 불투명 로컬 값이다. 새 입력/대상·세션 전환/종료·로드·설정 교체 시 무효화한다. 일반 게임 시간 진행만으로 무효화하지 않는다. 외부 제공자에 전송하지 않는다.

모듈과 호스트는 capture_id별 종결을 한 번만 수용한다. 중복 completed·뒤늦은 partial·취소 후 final은 폐기한다. 완료 이벤트의 item_id를 해당 캡처에 매핑하며 다른 캡처 텍스트를 합치지 않는다.

호스트는 final 수신과 제출 직전에 토큰/대화 조건을 검사한다. 확정 텍스트의 제출 수용과 consumed 표시는 원자적으로 처리한다. 제출 거부 시 자동 재전송하지 않는다. 확인 대기의 편집된 문장도 같은 토큰으로 제출한다.

호스트 입력 잠금은 캡처 소유자만 해제한다. 자동 제출에서는 토큰 검사·캡처 잠금 해제·기존 요청 잠금 획득·consumed 확정을 같은 호스트 큐 작업에서 수행한다. 확인 모드에서는 캡처 잠금을 편집 대기 잠금으로 전환한다. 늦은 취소 콜백이 새 요청의 잠금을 해제하지 않는다.

음성 캡처 시작 때의 게임 스냅샷으로 답변을 생성하지 않는다. 기존 대화 경로가 제출 시점의 최신 허용 맥락을 수집하고 새 요청/Fence를 발급한다. 수용된 텍스트만 기존 플레이어 발화로 기록하며 PCM·부분 전사·취소 문장은 기억에 넣지 않는다.

## 6. OpenAI 전사 어댑터 프로필

연결은 사용자 PC의 통신 어댑터에서 인증 헤더를 가진 WebSocket으로 수행한다. 브라우저에는 장기 API 키를 전사 연결용으로 전달하지 않는다. 웹 시제품도 브라우저→루프백 브리지→제공자 경로를 사용한다. 브리지는 마이크 장치에 접근하지 않고 PCM만 받는다.

| 단계 | 제공자 변환 |
| --- | --- |
| 세션 설정 | type=transcription, audio.input.format=audio/pcm 및 rate=24000, transcription.model=gpt-live-transcribe |
| 한국어/용어 | transcription.languages=[ko], delay=low. 검수한 공개 고유명사를 keywords 힌트로 전달; NPC 기억·게임 상태·프롬프트 전체 전송 금지 |
| 종료 판단 | audio.input.turn_detection=null. 호스트 PTT 해제로 종료; 서버 VAD/semantic VAD 사용하지 않음 |
| 전송 | PCM16 LE·단일 채널·24kHz. 100ms=2400샘플=4800바이트, 마지막 청크는 짧아도 허용. input_audio_buffer.append의 audio에 base64 청크 |
| 확정 | 마지막 append 뒤 input_audio_buffer.commit 한 번. 제공자 이벤트 순서/항목 ID로 해당 캡처 결과 연결 |
| 부분 결과 | conversation.item.input_audio_transcription.delta → partial. 제공자 delta를 항목별 누적하여 전체 미리보기 전달 |
| 최종 결과 | conversation.item.input_audio_transcription.completed의 transcript → final. 누적 delta 대신 최종 transcript 사용 |
| 종료/오류 | 캡처별 연결 종료. error/실패/중단 이벤트는 정규화한 Fault로 변환. 연결 자동 복구/청크 재전송 금지 |

이 모델은 서버 발화 종료 감지·전사 confidence를 제공하지 않는다. 실시간 전사와 확정 시점은 [OpenAI 공식 가이드](https://developers.openai.com/api/docs/guides/realtime-transcription)를 따른다. 실제 WebSocket 세션 생성·인증·준비 응답은 [연결 가이드](https://developers.openai.com/api/docs/guides/realtime-websocket)의 현재 API와 맞춰 구현하고, 준비 확인 전 listening으로 전환하지 않는다.

마이크가 44.1/48kHz이면 상태를 유지하는 리샘플러로 24kHz 변환한다. 청크마다 독립 리샘플링해 경계 샘플을 손실하지 않는다. MediaRecorder의 WebM/Opus·WAV 헤더를 PCM으로 전송하지 않는다. 브라우저는 AudioWorklet 등 비차단 캡처, 게임은 검증된 마이크 어댑터를 사용한다.

30초 원본 PCM 상한은 1,440,000바이트다. pending PCM은 최대 1초(48,000바이트); 초과 시 audio_backpressure로 취소한다. 오디오를 조용히 누락하지 않는다. 클라이언트·브리지 모두 PCM 바이트·시간·동시 캡처 1개를 검사한다. 청크와 base64는 처리 후 해제하며 전체 녹음 파일은 만들지 않는다.

## 7. 오류·키·비용

| 코드 | 호스트 처리 |
| --- | --- |
| permission_denied / microphone_unavailable | 권한/장치 안내. 키보드 입력 유지 |
| capture_busy / input_busy | 기존 캡처/입력을 유지. 중복 연결 없음 |
| no_speech / input_too_long | LLM 미호출. 재녹음 또는 문장 편집 안내 |
| auth_failed / unsupported_model / invalid_configuration | 음성 설정 안내. 다른 제공자로 자동 전환 없음 |
| network_error / timeout / audio_backpressure | 버퍼 폐기·마이크 종료. 명시적 새 녹음만 허용 |
| capture_limit_exceeded / budget_exceeded | 녹음 종료·전체 문장 미제출. 한도 안내 |
| cancelled / stale_result | 조용히 폐기. 기존 입력/새 세션에 결과 반영 금지 |

첫 활성화 시 외부 전사 서비스로 마이크 음성을 전송함을 표시하고 사용자 활성화로 진행한다. 클라우드 보관 정책을 로컬 무저장과 동일시하지 않는다. 마이크 권한은 녹음 시작 동작에서 요청한다.

원본 음성·부분/확정 전사 로그 기본 비활성. 보안 저장소 참조만 설정에 보존한다. 취소도 이미 전송한 음성의 비용/서버 처리를 되돌리지 않으므로 사용량 기록을 유지한다. 제공자 사용량 미반환은 알 수 없음이며 로컬 audio_ms를 청구량으로 단정하지 않는다. 전사 사용량은 NPC 생성/TTS와 구분한다. 시작 전 설정된 개인 한도를 검사하고 자동 유료 재시도하지 않는다.

루프백 브리지의 WebSocket 업그레이드도 기존 Host/Origin·호스트 발급 토큰 검사 적용. 토큰은 URL에 넣지 않고 인증된 초기 메시지에서 검사; 인증 전 PCM 수용 금지. 루프백 외 바인딩·CORS 허용 확대·원격 URL 프록시 금지. 연결 해제/페이지 종료/브리지 종료는 관련 캡처를 취소한다.

## 8. 기존 시제품과 게임 호스트 연결

| 현재 위치 | 구현 시 필요한 연결 |
| --- | --- |
| prototype/public/compare.js의 compare-form 제출 | 입력 검증과 요청 시작을 공통 submitPlayerText로 추출. 키보드와 음성 final 모두 호출. 음성 경로에서 별도 engine.send 호출 금지 |
| 같은 파일의 busy/sequence·대상/시나리오 변경·취소/종료 | 캡처용 잠금·context_token 세대 연결. 녹음 중 키보드 요청 차단, 변경/종료 시 cancel |
| prototype/public/compare.html | 선택 PTT 버튼·단축키·녹음/전사 상태·부분 미리보기·확인 모드 편집. 활성화 전에는 음성 UI 숨김 |
| prototype/server.js | 음성 모듈 정적 경로와 인증된 로컬 전사 WebSocket 브리지 등록. 기존 /api/generate·/api/summarize 본문에 오디오 필드 추가 금지 |
| prototype/public/core.js | 최종 문자열을 기존 send 경로로 전달. 음성 제공자 상태/PCM을 엔진에 추가하지 않음 |
| 게임 호스트 | 활성 NPC 세션 진입 후 PTT 연결. 마이크/전사 콜백을 게임 큐에 전달하고 토큰 재검사. 프레임 스레드에서 네트워크/리샘플링 대기 금지 |

추가 파일의 목표 위치: prototype/public/speech-input.js(수명), prototype/public/microphone.js(웹 캡처), prototype/transcription.js(제공자), prototype/speech-bridge.js(로컬 연결), prototype/tests/speech-input.test.js(모의 수명/연결). 실제 파일은 아직 생성하지 않는다. 게임 호스트는 같은 인터페이스의 언어별 어댑터를 사용한다.

구현 완료 후 필요한 설치 작업은 음성 어댑터 등록·의존성 주입·개인 키/장치/PTT 설정·활성화다. 기존 NPC 데이터·Luna 호출·기억 스키마를 음성 전용으로 복제하지 않는다.

## 9. 지연 측정과 수용 기준

로컬 단조 시계로 ptt_down, listening_ready, ptt_up, transcript_final, player_input_accepted, dialogue_accepted, npc_first_audio를 기록한다. NPC 음성 미설치/실패는 마지막 시각을 null로 둔다. 시계가 다른 브리지/제공자의 값을 직접 빼지 않는다.

연결 준비=listening_ready−ptt_down, 추가 전사 대기=transcript_final−ptt_up, 전체 체감=NPC 첫 음성−ptt_up. 말한 시간과 연결 준비를 전사 대기에 섞지 않는다. 같은 문맥·최종 문장·Luna/TTS 설정의 텍스트 경로와 비교하고 중앙값/p95·오류율·고유명사 정확도를 함께 기록한다. 고정 지연 수치는 제품 보장으로 두지 않는다.

모의 시험·실제 마이크/제공자·게임 시험의 절차와 출시 판정은 [개발·검증 계획 6.3](development-validation.md#63-플레이어-음성-입력)을 따른다. 문서 작성이나 모의 시험 통과만으로 실시간 음성 구현 완료를 표시하지 않는다.
