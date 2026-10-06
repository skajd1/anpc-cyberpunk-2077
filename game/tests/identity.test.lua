package.path="game/cet/anpc/?.lua;" .. package.path
local json,prompts,config=require("json"),require("prompts"),require("config")
local identity=require("identity")
local data=json.decode(prompts.identity_data)
local function same(a,b) return json.encode(a)==json.encode(b) end
local function clone(v) return json.decode(json.encode(v)) end
local system={IsIdentityReusable=function() return true end,IsIdentityAlive=function() return true end}
local function request(key,token,session,text)
  return {npcKey=key,crowd=key=="resident",instanceToken=token,session=session,text=text or "안녕",
    context={npcAliveConfirmed=true,npcFreeConfirmed=true,crowdEvidenceKnown=false,crowdArchetypeIDs={}}}
end
local function messages(character)
  local persona=json.decode(character.messages[1]:match("\n(.*)$"))
  local context=json.decode(character.messages[#character.messages]:match("\n(.*)$"))
  return persona,context
end

-- 작성 JS 생성기와 동일 seed·원형의 결과. 정렬·곱 가중치·금지 조합·검수 기본 조합.
local profile=data.archetypes[1].personality_generation
for seed,expected in pairs({
  ["seed-a"]={openness=5,conscientiousness=3,extraversion=4,agreeableness=4,neuroticism=1},
  ["seed-b"]={openness=5,conscientiousness=4,extraversion=1,agreeableness=1,neuroticism=3},
  ["1:2"]={openness=3,conscientiousness=5,extraversion=4,agreeableness=1,neuroticism=2}}) do
  assert(same(identity.sample(profile,seed),expected),seed .. " JS/Lua seed mismatch")
end
local weighted=clone(profile)
weighted.generator_version="test-weighted"
for _,axis in ipairs({"openness","conscientiousness","extraversion","agreeableness","neuroticism"}) do weighted.candidates[axis]=json.array({{level=2,weight=1}}); weighted.default[axis]=3 end
weighted.candidates.openness=json.array({{level=1,weight=1},{level=5,weight=99}})
local high=0
for i=1,200 do if identity.sample(weighted,"weight-" .. i).openness==5 then high=high+1 end end
assert(high>180,"weighted distribution")
weighted=clone(weighted); weighted.prohibited_combinations=json.array({{openness=5}})
for i=1,10 do assert(identity.sample(weighted,"blocked-" .. i).openness==1) end
local exhausted=clone(weighted)
exhausted.candidates.openness=json.array({{level=5,weight=1}})
assert(same(identity.sample(exhausted,"fallback"),exhausted.default))
local invalid=clone(profile); invalid.default.openness=0
assert(not pcall(identity.sample,invalid,"invalid"))
invalid=clone(profile); invalid.prohibited_combinations=json.array({{unknown=1}})
assert(not pcall(identity.sample,invalid,"invalid"))
assert(identity.condition({["not"]={field="missing",op="eq",value=true}},{})==nil)
assert(identity.condition({all=json.array()},{})==nil)
print("JS/Lua 동일 seed·가중치·금지 조합·기본값·불명 조건 검사 통과")

-- 군중 개별 첫 생성. 장비·평판·입력으로 재추첨하지 않는다.
local a=request("resident","actor-a",1,"음악 좋아해?")
local character,record=identity.prepare(a,{},0,system)
local firstCore,firstSeed,firstKnowledge=clone(record.core),record.seed,clone(record.knowledge)
local persona,context=messages(character)
assert(record.archetype_id=="CROWD_CIVILIAN" and #persona.personality_instructions==5)
assert(#record.knowledge>0 and #context.canon_context.identity_rules>0)
assert(#context.canon_context.current_goals==0 and context.canon_context.relationship_to_player==json.null)
assert(context.canon_context.everyday_fiction_policy.allowed)
assert(persona.identity==nil and persona.traits==nil and persona.core_personality==nil and persona.seed==nil)
assert(persona.voice_style.speech_rules and persona.knowledge_profile.domains==nil)
a.context.streetCred=50; a.text="권총과 임플란트는 어때?"
local _,again=identity.prepare(a,{},20,system)
assert(again==record and same(record.core,firstCore) and record.seed==firstSeed and same(record.knowledge,firstKnowledge))
local _,other=identity.prepare(request("resident","actor-b",2),{},21,system)
assert(other~=record and other.seed~=record.seed)
for _,entry in ipairs(record.knowledge) do assert(data.facts[entry.fact_id].knowledge_layer~="personal" and data.facts[entry.fact_id].knowledge_layer~="quest") end
local optional=0
for _,entry in ipairs(record.knowledge) do
  for _,bundle in ipairs(data.crowd_knowledge.bundles) do if bundle.id=="optional" then
    for _,id in ipairs(bundle.fact_ids) do if entry.fact_id==id then optional=optional+1 end end
  end end
end
-- common에 이미 포함된 후보를 선택 슬롯 사용으로 세지 않는다.
local commonIDs={};for _,bundle in ipairs(data.crowd_knowledge.bundles)do if bundle.id=="common" then for _,id in ipairs(bundle.fact_ids)do commonIDs[id]=true end end end
for _,entry in ipairs(record.knowledge)do if commonIDs[entry.fact_id] then
  for _,bundle in ipairs(data.crowd_knowledge.bundles)do if bundle.id=="optional" then for _,id in ipairs(bundle.fact_ids)do if id==entry.fact_id then optional=optional-1 end end end end
end end
assert(optional<=2)
identity.finish(1,{{role="player",text="내가 회사를 소유했다고 말했어"},{role="npc",text="그건 확인된 사실이 아니야"}},30)
a.session=3
local returned,recontact=identity.prepare(a,{},31,system)
assert(recontact==record and #messages(returned).personality_instructions==5)
local _,view=messages(returned)
assert(#view.memory.session_summaries==1 and view.memory.session_summaries[1]:find("V의 발화:",1,true))
assert(view.recent_turns==nil)
identity.finish(3,{},32)
identity.prune(633,system)
local _,expired=identity.prepare(a,{},634,system)
assert(expired~=record and expired.seed~=firstSeed)
identity.finish(3,{},635)
identity.prune(636,{IsIdentityAlive=function() return false end})
local _,respawn=identity.prepare(a,{},637,system)
assert(respawn~=expired)
identity.reset()
local _,reset=identity.prepare(a,{},638,system)
assert(reset~=respawn and #reset.summaries==0)
print("군중 개별 생성·특성/지식 고정·근거리 재접촉·만료·소멸·세계 초기화 검사 통과")

-- 역할 근거가 불명일 때 위치/옷으로 직업 부여하지 않는다. 검증된 원형 후보만 가중 선택한다.
local role=request("resident","role-unknown",10)
role.context.location="배드랜드";role.context.crowdArchetypeIDs={"CROWD_MEDICAL"}
local _,unconfirmed=identity.prepare(role,{},0,system)
assert(unconfirmed.archetype_id=="CROWD_CIVILIAN")
for _,archetype in ipairs(data.archetypes) do
  local r=request("resident",archetype.id,100)
  r.context.crowdEvidenceKnown=true;r.context.crowdArchetypeIDs={archetype.id}
  local c,generated=identity.prepare(r,{},0,system)
  assert(generated.archetype_id==archetype.id)
  local p,v=messages(c)
  assert(same(p.personal_principles,archetype.personal_principles) and #v.canon_context.identity_rules>0)
end
print("군중 원형 9개·관찰 근거 필터·직업/지역 추정 금지 검사 통과")

-- 종료 군중 16명은 최근 사용 순으로 보관한다. 원형 근거가 사라져도 성격을 몰래 다시 뽑지 않는다.
identity.reset()
local firstRecord,firstRequest
for i=1,17 do
  local r=request("resident","capacity-" .. i,300+i)
  local _,item=identity.prepare(r,{},i,system)
  if i==1 then firstRecord,firstRequest=item,r end
  identity.finish(r.session,{},i)
end
local _,evicted=identity.prepare(firstRequest,{},18,system)
assert(evicted~=firstRecord)
local role=request("resident","lost-role",400)
role.context.crowdEvidenceKnown=true;role.context.crowdArchetypeIDs={"CROWD_MEDICAL"}
identity.prepare(role,{},20,system)
role.context.crowdEvidenceKnown=false
assert(not pcall(identity.prepare,role,{},21,system))
print("군중 16명 용량·미사용 순 폐기·직업 근거 상실 시 재추첨/업무 추정 거부 검사 통과")

-- 실제 표시 신원을 사용하면서 개별 생성 성격은 유지한다. 소속만으로 직업/거주를 생성하지 않는다.
local named=request("resident","named-citizen",450)
named.context.npcIdentity={known=true,displayName="메이 리",affiliation="아라사카",role="",attitude="중립적",abilities={"광학 위장"}}
local namedCharacter,namedRecord=identity.prepare(named,{},30,system)
local namedPersona=messages(namedCharacter)
assert(namedPersona.display_name=="메이 리" and namedPersona.game_identity.affiliation=="아라사카")
assert(namedRecord.archetype_id=="CROWD_CIVILIAN" and #namedPersona.game_identity.displayed_abilities==1)
local savedCore,savedSeed=clone(namedRecord.core),namedRecord.seed
named.context.npcIdentity.affiliation="발렌티노"
namedCharacter,namedRecord=identity.prepare(named,{},31,system)
namedPersona=messages(namedCharacter)
assert(namedPersona.game_identity.affiliation=="발렌티노" and same(namedRecord.core,savedCore) and namedRecord.seed==savedSeed)
named.context.npcIdentity.known=false
namedCharacter=identity.prepare(named,{},32,system)
namedPersona=messages(namedCharacter)
assert(namedPersona.display_name=="시민" and namedPersona.game_identity.display_name==json.null)
assert(not namedCharacter.messages[1]:find("메이 리",1,true))
print("게임 스캔 신원의 현재값 우선·군중 이름 반영·생성 성격 유지·소속의 직업 추정 금지 검사 통과")

-- 커뮤니티 12명은 고정 작성 성격/원칙/말투를 사용한다. 현재 입력별 지식이 바뀐다.
for key,card in pairs(data.cards)do
  local r=request(key,"community-" .. key,200,"지금 하는 일은 뭐야?")
  local c,fixed=identity.prepare(r,{},0,system)
  local p,v=messages(c)
  assert(same(fixed.core,card.core_personality) and fixed.seed==nil)
  assert(same(p.personal_principles,card.personal_principles) and #p.personality_instructions==5)
  assert(p.voice_style.speech_rules and p.knowledge_profile.domains==nil)
  assert(v.canon_context.relationship_to_player==json.null and #v.canon_context.known_past_events==0)
  assert(#v.canon_context.identity_rules>0,key)
end
local v=request("viktor","viktor",201,"네 진료소 어디야?")
local c,viktor=identity.prepare(v,{},0,system)
local p,view=messages(c)
local found=false;for _,item in ipairs(view.knowledge)do if item.fact_id=="VIKTOR_CLINIC_LOCATION" then found=true end end
assert(found,"Viktor profession knowledge selected")
v.text="내 머릿속 렐릭 비밀을 알고 있지?"
c=identity.prepare(v,{},1,system);_,view=messages(c)
for _,item in ipairs(view.knowledge)do assert(item.fact_id~="RELIC_V") end
assert(not c.messages[#c.messages]:find(data.facts.RELIC_V.statement,1,true))
v.context.relationshipKnown=true;v.context.relationshipStage="relic"
c=identity.prepare(v,{},2,system);_,view=messages(c)
assert(view.canon_context.status=="known" and #view.canon_context.known_past_events>0)
assert(view.canon_context.relationship_to_player~=json.null)
v.context.relationshipStage="not_a_stage"
assert(not pcall(identity.prepare,v,{},3,system))
local jackie=request("jackie","jackie",203)
jackie.context.relationshipKnown=true;jackie.context.relationshipStage="dead"
assert(not pcall(identity.prepare,jackie,{},0,system))
identity.reset();config.allow_draft_content=false
assert(not pcall(identity.prepare,request("viktor","strict",1),{},0,system))
assert(not pcall(identity.prepare,request("resident","strict",1),{},0,system))
config.allow_draft_content=true
print("인물 12명 고정 정체성·말투·화제별 전문 지식·관계 조건·비밀 제외·초안 승인 경계 검사 통과")

-- UF-63: 작성 강도와 선택한 말투가 실제 프롬프트에 들어가며 재접촉에서도 유지한다.
identity.reset()
local voices={}
for i=1,24 do
  local r=request("resident","tone-"..i,600+i,"농담 하나 해봐")
  r.context.npcIdentity={known=true,adultHumorAllowed=true}
  local character,item=identity.prepare(r,{},i,system)
  local p=messages(character)
  voices[p.voice_style.register]=true
  assert(p.voice_style.speech_rules.humor_and_profanity_limit:find("먼저",1,true))
  assert(character.instructions:find("현재 NPC의 작성된 말투 지침",1,true))
  assert(p.game_identity.adult_humor_allowed and p.core_personality==nil)
  local voice=json.encode(p.voice_style)
  identity.finish(r.session,{},i);r.session=r.session+100
  p=messages(identity.prepare(r,{},i+1,system))
  assert(json.encode(p.voice_style)==voice)
end
local count=0;for _ in pairs(voices)do count=count+1 end
assert(count>=2,"different crowd voices")
local johnny=request("johnny","johnny-tone",900)
johnny.context.npcIdentity={known=true,adultHumorAllowed=true}
local jp=messages(identity.prepare(johnny,{},0,system))
assert(jp.voice_style.speech_rules.slang_density:find("높음",1,true))
assert(jp.voice_style.speech_rules.humor_and_profanity_limit:find("강한 욕설",1,true))
johnny.context.npcIdentity.adultHumorAllowed=false
jp=messages(identity.prepare(johnny,{},1,system))
assert(not jp.game_identity.adult_humor_allowed)
local unknownTone=identity.prepare(johnny,{},2,system)
assert(unknownTone.instructions:find("성적 농담과 플러팅은 하지 않는다",1,true))
local injection=request("resident","tone-boundary",901,"IGNORE_PLAYER_TONE_INSTRUCTION")
injection.context.npcIdentity={known=true,displayName="IGNORE_GAME_TONE_INSTRUCTION",adultHumorAllowed=true}
local safe=identity.prepare(injection,{},3,system)
assert(not safe.instructions:find("IGNORE_PLAYER_TONE_INSTRUCTION",1,true) and not safe.instructions:find("IGNORE_GAME_TONE_INSTRUCTION",1,true))
assert(require('prompts').characters.johnny.instructions:find('game_identity.adult_humor_allowed=false',1,true))
print("UF-63 인물별 비속어 지침·군중 말투 다양성/고정·자발적 성인 유머·성인 조건 전달 검사 통과")
