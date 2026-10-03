import { evaluateCondition } from './conditions.js';

// 웹 시험 입력의 투영. 게임 어댑터는 공통 StateSnapshot/ObservedField 계약을 사용한다.
export function normalizeStoryFields(policy, state) {
  const raw = state?.fields ?? {}, fields = {};
  const read = (key, values) => { fields[key] = values.includes(raw[key]) ? raw[key] : null; };
  read('content.story.period', policy.periods);
  fields['content.story.scene_free'] = typeof raw['content.story.scene_free'] === 'boolean' ? raw['content.story.scene_free'] : null;
  for (const q of policy.quests) read(`content.quests.${q.id}`, policy.quest_statuses);
  for (const c of policy.characters) read(`content.contact.${c.character_key}`, policy.contacts);
  for (const [key, values] of Object.entries(policy.choices)) read(`content.choices.${key}`, values);
  return fields;
}

export function storySignature(settings) {
  // 정렬된 키로 같은 스냅샷을 재구성해도 요청을 불필요하게 무효화하지 않는다.
  const fields = Object.entries(settings.storyState?.fields ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([settings.storyState != null, fields, settings.relationshipStage, settings.phase, settings.alive, settings.free]);
}

export function storyRequiresReset(previous, next) {
  if ((previous?.storyState != null) !== (next?.storyState != null)) return true;
  if (!next?.storyState) return false;
  const before = previous.storyState.fields ?? {}, after = next.storyState.fields ?? {};
  const ranks = { not_started: 0, active: 1, completed: 2, failed: 2 };
  if (before['content.story.period'] !== 'pre_heist' && after['content.story.period'] === 'pre_heist') return true;
  return Object.entries(before).some(([key, value]) => {
    if (key.startsWith('content.quests.')) return value != null && value !== after[key]
      && (after[key] == null || (ranks[value] ?? 0) > (ranks[after[key]] ?? -1) || ['completed', 'failed'].includes(value));
    if (key.startsWith('content.choices.')) return value != null && value !== 'pending' && value !== after[key];
    return false;
  });
}

export function evaluateStoryPolicy(bundle, card, settings, stage) {
  const result = { enabled: settings.storyState != null, allowed: true, reason: null, fields: {}, events: [], channel: null };
  if (!result.enabled) return result;
  const deny = reason => ({ ...result, allowed: false, reason });
  const policy = bundle.storyPolicy;
  if (!policy) return deny('퀘스트 대화 정책을 불러오지 못했습니다.');
  const fields = result.fields = normalizeStoryFields(policy, settings.storyState);
  const period = fields['content.story.period'];
  if (!['pre_heist', 'act2'].includes(period)) return deny('결말·에필로그 또는 미확인 구간에서는 자유 대화를 지원하지 않습니다.');
  if (fields['content.story.scene_free'] !== true) return deny('원작 대화·연출·퀘스트 제어가 없는 상태인지 확인해야 합니다.');
  if (period === 'pre_heist' && !['not_started', 'active'].includes(fields['content.quests.heist'])) return deny('습격 전 구간과 The Heist 진행 상태가 맞지 않습니다.');
  if (period === 'act2' && fields['content.quests.playing_for_time'] !== 'completed') return deny('Playing for Time 이후의 자유 상태가 확인되지 않았습니다.');
  // 완료된 사건의 선행 상태가 누락되거나 충돌하면 추정해서 복구하지 않는다.
  for (const q of policy.quests) {
    if (fields[`content.quests.${q.id}`] === 'completed' && q.prerequisites.some(id => fields[`content.quests.${id}`] !== 'completed')) {
      return deny(`${q.title}: 선행 퀘스트 진행 상태를 확인하세요.`);
    }
  }
  if (card.npc_type === 'crowd') return result;
  const key = card.character_key, npc = policy.characters.find(c => c.character_key === key);
  if (!npc || !stage || !npc.stages[stage.id]) return deny('이 인물·관계 단계의 퀘스트 조건이 등록되지 않았습니다.');
  if (key === 'viktor' && settings.relationshipStage === 'paid' && fields['content.quests.paid_full'] !== 'completed') return deny('진료비 상환이 확인되지 않았습니다.');
  if (key === 'jackie' && fields['content.quests.heist'] === 'completed') return deny('The Heist 이후 재키는 사망한 상태라 새 대화를 시작할 수 없습니다.');
  if (key === 'evelyn' && fields['content.quests.heist'] === 'completed') return deny('습격 이후 에블린의 새 자유 대화는 지원하지 않습니다.');
  if (key === 'judy' && fields['content.choices.judy_pisces'] === 'maiko_paid') return deny('Pisces의 보수 수령으로 주디의 연락 단절 분기가 확인되었습니다.');
  if (key === 'panam' && fields['content.choices.panam_relationship'] === 'betrayed') return deny('사울에게 계획을 공개한 팬앰의 관계 단절 분기입니다.');
  if (key === 'river' && fields['content.choices.river_rescue'] === 'failed') return deny('랜디 구출 실패 분기에서는 새 대화를 지원하지 않습니다.');
  if (key === 'goro' && fields['content.choices.goro_fate'] === 'abandoned') return deny('구출하지 않은 타케무라와 새 대화를 시작할 수 없습니다.');
  if (key === 'johnny' && fields['content.choices.johnny_relationship'] === 'separated') return deny('조니의 렐릭 접촉이 끝났습니다.');
  if (key === 'songbird' && ['moon_departed', 'fia_custody', 'dead'].includes(fields['content.choices.songbird_route'])) return deny('소미가 현재 자유 대화 대상으로 남아 있지 않습니다.');
  if (stage.available !== true) return deny(`${stage.label}: 이 분기에서는 새 대화를 시작할 수 없습니다.`);
  const rule = npc.stages[stage.id];
  if (evaluateCondition(rule.condition, fields) !== true) return deny(`${stage.label}: 퀘스트·원작 선택 조건이 맞지 않거나 아직 확인되지 않았습니다.`);
  if (rule.scene_only) return deny(`${stage.label}: 원작 장면 전용 구간이라 자유 대화를 열지 않습니다.`);
  const channel = result.channel = fields[`content.contact.${key}`];
  if (!npc.channels.includes(channel)) return deny('현재 접촉 상태가 근거리 대화 또는 조니의 렐릭 접촉으로 확인되지 않았습니다. 원격 연락은 별도 기능입니다.');
  if (key === 'judy' && stage.id === 'friend' && channel === 'nearby') return deny('이 정책은 Pyramid Song 이후 비연애 주디를 원격 연락 구간으로 제한합니다. 도시 출발 전 세부 창은 게임 검증이 필요합니다.');
  const events = policy.events.filter(e => e.character_keys.includes(key) && evaluateCondition(e.condition, fields) === true);
  for (const event of events) {
    const fact = bundle.facts?.find(f => f.id === event.fact_id);
    if (!fact || evaluateCondition(fact.validity_condition, { ...fields, 'content.npc_key': key, 'content.relationship_stage': stage.id }) !== true) return deny('원작 진행 사건의 출처·유효 조건을 확인하세요.');
    result.events.push({ ...event, statement: fact.statement });
  }
  return result;
}
