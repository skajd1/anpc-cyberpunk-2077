# 참조 후보용 원작 대사 전체 추출(학습 목록과 무관). 화자별 3~10초, 홀로콜·헬멧·전투 보이스셋 제외. 32k mono wav + meta.json
# argv: speaker_key prefix  (예: vp_judy judy_)  /  crowd: crowd_m civ_mid_m_12_  (특정 성우 접두어)
import json, os, re, subprocess, sys, collections
import numpy as np, soundfile as sf, librosa
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))
import rdar
from viktor_lines_lib import load_subs
LAB_ROOT = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')  # 실험 폴더(모델·가상환경·원작 자료, Git 제외)

G = r'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077\archive\pc'
VG = os.path.join(LAB_ROOT, 'tools', 'vgmstream', 'vgmstream-cli.exe')
BS = chr(92)
TAG = re.compile(r'<[^>]*>|\{[^}]*\}|\[[^\]]*\]')
spk, prefix = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.join(LAB_ROOT, 'work', 'refpool'), spk); os.makedirs(OUT, exist_ok=True)
subs = load_subs(G)
paths = json.load(open(os.path.join(LAB_ROOT, 'work', 'vo_paths.json')))
voice = {a: rdar.Archive(os.path.join(G, a, 'lang_ja_voice.archive')) for a in ['content', 'ep1']}
meta, drop = [], collections.Counter()
seen = set()
for p in paths:
    parts = p.split(BS); fn, fol = parts[-1], parts[-2]
    if not fn.startswith(prefix):
        continue
    if fol != 'vo' or '_vs_vset' in fn:
        drop['folder_or_voiceset'] += 1; continue
    sid = int(fn[-20:-4], 16)
    s = subs.get(sid)
    if not s:
        drop['no_sub'] += 1; continue
    f_t, m_t = TAG.sub('', s.get('femaleVariant') or '').strip(), TAG.sub('', s.get('maleVariant') or '').strip()
    if f_t and m_t and f_t != m_t:
        drop['gendered'] += 1; continue
    t = f_t or m_t
    if not t or t in seen:
        drop['empty_or_dup'] += 1; continue
    h = rdar.fnv1a64(p)
    arc = next((a for a, v in voice.items() if h in v.files), None)
    if not arc:
        drop['not_in_archive'] += 1; continue
    tmp = os.path.join(OUT, '_tmp.wem'); open(tmp, 'wb').write(voice[arc].read(h))
    tw = tmp[:-4] + '.wav'
    subprocess.run([VG, '-o', tw, tmp], capture_output=True)
    if not os.path.exists(tw):
        drop['decode'] += 1; continue
    y, sr = sf.read(tw, dtype='float32'); os.remove(tw)
    if y.ndim > 1:
        y = y.mean(1)
    y, _ = librosa.effects.trim(y, top_db=40)
    d = len(y) / sr
    if not 3.0 <= d <= 10.0:
        drop['duration'] += 1; continue
    if np.abs(y).max() >= 0.999:
        drop['clipped'] += 1; continue
    seen.add(t)
    sf.write(os.path.join(OUT, '%016x.wav' % sid), librosa.resample(y, orig_sr=sr, target_sr=32000), 32000, subtype='PCM_16')
    meta.append(dict(sid='%016x' % sid, src=fn, dur=round(d, 2), text=t))
for f in ('_tmp.wem',):
    try: os.remove(os.path.join(OUT, f))
    except OSError: pass
json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(spk, 'kept', len(meta), 'drop', dict(drop))
