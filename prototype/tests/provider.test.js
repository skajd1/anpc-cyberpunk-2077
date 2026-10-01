import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { generateOpenAI } from '../openai.js';
import { createPrototypeServer } from '../server.js';
const reply = { dialogue: '안녕하세요.', intent: 'answer', emotion: 'neutral', action: null, follow_up: null };
const prompt = { instructions: '공통 지침', input: [{ role: 'user', content: '안녕' }] };

test('Responses 요청은 구조화 출력·store false를 사용하고 REST 출력을 파싱한다', async () => {
  let body;
  const result = await generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt,
    fetchImpl: async (url, options) => { assert.equal(url, 'https://api.openai.com/v1/responses'); body = JSON.parse(options.body); return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reply) }] }], usage: { input_tokens: 100, output_tokens: 20 } }); }
  });
  assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.deepEqual(result.reply, reply); assert.equal(result.usage.output_tokens, 20);
});
test('인증·한도·불완전 응답과 거절은 표준 오류로 반환한다', async () => {
  for (const [status, code] of [[401,'auth_failed'], [429,'rate_limited'], [500,'network_error']]) {
    await assert.rejects(generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt, fetchImpl: async () => new Response('secret-error-not-forwarded', { status }) }), new RegExp(code));
  }
  await assert.rejects(generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt, fetchImpl: async () => Response.json({ status: 'incomplete' }) }), /invalid_response/);
  await assert.rejects(generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt, fetchImpl: async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }) }), /provider_refused/);
});
test('로컬 API는 다른 Origin·Host 요청을 거부하고 키를 응답에 포함하지 않는다', async t => {
  let seenKey;
  const server = await createPrototypeServer({ apiKey: undefined, generate: async args => { seenKey = args.apiKey; return { reply, mode: 'openai', usage: null }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;
  const bootstrap = await fetch(`${origin}/api/bootstrap`).then(r => r.json());
  const denied = await fetch(`${origin}/api/generate`, { method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json', 'X-ANPC-Token': bootstrap.token }, body: JSON.stringify({ prompt, model: 'test-model', apiKey: 'test-only' }) });
  assert.equal(denied.status, 403);
  const wrongHostStatus = await new Promise((resolve, reject) => {
    const req = http.get(`${origin}/`, { headers: { Host: 'other.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject);
  });
  assert.equal(wrongHostStatus, 403);
  const ok = await fetch(`${origin}/api/generate`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-ANPC-Token': bootstrap.token }, body: JSON.stringify({ prompt, model: 'test-model', apiKey: 'test-only' }) });
  assert.equal(ok.status, 200); const output = await ok.text(); assert.ok(!output.includes('test-only')); assert.equal(seenKey, 'test-only');
});
