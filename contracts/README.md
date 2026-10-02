# 공통 계약 패키지

현재 패키지는 설계 버전 1.0이며 게임/웹의 전체 전환 완료를 의미하지 않는다. 의미·소유권·전환 방법은 [모드 공통 입출력 규격](../docs/module-interface-specification.md)을 따른다.

- [스키마](v1/module-contracts.schema.json): 필드·타입·필수 여부·허용 값의 기준. 외부 데이터는 Envelope, 호출은 Call/Reply, 모델 출력 데이터는 DialogueReply 정의로 검사한다.
- [등록표](v1/registry.json): 계약 이름→데이터 타입과 포트의 입력/출력 순서, 수명 정보 필요 여부. 특정 게임/제공자의 구현 위치를 등록하는 파일이 아니다.
- [예시 및 금지 사례](v1/examples.json): 모든 값은 가상 검사 자료이며 실제 인물/게임 근거가 아니다.
- [구성 스키마](v1/integration-configuration.schema.json): 상태 필드 등록·구현 선언·포트 연결. 실제 키·게임 객체·모델 전송 데이터 제외.
- [사이버펑크 상태 필드](v1/cyberpunk2077-fields.json): 타입·단위·공개·관찰 조건의 초기 등록표. 게임 API 매핑 및 실제 값 확인은 별도다.
- [구성 검사 자료](v1/integration-examples.json): 가상 구현과 정상/금지 구성. 실제 모듈 등록 및 전체 대화 구성 아님.

저장 객체를 모델에 직접 전달하지 않는다. MemoryRecord→MemoryView, IdentityProfile→PersonaView, StateSnapshot→ObservationView/CanonView, ActionCatalog→ActionOption처럼 전송 뷰를 만든다.

변경 시 스키마·등록표·예시·공통 문서와 관련 분야의 참조를 함께 검토한다. 이미 발행한 버전의 형태/의미를 조용히 바꾸지 않는다. `npm run check:contracts`는 이 패키지가 사용하는 부분집합으로 설계 자료를 검사하며 런타임의 권한·소유자·근거 검사를 대신하지 않는다. 추가 패키지 설치 없이 실행한다.
