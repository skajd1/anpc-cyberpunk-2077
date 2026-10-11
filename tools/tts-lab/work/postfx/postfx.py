# Diagnose "thin" clones vs game originals, design per-language/per-engine EQ + loudness correction,
# apply it, re-measure. Uses only numpy/scipy/soundfile/librosa already in the GPT-SoVITS venv.
import os, sys, json, time, glob
import numpy as np, soundfile as sf, librosa
from scipy.signal import firwin2, lfilter, resample_poly, fftconvolve
LAB_ROOT = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')  # 실험 폴더(모델·가상환경·원작 자료, Git 제외)
sys.stdout.reconfigure(encoding='utf-8')
LAB = LAB_ROOT
O = os.path.join(LAB, 'output'); P = os.path.join(LAB, 'work', 'postfx')
SR = 32000
NTAPS = 511                      # linear-phase FIR, latency (N-1)/2 samples
CLAMP_DB = 8.0
LIMIT_DBFS = -1.0
PAD = (0.15, 0.25)               # Genie only
BANDS = [(80, 300), (300, 1000), (1000, 4000), (4000, 8000), (8000, 16000)]

# ---------------- metrics ----------------
def load(p):
    x, sr = sf.read(p, dtype='float64')
    if x.ndim > 1: x = x.mean(1)
    assert sr == SR, (p, sr)
    return x

def speech_mask(x, hop=512, n_fft=2048):
    S = np.abs(librosa.stft(x, n_fft=n_fft, hop_length=hop, window='hann')) ** 2
    e = 10 * np.log10(S.sum(0) + 1e-20)
    return S, e > e.max() - 40

def ltas(x):
    S, m = speech_mask(x)
    return S[:, m].mean(1)       # power per bin, n_fft=2048 -> 15.6 Hz bins

FREQS = np.fft.rfftfreq(2048, 1 / SR)

def band_ratios(L):
    tot = L[(FREQS >= 80)].sum()
    return [float(10 * np.log10(L[(FREQS >= a) & (FREQS < b)].sum() / tot)) for a, b in BANDS]

def centroid(L):
    m = FREQS >= 80
    return float((FREQS[m] * L[m]).sum() / L[m].sum())

def kweight(x, sr=SR):
    # ITU-R BS.1770-4 K-weighting (high shelf + RLB high-pass), coefficients for arbitrary sr
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / sr); Vh = 10 ** (G / 20); Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    y = lfilter(b, a, x)
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / sr)
    a = [1, 2 * (K * K - 1) / (1 + K / Q + K * K), (1 - K / Q + K * K) / (1 + K / Q + K * K)]
    return lfilter([1, -2, 1], a, y)

def lufs(x, sr=SR):
    y = kweight(x, sr)
    blk, hop = int(0.4 * sr), int(0.1 * sr)
    if len(y) < blk: y = np.pad(y, (0, blk - len(y)))
    z = np.array([np.mean(y[i:i + blk] ** 2) for i in range(0, len(y) - blk + 1, hop)])
    l = -0.691 + 10 * np.log10(z + 1e-20)
    g = z[l > -70]
    if len(g) == 0: return -70.0
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = z[(l > -70) & (l > rel)]
    return float(-0.691 + 10 * np.log10(g2.mean()))

def true_peak(x):
    return float(np.abs(resample_poly(x, 4, 1)).max())

def f0_stats(x):
    f0, vflag, vprob = librosa.pyin(x, fmin=55, fmax=400, sr=SR, frame_length=2048, hop_length=320)
    v = f0[vflag & ~np.isnan(f0)]
    if len(v) == 0: return dict(f0_med=None)
    return dict(f0_med=float(np.median(v)), f0_p5=float(np.percentile(v, 5)), f0_p95=float(np.percentile(v, 95)),
                f0_range_st=float(12 * np.log2(np.percentile(v, 95) / np.percentile(v, 5))), voiced_frames=int(len(v)))

def third_oct_centers():
    c = 1000 * 2 ** (np.arange(-16, 13) / 3)          # ~25 Hz .. 16 kHz
    return c[(c >= 50) & (c <= 15000)]

def to_third_oct_db(L):
    out = []
    for fc in third_oct_centers():
        lo, hi = fc * 2 ** (-1 / 6), fc * 2 ** (1 / 6)
        m = (FREQS >= lo) & (FREQS < hi)
        out.append(10 * np.log10(L[m].mean() + 1e-20) if m.any() else np.nan)
    return np.array(out)

def metrics(x):
    L = ltas(x)
    d = dict(dur=len(x) / SR, lufs=lufs(x), peak_dbfs=float(20 * np.log10(np.abs(x).max() + 1e-12)),
             true_peak_dbfs=float(20 * np.log10(true_peak(x) + 1e-12)), centroid_hz=centroid(L), bands_db=band_ratios(L))
    d.update(f0_stats(x))
    d['_third_oct'] = to_third_oct_db(L).tolist()
    return d

def ltas_distance(a, b):
    # RMS of level-aligned 1/3-octave LTAS difference over 100 Hz - 8 kHz
    c = third_oct_centers(); m = (c >= 100) & (c <= 8000)
    da, db = np.array(a['_third_oct'])[m], np.array(b['_third_oct'])[m]
    d = da - db; d -= d.mean()
    return float(np.sqrt(np.mean(d ** 2)))

# ---------------- design ----------------
def design_eq(orig, clone):
    Lo, Lc = ltas(orig), ltas(clone)
    c = third_oct_centers()
    do, dc = to_third_oct_db(Lo), to_third_oct_db(Lc)
    diff = do - dc
    # remove broadband level offset (loudness stage handles level): align on 300 Hz - 4 kHz
    m = (c >= 300) & (c <= 4000)
    diff -= np.nanmean(diff[m])
    diff = np.clip(np.nan_to_num(diff), -CLAMP_DB, CLAMP_DB)
    diff[c < 70] = 0.0           # do not boost/cut below 70 Hz (rumble)
    # gain curve for firwin2: 0 Hz .. Nyquist
    fpts = np.concatenate([[0], c, [SR / 2]])
    gdb = np.concatenate([[0.0], diff, [diff[-1]]])
    gain = 10 ** (gdb / 20)
    taps = firwin2(NTAPS, fpts / (SR / 2), gain, window='hann')
    return dict(third_oct_hz=c.tolist(), gain_db=diff.tolist(), fir_taps=taps.tolist(), ntaps=NTAPS,
                latency_samples=(NTAPS - 1) // 2, latency_ms=1000 * ((NTAPS - 1) // 2) / SR)

def apply(x, prm, pad):
    taps = np.array(prm['fir_taps'])
    y = fftconvolve(x, taps)[(len(taps) - 1) // 2:][:len(x)]          # linear-phase, delay-compensated offline
    g_l = prm['target_lufs'] - lufs(y)
    tp = true_peak(y)
    g_p = LIMIT_DBFS - 20 * np.log10(tp + 1e-12)
    g = min(g_l, g_p)
    y = y * 10 ** (g / 20)
    if pad:
        y = np.concatenate([np.zeros(int(PAD[0] * SR)), y, np.zeros(int(PAD[1] * SR))])
    return y, dict(gain_lufs_db=g_l, gain_peak_cap_db=g_p, gain_applied_db=g, peak_limited=bool(g_p < g_l))

# ---------------- run ----------------
SETS = {
    ('ja', 'PyTorch'): dict(orig='00_빅터원본_일본어.wav', pair='09_일본어참조_일본어_PyTorch_원본대사.wav', new=['01_', '02_', '03_', '04_']),
    ('ja', 'Genie'): dict(orig='00_빅터원본_일본어.wav', pair='09_일본어참조_일본어_Genie_원본대사.wav', new=['05_', '06_', '07_', '08_']),
    ('en', 'PyTorch'): dict(orig='00_빅터원본_영어.wav', pair='36_영어참조_영어_PyTorch_원본대사.wav', new=['30_', '31_', '32_']),
    ('en', 'Genie'): dict(orig='00_빅터원본_영어.wav', pair='36_영어참조_영어_Genie_원본대사.wav', new=['33_', '34_', '35_']),
}
files = sorted(f for f in os.listdir(O) if f.endswith('.wav') and '_보정' not in f)
report = {}
for (lang, eng), s in SETS.items():
    key = f'{lang}_{eng}'
    orig = load(os.path.join(O, s['orig'])); pair = load(os.path.join(O, s['pair']))
    mo = metrics(orig); mp = metrics(pair)
    news = [f for f in files if any(f.startswith(p) for p in s['new'])]
    mn = {f: metrics(load(os.path.join(O, f))) for f in news}
    t0 = time.process_time()
    eq = design_eq(orig, pair)
    t_design = time.process_time() - t0
    prm = dict(lang=lang, engine=eng, sample_rate=SR, source_pair=[s['orig'], s['pair']], clamp_db=CLAMP_DB,
               below_70hz='0 dB', target_lufs=mo['lufs'], limit_dbfs=LIMIT_DBFS, limit_mode='true-peak (4x oversampled) gain cap',
               pad_s=list(PAD) if eng == 'Genie' else [0, 0], design_cpu_s=t_design, **eq)
    st = None
    if mo.get('f0_med') and mp.get('f0_med'):
        st = 12 * np.log2(mp['f0_med'] / mo['f0_med'])
    prm['f0_diff_semitones_pair'] = st
    prm['pitch_shift_applied'] = False
    json.dump(prm, open(os.path.join(P, f'postfx_{key}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    out = {}
    for f in [s['pair']] + news:
        x = load(os.path.join(O, f))
        t0 = time.process_time(); w0 = time.perf_counter()
        y, info = apply(x, prm, eng == 'Genie')
        info['cpu_s'] = time.process_time() - t0; info['wall_s'] = time.perf_counter() - w0
        nf = f[:-4] + '_보정.wav'
        sf.write(os.path.join(O, nf), y, SR, subtype='PCM_16')
        before = mp if f == s['pair'] else mn[f]
        after = metrics(load(os.path.join(O, nf)))
        out[f] = dict(new_file=nf, before=before, after=after, apply=info,
                      ltas_dist_before=ltas_distance(mo, before), ltas_dist_after=ltas_distance(mo, after))
    report[key] = dict(original=mo, pair=s['pair'], files=out, f0_diff_st=st, eq_gain_db=eq['gain_db'], third_oct_hz=eq['third_oct_hz'])
    print(f'== {key}: F0 diff (pair vs orig) = {st:+.2f} st; design {t_design*1000:.1f} ms CPU')
    for f, r in out.items():
        b, a = r['before'], r['after']
        print(f"  {f[:40]:40s} LUFS {b['lufs']:6.1f}->{a['lufs']:6.1f} (orig {mo['lufs']:.1f}) TP {b['true_peak_dbfs']:5.1f}->{a['true_peak_dbfs']:5.1f} "
              f"cent {b['centroid_hz']:6.0f}->{a['centroid_hz']:6.0f} (orig {mo['centroid_hz']:.0f}) LTASdist {r['ltas_dist_before']:.2f}->{r['ltas_dist_after']:.2f} "
              f"cpu {r['apply']['cpu_s']*1000:.0f}ms")
json.dump(report, open(os.path.join(P, 'postfx_report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
