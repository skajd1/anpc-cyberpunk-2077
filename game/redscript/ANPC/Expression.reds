module ANPC

// 행동 규격 react_with_expression(UF-74)과 말하기 입모양(UF-75). 몸·위치·워크스팟·장비는 건드리지 않는다.
// 원작 표정 기능(AnimFeature_FacialReaction의 category·idle)을 쓰며 ANPC가 건 표정만 기억해 ResetFacial로 되돌린다.
// 보이는 표정을 다른 표정으로 바로 바꾸면 무시되므로(말하기 → 감정 표정 전환에서 입이 계속 움직였다) 항상 ResetFacial을 거친다.
// 감정 표정은 초기화 뒤 0.5초에 적용한다(초기화와 같은 프레임에 걸면 덮이는 경우가 있다).
// 말하기는 첫 음성(Begin)부터 마지막 구간 끝(EndTalk)까지이며, 그 안에서 소리 나는 구간만 입을 연다(Open/Pause).
// 말하는 동안 예약된 감정 표정은 기억만 하고 EndTalk 뒤에 적용한다.
public class NpcExpression extends IScriptable {
  private let npc: wref<NPCPuppet>;
  private let applied: Bool;
  private let token: Int32;
  private let talkToken: Int32;
  private let hasBase: Bool;
  private let baseCategory: Int32;
  private let baseIdle: Int32;
  private let talking: Bool;
  // 지금 보이는 ANPC 얼굴: 0 없음(초기화), 1 감정 표정, 2 말하기.
  private let shown: Int32;

  public static func ApplyDelay() -> Float { return 0.5; }

  // 감정 표정이 보이는 중에 입을 열 때 초기화 뒤 말하기 적용까지의 간격.
  public static func OpenDelay() -> Float { return 0.3; }

  // 말하기 입모양 표정의 분류(로컬 자원 ANPC_talk 아카이브가 facial_reactions에 추가한 행).
  public static func TalkCategory() -> Int32 { return 4; }

  public func Apply(npc: ref<NPCPuppet>, category: Int32, idle: Int32) -> Bool {
    if !this.Use(npc) { return false; }
    this.token += 1;
    this.hasBase = true;
    this.baseCategory = category;
    this.baseIdle = idle;
    if this.talking { return true; }
    this.Clear();
    this.Schedule(npc, NpcExpression.ApplyDelay());
    return true;
  }

  public func Commit(npc: ref<NPCPuppet>, token: Int32, category: Int32, idle: Int32) -> Void {
    let current: ref<NPCPuppet> = this.npc;
    if !this.applied || this.talking || token != this.token || current != npc || !IsDefined(npc) || !npc.IsAttached() || npc.IsDead() { return; }
    NpcExpression.Feature(npc, category, idle);
    this.shown = 1;
  }

  // 말하기 시작. 얼굴은 바꾸지 않고 이후 감정 표정을 기억만 하게 한다.
  public func Begin(npc: ref<NPCPuppet>) -> Bool {
    if !this.Use(npc) { return false; }
    this.talking = true;
    this.token += 1;
    return true;
  }

  public func Open(npc: ref<NPCPuppet>, idle: Int32) -> Bool {
    let current: ref<NPCPuppet> = this.npc;
    if !this.talking || current != npc || !IsDefined(npc) || !npc.IsAttached() || npc.IsDead() { return false; }
    if this.shown == 2 { return true; }
    if this.shown == 1 { return this.Switch(npc, idle); }
    this.talkToken += 1;
    NpcExpression.Feature(npc, NpcExpression.TalkCategory(), idle);
    this.shown = 2;
    return true;
  }

  // 보이는 얼굴을 초기화한 뒤 말하기 변형을 건다(확인 도구의 변형 바꾸기에도 쓴다).
  public func Switch(npc: ref<NPCPuppet>, idle: Int32) -> Bool {
    let current: ref<NPCPuppet> = this.npc;
    if !this.talking || current != npc || !IsDefined(npc) { return false; }
    this.talkToken += 1;
    this.Clear();
    let step = new NpcTalkStep();
    step.owner = this;
    step.npc = npc;
    step.token = this.talkToken;
    step.idle = idle;
    GameInstance.GetDelaySystem(npc.GetGame()).DelayCallback(step, NpcExpression.OpenDelay(), false);
    return true;
  }

  public func OpenNow(npc: ref<NPCPuppet>, token: Int32, idle: Int32) -> Void {
    let current: ref<NPCPuppet> = this.npc;
    if !this.talking || token != this.talkToken || current != npc || !IsDefined(npc) || !npc.IsAttached() || npc.IsDead() { return; }
    NpcExpression.Feature(npc, NpcExpression.TalkCategory(), idle);
    this.shown = 2;
  }

  // 말하는 중 쉼: 입을 닫는다(초기화). 감정 표정은 말하기가 끝난 뒤 돌아온다.
  public func Pause() -> Void {
    this.talkToken += 1;
    if this.shown == 2 { this.Clear(); }
  }

  public func EndTalk() -> Void {
    if !this.talking { return; }
    this.talking = false;
    this.talkToken += 1;
    this.token += 1;
    let npc: ref<NPCPuppet> = this.npc;
    if !IsDefined(npc) || !npc.IsAttached() { return; }
    if this.shown != 0 { this.Clear(); }
    if this.hasBase { this.Schedule(npc, NpcExpression.ApplyDelay()); }
  }

  // 새 표정 예약도 무효화한다. ANPC가 건 표정이 있을 때만 초기화한다.
  public func Reset() -> Void {
    let npc: ref<NPCPuppet> = this.npc;
    this.token += 1;
    this.talkToken += 1;
    if this.applied && IsDefined(npc) && npc.IsAttached() {
      let reactions = npc.GetStimReactionComponent();
      if IsDefined(reactions) { reactions.ResetFacial(0.3); }
    }
    this.applied = false;
    this.talking = false;
    this.hasBase = false;
    this.shown = 0;
    this.npc = null;
  }

  // 대상 NPC를 정한다. 다른 NPC에 건 표정이 있으면 먼저 되돌린다.
  private func Use(npc: ref<NPCPuppet>) -> Bool {
    if !IsDefined(npc) || !npc.IsAttached() || npc.IsDead() || !IsDefined(npc.GetStimReactionComponent()) { return false; }
    let current: ref<NPCPuppet> = this.npc;
    if this.applied && IsDefined(current) && current != npc { this.Reset(); }
    this.npc = npc;
    this.applied = true;
    return true;
  }

  private func Clear() -> Void {
    let npc: ref<NPCPuppet> = this.npc;
    this.shown = 0;
    if !IsDefined(npc) { return; }
    let reactions = npc.GetStimReactionComponent();
    if IsDefined(reactions) { reactions.ResetFacial(0.0); }
  }

  private func Schedule(npc: ref<NPCPuppet>, delay: Float) -> Void {
    let step = new NpcExpressionStep();
    step.owner = this;
    step.npc = npc;
    step.token = this.token;
    step.category = this.baseCategory;
    step.idle = this.baseIdle;
    GameInstance.GetDelaySystem(npc.GetGame()).DelayCallback(step, delay, false);
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

public class NpcTalkStep extends DelayCallback {
  public let owner: wref<NpcExpression>;
  public let npc: wref<NPCPuppet>;
  public let token: Int32;
  public let idle: Int32;

  public func Call() -> Void {
    let owner: ref<NpcExpression> = this.owner;
    let npc: ref<NPCPuppet> = this.npc;
    if IsDefined(owner) && IsDefined(npc) { owner.OpenNow(npc, this.token, this.idle); }
  }
}
