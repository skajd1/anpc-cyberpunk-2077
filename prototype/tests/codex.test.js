import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { generateCodex, runCodex, listCodexModels } from '../codex.js';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createPrototypeServer } from '../server.js';
const reply = { dialogue: '배달 중이에요.', intent: 'answer', emotion: 'neutral', action: null, follow_up: null };
const prompt = { instructions: 'NPC로 응답하라.', input: [{ role: 'user', content: '안녕' }] };

test('Codex 모델 조회는 초기화·페이지 순서를 지키고 숨김 모델과 중복을 제거한다', async () => {
  const requests = []; let killed = false;
  const result = await listCodexModels({ bin: 'test-codex', spawnImpl: (bin, args, options) => {
    assert.equal(options.shell, false); assert.equal(options.env.OPENAI_API_KEY, undefined);
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    child.kill = () => { killed = true; };
    child.stdin.on('data', chunk => {
      const req = JSON.parse(chunk.toString()); requests.push(req.method);
      if (req.method === 'initialized') return;
      const result = req.method === 'initialize' ? {} : req.params.cursor ? { data: [{model:'gpt-6-luna',displayName:'Luna'},{model:'gpt-6-sol'}],nextCursor:null } : { data:[{model:'gpt-6-sol',displayName:'Sol',isDefault:true},{model:'hidden',hidden:true}],nextCursor:'page2' };
      queueMicrotask(() => child.stdout.write(JSON.stringify({id:req.id,result})+'\n'));
    }); return child;
  } });
  assert.deepEqual(requests,['initialize','initialized','model/list','model/list']);
  assert.deepEqual(result.models.map(m=>m.id),['gpt-6-sol','gpt-6-luna']); assert.equal(result.models[0].isDefault,true); assert.ok(killed);
});

test('Codex는 키 없이 stdin·일회성 작업 폴더·스키마를 사용하고 폴더를 제거한다', async () => {
  let folder;
  const result = await generateCodex({ prompt, model: '', bin: 'test-codex', run: async (bin, args, options) => {
    if (args[0] === 'login') return { code: 0, output: '' };
    folder = options.cwd;
    assert.ok(args.includes('--ephemeral')); assert.ok(args.includes('--ignore-user-config'));
    assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
    assert.ok(!args.includes('--model')); assert.ok(!args.join(' ').includes('안녕'));
    assert.ok(options.input.includes('안녕'));
    const schema = JSON.parse(await readFile(args[args.indexOf('--output-schema') + 1], 'utf8'));
    assert.equal(schema.additionalProperties, false);
    return { code: 0, output: JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(reply) } }) + '\n' + JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 50, output_tokens: 10 } }) };
  } });
  assert.deepEqual(result.reply, reply); assert.equal(result.mode, 'codex');
  await assert.rejects(access(folder));
});

test('Codex 미로그인·실행 실패·잘못된 출력은 안전한 오류로 반환한다', async () => {
  await assert.rejects(generateCodex({ prompt, run: async () => ({ code: 1, output: 'private-error' }) }), /codex_login_required/);
  for (const [code, output, error] of [[1, 'secret', 'codex_failed'], [0, 'invalid-json', 'invalid_response']]) {
    await assert.rejects(generateCodex({ prompt, run: async (bin, args) => args[0] === 'login' ? { code: 0, output: '' } : { code, output } }), new RegExp(error));
  }
});

test('실제 자식 프로세스의 취소와 시간 제한은 실행을 중단한다', async () => {
  const controller = new AbortController();
  const task = runCodex(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { signal: controller.signal });
  setTimeout(() => controller.abort(), 100);
  await assert.rejects(task, /cancelled/);
  await assert.rejects(runCodex(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 100 }), /timeout/);
});

test('로컬 API의 Codex 경로는 API 키를 실행기에 전달하지 않는다', async t => {
  let args;
  const server = await createPrototypeServer({ apiKey: 'environment-test-key', statusLocal: async () => ({ available: true, loggedIn: true }), modelsLocal: async () => ({ models: [{ id: 'test-model' }] }), generateLocal: async input => { args = input; return { reply, mode: 'codex' }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { token } = await fetch(`${origin}/api/bootstrap`).then(r => r.json());
  assert.equal((await fetch(`${origin}/api/codex-models`)).status, 403);
  assert.deepEqual(await fetch(`${origin}/api/codex-models`, { headers: { 'X-ANPC-Token': token } }).then(r=>r.json()), {models:[{id:'test-model'}]});
  const res = await fetch(`${origin}/api/generate`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-ANPC-Token': token }, body: JSON.stringify({ prompt, mode: 'codex', model: '', apiKey: 'unused-key' }) });
  assert.equal(res.status, 200); assert.equal((await res.json()).mode, 'codex'); assert.equal(args.apiKey, undefined);
});
