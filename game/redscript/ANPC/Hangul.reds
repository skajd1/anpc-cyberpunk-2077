module ANPC
import Codeware.UI.*
import Codeware.UI.TextInput.*

// 두벌식 한글 조합기. 자모는 호환 자모 인덱스(자음 0..29, 모음 30..50)로 다룬다.
// 게임 입력은 Windows IME 조합을 전달하지 않으므로 물리 키 코드로 직접 조합한다.
public class HangulComposer extends IScriptable {
  private let cho: Int32;
  private let jung: Int32;
  private let jong: Int32;
  // 마지막 입력 결과: 확정된 글자(바뀐 이전 음절 포함)와 조합 중 글자.
  public let committed: String;
  public let composing: String;

  public func Reset() -> Void {
    this.cho = -1;
    this.jung = -1;
    this.jong = -1;
    this.committed = "";
    this.composing = "";
  }

  public func IsComposing() -> Bool {
    return this.cho >= 0 || this.jung >= 0;
  }

  // 두벌식 배열. 해당 없는 키는 -1.
  public static func KeyToJamo(key: EInputKey, shift: Bool) -> Int32 {
    switch key {
      case EInputKey.IK_Q: return shift ? 18 : 17;
      case EInputKey.IK_W: return shift ? 24 : 23;
      case EInputKey.IK_E: return shift ? 7 : 6;
      case EInputKey.IK_R: return shift ? 1 : 0;
      case EInputKey.IK_T: return shift ? 21 : 20;
      case EInputKey.IK_Y: return 42;
      case EInputKey.IK_U: return 36;
      case EInputKey.IK_I: return 32;
      case EInputKey.IK_O: return shift ? 33 : 31;
      case EInputKey.IK_P: return shift ? 37 : 35;
      case EInputKey.IK_A: return 16;
      case EInputKey.IK_S: return 3;
      case EInputKey.IK_D: return 22;
      case EInputKey.IK_F: return 8;
      case EInputKey.IK_G: return 29;
      case EInputKey.IK_H: return 38;
      case EInputKey.IK_J: return 34;
      case EInputKey.IK_K: return 30;
      case EInputKey.IK_L: return 50;
      case EInputKey.IK_Z: return 26;
      case EInputKey.IK_X: return 27;
      case EInputKey.IK_C: return 25;
      case EInputKey.IK_V: return 28;
      case EInputKey.IK_B: return 47;
      case EInputKey.IK_N: return 43;
      case EInputKey.IK_M: return 48;
    }
    return -1;
  }

  private static func IsVowel(jamo: Int32) -> Bool { return jamo >= 30; }

  private static func ChoIndex(jamo: Int32) -> Int32 {
    switch jamo {
      case 0: return 0;   case 1: return 1;   case 3: return 2;   case 6: return 3;
      case 7: return 4;   case 8: return 5;   case 16: return 6;  case 17: return 7;
      case 18: return 8;  case 20: return 9;  case 21: return 10; case 22: return 11;
      case 23: return 12; case 24: return 13; case 25: return 14; case 26: return 15;
      case 27: return 16; case 28: return 17; case 29: return 18;
    }
    return -1;
  }

  // 종성 인덱스(1..27). ㄸ·ㅃ·ㅉ은 종성이 될 수 없다.
  private static func JongIndex(jamo: Int32) -> Int32 {
    switch jamo {
      case 0: return 1;   case 1: return 2;   case 2: return 3;   case 3: return 4;
      case 4: return 5;   case 5: return 6;   case 6: return 7;   case 8: return 8;
      case 9: return 9;   case 10: return 10; case 11: return 11; case 12: return 12;
      case 13: return 13; case 14: return 14; case 15: return 15; case 16: return 16;
      case 17: return 17; case 19: return 18; case 20: return 19; case 21: return 20;
      case 22: return 21; case 23: return 22; case 25: return 23; case 26: return 24;
      case 27: return 25; case 28: return 26; case 29: return 27;
    }
    return -1;
  }

  private static func CombineVowel(a: Int32, b: Int32) -> Int32 {
    if a == 38 && b == 30 { return 39; }
    if a == 38 && b == 31 { return 40; }
    if a == 38 && b == 50 { return 41; }
    if a == 43 && b == 34 { return 44; }
    if a == 43 && b == 35 { return 45; }
    if a == 43 && b == 50 { return 46; }
    if a == 48 && b == 50 { return 49; }
    return -1;
  }

  private static func CombineJong(a: Int32, b: Int32) -> Int32 {
    if a == 0 && b == 20 { return 2; }
    if a == 3 && b == 23 { return 4; }
    if a == 3 && b == 29 { return 5; }
    if a == 8 && b == 0 { return 9; }
    if a == 8 && b == 16 { return 10; }
    if a == 8 && b == 17 { return 11; }
    if a == 8 && b == 20 { return 12; }
    if a == 8 && b == 27 { return 13; }
    if a == 8 && b == 28 { return 14; }
    if a == 8 && b == 29 { return 15; }
    if a == 17 && b == 20 { return 19; }
    return -1;
  }

  // 겹받침의 앞 자음. 겹받침이 아니면 -1.
  private static func JongFirst(jamo: Int32) -> Int32 {
    switch jamo {
      case 2: return 0;  case 4: return 3;  case 5: return 3;  case 9: return 8;
      case 10: return 8; case 11: return 8; case 12: return 8; case 13: return 8;
      case 14: return 8; case 15: return 8; case 19: return 17;
    }
    return -1;
  }

  private static func JongSecond(jamo: Int32) -> Int32 {
    switch jamo {
      case 2: return 20;  case 4: return 23; case 5: return 29;  case 9: return 0;
      case 10: return 16; case 11: return 17; case 12: return 20; case 13: return 27;
      case 14: return 28; case 15: return 29; case 19: return 20;
    }
    return -1;
  }

  private static func VowelFirst(jamo: Int32) -> Int32 {
    switch jamo {
      case 39: return 38; case 40: return 38; case 41: return 38;
      case 44: return 43; case 45: return 43; case 46: return 43; case 49: return 48;
    }
    return -1;
  }

  public static func JamoText(jamo: Int32) -> String {
    let compat = HangulTable.Compat();
    return UTF8StrMid(compat, jamo, 1);
  }

  private static func Render(cho: Int32, jung: Int32, jong: Int32) -> String {
    if cho >= 0 && jung >= 0 {
      let row = HangulTable.Row(HangulComposer.ChoIndex(cho));
      let jongIndex = jong >= 0 ? HangulComposer.JongIndex(jong) : 0;
      return UTF8StrMid(row, (jung - 30) * 28 + jongIndex, 1);
    }
    if cho >= 0 { return HangulComposer.JamoText(cho); }
    if jung >= 0 { return HangulComposer.JamoText(jung); }
    return "";
  }

  private func Current() -> String {
    return HangulComposer.Render(this.cho, this.jung, this.jong);
  }

  // 현재 음절을 확정 문자열로 내보내고 새 음절을 시작한다.
  private func Start(cho: Int32, jung: Int32) -> Void {
    this.committed = this.Current();
    this.cho = cho;
    this.jung = jung;
    this.jong = -1;
  }

  public func Input(jamo: Int32) -> Void {
    this.committed = "";
    if HangulComposer.IsVowel(jamo) {
      this.InputVowel(jamo);
    } else {
      this.InputConsonant(jamo);
    }
    this.composing = this.Current();
  }

  private func InputConsonant(c: Int32) -> Void {
    if this.cho >= 0 && this.jung >= 0 && this.jong < 0 && HangulComposer.JongIndex(c) >= 0 {
      this.jong = c;
      return;
    }
    if this.jong >= 0 {
      let combined = HangulComposer.CombineJong(this.jong, c);
      if combined >= 0 {
        this.jong = combined;
        return;
      }
    }
    if !this.IsComposing() {
      this.cho = c;
      return;
    }
    this.Start(c, -1);
  }

  private func InputVowel(v: Int32) -> Void {
    if this.jong >= 0 {
      // 받침을 다음 음절 초성으로 옮긴다. 겹받침은 뒤 자음만 옮긴다.
      let first = HangulComposer.JongFirst(this.jong);
      let moved: Int32;
      if first >= 0 {
        moved = HangulComposer.JongSecond(this.jong);
        this.jong = first;
      } else {
        moved = this.jong;
        this.jong = -1;
      }
      this.Start(moved, v);
      return;
    }
    if this.jung >= 0 {
      let combined = HangulComposer.CombineVowel(this.jung, v);
      if combined >= 0 {
        this.jung = combined;
        return;
      }
      this.Start(-1, v);
      return;
    }
    if this.cho >= 0 {
      this.jung = v;
      return;
    }
    this.jung = v;
  }

  // 마지막 자모를 지운다. 남은 조합 글자는 composing에 담는다.
  public func Backspace() -> Void {
    this.committed = "";
    if this.jong >= 0 {
      this.jong = HangulComposer.JongFirst(this.jong);
    } else {
      if this.jung >= 0 {
        let first = HangulComposer.VowelFirst(this.jung);
        this.jung = first;
      } else {
        this.cho = -1;
      }
    }
    this.composing = this.Current();
  }
}

// 한/영(VK_HANGUL) 또는 Shift+Space로 전환하는 입력칸. 한글 모드에서는 글자 키를 두벌식으로 조합한다.
// 조합 글자는 커서 앞 한 글자만 바꾸며 다른 키를 누르면 확정한다.
public class HangulTextInput extends HubTextInput {
  private let composer: ref<HangulComposer>;
  private let hangulMode: Bool;
  private let composePos: Int32;
  private let composeLen: Int32;

  public static func Create() -> ref<HangulTextInput> {
    let self = new HangulTextInput();
    self.composer = new HangulComposer();
    self.composer.Reset();
    self.hangulMode = true;
    self.CreateInstance();
    return self;
  }

  public func IsHangulMode() -> Bool { return this.hangulMode; }

  public func SetHangulMode(value: Bool) -> Void {
    this.FinishComposition();
    this.hangulMode = value;
  }

  public func FinishComposition() -> Void {
    this.composeLen = 0;
    if IsDefined(this.composer) { this.composer.Reset(); }
  }

  public func Clear() -> Void {
    this.FinishComposition();
    this.SetText("");
  }

  protected func ProcessInputEvent(event: ref<inkKeyInputEvent>) {
    let key = event.GetKey();
    if Equals(key, EInputKey.IK_Unknown15) || (Equals(key, EInputKey.IK_Space) && event.IsShiftDown()) {
      this.FinishComposition();
      this.hangulMode = !this.hangulMode;
      this.CallCustomCallback(n"OnModeChanged");
      return;
    }
    if event.IsControlDown() || event.IsAltDown() {
      this.FinishComposition();
      super.ProcessInputEvent(event);
      return;
    }
    if this.m_measurer.IsMeasuring() { return; }
    let letter = HangulTextInput.LetterIndex(key);
    if letter >= 0 {
      if this.hangulMode {
        if this.composeLen == 0 && this.m_text.IsFull() { return; }
        this.composer.Input(HangulComposer.KeyToJamo(key, event.IsShiftDown()));
        this.ApplyComposition(this.composer.committed, this.composer.composing);
      } else {
        this.FinishComposition();
        if this.m_text.IsFull() { return; }
        let letters = event.IsShiftDown() ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "abcdefghijklmnopqrstuvwxyz";
        this.ApplyComposition(StrMid(letters, letter, 1), "");
      }
      return;
    }
    if Equals(key, EInputKey.IK_Backspace) && this.composeLen > 0 {
      this.composer.Backspace();
      this.ApplyComposition("", this.composer.composing);
      if !this.composer.IsComposing() { this.FinishComposition(); }
      return;
    }
    // 한글 IME가 켜져 있으면 공백·숫자 문자가 비어 올 수 있어 직접 넣는다.
    if Equals(key, EInputKey.IK_Space) || (HangulTextInput.DigitIndex(key) >= 0 && !event.IsShiftDown()) {
      this.FinishComposition();
      if this.m_text.IsFull() { return; }
      let text = Equals(key, EInputKey.IK_Space) ? " " : ToString(HangulTextInput.DigitIndex(key));
      this.ApplyComposition(text, "");
      return;
    }
    this.FinishComposition();
    super.ProcessInputEvent(event);
  }

  private static func LetterIndex(key: EInputKey) -> Int32 {
    let code: Int32 = EnumInt(key);
    return code >= 65 && code <= 90 ? code - 65 : -1;
  }

  private static func DigitIndex(key: EInputKey) -> Int32 {
    let code: Int32 = EnumInt(key);
    return code >= 48 && code <= 57 ? code - 48 : -1;
  }

  // 조합 중 글자를 committed + composing으로 바꾸고 전체 글자 폭을 다시 잰다(측정은 캐시를 쓴다).
  private func ApplyComposition(committed: String, composing: String) -> Void {
    let pos: Int32;
    if this.composeLen > 0 {
      pos = this.composePos;
      this.m_text.DeleteCharAt(pos);
    } else {
      if !this.m_selection.IsEmpty() {
        pos = this.m_selection.GetLeftPosition();
        this.m_text.DeleteCharRange(this.m_selection.GetLeftPosition(), this.m_selection.GetRightPosition());
      } else {
        pos = this.m_caret.GetPosition();
      }
    }
    if StrLen(committed) > 0 {
      this.m_text.InsertCharAt(pos, committed);
      pos += 1;
    }
    this.composeLen = 0;
    if StrLen(composing) > 0 {
      this.m_text.InsertCharAt(pos, composing);
      this.composePos = pos;
      this.composeLen = 1;
      pos += 1;
    }
    this.m_caret.SetMaxPosition(this.m_text.GetLength());
    this.m_caret.SetPosition(pos);
    this.m_selection.SetMaxPosition(this.m_text.GetLength());
    this.m_selection.Clear();
    if this.m_text.GetLength() > 0 {
      this.m_measurer.MeasureAllChars(this.m_text.GetText());
    }
    this.UpdateLayout();
    this.TriggerChangeCallback();
  }
}
