import { createHash } from 'node:crypto';

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const names = { judy: '주디 알바레스', panam: '팬앰 팔머' };

// 모든 자료와 동작을 파일 안에 담는다. 결과 저장/복사는 사용자가 버튼을 누를 때만 실행한다.
export function reviewHtml(items) {
  const sourceHash = createHash('sha256').update(JSON.stringify(items)).digest('hex');
  const data = JSON.stringify({ sourceHash, items }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const cards = items.map((item, index) => `<article class="card" data-id="${escape(item.knowledge_id)}" data-npc="${escape(item.npc_key)}">
    <div class="card-top"><span class="person ${escape(item.npc_key)}">${escape(names[item.npc_key] ?? item.npc_key)}</span><span class="item-number">${String(index + 1).padStart(2, '0')}</span><span class="badge" data-badge>미검수</span></div>
    <div class="comparison"><div class="fact"><h3>현재 자료에 있는 사실</h3><p>${escape(item.fact)}</p></div><div class="proposal"><h3>검수할 관점 문장</h3><p>${escape(item.proposal.perspective)}</p></div></div>
    <fieldset class="decision"><legend>이 문장을 어떻게 할까요?</legend>
      <label><input type="radio" name="decision-${index}" value="accept"><span>그대로 사용</span></label>
      <label><input type="radio" name="decision-${index}" value="revise"><span>수정해서 사용</span></label>
      <label><input type="radio" name="decision-${index}" value="hold"><span>보류</span></label>
      <button class="clear" type="button" data-clear>선택 해제</button>
    </fieldset>
    <div class="edit" hidden><label for="edit-${index}">수정할 문장</label><textarea id="edit-${index}" data-edit rows="3">${escape(item.proposal.perspective)}</textarea><span class="length" data-length>60자 이내</span></div>
    <fieldset class="checks"><legend>확인한 내용 <span>(선택)</span></legend>
      <label><input type="checkbox" data-check="fact_confirmed">사실관계가 맞음</label>
      <label><input type="checkbox" data-check="experience_supported">경험을 과장하지 않음</label>
      <label><input type="checkbox" data-check="voice_appropriate">인물의 말투에 어울림</label>
    </fieldset>
    <label class="comment-label" for="comment-${index}">의견 <span>(선택)</span></label><textarea id="comment-${index}" data-comment rows="2" placeholder="어색한 부분이나 보류 이유를 적어주세요."></textarea>
    <details><summary>근거와 원문 자료 보기</summary><div class="evidence">${item.evidence.map(e => `<p>${escape(e.statement)}<br><a href="${escape(/^https:\/\//.test(e.source.url) ? e.source.url : '#')}" target="_blank" rel="noopener noreferrer">출처 열기 ↗</a></p>`).join('')}<code>${escape(item.knowledge_id)}</code></div></details>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>ANPC · 로어북 관점 검수</title>
<style>
:root{color-scheme:light;--ink:#172d38;--muted:#60717a;--line:#dce4e5;--paper:#f4f5f1;--accent:#b85f28;--green:#18785d;--blue:#315d88;--amber:#936b13}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI","Malgun Gothic",sans-serif;font-size:15px;line-height:1.65}button,input,textarea{font:inherit}button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #db913b;outline-offset:3px}button:disabled{opacity:.6;cursor:wait}[hidden]{display:none!important}.wrap{max-width:1180px;margin:0 auto;padding:0 32px}.masthead{background:#142d38;color:#fff;border-bottom:4px solid #dc9e58}.brand{padding:18px 0;font-size:12px;letter-spacing:.13em;color:#c6d4d8}.brand strong{font-size:16px;letter-spacing:.18em;color:#fff;margin-right:14px}.hero{padding:32px 0 29px}.eyebrow{margin:0 0 9px;color:var(--accent);font-size:12px;letter-spacing:.12em;font-weight:750}h1{margin:0;font-size:31px;letter-spacing:-.05em;line-height:1.35}.intro{max-width:800px;margin:13px 0 0;color:var(--muted)}.intro strong{color:var(--ink);font-weight:600}.layout{display:grid;grid-template-columns:238px minmax(0,1fr);gap:26px;align-items:start;padding-bottom:50px}.side{position:sticky;top:20px}.panel{background:#fff;border:1px solid var(--line);border-radius:13px;padding:21px}.progress-title{display:flex;align-items:baseline;justify-content:space-between;font-weight:650}.progress-title strong{font-size:26px}.progress-title small{color:var(--muted);font-size:15px;font-weight:450}progress{width:100%;height:7px;border:0;border-radius:9px;background:#e8ecec;accent-color:var(--green);margin:13px 0}progress::-webkit-progress-bar{background:#e8ecec;border-radius:9px}progress::-webkit-progress-value{background:var(--green);border-radius:9px}.stats{display:flex;justify-content:space-between;gap:7px;font-size:12px;color:var(--muted)}.stats b{display:block;color:var(--ink);font-size:19px}.side h2{font-size:13px;margin:20px 0 9px}.filter{display:flex;background:#edf1f0;border-radius:8px;padding:3px;gap:2px}.filter button{border:0;border-radius:6px;background:transparent;padding:7px 10px;flex:1;white-space:nowrap;font-size:13px;color:var(--muted)}.filter button[aria-pressed=true]{background:#fff;color:var(--ink);box-shadow:0 1px 4px #10253118;font-weight:700}.remaining{display:flex;gap:7px;align-items:center;margin-top:13px;font-size:13px}.remaining input{accent-color:var(--green)}.note{display:block;margin-top:21px;font-size:13px;font-weight:600}.panel textarea{font-size:13px;margin-top:7px}.actions{display:grid;gap:8px;margin-top:16px}.button{display:inline-flex;justify-content:center;align-items:center;border:1px solid #cad4d6;border-radius:8px;background:#fff;color:var(--ink);padding:10px 12px;font-size:14px;font-weight:650}.primary{background:var(--ink);color:#fff;border-color:var(--ink)}.button:hover{filter:brightness(.97)}.import{margin-top:12px;display:block;width:100%;border:0;background:transparent;text-decoration:underline;color:var(--muted);font-size:12px;padding:4px}.send-help{font-size:12px;color:var(--muted);margin:13px 0 0;line-height:1.65}.save{font-size:11px;line-height:1.5;color:var(--muted);margin:11px 0 0}.status{font-size:13px;min-height:24px;margin:10px 0 0;color:var(--green)}.status.error{color:#b44335}.cards{display:grid;gap:18px}.card{background:#fff;border:1px solid var(--line);border-radius:13px;overflow:hidden;box-shadow:0 2px 7px #19333e04;padding:22px 24px}.card-top{display:flex;align-items:center;gap:10px}.person{display:inline-block;font-size:12px;letter-spacing:.01em;font-weight:700;padding:4px 11px;border-radius:5px;background:#ecf0fa;color:#46587b}.person.panam{background:#f5ebdc;color:#795531}.item-number{color:#a0aeb2;font-size:12px}.badge{margin-left:auto;font-size:11px;color:var(--muted);background:#f1f3f3;border-radius:20px;padding:3px 10px}.badge.accept{background:#e7f4ed;color:var(--green)}.badge.revise{background:#e9f0f9;color:var(--blue)}.badge.hold{background:#faf0d6;color:var(--amber)}.comparison{display:grid;grid-template-columns:1fr 1.15fr;gap:22px;margin:20px 0 24px}.comparison h3{font-size:11px;color:var(--muted);font-weight:600;margin:0 0 8px}.comparison p{margin:0;word-break:keep-all;overflow-wrap:anywhere}.fact{font-size:14px}.proposal{border-left:3px solid #d9a06a;padding-left:17px}.proposal p{font-size:17px;line-height:1.7;font-weight:580;letter-spacing:-.02em}.decision,.checks{border:0;padding:0;margin:0}.decision legend{font-weight:600;font-size:13px;margin-bottom:9px}.decision{display:flex;flex-wrap:wrap;gap:7px}.decision label{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:7px;padding:7px 11px;font-size:13px;cursor:pointer}.decision input{margin:0;accent-color:var(--ink)}.decision label:has(input:checked){background:#eaf1ef;border-color:#72998b;color:#19513f}.decision label:has(input[value=revise]:checked){background:#edf2fa;border-color:#7c9cb9;color:var(--blue)}.decision label:has(input[value=hold]:checked){background:#fbf3df;border-color:#c6aa66;color:var(--amber)}.clear{border:0;background:none;color:var(--muted);font-size:11px;padding:6px;margin-left:auto}.edit{margin-top:15px}.edit label{font-size:12px;font-weight:650;display:block}.length{display:block;font-size:11px;color:var(--muted);text-align:right}.length.invalid{color:#b44335}.checks{display:flex;gap:7px 15px;flex-wrap:wrap;margin-top:19px;padding-top:15px;border-top:1px solid #eef1f1}.checks legend{float:left;width:100%;font-size:12px;margin-bottom:7px;font-weight:600}.checks legend span,.comment-label span{font-weight:400;color:var(--muted);font-size:11px}.checks label{font-size:12px;display:flex;gap:5px;align-items:center;cursor:pointer}.checks input{accent-color:var(--green);margin:0}.comment-label{font-size:12px;display:block;margin-top:16px;font-weight:600}textarea{display:block;width:100%;border:1px solid #d7dfe0;background:#fbfcfc;border-radius:7px;padding:10px 11px;resize:vertical;color:var(--ink);line-height:1.6;font-size:14px}textarea::placeholder{color:#9aa7aa}textarea:focus{border-color:#668d83;outline:none;box-shadow:0 0 0 3px #18785d0c}details{margin-top:14px}summary{cursor:pointer;font-size:11px;color:var(--muted);width:fit-content}.evidence{font-size:12px;color:var(--muted);border-left:2px solid #e4e9e8;margin-top:9px;padding-left:13px}.evidence p{margin:8px 0}.evidence a{color:var(--blue);font-size:11px}.evidence code{font-size:10px;overflow-wrap:anywhere}.empty{padding:40px;text-align:center;border:1px dashed #b6c5c5;border-radius:12px;color:var(--muted)}dialog{width:min(680px,calc(100% - 32px));border:1px solid var(--line);border-radius:12px;padding:24px;box-shadow:0 20px 80px #142d3833}dialog::backdrop{background:#142d3866}dialog h2{font-size:19px;margin:0 0 8px}dialog p{font-size:13px;color:var(--muted)}dialog textarea{font-family:ui-monospace,monospace;font-size:12px;max-height:50vh}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}.footer{font-size:12px;color:var(--muted);padding-top:5px}.error-outline{outline:2px solid #b44335;outline-offset:3px}@media(max-width:800px){.wrap{padding:0 18px}.hero{padding:24px 0}h1{font-size:26px}.layout{grid-template-columns:1fr;gap:17px}.side{position:static}.panel{padding:18px}.panel .filter{max-width:260px}.stats{justify-content:flex-start;gap:22px}.actions{grid-template-columns:1fr 1fr}.import{width:auto;display:inline-block}.note{margin-top:13px}.comparison{gap:16px}.card{padding:19px}.send-help{margin-top:8px}}@media(max-width:500px){.comparison{grid-template-columns:1fr;gap:16px}.proposal{padding-left:14px}.decision{gap:6px}.decision label{padding:7px 9px}.clear{margin-left:0}.checks{gap:9px}.checks label{width:100%}.card{padding:18px}.brand{padding:14px 0}.proposal p{font-size:16px}.actions{grid-template-columns:1fr 1fr}}
</style></head><body>
<header class="masthead"><div class="wrap brand"><strong>ANPC</strong>CONTENT REVIEW / 로어북</div></header>
<div class="wrap"><section class="hero"><p class="eyebrow">PILOT REVIEW · 6 ITEMS</p><h1>이 관점이 NPC에게 어울리나요?</h1><p class="intro">현재 사실을 보고, <strong>인물이 자기 관점으로 말하는 문장</strong>을 검수해주세요. 실제 대사를 고정하는 작업은 아닙니다. 근거가 불확실하면 보류해도 됩니다.</p></section>
<main class="layout"><aside class="side"><div class="panel"><div class="progress-title"><span>검수 진행</span><strong><span id="done">0</span><small> / ${items.length}</small></strong></div><progress id="progress" max="${items.length}" value="0" aria-label="검수 진행률"></progress><div class="stats"><span><b id="accepted">0</b>그대로 사용</span><span><b id="revised">0</b>수정</span><span><b id="held">0</b>보류</span></div>
<h2>인물 보기</h2><div class="filter" aria-label="인물 필터"><button type="button" data-filter="all" aria-pressed="true">전체</button><button type="button" data-filter="judy" aria-pressed="false">주디</button><button type="button" data-filter="panam" aria-pressed="false">팬앰</button></div><label class="remaining"><input type="checkbox" id="remaining">미검수만 보기</label>
<label class="note" for="overall-note">전체 의견 <span style="font-weight:400;color:var(--muted)">(선택)</span></label><textarea id="overall-note" rows="3" placeholder="이번 검수에서 함께 전달할 의견"></textarea>
<div class="actions"><button type="button" class="button primary" id="download">결과 JSON 받기</button><button type="button" class="button" id="copy">결과 복사</button></div><button type="button" class="import" id="import">이전 결과 불러오기</button><input type="file" id="import-file" accept=".json,application/json" hidden>
<p class="send-help">결과 파일을 이 대화에 첨부하거나, 복사한 내용을 붙여넣어 주세요. 미검수 항목이 있어도 저장할 수 있습니다.</p><p class="save" id="save-status">작성 내용은 이 브라우저에 임시 저장됩니다.</p><p class="status" id="status" role="status" aria-live="polite"></p></div></aside>
<section class="cards" aria-label="관점 문장 검수">${cards}<p class="empty" id="empty" hidden>이 조건에 해당하는 항목이 없습니다.</p><p class="footer">이번 검수는 관점 문장만 대상입니다. 저장한 결과를 보내주시면 다음 작업에서 확인해 반영합니다.</p></section></main></div>
<dialog id="copy-dialog"><h2>검수 결과 텍스트</h2><p>아래 내용을 복사해서 이 대화에 붙여넣을 수 있습니다.</p><textarea id="result-text" rows="15" readonly aria-label="복사할 검수 결과"></textarea><div class="dialog-actions"><button class="button" type="button" id="select-text">전체 선택</button><button class="button primary" type="button" id="close-dialog">닫기</button></div></dialog>
<script id="review-data" type="application/json">${data}</script><script>(${reviewClient.toString()})();</script></body></html>`;
}

function reviewClient() {
  const data = JSON.parse(document.getElementById('review-data').textContent);
  const labels = { pending: '미검수', accept: '그대로 사용', revise: '수정', hold: '보류' };
  const decisions = Object.keys(labels);
  const checkKeys = ['fact_confirmed', 'experience_supported', 'voice_appropriate'];
  const cards = [...document.querySelectorAll('.card')];
  const sourceHash = data.sourceHash;
  const storageKey = 'anpc-lore-review:' + sourceHash;
  const state = { overall_note: '', items: data.items.map(item => ({ knowledge_id: item.knowledge_id, decision: 'pending',
    edited_perspective: item.proposal.perspective, comment: '', checks: Object.fromEntries(checkKeys.map(key => [key, false])) })) };
  let filter = 'all';
  const el = id => document.getElementById(id);
  function notify(message, error = false) {
    el('status').textContent = message;
    el('status').classList.toggle('error', error);
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(result())); el('save-status').textContent = '이 브라우저에 임시 저장됨'; }
    catch { el('save-status').textContent = '브라우저 임시 저장을 사용할 수 없습니다. 결과 파일로 저장해주세요.'; }
  }
  function result() {
    return { schema_version: 'anpc-lore-review-result-1.0', scope: 'perspective_only', source_sha256: sourceHash,
      exported_at: new Date().toISOString(), completed_count: state.items.filter(item => item.decision !== 'pending').length,
      overall_note: state.overall_note, items: state.items.map((item, index) => ({ ...item,
        npc_key: data.items[index].npc_key, original_perspective: data.items[index].proposal.perspective,
        final_perspective: item.decision === 'accept' ? data.items[index].proposal.perspective
          : item.decision === 'revise' ? item.edited_perspective.trim() : null })) };
  }
  function render() {
    const counts = { accept: 0, revise: 0, hold: 0, pending: 0 };
    let shown = 0;
    cards.forEach((card, index) => {
      const item = state.items[index]; counts[item.decision]++;
      card.hidden = (filter !== 'all' && card.dataset.npc !== filter) || (el('remaining').checked && item.decision !== 'pending');
      if (!card.hidden) shown++;
      const badge = card.querySelector('[data-badge]'); badge.textContent = labels[item.decision]; badge.className = 'badge ' + item.decision;
      card.querySelector('.edit').hidden = item.decision !== 'revise';
      card.querySelectorAll('input[type=radio]').forEach(input => { input.checked = input.value === item.decision; });
      card.querySelectorAll('[data-check]').forEach(input => { input.checked = item.checks[input.dataset.check]; });
      const edit = card.querySelector('[data-edit]'); if (edit.value !== item.edited_perspective) edit.value = item.edited_perspective;
      const comment = card.querySelector('[data-comment]'); if (comment.value !== item.comment) comment.value = item.comment;
      const length = [...item.edited_perspective.trim()].length;
      const counter = card.querySelector('[data-length]'); counter.textContent = length + ' / 60자'; counter.classList.toggle('invalid', length > 60);
    });
    el('done').textContent = state.items.length - counts.pending;
    el('progress').value = state.items.length - counts.pending;
    el('accepted').textContent = counts.accept; el('revised').textContent = counts.revise; el('held').textContent = counts.hold;
    el('empty').hidden = shown !== 0;
    if (el('overall-note').value !== state.overall_note) el('overall-note').value = state.overall_note;
  }
  function valid() {
    for (let i = 0; i < state.items.length; i++) {
      const item = state.items[i];
      if (item.decision === 'revise' && (!item.edited_perspective.trim() || [...item.edited_perspective.trim()].length > 60)) {
        filter = 'all'; el('remaining').checked = false;
        document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
        render(); cards[i].scrollIntoView({ block: 'center', behavior: 'smooth' }); cards[i].querySelector('[data-edit]').focus();
        notify('수정할 문장을 1~60자로 적어주세요.', true); return false;
      }
    }
    return true;
  }
  function parseImported(input, allowDraft = false) {
    if (input.schema_version !== 'anpc-lore-review-result-1.0' || input.scope !== 'perspective_only' || input.source_sha256 !== sourceHash) throw new Error('현재 검수표의 결과 파일이 아닙니다.');
    if (!Array.isArray(input.items) || input.items.length !== data.items.length || typeof input.overall_note !== 'string') throw new Error('결과 형식을 확인해주세요.');
    const rows = new Map();
    for (const item of input.items) {
      if (rows.has(item.knowledge_id)) throw new Error('중복된 검수 항목이 있습니다.');
      rows.set(item.knowledge_id, item);
    }
    const imported = data.items.map(original => {
      const item = rows.get(original.knowledge_id);
      if (!item || !decisions.includes(item.decision) || item.npc_key !== original.npc_key || item.original_perspective !== original.proposal.perspective
        || typeof item.edited_perspective !== 'string' || typeof item.comment !== 'string'
        || !item.checks || checkKeys.some(key => typeof item.checks[key] !== 'boolean')) throw new Error('검수 항목 형식을 확인해주세요.');
      if (!allowDraft && item.decision === 'revise' && (!item.edited_perspective.trim() || [...item.edited_perspective.trim()].length > 60)) throw new Error('수정 문장은 1~60자여야 합니다.');
      return { knowledge_id: original.knowledge_id, decision: item.decision, edited_perspective: item.edited_perspective,
        comment: item.comment, checks: Object.fromEntries(checkKeys.map(key => [key, item.checks[key]])) };
    });
    return { items: imported, overall_note: input.overall_note };
  }
  cards.forEach((card, index) => {
    card.addEventListener('change', event => {
      const item = state.items[index];
      if (event.target.matches('input[type=radio]')) item.decision = event.target.value;
      if (event.target.matches('[data-check]')) item.checks[event.target.dataset.check] = event.target.checked;
      render(); save();
    });
    card.addEventListener('input', event => {
      if (!event.target.matches('[data-edit], [data-comment]')) return;
      if (event.target.matches('[data-edit]')) state.items[index].edited_perspective = event.target.value;
      if (event.target.matches('[data-comment]')) state.items[index].comment = event.target.value;
      render(); save();
    });
    card.querySelector('[data-clear]').addEventListener('click', () => { state.items[index].decision = 'pending'; render(); save(); });
  });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    render();
  }));
  el('remaining').addEventListener('change', render);
  el('overall-note').addEventListener('input', () => { state.overall_note = el('overall-note').value; save(); });
  el('download').addEventListener('click', () => {
    if (!valid()) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result(), null, 2)], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'ANPC-로어북-검수결과.json'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notify('결과 파일을 저장했습니다. 이 대화에 첨부해주세요.');
  });
  el('copy').addEventListener('click', async () => {
    if (!valid()) return;
    const text = JSON.stringify(result(), null, 2);
    try { await navigator.clipboard.writeText(text); notify('결과를 복사했습니다. 이 대화에 붙여넣어 주세요.'); }
    catch { el('result-text').value = text; el('copy-dialog').showModal(); el('result-text').focus(); el('result-text').select(); }
  });
  el('select-text').addEventListener('click', () => { el('result-text').focus(); el('result-text').select(); });
  el('close-dialog').addEventListener('click', () => el('copy-dialog').close());
  el('import').addEventListener('click', () => el('import-file').click());
  el('import-file').addEventListener('change', async () => {
    const file = el('import-file').files[0]; if (!file) return;
    try {
      const imported = parseImported(JSON.parse(await file.text()));
      state.items = imported.items; state.overall_note = imported.overall_note; render(); save(); notify('이전 검수 결과를 불러왔습니다.');
    } catch (error) { notify(error instanceof SyntaxError ? 'JSON 결과 파일을 선택해주세요.' : error.message, true); }
    finally { el('import-file').value = ''; }
  });
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) { const imported = parseImported(JSON.parse(saved), true); state.items = imported.items; state.overall_note = imported.overall_note; el('save-status').textContent = '이전에 작성한 내용을 복원했습니다.'; }
  } catch { el('save-status').textContent = '이전 임시 저장을 읽을 수 없습니다. 저장한 결과 파일을 불러올 수 있습니다.'; }
  render();
}
