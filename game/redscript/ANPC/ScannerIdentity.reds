module ANPC

public class ContextNPCIdentity extends IScriptable {
  public let known: Bool;
  public let displayName: String;
  public let affiliation: String;
  public let role: String;
  public let attitude: String;
  public let abilities: array<String>;
  public let adultHumorAllowed: Bool;
}

// NPCPuppet.CompileScannerChunks / ScannerAbilitiesGameController의 읽기 경로만 사용한다.
// 스캔 UI/공유 blackboard를 열거나 변경하지 않고 현상금 생성도 호출하지 않는다.
public abstract class ScannerIdentity {
  public static func Collect(npc: ref<NPCPuppet>, player: ref<PlayerPuppet>) -> ref<ContextNPCIdentity> {
    let result = new ContextNPCIdentity();
    if !IsDefined(npc) || !IsDefined(player) { return result; }
    let record = npc.GetRecord();
    let ps: ref<ScriptedPuppetPS> = npc.GetPS();
    if !IsDefined(record) || !IsDefined(ps) { return result; }
    // UF-63: 게임의 사람/어린이 분류가 확인된 성인 역할만 성인 유머를 허용한다.
    if IsDefined(record.CharacterType()) && Equals(record.CharacterType().Type(), gamedataNPCType.Human) {
      result.adultHumorAllowed = !record.IsChild() && !npc.IsCharacterChildren() && NotEquals(record.BaseAttitudeGroup(), n"child_ow");
    }
    let preset = record.ScannerModulePreset();
    if TDBID.IsValid(ps.GetForcedScannerPreset()) {
      preset = TweakDBInterface.GetScannerModuleVisibilityPresetRecord(ps.GetForcedScannerPreset());
    }
    if !IsDefined(preset) { return result; }
    result.known = true;
    let archetype = record.ArchetypeData();
    if preset.ShoulShowName() {
      result.displayName = ScannerIdentity.Name(npc, record, ps);
      if IsDefined(archetype) && IsDefined(archetype.Type()) && !record.SkipDisplayArchetype()
        && NotEquals(archetype.Type().LocalizedName(), n"None") {
        result.role = ScannerIdentity.Localized(ToString(archetype.Type().LocalizedName()));
        // UI가 역할 이름만 표시하는 경우 그것을 개인 이름으로 중복 전달하지 않는다.
        if Equals(result.displayName, result.role) || (!IsNameValid(record.FullDisplayName()) && !IsNameValid(record.DisplayName())) {
          result.displayName = "";
        }
      }
    }
    let affiliation = record.Affiliation();
    if preset.ShouldShowFaction() && IsDefined(affiliation) {
      result.affiliation = ScannerIdentity.Localized(LocKeyToString(affiliation.LocalizedName()));
    }
    if preset.ShouldShowAttitude() && !npc.IsDead() && !ScriptedPuppet.IsDefeated(npc) {
      let attitude = npc.GetAttitudeTowards(player);
      result.attitude = Equals(attitude, EAIAttitude.AIA_Friendly) ? "우호적"
        : (Equals(attitude, EAIAttitude.AIA_Hostile) ? "적대적" : "중립적");
    }
    if !npc.IsDead() && !ScriptedPuppet.IsDefeated(npc) {
      ScannerIdentity.Abilities(result, npc, record);
    }
    return result;
  }

  public static func Localized(key: String) -> String {
    if StrLen(key) == 0 { return ""; }
    let text = GetLocalizedText(key);
    // 해석되지 않은 내부 지역화 키를 NPC 이름/지식으로 보내지 않는다.
    if StrLen(text) == 0 || StrContains(text, "LocKey#") { return ""; }
    return text;
  }

  private static func Name(npc: ref<NPCPuppet>, record: ref<Character_Record>, ps: ref<ScriptedPuppetPS>) -> String {
    let key: String;
    if ps.HasAlternativeName() {
      key = IsNameValid(record.AlternativeFullDisplayName()) ? LocKeyToString(record.AlternativeFullDisplayName())
        : LocKeyToString(record.AlternativeDisplayName());
    } else {
      if npc.IsCharacterCivilian() || Equals(record.BaseAttitudeGroup(), n"child_ow") {
        key = IsNameValid(record.DisplayName()) ? LocKeyToString(record.DisplayName()) : npc.GetDisplayName();
      } else {
        key = IsNameValid(record.FullDisplayName()) ? LocKeyToString(record.FullDisplayName())
          : (IsNameValid(record.DisplayName()) ? LocKeyToString(record.DisplayName()) : npc.GetDisplayName());
      }
    }
    return ScannerIdentity.Localized(key);
  }

  private static func Abilities(result: ref<ContextNPCIdentity>, npc: ref<NPCPuppet>, record: ref<Character_Record>) -> Void {
    let abilities: array<wref<GameplayAbility_Record>>;
    let groups: array<wref<GameplayAbilityGroup_Record>>;
    let prereqs: array<wref<IPrereq_Record>>;
    let archetype = record.ArchetypeData();
    let i = 0;
    if IsDefined(archetype) {
      archetype.AbilityGroups(groups);
      while i < ArraySize(groups) {
        if IsDefined(groups[i]) { groups[i].Abilities(abilities); }
        i += 1;
      }
    }
    i = 0;
    while i < record.GetAbilitiesCount() {
      let ability = record.GetAbilitiesItem(i);
      if IsDefined(ability) && !ArrayContains(abilities, ability) { ArrayPush(abilities, ability); }
      i += 1;
    }
    i = 0;
    while i < ArraySize(abilities) && ArraySize(result.abilities) < 8 {
      let ability = abilities[i];
      if IsDefined(ability) && ability.ShowInCodex() {
        ArrayClear(prereqs);
        ability.PrereqsForUIValidation(prereqs);
        let allowed = true;
        let j = 0;
        while j < ArraySize(prereqs) {
          if !IsDefined(prereqs[j]) || !IPrereq.CreatePrereq(prereqs[j].GetID()).IsFulfilled(npc.GetGame(), npc) { allowed = false; break; }
          j += 1;
        }
        if allowed {
          let label = ScannerIdentity.Localized(LocKeyToString(ability.Loc_key_name()));
          if StrLen(label) > 0 && !ArrayContains(result.abilities, label) { ArrayPush(result.abilities, label); }
        }
      }
      i += 1;
    }
  }
}
