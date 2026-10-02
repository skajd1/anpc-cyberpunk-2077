import { DialogueEngine, mockGenerate } from './core.js';
const $ = id => document.getElementById(id);
const bootstrap = await fetch('/api/bootstrap').then(r => { if (!r.ok) throw new Error('시제품을 불러올 수 없습니다.'); return r.json(); });
const engine = new DialogueEngine({ personas: bootstrap.personas, base: bootstrap.base, playerIdentity: bootstrap.playerIdentity, notify: render });
let pendingText = ''; let apiKey = '';
let codexModels = []; let modelRefresh = 0;
const selectedModels = { codex: '', openai: 'gpt-6-luna' };
const apiModels = [ ['gpt-6-luna', 'GPT-6 Luna'], ['gpt-4o-mini', 'GPT-4o mini'], ['gpt-4.1-mini', 'GPT-4.1 mini'], ['gpt-4.1', 'GPT-4.1'] ];
function showModels() {
  const mode = $('mode').value;
  $('model').replaceChildren();
  const options = mode === 'codex' ? [['', 'Codex 기본 모델'], ...codexModels.map(m => [m.id, `${m.label}${m.isDefault ? ' · 기본' : ''}`])] : [...apiModels, ['__custom', '모델 ID 직접 입력']];
  for (const [value, label] of options) { const option = document.createElement('option'); option.value = value; option.textContent = label; $('model').append(option); }
  $('model').value = options.some(([id]) => id === selectedModels[mode]) ? selectedModels[mode] : options[0][0];
  $('custom-model-settings').hidden = mode !== 'openai' || $('model').value !== '__custom';
  $('model-help').textContent = mode === 'codex' ? '로그인된 Codex의 선택 가능 목록입니다. 기본 모델을 선택하면 CLI가 결정합니다.' : '공식 API 모델 선택지입니다. 개인 키의 접근 권한·잔액은 호출 시 확인됩니다.';
}
$('model').onchange = () => { selectedModels[$('mode').value] = $('model').value; $('custom-model-settings').hidden = $('model').value !== '__custom'; };
function selectedModel() { return $('model').value === '__custom' ? $('custom-model').value.trim() : $('model').value; }
const errors = { auth_failed: 'API 키 또는 계정의 모델 접근 권한을 확인하세요.', rate_limited: '제공자 요청 한도·잔액을 확인하세요.', timeout: '응답 제한 시간을 초과했습니다. 다시 시도할 수 있습니다.', network_error: '제공자에 연결하지 못했습니다.', provider_rejected: '모델 ID와 구조화 출력 지원을 확인하세요.', provider_refused: '제공자가 응답을 거절했습니다.', invalid_response: '응답 형식 또는 인물 금기 검사를 통과하지 못했습니다.', busy: '다른 요청이 처리 중입니다.', invalid_model: '모델 ID를 확인하세요.' };
function error(err) { $('error').textContent = errors[err.message] ?? err.message; $('error').hidden = false; }
function clearError() { $('error').hidden = true; }
Object.assign(errors, { codex_login_required: 'Codex CLI 로그인이 필요합니다. 터미널에서 codex login을 실행하세요.', codex_unavailable: 'Codex CLI를 찾지 못했습니다. 설치 경로를 확인하세요.', codex_failed: 'Codex 실행에 실패했습니다. 로그인·사용 한도·모델 접근 권한을 확인하세요.', cancelled: '요청이 취소됐습니다.' });
async function checkCodex() {
  const revision = ++modelRefresh;
  $('codex-status').textContent = '로그인 상태 확인 중…';
  try {
    const status = await fetch('/api/codex-status').then(r => r.json());
    if (revision !== modelRefresh || $('mode').value !== 'codex') return;
    $('codex-status').textContent = !status.available ? 'Codex CLI를 찾지 못했습니다.' : status.loggedIn ? '로그인됨 · 모델 목록 조회 중…' : 'Codex 로그인 필요';
    codexModels = []; showModels();
    if (!status.loggedIn) return;
    const res = await fetch('/api/codex-models', { headers: { 'X-ANPC-Token': bootstrap.token } });
    const data = await res.json();
    if (revision !== modelRefresh || $('mode').value !== 'codex') return;
    if (!res.ok) throw new Error(data.error);
    codexModels = data.models; showModels();
    $('codex-status').textContent = `Codex 로그인됨 · 모델 ${codexModels.length}개${data.connected ? ' · 연결 유지 중' : ''}`;
  }
  catch { $('codex-status').textContent = '상태를 확인하지 못했습니다.'; }
}
$('check-codex').onclick = checkCodex;
for (const p of engine.personas) { const option = document.createElement('option'); option.value = p.persona_id; option.textContent = p.display_name; $('npc').append(option); }
function showCard() { const p = engine.personas.find(p => p.persona_id === $('npc').value); $('card').value = JSON.stringify(p, null, 2); render(); }
function render() {
  const s = engine.session; const p = s?.persona ?? engine.personas.find(p => p.persona_id === $('npc').value);
  const waiting = engine.state === 'waiting';
  $('persona-summary').textContent = p.background.text;
  $('goal').textContent = p.current_goals.join(' · ');
  $('traits').textContent = [p.identity.beliefs.join(' · '), ...Object.values(s?.persona.traits ?? {})].join(' / ');
  $('chat-title').textContent = s ? p.display_name : '대화를 시작하세요';
  $('status').textContent = waiting ? '응답을 기다리는 중…' : s ? (s.memory ? '대화 중 · 직전 만남을 기억함' : '대화 중 · 첫 만남') : '대기 중';
  $('start').disabled = Boolean(s); $('end').disabled = !s; $('send').disabled = !s || waiting; $('input').disabled = !s || waiting;
  $('cancel').hidden = !waiting; $('mode').disabled = waiting; $('model').disabled = waiting; $('api-key').disabled = waiting; $('custom-model').disabled = waiting; $('check-codex').disabled = waiting;
  $('control').textContent = s ? `${s.held ? '위치 유지' : '제어 해제'}${s.gazeUntil ? ' · 플레이어 시선' : ''} (가상)` : '해제됨';
  $('memory').textContent = `${engine.memories.size}명 보관${s?.memory ? ' · 현재 인물 연결' : ''} / 실행 중 최대 10분`;
  const info = engine.lastReply;
  $('reply-info').textContent = info ? `${info.mode === 'mock' ? '모의 응답' : info.mode === 'codex' ? 'Codex 응답' : 'API 응답'} · ${info.intent} · ${info.emotion}${info.usage ? ` · 토큰 ${info.usage.input_tokens}/${info.usage.output_tokens}` : ''}` : '없음';
  $('messages').replaceChildren();
  const turns = [...(s?.turns ?? engine.closedTurns)]; if (waiting && pendingText) turns.push({ role: 'player', text: pendingText });
  if (!turns.length) { const el = document.createElement('div'); el.className = 'empty'; el.textContent = s?.memory ? '다시 만났습니다. 이전 대화를 물어보세요.' : '인물을 선택하고 대화를 시작해보세요.'; $('messages').append(el); }
  for (const turn of turns) { const el = document.createElement('div'); el.className = `message ${turn.role}`; const who = document.createElement('span'); who.className = 'who'; who.textContent = turn.role === 'player' ? bootstrap.playerIdentity.display_name : p.display_name; const line = document.createElement('p'); line.textContent = turn.text; el.append(who, line); $('messages').append(el); }
  $('messages').scrollTop = $('messages').scrollHeight;
  $('events').replaceChildren(); for (const event of engine.events.slice(-8).reverse()) { const li = document.createElement('li'); li.textContent = event.message; $('events').append(li); }
  $('prompt-view').textContent = engine.lastPrompt ? JSON.stringify(engine.lastPrompt, null, 2) : '입력 전송 후 표시됩니다. API 키는 포함되지 않습니다.';
  $('reply-view').textContent = info ? JSON.stringify(info, null, 2) : '응답 대기';
  $('distance-value').textContent = `${engine.world.distance}m`;
}
$('start').onclick = () => { clearError(); try { engine.start($('npc').value); $('input').focus(); } catch (err) { error(err); } };
$('end').onclick = () => engine.end();
$('npc').onchange = () => { engine.end(); showCard(); };
$('cancel').onclick = () => engine.cancel();
$('clear').onclick = () => engine.clearMemory();
$('respawn').onclick = () => engine.respawn($('npc').value);
$('reload').onclick = () => engine.worldReset();
$('apply-card').onclick = () => { clearError(); try { const p = JSON.parse($('card').value); if (p.persona_id !== $('npc').value) throw new Error('카드 ID는 선택 인물과 같아야 합니다.'); engine.replacePersona(p); showCard(); } catch (err) { error(err); } };
$('mode').onchange = () => {
  const mode = $('mode').value;
  $('api-settings').hidden = mode === 'mock';
  for (const id of ['api-key', 'forget-key', 'key-help']) $(id).hidden = mode !== 'openai';
  document.querySelector('label[for="api-key"]').hidden = mode !== 'openai';
  $('codex-settings').hidden = mode !== 'codex';
  showModels();
  $('mode-help').textContent = mode === 'mock' ? '모의 응답은 규칙 기반 예시입니다. AI 품질 평가 결과가 아닙니다.' : mode === 'codex' ? '인물·대화·상황을 로컬 Codex로 전달합니다. Codex 계정 사용량이 적용되며 응답을 최대 120초 기다립니다.' : '전송하면 현재 인물·대화·필터된 상황을 OpenAI로 보냅니다. API 이용 요금은 개인 계정에 적용됩니다.';
  if (mode === 'codex') checkCodex();
};
$('api-key').oninput = () => { apiKey = $('api-key').value; };
$('forget-key').onclick = () => { apiKey = ''; $('api-key').value = ''; };
if (bootstrap.hasEnvironmentKey) $('key-help').textContent = '실행 환경 키가 있습니다. 입력하지 않으면 환경 키를 사용합니다. 키 값은 표시하지 않습니다.';
for (const [element, field] of [['weapon','weapon_drawn'],['combat','combat'],['scene','quest_controlled']]) $(element).onchange = () => engine.changeWorld({ [field]: $(element).checked });
for (const [element, field] of [['equipment','equipment'],['quest','quest_stage'],['save','saveScope']]) $(element).onchange = () => engine.changeWorld({ [field]: $(element).value });
for (const [element, field] of [['level','level'],['cred','street_cred'],['distance','distance']]) $(element).oninput = () => engine.changeWorld({ [field]: Number($(element).value) });
async function generate(args) {
  if ($('mode').value === 'mock') return mockGenerate(args);
  const mode = $('mode').value;
  if (mode === 'openai' && !apiKey && !bootstrap.hasEnvironmentKey) throw new Error('개인 API 키를 입력하세요.');
  if (mode === 'openai' && !selectedModel()) throw new Error('사용할 모델 ID를 입력하세요.');
  const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-ANPC-Token': bootstrap.token }, body: JSON.stringify({ prompt: args.prompt, mode, ...(mode === 'openai' ? { apiKey } : {}), model: selectedModel() }), signal: args.signal });
  const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
}
$('chat-form').onsubmit = async event => {
  event.preventDefault(); clearError(); pendingText = $('input').value.trim();
  try { const result = await engine.send(pendingText, generate); if (!result.stale) $('input').value = ''; }
  catch (err) { if (err.name !== 'AbortError') error(err); }
  finally { pendingText = ''; render(); if (engine.session) $('input').focus(); }
};
$('input').onkeydown = event => { engine.touch(); if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('chat-form').requestSubmit(); } };
document.addEventListener('pointerdown', () => engine.touch());
setInterval(() => engine.tick(), 1000);
showCard();
