import { researchMock } from './research.js';
import { ScenarioEngine, OUTFITS, resolveOutfit, withTestCrowds, captureTestSave } from './scenario.js';
import { GESTURE_CANDIDATES } from './core.js';
import { buildCharacterProfile, testTargets, DEPTH_LABELS, domainLabel } from './profile.js';
import { renderCharacterProfiles } from './profile-view.js';
import { buildQuestionPresets, elapsedText, requestMetrics } from './test-tools.js';
const $ = id => document.getElementById(id);
const bootstrap = await fetch('/api/bootstrap').then(r => r.json());
const QUESTION_PRESETS = buildQuestionPresets(bootstrap.playerIdentity.display_name);
const bundle = withTestCrowds(await fetch('/api/research', { headers: { 'X-ANPC-Token': bootstrap.token } }).then(r => { if (!r.ok) throw new Error('조사 자료 로드 실패'); return r.json(); }), bootstrap.personas);
let keys = [];
const selectedTargets = [bundle.cards[0].character_key, bundle.cards[1]?.character_key ?? ''];
const phases = Object.fromEntries(bundle.cards.map(c => [c.character_key, c.phase_labels[0]]));
let engines = {}, results = {}, busy = false, sequence = 0, codexModels = [], modelRevision = 0;
let requestRun = null;
let inCombat = false;
const saves = new Map();
const apiModels = [['gpt-4o-mini', 'GPT-4o mini'], ['gpt-4.1-mini', 'GPT-4.1 mini'], ['gpt-4.1', 'GPT-4.1'], ['__custom', '직접 입력']];
function element(tag, text, className) { const e = document.createElement(tag); if (text != null) e.textContent = text; if (className) e.className = className; return e; }
function selectTargets() {
  keys = testTargets(selectedTargets[0], selectedTargets[1], bundle.cards);
  $('phase-settings').replaceChildren();
  for (const key of keys) {
    const card = bundle.cards.find(c => c.character_key === key), label = element('label', `${card.display_name}의 가상 단계`), select = element('select');
    select.id = `phase-${key}`; label.htmlFor = select.id;
    for (const phase of card.phase_labels) { const option = element('option', phase); option.value = phase; select.append(option); }
    select.value = phases[key]; select.onchange = () => { phases[key] = select.value; changeScenario(true); };
    $('phase-settings').append(label, select);
  }
}
selectTargets();
function settings(key) {
  return { allowDraft: $('allow-draft').checked, configuration: $('configuration').value, phase: phases[key],
    relationship: $('relationship').value, alive: $('alive').checked, free: $('free').checked, basicKnowledge: $('basic-knowledge').checked,
    relicKnown: $('relic-known').checked, relicDisclosed: $('relic-disclosed').checked,
    outfitId: $('outfit').value, outfitName: $('outfit-name').value, outfitDescription: $('outfit-description').value, outfitVisible: $('outfit-visible').checked,
    publicRecognition: $('public-recognition').checked, minorFiction: $('minor-fiction').checked, selectActions: $('select-actions').checked };
}
function details(label, value) { const e = element('details'); e.append(element('summary', label), element('pre', JSON.stringify(value, null, 2))); return e; }
function changeTarget(index, value) {
  if (busy) return;
  const next = [...selectedTargets]; next[index] = value;
  testTargets(next[0], next[1], bundle.cards);
  selectedTargets[index] = value;
  for (const engine of Object.values(engines)) engine.end(true, '선택 인물 변경');
  requestRun = null; results = {}; selectTargets(); render();
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
  const now = performance.now();
  for (const node of document.querySelectorAll('.request-metrics')) {
    const result = results[node.dataset.key];
    if (result) node.textContent = requestMetrics(result, now);
  }
  if (!requestRun) return;
  const values = Object.values(results), count = status => values.filter(r => r.status === status).length;
  const progress = [`완료 ${count('completed')}/${values.length}`];
  if (count('failed')) progress.push(`실패 ${count('failed')}`);
  if (count('cancelled')) progress.push(`취소 ${count('cancelled')}`);
  const title = inCombat ? '전투 발생 · 대화 중단' : busy ? (requestRun.cancelling ? '취소 중' : '요청 중') : values.every(r => r.status === 'completed') ? '응답 완료' : '요청 종료';
  $('status').textContent = [title, ...progress, elapsedText((requestRun.ended_ms ?? now) - requestRun.started_ms)].join(' · ');
}
function render() {
  const entered = keys.every(key => engines[key]?.session && engines[key].state === 'active');
  $('send').disabled = busy || !entered || !$('allow-draft').checked; $('cancel').hidden = !busy; $('input').disabled = busy;
  $('question-preset').disabled = busy;
  for (const e of document.querySelectorAll('aside input, aside textarea, aside select, aside button, #reset')) e.disabled = busy;
  // 종료·전투·저장 로드는 대기 중에도 요청을 중단할 수 있다.
  $('recontact').disabled = false;
  $('danger').disabled = false; $('save-test').disabled = false; $('load-test').disabled = !saves.has($('save-slot').value);
  $('enter-ai').disabled = busy || entered || inCombat || !$('allow-draft').checked;
  $('entry-hint').textContent = keys.some(key => bundle.cards.find(c => c.character_key === key).npc_type === 'crowd')
    ? '군중 기본 반응 “무슨 일이야?” → 선택지 진입 (모의 · API 호출 없음)'
    : '원작 대화 제어 반환 → 선택지 진입 (모의 · API 호출 없음)';
  $('custom-outfit').hidden = $('outfit').value !== 'custom';
  const outfit = resolveOutfit(settings(keys[0]));
  $('scenario-summary').textContent = `${outfit?.display_name ?? '복장 미설정'} · ${$('outfit-visible').checked && outfit ? '관찰 가능' : '관찰 불명'} · 전체 ${Object.values(engines).reduce((n, e) => n + e.journal.length, 0)}개 시험 사건`;
  $('request-count').textContent = keys.length === 2 ? '같은 메시지를 2명에게 전송' : 'Enter로 전송 · Shift+Enter로 줄바꿈';
  $('send').textContent = keys.length === 2 ? '두 인물에게 보내기' : '보내기';
  $('comparison-results').classList.toggle('single-target', keys.length === 1);
  $('provider-help').textContent = $('mode').value === 'mock' ? 'API 호출 없음 · 고정 모의 응답' : $('mode').value === 'openai'
    ? `전송당 ${keys.length}건의 API 호출` : 'Codex 계정 사용량 적용';
  renderCharacterProfiles($('character-profile'), keys.map(key => ({ ...buildCharacterProfile(bundle, key, settings(key), engines[key]?.lastSelection?.selected_fact_ids),
    instanceTraits: engines[key]?.instances.get(key)?.persona.traits })));
  $('comparison-results').replaceChildren();
  for (const [index, key] of selectedTargets.entries()) {
    const pane = element('section', null, 'comparison-pane');
    const heading = element('div', null, 'response-heading'), picker = element('select');
    picker.id = `response-npc-${index}`;
    picker.setAttribute('aria-label', index === 0 ? '첫 번째 답변 인물' : '두 번째 답변 인물');
    if (index === 1) { const empty = element('option', '비교 안 함'); empty.value = ''; picker.append(empty); }
    for (const candidate of bundle.cards) {
      const option = element('option', candidate.display_name); option.value = candidate.character_key;
      option.disabled = selectedTargets.some((selected, other) => other !== index && selected === candidate.character_key);
      picker.append(option);
    }
    picker.value = key; picker.disabled = busy;
    picker.onchange = () => changeTarget(index, picker.value);
    heading.append(picker); pane.append(heading);
    $('comparison-results').append(pane);
    if (!key) continue;
    const card = bundle.cards.find(c => c.character_key === key), engine = engines[key], result = results[key];
    const turns = engine?.session?.turns ?? engine?.closedTurns ?? [], transcript = element('div', null, 'comparison-transcript');
    if (!turns.length) transcript.append(element('p', '대화를 기다리고 있어요.', 'hint'));
    for (const t of turns) { const message = element('div', null, `message ${t.role}`); message.append(element('span', t.role === 'player' ? bootstrap.playerIdentity.display_name : `${card.display_name} · 대사 자막`, 'who'), element('p', t.text)); transcript.append(message); }
    pane.append(transcript);
    if (engine) pane.append(element('p', `${engine.session ? 'AI 대화 중' : '진입 대기'} · ${engine.journal.length}개 기억 사건 · ${engine.npcType === 'crowd' ? '동일 군중 인스턴스 · 10분' : '원작 관계 고정 · 모의 저장 대상'}`, 'hint'));
    if (engine?.lastActionSelection && engine.lastReply?.action) {
      const meaning = GESTURE_CANDIDATES.find(g => g.ref === engine.lastActionSelection.args.gesture_ref)?.meaning;
      pane.append(element('p', `행동 선택: ${meaning ?? engine.lastActionSelection.action_id} · 실행 안 함`, 'action-selection'));
    } else if (engine?.lastReply?.action) pane.append(element('p', `기본 제어: ${engine.lastReply.action.action_id} · 가상 실행`, 'hint'));
    if (result) {
      const metrics = element('p', null, 'hint request-metrics'); metrics.dataset.key = key; pane.append(metrics);
      if (result.error) pane.append(element('p', result.error, 'hint'));
    }
    const debug = element('details', null, 'request-details'); debug.append(element('summary', '요청 상세'));
    if (engine?.lastSelection) {
      const d = engine.lastSelection; debug.append(element('h4', '이번 턴에 주입한 지식'));
      debug.append(element('p', `화제별 지식 한도: ${d.knowledge_boundaries.map(b => `${domainLabel(b.domain_id)} · ${DEPTH_LABELS[b.depth]}`).join(', ') || '관련 분야 미선택'}`, 'hint'));
      if (!d.knowledge.length) debug.append(element('p', '관련 지식 미주입', 'hint'));
      for (const k of d.knowledge) debug.append(element('p', `${k.fact_id} · ${k.statement ?? k.response_constraint}`));
      debug.append(element('p', `예시: ${d.selected_example_ids.join(', ') || '없음'}`, 'hint'), details('선별 조건·후보 확인', d));
    }
    if (engine?.lastPrompt) debug.append(details('실제 전송 프롬프트', engine.lastPrompt));
    if (engine) debug.append(details('목격·대화 기억 사건 (시험용 원문)', engine.journal));
    if (engine?.lastRawReply) debug.append(details('원시 모델 응답', engine.lastRawReply));
    if (engine?.lastReply) debug.append(details('검사·표시한 응답', engine.lastReply));
    if (result?.status === 'completed') {
      const review = element('select');
      for (const text of ['미검수', '작성 방향에 적합', '판단 문제', '말투 문제', '지식·관계 문제', '근거 부족']) review.append(element('option', text));
      review.setAttribute('aria-label', `${card.display_name} 수동 검수`); review.value = result.review ?? '미검수'; review.onchange = () => { result.review = review.value; };
      const note = element('textarea'); note.rows = 2; note.placeholder = '문제가 되는 발화와 이유'; note.setAttribute('aria-label', `${card.display_name} 검수 의견`); note.value = result.note ?? ''; note.oninput = () => { result.note = note.value; };
      debug.append(element('p', '수동 검수 (원작 합격 판정 아님)', 'hint'), review, note);
    }
    if (engine?.lastSelection || result) pane.append(debug);
  }
  updateRequestDisplay();
}
function reset() {
  requestRun = null;
  sequence++; for (const engine of Object.values(engines)) engine.end(false, '비교 설정 변경');
  engines = {}; saves.clear(); inCombat = false; $('save-hint').textContent = '페이지 메모리에만 저장 · 새로고침 시 삭제'; results = {}; busy = false; $('status').textContent = '시험 대화·기억·저장을 초기화했습니다.'; $('error').hidden = true; render();
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
for (const id of ['allow-draft', 'configuration', 'relationship', 'alive', 'free', 'basic-knowledge', 'relic-known', 'relic-disclosed']) $(id).onchange = () => changeScenario(true);
for (const id of ['outfit', 'outfit-name', 'outfit-description', 'outfit-visible', 'public-recognition', 'minor-fiction', 'select-actions']) $(id).onchange = () => changeScenario();
$('enter-ai').onclick = () => {
  try {
    // 전체 인물 조건을 먼저 검증한 뒤 제어 반환을 모의한다. 여기서는 모델을 호출하지 않는다.
    for (const key of keys) if (!engines[key]) engines[key] = new ScenarioEngine({ bundle, npcKey: key, settings: () => settings(key), base: bootstrap.base, notify: render });
    for (const key of keys) {
      const engine = engines[key];
      if (!engine.session) engine.assertCanEnter();
    }
    for (const key of keys) if (!engines[key].session) engines[key].start(key);
    $('error').hidden = true; $('status').textContent = 'AI 대화로 진입했습니다. 질문을 입력하세요.'; render();
  } catch (err) { $('error').textContent = err.message; $('error').hidden = false; render(); }
};
$('danger').onclick = () => {
  inCombat = true;
  if (requestRun) requestRun.cancelling = true;
  for (const engine of Object.values(engines)) engine.changeWorld({ combat: true });
  $('status').textContent = '전투 발생 · 요청과 자막 출력 중단 · 모의 제어 해제'; render();
};
$('safe-world').onclick = () => { inCombat = false; for (const engine of Object.values(engines)) engine.changeWorld({ combat: false }); $('status').textContent = '안전 상태로 복귀했습니다. 선택지로 다시 진입하세요.'; render(); };
const savedFields = ['allow-draft', 'configuration', 'relationship', 'alive', 'free', 'basic-knowledge', 'relic-known', 'relic-disclosed', 'outfit', 'outfit-name', 'outfit-description', 'outfit-visible', 'public-recognition', 'minor-fiction', 'select-actions'];
function scenarioSnapshot() { return { inCombat, phases: structuredClone(phases), fields: Object.fromEntries(savedFields.map(id => [id, $(id).type === 'checkbox' ? $(id).checked : $(id).value])) }; }
$('save-slot').onchange = render;
$('save-test').onclick = () => {
  saves.set($('save-slot').value, captureTestSave(engines, scenarioSnapshot()));
  $('save-hint').textContent = `슬롯 ${$('save-slot').value.toUpperCase()}에 현재 상황과 완료된 고유 인물 사건을 저장했습니다.`; render();
};
$('load-test').onclick = () => {
  const saved = saves.get($('save-slot').value); if (!saved) return;
  sequence++; busy = false; requestRun = null; results = {};
  inCombat = saved.scenario.inCombat;
  for (const engine of Object.values(engines)) engine.restore(saved.journals[engine.npcKey], saved.worlds[engine.npcKey] ?? { ...engine.world, combat: inCombat });
  for (const [id, value] of Object.entries(saved.scenario.fields)) { if ($(id).type === 'checkbox') $(id).checked = value; else $(id).value = value; }
  Object.assign(phases, saved.scenario.phases); selectTargets();
  for (const engine of Object.values(engines)) engine.changeWorld({ quest_controlled: !$('free').checked || !$('alive').checked });
  $('save-hint').textContent = `슬롯 ${$('save-slot').value.toUpperCase()} 복원 · 이후 기억 폐기 · 군중 인스턴스 새로 생성`;
  $('status').textContent = '모의 저장을 로드했습니다. 선택지로 다시 진입하세요.'; $('error').hidden = true; render();
};
function showModels() {
  const options = $('mode').value === 'codex' ? [['', 'Codex 기본 모델'], ...codexModels.map(m => [m.id, m.label])] : apiModels;
  $('model').replaceChildren(); for (const [value, label] of options) { const option = element('option', label); option.value = value; $('model').append(option); }
  $('custom-settings').hidden = true;
}
$('mode').onchange = () => {
  modelRevision++; changeScenario(true); const mode = $('mode').value;
  $('provider-settings').hidden = mode === 'mock'; $('key-settings').hidden = mode !== 'openai'; $('codex-settings').hidden = mode !== 'codex';
  showModels();
};
$('model').onchange = () => { changeScenario(true); $('custom-settings').hidden = $('model').value !== '__custom'; };
$('custom-model').onchange = () => changeScenario(true);
$('forget-key').onclick = () => { $('api-key').value = ''; };
if (bootstrap.hasEnvironmentKey) $('key-help').textContent = '실행 환경 키가 있습니다. 입력하지 않으면 환경 키를 사용합니다. 키 값은 표시하지 않습니다.';
$('refresh-models').onclick = async () => {
  const revision = ++modelRevision; $('codex-status').textContent = '조회 중…';
  try {
    const res = await fetch('/api/codex-models', { headers: { 'X-ANPC-Token': bootstrap.token } }), data = await res.json();
    if (revision !== modelRevision || $('mode').value !== 'codex' || busy) return;
    if (!res.ok) throw new Error(data.error);
    codexModels = data.models; changeScenario(true); showModels(); $('codex-status').textContent = `모델 ${codexModels.length}개 · 연결 유지`;
  } catch { if (revision === modelRevision) $('codex-status').textContent = '모델 조회 실패. CLI 로그인과 사용 한도를 확인하세요.'; }
};
async function provider(args, mode, model) {
  if (mode === 'mock') return researchMock(args);
  const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-ANPC-Token': bootstrap.token },
    body: JSON.stringify({ prompt: args.prompt, mode, model, ...(mode === 'openai' ? { apiKey: $('api-key').value } : {}) }), signal: args.signal });
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
}
$('compare-form').onsubmit = async event => {
  event.preventDefault(); if (busy) return; $('error').hidden = true;
  const input = $('input').value.trim(), mode = $('mode').value, model = $('model').value === '__custom' ? $('custom-model').value.trim() : $('model').value;
  try {
    if (!input || [...input].length > 1000) throw new Error('질문을 1~1000자로 입력하세요.');
    if (mode === 'openai' && !$('api-key').value && !bootstrap.hasEnvironmentKey) throw new Error('개인 API 키를 입력하세요.');
    if (mode === 'openai' && !model) throw new Error('모델 ID를 입력하세요.');
    if (!keys.every(key => engines[key]?.session)) throw new Error('“더 깊은 대화를 해볼까?” 선택지로 먼저 진입하세요.');
    const started = performance.now(); requestRun = { started_ms: started, ended_ms: null, cancelling: false };
    results = Object.fromEntries(keys.map(key => [key, { status: 'pending', started_ms: started, mode, model, input }]));
    busy = true; const revision = ++sequence; render();
    await Promise.allSettled(keys.map(async key => {
      const engine = engines[key];
      try {
        const result = await engine.send(input, args => provider(args, mode, model));
        if (revision !== sequence) return;
        results[key] = { ...results[key], status: result.stale ? 'cancelled' : 'completed', elapsed_ms: Math.round(performance.now() - started),
          ...(result.stale ? { error: '늦은 응답 폐기' } : { usage: engine.lastReply?.usage }) };
      } catch (err) { if (revision === sequence) results[key] = { ...results[key], status: err.name === 'AbortError' ? 'cancelled' : 'failed', elapsed_ms: Math.round(performance.now() - started), error: `${err.message} · 응답 미표시` }; }
      if (revision === sequence) render();
    }));
    if (revision === sequence) { busy = false; requestRun.ended_ms = performance.now(); render(); }
  } catch (err) { busy = false; $('error').textContent = err.message; $('error').hidden = false; render(); }
};
$('cancel').onclick = () => { if (requestRun) requestRun.cancelling = true; for (const result of Object.values(results)) if (result.status === 'pending') result.cancelling = true; for (const engine of Object.values(engines)) engine.cancel(); updateRequestDisplay(); };
$('recontact').onclick = () => { if (busy && requestRun) requestRun.cancelling = true; else requestRun = null; for (const engine of Object.values(engines)) engine.end(); $('status').textContent = '대화 종료. 선택지로 다시 진입하면 기억을 연결합니다.'; render(); };
$('reset').onclick = reset;
$('input').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('compare-form').requestSubmit(); } };
showModels(); render();
setInterval(() => { for (const engine of Object.values(engines)) engine.tick(); }, 1000);
setInterval(() => { if (busy) updateRequestDisplay(); }, 250);
document.addEventListener('pointerdown', () => { for (const engine of Object.values(engines)) engine.touch(); });
document.addEventListener('keydown', () => { for (const engine of Object.values(engines)) engine.touch(); });
