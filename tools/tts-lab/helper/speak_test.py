import json, sys, time, urllib.request
def post(path, obj):
    r = urllib.request.Request('http://127.0.0.1:47321' + path, data=json.dumps(obj, ensure_ascii=False).encode('utf-8'),
                               headers={'Content-Type': 'application/json; charset=utf-8'})
    return json.loads(urllib.request.urlopen(r).read())
pid, text = sys.argv[1], sys.argv[2]
print(post('/speak', {'request_id': 'test-' + pid, 'voice_profile_id': pid, 'emotion': 'neutral', 'delivery': 'normal', 'speech_text': text}))
