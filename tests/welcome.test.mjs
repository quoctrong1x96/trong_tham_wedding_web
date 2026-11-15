import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

// Exercise the real event handlers without a browser dependency. Layout is not
// simulated here; device-level visual QA remains a separate check.
const root = new URL('../', import.meta.url);
const files = ['site-config', 'wedding-data', 'wedding-copy', 'wedding-store', 'welcome'];
const scripts = Object.fromEntries(await Promise.all(files.map(async file => [file, await readFile(new URL(`dist/assets/js/${file}.js`, root), 'utf8')])));
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function harness({ configured = true, fail = false, draft = null } = {}) {
  const elements = new Map(), calls = [], storage = new Map();
  if (draft) storage.set('wedding-welcome', JSON.stringify(draft));
  class Element {
    constructor(id = '') { this.id = id; this.handlers = {}; this.dataset = {}; this.style = {}; this.classList = { add() {}, remove() {}, toggle() {} }; this.value = ''; this.hidden = false; this.textContent = ''; this.choices = []; }
    set innerHTML(value) {
      this.html = value; this.choices = [];
      for (const match of value.matchAll(/id="([^"]+)"/g)) elements.set(match[1], new Element(match[1]));
      for (const match of value.matchAll(/data-choice="([^"]+)"/g)) { const element = new Element(); element.dataset.choice = match[1]; this.choices.push(element); }
    }
    get innerHTML() { return this.html || ''; }
    addEventListener(type, callback) { this.handlers[type] = callback; }
    setAttribute(name, value) { this[name] = value; }
    focus() { this.focused = true; }
    querySelectorAll(selector) { assert.equal(selector, '[data-choice]'); return this.choices; }
  }
  const el = id => { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); };
  const progress = [new Element(), new Element(), new Element(), new Element()];
  const context = vm.createContext({
    console, crypto: webcrypto, AbortSignal, URLSearchParams,
    location: { search: '' },
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: { documentElement: { lang: 'vi' }, getElementById: el,
      querySelector: selector => el(selector), querySelectorAll: () => progress },
    addEventListener() {},
    fetch: async (url, options) => {
      const parsed = options.body ? JSON.parse(options.body) : null;
      calls.push({ url, options, body: parsed?.p_input || parsed });
      if (fail) throw new Error('Simulated offline');
      return { ok: true, status: 201, headers: { get: () => '0' }, text: async () => '' };
    },
  });
  context.window = context;
  for (const file of files) {
    if (file === 'site-config') {
      context.WEDDING_CONFIG = { supabaseUrl: configured ? 'https://example.supabase.co' : '', supabasePublishableKey: configured ? 'sb_publishable_test' : '' };
    } else vm.runInContext(scripts[file], context, { filename: `${file}.js` });
  }
  const clickChoice = value => {
    const button = el('step-content').choices.find(item => item.dataset.choice === value);
    assert.ok(button, `Choice ${value} exists`); button.handlers.click();
  };
  const start = lang => {
    el('guest-name').value = 'Guest <script>test</script>';
    el('name-form').handlers.submit({ preventDefault() {}, submitter: { value: lang } });
  };
  return { context, el, calls, start, clickChoice, storage };
}

export async function verifyWelcome() {
  let branches = 0;
  for (const lang of ['vi', 'en', 'zh-TW']) for (const group of ['groom', 'bride']) for (const transport of ['self', 'shuttle']) {
    const h = harness(); h.start(lang);
    assert.equal(h.context.document.documentElement.lang, lang);
    assert.ok(h.el('step-content').innerHTML.includes('&lt;script&gt;'), 'Guest text is escaped');
    assert.ok(h.el('step-content').innerHTML.includes(h.context.WEDDING_COPY[lang].groupQuestion));
    h.clickChoice(group); assert.equal(h.el('step-content').dataset.step, 3);
    h.clickChoice(transport); await tick();
    assert.equal(h.el('step-content').dataset.step, 4);
    assert.equal(h.calls.length, 1);
    const payload = h.calls[0].body;
    assert.equal(payload.guest_group, group); assert.equal(payload.transport, transport); assert.equal(payload.language, lang);
    assert.equal(payload.pickup_point, transport === 'self' ? null : group === 'groom' ? 1 : 2);
    assert.equal(payload.event_date, '2026-12-13');
    const page = h.el('step-content').innerHTML;
    assert.ok(page.includes(group === 'groom' ? 'spnhpr68ysg5heplhna7' : '6qsuwuaomsnzeyiscsdw'));
    if (transport === 'shuttle') {
      assert.ok(page.includes(group === 'groom' ? '42 Phạm Ngọc Thạch' : '29A Nguyễn Đình Chiểu'));
      for (const time of ['07:15', '07:45', '11:00', '14:30', '17:30']) assert.ok(page.includes(time));
    } else assert.ok(page.includes(h.context.WEDDING_DATA.venue));
    assert.equal(h.el('save-note').dataset.state, 'saved');
    assert.ok(h.calls[0].url.endsWith('/rpc/submit_guest_response'), 'Private responses use the insert-only RPC');
    assert.ok(!h.calls[0].options.headers.Authorization, 'Publishable key is not sent as a user JWT');
    branches++;
  }
  const offline = harness({ fail: true }); offline.start('en'); offline.clickChoice('bride'); offline.clickChoice('shuttle'); await tick();
  assert.equal(offline.el('save-note').dataset.state, 'error');
  const failedId = offline.calls[0].body.id;
  await offline.el('retry').handlers.click();
  assert.equal(offline.calls[1].body.id, failedId, 'Retry reuses the request UUID');
  assert.equal(offline.el('save-note').dataset.state, 'error');
  const unconfigured = harness({ configured: false }); unconfigured.start('vi'); unconfigured.clickChoice('groom'); unconfigured.clickChoice('self'); await tick();
  assert.equal(unconfigured.calls.length, 0); assert.equal(unconfigured.el('save-note').dataset.state, 'error');
  assert.ok(unconfigured.el('save-note').textContent.includes('chưa được gửi'));
  const empty = harness(); empty.el('guest-name').value = '   '; empty.el('name-form').handlers.submit({ preventDefault() {}, submitter: { value: 'en' } });
  assert.equal(empty.el('step-content').dataset.step, 1); assert.equal(empty.el('name-error').hidden, false);
  const unknown = harness({ draft: { name: 'Guest', lang: 'constructor' } }); assert.equal(unknown.el('step-content').dataset.step, 1);
  const translations = unconfigured.context.WEDDING_COPY;
  for (const lang of ['en', 'zh-TW']) assert.deepEqual(Object.keys(translations[lang]).sort(), Object.keys(translations.vi).sort(), 'All translation keys exist');
  const publicCalls = harness();
  await publicCalls.context.WeddingStore.saveWish({ id: webcrypto.randomUUID(), name: 'Guest', message: 'Congratulations', lang: 'en' });
  assert.ok(publicCalls.calls[0].url.includes('/wedding_wishes?'));
  assert.equal(publicCalls.calls[0].body.message, 'Congratulations');
  return `PASS: ${branches} language/group/transport branches, pickup and Zalo routing, schedule, escaped names, offline handling, UUID retries, configuration state, translations and wish payload.`;
}

if (typeof process !== 'undefined') {
  const { test } = await import('node:test');
  test('multilingual wedding welcome flow', verifyWelcome);
}