// 게임 입력칸 한글 조합용 redscript 표를 생성한다.
// redscript에는 유니코드 코드값을 문자로 바꾸는 함수가 없어 완성형 11,172자와 호환 자모 51자를 문자열로 둔다.
// 사용: node scripts/generate-hangul-table.mjs > game/redscript/ANPC/HangulTable.reds
const rows = [];
for (let cho = 0; cho < 19; cho += 1) {
  let row = '';
  for (let i = 0; i < 21 * 28; i += 1) row += String.fromCodePoint(0xac00 + cho * 588 + i);
  rows.push(row);
}
let compat = '';
for (let code = 0x3131; code <= 0x3163; code += 1) compat += String.fromCodePoint(code);

const out = [];
out.push('module ANPC');
out.push('');
out.push('// 생성 파일: scripts/generate-hangul-table.mjs. 직접 수정하지 않는다.');
out.push('public abstract class HangulTable {');
out.push('  // 호환 자모 U+3131..U+3163. 자음 0..29, 모음 30..50.');
out.push(`  public static func Compat() -> String { return "${compat}"; }`);
out.push('');
out.push('  // 초성별 완성형 588자(중성 21 x 종성 28).');
out.push('  public static func Row(cho: Int32) -> String {');
out.push('    switch cho {');
rows.forEach((row, i) => out.push(`      case ${i}: return "${row}";`));
out.push('    }');
out.push('    return "";');
out.push('  }');
out.push('}');
process.stdout.write(out.join('\n') + '\n');
