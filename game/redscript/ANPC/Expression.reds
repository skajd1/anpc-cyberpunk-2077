module ANPC

// 행동 규격 react_with_expression: 응답 감정에 맞춘 NPC 얼굴 표정. 몸·위치·워크스팟·장비는 건드리지 않는다.
// 원작 표정 기능(AnimFeature_FacialReaction의 category·idle)을 쓰며 ANPC가 건 표정만 기억해 ResetFacial로 되돌린다.
// 기존 표정을 먼저 초기화하고 0.5초 뒤에 적용한다(초기화와 같은 프레임에 걸면 덮이는 경우가 있다).
public class NpcExpression extends IScriptable {
  private let npc: wref<NPCPuppet>;
  private let applied: Bool;
  private let token: Int32;

  public static func ApplyDelay() -> Float { return 0.5; }

  public func Apply(npc: ref<NPCPuppet>, category: Int32, idle: Int32) -> Bool {
    if !IsDefined(npc) || !npc.IsAttached() || npc.IsDead() { return false; }
    let current: ref<NPCPuppet> = this.npc;
    if this.applied && IsDefined(current) && current != npc { this.Reset(); }
    let reactions = npc.GetStimReactionComponent();
    if !IsDefined(reactions) { return false; }
    reactions.ResetFacial(0.0);
    this.token += 1;
    this.npc = npc;
    this.applied = true;
    let step = new NpcExpressionStep();
    step.owner = this;
    step.npc = npc;
    step.token = this.token;
    step.category = category;
    step.idle = idle;
    GameInstance.GetDelaySystem(npc.GetGame()).DelayCallback(step, NpcExpression.ApplyDelay(), false);
    return true;
  }

  public func Commit(npc: ref<NPCPuppet>, token: Int32, category: Int32, idle: Int32) -> Void {
    let current: ref<NPCPuppet> = this.npc;
    if !this.applied || token != this.token || current != npc || !IsDefined(npc) || !npc.IsAttached() || npc.IsDead() { return; }
    let feature = new AnimFeature_FacialReaction();
    feature.category = category;
    feature.idle = idle;
    AnimationControllerComponent.ApplyFeature(npc, n"FacialReaction", feature);
  }

  // 새 표정 예약도 무효화한다. 다른 시스템이 건 표정 위에 덮어쓴 경우에도 ANPC가 건 표정이 있을 때만 초기화한다.
  public func Reset() -> Void {
    let npc: ref<NPCPuppet> = this.npc;
    this.token += 1;
    if this.applied && IsDefined(npc) && npc.IsAttached() {
      let reactions = npc.GetStimReactionComponent();
      if IsDefined(reactions) { reactions.ResetFacial(0.3); }
    }
    this.applied = false;
    this.npc = null;
  }
}

public class NpcExpressionStep extends DelayCallback {
  public let owner: wref<NpcExpression>;
  public let npc: wref<NPCPuppet>;
  public let token: Int32;
  public let category: Int32;
  public let idle: Int32;

  public func Call() -> Void {
    let owner: ref<NpcExpression> = this.owner;
    let npc: ref<NPCPuppet> = this.npc;
    if IsDefined(owner) && IsDefined(npc) { owner.Commit(npc, this.token, this.category, this.idle); }
  }
}
