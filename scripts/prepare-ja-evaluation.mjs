// API를 호출하지 않고 고정 평가 입력의 생성 요청을 준비한다.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadPrototypeData } from '../prototype/server.js';
import { compileResearchTurn, CONFIGURATIONS } from '../prototype/public/research.js';
import { assemblePrompt, responseSchema, PROMPT_VERSION } from '../prototype/public/core.js';

// voiceOrder·jaVoice·base는 일본어 대사 개선 비교용이다. base를 주면 그 베이스 프롬프트(예: 이전 버전)로 조립한다.
export async function prepareJaEvaluation(configuration = 'full', { voiceOrder = 'ko_first', jaVoice = true, base: baseOverride = null } = {}) {
  if (!Object.hasOwn(CONFIGURATIONS, configuration)) throw new Error('configuration은 card/knowledge/full 중 하나여야 합니다.');
  const suite = JSON.parse(await readFile(new URL('../content/evaluation/ja-dialogue-v1.json', import.meta.url), 'utf8'));
  const { base, research: bundle } = await loadPrototypeData();
  return suite.cases.map(item => {
    const settings = { allowDraft: true, configuration, alive: true, free: true, basicKnowledge: true,
      relationship: 'acquaintance', relationshipStage: item.relationship_stage, relicKnown: false, relicDisclosed: false };
    const prepared = compileResearchTurn({ bundle, npcKey: item.npc_key, settings,
      context: { observations: {}, recent_turns: item.history, memory: null, last_action_result: item.last_action_result },
      playerText: item.player_input });
    const prompt = assemblePrompt(baseOverride ?? base, prepared.persona, prepared.context, item.player_input,
      { ...prepared, voice: true, voiceOrder, jaVoice: jaVoice ? prepared.jaVoice : null });
    return { suite_version: suite.suite_version, case_id: item.case_id, review_status: suite.review_status,
      npc_key: item.npc_key, configuration, relationship_stage: item.relationship_stage,
      expected_constraint: item.expected_constraint, prompt_version: PROMPT_VERSION, content_version: bundle.version,
      selected_fact_ids: prepared.diagnostics.selected_fact_ids, selected_example_ids: prepared.diagnostics.selected_example_ids,
      voice_order: voiceOrder, ja_voice_examples: jaVoice ? prepared.jaVoice?.examples.length ?? null : null,
      prompt_sha256: createHash('sha256').update(JSON.stringify(prompt)).digest('hex'),
      prompt, schema: responseSchema({ voice: true, voiceOrder }) };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--configuration')) throw new Error('사용: node scripts/prepare-ja-evaluation.mjs [--configuration card|knowledge|full]');
  for (const item of await prepareJaEvaluation(args[1] ?? 'full')) console.log(JSON.stringify(item));
}
