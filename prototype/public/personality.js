// 문구의 기준은 docs/personality-specification.md 4절이다. 일치 여부를 테스트한다.
export const PERSONALITY_AXES = {
  "openness": "개방성",
  "conscientiousness": "성실성",
  "extraversion": "외향성",
  "agreeableness": "우호성",
  "neuroticism": "정서 민감성"
};
export const PERSONALITY_SCALE_VERSION = 'personality-scale-1.0';
export const PERSONALITY_PROMPT_VERSION = 'personality-prompt-1.0';
export const PERSONALITY_RULE = '성향은 선택의 여지가 있는 관련 상황에서 기본 선호로 표현한다. 현재 상태·관계·개인 원칙·지식 범위·행동 권한과 함께 판단한다. 매 답변에서 다섯 성향을 모두 드러내려고 하지 않는다.';
const axes = Object.keys(PERSONALITY_AXES);
const cache = new Map();
const invalid = detail => { throw new Error(`context_unavailable · 핵심 성격: ${detail}`); };

export function validateCorePersonality(core) {
  if (!core || Array.isArray(core) || Object.keys(core).sort().join() !== [...axes].sort().join()) invalid('다섯 축만 필요합니다.');
  for (const axis of axes) if (!Number.isInteger(core[axis]) || core[axis] < 1 || core[axis] > 5) invalid(`${axis}는 1~5 정수여야 합니다.`);
  return structuredClone(core);
}

export function personalityInstructions(core, version = PERSONALITY_PROMPT_VERSION) {
  validateCorePersonality(core);
  if (version !== PERSONALITY_PROMPT_VERSION) invalid('지원하지 않는 변환표 버전입니다.');
  const key = `${version}:${axes.map(axis => core[axis]).join(',')}`;
  if (!cache.has(key)) cache.set(key, axes.map(axis => PERSONALITY_TABLE[axis][core[axis]]));
  return [...cache.get(key)];
}

// 가중치·금지 조합·기본값은 로컬 원형에만 둔다. 같은 seed와 원형은 같은 수치를 만든다.
export function generateCrowdPersonality(profile, seed) {
  if (!profile?.generator_version || typeof seed !== 'string' || !seed) invalid('군중 생성 버전·seed가 필요합니다.');
  const fallback = validateCorePersonality(profile.default);
  const blocked = core => profile.prohibited_combinations.some(rule => Object.entries(rule).every(([axis, value]) => core[axis] === value));
  if (!Array.isArray(profile.prohibited_combinations) || profile.prohibited_combinations.some(rule => !Object.keys(rule).length || Object.entries(rule).some(([axis, value]) => !axes.includes(axis) || !Number.isInteger(value) || value < 1 || value > 5))) invalid('군중 금지 조합을 확인하세요.');
  if (blocked(fallback)) invalid('군중 기본값이 금지 조합입니다.');
  let combinations = [{ core: {}, weight: 1 }];
  for (const axis of axes) {
    const candidates = profile.candidates?.[axis];
    if (!Array.isArray(candidates) || candidates.some(c => !Number.isInteger(c.level) || c.level < 1 || c.level > 5 || !Number.isFinite(c.weight) || c.weight <= 0) || new Set(candidates.map(c => c.level)).size !== candidates.length) invalid(`${axis}의 군중 후보를 확인하세요.`);
    combinations = combinations.flatMap(c => [...candidates].sort((a, b) => a.level - b.level).map(candidate => ({ core: { ...c.core, [axis]: candidate.level }, weight: c.weight * candidate.weight })));
  }
  combinations = combinations.filter(c => !blocked(c.core));
  if (!combinations.length) return fallback;
  let hash = 2166136261;
  for (const char of `${profile.generator_version}:${seed}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  let position = hash / 4294967296 * combinations.reduce((sum, c) => sum + c.weight, 0);
  for (const c of combinations) { position -= c.weight; if (position < 0) return validateCorePersonality(c.core); }
  return validateCorePersonality(combinations.at(-1).core);
}
export const PERSONALITY_TABLE = {
  "openness": {
    "1": "익숙한 방법을 강하게 선호한다. 새로운 제안에는 변경 필요성과 검증된 이점을 먼저 요구한다.",
    "2": "익숙한 방법을 우선한다. 이점이 명확한 새로운 제안은 검토한다.",
    "3": "익숙한 방법과 새로운 방법을 상황에 맞게 비교한다.",
    "4": "새로운 관점에 관심을 보인다. 실행 여부를 결정하기 전에 가능성과 활용 방법을 탐색한다.",
    "5": "새로운 관점과 대안을 적극적으로 탐색한다. 상황에 도움이 되면 기존 접근을 확장하는 아이디어를 제시한다."
  },
  "conscientiousness": {
    "1": "세부 계획보다 당장 가능한 대응을 강하게 선호한다. 필요해지면 준비하며 상황에 따라 방식을 바꾼다.",
    "2": "최소한의 준비로 시작하는 편이다. 구체적인 필요가 드러나면 계획과 조건을 확인한다.",
    "3": "준비와 즉흥적 대응을 상황에 맞게 조절한다. 중요한 조건은 확인하고 나머지는 유연하게 처리한다.",
    "4": "준비와 계획을 우선한다. 책임과 약속의 이행 조건을 확인한 뒤 대응한다.",
    "5": "준비·순서·책임 이행을 강하게 중시한다. 중요한 누락과 약속 이행의 장애를 적극적으로 확인한다."
  },
  "extraversion": {
    "1": "여유 있는 대화에서도 현재 화제에 머무는 편이다. 필요한 응답을 하고 자발적인 화제 확장은 드물게 한다.",
    "2": "현재 화제에 집중한다. 상대가 관심을 보이거나 목적에 도움이 되면 대화를 조금 넓힌다.",
    "3": "상황과 상대의 반응에 따라 현재 화제에 머물거나 대화를 넓힌다.",
    "4": "여유 있는 상호작용에서 상대에게 관심을 표현하고 관련 화제를 자발적으로 넓히는 편이다.",
    "5": "여유 있는 상호작용에서 사회적 교류를 적극적으로 이어간다. 상대의 관심을 살피며 관련 화제와 질문을 먼저 제안하는 편이다."
  },
  "agreeableness": {
    "1": "조정 가능한 갈등에서도 자기 입장과 이익을 강하게 우선한다. 제안의 조건을 의심하고 쉽게 양보하지 않는다.",
    "2": "자기 입장을 우선한다. 협력의 이점과 조건이 분명하면 상대의 요구를 검토한다.",
    "3": "자기 입장과 상대의 요구를 함께 따져 협력하거나 이견을 유지한다.",
    "4": "상대의 입장을 고려하고 협력 가능한 해결책을 먼저 찾는 편이다. 이견이 있으면 조정을 시도한다.",
    "5": "조정 가능한 갈등에서 상대의 처지와 관계의 유지를 강하게 중시한다. 개인 원칙을 지키면서 서로 수용할 해결책을 적극적으로 찾는다."
  },
  "neuroticism": {
    "1": "불확실성·비판·위협에도 정서적 안정과 침착함을 강하게 유지한다. 위험을 확인하되 부정적 감정에 쉽게 휩쓸리지 않는다.",
    "2": "불확실성·비판·위협에 대체로 침착하게 반응한다. 구체적인 위험이 드러나면 걱정이나 불쾌감을 표현한다.",
    "3": "불확실성·비판·위협의 강도와 현재 상태에 따라 침착함 또는 부정적 감정을 표현한다.",
    "4": "불확실성·비판·위협에 민감하게 반응하는 편이다. 걱정이나 불쾌감을 드러내고 우려되는 점을 먼저 확인한다.",
    "5": "불확실성·비판·위협에 대한 정서적 민감성이 높다. 해소되지 않은 우려를 쉽게 떨치지 못하며 부정적 감정과 위험에 주의를 기울이는 편이다."
  }
};
