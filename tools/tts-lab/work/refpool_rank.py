# 참조 후보 순위: 대사 키워드(감정 단서) + 소리 수치(화자 중간값 대비 z). 최종 판단은 청취.
# argv: speaker emotions(쉼표) N
import os, sys, json, re
import numpy as np, soundfile as sf, librosa
LAB_ROOT = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')  # 실험 폴더(모델·가상환경·원작 자료, Git 제외)
sys.stdout.reconfigure(encoding='utf-8')
LAB = LAB_ROOT
spk, emos, N = sys.argv[1], sys.argv[2].split(','), int(sys.argv[3])
D = os.path.join(LAB, 'work', 'refpool', spk)
meta = json.load(open(os.path.join(D, 'meta.json'), encoding='utf-8'))
used = set()
try:
    for r in json.load(open(os.path.join(LAB, 'helper', 'profiles.json'), encoding='utf-8'))['profiles'].get(spk, {}).get('refs', []):
        used.add(r['ref_id'])
except Exception:
    pass

CUES = {
    'neutral': None,
    'curious': r'[？?]$|か[？?]|の[？?]|って[？?]|なに|何|どう|どこ|なんで|本当|ほんと|へえ|ふうん',
    'friendly': r'ありがと|いいね|楽し|好き|よかった|助かる|嬉し|さすが|会えて|一緒|頼り|任せ',
    'wary': r'気をつけ|気を付け|危な|信用|信じ|罠|用心|油断|警戒|気になる|怪し|慎重|隠し',
    'annoyed': r'チッ|うるさい|いい加減|ふざけ|クソ|黙れ|勝手|面倒|しつこ|知るか|うんざり|バカ|ったく',
    'afraid': r'怖|まずい|助けて|嫌だ|逃げ|やば|ヤバ|殺され|死にたくない|震え|どうしよう|無理',
    'sad': r'ごめん|悲し|寂し|辛|死んだ|失っ|もう会えない|残念|泣|いなくな|最後|悔し|すまない',
}
BAD = '―—()（）「」『』'

def feats(path, t):
    x, sr = sf.read(path)
    rms = librosa.feature.rms(y=x, frame_length=1024, hop_length=320)[0]
    db = 20 * np.log10(rms + 1e-9); act = db > db.max() - 35
    f0 = librosa.yin(x, fmin=70, fmax=500, sr=sr, frame_length=1024, hop_length=320)
    st = 12 * np.log2(f0[act[:len(f0)]] / 100.0)
    span = np.where(act)[0]; n = span[-1] - span[0] + 1
    chars = sum(1 for ch in t if not ch.isspace() and ch not in '、。，．・？！?!…')
    return dict(loud=float(np.median(db[act])), f0_med=float(np.median(st)), f0_range=float(np.percentile(st, 90) - np.percentile(st, 10)),
                rate=chars / (n * 320 / sr), pause=float(1 - act[span[0]:span[-1] + 1].mean()))

rows = []
for m in meta:
    if m['sid'] in used or any(c in m['text'] for c in BAD):
        continue
    m = dict(m, **feats(os.path.join(D, m['sid'] + '.wav'), m['text']))
    rows.append(m)
keys = ['loud', 'f0_med', 'f0_range', 'rate', 'pause']
med = {k: float(np.median([r[k] for r in rows])) for k in keys}
mad = {k: float(np.median([abs(r[k] - med[k]) for r in rows])) * 1.4826 + 1e-6 for k in keys}
for r in rows:
    r['z'] = {k: round((r[k] - med[k]) / mad[k], 2) for k in keys}
    r['typ'] = sum(abs(v) for v in r['z'].values())
out = {}
for emo in emos:
    def score(r):
        z, t = r['z'], r['text']
        cue = CUES[emo]
        hit = 1 if (cue and re.search(cue, t)) else 0
        if emo == 'neutral':
            return r['typ'] + (3 if re.search('[！!？?…]', t) else 0)
        acoustic = {'curious': abs(z['loud']) * 0.5, 'friendly': max(0, -z['f0_med']) + abs(z['loud']) * 0.3,
                    'wary': abs(z['loud']) * 0.5 + max(0, z['rate']) * 0.3, 'annoyed': max(0, -z['loud']) + max(0, -z['f0_range']) * 0.3,
                    'afraid': max(0, -z['f0_med']) + max(0, -z['f0_range']) * 0.5, 'sad': max(0, z['loud']) + max(0, z['rate']) + max(0, -z['pause']) * 0.3}[emo]
        bang = 1.5 if '！' in t and emo not in ('annoyed', 'afraid') else 0
        return (0 if hit else 4) + acoustic + 0.3 * r['typ'] + bang
    ranked = sorted(rows, key=score)[:N]
    out[emo] = [dict(sid=r['sid'], dur=r['dur'], text=r['text'], cue=bool(CUES[emo] and re.search(CUES[emo], r['text'])), z=r['z']) for r in ranked]
json.dump(out, open(os.path.join(D, 'ranked.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(spk, 'pool', len(rows), {e: sum(1 for r in v if r['cue']) for e, v in out.items()})
