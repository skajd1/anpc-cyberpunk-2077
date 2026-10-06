package.path="game/cet/anpc/?.lua;" .. package.path
local json=require("json")
local motions=json.decode(require("prompts").motions)
local actions=require("actions")
function IsDefined(v) return v~=nil end
local actor={GetEntityID=function() return {hash=100} end,GetWorldPosition=function() return {x=1,y=2,z=3} end,
  GetWorldOrientation=function() return {ToEulerAngles=function() return {yaw=20} end} end}
local rig="man_base"
actor.GetComponents=function() return {{IsA=function(_,class) return class=="entAnimatedComponent" end,rig=rig}} end
ResourceRef={GetPath=function(v) return "base\\" .. v .. ".rig" end}
ResRef={ToString=function(v) return v end}
EulerAngles={new=function(_,_,yaw) return {ToQuat=function() return {yaw=yaw} end} end}
DynamicEntitySpec={new=function() return {} end}
local version,installed,resource,valid,occupied,spawned,owner="2.12.5",true,true,true,false,false,nil
local metadata={}
for _,m in ipairs(motions) do for _,r in ipairs(m.rigs) do metadata[#metadata+1]={name=m.name,rig=r,ent=m.ent,comp=m.comp} end end
function GetMod() return installed and {currentVersion=version,Poses={anims=metadata,activeAnims={}}} or nil end
local system={GetMotionTarget=function() return valid and actor or nil end}
local created,deleted,stopped,played,jumped=0,0,0,0,0
local spec
local entities={CreateEntity=function(_,s) created=created+1;spec=s;return created end,
  GetEntity=function() return spawned and {} or nil end,
  IsTagged=function(_,id,tag) return spec and id==created and tag==spec.tags[1] end,
  DeleteEntity=function() deleted=deleted+1 end}
local workspots={IsActorInWorkspot=function() return occupied end,GetDeviceUser=function() return owner end,
  StopInDevice=function(_,a) assert(a==actor);stopped=stopped+1 end,
  PlayInDeviceSimple=function(_,helper,a,camera,comp,device)
    assert(a==actor and camera==false and comp=="amm_workspot_base" and device=="AMM_WORKSPOT")
    played=played+1
  end,
  SendJumpToAnimEnt=function(_,a,name,instant) assert(a==actor and name==motions[1].name and instant);jumped=jumped+1 end}
Game={GetResourceDepot=function() return {ArchiveExists=function() return installed end,ResourceExists=function() return resource end} end,
  GetWorkspotSystem=function() return workspots end,GetDynamicEntitySystem=function() return entities end}
assert(#actions.allowed(system,1)==2)
rig="man_child";assert(#actions.allowed(system,1)==1);rig="man_base"
installed=false;assert(#actions.allowed(system,1)==1);installed=true
version="other";assert(#actions.allowed(system,1)==1);version="2.12.5"
resource=false;assert(#actions.allowed(system,1)==1);resource=true
occupied=true;assert(#actions.allowed(system,1)==1);occupied=false
assert(actions.start(system,1,"invented"):find("거부"));assert(created==0)
assert(actions.start(system,1,"amm_wave"):find("준비"));assert(created==1)
assert(spec.persistState==false and spec.persistSpawn==false and spec.orientation.yaw==200)
actions.cancel("취소");assert(deleted==1 and played==0 and stopped==0)
spawned=true -- 늦은 소환 완료가 취소된 동작을 시작하지 않는다.
actions.update(0.1,system);assert(played==0)
actions.start(system,2,"amm_wave");actions.update(0.1,system);assert(played==1 and jumped==1)
owner=actor;occupied=true;actions.update(0.1,system)
assert(actions.result(2):find("재생 중"))
actions.update(5,system);assert(stopped==1 and deleted==2 and actions.result(2):find("시간 제한"))
assert(not actions.result(2):find("성공"))
owner=nil;occupied=false
actions.start(system,3,"amm_wave");actions.update(0.1,system)
owner={GetEntityID=function() return {hash=200} end};occupied=true
actions.cancel("타 모드 제어");assert(stopped==1 and deleted==3)
owner=nil;occupied=false;spawned=false
actions.start(system,4,"amm_wave");valid=false;actions.update(0.1,system)
assert(deleted==4 and actions.result(4):find("상태 변경"))
valid=true
actions.start(system,5,"amm_wave");actions.update(2.1,system)
assert(deleted==5 and actions.result(5):find("생성 시간 초과"))
actions.start(system,6,"amm_wave");spawned=true;resource=false;actions.update(0.1,system)
assert(deleted==6 and played==2 and actions.result(6):find("조건 변경"))
actions.reset();assert(actions.result(6)==nil)
print("AMM 자원/리그/점유 제한·실제 재생 호출·소유 객체 취소·늦은 소환·타 모드 보호·허위 성공 방지 통과 (모의 엔진)")
