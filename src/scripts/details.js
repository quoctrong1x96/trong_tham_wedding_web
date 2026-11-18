(() => {
  const store = window.WeddingStore, data = window.WEDDING_DATA, copies = window.WEDDING_COPY;
  const draft = store.readDraft();
  const params = new URLSearchParams(location.search);
  const requested = params.get('lang');
  const hasGroup = ['groom', 'bride'].includes(draft?.group);
  const mode = hasGroup ? draft.transport : null;
  const languages = ['vi', 'en', 'zh-TW'];
  let lang = languages.includes(requested) ? requested : languages.includes(draft?.lang) ? draft.lang : 'vi';
  let currentPhoto = 0, photoTrigger, wishAttempt = null, sending = false, loadVersion = 0;
  const photos = ['gallery-1', 'gallery-2', 'gallery-3', 'hero', 'story-portrait', 'story-couple'];
  const c = () => copies[lang];
  const map = address => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const date = value => new Intl.DateTimeFormat(c().locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${value}T12:00:00+07:00`));
  const actionIcons = {
    online: '<rect x="4" y="18" width="40" height="25" rx="3" fill="#fbd9e5"/><path d="m5 41 14-12m24 12L29 29"/><path class="envelope-flap" d="M4 18h40L26 32q-2 2-4 0Z"/><path d="M24 27c-4-4-8 2 0 6 8-4 4-10 0-6Z" fill="#fff5f8"/>',
    self: '<path d="M38 20c0 10-14 22-14 22S10 30 10 20a14 14 0 1 1 28 0Z"/><circle cx="24" cy="20" r="5"/>',
    shuttle: '<path d="M12 35H5V13a4 4 0 0 1 4-4h26a6 6 0 0 1 6 5l2 11v10h-6m-8 0H20M5 16h36M5 26h38M15 16v10m8-10v10m8-10v10"/><circle cx="16" cy="35" r="4"/><circle cx="33" cy="35" r="4"/>',
  };
  function renderGuestAction() {
    const box = document.getElementById('guest-action');
    if (!Object.hasOwn(actionIcons, mode)) return;
    const kind = mode;
    const label = kind === 'online' ? c().gift : kind === 'self' ? 'Google Maps ↗' : c().returnJourney + ' →';
    const icon = `<span class="guest-action-icon" aria-hidden="true"><svg viewBox="0 0 48 48">${actionIcons[kind]}</svg></span>`;
    const content = `<span class="primary guest-action-label">${escape(label)}</span>${icon}`;
    const point = kind === 'shuttle' ? data.pickup[draft.group] : null;
    const summary = point ? `<p class="guest-pickup"><strong>${escape(c().pickup)} ${point.number}</strong><br />${escape(point.address)}<br />${data.schedule[0][0]} · ${escape(c().boarding)}</p>` : '';
    const link = kind === 'self' ? `href="${map(data.venue)}" target="_blank" rel="noopener noreferrer"` : 'href="index.html?step=4"';
    box.dataset.mode = kind;
    box.innerHTML = kind === 'online'
      ? `<button type="button" class="guest-action-control guest-envelope" aria-haspopup="dialog">${content}</button>`
      : `<a class="guest-action-control" ${link}>${content}</a>${summary}`;
    if (kind === 'online') box.querySelector('button').addEventListener('click', openGift);
  }

  function render() {
    document.documentElement.lang = lang; document.getElementById('details-language').value = lang;
    document.querySelectorAll('[data-copy]').forEach(element => { element.textContent = c()[element.dataset.copy]; });
    renderGuestAction();
    document.getElementById('wish-name').placeholder = c().namePlaceholder;
    document.getElementById('wish-message').placeholder = c().messagePlaceholder;
    document.getElementById('close-album').setAttribute('aria-label', c().close);
    document.getElementById('close-gift').setAttribute('aria-label', c().closeGift);
    document.getElementById('gift-qr').alt = c().giftQr;
    document.getElementById('previous-photo').setAttribute('aria-label', c().previous);
    document.getElementById('next-photo').setAttribute('aria-label', c().next);
    document.getElementById('event-list').innerHTML = `<article class="event-detail"><h3>${escape(c().brideParty)}</h3><p class="event-date">${escape(data.brideDate.split('-').reverse().join('.'))}</p><p>${escape(date(data.brideDate))}<br />${escape(data.brideTime)} · ${escape(c().banquet)}</p><p>${escape(data.brideVenue)}</p><a href="${map(data.brideVenue)}" target="_blank" rel="noopener noreferrer">${escape(c().map)} ↗</a></article><article class="event-detail"><h3>${escape(c().groomParty)}</h3><p class="event-date">${escape(data.date.split('-').reverse().join('.'))}</p><p>${escape(date(data.date))}<br />${escape(data.ceremonyTime)} · ${escape(c().ceremony)}<br />${escape(data.receptionTime)} · ${escape(c().banquet)}</p><p>${escape(data.venue)}</p><a href="${map(data.venue)}" target="_blank" rel="noopener noreferrer">${escape(c().map)} ↗</a></article>`;
    document.getElementById('album-grid').innerHTML = photos.map((photo, index) => `<button type="button" class="album-tile" data-photo="${index}" aria-label="${escape(c().photo)} ${index + 1}"><img src="assets/images/pre-wedding/${photo}.jpg" alt="${escape(c().photo)} ${index + 1} · ${escape(data.groom)} &amp; ${escape(data.bride)}" loading="lazy" /></button>`).join('');
    document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => { photoTrigger = button; currentPhoto = Number(button.dataset.photo); showPhoto(); document.getElementById('album-dialog').showModal(); }));
    if (document.getElementById('album-dialog').open) showPhoto();
    loadWishes();
  }
  function showPhoto() {
    const image = document.getElementById('album-image'); image.src = `assets/images/pre-wedding/${photos[currentPhoto]}.jpg`; image.alt = `${c().photo} ${currentPhoto + 1} · ${data.groom} & ${data.bride}`;
    document.getElementById('photo-index').textContent = `${currentPhoto + 1} / ${photos.length}`;
  }
  const giftDialog = document.getElementById('gift-dialog');
  let giftTrigger;
  function openGift(event) {
    const button = event.currentTarget;
    if (button.classList.contains('is-opening') || giftDialog.open) return;
    giftTrigger = button;
    button.classList.add('is-opening');

    const showGift = () => {
      if (button.isConnected) giftDialog.showModal();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) showGift();
    else window.setTimeout(showGift, 280);
  }
  giftDialog.addEventListener('close', () => {
    giftTrigger?.classList.remove('is-opening');
    giftTrigger?.focus();
  });
  const dialog = document.getElementById('album-dialog');
  document.getElementById('close-album').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => photoTrigger?.focus());
  document.getElementById('previous-photo').addEventListener('click', () => { currentPhoto = (currentPhoto + photos.length - 1) % photos.length; showPhoto(); });
  document.getElementById('next-photo').addEventListener('click', () => { currentPhoto = (currentPhoto + 1) % photos.length; showPhoto(); });
  dialog.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); currentPhoto = (currentPhoto + (event.key === 'ArrowRight' ? 1 : photos.length - 1)) % photos.length; showPhoto(); } });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  async function loadWishes() {
    const version = ++loadVersion, list = document.getElementById('wish-list');
    list.textContent = store.configured ? c().loadingWishes : c().wishesOffline;
    if (!store.configured) return;
    try {
      const wishes = await store.loadWishes(); if (version !== loadVersion) return;
      if (!wishes.length) { list.textContent = c().emptyWishes; return; }
      list.replaceChildren(...wishes.map(wish => {
        const article = document.createElement('article'); article.className = 'wish-entry';
        const name = document.createElement('strong'); name.textContent = wish.name;
        const time = document.createElement('time'); time.dateTime = wish.created_at;
        time.textContent = new Intl.DateTimeFormat(c().locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(wish.created_at));
        const message = document.createElement('p'); message.textContent = wish.message;
        article.append(name, time, message); return article;
      }));
    } catch { if (version === loadVersion) list.textContent = c().wishesOffline; }
  }
  document.getElementById('refresh-wishes').addEventListener('click', async event => { event.currentTarget.disabled = true; try { await loadWishes(); } finally { document.getElementById('refresh-wishes').disabled = false; } });
  document.getElementById('wish-form').addEventListener('submit', async event => {
    event.preventDefault(); if (sending) return;
    const form = event.currentTarget, name = document.getElementById('wish-name').value.trim(), message = document.getElementById('wish-message').value.trim(), status = document.getElementById('wish-status');
    if (!name || !message) { status.textContent = c().wishError; return; }
    if (!store.configured) { status.textContent = c().wishesOffline; return; }
    if (!wishAttempt || wishAttempt.name !== name || wishAttempt.message !== message) wishAttempt = { id: store.uuid(), name, message, lang };
    sending = true; const button = form.querySelector('[type=submit]'); button.disabled = true; status.textContent = c().saving;
    const submitted = { ...wishAttempt };
    try {
      await store.saveWish(submitted); status.textContent = c().wishSaved;
      if (document.getElementById('wish-message').value.trim() === submitted.message) document.getElementById('wish-message').value = '';
      wishAttempt = null; await loadWishes();
    } catch { status.textContent = c().wishError; }
    finally { sending = false; button.disabled = false; }
  });
  document.getElementById('details-language').addEventListener('change', event => {
    lang = event.target.value; const url = new URL(location.href); url.searchParams.set('lang', lang); history.replaceState(null, '', url);
    const latest = store.readDraft(); if (latest) store.writeDraft({ ...latest, lang }); render();
  });
  if (typeof draft?.name === 'string') document.getElementById('wish-name').value = draft.name;
  render();
})();
