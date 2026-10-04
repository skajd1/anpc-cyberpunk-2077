module ANPC

// G2 개발 진입점. 네이티브 NPC 상호작용에만 추가하며 AI 세션은 아직 열지 않는다.
public class EntryToken extends IScriptable {
  public let npc: wref<NPCPuppet>;
  public let player: wref<PlayerPuppet>;
  public let epoch: Int32;
  public let issuedAt: Float;
  public let layer: CName;
  public let hubId: Int32;
  public let characterKey: String;
  public let consumed: Bool;
}

public class EntryStatus extends IScriptable {
  public let sequence: Int32;
  public let reason: String;
  public let accepted: Bool;
}

public class SceneEntryRefresh extends DelayCallback {
  public let entry: wref<Entry>;

  public func Call() -> Void {
    if IsDefined(this.entry) { this.entry.OnRetry(); }
  }
}

// 군중 원작 반응이 끝난 뒤 같은 NPC의 상호작용 선택지를 다시 만들게 한다.
public class CrowdEntryRefresh extends DelayCallback {
  public let npc: wref<NPCPuppet>;

  public func Call() -> Void {
    if IsDefined(this.npc) { this.npc.AnpcRefreshInteraction(); }
  }
}

public class Entry extends ScriptableSystem {
  private let epoch: Int32;
  private let sequence: Int32;
  private let status: ref<EntryStatus>;
  private let sceneOffer: ref<EntryToken>;
  private let consumedHubId: Int32;
  private let retries: Int32;
  private let retryPending: Bool;
  // 처음 다가갔을 때 표시된 원작 메인 허브. 하위 대화 허브와 구분하는 기준이다.
  private let rootNpc: wref<NPCPuppet>;
  private let rootHubId: Int32;
  private let rootChoices: array<String>;
  // 원작 GenericTalk 반응을 실제로 본 군중 객체. 이 객체·세대에만 진입점을 붙인다.
  private let crowdNpc: wref<NPCPuppet>;
  private let crowdEpoch: Int32;
  private let crowdReactedAt: Float;
  private let crowdRetries: Int32;

  private func OnAttach() -> Void { this.Reset(); }
  private func OnRestored(saveVersion: Int32, gameVersion: Int32) -> Void { this.Reset(); }
  private func OnDetach() -> Void { this.Reset(); }

  private func Reset() -> Void {
    this.epoch += 1;
    this.sequence = 0;
    this.status = new EntryStatus();
    this.status.reason = "entry_not_selected";
    this.sceneOffer = null;
    this.consumedHubId = -1;
    this.retries = 0;
    this.retryPending = false;
    this.rootNpc = null;
    this.rootHubId = -1;
    ArrayClear(this.rootChoices);
    this.crowdNpc = null;
    this.crowdReactedAt = 0.0;
  }

  public func MarkCrowdReacted(npc: ref<NPCPuppet>) -> Void {
    this.crowdNpc = npc;
    this.crowdEpoch = this.epoch;
    this.crowdReactedAt = EngineTime.ToFloat(GameInstance.GetSimTime(npc.GetGame()));
    this.crowdRetries = 0;
    let diagnostics = SceneEntryInstaller.Get();
    if IsDefined(diagnostics) { diagnostics.RecordCrowd("reacted record=" + TDBID.ToStringDEBUG(npc.GetRecordID())); }
    let callback = new CrowdEntryRefresh();
    callback.npc = npc;
    GameInstance.GetDelaySystem(npc.GetGame()).DelayCallback(callback, 1.5, false);
  }

  // 원작 반응 후 120초 안의 같은 객체만 허용한다.
  public func CrowdReacted(npc: ref<NPCPuppet>) -> Bool {
    if !IsDefined(this.crowdNpc) || this.crowdNpc != npc || this.crowdEpoch != this.epoch { return false; }
    let age = EngineTime.ToFloat(GameInstance.GetSimTime(npc.GetGame())) - this.crowdReactedAt;
    return age >= 0.0 && age <= 120.0;
  }

  // 원작 반응 대사가 남아 일시적으로 막힌 경우 1초 뒤 최대 5회 선택지를 다시 만든다.
  public func RetryCrowd(npc: ref<NPCPuppet>, blocked: String) -> Void {
    if this.crowdRetries >= 5 || !this.CrowdReacted(npc) { return; }
    if NotEquals(blocked, "npc_in_scene") && NotEquals(blocked, "npc_in_dialogue")
      && NotEquals(blocked, "player_in_dialogue") && NotEquals(blocked, "not_look_at") {
      return;
    }
    this.crowdRetries += 1;
    let callback = new CrowdEntryRefresh();
    callback.npc = npc;
    GameInstance.GetDelaySystem(npc.GetGame()).DelayCallback(callback, 1.0, false);
  }

  public func ClearCrowd() -> Void {
    this.crowdNpc = null;
    this.crowdReactedAt = 0.0;
  }

  public func GetStatus() -> ref<EntryStatus> { return this.status; }

  public static func Get(game: GameInstance) -> ref<Entry> {
    return GameInstance.GetScriptableSystemsContainer(game).Get(n"ANPC.Entry") as Entry;
  }

  public static func IsTalkLayer(layer: CName) -> Bool {
    return Equals(layer, n"GenericTalk") || Equals(layer, n"ReturnTalk");
  }

  public static func Caption() -> String { return "[ANPC] 더 깊은 대화를 해볼까?"; }

  // 선택지 레코드는 원작 Interactions.Talk를 빌려 쓰므로 고유 문구와 토큰 데이터로 소유를 판별한다.
  public static func IsOwned(choice: InteractionChoice) -> Bool {
    return Equals(choice.caption, Entry.Caption()) && ArraySize(choice.data) == 1;
  }

  public static func Safe(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> Bool {
    return Equals(Entry.SafeReason(npc, player), "");
  }

  // 차단 조건 이름을 반환한다. 빈 문자열이면 허용. 조건과 순서는 기존 Safe와 같다.
  public static func SafeReason(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> String {
    if !IsDefined(npc) || !IsDefined(player) || !npc.IsAttached() || !player.IsAttached() { return "missing"; }
    if npc.IsDead() || player.IsDead() { return "dead"; }
    if player.IsInCombat() { return "player_combat"; }
    if !IsDefined(npc.GetPuppetStateBlackboard()) { return "npc_state_unknown"; }
    if NPCPuppet.IsInCombat(npc) { return "npc_combat"; }
    if Vector4.Distance(npc.GetWorldPosition(), player.GetWorldPosition()) > 4.0 { return "too_far"; }
    let game = player.GetGame();
    let menu = GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().UI_System);
    if !IsDefined(menu) || menu.GetBool(GetAllBlackboardDefs().UI_System.IsInMenu) { return "menu"; }
    if IsDefined(GetMountedVehicle(player)) || IsDefined(GetMountedVehicle(npc)) { return "mounted"; }
    let bb = player.GetPlayerStateMachineBlackboard();
    let sceneSystem = GameInstance.GetSceneSystem(game);
    let workspots = GameInstance.GetWorkspotSystem(game);
    if !IsDefined(bb) || !IsDefined(sceneSystem) || !IsDefined(workspots) || !IsDefined(sceneSystem.GetScriptInterface()) {
      return "system_missing";
    }
    let scene = sceneSystem.GetScriptInterface();
    let tier = bb.GetInt(GetAllBlackboardDefs().PlayerStateMachine.HighLevel);
    if tier < 0 || tier > 1 { return "high_level_" + ToString(tier); }
    if scene.IsEntityInScene(npc.GetEntityID()) { return "npc_in_scene"; }
    if scene.IsEntityInDialogue(npc.GetEntityID()) { return "npc_in_dialogue"; }
    // HighLevel 1(SceneTier1)은 장면 참여 상태 자체이며 조작 제한이 없다. 군중 실측에서
    // NPC는 장면 밖인데 플레이어만 장면 참여로 막혔으므로 1단계에서는 플레이어 참여를 허용한다.
    if tier == 0 && scene.IsEntityInScene(player.GetEntityID()) { return "player_in_scene"; }
    if scene.IsEntityInDialogue(player.GetEntityID()) { return "player_in_dialogue"; }
    if workspots.IsActorInWorkspot(player) { return "player_workspot"; }
    // 군중의 워크스팟 점유는 대화 전용으로 허용한다(행동 범위 1.1: 이동·회전 행동 거부).
    if !npc.IsCrowd() && workspots.IsActorInWorkspot(npc) { return "npc_workspot"; }
    let interactions = GameInstance.GetInteractionManager(game);
    if !IsDefined(interactions) || !interactions.IsInteractionLookAtTarget(player, npc) { return "not_look_at"; }
    return "";
  }

  public func CreateChoice(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>, layer: CName) -> InteractionChoice {
    let token = new EntryToken();
    token.npc = npc;
    token.player = player;
    token.epoch = this.epoch;
    token.issuedAt = EngineTime.ToFloat(GameInstance.GetSimTime(player.GetGame()));
    token.layer = layer;
    let choice: InteractionChoice;
    // 존재하지 않는 레코드 이름(ANPC.Entry)을 쓴 선택지는 SetChoices 뒤에도 표시되지 않았다.
    // 원작 Interactions.Talk 레코드를 연결하고 문구는 caption으로 덮어쓴다.
    choice.caption = Entry.Caption();
    InteractionChoiceCaption.AddTextPart(choice.captionParts, choice.caption);
    choice.choiceMetaData.tweakDBID = t"Interactions.Talk";
    choice.doNotTurnOffPreventionSystem = true;
    ChoiceTypeWrapper.SetType(choice.choiceMetaData.type, gameinteractionsChoiceType.Blueline);
    ArrayPush(choice.data, ToVariant(token));
    return choice;
  }

  public func Accept(event: ref<InteractionChoiceEvent>, npc: ref<NPCPuppet>) -> Void {
    this.status = new EntryStatus();
    this.sequence += 1;
    this.status.sequence = this.sequence;
    this.status.reason = "entry_invalid";
    if !IsDefined(event) || ArraySize(event.choice.data) != 1 {
      return;
    }
    let token = FromVariant<ref<EntryToken>>(event.choice.data[0]);
    if !IsDefined(token) || token.consumed {
      return;
    }
    token.consumed = true;
    let player = event.activator as PlayerPuppet;
    let age = EngineTime.ToFloat(GameInstance.GetSimTime(this.GetGameInstance())) - token.issuedAt;
    if token.epoch != this.epoch || !IsDefined(token.npc) || !IsDefined(token.player)
      || token.npc != npc || token.player != player || event.hotspot != npc
      || NotEquals(token.layer, event.layerData.tag) || age < 0.0 || age > 30.0 {
      return;
    }
    this.status.reason = "entry_state_blocked";
    if !Entry.Safe(npc, player) {
      return;
    }
    this.status.accepted = true;
    this.status.reason = "entry_confirmed_ai_not_connected";
    if npc.IsCrowd() {
      this.ClearCrowd();
      npc.AnpcRefreshInteraction();
    }
    Entry.ShowMessage(player.GetGame(), "[ANPC] 진입을 선택했습니다. AI 대화는 아직 연결되지 않았습니다.");
  }

  public static func ShowMessage(game: GameInstance, text: String) -> Void {
    let message: SimpleScreenMessage;
    message.isShown = true;
    message.duration = 3.0;
    message.message = text;
    GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().UI_Notifications)
      .SetVariant(GetAllBlackboardDefs().UI_Notifications.WarningMessage, ToVariant(message), true);
  }

  // 대화 위젯이 표시 데이터를 갱신할 때 호출한다. true면 ANPC 허브를 덧붙인다.
  public func OfferScene(player: ref<PlayerPuppet>, nativeHubs: Int32) -> Bool {
    let diagnostics = SceneEntryInstaller.Get();
    if nativeHubs == 0 {
      // 원작 대화 목록이 닫히면 같은 허브에 대한 소비 기록을 지운다.
      this.sceneOffer = null;
      this.consumedHubId = -1;
      this.retries = 0;
      if IsDefined(diagnostics) { diagnostics.RecordOffer("no_native_hub", false); }
      return false;
    }
    let candidate = SceneEntry.FindCandidate(player);
    if !IsDefined(candidate) || !IsDefined(candidate.npc) {
      this.sceneOffer = null;
      if IsDefined(diagnostics) { diagnostics.RecordOffer("no_supported_speaker", false); }
      return false;
    }
    if candidate.hubId < 0 {
      this.sceneOffer = null;
      if IsDefined(diagnostics) { diagnostics.RecordOffer("state_blocked", false); }
      // 허브 표시 직후에는 장면 상태가 늦게 반영될 수 있어 짧게 몇 번만 다시 검사한다.
      this.ScheduleRetry(player);
      return false;
    }
    let npc: ref<NPCPuppet> = candidate.npc;
    let hubId = candidate.hubId;
    if !this.IsRootHub(npc, hubId, SceneEntry.HubChoiceNames(player.GetGame(), hubId)) {
      this.sceneOffer = null;
      if IsDefined(diagnostics) { diagnostics.RecordOffer("not_root_hub=" + ToString(hubId), false); }
      return false;
    }
    if hubId == this.consumedHubId {
      if IsDefined(diagnostics) { diagnostics.RecordOffer("consumed", false); }
      return false;
    }
    if !IsDefined(this.sceneOffer) || this.sceneOffer.consumed || this.sceneOffer.npc != npc
      || this.sceneOffer.player != player || this.sceneOffer.hubId != hubId || this.sceneOffer.epoch != this.epoch {
      let token = new EntryToken();
      token.npc = npc;
      token.player = player;
      token.epoch = this.epoch;
      token.issuedAt = EngineTime.ToFloat(GameInstance.GetSimTime(player.GetGame()));
      token.layer = n"ANPCEntryScene";
      token.hubId = hubId;
      token.characterKey = candidate.characterKey;
      this.sceneOffer = token;
    }
    this.retries = 0;
    if IsDefined(diagnostics) {
      diagnostics.RecordOffer("shown key=" + candidate.characterKey + " hub=" + ToString(hubId), true);
    }
    return true;
  }

  // 허브 ID는 실행 중 임시 값이라 ID가 같거나, 선택지 문구가 메인 허브와 과반 겹칠 때만
  // 메인 허브로 본다. 주제가 소진돼 문구가 줄어도 따라가도록 일치할 때마다 기준을 갱신한다.
  private func IsRootHub(npc: ref<NPCPuppet>, hubId: Int32, choices: array<String>) -> Bool {
    if !IsDefined(this.rootNpc) || this.rootNpc != npc {
      this.rootNpc = npc;
      this.rootHubId = hubId;
      this.rootChoices = choices;
      return true;
    }
    let matched = hubId == this.rootHubId;
    if !matched {
      let common = 0;
      let i = 0;
      while i < ArraySize(choices) {
        if ArrayContains(this.rootChoices, choices[i]) { common += 1; }
        i += 1;
      }
      matched = common >= 2 && common * 2 > Max(ArraySize(choices), ArraySize(this.rootChoices));
    }
    if matched {
      this.rootHubId = hubId;
      this.rootChoices = choices;
    }
    return matched;
  }

  private func ScheduleRetry(player: ref<PlayerPuppet>) -> Void {
    if !IsDefined(player) || this.retryPending || this.retries >= 10 { return; }
    this.retries += 1;
    this.retryPending = true;
    let callback = new SceneEntryRefresh();
    callback.entry = this;
    GameInstance.GetDelaySystem(player.GetGame()).DelayCallback(callback, 0.5, false);
  }

  public func OnRetry() -> Void {
    this.retryPending = false;
    SceneEntry.RefreshDialogs(this.GetGameInstance());
  }

  public func GetSceneHubId() -> Int32 {
    if !IsDefined(this.sceneOffer) || this.sceneOffer.consumed { return -1; }
    return this.sceneOffer.hubId;
  }

  // 원작 허브가 그대로 표시된 동안 받은 ANPC 선택만 1회 소비한다. 원작 선택은 실행하지 않는다.
  public func AcceptScene(player: ref<PlayerPuppet>) -> Bool {
    let token = this.sceneOffer;
    if !IsDefined(token) || token.consumed { return false; }
    token.consumed = true;
    this.sceneOffer = null;
    this.consumedHubId = token.hubId;
    this.status = new EntryStatus();
    this.sequence += 1;
    this.status.sequence = this.sequence;
    this.status.reason = "entry_invalid";
    if token.epoch == this.epoch && IsDefined(token.npc) && IsDefined(player) && token.player == player {
      this.status.reason = "entry_state_blocked";
      if SceneEntry.MatchedHubId(token.npc, player) == token.hubId {
        this.status.reason = "entry_selected_waiting_original_handoff";
      }
    }
    let diagnostics = SceneEntryInstaller.Get();
    if IsDefined(diagnostics) { diagnostics.RecordInput(this.status.reason); }
    if IsDefined(player) {
      Entry.ShowMessage(player.GetGame(), Equals(this.status.reason, "entry_selected_waiting_original_handoff")
        ? "[ANPC] 진입을 선택했습니다. AI 대화는 아직 연결되지 않았습니다."
        : "[ANPC] 대화 상태가 바뀌어 진입을 취소했습니다.");
      SceneEntry.RefreshDialogs(player.GetGame());
    }
    return true;
  }
}

@wrapMethod(ScriptedPuppetPS)
private final func PushChoicesToInteractionComponent(interactionComponent: ref<InteractionComponent>, const context: script_ref<GetActionsContext>, choices: script_ref<array<InteractionChoice>>) -> Void {
  wrappedMethod(interactionComponent, context, choices);
  let layer = Deref(context).interactionLayerTag;
  let npc = this.GetOwnerEntity() as NPCPuppet;
  let player: ref<PlayerPuppet>;
  let entry: ref<Entry>;
  let hasEntry: Bool;
  let i: Int32 = 0;
  let appended = Deref(choices);
  if Equals(Deref(context).requestType, gamedeviceRequestType.Direct)
    && Entry.IsTalkLayer(layer) && IsDefined(npc) && npc.IsCrowd() {
    player = GetPlayer(npc.GetGame());
    entry = Entry.Get(npc.GetGame());
    while i < ArraySize(appended) {
      if Entry.IsOwned(appended[i]) { hasEntry = true; }
      i += 1;
    }
    // ReturnTalk 레이어는 원작에서 기본 비활성이라 군중에게 나타나지 않았다.
    // 같은 군중 객체의 GenericTalk 원작 반응을 본 뒤에만 진입점을 붙인다(원작 선택지가 쿨다운으로 비어도 허용).
    let reacted = IsDefined(entry) && entry.CrowdReacted(npc);
    let blocked = Entry.SafeReason(npc, player);
    let safe = Equals(blocked, "");
    let diagnostics = SceneEntryInstaller.Get();
    if IsDefined(diagnostics) {
      diagnostics.RecordCrowd("push layer=" + NameToString(layer) + " choices=" + ToString(ArraySize(appended))
        + " reacted=" + ToString(reacted) + " safe=" + ToString(safe) + " blocked=" + blocked);
    }
    if !hasEntry && reacted && !safe { entry.RetryCrowd(npc, blocked); }
    if !hasEntry && reacted && safe {
      ArrayPush(appended, entry.CreateChoice(npc, player, layer));
      interactionComponent.SetChoices(appended, layer);
      if IsDefined(diagnostics) { diagnostics.RecordCrowd("appended layer=" + NameToString(layer)); }
    }
  }
}

@addMethod(ScriptedPuppet)
public func AnpcRefreshInteraction() -> Void {
  this.DetermineInteractionStateByTask();
}

@wrapMethod(ScriptedPuppet)
protected cb func OnInteractionUsed(event: ref<InteractionChoiceEvent>) -> Bool {
  if Entry.IsOwned(event.choice) {
    let npc = this as NPCPuppet;
    let entry = Entry.Get(this.GetGame());
    if IsDefined(entry) { entry.Accept(event, npc); }
    return true;
  }
  let result = wrappedMethod(event);
  let crowd = this as NPCPuppet;
  if Equals(event.layerData.tag, n"GenericTalk") && IsDefined(crowd) && crowd.IsCrowd() {
    let entry = Entry.Get(this.GetGame());
    if IsDefined(entry) { entry.MarkCrowdReacted(crowd); }
  }
  return result;
}

@wrapMethod(ScriptedPuppet)
protected cb func OnInteraction(event: ref<InteractionChoiceEvent>) -> Bool {
  if Entry.IsOwned(event.choice) { return true; }
  return wrappedMethod(event);
}

// 군중 선택지는 원작 Interactions.Talk 레코드 문구("대화")로 표시된다. 상호작용 위젯이
// 받은 표시 데이터에서 ANPC 토큰을 가진 항목의 문구만 바꾼다. 선택·실행 데이터는 그대로다.
@wrapMethod(interactionWidgetGameController)
private final func UpadateChoiceData() -> Void {
  let i = 0;
  while i < ArraySize(this.m_currentOptions) {
    let option = this.m_currentOptions[i];
    if ArraySize(option.data) == 1 && IsDefined(FromVariant<ref<EntryToken>>(option.data[0])) {
      option.localizedName = Entry.Caption();
      this.m_currentOptions[i] = option;
    }
    i += 1;
  }
  wrappedMethod();
}
