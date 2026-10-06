-- 모델 응답 해석용 최소 JSON 디코더와 문자열 인코더. 객체·배열·문자열(\u 이스케이프·서로게이트 포함)·
-- 숫자·true/false/null을 지원한다. 잘못된 입력은 nil, 오류 메시지를 돌려준다.
local json = {}
local arrayMeta = { __json_array = true }
function json.array(values) return setmetatable(values or {}, arrayMeta) end
function json.isArray(value) return type(value) == "table" and getmetatable(value) == arrayMeta end

local escapes = { ['"'] = '"', ["\\"] = "\\", ["/"] = "/", b = "\b", f = "\f", n = "\n", r = "\r", t = "\t" }

local function utf8char(code)
  if code < 0x80 then return string.char(code) end
  if code < 0x800 then return string.char(0xC0 + math.floor(code / 0x40), 0x80 + code % 0x40) end
  if code < 0x10000 then
    return string.char(0xE0 + math.floor(code / 0x1000), 0x80 + math.floor(code / 0x40) % 0x40, 0x80 + code % 0x40)
  end
  return string.char(0xF0 + math.floor(code / 0x40000), 0x80 + math.floor(code / 0x1000) % 0x40,
    0x80 + math.floor(code / 0x40) % 0x40, 0x80 + code % 0x40)
end

local parse

local function skip(text, pos)
  return text:find("[^ \t\r\n]", pos) or #text + 1
end

local function parseString(text, pos)
  local parts, i = {}, pos + 1
  while true do
    local c = text:sub(i, i)
    if c == "" then error("unterminated string") end
    if c == '"' then return table.concat(parts), i + 1 end
    if c == "\\" then
      local e = text:sub(i + 1, i + 1)
      if e == "u" then
        local code = tonumber(text:sub(i + 2, i + 5), 16)
        if not code then error("bad unicode escape") end
        i = i + 6
        if code >= 0xD800 and code <= 0xDBFF and text:sub(i, i + 1) == "\\u" then
          local low = tonumber(text:sub(i + 2, i + 5), 16)
          if low and low >= 0xDC00 and low <= 0xDFFF then
            code = 0x10000 + (code - 0xD800) * 0x400 + (low - 0xDC00)
            i = i + 6
          end
        end
        parts[#parts + 1] = utf8char(code)
      elseif escapes[e] then
        parts[#parts + 1] = escapes[e]
        i = i + 2
      else
        error("bad escape")
      end
    else
      local stop = text:find('["\\]', i) or #text + 1
      parts[#parts + 1] = text:sub(i, stop - 1)
      i = stop
    end
  end
end

local function parseArray(text, pos)
  local result, i = json.array(), skip(text, pos + 1)
  if text:sub(i, i) == "]" then return result, i + 1 end
  while true do
    local value
    value, i = parse(text, i)
    result[#result + 1] = value
    i = skip(text, i)
    local c = text:sub(i, i)
    if c == "]" then return result, i + 1 end
    if c ~= "," then error("expected , or ]") end
    i = skip(text, i + 1)
  end
end

local function parseObject(text, pos)
  local result, i = {}, skip(text, pos + 1)
  if text:sub(i, i) == "}" then return result, i + 1 end
  while true do
    if text:sub(i, i) ~= '"' then error("expected key") end
    local key
    key, i = parseString(text, i)
    i = skip(text, i)
    if text:sub(i, i) ~= ":" then error("expected :") end
    local value
    value, i = parse(text, skip(text, i + 1))
    result[key] = value
    i = skip(text, i)
    local c = text:sub(i, i)
    if c == "}" then return result, i + 1 end
    if c ~= "," then error("expected , or }") end
    i = skip(text, i + 1)
  end
end

-- null은 json.null로 구분한다.
json.null = setmetatable({}, { __tostring = function() return "null" end })

parse = function(text, pos)
  pos = skip(text, pos)
  local c = text:sub(pos, pos)
  if c == "{" then return parseObject(text, pos) end
  if c == "[" then return parseArray(text, pos) end
  if c == '"' then return parseString(text, pos) end
  if text:sub(pos, pos + 3) == "true" then return true, pos + 4 end
  if text:sub(pos, pos + 4) == "false" then return false, pos + 5 end
  if text:sub(pos, pos + 3) == "null" then return json.null, pos + 4 end
  local number = text:match("^-?%d+%.?%d*[eE]?[-+]?%d*", pos)
  if number and number ~= "" and tonumber(number) then return tonumber(number), pos + #number end
  error("unexpected character")
end

function json.decode(text)
  if type(text) ~= "string" then return nil, "not a string" end
  local ok, value, pos = pcall(parse, text, 1)
  if not ok then return nil, value end
  if skip(text, pos) <= #text then return nil, "trailing characters" end
  return value
end

function json.string(value)
  return '"' .. tostring(value or ""):gsub('[%c"\\]', function(c)
    if c == '"' then return '\\"' end
    if c == "\\" then return "\\\\" end
    if c == "\n" then return "\\n" end
    if c == "\r" then return "\\r" end
    if c == "\t" then return "\\t" end
    return string.format("\\u%04x", c:byte())
  end) .. '"'
end

-- 로컬 정체성 조립용. 빈 배열/객체를 구별하며 객체 키 순서를 고정한다.
function json.encode(value)
  if value == nil or value == json.null then return "null" end
  local kind = type(value)
  if kind == "string" then return json.string(value) end
  if kind == "boolean" then return tostring(value) end
  if kind == "number" then
    assert(value == value and value ~= math.huge and value ~= -math.huge, "invalid JSON number")
    return tostring(value)
  end
  assert(kind == "table", "invalid JSON value")
  local parts = {}
  if getmetatable(value) == arrayMeta then
    for _, item in ipairs(value) do parts[#parts + 1] = json.encode(item) end
    return '[' .. table.concat(parts, ',') .. ']'
  end
  local keys = {}
  for key in pairs(value) do assert(type(key) == "string", "object key must be string"); keys[#keys + 1] = key end
  table.sort(keys)
  for _, key in ipairs(keys) do parts[#parts + 1] = json.string(key) .. ':' .. json.encode(value[key]) end
  return '{' .. table.concat(parts, ',') .. '}'
end

return json
