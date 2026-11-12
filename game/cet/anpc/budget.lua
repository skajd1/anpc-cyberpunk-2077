-- API 비용 규격(docs/api-cost-specification.md 2·6절)의 요청 예산·개인 한도·예약/정산 원장.
-- 원장·설정은 게임 저장과 독립된 사용자별 로컬 파일에 두며 게임 로드·세계 전환으로 지출/호출/예약을 되돌리지 않는다.
-- CET(LuaJIT)에서 동작하도록 5.4 전용 문법은 쓰지 않는다.
local json = require("json")
local config = require("config")
local budget = {}

-- 규격 2절 프로필. 입력 한도는 계측·진단용이며 강제 차단은 하지 않는다(개발·검증 계획 SR-06).
budget.profiles = {
  daily = { id = "daily", input_limit = 3500, output_limit = 256 },
  relation = { id = "relation", input_limit = 5500, output_limit = 384 },
  detailed = { id = "detailed", input_limit = 7000, output_limit = 512 },
}

-- 규격 4절: output_token_limit 기본 512, 범위 128~2048.
local OUTPUT_DEFAULT, OUTPUT_MIN, OUTPUT_MAX = 512, 128, 2048
-- 규격 6절 "추정 여유분". 단가·토큰 수 모두 추정이므로 예약은 이 배수를 곱한다.
local RESERVE_MARGIN = 1.2
local KEEP_DAYS = 62
local NOTICE_RATIO = 0.8
-- 결과가 어떻든 제공자에게 청구되지 않은 것이 확실한 실패(요청이 처리 전에 거부됨).
local UNBILLED = { key_missing = true, auth_failed = true, rate_limited = true, provider_rejected = true }

budget.now = os.time
local state
local counter = 0
local notice
local sessionSettled = {}
local persistFailed = false
budget.lastRequest = nil

local function path() return config.budget_file end

local function newState()
  return { version = 1, settings = { output_token_limit = OUTPUT_DEFAULT, prices = {} }, days = {}, reservations = {}, notified = {}, unreadable = false }
end

local function today() return os.date("%Y-%m-%d", budget.now()) end

local function dayOf(key)
  local day = state.days[key]
  if not day then
    day = { settled_usd = 0, input_tokens = 0, output_tokens = 0, calls = 0, unknown_calls = 0, unpriced_calls = 0 }
    state.days[key] = day
  end
  return day
end

local function prune()
  local keys = {}
  for key in pairs(state.days) do keys[#keys + 1] = key end
  table.sort(keys)
  for i = 1, #keys - KEEP_DAYS do state.days[keys[i]] = nil end
end

local function persist()
  local file = path()
  if not file then return true end
  prune()
  local ok, written = pcall(function()
    local handle = io.open(file .. ".tmp", "w")
    if not handle then return false end
    assert(handle:write(json.encode(state)))
    handle:close()
    pcall(os.remove, file)
    return os.rename(file .. ".tmp", file) ~= nil
  end)
  persistFailed = not (ok and written == true)
  return not persistFailed
end

local function load()
  if state then return state end
  state = newState()
  local file = path()
  if not file then return state end
  local ok, content = pcall(function()
    local handle = io.open(file, "r")
    if not handle then return nil end
    local value = handle:read("*a")
    handle:close()
    return value
  end)
  if not ok or content == nil or content == "" then return state end
  local decoded = json.decode(content)
  if type(decoded) ~= "table" or type(decoded.settings) ~= "table" or type(decoded.days) ~= "table" or type(decoded.reservations) ~= "table" then
    -- 읽을 수 없는 원장을 0으로 간주하지 않는다. 설정된 한도도 알 수 없으므로 사용자가 초기화할 때까지 요청을 막는다(불명 사용량).
    -- 손상본은 지우지 않고 .corrupt로 보관한다.
    pcall(os.remove, file .. ".corrupt")
    pcall(os.rename, file, file .. ".corrupt")
    state.unreadable = true
    return state
  end
  state = decoded
  state.notified = type(state.notified) == "table" and state.notified or {}
  state.settings.prices = type(state.settings.prices) == "table" and state.settings.prices or {}
  state.settings.output_token_limit = tonumber(state.settings.output_token_limit) or OUTPUT_DEFAULT
  return state
end

-- 시험·재시작 모의용. 파일을 다시 읽는다.
function budget.reload() state = nil; notice = nil; sessionSettled = {}; counter = 0; return load() end

local function positive(value) return type(value) == "number" and value > 0 and value < math.huge end

local function prices()
  local p = load().settings.prices
  if positive(p.input_per_mtok) and positive(p.output_per_mtok) then return p end
  return nil
end

-- 토큰 수 추정. 토크나이저 없이 비ASCII 글자는 0.75토큰, ASCII는 3.2자당 1토큰으로 보수적으로 센다(규격 2절 "미지원은 추정 표시").
-- 실제 사용량은 응답 usage로 정산하며 이 값은 예약 상한에만 쓴다.
function budget.estimateTokens(text)
  local _, continuation = text:gsub("[\128-\191]", "")
  local _, wide = text:gsub("[\194-\244]", "")
  local ascii = #text - continuation - wide
  return math.ceil(ascii / 3.2 + wide * 0.75)
end

-- 규격 2절: 로컬 입력/화제/콘텐츠 태그로 프로필을 고른다. 불명은 일상 대화.
-- 자세한 설명 표현이 있으면 detailed, 확인된 관계가 있는 인물에게 선택된 구체 지식이 있으면 relation.
local DETAIL_MARKERS = { "자세히", "자세하게", "구체적으로", "길게", "차근차근", "하나하나", "설명해" }
function budget.profile(text, selectedContext)
  for _, marker in ipairs(DETAIL_MARKERS) do
    if text:find(marker, 1, true) then return budget.profiles.detailed end
  end
  local canon = type(selectedContext) == "table" and selectedContext.canon_context
  local knowledge = type(selectedContext) == "table" and selectedContext.knowledge
  if type(canon) == "table" and canon.status == "known" and type(knowledge) == "table" and #knowledge > 0 then
    return budget.profiles.relation
  end
  return budget.profiles.daily
end

-- 실제 출력 한도 = min(프로필, 연결 output_token_limit).
function budget.outputLimit(profile)
  return math.min(profile.output_limit, math.floor(load().settings.output_token_limit))
end

-- ---- 설정 ----
local function parseNumber(value)
  if value == nil then return nil, true end
  if type(value) == "string" then
    value = value:match("^%s*(.-)%s*$")
    if value == "" then return nil, true end
    value = tonumber(value)
  end
  if type(value) ~= "number" or value ~= value or value <= 0 or value == math.huge then return nil, false end
  return value, true
end

local numeric = { session_budget_usd = true, daily_budget_usd = true }
local priceKeys = { input_per_mtok = true, cache_write_per_mtok = true, output_per_mtok = true }

-- 값이 비면 해제(미설정). 잘못된 값은 거부하고 기존 값을 유지한다. 반환: true | false, 사유
function budget.set(name, value)
  load()
  local settings = state.settings
  if numeric[name] then
    local number, ok = parseNumber(value)
    if not ok then return false, "invalid_number" end
    settings[name] = number
  elseif priceKeys[name] then
    local number, ok = parseNumber(value)
    if not ok then return false, "invalid_number" end
    settings.prices[name] = number
  elseif name == "output_token_limit" then
    local number, ok = parseNumber(value)
    if not ok then return false, "invalid_number" end
    if number == nil then number = OUTPUT_DEFAULT end
    if number ~= math.floor(number) or number < OUTPUT_MIN or number > OUTPUT_MAX then return false, "out_of_range" end
    settings.output_token_limit = number
  elseif name == "prices_checked_on" then
    if type(value) == "string" and value:match("^%d%d%d%d%-%d%d%-%d%d$") then settings.prices.checked_on = value
    elseif value == nil or value == "" then settings.prices.checked_on = nil
    else return false, "invalid_date" end
  else
    return false, "unknown_setting"
  end
  -- 한도를 바꾸면 해당 기간의 80% 안내를 다시 받을 수 있다.
  state.notified = {}
  persist()
  return true
end

function budget.settings() return load().settings end

-- 읽을 수 없는 원장을 사용자가 명시적으로 새로 시작한다(손상본은 .corrupt로 남아 있다). 정상 원장에는 아무 일도 하지 않는다.
function budget.resetUnreadable()
  load()
  if not state.unreadable then return false end
  state = newState()
  persist()
  return true
end

-- CET 창 설정 입력. 필드 순서·이름은 UI와 시험이 함께 쓴다.
budget.fields = {
  { name = "daily_budget_usd", label = "일일 한도 (USD)" },
  { name = "session_budget_usd", label = "대화 세션 한도 (USD)" },
  { name = "input_per_mtok", label = "입력 단가 (USD/100만 토큰)" },
  { name = "cache_write_per_mtok", label = "캐시 쓰기 단가 (선택)" },
  { name = "output_per_mtok", label = "출력 단가 (USD/100만 토큰)" },
  { name = "prices_checked_on", label = "단가 확인일 (YYYY-MM-DD)" },
  { name = "output_token_limit", label = "출력 토큰 상한 (128~2048)" },
}

function budget.formValues()
  local settings = load().settings
  local values = {}
  for _, field in ipairs(budget.fields) do
    local value = settings[field.name]
    if value == nil then value = settings.prices[field.name == "prices_checked_on" and "checked_on" or field.name] end
    values[field.name] = value ~= nil and tostring(value) or ""
  end
  return values
end

-- 입력 문자열을 모두 적용한다. 잘못된 항목은 거부하고 사유 목록을 돌려준다(나머지 항목은 적용). 반환: 오류 문자열 목록
function budget.applyForm(values)
  local errors = {}
  for _, field in ipairs(budget.fields) do
    local ok, reason = budget.set(field.name, values[field.name] or "")
    if not ok then errors[#errors + 1] = field.label .. ": " .. reason end
  end
  return errors
end

-- ---- 예약·정산 ----
local function reservedUsd(predicate)
  local total = 0
  for _, item in pairs(load().reservations) do
    if not predicate or predicate(item) then total = total + (item.usd or 0) end
  end
  return total
end

local function committedToday(day)
  return dayOf(day).settled_usd + reservedUsd(function(item) return item.day == day end)
end

local function sessionCommitted(session)
  return (sessionSettled[session] or 0) + reservedUsd(function(item) return item.session == session end)
end

local function announce(period, committed, limit, label)
  if committed < limit * NOTICE_RATIO or state.notified[period] then return end
  state.notified[period] = true
  notice = string.format("[ANPC] %s 한도의 %d%%에 도달했습니다 (추정 $%.4f / $%.4f). 100%%에서는 다음 요청이 차단됩니다.",
    label, math.floor(committed / limit * 100), committed, limit)
end

-- request: { session =, kind =, profile =, inputTokens =, outputTokens = }. 반환: 예약 ID | nil, 오류 코드(budget_exceeded)
function budget.reserve(request)
  load()
  local settings = state.settings
  local limited = settings.daily_budget_usd or settings.session_budget_usd
  local price = prices()
  if state.unreadable then
    budget.lastRequest = { blocked = "ledger_unreadable" }
    return nil, "budget_exceeded"
  end
  local usd = 0
  if price then
    -- 적중 할인 없이 일반 입력/캐시 쓰기 중 높은 단가를 쓰고 최대 출력과 여유분을 더해 상한을 예약한다.
    local input = math.max(price.input_per_mtok, price.cache_write_per_mtok or 0)
    usd = (request.inputTokens * input + request.outputTokens * price.output_per_mtok) / 1000000 * RESERVE_MARGIN
  end
  local day = today()
  if limited then
    -- 단가를 모르거나 원장을 읽을 수 없으면 한도를 지킬 수 있는지 알 수 없다. 0으로 간주하지 않고 차단한다.
    if not price then
      budget.lastRequest = { blocked = "unpriced" }
      return nil, "budget_exceeded"
    end
    if settings.daily_budget_usd and committedToday(day) + usd > settings.daily_budget_usd then
      budget.lastRequest = { blocked = "daily" }
      return nil, "budget_exceeded"
    end
    if settings.session_budget_usd and request.session and sessionCommitted(request.session) + usd > settings.session_budget_usd then
      budget.lastRequest = { blocked = "session" }
      return nil, "budget_exceeded"
    end
  end
  counter = counter + 1
  local id
  repeat
    id = string.format("%d-%d", budget.now(), counter)
    counter = counter + 1
  until not state.reservations[id]
  state.reservations[id] = { day = day, session = request.session, kind = request.kind or "dialogue", usd = usd,
    input_tokens = request.inputTokens, output_tokens = request.outputTokens, state = "reserved", at = budget.now() }
  budget.lastRequest = { profile = request.profile and request.profile.id, input_estimate = request.inputTokens,
    input_limit = request.profile and request.profile.input_limit, output_limit = request.outputTokens, reserved_usd = usd,
    input_over_limit = request.profile ~= nil and request.inputTokens > request.profile.input_limit }
  if settings.daily_budget_usd then announce("daily:" .. day, committedToday(day), settings.daily_budget_usd, "일일 비용") end
  if settings.session_budget_usd and request.session then
    announce("session:" .. tostring(request.session) .. ":" .. day, sessionCommitted(request.session), settings.session_budget_usd, "세션 비용")
  end
  persist()
  return id
end

-- 응답의 실제 사용량으로 정산한다. 사용량이 없으면(nil·음수) 예약액을 미확정으로 유지한다.
function budget.settle(id, inputTokens, outputTokens)
  load()
  local item = state.reservations[id]
  if not item then return false end
  if type(inputTokens) ~= "number" or type(outputTokens) ~= "number" or inputTokens < 0 or outputTokens < 0 then
    return budget.keepUnsettled(id, "usage_unavailable")
  end
  local day = dayOf(item.day)
  local price = prices()
  local actual = 0
  if price then actual = (inputTokens * price.input_per_mtok + outputTokens * price.output_per_mtok) / 1000000
  else day.unpriced_calls = day.unpriced_calls + 1 end
  day.settled_usd = day.settled_usd + actual
  day.input_tokens = day.input_tokens + inputTokens
  day.output_tokens = day.output_tokens + outputTokens
  day.calls = day.calls + 1
  if item.session then sessionSettled[item.session] = (sessionSettled[item.session] or 0) + actual end
  state.reservations[id] = nil
  persist()
  return true
end

-- 청구 여부를 알 수 없는 실패·취소: 예약액을 미확정으로 남겨 한도에 계속 포함한다.
function budget.keepUnsettled(id, reason)
  load()
  local item = state.reservations[id]
  if not item then return false end
  if item.state ~= "unsettled" then dayOf(item.day).unknown_calls = dayOf(item.day).unknown_calls + 1 end
  item.state, item.reason = "unsettled", reason
  persist()
  return true
end

-- 제공자에 요청이 나가지 않았거나 처리 전 거부로 확실히 청구되지 않은 경우.
function budget.release(id)
  load()
  if not state.reservations[id] then return false end
  state.reservations[id] = nil
  persist()
  return true
end

-- Native 완료 상태에 따라 정산/해제/미확정을 고른다.
function budget.finish(id, status, inputTokens, outputTokens)
  if status == "ok" then return budget.settle(id, inputTokens, outputTokens) end
  if UNBILLED[status] then return budget.release(id) end
  return budget.keepUnsettled(id, tostring(status))
end

-- 대화 세션이 끝나면 세션 한도의 누적을 비운다. 일일 원장·미확정 예약은 유지한다.
function budget.endSession(session)
  sessionSettled[session] = nil
  for _, item in pairs(load().reservations) do
    if item.session == session then item.session = nil end
  end
end
-- 게임 로드·세계 전환: 세션 번호가 되돌아가므로 세션 단위 누적만 비운다. 일일 원장·예약·설정은 유지한다.
function budget.resetSessions()
  sessionSettled = {}
  for _, item in pairs(load().reservations) do item.session = nil end
end

function budget.takeNotice()
  local value = notice
  notice = nil
  return value
end

-- UI·진단용. 원문·키는 포함하지 않는다(규격 6절 진단).
function budget.summary()
  load()
  local day = today()
  local record = dayOf(day)
  local unsettled, inflight = 0, 0
  for _, item in pairs(state.reservations) do
    if item.state == "unsettled" then unsettled = unsettled + (item.usd or 0) else inflight = inflight + (item.usd or 0) end
  end
  return { day = day, settled_usd = record.settled_usd, unsettled_usd = unsettled, inflight_usd = inflight,
    input_tokens = record.input_tokens, output_tokens = record.output_tokens, calls = record.calls,
    unknown_calls = record.unknown_calls, unpriced_calls = record.unpriced_calls,
    committed_usd = committedToday(day), daily_budget_usd = state.settings.daily_budget_usd,
    session_budget_usd = state.settings.session_budget_usd, priced = prices() ~= nil,
    unreadable = state.unreadable, persist_failed = persistFailed, last = budget.lastRequest }
end

return budget
