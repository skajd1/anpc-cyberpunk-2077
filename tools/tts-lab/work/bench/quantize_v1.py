# Build int8 (dynamic, weight-only) variants of the Genie v1 model.
# Output dirs under genie/models: anpc_v1_q_t2s (GPT decoders int8), anpc_v1_q_all (GPT decoders + VITS int8)
import os, shutil, sys
import numpy as np, onnx
from onnxruntime.quantization import quantize_dynamic, QuantType
LAB_ROOT = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')  # 실험 폴더(모델·가상환경·원작 자료, Git 제외)
sys.stdout.reconfigure(encoding='utf-8')
M = os.path.join(LAB_ROOT, 'genie', 'models')
SRC = os.path.join(M, 'anpc_v1_s10_g15')
TMP = os.path.join(M, '_fp32_standalone'); os.makedirs(TMP, exist_ok=True)

FP16_BIN = {'t2s_first_stage_decoder_fp32.onnx': 't2s_shared_fp16.bin', 't2s_stage_decoder_fp32.onnx': 't2s_shared_fp16.bin',
            'vits_fp32.onnx': 'vits_fp16.bin', 'prompt_encoder_fp32.onnx': 'prompt_encoder_fp16.bin'}


def standalone(name):
    """Inject fp16 bin weights as fp32 into the graph (same as Genie's loader) and save a self-contained onnx."""
    out = os.path.join(TMP, name)
    if os.path.exists(out):
        return out
    mp = onnx.load(os.path.join(SRC, name), load_external_data=False)
    data = np.fromfile(os.path.join(SRC, FP16_BIN[name]), dtype=np.float16).astype(np.float32).tobytes()
    for t in mp.graph.initializer:
        if t.data_location == onnx.TensorProto.EXTERNAL:
            kv = {e.key: e.value for e in t.external_data}
            o, n = int(kv.get('offset', 0)), int(kv['length'])
            t.raw_data = data[o:o + n]
            del t.external_data[:]
            t.data_location = onnx.TensorProto.DEFAULT
    onnx.save(mp, out)
    return out


def folded(name):
    """Constant-fold (ORT basic level) so computed weights (Transpose / weight-norm) become initializers."""
    import onnxruntime as ort
    out = os.path.join(TMP, name.replace('.onnx', '.folded.onnx'))
    if not os.path.exists(out):
        so = ort.SessionOptions()
        so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
        so.optimized_model_filepath = out
        ort.InferenceSession(standalone(name), so, providers=['CPUExecutionProvider'])
    return out


def q(name, ops):
    src = folded(name)
    dst = os.path.join(TMP, name.replace('.onnx', '.int8f.onnx'))
    if not os.path.exists(dst):
        quantize_dynamic(src, dst, weight_type=QuantType.QInt8, op_types_to_quantize=ops, per_channel=True)
    print(name, '%.1f MB -> %.1f MB' % (os.path.getsize(src) / 2**20, os.path.getsize(dst) / 2**20), flush=True)
    return dst


def build(variant, quant):
    d = os.path.join(M, variant)
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    # encoder keeps its own fp32 external weights
    for f in ('t2s_encoder_fp32.onnx', 't2s_encoder_fp32.bin'):
        shutil.copy(os.path.join(SRC, f), d)
    for name in FP16_BIN:
        src = quant[name] if name in quant else standalone(name)
        shutil.copy(src, os.path.join(d, name))  # same file name, no fp16 bin -> Genie loads it directly
    print('built', variant, sorted(os.listdir(d)))


t2s = {n: q(n, ['MatMul', 'Gemm']) for n in ('t2s_first_stage_decoder_fp32.onnx', 't2s_stage_decoder_fp32.onnx')}
vits = {'vits_fp32.onnx': q('vits_fp32.onnx', ['MatMul', 'Gemm', 'Conv'])}
build('anpc_v1_fp32sa', {})
build('anpc_v1_q_t2s', t2s)
build('anpc_v1_q_all', {**t2s, **vits})
