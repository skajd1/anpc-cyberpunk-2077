# 라벨링용 한국어·영어 자막 붙이기. refpool/<spk>/meta.json의 sid마다 subs.json에 {ko, en} 기록
# argv: speaker_key ...  (없으면 refpool 아래 전체)
import json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import rdar
from viktor_lines_lib import parse_subs

G = r'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077\archive\pc'
POOL = os.path.join(os.path.dirname(__file__), '..', 'refpool')
TAG = re.compile(r'<[^>]*>|\{[^}]*\}|\[[^\]]*\]')


def load(lang):
    subs = {}
    for arc in ['content', 'ep1']:
        a = rdar.Archive(os.path.join(G, arc, 'lang_%s_text.archive' % lang))
        for h in a.files:
            d = a.read(h)
            if b'localizationPersistenceSubtitleEntries' in d[:3000]:
                subs.update(parse_subs(d))
    return subs


def text(rec):
    if not rec:
        return ''
    f = TAG.sub('', rec.get('femaleVariant') or '').strip()
    m = TAG.sub('', rec.get('maleVariant') or '').strip()
    return f if not m or f == m else (m if not f else f + ' / ' + m)


spks = sys.argv[1:] or [d for d in os.listdir(POOL) if os.path.exists(os.path.join(POOL, d, 'meta.json'))]
langs = {l: load(l) for l in ('ko', 'en')}
for spk in spks:
    meta = json.load(open(os.path.join(POOL, spk, 'meta.json'), encoding='utf-8'))
    out = {m['sid']: {l: text(s.get(int(m['sid'], 16))) for l, s in langs.items()} for m in meta}
    json.dump(out, open(os.path.join(POOL, spk, 'subs.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(spk, len(out), 'ko 없음', sum(1 for v in out.values() if not v['ko']))
