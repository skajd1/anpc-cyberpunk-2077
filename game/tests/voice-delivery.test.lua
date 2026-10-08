package.path="game/cet/anpc/?.lua;" .. package.path
local json,config,prompts=require("json"),require("config"),require("prompts")
config.voice_enabled=true
local option={action_id="play_gesture",execution_mode="execute",candidates=json.array({{ref="amm_wave",meaning="손 흔들기"}}),args={gesture_ref={values=json.array({"amm_wave"})}}}
prompts.characters.resident.actions=json.encode(json.array({option}))
local events,started,outcome={},0,nil
package.loaded.actions={
  update=function()end,allowed=function()return {option}end,result=function()return nil end,
  cancel=function()if outcome then outcome.status="cancelled";outcome.reason_code="interrupted" end end,
  reset=function()outcome=nil end,
  start=function(_,id,ref,session)
    assert(ref=="amm_wave" and session==44)
    started=started+1;events[#events+1]="gesture"
    outcome={action_request_id=tostring(id),action_id="play_gesture",status="accepted",reason_code=json.null,
      started_at=json.null,ended_at=json.null,observed_effect=json.array()}
    return "시작 요청"
  end,
  outcome=function(session)return session==44 and outcome or nil end
}
local bridge=require("bridge")
local files,queue,results,calls,responses={},{},{},{},{}
local latest,waiting,playOK,ioFailure=0,false,true,false
function IsDefined(v)return v~=nil end
local system={
  TakeRequest=function()return table.remove(queue,1)end,
  GetLatestRequestId=function()return latest end,
  IsWaitingForReply=function(_,id)return waiting and id==latest end,
  OnAIResponse=function(_,id,status,text)
    assert(id==latest);waiting=false;events[#events+1]="subtitle";responses[#responses+1]={status=status,text=text}
  end,
  OnAIVoiceResponse=function(_,id,status,text)
    assert(id==latest);waiting=false;events[#events+1]="voice_subtitle";responses[#responses+1]={status=status,text=text}
  end,
  VoicePlay=function()events[#events+1]="voice_play";return playOK end,
  VoiceStop=function()end,VoicePrepare=function()end,VoiceSpatialAvailable=function()return true end,
  IsChatMenuOpen=function()return false end,
  TalkBegin=function(_,id)assert(id==latest);events[#events+1]="talk_begin";return true end,
  TalkOpen=function(_,id,idle)assert(id==latest and idle>=1 and idle<=3);events[#events+1]="talk_open";return true end,
  TalkPause=function()events[#events+1]="talk_pause" end,
  TalkStop=function()events[#events+1]="talk_stop" end
}
Game={GetPlayer=function()return {}end,GetResourceDepot=function()return {ArchiveExists=function(_,name)return name=="ANPC_talk.local.archive" end}end,GetSystemRequestsHandler=function()return {IsPreGame=function()return false end}end,
  GetScriptableSystemsContainer=function()return {Get=function()return system end}end,
  ANPCNative_Version=function()return "test"end,
  ANPCNative_Request=function(id,_,body)calls[#calls+1]={id=id,body=json.decode(body)};return true end,
  ANPCNative_PollId=function()for id in pairs(results)do return id end;return -1 end,
  ANPCNative_ResultStatus=function(id)return results[id].status end,
  ANPCNative_ResultText=function(id)return results[id].text end,
  ANPCNative_Release=function(id)results[id]=nil end,ANPCNative_Cancel=function()return true end}
io.open=function(path,mode)
  if ioFailure then error("TTS filesystem unavailable") end
  if mode=="w" then return {write=function(self,value)files[path]=value;return self end,close=function()end} end
  if files[path] then return {read=function()return files[path]end,close=function()end} end
end
os.remove=function(path)files[path]=nil;return true end
os.rename=function(a,b)files[b]=files[a];files[a]=nil;return true end
local reply={dialogue="やあ。",follow_up=json.null,intent="answer",emotion="friendly",delivery="normal",speech_text="やあ。",
  action={action_id="play_gesture",args={gesture_ref="amm_wave"}}}
-- 자막은 한국어로 유지하고 음성만 일본어다.
reply.dialogue="안녕."
local function request(id)
  latest=id;waiting=true
  queue[#queue+1]={kind="say",id=id,session=44,npcKey="resident",crowd=true,text="V라고 불러",
    voiceTag="civ_mid_m_10_enus_30",gender="Male",instanceToken="npc-7"}
  assert(bridge.update(0.3))
end
local function begin(id)
  bridge.reset();files={};queue={};results={};events={};started=0;responses={};playOK=true;ioFailure=false
  files["tts/alive.txt"]=tostring(os.time())
  request(id)
  results[calls[#calls].id]={status="ok",text=json.encode(reply)}
  assert(bridge.update(0.3))
end
begin(1)
assert(#responses==0 and started==0 and bridge.voicePendingCount()==1)
-- 군중 음성 요청은 원작 목소리 이름·성별·NPC 고유값을 함께 보낸다.
local req=json.decode(files["tts/req-1.json"])
assert(req.voice_profile_id=="crowd" and req.voice_tag=="civ_mid_m_10_enus_30" and req.gender=="Male" and req.voice_seed=="npc-7")
assert(bridge.recent().voice:find("civ_mid_m_10_enus_30 합성 대기",1,true))
files["tts/seg-1-1.json"]='{"slot":1,"dur_ms":1000,"final":true}'
assert(bridge.update(0.1))
-- UF-75: 새 입력 때 이전 입모양을 멈추고, 첫 음성과 함께 시작해 마지막 구간이 끝나면 멈춘다.
-- 소리 구간 정보(talk)가 없는 구간은 전체를 소리로 본다.
assert(table.concat(events,",")=="talk_stop,voice_play,talk_begin,voice_subtitle,gesture,talk_open" and started==1)
assert(bridge.update(2) and started==1)
assert(events[#events]=="talk_stop")
-- 진단 창의 최근 처리 결과
assert(bridge.recent().voice=="#1 재생 완료" and bridge.recent().face:find("입모양 1구간",1,true))
request(2)
local joined="";for _,message in ipairs(calls[#calls].body.input)do joined=joined .. message.content end
assert(joined:find('"last_action_result":',1,true) and joined:find('"status":"cancelled"',1,true))
assert(joined:find('"reading":"ヴィー"',1,true))

-- 소리 구간에서만 입을 열고 0.2초 이상 쉼과 끝 무음에서 닫는다. 구간 경계를 넘는 짧은 쉼은 잇는다.
begin(8)
files["tts/seg-8-1.json"]='{"slot":1,"dur_ms":1000,"final":false,"talk":[[0,300],[700,950]]}'
files["tts/seg-8-2.json"]='{"slot":2,"dur_ms":1000,"final":true,"talk":[[50,500]]}'
assert(bridge.update(0.01))
local function mouth()local n=#events;while n>0 and not events[n]:find("^talk_")do n=n-1 end;return events[n]end
assert(mouth()=="talk_open")
for _,step in ipairs({{0.3,"talk_pause"},{0.37,"talk_open"},{0.5,"talk_open"},{0.6,"talk_pause"}})do
  assert(bridge.update(step[1]));assert(mouth()==step[2],step[2])
end
assert(bridge.update(1) and mouth()=="talk_stop" and bridge.recent().face:find("입모양 2구간",1,true))
-- 구간 정보 형식 오류는 구간 전체를 소리로 본다.
begin(9);files["tts/seg-9-1.json"]='{"slot":1,"dur_ms":1000,"final":true,"talk":[["a",1]]}'
assert(bridge.update(0.01) and mouth()=="talk_open")
begin(3);assert(bridge.update(config.voice_wait_s+0.1))
assert(bridge.recent().voice:find("자막만 · 첫 구간",1,true))
assert(#responses==1 and responses[1].text=="안녕." and started==1 and bridge.voicePendingCount()==0)
begin(4);playOK=false;files["tts/seg-4-1.json"]='{"slot":1,"dur_ms":1000,"final":true}'
assert(bridge.update(0.1) and #responses==1 and started==1)
begin(5);ioFailure=true
assert(bridge.update(config.voice_wait_s+0.1) and #responses==1 and started==1)
ioFailure=false
begin(6)
-- 새 입력은 이전 음성 구간이 와도 자막·제스처를 실행하지 않는다.
files["tts/seg-6-1.json"]='{"slot":1,"dur_ms":1000,"final":true}'
request(7)
assert(#responses==0 and started==0 and bridge.voicePendingCount()==0)
bridge.reset()
-- 음성 형식 오류가 유효한 제스처 선택·자막을 무효화하지 않는다.
for _,bad in ipairs({"", "한국어", string.rep("あ",601)}) do
  local invalid=json.decode(json.encode(reply));invalid.speech_text=bad
  local line,_,_,gesture,speech=bridge.readReply(json.encode(invalid),{option},true)
  assert(line=="안녕." and gesture=="amm_wave" and speech==nil)
end
print("첫 음성·자막·행동 동기화, TTS 시간 초과/재생/파일 오류 대체, 늦은 음성 폐기, 다음 턴 결과 전달 통과")
