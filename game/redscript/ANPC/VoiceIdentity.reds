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
  // 목소리를 못 읽었을 때 디버그 창·CET 로그에 남길 컴포넌트 구조(클래스·속성·함수 이름)와 체형.
  public let detail: String;
}

public abstract class NpcVoice {
  public static func Probe(npc: ref<NPCPuppet>) -> ref<NpcVoiceProbe> {
    let probe = new NpcVoiceProbe();
    probe.source = "none";
    if !IsDefined(npc) { return probe; }
    probe.gender = NpcVoice.Gender(npc);
    let record = TweakDBInterface.GetCharacterRecord(npc.GetRecordID());
    if IsDefined(record) { probe.recordTag = NpcVoice.Clean(NameToString(record.VoiceTag())); }
    let component = npc.FindComponentByType(n"scnVoicesetComponent");
    if IsDefined(component) {
      let trace = "";
      let tag = NpcVoice.Clean(NpcVoice.ComponentTag(component, trace));
      if StrLen(tag) > 0 { probe.tag = tag; probe.source = "ps"; return probe; }
      probe.detail = "읽기:" + trace + " · 체형 " + NameToString(npc.GetBodyType()) + " · " + NpcVoice.Describe(component);
    } else {
      probe.detail = "scnVoicesetComponent 없음 · 체형 " + NameToString(npc.GetBodyType());
    }
    if StrLen(probe.recordTag) > 0 { probe.tag = probe.recordTag; probe.source = "record"; }
    return probe;
  }

  // 컴포넌트 자신의 voiceTag → 상태 객체(GetPS·GetBasePS·persistentState 순)의 voiceTag. 단계별 결과를 trace에 남긴다.
  private static func ComponentTag(component: ref<IComponent>, trace: script_ref<String>) -> String {
    let cls = Reflection.GetClassOf(ToVariant(component), true);
    if !IsDefined(cls) { Deref(trace) += " 클래스 없음"; return ""; }
    let own = cls.GetProperty(n"voiceTag");
    if IsDefined(own) {
      let tag = NameToString(FromVariant<CName>(own.GetValue(ToVariant(component))));
      Deref(trace) += " 컴포넌트.voiceTag=" + tag;
      if StrLen(NpcVoice.Clean(tag)) > 0 { return tag; }
    }
    let psClass = Reflection.GetClass(n"scnVoicesetComponentPS");
    let tagProp = IsDefined(psClass) ? psClass.GetProperty(n"voiceTag") : null;
    if !IsDefined(tagProp) { Deref(trace) += " PS.voiceTag 속성 없음"; return ""; }
    let getters: array<CName> = [n"GetPS", n"GetBasePS"];
    for name in getters {
      let getter = cls.GetFunction(name);
      if !IsDefined(getter) {
        Deref(trace) += " " + NameToString(name) + " 없음";
      } else {
        let state = getter.Call(component);
        let tag = NpcVoice.StateTag(tagProp, state, NameToString(name), trace);
        if StrLen(tag) > 0 { return tag; }
      }
    }
    let stateProp = cls.GetProperty(n"persistentState");
    if !IsDefined(stateProp) { Deref(trace) += " persistentState 없음"; return ""; }
    return NpcVoice.StateTag(tagProp, stateProp.GetValue(ToVariant(component)), "persistentState", trace);
  }

  private static func StateTag(tagProp: ref<ReflectionProp>, state: Variant, label: String, trace: script_ref<String>) -> String {
    let type = Reflection.GetTypeOf(state);
    let typeName = IsDefined(type) ? NameToString(type.GetName()) : "없음";
    let cls = Reflection.GetClassOf(state, true);
    let className = IsDefined(cls) ? NameToString(cls.GetName()) : "없음";
    if !IsDefined(cls) || !cls.IsA(n"scnVoicesetComponentPS") {
      Deref(trace) += " " + label + "=" + typeName + "/" + className;
      return "";
    }
    let tag = NameToString(FromVariant<CName>(tagProp.GetValue(state)));
    Deref(trace) += " " + label + ".voiceTag=" + tag;
    return NpcVoice.Clean(tag);
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

  // Female | Male | "". 군중은 GetResolvedGenderName이 None이라 몸 체형 이름(WomanAverage 등)으로 가른다.
  public static func Gender(npc: ref<NPCPuppet>) -> String {
    let resolved = NameToString(npc.GetResolvedGenderName());
    if Equals(resolved, "Female") || Equals(resolved, "Male") { return resolved; }
    let body = StrLower(NameToString(npc.GetBodyType()));
    if StrContains(body, "woman") || StrContains(body, "female") { return "Female"; }
    if StrContains(body, "man") || StrContains(body, "male") { return "Male"; }
    return "";
  }

  private static func Clean(tag: String) -> String {
    return Equals(tag, "None") ? "" : tag;
  }
}
