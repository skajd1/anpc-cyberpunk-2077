// OpenAI 공식 모델 문서 기준: 2026-10-03. 계정별 접근 권한은 별도다.
export const REASONING_EFFORTS = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];
export const API_MODELS = [
  { id: 'gpt-6-luna', label: 'GPT-6 Luna', efforts: REASONING_EFFORTS },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', efforts: [] },
  { id: 'gpt-4.1', label: 'GPT-4.1', efforts: [] },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', efforts: [] },
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', efforts: REASONING_EFFORTS },
  { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', efforts: REASONING_EFFORTS },
  { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', efforts: REASONING_EFFORTS },
  { id: 'gpt-6-sol', label: 'GPT-6 Sol', efforts: REASONING_EFFORTS }
];

export function apiModelProfile(model) {
  const id = model.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  const known = API_MODELS.find(m => m.id === id);
  if (known) return known;
  if (['gpt-6-astra', 'gpt-6.1-sol'].includes(id)) return { id, label: id, efforts: REASONING_EFFORTS.slice(1) };
  return { id, label: id, efforts: REASONING_EFFORTS, unverified: true };
}

export function supportsReasoningEffort(model, effort) {
  const profile = apiModelProfile(model);
  return profile.efforts.length ? profile.efforts.includes(effort) : effort === 'none';
}
