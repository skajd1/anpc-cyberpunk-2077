module ANPC

// NPC의 원작 목소리 이름(예: civ_mid_m_03_enus_35). 군중 TTS가 같은 목소리의 원작 대사를 참조 음성으로 쓴다.
// 목소리는 생성 때 scnVoicesetComponent의 상태(scnVoicesetComponentPS.voiceTag)에 정해지고 스크립트 함수가 없어
// Codeware 리플렉션으로 읽는다. 못 읽으면 인물 데이터(TweakDB)의 VoiceTag를 쓴다.
public class NpcVoiceProbe extends IScriptable {
  public let tag: String;
  // ps | record | none
  public let source: String;
  public let recordTag: String;
  public let gender: String;
  // 목소리를 못 읽었을 때 디버그 창에 보일 컴포넌트 구조(클래스·속성·함수 이름).
  public let detail: String;
}

public abstract class NpcVoice {
  public static func Probe(npc: ref<NPCPuppet>) -> ref<NpcVoiceProbe> {
    let probe = new NpcVoiceProbe();
    probe.source = "none";
    if !IsDefined(npc) { return probe; }
    probe.gender = NameToString(npc.GetResolvedGenderName());
    let record = TweakDBInterface.GetCharacterRecord(npc.GetRecordID());
    if IsDefined(record) { probe.recordTag = NpcVoice.Clean(NameToString(record.VoiceTag())); }
    let component = npc.FindComponentByType(n"scnVoicesetComponent");
    if IsDefined(component) {
      let tag = NpcVoice.Clean(NpcVoice.ComponentTag(component));
      if StrLen(tag) > 0 { probe.tag = tag; probe.source = "ps"; return probe; }
      probe.detail = NpcVoice.Describe(component);
    } else {
      probe.detail = "scnVoicesetComponent 없음";
    }
    if StrLen(probe.recordTag) > 0 { probe.tag = probe.recordTag; probe.source = "record"; }
    return probe;
  }

  // 컴포넌트의 상태 객체(GetPS·GetBasePS·persistentState 순)에서 voiceTag를 읽는다.
  private static func ComponentTag(component: ref<IComponent>) -> String {
    let cls = Reflection.GetClassOf(ToVariant(component), true);
    if !IsDefined(cls) { return ""; }
    let own = cls.GetProperty(n"voiceTag");
    if IsDefined(own) { return NameToString(FromVariant<CName>(own.GetValue(ToVariant(component)))); }
    let psClass = Reflection.GetClass(n"scnVoicesetComponentPS");
    if !IsDefined(psClass) { return ""; }
    let tagProp = psClass.GetProperty(n"voiceTag");
    if !IsDefined(tagProp) { return ""; }
    let getters: array<CName> = [n"GetPS", n"GetBasePS"];
    for name in getters {
      let getter = cls.GetFunction(name);
      if IsDefined(getter) {
        let state = getter.Call(component);
        if NpcVoice.IsState(state) {
          let tag = NameToString(FromVariant<CName>(tagProp.GetValue(state)));
          if StrLen(NpcVoice.Clean(tag)) > 0 { return tag; }
        }
      }
    }
    let stateProp = cls.GetProperty(n"persistentState");
    if IsDefined(stateProp) {
      let state = stateProp.GetValue(ToVariant(component));
      if NpcVoice.IsState(state) { return NameToString(FromVariant<CName>(tagProp.GetValue(state))); }
    }
    return "";
  }

  private static func IsState(value: Variant) -> Bool {
    let cls = Reflection.GetClassOf(value, true);
    return IsDefined(cls) && cls.IsA(n"scnVoicesetComponentPS");
  }

  private static func Describe(component: ref<IComponent>) -> String {
    let cls = Reflection.GetClassOf(ToVariant(component), true);
    if !IsDefined(cls) { return "클래스 정보 없음"; }
    let text = NameToString(cls.GetName()) + " 속성:";
    for prop in cls.GetProperties() { text += " " + NameToString(prop.GetName()); }
    text += " · 함수:";
    for fn in cls.GetFunctions() { text += " " + NameToString(fn.GetName()); }
    return text;
  }

  private static func Clean(tag: String) -> String {
    return Equals(tag, "None") ? "" : tag;
  }
}
