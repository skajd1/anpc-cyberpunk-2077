// 설계 패키지에 사용한 부분집합 검사. 게임 런타임/범용 JSON Schema 검사기가 아니다.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = name => JSON.parse(fs.readFileSync(new URL(`../contracts/v1/${name}`, import.meta.url), 'utf8'));
const schema = read('module-contracts.schema.json'), registry = read('registry.json'), cases = read('examples.json');
const supported = new Set(['$schema', '$id', 'title', 'description', '$defs', '$ref', 'type', 'const', 'enum', 'oneOf', 'allOf',
  'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems', 'minLength', 'maxLength', 'minimum', 'maximum', 'format']);
const resolve = (pointer, root = schema) => {
  assert.ok(pointer.startsWith('#/$defs/'), `로컬 참조만 지원: ${pointer}`);
  const result = root.$defs[pointer.slice('#/$defs/'.length)];
  assert.ok(result, `누락 참조: ${pointer}`); return result;
};
function inspect(s, root = schema) {
  if (typeof s === 'boolean') return;
  for (const key of Object.keys(s)) assert.ok(supported.has(key), `미지원 스키마 키워드: ${key}`);
  if (s.$ref) resolve(s.$ref, root);
  for (const child of Object.values(s.$defs ?? {})) inspect(child, root);
  for (const child of Object.values(s.properties ?? {})) inspect(child, root);
  for (const child of [...s.oneOf ?? [], ...s.allOf ?? []]) inspect(child, root);
  for (const child of [s.items, s.additionalProperties]) if (typeof child === 'object') inspect(child, root);
}
function accepts(s, value, root = schema) {
  if (typeof s === 'boolean') return s;
  if (s.$ref && !accepts(resolve(s.$ref, root), value, root)) return false;
  if (s.const !== undefined && value !== s.const) return false;
  if (s.enum && !s.enum.includes(value)) return false;
  if (s.oneOf && s.oneOf.filter(child => accepts(child, value, root)).length !== 1) return false;
  if (s.allOf && !s.allOf.every(child => accepts(child, value, root))) return false;
  const object = value !== null && typeof value === 'object' && !Array.isArray(value);
  const types = { object, array: Array.isArray(value), string: typeof value === 'string', null: value === null,
    number: typeof value === 'number' && Number.isFinite(value), integer: Number.isInteger(value), boolean: typeof value === 'boolean' };
  if (s.type && !types[s.type]) return false;
  if (object) {
    if (s.required?.some(key => !Object.hasOwn(value, key))) return false;
    for (const [key, v] of Object.entries(value)) {
      if (s.properties?.[key]) { if (!accepts(s.properties[key], v, root)) return false; }
      else if (s.additionalProperties === false) return false;
      else if (typeof s.additionalProperties === 'object' && !accepts(s.additionalProperties, v, root)) return false;
    }
  }
  if (Array.isArray(value) && ((s.minItems != null && value.length < s.minItems) || (s.maxItems != null && value.length > s.maxItems)
    || (s.items && !value.every(v => accepts(s.items, v, root))))) return false;
  if (typeof value === 'string') {
    const length = [...value].length;
    if ((s.minLength != null && length < s.minLength) || (s.maxLength != null && length > s.maxLength)) return false;
    if (s.format === 'date-time' && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value)))) return false;
  }
  if (typeof value === 'number' && ((s.minimum != null && value < s.minimum) || (s.maximum != null && value > s.maximum))) return false;
  return true;
}
function envelopeValid(value) {
  if (!accepts(schema.$defs.Envelope, value)) return false;
  if (value.contract === 'prompt.model-input') {
    const messages = value.data.data_messages, order = ['persona', 'style_examples', 'context', 'identity_reminder', 'recent_turn', 'player_input'];
    const kinds = messages.map(m => m.kind);
    const fixed = kinds.filter(k => k !== 'recent_turn');
    if (new Set(fixed).size !== fixed.length || kinds[0] !== 'persona' || kinds.at(-1) !== 'player_input'
      || !kinds.includes('context') || kinds.some((k, i) => i && order.indexOf(k) < order.indexOf(kinds[i - 1]))) return false;
    const viewTypes = { persona: schema.$defs.PersonaView, context: schema.$defs.PromptContextData,
      style_examples: { type: 'array', items: schema.$defs.StyleExample }, identity_reminder: schema.$defs.IdentityReminder };
    for (const m of messages) if (viewTypes[m.kind]) {
      try { if (!accepts(viewTypes[m.kind], JSON.parse(m.content))) return false; } catch { return false; }
    }
  }
  return true;
}
function callValid(value) {
  if (!accepts(schema.$defs.Call, value)) return false;
  const port = registry.ports[value.port]; if (!port || (port.requires_fence && !value.fence) || !value.inputs.every(envelopeValid)) return false;
  const kinds = value.inputs.map(v => v.contract), fixed = port.inputs;
  if (!fixed.every((kind, i) => kinds[i] === kind) || kinds.length < fixed.length) return false;
  return kinds.length === fixed.length || (port.repeat_input && kinds.slice(fixed.length).every(k => k === port.repeat_input));
}
inspect(schema);
assert.equal(registry.contract_version, '1.0');
assert.deepEqual(schema.$defs.BaseEnvelope.properties.contract.enum, Object.keys(registry.contracts));
for (const def of Object.values(registry.contracts)) assert.ok(schema.$defs[def], `미등록 타입: ${def}`);
for (const port of Object.values(registry.ports)) for (const contract of [...port.inputs, ...port.outputs]) assert.ok(registry.contracts[contract], `미등록 포트 타입: ${contract}`);
for (const [name, value] of Object.entries(cases.valid)) assert.ok(envelopeValid(value), `정상 예시 거부: ${name}`);
assert.deepEqual(new Set(Object.values(cases.valid).map(v => v.contract)), new Set(Object.keys(registry.contracts)), '모든 계약의 정상 예시 필요');
for (const c of cases.invalid) {
  const value = structuredClone(cases.valid[c.base]);
  const keys = c.path.split('/').filter(Boolean); let owner = value;
  for (const key of keys.slice(0, -1)) owner = owner[key];
  if (c.operation === 'delete') delete owner[keys.at(-1)]; else owner[keys.at(-1)] = c.value;
  assert.ok(!envelopeValid(value), `금지 예시 수용: ${c.name}`);
}
for (const c of cases.calls) assert.equal(callValid(c.value), c.accepted, `포트 호출: ${c.name}`);
for (const c of cases.replies) {
  const expected = registry.ports[c.port]?.outputs;
  const valid = accepts(schema.$defs.Reply, c.value) && (c.value.status !== 'ok' || (expected
    && c.value.outputs.length === expected.length
    && c.value.outputs.every((v, i) => v.contract === expected[i] && envelopeValid(v))));
  assert.equal(Boolean(valid), c.accepted, `결과: ${c.name}`);
}
const configuration = read('integration-configuration.schema.json'), integration = read('integration-examples.json');
const fieldCatalog = read('cyberpunk2077-fields.json');
const unique = values => new Set(values).size === values.length;
function configurationValid(value) {
  if (!accepts(configuration, value, configuration)) return false;
  if (value.kind === 'field_registry') {
    if (!unique(value.fields.map(f => f.field_id))) return false;
    const byId = new Map(value.fields.map(f => [f.field_id, f]));
    return value.fields.every(f => {
      const numeric = ['integer', 'number'].includes(f.value_type), guard = byId.get(f.observation_guard);
      return (numeric || (f.unit === 'none' && f.minimum === null && f.maximum === null))
        && (f.minimum === null || f.maximum === null || f.minimum <= f.maximum)
        && (f.value_type !== 'integer' || [f.minimum, f.maximum].every(n => n === null || Number.isInteger(n)))
        && (f.observation_guard === null || (guard && guard.value_type === 'boolean'
          && guard.field_id !== f.field_id && guard.observation_guard === null));
    });
  }
  if (value.kind === 'module_manifest') return unique(value.ports) && value.ports.every(p => registry.ports[p])
    && unique(value.contract_versions) && value.contract_versions.every(v => v === registry.contract_version)
    && unique(value.dependencies.map(d => d.dependency_id));
  if (!unique(value.required_ports) || !value.required_ports.every(p => registry.ports[p])
    || !unique(value.bindings.map(b => b.port))
    || !value.required_ports.every(p => value.bindings.some(b => b.port === p))) return false;
  const implementations = new Map();
  return value.bindings.every(b => {
    const m = integration.manifests.find(m => m.module_id === b.module_id && m.module_version === b.module_version);
    if (!m || !configurationValid(m) || !m.ports.includes(b.port)
      || !['portable', value.environment === 'test' ? 'simulation' : 'game'].includes(m.environment)
      || !unique(b.resources.map(r => r.dependency_id))
      || !b.resources.every(r => m.dependencies.some(d => d.dependency_id === r.dependency_id))
      || !m.dependencies.filter(d => d.required).every(d => b.resources.some(r => r.dependency_id === d.dependency_id))) return false;
    const key = `${b.module_id}@${b.module_version}`;
    const settings = JSON.stringify([b.config_ref, [...b.resources].sort((a, c) => a.dependency_id.localeCompare(c.dependency_id))]);
    if (implementations.has(key) && implementations.get(key) !== settings) return false;
    implementations.set(key, settings); return true;
  });
}
inspect(configuration, configuration);
assert.ok(unique(integration.manifests.map(m => `${m.module_id}@${m.module_version}`)), '중복 구현 등록');
for (const manifest of integration.manifests) assert.ok(configurationValid(manifest), '가상 구현 선언 오류');
assert.ok(configurationValid(fieldCatalog), '상태 필드 등록표 오류');
const facts = JSON.parse(fs.readFileSync(new URL('../content/cyberpunk2077/world-facts.json', import.meta.url), 'utf8'));
assert.deepEqual(fieldCatalog.fields.filter(f => f.field_id.startsWith('content.grants.')).map(f => f.field_id),
  facts.filter(f => f.usage_mode !== 'canon_context').map(f => `content.grants.${f.id}`), '인지 조건 필드와 지식 사실 목록 불일치');
for (const [name, value] of Object.entries(integration.valid)) assert.ok(configurationValid(value), `정상 구성 거부: ${name}`);
for (const c of integration.invalid) assert.ok(!configurationValid(c.value), `금지 구성 수용: ${c.name}`);
console.log(JSON.stringify({status:'통과', contracts:Object.keys(registry.contracts).length, ports:Object.keys(registry.ports).length,
  valid_examples:Object.keys(cases.valid).length, rejected_examples:cases.invalid.length, calls:cases.calls.length, replies:cases.replies.length,
  registered_fields:fieldCatalog.fields.length, valid_configurations:Object.keys(integration.valid).length,
  rejected_configurations:integration.invalid.length}, null, 2));
