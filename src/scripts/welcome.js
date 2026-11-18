(() => {
  const data = window.WEDDING_DATA, copy = window.WEDDING_COPY, store = window.WeddingStore;
  const content = document.getElementById('step-content');
  const draft = store.readDraft();
  const validDraft = draft && typeof draft.name === 'string' && draft.name.trim().length > 0 && draft.name.length <= 100 && ['vi', 'en', 'zh-TW'].includes(draft.lang);
  const state = { name: '', lang: 'vi', group: null, transport: null, sessionId: store.uuid(), responseId: null, saved: false, ...(validDraft ? draft : {}) };
  let step = 1, saving = false;
  if (validDraft) step = ['groom', 'bride'].includes(state.group) ? (['self', 'shuttle'].includes(state.transport) ? 4 : 3) : 2;
  const requested = new URLSearchParams(location.search).get('step');
  if (requested === '4' && state.group && state.transport) step = 4;
  const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const icons = {
    groom: '<circle cx="20" cy="12" r="6"/><path d="M9 33v-6c0-7 22-7 22 0v6M15 24l5 6 5-6M20 30v5M7 8l2 2 4-4"/>',
    bride: '<circle cx="20" cy="13" r="6"/><path d="M12 12c0-13 16-13 16 0M12 10L5 33h30L28 10M13 25l7 8 7-8M17 5l3-3 3 3"/>',
    self: '<path d="M11 28H5v-7l5-3 5-7h12l5 7 4 2v8h-5m-6 0h-8M10 18h22M21 11v7"/><circle cx="14" cy="28" r="3"/><circle cx="28" cy="28" r="3"/>',
    shuttle: '<path d="M9 29H4V11a3 3 0 0 1 3-3h23a5 5 0 0 1 5 4l2 9v8h-5m-6 0H15M4 14h32M4 22h33M12 14v8m8-8v8m8-8v8"/><circle cx="12" cy="29" r="3"/><circle cx="29" cy="29" r="3"/>',
    online: '<rect x="5" y="9" width="30" height="23" rx="4"/><path d="m6 12 14 11 14-11M6 29l9-9m19 9-9-9"/>',
  };
  const icon = key => `<span class="choice-icon" aria-hidden="true"><svg viewBox="0 0 40 40">${icons[key]}<path class="icon-love" d="M31 5c-4-5-8 1 0 6 8-5 4-11 0-6Z"/></svg></span>`;
  const t = () => copy[state.lang];
  const map = address => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const choiceContent = (key, title, note) => `${icon(key)}<span class="choice-text"><strong>${escape(title)}</strong><small>${escape(note)}</small></span><span class="choice-arrow" aria-hidden="true">↗</span>`;
  const choice = (key, title, note) => `<button type="button" class="choice" data-choice="${key}">${choiceContent(key, title, note)}</button>`;
  const detailsLink = () => `details.html?lang=${encodeURIComponent(state.lang)}`;
  function saveDraft() { store.writeDraft(state); }
  function render(focus = true) {
    const c = t();
    document.documentElement.lang = state.lang;
    document.getElementById('back').hidden = step === 1;
    document.querySelector('#back span').textContent = c.back;
    document.getElementById('language').hidden = step === 1;
    document.getElementById('language').value = state.lang;
    document.getElementById('footer-copy').textContent = c.footer;
    const photos = ['story-portrait', 'story-couple', 'gallery-1', 'hero'];
    const photo = document.getElementById('step-photo'); photo.src = `assets/images/pre-wedding/${photos[step - 1]}.jpg`;
    // Keep both faces in the short mobile photo strip for each composition.
    photo.style.objectPosition = ['50% 46%', '50% 18%', '50% 13%', '50% 52%'][step - 1];
    document.querySelectorAll('.step-progress span').forEach((element, index) => element.classList.toggle('active', index < step));
    document.querySelector('.step-progress').setAttribute('aria-label', `${step} / 4`);
    content.dataset.step = step;
    content.dataset.guestGroup = step > 2 ? state.group : '';
    content.classList.remove('enter');
    if (step === 1) {
      content.innerHTML = `<p class="eyebrow">OUR WEDDING · 我們結婚了</p><h1 class="couple-names"><span class="groom-name">${escape(data.groom)}</span><em class="heart-beat" aria-hidden="true">♥</em><span class="bride-name">${escape(data.bride)}</span></h1><div class="wedding-date">${escape(data.date.split('-').reverse().join('.'))} <span class="date-heart" aria-hidden="true">♥</span> VIỆT NAM</div>
        <form class="welcome-form" id="name-form"><label class="name-label" for="guest-name">Chúng mình gọi bạn là gì?<small lang="en">What should we call you? <span lang="zh-TW">／ 我們該怎麼稱呼你？</span></small></label><input class="name-input" id="guest-name" name="name" autocomplete="name" maxlength="100" required value="${escape(state.name)}" placeholder="Tên / Name / 姓名" aria-describedby="name-error" /><p id="name-error" class="form-error" role="alert" hidden></p><div class="language-choices"><button type="submit" class="language-button" name="lang" value="vi" lang="vi">Tiếp tục bằng tiếng Việt <span aria-hidden="true">→</span></button><button type="submit" class="language-button" name="lang" value="en" lang="en">Continue in English <span aria-hidden="true">→</span></button><button type="submit" class="language-button" name="lang" value="zh-TW" lang="zh-TW">以繁體中文繼續 <span aria-hidden="true">→</span></button></div><p class="privacy-note">Lựa chọn chỉ gửi cho gia đình. / Answers are private. / 回覆僅供新人查看。</p></form>`;
      document.getElementById('name-form').addEventListener('submit', event => {
        event.preventDefault(); const input = document.getElementById('guest-name');
        if (!input.value.trim()) { const error = document.getElementById('name-error'); error.textContent = copy.vi.invalidName; error.hidden = false; input.focus(); return; }
        state.name = input.value.trim(); state.lang = event.submitter?.value || 'vi'; state.saved = false; state.responseId = null;
        step = 2; saveDraft(); render();
      });
    } else if (step === 2 || step === 3) {
      content.innerHTML = `<p class="eyebrow">${step === 2 ? '01' : '02'} / ${escape(c.wedding)}</p><p class="greeting">${escape(c.hello)} ${escape(state.name)} ♡</p><h1 class="step-title">${escape(step === 2 ? c.groupQuestion : c.travelQuestion)}</h1><p class="step-intro">${escape(step === 2 ? c.groupIntro : c.travelIntro)}</p><div class="choice-grid">${step === 2 ? choice('groom', c.groom, c.groomFriends) + choice('bride', c.bride, c.brideFriends) : choice('self', c.self, c.selfNote) + choice('shuttle', c.shuttle, c.shuttleNote) + `<a class="choice online-choice" href="${detailsLink()}&amp;mode=online">${choiceContent('online', c.online, c.onlineNote)}</a>`}</div>`;
      content.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
        if (step === 2) { state.group = button.dataset.choice; state.transport = null; }
        else state.transport = button.dataset.choice;
        state.saved = false; state.responseId = null; step++; saveDraft(); render();
        if (step === 4) sendResponse();
      }));
    } else {
      const point = data.pickup[state.group], shuttle = state.transport === 'shuttle';
      content.innerHTML = `<p class="eyebrow">${escape(c.journey)}</p><h1 class="step-title final-title">${escape(shuttle ? c.shuttleTitle : c.selfTitle)}</h1><p class="greeting">${escape(state.name)} · ${escape(c.dateLabel)} · ${escape(data.date.split('-').reverse().join('.'))}</p><div class="travel-summary"><p class="eyebrow">${escape(shuttle ? `${c.pickup} ${point.number} · ${c[state.group]}` : c.weddingVenue)}</p><p class="pickup-address">${escape(shuttle ? point.address : data.venue)}</p><a class="pickup-map" href="${map(shuttle ? point.address : data.venue)}" target="_blank" rel="noopener noreferrer">${escape(c.map)} ↗</a>${shuttle ? `<ol class="schedule">${data.schedule.map(([time, key]) => `<li><time>${time}</time><span>${escape(c[key])}</span></li>`).join('')}</ol><p class="schedule-note">${escape(c.scheduleNote)}</p>` : `<p class="schedule-note">${escape(c.selfArrival)}</p><p class="schedule-note">${escape(c.timeZone)}</p>`}</div><div class="final-actions"><a class="primary" id="group-link" href="${escape(point.zalo)}" target="_blank" rel="noopener noreferrer">${escape(c.join)} ↗</a><a class="outline-link" href="${detailsLink()}">${escape(c.discover)} <span aria-hidden="true">→</span></a></div><p class="privacy-note">${escape(c.zaloNote)}</p><div class="save-row"><p id="save-note" class="save-line" role="status" aria-live="polite"></p><button type="button" id="retry" class="retry-button">${escape(c.retry)}</button></div>`;
      document.getElementById('retry').addEventListener('click', sendResponse); updateSaveStatus();
    }
    content.classList.add('enter');
    content.setAttribute('tabindex', '-1');
    if (focus) content.focus({ preventScroll: true });
  }
  function updateSaveStatus(error) {
    const note = document.getElementById('save-note'), retry = document.getElementById('retry'); if (!note) return;
    const c = t(); note.textContent = saving ? c.saving : state.saved ? c.saved : !store.configured ? c.unconfigured : c.unsaved;
    note.dataset.state = state.saved ? 'saved' : saving ? 'saving' : 'error';
    retry.hidden = state.saved || !store.configured; retry.disabled = saving;
  }
  async function sendResponse() {
    if (saving || state.saved || step !== 4) return;
    if (!state.responseId) state.responseId = store.uuid();
    saveDraft();
    const submitted = { ...state }; saving = true; updateSaveStatus();
    try { await store.saveResponse(submitted); if (state.responseId === submitted.responseId) { state.saved = true; saveDraft(); } }
    catch { /* Keep the same UUID and draft for a safe retry. */ }
    finally {
      saving = false; updateSaveStatus();
      if (step === 4 && !state.saved && state.responseId !== submitted.responseId) sendResponse();
    }
  }
  document.getElementById('back').addEventListener('click', () => { if (step > 1) { step--; render(); } });
  document.getElementById('language').addEventListener('change', event => { state.lang = event.target.value; state.saved = false; state.responseId = null; saveDraft(); render(false); if (step === 4) sendResponse(); });
  window.addEventListener('online', () => { if (step === 4 && !state.saved) sendResponse(); });
  render(false); if (step === 4 && !state.saved) sendResponse();
})();
