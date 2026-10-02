// 저장은 로컬, 요약은 교체 가능한 함수. 원문은 요약 실패·누락과 무관하게 보존한다.
const clone = value => structuredClone(value);
const utterance = event => /_utterance$/.test(event.event_type);
const tokens = text => Math.ceil([...text].length / 2); // 개발용 문자 기반 추정. 실제 토큰 한도·API 사용량과 구별한다.
const terms = text => (text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
  .map(t => t.replace(/(?:에게|에서|으로|이랑|은|는|을|를|가|이|의|랑|야)$/, '')).filter(t => t.length >= 2);
export function summarySchema() {
  const strings = { type: 'array', items: { type: 'string', minLength: 1, maxLength: 160 }, maxItems: 8 };
  return { type: 'object', additionalProperties: false, required: ['candidates'], properties: { candidates: {
    type: 'array', maxItems: 12, items: { type: 'object', additionalProperties: false,
      required: ['kind', 'text', 'subject_keys', 'topic_tags', 'evidence_event_ids', 'epistemic_status', 'conflict_refs'],
      properties: { kind: { type: 'string', enum: ['player_claim', 'npc_statement'] }, text: { type: 'string', minLength: 1, maxLength: 240 },
        subject_keys: strings, topic_tags: strings, evidence_event_ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
        epistemic_status: { type: 'string', enum: ['player_claim', 'npc_statement'] }, conflict_refs: { type: 'array', items: { type: 'string' } } }
    } } } };
}
export function extractLocalSummary(events) {
  const candidates = events.filter(utterance).flatMap(event => {
    const chars = [...event.text], chunks = [];
    for (let i = 0; i < chars.length; i += 240) chunks.push(chars.slice(i, i + 240).join(''));
    const kind = event.role === 'player' ? 'player_claim' : 'npc_statement';
    return chunks.map(text => ({ kind, text, subject_keys: [], topic_tags: [...new Set(terms(text))].slice(0, 8),
      evidence_event_ids: [event.event_id], epistemic_status: kind, conflict_refs: [] }));
  });
  return { candidates: candidates.slice(0, 12) };
}
export async function makeSummaryInput(events) {
  const source_events = events.map((e, sequence) => ({ event_id: e.event_id, session_id: null, exchange_id: null,
    sequence: e.sequence ?? sequence, event_kind: e.event_type, speaker: e.role,
    epistemic_status: e.role === 'player' ? 'player_claim' : 'npc_statement',
    at: { session_id: null, sequence: e.sequence ?? sequence, game_time: null, recorded_at_utc: null }, payload: { text: e.text } }));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(source_events)));
  return { source_events, existing_relevant_memories: [], source_digest: [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join(''),
    policy_version: 'memory-policy-1.2', summarizer_version: 'memory-summary-1.2', local_constraints: ['플레이어 주장·NPC 발언을 분리', '관찰·행동 성공·원작 관계 생성 금지'] };
}
export class TestMemory {
  constructor() { this.records = []; this.processed = new Set(); this.generation = 0; this.pending = null; this.status = 'ready'; this.lastUsage = null; }
  clear() { this.generation++; this.controller?.abort(); this.pending = null; this.records = []; this.processed.clear(); this.summaryBoundary = null; this.status = 'ready'; this.lastUsage = null; }
  snapshot() { return { version: 1, records: clone(this.records), processed: [...this.processed], summary_boundary: this.summaryBoundary ?? null }; }
  restore(snapshot) {
    this.clear();
    if (snapshot?.version === 1) { this.records = clone(snapshot.records); this.processed = new Set(snapshot.processed); this.summaryBoundary = snapshot.summary_boundary ?? null; }
  }
  needsSummary(journal) {
    const boundary = journal.findIndex(e => e.event_id === this.summaryBoundary);
    return ['ready', 'local_extract'].includes(this.status) && journal.slice(boundary + 1).filter(utterance).length >= 16;
  }
  async consolidate(journal, summarize = async events => ({ reply: extractLocalSummary(events), mode: 'local_extract' })) {
    if (this.pending) return this.pending;
    const all = journal.filter(utterance), recentIds = new Set(all.slice(-6).map(e => e.event_id));
    const source = all.filter(e => !recentIds.has(e.event_id) && !this.processed.has(e.event_id)).slice(0, 16);
    if (!source.length) return { committed: false };
    const generation = this.generation;
    const controller = new AbortController(); this.controller = controller;
    this.status = 'running';
    const job = (async () => {
      try {
        const result = await summarize(source.map(e => ({ ...clone(e), sequence: journal.indexOf(e) })), controller.signal);
        if (generation !== this.generation) return { committed: false, stale: true };
        const candidates = result.reply?.candidates;
        if (!Array.isArray(candidates) || candidates.length > 12) throw new Error('invalid_summary');
        const sources = new Map(source.map(e => [e.event_id, e]));
        const records = candidates.map(c => {
          if (!c || Object.keys(c).sort().join(',') !== ['kind','text','subject_keys','topic_tags','evidence_event_ids','epistemic_status','conflict_refs'].sort().join(',')
            || !Array.isArray(c.evidence_event_ids) || new Set(c.evidence_event_ids).size !== c.evidence_event_ids.length) throw new Error('invalid_summary');
          const evidence = c.evidence_event_ids.map(id => sources.get(id));
          const kind = evidence?.every(e => e?.role === 'player') ? 'player_claim'
            : evidence?.every(e => e?.role === 'npc') ? 'npc_statement' : null;
          if (!evidence?.length || !kind || c.kind !== kind || c.epistemic_status !== kind
            || typeof c.text !== 'string' || !c.text.trim() || [...c.text].length > 240
            || ![c.subject_keys, c.topic_tags, c.conflict_refs].every(a => Array.isArray(a) && a.every(v => typeof v === 'string' && v.length > 0 && [...v].length <= 160))
            || c.subject_keys.length > 8 || c.topic_tags.length > 8 || c.conflict_refs.length > 8 || c.conflict_refs.some(id => !sources.has(id))) throw new Error('invalid_summary');
          const sequence = journal.findIndex(e => e.event_id === evidence[0].event_id);
          return { memory_id: crypto.randomUUID(), revision: 1, kind, text: c.text, subject_keys: c.subject_keys, topic_tags: c.topic_tags,
            evidence_event_ids: c.evidence_event_ids, epistemic_status: kind, status: c.conflict_refs.length ? 'disputed' : 'active',
            importance: kind === 'player_claim' ? 'salient' : 'routine',
            validity: { occurred_at: { session_id: null, sequence, game_time: null, recorded_at_utc: null }, condition: null, expires_at_utc: null },
            supersedes_id: null, observation_ref: null };
        });
        if (this.records.length + records.length > 1024) throw new Error('memory_capacity_exceeded');
        this.records.push(...records);
        // 원문을 보존하므로 요약의 의미 누락은 검색에서 원문으로 보완한다.
        for (const event of source) this.processed.add(event.event_id);
        this.summaryBoundary = all.at(-1).event_id;
        this.status = result.mode === 'local_extract' ? 'local_extract' : 'ready'; this.lastUsage = result.usage ?? null;
        return { committed: true, record_count: records.length };
      } catch (error) {
        if (generation !== this.generation) return { committed: false, stale: true };
        this.status = error.message;
        return { committed: false, error: error.message };
      }
    })();
    this.pending = job;
    try { return await job; } finally { if (this.pending === job) this.pending = null; }
  }
  recall(journal, playerText) {
    const all = journal.filter(utterance), recent = all.slice(-6), recentIds = new Set(recent.map(e => e.event_id));
    const keys = terms(playerText), referential = /아까|전에|기억|약속|그거|그때/.test(playerText);
    const score = text => keys.filter(k => text.normalize('NFKC').toLowerCase().includes(k)).length;
    const candidates = [
      ...this.records.filter(r => !r.evidence_event_ids.some(id => recentIds.has(id))).map(r => ({ record: r, ids: r.evidence_event_ids,
        text: r.text, score: score([r.text, ...r.subject_keys, ...r.topic_tags].join(' ')), sequence: r.validity.occurred_at.sequence })),
      ...all.filter(e => !recentIds.has(e.event_id)).map(e => ({ event: e, ids: [e.event_id], text: e.text,
        score: score(e.text), sequence: journal.indexOf(e) }))
    ].filter(c => c.score || referential).sort((a, b) => b.score - a.score || b.sequence - a.sequence || Number(Boolean(a.event)) - Number(Boolean(b.event)));
    const selected = [], seen = new Set(recentIds); let used = 0;
    for (const c of candidates) {
      if (selected.length >= 3 || c.ids.some(id => seen.has(id))) continue;
      const cost = tokens(JSON.stringify(c.record ?? c.event));
      if (used + cost > 400) continue;
      selected.push(c); c.ids.forEach(id => seen.add(id)); used += cost;
    }
    const long_term = selected.filter(c => c.record).map(({ record: r }) => ({ memory_id: r.memory_id, kind: r.kind,
      text: r.text, epistemic_status: r.epistemic_status, status: r.status, temporal_scope: `과거 사건 순서 ${r.validity.occurred_at.sequence}` }));
    const recalled_events = selected.filter(c => c.event).map(({ event: e, sequence }) => ({ event_ref: e.event_id, event_kind: e.event_type,
      speaker: e.role, text: e.text, epistemic_status: e.role === 'player' ? 'player_claim' : 'npc_statement', temporal_scope: `과거 사건 순서 ${sequence}`, is_excerpt: false }));
    return { recent, long_term, recalled_events };
  }
}
