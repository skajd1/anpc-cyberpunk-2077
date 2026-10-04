module ANPC

// 지원 인물 표에 있는 커뮤니티 NPC의 원작 메인 허브에 붙이는 G2 후보. AI/원작 제어 종료는 실행하지 않는다.
// 원작 장면 허브는 엔진 장면 시스템이 소유하며, 별도 InteractionComponent 허브는
// 같은 대화 목록에 합쳐지지 않았다(활성 입력 레이어 1개·DialogChoiceHubs 변화 없음).
// 그래서 대화 위젯 표시 데이터에 ANPC 허브를 덧붙이고, 위젯이 직접 받은 스크롤/F 입력으로
// ANPC 초점을 관리한다. Choice2(R)는 보조 선택으로 남긴다.
public class SceneEntryCandidate extends IScriptable {
  public let npc: wref<NPCPuppet>;
  public let hubId: Int32;
  public let characterKey: String;
}

public class SceneEntryInstaller extends ScriptableService {
  private let registered: Bool;
  private let initialized: Int32;
  private let tracked: array<wref<NPCPuppet>>;
  private let decorated: Int32;
  private let lastOffer: String;
  private let lastSpeaker: String;
  private let inputs: Int32;
  private let lastInput: String;
  private let actions: Int32;
  private let lastAction: String;
  private let lastCrowd: String;

  public func GetStatus() -> String {
    return "registered=" + ToString(this.registered) + " initialized=" + ToString(this.initialized)
      + " tracked=" + ToString(ArraySize(this.tracked)) + " decorated=" + ToString(this.decorated)
      + " lastOffer=" + this.lastOffer + " lastSpeaker=" + this.lastSpeaker
      + " inputs=" + ToString(this.inputs) + " lastInput=" + this.lastInput
      + " actions=" + ToString(this.actions) + " lastAction=" + this.lastAction
      + " lastCrowd=" + this.lastCrowd;
  }

  public static func Get() -> ref<SceneEntryInstaller> {
    return GameInstance.GetScriptableServiceContainer().GetService(n"ANPC.SceneEntryInstaller") as SceneEntryInstaller;
  }

  public func RecordOffer(reason: String, shown: Bool) -> Void {
    if shown { this.decorated += 1; }
    this.lastOffer = reason;
  }

  // 원작 허브 화자의 실측 레코드. 지원 인물 표를 채울 때 CET 진단에서 읽는다.
  public func RecordSpeaker(npc: ref<NPCPuppet>, title: String, key: String, highLevel: Int32) -> Void {
    this.lastSpeaker = "title=" + SceneEntry.ResolveTitle(title) + " record=" + TDBID.ToStringDEBUG(npc.GetRecordID())
      + " key=" + key + " crowd=" + ToString(npc.IsCrowd()) + " highLevel=" + ToString(highLevel);
  }

  public func RecordCrowd(reason: String) -> Void {
    this.lastCrowd = reason;
  }

  public func RecordInput(reason: String) -> Void {
    this.inputs += 1;
    this.lastInput = reason;
  }

  public func RecordAction(reason: String) -> Void {
    this.actions += 1;
    this.lastAction = reason;
  }

  // 허브 제목과 이름이 일치하는 화자가 없을 때 가장 가까운 NPC를 진단에만 남긴다.
  public func RecordSpeakerMissing(player: ref<PlayerPuppet>, title: String) -> Void {
    let nearest: ref<NPCPuppet>;
    let nearestDistance = 4.0;
    let i = 0;
    while i < ArraySize(this.tracked) {
      let npc: ref<NPCPuppet> = this.tracked[i];
      if IsDefined(npc) && npc.IsAttached() {
        let distance = Vector4.Distance(npc.GetWorldPosition(), player.GetWorldPosition());
        if distance <= nearestDistance {
          nearest = npc;
          nearestDistance = distance;
        }
      }
      i += 1;
    }
    this.lastSpeaker = "title=" + SceneEntry.ResolveTitle(title) + " speaker=none";
    if IsDefined(nearest) {
      this.lastSpeaker += " nearest=" + GetLocalizedText(nearest.GetDisplayName())
        + " record=" + TDBID.ToStringDEBUG(nearest.GetRecordID());
    }
  }

  // 표시 이름이 허브 제목과 같은 4m 이내의 살아 있는 NPC 중 가장 가까운 객체.
  public func FindSpeaker(player: ref<PlayerPuppet>, title: String) -> ref<NPCPuppet> {
    let best: ref<NPCPuppet>;
    let bestDistance = 4.0;
    let i = 0;
    while i < ArraySize(this.tracked) {
      let npc: ref<NPCPuppet> = this.tracked[i];
      if IsDefined(npc) && npc.IsAttached() && !npc.IsDead()
        && SceneEntry.TitleMatches(title, npc) {
        let distance = Vector4.Distance(npc.GetWorldPosition(), player.GetWorldPosition());
        if distance <= bestDistance {
          best = npc;
          bestDistance = distance;
        }
      }
      i += 1;
    }
    return best;
  }

  private cb func OnLoad() -> Void {
    GameInstance.GetCallbackSystem().RegisterCallback(n"Entity/Initialize", this, n"OnEntityInitialize", true)
      .AddTarget(EntityTarget.Type(n"NPCPuppet")).SetLifetime(CallbackLifetime.Forever);
    this.registered = true;
  }

  private cb func OnEntityInitialize(event: ref<EntityLifecycleEvent>) -> Void {
    this.initialized += 1;
    let npc = event.GetEntity() as NPCPuppet;
    if !IsDefined(npc) { return; }
    let alive: array<wref<NPCPuppet>>;
    let i = 0;
    while i < ArraySize(this.tracked) {
      if IsDefined(this.tracked[i]) { ArrayPush(alive, this.tracked[i]); }
      i += 1;
    }
    ArrayPush(alive, npc);
    this.tracked = alive;
  }
}

public abstract class SceneEntry {
  // 원작 허브 ID와 겹치지 않도록 고정한 표시 전용 ID. 엔진은 이 허브를 알지 못한다.
  public static func HubId() -> Int32 { return 1095651395; }

  // 수작업 인물 표. 빅터·미스티는 실게임 실측, 나머지는 2.31 TweakDB에서 레코드 ID와
  // displayName·voiceTag 항목이 모두 존재함을 확인한 기본 레코드다. 이름·외형만으로 추가하지 않는다.
  // 리버는 기본 레코드를 찾지 못해 실측 후 추가한다. johnny_replacer(V가 조니로 조작)는 제외한다.
  public static func CharacterKey(record: TweakDBID) -> String {
    if Equals(record, t"Character.Victor_Vector") { return "viktor"; }
    if Equals(record, t"Character.Misty") || Equals(record, t"Character.q307_misty") { return "misty"; }
    if Equals(record, t"Character.Judy") { return "judy"; }
    if Equals(record, t"Character.Panam") { return "panam"; }
    if Equals(record, t"Character.Jackie") { return "jackie"; }
    if Equals(record, t"Character.Rogue") { return "rogue"; }
    if Equals(record, t"Character.Takemura") { return "goro"; }
    if Equals(record, t"Character.Kerry") { return "kerry"; }
    if Equals(record, t"Character.Evelyn") { return "evelyn"; }
    if Equals(record, t"Character.songbird") { return "songbird"; }
    if Equals(record, t"Character.Silverhand") { return "johnny"; }
    return "";
  }

  public static func OfferAllowed(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> Bool {
    return SceneEntry.MatchedHubId(npc, player) >= 0;
  }

  public static func HighLevel(player: ref<PlayerPuppet>) -> Int32 {
    let bb = player.GetPlayerStateMachineBlackboard();
    if !IsDefined(bb) { return -1; }
    return bb.GetInt(GetAllBlackboardDefs().PlayerStateMachine.HighLevel);
  }

  // 지원 인물·근거리·생존/비전투·차량/메뉴 밖·HighLevel 1~2·원작 선택 대기 상태.
  // 빅터·미스티는 HighLevel 2, 로그는 1에서 원작 허브가 표시됐다. 3 이상(시네마틱)은 거부한다.
  public static func StateAllowed(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> Bool {
    if !IsDefined(npc) || !IsDefined(player) || !npc.IsAttached() || !player.IsAttached()
      || npc.IsCrowd() || Equals(SceneEntry.CharacterKey(npc.GetRecordID()), "") || npc.IsDead() || player.IsDead()
      || player.IsInCombat() || !IsDefined(npc.GetPuppetStateBlackboard()) || NPCPuppet.IsInCombat(npc)
      || Vector4.Distance(npc.GetWorldPosition(), player.GetWorldPosition()) > 4.0
      || IsDefined(GetMountedVehicle(player)) || IsDefined(GetMountedVehicle(npc)) {
      return false;
    }
    let game = player.GetGame();
    let menu = GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().UI_System);
    let scenes = GameInstance.GetSceneSystem(game);
    if !IsDefined(menu) || menu.GetBool(GetAllBlackboardDefs().UI_System.IsInMenu)
      || SceneEntry.HighLevel(player) < 1 || SceneEntry.HighLevel(player) > 2 || !IsDefined(scenes) || !IsDefined(scenes.GetScriptInterface()) {
      return false;
    }
    let scene = scenes.GetScriptInterface();
    // 빅터 원작 선택 대기에서는 두 객체가 scene에 있지만 dialogue 판정은 false다.
    return scene.IsEntityInScene(player.GetEntityID()) && scene.IsEntityInScene(npc.GetEntityID())
      && !scene.IsEntityInDialogue(player.GetEntityID()) && !scene.IsEntityInDialogue(npc.GetEntityID());
  }

  // 허브 제목은 번역된 이름(빅터) 또는 번역 키 원문(미스티: LocKey#...)으로 들어온다.
  public static func ResolveTitle(title: String) -> String {
    if StrBeginsWith(title, "LocKey#") { return GetLocalizedText(title); }
    return title;
  }

  // 화자 탐색용 이름 비교. 인물 판정은 레코드 표로만 한다.
  public static func TitleMatches(title: String, npc: ref<NPCPuppet>) -> Bool {
    let resolved = SceneEntry.ResolveTitle(title);
    let name = GetLocalizedText(npc.GetDisplayName());
    if StrLen(resolved) == 0 || StrLen(name) == 0 { return false; }
    return Equals(resolved, name) || StrContains(resolved, name) || StrContains(name, resolved);
  }

  public static func NativeHubs(game: GameInstance) -> DialogChoiceHubs {
    let hubs: DialogChoiceHubs;
    let interactions = GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().UIInteractions);
    if IsDefined(interactions) {
      hubs = FromVariant<DialogChoiceHubs>(interactions.GetVariant(GetAllBlackboardDefs().UIInteractions.DialogChoiceHubs));
    }
    return hubs;
  }

  public static func IsWaitingHub(hub: ListChoiceHubData) -> Bool {
    return hub.id != SceneEntry.HubId() && ArraySize(hub.choices) > 0 && !IsDefined(hub.timeProvider);
  }

  // 조건을 모두 통과하면 이 NPC 이름과 일치하는 타이머 없는 원작 허브 ID, 아니면 -1.
  public static func MatchedHubId(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> Int32 {
    if !SceneEntry.StateAllowed(npc, player) { return -1; }
    let hubs = SceneEntry.NativeHubs(player.GetGame());
    let i = 0;
    while i < ArraySize(hubs.choiceHubs) {
      if SceneEntry.IsWaitingHub(hubs.choiceHubs[i]) && SceneEntry.TitleMatches(hubs.choiceHubs[i].title, npc) {
        return hubs.choiceHubs[i].id;
      }
      i += 1;
    }
    return -1;
  }

  // 표시 중인 원작 허브 제목으로 화자를 찾고, 지원 인물이면서 조건을 통과한 첫 허브를 고른다.
  // 지원 인물은 찾았지만 조건이 막혔으면 hubId=-1 후보를, 지원 인물이 없으면 null을 반환한다.
  public static func FindCandidate(player: ref<PlayerPuppet>) -> ref<SceneEntryCandidate> {
    let installer = SceneEntryInstaller.Get();
    if !IsDefined(installer) || !IsDefined(player) { return null; }
    let blocked: ref<SceneEntryCandidate>;
    let hubs = SceneEntry.NativeHubs(player.GetGame());
    let i = 0;
    while i < ArraySize(hubs.choiceHubs) {
      if SceneEntry.IsWaitingHub(hubs.choiceHubs[i]) {
        let npc = installer.FindSpeaker(player, hubs.choiceHubs[i].title);
        if !IsDefined(npc) {
          installer.RecordSpeakerMissing(player, hubs.choiceHubs[i].title);
        } else {
          let key = SceneEntry.CharacterKey(npc.GetRecordID());
          installer.RecordSpeaker(npc, hubs.choiceHubs[i].title, key, SceneEntry.HighLevel(player));
          if SceneEntry.MatchedHubId(npc, player) == hubs.choiceHubs[i].id {
            let candidate = new SceneEntryCandidate();
            candidate.npc = npc;
            candidate.hubId = hubs.choiceHubs[i].id;
            candidate.characterKey = key;
            return candidate;
          }
          if NotEquals(key, "") && !IsDefined(blocked) {
            blocked = new SceneEntryCandidate();
            blocked.npc = npc;
            blocked.hubId = -1;
            blocked.characterKey = key;
          }
        }
      }
      i += 1;
    }
    return blocked;
  }

  public static func HubChoiceNames(game: GameInstance, hubId: Int32) -> array<String> {
    let names: array<String>;
    let interactions = GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().UIInteractions);
    if !IsDefined(interactions) { return names; }
    let hubs = FromVariant<DialogChoiceHubs>(interactions.GetVariant(GetAllBlackboardDefs().UIInteractions.DialogChoiceHubs));
    let i = 0;
    while i < ArraySize(hubs.choiceHubs) {
      if hubs.choiceHubs[i].id == hubId {
        let j = 0;
        while j < ArraySize(hubs.choiceHubs[i].choices) {
          ArrayPush(names, hubs.choiceHubs[i].choices[j].localizedName);
          j += 1;
        }
        return names;
      }
      i += 1;
    }
    return names;
  }

  public static func CreateHub() -> ListChoiceHubData {
    let choice: ListChoiceData;
    choice.localizedName = "더 깊은 대화를 해볼까?";
    choice.inputActionName = n"None";
    ChoiceTypeWrapper.SetType(choice.type, gameinteractionsChoiceType.Blueline);
    let hub: ListChoiceHubData;
    hub.id = SceneEntry.HubId();
    hub.activityState = EVisualizerActivityState.Available;
    hub.flags = EVisualizerDefinitionFlags.None;
    hub.title = "ANPC";
    ArrayPush(hub.choices, choice);
    return hub;
  }

  public static func RefreshDialogs(game: GameInstance) -> Void {
    let interactions = GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().UIInteractions);
    if IsDefined(interactions) {
      interactions.SignalVariant(GetAllBlackboardDefs().UIInteractions.DialogChoiceHubs);
    }
  }
}

// 원작 허브 데이터는 그대로 두고 위젯이 그릴 목록에만 ANPC 허브를 덧붙인다.
// 엔진의 허브 선택 값(m_activeHubID/m_selectedIndex)은 바꾸지 않고, ANPC 초점일 때만
// 그리는 동안 잠시 ANPC 허브를 선택 상태로 보이게 한다.
@addField(dialogWidgetGameController)
private let anpcOffered: Bool;

@addField(dialogWidgetGameController)
private let anpcFocus: Bool;

@addField(dialogWidgetGameController)
private let anpcInputOwner: wref<GameObject>;

@wrapMethod(dialogWidgetGameController)
protected func UpdateDialogsData(const data: script_ref<DialogChoiceHubs>) -> Void {
  wrappedMethod(data);
  this.anpcOffered = false;
  let player = this.GetPlayerControlledObject() as PlayerPuppet;
  let entry: ref<Entry>;
  if IsDefined(player) { entry = Entry.Get(player.GetGame()); }
  if IsDefined(entry) && entry.OfferScene(player, ArraySize(this.m_data.choiceHubs)) {
    let decorated = this.m_data;
    let hubs = decorated.choiceHubs;
    ArrayPush(hubs, SceneEntry.CreateHub());
    decorated.choiceHubs = hubs;
    this.m_data = decorated;
    this.anpcOffered = true;
    this.AnpcEnsureInput(player);
  }
  if !this.anpcOffered { this.anpcFocus = false; }
}

@wrapMethod(dialogWidgetGameController)
protected func OnInteractionsChanged() -> Void {
  if !this.anpcFocus || !this.anpcOffered {
    wrappedMethod();
    return;
  }
  let hubId = this.m_activeHubID;
  let index = this.m_selectedIndex;
  this.m_activeHubID = SceneEntry.HubId();
  this.m_selectedIndex = 0;
  wrappedMethod();
  this.m_activeHubID = hubId;
  this.m_selectedIndex = index;
}

// ANPC 초점 중 엔진 선택이 움직였다면 입력 소비가 엔진을 막지 못한 것이다.
// 이때 F가 원작 항목을 실행할 수 있으므로 초점을 즉시 원작 쪽으로 돌린다.
@wrapMethod(dialogWidgetGameController)
protected cb func OnDialogsSelectIndex(index: Int32) -> Bool {
  if this.anpcFocus && index != this.m_selectedIndex { this.AnpcDropFocus("native_index_moved"); }
  return wrappedMethod(index);
}

@wrapMethod(dialogWidgetGameController)
protected cb func OnDialogsActivateHub(activeHubId: Int32) -> Bool {
  if this.anpcFocus && activeHubId != this.m_activeHubID { this.AnpcDropFocus("native_hub_moved"); }
  return wrappedMethod(activeHubId);
}

@wrapMethod(dialogWidgetGameController)
protected cb func OnUninitialize() -> Bool {
  if IsDefined(this.anpcInputOwner) { this.anpcInputOwner.UnregisterInputListener(this); }
  this.anpcInputOwner = null;
  return wrappedMethod();
}

// 대화 중 처음 등록한 입력 리스너는 입력 상태가 한 번 바뀐 뒤에야 동작했다(첫 접근 ↓ 무반응,
// 물러났다 재접근 시 정상). 위젯 생성·플레이어 연결 시점에 미리 등록한다.
@wrapMethod(dialogWidgetGameController)
protected cb func OnInitialize() -> Bool {
  let result = wrappedMethod();
  let player = this.GetPlayerControlledObject();
  if IsDefined(player) { this.AnpcEnsureInput(player); }
  return result;
}

@addMethod(dialogWidgetGameController)
protected cb func OnPlayerAttach(playerPuppet: ref<GameObject>) -> Bool {
  if IsDefined(playerPuppet) { this.AnpcEnsureInput(playerPuppet); }
}

@addMethod(dialogWidgetGameController)
private func AnpcEnsureInput(player: ref<GameObject>) -> Void {
  if this.anpcInputOwner == player { return; }
  if IsDefined(this.anpcInputOwner) { this.anpcInputOwner.UnregisterInputListener(this); }
  player.RegisterInputListener(this, n"ChoiceApply");
  player.RegisterInputListener(this, n"ChoiceScrollUp");
  player.RegisterInputListener(this, n"ChoiceScrollDown");
  player.RegisterInputListener(this, n"Choice2");
  this.anpcInputOwner = player;
}

@addMethod(dialogWidgetGameController)
private func AnpcDropFocus(reason: String) -> Void {
  this.anpcFocus = false;
  let diagnostics = SceneEntryInstaller.Get();
  if IsDefined(diagnostics) { diagnostics.RecordInput(reason); }
}

@addMethod(dialogWidgetGameController)
private func AnpcAtLastNativeChoice(hubId: Int32) -> Bool {
  if hubId < 0 || this.m_activeHubID != hubId { return false; }
  let i = 0;
  while i < ArraySize(this.m_data.choiceHubs) {
    if this.m_data.choiceHubs[i].id == hubId {
      return this.m_selectedIndex == ArraySize(this.m_data.choiceHubs[i].choices) - 1;
    }
    i += 1;
  }
  return false;
}

@addMethod(dialogWidgetGameController)
protected cb func OnAction(action: ListenerAction, consumer: ListenerActionConsumer) -> Bool {
  let name = ListenerAction.GetName(action);
  let diagnostics = SceneEntryInstaller.Get();
  if IsDefined(diagnostics) {
    diagnostics.RecordAction(NameToString(name) + ":" + ToString(ListenerAction.GetType(action))
      + " offered=" + ToString(this.anpcOffered) + " focus=" + ToString(this.anpcFocus));
  }
  if !this.anpcOffered || !ListenerAction.IsButtonJustPressed(action) { return false; }
  let player = this.GetPlayerControlledObject() as PlayerPuppet;
  if !IsDefined(player) { return false; }
  let entry = Entry.Get(player.GetGame());
  if !IsDefined(entry) { return false; }
  if Equals(name, n"Choice2") || (this.anpcFocus && Equals(name, n"ChoiceApply")) {
    ListenerActionConsumer.Consume(consumer);
    ListenerActionConsumer.DontSendReleaseEvent(consumer);
    this.anpcFocus = false;
    entry.AcceptScene(player);
    return true;
  }
  if Equals(name, n"ChoiceScrollDown") {
    if this.anpcFocus {
      ListenerActionConsumer.Consume(consumer);
      return true;
    }
    if this.AnpcAtLastNativeChoice(entry.GetSceneHubId()) {
      ListenerActionConsumer.Consume(consumer);
      ListenerActionConsumer.DontSendReleaseEvent(consumer);
      this.anpcFocus = true;
      this.OnInteractionsChanged();
      return true;
    }
    return false;
  }
  if Equals(name, n"ChoiceScrollUp") && this.anpcFocus {
    ListenerActionConsumer.Consume(consumer);
    ListenerActionConsumer.DontSendReleaseEvent(consumer);
    this.anpcFocus = false;
    this.OnInteractionsChanged();
    return true;
  }
  return false;
}
