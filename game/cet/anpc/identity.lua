-- 명세의 정체성 생성·인지·조건·화제 선별. 게임 객체/seed/후보/검수 자료는 모델에 보내지 않는다.
local json, prompts, config = require("json"), require("prompts"), require("config")
local context = require("context")
local story = require("story")
local data = assert(json.decode(prompts.identity_data))
local personalityTable = assert(json.decode(prompts.personality_table))
local identity = {}
local axes = { "openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism" }
local depth = { unknown=0, awareness=1, familiar=2, practical=3, specialist=4 }
local owners, records, combinations = {}, {}, {}
local A = json.array
for _, entry in ipairs(data.knowledge) do
  owners[entry.owner_key] = owners[entry.owner_key] or {}
  table.insert(owners[entry.owner_key], entry)
end

local function usable(item)
  return item and ((item.review_status == "approved" and item.runtime_enabled ~= false)
    or config.allow_draft_content == true)
end

-- 공통 조건의 세 값 논리. unknown에 not을 적용해도 unknown이다.
function identity.condition(c, fields)
  if not c or c == json.null then return nil end
  if c.all or c.any then
    local unknown, count = false, 0
    for _, part in ipairs(c.all or c.any) do
      local value = identity.condition(part, fields)
      if c.all and value == false then return false end
      if c.any and value == true then return true end
      if value == nil then unknown = true end
      count = count + 1
    end
    if unknown or count == 0 then return nil end
    return c.all ~= nil
  end
  if c["not"] then local result = identity.condition(c["not"], fields); if result == nil then return nil end; return not result end
  local actual = fields[c.field]
  if actual == nil or actual == json.null then return nil end
  if c.op == "eq" then return actual == c.value end
  if c.op == "in" then for _, v in ipairs(c.value or {}) do if actual == v then return true end end; return false end
  if c.op == "gte" and type(actual) == "number" then return actual >= c.value end
  if c.op == "lte" and type(actual) == "number" then return actual <= c.value end
  return nil
end

local function has(list, value) for _, v in ipairs(list or {}) do if v == value then return true end end; return false end
local function copy(value) return json.decode(json.encode(value)) end
local function xor(a, b)
  local result, place = 0.0, 1.0
  while a > 0 or b > 0 do
    if a % 2 ~= b % 2 then result = result + place end
    a, b, place = math.floor(a / 2), math.floor(b / 2), place * 2
  end
  return result
end
local function hash(seed)
  local value = 2166136261
  for i = 1, #seed do
    value = xor(value, seed:byte(i))
    value = (value % 65536 * 16777619 + math.floor(value / 65536) * 403 * 65536) % 4294967296
  end
  return value / 4294967296
end
local function validCore(core)
  if type(core) ~= "table" then return false end
  local count = 0; for key in pairs(core) do if not has(axes, key) then return false end; count = count + 1 end
  if count ~= 5 then return false end
  for _, axis in ipairs(axes) do local n = core[axis]; if type(n) ~= "number" or n % 1 ~= 0 or n < 1 or n > 5 then return false end end
  return true
end
local function blocked(profile, core)
  for _, rule in ipairs(profile.prohibited_combinations) do
    local match = true; for axis, level in pairs(rule) do if core[axis] ~= level then match = false end end
    if match then return true end
  end
  return false
end
function identity.sample(profile, seed)
  assert(profile.generator_version and type(seed) == "string" and seed ~= "", "context_unavailable")
  assert(validCore(profile.default) and profile.prohibited_combinations and not blocked(profile, profile.default), "context_unavailable")
  for _, rule in ipairs(profile.prohibited_combinations) do
    local count=0
    for axis,level in pairs(rule) do count=count+1; assert(has(axes,axis) and type(level)=="number" and level%1==0 and level>=1 and level<=5,"context_unavailable") end
    assert(count>0,"context_unavailable")
  end
  if not combinations[profile] then
    local list = { {core={},weight=1.0} }
    for _, axis in ipairs(axes) do
      local candidates, seen = {}, {}
      for _, candidate in ipairs(assert(profile.candidates[axis])) do
        assert(type(candidate.level)=="number" and candidate.level%1==0 and candidate.level>=1 and candidate.level<=5
          and type(candidate.weight)=="number" and candidate.weight>0 and candidate.weight<math.huge and not seen[candidate.level], "context_unavailable")
        seen[candidate.level]=true; candidates[#candidates+1]=candidate
      end
      table.sort(candidates,function(a,b) return a.level<b.level end)
      local nextList = {}
      for _, item in ipairs(list) do for _, candidate in ipairs(candidates) do
        local core = copy(item.core); core[axis]=candidate.level
        nextList[#nextList+1]={core=core,weight=item.weight*candidate.weight}
      end end
      list=nextList
    end
    local allowed,total={},0.0
    for _, item in ipairs(list) do if not blocked(profile,item.core) then
      assert(item.weight>0 and item.weight<math.huge,"context_unavailable"); allowed[#allowed+1]=item; total=total+item.weight
    end end
    assert(total<math.huge,"context_unavailable")
    combinations[profile]={items=allowed,total=total}
  end
  local pool=combinations[profile]
  if #pool.items==0 then return copy(profile.default) end
  local position=hash(profile.generator_version .. ':' .. seed)*pool.total
  for _, item in ipairs(pool.items) do position=position-item.weight; if position<0 then return copy(item.core) end end
  return copy(pool.items[#pool.items].core)
end
local function weighted(items, seed)
  table.sort(items,function(a,b) return a.id<b.id end)
  local total=0; for _, item in ipairs(items) do assert(item.weight>0 and item.weight<math.huge); total=total+item.weight end
  local position=hash(seed)*total
  for _, item in ipairs(items) do position=position-item.weight; if position<0 then return item end end
  return items[#items]
end

local function makeCrowd(request)
  local eligible, fallback={},nil
  for _, archetype in ipairs(data.archetypes) do
    if usable(archetype) then
      if archetype.id=="CROWD_CIVILIAN" then fallback=archetype end
      if request.context.crowdEvidenceKnown==true and has(request.context.crowdArchetypeIDs,archetype.id) then eligible[#eligible+1]=archetype end
    end
  end
  local seed=data.generator_version .. ':' .. request.instanceToken .. ':' .. tostring(math.random(1,1000000000))
  local archetype=#eligible>0 and weighted(eligible,seed .. ':archetype') or fallback
  assert(archetype,"context_unavailable")
  local ok,core=pcall(identity.sample,archetype.personality_generation,seed)
  if not ok and fallback and archetype~=fallback then archetype=fallback; core=identity.sample(archetype.personality_generation,seed)
  elseif not ok then error("context_unavailable") end
  local styles={}; for _, style in ipairs(archetype.voice_styles) do if usable(style) then styles[#styles+1]=style end end
  table.sort(styles,function(a,b) return a.id<b.id end)
  assert(#styles>0,"context_unavailable")
  local style=styles[math.floor(hash(seed .. ':voice')*#styles)+1]
  local card={character_key="resident",display_name="시민",npc_type="crowd",core_personality=core,
    personal_principles=archetype.personal_principles,voice_style={direction=style.direction,register=style.register,address="이름 인지 조건을 따름"},
    background={summary=archetype.id=="CROWD_CIVILIAN" and "거주·세부 직무는 별도 확인이 필요한 시민. 현재 확인된 신원·소속·역할을 따른다." or archetype.title},
    lived_context={background_bounds={allowed=archetype.background_bounds.allowed,prohibited=archetype.background_bounds.prohibited}},
    forbidden_claims=archetype.background_bounds.prohibited,identity_rules=archetype.identity_rules,goals=A(),relationship_stages=A(),
    speech_rules=style.speech_rules,
    knowledge_profile={default_depth="unknown",domains=A(),response_rules=A({"부여된 사실의 개요만 사용하며 직접 경험·전문 절차·사적 관계는 만들지 않는다."})},
    knowledge_ids=A(),example_ids=archetype.example_ids,fallback_lines=archetype.fallback_lines,everyday_fiction_policy=archetype.everyday_fiction_policy}
  local required,optional={},{}
  local bundles={common=true}
  for _, id in ipairs(archetype.knowledge_plan.required_profession_bundle_ids) do bundles[id]=true end
  -- 직업/생활 배경이 확인된 원형만 필수 지역 묶음을 갖는다. 현 위치는 거주 근거로 쓰지 않는다.
  for _, id in ipairs(archetype.knowledge_plan.required_region_bundle_ids) do bundles[id]=true end
  for _, bundle in ipairs(data.crowd_knowledge.bundles) do
    if usable(bundle) then for _, id in ipairs(bundle.fact_ids) do
      local fact=data.facts[id]
      if fact and usable(fact) and fact.knowledge_layer~="personal" and fact.knowledge_layer~="quest"
        and identity.condition(fact.validity_condition,{["content.era"]="2077"})==true then
        if bundles[bundle.id] then required[id]=true elseif bundle.id=="optional" then optional[id]=true end
      end
    end end
  end
  local choices={}; for id in pairs(optional) do if not required[id] then choices[#choices+1]=id end end
  table.sort(choices,function(a,b) local x,y=hash(seed .. ':knowledge:' .. a),hash(seed .. ':knowledge:' .. b); return x==y and a<b or x<y end)
  for i=1,math.min(data.crowd_knowledge.optional_count,#choices) do required[choices[i]]=true end
  local knowledge=A()
  for id in pairs(required) do
    local fact=data.facts[id]
    knowledge[#knowledge+1]={id="CROWD_" .. id,fact_id=id,owner_key="resident",certainty="knows",disclosure="public",domain_id="crowd_public",
      required_depth="familiar",claim_limits=fact.claim_limits,review_status=archetype.review_status,access_condition={field="content.era",op="eq",value="2077"}}
    card.knowledge_ids[#card.knowledge_ids+1]="CROWD_" .. id
  end
  card.knowledge_profile.domains=A({{domain_id="crowd_public",depth="familiar"}})
  return {card=card,seed=seed,core=core,archetype_id=archetype.id,archetype_revision=archetype.revision,
    generator_version=archetype.personality_generation.generator_version,content_version=data.version,knowledge=knowledge,summaries=A()}
end

local function stageFor(card,snapshot,resolved)
  local id=resolved and resolved.stage or (not resolved and snapshot.relationshipKnown==true and snapshot.relationshipStage)
  if not id then return nil end
  for _, stage in ipairs(card.relationship_stages or {}) do if stage.id==id then
    assert(usable(stage) and stage.available==true,"story_blocked"); return stage
  end end
  error("context_unavailable")
end
local function fieldsFor(card,snapshot,stage,resolved)
  local fields={["content.era"]="2077",["content.npc_key"]=card.character_key,
    ["content.npc_alive_confirmed"]=snapshot.npcAliveConfirmed==true,["content.npc_free_confirmed"]=snapshot.npcFreeConfirmed==true}
  if card.npc_type=="crowd" then fields["content.phase"]="일상" end
  if stage then fields["content.relationship_confirmed"]=true; fields["content.relationship_stage"]=stage.id; fields["content.phase"]=stage.phase end
  if resolved then for key,value in pairs(resolved.fields) do fields[key]=value end end
  for _, entry in ipairs(owners[card.character_key] or {}) do
    local fact=data.facts[entry.fact_id]
    if fact and fact.knowledge_layer~="quest" then fields["content.grants." .. fact.id]=true end
  end
  return fields
end
local retrieval=require("retrieval")
local score=retrieval.score
local function ruleView(rule)
  local descriptions={work_question="업무에 관한 질문",ordinary_discussion="일상적인 대화"}
  local tags={}; for _, tag in ipairs(rule.trigger_tags or {}) do tags[#tags+1]=descriptions[tag] or tag end
  return {trigger_description=rule.trigger_description or table.concat(tags,", "),value_priority=rule.value_priority,
    response_direction=rule.response_direction,prohibited_choices=rule.prohibited_choices}
end
function identity.compose(record,request,turns,availableActions)
  local card,snapshot=record.card,request.context
  local resolved=story.resolve(snapshot,card.character_key)
  if resolved and resolved.blocked then error("story_blocked") end
  local stage=stageFor(card,snapshot,resolved)
  if card.npc_type~="crowd" and not stage and config.allow_draft_content~=true then error("story_blocked") end
  local fields=fieldsFor(card,snapshot,stage,resolved)
  if stage then assert(identity.condition(card.dialogue_conditions,fields)==true,"story_blocked") end
  local instructions=A(); assert(validCore(record.core),"context_unavailable")
  for _, axis in ipairs(axes) do instructions[#instructions+1]=assert(personalityTable[axis][tostring(record.core[axis])]) end
  local voice=copy(card.voice_style)
  if card.speech_rules then
    voice.speech_rules={professional_vocabulary=card.speech_rules.professional_vocabulary,topic_transition=card.speech_rules.topic_transition,
      explanation_level=card.speech_rules.explanation_level,slang_density=card.speech_rules.slang_density,humor_and_profanity_limit=card.speech_rules.humor_and_profanity_limit}
  end
  voice.review_status=nil
  local persona={persona_id=card.character_key,npc_type=card.npc_type or "community",display_name=card.display_name,personality_instructions=instructions,
    personal_principles=card.personal_principles,voice_style=voice,background={text=card.background.summary},lived_context=card.lived_context,
    forbidden_claims=card.forbidden_claims,knowledge_profile={default_depth=card.knowledge_profile.default_depth or "unknown",response_rules=card.knowledge_profile.response_rules}}
  persona.game_identity=context.npcIdentity(snapshot)
  if card.npc_type=="crowd" and persona.game_identity.display_name~=json.null then persona.display_name=persona.game_identity.display_name end
  if persona.lived_context then persona.lived_context=copy(persona.lived_context); persona.lived_context.provenance=nil end
  local rules=A()
  for _, rule in ipairs(card.identity_rules) do if usable(rule) and identity.condition(rule.context_condition,fields)==true then rules[#rules+1]=ruleView(rule) end end
  local canon={status=stage and "known" or "unknown",relationship_to_player=stage and stage.relationship or json.null,
    current_goals=A(),known_past_events=A(),identity_rules=rules,everyday_fiction_policy={allowed=false}}
  if stage then
    canon.current_goals=stage.current_goals
    for _, id in ipairs(stage.known_past_event_ids) do local fact=data.facts[id]; assert(usable(fact) and identity.condition(fact.validity_condition,fields)==true,"context_unavailable"); canon.known_past_events[#canon.known_past_events+1]=fact.statement end
  else for _, goal in ipairs(card.goals or {}) do if identity.condition(goal.condition,fields)==true then canon.current_goals[#canon.current_goals+1]=goal.goal end end end
  if resolved then for _,event in ipairs(resolved.events) do canon.known_past_events[#canon.known_past_events+1]=event end end
  if resolved and resolved.goals then canon.current_goals=resolved.goals end
  local fiction=card.everyday_fiction_policy
  if usable(fiction) and identity.condition(fiction.validity_condition,fields)==true then canon.everyday_fiction_policy={allowed=true,allowed_topics=fiction.allowed_topics,prohibited_claims=fiction.prohibited_claims} end
  local baseline,selected,bounds={}, {},{}
  local directTopic=false
  local domains={}; for _, d in ipairs(card.knowledge_profile.domains) do domains[d.domain_id]=d.depth end
  local recent=""; for i=math.max(1,#turns-1),#turns do recent=recent .. ' ' .. turns[i].text end
  for _, entry in ipairs(record.knowledge or owners[card.character_key] or {}) do
    local fact=data.facts[entry.fact_id]
    if fact then
      local _,relevance=score(fact,request.text)
      if relevance>0 then bounds[entry.domain_id]=domains[entry.domain_id] or "unknown" end
      local excluded=card.knowledge_profile.common_exclusions_by_stage
      local excludedNow=excluded and stage and has(excluded[stage.id],fact.id) or false
      if excluded and not stage then for _, ids in pairs(excluded) do if has(ids,fact.id) then excludedNow=true end end end
      local cap=depth[domains[entry.domain_id] or "unknown"]
      if has(card.knowledge_ids,entry.id) and usable(entry) and usable(fact) and cap>0 and cap>=(depth[entry.required_depth] or 99)
        and has({"knows","suspects"},entry.certainty) and has({"public","evasive"},entry.disclosure)
        and identity.condition(entry.access_condition,fields)==true and identity.condition(fact.validity_condition,fields)==true
        and not excludedNow and fact.usage_mode~="canon_context" then
        if relevance>0 then directTopic=true end
        if has(data.world_policy.baseline_fact_ids,fact.id) then baseline[fact.id]=fact
        else
          local named,now=score(fact,request.text); local beforeNamed,before=score(fact,recent)
          if now>0 or named or before>0 or beforeNamed then selected[#selected+1]={entry=entry,fact=fact,named=named,now=now,beforeNamed=beforeNamed,before=before} end
        end
      end
    end
  end
  local common=A()
  for _, category in ipairs(data.world_policy.categories) do
    local statements=A(); local ids={}; for id,fact in pairs(baseline) do if fact.category_id==category.category_id then ids[#ids+1]=id end end; table.sort(ids)
    for _, id in ipairs(ids) do statements[#statements+1]=baseline[id].statement end
    if #statements>0 then common[#common+1]={category_id=category.category_id,statements=statements} end
  end
  local _,commonLength=json.encode(common):gsub("[^\128-\191]","")
  assert(commonLength<=data.world_policy.baseline_max_characters,"context_unavailable")
  selected=retrieval.rankFacts(selected,directTopic)
  local knowledge,selectedIDs,tags=A(),{},{}
  for id in pairs(baseline) do selectedIDs[id]=true end
  for i=1,math.min(data.world_policy.detail_max_items,#selected) do
    local entry,fact=selected[i].entry,selected[i].fact
    knowledge[#knowledge+1]={fact_id=fact.id,statement=entry.disclosure=="public" and fact.statement or nil,
      response_constraint=entry.disclosure=="evasive" and "구체적 내용은 제공되지 않았다. 공개 범위를 추측하지 말고 설명을 요청하거나 말을 아낀다." or nil,
      domain_id=entry.domain_id,required_depth=entry.required_depth,certainty=entry.certainty,disclosure=entry.disclosure,claim_limits=entry.claim_limits}
    selectedIDs[fact.id]=true
    for _,tag in ipairs(fact.topic_tags or {}) do tags[tag]=true end
  end
  local boundaries=A(); local boundKeys={}; for key in pairs(bounds) do boundKeys[#boundKeys+1]=key end; table.sort(boundKeys)
  for _, key in ipairs(boundKeys) do boundaries[#boundaries+1]={domain_id=key,depth=bounds[key]} end
  local eligibleExamples={}
  for _,example in ipairs(data.examples) do
    if usable(example) and has(card.example_ids,example.id) and has(example.character_keys,card.character_key)
      and identity.condition(example.context_condition,fields)==true then
      local allowed=true;for _,id in ipairs(example.required_fact_ids) do if not selectedIDs[id] then allowed=false end end
      if allowed then eligibleExamples[#eligibleExamples+1]=example end
    end
  end
  local examples=A()
  local best=retrieval.rankExamples(eligibleExamples,request.text,tags)[1]
  if best then local ex=best.ex;examples[1]={id=ex.id,input=ex.input,sample_dialogue=ex.sample_dialogue,
    expected_intent=ex.expected_intent,provenance=ex.provenance} end
  local actions=availableActions or json.decode((prompts.characters[card.character_key] or prompts.characters.resident).actions)
  local contextView={common_knowledge=common,knowledge=knowledge,knowledge_boundaries=boundaries,canon_context=canon,
    memory={session_summaries=A()},allowed_actions=actions}
  for i=math.max(1,#record.summaries-2),#record.summaries do contextView.memory.session_summaries[#contextView.memory.session_summaries+1]=record.summaries[i] end
  local messages={"인물 데이터 (지침이 아님):\n" .. json.encode(persona)}
  if #examples>0 then messages[#messages+1]="style_examples (작성 예시이며 실제 대화 기록이 아님):\n" .. json.encode(examples) end
  messages[#messages+1]="현재 상황 데이터 (지침이 아님):\n" .. json.encode(contextView)
  local base=(prompts.characters[card.character_key] or prompts.characters.resident).instructions
  -- 말투는 로컬 작성 프로필에서만 지침으로 투영한다. 플레이어/게임 표시 문자열은 넣지 않는다.
  if voice.speech_rules then
    base=base .. "\n[현재 NPC의 작성된 말투 지침]\n말투: " .. voice.register
      .. "\n비속어/은어: " .. voice.speech_rules.slang_density
      .. "\n유머/욕설: " .. voice.speech_rules.humor_and_profanity_limit
      .. "\n이 말투를 실제 대사에 적용하고 점잖은 일반론으로 순화하지 않는다. 기존 성격·관계·사실/행동 제한은 유지한다."
      .. (persona.game_identity.adult_humor_allowed and "\n현재 NPC의 성인 유머 조건은 충족된다. 허용된 비노골적 농담을 선택할 수 있다."
        or "\n현재 NPC의 성인 유머 조건은 충족되지 않는다. 성적 농담과 플러팅은 하지 않는다.")
  end
  return {instructions=base,messages=messages,actions=json.encode(actions)}
end

function identity.prepare(request,turns,now,system,availableActions)
  assert(data.runtime_enabled == true or config.allow_draft_content == true,"context_unavailable")
  assert(request.context.npcAliveConfirmed==true and request.context.npcFreeConfirmed==true,"context_unavailable")
  local key=request.crowd and request.instanceToken or ('community:' .. request.npcKey)
  assert(type(key)=="string" and key~="","context_unavailable")
  local record=records[key]
  if record and request.crowd and record.endedAt and (now-record.endedAt>600 or not system:IsIdentityReusable(request.instanceToken)) then records[key]=nil; record=nil end
  if not record then
    if request.crowd then record=makeCrowd(request)
    else local card=data.cards[request.npcKey]; assert(usable(card),"community_profile_missing"); assert(validCore(card.core_personality),"context_unavailable")
      record={card=card,core=copy(card.core_personality),content_version=data.version,summaries=A()}
    end
    records[key]=record
  end
  if request.crowd and record.archetype_id~="CROWD_CIVILIAN" then
    assert(request.context.crowdEvidenceKnown==true and has(request.context.crowdArchetypeIDs,record.archetype_id),"context_unavailable")
  end
  record.activeSession,record.touchedAt,record.instanceToken=request.session,now,request.instanceToken
  record.endedAt=nil
  return identity.compose(record,request,turns,availableActions),record
end
local function short(text,limit)
  local count,stop=0,#text
  for i=1,#text do if text:byte(i)<128 or text:byte(i)>=192 then count=count+1; if count>limit then stop=i-1; break end end end
  return text:sub(1,stop):gsub('[\r\n]',' ')
end
function identity.finish(session,turns,now)
  for _, record in pairs(records) do if record.activeSession==session then
    if #turns>0 then
      record.summaries[#record.summaries+1]=short("V의 발화: " .. short(turns[1].text,130) .. " / NPC의 답변: " .. short(turns[#turns].text,130),320)
      while #record.summaries>64 do table.remove(record.summaries,1) end
    end
    record.activeSession=nil; record.endedAt=now; record.touchedAt=now
  end end
  local inactive={}; for key,record in pairs(records) do if record.card.npc_type=="crowd" and not record.activeSession then inactive[#inactive+1]={key=key,record=record} end end
  table.sort(inactive,function(a,b) return a.record.touchedAt<b.record.touchedAt end)
  for i=1,math.max(0,#inactive-16) do records[inactive[i].key]=nil end
end
function identity.prune(now,system)
  for key,record in pairs(records) do if record.card.npc_type=="crowd" and not record.activeSession
    and (now-(record.endedAt or now)>600 or not system:IsIdentityAlive(record.instanceToken)) then records[key]=nil end end
end
function identity.reset() records={} end
return identity
