import { storyRequiresReset } from './story.js';
import { researchMock } from './research.js';
import { ScenarioEngine, OUTFITS, resolveOutfit, withTestCrowds, captureTestSave } from './scenario.js';
import { buildCharacterProfile, testTargets, DEPTH_LABELS, PHASE_LABELS, domainLabel } from './profile.js';
import { renderCharacterProfiles } from './profile-view.js';
import { buildQuestionPresets, requestMetrics, snapshotTestResult, conversationExchanges } from './test-tools.js';
import { API_MODELS, apiModelProfile, supportsReasoningEffort } from './api-models.js';
import { extractLocalSummary, makeSummaryInput } from './memory.js';
const $ = id => document.getElementById(id);
const bootstrap = await fetch('/api/bootstrap').then(r => r.json());
const QUESTION_PRESETS = buildQuestionPresets(bootstrap.playerIdentity.display_name);
const bundle = withTestCrowds(await fetch('/api/research', { headers: { 'X-ANPC-Token': bootstrap.token } }).then(r => { if (!r.ok) throw new Error('조사 자료 로드 실패'); return r.json(); }), bootstrap.personas);
let keys = [];
const selectedTargets = [bundle.cards[0].character_key, bundle.cards[1]?.character_key ?? ''];
const phases = Object.fromEntries(bundle.cards.map(c => [c.character_key, c.phase_labels[0]]));
const relationshipStages = Object.fromEntries(bundle.cards.filter(c => c.relationship_stages).map(c => [c.character_key, c.relationship_stages[0].id]));
const contactLabels = { nearby: '근처에 있고 대화 가능', remote: '원격 연락만 가능', scene: '원작 장면 진행 중', absent: '현재 접촉 불가', engram: '조니의 렐릭 접촉', unknown: '확인 안 됨' };
let storyFields = structuredClone(bundle.storyPolicy.presets[0].fields);
Object.assign(relationshipStages, bundle.storyPolicy.presets[0].relationship_stages);
let engines = {}, results = {}, busy = false, sequence = 0, codexModels = [], modelRevision = 0;
let requestRun = null;
const runs = [];
let editingSlot = 0, profileKey = selectedTargets[0], followLatest = true;
const viewStarts = {};
let inCombat = false;
const summaryUsage = { calls: 0, input_tokens: 0, output_tokens: 0 };
const MEMORY_STORAGE_KEY = 'anpc-test-memory-v1';
let persisted = { version: 1, owners: {}, saves: {} };
try {
  const data = JSON.parse(localStorage.getItem(MEMORY_STORAGE_KEY) ?? 'null');
  if (data) {
    if (data.version !== 1 || !data.owners || !data.saves) throw new Error('invalid_storage');
    for (const snapshot of Object.values(data.owners)) validateStoredMemory(snapshot);
    for (const save of Object.values(data.saves)) {
      if (!save.scenario?.fields || !save.journals || !save.worlds || !save.memories) throw new Error('invalid_storage');
      for (const [key, journal] of Object.entries(save.journals)) validateStoredMemory({ journal, memory: save.memories[key] });
    }
    persisted = data;
  }
} catch { $('save-hint').textContent = '저장 자료를 읽지 못했습니다. 빈 기억으로 시작합니다.'; }
const saves = new Map(Object.entries(persisted.saves));
function validateStoredMemory(snapshot) {
  if (!Array.isArray(snapshot?.journal) || snapshot.memory?.version !== 1 || !Array.isArray(snapshot.memory.records)
    || !Array.isArray(snapshot.memory.processed)) throw new Error('invalid_storage');
  const ids = new Set(snapshot.journal.map(e => e?.event_id));
  if (ids.has(undefined) || ids.size !== snapshot.journal.length || (snapshot.memory.summary_boundary != null && !ids.has(snapshot.memory.summary_boundary)) || snapshot.journal.some(e => /_utterance$/.test(e.event_type) && (typeof e.text !== 'string' || !['player', 'npc'].includes(e.role)))
    || snapshot.memory.records.some(r => typeof r.memory_id !== 'string' || typeof r.text !== 'string' || !r.text.trim() || !Number.isInteger(r.validity?.occurred_at?.sequence)
      || !['player_claim', 'npc_statement'].includes(r.kind) || r.epistemic_status !== r.kind
      || ![r.subject_keys, r.topic_tags].every(a => Array.isArray(a) && a.every(v => typeof v === 'string'))
      || !Array.isArray(r.evidence_event_ids) || !r.evidence_event_ids.length || r.evidence_event_ids.some(id => !ids.has(id)))
    || snapshot.memory.processed.some(id => !ids.has(id))) throw new Error('invalid_storage');
}
function persistMemory(engine) {
  if (engine?.npcType === 'community') persisted.owners[engine.npcKey] = engine.memorySnapshot();
  persisted.saves = Object.fromEntries(saves);
  try { localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(persisted)); }
  catch { $('save-hint').textContent = '브라우저 저장 실패 · 현재 페이지의 기억만 유지됩니다.'; }
}
async function summarizeMemory(events, signal) {
  if ($('mode').value !== 'openai' || events.length < 8) return { reply: extractLocalSummary(events), mode: 'local_extract' };
  const summaryInput = await makeSummaryInput(events); summaryUsage.calls++;
  const response = await fetch('/api/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-ANPC-Token': bootstrap.token },
    body: JSON.stringify({ prompt: { instructions: bootstrap.memoryBase, input: [{ role: 'user', content: JSON.stringify(summaryInput) }] },
      mode: 'openai', model: selectedApiModel(), reasoningEffort: 'none', apiKey: $('api-key').value }), signal });
  const data = await response.json(); if (!response.ok) throw new Error(data.error);
  summaryUsage.input_tokens += data.usage?.input_tokens ?? 0; summaryUsage.output_tokens += data.usage?.output_tokens ?? 0;
  return data;
}
const apiModels = [...API_MODELS.map(m => [m.id, m.label]), ['__custom', '직접 입력']];
function element(tag, text, className) { const e = document.createElement(tag); if (text != null) e.textContent = text; if (className) e.className = className; return e; }
function selectTargets() {
  keys = testTargets(selectedTargets[0], $('target-count').value === '2' ? selectedTargets[1] : '', bundle.cards);
  $('phase-settings').replaceChildren();
  for (const key of keys) {
    const card = bundle.cards.find(c => c.character_key === key), label = element('label', `${card.display_name}의 원작 관계 단계`), select = element('select');
    select.id = `phase-${key}`; label.htmlFor = select.id;
    if (card.relationship_stages) {
      for (const stage of card.relationship_stages) { const option = element('option', stage.label); option.value = stage.id; select.append(option); }
      select.value = relationshipStages[key];
      const hint = element('p', null, 'hint');
      const update = () => { const stage = card.relationship_stages.find(s => s.id === select.value); phases[key] = stage.phase; hint.textContent = stage.requirements.join(' · '); };
      update(); select.onchange = () => { relationshipStages[key] = select.value; update(); changeScenario(true); };
      $('phase-settings').append(label, select, hint); continue;
    }
    for (const phase of card.phase_labels) { const option = element('option', PHASE_LABELS[phase] ?? phase); option.value = phase; select.append(option); }
    select.value = phases[key]; select.onchange = () => { phases[key] = select.value; changeScenario(true); };
    $('phase-settings').append(label, select);
  }
  renderStoryContacts();
}
selectTargets();
function settings(key) {
  return { allowDraft: true, storyState: $('story-mode').value === 'progress' ? { fields: storyFields } : null, configuration: $('configuration').value, phase: phases[key],
    relationshipStage: relationshipStages[key], alive: $('alive').checked, free: $('free').checked, basicKnowledge: $('basic-knowledge').checked,
    relicKnown: $('relic-known').checked, relicDisclosed: $('relic-disclosed').checked,
    outfitId: $('outfit').value, outfitName: $('outfit-name').value, outfitDescription: $('outfit-description').value, outfitVisible: $('outfit-visible').checked,
    publicRecognition: $('public-recognition').checked, minorFiction: $('minor-fiction').checked, selectActions: $('select-actions').checked };
}
function details(label, value) { const e = element('details'); e.append(element('summary', label), element('pre', JSON.stringify(value, null, 2))); return e; }
function changeTarget(index, value) {
  if (busy) return;
  const next = [...selectedTargets]; next[index] = value;
  if (next[0] === next[1]) next[1 - index] = bundle.cards.find(c => c.character_key !== value).character_key;
  testTargets(next[0], next[1], bundle.cards);
  selectedTargets.splice(0, 2, ...next); profileKey = value; followLatest = true;
  for (const engine of Object.values(engines)) engine.end(true, '선택 인물 변경');
  requestRun = null; results = {}; $('error').hidden = true; $('status').textContent = '인물을 선택했습니다. 질문을 보내면 대화가 시작됩니다.'; selectTargets(); render();
}
for (const outfit of OUTFITS) { const option = element('option', outfit.display_name); option.value = outfit.id; $('outfit').append(option); }
const customOutfit = element('option', '직접 입력'); customOutfit.value = 'custom'; $('outfit').append(customOutfit);
for (const preset of QUESTION_PRESETS) { const option = element('option', preset.label); option.value = preset.id; $('question-preset').append(option); }
$('question-preset').onchange = () => {
  if (busy) return;
  const preset = QUESTION_PRESETS.find(p => p.id === $('question-preset').value);
  $('preset-hint').textContent = preset?.hint ?? ''; $('preset-hint').hidden = !preset?.hint;
  if (preset) { $('input').value = preset.question; $('input').focus(); }
};
function updateRequestDisplay() {
  const mode = $('mode').selectedOptions[0].textContent;
  $('open-settings').textContent = mode + ' · 설정';
  if (inCombat) $('status').textContent = '전투 중 · 안전 상태로 복귀한 뒤 대화하세요';
  else if (busy) $('status').textContent = requestRun?.cancelling ? '응답 중단 중…' : '대답을 기다리는 중…';
  else if (requestRun && Object.values(results).some(r => r.status === 'failed')) $('status').textContent = '응답 실패 · 해당 메시지를 확인하세요';
  else $('status').textContent = keys.length === 2 ? '같은 메시지에 각자 답변합니다' : mode === '모의 응답' ? '모의 응답 · API 호출 없음' : mode;
}
function renderCharacters() {
  $('selection-slot').hidden = keys.length === 1;
  if (keys.length === 1) editingSlot = 0;
  for (const button of document.querySelectorAll('[data-slot]')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.slot) === editingSlot)); button.disabled = busy;
  }
  $('character-list').replaceChildren();
  const query = $('character-search').value.normalize('NFKC').toLocaleLowerCase('ko').trim();
  const cards = bundle.cards.filter(c => [c.display_name, c.presentation?.role, c.lived_context?.occupation].join(' ').toLocaleLowerCase('ko').includes(query));
  for (const card of cards) {
    const button = element('button', null, 'character-choice'); button.type = 'button'; button.disabled = busy;
    button.setAttribute('aria-pressed', String(card.character_key === selectedTargets[editingSlot]));
    const text = element('span', null, 'character-choice-text');
    text.append(element('strong', card.display_name.replace(' · 군중 예시', '')), element('small', card.presentation?.role ?? card.lived_context?.occupation));
    button.append(element('span', card.display_name[0], 'character-avatar'), text);
    const index = keys.indexOf(card.character_key);
    if (keys.length === 2 && index >= 0) button.append(element('span', String(index + 1), 'selection-number'));
    button.onclick = () => { changeTarget(editingSlot, card.character_key); if ($('character-picker').open) $('character-picker').close(); };
    $('character-list').append(button);
  }
  if (!cards.length) $('character-list').append(element('p', '검색 결과가 없습니다.', 'hint'));
}
function inspectResult(run, target, result) {
  $('request-title').textContent = target.name + ' · 응답 기록';
  const content = $('request-content'); content.replaceChildren();
  content.append(element('p', run.input, 'inspected-question'), element('p', requestMetrics(result, performance.now()), 'hint'));
  if (run.mode === 'openai') content.append(element('p', `${run.model} · 추론 ${run.reasoningEffort}`, 'hint'));
  if (result.status === 'completed') {
    const label = element('label', '내 평가'), review = element('select');
    review.id = 'response-review'; label.htmlFor = review.id;
    for (const text of ['미검수', '작성 방향에 적합', '판단 문제', '말투 문제', '지식·관계 문제', '근거 부족']) review.append(element('option', text));
    review.value = result.review ?? '미검수'; review.onchange = () => { result.review = review.value; };
    const note = element('textarea'); note.rows = 2; note.placeholder = '검수 메모'; note.setAttribute('aria-label', '검수 메모');
    note.value = result.note ?? ''; note.oninput = () => { result.note = note.value; };
    content.append(label, review, note);
  }
  if (result.selection) {
    const d = result.selection;
    content.append(element('h3', '이 응답에 제공한 지식'), element('p', d.knowledge_boundaries.map(b => domainLabel(b.domain_id) + ': ' + DEPTH_LABELS[b.depth]).join(' · '), 'hint'));
    for (const k of d.knowledge) content.append(element('p', k.statement ?? k.response_constraint));
    content.append(details('선별·기억 전달 기록', d));
  }
  if (result.actionSelection) content.append(details('행동 선택 · 실행 안 함', result.actionSelection));
  if (result.prompt) {
    const { instructions, input, ...local } = result.prompt;
    content.append(details('실제 전송 프롬프트', { instructions, input }), details('로컬 정보 · 모델 미전송', local));
  }
  if (result.rawReply) content.append(details('원시 모델 응답', result.rawReply));
  if (result.reply) content.append(details('검사한 응답', result.reply));
  $('request-inspector').showModal();
}
function renderTranscript() {
  const transcript = $('comparison-results'), scroll = transcript.scrollTop;
  const atBottom = transcript.scrollHeight - transcript.clientHeight - scroll < 72;
  transcript.replaceChildren();
  const visible = conversationExchanges(runs, keys, viewStarts);
  if (!visible.length) {
    const empty = element('div', null, 'empty-conversation'), card = bundle.cards.find(c => c.character_key === keys[0]);
    empty.append(element('div', card.display_name[0], 'character-avatar empty-avatar'), element('h3', keys.length === 2 ? '두 인물의 답변을 비교해보세요' : card.display_name + '에게 말을 걸어보세요'),
      element('p', keys.length === 2 ? '한 번 입력하면 두 인물이 각자 답합니다.' : card.presentation?.role ?? card.lived_context?.occupation, 'hint'));
    const questions = element('div', null, 'starter-questions');
    for (const preset of QUESTION_PRESETS.filter(p => ['everyday', 'outfit', 'values'].includes(p.id))) {
      const button = element('button', preset.question); button.type = 'button';
      button.onclick = () => { $('input').value = preset.question; $('input').focus(); }; questions.append(button);
    }
    empty.append(questions); transcript.append(empty);
  }
  for (const { run, targets } of visible) {
    const exchange = element('section', null, 'chat-exchange');
    const player = element('div', null, 'player-message'); player.append(element('span', bootstrap.playerIdentity.display_name, 'message-author'), element('p', run.input)); exchange.append(player);
    const responses = element('div', null, 'response-columns'); exchange.append(responses);
    for (const target of targets) {
      const result = run.results[target.key], message = element('article', null, 'npc-message');
      const heading = element('div', null, 'message-heading'); heading.append(element('span', target.name[0], 'character-avatar'), element('strong', target.name.replace(' · 군중 예시', ''))); message.append(heading);
      if (result.reply) {
        message.append(element('p', [result.reply.dialogue, result.reply.follow_up].filter(Boolean).join('\n'), 'message-text'));
        if (result.reply.warning) message.append(element('p', '허용 범위를 벗어난 답변을 안전 대사로 대체했습니다.', 'result-warning'));
        if (result.actionSelection) message.append(element('p', '제스처 선택 · 실행되지 않음', 'action-note'));
      } else message.append(element('p', result.error ?? '대답을 기다리는 중…', result.error ? 'result-warning' : 'pending-response'));
      if (result.status !== 'pending') {
        const menu = element('details', null, 'message-options'), summary = element('summary', '···');
        summary.setAttribute('aria-label', target.name + ' 답변 메뉴'); menu.append(summary);
        const button = element('button', '응답 기록'); button.type = 'button';
        button.onclick = () => { menu.open = false; inspectResult(run, target, result); }; menu.append(button); message.append(menu);
      }
      responses.append(message);
    }
    transcript.append(exchange);
  }
  transcript.scrollTop = followLatest || atBottom ? transcript.scrollHeight : scroll;
  followLatest = false;
}
function render() {
  $('send').disabled = busy || inCombat; $('cancel').hidden = !busy; $('input').disabled = busy;
  for (const e of document.querySelectorAll('#settings-dialog input, #settings-dialog textarea, #settings-dialog select, #settings-dialog button:not([data-close]):not([data-settings-tab]), #target-count, #new-dialogue, #question-preset')) e.disabled = busy;
  if (!busy) showReasoning();
  $('recontact').disabled = !keys.some(key => engines[key]?.session);
  $('danger').disabled = false; $('save-test').disabled = false; $('load-test').disabled = !saves.has($('save-slot').value);
  $('custom-outfit').hidden = $('outfit').value !== 'custom';
  $('chat-title').textContent = keys.map(key => bundle.cards.find(c => c.character_key === key).display_name.replace(' · 군중 예시', '')).join(' / ');
  $('request-count').textContent = keys.length === 2 ? '2건 요청 · 각자 응답' : 'Enter 전송 · Shift+Enter 줄바꿈';
  $('send').textContent = busy ? '응답 중' : '보내기';
  $('provider-help').textContent = $('mode').value === 'mock' ? 'API 호출 없이 고정된 모의 응답을 표시합니다.' : $('mode').value === 'openai' ? '메시지 전송당 ' + keys.length + '건의 API 호출' : 'Codex 계정 사용량 적용';
  if (!keys.includes(profileKey)) profileKey = keys[0];
  $('profile-tabs').hidden = keys.length === 1; $('profile-tabs').replaceChildren();
  for (const key of keys) {
    const button = element('button', bundle.cards.find(c => c.character_key === key).display_name.replace(' · 군중 예시', '')); button.type = 'button';
    button.setAttribute('aria-pressed', String(key === profileKey)); button.onclick = () => { profileKey = key; render(); }; $('profile-tabs').append(button);
  }
  renderCharacterProfiles($('character-profile'), [buildCharacterProfile(bundle, profileKey, settings(profileKey), engines[profileKey]?.lastSelection ? [...(engines[profileKey].lastSelection.common_fact_ids ?? []), ...engines[profileKey].lastSelection.selected_fact_ids] : undefined, engines[profileKey]?.instances.get(profileKey)?.persona.core_personality)]);
  for (const button of document.querySelectorAll('[data-relationship-key]')) button.onclick = () => { openSettings('scene'); $('phase-' + button.dataset.relationshipKey).focus(); };
  const memoryLabels = { running: '정리 중', ready: '준비', local_extract: '원문 추출', invalid_summary: '요약 검증 실패', stale_job: '이전 작업 폐기', network_error: '연결 실패', network_blocked: '연결 차단', timeout: '시간 초과', auth_failed: 'API 키 확인 필요', busy: '다른 요청 처리 중', invalid_response: '응답 검증 실패', memory_capacity_exceeded: '기억 용량 초과', provider_refused: '요약 거절', provider_rejected: '요약 요청 거부', rate_limited: 'API 한도 초과' };
  $('memory-hint').textContent = keys.map(key => {
    const memory = engines[key]?.longMemory, snapshot = persisted.owners[key];
    return `${bundle.cards.find(c => c.character_key === key).display_name}: 기억 ${memory?.records.length ?? snapshot?.memory.records.length ?? 0}개 · ${memoryLabels[memory?.status] ?? memory?.status ?? '준비'}`;
  }).join(' / ') + ` · 요약 요청 ${summaryUsage.calls}회 (입력 ${summaryUsage.input_tokens}, 출력 ${summaryUsage.output_tokens}토큰). 최근 6개 발화 유지, 8회 대화마다 정리. 실패 시 원문 유지·수동 재시도. OpenAI 요약은 추가 요금이 발생합니다.`;
  renderCharacters(); renderTranscript(); updateRequestDisplay();
}
function reset() {
  requestRun = null;
  runs.length = 0; for (const key of Object.keys(viewStarts)) delete viewStarts[key];
  sequence++; for (const engine of Object.values(engines)) { engine.end(false, '전체 초기화'); engine.clearMemory(); }
  engines = {}; saves.clear(); persisted = { version: 1, owners: {}, saves: {} }; persistMemory(); inCombat = false; $('save-hint').textContent = '브라우저에 저장 · 새로고침 후에도 유지'; results = {}; busy = false; $('status').textContent = '시험 대화·기억·저장을 초기화했습니다.'; $('error').hidden = true; render();
}
function changeScenario(requireEntry = false) {
  requestRun = null; results = {}; $('error').hidden = true;
  for (const engine of Object.values(engines)) {
    if (requireEntry) engine.end(true, '현재 원작 조건 변경');
    if (!$('alive').checked && engine.npcType === 'crowd') engine.respawn(engine.npcKey);
    engine.changeWorld({ quest_controlled: !$('free').checked || !$('alive').checked, equipment: resolveOutfit(settings(engine.npcKey))?.display_name });
  }
  $('status').textContent = '상황을 변경했습니다. 완료된 기억은 유지하고 다음 요청의 맥락을 갱신합니다.'; render();
}
for (const id of ['configuration', 'alive', 'free', 'basic-knowledge', 'relic-known', 'relic-disclosed']) $(id).onchange = () => changeScenario(true);
for (const id of ['outfit', 'outfit-name', 'outfit-description', 'outfit-visible', 'public-recognition', 'minor-fiction', 'select-actions']) $(id).onchange = () => changeScenario();
function enterDialogue() {
    // 전체 인물 조건을 먼저 검증한 뒤 제어 반환을 모의한다. 여기서는 모델을 호출하지 않는다.
    if (inCombat) throw new Error('안전 상태로 복귀한 뒤 테스트하세요.');
    for (const key of keys) if (!engines[key]) {
      engines[key] = new ScenarioEngine({ bundle, npcKey: key, settings: () => settings(key), base: bootstrap.base, notify: render,
        summarize: summarizeMemory, persist: persistMemory });
      const snapshot = persisted.owners[key];
      const current = settings(key);
      if (snapshot && (!current.storyState || snapshot.storyState && !storyRequiresReset({ storyState: snapshot.storyState }, current))) engines[key].restore(snapshot.journal, undefined, snapshot.memory);
    }
    for (const key of keys) {
      const engine = engines[key];
      if (!engine.session) engine.assertCanEnter();
    }
    for (const key of keys) if (!engines[key].session) engines[key].start(key);
}
$('target-count').onchange = () => changeTarget(0, selectedTargets[0]);
$('character-search').oninput = renderCharacters;
for (const button of document.querySelectorAll('[data-slot]')) button.onclick = () => { editingSlot = Number(button.dataset.slot); profileKey = selectedTargets[editingSlot]; render(); };
function openSettings(tab = 'connection') {
  for (const button of document.querySelectorAll('[data-settings-tab]')) button.setAttribute('aria-pressed', String(button.dataset.settingsTab === tab));
  for (const id of ['connection', 'scene', 'advanced']) $(id + '-panel').hidden = id !== tab;
  if (!$('settings-dialog').open) $('settings-dialog').showModal();
}
$('open-settings').onclick = () => openSettings(); $('open-scene').onclick = () => openSettings('scene');
for (const button of document.querySelectorAll('[data-settings-tab]')) button.onclick = () => openSettings(button.dataset.settingsTab);
for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => button.closest('dialog')?.close();
for (const [buttonId, dialogId, panelId] of [['open-characters', 'character-picker', 'character-nav'], ['open-profile', 'profile-dialog', 'profile-inspector']]) {
  const panel = $(panelId), parent = panel.parentNode, next = panel.nextSibling;
  $(buttonId).onclick = () => { $(dialogId).append(panel); $(dialogId).showModal(); };
  $(dialogId).onclose = () => { parent.insertBefore(panel, next); };
}

$('new-dialogue').onclick = () => {
  for (const key of keys) { engines[key]?.end(false, '새 대화'); engines[key]?.clearMemory(); }
  for (const key of keys) viewStarts[key] = runs.length;
  followLatest = true; requestRun = null; results = {}; $('error').hidden = true; $('input').value = ''; render();
};
$('danger').onclick = () => {
  inCombat = true;
  if (requestRun) requestRun.cancelling = true;
  for (const engine of Object.values(engines)) engine.changeWorld({ combat: true });
  $('status').textContent = '전투 발생 · 요청과 자막 출력 중단 · 모의 제어 해제'; render();
};
$('safe-world').onclick = () => { inCombat = false; for (const engine of Object.values(engines)) engine.changeWorld({ combat: false }); $('status').textContent = '안전 상태로 복귀했습니다. 질문을 보내면 다시 시작합니다.'; render(); };
const savedFields = ['story-mode', 'story-preset', 'story-scene-free', 'configuration', 'alive', 'free', 'basic-knowledge', 'relic-known', 'relic-disclosed', 'outfit', 'outfit-name', 'outfit-description', 'outfit-visible', 'public-recognition', 'minor-fiction', 'select-actions'];
function scenarioSnapshot() { return { storyFields: structuredClone(storyFields), inCombat, phases: structuredClone(phases), relationshipStages: structuredClone(relationshipStages), fields: Object.fromEntries(savedFields.map(id => [id, $(id).type === 'checkbox' ? $(id).checked : $(id).value])) }; }
$('save-slot').onchange = render;
$('save-test').onclick = () => {
  saves.set($('save-slot').value, captureTestSave(engines, scenarioSnapshot()));
  // 아직 선택하지 않은 인물의 완료된 기억도 같은 저장 시점에 포함한다.
  const saved = saves.get($('save-slot').value);
  for (const [key, snapshot] of Object.entries(persisted.owners)) if (!Object.hasOwn(saved.journals, key)) {
    saved.journals[key] = structuredClone(snapshot.journal); saved.memories[key] = structuredClone(snapshot.memory);
  }
  persistMemory();
  $('save-hint').textContent = `슬롯 ${$('save-slot').value.toUpperCase()}에 현재 상황과 완료된 고유 인물 사건을 저장했습니다.`; render();
};
$('load-test').onclick = () => {
  const saved = saves.get($('save-slot').value); if (!saved) return;
  if (busy && requestRun) {
    requestRun.ended_ms = performance.now();
    for (const result of Object.values(results)) if (result.status === 'pending') Object.assign(result, { status: 'cancelled', elapsed_ms: Math.round(requestRun.ended_ms - result.started_ms), error: '저장 로드로 요청 취소' });
  }
  sequence++; busy = false; requestRun = null; results = {};
  inCombat = saved.scenario.inCombat;
  storyFields = structuredClone(saved.scenario.storyFields ?? {});
  persisted.owners = Object.fromEntries(Object.entries(saved.journals).map(([key, journal]) => [key, { journal: structuredClone(journal), memory: structuredClone(saved.memories[key]), storyState: saved.scenario.fields['story-mode'] === 'progress' ? { fields: structuredClone(saved.scenario.storyFields) } : null }]));
  for (const engine of Object.values(engines)) engine.restore(saved.journals[engine.npcKey], saved.worlds[engine.npcKey] ?? { ...engine.world, combat: inCombat }, saved.memories[engine.npcKey]);
  persistMemory();
  for (const [id, value] of Object.entries(saved.scenario.fields)) { if ($(id).type === 'checkbox') $(id).checked = value; else $(id).value = value; }
  if (!saved.scenario.storyFields) $('story-mode').value = 'card';
  renderStoryQuests();
  Object.assign(phases, saved.scenario.phases); Object.assign(relationshipStages, saved.scenario.relationshipStages); selectTargets();
  for (const engine of Object.values(engines)) { engine.lastStorySettings = structuredClone(settings(engine.npcKey)); engine.changeWorld({ quest_controlled: !$('free').checked || !$('alive').checked }); }
  $('story-settings').hidden = $('story-mode').value !== 'progress';
  $('save-hint').textContent = `슬롯 ${$('save-slot').value.toUpperCase()} 복원 · 이후 기억 폐기 · 군중 인스턴스 새로 생성`;
  $('status').textContent = '모의 저장을 로드했습니다. 다음 질문에 저장 시점의 기억을 사용합니다.'; $('error').hidden = true; render();
};
$('summarize-memory').onclick = async () => {
  $('summarize-memory').disabled = true;
  try { await Promise.all(keys.map(key => engines[key]?.consolidateMemory())); }
  finally { $('summarize-memory').disabled = false; render(); }
};
function showModels() {
  const options = $('mode').value === 'codex' ? [['', 'Codex 기본 모델'], ...codexModels.map(m => [m.id, m.label])] : apiModels;
  $('model').replaceChildren(); for (const [value, label] of options) { const option = element('option', label); option.value = value; $('model').append(option); }
  $('custom-settings').hidden = true;
  showReasoning();
}
function selectedApiModel() { return $('model').value === '__custom' ? $('custom-model').value.trim() : $('model').value; }
function showReasoning() {
  $('reasoning-settings').hidden = $('mode').value !== 'openai';
  const profile = apiModelProfile(selectedApiModel());
  $('reasoning-effort').disabled = !profile.efforts.length;
  for (const option of $('reasoning-effort').options) option.disabled = profile.efforts.length > 0 && !profile.efforts.includes(option.value);
  if (!profile.efforts.length) $('reasoning-effort').value = 'none';
  $('reasoning-help').textContent = !profile.efforts.length ? '이 모델은 추론 설정을 지원하지 않습니다. API에 추론 값을 보내지 않습니다.'
    : !profile.efforts.includes('none') ? '이 모델은 none을 지원하지 않습니다. 지원되는 추론 값을 선택하세요.'
    : profile.unverified ? '직접 입력 모델은 추론 지원 값을 확인해 주세요. 선택한 값을 API로 전달합니다.'
    : '기본은 none입니다. 추론을 켜면 최대 대기 시간과 출력 예산이 늘어나며 내부 추론도 과금됩니다.';
}
$('mode').onchange = () => {
  modelRevision++; changeScenario(true); const mode = $('mode').value;
  $('provider-settings').hidden = mode === 'mock'; $('key-settings').hidden = mode !== 'openai'; $('codex-settings').hidden = mode !== 'codex';
  showModels();
};
$('model').onchange = () => { changeScenario(true); $('custom-settings').hidden = $('model').value !== '__custom'; showReasoning(); };
$('custom-model').onchange = () => { changeScenario(true); showReasoning(); };
$('custom-model').oninput = showReasoning;
$('reasoning-effort').onchange = () => changeScenario(true);
$('forget-key').onclick = () => { $('api-key').value = ''; };
if (bootstrap.hasEnvironmentKey) $('key-help').textContent = '서버에 저장된 키가 있습니다. 입력 없이 자동 사용합니다. .env 변경은 서버 재시작 후 반영됩니다.';
$('refresh-models').onclick = async () => {
  const revision = ++modelRevision; $('codex-status').textContent = '조회 중…';
  try {
    const res = await fetch('/api/codex-models', { headers: { 'X-ANPC-Token': bootstrap.token } }), data = await res.json();
    if (revision !== modelRevision || $('mode').value !== 'codex' || busy) return;
    if (!res.ok) throw new Error(data.error);
    codexModels = data.models; changeScenario(true); showModels(); $('codex-status').textContent = `모델 ${codexModels.length}개 · 연결 유지`;
  } catch { if (revision === modelRevision) $('codex-status').textContent = '모델 조회 실패. CLI 로그인과 사용 한도를 확인하세요.'; }
};
async function provider(args, mode, model, reasoningEffort) {
  if (mode === 'mock') return researchMock(args);
  const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-ANPC-Token': bootstrap.token },
    body: JSON.stringify({ prompt: args.prompt, mode, model, ...(mode === 'openai' ? { apiKey: $('api-key').value, reasoningEffort } : {}) }), signal: args.signal });
  const data = await response.json();
  if (!response.ok) throw new Error({
    network_blocked: '서버의 외부 연결이 차단됐습니다. 외부 연결이 허용된 환경에서 서버를 다시 실행하세요.',
    network_error: '제공자에 연결하지 못했습니다. 인터넷 연결을 확인하세요.',
    auth_failed: 'API 키 또는 계정의 모델 접근 권한을 확인하세요.',
    invalid_reasoning_effort: '이 모델이 지원하는 추론 값을 선택하세요.'
  }[data.error] ?? data.error);
  return data;
}
$('compare-form').onsubmit = async event => {
  event.preventDefault(); if (busy) return; $('error').hidden = true;
  const input = $('input').value.trim(), mode = $('mode').value, model = selectedApiModel(), reasoningEffort = $('reasoning-effort').value;
  try {
    if (!input || [...input].length > 1000) throw new Error('질문을 1~1000자로 입력하세요.');
    if (mode === 'openai' && !$('api-key').value && !bootstrap.hasEnvironmentKey) throw new Error('개인 API 키를 입력하세요.');
    if (mode === 'openai' && !model) throw new Error('모델 ID를 입력하세요.');
    if (mode === 'openai' && !supportsReasoningEffort(model, reasoningEffort)) throw new Error('이 모델이 지원하는 추론 값을 선택하세요.');
    enterDialogue();
    const started = performance.now(); requestRun = { id: runs.length + 1, input, mode, model, reasoningEffort: mode === 'openai' ? reasoningEffort : null, started_ms: started, ended_ms: null, cancelling: false,
      targets: keys.map(key => ({ key, name: bundle.cards.find(c => c.character_key === key).display_name, phase: phases[key], relationshipStage: relationshipStages[key] ?? null })),
      configuration: $('configuration').selectedOptions[0].textContent };
    results = Object.fromEntries(keys.map(key => [key, { status: 'pending', started_ms: started, mode, model, input }]));
    requestRun.results = results; runs.push(requestRun); followLatest = true; $('input').value = ''; $('question-menu').open = false;
    busy = true; const revision = ++sequence; render();
    await Promise.allSettled(keys.map(async key => {
      const engine = engines[key];
      try {
        const result = await engine.send(input, args => provider(args, mode, model, reasoningEffort));
        if (revision !== sequence) return;
        results[key] = { ...results[key], status: result.stale ? 'cancelled' : 'completed', elapsed_ms: Math.round(performance.now() - started),
          ...(result.stale ? { error: '늦은 응답 폐기' } : snapshotTestResult(engine)) };
      } catch (err) { if (revision === sequence) results[key] = { ...results[key], status: err.name === 'AbortError' ? 'cancelled' : 'failed', elapsed_ms: Math.round(performance.now() - started), error: `${err.message} · 응답 미표시` }; }
      if (revision === sequence) render();
    }));
    if (revision === sequence) { busy = false; requestRun.ended_ms = performance.now(); render(); $('input').focus(); }
  } catch (err) { busy = false; $('error').textContent = err.message; $('error').hidden = false; render(); }
};
$('cancel').onclick = () => { if (requestRun) requestRun.cancelling = true; for (const result of Object.values(results)) if (result.status === 'pending') result.cancelling = true; for (const engine of Object.values(engines)) engine.cancel(); updateRequestDisplay(); };
$('recontact').onclick = () => { if (busy && requestRun) requestRun.cancelling = true; else requestRun = null; for (const key of keys) engines[key]?.end(); $('status').textContent = '대화 종료 · 기억 유지. 다음 질문을 보내면 재접촉합니다.'; render(); };
$('reset').onclick = reset;
$('input').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('compare-form').requestSubmit(); } };
const questLabels = { not_started: '시작 전', active: '진행 중', completed: '완료', failed: '실패' };
function storyChanged(previous) {
  const next = settings(keys[0]);
  if (storyRequiresReset(previous, next)) {
    for (const engine of Object.values(engines)) { engine.clearMemory(); engine.lastStorySettings = structuredClone(settings(engine.npcKey)); }
    persisted.owners = {}; persistMemory();
    $('story-hint').textContent = '진행도를 되돌리거나 분기를 바꿨습니다. 이후 사건의 기억을 지웠습니다. 저장 로드는 해당 시점의 기억을 복원합니다.';
  } else $('story-hint').textContent = '관계와 현재 접촉 상태를 따로 판정합니다. 실제 게임에 연결되지 않은 모의 진행 상태입니다.';
  changeScenario(true);
}
function renderStoryContacts() {
  $('contact-settings').replaceChildren();
  for (const key of keys) {
    const card = bundle.cards.find(c => c.character_key === key); if (card.npc_type === 'crowd') continue;
    const label = element('label', `${card.display_name}의 현재 접촉`), select = element('select'); select.id = `contact-${key}`; label.htmlFor = select.id;
    for (const [value, text] of Object.entries({ ...contactLabels, ...(key !== 'johnny' ? { engram: undefined } : {}) })) {
      if (!text) continue; const option = element('option', text); option.value = value; select.append(option);
    }
    select.value = storyFields[`content.contact.${key}`] ?? 'unknown';
    select.onchange = () => { const previous = structuredClone(settings(key)); storyFields[`content.contact.${key}`] = select.value; storyChanged(previous); };
    $('contact-settings').append(label, select);
  }
}
function renderStoryQuests() {
  $('quest-settings').replaceChildren();
  for (const track of [...new Set(bundle.storyPolicy.quests.map(q => q.track))]) {
    const group = element('details'), summary = element('summary', { main: '본편 메인', lifepath: '인생 경로', phantom_liberty: '팬텀 리버티', ending: '결말', judy: '주디', panam: '팬앰', river: '리버', johnny: '조니·로그', kerry: '케리', viktor: '빅터' }[track] ?? track); group.append(summary);
    for (const q of bundle.storyPolicy.quests.filter(q => q.track === track)) {
      const label = element('label', q.title), select = element('select'); select.id = `quest-${q.id}`; label.htmlFor = select.id;
      for (const [value, text] of Object.entries({ ...questLabels, unknown: '확인 안 됨' })) { const option = element('option', text); option.value = value; select.append(option); }
      select.value = storyFields[`content.quests.${q.id}`] ?? 'unknown';
      select.onchange = () => { const previous = structuredClone(settings(keys[0])); storyFields[`content.quests.${q.id}`] = select.value; storyChanged(previous); };
      group.append(label, select);
    }
    $('quest-settings').append(group);
  }
  const choiceLabels = { judy_pisces: '주디 · Pisces 선택', judy_relationship: '주디와의 관계', panam_relationship: '팬앰과의 관계', goro_fate: '타케무라 구출', kerry_relationship: '케리와의 관계', river_rescue: '랜디 구출', river_relationship: '리버와의 관계', evelyn_offer: '에블린의 제안', johnny_relationship: '조니 · 유전 대화와 렐릭', songbird_route: '소미의 분기' };
  const valueLabels = { v_plan: 'V의 계획', maiko_no_pay: '마이코 계획 · 보수 거절', maiko_killed: '마이코 사망', maiko_paid: '마이코 계획 · 보수 수령', friend: '친구', partner: '연인 · 원작 조건 확인', cut_off: '관계 단절', betrayed: '사울에게 계획 공개', pending: '선택 전', saved: '구출', abandoned: '구출하지 않음', rescued: '구출 성공', failed: '구출 실패', client: '의뢰인', dex_offer: '덱스 제외 제안', second_chance: '두 번째 기회', rejected: '두 번째 기회 거절', separated: '렐릭 접촉 종료', songbird: '소미를 도움', reed: '리드를 도움', moon_departed: '달로 출발', fia_custody: 'FIA 인계', dead: '사망' };
  for (const [key, values] of Object.entries(bundle.storyPolicy.choices)) {
    const label = element('label', choiceLabels[key] ?? key), select = element('select'); select.id = `choice-${key}`; label.htmlFor = select.id;
    for (const value of ['unknown', ...values]) { const option = element('option', value === 'unknown' ? '확인 안 됨' : valueLabels[value] ?? value); option.value = value; select.append(option); }
    select.value = storyFields[`content.choices.${key}`] ?? 'unknown';
    select.onchange = () => { const previous = structuredClone(settings(keys[0])); storyFields[`content.choices.${key}`] = select.value; storyChanged(previous); };
    $('quest-settings').append(label, select);
  }
}
for (const preset of bundle.storyPolicy.presets) { const option = element('option', preset.label); option.value = preset.id; $('story-preset').append(option); }
$('story-preset').onchange = () => {
  const previous = structuredClone(settings(keys[0])), preset = bundle.storyPolicy.presets.find(p => p.id === $('story-preset').value);
  storyFields = structuredClone(preset.fields); Object.assign(relationshipStages, preset.relationship_stages);
  $('story-scene-free').checked = storyFields['content.story.scene_free'] === true;
  renderStoryQuests(); selectTargets(); storyChanged(previous);
};
$('story-mode').onchange = () => {
  const next = settings(keys[0]), previous = { ...next, storyState: next.storyState ? null : { fields: storyFields } };
  $('story-settings').hidden = $('story-mode').value !== 'progress'; storyChanged(previous);
};
$('story-scene-free').onchange = () => { const previous = structuredClone(settings(keys[0])); storyFields['content.story.scene_free'] = $('story-scene-free').checked; storyChanged(previous); };
renderStoryQuests(); renderStoryContacts();
showModels(); render();
setInterval(() => { for (const engine of Object.values(engines)) engine.tick(); }, 1000);
setInterval(() => { if (busy) updateRequestDisplay(); }, 250);
document.addEventListener('pointerdown', () => { for (const engine of Object.values(engines)) engine.touch(); });
document.addEventListener('keydown', () => { for (const engine of Object.values(engines)) engine.touch(); });
