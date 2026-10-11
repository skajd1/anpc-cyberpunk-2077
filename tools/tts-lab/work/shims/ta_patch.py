# Runner-side workaround: torchaudio>=2.9 routes torchaudio.load through torchcodec, which needs
# FFmpeg shared DLLs that are not installed. Load WAV via soundfile instead (same return shape).
import torch, soundfile as sf, torchaudio

def _load(path, *args, **kwargs):
    data, sr = sf.read(path, dtype='float32', always_2d=True)
    return torch.from_numpy(data.T.copy()), sr

torchaudio.load = _load
