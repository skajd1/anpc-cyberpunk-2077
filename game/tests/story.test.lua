package.path="game/cet/anpc/?.lua;" .. package.path
local json=require("json")
local data=json.decode(require("prompts").story_data)
local story=require("story")
local function snapshot(changes,facts)
  local quests={heist="completed",playing_for_time="completed"}
  for _,q in ipairs(data.quests) do quests[q.id]=quests[q.id] or "not_started" end
  for id,value in pairs(changes or {}) do quests[id]=value end
  local values={};for _,name in ipairs(data.facts) do values[name]=0 end
  for name,value in pairs(facts or {}) do values[name]=value end
  local result={npcAliveConfirmed=true,npcFreeConfirmed=true,story={journalKnown=true,factsKnown=true,quests={},facts={}}}
  for _,q in ipairs(data.quests) do result.story.quests[#result.story.quests+1]={id=q.id,status=quests[q.id]} end
  for _,name in ipairs(data.facts) do result.story.facts[#result.story.facts+1]={name=name,value=values[name]} end
  return result
end
local function resolve(key,q,f) return story.resolve(snapshot(q,f),key) end
assert(story.resolve({},"judy")==nil and story.resolve(snapshot(),"viktor")==nil)
assert(resolve("judy",{information="completed"}).stage=="first")
assert(resolve("judy",{information="completed",double_life="completed"}).stage=="rescue")
assert(resolve("judy",{talkin_revolution="completed"}).stage=="clouds")
assert(resolve("judy",{pisces="completed"},{sq026_side_maiko=1,sq026_maiko_boss=1}).stage=="maiko_no_pay")
assert(resolve("judy",{pisces="completed"},{sq026_maiko_dead=1}).stage=="maiko_killed")
assert(resolve("judy",{pisces="active"},{sq026_maiko_dead=1}).stage==nil)
assert(resolve("judy",{pisces="completed",pyramid_song="completed"},{sq030_judy_lover=1}).stage=="partner")
assert(resolve("judy",{pisces="completed",pyramid_song="completed"}).stage=="friend")
assert(resolve("judy",{pyramid_song="active"},{sq030_judy_lover=1}).stage==nil)
assert(resolve("judy",{}, {sq026_13_maiko_money=1,sq030_judy_lover=1}).blocked=="judy_cut_off")
assert(resolve("judy",{}, {judy_knows_johnny=1}).fields["content.grants.RELIC_V"]==true)
assert(resolve("judy",{}, {}).fields["content.grants.RELIC_V"]==nil)
assert(resolve("judy",{heist="active",playing_for_time="not_started"},{judy_knows_johnny=1}).relicKnown==nil)
assert(resolve("judy",{heist="active",playing_for_time="not_started",pisces="completed",pyramid_song="completed"},{sq030_judy_lover=1}).blocked=="story_conflict")
assert(resolve("johnny",{heist="active",playing_for_time="not_started"}).blocked=="before_relic_awakening")
assert(resolve("panam",{ghost_town="completed"}).stage=="first")
assert(resolve("panam",{life_during_wartime="completed"}).stage=="hellman")
assert(resolve("panam",{riders_storm="completed"}).stage=="saul_saved")
local complete={queen_highway="completed",riders_storm="completed",little_help="completed"}
assert(resolve("panam",complete,{sq027_panam_lover=1}).stage=="partner")
assert(resolve("panam",complete).stage=="friend")
assert(resolve("panam",{queen_highway="active"},{sq027_panam_lover=1}).stage==nil)
assert(resolve("panam",complete,{sq027_failed=1}).blocked=="panam_quest_failed")
local chip=resolve("panam",{}, {sq027_panam_knows_about_chip=1,sq027_panam_doesnt_know_about_johnny=1})
assert(chip.relicKnown==nil and #chip.events==2 and chip.fields["content.grants.RELIC_V"]==nil)
assert(resolve("panam",{}, {sq027_panam_knows_about_chip=1}).relicKnown==true)
assert(resolve("panam",{}, {}).relicKnown==nil)
assert(resolve("johnny").stage=="first")
assert(resolve("johnny",{automatic_love="completed"}).stage==nil)
assert(resolve("johnny",{tapeworm="completed"}).stage=="cooperation")
assert(resolve("johnny",{chippin_in="active"},{sq032_johnny_friend=1}).stage==nil)
assert(resolve("johnny",{chippin_in="completed"},{sq032_johnny_friend=1}).stage=="second_chance")
assert(resolve("johnny",{chippin_in="completed"}).stage=="rejected")
assert(resolve("johnny",{chippin_in="completed",like_supreme="completed"},{sq032_johnny_friend=1}).stage=="friend")
for _,key in ipairs({"judy","panam","johnny"}) do
  assert(resolve(key,{}, {q115_point_of_no_return=1}).blocked=="finale")
  assert(resolve(key,{}, {q307_start=1}).blocked=="finale")
  assert(resolve(key,{things_done="active"}).blocked=="epilogue")
  assert(resolve(key,{changes="completed"}).blocked=="relic_separated")
  assert(resolve(key,{playing_for_time="unknown"}).blocked=="progress_unknown")
end
local missing=snapshot();missing.story.factsKnown=false
assert(story.resolve(missing,"panam").blocked=="progress_unknown")
local a,b=snapshot({information="completed"}),snapshot({information="completed"},{judy_knows_johnny=1})
assert(story.fingerprint(a,"judy")~=story.fingerprint(b,"judy"))
assert(story.fingerprint(a,"panam")==story.fingerprint(b,"panam"))
print("UF-66 주디/팬앰/조니 관계·개별 공개·미해결 0·실패/결말·대상별 변경 검사 통과 (모의 게임 상태)")

local identity=require("identity")
local function compose(key,s,text)
  local ch=identity.prepare({npcKey=key,crowd=false,session=100,context=s,text=text}, {},0,{})
  return json.decode(ch.messages[#ch.messages]:match("\n(.*)$"))
end
local disclosed=compose("judy",snapshot({information="completed"},{judy_knows_johnny=1}),"렐릭이랑 조니 알아?")
local hidden=compose("judy",snapshot({information="completed"}),"렐릭이랑 조니 알아?")
local function relic(view) for _,k in ipairs(view.knowledge) do if k.fact_id=="RELIC_V" then return true end end end
assert(relic(disclosed) and not relic(hidden))
assert(not relic(compose("panam",snapshot({}, {sq027_panam_knows_about_chip=1,sq027_panam_doesnt_know_about_johnny=1}),"조니랑 렐릭 알아?")))
assert(relic(compose("panam",snapshot({}, {sq027_panam_knows_about_chip=1}),"조니랑 렐릭 알아?")))
local partner=compose("panam",snapshot(complete,{sq027_panam_lover=1}),"우리 사이?")
assert(partner.canon_context.relationship_to_player.label=="연인")
assert(not pcall(compose,"judy",snapshot({}, {sq026_13_maiko_money=1}),"안녕"))
assert(not json.encode(disclosed):find("judy_knows_johnny",1,true))
local c=require("context")
assert(c.fingerprint(a,"judy",false)~=c.fingerprint(b,"judy",false))
local first=compose("panam",snapshot({ghost_town="completed"}),"지금 목표는?")
assert(#first.canon_context.current_goals==0) -- 이미 끝낸 차량 회수 목표를 다시 만들지 않는다.
print("UF-66 실제 identity 프롬프트에 관계·공개 지식 연결 및 원시 fact 키 미전송 검사 통과")

-- SR-03: 인물별 binding·단계 판정(story.relationship)과 공개/개발 채널 차단
local config=require("config")
assert(config.channel=="development" and config.allow_draft_content==true) -- config_dev.lua가 있는 개발 트리
assert(story.binding("judy").mode=="static_research" and story.binding("judy").runtime_verified==false)
for _,key in ipairs({"viktor","misty","jackie","evelyn","goro","kerry","river","rogue","songbird"}) do
  assert(story.binding(key).mode=="unbound",key)
  local rel=story.relationship(snapshot({information="completed"}),key)
  assert(rel.status=="unknown" and rel.reason=="binding_unavailable" and rel.stage==nil,key)
end
local rel=story.relationship(snapshot({information="completed"}),"judy")
assert(rel.status=="known" and rel.stage=="first" and rel.resolved.met==true)
assert(story.relationship(snapshot({},{sq026_13_maiko_money=1}),"judy").status=="blocked")
assert(story.relationship(snapshot({pisces="completed",pyramid_song="completed"},{sq030_judy_lover=1}),"judy").stage=="partner")
assert(story.relationship({}, "judy").status=="unknown")
-- 개발 채널: 수동 주입 단계는 unbound 인물에만 받고, 불명은 차단하지 않는다.
local injected=snapshot();injected.relationshipKnown=true;injected.relationshipStage="relic"
assert(story.relationship(injected,"viktor").stage=="relic" and story.relationship(injected,"viktor").injected==true)
assert(story.relationship(injected,"judy").injected==nil)
assert(story.allowed(snapshot(),"viktor")==true)
assert(story.allowed(snapshot({},{sq026_13_maiko_money=1}),"judy")==false)

-- 공개 채널: 초안·불명·미검증 binding은 모두 차단. 동일 판정에서 실제 프롬프트도 만들지 못한다.
config.channel="public";config.allow_draft_content=false
for _,key in ipairs({"viktor","judy","panam","johnny","jackie"}) do
  local ok,reason=story.allowed(snapshot(complete),key)
  assert(ok==false and reason=="binding_unverified",key)
  assert(not pcall(identity.prepare,{npcKey=key,crowd=false,session=300,context=snapshot(complete),text="안녕"},{},0,{}),key)
end
-- 검증된 binding이라도 단계가 불명이면 차단, 확인된 단계만 허용 (검증 상태는 생성 데이터에서만 바뀐다: 모의 데이터).
local prompts=require("prompts");local saved=prompts.story_data
local verified=json.decode(saved);for _,item in pairs(verified.bindings) do item.runtime_verified=true end
prompts.story_data=json.encode(verified);package.loaded.story=nil
local pub=require("story")
assert(pub.binding("judy").runtime_verified==true)
local ok,reason=pub.allowed(snapshot({information="completed"}),"judy");assert(ok==true and reason==nil)
ok,reason=pub.allowed(snapshot({pyramid_song="active"},{sq030_judy_lover=1}),"judy");assert(ok==false and reason=="stage_unresolved")
ok,reason=pub.allowed(snapshot({},{sq026_13_maiko_money=1}),"judy");assert(ok==false and reason=="judy_cut_off")
ok,reason=pub.allowed(injected,"viktor");assert(ok==false and reason=="binding_unverified")
prompts.story_data=saved;package.loaded.story=nil;story=require("story")
config.channel="development";config.allow_draft_content=true
-- config_dev.lua가 없으면(공개 패키지) 공개 채널·초안 차단이 기본이다. 개발 파일이 채널을 속여 true만 줘도 public이면 강제로 false다.
local keep,keepDev=package.loaded.config,package.loaded.config_dev;package.loaded.config=nil;package.loaded.config_dev=nil
package.preload.config_dev=function() error("missing") end
local pubConfig=dofile("game/cet/anpc/config.lua")
assert(pubConfig.channel=="public" and pubConfig.allow_draft_content==false)
package.loaded.config_dev=nil;package.preload.config_dev=function() return {channel="public",allow_draft_content=true} end
pubConfig=dofile("game/cet/anpc/config.lua");assert(pubConfig.allow_draft_content==false)
package.preload.config_dev=nil;package.loaded.config,package.loaded.config_dev=keep,keepDev
print("SR-03 인물별 binding·허용 단계·불명/차단 사유·공개 채널 초안/불명 차단 검사 통과")
