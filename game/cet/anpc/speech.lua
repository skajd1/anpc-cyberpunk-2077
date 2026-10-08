local json=require("json")
local retrieval=require("retrieval")
local speech={}
function speech.readings(entries,text,name,context)
  local sources={text or "",name or ""}
  for _,knowledge in ipairs(context.knowledge or {}) do sources[#sources+1]=knowledge.statement or "" end
  local selected={}
  for _,entry in ipairs(entries or {}) do
    if entry.review_status=="approved" then
      for _,source in ipairs(sources) do
        if retrieval.match(source,entry.term,true) then selected[#selected+1]=entry;break end
      end
    end
  end
  local function length(text) local _,n=text:gsub("[^\128-\191]","");return n end
  table.sort(selected,function(a,b) if length(a.term)~=length(b.term) then return length(a.term)>length(b.term) end;return a.term<b.term end)
  local result=json.array()
  for i=1,math.min(12,#selected) do result[#result+1]={term=selected[i].term,reading=selected[i].reading} end
  return result
end
return speech
