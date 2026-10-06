import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const entrySource=readFileSync(new URL('../../game/redscript/ANPC/Entry.reds',import.meta.url),'utf8');
const popupSource=readFileSync(new URL('../../game/redscript/ANPC/Session.reds',import.meta.url),'utf8');
const menuSource=readFileSync(new URL('../../game/redscript/ANPC/GameMenu.reds',import.meta.url),'utf8');
function body(source,name){
  const m=new RegExp('(?:public|private|protected) (?:static )?(?:cb )?func '+name+'\\([^)]*\\)(?:\\s*->\\s*[\\w<>]+)?\\s*\\{').exec(source);
  assert.ok(m,name);let level=1,start=m.index+m[0].length,end=start;
  for(;level&&end<source.length;end++){if(source[end]==='{')level++;if(source[end]==='}')level--;}
  return source.slice(start,end-1).replace(/\blet (\w+): [\w<>]+/g,(_,n)=>'let '+n)
    .replace(/\bif\s+([^{}]+?)\s*\{/g,'if ($1) {').replace(/\bwhile\s+([^{}]+?)\s*\{/g,'while ($1) {').replace(/n"([^"]+)"/g,'"$1"');
}
function compile(source,name,args,env){return new Function(...Object.keys(env),...args,body(source,name)).bind(null,...Object.values(env));}
function fixture(){
  const runtime={inMenu:false,time:0,events:[],opened:[],ended:[],timers:[],delayed:[],requests:0};
  const actor={attached:true,dead:false,combat:false,IsAttached(){return this.attached;},IsDead(){return this.dead;},IsInCombat(){return this.combat;},GetWorldPosition(){return 0;}};
  const session={epoch:1,npc:actor,player:actor,pendingRequest:-1,holdHubId:-1,hangulMode:true,inputDraft:'',inputDraftCaret:0,menuSuspended:false};
  const entry={session,epoch:1,uiController:{},GetGameInstance(){return runtime;},NextSubtitleId(){return 123;},
    EndSession(s,reason){runtime.ended.push(reason);if(this.session===s)this.session=null;},
    ScheduleSubtitle(game,kind,id,delay){runtime.timers.push({kind,id,delay,session:this.session,epoch:this.epoch});},
    HideSubtitles(){},OnAIResponse(id,status){runtime.responses??=[];runtime.responses.push({id,status});},ScheduleWatch(){}};
  const defs={UI_System:{IsInMenu:'isInMenu'},MenuEventBlackboard:{MenuEventToTrigger:'menuEvent'}};
  const bb={GetBool(){return runtime.inMenu;},SetName(key,value){runtime.events.push(value);}};
  const env={IsDefined:v=>v!=null,Equals:(a,b)=>a===b,NotEquals:(a,b)=>a!==b,
    EngineTime:{ToFloat:v=>v},GameInstance:{GetSimTime:()=>runtime.time,GetBlackboardSystem:()=>({Get:()=>bb}),GetQuestsSystem:()=>({GetFact:key=>runtime[key]??0}),GetDelaySystem:()=>({DelayCallback:(callback,delay)=>runtime.delayed.push({callback,delay})})},
    GetAllBlackboardDefs:()=>defs,Vector4:{Distance:()=>0},Entry:{LeaveDistance:()=>6},NPCPuppet:{IsInCombat:a=>a.combat},
    SceneEntry:{NativeHubs:()=>({choiceHubs:[{id:1}]})},ArraySize:a=>a.length,
    AnpcSubtitleCallback:{Hide:()=>0,Reopen:()=>2,Watch:()=>3,Timeout:()=>4,EndAfter:()=>5,ResumeMenu:()=>6},
    GameMenu:{},ChatPopup:{Create(e,mode,text,caret){runtime.opened.push({mode,text,caret});return {Open(){}};}}};
  for(const [name,args]of [['IsOpen',['game']],['Request',['game']]])env.GameMenu[name]=compile(menuSource,name,args,env);
  // 별도 메뉴 규칙을 복제하지 않고 제품 메서드 본문을 모의 엔진에서 실행한다.
  for(const [name,args]of [['PrepareGameMenu',[]],['OpenGameMenu',['popup']],['QueueMenuResume',['session']],['OnChatMenuChanged',['inMenu']],['OpenInput',['session']],['SessionEndReason',['session']],['OnSubtitleTimer',['callback']],['OnChatClosed',['popup']],['IsChatMenuOpen',[]]]){
    const run=new Function(...Object.keys(env),...args,body(entrySource,name));entry[name]=function(...values){return run.call(this,...Object.values(env),...values);};
  }
  const popup={entry,closing:false,input:{text:'안녕하세요',caret:3,FinishComposition(){runtime.finished=true;},GetText(){return this.text;},GetCaretPosition(){return this.caret;}},
    IsHangulMode:()=>false,Close(){this.closing=true;runtime.closes=(runtime.closes??0)+1;entry.OnChatClosed(this);},WasSubmitted:()=>false};
  for(const [name,args]of [['GetDraft',[]],['GetDraftCaret',[]],['OnChatKey',['event']]]){
    const keyEnv={...env,EInputAction:{IACT_Release:'release'},EInputKey:{IK_Tab:'tab',IK_Enter:'enter',IK_Escape:'escape'}};
    const run=new Function(...Object.keys(keyEnv),...args,body(popupSource,name));popup[name]=function(...values){return run.call(this,...Object.values(keyEnv),...values);};
  }
  session.popup=popup;
  const press=(key,mods={})=>popup.OnChatKey({GetKey:()=>key,GetAction:()=>'release',IsShiftDown:()=>!!mods.shift,IsControlDown:()=>!!mods.ctrl,IsAltDown:()=>!!mods.alt});
  const menu=(open)=>{runtime.inMenu=open;entry.OnChatMenuChanged(open);};
  const resume=()=>entry.OnSubtitleTimer(runtime.timers.findLast(t=>t.kind===6));
  return {runtime,entry,session,popup,press,menu,resume,env};
}

test('UF-62 Tab은 전송/종료 없이 입력·한영·커서를 보관하고 메뉴 뒤 동일 세션에 복귀한다',()=>{
  const f=fixture();f.press('tab');
  assert.ok(f.session.menuSuspended&&f.runtime.finished);
  assert.equal(f.runtime.closes,1);assert.equal(f.runtime.ended.length,0);
  assert.deepEqual(f.runtime.events,['None','OnOpenHubMenu']);
  assert.equal(f.session.inputDraft,'안녕하세요');assert.equal(f.session.hangulMode,false);assert.equal(f.session.inputDraftCaret,3);
  f.press('tab');assert.equal(f.runtime.events.length,2);
  f.menu(true);f.entry.OpenInput(f.session);assert.equal(f.runtime.opened.length,0);
  f.menu(false);f.resume();
  assert.deepEqual(f.runtime.opened,[{mode:false,text:'안녕하세요',caret:3}]);
  assert.equal(f.session.menuSuspended,false);assert.equal(f.session.inputDraft,'');
});

test('UF-62 메뉴 차단·복귀 지연·대기/시한을 처리하고 이전 세계/소멸 대화를 복원하지 않는다',()=>{
  let f=fixture();f.runtime.q301_02a_stadium_stopUIInCutscene=1;f.press('tab');assert.equal(f.runtime.events.length,0);f.resume();assert.equal(f.runtime.opened.length,1);
  f=fixture();f.runtime.radial_hub_menu_enabled=1;f.press('tab');assert.deepEqual(f.runtime.events,['None','OnOpenRadialHubMenu']);
  f=fixture();f.press('tab');f.runtime.time=2.1;f.entry.OnSubtitleTimer({kind:3,session:f.session,epoch:1});f.resume();assert.equal(f.runtime.opened.length,1);
  f=fixture();f.session.popup=null;f.session.pendingRequest=77;f.entry.PrepareGameMenu();f.menu(true);
  f.entry.OnSubtitleTimer({kind:4,requestId:77,session:f.session,epoch:1});assert.equal(f.runtime.delayed.length,1);assert.equal(f.runtime.responses,undefined);
  f.menu(false);f.resume();assert.equal(f.runtime.opened.length,0);assert.equal(f.session.pendingRequest,77);
  for(const invalidation of ['world','detached','combat']){
    f=fixture();f.press('tab');f.menu(true);f.menu(false);
    if(invalidation==='world'){f.entry.session=null;f.entry.epoch++;}else if(invalidation==='detached')f.session.npc.attached=false;else f.session.npc.combat=true;
    f.resume();assert.equal(f.runtime.opened.length,0,invalidation);
  }
  f=fixture();for(const mods of [{shift:true},{ctrl:true},{alt:true}])f.press('tab',mods);assert.equal(f.runtime.events.length,0);
});

test('UF-62 native 메뉴 액션은 오리지널 처리에 정확히 한 번 전달한다',()=>{
  const f=fixture();let original=0;
  const env={...f.env,ListenerAction:{GetName:a=>a.name,GetType:a=>a.type},gameinputActionType:{BUTTON_RELEASED:'release'},wrappedMethod(){original++;return true;}};
  env.Entry={Get:()=>f.entry};
  const run=new Function(...Object.keys(env),'action','consumer',body(menuSource,'OnAction'));
  assert.equal(run.call({GetPlayerControlledObject:()=>({GetGame:()=>f.runtime})},...Object.values(env),{name:'OpenHubMenu',type:'release'},{}),true);
  assert.equal(original,1);assert.ok(f.session.menuSuspended);assert.equal(f.runtime.events.length,0);
});
