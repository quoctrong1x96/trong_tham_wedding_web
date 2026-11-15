import http from 'node:http';
import { readFile, mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const photos = new Set(['gallery-1', 'gallery-2', 'gallery-3', 'hero', 'story-couple', 'story-portrait']);
const emojis = new Set(['❤️', '🥰', '🎉', '💐']);
const fail = (status, message) => Object.assign(new Error(message), { status });
function text(value, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw fail(400, 'Vui lòng kiểm tra lại nội dung và độ dài.');
  return value.trim();
}

// One process owns this append-only journal. Sync before acknowledging a write.
export async function createWeddingServer({ storageDir = path.join(root, 'server/storage'), staticDir = path.join(root, 'dist') } = {}) {
  const resolvedStorage = path.resolve(storageDir);
  const resolvedStatic = path.resolve(staticDir);
  const relativeStorage = path.relative(resolvedStatic, resolvedStorage);
  if (!relativeStorage || (!relativeStorage.startsWith('..') && !path.isAbsolute(relativeStorage))) throw new Error('Storage must be outside the public website.');
  await mkdir(storageDir, { recursive: true });
  const journal = path.join(storageDir, 'interactions.jsonl');
  const records = [];
  try {
    const source = await readFile(journal, 'utf8');
    // A corrupt journal must be repaired from backup rather than silently losing entries.
    for (const line of source.split('\n').filter(Boolean)) records.push(JSON.parse(line));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let writing = Promise.resolve();
  function append(record) {
    const task = writing.then(async () => {
      const handle = await open(journal, 'a', 0o600);
      try { await handle.writeFile(JSON.stringify(record) + '\n', 'utf8'); await handle.sync(); }
      finally { await handle.close(); }
      records.push(record);
    });
    writing = task.catch(() => {});
    return task;
  }
  function snapshot(side, visitor) {
    const reactions = new Map();
    for (const row of records) if (row.kind === 'reaction' && row.side === side) reactions.set(`${row.visitor}:${row.target}:${row.emoji}`, row);
    const counts = {};
    const mine = [];
    for (const row of reactions.values()) if (row.active) {
      counts[row.target] ??= {};
      counts[row.target][row.emoji] = (counts[row.target][row.emoji] || 0) + 1;
      if (row.visitor === visitor) mine.push(`${row.target}:${row.emoji}`);
    }
    const messages = records.filter(row => row.side === side && ['wish', 'comment'].includes(row.kind)).slice(-200).reverse().map(({ id, name, message, createdAt, target, kind }) => ({ id, name, message, createdAt, target, kind }));
    return { counts, mine, messages };
  }
  const limits = new Map();
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        const side = url.searchParams.get('side');
        if (!['bride', 'groom'].includes(side)) throw fail(400, 'Thiệp không hợp lệ.');
        if (req.method === 'GET' && url.pathname === '/api/state') {
          await writing;
          return json(200, snapshot(side, url.searchParams.get('visitor')));
        }
        if (req.method !== 'POST' || url.pathname !== '/api/interactions') throw fail(404, 'Không tìm thấy API.');
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) throw fail(403, 'Yêu cầu khác nguồn không được chấp nhận.');
        if (req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'Yêu cầu khác nguồn không được chấp nhận.');
        if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, 'Cần nội dung JSON.');
        const ip = req.socket.remoteAddress;
        const now = Date.now();
        if (limits.size > 10000) for (const [key, value] of limits) if (value.until < now) limits.delete(key);
        let limit = limits.get(ip);
        if (!limit || limit.until < now) { limit = { count: 0, until: now + 60000 }; limits.set(ip, limit); }
        if (++limit.count > 120) { res.setHeader('Retry-After', '60'); throw fail(429, 'Bạn gửi hơi nhanh, vui lòng chờ một phút.'); }
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 8192) throw fail(413, 'Nội dung quá dài.');
          chunks.push(chunk);
        }
        let input;
        try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail(400, 'JSON không hợp lệ.'); }
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail(400, 'Dữ liệu không hợp lệ.');
        const visitor = text(input.visitor, 80);
        if (!/^[a-zA-Z0-9-]{16,80}$/.test(visitor)) throw fail(400, 'Mã trình duyệt không hợp lệ.');
        const record = { id: randomUUID(), side, visitor, createdAt: new Date().toISOString(), kind: input.kind };
        if (input.kind === 'reaction') {
          if (!(input.target === 'wedding' || photos.has(input.target)) || !emojis.has(input.emoji) || typeof input.active !== 'boolean') throw fail(400, 'Cảm xúc không hợp lệ.');
          Object.assign(record, { target: input.target, emoji: input.emoji, active: input.active });
        } else if (['wish', 'comment', 'message'].includes(input.kind)) {
          Object.assign(record, { name: text(input.name, 100), message: text(input.message, 1000) });
          if (input.kind === 'comment') { if (!photos.has(input.target)) throw fail(400, 'Ảnh không tồn tại.'); record.target = input.target; }
        } else if (input.kind === 'rsvp') {
          if (!['yes', 'no', 'maybe'].includes(input.attendance)) throw fail(400, 'Câu trả lời không hợp lệ.');
          if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > 20) throw fail(400, 'Số người phải từ 1 đến 20.');
          if (!['none', 'one', 'two', 'contact'].includes(input.shuttle)) throw fail(400, 'Điểm đón không hợp lệ.');
          Object.assign(record, { name: text(input.name, 100), phone: text(input.phone, 30, false), attendance: input.attendance, guests: input.guests, shuttle: input.shuttle, message: text(input.message, 1000, false) });
        } else throw fail(400, 'Loại tương tác không hợp lệ.');
        await append(record);
        return json(201, { saved: true, id: record.id });
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, 'Phương thức không được hỗ trợ.');
      const pathname = decodeURIComponent(url.pathname);
      if (!(/^\/(index|details|nha-gai|nha-trai)\.html$/.test(pathname) || pathname === '/' || /^\/assets\/[a-zA-Z0-9/_ .-]+$/.test(pathname))) throw fail(404, 'Không tìm thấy trang.');
      const file = path.resolve(staticDir, '.' + (pathname === '/' ? '/index.html' : pathname));
      const rel = path.relative(resolvedStatic, file);
      if (rel.startsWith('..') || path.isAbsolute(rel)) throw fail(404, 'Không tìm thấy trang.');
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' }[path.extname(file)];
      if (!mime) throw fail(404, 'Không tìm thấy tệp.');
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      const status = error.status || (['ENOENT', 'EISDIR'].includes(error.code) ? 404 : 500);
      if (status === 500) console.error(error);
      json(status, { error: status === 500 ? 'Chưa lưu được dữ liệu. Vui lòng thử lại sau.' : status === 404 ? 'Không tìm thấy nội dung.' : error.message });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

if (typeof process !== 'undefined' && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createWeddingServer({ storageDir: process.env.STORAGE_DIR || path.join(root, 'server/storage') });
  const port = Number(process.env.PORT || 3000);
  server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Wedding server: http://localhost:${port}`));
}