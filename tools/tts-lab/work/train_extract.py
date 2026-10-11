# Extract JA voice lines + subtitles for fine-tuning speakers (judy, viktor, rogue).
# Output: train/<speaker>/*.wav (32k mono 16-bit), train/train.list, train/eval.list, train/stats.json
import json, os, re, random, subprocess, sys, collections
import numpy as np, soundfile as sf, librosa
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))
import rdar
from viktor_lines_lib import load_subs
LAB_ROOT = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')  # 실험 폴더(모델·가상환경·원작 자료, Git 제외)

G = r'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077\archive\pc'
VG = os.path.join(LAB_ROOT, 'tools', 'vgmstream', 'vgmstream-cli.exe')
BS = chr(92)
OUT = 'train'
SPK = {'vp_judy': 'judy_', 'vp_viktor': 'victor_vector_', 'vp_rogue': 'rogue_'}
CAP = 20 * 60  # seconds per speaker
N_EVAL = 8
random.seed(2077)

TAG = re.compile(r'<[^>]*>|\{[^}]*\}|\[[^\]]*\]')
KANA_KANJI = re.compile(r'[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9fff]')
INTERJ = re.compile(r'^[\sぁ-ゖァ-ヺー…・。、！？!?〜～っッ]*$')


def clean(t):
    t = TAG.sub('', t or '').replace('\n', ' ').strip()
    return re.sub(r'\s+', ' ', t)


def ok_text(t):
    if len(KANA_KANJI.findall(t)) < 6:
        return False
    # only kana/interjection and short -> likely scream/breath
    if INTERJ.match(t) and len(t) < 12:
        return False
    return True


subs = load_subs(G)
paths = json.load(open(os.path.join(LAB_ROOT, 'work', 'vo_paths.json')))
voice = {arc: rdar.Archive(os.path.join(G, arc, 'lang_ja_voice.archive')) for arc in ['content', 'ep1']}

pools = collections.defaultdict(list)
drop = collections.Counter()
for p in paths:
    parts = p.split(BS)
    fn, fol = parts[-1], parts[-2]
    spk = next((s for s, pre in SPK.items() if fn.startswith(pre)), None)
    if not spk:
        continue
    if fol != 'vo':
        drop['folder_' + fol] += 1; continue
    if '_vs_vset' in fn:
        drop['voiceset'] += 1; continue
    sid = int(fn[-20:-4], 16)
    sub = subs.get(sid)
    if not sub:
        drop['no_sub'] += 1; continue
    t = clean(sub.get('femaleVariant') or sub.get('maleVariant'))
    tm = clean(sub.get('maleVariant'))
    if sub.get('maleVariant') and sub.get('femaleVariant') and tm != t:
        drop['gendered_text'] += 1; continue  # line text differs by V gender; ambiguous
    if not ok_text(t):
        drop['text_filter'] += 1; continue
    h = rdar.fnv1a64(p)
    arc = next((a for a, v in voice.items() if h in v.files), None)
    if not arc:
        drop['not_in_archive'] += 1; continue
    pools[spk].append(dict(path=p, sid='%016x' % sid, arc=arc, text=t))

print('drop', dict(drop))
for s in pools:
    print(s, 'pool', len(pools[s]))

os.makedirs(OUT, exist_ok=True)
tmp = os.path.join(OUT, '_tmp'); os.makedirs(tmp, exist_ok=True)
train, evl, stats = [], [], {}
for spk, rows in pools.items():
    random.shuffle(rows)
    d = os.path.join(OUT, spk); os.makedirs(d, exist_ok=True)
    tot, n_eval, kept, dur_drop = 0.0, 0, [], collections.Counter()
    seen_text = set()
    for r in rows:
        if tot >= CAP and n_eval >= N_EVAL:
            break
        if r['text'] in seen_text:
            dur_drop['dup_text'] += 1; continue
        wem = os.path.join(tmp, r['sid'] + '.wem')
        open(wem, 'wb').write(voice[r['arc']].read(rdar.fnv1a64(r['path'])))
        wav48 = wem[:-4] + '.wav'
        subprocess.run([VG, '-o', wav48, wem], capture_output=True)
        os.remove(wem)
        if not os.path.exists(wav48):
            dur_drop['decode_fail'] += 1; continue
        y, sr = sf.read(wav48, dtype='float32'); os.remove(wav48)
        if y.ndim > 1:
            y = y.mean(1)
        yt, _ = librosa.effects.trim(y, top_db=40)
        dur = len(yt) / sr
        if dur < 1.5:
            dur_drop['short'] += 1; continue
        if dur > 15:
            dur_drop['long'] += 1; continue
        peak = np.abs(yt).max()
        if peak >= 0.999:
            dur_drop['clipped'] += 1; continue
        y32 = librosa.resample(yt, orig_sr=sr, target_sr=32000)
        y32 = y32 / max(peak, 1e-4) * 0.9 if peak > 0.9 else y32
        out = os.path.join(d, r['sid'] + '.wav')
        sf.write(out, y32, 32000, subtype='PCM_16')
        seen_text.add(r['text'])
        line = '%s/%s.wav|%s|ja|%s' % (spk, r['sid'], spk, r['text'])
        if n_eval < N_EVAL:
            evl.append(line); n_eval += 1
        else:
            train.append(line); tot += dur
        kept.append(dict(sid=r['sid'], dur=round(dur, 2), src=r['path'].split(BS)[-1]))
    stats[spk] = dict(pool=len(rows), train_sec=round(tot, 1), train_n=len(kept) - n_eval,
                      eval_n=n_eval, drops=dict(dur_drop), files=kept)
    print(spk, 'train %.1f min' % (tot / 60), 'n', len(kept) - n_eval, 'eval', n_eval, dict(dur_drop))
os.rmdir(tmp)
open(os.path.join(OUT, 'train.list'), 'w', encoding='utf-8').write('\n'.join(train) + '\n')
open(os.path.join(OUT, 'eval.list'), 'w', encoding='utf-8').write('\n'.join(evl) + '\n')
json.dump(dict(cap_sec=CAP, n_eval=N_EVAL, text_drops=dict(drop), speakers=stats),
          open(os.path.join(OUT, 'stats.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
