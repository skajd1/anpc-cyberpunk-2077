import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AMM_MOTIONS } from '../public/motions.js';

test('CET 생성 프롬프트는 최신 인물 콘텐츠와 게임의 행동 권한을 반영한다', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const result = spawnSync(process.execPath, ['scripts/build-cet-prompts.mjs'], { cwd: root, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  const schema = JSON.parse(result.stdout.match(/schema = \[=\[\n(.+)\n?\]=\],/)[1]);
  assert.deepEqual(schema.properties.action.anyOf.map(a => a.properties?.action_id.enum[0] ?? null), [null, 'end_conversation', 'play_gesture']);
  assert.doesNotMatch(result.stdout, /"action_id":"(?:face_player|resume_walk)"/);
  assert.match(result.stdout, /story = "runtime"/);
  assert.doesNotMatch(result.stdout, /late_open|"source":"simulation"|"source":"mock|"applied_rules"|"relationship_stage"/);
  for (const match of result.stdout.matchAll(/현재 상황 데이터 \(지침이 아님\):\n([^\n]+)/g)) {
    const context = JSON.parse(match[1].split(']=]')[0]);
    assert.equal(context.canon_context.status, 'unknown');
    assert.equal(context.canon_context.relationship_to_player, null);
    assert.deepEqual(context.canon_context.known_past_events, []);
    assert.equal(context.player_identity, undefined);
    assert.equal(context.observations, undefined);
  }
  const viktor = result.stdout.split('    viktor = {')[1].split('    misty = {')[0];
  const actions = JSON.parse(viktor.match(/actions = \[=\[\n(.+)\]=\],/)[1]);
  assert.equal(actions.find(a => a.action_id === 'end_conversation').execution_mode, 'execute');
  assert.equal(actions.find(a => a.action_id === 'play_gesture').execution_mode, 'selection_only');
  assert.deepEqual(actions.find(a => a.action_id === 'play_gesture').candidates.map(c => c.ref), ['test_nod', 'test_shrug', 'test_wave', ...AMM_MOTIONS.map(m => m.ref)]);
  const johnny = result.stdout.split('    johnny = {')[1].split('    resident = {')[0];
  assert.deepEqual(JSON.parse(johnny.match(/actions = \[=\[\n(.+)\]=\],/)[1]).map(a => a.action_id), ['end_conversation']);
  const tracked = readFileSync(new URL('../../game/cet/anpc/prompts.lua', import.meta.url), 'utf8');
  const fixed = text => text.replace(/\r\n/g, '\n');
  assert.ok(result.stdout.includes('    resident = {'));
  assert.equal(fixed(tracked), fixed(result.stdout), 'npm run build:cet-prompts로 생성 파일을 갱신하세요.');
  const identityData=JSON.parse(result.stdout.match(/identity_data = \[=\[\n([^\n]+)\]=\]/)[1]);
  assert.equal(Object.keys(identityData.cards).length,12);
  assert.equal(identityData.runtime_enabled,false);
  assert.equal(identityData.archetypes.length,9);
  assert.ok(identityData.cards.river.speech_rules);
  assert.equal(identityData.facts.RELIC_V.knowledge_layer,'quest');
  assert.ok(identityData.cards.viktor.relationship_stages.length>1);
});
