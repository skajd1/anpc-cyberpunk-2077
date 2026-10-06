// 생성 파일: scripts/build-game-story.mjs. 원본 상태는 읽기만 한다.
module ANPC
public class StoryQuestValue extends IScriptable { public let id: String; public let status: String; }
public class StoryFactValue extends IScriptable { public let name: String; public let value: Int32; }
public class StorySnapshot extends IScriptable {
  public let journalKnown: Bool;
  public let factsKnown: Bool;
  public let quests: array<ref<StoryQuestValue>>;
  public let facts: array<ref<StoryFactValue>>;
}
public abstract class GameStory {
  public static func Collect(player: ref<PlayerPuppet>) -> ref<StorySnapshot> {
    let result = new StorySnapshot();
    if !IsDefined(player) { return result; }
    let game = player.GetGame();
    let journal = GameInstance.GetJournalManager(game);
    let quests = GameInstance.GetQuestsSystem(game);
    result.journalKnown = IsDefined(journal);
    result.factsKnown = IsDefined(quests);
    GameStory.AddQuest(result, journal, "information", "quests/main_quest/prologue/q004_braindance");
    GameStory.AddQuest(result, journal, "heist", "quests/main_quest/prologue/q005_heist");
    GameStory.AddQuest(result, journal, "playing_for_time", "quests/main_quest/act_01/q101_resurrection");
    GameStory.AddQuest(result, journal, "automatic_love", "quests/main_quest/act_01/q105_dollhouse");
    GameStory.AddQuest(result, journal, "double_life", "quests/main_quest/act_01/q105_04_judys");
    GameStory.AddQuest(result, journal, "ghost_town", "quests/main_quest/act_01/q103_warhead");
    GameStory.AddQuest(result, journal, "life_during_wartime", "quests/main_quest/act_01/q104_02_av_chase");
    GameStory.AddQuest(result, journal, "down_on_the_street", "quests/main_quest/act_01/q112_01_old_friend");
    GameStory.AddQuest(result, journal, "both_sides_now", "quests/side_quest/sq026_01_suicide");
    GameStory.AddQuest(result, journal, "talkin_revolution", "quests/side_quest/sq026_03_pizza");
    GameStory.AddQuest(result, journal, "pisces", "quests/side_quest/sq026_04_hiromi");
    GameStory.AddQuest(result, journal, "pyramid_song", "quests/side_quest/sq030_judy_romance");
    GameStory.AddQuest(result, journal, "riders_storm", "quests/side_quest/sq004_riders_on_the_storm");
    GameStory.AddQuest(result, journal, "little_help", "quests/side_quest/sq027_01_basilisk_convoy");
    GameStory.AddQuest(result, journal, "queen_highway", "quests/side_quest/sq027_02_raffen_shiv_attack");
    GameStory.AddQuest(result, journal, "tapeworm", "quests/side_quest/sq032_tapeworm");
    GameStory.AddQuest(result, journal, "chippin_in", "quests/side_quest/sq031_rogue");
    GameStory.AddQuest(result, journal, "like_supreme", "quests/side_quest/sq011_concert");
    GameStory.AddQuest(result, journal, "things_done", "ep1/quests/main_quest/q307_tomorrow");
    GameStory.AddQuest(result, journal, "where_mind", "quests/main_quest/epilogues/q201_heir");
    GameStory.AddQuest(result, journal, "changes", "quests/main_quest/act_01/q116_cyberspace");
    GameStory.AddQuest(result, journal, "path_glory", "quests/main_quest/epilogues/q203_legend");
    GameStory.AddQuest(result, journal, "new_dawn", "quests/main_quest/epilogues/q204_reborn");
    GameStory.AddQuest(result, journal, "all_watchtower", "quests/main_quest/epilogues/q202_nomads");
    GameStory.AddFact(result, quests, "judy_knows_johnny");
    GameStory.AddFact(result, quests, "sq026_13_maiko_money");
    GameStory.AddFact(result, quests, "sq026_side_maiko");
    GameStory.AddFact(result, quests, "sq026_maiko_boss");
    GameStory.AddFact(result, quests, "sq026_maiko_dead");
    GameStory.AddFact(result, quests, "sq030_judy_lover");
    GameStory.AddFact(result, quests, "sq027_panam_knows_about_chip");
    GameStory.AddFact(result, quests, "sq027_panam_doesnt_know_about_johnny");
    GameStory.AddFact(result, quests, "sq027_panam_lover");
    GameStory.AddFact(result, quests, "sq027_failed");
    GameStory.AddFact(result, quests, "sq032_johnny_friend");
    GameStory.AddFact(result, quests, "q115_point_of_no_return");
    GameStory.AddFact(result, quests, "q307_start");
    return result;
  }
  private static func AddQuest(result: ref<StorySnapshot>, journal: ref<JournalManager>, id: String, path: String) -> Void {
    let item = new StoryQuestValue();
    item.id = id;
    item.status = "unknown";
    if IsDefined(journal) {
      let entry = journal.GetEntryByString(path, "gameJournalQuest") as JournalQuest;
      if IsDefined(entry) {
        let state = journal.GetEntryState(entry);
        if Equals(state, gameJournalEntryState.Inactive) { item.status = "not_started"; }
        if Equals(state, gameJournalEntryState.Active) { item.status = "active"; }
        if Equals(state, gameJournalEntryState.Succeeded) { item.status = "completed"; }
        if Equals(state, gameJournalEntryState.Failed) { item.status = "failed"; }
      }
    }
    ArrayPush(result.quests, item);
  }
  private static func AddFact(result: ref<StorySnapshot>, quests: ref<QuestsSystem>, name: String) -> Void {
    if !IsDefined(quests) { return; }
    let item = new StoryFactValue();
    item.name = name;
    item.value = quests.GetFactStr(name);
    ArrayPush(result.facts, item);
  }
}
