# 군중 원작 목소리별 참조 음성 목록(로컬 전용). 게임의 일본어 음성에서 목소리 ID(예: civ_mid_m_03_enus_35)마다
# 자막이 있는 3.5~8초 평상 대사 하나를 골라 helper/crowd_refs/<id>.wav(32kHz)와 helper/crowd_voices.json에 쓴다.
# 결과물은 원작 음성이므로 저장소·배포물에 넣지 않는다.
# usage: python build_crowd_voices.py
import json, os, random, re, subprocess, sys, collections
import soundfile as sf, librosa
sys.stdout.reconfigure(encoding='utf-8')
import rdar
from viktor_lines_lib import load_subs
LAB_ROOT = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')  # 실험 폴더(모델·가상환경·원작 자료, Git 제외)

G = r'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077\archive\pc'
VG = os.path.join(LAB_ROOT, 'tools', 'vgmstream', 'vgmstream-cli.exe')
HELPER = os.path.join(LAB_ROOT, 'helper')
OUT = os.path.join(HELPER, 'crowd_refs')
BS = chr(92)
TAG = re.compile(r'<[^>]*>|\{[^}]*\}|\[[^\]]*\]')
VOICE = re.compile(r'^([a-z0-9]+_[a-z0-9]+_[mf]_\d\d_[a-z]+_\d\d)_(.+?)_(?:f_)?[0-9a-f]{16}\.wem$')
# 평상 대화가 먼저, 짧은 반응(vsets)은 나중에 고른다.
PREFER = ('ow_conversations', 'ow_chats', 'ow_vendors', 'ow_wst')

subs = load_subs(G)
paths = json.load(open(os.path.join(LAB_ROOT, 'work', 'vo_paths.json')))
voice = {a: rdar.Archive(os.path.join(G, a, 'lang_ja_voice.archive')) for a in ['content', 'ep1']}
groups = collections.defaultdict(list)
for p in paths:
    parts = p.split(BS)
    if len(parts) < 2 or parts[-2] != 'vo':
        continue
    m = VOICE.match(parts[-1])
    if m:
        groups[m.group(1)].append((m.group(2), p))
os.makedirs(OUT, exist_ok=True)
old = {'voices': {}} if '--rebuild' in sys.argv else json.load(open(os.path.join(HELPER, 'crowd_voices.json'), encoding='utf-8')) if os.path.exists(os.path.join(HELPER, 'crowd_voices.json')) else {'voices': {}}
voices = {k: v for k, v in old.get('voices', {}).items() if os.path.exists(v['wav'])}
tmp_wem, tmp_wav = os.path.join(OUT, '_tmp.wem'), os.path.join(OUT, '_tmp.wav')
miss = []
for vid in sorted(groups):
    if vid in voices:
        continue
    cands = groups[vid]
    rng = random.Random(vid)
    rng.shuffle(cands)
    cands.sort(key=lambda c: next((i for i, k in enumerate(PREFER) if k in c[0]), len(PREFER)))
    found = None
    for _, p in cands[:80]:
        sid = int(p.split(BS)[-1][-20:-4], 16)
        s = subs.get(sid)
        if not s:
            continue
        fv, mv = (TAG.sub('', s.get(k) or '').strip() for k in ('femaleVariant', 'maleVariant'))
        # V 성별에 따라 문장이 다른 대사는 녹음과 대본이 어긋날 수 있어 쓰지 않는다(대본 불일치는 TTS가 엉뚱한 말을 하게 한다).
        if fv and mv and fv != mv:
            continue
        t = fv or mv
        if not (10 <= len(t) <= 40) or t.count('！') + t.count('!') > 1:
            continue
        h = rdar.fnv1a64(p)
        arc = next((a for a, v in voice.items() if h in v.files), None)
        if not arc:
            continue
        open(tmp_wem, 'wb').write(voice[arc].read(h))
        subprocess.run([VG, '-o', tmp_wav, tmp_wem], capture_output=True)
        try:
            y, sr = sf.read(tmp_wav, dtype='float32')
        except Exception:
            continue
        if y.ndim > 1:
            y = y.mean(axis=1)
        y, _ = librosa.effects.trim(y, top_db=40)
        d = len(y) / sr
        # 3.5~8초, 말 빠르기 초당 3~10자(웃음·비명·긴 쉼이 섞인 반응음 제외).
        if not (3.5 <= d <= 8.0) or not (3.0 <= len(t) / d <= 10.0):
            continue
        f = os.path.join(OUT, vid + '.wav')
        sf.write(f, librosa.resample(y, orig_sr=sr, target_sr=32000), 32000, subtype='PCM_16')
        found = dict(wav=f, text=t, dur=round(d, 2), src=p.split(BS)[-1])
        break
    if found:
        voices[vid] = found
    else:
        miss.append(vid)
for f in (tmp_wem, tmp_wav):
    if os.path.exists(f):
        os.remove(f)
json.dump({'version': 1, 'voices': voices}, open(os.path.join(HELPER, 'crowd_voices.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('voices', len(voices), 'missing', len(miss), miss[:20])
