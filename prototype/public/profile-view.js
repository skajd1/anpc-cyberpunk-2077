import { DEPTH_LABELS } from './profile.js';
const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };

// 표시 요약은 카드의 원본 정체성·생성 프롬프트를 바꾸지 않는다.
export function renderCharacterProfiles(container, profiles) {
  container.replaceChildren();
  for (const profile of profiles) {
    const { card, identity, domains } = profile;
    const panel = el('section', null, 'slot-profile');
    panel.append(el('h3', card.display_name), el('p', card.presentation?.role ?? card.lived_context?.occupation ?? '', 'slot-role'));
    const slots = el('dl', null, 'trait-slots');
    for (const group of identity) {
      const value = el('dd', group.tags.join(' · '));
      value.title = group.items.join('\n');
      slots.append(el('dt', group.label), value);
    }
    panel.append(slots);
    if (card.npc_type === 'crowd') panel.append(el('p', `인스턴스 관심사: ${Object.values(profile.instanceTraits ?? {}).join(' · ') || '진입 시 추첨'} · 기존 풀 예시`, 'hint'));
    const knowledge = el('div', null, 'compact-knowledge');
    knowledge.append(el('h4', '지식 슬롯'));
    const primary = domains.filter(d => d.level >= 3 && d.domain_id !== 'self_background');
    for (const domain of primary) { const row = el('p'); row.append(el('span', domain.label), el('span', DEPTH_LABELS[domain.depth])); knowledge.append(row); }
    const unknown = domains.filter(d => d.depth === 'unknown');
    if (unknown.length) knowledge.append(el('p', `미확인: ${unknown.map(d => d.label).join(' · ')}`, 'hint'));
    const all = el('details'); all.append(el('summary', `모든 분야 ${domains.length}개`));
    const fields = el('dl', null, 'knowledge-slots');
    for (const domain of domains) fields.append(el('dt', domain.label), el('dd', DEPTH_LABELS[domain.depth] ?? domain.depth));
    all.append(fields); knowledge.append(all); panel.append(knowledge);
    container.append(panel);
  }
}
