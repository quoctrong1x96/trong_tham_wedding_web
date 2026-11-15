import { readFile, writeFile, mkdir } from 'node:fs/promises';
import qrcode from './vendor/qrcode.cjs';
// Standard quoted CSV, including commas, escaped quotes, BOM and multiline fields.
const csv = (await readFile(new URL('../data/wedding.csv', import.meta.url), 'utf8')).replace(/^\uFEFF/, '');
const rows = []; let row = [], field = '', quoted = false;
for (let i = 0; i <= csv.length; i++) {
  const ch = csv[i];
  if (ch === '"') { if (quoted && csv[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
  else if (!quoted && (ch === ',' || ch === '\n' || ch === undefined)) {
    row.push(field.replace(/\r$/, '')); field = '';
    if (ch !== ',') { if (row.some(Boolean)) rows.push(row); row = []; }
  } else field += ch;
}
if (quoted) throw new Error('CSV contains an unclosed quote');
const config = Object.fromEntries(rows.slice(1));
await mkdir(new URL('../public/assets/images/zalo/', import.meta.url), { recursive: true });
for (const side of ['bride', 'groom']) {
  const url = config[`${side}_zalo_url`];
  if (!url || !/^https:\/\/zalo\.me\/g\/[a-zA-Z0-9]+$/.test(url)) throw new Error(`Invalid Zalo URL: ${side}`);
  const code = qrcode(0, 'M'); code.addData(url); code.make();
  await writeFile(new URL(`../public/assets/images/zalo/${side}.svg`, import.meta.url), code.createSvgTag({ cellSize: 8, margin: 32, scalable: true }));
  console.log(`Created QR: ${side}`);
}