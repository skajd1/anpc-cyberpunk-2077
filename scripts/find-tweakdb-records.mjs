// TweakDB 레코드 이름 후보가 실제 게임 데이터에 있는지 확인한다.
// TweakDBID = CRC32(이름) + 이름 길이(1바이트) + 0으로 채운 3바이트. 이름 문자열은 파일에 없다.
// 단일 일치는 우연일 수 있으므로 레코드 ID와 `.displayName`·`.voiceTag` 항목이 모두 있어야 confirmed로 본다.
// 사용: node scripts/find-tweakdb-records.mjs <게임 루트> Character.Judy Character.Misty ...
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { crc32 } from 'node:zlib';

const [gameRoot, ...names] = process.argv.slice(2);
if (!gameRoot || names.length === 0) {
  console.error('사용: node scripts/find-tweakdb-records.mjs <게임 루트> <레코드 이름...>');
  process.exit(2);
}
const files = ['tweakdb.bin', 'tweakdb_ep1.bin'].map((file) => [file, readFileSync(join(gameRoot, 'r6/cache', file))]);

function pattern(name) {
  const id = Buffer.alloc(8);
  id.writeUInt32LE(crc32(Buffer.from(name)) >>> 0, 0);
  id[4] = name.length;
  return id;
}

function present(name) {
  return files.filter(([, data]) => data.indexOf(pattern(name)) >= 0).map(([file]) => file);
}

for (const name of names) {
  const record = present(name);
  const displayName = present(`${name}.displayName`);
  const voiceTag = present(`${name}.voiceTag`);
  const confirmed = record.length > 0 && displayName.length > 0 && voiceTag.length > 0;
  console.log(JSON.stringify({ name, confirmed, record, displayName, voiceTag }));
}
