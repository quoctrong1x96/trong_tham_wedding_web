import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createWeddingServer } from '../server/index.mjs';

export async function verifyServer() {
  const directory = await mkdtemp(path.join(tmpdir(), 'wedding-test-'));
  let server;
  const start = async () => {
    server = await createWeddingServer({ storageDir: directory });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  };
  const close = async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); };
  let base = await start();
  const visitor = 'test-visitor-123456789';
  const post = async (payload, headers = {}) => fetch(`${base}/api/interactions?side=bride`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ visitor, ...payload }) });
  const get = async (side = 'bride') => (await fetch(`${base}/api/state?side=${side}&visitor=${visitor}`)).json();
  try {
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await post({ kind: 'wish', name: 'Bạn, "A"', message: '<script>alert(1)</script> Chúc phúc 🎉' })).status, 201);
    assert.equal((await post({ kind: 'comment', target: 'gallery-1', name: 'Khách', message: 'Ảnh đẹp quá!' })).status, 201);
    assert.equal((await post({ kind: 'message', name: 'Riêng tư', message: 'Tin nhắn bí mật' })).status, 201);
    assert.equal((await post({ kind: 'rsvp', name: 'Khách', phone: '0901234567', attendance: 'yes', guests: 2, shuttle: 'one', message: 'Nhờ giữ hai chỗ' })).status, 201);
    await Promise.all(Array.from({ length: 8 }, () => post({ kind: 'reaction', target: 'gallery-1', emoji: '❤️', active: true })));
    assert.equal((await get()).counts['gallery-1']['❤️'], 1, 'repeated requests cannot inflate likes');
    await post({ kind: 'reaction', target: 'gallery-1', emoji: '❤️', active: false });
    assert.equal((await get()).counts['gallery-1']?.['❤️'] || 0, 0, 'unlike is persisted');
    await Promise.all(Array.from({ length: 12 }, (_, i) => post({ kind: 'wish', name: `Khách ${i}`, message: `Lời chúc ${i}` })));
    const before = await get();
    assert.equal(before.messages.length, 14);
    assert.equal(before.messages.some(row => row.kind === 'message' || row.phone || row.visitor), false, 'private information is never in public responses');
    assert.equal((await get('groom')).messages.length, 0, 'invitations keep separate guestbooks');
    assert.equal((await post({ kind: 'comment', target: '../../private', name: 'X', message: 'X' })).status, 400);
    assert.equal((await post({ kind: 'wish', name: 'X', message: '' })).status, 400);
    assert.equal((await post({ kind: 'wish', name: 'X', message: 'x'.repeat(1001) })).status, 400);
    assert.equal((await post({ kind: 'reaction', target: 'wedding', emoji: 'bad', active: true })).status, 400);
    assert.equal((await post({ kind: 'wish', name: 'X', message: 'X' }, { Origin: 'https://untrusted.example' })).status, 403);
    assert.equal((await post({ kind: 'wish', name: 'X', message: 'x'.repeat(9000) })).status, 413);
    assert.equal((await fetch(`${base}/server/storage/interactions.jsonl`)).status, 404);
    assert.equal((await fetch(`${base}/assets/..%2f..%2fdata/wedding.csv`)).status, 404);
    const journal = (await readFile(path.join(directory, 'interactions.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(journal.some(row => row.kind === 'rsvp' && row.phone === '0901234567'), true);
    assert.equal(journal.some(row => row.kind === 'message' && row.message === 'Tin nhắn bí mật'), true);
    await close(); base = await start();
    assert.deepEqual(await get(), before, 'restarting server preserves guestbook and likes');
    return 'PASS: persistence after restart, concurrent writes, toggles, private data, validation, origin and path isolation.';
  } finally {
    await close();
    // Only the temporary directory returned by mkdtemp is removed.
    await rm(directory, { recursive: true, force: true });
  }
}

if (typeof process !== 'undefined') {
  const { test } = await import('node:test');
  test('wedding API stores interactions safely', verifyServer);
}