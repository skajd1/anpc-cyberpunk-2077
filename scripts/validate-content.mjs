import fs from 'node:fs';
import path from 'node:path';
import { validateCorePersonality } from '../prototype/public/personality.js';
import { resolveRelationshipStage, relationshipContext } from '../prototype/public/research.js';
const root=path.resolve('content/cyberpunk2077');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const manifest=read('manifest.json'), sources=read('sources.json').sources;
const facts=read('world-facts.json'), knowledge=read('knowledge.json'), examples=read('dialogue-examples.json');
const cards=manifest.files.filter(x=>x.startsWith('characters/')).map(read), policy=read('crowd-knowledge-policy.json');
const worldPolicy=read('world-knowledge-policy.json');
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
for(const f of facts){
 check(sourceIds.has(f.source?.source_id),'출처 누락: '+f.id);check(/^https:\/\//.test(f.source?.url??''),'출처 URL 누락: '+f.id);condition(f.validity_condition,f.id);
 if(f.entity_aliases!==undefined)check(Array.isArray(f.entity_aliases)&&f.entity_aliases.length>0
  &&f.entity_aliases.every(a=>typeof a==='string'&&a.trim())&&new Set(f.entity_aliases).size===f.entity_aliases.length,'인명 별칭 누락·중복: '+f.id);
 if(f.topic_tags.includes('public_figure'))check(f.knowledge_layer==='common'&&f.spoiler_scope==='none'&&f.usage_mode==='answer','공개 인물 개요에 비밀 포함: '+f.id);
}
const categories=new Set(worldPolicy.categories.map(c=>c.category_id));
check(categories.size===11&&worldPolicy.categories.length===11,'공통 세계관 분류 누락·중복');
check(new Set(worldPolicy.baseline_fact_ids).size===worldPolicy.baseline_fact_ids.length,'핵심 상식 ID 중복');
const baseline=worldPolicy.baseline_fact_ids.map(id=>ids.get(id));
for(const f of baseline)check(f?.kind==='world_fact'&&f.knowledge_layer==='common'&&f.spoiler_scope==='none'&&f.usage_mode==='answer'&&f.injection_mode==='baseline','핵심 상식 비공개·미등록 사실: '+f?.id);
for(const f of facts)check(categories.has(f.category_id)&&['baseline','selected'].includes(f.injection_mode),'세계관 분류·주입 규격 오류: '+f.id);
const common=worldPolicy.categories.map(c=>({category_id:c.category_id,statements:baseline.filter(f=>f?.category_id===c.category_id).map(f=>f.statement)}));
check(common.every(c=>c.statements.length>0)&&[...JSON.stringify(common)].length<=worldPolicy.baseline_max_characters,'공통 상식 분류 공백·입력 한도 초과');
check(worldPolicy.detail_max_items===3,'세부 지식 선별 한도 오류');
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
 try { validateCorePersonality(c.core_personality); } catch(error) { check(false,c.id+' / '+error.message); }
 check(Array.isArray(c.personal_principles)&&c.personal_principles.length>0&&c.personal_principles.every(p=>typeof p==='string'&&p.trim()),'개인 원칙 누락: '+c.id);
 if(c.presentation){
  check(typeof c.presentation.role==='string'&&c.presentation.role.trim().length>0,'표시 역할 오류: '+c.id);
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
 const stages=c.relationship_stages??[];
 check(stages.length>0&&new Set(stages.map(s=>s.id)).size===stages.length,'관계 단계 누락·중복: '+c.id);
 for(const s of stages){
  const nonempty=v=>typeof v==='string'&&v.trim().length>0;
  check(nonempty(s.id)&&nonempty(s.label)&&c.phase_labels.includes(s.phase)&&typeof s.available==='boolean'&&s.review_status==='draft','관계 단계 형식 오류: '+c.id+' / '+s.id);
  check(['label','attitude','address'].every(k=>nonempty(s.relationship?.[k])),'관계 태도·호칭 누락: '+c.id+' / '+s.id);
  for(const key of ['requirements','known_past_event_ids','current_goals','source_ids'])check(Array.isArray(s[key])&&s[key].length>0&&s[key].every(nonempty),'관계 단계 목록 오류: '+c.id+' / '+s.id+' / '+key);
  for(const id of s.source_ids??[])check(sourceIds.has(id),'관계 출처 오류: '+c.id+' / '+id);
  for(const id of s.known_past_event_ids??[])check(ids.get(id)?.kind==='world_fact'&&ids.get(id)?.usage_mode==='canon_context','관계 사건 참조 오류: '+c.id+' / '+id);
  const settings={relationshipStage:s.id};
  check(resolveRelationshipStage(c,settings)===s,'관계 단계 선택 오류: '+c.id+' / '+s.id);
  try { check(relationshipContext({facts},c,settings)?.known_past_events.length===s.known_past_event_ids.length,'관계 사건 변환 오류: '+c.id+' / '+s.id); }
  catch(error){check(false,c.id+' / '+s.id+' / '+error.message);}
 }
 for(const id of c.research_sources)check(sourceIds.has(id),'인물 조사 출처 오류: '+c.id+' / '+id);
 for(const id of c.knowledge_ids)check(ids.get(id)?.kind==='knowledge_entry'&&ids.get(id)?.owner_key===c.character_key,'다른 인물 지식 혼입: '+c.id+' / '+id);
 for(const id of c.example_ids)check(ids.get(id)?.kind==='dialogue_example'&&ids.get(id)?.character_keys.includes(c.character_key),'예시 인물 혼입: '+c.id+' / '+id);
 for(const id of c.source_ids)check(ids.get(id)?.kind==='world_fact','인물 근거 오류: '+c.id);
 for(const r of c.identity_rules){condition(r.context_condition,r.id);r.evidence_refs.forEach(id=>check(ids.get(id)?.kind==='world_fact','판단 근거 오류: '+r.id));}
}
for(const ex of examples){condition(ex.context_condition,ex.id);check(ex.review_status==='draft'&&ex.provenance==='authored_adaptation','작성 예시를 원작/검수 완료로 오인: '+ex.id);ex.required_fact_ids.forEach(id=>check(ids.get(id)?.kind==='world_fact','예시 사실 오류: '+ex.id));}
for(const b of policy.bundles)for(const id of b.fact_ids){const f=ids.get(id);check(f?.kind==='world_fact','지식 묶음 참조 오류: '+id);check(f&&!['personal','quest'].includes(f.knowledge_layer)&&f.spoiler_scope==='none','군중 묶음 비밀 포함: '+id);}
for(const file of manifest.files)check(fs.existsSync(path.join(root,file)),'자료 파일 누락: '+file);
const actual={characters:cards.length,world_facts:facts.length,knowledge_entries:knowledge.length,dialogue_examples:examples.length,knowledge_bundles:policy.bundles.length,relationship_stages:cards.reduce((sum,c)=>sum+(c.relationship_stages?.length??0),0)};
for(const [key,count] of Object.entries(actual))check(manifest.counts[key]===count,'집계 불일치: '+key);
console.log(JSON.stringify({status:errors.length?'실패':'통과',sources:sources.length,...actual,errors},null,2));
if(errors.length)process.exitCode=1;
