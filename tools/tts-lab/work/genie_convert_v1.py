# Run Genie's v2ProPlus converter inside the GPT-SoVITS venv (reusing its torch).
# genie_tts/__init__.py would trigger the GenieData prompt and runtime imports, so register the
# package without executing __init__ and import only the converter submodule.
import os, sys, time, types, importlib.util, logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
LAB = LAB_ROOT
PKG = os.path.join(LAB, 'tools', 'genie_src', 'genie_tts')
spec = importlib.util.spec_from_file_location('genie_tts', os.path.join(PKG, '__init__.py'), submodule_search_locations=[PKG])
mod = importlib.util.module_from_spec(spec)
sys.modules['genie_tts'] = mod  # not executed on purpose
os.makedirs(os.path.join(LAB, 'genie', 'convwork'), exist_ok=True)
os.chdir(os.path.join(LAB, 'genie', 'convwork'))
from genie_tts.Converter.Converter import convert
import torch
LAB_ROOT = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')  # 실험 폴더(모델·가상환경·원작 자료, Git 제외)
print('torch', torch.__version__)
pm = os.path.join(LAB, 'GPT-SoVITS', 'GPT_SoVITS', 'pretrained_models')
FT = os.path.join(LAB, 'finetune_v1', 'ckpt')
out = os.path.join(LAB, 'genie', 'models', 'anpc_v1_s10_g15')
t0 = time.perf_counter()
convert(os.path.join(FT, 'anpc_v1-e15.ckpt'), os.path.join(FT, 'anpc_v1_e10_s2200.pth'), out)
print('CONVERT_TIME %.1fs' % (time.perf_counter() - t0))
for f in sorted(os.listdir(out)) if os.path.isdir(out) else []:
    print(f, os.path.getsize(os.path.join(out, f)))
