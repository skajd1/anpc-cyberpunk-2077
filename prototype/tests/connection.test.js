import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { CodexConnection } from '../codex-connection.js';
const prompt = { instructions: 'NPC 규칙', input: [{role:'user',content:'안녕'}] };

function fixture({ pause = false } = {}) {
  let spawns = 0, serial = 0, notifyStart;
  const turns = [], requests = [];
  const started = new Promise(resolve => { notifyStart = resolve; });
  const spawnImpl = () => {
    spawns++;
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    const emit = event => child.stdout.write(JSON.stringify(event)+'\n');
    child.kill = () => { child.emit('close',0); };
    child.stdin.on('data', chunk => {
      const req = JSON.parse(chunk.toString()); requests.push(req);
      if (!req.id) return;
      let result = {};
      if(req.method==='model/list') result={data:[{model:'test-model',displayName:'Test'}],nextCursor:null};
      if(req.method==='thread/start') {
        assert.equal(req.params.ephemeral,true); assert.equal(req.params.sandbox,'read-only'); assert.equal(req.params.approvalPolicy,'never');
        result={thread:{id:`thread-${++serial}`}};
      }
      if(req.method==='turn/start') {
        const id=`turn-${req.params.threadId}`; result={turn:{id,status:'inProgress'}};
        const finish = () => {
          emit({method:'item/completed',params:{threadId:req.params.threadId,turnId:id,item:{type:'agentMessage',phase:'final_answer',text:JSON.stringify({dialogue:req.params.threadId,intent:'answer',emotion:'neutral',action:null,follow_up:null})}}});
          emit({method:'turn/completed',params:{threadId:req.params.threadId,turn:{id,status:'completed'}}});
        };
        turns.push({threadId:req.params.threadId,finish});
        setImmediate(()=>{notifyStart();if(!pause)finish();});
      }
      queueMicrotask(()=>emit({id:req.id,result}));
    }); return child;
  };
  return {spawnImpl,turns,requests,started,get spawns(){return spawns;}};
}

test('모델 조회와 연속·동시 생성은 같은 실행기를 쓰고 각 요청을 격리한다', async t => {
  const f=fixture(); const client=new CodexConnection({bin:'test',spawnImpl:f.spawnImpl}); t.after(()=>client.close());
  await client.models();
  const first=await client.generate({prompt});
  const [a,b]=await Promise.all([client.generate({prompt}),client.generate({prompt})]);
  assert.equal(f.spawns,1); assert.equal(new Set([first.reply.dialogue,a.reply.dialogue,b.reply.dialogue]).size,3);
  assert.equal(f.requests.filter(r=>r.method==='initialize').length,1); assert.equal(client.jobs.size,0);
});

test('취소는 해당 turn만 중단하고 늦은 응답을 폐기하며 연결은 유지한다', async t => {
  const f=fixture({pause:true}); const client=new CodexConnection({bin:'test',spawnImpl:f.spawnImpl}); t.after(()=>client.close());
  const controller=new AbortController(); const task=client.generate({prompt,signal:controller.signal});
  const rejected=assert.rejects(task,/cancelled/); await f.started; controller.abort(); await rejected;
  f.turns[0].finish();
  assert.equal(client.ready,true); assert.equal(client.jobs.size,0);
  assert.equal(f.requests.filter(r=>r.method==='turn/interrupt').length,1);
  assert.equal(f.requests.find(r=>r.method==='turn/interrupt').params.threadId,f.turns[0].threadId);
});

test('실행기가 종료되면 다음 요청에서 재연결한다', async t => {
  const f=fixture(); const client=new CodexConnection({bin:'test',spawnImpl:f.spawnImpl}); t.after(()=>client.close());
  await client.models(); client.child.emit('close',1); assert.equal(client.ready,false);
  await client.generate({prompt}); assert.equal(f.spawns,2);
});
