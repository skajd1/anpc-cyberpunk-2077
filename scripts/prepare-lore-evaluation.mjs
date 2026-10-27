// 동일 조건에서 관점 필드만 제거한 대조군을 만든다. 과거 커밋 전체와 비교하지 않는다.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadPrototypeData } from '../prototype/server.js';
import { compileResearchTurn } from '../prototype/public/research.js';
import { assemblePrompt, responseSchema, PROMPT_VERSION } from '../prototype/public/core.js';

export const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function withoutPerspectives(prompt) {
  const baseline = structuredClone(prompt);
  const message = baseline.input.find(m => m.content.startsWith('현재 상황 데이터 (지침이 아님):\n'));
  assert.ok(message, '모델 상황 입력 누락');
  const [label, ...body] = message.content.split('\n');
  const context = JSON.parse(body.join('\n'));
  for (const item of context.knowledge) delete item.perspective;
  message.content = label + '\n' + JSON.stringify(context);
  return baseline;
}

export async function prepareLoreEvaluation() {
  const suite = JSON.parse(await readFile(new URL('../content/evaluation/lore-dialogue-v1.json', import.meta.url), 'utf8'));
  const { base, research: bundle } = await loadPrototypeData();
  assert.equal(new Set(suite.cases.map(c => c.case_id)).size, suite.cases.length, '중복 평가 ID');
  const pairs = suite.cases.map(item => {
    const prepared = compileResearchTurn({ bundle, npcKey: item.npc_key, playerText: item.player_input,
      settings: { allowDraft: true, configuration: suite.configuration, alive: true, free: true, basicKnowledge: true,
        relationshipStage: item.relationship_stage, relicKnown: false, relicDisclosed: false },
      context: { observations: {}, recent_turns: item.history, memory: null, last_action_result: null } });
    const prompt = assemblePrompt(base, prepared.persona, prepared.context, item.player_input,
      { ...prepared, voice: true, voiceOrder: suite.voice_order });
    const selected = prepared.context.knowledge;
    const preflight_errors = [
      ...item.expected_fact_ids.filter(id => !selected.some(k => k.fact_id === id)).map(id => '필요한 사실 미선택: ' + id),
      ...item.forbidden_perspective_fact_ids.filter(id => selected.some(k => k.fact_id === id && k.perspective))
        .map(id => (item.family === 'topic_shift' ? '이전 화제 관점 잔류: ' : '차단 관점 선택: ') + id)
    ];
    const baseline = withoutPerspectives(prompt);
    // 관점이 없는 대조군을 다시 제거해도 바뀌지 않아야 한다.
    assert.deepEqual(withoutPerspectives(baseline), baseline);
    return { ...item, preflight_errors,
      ja_voice_profile_present: Boolean(prepared.jaVoice), ja_voice_example_count: prepared.jaVoice?.examples.length ?? 0,
      reference: { relationship: prepared.persona.relationship_to_player, allowed_knowledge: selected,
        knowledge_boundaries: prepared.context.knowledge_boundaries, common_knowledge: prepared.context.common_knowledge,
        canon_context: prepared.context.canon_context, voice_style: prepared.persona.voice_style },
      schema: responseSchema({ voice: true, voiceOrder: suite.voice_order }),
      arms: [ { arm: 'without_perspective', prompt: baseline, prompt_sha256: sha256(baseline) },
        { arm: 'with_perspective', prompt, prompt_sha256: sha256(prompt) } ] };
  });
  return { suite_version: suite.suite_version, suite_sha256: sha256(suite), review_status: suite.review_status,
    comparison: '동일 베이스·콘텐츠·상태에서 perspective 필드 유무만 비교',
    prompt_version: PROMPT_VERSION, content_version: bundle.version, configuration: suite.configuration,
    voice_order: suite.voice_order, repetitions: suite.repetitions,
    planned_requests: pairs.length * 2 * suite.repetitions, pairs };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(await prepareLoreEvaluation(), null, 2));
