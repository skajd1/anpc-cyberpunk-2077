import { DEPTH_LABELS } from './profile.js';
const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
const levels = {
  openness: ['익숙함 고수', '익숙함 선호', '상황에 따라 탐색', '새 관점에 관심', '적극적으로 탐색'],
  conscientiousness: ['즉흥적 대응', '최소한의 준비', '준비와 유연함', '계획을 우선', '책임·순서 중시'],
  extraversion: ['현재 화제에 머묾', '현재 화제에 집중', '상대에 맞춰 교류', '화제를 넓히는 편', '적극적으로 교류'],
  agreeableness: ['자기 입장 고수', '자기 입장 우선', '조건에 따라 협력', '조정을 선호', '상호 수용 중시'],
  neuroticism: ['침착함 유지', '대체로 침착', '상황에 따라 반응', '위험에 민감', '우려에 오래 주목']
};

// 수치는 실제 요청과 같은 성격 변환기를 거친 프로필에서 받는다.
export function renderCharacterProfiles(container, profiles) {
  container.replaceChildren();
  for (const profile of profiles) {
    const { card, personality, domains } = profile;
    const panel = el('section', null, 'character-profile');
    panel.append(el('div', card.display_name[0], 'character-avatar profile-avatar'), el('h3', card.display_name),
      el('p', card.presentation?.role ?? card.lived_context?.occupation ?? '', 'character-role'));
    if (card.background?.summary) panel.append(el('p', card.background.summary, 'character-bio'));
    if (profile.relationshipStage) {
      const relation = el('section', null, 'profile-section'); relation.append(el('h4', 'V와의 관계'));
      relation.append(el('p', profile.relationshipStage.relationship.label));
      const button = el('button', '관계 단계 바꾸기'); button.type = 'button'; button.dataset.relationshipKey = card.character_key;
      relation.append(button); panel.append(relation);
    }
    const traits = el('section', null, 'profile-section'); traits.append(el('h4', '성격'));
    const rows = el('dl', null, 'personality-slots');
    for (const group of personality) {
      const value = el('dd');
      value.title = group.instruction ?? '대화를 시작하면 생성합니다.';
      value.setAttribute('aria-label', group.level === null ? '대화 시 생성' : `${group.level}/5 · ${levels[group.id][group.level - 1]}`);
      const meter = el('span', null, 'personality-meter'); meter.setAttribute('aria-hidden', 'true');
      for (let i = 1; i <= 5; i++) meter.append(el('i', null, group.level !== null && i <= group.level ? 'filled' : ''));
      value.append(meter, el('span', group.level === null ? '대화 시 생성' : levels[group.id][group.level - 1]));
      rows.append(el('dt', group.label), value);
    }
    traits.append(rows); panel.append(traits);
    const principles = el('section', null, 'profile-section'); principles.append(el('h4', '중요하게 여기는 것'));
    const list = el('ul'); for (const text of profile.personalPrinciples) list.append(el('li', text));
    principles.append(list); panel.append(principles);
    const voice = el('section', null, 'profile-section'); voice.append(el('h4', '말투'));
    voice.append(el('p', card.voice_style.direction?.split('. ')[0] ?? [card.voice_style.register, card.voice_style.sentence_length].filter(Boolean).join(' · '))); panel.append(voice);
    const knowledge = domains.filter(d => d.level >= 3 && !['self_background', 'relic'].includes(d.domain_id));
    if (knowledge.length) {
      const section = el('section', null, 'profile-section'); section.append(el('h4', '알고 있는 분야'));
      const fields = el('dl', null, 'knowledge-slots');
      for (const domain of knowledge) fields.append(el('dt', domain.label), el('dd', DEPTH_LABELS[domain.depth]));
      section.append(fields); panel.append(section);
    }
    container.append(panel);
  }
}
