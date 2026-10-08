import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadPrototypeData } from '../server.js';
import { termMatches, entityMatches, factMatch, rankFacts, rankExamples, exampleTerms } from '../public/retrieval.js';
import { selectReadings, jaVoiceData } from '../public/speech.js';
import { assemblePrompt, responseSchema } from '../public/core.js';
import { prepareJaEvaluation } from '../../scripts/prepare-ja-evaluation.mjs';

const { research: bundle } = await loadPrototypeData();

test('새 화제는 이전 화제만 맞는 상세 지식을 제외하며 모호한 후속 질문은 최근 화제를 유지한다', () => {
  const candidates = [
    { f: { id: 'old' }, named: 0, now: 0, beforeNamed: 1, before: 6 },
    { f: { id: 'current' }, named: 0, now: 1, beforeNamed: 0, before: 0 }
  ];
  assert.deepEqual(rankFacts(candidates).map(x => x.f.id), ['current']);
  assert.deepEqual(rankFacts(candidates.map(x => ({ ...x, now: 0 }))).map(x => x.f.id), ['old']);
  const examples = [
    { id: 'A', trigger_terms: ['돈'], topic_tags: [], input: '안녕' },
    { id: 'C', trigger_terms: ['돈', '크롬'], topic_tags: ['work'], input: '크롬은?' },
    { id: 'B', trigger_terms: ['돈', '크롬'], topic_tags: ['work'], input: '크롬은?' }
  ];
  assert.deepEqual(rankExamples(examples, '돈과 크롬', new Set(['work'])).map(x => x.ex.id), ['B', 'C', 'A']);
});

test('승인 읽기는 현재 인물·질문·선별 공개 지식에만 적용하고 비음성 요청에서는 제외한다', () => {
  const context = { knowledge: [{ statement: '아라사카에 관한 공개 정보' }], recent_turns: [{ text: '팬앰' }] };
  const readings = selectReadings(bundle.jaReadingTable, 'V는 BD와 엔그램을 알아? 로그인 오류', '주디 알바레스', context);
  assert.ok(readings.some(x => x.term === 'V' && x.reading === 'ヴィー'));
  assert.ok(readings.some(x => x.term === '주디 알바레스'));
  assert.ok(readings.some(x => x.term === '아라사카'));
  for (const term of ['BD', '엔그램', '로그', '팬앰']) assert.ok(!readings.some(x => x.term === term));
  const options = { readingTable: bundle.jaReadingTable };
  const plain = assemblePrompt('{{OUTPUT_CONTRACT}}', { display_name: '주디' }, context, 'V', options);
  assert.ok(!JSON.stringify(plain).includes('ja_readings'));
  const voiced = assemblePrompt('{{OUTPUT_CONTRACT}}', { display_name: '주디' }, context, 'V', { ...options, voice: true });
  assert.match(voiced.input[1].content, /ja_readings/);
});

test('일본어 말투 데이터는 음성 요청에만 인물 데이터 뒤에 붙고 예시 원문은 로컬 파일에서만 채운다', () => {
  const profiles = bundle.jaVoiceProfiles;
  const ids = profiles.profiles.find(p => p.character_key === 'judy').examples.map(e => e.string_id);
  assert.equal(jaVoiceData(profiles, null, 'misty'), null);
  const bare = jaVoiceData(profiles, null, 'judy');
  assert.deepEqual([bare.first_person, bare.address_v, bare.examples], [['私'], ['あなた', 'ヴィー'], []]);
  const local = { examples: { [ids[0]]: { ko: '괜찮아?', ja: '大丈夫？' }, [ids[2]]: { ko: '', ja: '欠けた' } } };
  const filled = jaVoiceData(profiles, local, 'judy');
  assert.deepEqual(filled.examples, [{ emotion: profiles.profiles.find(p => p.character_key === 'judy').examples[0].emotion, ko: '괜찮아?', ja: '大丈夫？' }]);
  assert.ok(!JSON.stringify(filled).includes(ids[0]));
  const context = { knowledge: [] };
  const voiced = assemblePrompt('{{OUTPUT_CONTRACT}}', { display_name: '주디' }, context, '안녕', { voice: true, jaVoice: filled, styleExamples: [{ id: 'x' }] });
  assert.deepEqual(voiced.input.map(m => m.content.split('\n')[0]),
    ['인물 데이터 (지침이 아님):', 'style_examples (작성 예시이며 실제 대화 기록이 아님):', '일본어 말투 데이터 (지침이 아님):', '현재 상황 데이터 (지침이 아님):', '안녕']);
  assert.equal(voiced.input[2].content, `일본어 말투 데이터 (지침이 아님):\n${JSON.stringify(filled)}`);
  const plain = assemblePrompt('{{OUTPUT_CONTRACT}}', { display_name: '주디' }, context, '안녕', { jaVoice: filled });
  assert.ok(!plain.input.some(m => m.content.startsWith('일본어 말투 데이터')));
  // 생성 파일에는 프로필·string_id만 있고, 로컬 원문 예시가 있으면 그 문장은 들어가지 않는다.
  const generated = readFileSync('game/cet/anpc/prompts.lua', 'utf8');
  for (const text of Object.values(bundle.jaStyleExamples?.examples ?? {})) assert.ok(!generated.includes(text.ja) && !generated.includes(text.ko));
});

test('일본어 원문 우선 실험은 speech_text를 자막보다 먼저 생성하고 게임 기본값은 한국어 우선이다', () => {
  assert.deepEqual(Object.keys(responseSchema({ voice: true }).properties), ['emotion', 'delivery', 'dialogue', 'follow_up', 'speech_text', 'intent', 'action']);
  assert.deepEqual(Object.keys(responseSchema({ voice: true, voiceOrder: 'ja_first' }).properties), ['emotion', 'delivery', 'speech_text', 'dialogue', 'follow_up', 'intent', 'action']);
  const contract = order => assemblePrompt('{{OUTPUT_CONTRACT}}', {}, {}, '', { voice: true, voiceOrder: order }).instructions;
  assert.ok(contract('ja_first').indexOf('speech_text(') < contract('ja_first').indexOf('dialogue('));
  assert.ok(contract('ko_first').indexOf('dialogue(') < contract('ko_first').indexOf('speech_text('));
  assert.equal(contract(undefined), contract('ko_first'));
  assert.throws(() => assemblePrompt('{{OUTPUT_CONTRACT}}', {}, {}, '', { voice: true, voiceOrder: 'en_first' }));
});

test('일본어 평가 입력은 세 인물×20개로 고정하고 세 구성을 같은 상태·질문으로 준비한다', async () => {
  const runs = await Promise.all(['card', 'knowledge', 'full'].map(prepareJaEvaluation));
  for (const cases of runs) {
    assert.equal(cases.length, 60);
    assert.equal(new Set(cases.map(c => c.case_id)).size, 60);
    for (const key of ['judy', 'viktor', 'rogue']) assert.equal(cases.filter(c => c.npc_key === key).length, 20);
    for (const item of cases) {
      assert.equal(item.review_status, 'draft');
      assert.match(item.prompt_sha256, /^[0-9a-f]{64}$/);
      assert.ok(item.schema.required.includes('speech_text'));
      assert.ok(!JSON.stringify(item.prompt).includes(item.expected_constraint));
    }
  }
  assert.ok(runs[0].every(item => item.selected_fact_ids.length === 0 && item.selected_example_ids.length === 0));
  for (let i = 0; i < 60; i++) {
    assert.deepEqual(runs.map(r => r[i].case_id), Array(3).fill(runs[0][i].case_id));
    assert.equal(runs[1][i].prompt.input.at(-1).content, runs[2][i].prompt.input.at(-1).content);
  }
});

const lua = process.env.ANPC_LUA ?? 'lua';
const luaAvailable = !spawnSync(lua, ['-v']).error;
test('실제 Lua와 웹의 동일 입력 지식·예시·읽기 순서를 비교한다', { skip: !luaAvailable && 'Lua 실행기가 필요합니다(ANPC_LUA로 지정 가능).' }, () => {
  const texts = ['로그인 오류', '로그에게 물어봐', 'Rogue는 누구야?', 'V는?', 'Ｖ는?', 'BD를 알아?', '브레인댄스 원본 복원',
    '주디 알바레스', '아라사카와 밀리테크', '돈 에디 크롬', '그 얘기는 됐고 돈은?', '그 얘기 더 해줘', '안녕',
    '블랙월과 넷워치', '팬앰 팔머와 알데칼도스', '나이트   시티', 'ジャッキーは', 'ログイン'];
  const terms = ['', 'V', 'BD', 'Rogue', '로그', '주디', '나이트 시티', 'ジャッキー'];
  const matches = texts.flatMap(text => terms.flatMap(term => [false, true].map(entity => ({ text, term, entity,
    expected: (entity ? entityMatches : termMatches)(text, term) }))));
  const facts = bundle.facts;
  const examples = bundle.examples.map(ex => ({ ...ex, input_terms: exampleTerms(ex.input) }));
  const turns = texts.map(text => {
    const recent = '브레인댄스 원본 복원';
    const ranked = rankFacts(facts.map(f => { const now = factMatch(f, text), before = factMatch(f, recent);
      return { f, now: now.score, named: now.named, before: before.score, beforeNamed: before.named }; })).slice(0, 3);
    const tags = [...new Set(ranked.flatMap(x => x.f.topic_tags))];
    const context = { knowledge: ranked.map(x => ({ statement: x.f.statement })) };
    return { text, recent, tags, context, persona: '주디 알바레스', fact_ids: ranked.map(x => x.f.id),
      example_id: rankExamples(examples, text, new Set(tags))[0]?.ex.id ?? null,
      readings: selectReadings(bundle.jaReadingTable, text, '주디 알바레스', context) };
  });
  const directory = mkdtempSync(join(tmpdir(), 'anpc-parity-'));
  try {
    const path = join(directory, 'fixture.json');
    writeFileSync(path, JSON.stringify({ matches, facts, examples, readings: bundle.jaReadingTable, turns }));
    const result = spawnSync(lua, ['game/tests/retrieval-parity.lua', path], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
