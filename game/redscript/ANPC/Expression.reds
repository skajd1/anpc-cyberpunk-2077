module ANPC

// 행동 규격 react_with_expression(UF-74)과 말하기 입모양(UF-75). 몸·위치·워크스팟·장비는 건드리지 않는다.
// 원작 표정 기능(AnimFeature_FacialReaction의 category·idle)을 쓰며 ANPC가 건 표정만 기억해 ResetFacial로 되돌린다.
// 감정 표정은 기존 표정을 먼저 초기화하고 0.5초 뒤에 적용한다(초기화와 같은 프레임에 걸면 덮이는 경우가 있다).
// 말하기는 음성 시작에 맞춰 바로 적용하고, 끝나면 기억한 감정 표정으로 돌아간다. 말하는 동안 예약된 감정 표정은 기억만 한다.
public class NpcExpression extends IScriptable {
  private let npc: wref<NPCPuppet>;
  private let applied: Bool;
  private let token: Int32;
  private let hasBase: Bool;
  private let baseCategory: Int32;
  private let baseIdle: Int32;
  private let talking: Bool;

  public static func ApplyDelay() -> Float { return 0.5; }

  // 말하기 입모양 표정의 분류(로컬 자원 ANPC_talk 아카이브가 facial_reactions에 추가한 행).
  public static func TalkCategory() -> Int32 { return 4; }

  public func Apply(npc: ref<NPCPuppet>, category: Int32, idle: Int32) -> Bool {
    if !IsDefined(npc) || !npc.IsAttached() || npc.IsDead() { return false; }
    let current: ref<NPCPuppet> = this.npc;
    if this.applied && IsDefined(current) && current != npc { this.Reset(); }
    let reactions = npc.GetStimReactionComponent();
    if !IsDefined(reactions) { return false; }
    this.token += 1;
    this.npc = npc;
    this.applied = true;
    if !this.talking { reactions.ResetFacial(0.0); }
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
    this.hasBase = true;
    this.baseCategory = category;
    this.baseIdle = idle;
    if !this.talking { NpcExpression.Feature(npc, category, idle); }
  }

  public func Talk(npc: ref<NPCPuppet>, idle: Int32) -> Bool {
    if !IsDefined(npc) || !npc.IsAttached() || npc.IsDead() { return false; }
    let current: ref<NPCPuppet> = this.npc;
    if this.applied && IsDefined(current) && current != npc { this.Reset(); }
    this.npc = npc;
    this.applied = true;
    this.talking = true;
    NpcExpression.Feature(npc, NpcExpression.TalkCategory(), idle);
    return true;
  }

  public func EndTalk() -> Void {
    if !this.talking { return; }
    this.talking = false;
    let npc: ref<NPCPuppet> = this.npc;
    if !IsDefined(npc) || !npc.IsAttached() { return; }
    if this.hasBase {
      NpcExpression.Feature(npc, this.baseCategory, this.baseIdle);
    } else {
      let reactions = npc.GetStimReactionComponent();
      if IsDefined(reactions) { reactions.ResetFacial(0.3); }
    }
  }

  // 새 표정 예약도 무효화한다. ANPC가 건 표정이 있을 때만 초기화한다.
  public func Reset() -> Void {
    let npc: ref<NPCPuppet> = this.npc;
    this.token += 1;
    if this.applied && IsDefined(npc) && npc.IsAttached() {
      let reactions = npc.GetStimReactionComponent();
      if IsDefined(reactions) { reactions.ResetFacial(0.3); }
    }
    this.applied = false;
    this.talking = false;
    this.hasBase = false;
    this.npc = null;
  }

  private static func Feature(npc: ref<NPCPuppet>, category: Int32, idle: Int32) -> Void {
    let feature = new AnimFeature_FacialReaction();
    feature.category = category;
    feature.idle = idle;
    AnimationControllerComponent.ApplyFeature(npc, n"FacialReaction", feature);
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
