import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveRelationshipStage } from '../prototype/public/research.js';
import { evaluateStoryPolicy } from '../prototype/public/story.js';
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const root = 'content/cyberpunk2077/';
const policy = read(root + 'story-progression-policy.json'), manifest = read(root + 'manifest.json');
const cards = manifest.files.filter(f => f.startsWith('characters/')).map(f => read(root + f));
const registry = new Map(read('contracts/v1/cyberpunk2077-fields.json').fields.map(f => [f.field_id, f]));
const sources = new Set(read(root + 'sources.json').sources.map(s => s.id));
const facts = read(root + 'world-facts.json');
const quests = new Map(policy.quests.map(q => [q.id, q]));
assert.equal(quests.size, policy.quests.length, '퀘스트 ID 중복');
assert.equal(new Set(policy.characters.map(c => c.character_key)).size, cards.length);
function condition(c) {
  assert.ok(c && typeof c === 'object');
  if (c.all || c.any) { assert.ok((c.all ?? c.any).length); (c.all ?? c.any).forEach(condition); return; }
  if (c.not) { condition(c.not); return; }
  assert.ok(registry.has(c.field), `미등록 조건 필드: ${c.field}`);
  assert.ok(['eq', 'in', 'gte', 'lte'].includes(c.op)); assert.notEqual(c.value, undefined);
  if (c.op === 'in') assert.ok(Array.isArray(c.value) && c.value.length);
  const values = c.op === 'in' ? c.value : [c.value];
  if (c.field.startsWith('content.quests.')) assert.ok(values.every(v => policy.quest_statuses.includes(v)));
  if (c.field.startsWith('content.choices.')) assert.ok(values.every(v => policy.choices[c.field.slice('content.choices.'.length)]?.includes(v)));
}
const visited = new Set();
function visit(id, active = new Set()) {
  assert.ok(quests.has(id), `선행 퀘스트 누락: ${id}`); assert.ok(!active.has(id), `순환 의존: ${id}`);
  if (visited.has(id)) return;
  const path = new Set([...active, id]); quests.get(id).prerequisites.forEach(q => visit(q, path)); visited.add(id);
}
for (const q of policy.quests) {
  visit(q.id); assert.ok(registry.has(`content.quests.${q.id}`));
  assert.equal(q.game_binding, null, '검증되지 않은 게임 키를 출시 매핑으로 사용하지 않음');
  assert.equal(q.binding_status, 'unverified'); q.source_ids.forEach(id => assert.ok(sources.has(id), id));
}
let stages = 0;
for (const npc of policy.characters) {
  const card = cards.find(c => c.character_key === npc.character_key); assert.ok(card);
  assert.deepEqual(Object.keys(npc.stages).sort(), card.relationship_stages.map(s => s.id).sort());
  assert.ok(registry.has(`content.contact.${npc.character_key}`));
  assert.ok(npc.channels.every(c => policy.contacts.includes(c)));
  for (const rule of Object.values(npc.stages)) { condition(rule.condition); assert.equal(typeof rule.scene_only, 'boolean'); stages++; }
  npc.source_ids.forEach(id => assert.ok(sources.has(id), id));
}
for (const event of policy.events) {
  assert.ok(event.character_keys.length && event.character_keys.every(key => cards.some(c => c.character_key === key)));
  const fact = facts.find(f => f.id === event.fact_id);
  assert.equal(fact?.usage_mode, 'canon_context'); assert.ok(sources.has(fact.source.source_id)); condition(event.condition);
}
assert.equal(new Set(policy.events.map(e => e.id)).size, policy.events.length);
for (const key of Object.keys(policy.choices)) assert.ok(registry.has(`content.choices.${key}`));
assert.equal(new Set(policy.presets.map(p => p.id)).size, policy.presets.length);
for (const preset of policy.presets) {
  for (const field of Object.keys(preset.fields)) assert.ok(registry.has(field));
  for (const [key, id] of Object.entries(preset.relationship_stages)) {
    const card = cards.find(c => c.character_key === key), settings = { relationshipStage: id, storyState: { fields: preset.fields } };
    const result = evaluateStoryPolicy({ storyPolicy: policy, facts }, card, settings, resolveRelationshipStage(card, settings));
    assert.equal(result.allowed, !['finale', 'epilogue'].includes(preset.fields['content.story.period']), `${preset.id}/${key}: ${result.reason}`);
  }
}
console.log(JSON.stringify({ status: '통과', quest_candidates: quests.size, characters: cards.length, stage_rules: stages, presets: policy.presets.length, verified_game_bindings: 0 }, null, 2));
