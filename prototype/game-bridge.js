// 게임 실시험용 로컬 브리지. 제품 통신(ANPC.Native.dll)을 대신하는 개발 경로다.
// CET가 모드 폴더의 bridge/req-<id>.json을 쓰면 웹 시제품과 같은 엔진·프롬프트로 응답을 만들어
// bridge/res-<id>.txt에 쓴다. 1줄 요청 토큰, 2줄 ok | ok:end | error:<code>, 나머지는 NPC 대사다.
// 토큰은 게임 재시작으로 요청 번호가 겹칠 때 이전 응답을 잘못 읽지 않게 한다.
// API 키는 .env 또는 환경 변수의 OPENAI_API_KEY만 읽고 파일·로그에 쓰지 않는다. 대사 원문도 로그에 남기지 않는다.
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadLocalEnvironment, loadPrototypeData } from './server.js';
import { generateOpenAI, ProviderError } from './openai.js';
import { CodexConnection } from './codex-connection.js';
import { ScenarioEngine, withTestCrowds } from './public/scenario.js';
import { mockGenerate } from './public/core.js';

const { values: options } = parseArgs({ options: {
  game: { type: 'string', default: process.env.ANPC_GAME_ROOT ?? 'C:/Program Files (x86)/Steam/steamapps/common/Cyberpunk 2077' },
  provider: { type: 'string' },
  model: { type: 'string', default: process.env.ANPC_MODEL },
  story: { type: 'string', default: 'late_open' },
  env: { type: 'string' }
} });

loadLocalEnvironment(...(options.env ? [options.env] : []));
const provider = options.provider ?? (process.env.OPENAI_API_KEY ? 'openai' : 'codex');
if (!['openai', 'codex', 'mock'].includes(provider)) throw new Error('--provider는 openai, codex, mock 중 하나입니다.');
if (provider === 'openai' && !process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY가 없습니다. .env 또는 환경 변수에 설정하세요.');
const model = options.model ?? (provider === 'openai' ? 'gpt-4.1-mini' : '');
const dir = join(options.game, 'bin/x64/plugins/cyber_engine_tweaks/mods/anpc/bridge');

const data = await loadPrototypeData();
const bundle = withTestCrowds(data.research, data.personas);
const preset = options.story === 'none' ? null : bundle.storyPolicy.presets.find(p => p.id === options.story);
if (options.story !== 'none' && !preset) throw new Error(`알 수 없는 --story: ${options.story}`);
const codex = provider === 'codex' ? new CodexConnection() : null;
const generate = provider === 'openai'
  ? args => generateOpenAI({ ...args, apiKey: process.env.OPENAI_API_KEY, model, reasoningEffort: 'none' })
  : provider === 'codex' ? args => codex.generate({ prompt: args.prompt, model, signal: args.signal }) : mockGenerate;

// 군중은 창작 시험 카드(주민)로 대신한다. 게임 군중별 생성 특성은 아직 연결하지 않았다.
const CROWD_KEY = 'resident';
function settingsFor(card) {
  return () => ({ allowDraft: true, storyState: preset ? { fields: preset.fields } : null, configuration: 'full',
    phase: card.phase_labels[0], relationshipStage: preset?.relationship_stages?.[card.character_key] ?? card.relationship_stages?.[0]?.id,
    alive: true, free: true, basicKnowledge: true, relicKnown: false, relicDisclosed: false, outfitId: 'plain', outfitVisible: false,
    publicRecognition: false, minorFiction: false, selectActions: false });
}

const sessions = new Map();
function engineFor(request) {
  const existing = sessions.get(request.session);
  if (existing) return existing;
  const key = request.crowd ? CROWD_KEY : request.npc_key;
  const card = bundle.cards.find(c => c.character_key === key);
  if (!card) throw new ProviderError('community_profile_missing');
  const engine = new ScenarioEngine({ bundle, npcKey: key, settings: settingsFor(card), base: data.base, notify: () => {} });
  try { engine.start(key); } catch { throw new ProviderError('story_blocked'); }
  sessions.set(request.session, engine);
  return engine;
}

async function respond(request, status, text = '') {
  const target = join(dir, `res-${request.id}.txt`);
  await writeFile(`${target}.tmp`, `${request.token ?? ''}\n${status}\n${text.replace(/\r?\n/g, ' ')}`, 'utf8');
  await rename(`${target}.tmp`, target);
}

async function handle(request) {
  if (request.type === 'end') {
    sessions.get(request.session)?.end(true, '게임 세션 종료');
    sessions.delete(request.session);
    return;
  }
  const started = Date.now();
  try {
    const engine = engineFor(request);
    const result = await engine.send(request.text, generate);
    if (result.stale) throw new ProviderError('stale');
    const reply = result.reply;
    const ended = reply.intent === 'farewell' || reply.action?.action_id === 'end_conversation';
    await respond(request, ended ? 'ok:end' : 'ok', [reply.dialogue, reply.follow_up].filter(Boolean).join(' '));
    if (ended) sessions.delete(request.session);
    const usage = engine.lastReply?.usage;
    console.log(`#${request.id} ${request.crowd ? 'crowd' : request.npc_key} ok ${Date.now() - started}ms${usage ? ` in=${usage.input_tokens} out=${usage.output_tokens}` : ''}`);
  } catch (error) {
    const code = error instanceof ProviderError ? error.code : error.message === 'invalid_response' ? 'invalid_response' : 'bridge_error';
    await respond(request, `error:${code}`);
    console.log(`#${request.id} ${request.crowd ? 'crowd' : request.npc_key} error:${code} ${Date.now() - started}ms`);
  }
}

await mkdir(dir, { recursive: true });
for (const name of await readdir(dir)) if (/^(req|res)-/.test(name)) await rm(join(dir, name), { force: true });
console.log(`ANPC 게임 브리지 · 제공자 ${provider}${model ? ` · 모델 ${model}` : ''} · 진행 ${options.story}`);
console.log(`감시 폴더: ${dir}`);

const queue = new Map();
const seen = new Set();
let polling = false;
async function poll() {
  for (const name of await readdir(dir)) {
    const match = /^req-(\d+)\.json$/.exec(name);
    if (!match || seen.has(name)) continue;
    let request;
    try { request = JSON.parse(await readFile(join(dir, name), 'utf8')); } catch { continue; }
    seen.add(name);
    await rm(join(dir, name), { force: true });
    if (!Number.isInteger(request.id) || !Number.isInteger(request.session) || typeof request.type !== 'string') continue;
    // 같은 세션 요청은 순서대로 처리한다.
    const previous = queue.get(request.session) ?? Promise.resolve();
    queue.set(request.session, previous.then(() => handle(request)));
  }
}
// 감시 주기가 겹쳐 같은 요청을 두 번 처리하지 않게 한다.
const timer = setInterval(() => {
  if (polling) return;
  polling = true;
  poll().catch(() => {}).finally(() => { polling = false; });
}, 200);
for (const event of ['SIGINT', 'SIGTERM']) process.on(event, () => { clearInterval(timer); codex?.close(); process.exit(0); });
