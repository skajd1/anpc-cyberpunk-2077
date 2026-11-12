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
  const runtime={inMenu:false,time:0,events:[],opened:[],ended:[],timers:[],delayed:[],requests:0,messages:[]};
  const makeActor=id=>({id,attached:true,dead:false,combat:false,mounted:false,workspot:false,IsAttached(){return this.attached;},IsDead(){return this.dead;},IsInCombat(){return this.combat;},GetWorldPosition(){return 0;},
    GetGame(){return runtime;},GetEntityID(){return this.id;},GetPlayerStateMachineBlackboard(){return {GetInt(){return runtime.tier??0;}};}});
  const npc=makeActor('npc'),player=makeActor('player');
  const session={epoch:1,npc,player,pendingRequest:-1,holdHubId:-1,hangulMode:true,inputDraft:'',inputDraftCaret:0,menuSuspended:false};
  const entry={session,epoch:1,uiController:{},outbox:[],worldToken:'w1',GetGameInstance(){return runtime;},NextSubtitleId(){return 123;},
    EndSession(s,reason){runtime.ended.push(reason);if(this.session===s)this.session=null;},
    ScheduleSubtitle(game,kind,id,delay){runtime.timers.push({kind,id,delay,session:this.session,epoch:this.epoch});},
    HideSubtitles(){},OnAIResponse(id,status){runtime.responses??=[];runtime.responses.push({id,status});},ScheduleWatch(){}};
  const defs={UI_System:{IsInMenu:'isInMenu'},MenuEventBlackboard:{MenuEventToTrigger:'menuEvent'},PlayerStateMachine:{HighLevel:'highLevel'}};
  const scene={IsEntityInScene:id=>runtime.inScene?.includes(id)??false,IsEntityInDialogue:id=>runtime.inDialogue?.includes(id)??false};
  const bb={GetBool(){return runtime.inMenu;},SetName(key,value){runtime.events.push(value);}};
  const env={IsDefined:v=>v!=null,Equals:(a,b)=>a===b,NotEquals:(a,b)=>a!==b,
    EngineTime:{ToFloat:v=>v},GameInstance:{GetSimTime:()=>runtime.time,GetBlackboardSystem:()=>({Get:()=>bb}),GetQuestsSystem:()=>({GetFact:key=>runtime[key]??0}),GetSceneSystem:()=>({GetScriptInterface:()=>scene}),GetWorkspotSystem:()=>({IsActorInWorkspot:a=>a.workspot}),GetDelaySystem:()=>({DelayCallback:(callback,delay)=>runtime.delayed.push({callback,delay})})},
    GetAllBlackboardDefs:()=>defs,Vector4:{Distance:()=>0},Entry:{LeaveDistance:()=>6,ShowMessage:(game,text)=>runtime.messages.push(text)},NPCPuppet:{IsInCombat:a=>a.combat},
    SceneEntry:{NativeHubs:()=>({choiceHubs:[{id:1}]})},ArraySize:a=>a.length,
    AnpcSubtitleCallback:{Hide:()=>0,Reopen:()=>2,Watch:()=>3,Timeout:()=>4,EndAfter:()=>5,ResumeMenu:()=>6},
    GetMountedVehicle:a=>a.mounted?{}:null,StrBeginsWith:(a,b)=>a.startsWith(b),StrAfterFirst:(a,b)=>a.slice(a.indexOf(b)+b.length),StrLen:a=>a.length,ArrayPush:(a,v)=>a.push(v),AnpcRequest:class{},SceneEntryInstaller:{Get:()=>null},
    GameMenu:{},ChatPopup:{Create(e,mode,text,caret){runtime.opened.push({mode,text,caret});return {Open(){}};}}};
  for(const [name,args]of [['IsOpen',['game']],['Request',['game']]])env.GameMenu[name]=compile(menuSource,name,args,env);
  // 별도 메뉴 규칙을 복제하지 않고 제품 메서드 본문을 모의 엔진에서 실행한다.
  for(const [name,args]of [['PrepareGameMenu',[]],['OpenGameMenu',['popup']],['QueueMenuResume',['session']],['OnChatMenuChanged',['inMenu']],['OpenInput',['session']],['SessionEndReason',['session']],['ProtectedReason',['session']],['QueueCancel',['session','requestId']],['CancelPending',['session']],['OnEscape',[]],['OnAIResponse',['requestId','status','text']],['IsWaitingForReply',['requestId']],['OnSubtitleTimer',['callback']],['OnChatClosed',['popup']],['IsChatMenuOpen',[]]]){
    const run=new Function(...Object.keys(env),...args,body(entrySource,name));entry[name]=function(...values){return run.call(this,...Object.values(env),...values);};
  }
  entry.SubmitChat=text=>{runtime.submitted=text;};
  const popup={entry,closing:false,held:[],pendingClose:false,pendingText:'',submitted:false,GetGame:()=>runtime,
    input:{text:'안녕하세요',caret:3,FinishComposition(){runtime.finished=true;},GetText(){return this.text;},GetCaretPosition(){return this.caret;},Clear(){this.text='';}},
    IsHangulMode:()=>false,Close(){this.closing=true;runtime.closes=(runtime.closes??0)+1;entry.OnChatClosed(this);},WasSubmitted(){return this.submitted;}};
  const keyEnv={...env,EInputAction:{IACT_Release:'release',IACT_Press:'press'},EInputKey:{IK_Tab:'tab',IK_Enter:'enter',IK_Escape:'escape'},
    StrLen:s=>s.length,ArrayContains:(a,v)=>a.includes(v),ArrayPush:(a,v)=>a.push(v),ArrayRemove:(a,v)=>{const i=a.indexOf(v);if(i>=0)a.splice(i,1);},ChatCloseTimeout:class{}};
  for(const [name,args]of [['GetDraft',[]],['GetDraftCaret',[]],['OnChatKey',['event']],['RequestClose',['text']],['FinishClose',[]]]){
    const run=new Function(...Object.keys(keyEnv),...args,body(popupSource,name));popup[name]=function(...values){return run.call(this,...Object.values(keyEnv),...values);};
  }
  session.popup=popup;
  const press=(key,mods={},action='release')=>popup.OnChatKey({GetKey:()=>key,GetAction:()=>action,IsShiftDown:()=>!!mods.shift,IsControlDown:()=>!!mods.ctrl,IsAltDown:()=>!!mods.alt});
  const menu=(open)=>{runtime.inMenu=open;entry.OnChatMenuChanged(open);};
  const resume=()=>entry.OnSubtitleTimer(runtime.timers.findLast(t=>t.kind===6));
  return {runtime,entry,session,popup,press,menu,resume,env,npc,player};
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

test('UF-17 Enter는 입력칸이 받은 키를 모두 뗀 뒤 닫고 전송한다',()=>{
  const f=fixture();
  f.press('d',{},'press');f.press('enter',{},'press');f.press('enter');
  assert.equal(f.runtime.closes,undefined);assert.equal(f.runtime.submitted,undefined);
  assert.equal(f.runtime.delayed.length,1);assert.equal(f.runtime.delayed[0].delay,1);
  f.press('d');
  assert.equal(f.runtime.closes,1);assert.equal(f.runtime.submitted,'안녕하세요');
  f.popup.FinishClose();assert.equal(f.runtime.closes,1);
  // 누름을 보지 못한 키의 뗌은 대기 목록에 영향을 주지 않는다.
  const g=fixture();g.press('a');g.press('enter');assert.equal(g.runtime.closes,1);assert.equal(g.runtime.delayed.length,0);
});

test('UF-17 이동 키가 눌린 동안 입력칸 열기를 미루고 감시에서 뗀 뒤 연다',()=>{
  const f=fixture();f.session.popup=null;
  const listener={moving:true,IsMoving(){return this.moving;}};f.entry.moveListener=listener;
  f.entry.OpenInput(f.session);
  assert.equal(f.runtime.opened.length,0);assert.equal(f.session.inputDeferred,true);
  f.entry.OnSubtitleTimer({kind:3,session:f.session,epoch:1});assert.equal(f.runtime.opened.length,0);
  listener.moving=false;f.entry.OnSubtitleTimer({kind:3,session:f.session,epoch:1});
  assert.equal(f.runtime.opened.length,1);assert.equal(f.session.inputDeferred,false);
});

test('UF-62 native 메뉴 액션은 오리지널 처리에 정확히 한 번 전달한다',()=>{
  const f=fixture();let original=0;
  const env={...f.env,ListenerAction:{GetName:a=>a.name,GetType:a=>a.type},gameinputActionType:{BUTTON_RELEASED:'release'},wrappedMethod(){original++;return true;}};
  env.Entry={Get:()=>f.entry};
  const run=new Function(...Object.keys(env),'action','consumer',body(menuSource,'OnAction'));
  assert.equal(run.call({GetPlayerControlledObject:()=>({GetGame:()=>f.runtime})},...Object.values(env),{name:'OpenHubMenu',type:'release'},{}),true);
  assert.equal(original,1);assert.ok(f.session.menuSuspended);assert.equal(f.runtime.events.length,0);
});

test('SR-01 유지 판정은 시작과 같은 보호 조건(메뉴·탑승·시네마틱·새 장면·워크스팟)을 적용하고 허용 예외를 구분한다',()=>{
  const reason=f=>f.entry.SessionEndReason(f.session);
  const cases=[
    ['session_menu_opened',f=>{f.runtime.inMenu=true;}],
    ['session_mounted',f=>{f.player.mounted=true;}],
    ['session_mounted',f=>{f.npc.mounted=true;}],
    ['session_scene_changed',f=>{f.runtime.tier=2;}],
    ['session_scene_changed',f=>{f.runtime.inScene=['npc'];}],
    ['session_scene_changed',f=>{f.runtime.inDialogue=['npc'];}],
    ['session_scene_changed',f=>{f.runtime.inDialogue=['player'];}],
    ['session_scene_changed',f=>{f.runtime.inScene=['player'];}],
    ['session_player_workspot',f=>{f.player.workspot=true;}],
  ];
  assert.equal(reason(fixture()),'');
  for(const [expected,apply] of cases){const f=fixture();apply(f);assert.equal(reason(f),expected,expected);}
  // 군중 워크스팟 점유와 HighLevel 1의 플레이어 장면 참여는 시작 때처럼 허용한다.
  let f=fixture();f.npc.workspot=true;f.runtime.tier=1;f.runtime.inScene=['player'];assert.equal(reason(f),'');
  // UF-62: Tab 메뉴 보류 중의 메뉴 상태는 허용 예외다. 보류가 끝나면 다시 막는다.
  f=fixture();f.session.menuSuspended=true;f.runtime.inMenu=true;assert.equal(reason(f),'');
  f.session.menuSuspended=false;assert.equal(reason(f),'session_menu_opened');
  // 보류한 원작 허브(UF-15): 장면·대화 참여와 HighLevel 2는 정상이고 허브가 사라지면 종료한다. 탑승·시네마틱은 막는다.
  f=fixture();f.session.holdHubId=1;f.runtime.tier=2;f.runtime.inScene=['npc','player'];f.runtime.inDialogue=['npc'];f.player.workspot=true;assert.equal(reason(f),'');
  f.runtime.tier=3;assert.equal(reason(f),'session_scene_changed');
  f.runtime.tier=2;f.player.mounted=true;assert.equal(reason(f),'session_mounted');
  f=fixture();f.session.holdHubId=2;assert.equal(reason(f),'session_scene_ended');
  // 거리·전투 등 기존 조건이 먼저 적용된다.
  f=fixture();f.npc.dead=true;assert.equal(reason(f),'session_state_blocked');
});

test('SR-01 응답 대기·표시 직전 보호 조건이 달라지면 대사 없이 세션을 끝내고 대기 응답으로 보지 않는다',()=>{
  let f=fixture();f.session.popup=null;f.session.pendingRequest=5;
  assert.equal(f.entry.IsWaitingForReply(5),true);
  f.player.mounted=true;assert.equal(f.entry.IsWaitingForReply(5),false);
  f.entry.OnAIResponse(5,'ok','안녕');
  assert.deepEqual(f.runtime.ended,['session_mounted']);assert.equal(f.runtime.responses,undefined);
  for(const apply of [x=>{x.runtime.inMenu=true;},x=>{x.player.workspot=true;},x=>{x.runtime.inDialogue=['npc'];}]){
    f=fixture();f.session.popup=null;f.session.pendingRequest=6;apply(f);
    f.entry.OnAIResponse(6,'ok','안녕');assert.equal(f.runtime.ended.length,1);assert.equal(f.runtime.messages.length,0);
  }
});

test('SR-02 Esc는 입력칸이 없는 차례에서도 동작: 대기 중이면 요청만 취소하고 V 차례로, 자막 차례면 대화 종료',()=>{
  let f=fixture();f.session.popup=null;f.session.pendingRequest=77;f.session.latestRequest=77;
  assert.equal(f.entry.OnEscape(),true);
  assert.equal(f.session.pendingRequest,-1);assert.equal(f.session.latestRequest,-1);assert.equal(f.runtime.ended.length,0);
  assert.equal(f.entry.outbox.length,1);assert.equal(f.entry.outbox[0].kind,'cancel');assert.equal(f.entry.outbox[0].id,77);
  assert.equal(f.entry.outbox[0].worldToken,'w1');
  assert.ok(f.runtime.timers.some(t=>t.kind===2),'같은 대화의 입력 차례(Reopen) 예약');
  // 취소 뒤 늦게 도착한 응답은 표시·종료·메시지 없이 버린다.
  f.entry.OnAIResponse(77,'ok','늦은 대사');
  assert.equal(f.runtime.ended.length,0);assert.equal(f.runtime.responses,undefined);assert.equal(f.session.pendingRequest,-1);
  assert.equal(f.entry.IsWaitingForReply(77),false);
  // 취소 뒤 재입력(새 요청 번호)은 정상 대기가 되고 이전 번호의 응답과 섞이지 않는다.
  f.session.pendingRequest=78;f.session.latestRequest=78;
  f.entry.OnAIResponse(77,'ok','이전 대사');assert.equal(f.session.pendingRequest,78);
  // 응답·자막 차례(대기 요청 없음)의 Esc는 대화를 끝낸다.
  f=fixture();f.session.popup=null;assert.equal(f.entry.OnEscape(),true);assert.deepEqual(f.runtime.ended,['session_closed']);
  // 입력칸이 열려 있으면 ChatPopup이, 메뉴 보류 중이면 오리지널 메뉴가 처리한다. 세션이 없으면 관여하지 않는다.
  f=fixture();assert.equal(f.entry.OnEscape(),false);assert.equal(f.runtime.ended.length,0);
  f=fixture();f.session.popup=null;f.session.menuSuspended=true;assert.equal(f.entry.OnEscape(),false);
  f=fixture();f.entry.session=null;assert.equal(f.entry.OnEscape(),false);
  // 입력칸이 열린 차례의 Esc는 기존처럼 닫아 세션을 끝낸다.
  f=fixture();f.press('escape');assert.deepEqual(f.runtime.ended,['session_closed']);
});

test('SR-02/05 응답 시한(40초) 만료는 통신 취소 요청을 보내고 오류로 처리한다',()=>{
  const f=fixture();f.session.popup=null;f.session.pendingRequest=9;
  f.entry.OnSubtitleTimer({kind:4,requestId:9,session:f.session,epoch:1});
  assert.equal(f.entry.outbox.length,1);assert.equal(f.entry.outbox[0].kind,'cancel');assert.equal(f.entry.outbox[0].id,9);
  assert.equal(f.session.pendingRequest,-1);assert.equal(f.runtime.messages.length,1);assert.ok(f.runtime.messages[0].includes('timeout'));
  assert.ok(f.runtime.timers.some(t=>t.kind===2));
  // 이미 응답이 끝난 요청의 시한은 아무것도 보내지 않는다.
  const g=fixture();g.session.popup=null;g.session.pendingRequest=-1;
  g.entry.OnSubtitleTimer({kind:4,requestId:9,session:g.session,epoch:1});assert.equal(g.entry.outbox.length,0);
});

test('SR-02 OnAction: 응답 대기·자막 차례의 Esc는 일시정지 메뉴 대신 ANPC가 소비한다',()=>{
  const f=fixture();let original=0;
  const env={...f.env,ListenerAction:{GetName:a=>a.name,GetType:a=>a.type},gameinputActionType:{BUTTON_RELEASED:'release'},wrappedMethod(){original++;return true;}};
  env.Entry={Get:()=>f.entry};
  const run=new Function(...Object.keys(env),'action','consumer',body(menuSource,'OnAction'));
  const call=()=>run.call({GetPlayerControlledObject:()=>({GetGame:()=>f.runtime})},...Object.values(env),{name:'OpenPauseMenu',type:'release'},{});
  f.session.popup=null;f.session.pendingRequest=3;
  assert.equal(call(),true);assert.equal(original,0);assert.equal(f.session.pendingRequest,-1);
  f.session.popup={};assert.equal(call(),true);assert.equal(original,1); // 입력칸이 열려 있으면 원작 처리로 넘긴다.
  f.entry.session=null;call();assert.equal(original,2);
});
