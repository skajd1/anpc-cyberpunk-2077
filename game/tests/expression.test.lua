package.path = "game/cet/anpc/?.lua;" .. package.path
local json = require("json")
local expressions = require("expressions")
local bridge = require("bridge")

-- 일곱 감정 모두 원작 표정 값(category·idle)이 있고, 응답 감정 열거값과 같다.
local emotions = { "neutral", "friendly", "wary", "annoyed", "afraid", "sad", "curious" }
assert(#expressions.ORDER == #emotions)
for i, emotion in ipairs(emotions) do
  local face = expressions.MAP[emotion]
  assert(expressions.ORDER[i] == emotion and face and face.name and face.category >= 1 and face.idle >= 1, emotion)
end

-- 적용은 redscript Entry.ExpressionApply에 위임한다. 모르는 감정·시스템 없음·호출 오류는 대사에 영향 없이 false.
local calls = {}
local system = { ExpressionApply = function(_, id, category, idle) calls[#calls + 1] = { id, category, idle }; return true end }
assert(expressions.apply(system, 7, "sad") and calls[1][1] == 7 and calls[1][2] == 3 and calls[1][3] == 3)
assert(not expressions.apply(system, 7, "whisper") and #calls == 1)
assert(not expressions.apply(nil, 7, "sad"))
assert(not expressions.apply({ ExpressionApply = function() error("detached") end }, 7, "sad"))

-- 응답 해석은 표정에 쓸 감정을 여섯째 값으로 돌려준다(음성·자막 전용 응답 모두).
local text = json.encode({ dialogue = "그래.", intent = "answer", emotion = "friendly", action = json.null, follow_up = json.null })
local line, _, _, _, speech, emotion = bridge.readReply(text, {}, false)
assert(line == "그래." and speech == nil and emotion == "friendly")
local voiced = json.encode({ emotion = "annoyed", delivery = "normal", speech_text = "またかよ。", dialogue = "또야?", follow_up = json.null,
  intent = "answer", action = json.null })
local _, _, _, _, speech2, emotion2 = bridge.readReply(voiced, {}, true)
assert(speech2 and emotion2 == "annoyed")
-- UF-75: 말하기 입모양은 로컬 자원 아카이브가 있을 때만 시작하고, 소리 구간마다 변형 1~3을 돌려 열며 쉼·멈춤은 redscript에 위임한다.
local talks, begins, pauses, stops, archive = {}, 0, 0, 0, false
Game = { GetResourceDepot = function() return { ArchiveExists = function(_, name) return archive and name == expressions.TALK_ARCHIVE end } end }
local talker = { TalkBegin = function() begins = begins + 1; return true end, TalkOpen = function(_, id, idle) talks[#talks + 1] = idle; return true end,
  TalkPause = function() pauses = pauses + 1 end, TalkStop = function() stops = stops + 1 end }
assert(not expressions.talkBegin(talker, 1) and begins == 0)
archive = true
assert(expressions.talkBegin(talker, 1) and begins == 1)
for _ = 1, 4 do assert(expressions.talkOpen(talker, 1)) end
assert(table.concat(talks, ",") == "1,2,3,1")
expressions.talkPause(talker); expressions.talkStop(talker); expressions.talkStop(nil)
assert(pauses == 1 and stops == 1)
assert(not expressions.talkOpen({ TalkOpen = function() error("detached") end }, 1))
-- 소리 구간 판단: 0.05초 먼저 열고, 0.2초 미만 쉼(구간 경계 포함)은 잇고, 그 이상은 닫는다. 구간 정보가 없으면 구간 전체.
local segs = { { dur = 1, talk = { { 0.1, 0.4 }, { 0.5, 0.6 }, { 0.9, 1 } } }, { dur = 1, talk = { { 0.05, 0.3 } } } }
local expect = { [0.04] = false, [0.06] = true, [0.45] = true, [0.7] = false, [0.86] = true, [1.02] = true, [1.2] = true, [1.31] = false }
for now, want in pairs(expect) do assert(expressions.talkWanted(segs, 0, now) == want, now) end
assert(expressions.talkWanted({ { dur = 1 } }, 5, 5.5) and not expressions.talkWanted({ { dur = 1 } }, 5, 6))
assert(not expressions.talkWanted({ { dur = 1, talk = {} } }, 0, 0.5))
print("UF-74 감정 표정 대응·redscript 위임·실패 무시·응답 감정 전달, UF-75 소리 구간 입모양 판단 검사 통과")
