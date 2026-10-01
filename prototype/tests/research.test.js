import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileResearchTurn, createResearchEngine, evaluateCondition, termMatches } from '../public/research.js';
import { createPrototypeServer } from '../server.js';
import { buildCharacterProfile, filterKnowledge, testTargets } from '../public/profile.js';
const read = async f => JSON.parse(await readFile(new URL(`../../content/cyberpunk2077/${f}`, import.meta.url), 'utf8'));
const manifest = await read('manifest.json');
const bundle = { version: manifest.content_version, cards: await Promise.all(manifest.files.filter(f=>f.startsWith('characters/')).map(read)), facts: await read('world-facts.json'), knowledge: await read('knowledge.json'), examples: await read('dialogue-examples.json') };
const playerFact = bundle.facts.find(f=>f.id===manifest.player_identity_fact_id);
bundle.playerIdentity = { ...playerFact.player_identity, fact_id: playerFact.id, claim_limits: playerFact.claim_limits };
const settings = { allowDraft: true, configuration: 'full', relationship: 'acquaintance', alive: true, free: true, basicKnowledge: true, relicKnown: false, relicDisclosed: false };
const config = key => ({ ...settings, phase: bundle.cards.find(c=>c.character_key===key).phase_labels[0] });
const context = { recent_turns: [], observations: {}, memory: null };
const compile = (input, overrides={}) => compileResearchTurn({ bundle, npcKey:'judy', settings:{...config('judy'),...overrides}, context, playerText:input });
const reply = { dialogue:'확인할 수 있는 것부터 이야기하자.',intent:'answer',emotion:'neutral',action:null,follow_up:null };

test('초안·상태·단계·관계가 불충분하면 요청 조립을 차단한다', () => {
  for(const overrides of [{allowDraft:false},{phase:'unknown'},{relationship:'unknown'},{alive:false},{free:false}]) assert.throws(()=>compile('안녕',overrides));
  assert.equal(evaluateCondition({not:{field:'missing',op:'eq',value:true}},{}),null);
});

test('플레이어 이름 V는 구성·지식 선택·발화와 독립된 공통 기준이다', () => {
  for(const card of bundle.cards) for(const configuration of ['card','knowledge','full']) {
    const result=compileResearchTurn({bundle,npcKey:card.character_key,settings:{...config(card.character_key),configuration,basicKnowledge:false},context,playerText:'내 이름은 민수야.'});
    assert.equal(result.context.player_identity.display_name,'V');
    assert.equal(result.context.player_identity.fact_id,'PLAYER_V');
    assert.equal(result.context.player_identity.name_known_by_npc,true);
  }
});
test('별칭 선별은 영문 부분 일치를 막고 BD의 한국어 조사를 지원한다', () => {
  assert.equal(termMatches('BD는 뭐야?','BD'),true); assert.equal(termMatches('ABCBDXYZ','BD'),false);
  const judy=compile('BD 편집은 어떤 일을 해?');
  assert.ok(judy.context.knowledge.some(k=>k.fact_id==='BD_EDITING'));
  assert.ok(judy.styleExamples.some(ex=>ex.id==='EX_JUDY_2'));
  const panam=compileResearchTurn({bundle,npcKey:'panam',settings:config('panam'),context,playerText:'BD 편집은 어떤 일을 해?'});
  assert.ok(!panam.context.knowledge.some(k=>k.fact_id==='BD_EDITING'));
  assert.ok(!panam.context.knowledge.some(k=>k.fact_id==='BD_EXPERIENCE'));
  assert.deepEqual(panam.context.knowledge_boundaries,[{domain_id:'braindance',depth:'unknown'}]);
  assert.ok(panam.styleExamples.every(ex=>ex.id.startsWith('EX_PANAM')));
});
test('인지 체크·카드만 구성·직업 배경으로 분야 상한과 누락한 사실을 우회하지 않는다', () => {
  for (const configuration of ['card','knowledge','full']) {
    const result=compileResearchTurn({bundle,npcKey:'panam',settings:{...config('panam'),configuration},context,playerText:'BD 제작 과정을 설명해줘'});
    assert.ok(result.persona.knowledge_profile.response_rules.some(r=>r.includes('사전 지식')));
    assert.ok(result.diagnostics.excluded_by_depth.includes('BD_EXPERIENCE'));
    assert.ok(!result.context.knowledge.some(k=>k.domain_id==='braindance'));
  }
  assert.ok(compile('넷러너').diagnostics.excluded_by_depth.includes('NETRUNNER'));
  const lowered=structuredClone(bundle);
  lowered.cards.find(c=>c.character_key==='judy').knowledge_profile.domains.find(d=>d.domain_id==='braindance').depth='awareness';
  const result=compileResearchTurn({bundle:lowered,npcKey:'judy',settings:config('judy'),context,playerText:'BD 편집 도와줘'});
  assert.ok(result.context.knowledge.every(k=>k.domain_id!=='braindance'));
  assert.equal(result.styleExamples.length,0);
});
test('렐릭은 인지와 공개 모두 통과해야 포함하며 기본 후보도 끌 수 있다', () => {
  const secret=bundle.facts.find(f=>f.id==='RELIC_V').statement;
  for(const overrides of [{},{relicKnown:true},{relicDisclosed:true}]) {
    const result=compile('렐릭',overrides); assert.ok(!JSON.stringify(result.context).includes(secret));
  }
  const restricted=compile('렐릭',{relicKnown:true,relicDisclosed:true});
  assert.ok(restricted.context.knowledge.some(k=>k.fact_id==='RELIC_V'&&k.response_constraint));
  assert.ok(!JSON.stringify(restricted.context).includes(secret));
  assert.equal(compile('BD',{basicKnowledge:false}).context.knowledge.length,0);
});
test('비교 구성은 동일 카드에서 지식·예시·상기만 구별하며 무관한 예시를 넣지 않는다', () => {
  const card=compile('BD 분석 도와줘',{configuration:'card'}), knowledge=compile('BD 분석 도와줘',{configuration:'knowledge'}), full=compile('BD 분석 도와줘');
  assert.deepEqual(card.persona,full.persona); assert.equal(card.context.knowledge.length,0);
  assert.ok(knowledge.context.knowledge.length); assert.equal(knowledge.styleExamples.length,0); assert.equal(knowledge.identityReminder,null);
  assert.ok(full.styleExamples.length); assert.ok(full.identityReminder); assert.equal(compile('안녕').styleExamples.length,0);
});
test('두 인물의 기억은 격리되고 원시 무단 행동은 보관하되 표시 응답에서는 차단한다', async () => {
  const engines=Object.fromEntries(['judy','panam'].map(key=>[key,createResearchEngine({bundle,npcKey:key,settings:config(key),base:'베이스 {{OUTPUT_CONTRACT}}'})]));
  for(const [key,e] of Object.entries(engines)) e.start(key);
  await engines.judy.send('내 이름은 민수야.',async()=>({reply,mode:'mock'})); engines.judy.end(); engines.judy.start('judy');
  assert.equal(engines.judy.session.memory.playerClaims[0].text,'내 이름은 민수야.'); assert.equal(engines.panam.session.memory,null);
  await engines.judy.send('따라와',async()=>({reply:{...reply,action:{action_id:'face_player',args:{duration_s:2}}},mode:'mock'}));
  assert.equal(engines.judy.lastRawReply.action.action_id,'face_player'); assert.equal(engines.judy.lastReply.action,null);
  assert.ok(engines.judy.lastReply.warning); assert.equal(engines.judy.session.lastAction,null);
  let finish; const pending=engines.panam.send('이전 질문',()=>new Promise(resolve=>{finish=resolve;})); engines.panam.cancel();
  finish({reply,mode:'mock'}); assert.equal((await pending).stale,true); assert.equal(engines.panam.session.turns.length,0);
});
test('조사 경로는 manifest의 카드를 제공하고 인증된 토큰 없이 자료를 반환하지 않는다', async t => {
  const server=await createPrototypeServer(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); t.after(()=>server.close());
  const origin=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(origin+'/api/research')).status,403);
  const boot=await fetch(origin+'/api/bootstrap').then(r=>r.json());
  const data=await fetch(origin+'/api/research',{headers:{'X-ANPC-Token':boot.token}}).then(r=>r.json());
  assert.deepEqual(data.cards.map(c=>c.character_key),bundle.cards.map(c=>c.character_key)); assert.equal(data.cards.length,10); assert.ok(data.cards.every(c=>c.runtime_enabled===false&&c.review_status==='draft'));
  assert.equal((await fetch(origin+'/compare')).status,200);
  for(const route of ['/profile.js','/profile-view.js']) assert.equal((await fetch(origin+route)).status,200);
});

test('10개 인물의 단계·정체성·지식이 선택한 카드로 조립되고 인물 목록은 확장된다', () => {
  for(const card of bundle.cards) {
    const result=compileResearchTurn({bundle,npcKey:card.character_key,settings:config(card.character_key),context,playerText:'BD는 뭐야?'});
    assert.equal(result.persona.persona_id,card.character_key);
    assert.deepEqual(result.persona.identity,card.identity);
    const owned = new Set(card.knowledge_ids.map(id=>bundle.knowledge.find(k=>k.id===id).fact_id));
    assert.ok(result.context.knowledge.every(k=>owned.has(k.fact_id)));
  }
  assert.deepEqual(testTargets('viktor','',bundle.cards),['viktor']);
  assert.throws(()=>testTargets('judy','judy',bundle.cards));
  assert.throws(()=>testTargets('missing','',bundle.cards));
  const extended=[...bundle.cards,{character_key:'new_character'}];
  assert.deepEqual(testTargets('new_character','kerry',extended),['new_character','kerry']);
});

test('화면용 특성 요약을 교체해도 모델의 정체성·지식 입력은 바뀌지 않는다', () => {
  const modified=structuredClone(bundle),card=modified.cards.find(c=>c.character_key==='judy');
  card.presentation={role:'화면용 역할',identity_slots:{beliefs:['표시 요약']}};
  const original=compile('BD 편집');
  const changed=compileResearchTurn({bundle:modified,npcKey:'judy',settings:config('judy'),context,playerText:'BD 편집'});
  assert.deepEqual(changed,original);
  const profile=buildCharacterProfile(modified,'judy',config('judy'));
  assert.deepEqual(profile.identity.find(g=>g.id==='beliefs').tags,['표시 요약']);
  assert.deepEqual(profile.identity.find(g=>g.id==='desires').tags,card.identity.desires);
});

test('프로필의 허용 표시가 생성기와 일치하고 설정 변경에 따라 상태가 바뀐다', () => {
  for(const key of ['judy','panam']) for(const overrides of [{},{basicKnowledge:false},{configuration:'card'},{relationship:'unknown'}]) {
    const s={...config(key),...overrides},profile=buildCharacterProfile(bundle,key,s);
    if(s.relationship==='unknown') { assert.equal(profile.counts.available,0); continue; }
    const generated=compileResearchTurn({bundle,npcKey:key,settings:s,context,playerText:'BD 편집'});
    assert.deepEqual(profile.entries.filter(k=>k.eligible).map(k=>k.fact_id),generated.diagnostics.eligible_fact_ids);
    if(s.configuration==='card')assert.equal(profile.counts.available,0);
  }
  const panam=buildCharacterProfile(bundle,'panam',config('panam'));
  assert.equal(panam.domains.find(d=>d.domain_id==='braindance').depth,'unknown');
  assert.ok(panam.entries.find(k=>k.fact_id==='BD_EXPERIENCE').status.includes('깊이'));
});

test('지식 검색·분야·주입 필터와 미등록 표시를 지원하며 비밀의 실제 내용은 숨긴다', () => {
  const profile=buildCharacterProfile(bundle,'judy',config('judy'),['BD_EDITING']);
  assert.equal(filterKnowledge(profile.entries,{status:'selected'})[0].fact_id,'BD_EDITING');
  assert.ok(filterKnowledge(profile.entries,{query:'브레인댄스',domain:'braindance'}).length>0);
  const secret=bundle.facts.find(f=>f.id==='RELIC_V').statement;
  assert.ok(!JSON.stringify(profile.entries).includes(secret));
  const extended=structuredClone(bundle);
  const card=extended.cards.find(c=>c.character_key==='judy');card.identity.new_axis=['확장된 판단 축'];
  card.knowledge_profile.domains.push({domain_id:'new_domain',display_name:'새 전문 분야',depth:'familiar',basis:'authored_candidate',evidence_refs:[],rationale:'작성 후보'});
  const model=buildCharacterProfile(extended,'judy',config('judy'));
  assert.equal(model.domains.at(-1).label,'새 전문 분야');
  assert.equal(model.identity.at(-1).label,'new_axis');
});
