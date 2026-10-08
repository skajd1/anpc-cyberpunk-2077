local retrieval={}
local function has(list,value) for _,v in ipairs(list or {}) do if v==value then return true end end;return false end
local function wordAt(text,position)
  if position<1 or position>#text then return false end
  while position>1 and text:byte(position)>=128 and text:byte(position)<192 do position=position-1 end
  local a,b,c=text:byte(position,position+2)
  if a<128 then return text:sub(position,position):match("[%w_]")~=nil end
  local code=a<224 and ((a-192)*64+(b or 128)-128) or ((a-224)*4096+((b or 128)-128)*64+(c or 128)-128)
  return (code>=0xAC00 and code<=0xD7A3) or (code>=0x1100 and code<=0x11FF) or (code>=0x3130 and code<=0x318F)
    or (code>=0x3040 and code<=0x30FF) or (code>=0x4E00 and code<=0x9FFF) or (code>=0xC0 and code<=0x2FF)
end
local function normalize(text)
  -- 웹의 NFKC와 공유하는 입력 범위: 전각 ASCII·일본어 전각 공백.
  text=text:gsub("[\239][\188\189][\128-\191]",function(c)
    local a,b,d=c:byte(1,3);local code=(a-224)*4096+(b-128)*64+d-128
    if code>=0xFF01 and code<=0xFF5E then return string.char(code-0xFEE0) end
    return c
  end):gsub("　"," ")
  return text:lower():gsub("%s+"," "):match("^%s*(.-)%s*$")
end
local function match(text, term,entity)
  text,term=normalize(text),normalize(term)
  if term=="" then return false end
  local position=1
  while true do
    local first,last=text:find(term,position,true); if not first then return false end
    local ending=not wordAt(text,last+1)
    if not ending then
      for _,suffix in ipairs({"은","는","을","를","가","이","의","에","에게","한테","에서","부터","까지","로","와","과","랑","이랑","도","만","같은","같이","처럼","보다","라는","라고"}) do
        if (entity or ({["은"]=true,["는"]=true,["을"]=true,["를"]=true,["가"]=true,["이"]=true,["의"]=true,["에"]=true,["로"]=true,["와"]=true,["과"]=true,["랑"]=true})[suffix]) and text:sub(last+1,last+#suffix)==suffix and not wordAt(text,last+#suffix+1) then ending=true; break end
      end
    end
    if not entity then
      local a,b,c=term:byte(-3,-1)
      if a and b and c then
        local code=(a-224)*4096+(b-128)*64+c-128
        if code>=0xAC00 and code<=0xD7A3 then ending=true end
      end
    end
    if not wordAt(text,first-1) and ending then return true end
    position=last+1
  end
end
local function score(fact,text)
  local named,points=false,0
  for _, alias in ipairs(fact.entity_aliases or {}) do if match(text,alias,true) then named=true end end
  for _, term in ipairs(fact.trigger_terms or {}) do if not has(fact.entity_aliases,term) and match(text,term) then points=points+1 end end
  if named then points=points+1 end
  return named,points
end

retrieval.match=match
retrieval.score=score
function retrieval.rankFacts(candidates,direct)
  direct=direct or false
  for _,item in ipairs(candidates) do if item.now>0 then direct=true;break end end
  local result={}
  for _,item in ipairs(candidates) do
    if (direct and item.now>0) or (not direct and item.before>0) then result[#result+1]=item end
  end
  table.sort(result,function(a,b)
    for _,key in ipairs({"named","now","beforeNamed","before"}) do
      local x,y=a[key],b[key]
      if x~=y then if type(x)=="boolean" then return x end;return x>y end
    end
    return a.fact.id<b.fact.id
  end)
  return result
end
function retrieval.rankExamples(examples,text,tags)
  local ranked={}
  for _,ex in ipairs(examples) do
    local points=0
    for _,term in ipairs(ex.trigger_terms or {}) do if match(text,term) then points=points+1 end end
    for _,tag in ipairs(ex.topic_tags or {}) do if tags[tag] then points=points+1 end end
    for _,term in ipairs(ex.input_terms or {}) do if match(text,term) then points=points+1 end end
    if points>0 then ranked[#ranked+1]={ex=ex,score=points} end
  end
  table.sort(ranked,function(a,b) if a.score~=b.score then return a.score>b.score end;return a.ex.id<b.ex.id end)
  return ranked
end
return retrieval
