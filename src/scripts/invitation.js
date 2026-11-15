const couple = "{{groom_name}} và {{bride_name}}";
const mapSearch = (address) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
const mapUrls = {
  "bride-reception": mapSearch("{{bride_address}}"),
  "bride-ceremony": mapSearch("{{church_address}}"),
  "groom-home": mapSearch("{{groom_address}}"),
  "pickup-pham-ngoc-thach": mapSearch("{{pickup_one}}"),
  "pickup-nguyen-dinh-chieu": mapSearch("{{pickup_two}}"),
  "can-tho-attraction": mapSearch("Chợ nổi Cái Răng, Cần Thơ"),
  "dong-nai-attraction": mapSearch("Thác Giang Điền, Trảng Bom, Đồng Nai"),
};
const invitationData = {
  bride: {
    countdownDate: "{{bride_date}}T{{bride_start}}:00+07:00",
    calendarEvents: [
      {
        start: "{{bride_date}}T{{bride_start}}:00+07:00",
        end: "{{bride_date}}T{{bride_end}}:00+07:00",
        summary: "Tiệc nhà gái - {{groom_name}} và {{bride_name}}",
        location: "{{bride_address}}",
      },
    ],
  },
  groom: {
    countdownDate: "{{groom_date}}T{{groom_start}}:00+07:00",
    calendarEvents: [
      {
        start: "{{groom_date}}T{{groom_start}}:00+07:00",
        end: "{{groom_date}}T{{groom_reception}}:00+07:00",
        summary: "Lễ thành hôn - {{groom_name}} và {{bride_name}}",
        location: "{{groom_address}}",
      },
      {
        start: "{{groom_date}}T{{groom_reception}}:00+07:00",
        end: "{{groom_date}}T{{groom_end}}:00+07:00",
        summary: "Tiệc nhà trai - {{groom_name}} và {{bride_name}}",
        location: "{{groom_address}}",
      },
    ],
  },
};
const wedding = invitationData[document.body.dataset.invitation];

const side = document.body.dataset.invitation;
const group = {
  bride: { url: "{{bride_zalo_url}}", qr: "{{bride_zalo_qr}}" },
  groom: { url: "{{groom_zalo_url}}", qr: "{{groom_zalo_qr}}" },
}[side];
if (group.url) {
  const link = document.getElementById('zalo-link');
  link.href = group.url;
  link.hidden = false;
  document.getElementById('zalo-note').textContent = 'Quét mã bằng camera hoặc Zalo để vào nhóm, nhận lịch xe và trao đổi với gia đình.';
  if (typeof qrcode === 'function') {
    const code = qrcode(0, 'M');
    code.addData(group.url); code.make();
    const image = document.createElement('img');
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(code.createSvgTag({ cellSize: 6, margin: 24, scalable: true }));
    image.alt = 'Mã QR tham gia nhóm Zalo';
    document.getElementById('zalo-qr').replaceChildren(image);
  } else if (group.qr) {
    const image = document.createElement('img');
    image.src = group.qr;
    image.alt = 'Mã QR tham gia nhóm Zalo';
    image.addEventListener('error', () => { document.getElementById('zalo-qr').textContent = 'Không tải được QR. Bạn hãy bấm mở nhóm Zalo bên dưới.'; });
    document.getElementById('zalo-qr').replaceChildren(image);
  }
}

const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
  siteNav.classList.toggle('is-open', open);
});
siteNav.addEventListener('click', (event) => {
  if (event.target.closest('a')) { menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Mở menu'); siteNav.classList.remove('is-open'); }
});
document.querySelectorAll('[data-map-link]').forEach(link => { link.href = mapUrls[link.dataset.mapLink]; });
const targetDate = new Date(wedding.countdownDate).getTime();
function countdown() {
  let remaining = Math.max(0, targetDate - Date.now());
  for (const [unit, size] of Object.entries({ days: 86400000, hours: 3600000, minutes: 60000, seconds: 1000 })) {
    document.getElementById(unit).textContent = String(Math.floor(remaining / size)).padStart(2, '0'); remaining %= size;
  }
}
countdown(); setInterval(countdown, 1000);

// A visitor ID prevents repeated toggles from inflating counts in this browser.
let visitor;
try { visitor = localStorage.getItem('wedding-visitor'); } catch {}
if (!/^[a-zA-Z0-9-]{16,80}$/.test(visitor || '')) {
  visitor = globalThis.crypto?.randomUUID?.() || `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try { localStorage.setItem('wedding-visitor', visitor); } catch {}
}
let state = { counts: {}, mine: [], messages: [] };
let selectedPhoto = null;
let connected = false;
const apiUrl = (route) => `/api/${route}?side=${side}&visitor=${encodeURIComponent(visitor)}`;
const offlineMessage = location.protocol === 'file:' ? 'Bạn đang xem bản HTML. Mở website qua server để gửi và lưu tương tác.' : 'Chưa kết nối được sổ lưu niệm. Bạn hãy thử lại sau; nội dung chưa gửi vẫn được giữ trong ô nhập.';
async function api(route, data) {
  if (location.protocol === 'file:') throw new Error(offlineMessage);
  const response = await fetch(apiUrl(route), {
    ...(data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, visitor }) } : {}),
    cache: 'no-store', signal: AbortSignal.timeout(12000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Chưa gửi được nội dung. Vui lòng thử lại.');
  return result;
}
const count = (target, emoji = '❤️') => state.counts[target]?.[emoji] || 0;
const active = (target, emoji = '❤️') => state.mine.includes(`${target}:${emoji}`);
function messageNode(message) {
  const article = document.createElement('article'); article.className = 'wish';
  const top = document.createElement('div'); top.className = 'wish-top';
  const avatar = document.createElement('span'); avatar.className = 'wish-avatar'; avatar.textContent = Array.from(message.name)[0]?.toUpperCase() || '♡';
  const identity = document.createElement('div');
  const name = document.createElement('strong'); name.textContent = message.name;
  const time = document.createElement('time'); time.dateTime = message.createdAt;
  time.textContent = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(message.createdAt));
  const text = document.createElement('p'); text.textContent = message.message;
  identity.append(name, time); top.append(avatar, identity); article.append(top, text); return article;
}
function renderMessages(container, messages, emptyText) {
  if (!messages.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = emptyText; container.replaceChildren(empty); }
  else container.replaceChildren(...messages.map(messageNode));
}
function render() {
  document.querySelectorAll('[data-reaction]').forEach(button => {
    const emoji = button.dataset.reaction;
    button.setAttribute('aria-pressed', String(active('wedding', emoji)));
    button.querySelector('b').textContent = count('wedding', emoji);
  });
  document.querySelectorAll('[data-like]').forEach(button => {
    button.setAttribute('aria-pressed', String(active(button.dataset.like)));
    button.querySelector('span').textContent = count(button.dataset.like);
  });
  const wishes = state.messages.filter(message => message.kind === 'wish');
  document.getElementById('wish-total').textContent = `${wishes.length} lời chúc gần đây`;
  renderMessages(document.getElementById('wish-list'), wishes, 'Hãy là người đầu tiên gửi một lời chúc nhé ♡');
  if (selectedPhoto) {
    document.getElementById('dialog-like-count').textContent = count(selectedPhoto);
    document.getElementById('dialog-like').setAttribute('aria-pressed', String(active(selectedPhoto)));
    renderMessages(document.getElementById('photo-comments'), state.messages.filter(message => message.kind === 'comment' && message.target === selectedPhoto), 'Khung hình này đang chờ một lời dễ thương.');
  }
}
async function refresh() {
  try {
    const fresh = await api('state'); state = fresh; connected = true; render();
    document.getElementById('interaction-note').textContent = 'Những yêu thương được lưu lại trong sổ lưu niệm của chúng mình.';
    return true;
  } catch {
    connected = false;
    document.getElementById('interaction-note').textContent = offlineMessage;
    document.getElementById('wish-list').setAttribute('aria-label', 'Chưa tải được lời chúc từ server');
    return false;
  }
}
async function react(button, target, emoji) {
  button.disabled = true;
  try {
    await api('interactions', { kind: 'reaction', target, emoji, active: !active(target, emoji) });
    if (!await refresh()) document.getElementById('interaction-note').textContent = 'Đã lưu cảm xúc. Chưa tải lại được tổng lượt, bạn có thể làm mới sau.';
  } catch (error) { document.getElementById('interaction-note').textContent = location.protocol === 'file:' ? offlineMessage : error.message; }
  finally { button.disabled = false; }
}
document.querySelectorAll('[data-reaction]').forEach(button => button.addEventListener('click', () => react(button, 'wedding', button.dataset.reaction)));
document.querySelectorAll('[data-like]').forEach(button => button.addEventListener('click', () => react(button, button.dataset.like, '❤️')));
const dialog = document.getElementById('photo-dialog');
let photoTrigger;
function closePhoto() { dialog.close(); photoTrigger?.focus(); }
document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => {
  selectedPhoto = button.dataset.photo; photoTrigger = button;
  const image = document.getElementById('dialog-image'); image.src = button.querySelector('img').src; image.alt = button.querySelector('img').alt;
  document.getElementById('comment-note').textContent = connected ? '' : offlineMessage;
  document.getElementById('photo-comment-form').reset(); render(); dialog.showModal();
}));
document.getElementById('close-photo').addEventListener('click', closePhoto);
dialog.addEventListener('click', event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) closePhoto(); });
document.getElementById('dialog-like').addEventListener('click', event => react(event.currentTarget, selectedPhoto, '❤️'));
document.getElementById('refresh-wishes').addEventListener('click', async event => { event.currentTarget.disabled = true; await refresh(); document.getElementById('refresh-wishes').disabled = false; });

async function submit(form, note, payload, success) {
  const button = form.querySelector('[type=submit]'); button.disabled = true; note.textContent = 'Đang gửi…';
  try {
    await api('interactions', payload);
    note.textContent = success; form.reset();
    // A read failure after a successful write must never encourage duplicate submissions.
    await refresh();
  } catch (error) { note.textContent = location.protocol === 'file:' ? offlineMessage : error.name === 'TimeoutError' ? 'Chưa nhận được xác nhận từ server. Hãy làm mới sổ lưu niệm trước khi gửi lại.' : error.message; }
  finally { button.disabled = false; }
}
document.getElementById('guest-message-form').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const privateMessage = data.has('private');
  submit(form, document.getElementById('guest-message-note'), { kind: privateMessage ? 'message' : 'wish', name: data.get('name'), message: data.get('message') }, privateMessage ? 'Đã lưu lời nhắn riêng cho gia đình. Cảm ơn bạn ♡' : 'Đã lưu lời chúc của bạn. Cảm ơn thật nhiều ♡');
});
document.getElementById('photo-comment-form').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
  submit(form, document.getElementById('comment-note'), { kind: 'comment', target: selectedPhoto, name: data.get('name'), message: data.get('message') }, 'Đã lưu bình luận của bạn ♡');
});
document.getElementById('rsvp-form').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
  submit(form, document.getElementById('form-note'), { kind: 'rsvp', name: data.get('name'), phone: data.get('phone'), attendance: data.get('attendance'), guests: Number(data.get('guests')), shuttle: data.get('shuttle'), message: data.get('message') }, 'Đã lưu xác nhận của bạn. Nếu đi xe, bạn nhớ vào nhóm Zalo để nhận giờ đón nhé!');
});
refresh();
setInterval(() => { if (!document.hidden && location.protocol !== 'file:') refresh(); }, 30000);

document.getElementById('calendar-button').addEventListener('click', () => {
  const calendarText = value => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const date = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Invitation//VI', ...wedding.calendarEvents.flatMap((event, index) => ['BEGIN:VEVENT', `UID:${side}-${index}@thiepcuoionline`, `DTSTAMP:${date(Date.now())}`, `DTSTART:${date(event.start)}`, `DTEND:${date(event.end)}`, `SUMMARY:${calendarText(event.summary)}`, `LOCATION:${calendarText(event.location)}`, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' })); link.download = 'ngay-chung-doi.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
