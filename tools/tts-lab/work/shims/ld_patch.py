# Runner-side workaround: split_lang asks fast_langdetect for the 'full' fastText model (lid.176.bin, ~126MB,
# downloaded on first use). Not approved for this run, so force the 'lite' model bundled in the wheel (lid.176.ftz).
import fast_langdetect, fast_langdetect.infer as _inf
_orig = _inf.detect

def _detect(text, *args, **kwargs):
    kwargs['model'] = 'lite'
    if args:
        args = ()
    return _orig(text, **kwargs)

fast_langdetect.detect = _detect
_inf.detect = _detect
