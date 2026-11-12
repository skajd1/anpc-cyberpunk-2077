-- SR-04 / UF-54·55: 저장별 기억 묶음(SaveBundle) 캡처·복원·미래 기억 회귀·슬롯 덮어쓰기. redscript MemorySave는 모의 시스템으로 대체한다.
package.path="game/cet/anpc/?.lua;" .. package.path
local json=require("json")
local identity=require("identity")
local memory=require("memory")
local data=json.decode(require("prompts").identity_data)
local reusable={IsIdentityReusable=function() return true end,IsIdentityAlive=function() return true end}

-- ANPC.MemorySave 모의: persistent 배열(anchor/bundle)을 저장 파일 단위로 보관하고 BeforeSave/OnRestored 규칙을 재현한다.
local function newSystem(file)
  local sys={tokenSeq=0,restored=false,playthrough=0,checkpoint=0,bundle="",anchor=nil,staged=nil,stagedRef=nil}
  local function bytes(s) local t={} for i=1,#s do t[i]=s:byte(i) end return t end
  function sys:attach(saveFile)
    self.tokenSeq=self.tokenSeq+1;self.staged,self.stagedRef=nil,nil
    if saveFile then
      self.restored=true;self.playthrough,self.checkpoint=saveFile.playthrough,saveFile.checkpoint
      self.bundle,self.anchor=saveFile.bundle,saveFile.anchor
    else self.restored=false;self.playthrough,self.checkpoint=0,0;self.bundle,self.anchor="",nil end
    if self.playthrough==0 then self.playthrough=7 end -- EnsurePlaythrough
  end
  function sys:GetSessionToken() return "tok" .. self.tokenSeq end
  function sys:IsRestored() return self.restored end
  function sys:GetSaveScope() return self.playthrough==0 and "" or "pt-" .. self.playthrough end
  function sys:GetNextRef() return self.playthrough==0 and "" or "pt-" .. self.playthrough .. ":cp-" .. (self.checkpoint+1) end
  function sys:GetRestoreRef()
    local a=self.anchor
    if not a or a[1]~=1 or a[4]~=#self.bundle then return "" end
    return "pt-" .. a[2] .. ":cp-" .. a[3]
  end
  function sys:GetRestoreBytes() return self:GetRestoreRef()=="" and {} or bytes(self.bundle) end
  function sys:StageBundle(ref,b)
    if ref~=self:GetNextRef() then return false end
    local t={} for i=1,#b do t[i]=string.char(b[i]) end
    self.staged,self.stagedRef=table.concat(t),ref;return true
  end
  -- BeforeSave: 스테이징된 묶음이 다음 참조와 일치할 때만 persistent 배열 교체. 아니면 앵커를 지워 미확정으로 둔다.
  function sys:beforeSave()
    self.checkpoint=self.checkpoint+1
    if self.staged and self.stagedRef=="pt-" .. self.playthrough .. ":cp-" .. self.checkpoint then
      self.bundle=self.staged;self.anchor={1,self.playthrough,self.checkpoint,#self.bundle,0}
    else self.bundle="";self.anchor=nil end
    return {playthrough=self.playthrough,checkpoint=self.checkpoint,bundle=self.bundle,anchor=self.anchor}
  end
  return sys
end

local function summaries(key)
  for _,item in ipairs(identity.exportCommunity()) do if item.npc_key==key then return item.summaries end end
  return {}
end
local nextSession=0
local function talk(key,player,npc)
  nextSession=nextSession+1
  local req={npcKey=key,crowd=false,session=nextSession,text="안녕",context={npcAliveConfirmed=true,npcFreeConfirmed=true}}
  identity.prepare(req,{},0,reusable)
  identity.finish(nextSession,{{role="player",text=player},{role="npc",text=npc}},0)
end
local function playerPrompt(key)
  local req={npcKey=key,crowd=false,session=9000,text="기억나?",context={npcAliveConfirmed=true,npcFreeConfirmed=true}}
  local ch=identity.prepare(req,{},0,reusable)
  return json.decode(ch.messages[#ch.messages]:match("\n(.*)$")).memory.session_summaries
end

-- 새 게임: 호스트가 회차를 발급하고(모의: 7) 첫 저장 전부터 다음 저장 참조를 안다. 저장 자료가 없으니 빈 기억이다.
local sys=newSystem()
sys:attach(nil);identity.reset()
assert(memory.sync(sys)=="empty")
assert(sys:GetNextRef()=="pt-7:cp-1")
talk("viktor","어제 말한 임플란트 기억해?","그래, 기억한다.")
memory.sync(sys)
assert(sys.stagedRef=="pt-7:cp-1")
local fileA=sys:beforeSave()
assert(fileA.anchor and fileA.anchor[3]==1)

-- 저장 A 이후 대화: 주디와 새 대화. 저장 B.
talk("judy","브레인댄스 얘기 좀 해줘","그건 내가 알아.")
memory.sync(sys)
assert(sys.stagedRef=="pt-7:cp-2")
local fileB=sys:beforeSave()
assert(#summaries("viktor")==1 and #summaries("judy")==1)

-- 과거 저장 A 로드: 당시 자료로 교체. B에서 생긴 주디 기억·이후 요약이 남지 않는다.
sys:attach(fileA)
assert(memory.sync(sys)=="restored")
assert(#summaries("viktor")==1 and #summaries("judy")==0)
assert(summaries("viktor")[1]:find("어제 말한 임플란트",1,true))
assert(#playerPrompt("judy")==0 and #playerPrompt("viktor")==1) -- 실제 요청 본문에도 미래 기억 없음
-- 같은 저장 B 로드: 주디 기억 복원. 세대가 올라간다.
sys:attach(fileB)
assert(memory.sync(sys)=="restored" and #summaries("judy")==1 and memory.generation()>=1)

-- 슬롯 덮어쓰기: A를 로드해 다른 대화를 하고 같은 슬롯에 다시 저장한 파일 A2는 B의 기억을 갖지 않는다.
sys:attach(fileA);memory.sync(sys)
talk("misty","차 한 잔 할래?","좋아, 앉아.")
memory.sync(sys)
local fileA2=sys:beforeSave()
assert(fileA2.anchor[3]==2 and fileA2.bundle~=fileB.bundle)
sys:attach(fileA2);memory.sync(sys)
assert(#summaries("misty")==1 and #summaries("judy")==0 and #summaries("viktor")==1)

-- 저장 대응이 불명하면 빈 기억: 앵커 없음/앵커 불일치/변조/다른 회차/다른 범위/버전 불일치.
local function loadedEmpty(file)
  sys:attach(file);identity.reset();talk("viktor","잔존 확인","잔존 확인")
  memory.sync(sys);return #identity.exportCommunity()==0
end
assert(loadedEmpty({playthrough=7,checkpoint=1,bundle=fileA.bundle,anchor=nil}))
assert(loadedEmpty({playthrough=7,checkpoint=1,bundle=fileA.bundle,anchor={1,7,2,#fileA.bundle,0}})) -- 앵커가 다른 체크포인트
assert(loadedEmpty({playthrough=7,checkpoint=1,bundle=fileA.bundle,anchor={1,8,1,#fileA.bundle,0}})) -- 다른 회차
assert(loadedEmpty({playthrough=7,checkpoint=1,bundle=fileB.bundle,anchor=fileA.anchor}))          -- 길이 불일치
local tampered=fileA.bundle:gsub("어제 말한","내일 말한")
assert(loadedEmpty({playthrough=7,checkpoint=1,bundle=tampered,anchor={1,7,1,#tampered,0}}))      -- digest 불일치
local rescoped=json.decode(fileA.bundle);rescoped.scope.save_scope="pt-9";rescoped=json.encode(rescoped)
assert(loadedEmpty({playthrough=7,checkpoint=1,bundle=rescoped,anchor={1,7,1,#rescoped,0}}))
local versioned=json.decode(fileA.bundle);versioned.data.content_version="old";versioned=json.encode(versioned)
assert(loadedEmpty({playthrough=7,checkpoint=1,bundle=versioned,anchor={1,7,1,#versioned,0}}))
-- 새 게임/저장 없이 시작은 이전 기억을 남기지 않는다.
talk("viktor","남아있으면 안 됨","...");sys:attach(nil);assert(memory.sync(sys)=="empty" and #identity.exportCommunity()==0)

-- 진행 중 수용 발화는 저장 묶음에 들어가고, 로드 후 로컬 한 줄 요약으로 닫힌다. 군중 기억은 저장되지 않는다.
sys:attach(fileA);memory.sync(sys)
nextSession=nextSession+1
local active={npcKey="rogue",crowd=false,session=nextSession,text="안녕",context={npcAliveConfirmed=true,npcFreeConfirmed=true}}
identity.prepare(active,{},0,reusable)
local crowdReq={npcKey="resident",crowd=true,instanceToken="crowd-1",session=nextSession+1,text="안녕",context={npcAliveConfirmed=true,npcFreeConfirmed=true,crowdEvidenceKnown=false,crowdArchetypeIDs={}}}
identity.prepare(crowdReq,{},0,reusable);identity.finish(nextSession+1,{{role="player",text="군중에게"},{role="npc",text="응"}},0)
local turns={[nextSession]={{role="player",text="저장 직전 질문"},{role="npc",text="저장 직전 대답"}}}
local revision=1
memory.sync(sys,function(id) return turns[id] end,function() return revision end)
local fileC=sys:beforeSave()
assert(not fileC.bundle:find("군중에게",1,true) and fileC.bundle:find("저장 직전 질문",1,true))
sys:attach(fileC);assert(memory.sync(sys)=="restored")
assert(#summaries("rogue")==1 and summaries("rogue")[1]:find("저장 직전 질문",1,true) and #summaries("viktor")==1)
assert(#identity.exportCommunity()==2)

-- 같은 세션 안의 세계 전환(빠른 이동)은 로드가 아니다: 토큰이 같으면 커뮤니티 기억 유지, 군중·진행 중 연결만 폐기.
identity.suspend();assert(memory.sync(sys)==nil and #summaries("rogue")==1)

-- 상한: 묶음이 상한을 넘으면 오래된 요약부터 줄이고 계약 상한(64)을 지킨다.
identity.reset()
for i=1,70 do talk("viktor",string.rep("가",130),string.rep("나",130)) end
local full=memory.capture("pt-7:cp-9","pt-7")
assert(#json.decode(full).data.owners[1].snapshot.session_summaries==64)
memory.maxBytes=20000
local text=memory.capture("pt-7:cp-9","pt-7")
local kept=#json.decode(text).data.owners[1].snapshot.session_summaries
assert(#text<=20000 and kept<64 and kept>0)
memory.maxBytes=131072
print("SR-04 저장 묶음 캡처·복원·과거 저장 로드의 미래 기억 제거·슬롯 덮어쓰기·불명 대응 빈 기억·진행 중 발화·상한 검사 통과 (모의 MemorySave)")
