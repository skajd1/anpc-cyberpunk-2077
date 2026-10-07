module ANPC

// UF-14/SR-11: 자유 군중과의 대화 동안 ANPC가 소유하는 기본 제어(정지·V 시선).
// 오리지널 명령을 일괄 취소하지 않고 이 객체가 보낸 명령·시선 이벤트만 해제한다.
// 장면/대화 중 커뮤니티 NPC(UF-15)에는 사용하지 않는다. 워크스팟 점유 중에는 건드리지 않고, 벗어나면 건다.
//
// 차선을 걷는 군중은 AI 명령이 아니라 군중 시스템이 움직인다. 원작 반응(reactionComponent·aiStimReactionTask)도
// CrowdMemberComponent.TryStopTrafficMovement로 차선 이동을 먼저 멈춘 뒤 행동을 건다. 같은 순서를 따른다.
//   TryStopTrafficMovement + AIHoldPositionCommand{duration} + AIComponent.SendCommand(npc, cmd)
//   LookAtAddEvent(ActivateReactionLookAt 값) / LookAtRemoveEvent.QueueRemoveLookatEvent
//   몸통 회전은 Vector4.Heading 각도로 TeleportationFacility.Teleport를 여러 단계로 나눠 적용한다.
// 해제 때는 정지 명령·시선을 거두고 ReactionSystem.TryAndJoinTraffic(원작 JoinTrafficOnFoot과 같은 호출)으로 차선에 다시 합류시킨다.
public class NpcControl extends IScriptable {
  private let npc: wref<NPCPuppet>;
  private let holdCmd: ref<AIHoldPositionCommand>;
  private let lookAt: ref<LookAtAddEvent>;
  private let anchor: Vector4;
  private let renewedAt: Float;
  private let stoppedAt: Float;
  private let applied: Bool;
  private let engaged: Bool;

  // 정지 명령 수명. 해제 호출이 누락돼도 이 시간 뒤 스스로 끝나 영구 정지가 남지 않는다.
  public static func HoldSeconds() -> Float { return 20.0; }
  // 수명이 끝나기 전에 같은 간격으로 갱신한다.
  public static func RenewSeconds() -> Float { return 10.0; }
  // 정지 지점에서 이만큼 벗어나면 걷기 시작한 것으로 보고 다시 멈춘다. 제자리 회전·대기 동작은 이 안에 든다.
  public static func DriftMeters() -> Float { return 0.5; }
  // 다시 멈추는 최소 간격.
  public static func RestopSeconds() -> Float { return 1.0; }

  public func IsEngaged() -> Bool { return this.engaged; }

  public func Controls(npc: ref<NPCPuppet>) -> Bool { return this.engaged && this.npc == npc; }

  // 자유 군중이면 항상 소유를 시작한다. 워크스팟(원작 대화 반응 포함) 중이면 감시에서 벗어난 뒤 건다.
  public func Engage(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> Bool {
    if this.engaged || !IsDefined(npc) || !IsDefined(player) { return false; }
    this.npc = npc;
    this.engaged = true;
    if !NpcControl.InWorkspot(npc) { this.Apply(npc, player); }
    return true;
  }

  // 세션 감시(0.3초)에서 호출한다. 걷기 시작했으면 다시 멈추고, 정지 명령을 갱신하며 V가 움직였다면 다시 바라본다.
  public func Maintain() -> Void {
    let npc: ref<NPCPuppet> = this.npc;
    if !this.engaged || !IsDefined(npc) || npc.IsDead() { return; }
    // AMM 제스처·원작 반응 등 워크스팟이 몸을 소유하는 동안에는 싸우지 않는다.
    if NpcControl.InWorkspot(npc) { return; }
    let game = npc.GetGame();
    let player = GetPlayer(game);
    if !this.applied {
      if IsDefined(player) { this.Apply(npc, player); }
      return;
    }
    let now = EngineTime.ToFloat(GameInstance.GetSimTime(game));
    if now - this.stoppedAt >= NpcControl.RestopSeconds() && this.IsWalking(npc) {
      this.Stop(npc, now);
      if IsDefined(player) { this.TurnBody(npc, player); }
      return;
    }
    if now - this.renewedAt < NpcControl.RenewSeconds() { return; }
    this.Stop(npc, now);
    if IsDefined(player) { this.TurnBody(npc, player); }
  }

  // 모든 종료 경로에서 호출한다. 이 객체가 만든 명령·시선 이벤트만 해제하며 반복 호출해도 안전하다.
  public func Release() -> Void {
    let npc: ref<NPCPuppet> = this.npc;
    let stopped = this.applied;
    this.engaged = false;
    this.applied = false;
    this.npc = null;
    let hold = this.holdCmd;
    let look = this.lookAt;
    this.holdCmd = null;
    this.lookAt = null;
    if !IsDefined(npc) { return; }
    NpcControl.StopCommand(npc, hold);
    if IsDefined(look) { LookAtRemoveEvent.QueueRemoveLookatEvent(npc, look); }
    // 정지 명령을 거두는 것만으로는 30초 넘게 서 있었다. 이 객체가 멈춘 차선 이동만 바로 되돌린다.
    if stopped { NpcRejoinStep.Schedule(npc, 0); }
  }

  // 원작 도보 합류(JoinTrafficOnFoot)와 같은 호출. 실패하면 호출자가 다시 시도한다.
  public static func TryRejoin(npc: ref<NPCPuppet>) -> Bool {
    let game = npc.GetGame();
    let reactions = GameInstance.GetReactionSystem(game);
    let player = GetPlayer(game);
    if !IsDefined(reactions) || !IsDefined(player) { return false; }
    return reactions.TryAndJoinTraffic(npc, Vector4.Vector4To3(player.GetWorldPosition()), false);
  }

  private func Apply(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> Void {
    this.applied = true;
    this.Stop(npc, EngineTime.ToFloat(GameInstance.GetSimTime(npc.GetGame())));
    this.FaceLook(npc, player);
    this.TurnBody(npc, player);
  }

  // 차선 이동을 멈추고 정지 명령을 새로 건 뒤 이전 명령을 거둔다. 현재 위치를 정지 지점으로 삼는다.
  private func Stop(npc: ref<NPCPuppet>, now: Float) -> Void {
    let crowd = npc.GetCrowdMemberComponent();
    if IsDefined(crowd) { crowd.TryStopTrafficMovement(); }
    let old = this.holdCmd;
    this.SendHold(npc);
    NpcControl.StopCommand(npc, old);
    this.anchor = npc.GetWorldPosition();
    this.stoppedAt = now;
    this.renewedAt = now;
  }

  private func IsWalking(npc: ref<NPCPuppet>) -> Bool {
    return Vector4.Distance2D(npc.GetWorldPosition(), this.anchor) > NpcControl.DriftMeters();
  }

  private static func InWorkspot(npc: ref<NPCPuppet>) -> Bool {
    let workspots = GameInstance.GetWorkspotSystem(npc.GetGame());
    return !IsDefined(workspots) || workspots.IsActorInWorkspot(npc);
  }

  private func SendHold(npc: ref<NPCPuppet>) -> Void {
    let cmd = new AIHoldPositionCommand();
    cmd.duration = NpcControl.HoldSeconds();
    this.holdCmd = cmd;
    AIComponent.SendCommand(npc, cmd);
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

// 세션 종료 뒤 차선 합류. 정지 명령이 거둬지도록 0.2초 뒤 시작하고, 실패하면 0.5초 간격으로 최대 8회 다시 시도한다.
// 그사이 같은 NPC로 새 ANPC 세션이 시작됐거나 워크스팟·사망 상태면 중단한다.
public class NpcRejoinStep extends DelayCallback {
  public let npc: wref<NPCPuppet>;
  public let attempt: Int32;

  public static func Schedule(npc: ref<NPCPuppet>, attempt: Int32) -> Void {
    let step = new NpcRejoinStep();
    step.npc = npc;
    step.attempt = attempt;
    GameInstance.GetDelaySystem(npc.GetGame()).DelayCallback(step, attempt == 0 ? 0.2 : 0.5, false);
  }

  public func Call() -> Void {
    let npc: ref<NPCPuppet> = this.npc;
    if !IsDefined(npc) || !npc.IsAttached() || npc.IsDead() { return; }
    let game = npc.GetGame();
    let entry = Entry.Get(game);
    if IsDefined(entry) && entry.IsControlling(npc) { return; }
    let workspots = GameInstance.GetWorkspotSystem(game);
    if !IsDefined(workspots) || workspots.IsActorInWorkspot(npc) { return; }
    if NpcControl.TryRejoin(npc) || this.attempt >= 8 { return; }
    NpcRejoinStep.Schedule(npc, this.attempt + 1);
  }
}
