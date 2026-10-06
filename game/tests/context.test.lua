package.path = "game/cet/anpc/?.lua;" .. package.path
local context, json, bridge = require("context"), require("json"), require("bridge")
local snapshot = { observationKnown = true, canObserve = true, outfitKnown = true,
  outfit = { { slot = "outer_chest", displayName = '검은 "재킷"' } }, streetCred = 39,
  weaponKnown = true, weaponDrawn = true, weaponName = "권총", location = "왓슨", timeOfDay = "밤" }
local function view(key, crowd) return json.decode(context.encode(snapshot, key or "resident", crowd ~= false)) end
assert(view().player_identity.name == json.null and not view().player_identity.name_known_by_npc)
snapshot.streetCred = 40
assert(view().player_identity.name == "V" and view().public_reputation.name_recognized)
snapshot.streetCred = 50
assert(not view("judy", false).player_identity.name_known_by_npc)
snapshot.viktorVisitConfirmed = true
assert(view("viktor", false).player_identity.name_known_by_npc)
assert(not view("misty", false).player_identity.name_known_by_npc)
local output = context.encode(snapshot, "resident", true)
assert(not output:find("streetCred", 1, true) and not output:find('"level"', 1, true) and not output:find("q001", 1, true))
assert(#view().public_reputation.public_deeds == 0 and view().canon_context == nil)
assert(view().observations.visible_outfit[1].display_name == '검은 "재킷"')
assert(view().observations.visible_outfit[1].appearance_text == json.null)
assert(view().observations.visible_equipment == "권총")
snapshot.canObserve = false
assert(view().observations.visible_outfit == json.null and view().observations.weapon_drawn == json.null)
assert(view().player_identity.name_known_by_npc) -- 공개 인지는 복장 시야와 독립한다.
snapshot.observationKnown = false
assert(view().observations.can_observe_outfit == json.null)
snapshot.canObserve, snapshot.observationKnown = true, true
snapshot.outfit = {}
assert(#view().observations.visible_outfit == 0) -- 알려진 빈 슬롯과 조회 실패를 구분한다.
snapshot.outfitKnown = false
assert(view().observations.visible_outfit == json.null)
snapshot.outfitKnown = true
local fingerprint = context.encode(snapshot, "resident", true, false)
snapshot.timeOfDay = "아침"
assert(context.encode(snapshot, "resident", true, false) == fingerprint)
snapshot.weaponDrawn = false
assert(context.encode(snapshot, "resident", true, false) ~= fingerprint)
local unknown = json.decode(context.encode(nil, "resident", true))
assert(unknown.observations.location == json.null and unknown.observations.visible_outfit == json.null)
assert(not unknown.player_identity.name_known_by_npc)
local body = json.decode(bridge.buildBody(require("prompts").characters.viktor, {}, "내 옷 어때?", snapshot, "viktor", false))
assert(body.model == "gpt-6-luna" and body.reasoning.effort == "none")
assert(body.input[#body.input - 1].content:find('"source":"game_snapshot"', 1, true))
assert(body.input[#body.input].content == "내 옷 어때?")
local encoded = json.decode(bridge.encode({id=1,kind="say",session=2,npcKey="viktor",crowd=false,text="옷"}, "t", bridge.buildBody(require("prompts").characters.viktor, {}, "옷", snapshot, "viktor", false)))
assert(encoded.body.input[#encoded.body.input - 1].content:find('"name":"V"', 1, true))
snapshot.npcIdentity={known=true,displayName='메이 "리"',affiliation="타이거 클로",role="넷러너",attitude="중립적",abilities={"광학 위장","퀵핵","광학 위장"}}
local npc=context.npcIdentity(snapshot)
assert(npc.display_name=='메이 "리"' and npc.affiliation=="타이거 클로" and npc.role=="넷러너")
assert(#npc.displayed_abilities==2 and npc.status=="known")
snapshot.streetCred=39
assert(not view().player_identity.name_known_by_npc and context.npcIdentity(snapshot).display_name=='메이 "리"')
local before=context.fingerprint(snapshot,"resident",true)
snapshot.npcIdentity.abilities={"퀵핵","광학 위장"}
assert(context.fingerprint(snapshot,"resident",true)==before)
snapshot.npcIdentity.affiliation="발렌티노"
assert(context.fingerprint(snapshot,"resident",true)~=before)
snapshot.npcIdentity={known=false,displayName="내부 이름",affiliation="숨은 소속",abilities={"숨은 능력"}}
npc=context.npcIdentity(snapshot)
assert(npc.status=="unknown" and npc.display_name==json.null and npc.affiliation==json.null and #npc.displayed_abilities==0)
snapshot.npcIdentity={known=true,displayName="LocKey#1234",role=string.rep("가",201),abilities={"LocKey#4567"}}
npc=context.npcIdentity(snapshot)
assert(npc.display_name==json.null and npc.role==json.null and #npc.displayed_abilities==0)
snapshot.npcIdentity={known=true,displayName="시민",abilities={}}
npc=context.npcIdentity(snapshot)
assert(npc.display_name=="시민" and npc.affiliation==json.null and #npc.displayed_abilities==0)
print("실제 관찰 투영·평판 39/40·빅터 방문·미확인 상태·숫자/키 제외·입력 스냅샷 검사 통과")
print("스캔 신원·V 인지 분리·특성 중복/순서·변경 무효화·미확인/내부 키 제외 검사 통과")
local ageFingerprint=context.fingerprint(snapshot,"resident",true)
assert(not context.npcIdentity(snapshot).adult_humor_allowed)
snapshot.npcIdentity.adultHumorAllowed=true
assert(context.npcIdentity(snapshot).adult_humor_allowed and context.fingerprint(snapshot,"resident",true)~=ageFingerprint)
assert(not context.npcIdentity(nil).adult_humor_allowed)
print("UF-63 성인 유머 조건·미확인 기본값·조건 변경 시 응답 무효화 검사 통과")
