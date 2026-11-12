module ANPC
import Codeware.UI.*

// G2 handoff 후보. ANPC 선택 뒤 V 차례에만 하단 입력칸을 열고, 대사는 원작 자막으로 표시한다.
// AI 응답은 CET 브리지(파일)와 로컬 개발 브리지를 거친다. 자유 군중은 세션 동안 NpcControl로 정지·V 시선을 소유하고, 커뮤니티 원작 허브는 정지·회전 없이 종료하지 않고 보류한다.
// CET 브리지로 넘기는 AI 요청. kind: say | end.
public class AnpcRequest extends IScriptable {
  public let id: Int32;
  public let kind: String;
  public let session: Int32;
  public let npcKey: String;
  public let crowd: Bool;
  public let text: String;
  public let context: ref<ContextSnapshot>;
  public let instanceToken: String;
  public let worldToken: String;
}

public class ChatSession extends IScriptable {
  public let id: Int32;
  // 응답을 기다리는 요청 ID. 없으면 -1.
  public let pendingRequest: Int32;
  public let latestRequest: Int32;
  public let npc: wref<NPCPuppet>;
  public let player: wref<PlayerPuppet>;
  public let characterKey: String;
  public let crowd: Bool;
  public let instanceToken: String;
  // 보류 중인 원작 허브 ID. 군중은 -1.
  public let holdHubId: Int32;
  public let epoch: Int32;
  public let name: String;
  public let popup: ref<ChatPopup>;
  public let hangulMode: Bool;
  public let inputDraft: String;
  public let inputDraftCaret: Int32;
  public let menuSuspended: Bool;
  public let menuObservedOpen: Bool;
  public let menuResumeScheduled: Bool;
  public let resumeInputAfterMenu: Bool;
  // 이동 키가 눌려 있어 미룬 입력칸 열기. 세션 감시에서 이동 축이 0이 되면 연다.
  public let inputDeferred: Bool;
  public let menuRequestedAt: Float;
  // 현재 표시 중인 ANPC 자막 ID. 세션 종료 시 숨긴다.
  public let subtitles: array<CRUID>;
  // 자유 군중의 정지·시선 제어. 군중이 아니거나 워크스팟 점유면 null. 세션 종료·세계 전환에서 해제한다.
  public let control: ref<NpcControl>;
}

// 원작 자막 UI(UIGameData.ShowDialogLine/HideDialogLine)로 ANPC 대사를 표시한다.
public abstract class AnpcSubtitles {
  public static func Show(game: GameInstance, id: CRUID, speaker: ref<GameObject>, speakerName: String, text: String) -> Void {
    let line: scnDialogLineData;
    line.id = id;
    line.text = text;
    line.type = scnDialogLineType.Regular;
    line.speaker = speaker;
    line.speakerName = speakerName;
    line.isPersistent = false;
    line.duration = AnpcSubtitles.Duration(text);
    let lines: array<scnDialogLineData>;
    ArrayPush(lines, line);
    GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().UIGameData)
      .SetVariant(GetAllBlackboardDefs().UIGameData.ShowDialogLine, ToVariant(lines), true);
  }

  public static func Hide(game: GameInstance, id: CRUID) -> Void {
    let ids: array<CRUID>;
    ArrayPush(ids, id);
    GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().UIGameData)
      .SetVariant(GetAllBlackboardDefs().UIGameData.HideDialogLine, ToVariant(ids), true);
  }

  // 글자 수 기반 표시 시간 3~10초.
  public static func Duration(text: String) -> Float {
    let seconds = 2.0 + 0.08 * Cast<Float>(StrLen(text));
    return MinF(10.0, MaxF(3.0, seconds));
  }
}

public class AnpcSubtitleCallback extends DelayCallback {
  public let entry: wref<Entry>;
  public let session: wref<ChatSession>;
  public let kind: Int32;
  public let requestId: Int32;
  public let id: CRUID;
  public let epoch: Int32;

  public static func Hide() -> Int32 { return 0; }
  public static func Reopen() -> Int32 { return 2; }
  public static func Watch() -> Int32 { return 3; }
  public static func Timeout() -> Int32 { return 4; }
  public static func EndAfter() -> Int32 { return 5; }
  public static func ResumeMenu() -> Int32 { return 6; }

  public func Call() -> Void {
    if IsDefined(this.entry) { this.entry.OnSubtitleTimer(this); }
  }
}

// UF-19/20: 제출 입력 검사. 규칙은 이 한 곳에서만 정의하고 입력칸(Enter)과 Entry.SubmitChat(직접 제출)이 함께 쓴다.
// 글자 수는 UTF8StrMid의 코드포인트 기준이며 입력을 잘라 보내지 않는다.
public abstract class AnpcInput {
  // 첫 게임판 입력칸 기본 길이(UF-20). 생성 출력/전체 문맥 한도와 별개다.
  public static func MaxChars() -> Int32 { return 200; }

  public static func CharCount(text: String) -> Int32 {
    let count = 0;
    while NotEquals(UTF8StrMid(text, count, 1), "") && count < 100000 { count += 1; }
    return count;
  }

  // 공백 글자: 스페이스·탭·개행·NBSP(U+00A0)·제로폭 공백(U+200B)·전각 공백(U+3000).
  public static func IsSpace(c: String) -> Bool {
    let spaces = " \t\r\n ​　";
    return StrContains(spaces, c);
  }

  public static func IsBlank(text: String) -> Bool {
    let i = 0;
    let c = UTF8StrMid(text, i, 1);
    while NotEquals(c, "") {
      if !AnpcInput.IsSpace(c) { return false; }
      i += 1;
      c = UTF8StrMid(text, i, 1);
    }
    return true;
  }

  // 0 허용, 1 비었거나 공백만, 2 길이 초과. 200자는 허용하고 201자부터 거부한다.
  public static func Check(text: String) -> Int32 {
    if AnpcInput.IsBlank(text) { return 1; }
    if AnpcInput.CharCount(text) > AnpcInput.MaxChars() { return 2; }
    return 0;
  }

  public static func Notice(reason: Int32, text: String) -> String {
    if reason == 1 { return "내용을 입력해주세요."; }
    return "입력은 " + ToString(AnpcInput.MaxChars()) + "자 이하여야 합니다 (현재 " + ToString(AnpcInput.CharCount(text)) + "자). 줄여서 다시 보내주세요.";
  }
}

// 중앙 하단에 입력칸과 안내 한 줄만 둔다. 게임 입력은 ModalPopup 게임 문맥으로만 막고
// 화면 상태 전환·비네트·시간 감속·배경 흐림은 쓰지 않는다(화면 상태 전환 시 게임 화면이 검게 가려졌다).
// 입력칸이 떠 있는 동안 자막이 보이지 않아 V 차례에만 연다.
// 입력칸이 없는 차례(응답 대기·자막)의 Esc는 GameMenu.OnAction → Entry.OnEscape가 처리한다(대기는 요청 취소, 그 외는 종료).
public class ChatPopup extends InGamePopup {
  private let mode: ref<inkText>;
  private let input: ref<HangulTextInput>;
  private let entry: wref<Entry>;
  private let startHangul: Bool;
  private let startText: String;
  private let startCaret: Int32;
  private let submitted: Bool;
  private let closing: Bool;
  // 입력칸이 누름을 받은 뒤 아직 떼지 않은 키. 닫는 순간 남아 있으면 게임은 누름만 보고
  // 뗌은 닫히는 입력칸이 가져가 이동 키가 눌린 채로 남는다(두벌식 입력은 A·S·D·W를 자주 쓴다).
  private let held: array<EInputKey>;
  private let pendingClose: Bool;
  private let pendingText: String;
  private let hint: ref<inkText>;
  private let noticeShown: Bool;

  public static func Create(entry: ref<Entry>, hangulMode: Bool, opt draft: String, opt caret: Int32) -> ref<ChatPopup> {
    let popup = new ChatPopup();
    popup.entry = entry;
    popup.startHangul = hangulMode;
    popup.startText = draft;
    popup.startCaret = caret;
    return popup;
  }

  public static func HintText() -> String { return "Enter 보내기 · Esc 종료 · Tab 캐릭터/인벤토리 · 한/영 또는 Shift+Space 전환"; }

  public func WasSubmitted() -> Bool { return this.submitted; }

  // 거부 사유를 안내 줄에 표시한다. 다음 키 입력에서 기본 안내로 돌아간다.
  private func ShowNotice(text: String) -> Void {
    if !IsDefined(this.hint) { return; }
    this.hint.SetText(text);
    this.hint.SetOpacity(1.0);
    this.noticeShown = true;
  }

  private func ClearNotice() -> Void {
    if !this.noticeShown || !IsDefined(this.hint) { return; }
    this.noticeShown = false;
    this.hint.SetText(ChatPopup.HintText());
    this.hint.SetOpacity(0.7);
  }

  public func GetDraft() -> String {
    this.input.FinishComposition();
    return this.input.GetText();
  }

  public func GetDraftCaret() -> Int32 { return this.input.GetCaretPosition(); }

  public func IsHangulMode() -> Bool {
    return IsDefined(this.input) ? this.input.IsHangulMode() : this.startHangul;
  }

  // 세션 종료와 Enter가 겹쳐도 한 번만 닫는다(UI 문맥을 두 번 빼지 않기 위해).
  public func Close() {
    if this.closing { return; }
    this.closing = true;
    super.Close();
  }

  protected func CreateVignette() {}

  protected func CreateContainer() {
    let container = new inkCanvas();
    container.SetName(n"container");
    container.SetAnchor(inkEAnchor.BottomCenter);
    container.SetAnchorPoint(Vector2(0.5, 1.0));
    container.SetMargin(inkMargin(0.0, 0.0, 0.0, 60.0));
    container.SetSize(Vector2(1400.0, 160.0));
    container.Reparent(this.GetRootCompoundWidget());
    this.m_container = container;
    this.SetContainerWidget(container);
  }

  protected cb func OnCreate() {
    super.OnCreate();
    let column = new inkVerticalPanel();
    column.SetName(n"chat");
    column.SetAnchor(inkEAnchor.BottomCenter);
    column.SetAnchorPoint(Vector2(0.5, 1.0));
    column.SetHAlign(inkEHorizontalAlign.Center);
    column.SetVAlign(inkEVerticalAlign.Bottom);
    column.SetChildMargin(inkMargin(0.0, 0.0, 0.0, 8.0));
    column.Reparent(this.m_container);

    let row = new inkHorizontalPanel();
    row.SetName(n"inputRow");
    row.SetHAlign(inkEHorizontalAlign.Center);
    row.SetChildMargin(inkMargin(0.0, 0.0, 16.0, 0.0));
    row.Reparent(column);

    let mode = new inkText();
    mode.SetName(n"mode");
    mode.SetFontFamily("base\\gameplay\\gui\\fonts\\raj\\raj.inkfontfamily");
    mode.SetFontStyle(n"Medium");
    mode.SetFontSize(34);
    mode.SetVAlign(inkEVerticalAlign.Center);
    mode.SetFitToContent(true);
    mode.SetStyle(r"base\\gameplay\\gui\\common\\main_colors.inkstyle");
    mode.BindProperty(n"tintColor", n"MainColors.Red");
    mode.Reparent(row);
    this.mode = mode;

    this.input = HangulTextInput.Create();
    this.input.SetName(n"input");
    this.input.SetWidth(1100.0);
    this.input.SetMaxLength(AnpcInput.MaxChars());
    this.input.SetMaxChars(AnpcInput.MaxChars());
    this.input.SetHangulMode(this.startHangul);
    this.input.SetText(this.startText);
    this.input.SetCaretPosition(this.startCaret);
    this.input.Reparent(row);
    this.input.RegisterToCallback(n"OnInputKey", this, n"OnChatKey");
    this.input.RegisterToCallback(n"OnModeChanged", this, n"OnModeChanged");

    let hint = new inkText();
    hint.SetName(n"hint");
    hint.SetFontFamily("base\\gameplay\\gui\\fonts\\raj\\raj.inkfontfamily");
    hint.SetFontStyle(n"Regular");
    hint.SetFontSize(22);
    hint.SetHAlign(inkEHorizontalAlign.Center);
    hint.SetFitToContent(true);
    hint.SetOpacity(0.7);
    hint.SetStyle(r"base\\gameplay\\gui\\common\\main_colors.inkstyle");
    hint.BindProperty(n"tintColor", n"MainColors.Red");
    hint.SetText(ChatPopup.HintText());
    hint.Reparent(column);
    this.hint = hint;
    this.UpdateMode();
  }

  protected cb func OnInitialize() {
    super.OnInitialize();
    // 기본 닫기 동작 cancel은 Esc와 C 키에 묶여 있어 입력 중 'c'로 닫힌다. 원시 키로만 닫는다.
    this.m_closeAction = n"None";
  }

  protected cb func OnShown() {
    this.GetGameController().RequestSetFocus(this.input.GetRootWidget());
  }

  protected func SetUIContext() {
    GameInstance.GetUISystem(this.GetGame()).PushGameContext(UIGameContext.ModalPopup);
  }
  protected func ResetUIContext() {
    GameInstance.GetUISystem(this.GetGame()).PopGameContext(UIGameContext.ModalPopup);
  }
  protected func SetTimeDilation() {}
  protected func ResetTimeDilation() {}
  protected func SetBackgroundBlur() {}
  protected func ResetBackgroundBlur() {}

  protected cb func OnModeChanged(widget: ref<inkWidget>) {
    this.UpdateMode();
  }

  private func UpdateMode() {
    if IsDefined(this.mode) && IsDefined(this.input) {
      this.mode.SetText(this.input.IsHangulMode() ? "[한]" : "[A]");
    }
  }

  protected cb func OnChatKey(event: ref<inkKeyInputEvent>) {
    if this.closing { return; }
    let key = event.GetKey();
    if Equals(event.GetAction(), EInputAction.IACT_Press) {
      if !ArrayContains(this.held, key) { ArrayPush(this.held, key); }
      this.ClearNotice();
      return;
    }
    if NotEquals(event.GetAction(), EInputAction.IACT_Release) { return; }
    ArrayRemove(this.held, key);
    if this.pendingClose {
      if ArraySize(this.held) == 0 { this.FinishClose(); }
      return;
    }
    if Equals(key, EInputKey.IK_Tab) && !event.IsShiftDown() && !event.IsControlDown() && !event.IsAltDown() {
      if IsDefined(this.entry) { this.entry.OpenGameMenu(this); }
      return;
    }
    if Equals(key, EInputKey.IK_Enter) {
      this.input.FinishComposition();
      let text = this.input.GetText();
      // UF-19/20: 공백뿐이거나 200자를 넘으면 전송하지 않고 입력을 그대로 둔다(자르지 않는다).
      let reason = AnpcInput.Check(text);
      if reason != 0 {
        this.ShowNotice(AnpcInput.Notice(reason, text));
        return;
      }
      this.input.Clear();
      this.submitted = true;
      this.RequestClose(text);
      return;
    }
    if Equals(key, EInputKey.IK_Escape) {
      this.RequestClose("");
    }
  }

  // 남은 키를 모두 뗀 뒤 닫는다. 오래 누르고 있으면 1초 뒤 그대로 닫는다.
  private func RequestClose(text: String) {
    this.pendingClose = true;
    this.pendingText = text;
    if ArraySize(this.held) == 0 { this.FinishClose(); return; }
    let timeout = new ChatCloseTimeout();
    timeout.popup = this;
    GameInstance.GetDelaySystem(this.GetGame()).DelayCallback(timeout, 1.0, false);
  }

  public func FinishClose() {
    if !this.pendingClose || this.closing { return; }
    this.pendingClose = false;
    let text = this.pendingText;
    this.pendingText = "";
    this.Close();
    if this.submitted && IsDefined(this.entry) { this.entry.SubmitChat(text); }
  }

  protected cb func OnHidden() {
    if IsDefined(this.entry) { this.entry.OnChatClosed(this); }
    super.OnHidden();
  }
}

public class ChatCloseTimeout extends DelayCallback {
  public let popup: wref<ChatPopup>;

  public func Call() -> Void {
    if IsDefined(this.popup) { this.popup.FinishClose(); }
  }
}

// 대화 중 플레이어 이동 축 입력. 입력칸을 여는 순간 이동 키가 눌려 있으면 뗌을 입력칸이 가져가
// 게임에는 키가 눌린 채로 남으므로, 축이 0일 때만 입력칸을 연다.
public class AnpcMoveListener extends IScriptable {
  public let moveX: Float;
  public let moveY: Float;

  public func IsMoving() -> Bool { return AbsF(this.moveX) > 0.05 || AbsF(this.moveY) > 0.05; }

  protected cb func OnAction(action: ListenerAction, consumer: ListenerActionConsumer) -> Bool {
    let name = ListenerAction.GetName(action);
    if Equals(name, n"MoveX") { this.moveX = ListenerAction.GetValue(action); }
    if Equals(name, n"MoveY") { this.moveY = ListenerAction.GetValue(action); }
    return false;
  }
}
