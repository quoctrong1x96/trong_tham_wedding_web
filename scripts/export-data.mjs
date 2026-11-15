import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const storage = process.env.STORAGE_DIR || new URL('../server/storage/', import.meta.url);
const journal = typeof storage === 'string' ? path.join(storage, 'interactions.jsonl') : new URL('interactions.jsonl', storage);
const rows = (await readFile(journal, 'utf8')).split('\n').filter(Boolean).map(JSON.parse);
const latest = new Map();
for (const row of rows) if (row.kind === 'rsvp') latest.set(`${row.side}:${row.visitor}`, row);
const result = {
  exportedAt: new Date().toISOString(),
  wishes: rows.filter(row => row.kind === 'wish'),
  privateMessages: rows.filter(row => row.kind === 'message'),
  photoComments: rows.filter(row => row.kind === 'comment'),
  rsvpLatest: [...latest.values()],
  history: rows,
};
const output = process.argv[2] || 'wedding-backup.json';
const destination = path.resolve(output);
const publicDirectory = path.resolve('dist');
const relative = path.relative(publicDirectory, destination);
if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) throw new Error('Do not export private information into dist/.');
await writeFile(destination, JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
console.log(`Saved ${rows.length} records to ${destination}`);