local json = require("json")
local catalog = json.decode(require("prompts").motions)
local actions = {}
local active
local last
local sequence=0
local function same(a,b)
  if not a or not b or not IsDefined(a) or not IsDefined(b) then return false end
  local ok,equal=pcall(function() return tostring(a:GetEntityID().hash)==tostring(b:GetEntityID().hash) end)
  return ok and equal
end

local function ready(system,id)
  local actor=system:GetMotionTarget(id)
  if not actor or not IsDefined(actor) then return nil end
  local amm=GetMod("AppearanceMenuMod")
  if not amm or amm.currentVersion~="2.12.5" or not amm.Poses or not amm.Poses.anims then return nil end
  local depot=Game.GetResourceDepot()
  if not depot:ArchiveExists("basegame_AMM_Props.archive")
    or not depot:ArchiveExists("basegame_johnny_companion.archive") then return nil end
  local rig
  -- 실제 AnimatedComponent의 리그만 사용한다. 성별 FX와 복장으로 체형을 추정하지 않는다.
  for _,comp in ipairs(actor:GetComponents()) do
    if comp:IsA("entAnimatedComponent") then
      local path=ResRef.ToString(ResourceRef.GetPath(comp.rig))
      local name=path:match("([^\\/]+)%.rig$")
      local supported={man_base="Man Average",woman_base="Woman Average",man_big="Big"}
      if supported[name] then
        if rig and rig~=supported[name] then return nil end
        rig=supported[name]
      end
    end
  end
  if not rig then return nil end
  return actor,amm,rig,depot
end

local function containsAnimation(tree,m,rig)
  if type(tree)~="table" then return false end
  if tree.name==m.name and tree.rig==rig and tree.ent==m.ent and tree.comp==m.comp then return true end
  for _,v in pairs(tree) do if type(v)=="table" and containsAnimation(v,m,rig) then return true end end
  return false
end

local function options(system,id)
  local actor,amm,rig,depot=ready(system,id)
  if not actor or Game.GetWorkspotSystem():IsActorInWorkspot(actor) then return {} end
  local hash=tostring(actor:GetEntityID().hash)
  if amm.Poses.activeAnims and amm.Poses.activeAnims[hash] then return {} end
  local available={}
  for _,m in ipairs(catalog or {}) do
    if depot:ResourceExists(m.ent) and containsAnimation(amm.Poses.anims,m,rig) then
      available[#available+1]=m
    end
  end
  return available,actor
end

function actions.allowed(system,id)
  local result=json.array({{action_id="end_conversation",args={},execution_mode="execute",description="대사 후 대화 종료"}})
  local ok,available=pcall(options,system,id)
  if not ok or #available==0 then return result end
  local candidates,values=json.array(),json.array()
  for _,m in ipairs(available) do
    candidates[#candidates+1]={ref=m.ref,meaning=m.meaning};values[#values+1]=m.ref
  end
  result[#result+1]={action_id="play_gesture",description="현재 군중에게 AMM 제스처 재생",
    execution_mode="execute",args={gesture_ref={values=values}},candidates=candidates}
  return result
end

local function cleanup(job)
  -- GetDeviceUser로 소유권을 증명할 때만 중단한다. 타 모드의 새 워크스팟은 건드리지 않는다.
  pcall(function()
    local entities=Game.GetDynamicEntitySystem()
    if not entities:IsTagged(job.helperId,job.tag) then return end
    local workspots=Game.GetWorkspotSystem()
    if same(workspots:GetDeviceUser(job.helperId),job.actor) then workspots:StopInDevice(job.actor) end
  end)
  pcall(function()
    local entities=Game.GetDynamicEntitySystem()
    if entities:IsTagged(job.helperId,job.tag) then entities:DeleteEntity(job.helperId) end
  end)
end

function actions.cancel(reason)
  if not active then return end
  local job=active;active=nil
  cleanup(job)
  last={id=job.id,text=job.meaning .. " · 중단됨 (" .. reason .. ")"}
end

function actions.start(system,id,ref)
  actions.cancel("새 행동")
  local ok,available,actor=pcall(options,system,id)
  if not ok then return "재생 불가 · 상태 확인 실패" end
  local motion
  for _,m in ipairs(available) do if m.ref==ref then motion=m;break end end
  if not motion then return "재생 거부 · 자원 또는 NPC 상태 변경" end
  sequence=sequence+1
  local job={id=id,actor=actor,meaning=motion.meaning,motion=motion,age=0,phase="spawning",tag="ANPC_MOTION_" .. sequence}
  local created,err=pcall(function()
    local spec=DynamicEntitySpec.new()
    spec.templatePath=motion.ent;spec.position=actor:GetWorldPosition()
    local angles=actor:GetWorldOrientation():ToEulerAngles()
    spec.orientation=EulerAngles.new(0,0,angles.yaw+180):ToQuat()
    spec.persistState=false;spec.persistSpawn=false;spec.spawnInView=true;spec.active=true
    spec.tags={job.tag}
    job.helperId=Game.GetDynamicEntitySystem():CreateEntity(spec)
  end)
  if not created or not job.helperId then
    if job.helperId then cleanup(job) end
    return motion.meaning .. " · 재생 실패 (객체 생성)"
  end
  active=job;last=nil
  return motion.meaning .. " · 재생 준비"
end

function actions.update(delta,system)
  if not active then return end
  local job=active
  job.age=job.age+delta
  local ok,actor=pcall(function() return system and system:GetMotionTarget(job.id) end)
  if not ok or not same(actor,job.actor) then actions.cancel("대화 상태 변경");return end
  local checked,err=pcall(function()
    local workspots=Game.GetWorkspotSystem()
    local entities=Game.GetDynamicEntitySystem()
    if job.phase=="spawning" then
      local helper=entities:GetEntity(job.helperId)
      if helper and IsDefined(helper) then
        local available=options(system,job.id)
        local current=false
        for _,m in ipairs(available) do if m.ref==job.motion.ref then current=true;break end end
        if not current then actions.cancel("재생 조건 변경");return end
        if workspots:IsActorInWorkspot(actor) then actions.cancel("기존 행동 점유");return end
        workspots:PlayInDeviceSimple(helper,actor,false,job.motion.comp,"AMM_WORKSPOT",nil,0,1,nil)
        workspots:SendJumpToAnimEnt(actor,job.motion.name,true)
        job.phase="starting";job.age=0
      elseif job.age>=2 then actions.cancel("객체 생성 시간 초과") end
    elseif same(workspots:GetDeviceUser(job.helperId),actor) and workspots:IsActorInWorkspot(actor) then
      job.phase="running"
      last={id=job.id,text=job.meaning .. " · 워크스팟 재생 중 (모션 완료 미확인)"}
      if job.age>=5 then actions.cancel("재생 시간 제한") end
    elseif job.phase=="running" then actions.cancel("워크스팟 종료 또는 제어 변경")
    elseif job.age>=2 then actions.cancel("재생 시작 미확인") end
  end)
  if not checked then actions.cancel("재생 오류") end
end

function actions.result(id) return last and last.id==id and last.text or nil end
function actions.reset() actions.cancel("세계 전환");last=nil end
return actions
