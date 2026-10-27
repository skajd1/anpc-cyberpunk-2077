// API 호출 없이 현재 인물 선별 경로를 평가한다. baseline/오리지널 맥락은 상세 검색 분모에서 제외한다.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { loadPrototypeData } from '../prototype/server.js';
import { compileResearchTurn } from '../prototype/public/research.js';

export async function loadRetrievalSuite() {
  const bytes = await readFile(new URL('../content/evaluation/retrieval-v1.json', import.meta.url));
  return { ...JSON.parse(bytes), sha256: createHash('sha256').update(bytes).digest('hex') };
}
export function retrievalInput(item) {
  return { npcKey: item.npc_key, settings: { allowDraft: true, configuration: 'full', relationship: 'acquaintance',
    relationshipStage: item.state.relationship_stage, alive: true, free: true, basicKnowledge: true,
    relicKnown: false, relicDisclosed: false },
    context: { observations: {}, recent_turns: item.history, memory: null }, playerText: item.player_input };
}
export function measureRetrievalCase(item, selected, common, context, blocked, facts) {
  const expected = item.expected;
  const contains = (value, statement) => typeof value === 'string' ? value.includes(statement)
    : value && typeof value === 'object' ? Object.values(value).some(part => contains(part, statement)) : false;
  const leaked = expected.forbidden_fact_ids.filter(id => selected.includes(id) || common.includes(id)
    || (facts.has(id) && contains(context, facts.get(id).statement)));
  const gold = new Set(expected.detail_fact_ids);
  const found = selected.filter(id => gold.has(id)).length;
  const first = selected.findIndex(id => gold.has(id));
  const commonMissing = expected.common_fact_ids.filter(id => !common.includes(id));
  return { case_id: item.case_id, npc_key: item.npc_key, family: item.family, selected_fact_ids: selected,
    common_fact_ids: common, blocked,
    missing_fact_ids: expected.detail_fact_ids.filter(id => !selected.includes(id)),
    common_missing: commonMissing, leaked_fact_ids: leaked,
    recall_at_3: gold.size ? found / gold.size : null, reciprocal_rank: gold.size ? first < 0 ? 0 : 1 / (first + 1) : null,
    passed: leaked.length === 0 && found === gold.size && !commonMissing.length && blocked === expected.blocked };
}
export function summarizeRetrieval(cases) {
  const ranked = cases.filter(c => c.recall_at_3 !== null);
  return { cases: cases.length, scored_queries: ranked.length,
    recall_at_3: ranked.length ? ranked.reduce((n,c) => n + c.recall_at_3, 0) / ranked.length : null,
    mrr: ranked.length ? ranked.reduce((n,c) => n + c.reciprocal_rank, 0) / ranked.length : null,
    passed: cases.filter(c => c.passed).length, leaked_cases: cases.filter(c => c.leaked_fact_ids.length).length,
    common_missing_cases: cases.filter(c => c.common_missing.length).length };
}
export function validateRetrievalCases(bundle, suite) {
  const errors = [], ids = new Set(), facts = new Map(bundle.facts.map(f => [f.id, f]));
  const baseline = new Set(bundle.worldKnowledge.baseline_fact_ids);
  for (const item of suite.cases) {
    if (!item.case_id || ids.has(item.case_id)) errors.push('사례 ID 누락/중복');
    ids.add(item.case_id);
    const card = bundle.cards.find(c => c.character_key === item.npc_key);
    if (!card?.relationship_stages.some(s => s.id === item.state?.relationship_stage)) errors.push(`관계 단계: ${item.case_id}`);
    if (typeof item.player_input !== 'string' || !item.player_input.trim()) errors.push(`질문 누락: ${item.case_id}`);
    if (!Array.isArray(item.history) || item.history.some(t => !['player', 'npc'].includes(t.role) || typeof t.text !== 'string')) errors.push(`대화 기록: ${item.case_id}`);
    const expected = item.expected;
    if (!expected || typeof expected.blocked !== 'boolean') { errors.push(`기대값 누락: ${item.case_id}`); continue; }
    for (const key of ['detail_fact_ids', 'common_fact_ids', 'forbidden_fact_ids']) {
      if (!Array.isArray(expected[key]) || expected[key].some(id => !facts.has(id))
        || new Set(expected[key]).size !== expected[key].length) errors.push(`정답 사실 참조: ${item.case_id}/${key}`);
    }
    if (!Array.isArray(expected.detail_fact_ids) || !Array.isArray(expected.common_fact_ids) || !Array.isArray(expected.forbidden_fact_ids)) continue;
    if (expected.detail_fact_ids.length > 3 || expected.detail_fact_ids.some(id => baseline.has(id) || facts.get(id)?.usage_mode === 'canon_context')) errors.push(`상세 검색 분모: ${item.case_id}`);
    if (expected.common_fact_ids.some(id => !baseline.has(id))) errors.push(`공통 지식 정답: ${item.case_id}`);
    if ([...expected.detail_fact_ids, ...expected.common_fact_ids].some(id => expected.forbidden_fact_ids.includes(id))) errors.push(`허용/금지 정답 충돌: ${item.case_id}`);
  }
  return errors;
}
export async function evaluateRetrieval({ bundle, suite } = {}) {
  bundle ??= (await loadPrototypeData()).research;
  suite ??= await loadRetrievalSuite();
  const errors = validateRetrievalCases(bundle, suite);
  if (errors.length) throw new Error(errors.join(' / '));
  const facts = new Map(bundle.facts.map(f => [f.id, f]));
  const cases = suite.cases.map(item => {
    let selected = [], common = [], context = {}, blocked = false;
    try {
      const turn = compileResearchTurn({ bundle, ...retrievalInput(item) });
      selected = turn.diagnostics.selected_fact_ids; common = turn.diagnostics.common_fact_ids; context = turn.context;
    } catch (error) {
      // 예상한 단계 거부만 차단으로 처리한다. 일반 오류를 통과로 숨기지 않는다.
      if (!/새 대화를 시작할 수 없습니다/.test(error.message)) throw error;
      blocked = true;
    }
    return measureRetrievalCase(item, selected, common, context, blocked, facts);
  });
  return { suite_version: suite.suite_version, suite_sha256: suite.sha256, review_status: suite.review_status,
    content_version: bundle.version, metrics: summarizeRetrieval(cases),
    by_npc: Object.fromEntries(['judy', 'panam'].map(key => [key, summarizeRetrieval(cases.filter(c => c.npc_key === key))])), cases };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await evaluateRetrieval();
  console.log(JSON.stringify(report, null, 2));
  // 검색 미적중은 수치로 남기며 금지 항목 노출은 실행 실패다.
  if (report.metrics.leaked_cases) process.exitCode = 1;
}
