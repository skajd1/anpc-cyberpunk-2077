# UF-75 말하기 입모양 자원 빌드(로컬 전용). 사용자 PC의 설치된 게임 파일만 쓰며 결과물은 저장소·배포물에 넣지 않는다.
# 원작 일본어 립싱크 클립(AdditiveFromRefPose, 344관절)을 원작 얼굴 표정 묶음에 idle__anpc_talk_0N__<성별>로 옮기고,
# 표정 대응표(facial_reactions_<성별>.csv)에 분류 4번 행을 추가해 FacialReaction(category=4, idle=N)으로 재생되게 한다.
# usage: python build_talk.py <repo_root>   → <repo>/game/archive/ANPC_talk.local.archive
import base64, copy, glob, json, os, shutil, subprocess, sys
LAB_ROOT = os.environ.get('ANPC_TTS_LAB') or os.path.join(os.path.expanduser('~'), 'anpc-tts-lab')  # 실험 폴더(모델·가상환경·원작 자료, Git 제외)

LAB = LAB_ROOT
WK = [os.path.join(LAB, 'tools', 'dotnet10', 'dotnet.exe'), os.path.join(LAB, 'tools', 'wolvenkit', 'WolvenKit.CLI.dll')]
ENV = dict(os.environ, DOTNET_ROOT=os.path.join(LAB, 'tools', 'dotnet10'))
GAME = r'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077\archive\pc\content'
REPO = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
WORK = os.path.join(LAB, 'work', 'lipsync')
RAW, OUT = os.path.join(WORK, 'raw'), os.path.join(WORK, 'pack')
CATEGORY = 4
# (립싱크 묶음 경로 정규식, 클립 이름) — 주디(여성)·잭키(남성) 일본어 대사 5.7~7.7초
CLIPS = {
    'female': (r'jp-jp.lipsync.base.quest.side_quests.sq026.scenes.sq026_07_judys.judy\.anims$',
               ['f_1A0FBD86992B6000', 'f_1A1031F6532B6000', 'f_1A0FB99F292B6000']),
    'male': (r'jp-jp.lipsync.base.quest.main_quests.prologue.q00[0-5].*jackie\.anims$',
             ['f_1730EF72F44B6000', 'f_16902308362EF000', 'f_18BC396C432EF000']),
}
FACIAL = {
    'male': r'base\animations\facial\male_average\interactive_scene\generic_average_male_facial_idle.anims',
    'female': r'base\animations\facial\female_average\interactive_scene\generic_average_female_facial_idle.anims',
}
CSV = {g: r'base\animations\anim_motion_database\facial_reactions_%s.csv' % g for g in ('male', 'female')}


def wk(*args):
    r = subprocess.run(WK + list(args) + ['-v', 'Minimal'], env=ENV, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0 or 'Error' in r.stdout:
        raise RuntimeError(' '.join(args[:2]) + '\n' + r.stdout[-800:] + r.stderr[-800:])
    return r.stdout


def extract(archive, regex):
    wk('extract', os.path.join(GAME, archive), '-o', RAW, '-r', regex)


def serialize(path):
    wk('convert', 's', path)
    return json.load(open(path + '.json', encoding='utf-8'))


def handle_ids(node, found, key='HandleId'):
    if isinstance(node, dict):
        if key in node:
            found.append(int(node[key]))
        for v in node.values():
            handle_ids(v, found, key)
    elif isinstance(node, list):
        for v in node:
            handle_ids(v, found, key)
    return found


# 버퍼 번호는 파일 전체(데이터 덩어리·임시 버퍼)에서 공통이다. 옮긴 항목의 버퍼 번호를 새로 매긴다.
def renumber_buffers(node, start):
    count = [start]
    def walk(n):
        if isinstance(n, dict):
            if 'BufferId' in n:
                n['BufferId'] = str(count[0]); count[0] += 1
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)
    walk(node)
    return count[0]


# 다른 파일에서 옮긴 항목의 핸들 번호는 대상 파일 안에서 겹치지 않게 다시 매긴다.
def renumber(node, start):
    mapping = {}
    def walk(n):
        if isinstance(n, dict):
            if 'HandleId' in n:
                old = n['HandleId']
                mapping.setdefault(old, str(start + len(mapping)))
                n['HandleId'] = mapping[old]
            if 'HandleRefId' in n:
                n['HandleRefId'] = mapping.get(n['HandleRefId'], n['HandleRefId'])
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)
    walk(node)
    return start + len(mapping)


def chunk_bytes(root, address):
    data = base64.b64decode(root['animationDataChunks'][address['unkIndex']]['buffer']['Bytes'])
    return data[address['fsetInBytes']:address['fsetInBytes'] + address['zeInBytes']]


shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(RAW, exist_ok=True)
extract('basegame_4_animation.archive', r'facial.(male|female)_average.interactive_scene.generic_average_(male|female)_facial_idle\.anims$')
extract('basegame_4_gamedata.archive', r'facial_reactions_(male|female)\.csv$')
report = {}
for gender, (regex, names) in CLIPS.items():
    extract('lang_ja_voice.archive', regex)
    sources = {}
    for path in glob.glob(os.path.join(RAW, 'base', 'localization', 'jp-jp', 'lipsync', '**', '*.anims'), recursive=True):
        if not __import__('re').search(regex, path.replace('\\', '/').replace('/', '.')):
            continue
        root = serialize(path)['Data']['RootChunk']
        for entry in root['animations']:
            name = entry['Data']['animation']['Data']['name']['$value']
            if name in names and name not in sources:
                sources[name] = (root, entry)
    missing = [n for n in names if n not in sources]
    if missing:
        raise SystemExit('립싱크 클립 없음: %s %s' % (gender, missing))

    facial_path = os.path.join(RAW, FACIAL[gender])
    facial = serialize(facial_path)
    root = facial['Data']['RootChunk']
    added = []
    next_handle = max(handle_ids(facial, [0])) + 1
    next_buffer = max(handle_ids(facial, [0], 'BufferId')) + 1
    for i, name in enumerate(names, 1):
        src_root, src_entry = sources[name]
        entry = copy.deepcopy(src_entry)
        next_handle = renumber(entry, next_handle)
        next_buffer = renumber_buffers(entry, next_buffer)
        anim = entry['Data']['animation']['Data']
        buf = anim['animBuffer']['Data']
        data = chunk_bytes(src_root, buf['dataAddress'])
        chunk = copy.deepcopy(root['animationDataChunks'][0])
        chunk['buffer']['Bytes'] = base64.b64encode(data).decode()
        chunk['buffer']['BufferId'] = str(next_buffer); next_buffer += 1
        root['animationDataChunks'].append(chunk)
        buf['dataAddress'] = {'$type': 'animAnimDataAddress', 'fsetInBytes': 0, 'unkIndex': len(root['animationDataChunks']) - 1, 'zeInBytes': len(data)}
        talk = 'idle__anpc_talk_%02d__%s' % (i, gender)
        anim['name'] = {'$type': 'CName', '$storage': 'string', '$value': talk}
        root['animations'].append(entry)
        added.append({'idle': i, 'name': talk, 'source': name, 'duration': round(anim['duration'], 2)})
    json.dump(facial, open(facial_path + '.json', 'w', encoding='utf-8'), ensure_ascii=False)

    csv_path = os.path.join(RAW, CSV[gender])
    table = serialize(csv_path)
    rows = table['Data']['RootChunk']['data']
    rows[:] = [r for r in rows if r[0] != str(CATEGORY)]
    neutral = 'idle__neutral__%s' % gender
    for a in added:
        rows.append([str(CATEGORY), str(a['idle']), a['name'], 'undefined', neutral])
    # 게임은 미리 컴파일된 행(compiledData)을 읽을 수 있어 같은 행을 함께 넣는다.
    if 'compiledData' in table['Data']['RootChunk']:
        table['Data']['RootChunk']['compiledData'] = copy.deepcopy(rows)
    json.dump(table, open(csv_path + '.json', 'w', encoding='utf-8'), ensure_ascii=False)

    for path in (facial_path, csv_path):
        wk('convert', 'd', path + '.json')
        rel = os.path.relpath(path, RAW)
        dest = os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(path, dest)
    report[gender] = added

os.makedirs(os.path.join(REPO, 'game', 'archive'), exist_ok=True)
wk('pack', OUT, '-o', os.path.join(WORK, 'packed'))
packed = glob.glob(os.path.join(WORK, 'packed', '*.archive'))
if len(packed) != 1:
    raise SystemExit('아카이브 생성 실패: %s' % packed)
target = os.path.join(REPO, 'game', 'archive', 'ANPC_talk.local.archive')
shutil.copyfile(packed[0], target)
json.dump(report, open(os.path.join(WORK, 'talk_report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False))
print(target)
