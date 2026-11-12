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
  return source.slice(start,end-1).replace(/\blet (\w+): array<[\w<>]+>;/g,'let $1=[];').replace(/\blet (\w+): [\w<>]+/g,(_,n)=>'let '+n)
    .replace(/\bif\s+([^{}]+?)\s*\{/g,'if ($1) {').replace(/\bwhile\s+([^{}]+?)\s*\{/g,'while ($1) {').replace(/Cast<\w+>\(/g,'Number(').replace(/(?<![\\\w])n"([^"]+)"/g,'"$1"');
}
function compile(source,name,args,env){return new Function(...Object.keys(env),...args,body(source,name)).bind(null,...Object.values(env));}
function fixture(){
  const runtime={shown:[],hidden:[],inMenu:false,time:0,events:[],opened:[],ended:[],timers:[],delayed:[],requests:0,messages:[]};
  const makeActor=id=>({id,attached:true,dead:false,combat:false,mounted:false,workspot:false,IsAttached(){return this.attached;},IsDead(){return this.dead;},IsInCombat(){return this.combat;},GetWorldPosition(){return 0;},
    GetGame(){return runtime;},GetEntityID(){return this.id;},GetPlayerStateMachineBlackboard(){return {GetInt(){return runtime.tier??0;}};}});
  const npc=makeActor('npc'),player=makeActor('player');
  const session={epoch:1,npc,player,pendingRequest:-1,holdHubId:-1,hangulMode:true,inputDraft:'',inputDraftCaret:0,menuSuspended:false,name:'빅터',subtitles:[],history:[],segments:[],segmentSeconds:[],segmentIndex:0,segmentGen:0};
  const entry={session,epoch:1,uiController:{},outbox:[],worldToken:'w1',GetGameInstance(){return runtime;},NextSubtitleId(){return this.subtitleSeq=(this.subtitleSeq??0)+1;},
    EndSession(s,reason){runtime.ended.push(reason);if(this.session===s)this.session=null;},
    ScheduleSubtitle(game,kind,id,delay){runtime.timers.push({kind,id,delay,session:this.session,epoch:this.epoch});},
    OnAIResponse(id,status){runtime.responses??=[];runtime.responses.push({id,status});},ScheduleWatch(){}};
  const defs={UI_System:{IsInMenu:'isInMenu'},MenuEventBlackboard:{MenuEventToTrigger:'menuEvent'},PlayerStateMachine:{HighLevel:'highLevel'}};
  const scene={IsEntityInScene:id=>runtime.inScene?.includes(id)??false,IsEntityInDialogue:id=>runtime.inDialogue?.includes(id)??false};
  const bb={GetBool(){return runtime.inMenu;},SetName(key,value){runtime.events.push(value);}};
  const env={IsDefined:v=>v!=null,Equals:(a,b)=>a===b,NotEquals:(a,b)=>a!==b,
    EngineTime:{ToFloat:v=>v},GameInstance:{GetSimTime:()=>runtime.time,GetBlackboardSystem:()=>({Get:()=>bb}),GetQuestsSystem:()=>({GetFact:key=>runtime[key]??0}),GetSceneSystem:()=>({GetScriptInterface:()=>scene}),GetWorkspotSystem:()=>({IsActorInWorkspot:a=>a.workspot}),GetDelaySystem:()=>({DelayCallback:(callback,delay)=>runtime.delayed.push({callback,delay})})},
    GetAllBlackboardDefs:()=>defs,Vector4:{Distance:()=>0},Entry:{LeaveDistance:()=>6,ShowMessage:(game,text)=>runtime.messages.push(text)},NPCPuppet:{IsInCombat:a=>a.combat},
    SceneEntry:{NativeHubs:()=>({choiceHubs:[{id:1}]})},ArraySize:a=>a.length,
    AnpcSubtitleCallback:Object.assign(class{},{Hide:()=>0,Reopen:()=>2,Watch:()=>3,Timeout:()=>4,EndAfter:()=>5,ResumeMenu:()=>6,Segment:()=>7}),
    MinF:Math.min,MaxF:Math.max,MinI:Math.min,MaxI:Math.max,ArrayClear:a=>{a.length=0;},ArrayErase:(a,i)=>a.splice(i,1),ArraySize:a=>a.length,
    AnpcSubtitles:{Show(game,id,speaker,name,text,duration,persistent){runtime.shown.push({id,name,text,duration,persistent});},Hide(game,id){runtime.hidden.push(id);}},
    GetMountedVehicle:a=>a.mounted?{}:null,StrBeginsWith:(a,b)=>a.startsWith(b),StrAfterFirst:(a,b)=>a.slice(a.indexOf(b)+b.length),StrLen:a=>a.length,ArrayPush:(a,v)=>a.push(v),AnpcRequest:class{},SceneEntryInstaller:{Get:()=>null},
    GameMenu:{},ChatPopup:{Create(e,mode,text,caret){runtime.opened.push({mode,text,caret});return {Open(){}};}}};
  for(const [name,args]of [['IsOpen',['game']],['Request',['game']]])env.GameMenu[name]=compile(menuSource,name,args,env);
  env.Entry.FailureMessage=compile(entrySource,'FailureMessage',['status'],env);
  env.Entry.IdleSeconds=compile(entrySource,'IdleSeconds',[],env);
  env.Entry.HistoryWindow=compile(entrySource,'HistoryWindow',[],env);
  env.UTF8StrMid=(t,i,n)=>[...t].slice(i,i+n).join('');env.ToString=String;env.StrContains=(a,b)=>a.includes(b);
  // UF-19/20 제출 검사 본문도 제품 소스(Session.reds)를 그대로 실행한다.
  env.AnpcInput={};
  for(const [name,args]of [['MaxChars',[]],['CharCount',['text']],['IsSpace',['c']],['IsBlank',['text']],['Check',['text']],['Notice',['reason','text']]])env.AnpcInput[name]=compile(popupSource,name,args,env);
  env.ChatPopup.HintText=compile(popupSource,'HintText',[],env);
  for(const [name,args]of [['Duration',['text']],['SegmentChars',[]],['HistoryChars',[]],['IsSentenceEnd',['text','index']],['BreakAt',['text','start','limit']],['Split',['text','limit']]])env.AnpcSubtitles[name]=compile(popupSource,name,args,env);
  // 별도 메뉴 규칙을 복제하지 않고 제품 메서드 본문을 모의 엔진에서 실행한다.
  for(const [name,args]of [['PrepareGameMenu',[]],['OpenGameMenu',['popup']],['QueueMenuResume',['session']],['OnChatMenuChanged',['inMenu']],['OpenInput',['session']],['SessionEndReason',['session']],['ProtectedReason',['session']],['QueueCancel',['session','requestId']],['CancelPending',['session']],['OnEscape',[]],['OnAIResponse',['requestId','status','text']],['IsWaitingForReply',['requestId']],['OnSubtitleTimer',['callback']],['OnChatClosed',['popup']],['IsChatMenuOpen',[]],['NoteActivity',[]],['IdleReason',['session']],['HideSubtitles',['session']],['HideShown',['session']],['PresentLine',['session','npc','text','status','voiceSeconds']],['ShowNextSegment',['session']],['AddHistory',['session','speaker','text']],['GetHistoryCount',[]],['GetHistoryText',['back']],['OnAIVoiceResponse',['requestId','status','text','voiceSeconds']]]){
    const run=new Function(...Object.keys(env),...args,body(entrySource,name));entry[name]=function(...values){return run.call(this,...Object.values(env),...values);};
  }
  entry.SubmitChat=text=>{runtime.submitted=text;};
  const popup={entry,closing:false,held:[],pendingClose:false,pendingText:'',submitted:false,GetGame:()=>runtime,
    history:{text:'',SetText(t){this.text=t;}},historyBack:0,
    hint:{text:'기본',opacity:0.7,SetText(t){this.text=t;},SetOpacity(o){this.opacity=o;}},noticeShown:false,
    input:{text:'안녕하세요',composing:'',caret:3,FinishComposition(){runtime.finished=true;this.text+=this.composing;this.composing='';},GetText(){return this.text;},GetCaretPosition(){return this.caret;},Clear(){this.text='';}},
    IsHangulMode:()=>false,Close(){this.closing=true;runtime.closes=(runtime.closes??0)+1;entry.OnChatClosed(this);},WasSubmitted(){return this.submitted;}};
  const keyEnv={...env,EInputAction:{IACT_Release:'release',IACT_Press:'press'},EInputKey:{IK_Tab:'tab',IK_Enter:'enter',IK_Escape:'escape',IK_PageUp:'pageup',IK_PageDown:'pagedown'},
    StrLen:s=>s.length,ArrayContains:(a,v)=>a.includes(v),ArrayPush:(a,v)=>a.push(v),ArrayRemove:(a,v)=>{const i=a.indexOf(v);if(i>=0)a.splice(i,1);},ChatCloseTimeout:class{}};
  for(const [name,args]of [['GetDraft',[]],['GetDraftCaret',[]],['OnChatKey',['event']],['RequestClose',['text']],['FinishClose',[]],['ShowNotice',['text']],['ClearNotice',[]],['ScrollHistory',['delta']],['RefreshHistory',[]]]){
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

test('SR-06/UF-59 비용 한도 차단은 한도 도달 사유와 설정 위치를 안내한다',()=>{
  const f=fixture();f.session.popup=null;f.session.pendingRequest=12;
  f.entry.OnAIResponse(12,'error:budget_exceeded','');
  assert.equal(f.runtime.messages.length,1);assert.match(f.runtime.messages[0],/비용 한도에 도달/);assert.match(f.runtime.messages[0],/ANPC 비용 설정/);
  assert.equal(f.session.pendingRequest,-1);assert.ok(f.runtime.timers.some(t=>t.kind===2),'같은 대화의 입력 차례 복귀');
});

test('UF-56 기억 삭제로 무효화된 대기 요청은 삭제 사유를 안내하고 입력 차례로 복귀한다',()=>{
  const f=fixture();f.session.popup=null;f.session.pendingRequest=13;
  f.entry.OnAIResponse(13,'error:memory_cleared','');
  assert.equal(f.runtime.messages.length,1);assert.match(f.runtime.messages[0],/기억이 삭제/);
  assert.equal(f.session.pendingRequest,-1);
});

test('UF-19 공백만/빈 입력은 전송하지 않고 입력을 유지하며 호출·자막·기억을 만들지 않는다',()=>{
  const blanks=['','   ','\t\n','\r\n ','\u00a0','\u200b','\u3000\u3000',' \u3000\t\u200b '];
  for(const blank of blanks){
    const f=fixture();f.popup.input.text=blank;
    f.press('enter');
    assert.equal(f.runtime.submitted,undefined,JSON.stringify(blank));assert.equal(f.runtime.closes,undefined);
    assert.equal(f.popup.input.text,blank,'입력 유지');assert.equal(f.popup.submitted,false);
    assert.equal(f.runtime.ended.length,0);assert.equal(f.runtime.delayed.length,0);
    assert.match(f.popup.hint.text,/내용을 입력/);assert.equal(f.popup.hint.opacity,1);
    // 다음 키 입력에서 기본 안내로 돌아간다.
    f.press('a',{},'press');assert.equal(f.popup.hint.text,f.env.ChatPopup.HintText());assert.equal(f.popup.hint.opacity,0.7);
  }
  // 공백이 섞인 실제 글자는 그대로 전송한다(앞뒤 공백을 임의로 바꾸지 않는다).
  const g=fixture();g.popup.input.text='  안녕  ';g.press('enter');assert.equal(g.runtime.submitted,'  안녕  ');
});

test('UF-20 200자 제출 경계: 200자는 전송, 201자는 자르지 않고 거부하며 허용 길이를 안내한다',()=>{
  const f=fixture();f.popup.input.text='가'.repeat(200);f.press('enter');
  assert.equal(f.runtime.submitted.length,200);
  const over=fixture();over.popup.input.text='가'.repeat(201);over.press('enter');
  assert.equal(over.runtime.submitted,undefined);assert.equal(over.popup.input.text.length,201,'입력을 자르지 않는다');
  assert.match(over.popup.hint.text,/200자 이하/);assert.match(over.popup.hint.text,/현재 201자/);
  // 편집해 줄이면 다시 보낼 수 있다.
  over.popup.input.text='가'.repeat(200);over.press('enter');assert.equal(over.runtime.submitted.length,200);
  // 코드포인트 기준: 이모지·한자도 1글자로 센다.
  assert.equal(fixture().env.AnpcInput.CharCount('a😀한'),3);
  assert.equal(fixture().env.AnpcInput.Check('😀'.repeat(200)),0);assert.equal(fixture().env.AnpcInput.Check('😀'.repeat(201)),2);
});

test('UF-19/20 조합 중인 글자는 Enter에서 확정한 뒤 검사·전송한다',()=>{
  const f=fixture();f.popup.input.text='가나';f.popup.input.composing='다';
  f.press('enter');
  assert.equal(f.runtime.finished,true);assert.equal(f.runtime.submitted,'가나다');
  // 조합 확정 글자가 201번째면 거부한다.
  const g=fixture();g.popup.input.text='가'.repeat(200);g.popup.input.composing='나';
  g.press('enter');assert.equal(g.runtime.submitted,undefined);assert.equal(g.popup.input.text.length,201);
  // 공백뿐인 입력에 조합 글자가 있으면 글자가 있는 입력이다.
  const h=fixture();h.popup.input.text='  ';h.popup.input.composing='가';h.press('enter');assert.equal(h.runtime.submitted,'  가');
});

test('UF-19/20 입력칸을 거치지 않는 직접 제출도 같은 검사를 통과해야 한다',()=>{
  const submitFor=g=>{
    const env={...g.env,SceneEntryInstaller:{Get:()=>null},
      GameContext:{Collect:()=>({npcIdentity:null})},GetLocalizedText:t=>t,AnpcRequest:class{}};
    const run=new Function(...Object.keys(env),'text',body(entrySource,'SubmitChat'));
    g.session.popup=null;g.session.subtitles=[];g.entry.outbox=[];g.entry.requestSeq=0;
    return text=>run.call(g.entry,...Object.values(env),text);
  };
  for(const bad of ['','   ','\u3000','가'.repeat(201)]){
    const g=fixture();submitFor(g)(bad);
    assert.equal(g.entry.outbox.length,0,JSON.stringify(bad));assert.equal(g.session.pendingRequest,-1);
    assert.equal(g.session.inputDraft,bad,'입력 유지');assert.equal(g.runtime.messages.length,1);
    assert.ok(g.runtime.timers.some(t=>t.kind===2),'같은 대화의 입력 차례 복귀');
  }
  const ok=fixture();ok.runtime.time=33;submitFor(ok)('가'.repeat(200));assert.equal(ok.session.lastActivity,33,'제출은 UI 활동');
  assert.equal(ok.entry.outbox.length,1);assert.equal(ok.entry.outbox[0].text.length,200);assert.equal(ok.session.pendingRequest,1);
});

test('UF-31 active 유휴 60초는 입력/UI 활동 기준이며 응답 대기·메뉴 보류와 구분한다',()=>{
  const watch=f=>f.entry.OnSubtitleTimer({kind:3,session:f.session,epoch:1});
  let f=fixture();f.session.lastActivity=0;f.session.popup=null;
  f.runtime.time=60;watch(f);assert.equal(f.runtime.ended.length,0,'정확히 60초는 유지');
  f.runtime.time=60.5;watch(f);assert.deepEqual(f.runtime.ended,['session_idle']);assert.match(f.runtime.messages[0],/입력이 없어/);
  // 응답 대기(waiting)는 유휴가 아니라 요청 제한 시간이 적용된다. 대기가 끝나는 순간 기준이 갱신되어 대기 시간이 합산되지 않는다.
  f=fixture();f.session.lastActivity=0;f.session.popup=null;f.session.pendingRequest=3;f.session.latestRequest=3;
  f.runtime.time=300;watch(f);assert.equal(f.runtime.ended.length,0);
  f.entry.OnAIResponse(3,'error:timeout','');assert.equal(f.session.lastActivity,300);
  f.runtime.time=359;watch(f);assert.equal(f.runtime.ended.length,0);f.runtime.time=361;watch(f);assert.deepEqual(f.runtime.ended,['session_idle']);
  // 취소로 대기에서 돌아와도 기준이 갱신된다.
  f=fixture();f.session.lastActivity=0;f.session.popup=null;f.session.pendingRequest=4;f.session.latestRequest=4;
  f.runtime.time=200;f.entry.OnEscape();assert.equal(f.session.lastActivity,200);f.runtime.time=250;watch(f);assert.equal(f.runtime.ended.length,0);
  // Tab 메뉴 보류 중에는 유휴가 아니며 복귀하면 기준이 갱신된다.
  f=fixture();f.session.lastActivity=0;f.runtime.time=100;f.press('tab');assert.ok(f.session.menuSuspended);assert.equal(f.session.lastActivity,100);
  f.runtime.time=500;watch(f);assert.equal(f.runtime.ended.length,0);
  f.menu(true);f.menu(false);f.resume();assert.equal(f.session.lastActivity,500);
  f.runtime.time=555;watch(f);assert.equal(f.runtime.ended.length,0);
  // 입력칸의 키 입력이 기준을 갱신한다.
  f=fixture();f.session.lastActivity=0;f.runtime.time=59;f.press('a',{},'press');assert.equal(f.session.lastActivity,59);
  f.runtime.time=118;watch(f);assert.equal(f.runtime.ended.length,0);f.runtime.time=120;watch(f);assert.deepEqual(f.runtime.ended,['session_idle']);
  f=fixture();f.session.lastActivity=0;f.runtime.time=40;
  assert.equal(f.entry.IdleReason(f.session),'');f.runtime.time=61;assert.equal(f.entry.IdleReason(f.session),'session_idle');
});

test('UF-26 긴 대사는 같은 발화 순서로 나뉘고 글자·순서를 보존한다',()=>{
  const {env}=fixture();const split=(t,n=60)=>env.AnpcSubtitles.Split(t,n);
  assert.deepEqual(split('짧은 대사야.'),['짧은 대사야.']);
  assert.deepEqual(split('가'.repeat(60)),['가'.repeat(60)],'경계: 정확히 한도는 한 조각');
  assert.deepEqual(split('가'.repeat(61)),['가'.repeat(60),'가']);
  // 공백·문장 끝이 없으면 한도에서 자른다.
  assert.deepEqual(split('나'.repeat(130)),['나'.repeat(60),'나'.repeat(60),'나'.repeat(10)]);
  // 문장 끝을 우선한다.
  const long='첫 번째 문장은 이렇게 길게 이어진다고 해보자. 두 번째 문장은 조금 더 길게 이어지고 있다고 하자! 세 번째 문장도 마지막까지 나와야 한다… 네 번째 문장은 그다음에 이어서 계속 말하고 있는 중이다. 끝.';
  const parts=split(long);
  assert.ok(parts.length>=2);for(const part of parts){assert.ok([...part].length<=60,part);assert.ok(part===part.trim(),'앞뒤 공백 없음');}
  assert.equal(parts.join(' ').replace(/\s+/g,''),long.replace(/\s+/g,''),'순서·내용 보존');
  assert.match(parts[0],/[.!]$/);
  // 공백 경계 분할과 영문 소수점은 끊지 않는다.
  const spaced=split('word '.repeat(30).trim());assert.ok(spaced.every(p=>[...p].length<=60)&&spaced.join(' ')==='word '.repeat(30).trim());
  assert.equal(split('3.5'+'가'.repeat(70))[0].includes('3.5'),true);
  assert.equal(env.AnpcSubtitles.Duration('가'),3);assert.equal(env.AnpcSubtitles.Duration('가'.repeat(200)),10);
});

test('UF-26 수용된 대사는 조각을 차례로 표시하고 마지막 조각은 다음 대사·종료까지 유지한다',()=>{
  const f=fixture();f.session.popup=null;f.session.pendingRequest=5;f.session.latestRequest=5;
  const long='첫 문장은 충분히 길어서 한 자막에 다 담기지 않는다. 둘째 문장도 이어서 말한다. 셋째 문장은 마지막으로 이어서 나온다.';
  f.entry.OnAIResponse(5,'ok',long);
  const segments=[...f.session.segments];assert.ok(segments.length>=2);
  assert.equal(f.runtime.shown.length,1);assert.equal(f.runtime.shown[0].text,segments[0]);assert.equal(f.runtime.shown[0].persistent,false);
  assert.equal(f.runtime.shown[0].duration,f.session.segmentSeconds[0]);
  const segmentTimers=()=>f.runtime.delayed.filter(d=>d.callback.kind===7);
  assert.equal(segmentTimers().length,1);assert.equal(segmentTimers()[0].delay,f.session.segmentSeconds[0]);
  // 조각 타이머가 순서대로 다음 조각을 표시하고 앞 조각은 내린다.
  let fired=0;
  while(segmentTimers().length>fired){
    const timer=segmentTimers()[fired++];f.entry.OnSubtitleTimer(timer.callback);
  }
  assert.deepEqual(f.runtime.shown.map(s=>s.text),segments);
  assert.deepEqual(f.runtime.shown.map(s=>s.persistent),segments.map((_,i)=>i===segments.length-1),'마지막 조각만 유지');
  assert.equal(f.runtime.hidden.length,segments.length-1,'앞 조각만 내림');
  // 입력 재개(Reopen)는 전체 표시 시간 뒤에 한 번, Hide 타이머는 없다.
  const total=f.session.segmentSeconds.reduce((a,b)=>a+b,0);
  const reopen=f.runtime.timers.filter(t=>t.kind===2);assert.equal(reopen.length,1);assert.ok(Math.abs(reopen[0].delay-(total+0.3))<1e-9);
  assert.equal(f.runtime.timers.filter(t=>t.kind===0).length,0);
  // 새 입력(HideSubtitles)은 마지막 조각을 내리고 남은 조각 타이머를 무효화한다.
  const g=fixture();g.session.popup=null;g.session.pendingRequest=6;g.entry.OnAIResponse(6,'ok',long);
  const staleTimer=g.runtime.delayed.find(d=>d.callback.kind===7).callback;
  g.entry.HideSubtitles(g.session);g.entry.OnSubtitleTimer(staleTimer);
  assert.equal(g.runtime.shown.length,1,'폐기된 조각은 표시하지 않는다');
  // 짧은 대사는 한 조각이며 자체 숨김 타이머 없이 유지된다.
  const h=fixture();h.session.popup=null;h.session.pendingRequest=7;h.entry.OnAIResponse(7,'ok','괜찮아.');
  assert.equal(h.runtime.shown.length,1);assert.equal(h.runtime.shown[0].persistent,true);assert.equal(h.runtime.hidden.length,0);
  assert.equal(h.runtime.delayed.filter(d=>d.callback.kind===7).length,0);
  // 종료 대사는 표시가 끝난 뒤 종료로 이어진다.
  const e=fixture();e.session.popup=null;e.session.pendingRequest=8;e.entry.OnAIResponse(8,'ok:end','그럼 이만.');
  assert.ok(e.runtime.timers.some(t=>t.kind===5));
});

test('UF-26 음성 응답은 표시 시간을 음성 길이 이상으로 늘리고 조각 길이에 비례해 나눈다',()=>{
  const f=fixture();f.session.popup=null;f.session.pendingRequest=9;
  const long='첫 문장은 충분히 길어서 한 자막에 다 담기지 않는다. 둘째 문장도 이어서 말한다. 셋째 문장은 마지막으로 이어서 나온다.';
  f.entry.OnAIVoiceResponse(9,'ok',long,25);
  const total=f.session.segmentSeconds.reduce((a,b)=>a+b,0);assert.ok(Math.abs(total-25.3)<1e-9,String(total));
  f.entry.OnAIVoiceResponse(9,'ok',long,60);
  const g=fixture();g.session.popup=null;g.session.pendingRequest=10;g.entry.OnAIVoiceResponse(10,'ok',long,60);
  assert.ok(Math.abs(g.session.segmentSeconds.reduce((a,b)=>a+b,0)-30)<1e-9,'최대 30초');
});

test('UF-26 활성 세션의 확정 발화를 순서대로 기록하고 열람한다(폐기 응답·오류 제외)',()=>{
  const f=fixture();f.session.popup=null;
  f.entry.AddHistory(f.session,'V','안녕');
  f.session.pendingRequest=1;f.entry.OnAIResponse(1,'ok','어서 와.');
  f.session.pendingRequest=2;f.entry.OnAIResponse(2,'error:timeout','');
  f.entry.AddHistory(f.session,'V','한 가지 물어볼게. '+'길게 '.repeat(120));
  f.session.pendingRequest=3;f.entry.OnAIResponse(3,'ok','그래, 말해봐.');
  const lines=f.session.history;
  assert.equal(lines[0],'V: 안녕');assert.equal(lines[1],'빅터: 어서 와.');
  assert.ok(lines.every(l=>[...l].length<=4+56+4),'표시 줄 길이 상한');
  assert.equal(lines.at(-1),'빅터: 그래, 말해봐.');assert.ok(!lines.some(l=>l.includes('timeout')));
  assert.ok(lines.some(l=>l.startsWith('    ')),'긴 발화의 이어지는 줄은 들여쓴다');
  // 창은 최신 6줄이며 뒤로 올라가면 과거 줄을 본다.
  const count=f.entry.GetHistoryCount();assert.ok(count>6);
  assert.equal(f.entry.GetHistoryText(0).split('\n').length,6);assert.ok(f.entry.GetHistoryText(0).endsWith('빅터: 그래, 말해봐.'));
  assert.equal(f.entry.GetHistoryText(count-6).split('\n')[0],'V: 안녕');
  // 입력칸에서 PgUp/PgDn으로 3줄씩 넘기고 범위를 벗어나지 않는다.
  f.press('pageup');assert.equal(f.popup.historyBack,3);assert.equal(f.popup.history.text,f.entry.GetHistoryText(3));
  for(let i=0;i<20;i++)f.press('pageup');assert.equal(f.popup.historyBack,count-6);
  for(let i=0;i<20;i++)f.press('pagedown');assert.equal(f.popup.historyBack,0);assert.equal(f.popup.history.text,f.entry.GetHistoryText(0));
  // 세션이 없으면 기록을 노출하지 않는다.
  f.entry.session=null;assert.equal(f.entry.GetHistoryText(0),'');assert.equal(f.entry.GetHistoryCount(),0);
});

test('UF-26/SR-11 세션 정리 경로(종료·재설정)는 유지형 자막을 내린다',()=>{
  assert.match(body(entrySource,'EndSession'),/this\.HideSubtitles\(session\)/);
  assert.match(body(entrySource,'Reset'),/this\.HideSubtitles\(this\.session\)/);
  const f=fixture();f.session.popup=null;f.session.pendingRequest=1;f.entry.OnAIResponse(1,'ok','괜찮아.');
  assert.equal(f.runtime.hidden.length,0);f.entry.HideSubtitles(f.session);assert.equal(f.runtime.hidden.length,1);assert.equal(f.session.subtitles.length,0);
});
