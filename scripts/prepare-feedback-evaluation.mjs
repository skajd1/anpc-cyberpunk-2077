// 수정 직전 요청을 저장한 뒤 같은 질문·자료에서 공통 생성 지침만 비교한다.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPrototypeData } from '../prototype/server.js';
import { compileResearchTurn } from '../prototype/public/research.js';
import { assemblePrompt, responseSchema, PROMPT_VERSION } from '../prototype/public/core.js';
import { sha256 } from './prepare-lore-evaluation.mjs';

export const DEFAULT_FEEDBACK_BASELINE = 'config.local.lore-eval/feedback-v1-baseline/requests.json';
export const DIVERSE_FEEDBACK_SUITE = new URL('../content/evaluation/lore-feedback-diverse-v1.json', import.meta.url);

export async function captureFeedbackRequests({ suitePath = new URL('../content/evaluation/lore-feedback-v1.json', import.meta.url) } = {}) {
  const suite = JSON.parse(await readFile(suitePath, 'utf8'));
  const { base, research: bundle } = await loadPrototypeData();
  assert.equal(new Set(suite.cases.map(c => c.case_id)).size, suite.cases.length);
  const pairs = suite.cases.map(item => {
    const prepared = compileResearchTurn({ bundle, npcKey: item.npc_key, playerText: item.player_input,
      settings: { allowDraft: true, configuration: suite.configuration, alive: true, free: true, basicKnowledge: true,
        relationshipStage: item.relationship_stage, relicKnown: false, relicDisclosed: false },
      context: { observations: {}, recent_turns: item.history, memory: null, last_action_result: null } });
    const prompt = assemblePrompt(base, prepared.persona, prepared.context, item.player_input,
      { ...prepared, voice: true, voiceOrder: suite.voice_order });
    const selected = prepared.context.knowledge;
    return { ...item,
      preflight_errors: [...item.expected_fact_ids.filter(id => !selected.some(k => k.fact_id === id)).map(id => '필요한 사실 미선택: ' + id),
        ...item.forbidden_perspective_fact_ids.filter(id => selected.some(k => k.fact_id === id && k.perspective)).map(id => '차단 관점 선택: ' + id)],
      ja_voice_profile_present: Boolean(prepared.jaVoice), ja_voice_example_count: prepared.jaVoice?.examples.length ?? 0,
      reference: { relationship: prepared.persona.relationship_to_player, allowed_knowledge: selected,
        knowledge_boundaries: prepared.context.knowledge_boundaries, common_knowledge: prepared.context.common_knowledge,
        canon_context: prepared.context.canon_context, voice_style: prepared.persona.voice_style },
      schema: responseSchema({ voice: true, voiceOrder: suite.voice_order }), prompt, prompt_sha256: sha256(prompt) };
  });
  return { suite_version: suite.suite_version, suite_sha256: sha256(suite), review_status: suite.review_status,
    prompt_version: PROMPT_VERSION, content_version: bundle.version, configuration: suite.configuration,
    voice_order: suite.voice_order, repetitions: 1, review_title: suite.review_title, pairs };
}

export function pairFeedbackRequests(before, after) {
  assert.equal(before.suite_sha256, after.suite_sha256, '평가 입력이 변경됐습니다.');
  assert.equal(before.content_version, after.content_version, '콘텐츠 변경이 섞였습니다.');
  assert.equal(before.pairs.length, after.pairs.length);
  const pairs = after.pairs.map((current, index) => {
    const previous = before.pairs[index]; assert.equal(previous.case_id, current.case_id);
    assert.equal(previous.prompt_sha256, sha256(previous.prompt), '기준 요청 해시 불일치');
    assert.equal(current.prompt_sha256, sha256(current.prompt), '현재 요청 해시 불일치');
    assert.deepEqual(previous.reference, current.reference, '사실·관계·관점이 변경됐습니다.');
    assert.deepEqual(previous.schema, current.schema, '출력 스키마가 변경됐습니다.');
    assert.deepEqual({ ...previous.prompt, instructions: current.prompt.instructions }, current.prompt, '베이스 지침 외 입력이 변경됐습니다.');
    assert.notEqual(previous.prompt.instructions, current.prompt.instructions, '두 지침이 동일합니다.');
    const { prompt, prompt_sha256, ...rest } = current;
    return { ...rest, arms: [{ arm: 'before_feedback', prompt: previous.prompt, prompt_sha256: previous.prompt_sha256 },
      { arm: 'after_feedback', prompt, prompt_sha256 }] };
  });
  return { ...after, baseline_prompt_version: before.prompt_version, baseline_sha256: sha256(before), pairs,
    comparison: '같은 관점·사실·관계·이력에서 사람 피드백을 반영한 공통 지침 전후 비교',
    comparison_label: '피드백 반영 전후 비교', planned_requests: pairs.length * 2,
    review_title: after.review_title ?? '대화 피드백 반영 전후 · 집중 재검수',
    review_intro: `${pairs.length}개 상황에서 피드백 반영 전후의 대화 규칙을 비교합니다. 두 쪽 모두 기존 관점 자료를 사용합니다. 모델·질문·사실·관계·일본어 우선 생성·출력 스키마는 같고 공통 지침만 다릅니다. 후보 A/B 순서는 항목별로 섞었습니다. 앞선 대화가 있는 항목은 그 흐름도 함께 봐주세요. 앞선 대화는 검수용 가상 입력입니다. 말투와 반응을 골라주세요. 사실·원작 말투·일본어 품질의 최종 승인은 별도입니다.` };
}

// 과거의 응답이나 콘텐츠를 재현하지 않는다. 저장된 공통 지침을 새 평가 입력에 적용한다.
export function applySavedFeedbackInstructions(saved, current) {
  assert.ok(saved.pairs.length, '저장된 기준 요청이 없습니다.');
  const instructions = new Set(saved.pairs.map(p => {
    assert.equal(p.prompt_sha256, sha256(p.prompt), '저장 지침의 원본 해시 불일치');
    return p.prompt.instructions;
  }));
  assert.equal(instructions.size, 1, '기준 요청의 공통 지침이 동일하지 않습니다.');
  assert.equal(saved.voice_order, current.voice_order, '기준 지침의 언어 순서가 다릅니다.');
  for (const pair of current.pairs) assert.deepEqual(pair.schema, saved.pairs[0].schema, '기준 지침의 출력 계약이 다릅니다.');
  const before = structuredClone(current);
  before.prompt_version = saved.prompt_version;
  for (const pair of before.pairs) {
    pair.prompt.instructions = [...instructions][0];
    pair.prompt_sha256 = sha256(pair.prompt);
  }
  return { ...pairFeedbackRequests(before, current), baseline_origin_sha256: sha256(saved),
    baseline_provenance: `저장된 공통 지침을 새 ${current.pairs.length}개 상황의 현재 콘텐츠 입력에 적용했다. 과거 응답·과거 콘텐츠와의 비교가 아니다.` };
}

export async function prepareDiverseFeedbackEvaluation(baselinePath = DEFAULT_FEEDBACK_BASELINE) {
  return applySavedFeedbackInstructions(JSON.parse(await readFile(baselinePath, 'utf8')),
    await captureFeedbackRequests({ suitePath: DIVERSE_FEEDBACK_SUITE }));
}

export async function prepareFeedbackEvaluation(baselinePath = DEFAULT_FEEDBACK_BASELINE) {
  return pairFeedbackRequests(JSON.parse(await readFile(baselinePath, 'utf8')), await captureFeedbackRequests());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--capture') {
    const path = process.argv[3] ?? DEFAULT_FEEDBACK_BASELINE;
    await mkdir(dirname(path), { recursive: true });
    const requests = await captureFeedbackRequests();
    await writeFile(path, JSON.stringify(requests, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ baseline_path: path, prompt_version: requests.prompt_version, cases: requests.pairs.length,
      preflight_errors: requests.pairs.filter(p => p.preflight_errors.length).map(p => [p.case_id, p.preflight_errors]) }));
  } else console.log(JSON.stringify(await prepareFeedbackEvaluation(process.argv[2]), null, 2));
}
