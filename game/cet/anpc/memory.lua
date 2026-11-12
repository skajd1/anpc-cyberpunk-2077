-- 게임 저장과 NPC 기억 묶음의 연결(기억 규격 3.1). 공통 SaveBundle(memory.save-bundle)을 만들고 검증해 복원한다.
-- 저장 직렬화·복원 신호는 redscript ANPC.MemorySave가 담당한다. 그 호출·바이트 변환은 아래 "어댑터" 한 곳에만 둔다(실게임 미확인).
local json, identity = require("json"), require("identity")
local memory = {}

local GAME_ID, MOD_ID = "cyberpunk2077", "anpc"
local POLICY = "session-memory-1.1"
-- 저장 배열 상한(바이트). 넘으면 오래된 요약부터 줄인다. 값은 실게임 크기 시험 전의 잠정치다.
memory.maxBytes = 131072

local generation = 0
local staged = { ref = nil, revision = nil }
local lastToken = nil

local function digest(text)
  local h1, h2 = 5381, 52711
  for i = 1, #text do
    local b = text:byte(i)
    h1 = (h1 * 33 + b) % 4294967296
    h2 = (h2 * 31 + b * 7 + i) % 4294967296
  end
  return string.format("d1:%08x%08x", h1, h2)
end

local function ownerScope(saveScope, npcKey)
  return { game_id = GAME_ID, mod_id = MOD_ID, save_scope = saveScope, actor = { kind = "community", key = npcKey } }
end

local function snapshotOf(item, checkpoint)
  local events, processing = json.array(), json.array()
  for _, turn in ipairs(item.turns) do
    if type(turn.text) == "string" and turn.text ~= "" and (turn.role == "player" or turn.role == "npc") then
      local n = #events + 1
      local player = turn.role == "player"
      events[n] = { event_id = "e" .. n, session_id = json.null, exchange_id = json.null, sequence = n,
        event_kind = player and "player_utterance" or "npc_utterance", speaker = player and "player" or "npc",
        epistemic_status = player and "player_claim" or "npc_statement",
        at = { session_id = json.null, sequence = n, game_time = json.null, recorded_at_utc = json.null },
        payload = { text = turn.text } }
      processing[n] = { event_id = "e" .. n, status = "pending" }
    end
  end
  local summaries = json.array()
  for i, text in ipairs(item.summaries) do summaries[i] = { session_id = "sum-" .. i, summary = text } end
  return { snapshot_id = "mem:" .. item.npc_key .. ":" .. #summaries, memory_revision = #summaries, memory_generation = generation,
    checkpoint_ref = checkpoint, source_through_sequence = #events, records = json.array(), events = events,
    event_processing = processing, session_summaries = summaries }
end

-- SaveBundle 봉투 JSON(UTF-8 문자열)을 만든다. ref는 호스트가 발급한 game_save_ref, saveScope는 회차 식별자.
function memory.capture(ref, saveScope, inProgress)
  local list = identity.exportCommunity(inProgress)
  local text
  repeat
    local owners = json.array()
    for _, item in ipairs(list) do owners[#owners + 1] = { scope = ownerScope(saveScope, item.npc_key), snapshot = snapshotOf(item, ref:match("[^:]+$")) } end
    local envelope = { contract = "memory.save-bundle", contract_version = "1.0",
      scope = { game_id = GAME_ID, mod_id = MOD_ID, save_scope = saveScope, actor = json.null },
      data = { bundle_id = "bundle:" .. ref, game_save_ref = ref, policy_version = POLICY, content_version = identity.contentVersion(),
        source_digest = digest(json.encode(owners)), owners = owners } }
    text = json.encode(envelope)
    if #text <= memory.maxBytes then return text end
    -- 상한 초과: 요약이 가장 많은 소유자의 가장 오래된 요약 하나를 버리고 다시 만든다.
    local widest
    for _, item in ipairs(list) do if #item.summaries > 0 and (not widest or #item.summaries > #widest.summaries) then widest = item end end
    if not widest then return text end
    table.remove(widest.summaries, 1)
  until false
end

-- 저장 묶음을 검사해 커뮤니티 기억을 완전히 교체한다. 실패하면 빈 기억이다(다른 저장·최신 전역 기억으로 대체하지 않는다).
-- 반환: true | false, 사유
function memory.restore(text, expectedRef, expectedScope)
  identity.reset()
  if type(text) ~= "string" or text == "" then return false, "no_bundle" end
  local ok, envelope = pcall(json.decode, text)
  if not ok or type(envelope) ~= "table" or type(envelope.data) ~= "table" then return false, "bad_bundle" end
  local data = envelope.data
  if envelope.contract ~= "memory.save-bundle" or envelope.contract_version ~= "1.0" then return false, "bad_contract" end
  if type(expectedRef) ~= "string" or expectedRef == "" or data.game_save_ref ~= expectedRef then return false, "save_ref_mismatch" end
  if type(envelope.scope) ~= "table" or envelope.scope.game_id ~= GAME_ID or envelope.scope.mod_id ~= MOD_ID
    or envelope.scope.save_scope ~= expectedScope then return false, "scope_mismatch" end
  if data.policy_version ~= POLICY or data.content_version ~= identity.contentVersion() then return false, "version_mismatch" end
  if type(data.owners) ~= "table" or data.source_digest ~= digest(json.encode(json.array(data.owners))) then return false, "digest_mismatch" end
  local list, newest = {}, generation
  for _, owner in ipairs(data.owners) do
    local scope, snap = owner.scope, owner.snapshot
    if type(scope) ~= "table" or scope.game_id ~= GAME_ID or scope.mod_id ~= MOD_ID or scope.save_scope ~= expectedScope
      or type(scope.actor) ~= "table" or scope.actor.kind ~= "community" or type(scope.actor.key) ~= "string" or type(snap) ~= "table" then
      return false, "owner_mismatch"
    end
    local item = { npc_key = scope.actor.key, summaries = {}, turns = {} }
    for _, entry in ipairs(snap.session_summaries or {}) do item.summaries[#item.summaries + 1] = entry.summary end
    for _, event in ipairs(snap.events or {}) do
      item.turns[#item.turns + 1] = { role = event.speaker == "player" and "player" or "npc", text = event.payload and event.payload.text }
    end
    if type(snap.memory_generation) == "number" and snap.memory_generation > newest then newest = snap.memory_generation end
    list[#list + 1] = item
  end
  identity.restoreCommunity(list)
  generation = newest + 1
  return true
end

-- ---- 어댑터: redscript ANPC.MemorySave 호출과 바이트 변환(실게임 미확인). 다른 코드는 이 아래를 직접 부르지 않는다. ----
local unpack = table.unpack or unpack
local function fromBytes(bytes)
  local parts = {}
  for i = 1, #bytes, 4096 do parts[#parts + 1] = string.char(unpack(bytes, i, math.min(i + 4095, #bytes))) end
  return table.concat(parts)
end
local function toBytes(text)
  local bytes = {}
  for i = 1, #text, 4096 do
    local chunk = { text:byte(i, math.min(i + 4095, #text)) }
    for j = 1, #chunk do bytes[#bytes + 1] = chunk[j] end
  end
  return bytes
end

-- 매 프레임 호출. 세션 토큰이 바뀌면(저장 로드·새 게임) 저장 자료로 교체하고, 기억·다음 저장 참조가 바뀌면 다음 저장용 묶음을 갱신한다.
-- inProgress(sessionId): 수용된 진행 중 발화. extraRevision(): 진행 중 발화 변경 번호.
-- 반환: "restored"|"empty"|nil(변화 없음)
function memory.sync(system, inProgress, extraRevision)
  local token = system:GetSessionToken()
  local result
  if token ~= lastToken then
    lastToken = token
    staged = { ref = nil, revision = nil }
    generation = 0
    local ok = false
    if system:IsRestored() then
      ok = memory.restore(fromBytes(system:GetRestoreBytes()), system:GetRestoreRef(), system:GetSaveScope())
    else
      identity.reset()
    end
    result = ok and "restored" or "empty"
  end
  local ref, scope = system:GetNextRef(), system:GetSaveScope()
  local revision = identity.revision() .. ":" .. (extraRevision and extraRevision() or 0)
  if ref ~= "" and (staged.ref ~= ref or staged.revision ~= revision) then
    local bundle = memory.capture(ref, scope, inProgress)
    if system:StageBundle(ref, toBytes(bundle)) then staged = { ref = ref, revision = revision } end
  end
  return result
end

-- UF-56: 삭제 뒤 이전 세대의 늦은 기록이 다시 들어오지 않게 세대를 올리고 다음 저장용 묶음을 다시 만든다.
-- 이미 저장된 묶음 파일은 고치지 않는다(다음 저장 때 삭제 결과가 반영된다).
function memory.forget() generation = generation + 1; staged = { ref = nil, revision = nil } end
function memory.reset() lastToken = nil; staged = { ref = nil, revision = nil }; generation = 0 end
memory.digest = digest
memory.generation = function() return generation end

return memory
