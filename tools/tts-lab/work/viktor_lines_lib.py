import cr2w, rdar, os, struct


def parse_subs(b):
    c = cr2w.CR2W(b)
    out = {}
    for cls, size, off in c.exports:
        if cls != 'localizationPersistenceSubtitleEntries':
            continue
        props, _ = c.read_props(off + 1)
        typ, s, e = props['entries']
        n = struct.unpack_from('<I', b, s)[0]
        o = s + 4
        for i in range(n):
            assert b[o] == 0, (o, b[o])
            o += 1
            rec = {}
            while True:
                ni = struct.unpack_from('<H', b, o)[0]
                if ni == 0:
                    o += 2
                    break
                ti, size = struct.unpack_from('<HI', b, o + 2)
                name, t = c.names[ni], c.names[ti]
                vs = o + 8
                if t in ('CRUID', 'Uint64'):
                    rec[name] = struct.unpack_from('<Q', b, vs)[0]
                elif t == 'String':
                    rec[name] = cr2w.lpstring(b, vs)[0]
                else:
                    rec[name] = (t, b[vs:o + 4 + size].hex())
                o = o + 4 + size
            out[rec.get('stringId')] = rec
    return out



def load_subs(G):
    subs = {}
    for arc in ['content', 'ep1']:
        a = rdar.Archive(os.path.join(G, arc, 'lang_ja_text.archive'))
        for h in a.files:
            d = a.read(h)
            if b'localizationPersistenceSubtitleEntries' in d[:3000]:
                for k, v in parse_subs(d).items():
                    v['_file'] = '%s:%016x' % (arc, h)
                    subs[k] = v
    return subs
