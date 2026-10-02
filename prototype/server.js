import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { generateOpenAI, ProviderError } from './openai.js';
import { codexStatus } from './codex.js';
import { CodexConnection } from './codex-connection.js';
import { supportsReasoningEffort } from './public/api-models.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export function loadLocalEnvironment(path = resolve(root, '.env')) {
  try { process.loadEnvFile(path); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('로컬 .env 파일을 읽지 못했습니다.'); }
}
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
const routes = { '/': ['compare.html', 'text/html'], '/compare': ['compare.html', 'text/html'], '/compare.js': ['compare.js', 'text/javascript'], '/test-tools.js': ['test-tools.js', 'text/javascript'], '/profile.js': ['profile.js', 'text/javascript'], '/profile-view.js': ['profile-view.js', 'text/javascript'], '/research.js': ['research.js', 'text/javascript'], '/app.js': ['app.js', 'text/javascript'], '/core.js': ['core.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };

routes['/scenario.js'] = ['scenario.js', 'text/javascript'];
routes['/personality.js'] = ['personality.js', 'text/javascript'];
routes['/api-models.js'] = ['api-models.js', 'text/javascript'];
routes['/memory.js'] = ['memory.js', 'text/javascript'];

export async function createPrototypeServer({ apiKey = process.env.OPENAI_API_KEY, generate = generateOpenAI, generateLocal, statusLocal = codexStatus, modelsLocal } = {}) {
  const codex = new CodexConnection();
  generateLocal ??= args => codex.generate(args);
  modelsLocal ??= () => codex.models();
  const spec = await readFile(resolve(root, 'docs/prompt-specification.md'), 'utf8');
  const base = spec.match(/```text\r?\n([\s\S]*?)\r?\n```/)?.[1];
  const memorySpec = await readFile(resolve(root, 'docs/memory-specification.md'), 'utf8');
  const memoryBase = memorySpec.match(/```text\r?\n([\s\S]*?)\r?\n```/)?.[1];
  if (!base?.includes('{{OUTPUT_CONTRACT}}')) throw new Error('베이스 프롬프트 템플릿을 찾지 못했습니다.');
  const personas = JSON.parse(await readFile(resolve(root, 'prototype/personas.json'), 'utf8'));
  const load = async name => JSON.parse(await readFile(resolve(root, 'content/cyberpunk2077', name), 'utf8'));
  const manifest = await load('manifest.json');
  const cardFiles = manifest.files.filter(file => /^characters\/[a-z0-9_-]+\.json$/.test(file));
  const research = { version: manifest.content_version ?? manifest.version, cards: await Promise.all(cardFiles.map(load)),
    facts: await load('world-facts.json'), knowledge: await load('knowledge.json'), examples: await load('dialogue-examples.json'), worldKnowledge: await load('world-knowledge-policy.json') };
  const playerFact = research.facts.find(f => f.id === manifest.player_identity_fact_id);
  if (!playerFact?.player_identity?.display_name || !playerFact.player_identity.character_key) throw new Error('플레이어 신원 기준 사실이 없습니다.');
  const playerIdentity = { ...playerFact.player_identity, fact_id: playerFact.id, claim_limits: playerFact.claim_limits };
  research.playerIdentity = playerIdentity;
  const token = randomBytes(32).toString('hex');
  let activeRequests = 0;
  const server = http.createServer(async (req, res) => {
    const host = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== host) return json(res, 403, { error: 'forbidden_origin' });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'");
    try {
      if (req.method === 'GET' && req.url === '/api/bootstrap') return json(res, 200, { base, memoryBase, personas, playerIdentity, token, hasEnvironmentKey: Boolean(apiKey) });
      if (req.method === 'GET' && req.url === '/api/research') {
        if (req.headers['x-anpc-token'] !== token) return json(res, 403, { error: 'forbidden_origin' });
        return json(res, 200, research);
      }
      if (req.method === 'GET' && req.url === '/api/codex-status') return json(res, 200, await statusLocal());
      if (req.method === 'GET' && req.url === '/api/codex-models') {
        if (req.headers['x-anpc-token'] !== token) return json(res, 403, { error: 'forbidden_origin' });
        const status = await statusLocal();
        if (!status.available || !status.loggedIn) throw new ProviderError(status.available ? 'codex_login_required' : 'codex_unavailable');
        return json(res, 200, await modelsLocal());
      }
      if (req.method === 'POST' && ['/api/generate', '/api/summarize'].includes(req.url)) {
        if (req.headers.origin !== `http://${host}` || req.headers['x-anpc-token'] !== token || !req.headers['content-type']?.startsWith('application/json')) return json(res, 403, { error: 'forbidden_origin' });
        if (activeRequests >= 2) return json(res, 429, { error: 'busy' });
        const chunks = []; let bytes = 0;
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 128000) return json(res, 413, { error: 'input_too_large' }); chunks.push(chunk); }
        const input = Buffer.concat(chunks).toString('utf8');
        let data; try { data = JSON.parse(input); } catch { return json(res, 400, { error: 'invalid_request' }); }
        if (typeof data.prompt?.instructions !== 'string' || !Array.isArray(data.prompt?.input) || typeof data.model !== 'string' || (data.apiKey != null && typeof data.apiKey !== 'string')) return json(res, 400, { error: 'invalid_request' });
        if (data.mode != null && !['openai', 'codex'].includes(data.mode)) return json(res, 400, { error: 'invalid_request' });
        const memorySummary = req.url === '/api/summarize';
        if (memorySummary && data.mode !== 'openai') return json(res, 400, { error: 'invalid_request' });
        if (data.mode !== 'codex' && !supportsReasoningEffort(data.model, data.reasoningEffort ?? 'none')) return json(res, 400, { error: 'invalid_reasoning_effort' });
        const controller = new AbortController();
        const cancel = () => { if (!res.writableEnded) controller.abort(); };
        res.on('close', cancel); activeRequests++;
        try {
          const result = data.mode === 'codex'
            ? await generateLocal({ prompt: data.prompt, model: data.model, signal: controller.signal })
            : await generate({ prompt: memorySummary ? { ...data.prompt, instructions: memoryBase } : data.prompt, apiKey: data.apiKey || apiKey, model: data.model,
              reasoningEffort: data.reasoningEffort ?? 'none', signal: controller.signal, memorySummary });
          if (!res.destroyed) json(res, 200, result);
        } finally { activeRequests--; res.off('close', cancel); data.apiKey = undefined; }
        return;
      }
      if (req.method === 'GET' && routes[req.url]) {
        const [name, type] = routes[req.url]; const content = await readFile(resolve(root, 'prototype/public', name));
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' }); res.end(content); return;
      }
      json(res, 404, { error: 'not_found' });
    } catch (err) { if (!res.destroyed) json(res, err instanceof ProviderError ? 502 : 500, { error: err instanceof ProviderError ? err.code : 'internal_error' }); }
  });
  server.on('close', () => codex.close());
  server.stopCodex = () => codex.close();
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  loadLocalEnvironment();
  const port = Number(process.env.ANPC_PORT ?? 4173);
  const server = await createPrototypeServer();
  for (const event of ['SIGINT', 'SIGTERM']) process.on(event, () => { server.stopCodex(); server.close(); });
  process.on('exit', () => server.stopCodex());
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? '포트가 사용 중입니다. ANPC_PORT로 다른 포트를 지정하세요.' : '시제품 실행에 실패했습니다.'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`ANPC 대화 시제품: http://127.0.0.1:${server.address().port}`));
}
