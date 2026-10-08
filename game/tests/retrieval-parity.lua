-- Node가 준비한 동일 입력·기대값으로 Lua 선별 결과를 비교한다. 게임 API 모의조차 필요 없는 순수 정책 검사.
package.path="game/cet/anpc/?.lua;" .. package.path
local json,retrieval,speech=require("json"),require("retrieval"),require("speech")
local file=assert(io.open(assert(arg[1]),"r"))
local suite=assert(json.decode(file:read("*a")));file:close()
for _,item in ipairs(suite.matches) do
  assert(retrieval.match(item.text,item.term,item.entity)==item.expected,item.text .. " / " .. item.term)
end
for _,item in ipairs(suite.turns) do
  local candidates={}
  for _,fact in ipairs(suite.facts) do
    local named,now=retrieval.score(fact,item.text)
    local beforeNamed,before=retrieval.score(fact,item.recent)
    candidates[#candidates+1]={fact=fact,named=named,now=now,beforeNamed=beforeNamed,before=before}
  end
  local ranked=retrieval.rankFacts(candidates)
  local ids=json.array();for i=1,math.min(3,#ranked) do ids[#ids+1]=ranked[i].fact.id end
  assert(json.encode(ids)==json.encode(item.fact_ids),"지식 차이: " .. item.text)
  local tags={};for _,tag in ipairs(item.tags) do tags[tag]=true end
  local examples=retrieval.rankExamples(suite.examples,item.text,tags)
  local best=examples[1] and examples[1].ex.id or json.null
  assert(best==item.example_id,"예시 차이: " .. item.text)
  local readings=speech.readings(suite.readings.entries,item.text,item.persona,item.context)
  assert(json.encode(readings)==json.encode(item.readings),"읽기 차이: " .. item.text)
end
print("웹/CET 인명·약어·화제 변경·예시 점수·승인 읽기 선별 일치")
