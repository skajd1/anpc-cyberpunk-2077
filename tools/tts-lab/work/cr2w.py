# Minimal CR2W (v195) reader for localization JsonResource files (voiceover map / subtitles).
import struct


def vlq(b, o):
    x = b[o]; o += 1
    neg = x & 0x80
    val = x & 0x3F
    shift = 6
    cont = x & 0x40
    while cont:
        x = b[o]; o += 1
        val |= (x & 0x7F) << shift
        shift += 7
        cont = x & 0x80
    return (-val if neg else val), o


def lpstring(b, o):
    n, o = vlq(b, o)
    if n < 0:
        s = b[o:o - n].decode("utf-8", "replace"); return s, o - n
    s = b[o:o + 2 * n].decode("utf-16-le", "replace"); return s, o + 2 * n


class CR2W:
    def __init__(self, b):
        self.b = b
        assert b[:4] == b"CR2W"
        tables = [struct.unpack_from("<III", b, 0x28 + 12 * i) for i in range(10)]
        s_off, s_size, _ = tables[0]
        self.strtab = b[s_off:s_off + s_size]
        n_off, n_cnt, _ = tables[1]
        self.names = []
        for i in range(n_cnt):
            so, h = struct.unpack_from("<II", b, n_off + 8 * i)
            self.names.append(self._str(so))
        i_off, i_cnt, _ = tables[2]
        self.imports = []
        for i in range(i_cnt):
            so, cls, fl = struct.unpack_from("<IHH", b, i_off + 8 * i)
            self.imports.append(self._str(so))
        e_off, e_cnt, _ = tables[4]
        self.exports = []
        for i in range(e_cnt):
            cls, flags, parent, size, off, tmpl, crc = struct.unpack_from("<HHIIIII", b, e_off + 24 * i)
            self.exports.append((self.names[cls], size, off))

    def _str(self, so):
        e = self.strtab.index(b"\0", so)
        return self.strtab[so:e].decode("utf-8", "replace")

    def read_props(self, o):
        """Read property list until name index 0. Returns (dict, offset)."""
        props = {}
        while True:
            ni = struct.unpack_from("<H", self.b, o)[0]
            if ni == 0:
                return props, o + 2
            ti, size = struct.unpack_from("<HI", self.b, o + 2)
            name, typ = self.names[ni], self.names[ti]
            vstart = o + 8
            vend = o + 4 + size
            props[name] = (typ, vstart, vend)
            o = vend
