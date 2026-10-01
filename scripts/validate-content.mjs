import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('content/cyberpunk2077');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const manifest=read('manifest.json'), sources=read('sources.json').sources;
const facts=read('world-facts.json'), knowledge=read('knowledge.json'), examples=read('dialogue-examples.json');
const cards=manifest.files.filter(x=>x.startsWith('characters/')).map(read), policy=read('crowd-knowledge-policy.json');
const errors=[];
const check=(ok,message)=>{if(!ok)errors.push(message);};
const objects=[...facts,...knowledge,...examples,...cards];
const ids=new Map();
for(const x of objects){check(!ids.has(x.id),'중복 ID: '+x.id);ids.set(x.id,x);check(x.schema_version==='0.1'&&x.revision>=1,'객체 버전 오류: '+x.id);}
const sourceIds=new Set(sources.map(s=>s.id));
check(sourceIds.size===sources.length,'출처 ID 중복');
function condition(c,owner){
 check(c&&typeof c==='object','조건 누락: '+owner);if(!c||typeof c!=='object')return;
 if(c.all||c.any){const list=c.all||c.any;check(Array.isArray(list)&&list.length>0,'빈 조건: '+owner);if(Array.isArray(list))list.forEach(x=>condition(x,owner));return;}
 if(c.not){condition(c.not,owner);return;}
 check(typeof c.field==='string'&&c.field.startsWith('content.')&&['eq','in','gte','lte'].includes(c.op),'잘못된 논리 조건: '+owner);
 check(c.value!==undefined,'조건 값 누락: '+owner);
 if(c.op==='in')check(Array.isArray(c.value)&&c.value.length>0,'조건 목록 오류: '+owner);
 if(c.field?.startsWith('content.grants.'))check(ids.get(c.field.slice('content.grants.'.length))?.kind==='world_fact','인지 사실 참조 오류: '+owner);
}
for(const f of facts){check(sourceIds.has(f.source?.source_id),'출처 누락: '+f.id);check(/^https:\/\//.test(f.source?.url??''),'출처 URL 누락: '+f.id);condition(f.validity_condition,f.id);}
const owners=new Set(cards.map(c=>c.character_key));
const playerFact=ids.get(manifest.player_identity_fact_id);
check(playerFact?.kind==='world_fact'&&playerFact.player_identity?.character_key==='v'&&playerFact.player_identity?.display_name==='V','플레이어 기준 신원은 V여야 한다');
const depths=['unknown','awareness','familiar','practical','specialist'];
for(const k of knowledge){
 const card=cards.find(c=>c.character_key===k.owner_key);
 check(card?.knowledge_profile?.domains.some(d=>d.domain_id===k.domain_id),'지식 분야 참조 오류: '+k.id);
 check(depths.includes(k.required_depth)&&k.required_depth!=='unknown','지식 요구 깊이 오류: '+k.id);
}
for(const k of knowledge){check(ids.get(k.fact_id)?.kind==='world_fact','지식 사실 참조 오류: '+k.id);check(owners.has(k.owner_key),'지식 소유자 오류: '+k.id);condition(k.access_condition,k.id);if(k.fact_id==='RELIC_V')check(JSON.stringify(k.access_condition).includes('content.player_disclosure.relic'),'렐릭 공개 조건 누락: '+k.id);}
for(const c of cards){
 if(c.presentation){
  check(typeof c.presentation.role==='string'&&c.presentation.role.trim().length>0,'표시 역할 오류: '+c.id);
  check(c.presentation.identity_slots&&typeof c.presentation.identity_slots==='object'&&!Array.isArray(c.presentation.identity_slots),'표시 슬롯 객체 오류: '+c.id);
  for(const [key,tags] of Object.entries(c.presentation.identity_slots??{})){
   check(Array.isArray(c.identity[key]),'표시 슬롯의 정체성 참조 오류: '+c.id+' / '+key);
   check(Array.isArray(tags)&&tags.length>0&&tags.every(t=>typeof t==='string'&&t.trim().length>0),'표시 특성 목록 오류: '+c.id+' / '+key);
  }
 }
 const profile=c.knowledge_profile;
 check(profile?.version==='1.0'&&profile.default_depth==='unknown','인지 프로필 누락: '+c.id);
 const domains=profile?.domains??[];
 check(domains.length>0&&new Set(domains.map(d=>d.domain_id)).size===domains.length,'인지 분야 누락·중복: '+c.id);
 for(const d of domains){
  check(depths.includes(d.depth)&&['unverified','source_role','authored_candidate'].includes(d.basis)&&d.review_status==='draft','인지 깊이·근거 오류: '+c.id+' / '+d.domain_id);
  check((d.basis!=='unverified'||d.depth==='unknown')&&(d.basis!=='source_role'||d.evidence_refs.length>0),'인지 근거 상태 불일치: '+c.id+' / '+d.domain_id);
  for(const ref of d.evidence_refs)check(ids.get(ref)?.kind==='world_fact','인지 근거 참조 오류: '+c.id+' / '+ref);
 }
 for(const ref of profile?.exposure_background?.evidence_refs??[])check(ids.get(ref)?.kind==='world_fact','노출 배경 근거 오류: '+c.id);
 check(c.identity_structure_version==='1.0'&&c.review_status==='draft'&&c.runtime_enabled===false,'현재 조사 카드 활성 상태 오류: '+c.id);
 check(c.phase_labels.length>0&&c.identity_rules.length>0&&c.example_ids.length>0,'정체성 자료 누락: '+c.id);
 condition(c.dialogue_conditions,c.id);
 for(const id of c.research_sources)check(sourceIds.has(id),'인물 조사 출처 오류: '+c.id+' / '+id);
 for(const id of c.knowledge_ids)check(ids.get(id)?.kind==='knowledge_entry'&&ids.get(id)?.owner_key===c.character_key,'다른 인물 지식 혼입: '+c.id+' / '+id);
 for(const id of c.example_ids)check(ids.get(id)?.kind==='dialogue_example'&&ids.get(id)?.character_keys.includes(c.character_key),'예시 인물 혼입: '+c.id+' / '+id);
 for(const id of c.source_ids)check(ids.get(id)?.kind==='world_fact','인물 근거 오류: '+c.id);
 for(const r of c.identity_rules){condition(r.context_condition,r.id);r.evidence_refs.forEach(id=>check(ids.get(id)?.kind==='world_fact','판단 근거 오류: '+r.id));}
}
for(const ex of examples){condition(ex.context_condition,ex.id);check(ex.review_status==='draft'&&ex.provenance==='authored_adaptation','작성 예시를 원작/검수 완료로 오인: '+ex.id);ex.required_fact_ids.forEach(id=>check(ids.get(id)?.kind==='world_fact','예시 사실 오류: '+ex.id));}
for(const b of policy.bundles)for(const id of b.fact_ids){const f=ids.get(id);check(f?.kind==='world_fact','지식 묶음 참조 오류: '+id);check(f&&!['personal','quest'].includes(f.knowledge_layer)&&f.spoiler_scope==='none','군중 묶음 비밀 포함: '+id);}
for(const file of manifest.files)check(fs.existsSync(path.join(root,file)),'자료 파일 누락: '+file);
const actual={characters:cards.length,world_facts:facts.length,knowledge_entries:knowledge.length,dialogue_examples:examples.length,knowledge_bundles:policy.bundles.length};
for(const [key,count] of Object.entries(actual))check(manifest.counts[key]===count,'집계 불일치: '+key);
console.log(JSON.stringify({status:errors.length?'실패':'통과',sources:sources.length,...actual,errors},null,2));
if(errors.length)process.exitCode=1;
