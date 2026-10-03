// 세션마다 짧은 요약 하나. 현재 세션 원문은 종료 후 장기 저장하지 않는다.
const clone = value => structuredClone(value);
const utterance = event => /_utterance$/.test(event.event_type);
export const SESSION_SUMMARY_LIMIT = 320;
export function summarySchema() {
  return { type: 'object', additionalProperties: false, required: ['summary'],
    properties: { summary: { type: 'string', minLength: 1, maxLength: SESSION_SUMMARY_LIMIT } } };
}
export function validSessionSummary(value) {
  return value && Object.keys(value).sort().join(',') === 'session_id,summary'
    && typeof value.session_id === 'string' && value.session_id.length > 0 && value.session_id.length <= 160
    && typeof value.summary === 'string' && value.summary.trim().length > 0
    && [...value.summary].length <= SESSION_SUMMARY_LIMIT && !/[\r\n]/.test(value.summary);
}
export function extractLocalSummary(events) {
  const turns = events.filter(utterance), players = turns.filter(e => e.role === 'player');
  const quote = text => [...text.replace(/\s+/g, ' ').trim()].slice(0, 65).join('');
  if (!turns.length) return { summary: '' };
  const first = quote(players[0]?.text ?? turns[0].text), last = quote(players.at(-1)?.text ?? turns.at(-1).text);
  const response = quote(turns.findLast(e => e.role === 'npc')?.text ?? '');
  return { summary: `V가 「${first}」${first === last ? '' : `부터 「${last}」까지`} 이야기했고, 상대는 「${response}」라고 답한 대화였다.` };
}
export async function makeSummaryInput(events) {
  const source_events = events.filter(utterance).map((e, sequence) => ({ event_id: e.event_id, session_id: e.session_id ?? null, exchange_id: null,
    sequence, event_kind: e.event_type, speaker: e.role, epistemic_status: e.role === 'player' ? 'player_claim' : 'npc_statement',
    at: { session_id: e.session_id ?? null, sequence, game_time: null, recorded_at_utc: null }, payload: { text: e.text } }));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(source_events)));
  return { source_events, existing_relevant_memories: [], source_digest: [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join(''),
    policy_version: 'session-memory-1.0', summarizer_version: 'session-summary-1.0',
    local_constraints: ['한 세션의 전체 대화를 한 문장 정도로 정리', '대화 내용이며 게임 사실·인물 지식·원작 관계의 근거가 아님', '복장 관찰을 별도 보존하지 않음'] };
}
export class TestMemory {
  constructor() { this.records = []; this.generation = 0; this.pending = null; this.status = 'ready'; this.lastUsage = null; }
  clear() { this.generation++; this.controller?.abort(); this.pending = null; this.records = []; this.status = 'ready'; this.lastUsage = null; }
  snapshot() { return { version: 2, records: clone(this.records) }; }
  restore(snapshot) {
    this.clear();
    if (snapshot?.version === 2 && Array.isArray(snapshot.records) && snapshot.records.every(validSessionSummary)
      && new Set(snapshot.records.map(r => r.session_id)).size === snapshot.records.length) this.records = clone(snapshot.records.slice(-64));
  }
  async finish(sessionId, events, summarize) {
    const source = events.filter(utterance).map(clone);
    if (!source.length || this.records.some(r => r.session_id === sessionId)) return { committed: false };
    if (source.some(e => e.session_id !== sessionId)) throw new Error('session_scope_mismatch');
    const record = { session_id: sessionId, ...extractLocalSummary(source) };
    this.records.push(record); this.records = this.records.slice(-64);
    this.status = 'local_extract';
    // 같은 NPC의 요약이 이미 진행 중이면 새 세션은 로컬 한 줄로 마무리한다.
    if (!summarize || this.pending) return { committed: true, mode: 'local_extract' };
    const generation = this.generation, controller = new AbortController(); this.controller = controller; this.status = 'running';
    const job = (async () => {
      try {
        const result = await summarize(source, controller.signal);
        if (generation !== this.generation || !this.records.includes(record)) return { committed: false, stale: true };
        const value = result.reply;
        if (!value || Object.keys(value).join(',') !== 'summary' || !validSessionSummary({ session_id: sessionId, summary: value.summary })) throw new Error('invalid_summary');
        record.summary = value.summary.trim(); this.lastUsage = result.usage ?? null;
        this.status = result.mode === 'local_extract' ? 'local_extract' : 'ready';
        return { committed: true, mode: result.mode };
      } catch (error) {
        if (generation !== this.generation) return { committed: false, stale: true };
        this.status = 'local_extract'; return { committed: true, mode: 'local_extract', error: error.message };
      }
    })();
    this.pending = job;
    try { return await job; } finally { if (this.pending === job) this.pending = null; }
  }
  recall(journal) {
    return { recent: journal.filter(utterance).slice(-6), session_summaries: this.records.slice(-3).map(r => r.summary) };
  }
}
