package.path = "game/cet/anpc/?.lua;" .. package.path
local bridge = require("bridge")

local request = { id = 7, kind = "say", session = 3, npcKey = "viktor", crowd = false, text = '안녕 "빅"\n\\' }
local encoded = bridge.encode(request, "tok")
assert(encoded == '{"id":7,"type":"say","session":3,"npc_key":"viktor","crowd":false,"text":"안녕 \\"빅\\"\\n\\\\","token":"tok"}', encoded)
assert(bridge.encode({ id = 1, kind = "end", session = 2, crowd = true }, "t"):find('"crowd":true,"text":""', 1, true))

local status, text = bridge.parse("tok\nok\n대사 한 줄", "tok")
assert(status == "ok" and text == "대사 한 줄")
assert(bridge.parse("old\nok\n이전 응답", "tok") == nil)
status, text = bridge.parse("tok\nerror:timeout\n", "tok")
assert(status == "error:timeout" and text == "")
print("브리지 인코딩·응답 해석 검사 통과")

-- 모의 CET: Entry 요청을 파일로 쓰고, 토큰이 맞는 응답만 Entry로 돌려준다.
local files, removed, responses = {}, {}, {}
local queue = { { id = 1, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "타로 봐줄래?" } }
local latestRequest, waiting = -1, false
function IsDefined(value) return value ~= nil end
local entry = {
  TakeRequest = function()
    local request = table.remove(queue, 1)
    if request then latestRequest = request.kind == "end" and -1 or request.id; waiting = request.kind == "say" end
    return request
  end,
  GetLatestRequestId = function() return latestRequest end,
  IsWaitingForReply = function(_, id) return waiting and latestRequest == id end,
  OnAIResponse = function(_, id, s, t) waiting = false; responses[#responses + 1] = { id = id, status = s, text = t } end
}
Game = {
  GetPlayer = function() return {} end,
  GetSystemRequestsHandler = function() return { IsPreGame = function() return false end } end,
  GetScriptableSystemsContainer = function() return { Get = function() return entry end } end
}
io = { open = function(path, mode)
  if mode == "w" then
    return { write = function(_, content) files[path] = content end, close = function() end }
  end
  if files[path] then return { read = function() return files[path] end, close = function() end } end
  return nil
end }
os.remove = function(path) removed[#removed + 1] = path; files[path] = nil end

assert(bridge.update(0.3))
local written = files["bridge/req-1.json"]
assert(written and written:find('"npc_key":"misty"', 1, true))
local token = written:match('"token":"([^"]+)"')
assert(token)
assert(bridge.pendingCount() == 1)

files["bridge/res-1.txt"] = "stale\nok\n이전 실행 응답"
assert(bridge.update(0.3))
assert(#responses == 0 and bridge.pendingCount() == 1)

files["bridge/res-1.txt"] = token .. "\nok\n카드를 섞어 볼게."
assert(bridge.update(0.3))
assert(#responses == 1 and responses[1].id == 1 and responses[1].status == "ok" and responses[1].text == "카드를 섞어 볼게.")
assert(removed[1] == "bridge/res-1.txt" and bridge.pendingCount() == 0)

-- 폴더가 없어 요청 파일을 못 쓰면 즉시 실패를 돌려준다.
queue[1] = { id = 2, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "또 보자" }
io.open = function() return nil end
assert(bridge.update(0.3))
assert(responses[2].id == 2 and responses[2].status == "error:bridge_unavailable")
bridge.reset()
print("브리지 요청 쓰기·토큰 검사·응답 전달 검사 통과 (모의 CET)")

-- JSON 디코더: 모델 응답 형식·유니코드 이스케이프·잘못된 입력.
local json = require("json")
local decoded = json.decode('{"dialogue":"\\uc548\\ub155 \\"V\\"","intent":"answer","action":null,"follow_up":null,"n":[1,2.5,-3e2]}')
assert(decoded.dialogue == '안녕 "V"' and decoded.intent == "answer" and decoded.action == json.null)
assert(decoded.n[2] == 2.5 and decoded.n[3] == -300)
assert(json.decode('{"a":') == nil and json.decode('{"a":1} x') == nil)
assert(json.decode('"\\ud83d\\ude00"') == "😀")
print("JSON 디코더 검사 통과")

-- 공급자 구조화 출력 설정과 별개로 게임 경계에서 응답을 다시 검사한다.
local validReply = '{"dialogue":"괜찮아.","intent":"answer","emotion":"neutral","action":null,"follow_up":null}'
assert(bridge.readReply(validReply) == "괜찮아.")
assert(bridge.readReply('{"dialogue":"필수 필드 누락"}') == nil)
assert(bridge.readReply((validReply:gsub('"answer"', '"invented"'))) == nil)
assert(bridge.readReply((validReply:gsub('"neutral"', '"invented"'))) == nil)
assert(bridge.readReply((validReply:gsub('"괜찮아%."', '"   "'))) == nil)
assert(bridge.readReply((validReply:gsub('"괜찮아%."', '"' .. string.rep("가", 601) .. '"'))) == nil)
assert(bridge.readReply((validReply:gsub('"괜찮아%."', '"' .. string.rep("가", 600) .. '"'))) ~= nil)
assert(bridge.readReply((validReply:gsub('"follow_up":null', '"follow_up":"' .. string.rep("가", 151) .. '"'))) == nil)
assert(bridge.readReply((validReply:gsub('"action":null', '"action":{"action_id":"face_player","args":{"duration_s":2}}'))) == nil)
assert(bridge.readReply((validReply:gsub('"action":null', '"action":{"action_id":"end_conversation","args":{"extra":1}}'))) == nil)
assert(bridge.readReply((validReply:gsub('"action":null', '"action":{"action_id":"end_conversation","args":[]}'))) == nil)
assert(bridge.readReply((validReply:gsub('"follow_up":null', '"follow_up":null,"extra":1'))) == nil)
assert(bridge.readReply((validReply:gsub('"answer"', '"farewell"'):gsub('"follow_up":null', '"follow_up":"또?"'))) == nil)
print("게임 응답 필드·열거값·글자 수·실행 가능한 행동 검사 통과")

-- 네이티브 경로: 요청 본문 조립, 완료 폴링, 응답 해석, 최근 발화 누적, 세션 종료 시 취소.
local nativeCalls, results, cancelled = {}, {}, {}
Game.ANPCNative_Version = function() return "0.1.0" end
Game.ANPCNative_Request = function(id, provider, body, timeout)
  nativeCalls[#nativeCalls + 1] = { id = id, provider = provider, body = body, timeout = timeout }
  return true
end
Game.ANPCNative_PollId = function()
  for id in pairs(results) do return id end
  return -1
end
Game.ANPCNative_ResultStatus = function(id) return results[id].status end
Game.ANPCNative_ResultText = function(id) return results[id].text end
Game.ANPCNative_Release = function(id) results[id] = nil end
Game.ANPCNative_Cancel = function(id) cancelled[#cancelled + 1] = id return true end
io.open = function() error("네이티브 경로에서는 파일을 쓰지 않는다") end
responses = {}
queue[1] = { id = 10, kind = "say", session = 5, npcKey = "viktor", crowd = false, text = "임플란트 점검 받을 수 있어?" }
assert(bridge.update(0.3))
assert(#nativeCalls == 1 and nativeCalls[1].provider == "openai" and nativeCalls[1].timeout == 30000)
local body = json.decode(nativeCalls[1].body)
assert(body and body.model == "gpt-6-luna" and body.reasoning.effort == "none" and body.store == false and body.text.format.name == "npc_reply")
assert(body.text.format.schema.properties.dialogue.type == "string")
assert(body.input[#body.input].content == "임플란트 점검 받을 수 있어?" and body.input[#body.input].role == "user")
assert(type(body.instructions) == "string" and #body.instructions > 100)
local fixed = #body.input

results[10] = { status = "ok", text = '{"dialogue":"앉아. 금방 봐줄게.","intent":"answer","emotion":"friendly","action":null,"follow_up":"요즘 통증은 없고?"}' }
assert(bridge.update(0.3))
assert(responses[1].id == 10 and responses[1].status == "ok" and responses[1].text == "앉아. 금방 봐줄게. 요즘 통증은 없고?")
assert(bridge.actionText() == "추가 행동 없음")

queue[1] = { id = 11, kind = "say", session = 5, npcKey = "viktor", crowd = false, text = "고마워, 다음에 올게" }
assert(bridge.update(0.3))
assert(bridge.actionText() == nil)
body = json.decode(nativeCalls[2].body)
assert(#body.input == fixed + 2 and body.input[fixed].role == "user" and body.input[fixed + 1].role == "assistant")

results[11] = { status = "ok", text = '{"dialogue":"그래, 조심해.","intent":"farewell","emotion":"neutral","action":{"action_id":"end_conversation","args":{}},"follow_up":null}' }
assert(bridge.update(0.3))
assert(responses[2].status == "ok:end")
assert(bridge.actionText() == "대화 종료 · 대사 후 실행")

queue[1] = { id = 12, kind = "say", session = 6, npcKey = "", crowd = true, text = "여기 뭐야?" }
queue[2] = { id = 13, kind = "end", session = 6 }
assert(bridge.update(0.3))
assert(json.decode(nativeCalls[3].body) and cancelled[1] == 12 and bridge.pendingCount() == 0)

queue[1] = { id = 14, kind = "say", session = 7, npcKey = "misty", crowd = false, text = "안녕" }
assert(bridge.update(0.3))
results[14] = { status = "auth_failed", text = "" }
assert(bridge.update(0.3))
assert(responses[3].id == 14 and responses[3].status == "error:auth_failed")

results[99] = { status = "ok", text = '{"dialogue":"모르는 요청"}' }
queue[1] = { id = 15, kind = "say", session = 8, npcKey = "jackie", crowd = false, text = "재키?" }
assert(bridge.update(0.3))
assert(responses[4].id == 15 and responses[4].status == "error:story_blocked" and results[99] == nil)
print("네이티브 요청 조립·폴링·응답 해석·취소 검사 통과 (모의 DLL)")

queue[1] = { id = 16, kind = "say", session = 9, npcKey = "misty", crowd = false, text = "리로드 직전" }
assert(bridge.update(0.3) and bridge.pendingCount() == 1)
bridge.reset()
assert(cancelled[#cancelled] == 16 and bridge.pendingCount() == 0)
results[16] = { status = "ok", text = validReply }
assert(bridge.update(0.3) and results[16] == nil and #responses == 4)
print("재로드 시 네이티브 요청 취소·늦은 응답 폐기 검사 통과")

-- 한 번의 대사 요청에서 구조화된 행동을 선택하고 대사와 별도 패널로 전달한다.
local actions = json.decode(require("prompts").characters.viktor.actions)
local gestureReply = validReply:gsub('"action":null', '"action":{"action_id":"play_gesture","args":{"gesture_ref":"test_nod"}}')
local line, ended, display = bridge.readReply(gestureReply, actions)
assert(line == "괜찮아." and ended == false and display == "가볍게 고개를 끄덕임 · 선택만 됨 (실행 미지원)")
assert(bridge.readReply(gestureReply:gsub('test_nod', 'arbitrary_asset'), actions) == nil)
assert(bridge.readReply(gestureReply:gsub('"gesture_ref":"test_nod"', '"gesture_ref":"test_nod","extra":1'), actions) == nil)
assert(bridge.readReply(gestureReply:gsub('"answer"', '"farewell"'), actions) == nil)
assert(bridge.readReply(gestureReply, json.decode(require("prompts").characters.johnny.actions)) == nil)
assert(bridge.readReply(gestureReply) == nil)

queue[1] = { id = 20, kind = "say", session = 10, npcKey = "viktor", crowd = false, text = "그렇구나" }
local countBefore = #nativeCalls
assert(bridge.update(0.3) and #nativeCalls == countBefore + 1)
assert(bridge.actionText() == nil)
results[20] = { status = "ok", text = gestureReply }
assert(bridge.update(0.3) and responses[#responses].id == 20 and responses[#responses].text == "괜찮아.")
assert(bridge.actionText() == display)
latestRequest = -1
assert(bridge.actionText() == nil)

queue[1] = { id = 21, kind = "say", session = 11, npcKey = "viktor", crowd = false, text = "늦은 응답" }
assert(bridge.update(0.3))
latestRequest = 22
local responseCount = #responses
results[21] = { status = "ok", text = gestureReply }
assert(bridge.update(0.3) and #responses == responseCount and bridge.actionText() == nil)
bridge.reset()

queue[1] = { id = 24, kind = "say", session = 13, npcKey = "viktor", crowd = false, text = "시간 초과 뒤 응답" }
assert(bridge.update(0.3))
waiting = false -- Entry의 40초 응답 시한이 먼저 끝난 상태.
results[24] = { status = "ok", text = gestureReply }
responseCount = #responses
assert(bridge.update(0.3) and #responses == responseCount and bridge.actionText() == nil)
bridge.reset()

-- 개발 파일 경로도 같은 JSON 필드를 사용한다. 예전 평문 응답은 앞선 검사에서 호환 확인.
Game.ANPCNative_Version = nil
io.open = function(path, mode)
  if mode == "w" then return { write = function(_, content) files[path] = content end, close = function() end } end
  if files[path] then return { read = function() return files[path] end, close = function() end } end
end
queue[1] = { id = 23, kind = "say", session = 12, npcKey = "viktor", crowd = false, text = "응" }
assert(bridge.update(0.3))
token = files["bridge/req-23.json"]:match('"token":"([^"]+)"')
files["bridge/res-23.txt"] = token .. "\nok:reply\n" .. gestureReply
assert(bridge.update(0.3) and responses[#responses].id == 23 and responses[#responses].text == "괜찮아.")
assert(bridge.actionText() == display)
bridge.reset()
print("단일 호출의 행동 선택·인물별 권한·패널 전달·늦은 결과 폐기 검사 통과")

-- 모델이 본 복장·인지 조건이 응답 전에 달라지면 대사·행동·발화 기록을 모두 버린다.
Game.ANPCNative_Version = function() return "0.1.0" end
local snapshot = { observationKnown=true, canObserve=true, outfitKnown=true,
  outfit={{slot="outer_chest",displayName="재킷"}}, streetCred=39, timeOfDay="밤",npcAliveConfirmed=true,npcFreeConfirmed=true }
entry.GetContext = function() return snapshot end
queue[1] = { id=30, kind="say", session=20, npcKey="resident", crowd=true, instanceToken="npc-1", text="내 옷 어때?", context=snapshot }
assert(bridge.update(0.3))
snapshot.outfit[1].displayName = "코트"
results[30] = {status="ok", text=gestureReply}
responseCount = #responses
assert(bridge.update(0.3) and #responses == responseCount + 1)
assert(responses[#responses].status == "error:context_changed" and bridge.actionText() == nil)
queue[1] = { id=31, kind="say", session=20, npcKey="resident", crowd=true, instanceToken="npc-1", text="다시 봐", context=snapshot }
assert(bridge.update(0.3))
body = json.decode(nativeCalls[#nativeCalls].body)
assert(body.input[#body.input-1].content:find("코트",1,true))
assert(not nativeCalls[#nativeCalls].body:find("내 옷 어때?",1,true)) -- 폐기한 턴은 최근 발화에 없다.
snapshot.streetCred = 40
results[31] = {status="ok",text=validReply}
assert(bridge.update(0.3) and responses[#responses].status == "error:context_changed")
queue[1] = { id=32, kind="say", session=20, npcKey="resident", crowd=true, instanceToken="npc-1", text="지금은?", context=snapshot }
assert(bridge.update(0.3))
snapshot.timeOfDay = "아침" -- 단순 시간 경과는 폐기 근거가 아니다.
results[32] = {status="ok",text=validReply}
assert(bridge.update(0.3) and responses[#responses].status == "ok" and bridge.actionText() == "추가 행동 없음")
bridge.reset()
print("복장·평판 변경 뒤 전체 응답/행동/기록 폐기·자동 재호출 없음·단순 시간 경과 허용 검사 통과")

-- NPC 자신의 표시 신원도 현재 요청에만 사용하고, 변경된 뒤 도착한 답변은 버린다.
snapshot.npcIdentity={known=true,displayName="메이 리",affiliation="아라사카",abilities={}}
queue[1]={id=33,kind="say",session=21,npcKey="resident",crowd=true,instanceToken="named-actor",text="누구세요?",context=snapshot}
assert(bridge.update(0.3))
body=json.decode(nativeCalls[#nativeCalls].body)
local projected=json.decode(body.input[1].content:match("\n(.*)$"))
assert(projected.display_name=="메이 리" and projected.game_identity.affiliation=="아라사카")
snapshot.npcIdentity.displayName="다른 표시 이름"
local npcCalls=#nativeCalls
results[nativeCalls[#nativeCalls].id]={status="ok",text=validReply}
assert(bridge.update(0.3) and responses[#responses].status=="error:context_changed" and bridge.actionText()==nil)
assert(#nativeCalls==npcCalls)
queue[1]={id=34,kind="say",session=21,npcKey="resident",crowd=true,instanceToken="named-actor",text="다시 말해봐",context=snapshot}
assert(bridge.update(0.3))
body=json.decode(nativeCalls[#nativeCalls].body)
projected=json.decode(body.input[1].content:match("\n(.*)$"))
assert(projected.display_name=="다른 표시 이름" and not nativeCalls[#nativeCalls].body:find("누구세요?",1,true))
bridge.reset()
print("스캔 이름의 대화 연결·변경 후 대사/행동/기록 폐기·자동 추가 호출 없음 검사 통과")

-- 로드 후 요청 번호가 되돌아가도 이전 DLL 결과를 새 인물에게 적용하지 않는다.
local scope="save-a"
entry.GetWorldToken=function() return scope end
entry.IsIdentityReusable=function() return true end
entry.IsIdentityAlive=function() return true end
snapshot.npcAliveConfirmed,snapshot.npcFreeConfirmed=true,true
queue[1]={id=40,kind="say",session=30,npcKey="viktor",crowd=false,instanceToken="save-a:viktor",worldToken=scope,text="로드 전",context=snapshot}
assert(bridge.update(0.3))
local oldWire=nativeCalls[#nativeCalls].id
scope="save-b"
queue[1]={id=1,kind="say",session=1,npcKey="misty",crowd=false,instanceToken="save-b:misty",worldToken=scope,text="로드 후",context=snapshot}
assert(bridge.update(0.3))
local newWire=nativeCalls[#nativeCalls].id
assert(newWire>oldWire and cancelled[#cancelled]==oldWire)
results[oldWire]={status="ok",text=gestureReply}
responseCount=#responses
assert(bridge.update(0.3) and #responses==responseCount and bridge.actionText()==nil)
results[newWire]={status="ok",text=validReply}
assert(bridge.update(0.3) and responses[#responses].id==1 and responses[#responses].status=="ok")
assert(not nativeCalls[#nativeCalls].body:find("로드 전",1,true))
bridge.reset()
print("세계/저장 전환 시 대기 호출 취소·정체성/기억 삭제·요청 번호 재사용에도 이전 DLL 결과 폐기 검사 통과")

-- 긴 세션은 종료를 안내하며 한도를 넘는 입력으로 추가 유료 요청을 만들지 않는다.
local limited
entry.EndForContextLimit=function(_,id) limited=id;waiting=false end
local longReply=json.encode({dialogue=string.rep("가",600),intent="answer",emotion="neutral",action=json.null,follow_up=json.null})
for i=1,60 do
  local id=100+i
  queue[1]={id=id,kind="say",session=50,npcKey="viktor",crowd=false,worldToken=scope,text=string.rep("나",600),context=snapshot}
  local calls=#nativeCalls
  assert(bridge.update(0.3))
  if limited then assert(limited==id and #nativeCalls==calls);break end
  assert(#nativeCalls==calls+1)
  results[nativeCalls[#nativeCalls].id]={status="ok",text=longReply}
  assert(bridge.update(0.3) and responses[#responses].status=="ok")
end
assert(limited and bridge.pendingCount()==0)
bridge.reset()
print("세션 원문 한도·종료 안내·초과 입력의 추가 호출 방지 검사 통과")

-- UF-62: 메뉴 중 새 결과/행동을 표시하지 않는다. 닫은 뒤 최신 관찰을 다시 검사한다.
local menuOpen=false
entry.IsChatMenuOpen=function()return menuOpen end
queue[1]={id=200,kind="say",session=60,npcKey="resident",crowd=true,instanceToken="menu-actor",worldToken=scope,text="안녕",context=snapshot}
assert(bridge.update(0.3))
local wire=nativeCalls[#nativeCalls].id
local menuCalls,menuResponses=#nativeCalls,#responses
menuOpen=true;results[wire]={status="ok",text=validReply}
assert(bridge.update(20) and #responses==menuResponses and results[wire] and bridge.pendingCount()==1 and bridge.actionText()==nil)
assert(#nativeCalls==menuCalls)
menuOpen=false
assert(bridge.update(0.3) and responses[#responses].status=="ok" and bridge.actionText()=="추가 행동 없음")
menuOpen=true;assert(bridge.actionText()==nil)
menuOpen=false;assert(bridge.actionText()=="추가 행동 없음")
queue[1]={id=201,kind="say",session=60,npcKey="resident",crowd=true,instanceToken="menu-actor",worldToken=scope,text="내 옷은 어때",context=snapshot}
assert(bridge.update(0.3))
wire=nativeCalls[#nativeCalls].id;menuCalls=#nativeCalls;menuResponses=#responses
menuOpen=true;snapshot.outfit[1].displayName="메뉴에서 바꾼 재킷"
results[wire]={status="ok",text=validReply}
assert(bridge.update(30) and #responses==menuResponses and #nativeCalls==menuCalls)
menuOpen=false
assert(bridge.update(0.3) and responses[#responses].status=="error:context_changed" and bridge.actionText()==nil and #nativeCalls==menuCalls)
queue[1]={id=202,kind="say",session=60,npcKey="resident",crowd=true,instanceToken="menu-actor",worldToken=scope,text="다시 봐줘",context=snapshot}
assert(bridge.update(0.3))
wire=nativeCalls[#nativeCalls].id;menuOpen=true
queue[1]={id=203,kind="end",session=60,npcKey="resident",crowd=true,worldToken=scope}
assert(bridge.update(0.3) and cancelled[#cancelled]==wire and bridge.pendingCount()==0)
menuOpen=false;bridge.reset()
print("UF-62 메뉴 중 응답/행동 보류·복귀 뒤 현재 복장 재검사·추가 호출 없음·메뉴 중 종료 취소 검사 통과")
