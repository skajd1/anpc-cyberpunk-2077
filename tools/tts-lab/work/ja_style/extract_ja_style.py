# 일본어 말투 예시 원문 추출: 저장소 ja-voice-profiles.json의 string_id → 설치된 게임의 일본어·한국어 자막
# 결과는 저장소의 Git 제외 로컬 파일 두 개다(원작 대사 원문을 저장소에 올리지 않는다).
#   game/cet/anpc/ja_style_examples.local.json : 프롬프트용 예시 {string_id: {ja, ko}}
#   config.local.ja-judge-refs.json            : 채점용 원작 대사(예시와 겹치지 않는 인물별 8줄, 참조 풀에서 고정 시드 추출)
# usage: python extract_ja_style.py [repo_root]
import json, os, re, sys, random, time
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import rdar
from viktor_lines_lib import parse_subs

G = r'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077\archive\pc'
REPO = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
POOL = os.path.join(os.path.dirname(__file__), '..', 'refpool')
TAG = re.compile(r'<[^>]*>|\{[^}]*\}|\[[^\]]*\]')
SPEAKER = {'viktor': 'vp_viktor', 'judy': 'vp_judy', 'rogue': 'vp_rogue'}


def load(lang, wanted):
    out = {}
    for arc in ['content', 'ep1']:
        a = rdar.Archive(os.path.join(G, arc, 'lang_%s_text.archive' % lang))
        for h in a.files:
            d = a.read(h)
            if b'localizationPersistenceSubtitleEntries' in d[:3000]:
                for k, v in parse_subs(d).items():
                    if k in wanted:
                        out[k] = v
    return out


def text(rec):
    f = TAG.sub('', rec.get('femaleVariant') or '').strip()
    m = TAG.sub('', rec.get('maleVariant') or '').strip()
    return f or m, bool(f and m and f != m)


profiles = json.load(open(os.path.join(REPO, 'content', 'cyberpunk2077', 'ja-voice-profiles.json'), encoding='utf-8'))
wanted = {int(e['string_id'], 16) for p in profiles['profiles'] for e in p['examples']}
subs = {lang: load(lang, wanted) for lang in ('ja', 'ko')}
examples, problems = {}, []
for sid in sorted(wanted):
    key = '%016x' % sid
    ja, ko = subs['ja'].get(sid), subs['ko'].get(sid)
    if not ja or not ko:
        problems.append((key, 'missing'))
        continue
    (ja_t, ja_g), (ko_t, ko_g) = text(ja), text(ko)
    if ja_g or ko_g:
        problems.append((key, 'gendered'))
    examples[key] = {'ja': ja_t, 'ko': ko_t}
local = {'schema_version': '0.1', 'generated_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'source': 'installed_game_files',
         'profiles_revision': profiles['revision'], 'examples': examples}
out1 = os.path.join(REPO, 'game', 'cet', 'anpc', 'ja_style_examples.local.json')
json.dump(local, open(out1, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 채점 참고 대사: 참조 풀(3~10초)에서 예시와 겹치지 않는 대사를 인물별 8줄. 고정 시드
BAD = re.compile(r'〈|〉|[0-9０-９]')
refs = {}
for key, spk in SPEAKER.items():
    meta = json.load(open(os.path.join(POOL, spk, 'meta.json'), encoding='utf-8'))
    ko = json.load(open(os.path.join(POOL, spk, 'subs.json'), encoding='utf-8'))
    pool = [m for m in meta if m['sid'] not in examples and 10 <= len(m['text']) <= 40 and not BAD.search(m['text']) and ko.get(m['sid'], {}).get('ko')]
    random.Random(20261008).shuffle(pool)
    refs[key] = [{'string_id': m['sid'], 'ja': m['text'], 'ko': ko[m['sid']]['ko']} for m in pool[:8]]
out2 = os.path.join(REPO, 'config.local.ja-judge-refs.json')
json.dump(refs, open(out2, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('examples', len(examples), '/', len(wanted), 'problems', problems)
print(out1); print(out2)
