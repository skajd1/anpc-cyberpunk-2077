import { sha256 } from './prepare-lore-evaluation.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const names = { judy: '주디', panam: '팬앰' };

export function loreDialogueReport(prepared, records = []) {
  const groups = new Map();
  for (const record of records) {
    const key = record.case_id + ':' + record.repetition;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const title = prepared.review_title ?? '관점 연결 전후 대사 비교';
  const intro = prepared.review_intro ?? '같은 모델·질문·상태에서 관점 필드 유무만 바꿉니다. 후보 A/B 순서는 항목별로 섞었습니다. 원작 말투의 최종 승인이나 음성 청취 평가는 아닙니다.';
  const reviews = [];
  const cards = prepared.pairs.map((pair, index) => {
    const rounds = [...groups.entries()].filter(([, rows]) => rows[0].case_id === pair.case_id);
    const answers = rounds.map(([key, rows]) => {
      const ordered = [...rows].sort((a, b) => a.arm.localeCompare(b.arm));
      if (parseInt(sha256(key)[0], 16) % 2) ordered.reverse();
      const reviewable = ordered.length === 2 && ordered.every(r => r.status === 'completed' && r.reply && !r.validation_error && !r.speech_error);
      if (reviewable) reviews.push({ pair_id: key, case_id: pair.case_id, repetition: rows[0].repetition,
        labels: Object.fromEntries(ordered.map((r, i) => [i ? 'B' : 'A', r.arm])), choice: 'pending', comment: '' });
      return `<section><h3>${prepared.repetitions === 1 ? '대사 후보' : '반복 ' + escape(rows[0].repetition)}</h3><div class="answers">${ordered.map((r, i) => `<div class="answer"><b>후보 ${i ? 'B' : 'A'}</b><p>${escape(r.reply?.dialogue ?? r.error ?? '응답 없음')}</p>${r.reply?.follow_up ? `<p>${escape(r.reply.follow_up)}</p>` : ''}<p lang="ja">${escape(r.reply?.speech_text)}</p><small>${escape(r.validation_error ?? r.speech_error ?? r.status)}</small>${r.diagnostics ? `<p class="${r.diagnostics.ko_over_limit ? 'issue' : 'pending'}">자막 ${escape(r.diagnostics.ko_chars)}자${r.diagnostics.ko_over_limit ? ' · 45자 초과' : ''}</p>` : ''}</div>`).join('')}</div>
        ${reviewable ? `<fieldset data-pair="${escape(key)}"><legend>어느 쪽이 더 자연스럽고 인물에게 어울리나요?</legend>${[['A','후보 A'],['B','후보 B'],['tie','비슷함'],['hold','보류']].map(([v, label]) => `<label><input type="radio" name="${escape(key)}" value="${v}">${label}</label>`).join('')}<textarea rows="2" placeholder="사실 변형·새 경험·딱딱함·반복·일본어 의미 차이 등을 적어주세요." aria-label="검수 의견"></textarea></fieldset>` : '<p>유효하지 않은 응답이 있어 선호도 판정을 받지 않습니다.</p>'}</section>`;
    }).join('');
    return `<article><h2>${index + 1}. ${escape(names[pair.npc_key])} · ${escape(pair.family)}</h2>${pair.history.length ? `<div class="history"><b>앞선 대화 · 검수용 가상 상황</b>${pair.history.map(turn => `<p><span>${turn.role === 'npc' ? escape(names[pair.npc_key]) : 'V'}</span> ${escape(turn.text)}</p>`).join('')}</div>` : ''}<p class="question"><span>V</span> ${escape(pair.player_input)}</p><small>관계: ${escape(({first:'첫 만남',saul_saved:'사울 구출 후'})[pair.relationship_stage] ?? pair.relationship_stage)} · ${pair.arms[0].prompt_sha256 === pair.arms[1].prompt_sha256 ? '두 입력 동일: 관점 효과 비교 대상 아님' : escape(prepared.comparison_label ?? '관점 유무 비교')}</small>
      ${pair.preflight_errors.length ? `<p class="issue">검색 사전 진단: ${pair.preflight_errors.map(escape).join(' / ')}</p>` : ''}
      ${pair.review_focus?.length ? `<p class="pending">확인할 점: ${pair.review_focus.map(escape).join(" / ")}</p>` : ''}
      ${answers || '<p class="pending">아직 API 응답이 없습니다. 질문·선별 입력만 준비된 상태입니다.</p>'}
      <details><summary>입력으로 제공되는 사실·관점 보기</summary>${pair.reference.allowed_knowledge.map(k => `<p>${escape(k.statement ?? k.response_constraint)}${k.perspective ? '<br>관점: ' + escape(k.perspective) : ''}</p>`).join('')}</details></article>`;
  }).join('');
  const source = { schema_version: 'anpc-lore-dialogue-review-1.0', source_sha256: sha256(records),
    suite_sha256: prepared.suite_sha256, items: reviews };
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'">
    <title>${escape(title)}</title><style>body{background:#f3f5f3;color:#18323d;font:15px/1.7 system-ui,sans-serif;margin:0}main{max-width:1050px;margin:auto;padding:26px 20px}h1{margin-bottom:5px}h2{font-size:18px}h3{font-size:15px}header,article,#json-panel{background:white;padding:24px;border:1px solid #d9e2e0;border-radius:12px;margin-bottom:18px}.question{font-size:18px;font-weight:600}.history{background:#f3f5f3;border-left:3px solid #b2c6c0;padding:12px 16px;margin-top:15px}.history p{margin:4px 0}.history span,.question span{font-size:12px;color:#60717a;margin-right:7px}.history b{font-size:12px;color:#60717a}.answers{display:grid;grid-template-columns:1fr 1fr;gap:15px}.answer{background:#f5f8f7;padding:16px;border-radius:8px;overflow-wrap:anywhere}.answer [lang=ja]{color:#536b79}small,.pending{color:#60717a}.issue{color:#9c4d21}fieldset{border:0;padding:15px 0}label{margin-right:18px;display:inline-block}textarea{box-sizing:border-box;width:100%;margin-top:12px;padding:10px;font:inherit;border:1px solid #c6d2d1;border-radius:6px}button{font:inherit;cursor:pointer;padding:10px 16px;background:#18323d;color:white;border:0;border-radius:7px}details{margin-top:15px}summary{cursor:pointer}details p{font-size:13px}#status{margin-left:12px}@media(max-width:650px){.answers{grid-template-columns:1fr}header,article{padding:18px}}</style></head><body><main><header><h1>${escape(title)}</h1><p>${escape(intro)}</p><p>${prepared.pairs.length}개 상황 · 실제 응답 기록 ${records.length}개 · 판정 가능한 쌍 ${reviews.length}개</p><p>주디·팬앰의 일본어 프로필·원작 예시 제공 여부는 실행 메타데이터에 따릅니다. 부족한 원작 근거만으로 원작 말투 충실도를 확정하지 않습니다.</p>${reviews.length ? '<button id="download">검수 결과 JSON 받기</button> <button id="show-json">결과 JSON 보기·복사</button><span id="status" role="status"></span><p>더 자연스럽고 질문에 맞는 쪽을 골라주세요. 둘 다 어색하면 보류를 고르고 이유를 적어주세요. 자막 길이는 자동 표시됩니다. 저장한 JSON을 이 대화에 첨부해주세요. 작성 중에는 이 페이지를 열어두세요.</p>' : records.length ? '<b>유효한 응답 쌍이 없어 선호도 검수를 할 수 없습니다.</b>' : '<b>생성 미실행: 실제 API 응답을 받은 뒤 A/B 검수를 할 수 있습니다.</b>'}</header><section id="json-panel" hidden><h2>검수 결과 JSON</h2><p>다운로드가 막혀도 아래 텍스트는 직접 복사할 수 있습니다. 의견을 더 고쳤다면 결과 JSON 보기·복사를 다시 누르세요.</p><textarea id="json-output" rows="12" readonly aria-label="검수 결과 JSON 텍스트"></textarea><button id="copy-json">JSON 복사</button><p id="copy-status" role="status"></p></section>${cards}</main>
    <script id="review-data" type="application/json">${JSON.stringify(source).replace(/</g,'\\u003c')}</script><script>
    const data=JSON.parse(document.getElementById('review-data').textContent);
    const download=document.getElementById('download');
    function collectResult(){
      for(const item of data.items){const field=[...document.querySelectorAll('[data-pair]')].find(f=>f.dataset.pair===item.pair_id);item.choice=field.querySelector('input:checked')?.value??'pending';item.comment=field.querySelector('textarea').value;}
      const result={...data,exported_at:new Date().toISOString()};
      document.getElementById('json-output').value=JSON.stringify(result,null,2);
      document.getElementById('json-panel').hidden=false;
      return result;
    }
    document.getElementById('show-json')?.addEventListener('click',()=>{collectResult();document.getElementById('status').textContent='JSON을 화면에 준비했습니다. 아래 텍스트를 복사할 수 있습니다.';});
    document.getElementById('copy-json').addEventListener('click',async()=>{
      collectResult();
      const output=document.getElementById('json-output');
      try{if(!navigator.clipboard?.writeText)throw new Error('clipboard_unavailable');await navigator.clipboard.writeText(output.value);document.getElementById('copy-status').textContent='JSON을 클립보드에 복사했습니다. 이 대화에 붙여넣어주세요.';}
      catch{output.focus();output.select();document.getElementById('copy-status').textContent='자동 복사가 지원되지 않아 텍스트를 선택했습니다. Ctrl+C 또는 ⌘C로 복사해주세요.';}
    });
    if(download)download.addEventListener('click',()=>{
      const result=collectResult();
      try{
        const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download='ANPC-대사비교-검수결과.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        document.getElementById('status').textContent='다운로드를 요청했습니다. 파일이 보이지 않으면 아래 JSON을 복사해주세요.';
      }catch{document.getElementById('status').textContent='다운로드가 지원되지 않습니다. 아래 JSON을 복사해주세요.';}
    });</script></body></html>`;
}
