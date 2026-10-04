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
  private let session: ref<ChatSession>;
  private let uiController: wref<inkGameController>;
  private let subtitleSeq: Int32;
  private let sessionSeq: Int32;
  private let requestSeq: Int32;
  // CET 브리지가 매 프레임 꺼내 가는 AI 요청 대기열.
  private let outbox: array<ref<AnpcRequest>>;

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
    if IsDefined(this.session) && IsDefined(this.session.popup) { this.session.popup.Close(); }
    this.session = null;
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
    this.StartSession(npc, player, "", npc.IsCrowd(), -1);
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
      if Equals(this.status.reason, "entry_selected_waiting_original_handoff") {
        // 원작 허브는 종료하지 않고 보류한다. 대화 위젯은 보류 중 원작 허브를 그리지 않는다.
        this.StartSession(token.npc, player, token.characterKey, false, token.hubId);
      } else {
        Entry.ShowMessage(player.GetGame(), "[ANPC] 대화 상태가 바뀌어 진입을 취소했습니다.");
      }
      SceneEntry.RefreshDialogs(player.GetGame());
    }
    return true;
  }

  public func SetUIController(controller: ref<inkGameController>) -> Void {
    this.uiController = controller;
  }

  public func IsHolding() -> Bool {
    return IsDefined(this.session) && this.session.holdHubId >= 0;
  }

  public func HasSession() -> Bool {
    return IsDefined(this.session);
  }

  private func StartSession(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>, characterKey: String, crowd: Bool, holdHubId: Int32) -> Void {
    if IsDefined(this.session) || !IsDefined(npc) || !IsDefined(player) { return; }
    if !IsDefined(this.uiController) {
      this.status.reason = "session_ui_unavailable";
      Entry.ShowMessage(player.GetGame(), "[ANPC] 대화창을 열 수 없습니다.");
      return;
    }
    let session = new ChatSession();
    session.npc = npc;
    session.player = player;
    session.characterKey = characterKey;
    session.crowd = crowd;
    session.holdHubId = holdHubId;
    session.epoch = this.epoch;
    session.hangulMode = true;
    this.sessionSeq += 1;
    session.id = this.sessionSeq;
    session.pendingRequest = -1;
    // 군중 표시 이름은 현지화되지 않은 내부 이름일 수 있어 자막 화자 이름을 비운다.
    session.name = crowd ? "" : GetLocalizedText(npc.GetDisplayName());
    this.session = session;
    this.status.reason = "session_active";
    this.OpenInput(session);
    this.ScheduleWatch(player.GetGame());
  }

  // V 차례에만 입력칸을 연다. 입력칸이 닫혀 있는 동안 자막은 흐림 없는 화면에 표시된다.
  private func OpenInput(session: ref<ChatSession>) -> Void {
    if IsDefined(session.popup) || !IsDefined(this.uiController) { return; }
    session.popup = ChatPopup.Create(this, session.hangulMode);
    session.popup.Open(this.uiController);
  }

  // 대화 종료 거리. 시작 거리 4m보다 여유를 두며 원작처럼 멀어지면 바로 끊는다.
  public static func LeaveDistance() -> Float { return 6.0; }

  // 세션을 끝낼 사유. 빈 문자열이면 유지한다. 보류한 원작 허브가 사라지면 원작 장면이 끝난 것으로 본다.
  private func SessionEndReason(session: ref<ChatSession>) -> String {
    let npc: ref<NPCPuppet> = session.npc;
    let player: ref<PlayerPuppet> = session.player;
    if session.epoch != this.epoch || !IsDefined(npc) || !IsDefined(player) { return "session_target_lost"; }
    if npc.IsDead() || player.IsDead() || player.IsInCombat() || NPCPuppet.IsInCombat(npc) { return "session_state_blocked"; }
    if Vector4.Distance(npc.GetWorldPosition(), player.GetWorldPosition()) > Entry.LeaveDistance() { return "session_left"; }
    if session.holdHubId >= 0 {
      let hubs = SceneEntry.NativeHubs(player.GetGame());
      let found = false;
      let i = 0;
      while i < ArraySize(hubs.choiceHubs) {
        if hubs.choiceHubs[i].id == session.holdHubId { found = true; }
        i += 1;
      }
      if !found { return "session_scene_ended"; }
    }
    return "";
  }

  private func ScheduleWatch(game: GameInstance) -> Void {
    let callback = new AnpcSubtitleCallback();
    callback.entry = this;
    callback.kind = AnpcSubtitleCallback.Watch();
    callback.epoch = this.epoch;
    callback.session = this.session;
    GameInstance.GetDelaySystem(game).DelayCallback(callback, 0.3, false);
  }

  // 입력칸이 Enter로 닫힐 때 호출된다. V의 말을 원작 자막으로 띄운 채 AI 요청을 대기열에 넣는다.
  // 응답은 OnAIResponse로 들어오며 40초 안에 오지 않으면 실패로 처리한다.
  public func SubmitChat(text: String) -> Void {
    let session = this.session;
    let diagnostics = SceneEntryInstaller.Get();
    if IsDefined(diagnostics) { diagnostics.RecordInput("chat_submit len=" + ToString(StrLen(text)) + " session=" + ToString(IsDefined(session))); }
    if !IsDefined(session) { return; }
    let reason = this.SessionEndReason(session);
    if NotEquals(reason, "") {
      this.EndSession(session, reason);
      return;
    }
    let player: ref<PlayerPuppet> = session.player;
    let game = player.GetGame();
    this.HideSubtitles(session);
    let playerLine = this.NextSubtitleId();
    AnpcSubtitles.Show(game, playerLine, player, "V", text);
    ArrayPush(session.subtitles, playerLine);
    this.requestSeq += 1;
    session.pendingRequest = this.requestSeq;
    let request = new AnpcRequest();
    request.id = this.requestSeq;
    request.kind = "say";
    request.session = session.id;
    request.npcKey = session.characterKey;
    request.crowd = session.crowd;
    request.text = text;
    ArrayPush(this.outbox, request);
    let timeout = new AnpcSubtitleCallback();
    timeout.entry = this;
    timeout.kind = AnpcSubtitleCallback.Timeout();
    timeout.requestId = request.id;
    timeout.epoch = this.epoch;
    timeout.session = session;
    GameInstance.GetDelaySystem(game).DelayCallback(timeout, 40.0, false);
  }

  // CET 브리지가 호출한다. 비어 있으면 null.
  public func TakeRequest() -> ref<AnpcRequest> {
    if ArraySize(this.outbox) == 0 { return null; }
    let request = this.outbox[0];
    ArrayErase(this.outbox, 0);
    return request;
  }

  // CET 브리지가 응답 파일을 읽어 호출한다. status: ok | ok:end | error:<code>.
  // 현재 세션의 대기 중인 요청이 아니면 버린다.
  public func OnAIResponse(requestId: Int32, status: String, text: String) -> Void {
    let session = this.session;
    if !IsDefined(session) || session.pendingRequest != requestId { return; }
    session.pendingRequest = -1;
    let diagnostics = SceneEntryInstaller.Get();
    if IsDefined(diagnostics) { diagnostics.RecordInput("ai_response #" + ToString(requestId) + " " + status); }
    let game = this.GetGameInstance();
    this.HideSubtitles(session);
    let npc: ref<NPCPuppet> = session.npc;
    if !StrBeginsWith(status, "ok") || StrLen(text) == 0 || !IsDefined(npc) {
      Entry.ShowMessage(game, "[ANPC] AI 응답 실패: " + (StrBeginsWith(status, "error:") ? StrAfterFirst(status, ":") : "empty_reply"));
      this.ScheduleSubtitle(game, AnpcSubtitleCallback.Reopen(), this.NextSubtitleId(), 0.5);
      return;
    }
    let line = this.NextSubtitleId();
    AnpcSubtitles.Show(game, line, npc, session.name, text);
    ArrayPush(session.subtitles, line);
    let duration = AnpcSubtitles.Duration(text);
    this.ScheduleSubtitle(game, AnpcSubtitleCallback.Hide(), line, duration);
    let next = Equals(status, "ok:end") ? AnpcSubtitleCallback.EndAfter() : AnpcSubtitleCallback.Reopen();
    this.ScheduleSubtitle(game, next, line, duration + 0.3);
  }

  private func NextSubtitleId() -> CRUID {
    this.subtitleSeq += 1;
    return CreateCRUID(4702111234474983745ul + Cast<Uint64>(this.subtitleSeq));
  }

  private func ScheduleSubtitle(game: GameInstance, kind: Int32, id: CRUID, delay: Float) -> Void {
    let callback = new AnpcSubtitleCallback();
    callback.entry = this;
    callback.kind = kind;
    callback.id = id;
    callback.epoch = this.epoch;
    callback.session = this.session;
    GameInstance.GetDelaySystem(game).DelayCallback(callback, delay, false);
  }

  // 자막 숨김·입력칸 재개·응답 시한·감시 예약 처리. 끝난 세션이나 이전 세대의 예약은 숨김만 수행한다.
  public func OnSubtitleTimer(callback: ref<AnpcSubtitleCallback>) -> Void {
    let game = this.GetGameInstance();
    if callback.kind == AnpcSubtitleCallback.Hide() {
      AnpcSubtitles.Hide(game, callback.id);
      if IsDefined(this.session) { ArrayRemove(this.session.subtitles, callback.id); }
      return;
    }
    let session = this.session;
    if !IsDefined(session) || session != callback.session || callback.epoch != this.epoch { return; }
    if callback.kind == AnpcSubtitleCallback.Timeout() {
      if session.pendingRequest == callback.requestId {
        this.OnAIResponse(callback.requestId, "error:timeout", "");
      }
      return;
    }
    if callback.kind == AnpcSubtitleCallback.EndAfter() {
      this.EndSession(session, "session_npc_farewell");
      return;
    }
    if callback.kind == AnpcSubtitleCallback.Reopen() {
      let reopenReason = this.SessionEndReason(session);
      if NotEquals(reopenReason, "") {
        this.EndSession(session, reopenReason);
        return;
      }
      this.OpenInput(session);
      return;
    }
    // 대화 중 0.3초마다 감시해 멀어지거나 원작 장면이 끝나면 자막 도중이라도 바로 끊는다.
    if callback.kind == AnpcSubtitleCallback.Watch() {
      let watchReason = this.SessionEndReason(session);
      if NotEquals(watchReason, "") {
        this.EndSession(session, watchReason);
        return;
      }
      this.ScheduleWatch(game);
    }
  }

  private func HideSubtitles(session: ref<ChatSession>) -> Void {
    let game = this.GetGameInstance();
    let i = 0;
    while i < ArraySize(session.subtitles) {
      AnpcSubtitles.Hide(game, session.subtitles[i]);
      i += 1;
    }
    ArrayClear(session.subtitles);
  }

  // Enter로 닫힌 입력칸은 응답 차례로 넘어가고, Esc로 닫히면 세션을 끝낸다.
  public func OnChatClosed(popup: ref<ChatPopup>) -> Void {
    let session = this.session;
    if !IsDefined(session) || session.popup != popup { return; }
    session.popup = null;
    session.hangulMode = popup.IsHangulMode();
    if !popup.WasSubmitted() {
      this.EndSession(session, "session_closed");
    }
  }

  private func EndSession(session: ref<ChatSession>, reason: String) -> Void {
    if this.session != session { return; }
    this.HideSubtitles(session);
    this.session = null;
    this.status.reason = reason;
    // 브리지가 이 세션의 엔진을 정리하도록 알린다.
    this.requestSeq += 1;
    let request = new AnpcRequest();
    request.id = this.requestSeq;
    request.kind = "end";
    request.session = session.id;
    ArrayPush(this.outbox, request);
    if IsDefined(session.popup) {
      let popup = session.popup;
      session.popup = null;
      popup.Close();
    }
    // 보류했던 원작 허브를 다시 그리고 같은 허브에서 ANPC 재진입을 허용한다.
    this.consumedHubId = -1;
    let player: ref<PlayerPuppet> = session.player;
    if IsDefined(player) { SceneEntry.RefreshDialogs(player.GetGame()); }
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
