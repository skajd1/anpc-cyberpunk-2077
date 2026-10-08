// 일본어 대사 개선 비교: 같은 평가 입력을 비교안별로 실제 API에 보내 응답·토큰·지연·자동 지표를 로컬에 저장한다.
// 사용: node scripts/run-ja-evaluation.mjs [--arms baseline,ko_first,ja_first] [--limit N] [--model gpt-6-luna] [--effort none]
//       [--baseline-ref 606d2f5] [--out config.local.ja-eval/<이름>] [--concurrency 4]
// 결과는 Git 제외 폴더(config.local.*)에만 쓴다. 키는 .env의 OPENAI_API_KEY를 쓴다.
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { loadLocalEnvironment, loadPrototypeData } from '../prototype/server.js';
import { jaVoiceData } from '../prototype/public/speech.js';
import { prepareJaEvaluation } from './prepare-ja-evaluation.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) =>
  index % 2 === 0 ? [...pairs, [value.replace(/^--/, ''), all[index + 1]]] : pairs, []));
const model = args.model ?? 'gpt-6-luna', effort = args.effort ?? 'none';
const arms = (args.arms ?? 'baseline,ko_first,ja_first').split(',');
const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
const out = args.out ?? join('config.local.ja-eval', `${stamp}-${model}-${effort}`);
const baselineRef = args['baseline-ref'] ?? '606d2f5';
loadLocalEnvironment();
if (!process.env.OPENAI_API_KEY) throw new Error('.env에 OPENAI_API_KEY가 없습니다.');
const profiles = (await loadPrototypeData()).research.jaVoiceProfiles;

// 비교안: baseline은 이전 커밋의 베이스 프롬프트(0.20)·말투 데이터 없음, 나머지는 현재 베이스·말투 데이터 포함.
const baseAt = ref => execFileSync('git', ['show', `${ref}:docs/prompt-specification.md`], { encoding: 'utf8' }).match(/```text\r?\n([\s\S]*?)\r?\n```/)[1];
const ARMS = {
  baseline: { voiceOrder: 'ko_first', jaVoice: false, base: baseAt(baselineRef) },
  ko_first: { voiceOrder: 'ko_first', jaVoice: true },
  ja_first: { voiceOrder: 'ja_first', jaVoice: true }
};
for (const arm of arms) if (!ARMS[arm]) throw new Error(`알 수 없는 비교안: ${arm}`);

// 자동 지표: 한글·괄호(음성 생략 사유), 단독 V, 길이, 한자 비율·문장 길이(문어체 경향), 말투 프로필의 피해야 할 표현.
const HANGUL = /[가-힣ㄱ-ㆎ]/, BRACKETS = /[[\]()（）*_#`]/;
function metrics(reply, jaVoice) {
  const ja = reply.speech_text ?? '', ko = reply.dialogue + (reply.follow_up ?? '');
  const body = ja.replace(/[、。！？…!?\s「」『』―ー・]/g, '');
  const sentences = ja.split(/[。！？…!?]+/).map(s => s.trim()).filter(Boolean);
  const avoid = (jaVoice?.avoid ?? []).filter(w => !/[〜체]/.test(w) && ja.includes(w));
  return { speech_invalid: HANGUL.test(ja) || BRACKETS.test(ja), standalone_v: (ja.match(/(?<![A-Za-z])[VＶ](?![A-Za-z])/g) ?? []).length,
    ko_chars: [...ko].length, ja_chars: [...ja].length, kanji_ratio: body.length ? Number(([...body].filter(c => /\p{Script=Han}/u.test(c)).length / [...body].length).toFixed(3)) : 0,
    ja_sentence_chars: sentences.length ? Number((sentences.reduce((n, s) => n + [...s].length, 0) / sentences.length).toFixed(1)) : 0,
    avoid_hits: avoid, first_person_hits: (jaVoice?.first_person ?? []).filter(w => ja.includes(w)), address_hits: (jaVoice?.address_v ?? []).filter(w => ja.includes(w)) };
}

async function call(item) {
  const body = { model, store: false, instructions: item.prompt.instructions, input: item.prompt.input, max_output_tokens: effort === 'none' ? 512 : 8192,
    ...(model.startsWith('gpt-6') || model.startsWith('gpt-5') ? { reasoning: { effort } } : {}),
    text: { format: { type: 'json_schema', name: 'npc_reply', strict: true, schema: item.schema } } };
  for (let attempt = 0; ; attempt++) {
    const started = performance.now();
    const res = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(120000),
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const latency_ms = Math.round(performance.now() - started);
    if ((res.status === 429 || res.status >= 500) && attempt < 4) { await new Promise(r => setTimeout(r, 2000 * 2 ** attempt)); continue; }
    if (!res.ok) return { error: `http_${res.status}`, detail: (await res.text()).slice(0, 300), latency_ms };
    const data = await res.json();
    const text = (data.output ?? []).filter(o => o.type === 'message').flatMap(o => o.content ?? []).filter(c => c.type === 'output_text').map(c => c.text).join('');
    try { return { reply: JSON.parse(text), usage: data.usage, latency_ms, status: data.status }; }
    catch { return { error: 'invalid_json', status: data.status, latency_ms }; }
  }
}

mkdirSync(out, { recursive: true });
const limit = Number(args.limit ?? Infinity), concurrency = Number(args.concurrency ?? 4);
const jobs = [];
for (const arm of arms) {
  const cases = (await prepareJaEvaluation('full', ARMS[arm])).slice(0, limit);
  for (const item of cases) jobs.push({ arm, item });
}
writeFileSync(join(out, 'run.json'), JSON.stringify({ model, effort, arms, baseline_ref: baselineRef, started_at: new Date().toISOString(), cases: jobs.length }, null, 1));
let next = 0, done = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (next < jobs.length) {
    const { arm, item } = jobs[next++];
    const result = await call(item);
    const jaVoice = item.prompt.input.find(m => m.content.startsWith('일본어 말투 데이터'));
    const profile = jaVoiceData(profiles, null, item.npc_key);
    const record = { arm, case_id: item.case_id, npc_key: item.npc_key, relationship_stage: item.relationship_stage, prompt_version: arm === 'baseline' ? `base@${baselineRef}` : item.prompt_version,
      voice_order: item.voice_order, ja_voice_sent: Boolean(jaVoice), prompt_sha256: item.prompt_sha256, player_input: item.prompt.input.at(-1).content,
      ...result, ...(result.reply ? { metrics: metrics(result.reply, profile) } : {}) };
    appendFileSync(join(out, `${arm}.jsonl`), JSON.stringify(record) + '\n');
    done++;
    if (done % 10 === 0 || done === jobs.length) console.log(`${done}/${jobs.length}`);
  }
}));
console.log(out);
