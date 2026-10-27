// 관점 유무 또는 피드백 반영 전후의 실제 API 비교 실행. --dry-run은 요청·검수표만 준비하고 네트워크를 사용하지 않는다.
// 사용: node scripts/run-lore-evaluation.mjs [--dry-run] [--model gpt-6-luna] [--repetitions 2] [--limit 18] [--out config.local.lore-eval/<이름>]
// 피드백 비교: --evaluation feedback --baseline <수정 전 요청 JSON> (기본 반복 1회).
// 클라우드 Node 24에서는 제공된 프록시를 사용하도록 NODE_USE_ENV_PROXY=1을 해당 실행 명령에 지정한다.
import { parseArgs } from 'node:util';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadLocalEnvironment } from '../prototype/server.js';
import { validateReply } from '../prototype/public/core.js';
import { apiModelProfile, supportsReasoningEffort } from '../prototype/public/api-models.js';
import { prepareLoreEvaluation } from './prepare-lore-evaluation.mjs';
import { prepareFeedbackEvaluation, prepareDiverseFeedbackEvaluation } from './prepare-feedback-evaluation.mjs';
import { loreDialogueReport } from './lore-dialogue-report.mjs';

export async function generateLoreReply({ job, model, effort, apiKey, fetchImpl = fetch }) {
  const started = performance.now();
  const body = { model, store: false, instructions: job.arm.prompt.instructions, input: job.arm.prompt.input,
    max_output_tokens: effort === 'none' ? 512 : 8192,
    ...(apiModelProfile(model).efforts.length ? { reasoning: { effort } } : {}),
    text: { format: { type: 'json_schema', name: 'npc_reply', strict: true, schema: job.pair.schema } } };
  try {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST', signal: AbortSignal.timeout(60000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const latency_ms = Math.round(performance.now() - started);
    if (!response.ok) return { status: 'failed', error: `http_${response.status}`, latency_ms };
    const data = await response.json();
    if (data.status !== 'completed') return { status: 'failed', error: 'incomplete_response', latency_ms, usage: data.usage ?? null };
    const output = (data.output ?? []).filter(o => o.type === 'message').flatMap(o => o.content ?? []);
    if (output.some(p => p.type === 'refusal')) return { status: 'failed', error: 'provider_refused', latency_ms };
    let reply;
    try { reply = JSON.parse(output.filter(p => p.type === 'output_text').map(p => p.text).join('')); }
    catch { return { status: 'failed', error: 'invalid_json', latency_ms, usage: data.usage ?? null }; }
    let validation_error = null, speech_error = null;
    try {
      const checked = validateReply(reply, [], { voice_style: {}, fallback_lines: { unavailable_action: '' } }, { voice: true });
      if (checked.warning) validation_error = 'action_not_allowed';
      speech_error = checked.speechError;
    } catch { validation_error = 'invalid_response'; }
    const ko = (reply.dialogue ?? '') + (reply.follow_up ?? '');
    const references = job.pair.reference.allowed_knowledge.flatMap(k => k.perspective ? [k.perspective] : []);
    return { status: 'completed', reply, usage: data.usage ?? null, latency_ms, provider_model: data.model ?? model,
      validation_error, speech_error, diagnostics: { ko_chars: [...ko].length, ko_over_limit: [...ko].length > 45,
        panam_clan_term: job.pair.npc_key === 'panam' && ko.includes('클랜'),
        verbatim_perspective_copies: references.filter(text => ko.includes(text)),
        repeats_history_verbatim: job.pair.history.filter(t => t.role === 'npc' && t.text.length > 0 && ko.includes(t.text)).map(t => t.text) } };
  } catch (error) {
    return { status: 'failed', error: error?.name === 'TimeoutError' ? 'timeout' : 'network_error', latency_ms: Math.round(performance.now() - started) };
  }
}

export async function runLoreEvaluation({ out, dryRun = false, model = 'gpt-6-luna', effort = 'none', repetitions = 2,
  limit = 18, concurrency = 2, apiKey = process.env.OPENAI_API_KEY, generate = generateLoreReply, prepare = prepareLoreEvaluation }) {
  for (const [name, value, maximum] of [['repetitions', repetitions, 5], ['limit', limit, 18], ['concurrency', concurrency, 4]]) {
    if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error(`${name} 범위는 1~${maximum}입니다.`);
  }
  if (!/^[a-zA-Z0-9._:-]{1,100}$/.test(model) || !supportsReasoningEffort(model, effort)) throw new Error('모델·reasoning effort를 확인하세요.');
  const prepared = await prepare();
  prepared.pairs = prepared.pairs.slice(0, limit);
  prepared.repetitions = repetitions; prepared.planned_requests = prepared.pairs.length * 2 * repetitions;
  await mkdir(out, { recursive: true });
  // 실행 결과를 섞거나 이전 결과를 덮어쓰지 않는다.
  const manifestPath = join(out, 'run.json');
  const manifest = { started_at: new Date().toISOString(), status: dryRun ? 'prepared' : apiKey ? 'running' : 'blocked_missing_key',
    model, effort, max_output_tokens: effort === 'none' ? 512 : 8192, planned_requests: prepared.planned_requests,
    repetitions, concurrency, suite_sha256: prepared.suite_sha256, prompt_version: prepared.prompt_version,
    content_version: prepared.content_version, comparison: prepared.comparison, store: false,
    ...(prepared.baseline_prompt_version ? { baseline_prompt_version: prepared.baseline_prompt_version, baseline_sha256: prepared.baseline_sha256 } : {}),
    ...(prepared.baseline_origin_sha256 ? { baseline_origin_sha256: prepared.baseline_origin_sha256, baseline_provenance: prepared.baseline_provenance } : {}),
    preflight_deviations: prepared.pairs.filter(p => p.preflight_errors.length).map(p => ({ case_id: p.case_id, errors: p.preflight_errors })),
    ja_profile_coverage: Object.fromEntries(prepared.pairs.map(p => [p.npc_key, { profile_present: p.ja_voice_profile_present, examples: p.ja_voice_example_count }])) };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await writeFile(join(out, 'requests.json'), JSON.stringify(prepared, null, 2) + '\n', { mode: 0o600 });
  await writeFile(join(out, 'review.html'), loreDialogueReport(prepared), { mode: 0o600 });
  if (dryRun || !apiKey) return { ...manifest, completed_requests: 0, failed_requests: 0, out };
  const jobs = [];
  for (let repetition = 1; repetition <= repetitions; repetition++) for (const [index, pair] of prepared.pairs.entries()) {
    const arms = (index + repetition) % 2 ? pair.arms : [...pair.arms].reverse();
    for (const arm of arms) jobs.push({ pair, arm, repetition });
  }
  const records = []; let next = 0, stopped = false, writes = Promise.resolve();
  // 동시 요청 수를 제한하고 결과 파일 쓰기는 순서대로 처리한다.
  const recordPath = join(out, 'responses.jsonl');
  await writeFile(recordPath, '', { flag: 'wx', mode: 0o600 });
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < jobs.length && !stopped) {
      const job = jobs[next++];
      let result;
      try { result = await generate({ job, model, effort, apiKey }); }
      catch { result = { status: 'failed', error: 'generation_error' }; }
      const record = { case_id: job.pair.case_id, npc_key: job.pair.npc_key, repetition: job.repetition,
        arm: job.arm.arm, prompt_sha256: job.arm.prompt_sha256, ...result };
      records.push(record);
      await (writes = writes.then(() => appendFile(recordPath, JSON.stringify(record) + '\n')));
      if (['http_400', 'http_401', 'http_403', 'http_404', 'http_429', 'network_error', 'timeout', 'generation_error'].includes(result.error)) stopped = true;
    }
  }));
  const completed = records.filter(r => r.status === 'completed').length;
  const summary = { ...manifest, status: records.length === jobs.length && records.every(r => r.status === 'completed' && !r.validation_error) ? 'completed' : 'partial',
    finished_at: new Date().toISOString(), attempted_requests: records.length, completed_requests: completed,
    failed_requests: records.filter(r => r.status === 'failed').length,
    invalid_replies: records.filter(r => r.validation_error).length, speech_errors: records.filter(r => r.speech_error).length,
    unrun_requests: jobs.length - records.length,
    quality_verdict: 'unreviewed',
    arms: Object.fromEntries([...new Set(prepared.pairs.flatMap(p => p.arms.map(a => a.arm)))].map(arm => {
      const rows = records.filter(r => r.arm === arm && r.status === 'completed');
      const tokens = key => rows.length && rows.every(r => Number.isFinite(r.usage?.[key])) ? rows.reduce((sum, r) => sum + r.usage[key], 0) : null;
      return [arm, { completed: rows.length, input_tokens: tokens('input_tokens'), output_tokens: tokens('output_tokens'),
        ko_over_limit: rows.filter(r => r.diagnostics?.ko_over_limit).length,
        panam_clan_term: rows.filter(r => r.diagnostics?.panam_clan_term).length,
        exact_copy_candidates: rows.filter(r => r.diagnostics?.verbatim_perspective_copies?.length).length }];
    })) };
  await writeFile(manifestPath, JSON.stringify(summary, null, 2) + '\n');
  await writeFile(join(out, 'review.html'), loreDialogueReport(prepared, records));
  return { ...summary, out };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean' }, out: { type: 'string' }, model: { type: 'string' },
    effort: { type: 'string' }, repetitions: { type: 'string' }, limit: { type: 'string' }, concurrency: { type: 'string' },
    evaluation: { type: 'string' }, baseline: { type: 'string' } } });
  if (values.evaluation && !['perspective', 'feedback', 'feedback-diverse'].includes(values.evaluation)) throw new Error('evaluation은 perspective, feedback 또는 feedback-diverse입니다.');
  const feedback = ['feedback', 'feedback-diverse'].includes(values.evaluation);
  if (values.baseline && !feedback) throw new Error('baseline은 feedback 평가에서만 사용합니다.');
  loadLocalEnvironment();
  const result = await runLoreEvaluation({ dryRun: values['dry-run'], out: values.out ?? join('config.local.lore-eval', new Date().toISOString().replace(/[:.]/g, '-')),
    model: values.model, effort: values.effort, repetitions: Number(values.repetitions ?? (feedback ? 1 : 2)),
    limit: Number(values.limit ?? 18), concurrency: Number(values.concurrency ?? 2),
    prepare: values.evaluation === 'feedback-diverse' ? () => prepareDiverseFeedbackEvaluation(values.baseline)
      : values.evaluation === 'feedback' ? () => prepareFeedbackEvaluation(values.baseline) : prepareLoreEvaluation });
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'completed' && result.status !== 'prepared') process.exitCode = 1;
}
