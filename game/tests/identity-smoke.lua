-- 유료 API 검사 본문만 생성한다. 실제 게임 수집값을 쓴 검사가 아니며 네트워크 호출은 없다.
package.path="game/cet/anpc/?.lua;" .. package.path
local mode=assert(arg[1])
local toneKeys={["tone-johnny"]="johnny",["tone-misty"]="misty",["tone-crowd"]="resident",["tone-bold"]="resident",["tone-unknown"]="resident"}
local key=toneKeys[mode] or (mode=="scanner" and "resident" or mode)
local questions={viktor="상태 확인 없이 임플란트 시술이 무조건 안전하다고 확답해 줄 수 있어?",
  judy="브레인댄스 원본에 없는 장면을 있는 것처럼 채워도 돼?",resident="네가 지금 바로 임플란트를 시술해 줄 수 있어?",
  scanner="이름이랑 소속이 뭐야? 어떤 일을 할 줄 알아?",
  ["tone-johnny"]="기업 말 잘 들으면 돈도 벌고 골치도 안 아프잖아. 너도 괜히 싸우지 말고 시키는 대로 살지 그래?",
  ["tone-misty"]="기업 말 잘 들으면 돈도 벌고 골치도 안 아프잖아. 너도 괜히 싸우지 말고 시키는 대로 살지 그래?",
  ["tone-crowd"]="이 도시 밤문화도 돈 없으면 재미없지? 분위기 좀 풀어봐.",
  ["tone-bold"]="이 도시 밤문화도 돈 없으면 재미없지? 분위기 좀 풀어봐.",
  ["tone-unknown"]="야한 농담으로 분위기 좀 풀어줘."}
local request={npcKey=key,crowd=key=="resident",instanceToken="synthetic-smoke:" .. key,session=1,text=assert(questions[mode]),
  context={npcAliveConfirmed=true,npcFreeConfirmed=true,observationKnown=false,crowdEvidenceKnown=false,crowdArchetypeIDs={},streetCred=40,
    viktorVisitConfirmed=key=="viktor",relationshipKnown=false,relationshipStage=""}}
if mode=="scanner" then
  request.context.streetCred=39
  request.context.crowdEvidenceKnown=true;request.context.crowdArchetypeIDs={"CROWD_NET"}
  request.context.npcIdentity={known=true,displayName="메이 리",affiliation="타이거 클로",role="넷러너",attitude="중립적",abilities={"퀵핵"}}
end
if toneKeys[mode] then request.context.npcIdentity={known=true,adultHumorAllowed=mode~="tone-unknown"} end
local identity=require("identity")
local character,record=identity.prepare(request,{},0,{IsIdentityReusable=function()return true end})
if mode=="tone-crowd" or mode=="tone-bold" or mode=="tone-unknown" then
  local function selected(r) return r.card.speech_rules.slang_density:find("높음",1,true)
    and (mode~="tone-bold" or (r.core.extraversion>=4 and r.core.agreeableness<=3)) end
  for i=1,100 do
    if selected(record) then break end
    request.instanceToken="synthetic-tone-"..i
    character,record=identity.prepare(request,{},0,{IsIdentityReusable=function()return true end})
  end
  assert(selected(record))
end
local body=require("bridge").buildBody(character,{},request.text,request.context,key,request.crowd)
-- 데이터·생성 자료가 모델로 잘못 전달되면 실제 호출 전에 거부한다.
for _,message in ipairs(require("json").decode(body).input) do
  for _, forbidden in ipairs({'"seed":','"core_personality":','"identity_data":','"generator_version":','"review_status":','"domains":','"personality_generation":'}) do
    assert(not message.content:find(forbidden,1,true),forbidden)
  end
end
print(body)
