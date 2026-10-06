-- 게임 스냅샷을 모델이 볼 수 있는 현재 관찰·인지로 투영한다. 수치·게임 키는 보내지 않는다.
local json = require("json")
local story = require("story")
local context = {}

local function optional(value)
  return type(value) == "string" and value ~= "" and json.string(value) or "null"
end

-- NPC 자신의 표시 신원이다. V의 이름 인지·관계·Big Five 생성과 분리한다.
function context.npcIdentity(snapshot)
  local s = (snapshot or {}).npcIdentity
  local known = s ~= nil and s.known == true
  local function label(value)
    if not known or type(value) ~= "string" or not value:find("%S") or value:find("LocKey#",1,true) then return json.null end
    local _,count=value:gsub("[^\128-\191]","")
    return count<=200 and value or json.null
  end
  local abilities=json.array()
  local seen={}
  if known then for _,item in ipairs(s.abilities or {}) do
    local text=label(item)
    if text~=json.null and not seen[text] and #abilities<8 then abilities[#abilities+1]=text;seen[text]=true end
  end end
  table.sort(abilities)
  return {source="game_scanner_fields",status=known and "known" or "unknown",
    display_name=label(known and s.displayName),affiliation=label(known and s.affiliation),
    role=label(known and s.role),attitude=label(known and s.attitude),displayed_abilities=abilities,
    adult_humor_allowed=s~=nil and s.adultHumorAllowed==true}
end

function context.encode(snapshot, key, crowd, includeTime)
  local s = snapshot or {}
  local observable = s.observationKnown == true and s.canObserve == true
  local outfit = {}
  if observable and s.outfitKnown == true then
    for _, item in ipairs(s.outfit or {}) do
      outfit[#outfit + 1] = '{"slot":' .. json.string(item.slot) .. ',"display_name":' .. json.string(item.displayName)
        .. ',"appearance_text":null,"description_source":"game_displayed_item_name"}'
    end
  end
  local recognized = crowd == true and type(s.streetCred) == "number" and s.streetCred >= 40
  local nameKnown = recognized or (crowd ~= true and ((key == "viktor" and s.viktorVisitConfirmed == true)
    or (s.relationshipKnown == true and s.relationshipStage ~= "")))
  local resolved=crowd~=true and story.resolve(s,key) or nil
  if resolved and not resolved.blocked and resolved.met then nameKnown=true end
  local observe = s.observationKnown == true and tostring(observable) or "null"
  local weaponKnown = observable and s.weaponKnown == true
  return '{"source":"game_snapshot","observations":{"can_observe_outfit":' .. observe
    .. ',"visible_outfit":' .. (observable and s.outfitKnown == true and ('[' .. table.concat(outfit, ',') .. ']') or 'null')
    .. ',"outfit_status":' .. json.string(observable and s.outfitKnown == true and "observed" or "unknown")
    .. ',"visible_appearance":null,"weapon_drawn":' .. (weaponKnown and tostring(s.weaponDrawn == true) or 'null')
    .. ',"visible_equipment":' .. (weaponKnown and s.weaponDrawn == true and optional(s.weaponName) or 'null')
    .. ',"location":' .. optional(s.location) .. (includeTime ~= false and (',"game_time":' .. optional(s.timeOfDay)) or '')
    .. '},"player_identity":{"name_known_by_npc":' .. tostring(nameKnown) .. ',"name":' .. (nameKnown and '"V"' or 'null')
    .. '},"public_reputation":{"name_recognized":' .. tostring(recognized)
    .. ',"public_deeds":[],"claim_limits":["이름 인지는 비밀·퀘스트 결과·사적 관계의 근거가 아니다."]}'
    .. '}'
end

function context.fingerprint(snapshot,key,crowd)
  local s=snapshot or {}
  local archetypes={}; for _, id in ipairs(s.crowdArchetypeIDs or {}) do archetypes[#archetypes+1]=id end; table.sort(archetypes)
  return context.encode(s,key,crowd,false) .. ':' .. tostring(s.relationshipKnown==true) .. ':' .. tostring(s.relationshipStage or '')
    .. ':' .. tostring(s.npcAliveConfirmed) .. ':' .. tostring(s.npcFreeConfirmed)
    .. ':' .. tostring(s.crowdEvidenceKnown==true) .. ':' .. table.concat(archetypes,',')
    .. ':' .. json.encode(context.npcIdentity(s))
    .. ':' .. (crowd~=true and story.fingerprint(s,key) or "crowd")
end

return context
