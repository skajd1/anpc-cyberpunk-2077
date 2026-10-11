# Minimal read-only reader for Cyberpunk 2077 RDAR (.archive) files.
# Uses kraken.dll shipped in the WolvenKit.Console zip for KARK (Oodle Kraken) segments.
import ctypes, struct, os
LAB_ROOT = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')  # 실험 폴더(모델·가상환경·원작 자료, Git 제외)

KRAKEN = ctypes.CDLL(os.path.join(LAB_ROOT, 'tools', 'wolvenkit', 'kraken.dll'))
KRAKEN.Kraken_Decompress.argtypes = [ctypes.c_char_p, ctypes.c_size_t, ctypes.c_char_p, ctypes.c_size_t]
KRAKEN.Kraken_Decompress.restype = ctypes.c_int


def fnv1a64(s: str) -> int:
    h = 0xCBF29CE484222325
    for b in s.lower().replace("/", "\\").encode("utf-8"):
        h ^= b
        h = (h * 0x100000001B3) & 0xFFFFFFFFFFFFFFFF
    return h


class Archive:
    def __init__(self, path):
        self.path = path
        self.f = open(path, "rb")
        hdr = self.f.read(40)
        magic, ver, idx_pos, idx_size = struct.unpack_from("<4sIQI", hdr)
        assert magic == b"RDAR", magic
        self.f.seek(idx_pos)
        idx = self.f.read(idx_size)
        ft_off, ft_size, crc, n_files, n_segs, n_deps = struct.unpack_from("<IIQIII", idx, 0)
        off = 28
        self.files = {}
        for i in range(n_files):
            h, ts, ninline, s0, s1, d0, d1 = struct.unpack_from("<QqIIIII", idx, off)
            self.files[h] = (ninline, s0, s1)
            off += 56
        self.segs = []
        for i in range(n_segs):
            self.segs.append(struct.unpack_from("<QII", idx, off))
            off += 16

    def _seg(self, i):
        o, zs, s = self.segs[i]
        self.f.seek(o)
        data = self.f.read(zs)
        if zs == s:
            return data
        assert data[:4] == b"KARK", data[:4]
        usize = struct.unpack_from("<I", data, 4)[0]
        out = ctypes.create_string_buffer(usize + 64)
        r = KRAKEN.Kraken_Decompress(data[8:], len(data) - 8, out, usize)
        assert r == usize, (r, usize)
        return out.raw[:usize]

    def read(self, h, main_only=False):
        ninline, s0, s1 = self.files[h]
        end = s0 + 1 if main_only else s1
        return b"".join(self._seg(i) for i in range(s0, end))

    def info(self, h):
        ninline, s0, s1 = self.files[h]
        return [self.segs[i] for i in range(s0, s1)]
