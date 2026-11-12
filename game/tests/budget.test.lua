-- SR-06 / UF-05·59: 요청 토큰 프로필·개인 한도·예약/정산 원장. 게임 로드로 지출을 되돌리지 않는지도 확인한다.
package.path = "game/cet/anpc/?.lua;" .. package.path
local json = require("json")
local config = require("config")
config.voice_enabled = false
local budget = require("budget")
local bridge = require("bridge")
local day = 1760000000
budget.now = function() return day end

-- 프로필과 출력 한도: min(프로필, 연결 output_token_limit)
config.budget_file = false
budget.reload()
assert(budget.profile("안녕", {}).id == "daily" and budget.profile("자세히 설명해줘", {}).id == "detailed")
assert(budget.profile("그 일 어땠어?", { canon_context = { status = "known" }, knowledge = { {} } }).id == "relation")
assert(budget.profile("그 일 어땠어?", { canon_context = { status = "unknown" }, knowledge = { {} } }).id == "daily")
assert(budget.outputLimit(budget.profiles.daily) == 256 and budget.outputLimit(budget.profiles.detailed) == 512)
assert(budget.set("output_token_limit", "128") and budget.outputLimit(budget.profiles.detailed) == 128)
assert(not budget.set("output_token_limit", "64") and not budget.set("output_token_limit", "4096") and not budget.set("output_token_limit", "abc"))
assert(budget.outputLimit(budget.profiles.detailed) == 128, "잘못된 값은 기존 설정을 유지한다")
assert(budget.set("output_token_limit", "") and budget.settings().output_token_limit == 512)
local snapshot = { observationKnown = true, canObserve = true, outfitKnown = true, outfit = {}, streetCred = 1, timeOfDay = "밤", npcAliveConfirmed = true, npcFreeConfirmed = true }
local viktor = require("prompts").characters.viktor
local body, profile = bridge.buildBody(viktor, {}, "안녕", snapshot, "viktor", false)
assert(json.decode(body).max_output_tokens == 256 and profile.id == "daily")
body, profile = bridge.buildBody(viktor, {}, "상황을 자세히 설명해줘", snapshot, "viktor", false)
assert(json.decode(body).max_output_tokens == 512 and profile.id == "detailed")
budget.set("output_token_limit", "300")
assert(json.decode((bridge.buildBody(viktor, {}, "상황을 자세히 설명해줘", snapshot, "viktor", false))).max_output_tokens == 300)
budget.set("output_token_limit", "")
assert(budget.estimateTokens("abc") == 1 and budget.estimateTokens("가나다") == 3 and budget.estimateTokens("가나다라") == 3)
print("프로필 선택·출력 한도·설정 검증 통과")

-- 기본은 한도 미설정: 임의 소비 한도를 두지 않고 사용량만 기록한다(규격 6절).
budget.reload()
local id = assert(budget.reserve({ session = 1, profile = budget.profiles.daily, inputTokens = 4000, outputTokens = 256 }))
assert(budget.settle(id, 3900, 120))
local sum = budget.summary()
assert(sum.calls == 1 and sum.input_tokens == 3900 and sum.output_tokens == 120 and sum.settled_usd == 0 and sum.unpriced_calls == 1 and not sum.priced)
assert(budget.summary().last.input_over_limit == true, "입력 한도 초과는 계측만 하고 차단하지 않는다")

-- 한도가 있는데 단가가 없으면 비용을 알 수 없으므로 0으로 간주하지 않고 차단한다.
assert(budget.set("daily_budget_usd", "1"))
local blocked, code = budget.reserve({ session = 1, profile = budget.profiles.daily, inputTokens = 100, outputTokens = 100 })
assert(blocked == nil and code == "budget_exceeded" and budget.summary().last.blocked == "unpriced")

-- 예약: 진행 중 예약을 포함해 초과하면 차단하고 정산이 예약을 실제액으로 바꾼다.
assert(budget.set("input_per_mtok", "10") and budget.set("output_per_mtok", "40") and budget.set("cache_write_per_mtok", "12.5"))
assert(budget.set("daily_budget_usd", "0.1"))
local function reserve(session) return budget.reserve({ session = session, profile = budget.profiles.daily, inputTokens = 1000, outputTokens = 100 }) end
local function near(a, b) return math.abs(a - b) < 1e-9 end
-- 예약액 = (1000*12.5 + 100*40)/1e6*1.2 = 0.0198 (적중 할인 없이 높은 입력 단가 + 최대 출력 + 여유분)
local ids = {}
for i = 1, 4 do ids[i] = assert(reserve(1)) end
assert(near(budget.summary().inflight_usd, 4 * 0.0198) and budget.takeNotice() == nil, "80% 미만은 안내 없음")
ids[5] = assert(reserve(1))
local notice = assert(budget.takeNotice(), "80%에서 한 번 안내")
assert(notice:find("80%%") == nil and notice:find("일일 비용"))
local blocked2, code2 = reserve(1)
assert(blocked2 == nil and code2 == "budget_exceeded" and budget.summary().last.blocked == "daily", "진행 예약 포함 100% 초과는 차단")
assert(budget.takeNotice() == nil, "안내는 한 번만")
-- 정산: 실제 사용량이 예약액을 대체한다.
for i = 1, 5 do assert(budget.settle(ids[i], 900, 50)) end
sum = budget.summary()
assert(near(sum.settled_usd, 5 * (900 * 10 + 50 * 40) / 1e6) and sum.inflight_usd == 0)
assert(reserve(1), "정산 뒤 여유가 생기면 다시 허용")
-- 사용량을 알 수 없는 실패/취소는 예약액을 미확정으로 유지해 한도에 계속 포함한다.
local before = budget.summary().committed_usd
local unknown = assert(reserve(1))
assert(budget.keepUnsettled(unknown, "timeout"))
sum = budget.summary()
assert(sum.unknown_calls == 1 and near(sum.unsettled_usd, 0.0198) and sum.committed_usd > before)
assert(budget.finish(assert(budget.reserve({ session = 9, profile = budget.profiles.daily, inputTokens = 1, outputTokens = 1 })), "ok", nil, nil))
assert(budget.summary().unknown_calls == 2, "사용량 없는 정상 응답도 미확정")
-- 처리 전 거부(auth_failed 등)는 확실히 청구되지 않으므로 예약을 해제한다.
local rejected = assert(budget.reserve({ session = 9, profile = budget.profiles.daily, inputTokens = 1, outputTokens = 1 }))
local inflightBefore = budget.summary().inflight_usd
assert(budget.finish(rejected, "auth_failed") and near(budget.summary().inflight_usd, inflightBefore - ((1 * 12.5 + 40) / 1e6 * 1.2)))
print("예약·정산·미확정·해제·80% 안내·차단 검사 통과")

-- 세션 한도: 일일 한도와 별개로 대화 세션 단위 누적을 막고, 세션 종료·로드 때 세션 누적만 비운다.
budget.reload()
assert(budget.set("input_per_mtok", "10") and budget.set("output_per_mtok", "40") and budget.set("session_budget_usd", "0.025"))
local s1 = assert(reserve(7))
assert(reserve(7) == nil and budget.summary().last.blocked == "session")
assert(reserve(8), "다른 세션은 별개")
assert(budget.settle(s1, 900, 50))
assert(reserve(7) == nil, "정산액도 세션 누적에 포함")
budget.endSession(7)
assert(reserve(7), "세션 종료 뒤 같은 번호의 새 세션은 새 한도")
print("세션 한도 검사 통과")

-- 영속: 원장·설정·예약은 파일로 유지되고 읽을 수 없는 원장은 0으로 간주하지 않는다.
local file = os.tmpname()
os.remove(file)
config.budget_file = file
budget.reload()
assert(budget.set("daily_budget_usd", "0.5") and budget.set("input_per_mtok", "10") and budget.set("output_per_mtok", "40"))
local saved = assert(reserve(1))
assert(budget.settle(saved, 1000, 100))
local pendingId = assert(reserve(1))
local snapshotBefore = budget.summary()
budget.reload() -- 게임 재시작 모의
local restarted = budget.summary()
assert(near(restarted.settled_usd, snapshotBefore.settled_usd) and near(restarted.inflight_usd, snapshotBefore.inflight_usd) and restarted.daily_budget_usd == 0.5)
assert(budget.settle(pendingId, 100, 10), "재시작 뒤에도 진행 예약을 정산할 수 있다")
-- 게임 저장 로드: bridge.reset은 원장을 되돌리지 않는다(UF-59).
local settledBefore = budget.summary().settled_usd
bridge.reset()
assert(near(budget.summary().settled_usd, settledBefore) and budget.settings().daily_budget_usd == 0.5)
-- 날짜가 바뀌면 다른 날 지출로 구분하고 이전 날 기록은 남는다(사용자 시간대의 날짜).
day = day + 86400 * 2
assert(budget.summary().settled_usd == 0 and budget.summary().day ~= restarted.day)
day = day - 86400 * 2
local handle = io.open(file, "w")
handle:write("{깨진 원장")
handle:close()
budget.reload()
assert(budget.summary().unreadable == true)
local none, noneCode = reserve(1)
assert(none == nil and noneCode == "budget_exceeded" and budget.summary().last.blocked == "ledger_unreadable", "한도 설정을 모르는 읽기 불가 원장은 차단")
local corrupt = assert(io.open(file .. ".corrupt", "r"), "손상본 보관")
corrupt:close()
os.remove(file .. ".corrupt")
assert(budget.resetUnreadable() and budget.summary().unreadable == false and reserve(1))
os.remove(file)
budget.reload()
print("원장 영속·재시작·로드 비초기화·읽기 불가 차단 검사 통과")

-- 설정 UI 입력: 비우면 해제, 잘못된 값은 그 항목만 거부한다.
config.budget_file = false
budget.reload()
local errors = budget.applyForm({ daily_budget_usd = "2.5", session_budget_usd = "", input_per_mtok = "x", output_per_mtok = "40", output_token_limit = "99999", prices_checked_on = "2026-11-12" })
assert(#errors == 2 and budget.settings().daily_budget_usd == 2.5 and budget.settings().prices.output_per_mtok == 40 and budget.settings().prices.checked_on == "2026-11-12")
assert(budget.formValues().daily_budget_usd == "2.5" and budget.formValues().prices_checked_on == "2026-11-12")

-- 브리지 통합: Native 경로에서 예약→전송→정산, 한도 초과 요청은 전송하지 않고 budget_exceeded.
budget.reload()
budget.set("input_per_mtok", "10"); budget.set("output_per_mtok", "40"); budget.set("daily_budget_usd", "2")
local queue, responses, calls, results, cancelled = {}, {}, {}, {}, {}
local latest, waiting = -1, false
function IsDefined(value) return value ~= nil end
local entry = {
  TakeRequest = function()
    local request = table.remove(queue, 1)
    if request then latest = request.kind == "end" and -1 or request.id; waiting = request.kind == "say" end
    return request
  end,
  GetLatestRequestId = function() return latest end,
  IsWaitingForReply = function(_, id) return waiting and latest == id end,
  OnAIResponse = function(_, id, status, text) waiting = false; responses[#responses + 1] = { id = id, status = status, text = text } end,
}
Game = {
  GetPlayer = function() return {} end,
  GetSystemRequestsHandler = function() return { IsPreGame = function() return false end } end,
  GetScriptableSystemsContainer = function() return { Get = function() return entry end } end,
  ANPCNative_Version = function() return "0.1.0" end,
  ANPCNative_Request = function(id) calls[#calls + 1] = id; return true end,
  ANPCNative_PollId = function() for id in pairs(results) do return id end return -1 end,
  ANPCNative_ResultStatus = function(id) return results[id].status end,
  ANPCNative_ResultText = function(id) return results[id].text end,
  ANPCNative_ResultInputTokens = function(id) return results[id].input or -1 end,
  ANPCNative_ResultOutputTokens = function(id) return results[id].output or -1 end,
  ANPCNative_Release = function(id) results[id] = nil end,
  ANPCNative_Cancel = function(id) cancelled[#cancelled + 1] = id; return true end,
}
local reply = '{"dialogue":"괜찮아.","intent":"answer","emotion":"neutral","action":null,"follow_up":null}'
queue[1] = { id = 1, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "안녕" }
assert(bridge.update(0.3) and #calls == 1)
local inflight = budget.summary().inflight_usd
assert(inflight > 0 and bridge.pendingCount() == 1)
results[1] = { status = "ok", text = reply, input = 4000, output = 80 }
assert(bridge.update(0.3))
sum = budget.summary()
assert(sum.inflight_usd == 0 and near(sum.settled_usd, (4000 * 10 + 80 * 40) / 1e6) and sum.input_tokens == 4000 and responses[1].status == "ok")
-- 사용량이 없는 응답은 미확정으로 남는다.
queue[1] = { id = 2, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "또" }
assert(bridge.update(0.3))
results[2] = { status = "ok", text = reply }
assert(bridge.update(0.3) and budget.summary().unknown_calls == 1 and budget.summary().unsettled_usd > 0)
-- 취소는 미확정, 처리 전 거부는 해제.
queue[1] = { id = 3, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "취소할래" }
assert(bridge.update(0.3))
queue[1] = { id = 3, kind = "cancel", session = 1 }
waiting = false; latest = -1
assert(bridge.update(0.3))
assert(budget.summary().unknown_calls == 2 and budget.summary().inflight_usd == 0)
queue[1] = { id = 4, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "키 없음" }
assert(bridge.update(0.3))
local unsettledBefore = budget.summary().unsettled_usd
results[4] = { status = "key_missing", text = "" }
assert(bridge.update(0.3) and budget.summary().inflight_usd == 0 and near(budget.summary().unsettled_usd, unsettledBefore))
-- 한도에 도달한 뒤 요청은 Native로 나가지 않고 budget_exceeded.
budget.set("daily_budget_usd", "0.0001")
local sent = #calls
queue[1] = { id = 5, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "한도 뒤" }
assert(bridge.update(0.3) and #calls == sent and responses[#responses].id == 5 and responses[#responses].status == "error:budget_exceeded")
-- 게임 로드(reset)는 원장을 되돌리지 않고, 진행 중 요청은 미확정으로 남는다.
budget.set("daily_budget_usd", "")
queue[1] = { id = 6, kind = "say", session = 1, npcKey = "misty", crowd = false, text = "리로드" }
assert(bridge.update(0.3) and bridge.pendingCount() == 1)
local settledNow, unknownNow = budget.summary().settled_usd, budget.summary().unknown_calls
bridge.reset()
sum = budget.summary()
assert(near(sum.settled_usd, settledNow) and sum.unknown_calls == unknownNow + 1 and sum.inflight_usd == 0)
print("브리지 예약/정산·취소·한도 차단·로드 비초기화 검사 통과 (모의 DLL)")
