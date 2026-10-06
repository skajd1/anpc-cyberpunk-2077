import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex').toUpperCase();
function zipFiles(file) {
  const bytes=readFileSync(file),files=new Map();
  // 개발 모드 ZIP은 ZIP64가 필요 없는 작은 산출물이다. 중앙 디렉터리로 검증한다.
  let end=bytes.length-22;
  while(end>=0&&bytes.readUInt32LE(end)!==0x06054b50)end--;
  assert.ok(end>=0,'ZIP end record');
  let offset=bytes.readUInt32LE(end+16);
  for(let i=0;i<bytes.readUInt16LE(end+10);i++) {
    assert.equal(bytes.readUInt32LE(offset),0x02014b50);
    const method=bytes.readUInt16LE(offset+10),size=bytes.readUInt32LE(offset+20);
    const nameLength=bytes.readUInt16LE(offset+28),extraLength=bytes.readUInt16LE(offset+30),commentLength=bytes.readUInt16LE(offset+32);
    const name=bytes.subarray(offset+46,offset+46+nameLength).toString('utf8');
    const local=bytes.readUInt32LE(offset+42);
    assert.equal(bytes.readUInt32LE(local),0x04034b50);
    const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
    const content=bytes.subarray(start,start+size);
    assert.ok(method===0||method===8);
    assert.ok(!files.has(name),'duplicate entry');
    files.set(name,method===8?inflateRawSync(content):content);
    offset+=46+nameLength+extraLength+commentLength;
  }
  return files;
}
test('DIST 개발 ZIP은 모드 소유 파일·해시만 포함하고 공개 미승인/잘못된 DLL을 거부한다', {skip:process.platform!=='win32'},()=>{
  const directory=mkdtempSync(path.join(tmpdir(),'anpc-package-test-'));
  try {
    const binary=path.join(directory,'fixture.dll');
    // 패키징 검사 fixture이며 실제 DLL/게임 실행 검사로 사용하지 않는다.
    writeFileSync(binary,Buffer.concat([Buffer.from('MZ'),Buffer.alloc(64)]));
    const build=(output,channel='development')=>spawnSync('pwsh',['-NoProfile','-File',path.join(root,'scripts/build-game-package.ps1'),'-NativeDll',binary,'-OutputZip',output,'-Channel',channel],{cwd:root,encoding:'utf8'});
    const first=path.join(directory,'first.zip'),second=path.join(directory,'second.zip');
    let result=build(first);
    assert.equal(result.status,0,result.stderr);
    const files=zipFiles(first),manifest=JSON.parse(files.get('ANPC-PACKAGE.json'));
    assert.equal(manifest.channel,'development');
    assert.equal(manifest.public_release_ready,false);
    assert.ok(manifest.release_blockers.includes('SR-12'));
    for(const item of manifest.files) {
      assert.ok(files.has(item.path),item.path);
      assert.equal(sha(files.get(item.path)),item.sha256);
      assert.equal(files.get(item.path).length,item.bytes);
      if(item.install)assert.match(item.path,/^(?:r6\/scripts\/ANPC\/|bin\/x64\/plugins\/cyber_engine_tweaks\/mods\/anpc\/|red4ext\/plugins\/ANPC\/)/);
    }
    assert.equal(files.size,manifest.files.length+1);
    assert.ok(files.has('r6/scripts/ANPC/ScannerIdentity.reds'));
    assert.ok(files.has('bin/x64/plugins/cyber_engine_tweaks/mods/anpc/identity.lua'));
    assert.deepEqual(files.get('red4ext/plugins/ANPC/ANPC.Native.dll'),readFileSync(binary));
    assert.ok(files.has('ANPC-DOCUMENTATION/licenses/nlohmann-json.txt'));
    for(const name of files.keys())assert.doesNotMatch(name,/(?:\.env|config\.local|backup|final\.redscripts|game-bridge|resources\.archive|\.log$|Cyberpunk2077\.exe)/i);
    result=build(second);assert.equal(result.status,0,result.stderr);
    assert.equal(sha(readFileSync(first)),sha(readFileSync(second)),'same source/binary yields same ZIP');
    const rejected=path.join(directory,'public.zip');
    result=build(rejected,'public');
    assert.notEqual(result.status,0);assert.ok(!existsSync(rejected));
    writeFileSync(binary,'not a Windows DLL');
    result=build(path.join(directory,'invalid.zip'));
    assert.notEqual(result.status,0);assert.ok(!existsSync(path.join(directory,'invalid.zip')));
  } finally {
    const resolved=path.resolve(directory);
    assert.equal(path.dirname(resolved),path.resolve(tmpdir()));
    assert.ok(path.basename(resolved).startsWith('anpc-package-test-'));
    rmSync(resolved,{recursive:true});
  }
});
