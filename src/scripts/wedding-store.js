(() => {
  const config = window.WEDDING_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl || '') && !!config.supabasePublishableKey;
  const uuid = () => crypto.randomUUID();
  const readDraft = () => { try { return JSON.parse(sessionStorage.getItem('wedding-welcome') || 'null'); } catch { return null; } };
  const writeDraft = value => { try { sessionStorage.setItem('wedding-welcome', JSON.stringify(value)); } catch {} };
  async function request(path, options = {}) {
    if (!configured) throw Object.assign(new Error('Database is not configured'), { code: 'unconfigured' });
    const headers = { apikey: config.supabasePublishableKey, ...options.headers };
    // Legacy anon JWTs need the Authorization header. Publishable keys do not.
    if (config.supabasePublishableKey.startsWith('eyJ')) headers.Authorization = `Bearer ${config.supabasePublishableKey}`;
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, { ...options, headers, signal: AbortSignal.timeout(15000), cache: 'no-store' });
    if (!response.ok) throw new Error(`Database request failed (${response.status})`);
    return response.status === 204 || response.headers.get('content-length') === '0' ? null : response.text().then(text => text ? JSON.parse(text) : null);
  }
  async function saveResponse(response) {
    const body = {
      id: response.responseId, session_id: response.sessionId, name: response.name,
      language: response.lang, guest_group: response.group, transport: response.transport,
      pickup_point: response.transport === 'shuttle' ? (response.group === 'groom' ? 1 : 2) : null,
      event_date: window.WEDDING_DATA.date,
    };
    // Retry the same UUID safely after an uncertain network response.
    await request('rpc/submit_guest_response', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_input: body }),
    });
  }
  async function saveWish(wish) {
    await request('wedding_wishes?on_conflict=id', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ id: wish.id, name: wish.name, message: wish.message, language: wish.lang }),
    });
  }
  const loadWishes = () => request('wedding_wishes?select=id,name,message,created_at&order=created_at.desc&limit=50');
  window.WeddingStore = { configured, uuid, readDraft, writeDraft, saveResponse, saveWish, loadWishes };
})();