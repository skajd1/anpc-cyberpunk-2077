// WolvenKit의 로컬 JSON 덤프를 읽는다. 게임 자산/대사 원문은 결과에 복사하지 않는다.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function inspectResource(root, resource) {
  const facts = [], choices = [], journal = [], references = [];
  function walk(value, pointer='', sceneNode=null, questNode=null) {
    if (!value || typeof value !== 'object') return;
    const type=value.$type ?? '';
    if (/^scn.*Node$/.test(type)) sceneNode=value.nodeId?.id ?? sceneNode;
    if (/^quest.*NodeDefinition$/.test(type)) questNode=value.id ?? questNode;
    if (typeof value.factName==='string' && value.factName.length) {
      facts.push({fact:value.factName,resource,pointer,scene_node:sceneNode,quest_node:questNode,type,
        operation:type==='questSetVar_NodeType' ? (value.setExactValue===1 ? 'set' : 'add') : type.includes('ConditionType') ? 'read' : 'other',
        value:value.value ?? null,comparison:value.comparisonType ?? null});
    }
    if (type==='scnChoiceNode') {
      choices.push({resource,node_id:value.nodeId?.id,options:(value.options ?? []).map((option,index)=>({index,
        screenplay_id:option.screenplayOptionId?.id,caption:option.caption?.$value ?? null,
        has_condition:!!option.questCondition})),output_sockets:(value.outputSockets ?? []).map(s=>({
          name:s.stamp?.name,ordinal:s.stamp?.ordinal,destinations:(s.destinations ?? []).map(d=>d.nodeId?.id)}))});
    }
    if (/quest.*Journal.*NodeType/.test(type)) journal.push({resource,pointer,scene_node:sceneNode,quest_node:questNode,
      type,path:value.path?.Data?.realPath ?? value.path?.realPath ?? null,state:value.state ?? null});
    if (typeof value.DepotPath?.$value==='string' && /\.(quest|questphase|scene)$/.test(value.DepotPath.$value)) {
      references.push(value.DepotPath.$value);
    }
    for (const [key,child] of Object.entries(value)) walk(child,`${pointer}/${key.replaceAll('~','~0').replaceAll('/','~1')}`,sceneNode,questNode);
  }
  walk(root);
  return {facts,choices,journal,references:[...new Set(references)]};
}

export function extractEvidence(roots) {
  const files=[], facts={}, choices=[], journal=[];
  function scan(directory,base,layer) {
    for (const entry of readdirSync(directory,{withFileTypes:true})) {
      const path=join(directory,entry.name);
      if (entry.isDirectory()) {scan(path,base,layer);continue;}
      if (!/\.(quest|questphase|scene)\.json$/.test(entry.name)) continue;
      const dump=JSON.parse(readFileSync(path,'utf8'));
      const resource=relative(base,path).replaceAll('\\','/').replace(/\.json$/,'');
      const result=inspectResource(dump.Data.RootChunk,resource);
      const hash=createHash('sha256').update(readFileSync(path.slice(0,-5))).digest('hex');
      files.push({resource,source_layer:layer,sha256:hash,game_version:dump.Header.GameVersion,references:result.references});
      for (const item of result.facts) {const {fact,...evidence}=item;(facts[fact]??=[]).push({...evidence,source_layer:layer});}
      choices.push(...result.choices.map(c=>({...c,source_layer:layer})));journal.push(...result.journal.map(j=>({...j,source_layer:layer})));
    }
  }
  for (const [layer,root] of roots.entries()) scan(resolve(root),resolve(root),layer);
  return {format_version:1,source:'local_game_files',runtime_verified:false,files,facts,choices,journal};
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [output,...roots]=process.argv.slice(2);
  if (!output || !roots.length) throw new Error('사용: node scripts/extract-game-story-evidence.mjs <결과.json> <로컬 덤프 폴더>...');
  const result=extractEvidence(roots);
  writeFileSync(output,JSON.stringify(result),{encoding:'utf8'});
  console.log(JSON.stringify({files:result.files.length,facts:Object.keys(result.facts).length,choices:result.choices.length,journal:result.journal.length}));
}
