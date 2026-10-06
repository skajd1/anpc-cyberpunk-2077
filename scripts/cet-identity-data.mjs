import { readFile } from 'node:fs/promises';
import { validateCorePersonality } from '../prototype/public/personality.js';

// 작성 메타데이터는 게임의 로컬 정책 검사에만 사용한다. 모델에는 선별 결과만 보낸다.
const pick = (value, keys) => Object.fromEntries(keys.filter(k => value[k] !== undefined).map(k => [k, value[k]]));
export async function buildIdentityData(bundle) {
  const read = async name => JSON.parse(await readFile(new URL(`../content/cyberpunk2077/${name}`, import.meta.url), 'utf8'));
  const [manifest, crowd, crowdKnowledge] = await Promise.all([read('manifest.json'), read('crowd-archetypes.json'), read('crowd-knowledge-policy.json')]);
  for (const card of bundle.cards) validateCorePersonality(card.core_personality);
  return {
    version: manifest.content_version, runtime_enabled: manifest.runtime_enabled, generator_version: 'cet-identity-1.0',
    cards: Object.fromEntries(bundle.cards.filter(c => c.npc_type !== 'crowd').map(c => [c.character_key,
      pick(c, ['character_key', 'display_name', 'revision', 'review_status', 'runtime_enabled', 'core_personality', 'personal_principles',
        'background', 'lived_context', 'voice_style', 'speech_rules', 'forbidden_claims', 'identity_rules', 'goals', 'relationship_stages',
        'dialogue_conditions', 'knowledge_ids', 'knowledge_profile', 'example_ids', 'fallback_lines', 'everyday_fiction_policy'])])),
    facts: Object.fromEntries(bundle.facts.map(f => [f.id, pick(f, ['id', 'statement', 'review_status', 'validity_condition', 'spoiler_scope',
      'knowledge_layer', 'category_id', 'usage_mode', 'entity_aliases', 'trigger_terms', 'topic_tags', 'claim_limits'])])),
    knowledge: bundle.knowledge.filter(k => k.owner_key !== 'resident').map(k => pick(k, ['id', 'owner_key', 'fact_id', 'review_status',
      'access_condition', 'certainty', 'disclosure', 'domain_id', 'required_depth', 'claim_limits'])),
    examples: bundle.examples.map(e => pick(e, ['id', 'character_keys', 'review_status', 'context_condition', 'required_fact_ids',
      'trigger_terms', 'input', 'sample_dialogue', 'expected_intent', 'provenance'])),
    world_policy: bundle.worldKnowledge,
    archetypes: crowd.archetypes.map(a => pick(a, ['id', 'title', 'revision', 'review_status', 'runtime_enabled', 'weight',
      'personality_generation', 'background_bounds', 'personal_principles', 'voice_styles', 'identity_rules', 'knowledge_plan',
      'knowledge_ids', 'example_ids', 'everyday_fiction_policy', 'fallback_lines'])),
    crowd_knowledge: crowdKnowledge
  };
}
