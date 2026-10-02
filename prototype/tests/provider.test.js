import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateOpenAI } from '../openai.js';
import { createPrototypeServer } from '../server.js';
import { API_MODELS, apiModelProfile, supportsReasoningEffort } from '../public/api-models.js';
const reply = { dialogue: '안녕하세요.', intent: 'answer', emotion: 'neutral', action: null, follow_up: null };
const prompt = { instructions: '공통 지침', input: [{ role: 'user', content: '안녕' }] };

test('로컬 .env를 읽고 기존 환경 값을 우선하며 파일이 없어도 실행한다', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'anpc-env-test-')), file = join(dir, '.env');
  await writeFile(file, 'OPENAI_API_KEY=test-file-value\n', 'utf8');
  t.after(async () => { await unlink(file); await rmdir(dir); });
  const script = `import assert from 'node:assert/strict';
    import { loadLocalEnvironment } from ${JSON.stringify(new URL('../server.js', import.meta.url).href)};
    loadLocalEnvironment(process.argv[1]);
    assert.equal(process.env.OPENAI_API_KEY, process.argv[2] || undefined);`;
  for (const [path, existing, expected] of [[file, '', 'test-file-value'], [file, 'test-environment-value', 'test-environment-value'], [file + '.missing', '', '']]) {
    const env = { ...process.env }; delete env.OPENAI_API_KEY;
    if (existing) env.OPENAI_API_KEY = existing;
    await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script, path, expected], { env, windowsHide: true });
  }
});

test('Responses 요청은 구조화 출력·store false를 사용하고 REST 출력을 파싱한다', async () => {
  let body;
  const result = await generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt,
    fetchImpl: async (url, options) => { assert.equal(url, 'https://api.openai.com/v1/responses'); body = JSON.parse(options.body); return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reply) }] }], usage: { input_tokens: 100, output_tokens: 20 } }); }
  });
  assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.deepEqual(result.reply, reply); assert.equal(result.usage.output_tokens, 20);
});

test('모델별 추론 지원과 스냅샷을 구별하고 none 미지원 모델에 자동으로 다른 값을 선택하지 않는다', () => {
  for (const model of API_MODELS) assert.equal(supportsReasoningEffort(model.id,'none'),true);
  assert.deepEqual(apiModelProfile('gpt-4.1-mini-2025-04-14').efforts,[]);
  for (const model of ['gpt-6-astra','gpt-6.1-sol']) {
    assert.equal(supportsReasoningEffort(model,'none'),false);
    assert.equal(supportsReasoningEffort(model,'low'),true);
  }
  assert.equal(apiModelProfile('custom-model').unverified,true);
});

test('API 추론 기본은 none이며 비추론 모델에는 파라미터를 전송하지 않는다', async () => {
  for (const model of API_MODELS) {
    let body;
    await generateOpenAI({apiKey:'test-only',model:model.id,prompt,fetchImpl:async (_,options)=>{
      body=JSON.parse(options.body);
      return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(reply)}]}]});
    }});
    assert.deepEqual(body.reasoning,model.efforts.length ? {effort:'none'} : undefined);
    assert.equal(body.max_output_tokens,512);
    assert.deepEqual(body.input,prompt.input);
  }
});

test('선택한 추론 강도와 내부 토큰 사용량을 보존하고 추론용 출력 예산을 확보한다', async () => {
  for (const reasoningEffort of ['low','medium','high','xhigh','max']) {
    let body;
    const result=await generateOpenAI({apiKey:'test-only',model:'gpt-5.6-terra',reasoningEffort,prompt,fetchImpl:async (_,options)=>{
      body=JSON.parse(options.body);
      return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(reply)}]}],
        usage:{input_tokens:100,output_tokens:600,output_tokens_details:{reasoning_tokens:580}}});
    }});
    assert.deepEqual(body.reasoning,{effort:reasoningEffort}); assert.equal(body.max_output_tokens,8192);
    assert.deepEqual(result.reply,reply); assert.equal(result.usage.reasoning_tokens,580);
  }
});

test('잘못된 추론 값과 모델 조합은 외부 호출 전에 거부한다', async () => {
  for (const [model,reasoningEffort] of [['gpt-5.6-terra','invalid'],['gpt-5.6-terra',{}],['gpt-4.1-mini','high'],['gpt-6-astra','none']]) {
    await assert.rejects(generateOpenAI({apiKey:'test-only',model,reasoningEffort,prompt,
      fetchImpl:async()=>{throw Error('외부 호출 금지');}}),/invalid_reasoning_effort/);
  }
});

test('웹 API는 추론 기본/선택값을 전달하고 잘못된 값은 생성 전에 거부한다', async t => {
  const seen=[];
  const server=await createPrototypeServer({apiKey:'test-only',generate:async args=>{seen.push(args.reasoningEffort);return {reply,mode:'openai',usage:null};}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); t.after(()=>server.close());
  const origin=`http://127.0.0.1:${server.address().port}`,boot=await fetch(`${origin}/api/bootstrap`).then(r=>r.json());
  const send=data=>fetch(`${origin}/api/generate`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-ANPC-Token':boot.token},body:JSON.stringify({prompt,model:'gpt-5.6-terra',...data})});
  assert.equal((await send({})).status,200); assert.equal((await send({reasoningEffort:'high'})).status,200);
  assert.equal((await send({reasoningEffort:'unsupported'})).status,400);
  assert.equal((await send({model:'gpt-4.1-mini',reasoningEffort:'high'})).status,400);
  assert.deepEqual(seen,['none','high']);
});
test('인증·한도·불완전 응답과 거절은 표준 오류로 반환한다', async () => {
  for (const [status, code] of [[401,'auth_failed'], [429,'rate_limited'], [500,'network_error']]) {
    await assert.rejects(generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt, fetchImpl: async () => new Response('secret-error-not-forwarded', { status }) }), new RegExp(code));
  }
  await assert.rejects(generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt, fetchImpl: async () => Response.json({ status: 'incomplete' }) }), /invalid_response/);
  await assert.rejects(generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt, fetchImpl: async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }) }), /provider_refused/);
});

test('외부 연결 권한 차단을 인증·일반 연결 실패·시간 초과와 구별하며 원문 오류를 노출하지 않는다', async () => {
  for (const [error, expected] of [
    [new TypeError('test-secret-not-forwarded', { cause: new AggregateError([
      Object.assign(new Error('test-secret-not-forwarded'), { code: 'EACCES' })
    ]) }), 'network_blocked'],
    [Object.assign(new Error('test-secret-not-forwarded'), { code: 'EPERM' }), 'network_blocked'],
    [new TypeError('test-secret-not-forwarded', { cause: Object.assign(new Error(), { code: 'ENOTFOUND' }) }), 'network_error']
  ]) {
    await assert.rejects(generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt,
      fetchImpl: async () => { throw error; }
    }), error => error.code === expected && error.message === expected && !error.message.includes('test-secret'));
  }
  await assert.rejects(generateOpenAI({ apiKey: 'test-only', model: 'test-model', prompt, signal: AbortSignal.abort(),
    fetchImpl: async () => { throw Object.assign(new Error(), { code: 'EACCES' }); }
  }), /timeout/);
});
test('로컬 API는 다른 Origin·Host 요청을 거부하고 키를 응답에 포함하지 않는다', async t => {
  let seenKey;
  const server = await createPrototypeServer({ apiKey: 'test-server-value', generate: async args => { seenKey = args.apiKey; return { reply, mode: 'openai', usage: null }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;
  const bootstrap = await fetch(`${origin}/api/bootstrap`).then(r => r.json());
  assert.equal(bootstrap.hasEnvironmentKey, true); assert.ok(!JSON.stringify(bootstrap).includes('test-server-value'));
  const denied = await fetch(`${origin}/api/generate`, { method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json', 'X-ANPC-Token': bootstrap.token }, body: JSON.stringify({ prompt, model: 'test-model', apiKey: 'test-only' }) });
  assert.equal(denied.status, 403);
  const wrongHostStatus = await new Promise((resolve, reject) => {
    const req = http.get(`${origin}/`, { headers: { Host: 'other.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject);
  });
  assert.equal(wrongHostStatus, 403);
  const ok = await fetch(`${origin}/api/generate`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-ANPC-Token': bootstrap.token }, body: JSON.stringify({ prompt, model: 'test-model', apiKey: 'test-only' }) });
  assert.equal(ok.status, 200); const output = await ok.text(); assert.ok(!output.includes('test-only')); assert.equal(seenKey, 'test-only');
  const saved = await fetch(`${origin}/api/generate`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-ANPC-Token': bootstrap.token }, body: JSON.stringify({ prompt, model: 'test-model', apiKey: '' }) });
  assert.equal(saved.status, 200); assert.equal(seenKey, 'test-server-value'); assert.ok(!(await saved.text()).includes('test-server-value'));
  assert.equal((await fetch(`${origin}/.env`)).status, 404);
});


test('기억 요약 경로는 별도 출력 규격과 고정 요약 지침을 사용한다', async t => {
  let seen;
  const server=await createPrototypeServer({apiKey:'test-only',generate:async args=>{seen=args;return {reply:{candidates:[]},mode:'openai',usage:{input_tokens:12,output_tokens:4}};}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
  const origin='http://127.0.0.1:'+server.address().port,boot=await fetch(origin+'/api/bootstrap').then(r=>r.json());
  const response=await fetch(origin+'/api/summarize',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-ANPC-Token':boot.token},body:JSON.stringify({prompt,mode:'openai',model:'gpt-4.1-mini',reasoningEffort:'none'})});
  assert.equal(response.status,200);assert.equal(seen.memorySummary,true);
  assert.equal(seen.prompt.instructions,boot.memoryBase);assert.ok(boot.memoryBase.includes('사이버펑크'));
  assert.equal((await response.json()).usage.input_tokens,12);
});
