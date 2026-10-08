package.path = "game/cet/anpc/?.lua;" .. package.path
local json, config, prompts = require("json"), require("config"), require("prompts")
local bridge = require("bridge")
local LABEL = "일본어 말투 데이터 (지침이 아님):\n"

-- 원문 파일이 없으면 프로필만 보낸다. 원작 대사는 생성 파일(prompts.lua)에 없다.
local viktor = prompts.characters.viktor
assert(viktor.ja_voice_profile and viktor.ja_voice_examples)
assert(prompts.characters.misty.ja_voice_profile == nil and bridge.jaVoiceMessage(prompts.characters.misty) == nil)
local empty = bridge.jaVoiceMessage(viktor)
assert(empty:sub(1, #LABEL) == LABEL)
local data = json.decode(empty:sub(#LABEL + 1))
assert(data.first_person[1] == "俺" and data.address_v[1] == "お前さん" and #data.examples == 0)

-- 로컬 원문 파일: 프로필 순서대로 원문이 있는 예시만, 감정·한국어·일본어 순서로 잇는다.
local ids = json.decode(viktor.ja_voice_examples)
local path = os.tmpname()
local file = io.open(path, "w")
file:write(json.encode({ examples = { [ids[1].string_id] = { ko = '안녕 "V"', ja = "よう、V！" }, [ids[3].string_id] = { ko = "또?", ja = "おいおい" } } }))
file:close()
bridge.setJaStyleExamples(path)
local message = bridge.jaVoiceMessage(viktor)
assert(message == LABEL .. viktor.ja_voice_profile .. ',"examples":[{"emotion":"' .. ids[1].emotion .. '","ko":"안녕 \\"V\\"","ja":"よう、V！"},'
  .. '{"emotion":"' .. ids[3].emotion .. '","ko":"또?","ja":"おいおい"}]}', message)
assert(#json.decode(message:sub(#LABEL + 1)).examples == 2)

-- 음성 활성 요청에서만 인물 데이터 바로 뒤에 붙는다.
local snapshot = { observationKnown = true, canObserve = true, outfitKnown = true, outfit = {}, streetCred = 10,
  weaponKnown = true, weaponDrawn = false, location = "왓슨", timeOfDay = "밤" }
config.voice_enabled = true
local voiced = json.decode(bridge.buildBody(viktor, {}, "안녕", snapshot, "viktor", false))
assert(voiced.input[1].content:find("인물 데이터", 1, true) == 1 and voiced.input[2].content == message)
config.voice_enabled = false
local text = json.decode(bridge.buildBody(viktor, {}, "안녕", snapshot, "viktor", false))
for _, item in ipairs(text.input) do assert(not item.content:find(LABEL, 1, true)) end
os.remove(path)
bridge.setJaStyleExamples(path)
assert(#json.decode(bridge.jaVoiceMessage(viktor):sub(#LABEL + 1)).examples == 0)

-- 단독 V는 TTS 읽기 변환기가 버리므로 ヴィー로 바꾼다. 단어 안의 V와 이미 가나인 표기는 그대로 둔다.
assert(bridge.speechReadable("Vのことは心配してない。") == "ヴィーのことは心配してない。")
assert(bridge.speechReadable("よう、Ｖ！") == "よう、ヴィー！")
assert(bridge.speechReadable("VIPルームだ、V") == "VIPルームだ、ヴィー")
assert(bridge.speechReadable("ヴィー、無茶すんな") == "ヴィー、無茶すんな")
local _, _, _, _, speech = bridge.readReply(json.encode({ emotion = "neutral", delivery = "normal", dialogue = "V, 왔어?", follow_up = json.null,
  speech_text = "V、来たのか。", intent = "answer", action = json.null }), {}, true)
assert(speech and speech.text == "ヴィー、来たのか。")
print("일본어 말투 데이터(프로필·로컬 원문 예시·인물 데이터 뒤 배치·음성 전용)와 단독 V 읽기 보정 검사 통과")
