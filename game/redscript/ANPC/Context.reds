module ANPC

// CET 내부 입력 스냅샷. 원시 평판·게임 키는 Lua 인지 변환 뒤 외부 요청에서 제외한다.
public class ContextOutfit extends IScriptable {
  public let slot: String;
  public let displayName: String;
}

public class ContextSnapshot extends IScriptable {
  public let observationKnown: Bool;
  public let canObserve: Bool;
  public let outfitKnown: Bool;
  public let outfit: array<ref<ContextOutfit>>;
  public let weaponKnown: Bool;
  public let weaponDrawn: Bool;
  public let weaponName: String;
  public let streetCred: Int32;
  public let viktorVisitConfirmed: Bool;
  public let location: String;
  public let timeOfDay: String;
  public let npcAliveConfirmed: Bool;
  public let npcFreeConfirmed: Bool;
  public let npcIdentity: ref<ContextNPCIdentity>;
  // 실제 관계 매핑 전에는 빈 문자열/false. 웹 프리셋이나 모델 출력으로 채우지 않는다.
  public let relationshipKnown: Bool;
  public let relationshipStage: String;
  public let story: ref<StorySnapshot>;
  // 직접 확인한 업무·표시 역할만 원형 후보를 채운다. 복장/지역으로 보충하지 않는다.
  public let crowdEvidenceKnown: Bool;
  public let crowdArchetypeIDs: array<String>;
}

public abstract class GameContext {
  public static func Collect(player: ref<PlayerPuppet>, npc: ref<NPCPuppet>) -> ref<ContextSnapshot> {
    let result = new ContextSnapshot();
    result.streetCred = -1;
    if !IsDefined(player) || !IsDefined(npc) { return result; }
    let game = player.GetGame();
    result.npcAliveConfirmed = npc.IsAttached() && !npc.IsDead();
    result.npcFreeConfirmed = IsDefined(npc.GetPuppetStateBlackboard()) && !NPCPuppet.IsInCombat(npc) && !player.IsInCombat();
    result.npcIdentity = ScannerIdentity.Collect(npc, player);
    result.story = GameStory.Collect(player);
    // 실제 판매/리퍼닥 기능과 표시된 넷러너 역할만 원형의 개발 후보로 사용한다.
    if npc.IsVendor() {
      result.crowdEvidenceKnown = true;
      ArrayPush(result.crowdArchetypeIDs, Equals(npc.GetVendorType(), gamedataVendorType.RipperDoc) ? "CROWD_MEDICAL" : "CROWD_RETAIL");
    } else {
      let record = npc.GetRecord();
      if IsDefined(record) && IsDefined(record.ArchetypeData()) && IsDefined(record.ArchetypeData().Type())
        && StrLen(result.npcIdentity.role) > 0 {
        let role = record.ArchetypeData().Type().Type();
        if Equals(role, gamedataArchetypeType.NetrunnerT1) || Equals(role, gamedataArchetypeType.NetrunnerT2)
          || Equals(role, gamedataArchetypeType.NetrunnerT3) {
          result.crowdEvidenceKnown = true;
          ArrayPush(result.crowdArchetypeIDs, "CROWD_NET");
        }
      }
    }
    let senses = GameInstance.GetSenseManager(game);
    if IsDefined(senses) {
      result.observationKnown = true;
      result.canObserve = Vector4.Distance(player.GetWorldPosition(), npc.GetWorldPosition()) <= Entry.LeaveDistance()
        && senses.IsObjectVisible(npc.GetEntityID(), player.GetEntityID());
    }
    let development = PlayerDevelopmentSystem.GetInstance(player);
    if IsDefined(development) {
      result.streetCred = development.GetProficiencyLevel(player, gamedataProficiencyType.StreetCred);
    }
    let quests = GameInstance.GetQuestsSystem(game);
    if IsDefined(quests) {
      // 게임 2.31의 beforeVikVisit / m_vikTutorial에서 쓰는 실제 방문 완료 fact.
      result.viktorVisitConfirmed = quests.GetFact(n"q001_ripperdoc_done") > 0;
    }
    let prevention = GameInstance.GetScriptableSystemsContainer(game).Get(n"PreventionSystem") as PreventionSystem;
    if IsDefined(prevention) {
      let district = prevention.GetCurrentDistrict();
      if IsDefined(district) && IsDefined(district.GetDistrictRecord()) {
        result.location = GetLocalizedText(district.GetDistrictRecord().LocalizedName());
      }
    }
    let hour = GameTime.Hours(GameInstance.GetGameTime(game));
    result.timeOfDay = hour >= 6 && hour < 12 ? "아침" : (hour >= 12 && hour < 18 ? "낮" : (hour >= 18 && hour < 22 ? "저녁" : "밤"));
    if !result.canObserve { return result; }
    let transaction = GameInstance.GetTransactionSystem(game);
    if IsDefined(transaction) {
      result.weaponKnown = true;
      let weapon = GameObject.GetActiveWeapon(player);
      result.weaponDrawn = IsDefined(weapon);
      if IsDefined(weapon) { result.weaponName = GameContext.ItemName(player, weapon.GetItemID()); }
    }
    let equipment = EquipmentSystem.GetInstance(player);
    if IsDefined(equipment) {
      let data = equipment.GetPlayerData(player);
      if IsDefined(data) {
        result.outfitKnown = true;
        GameContext.AddOutfit(result, player, data, gamedataEquipmentArea.Head, "head");
        GameContext.AddOutfit(result, player, data, gamedataEquipmentArea.Face, "face");
        GameContext.AddOutfit(result, player, data, gamedataEquipmentArea.OuterChest, "outer_chest");
        GameContext.AddOutfit(result, player, data, gamedataEquipmentArea.InnerChest, "inner_chest");
        GameContext.AddOutfit(result, player, data, gamedataEquipmentArea.Legs, "legs");
        GameContext.AddOutfit(result, player, data, gamedataEquipmentArea.Feet, "feet");
        GameContext.AddOutfit(result, player, data, gamedataEquipmentArea.Outfit, "outfit");
      }
    }
    return result;
  }

  private static func ItemName(player: ref<PlayerPuppet>, id: ItemID) -> String {
    if !ItemID.IsValid(id) { return ""; }
    let record = TweakDBInterface.GetItemRecord(ItemID.GetTDBID(id));
    let transaction = GameInstance.GetTransactionSystem(player.GetGame());
    if !IsDefined(record) || !IsDefined(transaction) { return ""; }
    return UIItemsHelper.GetItemName(record, transaction.GetItemData(player, id));
  }

  private static func AddOutfit(result: ref<ContextSnapshot>, player: ref<PlayerPuppet>, data: ref<EquipmentSystemPlayerData>, area: gamedataEquipmentArea, slot: String) -> Void {
    // Outfit에는 visual slot index가 없다. 다른 슬롯만 숨김 여부를 조회한다.
    if NotEquals(area, gamedataEquipmentArea.Outfit) && data.IsSlotHidden(area) { return; }
    // GetVisualItemInSlot은 옷장 외형 덮어쓰기를 우선한다. 가방·스탯·희귀도는 읽지 않는다.
    let id = data.GetVisualItemInSlot(area);
    if !ItemID.IsValid(id) { return; }
    let name = GameContext.ItemName(player, id);
    if StrLen(name) == 0 { result.outfitKnown = false; return; }
    let item = new ContextOutfit();
    item.slot = slot;
    item.displayName = name;
    ArrayPush(result.outfit, item);
  }
}
