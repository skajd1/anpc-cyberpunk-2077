import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGameStoryData,renderGameStoryCollector } from '../../scripts/game-story-data.mjs';
const data=JSON.parse(readFileSync(new URL('../../content/cyberpunk2077/game-state-bindings.json',import.meta.url),'utf8'));
const policy=JSON.parse(readFileSync(new URL('../../content/cyberpunk2077/story-progression-policy.json',import.meta.url),'utf8'));

test('UF-66 우선 수집기는 근거가 있는 주디/팬앰/조니 자료와 읽기 API만 사용한다',()=>{
  const selected=buildGameStoryData();
  assert.deepEqual(selected.keys,['judy','panam','johnny']);
  for(const fact of selected.facts) assert.ok(data.fact_bindings.find(f=>f.fact===fact && f.write_count>0));
  const source=renderGameStoryCollector(selected);
  assert.equal(readFileSync(new URL('../../game/redscript/ANPC/Story.reds',import.meta.url),'utf8').replaceAll('\r\n','\n'),source);
  assert.doesNotMatch(source,/SetFact|ChangeEntryState|SetEntryVisited/);
  assert.match(source,/item.status = "unknown"/);
  assert.match(source,/GetEntryByString\(path, "gameJournalQuest"\)/);
  assert.match(source,/GetFactStr\(name\)/);
});

test('UF-66 모든 기존 진행 후보에 실제 일지 경로·자원 해시를 남기고 미검증 상태를 유지한다',()=>{
  assert.equal(data.runtime_enabled,false);
  assert.deepEqual(data.quest_bindings.map(q=>q.policy_id).sort(),policy.quests.map(q=>q.id).sort());
  assert.equal(new Set(data.quest_bindings.map(q=>q.policy_id)).size,82);
  for(const q of data.quest_bindings) {
    assert.equal(q.journal.class_name,'gameJournalQuest');
    assert.match(q.journal.path,/^(ep1\/)?quests\//);
    assert.match(q.journal.sha256,/^[0-9a-f]{64}$/);
    assert.equal(q.runtime_verified,false);
  }
  assert.equal(data.quest_bindings.find(q=>q.policy_id==='blistering_love').journal.path,'quests/side_quest/sq031_cinema');
});

test('UF-66 테스트 전용 케리 lover와 실제 친구/관계/성관계를 혼동하지 않는다',()=>{
  const fact=id=>data.fact_bindings.find(f=>f.fact===id);
  assert.equal(fact('sq028_kerry_lover').write_count,0);
  assert.ok(fact('sq028_kerry_lover').other_occurrences>0);
  for(const id of ['sq028_kerry_relationship','sq028_kerry_friend','sq028_kerry_sex']) assert.ok(fact(id).write_count>0);
  const scope=data.npc_scopes.find(n=>n.character_key==='kerry');
  assert.ok(!scope.facts.includes('sq028_kerry_lover'));
  assert.equal(data.npc_scopes.length,12);
  assert.ok(data.npc_scopes.every(n=>n.runtime_verified===false));
});

test('UF-66 조니 인지 공개 경로와 칩 인지를 분리하고 타케무라의 명시적 0 기록을 보존한다',()=>{
  const fact=id=>data.fact_bindings.find(f=>f.fact===id);
  assert.ok(fact('judy_knows_johnny').writers.some(w=>w.scene_node===2696 && w.value===1));
  assert.ok(fact('q112_takemura_dead').writers.some(w=>w.value===0));
  assert.ok(fact('q112_takemura_dead').writers.some(w=>w.value===1));
  assert.ok(data.knowledge_dimensions.includes('relic_implanted'));
  assert.ok(data.knowledge_dimensions.includes('johnny_presence'));
  for(const f of data.fact_bindings) for(const w of f.writers) {
    assert.ok(['set','add'].includes(w.operation));
    assert.ok(Number.isInteger(w.value));
    assert.match(w.sha256,/^[0-9a-f]{64}$/);
  }
});
