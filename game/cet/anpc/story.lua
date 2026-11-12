local json=require("json")
local config=require("config")
local meta=assert(json.decode(require("prompts").story_data))
local story={}
local targets={judy=true,panam=true,johnny=true}
local related={
  judy={"information","double_life","both_sides_now","talkin_revolution","pisces","pyramid_song"},
  panam={"ghost_town","life_during_wartime","riders_storm","little_help","queen_highway"},
  johnny={"automatic_love","ghost_town","down_on_the_street","tapeworm","chippin_in","like_supreme"}}
local factKeys={judy={"judy_knows_johnny","sq026_13_maiko_money","sq026_side_maiko","sq026_maiko_boss","sq026_maiko_dead","sq030_judy_lover"},
  panam={"sq027_panam_knows_about_chip","sq027_panam_doesnt_know_about_johnny","sq027_panam_lover","sq027_failed"},
  johnny={"sq032_johnny_friend"}}
local epilogues={"where_mind","path_glory","new_dawn","all_watchtower","things_done"}
local function activeOrNew(v) return v=="not_started" or v=="active" end
local function positive(v) return type(v)=="number" and v>0 end

function story.resolve(snapshot,key)
  if not targets[key] or not snapshot or not snapshot.story then return nil end
  local raw=snapshot.story
  local q,f={},{}
  if raw.journalKnown==true then for _,v in ipairs(raw.quests or {}) do q[v.id]=v.status end end
  if raw.factsKnown==true then for _,v in ipairs(raw.facts or {}) do f[v.name]=v.value end end
  local result={fields={},events=json.array(),status="unknown",met=false}
  local stageReady=not ((key=="judy" and positive(f.sq030_judy_lover) and q.pyramid_song~="completed")
    or (key=="panam" and positive(f.sq027_panam_lover) and q.queen_highway~="completed")
    or (key=="johnny" and positive(f.sq032_johnny_friend) and q.chippin_in~="completed"))
  local function event(v) result.events[#result.events+1]=v end
  local function setStage(id) if stageReady then result.stage=id;result.status="known" end end
  local function block(reason) result.blocked=reason;return result end
  if positive(f.q115_point_of_no_return) or positive(f.q307_start) then return block("finale") end
  for _,id in ipairs(epilogues) do if q[id]=="active" or q[id]=="completed" then return block("epilogue") end end
  if q.changes=="completed" then return block("relic_separated") end
  local period
  if q.playing_for_time=="completed" and f.q115_point_of_no_return==0 and f.q307_start==0 then period="act2"
  elseif activeOrNew(q.heist) and q.playing_for_time=="not_started" then period="pre_heist" end
  result.period=period
  result.fields["content.story.period"]=period
  for _,id in ipairs(related[key]) do result.fields["content.quests." .. id]=q[id] end
  result.fields["content.quests.playing_for_time"]=q.playing_for_time
  result.fields["content.quests.heist"]=q.heist
  if not period then return block("progress_unknown") end
  if period=="pre_heist" then
    if key=="johnny" then return block("before_relic_awakening") end
    if (key=="judy" and (q.double_life=="completed" or q.pyramid_song=="completed" or positive(f.judy_knows_johnny) or positive(f.sq030_judy_lover)))
      or (key=="panam" and (q.ghost_town=="completed" or q.queen_highway=="completed" or positive(f.sq027_panam_lover) or positive(f.sq027_panam_knows_about_chip))) then
      return block("story_conflict")
    end
  end
  if key=="judy" then
    result.met=q.information=="completed"
    if positive(f.sq026_13_maiko_money) then return block("judy_cut_off") end
    if q.pyramid_song=="completed" and q.pisces=="completed" and f.sq026_13_maiko_money==0 then
      if positive(f.sq030_judy_lover) then setStage("partner");result.fields["content.choices.judy_relationship"]="partner"
      elseif f.sq030_judy_lover==0 then setStage("friend");result.fields["content.choices.judy_relationship"]="friend" end
    elseif q.pisces=="completed" and activeOrNew(q.pyramid_song) then
      if positive(f.sq026_maiko_dead) and not positive(f.sq026_side_maiko) then setStage("maiko_killed");result.fields["content.choices.judy_pisces"]="maiko_killed"
      elseif positive(f.sq026_side_maiko) and positive(f.sq026_maiko_boss) and f.sq026_13_maiko_money==0 and f.sq026_maiko_dead==0 then
        setStage("maiko_no_pay");result.fields["content.choices.judy_pisces"]="maiko_no_pay"
      end
    elseif q.talkin_revolution=="completed" and activeOrNew(q.pisces) then setStage("clouds")
    elseif q.double_life=="completed" and activeOrNew(q.both_sides_now) then setStage("rescue")
    elseif result.met and activeOrNew(q.double_life) and q.both_sides_now=="not_started" then setStage("first") end
    if positive(f.judy_knows_johnny) and period=="act2" then
      result.relicKnown=true
      event("V는 주디에게 머릿속 조니와 렐릭이 V를 덮어쓰는 문제를 설명했다.")
    end
  elseif key=="panam" then
    result.met=q.ghost_town=="completed"
    if positive(f.sq027_failed) then return block("panam_quest_failed") end
    if q.queen_highway=="completed" and q.riders_storm=="completed" and q.little_help=="completed" then
      if positive(f.sq027_panam_lover) then setStage("partner");result.fields["content.choices.panam_relationship"]="partner"
      elseif f.sq027_panam_lover==0 then setStage("friend");result.fields["content.choices.panam_relationship"]="friend" end
    elseif q.riders_storm=="completed" and activeOrNew(q.queen_highway) then setStage("saul_saved")
    elseif q.life_during_wartime=="completed" and activeOrNew(q.riders_storm) then setStage("hellman")
    elseif result.met and activeOrNew(q.life_during_wartime) then setStage("first");result.goals=json.array() end
    if positive(f.sq027_panam_knows_about_chip) and period=="act2" then
      event("V는 팬앰에게 머릿속 렐릭 칩과 생존 문제를 설명했다.")
      if positive(f.sq027_panam_doesnt_know_about_johnny) then
        event("팬앰이 들은 설명에는 인격 구성체가 조니 실버핸드라는 정보가 포함되지 않았다.")
      elseif f.sq027_panam_doesnt_know_about_johnny==0 then
        result.relicKnown=true
        event("V는 팬앰에게 그 인격 구성체가 조니 실버핸드라는 사실도 설명했다.")
      end
    end
  elseif period=="act2" then
    result.met=true
    if q.chippin_in=="completed" then
      if positive(f.sq032_johnny_friend) then
        result.fields["content.choices.johnny_relationship"]="second_chance"
        setStage(q.like_supreme=="completed" and "friend" or "second_chance")
      elseif f.sq032_johnny_friend==0 then
        result.fields["content.choices.johnny_relationship"]="rejected";setStage("rejected")
      end
    elseif q.tapeworm=="completed" and activeOrNew(q.chippin_in) then setStage("cooperation")
    elseif activeOrNew(q.chippin_in) and activeOrNew(q.automatic_love) and activeOrNew(q.ghost_town)
      and activeOrNew(q.down_on_the_street) then setStage("first") end
  end
  if result.relicKnown then result.fields["content.grants.RELIC_V"]=true;result.fields["content.player_disclosure.relic"]=true end
  result.facts={}
  for _,name in ipairs(factKeys[key]) do result.facts[name]=f[name] end
  return result
end

-- 인물별 binding 상태. 저장소 정적 조사 근거가 있는 인물만 static_research, 나머지는 unbound(불명)다.
-- runtime_verified는 game-state-bindings.json(npc_scopes·fact_bindings)에서 생성한다. 실게임 확인 전에는 모두 false다.
function story.binding(key)
  local item=meta.bindings and meta.bindings[key]
  if not targets[key] or not item then return {mode="unbound",runtime_verified=false} end
  return {mode="static_research",runtime_verified=item.runtime_verified==true}
end

-- 관계·사건 인지의 단일 판정. 반환: {status="known"|"unknown"|"blocked",stage=,reason=,binding=,resolved=}
-- unbound 인물은 게임 상태로 단계를 알 수 없으므로 unknown이다. 수동 주입(snapshot.relationshipStage)은 개발 채널의 시험 입력으로만 받는다.
function story.relationship(snapshot,key)
  local binding=story.binding(key)
  local result={status="unknown",binding=binding}
  local function injection()
    local s=snapshot or {}
    if config.allow_draft_content==true and s.relationshipKnown==true and type(s.relationshipStage)=="string" and s.relationshipStage~="" then
      result.status="known";result.stage=s.relationshipStage;result.injected=true;return true
    end
  end
  if binding.mode=="unbound" then
    if not injection() then result.reason="binding_unavailable" end
    return result
  end
  local resolved=story.resolve(snapshot,key)
  result.resolved=resolved
  -- 게임 진행 스냅샷이 없는 입력(웹 시제품·평가 하네스)은 개발 채널의 수동 단계를 기존처럼 받는다.
  if not resolved and injection() then return result end
  if not resolved then result.reason="story_unavailable"
  elseif resolved.blocked then result.status="blocked";result.reason=resolved.blocked
  elseif resolved.stage then result.status="known";result.stage=resolved.stage
  else result.reason="stage_unresolved" end
  return result
end

-- 채널별 허용. 개발 채널은 초안·불명도 단계 없이 허용(차단 사유만 막음). 공개 채널은 검증된 binding과 확인된 단계가 있어야 한다.
function story.allowed(snapshot,key)
  local rel=story.relationship(snapshot,key)
  if rel.status=="blocked" then return false,rel.reason,rel end
  if config.allow_draft_content==true then return true,nil,rel end
  if not rel.binding.runtime_verified then return false,"binding_unverified",rel end
  if rel.status~="known" then return false,rel.reason or "stage_unknown",rel end
  return true,nil,rel
end

function story.fingerprint(snapshot,key)
  local r=story.resolve(snapshot,key)
  return r and json.encode({stage=r.stage or json.null,blocked=r.blocked or json.null,period=r.period or json.null,
    fields=r.fields,events=r.events,facts=r.facts or {},met=r.met}) or "unbound"
end
return story
