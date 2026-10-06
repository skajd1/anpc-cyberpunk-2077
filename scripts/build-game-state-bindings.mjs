// 읽기 전용 게임 파일 조사 결과. runtime_enabled=false인 매핑 후보 등록표를 생성한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const [referenceRoot='config.local.story-reference',output='content/cyberpunk2077/game-state-bindings.json']=process.argv.slice(2);
const load=path=>JSON.parse(readFileSync(path,'utf8'));
const refs=resolve(referenceRoot);
const evidence=load(`${refs}/evidence-index.json`);
const policy=load('content/cyberpunk2077/story-progression-policy.json');
const fileMap=new Map(evidence.files.map(f=>[f.resource,f]));
const names=new Map();
for (const path of [
  'en-raw/base/localization/en-us/onscreens/onscreens.json.json',
  'ep1-en-raw/ep1/localization/en-us/onscreens/onscreens.json.json',
  'ep1-en-raw/ep1/localization/en-us/onscreens/onscreens_final.json.json'
]) for (const e of load(`${refs}/${path}`).Data.RootChunk.root.Data.entries) if(e.femaleVariant) names.set(e.primaryKey,e.femaleVariant);

const journal=[];
function walkJournal(entry,path,resource,hash) {
  const d=entry.Data??entry;
  const next=d.id?[...path,d.id]:path;
  if(d.$type==='gameJournalQuest') journal.push({path:next.join('/'),class_name:d.$type,type:d.type,
    title_key:d.title?.value??null,title:names.get(d.title?.value?.replace('LocKey#',''))??null,resource,sha256:hash});
  for(const child of d.entries??[]) walkJournal(child,next,resource,hash);
}
for(const resource of ['base/journal/cooked_journal.journal','ep1/journal/cooked_journal.journal']) {
  const raw=`${refs}/ep1-journal-raw/${resource}`;
  walkJournal(load(`${raw}.json`).Data.RootChunk.entry,[],resource,createHash('sha256').update(readFileSync(raw)).digest('hex'));
}
const normalize=s=>(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const curatedPaths={blistering_love:'quests/side_quest/sq031_cinema'};
const questBindings=policy.quests.map(q=>{
  let matches=journal.filter(j=>normalize(j.title)===normalize(q.title));
  if(curatedPaths[q.id]) matches=matches.filter(j=>j.path===curatedPaths[q.id]);
  return {policy_id:q.id,title:q.title,track:q.track,file_status:matches.length===1?'journal_path_confirmed':'needs_review',
    runtime_verified:false,journal:matches.length===1?matches[0]:null};
});
if(questBindings.some(q=>!q.journal)) throw new Error('미확인 또는 중복 일지 경로가 있습니다. 제목만으로 임의 선택하지 않습니다.');

const factIDs=[
  'judy_knows_johnny','q105_02_judy_truth_told','sq027_panam_knows_about_chip','sq027_panam_doesnt_know_about_johnny',
  'sq029_river_knows_johnny','sq031_rogue_met_johnny','q303_somi_told_about_cure','ep1_songbird_known',
  'sq030_judy_lover','sq027_panam_lover','sq029_river_lover','sq028_kerry_relationship','sq028_kerry_friend',
  'sq028_kerry_sex','sq029_river_had_sex','sq032_johnny_friend','sq031_rogue_lover',
  'sq026_13_maiko_money','sq026_side_maiko','sq026_maiko_dead','sq026_maiko_boss','sq026_refused_maiko',
  'sq027_failed','sq021_randy_saved','sq021_randy_kaputt','q112_takemura_dead',
  'q306_somi_betrayed','q305_fact_songbird_dead','q305_songbird_alive',
  'q101_done','q115_point_of_no_return','q307_start','q307_done',
  // 이름만으로 채택할 수 없는 사례. 테스트 전용 기록을 구분한다.
  'sq028_kerry_lover','judy_relationship','panam_relationship'
];
const nonTest=resource=>!/(?:\/versions\/|\/test\/|\/definitions\/|chicken|prototype)/i.test(resource);
const factBindings=factIDs.map(fact=>{
  const all=evidence.facts[fact]??[];
  const candidates=all.filter(e=>nonTest(e.resource));
  const writes=candidates.filter(e=>['set','add'].includes(e.operation));
  const reads=candidates.filter(e=>e.operation==='read');
  const select=list=>list.slice(0,3).map(e=>({...e,sha256:fileMap.get(e.resource)?.sha256}));
  return {fact,file_status:writes.length?'non_test_writer_found':'no_non_test_writer_found',runtime_verified:false,
    write_count:writes.length,read_count:reads.length,writers:select(writes),readers:select(reads),
    other_occurrences:all.length-candidates.length};
});
const npcScopes=[
  ['viktor',[],['ripperdoc','playing_for_time','paid_full'],'진단·기존 안면·상환을 각각 분리. 진단 장면 완료의 인지 연결은 추가 경로 검토.'],
  ['misty',[],['playing_for_time'],'재키 상실과 V 진단·조니 인지를 분리. 관련 장면 경로 검토.'],
  ['judy',['judy_knows_johnny','q105_02_judy_truth_told','sq030_judy_lover','sq026_13_maiko_money','sq026_maiko_dead'],['information','double_life','talkin_revolution','pisces','pyramid_song'],'습격 의뢰 정보·조니 인지·연인·보수 수령 단절을 분리.'],
  ['panam',['sq027_panam_knows_about_chip','sq027_panam_doesnt_know_about_johnny','sq027_panam_lover','sq027_failed'],['ghost_town','life_during_wartime','riders_storm','little_help','queen_highway'],'칩 설명과 조니 설명을 분리. 조니 비인지 fact=0만으로 인지를 확정하지 않음. 실패 원인의 사울 공개 분기는 추가 검토.'],
  ['river',['sq029_river_knows_johnny','sq029_river_lover','sq029_river_had_sex','sq021_randy_saved','sq021_randy_kaputt'],['fought_law','hunt','following_river'],'구출 결과·성관계·연인 관계·조니 공개는 별개.'],
  ['kerry',['sq028_kerry_friend','sq028_kerry_relationship','sq028_kerry_sex'],['holdin_on','second_conflict','like_supreme','boat_drinks'],'친구/관계 선택과 성관계를 분리. sq028_kerry_lover는 현재 조사에서 테스트 쓰기만 발견하여 실행 후보 제외.'],
  ['goro',['q112_takemura_dead'],['down_on_the_street','gimme_danger','play_it_safe','search_and_destroy'],'구출 분기 해결 전 dead=0을 saved로 판정하지 않음. 조니 인지의 별도 공개 근거 검토.'],
  ['rogue',['sq031_rogue_met_johnny','sq031_rogue_lover'],['ghost_town','chippin_in','blistering_love'],'조니에게 몸을 빌린 사건과 V 자신의 관계를 분리. 조니의 데이트를 V의 연인 관계로 투영하지 않음.'],
  ['johnny',['sq032_johnny_friend'],['playing_for_time','tapeworm','chippin_in','changes'],'유전의 두 번째 기회 분기와 렐릭 접촉·분리를 분리. 수치 호감도로 변환하지 않음.'],
  ['jackie',[],['rescue','heist'],'습격 대상 칩 지식과 이식 후 상태를 분리. 습격 이후 생존한 자유 NPC로 처리하지 않음.'],
  ['evelyn',[],['information','heist','disasterpiece'],'습격 대상 칩 지식과 V의 후반 진단을 분리. 덱스 제외 제안의 실제 분기 추가 검토.'],
  ['songbird',['ep1_songbird_known','q303_somi_told_about_cure','q306_somi_betrayed','q305_fact_songbird_dead','q305_songbird_alive'],['dog_eat_dog','know_my_name','firestarter','killing_moon','somewhat_damaged','things_done'],'소미 자신의 지식·V에게 공개한 내용·치료 한계·경로/생존을 분리. 달 출발/FIA 인계는 별도 경로 검토.']
].map(([character_key,facts,quests,limits])=>({character_key,facts,quests,limits,semantic_review:'pending',runtime_verified:false}));

const result={schema_version:'0.1',status:'static_research',runtime_enabled:false,game_version:'2.31',
  scope:{characters:12,policy_quests:82,main_progress:'개별 일지 상태와 본편 구간·독립 수사 경로. 전체 퀘스트 수를 분모로 진행률을 만들지 않음.'},
  coverage:{resources:evidence.files.length,distinct_facts:Object.keys(evidence.facts).length,choice_nodes:evidence.choices.length,
    journal_mutations:evidence.journal.length,journal_quests:journal.length},
  read_apis:['QuestsSystem.GetFact','JournalManager.GetEntryByString','JournalManager.GetEntryState'],
  excluded_write_apis:['SetFact','SetFactStr','ChangeEntryState'],
  knowledge_dimensions:['heist_target','relic_implanted','johnny_presence','diagnosis','treatment_plan','treatment_limits'],
  unknown_rules:['미기록 0과 명시적 거절을 동일시하지 않음','상충하는 분기는 unknown','선택지 ID를 저장된 선택 로그로 간주하지 않음'],
  quest_bindings:questBindings,fact_bindings:factBindings,npc_scopes:npcScopes,
  choice_trace_examples:[{resource:'base/quest/side_quests/sq026/scenes/sq026_08_plan.scene',choice_node:1180,
    option_id:5378,caption:'doesnt know',output_socket:{name:0,ordinal:2},route:[1180,1185,2696],
    writer:{fact:'judy_knows_johnny',operation:'set',value:1},status:'graph_route_confirmed',runtime_verified:false}],
  cautions:['동명 fact 후보·테스트 전용·구버전·동명 메타 일지/실제 퀘스트를 구분','정적 경로와 실행 중 저장 상태는 별도로 검증']};
writeFileSync(output,JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify({quest_bindings:questBindings.length,fact_bindings:factBindings.length,npcs:npcScopes.length,runtime_enabled:false}));
