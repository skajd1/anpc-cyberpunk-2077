package.path='game/cet/anpc/?.lua;' .. package.path
local json,prompts,bridge=require('json'),require('prompts'),require('bridge')
local original=prompts.identity_data
local target='PANAM_CARGO_EXPERIENCE'
local text='미치랑 화물 운송한 적 있어?'
local expected='미치랑 화물을 나른 적은 있지.'
local count=0
local function prepare(mutate)
  local data=assert(json.decode(original))
  local entry
  for _,k in ipairs(data.knowledge) do if k.id=='K_PANAM_PANAM_CARGO_EXPERIENCE' then entry=k end end
  assert(entry and entry.perspective.text==expected)
  mutate(data,entry)
  prompts.identity_data=json.encode(data)
  package.loaded.identity=nil
  local identity=require('identity')
  local snapshot={npcAliveConfirmed=true,npcFreeConfirmed=true,relationshipKnown=true,relationshipStage='saul_saved'}
  local request={npcKey='panam',crowd=false,instanceToken='perspective:test',session=1,text=text,context=snapshot}
  local character=identity.prepare(request,{},0,{IsIdentityReusable=function()return true end},json.array())
  local body=assert(json.decode(bridge.buildBody(character,{},text,snapshot,'panam',false)))
  for _,message in ipairs(body.input) do
    if message.content:find('현재 상황 데이터',1,true)==1 then
      return assert(json.decode(message.content:match('\n(.*)$')))
    end
  end
  error('모델 상황 입력 누락')
end
for _,mutate in ipairs({
  function(_,k) k.perspective.review_status='draft' end,
  function(_,k) k.perspective.review_status='hold' end,
  function(_,k) k.perspective.text=string.rep('가',61) end,
  function(_,k) k.perspective.text=' ' end,
  function(_,k) k.disclosure='evasive' end,
  function(_,k) k.disclosure='withheld' end,
  function(_,k) k.access_condition={field='content.era',op='eq',value='2020'} end,
  function(_,k) k.owner_key='judy' end,
  function(data,k) data.facts[k.fact_id].validity_condition={field='content.era',op='eq',value='2020'} end,
  function(data,k)
    for _,domain in ipairs(data.cards.panam.knowledge_profile.domains) do if domain.domain_id==k.domain_id then domain.depth='unknown' end end
  end
}) do
  local context=prepare(mutate)
  assert(not json.encode(context):find(expected,1,true),'차단된 관점 노출')
  for _,item in ipairs(context.knowledge) do
    if item.fact_id==target then
      assert(item.perspective==nil)
      if item.disclosure=='evasive' then assert(item.statement==nil and item.response_constraint) end
    end
  end
  count=count+1
end
prompts.identity_data=original
package.loaded.identity=nil
print('CET 관점 차단 '..count..'개 통과')
