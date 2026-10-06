module ANPC

// UF-62: 오리지널 메뉴 이벤트를 사용하며 전투/연출의 메뉴 차단은 그대로 따른다.
public abstract class GameMenu {
  public static func IsOpen(game: GameInstance) -> Bool {
    let bb = GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().UI_System);
    return !IsDefined(bb) || bb.GetBool(GetAllBlackboardDefs().UI_System.IsInMenu);
  }

  public static func Request(game: GameInstance) -> Bool {
    let quests = GameInstance.GetQuestsSystem(game);
    if IsDefined(quests) && quests.GetFact(n"q301_02a_stadium_stopUIInCutscene") > 0 { return false; }
    let bb = GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().MenuEventBlackboard);
    if !IsDefined(bb) { return false; }
    let radial = IsDefined(quests) && quests.GetFact(n"radial_hub_menu_enabled") > 0;
    bb.SetName(GetAllBlackboardDefs().MenuEventBlackboard.MenuEventToTrigger, n"None");
    bb.SetName(GetAllBlackboardDefs().MenuEventBlackboard.MenuEventToTrigger, radial ? n"OnOpenRadialHubMenu" : n"OnOpenHubMenu");
    return true;
  }
}

// 입력칸이 없는 응답/자막 차례에는 기존 메뉴 액션을 소비하거나 두 번 실행하지 않는다.
@wrapMethod(gameuiInGameMenuGameController)
protected cb func OnAction(action: ListenerAction, consumer: ListenerActionConsumer) -> Bool {
  let name = ListenerAction.GetName(action);
  if Equals(ListenerAction.GetType(action), gameinputActionType.BUTTON_RELEASED)
    && (Equals(name, n"OpenHubMenu") || Equals(name, n"OpenInventoryMenu") || Equals(name, n"OpenPerksMenu")) {
    let player = this.GetPlayerControlledObject();
    if IsDefined(player) {
      let entry = Entry.Get(player.GetGame());
      if IsDefined(entry) { entry.PrepareGameMenu(); }
    }
  }
  return wrappedMethod(action, consumer);
}
