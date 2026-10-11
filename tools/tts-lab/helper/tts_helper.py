# ANPC 개발 시험용 로컬 TTS 보조 프로세스 (Genie ONNX, 음성 출력 규격 4.2 스트리밍·버퍼링 재생)
# 127.0.0.1 루프백 전용. POST /speak, POST /stop, GET /status
# usage: python tts_helper.py [--port 47321] [--threads 4] [--model anpc_v1_q_t2s]
import os, sys, json, time, re, threading, queue, argparse, ctypes, zlib
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

# 실험 폴더(모델·가상환경·참조 음성·원작 자료). 코드는 저장소 tools/tts-lab에, 자료는 여기 둔다(Git 제외).
LAB = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')
DATA = os.path.join(LAB, 'helper')

ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=47321)
ap.add_argument('--threads', type=int, default=4)
ap.add_argument('--chunk', type=int, default=25, help='VITS로 바꾸는 GPT 토큰 묶음 크기(chunk_tokens)')
ap.add_argument('--ctx', type=int, default=10, help='묶음 경계에서 겹쳐 다시 변환하는 토큰 수(context_tokens)')
ap.add_argument('--spin', type=int, default=0, help='ONNX 스레드가 일을 기다릴 때 회전(1) 또는 잠듦(0). 0은 합성 CPU 약 27% 감소, 속도 약 3% 손해(2026-10-09 게임 밖 3회 측정)')
ap.add_argument('--model', default='anpc_v1_q_t2s')
ap.add_argument('--profiles', default=os.path.join(DATA, 'profiles.json'))
ap.add_argument('--log', default=os.path.join(DATA, 'helper_events.jsonl'))
ap.add_argument('--slots', default=os.path.join(r'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077', 'r6', 'audioware', 'ANPC', 'slots'),
                help='Audioware 슬롯 wav 폴더(output=slots)')
ap.add_argument('--crowd', default=os.path.join(DATA, 'crowd_voices.json'),
                help='군중 원작 목소리별 참조 음성 목록(work/build_crowd_voices.py로 만든 로컬 파일). 없으면 군중은 자막만')
ap.add_argument('--postfx', default='', help='음색 보정 JSON(postfx_v1.json). 비우면 보정 없음')
ap.add_argument('--watch', default=r'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077\bin\x64\plugins\cyber_engine_tweaks\mods\anpc\tts',
                help='CET가 req-<id>.json / stop.json을 쓰는 폴더. 빈 문자열이면 감시하지 않음')
ARGS = ap.parse_args()

os.environ['GENIE_DATA_DIR'] = os.path.join(LAB, 'genie', 'GenieData')
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['Max_Cached_Reference_Audio'] = '256'  # Genie 기본 10개 LRU는 넘치면 KeyError가 난다
os.environ['HF_HOME'] = os.path.join(LAB, 'tools', 'hf-home')
os.chdir(os.path.join(LAB, 'genie'))
sys.stdout.reconfigure(encoding='utf-8')
ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)  # BELOW_NORMAL (규격 6절)

import onnxruntime as ort
_Orig = ort.InferenceSession
class _Sess(_Orig):
    def __init__(self, p, sess_options=None, providers=None, **kw):
        sess_options = sess_options or ort.SessionOptions()
        sess_options.intra_op_num_threads = ARGS.threads
        sess_options.inter_op_num_threads = 1
        sess_options.add_session_config_entry('session.intra_op.allow_spinning', str(ARGS.spin))
        sess_options.add_session_config_entry('session.inter_op.allow_spinning', str(ARGS.spin))
        super().__init__(p, sess_options=sess_options, providers=providers, **kw)
ort.InferenceSession = _Sess
import numpy as np, sounddevice as sd
import genie_tts as genie
from genie_tts.ModelManager import model_manager
from genie_tts.GetPhonesAndBert import get_phones_and_bert
from genie_tts.Audio.ReferenceAudio import ReferenceAudio

# engine_profile 기본값 (규격 4.2)
SR = 32000
UNIT_MAX_CHARS, CHUNK, CTX, HOLD, XF = 80, ARGS.chunk, ARGS.ctx, 3, int(SR * 0.010)
RTF_PRIOR, SEC_PER_CHAR = 1.4, 0.16
SUBTITLE_WAIT = 3.0
LEAD, TAIL, PEAK = 0.15, 0.25, 10 ** (-1 / 20)
POSTFX = json.load(open(ARGS.postfx, encoding='utf-8')) if ARGS.postfx else None
FIR = np.array(POSTFX['fir_taps'], np.float32) if POSTFX else None
POST_GAIN = 10 ** (POSTFX['gain_db'] / 20) if POSTFX else 1.0
UNIT_GAP = {'normal': 0.30, 'fast': 0.20, 'slow': 0.45}

LOGF = open(ARGS.log, 'a', encoding='utf-8')
def log(**k):
    k['t'] = round(time.time(), 3); LOGF.write(json.dumps(k, ensure_ascii=False) + '\n'); LOGF.flush()
    print(json.dumps(k, ensure_ascii=False), flush=True)

t0 = time.time()
genie.load_character('anpc', os.path.join(LAB, 'genie', 'models', ARGS.model), 'Japanese')
model_manager.load_cn_hubert(); model_manager.load_sv_model()
M = model_manager.get('anpc')
PROFILES = json.load(open(ARGS.profiles, encoding='utf-8'))
# v2: {profiles: {pid: {refs: [{ref_id, emotion, wav, text}]}}}. 음성 출력 규격 4.1: (profile, emotion) -> (profile, neutral)
REFS = {}
for pid, p in PROFILES['profiles'].items():
    for ref in p['refs']:
        r = ReferenceAudio(prompt_wav=ref['wav'], prompt_text=ref['text'], language='Japanese')
        r.update_global_emb(prompt_encoder=M.PROMPT_ENCODER)
        REFS.setdefault(pid, {}).setdefault(ref['emotion'], []).append((ref['ref_id'], r))


# 군중(voice_profile_id=crowd): NPC의 원작 목소리 이름(voice_tag)과 같은 목소리의 원작 대사를 참조 음성으로 쓴다.
# 참조 음성은 처음 쓸 때 만들어 둔다(시작 때 수백 개를 모두 불러오지 않는다).
CROWD_PROFILE = 'crowd'
CROWD = json.load(open(ARGS.crowd, encoding='utf-8'))['voices'] if os.path.exists(ARGS.crowd) else {}
CROWD_CACHE, CROWD_LOCK = {}, threading.Lock()
VOICE_GROUP = re.compile(r'^([a-z0-9]+_[a-z0-9]+_[mf])_')


def crowd_voice(tag, gender, seed):
    # 정확히 같은 목소리 → 같은 이름으로 시작하는 목소리 → 같은 계층·성별(civ_mid_m 등) → 같은 성별의 시민 목소리.
    # 후보가 여럿이면 seed(같은 NPC면 같은 값)로 고정해 고른다.
    tag = (tag or '').lower()
    if tag in CROWD:
        return tag, 'exact'
    pick = lambda keys: sorted(keys)[zlib.crc32((seed or tag).encode('utf-8')) % len(keys)] if keys else None
    near = [k for k in CROWD if tag and (k.startswith(tag + '_') or tag.startswith(k))]
    if near:
        return pick(near), 'prefix'
    m = VOICE_GROUP.match(tag)
    # 목소리 이름 끝 두 자리는 나이대다(10은 아이). 대체 목소리는 같은 나이대가 아니면 성인만 쓴다.
    age = lambda k: int(k[-2:]) if k[-2:].isdigit() else 30
    want = age(tag) if re.search(r'_\d\d$', tag) else 30
    adult = lambda k: age(k) >= 20 or (want < 20 and age(k) < 20)
    # 대체 목소리는 일반 시민 계층에서만 고른다(괴짜·노숙인·중독자 등 특이 인물 목소리 제외).
    common = lambda k: k.startswith(('civ_low_', 'civ_mid_', 'civ_high_', 'civ_cbz_'))
    group = [k for k in CROWD if m and k.startswith(m.group(1) + '_') and adult(k)]
    if group:
        return pick(group), 'group'
    # 성별을 모르면(빈 값·None) 다른 성별 목소리가 나오지 않게 고르지 않는다.
    gl = (gender or '').lower()
    g = 'f' if gl.startswith('f') else 'm' if gl.startswith('m') else (m.group(1)[-1] if m else None)
    same = [k for k in CROWD if g and common(k) and ('_%s_' % g) in k[:12] and adult(k)]
    if same:
        return pick(same), 'gender'
    return None, None


def crowd_ref(vid):
    with CROWD_LOCK:
        if vid not in CROWD_CACHE:
            v = CROWD[vid]
            r = ReferenceAudio(prompt_wav=v['wav'], prompt_text=v['text'], language='Japanese')
            r.update_global_emb(prompt_encoder=M.PROMPT_ENCODER)
            CROWD_CACHE[vid] = r
        return CROWD_CACHE[vid]


def pick_ref(pid, emotion, req=None):
    if pid == CROWD_PROFILE and req is not None:
        vid, how = crowd_voice(req.get('voice_tag'), req.get('gender'), req.get('voice_seed'))
        if vid is None:
            return None, None
        return 'crowd:%s:%s' % (how, vid), crowd_ref(vid)
    by = REFS.get(pid)
    if not by:
        return None, None
    for e in (emotion, 'neutral'):
        if by.get(e):
            return by[e][0]
    return None, None


def split_units(text):
    sents = [s.strip() for s in re.findall(r'[^。！？…\n]+[。！？…]*|[。！？…]+', text) if s.strip()]
    units, cur = [], ''
    for s in sents:
        if cur and len(cur) + len(s) > UNIT_MAX_CHARS:
            units.append(cur); cur = s
        else:
            cur += s
    if cur:
        units.append(cur)
    return units


class Job:
    def __init__(self, req):
        self.req = req
        self.id = req.get('request_id', str(time.time()))
        self.cancel = threading.Event()
        self.q = queue.Queue()          # 재생 대기 조각 (np.float32) / None = 끝
        self.buffered = 0.0             # 큐에 쌓인 음성 길이(초)
        self.lock = threading.Lock()
        self.produced_chars = 0
        self.total_chars = len(req['speech_text'])
        self.rtf = RTF_PRIOR
        self.done_synth = False
        self.t = dict(accepted=time.time())
        self.stall = 0.0
        self.voice_ref = 0.0            # 입모양 구간 판정용 대사 음량 기준(지금까지 구간의 상위 RMS)
        self.state = 'synth'


CUR = {'job': None}
CUR_LOCK = threading.Lock()


def vocode(ref, text_seq, tok):
    return M.VITS.run(None, {'text_seq': text_seq, 'pred_semantic': tok, 'ge': ref.global_emb,
                             'ge_advanced': ref.global_emb_advanced})[0].reshape(-1).astype(np.float32)


def synth_unit(job, ref, text, emit):
    """규격 4.2-2: 단위 안 스트리밍 합성. emit(audio, done_chars_fraction)"""
    text_seq, text_bert = get_phones_and_bert('。' + text, language='Japanese')
    x, prompts = M.T2S_ENCODER.run(None, {'ref_seq': ref.phonemes_seq, 'text_seq': text_seq, 'ref_bert': ref.text_bert,
                                          'text_bert': text_bert, 'ssl_content': ref.ssl_content})
    y, y_emb, *kv = M.T2S_FIRST_STAGE_DECODER.run(None, {'x': x, 'prompts': prompts})
    start = y.shape[1]
    names = [i.name for i in M.T2S_STAGE_DECODER.get_inputs()]
    st = dict(emitted=0, tail=None)
    est_tokens = max(1.0, len(text) * SEC_PER_CHAR * 25)

    def flush(tok, done):
        n = tok.shape[-1]; e = st['emitted']
        b = n if done else n - HOLD
        a = max(0, e - CTX)
        if b <= e:
            return
        audio = vocode(ref, text_seq, tok[..., a:b])
        spt = len(audio) / (b - a)
        s0 = int(round((e - a) * spt))
        cut = len(audio) if done else int(round((b - a - 1) * spt))
        piece = audio[s0:cut].copy()
        if st['tail'] is not None:
            k = min(len(st['tail']), len(piece), XF)
            w = np.linspace(0, 1, k, dtype=np.float32)
            piece[:k] = piece[:k] * w + st['tail'][:k] * (1 - w)
        st['tail'] = None if done else audio[cut:cut + XF]
        st['emitted'] = b if done else b - 1
        emit(piece, 1.0 if done else min(0.99, st['emitted'] / est_tokens))

    idx = 0
    for idx in range(500):
        if job.cancel.is_set():
            return
        y, y_emb, stop, *kv = M.T2S_STAGE_DECODER.run(None, dict(zip(names, [y, y_emb, *kv])))
        if stop:
            break
        tok = y[:, start - 1:-1][None]
        if tok.shape[-1] - HOLD - st['emitted'] >= CHUNK:
            flush(tok, False)
    gen = y[:, -idx:].copy() if idx else y[:, -1:].copy()
    gen[0, -1] = 0
    tok = gen[None]
    bad = np.where(tok >= 1024)
    if len(bad[0]):
        tok = tok[..., :bad[-1][0]]
    flush(tok, True)


def synth_worker(job):
    req = job.req
    try:
        ref_id, ref = pick_ref(req.get('voice_profile_id'), req.get('emotion', 'neutral'), req)
    except Exception as e:
        log(ev='ref_failed', id=job.id, voice_tag=req.get('voice_tag'), err=repr(e)); ref_id, ref = None, None
    if ref is None:
        log(ev='voice_profile_missing', id=job.id, profile=req.get('voice_profile_id')); job.state = 'skipped'; job.q.put(None); return
    log(ev='ref', id=job.id, profile=req.get('voice_profile_id'), emotion=req.get('emotion'), ref_id=ref_id,
        voice_tag=req.get('voice_tag'), gender=req.get('gender'), voice_detail=(req.get('voice_detail') or '')[:3000] or None)
    units = split_units(req['speech_text'])
    gap = UNIT_GAP.get(req.get('delivery', 'normal'), 0.30)
    job.lead = 0.0 if req.get('output') == 'slots' else LEAD
    if job.lead:
        job.q.put(np.zeros(int(SR * LEAD), np.float32)); job.buffered += LEAD
    done_chars = 0
    for ui, u in enumerate(units):
        if job.cancel.is_set():
            break
        if ui:
            job.q.put(np.zeros(int(SR * gap), np.float32)); job.buffered += gap
        t_last = [time.time()]
        fir_tail = [np.zeros(0, np.float32)]
        def emit(piece, frac):
            now = time.time()
            if FIR is not None and len(piece):
                y = np.convolve(piece, FIR).astype(np.float32) * POST_GAIN
                y[:len(fir_tail[0])] += fir_tail[0]
                piece, fir_tail[0] = y[:len(piece)], y[len(piece):]
            peak = np.abs(piece).max() if len(piece) else 0
            if peak > PEAK:
                piece = piece * (PEAK / peak)
            dur = len(piece) / SR
            if dur > 0.2:
                job.rtf = (now - t_last[0]) / dur
            t_last[0] = now
            job.t.setdefault('first_chunk_ready', now)
            job.produced_chars = done_chars + int(len(u) * frac)
            with job.lock:
                job.buffered += dur
            job.q.put(piece)
        try:
            synth_unit(job, ref, u, emit)
        except Exception as e:
            log(ev='synthesis_failed', id=job.id, err=repr(e)); break
        done_chars += len(u)
    job.q.put(np.zeros(int(SR * TAIL), np.float32))
    job.done_synth = True
    job.q.put(None)


def wait_start(job):
    # 규격 4.2-4: 버퍼링 후 시작. 4.3: subtitle_wait 경과 시 조각 있으면 시작, 없으면 음성 버림
    while not job.cancel.is_set():
        rem = max(0, job.total_chars - job.produced_chars) * SEC_PER_CHAR
        need = max(0.0, (job.rtf - 1) * rem)
        waited = time.time() - job.t['accepted']
        have_chunk = 'first_chunk_ready' in job.t
        if job.done_synth or (have_chunk and job.buffered - job.lead >= need):
            return True
        if waited >= SUBTITLE_WAIT:
            if have_chunk:
                log(ev='start_by_deadline', id=job.id); return True
            log(ev='voice_dropped_deadline', id=job.id); job.state = 'dropped'; job.cancel.set(); return False
        time.sleep(0.02)
    return False


def play_worker(job):
    if not wait_start(job):
        return
    job.state = 'playing'; job.t['npc_first_audio'] = time.time()
    log(ev='play_start', id=job.id, wait=round(job.t['npc_first_audio'] - job.t['accepted'], 3),
        first_chunk=round(job.t.get('first_chunk_ready', 0) - job.t['accepted'], 3), rtf_est=round(job.rtf, 2))
    buf = np.zeros(0, np.float32); ended = [False]
    def cb(out, frames, ti, status):
        nonlocal buf
        while len(buf) < frames and not ended[0]:
            try:
                c = job.q.get_nowait()
            except queue.Empty:
                break
            if c is None:
                ended[0] = True
            else:
                buf = np.concatenate([buf, c])
                with job.lock:
                    job.buffered -= len(c) / SR
        n = min(frames, len(buf))
        out[:n, 0] = buf[:n]; out[n:, 0] = 0
        buf = buf[n:]
        if n < frames and not ended[0]:
            job.stall += (frames - n) / SR
        if ended[0] and not len(buf):
            raise sd.CallbackStop
    with sd.OutputStream(samplerate=SR, channels=1, dtype='float32', callback=cb, blocksize=1024) as s:
        while s.active and not job.cancel.is_set():
            time.sleep(0.02)
    job.t['playback_end'] = time.time()
    job.state = 'cancelled' if job.cancel.is_set() else 'done'
    log(ev='play_end', id=job.id, state=job.state, stall_ms=int(job.stall * 1000),
        total=round(job.t['playback_end'] - job.t['accepted'], 3))


SLOT_COUNT, NEXT_LEAD, CUT_WIN, QUIET, FADE, MIN_SEG = 8, 0.35, 0.30, 0.02, int(SR * 0.005), 0.5
SLOT_SEQ = [0]
# 합성이 재생보다 느려 끊길 수밖에 없을 때는 단어 중간이 아니라 쉼(PAUSE_MIN 이상 무음)에서 끊고,
# 그 쉼에서 남은 대사를 끊김 없이 이을 만큼 모일 때까지 최대 HOLD_MAX 더 기다린다.
PAUSE_RMS, PAUSE_MIN, HOLD_MAX, DECIDE_LEAD = 0.01, 0.12, 1.5, 0.08


def atomic_write(path, writer, tries=20):
    tmp = path + '.tmp'
    writer(tmp)
    for i in range(tries):
        try:
            os.replace(tmp, path); return True
        except PermissionError:
            time.sleep(0.01)
    return False


def write_wav(path, audio):
    import wave
    pcm = (np.clip(audio, -1, 1) * 32767).astype('<i2').tobytes()
    def w(tmp):
        with wave.open(tmp, 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm)
    return atomic_write(path, w)


def quiet_cut(audio):
    # 끝 CUT_WIN 안에서 가장 조용한 QUIET 창의 가운데에서 자른다(구간 경계를 단어 사이 쉼에 둔다).
    n, win = len(audio), int(SR * QUIET)
    lo = max(int(SR * MIN_SEG) - win, n - int(SR * CUT_WIN))
    if n - lo < win * 2:
        return n
    best, at = None, n
    for s0 in range(lo, n - win, win // 2):
        e = float(np.mean(audio[s0:s0 + win] ** 2))
        if best is None or e < best:
            best, at = e, s0 + win // 2
    return at


VOICE_HOP, VOICE_FLOOR, VOICE_REL, VOICE_GAP, VOICE_MIN = int(SR * 0.02), 0.012, 0.15, 0.2, 0.08


def voiced_spans(job, seg):
    # UF-75 입모양: 20ms RMS가 기준(대사 상위 음량의 15%, 최소 -38dBFS)을 넘는 구간(ms). 0.2초 미만 쉼은 잇고 0.08초 미만 소리는 버린다.
    n = len(seg) // VOICE_HOP
    if not n:
        return []
    rms = np.sqrt(np.mean(seg[:n * VOICE_HOP].reshape(n, VOICE_HOP) ** 2, axis=1))
    job.voice_ref = max(job.voice_ref, float(np.percentile(rms, 95)))
    on = np.concatenate([[False], rms > max(VOICE_FLOOR, job.voice_ref * VOICE_REL), [False]])
    edges = np.flatnonzero(on[1:] != on[:-1])
    spans = []
    for a, b in zip(edges[::2], edges[1::2]):
        if spans and (a - spans[-1][1]) * VOICE_HOP < SR * VOICE_GAP:
            spans[-1][1] = b
        else:
            spans.append([a, b])
    ms = VOICE_HOP * 1000 / SR
    return [[int(a * ms), int(b * ms)] for a, b in spans if (b - a) * VOICE_HOP >= SR * VOICE_MIN]


def stall_need(job):
    # 지금부터 끝까지 끊기지 않으려면 미리 쌓여 있어야 하는 음성 길이(초). wait_start와 같은 추정.
    rem = max(0, job.total_chars - job.produced_chars) * SEC_PER_CHAR
    return max(0.0, (job.rtf - 1) * rem)


def last_pause(audio):
    # 마지막 쉼(20ms RMS < PAUSE_RMS가 PAUSE_MIN 이상)의 가운데 위치. 맨 앞 쉼은 없음으로 본다(앞 구간 끝과 같은 쉼).
    n = len(audio) // VOICE_HOP
    if not n:
        return None
    rms = np.sqrt(np.mean(audio[:n * VOICE_HOP].reshape(n, VOICE_HOP) ** 2, axis=1))
    quiet = np.concatenate([[False], rms < PAUSE_RMS, [False]])
    edges = np.flatnonzero(quiet[1:] != quiet[:-1])
    for a, b in reversed(list(zip(edges[::2], edges[1::2]))):
        if (b - a) * VOICE_HOP >= SR * PAUSE_MIN:
            at = (a + b) // 2 * VOICE_HOP
            return at if a > 0 else None
    return None


def segment_worker(job):
    # 설계안 A: 버퍼링 시작 조건을 채우면 쌓인 음성을 구간으로 묶어 Audioware 슬롯에 쓰고 tts/seg-<id>-<n>.json으로 알린다.
    if not wait_start(job):
        return
    pending, ended, n, t_end = np.zeros(0, np.float32), False, 0, 0.0
    at_pause, mid_stall = True, 0.0  # 앞 구간이 쉼에서 끝났는지, 단어 중간 끊김 합계
    def pull():
        nonlocal pending, ended
        while True:
            try:
                c = job.q.get_nowait()
            except queue.Empty:
                return
            if c is None:
                ended = True; return
            pending = np.concatenate([pending, c])
            with job.lock:
                job.buffered -= len(c) / SR
    while not job.cancel.is_set():
        pull()
        now = time.time()
        if n and now < t_end - NEXT_LEAD:
            time.sleep(0.02); continue
        if not len(pending) and ended:
            break
        behind = not ended and len(pending) / SR < stall_need(job)
        pause = last_pause(pending) if behind else None
        if n and behind:
            if now < t_end - DECIDE_LEAD:
                # 앞 구간 재생 중: 마지막 순간까지 모은 뒤 쉼에서 자른다.
                time.sleep(0.02); continue
            held = now - t_end
            if at_pause and held < HOLD_MAX:
                # 쉼에서 멈춘 상태: 남은 대사를 끊김 없이 이을 만큼 모이거나 HOLD_MAX가 될 때까지 기다린다.
                time.sleep(0.02); continue
            if not at_pause and pause is None and held < HOLD_MAX:
                # 단어 중간에서 짧게 여러 번 끊기지 않게, 다음 쉼까지 합성될 때까지(최대 HOLD_MAX) 한 번에 모은다.
                time.sleep(0.02); continue
            if pause is None and len(pending) < SR * 0.1:
                time.sleep(0.02); continue
        elif n and not ended and len(pending) < SR * MIN_SEG and (now < t_end - 0.05 or len(pending) < SR * 0.1):
            # 최소 구간 길이를 채울 때까지 기다리되, 앞 구간이 곧 끝나면 있는 만큼 보낸다.
            time.sleep(0.02); continue
        if n and now > t_end and not at_pause:
            mid_stall += now - t_end
        if ended:
            cut, at_pause = len(pending), True
        elif behind and pause is not None:
            cut, at_pause = pause, True
        else:
            cut = len(pending) if len(pending) < SR * MIN_SEG else quiet_cut(pending)
            at_pause = False
        seg, pending = pending[:cut].copy(), pending[cut:]
        final = ended and not len(pending)
        if n and len(seg) > 2 * FADE:
            seg[:FADE] *= np.linspace(0, 1, FADE, dtype=np.float32)
        if not final and len(seg) > 2 * FADE:
            seg[-FADE:] *= np.linspace(1, 0, FADE, dtype=np.float32)
        slot = SLOT_SEQ[0] % SLOT_COUNT; SLOT_SEQ[0] += 1
        if not write_wav(os.path.join(ARGS.slots, f'slot_{slot}.wav'), seg):
            log(ev='slot_write_failed', id=job.id, slot=slot); break
        n += 1
        dur = len(seg) / SR
        info = json.dumps({'request_id': job.id, 'seq': n, 'slot': slot, 'dur_ms': int(dur * 1000), 'final': final,
                           'talk': voiced_spans(job, seg)})
        def wj(tmp):
            with open(tmp, 'w', encoding='utf-8') as f:
                f.write(info)
        atomic_write(os.path.join(ARGS.watch, f'seg-{job.id}-{n}.json'), wj)
        now = time.time()
        if n == 1:
            job.state = 'playing'; job.t['npc_first_audio'] = now; t_end = now + 0.05
            log(ev='seg_start', id=job.id, wait=round(now - job.t['accepted'], 3),
                first_chunk=round(job.t.get('first_chunk_ready', now) - job.t['accepted'], 3), rtf_est=round(job.rtf, 2))
        if now > t_end and n > 1:
            job.stall += now - t_end
        t_end = max(t_end, now) + dur
        log(ev='seg', id=job.id, seq=n, slot=slot, dur=round(dur, 2), final=final, pause=at_pause, behind=behind)
        if final:
            break
    job.t['playback_end'] = t_end
    job.state = 'cancelled' if job.cancel.is_set() else 'done'
    log(ev='seg_end', id=job.id, state=job.state, segments=n, stall_ms=int(job.stall * 1000), mid_stall_ms=int(mid_stall * 1000),
        total=round(t_end - job.t['accepted'], 3))


def start_job(req):
    with CUR_LOCK:
        if CUR['job']:
            CUR['job'].cancel.set()
        job = Job(req); CUR['job'] = job
    log(ev='accepted', id=job.id, profile=req.get('voice_profile_id'), emotion=req.get('emotion'), chars=job.total_chars)
    threading.Thread(target=synth_worker, args=(job,), daemon=True).start()
    out = segment_worker if req.get('output') == 'slots' and ARGS.slots and ARGS.watch else play_worker
    threading.Thread(target=out, args=(job,), daemon=True).start()
    return job


class H(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

    def do_POST(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
        except Exception:
            return self._send(400, {'error': 'bad_json'})
        if self.path == '/speak':
            if not isinstance(body.get('speech_text'), str) or not body['speech_text'].strip():
                return self._send(400, {'error': 'speech_text_invalid'})
            job = start_job(body)
            return self._send(200, {'accepted': True, 'request_id': job.id})
        if self.path == '/stop':
            with CUR_LOCK:
                if CUR['job']:
                    CUR['job'].cancel.set()
            return self._send(200, {'stopped': True})
        self._send(404, {'error': 'not_found'})

    def do_GET(self):
        if self.path == '/status':
            j = CUR['job']
            return self._send(200, {'ready': True, 'profiles': {k: sorted(v) for k, v in REFS.items()},
                                    'job': None if not j else {'request_id': j.id, 'state': j.state,
                                                               **{k: round(v - j.t['accepted'], 3) for k, v in j.t.items() if k != 'accepted'}}})
        self._send(404, {'error': 'not_found'})

    def log_message(self, *a):
        pass


# 규격 4.4: 「ヴィー」가 들어간 고정 문장으로 1회 예열
_pid = next(iter(REFS)); w = Job({'speech_text': 'よう、ヴィー。', 'voice_profile_id': _pid})
synth_unit(w, pick_ref(_pid, 'neutral')[1], 'よう、ヴィー。', lambda a, f: None)
def stop_current():
    with CUR_LOCK:
        if CUR['job']:
            CUR['job'].cancel.set()


def watch_folder(d):
    """CET 파일 요청: stop.json → 현재 음성 중단, req-<id>.json → 새 음성. 읽은 파일은 지운다."""
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):  # 이전 실행에서 남은 요청은 재생하지 않는다
        try: os.remove(os.path.join(d, f))
        except OSError: pass
    beat = 0.0
    while True:
        if time.time() - beat >= 1.0:
            beat = time.time()
            atomic_write(os.path.join(d, 'alive.txt'), lambda tmp: open(tmp, 'w').write(str(int(beat))))
        try:
            names = sorted(os.listdir(d))
        except OSError:
            time.sleep(0.5); continue
        for name in names:
            if not name.endswith('.json') or name.startswith('seg-'):
                continue
            path = os.path.join(d, name)
            try:
                with open(path, encoding='utf-8') as fh:
                    body = json.load(fh)
                os.remove(path)
            except (OSError, ValueError) as e:
                log(ev='watch_read_failed', file=name, err=repr(e));
                try: os.remove(path)
                except OSError: pass
                continue
            if name == 'stop.json':
                stop_current(); log(ev='stop')
            elif name.startswith('req-') and isinstance(body.get('speech_text'), str) and body['speech_text'].strip():
                start_job(body)
        time.sleep(0.05)


if ARGS.watch:
    threading.Thread(target=watch_folder, args=(ARGS.watch,), daemon=True).start()
log(ev='ready', load_s=round(time.time() - t0, 2), profiles={k: sorted(v) for k, v in REFS.items()}, crowd_voices=len(CROWD), port=ARGS.port, threads=ARGS.threads, model=ARGS.model, watch=ARGS.watch)
ThreadingHTTPServer(('127.0.0.1', ARGS.port), H).serve_forever()
