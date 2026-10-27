-- 공통 평가 입력을 실제 identity.prepare -> bridge.buildBody 경로로 조립한다. 게임/API 실행은 하지 않는다.
package.path='game/cet/anpc/?.lua;' .. package.path
local json,identity,bridge,prompts=require('json'),require('identity'),require('bridge'),require('prompts')
local file=assert(io.open(assert(arg[1]),'r'));local suite=assert(json.decode(file:read('*a')));file:close()
local data=assert(json.decode(prompts.identity_data))
local output=json.array()
for index,item in ipairs(suite.cases) do
  identity.reset()
  local snapshot={npcAliveConfirmed=true,npcFreeConfirmed=true,relationshipKnown=true,relationshipStage=item.state.relationship_stage}
  local request={npcKey=item.npc_key,crowd=false,instanceToken='retrieval:' .. item.case_id,session=index,text=item.player_input,context=snapshot}
  local ok,character=pcall(identity.prepare,request,item.history,0,{IsIdentityReusable=function()return true end},json.array())
  local selected,common,context,blocked=json.array(),json.array(),{},false
  local jaCount=0
  local readings=json.array()
  if not ok then
    assert(tostring(character):find('story_blocked',1,true),character);blocked=true
  else
    local body=assert(json.decode(bridge.buildBody(character,item.history,item.player_input,snapshot,item.npc_key,false)))
    for _,message in ipairs(body.input) do
      if message.content:find('일본어 읽기 데이터',1,true)==1 then readings=assert(json.decode(message.content:match('\n(.*)$'))).ja_readings end
      if message.content:find('일본어 말투 데이터',1,true)==1 then jaCount=jaCount+1 end
      if message.content:find('현재 상황 데이터',1,true)==1 then context=assert(json.decode(message.content:match('\n(.*)$'))) end
    end
    for _,entry in ipairs(context.knowledge) do selected[#selected+1]=entry.fact_id end
    local commonStatements={}
    for _,category in ipairs(context.common_knowledge) do for _,statement in ipairs(category.statements) do commonStatements[statement]=true end end
    for _,id in ipairs(data.world_policy.baseline_fact_ids) do if commonStatements[data.facts[id].statement] then common[#common+1]=id end end
  end
  output[#output+1]={case_id=item.case_id,selected_fact_ids=selected,common_fact_ids=common,context=context,blocked=blocked,ja_profile_messages=jaCount,ja_readings=readings}
end
print(json.encode(output))
