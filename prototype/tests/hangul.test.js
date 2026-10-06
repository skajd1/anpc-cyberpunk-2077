import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 제품 redscript의 조합기 본문을 실행한다. 별도 JS 조합 규칙을 복제하지 않는다.
const source = readFileSync(new URL('../../game/redscript/ANPC/Hangul.reds', import.meta.url), 'utf8');
const tables = readFileSync(new URL('../../game/redscript/ANPC/HangulTable.reds', import.meta.url), 'utf8');
const rows = [...tables.matchAll(/case (\d+): return "([^"]+)";/g)].map(m => m[2]);
const compat = tables.match(/Compat\(\).*?return "([^"]+)"/)[1];
const keys = Object.fromEntries([...source.matchAll(/EInputKey\.(IK_\w+)/g)].map(m => [m[1], m[1]]));
function translate(body) {
  return body.replace(/let (\w+): \w+;/g, 'let $1;')
    .replace(/switch ([^{\n]+) \{/g, 'switch ($1) {')
    .replace(/if ([^{\n]+) \{/g, 'if ($1) {')
    .replace(/n"([^"]+)"/g, '"$1"');
}
const composerSource = source.split('public class HangulComposer extends IScriptable {')[1]
  .split('// 한/영(VK_HANGUL)')[0].replace(/(?:private|public) let [^;]+;/g, '')
  .replace(/(?:private|public) (static )?func (\w+)\(([^)]*)\) -> \w+ \{/g,
    (_, stat, name, args) => `${stat ?? ''}${name}(${args.replace(/: \w+/g, '')}) {`);
const Composer = new Function('HangulComposer', 'HangulTable', 'UTF8StrMid', 'EInputKey',
  `return class HangulComposer {${translate(composerSource)}`)(null,
  { Compat: () => compat, Row: index => rows[index] },
  (text, start, count) => [...text].slice(start, start + count).join(''), keys);
const body = source.split('protected func ProcessInputEvent(event: ref<inkKeyInputEvent>) {')[1]
  .split('  private static func LetterIndex')[0].replace(/\}\s*$/, '');
const processKey = new Function('event', 'EInputKey', 'Equals', 'HangulComposer', 'HangulTextInput',
  'ToString', 'StrMid', translate(body).replace(/super\.ProcessInputEvent\(event\)/g, 'this.baseProcess(event)'));

function input(sequence, shiftKey = 'IK_LShift') {
  const composer = new Composer(); composer.Reset();
  const ui = {
    composer, hangulMode: true, composeLen: 0, committed: '', composing: '',
    m_measurer: { IsMeasuring: () => false }, m_text: { IsFull: () => false },
    FinishComposition() { this.committed += this.composing; this.composing = ''; this.composeLen = 0; composer.Reset(); },
    ApplyComposition(committed, composing) { this.committed += committed; this.composing = composing; this.composeLen = composing ? 1 : 0; },
    CallCustomCallback() {}, baseProcess() {},
  };
  const index = key => /^IK_[A-Z]$/.test(key) ? key.charCodeAt(3) - 65 : -1;
  for (const token of sequence) {
    const shifted = /^[A-Z]$/.test(token);
    const key = token === '<' ? keys.IK_Backspace : token === ' ' ? keys.IK_Space : keys[`IK_${token.toUpperCase()}`];
    const event = { GetKey: () => key, IsShiftDown: () => shifted, IsControlDown: () => false, IsAltDown: () => false };
    if (shifted) {
      processKey.call(ui, { ...event, GetKey: () => keys[shiftKey] }, keys, (a, b) => a === b, Composer,
        { LetterIndex: index, DigitIndex: () => -1 }, String, (s, i, n) => s.slice(i, i + n));
    }
    processKey.call(ui, event, keys, (a, b) => a === b, Composer,
      { LetterIndex: index, DigitIndex: () => -1 }, String, (s, i, n) => s.slice(i, i + n));
  }
  return ui.committed + ui.composing;
}

test('Shift 키를 사이에 눌러도 ㅒ·ㅖ·ㅆ 받침과 쌍자음 조합을 유지한다', () => {
  for (const [sequence, expected] of [
    ['O', 'ㅒ'], ['dO', '얘'], ['dP', '예'], ['dlT', '있'], ['dlTek', '있다'],
    ['goTdj', '했어'], ['toT', '샜'], ['ToT', '쌨'], ['Rk', '까'], ['Ek', '따'], ['Qk', '빠'], ['Wk', '짜'],
    ['dlT<', '이'], ['dO<', 'ㅇ'], ['dlTj', '이써'], ['dlTdj', '있어'],
  ]) for (const shiftKey of ['IK_Shift', 'IK_LShift', 'IK_RShift']) assert.equal(input(sequence, shiftKey), expected, `${sequence} ${shiftKey}`);
});

test('기존 겹모음·겹받침 넘김·삭제 조합을 보존한다', () => {
  for (const [sequence, expected] of [
    ['dkssudgktpdy', '안녕하세요'], ['ekfr', '닭'], ['rkqt', '값'], ['dho', '왜'],
    ['qnpfr', '뷁'], ['ekfrdl', '닭이'], ['dkfgdk', '앓아'], ['ekfr<', '달'],
  ]) assert.equal(input(sequence), expected, sequence);
});

test('UF-62 Tab은 한글 조합만 확정하고 입력 문자나 기본 커서 키로 처리하지 않는다',()=>{
  let finished=0,base=0;
  const ui={FinishComposition(){finished++;},baseProcess(){base++;}};
  processKey.call(ui,{GetKey:()=>keys.IK_Tab,IsShiftDown:()=>false,IsControlDown:()=>false,IsAltDown:()=>false},keys,(a,b)=>a===b,Composer,{},String,()=>{});
  assert.equal(finished,1);assert.equal(base,0);
});
