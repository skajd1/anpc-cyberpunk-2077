import { readFileSync } from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL(`../content/cyberpunk2077/${name}`,import.meta.url),'utf8'));
export function buildGameStoryData() {
  const registry=read('game-state-bindings.json');
  const keys=['judy','panam','johnny'];
  const quests=['heist','playing_for_time','information','automatic_love','double_life','both_sides_now','talkin_revolution',
    'pisces','pyramid_song','ghost_town','life_during_wartime','riders_storm','little_help','queen_highway',
    'down_on_the_street','tapeworm','chippin_in','like_supreme','changes','where_mind','path_glory','new_dawn','all_watchtower','things_done'];
  const facts=['judy_knows_johnny','sq026_13_maiko_money','sq026_side_maiko','sq026_maiko_boss','sq026_maiko_dead',
    'sq030_judy_lover','sq027_panam_knows_about_chip','sq027_panam_doesnt_know_about_johnny','sq027_panam_lover',
    'sq027_failed','sq032_johnny_friend','q115_point_of_no_return','q307_start'];
  for(const fact of facts) if(!registry.fact_bindings.find(f=>f.fact===fact && f.write_count>0)) throw new Error(`게임 파일 쓰기 근거 없음: ${fact}`);
  return {version:'priority-story-1',keys,quests:registry.quest_bindings.filter(q=>quests.includes(q.policy_id)).map(q=>({id:q.policy_id,path:q.journal.path})),facts};
}

export function renderGameStoryCollector(data) {
  const reads=data.quests.map(q=>`    GameStory.AddQuest(result, journal, "${q.id}", "${q.path}");`).join('\n');
  const facts=data.facts.map(f=>`    GameStory.AddFact(result, quests, "${f}");`).join('\n');
  return `// 생성 파일: scripts/build-game-story.mjs. 원본 상태는 읽기만 한다.
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
${reads}
${facts}
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
`;
}
