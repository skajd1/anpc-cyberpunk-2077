import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('CET 생성 프롬프트는 최신 인물 콘텐츠와 게임의 행동 권한을 반영한다', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const result = spawnSync(process.execPath, ['scripts/build-cet-prompts.mjs'], { cwd: root, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  const schema = JSON.parse(result.stdout.match(/schema = \[=\[\n(.+)\n?\]=\],/)[1]);
  assert.deepEqual(schema.properties.action.anyOf.map(a => a.properties?.action_id.enum[0] ?? null), [null, 'end_conversation']);
  assert.doesNotMatch(result.stdout, /"action_id":"(?:face_player|resume_walk|play_gesture)"/);
  const tracked = readFileSync(new URL('../../game/cet/anpc/prompts.lua', import.meta.url), 'utf8');
  // 군중 시험 카드의 Big Five는 빌드마다 추첨된다. 고정 인물·스키마는 자료와 항상 일치해야 한다.
  const fixed = text => text.replace(/\r\n/g, '\n').split('    resident = {')[0];
  assert.ok(result.stdout.includes('    resident = {'));
  assert.equal(fixed(tracked), fixed(result.stdout), 'npm run build:cet-prompts로 생성 파일을 갱신하세요.');
});
