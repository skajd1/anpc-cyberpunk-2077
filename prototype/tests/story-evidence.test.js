import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectResource } from '../../scripts/extract-game-story-evidence.mjs';

test('UF-66 fact의 설정/가산/검사와 장면·퀘스트 노드를 구분하며 0을 보존한다',()=>{
  const root={Data:{$type:'scnQuestNode',nodeId:{id:17},questNode:{Data:{$type:'questFactsDBManagerNodeDefinition',id:8,
    type:{Data:{$type:'questSetVar_NodeType',factName:'disclosed',setExactValue:1,value:0}}}},
    extra:[{$type:'questSetVar_NodeType',factName:'visits',setExactValue:0,value:1},
      {$type:'questVarComparison_ConditionType',factName:'disclosed',comparisonType:'GreaterOrEqual',value:1}]}};
  const result=inspectResource(root,'scene.scene');
  assert.deepEqual(result.facts.map(x=>[x.operation,x.value]),[['set',0],['add',1],['read',1]]);
  assert.equal(result.facts[0].scene_node,17);assert.equal(result.facts[0].quest_node,8);
  assert.equal(result.facts[0].resource,'scene.scene');assert.match(result.facts[0].pointer,/questNode\/Data/);
});

test('UF-66 옵션 ID와 출력 소켓을 독립적으로 보존하고 저장된 선택 기록으로 만들지 않는다',()=>{
  const root={$type:'scnChoiceNode',nodeId:{id:9},options:[{screenplayOptionId:{id:11},caption:{$value:'tell'},questCondition:null}],
    outputSockets:[{stamp:{name:0,ordinal:3},destinations:[{nodeId:{id:20}}]}]};
  const result=inspectResource(root,'q.scene');
  assert.equal(result.choices[0].options[0].screenplay_id,11);
  assert.equal(result.choices[0].options[0].outputs,undefined);
  assert.deepEqual(result.choices[0].output_sockets,[{name:0,ordinal:3,destinations:[20]}]);
  assert.equal(result.choices[0].selected,undefined);
});

test('UF-66 일지 경로와 자원 참조를 읽고 빈 fact를 제외한다',()=>{
  const root={a:{$type:'questJournalQuest_NodeType',path:{Data:{realPath:'quests/q/main'}},state:'Succeeded'},
    b:{DepotPath:{$value:'base\\q.questphase'}},c:{$type:'questSetVar_NodeType',factName:'',value:0}};
  const result=inspectResource(root,'root.quest');
  assert.equal(result.journal[0].path,'quests/q/main');assert.equal(result.journal[0].state,'Succeeded');
  assert.deepEqual(result.references,['base\\q.questphase']);assert.equal(result.facts.length,0);
});
