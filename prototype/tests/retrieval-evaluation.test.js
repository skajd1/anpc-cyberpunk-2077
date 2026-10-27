import { selectReadings } from '../public/speech.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadPrototypeData } from '../server.js';
import { loadRetrievalSuite, evaluateRetrieval, measureRetrievalCase, validateRetrievalCases } from '../../scripts/evaluate-retrieval.mjs';
import { validateEntities, indexFactEntities } from '../public/entities.js';
import { factMatch, rankFacts } from '../public/retrieval.js';

const { research: bundle } = await loadPrototypeData();
const suite = await loadRetrievalSuite();
const baseline = JSON.parse(await readFile(new URL('../../content/evaluation/retrieval-baseline-v1.json', import.meta.url), 'utf8'));

test('검색 평가 입력과 변경 전 기준선을 고정하고 인물별 30개·상세/공통/차단 검사를 구분한다', async () => {
  assert.equal(suite.sha256, baseline.suite_sha256, '평가 입력을 변경할 때 기준선을 조용히 덮어쓰지 마세요.');
  assert.equal(suite.review_status, 'draft');
  assert.deepEqual(validateRetrievalCases(bundle, suite), []);
  const typo = structuredClone(suite);
  typo.cases[0].expected.forbidden_fact_ids.push('미등록 사실 ID');
  assert.ok(validateRetrievalCases(bundle, typo).length > 0);
  assert.equal(new Set(suite.cases.map(c => c.case_id)).size, 60);
  assert.equal(suite.cases.filter(c => c.npc_key === 'judy').length, 30);
  assert.equal(suite.cases.filter(c => c.npc_key === 'panam').length, 30);
  const report = await evaluateRetrieval({ bundle, suite });
  assert.equal(report.metrics.scored_queries, 42);
  assert.equal(report.metrics.passed, 60, JSON.stringify(report.cases.filter(c => !c.passed)));
  assert.equal(report.metrics.leaked_cases, 0);
  assert.ok(report.metrics.recall_at_3 > baseline.metrics.recall_at_3);
  assert.ok(report.metrics.mrr >= baseline.metrics.mrr);
});

test('개체는 별칭·한글 띄어쓰기만 연결하며 지식 내용·인지 조건·검수 상태를 바꾸지 않는다', () => {
  assert.deepEqual(validateEntities(bundle.entityBook, bundle.facts, bundle.jaReadingTable), []);
  const raw = { id: 'sample', entity_ids: ['person.judy'], statement: 'KEEP', review_status: 'draft', validity_condition: { field: 'test', op: 'eq', value: true } };
  const [indexed] = indexFactEntities([raw], bundle.entityBook);
  assert.equal(indexed.statement, raw.statement);
  assert.equal(indexed.review_status, 'draft');
  assert.deepEqual(indexed.validity_condition, raw.validity_condition);
  assert.ok(indexed.entity_aliases.includes('주디알바레스'));
  assert.ok(indexed.entity_aliases.includes('Judy Alvarez'));
  const city = selectReadings(bundle.jaReadingTable, 'Night City는 어떤 곳이야?', '', {}, bundle.entityBook);
  assert.ok(city.some(entry => entry.term === '나이트 시티' && entry.reading === 'ナイトシティ'));
  assert.ok(!selectReadings(bundle.jaReadingTable, 'Adam Smasher', '', {}, bundle.entityBook).some(entry => entry.term.includes('스매셔')));
  const collision = structuredClone(bundle.entityBook);
  collision.entities[1].aliases.push('주디알바레스');
  assert.ok(validateEntities(collision, bundle.facts, bundle.jaReadingTable).some(e => e.includes('충돌')));
  const missing = structuredClone(bundle.entityBook);
  missing.entities[0].reading_terms.push('미확인 읽기');
  assert.ok(validateEntities(missing, bundle.facts, bundle.jaReadingTable).some(e => e.includes('읽기')));
});

test('작성된 질문 표현은 일반 단어 수보다 우선하되 인명 경계·인지 검사를 대체하지 않는다', () => {
  const match = factMatch({ entity_aliases: [], trigger_terms: [], search_phrases: ['braindance editing'] }, 'braindance editing은?');
  assert.equal(match.phrases, 1);
  const ranked = rankFacts([
    { f: { id: 'words' }, named: 0, now: 10, phrases: 0, beforeNamed: 0, before: 0 },
    { f: { id: 'phrase' }, named: 0, now: 1, phrases: 1, beforeNamed: 0, before: 0 }
  ]);
  assert.equal(ranked[0].f.id, 'phrase');
  const rogue = bundle.facts.find(f => f.id === 'PANAM_ROGUE_WORK');
  for (const text of ['로그인', 'RogueLike', '프롤로그']) assert.equal(factMatch(rogue, text).score, 0);
});

const lua = process.env.ANPC_LUA ?? 'lua';
const available = !spawnSync(lua, ['-v']).error;
test('60개 평가 입력의 실제 CET 조립 결과·비밀 차단·일본어 프로필을 웹과 비교한다', { skip: !available && 'Lua 실행기가 필요합니다.' }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'anpc-retrieval-'));
  try {
    const path = join(directory, 'cases.json');
    await writeFile(path, JSON.stringify(suite));
    const result = spawnSync(lua, ['game/tests/retrieval-cases.lua', path], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const cases = JSON.parse(result.stdout);
    const web = await evaluateRetrieval({ bundle, suite });
    const facts = new Map(bundle.facts.map(f => [f.id, f]));
    for (let i = 0; i < cases.length; i++) {
      const item = cases[i], expected = suite.cases[i], original = web.cases[i];
      assert.equal(item.case_id, expected.case_id);
      assert.deepEqual(item.selected_fact_ids, original.selected_fact_ids, item.case_id);
      assert.deepEqual([...item.common_fact_ids].sort(), [...original.common_fact_ids].sort(), item.case_id);
      if (!item.blocked) assert.deepEqual(item.ja_readings, selectReadings(bundle.jaReadingTable, expected.player_input,
        bundle.cards.find(c => c.character_key === expected.npc_key).display_name, item.context, bundle.entityBook), item.case_id);
      const measured = measureRetrievalCase(expected, item.selected_fact_ids, item.common_fact_ids, item.context, item.blocked, facts);
      assert.ok(measured.passed, JSON.stringify(measured));
      assert.equal(item.ja_profile_messages, !item.blocked && expected.npc_key === 'judy' ? 1 : 0, item.case_id);
    }
    assert.equal(cases.length, 60);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('상세 ID가 없어도 오리지널 맥락에 섞인 금지 원문을 검출한다', () => {
  const item = { case_id: 'secret-probe', npc_key: 'judy', family: '비밀', expected: {
    detail_fact_ids: [], common_fact_ids: [], forbidden_fact_ids: ['secret'], blocked: false } };
  const statement = '그는 "숨긴 사실"을 알고 있다.';
  const result = measureRetrievalCase(item, [], [], { canon_context: { known_past_events: [statement] } }, false,
    new Map([['secret', { statement }]]));
  assert.deepEqual(result.leaked_fact_ids, ['secret']);
  assert.equal(result.passed, false);
});
