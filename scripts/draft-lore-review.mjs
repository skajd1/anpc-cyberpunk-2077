import { reviewHtml } from './lore-review-html.mjs';
// 사실·출처와 관점 초안을 한 자리에 보여 준다. 승인/원본 수정/API 호출은 하지 않는다.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { loadPrototypeData } from '../prototype/server.js';

export async function draftLoreReview() {
  const { research: bundle } = await loadPrototypeData();
  const pilot = JSON.parse(await readFile(new URL('../content/evaluation/lore-review-pilot-v1.json', import.meta.url), 'utf8'));
  return pilot.candidates.map(candidate => {
    if (candidate.review_status !== 'draft' || [...candidate.proposed_perspective].length > 60) throw new Error('초안 상태·길이를 확인하세요.');
    const entry = bundle.knowledge.find(k => k.id === candidate.knowledge_id);
    if (!entry) throw new Error(`지식 참조 누락: ${candidate.knowledge_id}`);
    const fact = bundle.facts.find(f => f.id === entry.fact_id);
    if (!candidate.evidence_refs.length || !candidate.evidence_refs.every(id => bundle.facts.some(f => f.id === id))) throw new Error('근거 참조 누락');
    return { knowledge_id: entry.id, npc_key: entry.owner_key, review_status: 'draft', runtime_enabled: false,
      fact: fact.statement, source: fact.source, access_condition: entry.access_condition,
      current: { certainty: entry.certainty, interpretation: entry.interpretation, disclosure: entry.disclosure },
      proposal: { perspective: candidate.proposed_perspective, certainty: candidate.proposed_certainty, importance: candidate.proposed_importance },
      evidence: candidate.evidence_refs.map(id => { const f = bundle.facts.find(f => f.id === id); return { fact_id: id, statement: f.statement, source: f.source }; }),
      human_checks: ['이 사실을 실제로 알고 있는가', '직접 경험이라고 말할 근거가 있는가', '이 말투와 태도가 인물에 맞는가'], decision: 'pending' };
  });
}
export function reviewMarkdown(items) {
  return '# ANPC 로어북 관점 검수 초안\n\n아래 6개는 검수 제안이며 게임에 적용되지 않았습니다. 맞는지·어색한지·경험을 과장하는지 확인하면 됩니다.\n'
    + items.map(item => `\n## ${item.npc_key} · ${item.knowledge_id}\n\n- 현재 사실: ${item.fact}\n- 관점 제안: **${item.proposal.perspective}**\n- 출처: ${item.source.url}\n- 확인할 것: ${item.human_checks.join(' / ')}\n- 판정: 검수 대기\n`).join('');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--format' || !['markdown', 'html'].includes(args[1]))) throw new Error('사용: node scripts/draft-lore-review.mjs [--format markdown|html]');
  const review = await draftLoreReview();
  console.log(args[1] === 'html' ? reviewHtml(review) : args[1] === 'markdown' ? reviewMarkdown(review) : JSON.stringify(review, null, 2));
}
