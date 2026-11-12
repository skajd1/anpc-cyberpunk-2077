module ANPC

// 게임 저장과 NPC 기억 묶음의 연결(기억 규격 3.1). 저장별 ScriptableSystem이며 전역 ScriptableService를 쓰지 않는다.
// 묶음(SaveBundle UTF-8 JSON)은 Lua memory.lua가 만들어 StageBundle로 맡기고, 이 시스템은 저장 직전에 persistent 배열로 옮겨
// 저장 파일에 함께 남기며, 로드 때 앵커와 맞는 바이트만 돌려준다. 내용 해석·검증은 Lua가 한다.
//
// 실게임 미확인(이 파일에만 둔다):
//  - Session/BeforeSave 콜백 등록·핸들러 시그니처(Codeware 문서의 GameSessionEvent 기준 추정)
//  - persistent array<Uint8>/array<Int32> 필드의 저장·크기·스크립트 개정·모드 제거 후 저장
//  - OnAttach/OnRestored 호출 순서(로드 시 persistent 값이 어느 시점에 채워지는지)
public class MemorySave extends ScriptableSystem {
  // 저장 파일에 남는 값. 문자열은 persistent 대상이 아니므로 숫자와 바이트만 쓴다.
  // anchor: [형식, 회차, 체크포인트, 묶음 바이트 수, 바이트 합계 검사값]
  private persistent let bundle: array<Uint8>;
  private persistent let anchor: array<Int32>;
  private persistent let playthrough: Int32;
  private persistent let checkpoint: Int32;

  // 실행 중 값. 저장하지 않는다.
  private let sessionToken: String;
  private let restored: Bool;
  private let staged: array<Uint8>;
  private let stagedRef: String;
  private let saveListener: ref<CallbackHandle>;

  private func OnAttach() -> Void {
    this.sessionToken = ToString(RandRange(1, 2147483646));
    ArrayClear(this.staged);
    this.stagedRef = "";
    this.EnsurePlaythrough();
    this.RegisterSave();
  }

  private func OnRestored(saveVersion: Int32, gameVersion: Int32) -> Void {
    // 새 게임에는 OnRestored가 없다. 로드한 저장의 persistent 값만 복원 대상이다.
    this.sessionToken = ToString(RandRange(1, 2147483646));
    this.restored = true;
    ArrayClear(this.staged);
    this.stagedRef = "";
    this.EnsurePlaythrough();
    this.RegisterSave();
  }

  // 회차 식별자는 한 번 발급해 저장 파일에 남긴다. 저장 전에도 다음 저장 참조를 알려 Lua가 묶음을 준비할 수 있게 한다.
  private func EnsurePlaythrough() -> Void {
    if this.playthrough == 0 { this.playthrough = RandRange(1, 2147483646); }
  }

  private func OnDetach() -> Void {
    let callbacks = GameInstance.GetCallbackSystem();
    if IsDefined(callbacks) && IsDefined(this.saveListener) { callbacks.UnregisterCallback(this.saveListener); }
    this.saveListener = null;
  }

  // 저장 직전 신호 등록: 미확인 훅은 이 함수와 OnBeforeSave에만 둔다.
  private func RegisterSave() -> Void {
    let callbacks = GameInstance.GetCallbackSystem();
    if IsDefined(callbacks) && !IsDefined(this.saveListener) {
      this.saveListener = callbacks.RegisterCallback(n"Session/BeforeSave", this, n"OnBeforeSave");
    }
  }

  // 저장 직렬화 직전. 모델 요약·API 완료를 기다리지 않는다. 저장 성공 여부는 추정하지 않는다.
  private cb func OnBeforeSave(event: ref<GameSessionEvent>) -> Bool {
    this.EnsurePlaythrough();
    this.checkpoint += 1;
    ArrayClear(this.bundle);
    ArrayClear(this.anchor);
    // 다음 저장 참조와 같은 참조로 맡긴 최신 묶음만 쓴다. 어긋나면 앵커를 비워 로드 때 빈 기억이 되게 한다.
    if ArraySize(this.staged) > 0 && Equals(this.stagedRef, this.NextRefFor(this.checkpoint)) {
      let i = 0;
      while i < ArraySize(this.staged) { ArrayPush(this.bundle, this.staged[i]); i += 1; }
      ArrayPush(this.anchor, 1);
      ArrayPush(this.anchor, this.playthrough);
      ArrayPush(this.anchor, this.checkpoint);
      ArrayPush(this.anchor, ArraySize(this.bundle));
      ArrayPush(this.anchor, MemorySave.Checksum(this.bundle));
    }
    return true;
  }

  private func NextRefFor(point: Int32) -> String {
    return "pt-" + ToString(this.playthrough) + ":cp-" + ToString(point);
  }

  private static func Checksum(bytes: array<Uint8>) -> Int32 {
    let sum = 0;
    let i = 0;
    while i < ArraySize(bytes) { sum = (sum * 31 + Cast<Int32>(bytes[i]) + 1) % 1000000007; i += 1; }
    return sum;
  }

  // ---- Lua(memory.lua) 접점 ----
  // 로드/새 게임마다 바뀌는 세션 토큰. 빠른 이동은 바꾸지 않는다.
  public func GetSessionToken() -> String { return this.sessionToken; }
  public func IsRestored() -> Bool { return this.restored; }
  // 회차가 없으면(발급 전) 빈 문자열이다.
  public func GetSaveScope() -> String {
    if this.playthrough == 0 { return ""; }
    return "pt-" + ToString(this.playthrough);
  }
  public func GetNextRef() -> String {
    if this.playthrough == 0 { return ""; }
    return this.NextRefFor(this.checkpoint + 1);
  }
  // 앵커와 바이트가 서로 맞을 때만 참조를 돌려준다. 아니면 빈 문자열(빈 기억).
  public func GetRestoreRef() -> String {
    if ArraySize(this.anchor) != 5 || this.anchor[0] != 1 { return ""; }
    if this.anchor[3] != ArraySize(this.bundle) || this.anchor[4] != MemorySave.Checksum(this.bundle) { return ""; }
    return "pt-" + ToString(this.anchor[1]) + ":cp-" + ToString(this.anchor[2]);
  }
  public func GetRestoreBytes() -> array<Uint8> {
    let empty: array<Uint8>;
    if Equals(this.GetRestoreRef(), "") { return empty; }
    return this.bundle;
  }
  // 저장 준비용 최신 묶음을 맡긴다. 첫 저장 전(회차 없음)에는 거절한다.
  public func StageBundle(ref: String, bytes: array<Uint8>) -> Bool {
    if this.playthrough == 0 || !Equals(ref, this.GetNextRef()) { return false; }
    this.staged = bytes;
    this.stagedRef = ref;
    return true;
  }
}
