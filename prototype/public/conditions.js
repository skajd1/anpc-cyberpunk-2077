// unknown은 not으로 뒤집어 허용하지 않는 세 값 조건 평가.
export function evaluateCondition(condition, fields) {
  if (!condition || typeof condition !== 'object') return null;
  if (condition.all) {
    const values = condition.all.map(c => evaluateCondition(c, fields));
    return values.includes(false) ? false : values.includes(null) ? null : values.length ? true : null;
  }
  if (condition.any) {
    const values = condition.any.map(c => evaluateCondition(c, fields));
    return values.includes(true) ? true : values.includes(null) ? null : values.length ? false : null;
  }
  if (condition.not) { const result = evaluateCondition(condition.not, fields); return result === null ? null : !result; }
  const actual = fields[condition.field];
  if (actual == null) return null;
  if (condition.op === 'eq') return actual === condition.value;
  if (condition.op === 'in') return Array.isArray(condition.value) ? condition.value.includes(actual) : null;
  if (condition.op === 'gte') return typeof actual === 'number' ? actual >= condition.value : null;
  if (condition.op === 'lte') return typeof actual === 'number' ? actual <= condition.value : null;
  return null;
}

