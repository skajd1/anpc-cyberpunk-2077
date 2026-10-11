import json, librosa, soundfile as sf, numpy as np, sys
sys.stdout.reconfigure(encoding='utf-8')
r = json.load(open('cand/candidates.json', encoding='utf-8'))[16]
y, sr = librosa.load(r['wav'], sr=32000, mono=True)
sf.write('../output/viktor_ref_ja.wav', y, 32000, subtype='PCM_16')
lines = [
    'transcript: ' + r['ja'],
    'source_archive: Cyberpunk 2077\\archive\\pc\\' + r['arc'][0] + '\\lang_ja_voice.archive',
    'source_path_in_archive: ' + r['path'],
    'string_id (CRUID): 0x' + r['sid'],
    'subtitle_source: lang_ja_text.archive (' + r['subfile'] + ', localizationPersistenceSubtitleEntries; femaleVariant == maleVariant)',
    'conversion: Wwise Vorbis 48kHz mono (.wem) -> vgmstream-cli r2117 WAV -> librosa resample 32kHz mono PCM16, no trimming',
    'duration_sec: %.3f' % (len(y) / 32000),
]
open('../output/viktor_ref_ja.txt', 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('\n'.join(lines), 'peak', np.abs(y).max())
