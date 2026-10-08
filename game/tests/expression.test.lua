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
print("UF-74 감정 표정 대응·redscript 위임·실패 무시·응답 감정 전달 검사 통과")
