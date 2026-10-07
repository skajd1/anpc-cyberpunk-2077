module ANPC

// UF-14/SR-11: 자유 군중과의 대화 동안 ANPC가 소유하는 기본 제어(정지·V 시선).
// 오리지널 명령을 일괄 취소하지 않고 이 객체가 보낸 명령·시선 이벤트만 해제한다.
// 장면/대화 중 커뮤니티 NPC(UF-15)와 워크스팟 점유 군중에는 사용하지 않는다.
//
// 사용 API는 공개 모드 Real Talk(RealTalkActions.reds)의 군중 정지·시선 구현을 근거로 같은 시그니처를 따랐다.
//   AIHoldPositionCommand{duration} + AIComponent.SendCommand(npc, cmd)
//   LookAtAddEvent(ActivateReactionLookAt 값) / LookAtRemoveEvent.QueueRemoveLookatEvent
//   몸통 회전은 Vector4.Heading 각도로 TeleportationFacility.Teleport를 여러 단계로 나눠 적용한다.
public class NpcControl extends IScriptable {
  private let npc: wref<NPCPuppet>;
  private let holdCmd: ref<AIHoldPositionCommand>;
  private let lookAt: ref<LookAtAddEvent>;
  private let renewedAt: Float;
  private let checkedAt: Float;
  private let reasserts: Int32;
  private let engaged: Bool;

  // 정지 명령 수명. 해제 호출이 누락돼도 이 시간 뒤 스스로 끝나 영구 정지가 남지 않는다.
  public static func HoldSeconds() -> Float { return 20.0; }
  // 수명이 끝나기 전에 같은 간격으로 갱신한다.
  public static func RenewSeconds() -> Float { return 10.0; }

  public func IsEngaged() -> Bool { return this.engaged; }

  public func Engage(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> Bool {
    if this.engaged || !IsDefined(npc) || !IsDefined(player) { return false; }
    let workspots = GameInstance.GetWorkspotSystem(npc.GetGame());
    // 워크스팟 점유 군중은 이미 제자리에 있으며 동작을 끊거나 회전시키지 않는다(행동 규격 1.1).
    if !IsDefined(workspots) || workspots.IsActorInWorkspot(npc) { return false; }
    this.npc = npc;
    this.engaged = true;
    this.renewedAt = EngineTime.ToFloat(GameInstance.GetSimTime(npc.GetGame()));
    this.checkedAt = this.renewedAt;
    this.SendHold(npc);
    this.FaceLook(npc, player);
    this.TurnBody(npc, player);
    return true;
  }

  // 세션 감시(0.3초)에서 호출한다. 정지 명령을 갱신하고 V가 움직였다면 다시 바라본다.
  public func Maintain() -> Void {
    let npc: ref<NPCPuppet> = this.npc;
    if !this.engaged || !IsDefined(npc) { return; }
    let game = npc.GetGame();
    let now = EngineTime.ToFloat(GameInstance.GetSimTime(game));
    let renew = now - this.renewedAt >= NpcControl.RenewSeconds();
    // 제스처 워크스팟 등이 명령을 지웠으면 2초 간격으로 최대 5회 다시 건다. 워크스팟 중에는 건드리지 않는다.
    if !renew && now - this.checkedAt >= 2.0 {
      this.checkedAt = now;
      let workspots = GameInstance.GetWorkspotSystem(game);
      if this.reasserts < 5 && IsDefined(workspots) && !workspots.IsActorInWorkspot(npc)
        && !NpcControl.IsActive(npc, this.holdCmd) {
        this.reasserts += 1;
        renew = true;
      }
    }
    if !renew { return; }
    this.renewedAt = now;
    let old = this.holdCmd;
    this.holdCmd = null;
    this.SendHold(npc);
    NpcControl.StopCommand(npc, old);
    let player = GetPlayer(game);
    if IsDefined(player) { this.TurnBody(npc, player); }
  }

  // 모든 종료 경로에서 호출한다. 이 객체가 만든 명령·시선 이벤트만 해제하며 반복 호출해도 안전하다.
  public func Release() -> Void {
    let npc: ref<NPCPuppet> = this.npc;
    this.engaged = false;
    this.npc = null;
    let hold = this.holdCmd;
    let look = this.lookAt;
    this.holdCmd = null;
    this.lookAt = null;
    if !IsDefined(npc) { return; }
    NpcControl.StopCommand(npc, hold);
    if IsDefined(look) { LookAtRemoveEvent.QueueRemoveLookatEvent(npc, look); }
  }

  private func SendHold(npc: ref<NPCPuppet>) -> Void {
    let cmd = new AIHoldPositionCommand();
    cmd.duration = NpcControl.HoldSeconds();
    this.holdCmd = cmd;
    AIComponent.SendCommand(npc, cmd);
  }

  private static func IsActive(npc: ref<NPCPuppet>, cmd: ref<AICommand>) -> Bool {
    let aic = npc.GetAIControllerComponent();
    if !IsDefined(aic) || !IsDefined(cmd) { return false; }
    let state = aic.GetCommandState(cmd);
    return Equals(state, AICommandState.Executing) || Equals(state, AICommandState.Enqueued);
  }

  // 실행 중 명령은 StopExecutingCommand, 대기 중 명령은 CancelCommand로 정리한다.
  private static func StopCommand(npc: ref<NPCPuppet>, cmd: ref<AICommand>) -> Void {
    let aic = npc.GetAIControllerComponent();
    if !IsDefined(aic) || !IsDefined(cmd) { return; }
    let state = aic.GetCommandState(cmd);
    if Equals(state, AICommandState.Executing) {
      aic.StopExecutingCommand(cmd, true);
    } else {
      if Equals(state, AICommandState.Enqueued) { aic.CancelCommand(cmd); }
    }
  }

  // 눈·머리·상체가 V를 따라가는 원작 반응(ActivateReactionLookAt)과 같은 값.
  private func FaceLook(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> Void {
    if IsDefined(this.lookAt) { return; }
    let evt = new LookAtAddEvent();
    evt.SetEntityTarget(player, n"pla_default_tgt", Vector4.EmptyVector());
    evt.SetStyle(animLookAtStyle.Normal);
    evt.request.limits.softLimitDegrees = 360.0;
    evt.request.limits.hardLimitDegrees = 270.0;
    evt.request.limits.backLimitDegrees = 210.0;
    evt.request.limits.hardLimitDistance = GetLookAtLimitDistanceValue(animLookAtLimitDistanceType.None);
    evt.request.calculatePositionInParentSpace = true;
    evt.bodyPart = n"Eyes";
    let parts: array<LookAtPartRequest>;
    let part: LookAtPartRequest;
    part.partName = n"Head";
    part.weight = 0.10;
    part.suppress = 1.0;
    part.mode = 0;
    ArrayPush(parts, part);
    part.partName = n"Chest";
    part.weight = 1.0;
    part.suppress = 0.0;
    part.mode = 0;
    ArrayPush(parts, part);
    evt.SetAdditionalPartsArray(parts);
    npc.QueueEvent(evt);
    this.lookAt = evt;
  }

  // 12도 미만이면 돌리지 않는다. 0.08초 간격 4단계로 나눠 부드럽게 돌린다.
  private func TurnBody(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> Void {
    let dir: Vector4 = player.GetWorldPosition() - npc.GetWorldPosition();
    dir.Z = 0.0;
    let fwd: Vector4 = npc.GetWorldForward();
    let delta: Float = Vector4.GetAngleDegAroundAxis(fwd, dir, npc.GetWorldUp());
    if AbsF(delta) < 12.0 { return; }
    let want: Float = Vector4.Heading(dir);
    let have: Float = Vector4.Heading(fwd);
    let i: Int32 = 1;
    while i <= 4 {
      let step = new NpcTurnStep();
      step.control = this;
      step.npc = npc;
      step.yaw = have + NpcControl.Norm180(want - have) * (Cast<Float>(i) / 4.0);
      GameInstance.GetDelaySystem(npc.GetGame()).DelayCallback(step, 0.08 * Cast<Float>(i), false);
      i += 1;
    }
  }

  public func ApplyYaw(npc: ref<NPCPuppet>, yaw: Float) -> Void {
    if !this.engaged || this.npc != npc || !IsDefined(npc) || npc.IsDead() { return; }
    // AMM 제스처 등 워크스팟이 몸을 소유하는 동안에는 회전으로 싸우지 않는다.
    let workspots = GameInstance.GetWorkspotSystem(npc.GetGame());
    if !IsDefined(workspots) || workspots.IsActorInWorkspot(npc) { return; }
    let rot: EulerAngles;
    rot.Pitch = 0.0;
    rot.Roll = 0.0;
    rot.Yaw = yaw;
    GameInstance.GetTeleportationFacility(npc.GetGame()).Teleport(npc, npc.GetWorldPosition(), rot);
  }

  private static func Norm180(a: Float) -> Float {
    let x: Float = a;
    while x > 180.0 { x -= 360.0; }
    while x < -180.0 { x += 360.0; }
    return x;
  }
}

public class NpcTurnStep extends DelayCallback {
  public let control: wref<NpcControl>;
  public let npc: wref<NPCPuppet>;
  public let yaw: Float;

  public func Call() -> Void {
    if IsDefined(this.control) && IsDefined(this.npc) { this.control.ApplyYaw(this.npc, this.yaw); }
  }
}
