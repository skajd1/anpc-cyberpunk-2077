# v1(Genie int8) 합성 음성의 음색·음량 보정 설계. 원본: 학습 자료(화자별 무작위 60줄 + 평가 8줄), 합성: synth_v1_eval.py 결과.
# 화자 3명의 1/3옥타브 차이를 평균해 공통 EQ(선형 위상 FIR 511탭)를 만들고, 같은 대사 쌍의 LUFS 차이로 고정 이득을 정한다.
import os, sys, json, glob, random, html
import numpy as np, soundfile as sf
LAB_ROOT = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')  # 실험 폴더(모델·가상환경·원작 자료, Git 제외)
sys.stdout.reconfigure(encoding='utf-8')
LAB = LAB_ROOT
P = os.path.join(LAB, 'work', 'postfx')
src = open(os.path.join(P, 'postfx.py'), encoding='utf-8').read()
exec(compile(src[:src.index('# ---------------- run ----------------')], 'postfx', 'exec'))  # ltas·lufs·design_eq 등
CLAMP = 6.0
TR = os.path.join(LAB, 'work', 'train')
SY = os.path.join(LAB, 'finetune_v1', 'eq_design', 'synth')
OUT = os.path.join(LAB, 'finetune_v1', 'eq_design'); os.makedirs(OUT, exist_ok=True)
random.seed(7)
spks = ['vp_judy', 'vp_viktor', 'vp_rogue']
c = third_oct_centers()

def avg_ltas(files):
    return np.mean([ltas(load(f)) for f in files], axis=0)

diffs, pairs = [], {}
for spk in spks:
    synth = sorted(glob.glob(os.path.join(SY, spk + '_*.wav')))
    matched = [os.path.join(TR, spk, os.path.basename(f)[len(spk) + 1:]) for f in synth]
    pool = [f for f in glob.glob(os.path.join(TR, spk, '*.wav')) if f not in matched]
    orig = matched + random.sample(pool, 60)
    do, ds = to_third_oct_db(avg_ltas(orig)), to_third_oct_db(avg_ltas(synth))
    d = do - ds; m = (c >= 300) & (c <= 4000); d -= np.nanmean(d[m])
    diffs.append(np.nan_to_num(d)); pairs[spk] = list(zip(matched, synth))
diff = np.clip(np.mean(diffs, axis=0), -CLAMP, CLAMP); diff[c < 70] = 0.0
fpts = np.concatenate([[0], c, [SR / 2]]); gdb = np.concatenate([[0.0], diff, [diff[-1]]])
taps = firwin2(NTAPS, fpts / (SR / 2), 10 ** (gdb / 20), window='hann')

def eq(x):
    return fftconvolve(x, taps)[(NTAPS - 1) // 2:][:len(x)]

# 고정 이득: 같은 대사 쌍에서 원본 LUFS - EQ 후 합성 LUFS의 중앙값
gl = []
for spk in spks:
    for o, s in pairs[spk]:
        gl.append(lufs(load(o)) - lufs(eq(load(s))))
gain_db = float(np.median(gl))

report = {'per_speaker': {}}
for spk in spks:
    before, after, lo, ls_, la = [], [], [], [], []
    for o, s in pairs[spk]:
        xo, xs = load(o), load(s); xa = eq(xs) * 10 ** (gain_db / 20)
        mo, ms, ma = metrics(xo), metrics(xs), metrics(xa)
        before.append(ltas_distance(mo, ms)); after.append(ltas_distance(mo, ma))
        lo.append(mo['lufs']); ls_.append(ms['lufs']); la.append(ma['lufs'])
    report['per_speaker'][spk] = dict(ltas_dist_before=round(float(np.mean(before)), 2), ltas_dist_after=round(float(np.mean(after)), 2),
                                      lufs_orig=round(float(np.mean(lo)), 1), lufs_synth=round(float(np.mean(ls_)), 1), lufs_after=round(float(np.mean(la)), 1))
    print(spk, report['per_speaker'][spk])
print('gain_db %.2f' % gain_db, 'eq(dB) @', {int(f): round(float(g), 1) for f, g in zip(c, diff) if int(f) in (100, 125, 250, 500, 1000, 2000, 4000, 6300, 8000, 10079, 12699)})
json.dump(dict(version='v1_q_t2s', ntaps=NTAPS, sr=SR, fir_taps=taps.tolist(), third_oct_hz=c.tolist(), eq_db=diff.tolist(),
               gain_db=gain_db, peak_limit_dbfs=LIMIT_DBFS, report=report), open(os.path.join(OUT, 'postfx_v1.json'), 'w'), indent=0)

# 청취 비교: 화자별 2줄 (원본 / 보정 전 / 보정 후)
L = os.path.join(OUT, 'listen'); os.makedirs(L, exist_ok=True)
rows = []
for spk in spks:
    for o, s in sorted(pairs[spk], key=lambda p: -len(load(p[1])))[:2]:
        b = os.path.basename(s)[:-4]
        sf.write(os.path.join(L, b + '_orig.wav'), load(o), SR)
        sf.write(os.path.join(L, b + '_before.wav'), load(s), SR)
        y = eq(load(s)) * 10 ** (gain_db / 20); y = y * min(1.0, 10 ** (-1 / 20) / (np.abs(y).max() + 1e-9))
        sf.write(os.path.join(L, b + '_after.wav'), y, SR)
        rows.append((spk, b))
h = ['<!doctype html><meta charset="utf-8"><title>v1 음색 보정 비교</title><style>:root{--bg:#fff;--fg:#1a1a1a;--line:#ddd}@media (prefers-color-scheme:dark){:root{--bg:#161616;--fg:#eee;--line:#333}}body{background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,sans-serif;margin:16px}td,th{border:1px solid var(--line);padding:6px}table{border-collapse:collapse}audio{width:230px;height:32px}</style>',
     '<h1>v1 음색·음량 보정 비교</h1><ul><li>원본: 게임 원작 대사 / 보정 전: 현재 합성 / 보정 후: EQ + 고정 이득 %.1f dB</li><li>보정 후가 원본처럼 덜 먹먹하고 덜 작게 들리는지 확인해 주세요</li></ul><table><tr><th>화자</th><th>원본</th><th>보정 전</th><th>보정 후</th></tr>' % gain_db]
for spk, b in rows:
    h.append('<tr><td>%s</td>' % spk + ''.join('<td><audio controls preload="none" src="listen/%s_%s.wav"></audio></td>' % (b, k) for k in ('orig', 'before', 'after')) + '</tr>')
h.append('</table>')
open(os.path.join(OUT, '음색보정비교.html'), 'w', encoding='utf-8').write('\n'.join(h))
