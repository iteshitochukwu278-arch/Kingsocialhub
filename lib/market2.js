// ── Marketplace 2 (NovaSolution API) ────────────────────────────────────────
// Pulls every product from https://www.novasolution.ng/api/v1 and resells it.
// A product is only shown to customers once the admin sets a selling price.
// Admin can switch Marketplace 1 (manual logs) and Marketplace 2 on/off; when
// a marketplace is off, customers see a maintenance screen and cannot buy.
//
// .env:
//   NOVA_API_KEY=your_novasolution_key
//   NOVA_BASE_URL=https://www.novasolution.ng/api/v1   (optional, this is the default)
//   NOVA_LOW_BALANCE_NGN=5000                           (optional, email alert level)
//   ADMIN_ALERT_EMAIL=you@example.com                    (where alerts are emailed)

const axios = require('axios');

// Crisp branded SVG data-URIs for popular social media and digital account logs
// used as fallback when the API does not supply a direct image URL.
const BRAND_LOGOS = {
  textplus: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="100%" height="100%" rx="100" fill="#2eb82e"/><path d="M60 85c0-12 10-22 22-22h36c12 0 22 10 22 22v30c0 12-10 22-22 22H82c-12 0-22-10-22-22V85z" fill="#ffffff" opacity="0.2"/><path d="M72 100a35 35 0 0030 30l10-10a5 5 0 015-1 40 40 0 0013 2 5 5 0 015 5v17a5 5 0 01-5 5A65 65 0 0165 83a5 5 0 015-5h17a5 5 0 015 5 40 40 0 002 13 5 5 0 01-1 5l-10 10z" fill="#ffffff"/><text x="100" y="165" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle">text+</text></svg>'),
  nextplus: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="100%" height="100%" rx="100" fill="#2eb82e"/><path d="M72 100a35 35 0 0030 30l10-10a5 5 0 015-1 40 40 0 0013 2 5 5 0 015 5v17a5 5 0 01-5 5A65 65 0 0165 83a5 5 0 015-5h17a5 5 0 015 5 40 40 0 002 13 5 5 0 01-1 5l-10 10z" fill="#ffffff"/><text x="100" y="165" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle">next+</text></svg>'),
  microsoft: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="100%" height="100%" rx="30" fill="#f3f4f6"/><g transform="translate(45,45)"><rect x="0" y="0" width="50" height="50" fill="#f25022"/><rect x="58" y="0" width="50" height="50" fill="#7fba00"/><rect x="0" y="58" width="50" height="50" fill="#00a4ef"/><rect x="58" y="58" width="50" height="50" fill="#ffb900"/></g></svg>'),
  facebook: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250"><rect width="100%" height="100%" fill="#1877F2"/><path d="M225 135h-25v85h-35v-85h-17v-30h17V85c0-24 14.5-37 36-37 10.3 0 21.2 1.8 21.2 1.8v23.3h-12c-11.9 0-15.6 7.4-15.6 15v17h26.4l-4.2 30z" fill="#ffffff"/></svg>'),
  instagram: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fdf497"/><stop offset="20%" stop-color="#fd5949"/><stop offset="40%" stop-color="#d6249f"/><stop offset="100%" stop-color="#285AEB"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#ig)"/><circle cx="200" cy="125" r="38" fill="none" stroke="#ffffff" stroke-width="15"/><rect x="135" y="60" width="130" height="130" rx="36" fill="none" stroke="#ffffff" stroke-width="15"/><circle cx="240" cy="85" r="8" fill="#ffffff"/></svg>'),
  whatsapp: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250"><rect width="100%" height="100%" fill="#25D366"/><path d="M200 50c-41.4 0-75 33.6-75 75 0 13.2 3.4 25.6 9.4 36.4L125 200l39.5-10.4c10.4 5.7 22.4 8.8 35.5 8.8 41.4 0 75-33.6 75-75s-33.6-75-75-75zm0 136.2c-11.3 0-22-3.1-31.3-8.6l-2.2-1.3-23.4 6.1 6.3-22.8-1.5-2.3c-6.1-9.7-9.3-20.9-9.3-32.3 0-33.8 27.6-61.4 61.4-61.4 33.8 0 61.4 27.6 61.4 61.4 0 33.8-27.6 61.4-61.4 61.4z" fill="#ffffff"/></svg>'),
  tiktok: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250"><rect width="100%" height="100%" fill="#000000"/><path d="M232 75c8.5 9.5 20.5 15.5 34 16v24c-13.5-.2-25.5-5-34-12.8V155c0 30.4-24.6 55-55 55s-55-24.6-55-55 24.6-55 55-55c5.3 0 10.4.8 15.2 2.2v25.2c-4.6-2.1-9.8-3.4-15.2-3.4-17.1 0-31 13.9-31 31s13.9 31 31 31 31-13.9 31-31V50h24v25z" fill="#25F4EE"/><path d="M230 73c8.5 9.5 20.5 15.5 34 16v24c-13.5-.2-25.5-5-34-12.8V153c0 30.4-24.6 55-55 55s-55-24.6-55-55 24.6-55 55-55c5.3 0 10.4.8 15.2 2.2v25.2c-4.6-2.1-9.8-3.4-15.2-3.4-17.1 0-31 13.9-31 31s13.9 31 31 31 31-13.9 31-31V48h24v25z" fill="#FE2C55"/></svg>'),
  telegram: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250"><rect width="100%" height="100%" fill="#24A1DE"/><path d="M130 120l110-48c5-2 9 1 7 7l-19 89c-1 6-5 7-10 4l-29-21-14 13c-2 2-3 3-6 3l2-30 54-49c2-2-1-3-4-1l-67 42-29-9c-6-2-6-6 1-9z" fill="#ffffff"/></svg>'),
  twitter: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250"><rect width="100%" height="100%" fill="#000000"/><path d="M145 65l42 56-43 64h10l37-56 30 56h34l-45-60 40-60h-10l-35 52-27-52h-38z" fill="#ffffff"/></svg>'),
  gmail: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250"><rect width="100%" height="100%" fill="#EA4335"/><path d="M120 75v100h25V115l55 40 55-40v60h25V75l-80 58z" fill="#ffffff"/></svg>'),
  netflix: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250"><rect width="100%" height="100%" fill="#141414"/><path d="M150 60h24v130h-24zm76 0h24v130h-24z" fill="#E50914"/><path d="M150 60l76 130h24L174 60z" fill="#B81D24"/></svg>')
};

function resolveLogPicture(category, name, apiPic, adminPic) {
  if (adminPic && String(adminPic).trim()) return String(adminPic).trim();
  if (apiPic && String(apiPic).trim()) return String(apiPic).trim();
  const c = String(category || '').toLowerCase();
  const n = String(name || '').toLowerCase();
  const t = c + ' ' + n;
  if (t.includes('facebook') || t.includes('fb')) return BRAND_LOGOS.facebook;
  if (t.includes('instagram') || t.includes('ig')) return BRAND_LOGOS.instagram;
  if (t.includes('tiktok') || t.includes('tik tok')) return BRAND_LOGOS.tiktok;
  if (t.includes('twitter') || t.includes(' x ') || t.startsWith('x ') || t.includes('x.com')) return BRAND_LOGOS.twitter;
  if (t.includes('gmail') || t.includes('google') || t.includes('gsuite')) return BRAND_LOGOS.gmail;
  if (t.includes('telegram') || t.includes('tg')) return BRAND_LOGOS.telegram;
  if (t.includes('whatsapp') || t.includes('wa')) return BRAND_LOGOS.whatsapp;
  if (t.includes('snapchat') || t.includes('snap')) return BRAND_LOGOS.snapchat;
  if (t.includes('netflix')) return BRAND_LOGOS.netflix;
  if (t.includes('discord')) return BRAND_LOGOS.discord;
  if (t.includes('reddit')) return BRAND_LOGOS.reddit;
  if (t.includes('linkedin')) return BRAND_LOGOS.linkedin;
  if (t.includes('spotify')) return BRAND_LOGOS.spotify;
  if (t.includes('apple') || t.includes('icloud')) return BRAND_LOGOS.apple;
  return BRAND_LOGOS.default;
}

function register(app, deps) {
  const { mongoose, User, Transaction, auth, anyAdminAuth, sendAdminEmail } = deps;

  // ── Credential extraction ─────────────────────────────────────────────────
  // Suppliers return purchased logs in different shapes: plain strings, or objects like
  // { email, password } / { login, password, recovery }. The old code kept only ONE field of an
  // object (e.g. just "login"), so the password never reached the customer. These helpers keep
  // EVERY field and also look inside common wrapper fields (keys, credentials, items, data...).
  const KEY_META = new Set(['id', '_id', 'order_id', 'orderid', 'product_id', 'productid', 'order', 'order_number',
    'number', 'type', 'status', 'created_at', 'createdat', 'updated_at', 'updatedat', 'quantity', 'qty', 'price',
    'total', 'total_minor', 'charge', 'currency', 'product', 'product_name', 'message', 'success', 'ok']);
  const KEY_CONTAINERS = ['keys', 'credentials', 'credential', 'accounts', 'account', 'logs', 'log', 'items',
    'deliverables', 'deliverable', 'delivery', 'delivered', 'details', 'data', 'results', 'order'];
  const KEY_LEAFS = ['key', 'credential', 'credentials', 'details', 'detail', 'value', 'data', 'text', 'content',
    'account', 'log', 'login', 'email', 'username', 'user', 'password', 'pass', 'cookie', 'cookies', 'token', 'code'];
  const labelOf = (n) => String(n).replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
  function formatKey(k, depth = 0) {
    if (k == null) return '';
    if (typeof k === 'string') return k.trim();
    if (typeof k !== 'object') return String(k);
    if (Array.isArray(k)) return k.map(x => formatKey(x, depth + 1)).filter(Boolean).join('\n');
    const rows = [];
    for (const [n, v] of Object.entries(k)) {
      if (v === null || v === undefined || v === '' || KEY_META.has(String(n).toLowerCase())) continue;
      const t = typeof v === 'object' ? (depth < 3 ? formatKey(v, depth + 1) : '') : String(v).trim();
      if (t) rows.push([n, t]);
    }
    if (rows.length === 1) return rows[0][1];
    return rows.map(([n, t]) => `${labelOf(n)}: ${t}`).join('\n');
  }
  function pickKeys(node, depth = 0) {
    if (node == null || depth > 5) return [];
    if (typeof node === 'string') { const s = node.trim(); return s ? [s] : []; }
    if (typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(n => pickKeys(n, depth + 1));
    if (depth > 0 && KEY_LEAFS.some(f => node[f] !== undefined && node[f] !== null && node[f] !== '')) {
      const t = formatKey(node); return t ? [t] : [];
    }
    for (const c of KEY_CONTAINERS) {
      if (node[c] !== undefined && node[c] !== null) { const r = pickKeys(node[c], depth + 1); if (r.length) return r; }
    }
    return [];
  }
  const extractKeys = (resp) => pickKeys(resp).filter(Boolean);
  const joinKeys = (keys) => keys.join(keys.some(k => k.includes('\n')) ? '\n\n' : '\n');

  // ── Format-proof credential reading ───────────────────────────────────────
  // The supplier does not document how credentials come back, so we accept ANYTHING:
  //   1. known shapes (strings, {email,password}, keys[], credentials[], items[]...)
  //   2. JSON that arrives as a *string* (we parse it and look inside)
  //   3. a downloadable file / link (.json, .txt, .csv...) - we fetch it and read it
  //   4. last resort: any text field that is not obviously metadata (only when order looks completed)
  const DENY_KEY = /(^|_|-)(id|ids|uuid|number|ref|reference|status|state|type|message|msg|error|errors|success|ok|code_status|price|prices|total|cost|fee|amount|balance|wallet|currency|quantity|qty|name|title|category|description|product|customer|user|created|updated|date|time|expires|expiry|url|link|href|idempotency)(_|-|$|[a-z]*$)/i;
  const DONE_RE = /^(completed?|delivered|success(ful)?|done|fulfilled|paid|ready)$/i;
  const PENDING_RE = /^(pending|processing|queued|in[_ -]?progress|awaiting|created|new|waiting)$/i;
  const FAIL_RE = /^(failed|cancel(l)?ed|refunded|rejected|error|expired)$/i;

  function parseMaybeJson(str) {
    const t = String(str).trim();
    if (!t || (t[0] !== '{' && t[0] !== '[')) return null;
    try { return JSON.parse(t); } catch (e) { return null; }
  }
  // Walks a reply and returns credentials. Looks inside JSON-strings too.
  function extractAny(resp, depth = 0) {
    if (resp == null || depth > 4) return [];
    if (typeof resp === 'string') {
      const j = parseMaybeJson(resp);
      return j ? extractAny(j, depth + 1) : (resp.trim() && !/^https?:\/\/\S+$/i.test(resp.trim()) ? [resp.trim()] : []);
    }
    let keys = pickKeys(resp);
    // If a "credential" came back as a JSON string, unwrap it.
    keys = keys.flatMap(k => { const j = parseMaybeJson(k); if (!j) return [k]; const inner = extractAny(j, depth + 1); if (inner.length) return inner; const f = (j && typeof j === 'object' && !Array.isArray(j)) ? formatKey(j) : ''; return [f || k]; });
    return keys.filter(Boolean);
  }
  function orderStatus(resp) {
    const o = (resp && (resp.order || resp.data)) || resp || {};
    const st = o.status || o.state || (resp && resp.status) || '';
    return String(st || '').trim();
  }
  function deepScanStrings(node, out = [], path = '', depth = 0) {
    if (node == null || depth > 5) return out;
    if (typeof node === 'string') {
      const t = node.trim();
      if (t.length >= 3 && t.length < 4000 && !/^https?:\/\//i.test(t) && !/^\d{4}-\d{2}-\d{2}/.test(t)) out.push(t);
      return out;
    }
    if (typeof node !== 'object') return out;
    if (Array.isArray(node)) { node.forEach(n => deepScanStrings(n, out, path, depth + 1)); return out; }
    for (const [k, v] of Object.entries(node)) {
      if (DENY_KEY.test(k)) continue;
      deepScanStrings(v, out, path + '.' + k, depth + 1);
    }
    return out;
  }
  // Collect http(s) links the supplier may hand us as a downloadable file.
  function findFileLinks(node, out = [], depth = 0) {
    if (node == null || depth > 5) return out;
    if (typeof node === 'string') { const t = node.trim(); if (/^https?:\/\/\S+$/i.test(t)) out.push(t); return out; }
    if (typeof node !== 'object') return out;
    if (Array.isArray(node)) { node.forEach(n => findFileLinks(n, out, depth + 1)); return out; }
    for (const [k, v] of Object.entries(node)) {
      if (/(image|picture|photo|thumb|icon|logo|avatar|website|support|docs?_url)/i.test(k)) continue;
      findFileLinks(v, out, depth + 1);
    }
    return out;
  }
  function safeFileUrl(u) {
    try {
      const x = new URL(u);
      if (x.protocol !== 'https:' && x.protocol !== 'http:') return false;
      const h = x.hostname.toLowerCase();
      if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h === '::1' || h.startsWith('[')) return false;
      return true;
    } catch (e) { return false; }
  }
  async function readLinkedFile(u) {
    if (!safeFileUrl(u)) return [];
    try {
      const sameHost = new URL(u).hostname === new URL(baseUrl()).hostname;
      const r = await axios.get(u, { timeout: 20000, maxContentLength: 500 * 1024, responseType: 'text', transformResponse: x => x,
        headers: sameHost ? { Authorization: `Bearer ${apiKey()}`, Accept: '*/*' } : { Accept: '*/*' } });
      const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      if (/^\s*<(!doctype|html)/i.test(body)) return [];          // a web page, not a credentials file
      const j = parseMaybeJson(body);
      if (j) { const k = extractAny(j); if (k.length) return k; const d = deepScanStrings(j); return d; }
      // plain text / csv: one credential per non-empty line, or blank-line separated blocks
      const blocks = body.split(/\r?\n\s*\r?\n/).map(b => b.trim()).filter(Boolean);
      if (blocks.length > 1 && blocks.some(b => b.includes('\n'))) return blocks;
      return body.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    } catch (e) { console.error('[Market2] could not read linked file', u.slice(0, 120), e.message); return []; }
  }
  // Main entry: turn ANY supplier reply into a list of credentials ([] if none yet).
  async function resolveCredentials(resp) {
    let keys = extractAny(resp);
    if (keys.length) return keys;
    for (const link of findFileLinks(resp).slice(0, 3)) {
      keys = await readLinkedFile(link);
      if (keys.length) return keys;
    }
    const st = orderStatus(resp);
    if (DONE_RE.test(st) || (!st && resp && typeof resp === 'object')) {
      keys = deepScanStrings((resp && resp.order) ? { ...resp, order: undefined, ...resp.order } : resp)
        .filter(t => !DONE_RE.test(t) && !PENDING_RE.test(t) && !FAIL_RE.test(t));
      // only trust the last-resort scan when it found something credential-like (has ':' '@' '|' or a space-free token)
      keys = keys.filter(t => /[:@|]/.test(t) || (t.length >= 6 && !/\s/.test(t)) || t.includes('\n'));
      if (keys.length) return [...new Set(keys)];
    }
    return [];
  }
  // Ask the supplier about an order we already placed. Tries the documented order record first,
  // then a few common "deliverables" endpoints (404s are expected and ignored).
  async function lookupOrderCredentials(orderNumber) {
    const enc = encodeURIComponent(orderNumber);
    const raws = {};
    let keys = [];
    try { raws.order = await nova('get', `/orders/${enc}`); keys = await resolveCredentials(raws.order); }
    catch (e) { raws.orderError = e.message; }
    if (!keys.length && !FAIL_RE.test(orderStatus(raws.order))) {
      for (const sub of ['credentials', 'items', 'keys', 'download', 'deliverables']) {
        try {
          const d = await nova('get', `/orders/${enc}/${sub}`);
          raws[sub] = d; keys = await resolveCredentials(d);
          if (keys.length) break;
        } catch (e) { /* endpoint may not exist - fine */ }
      }
    }
    return { keys, raws, status: orderStatus(raws.order) };
  }


  const baseUrl = () => String(process.env.NOVA_BASE_URL || 'https://www.novasolution.ng/api/v1').replace(/\/+$/, '');
  const apiKey = () => String(process.env.NOVA_API_KEY || '').trim();

  // ── Models ────────────────────────────────────────────────────────────────
  const cfgSchema = new mongoose.Schema({
    key: { type: String, default: 'main', unique: true },
    market1Enabled: { type: Boolean, default: true },
    market2Enabled: { type: Boolean, default: true },
    maintenanceMessage: { type: String, default: 'This marketplace is under maintenance. Please check back shortly.' },
    lowBalanceNgn: { type: Number, default: Number(process.env.NOVA_LOW_BALANCE_NGN || 5000) },
    alertEmail: { type: String, default: '' },
    lastBalance: { type: Number, default: 0 },
    lastBalanceAt: { type: Date, default: null },
    lastBalanceError: { type: String, default: '' },
    lastAlertAt: { type: Date, default: null }
  });
  const Market2Config = mongoose.models.Market2Config || mongoose.model('Market2Config', cfgSchema);

  const priceSchema = new mongoose.Schema({
    productId: { type: Number, unique: true, required: true },
    sellPrice: { type: Number, default: 0 },   // 0 = hidden from users
    enabled: { type: Boolean, default: true },
    customTitle: { type: String, default: '' },
    description: { type: String, default: '' },
    picture: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
  });
  const Market2Price = mongoose.models.Market2Price || mongoose.model('Market2Price', priceSchema);

  const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: String,
    productId: Number,
    productName: String,
    quantity: Number,
    sellTotal: Number,
    costTotal: Number,
    profit: Number,
    novaOrderNumber: String,
    keys: [String],
    status: { type: String, default: 'delivered' },   // delivered | review (supplier sent no readable credentials)
    note: { type: String, default: '' },
    rawResponse: { type: String, default: '' },        // trimmed supplier reply, kept only when no credentials were found
    attempts: { type: Number, default: 0 },            // background retries done so far
    lastTriedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
  });
  const Market2Order = mongoose.models.Market2Order || mongoose.model('Market2Order', orderSchema);

  async function getCfg() {
    let c = await Market2Config.findOne({ key: 'main' });
    if (!c) c = await Market2Config.create({ key: 'main' });
    return c;
  }

  // ── API client ────────────────────────────────────────────────────────────
  async function nova(method, path, { params, data, idempotencyKey } = {}) {
    if (!apiKey()) {
      const e = new Error('Marketplace 2 is not connected yet (NOVA_API_KEY missing).');
      e.status = 503; e.ambiguous = false; throw e;
    }
    try {
      const r = await axios({
        method, url: baseUrl() + path, params, data, timeout: 45000,
        headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', Accept: 'application/json',
          ...(data && data.type ? { 'Idempotency-Key': idempotencyKey || require('crypto').randomUUID() } : {}) }
      });
      return r.data;
    } catch (err) {
      const status = err.response?.status || 0;
      let body = err.response?.data || {};
      if (typeof body !== 'object') body = { message: String(body).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) };
      const map = {
        401: 'NovaSolution API key is invalid.', 402: 'Supplier wallet balance is too low.',
        404: 'Product not found.', 409: 'This product is out of stock.', 429: 'Too many requests — try again shortly.'
      };
      // NovaSolution reports problems as { message, errors: { field: [..] } } (not "detail").
      const fieldErr = body.errors && typeof body.errors === 'object' ? Object.values(body.errors).flat().filter(Boolean)[0] : '';
      const e = new Error(body.message || fieldErr || body.detail || map[status] || err.message || 'Supplier request failed');
      e.status = status || 502; e.code = body.error || ''; e.ambiguous = !status || status >= 500;
      e.supplierBody = body;
      console.error('[Market2] supplier error', method.toUpperCase(), path, 'HTTP', status || 'no-response', JSON.stringify(body).slice(0, 500));
      throw e;
    }
  }

  // Categories + all product pages, cached 60s so the shop page is fast.
  let cache = { at: 0, categories: [], products: [] };
  async function loadCatalogue(force) {
    if (!force && Date.now() - cache.at < 60 * 1000 && cache.products.length) return cache;
    const d = await nova('get', '/catalog/logs');
    const categories = (Array.isArray(d?.categories) ? d.categories : []).map((name, i) => ({ id: i + 1, name }));
    const products = (Array.isArray(d?.products) ? d.products : []).map(p => ({ ...p, category: p.category || p.category_name || (Array.isArray(d?.categories) && d.categories[0]) || 'Digital products', category_id: p.category_id || 1, price: (Number(p.price_minor) || 0) / 100, in_stock: Number(p.stock) > 0 }));
    cache = { at: Date.now(), categories, products };
    return cache;
  }

  async function mergedProducts(force) {
    const { categories, products } = await loadCatalogue(force);
    const catName = new Map(categories.map(c => [Number(c.id), c.name]));
    const prices = await Market2Price.find({}).lean();
    const byId = new Map(prices.map(p => [Number(p.productId), p]));
    return products.map(p => {
      const o = byId.get(Number(p.id)) || {};
      const cost = Number(p.price) || (Number(p.price_minor) || 0) / 100;
      const sell = Number(o.sellPrice) || 0;
      const category = catName.get(Number(p.category_id)) || p.category_name || p.category || 'Other';
      const name = p.name || 'Account';
      
      // Pull description directly from the API first, falling back to admin override
      const apiDesc = (p.description || p.desc || p.details || p.detail || p.notes || p.info || p.instructions || p.instruction || '').trim();
      const description = apiDesc || (o.description || '').trim();

      // Pull picture directly from the API first, then admin, then intelligent platform logo fallback
      const apiPic = (p.picture || p.image || p.image_url || p.imageUrl || p.photo || p.thumbnail || p.icon || p.logo || p.img || '').trim();
      const picture = resolveLogPicture(category, name, apiPic, o.picture);

      return {
        id: Number(p.id),
        name,
        customTitle: o.customTitle || '',
        description,
        picture,
        apiPicture: apiPic,
        category,
        categoryId: Number(p.category_id),
        cost,
        sellPrice: sell,
        profit: sell ? sell - cost : 0,
        stock: Number(p.stock) || 0,
        inStock: !!p.in_stock && Number(p.stock) > 0,
        enabled: o.enabled !== false,
        priced: sell > 0
      };
    });
  }

  // ── Balance monitor + email ───────────────────────────────────────────────
  async function checkBalance() {
    const cfg = await getCfg();
    try {
      const d = await nova('get', '/balance');
      const bal = Number(d?.balance_ngn ?? d?.balance) || 0;
      cfg.lastBalance = bal; cfg.lastBalanceAt = new Date(); cfg.lastBalanceError = '';
      const low = Number(cfg.lowBalanceNgn) || 0;
      const cooledDown = !cfg.lastAlertAt || Date.now() - cfg.lastAlertAt.getTime() > 6 * 3600 * 1000;
      if (low > 0 && bal < low && cooledDown) {
        const r = await sendAdminEmail(cfg.alertEmail || process.env.ADMIN_ALERT_EMAIL,
          'Marketplace 2 supplier balance is low',
          `Your NovaSolution wallet balance is ₦${bal.toLocaleString('en-NG')}, below your ₦${low.toLocaleString('en-NG')} warning level.\n\nTop up now or Marketplace 2 purchases will start failing.`);
        if (r?.sent) cfg.lastAlertAt = new Date();
      }
      await cfg.save();
      return { balance: bal, currency: d?.currency || 'NGN', threshold: low };
    } catch (e) {
      cfg.lastBalanceError = String(e.message).slice(0, 300); cfg.lastBalanceAt = new Date();
      await cfg.save().catch(() => {});
      throw e;
    }
  }
  setTimeout(() => {
    checkBalance().catch(() => {});
    setInterval(() => checkBalance().catch(() => {}), 15 * 60 * 1000);
  }, 20000);

  // ── Manual marketplace switch: block manual log marketplace when off ─────
  app.use(['/api/logs/buy', '/api/logs/buy-multi'], async (req, res, next) => {
    if (req.method !== 'POST') return next();
    try {
      const cfg = await getCfg();
      if (!cfg.market1Enabled) return res.status(503).json({ error: cfg.maintenanceMessage, maintenance: true });
    } catch (e) { /* never block on a db hiccup */ }
    next();
  });

  app.get('/api/logs', async (req, res, next) => {
    // Only check logs (do not block tools or admin logs)
    if (req.query?.type === 'tool') return next();
    try {
      const cfg = await getCfg();
      if (!cfg.market1Enabled) {
        return res.status(503).json({ error: cfg.maintenanceMessage || 'Marketplace is under maintenance. Please check back shortly.', maintenance: true });
      }
    } catch (e) {}
    next();
  });

  // ── Public ────────────────────────────────────────────────────────────────
  app.get('/api/market/status', async (req, res) => {
    try {
      const c = await getCfg();
      res.json({ market1Enabled: c.market1Enabled, market2Enabled: c.market2Enabled, maintenanceMessage: c.maintenanceMessage });
    } catch (e) { res.json({ market1Enabled: true, market2Enabled: true, maintenanceMessage: '' }); }
  });

  app.get('/api/market2/products', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const c = await getCfg();
      if (!c.market2Enabled) return res.status(503).json({ error: c.maintenanceMessage, maintenance: true });
      const list = (await mergedProducts(false))
        .filter(p => p.priced && p.enabled)
        .map(p => ({
          id: p.id,
          title: p.customTitle || p.name,
          description: p.description,
          picture: p.picture,
          category: p.category,
          price: p.sellPrice,
          stock: p.stock,
          inStock: p.inStock
        }));
      res.json(list);
    } catch (e) { res.status(e.status === 503 ? 503 : 502).json({ error: 'Could not load Marketplace 2 right now. Please try again.' }); }
  });

  app.post('/api/market2/buy', auth, async (req, res) => {
    try {
      const c = await getCfg();
      if (!c.market2Enabled) return res.status(503).json({ error: c.maintenanceMessage, maintenance: true });
      const productId = parseInt(req.body?.productId, 10);
      const quantity = Math.max(1, Math.min(100, parseInt(req.body?.quantity, 10) || 1));
      if (!productId) return res.status(400).json({ error: 'Pick a product first.' });

      const product = (await mergedProducts(true)).find(p => p.id === productId);
      if (!product || !product.priced || !product.enabled) return res.status(404).json({ error: 'This product is not available.' });
      if (!product.inStock || product.stock < quantity) return res.status(409).json({ error: `Only ${product.stock} left in stock.` });
      if (product.sellPrice <= product.cost) return res.status(400).json({ error: 'This product is temporarily unavailable.' });

      const total = product.sellPrice * quantity;
      // Atomic debit so two taps can never double-spend.
      const user = await User.findOneAndUpdate(
        { _id: req.user._id, balance: { $gte: total } },
        { $inc: { balance: -total } }, { new: true });
      if (!user) return res.status(400).json({ error: 'Insufficient balance. Please deposit funds.' });

      let bought;
      const idemKey = require('crypto').randomUUID();   // same key on retry => Nova never double-charges
      try {
        try {
          bought = await nova('post', '/orders', { data: { type: 'logs', product_id: productId, quantity }, idempotencyKey: idemKey });
        } catch (first) {
          if (!first.ambiguous) throw first;
          await new Promise(r => setTimeout(r, 1500));
          bought = await nova('post', '/orders', { data: { type: 'logs', product_id: productId, quantity }, idempotencyKey: idemKey });
        }
      } catch (e) {
        await User.updateOne({ _id: user._id }, { $inc: { balance: total } }); // refund
        if (e.status === 402) checkBalance().catch(() => {});
        if (e.ambiguous) {
          try { await sendAdminEmail(c.alertEmail || process.env.ADMIN_ALERT_EMAIL, 'Marketplace 2: supplier error on purchase',
            `${user.email} tried to buy ${product.name} x${quantity} (N${total}). NovaSolution answered: HTTP ${e.status} - ${e.message}.\nThe customer was refunded automatically. Please check NovaSolution order history in case it was charged on their side (idempotency key ${idemKey}).`); } catch (x) {}
        }
        const msg = e.status === 402 ? 'This product is temporarily unavailable. Nothing was charged.'
          : e.ambiguous ? `The supplier is having trouble right now${process.env.MARKET2_HIDE_DEBUG === '1' ? '' : ` (Nova HTTP ${e.status}: ${String(e.message).slice(0, 160)})`}. Nothing was charged - please try again in a minute.`
          : `${e.message} Nothing was charged.`;
        return res.status(e.ambiguous ? 502 : 400).json({ error: msg });
      }
      const novaOrderNumber = String(bought?.order?.number || bought?.number || bought?.order_number || '');
      let keys = await resolveCredentials(bought);
      let lookupRaw = null;
      // Some supplier replies only confirm the order; the credentials are on the order record
      // (or arrive a few seconds later). Check a few times right now; a background job keeps trying after that.
      if (!keys.length && novaOrderNumber) {
        for (let attempt = 0; attempt < 4 && !keys.length; attempt++) {
          if (attempt) await new Promise(r => setTimeout(r, 2000));
          try { const lk = await lookupOrderCredentials(novaOrderNumber); keys = lk.keys; lookupRaw = lk.raws; }
          catch (e) { console.error('[Market2] order lookup failed', novaOrderNumber, e.message); }
        }
      }
      const cost = (Number(bought?.order?.total_minor ?? bought?.total_minor) / 100) || product.cost * quantity;
      const title = `${product.customTitle || product.name}${quantity > 1 ? ` ×${quantity}` : ''}`;

      const common = { userId: user._id, userEmail: user.email, productId, productName: product.name, quantity,
        sellTotal: total, costTotal: cost, profit: total - cost, novaOrderNumber };

      if (!keys.length) {
        // The supplier sold it but we could not read any credentials. Do NOT tell the customer "Delivered".
        const raw = (() => { try { return JSON.stringify({ orderReply: bought, lookup: lookupRaw }).slice(0, 6000); } catch (e) { return ''; } })();
        console.error('[Market2] supplier returned no readable credentials. Reply was:', raw);
        const order = await Market2Order.create({ ...common, keys: [], status: 'review', rawResponse: raw,
          note: 'Supplier accepted the order but no credentials could be read from the reply.' });
        await User.updateOne({ _id: user._id }, { $push: { purchaseDetails: {
          logId: order._id, logTitle: `[Marketplace 2] ${title}`, logType: 'log', source: 'market2',
          logDetails: `Order received${novaOrderNumber ? ' (ref ' + novaOrderNumber + ')' : ''}. Your credentials are being retrieved and will appear here shortly. Contact support with this reference if they are not here within 15 minutes.`,
          pricePaid: total, purchasedAt: new Date() } } });
        await Transaction.create({ userId: user._id, type: 'purchase', amount: total, description: `Bought ${title} — Marketplace 2`, status: 'success' });
        try {
          await sendAdminEmail(c.alertEmail || process.env.ADMIN_ALERT_EMAIL, 'Marketplace 2: order has NO credentials',
            `Order ${order._id} (${novaOrderNumber || 'no supplier ref'}) for ${user.email} - ${title} - N${total}.\nThe customer was charged but no credentials could be read.\nSupplier reply (trimmed): ${raw}`);
        } catch (e) { /* alert is best-effort */ }
        cache.at = 0;
        checkBalance().catch(() => {});
        return res.status(202).json({ ok: true, pending: true, orderId: String(order._id), title, quantity, amountPaid: total, balance: user.balance,
          message: 'Your payment was received and your order is being finalised. Your credentials will appear in My Purchases shortly - please do not buy again.' });
      }

      const order = await Market2Order.create({ ...common, keys, status: 'delivered' });
      await User.updateOne({ _id: user._id }, { $push: { purchaseDetails: {
        logId: order._id, logTitle: `[Marketplace 2] ${title}`, logType: 'log', source: 'market2',
        logDetails: joinKeys(keys), pricePaid: total, purchasedAt: new Date() } } });
      await Transaction.create({ userId: user._id, type: 'purchase', amount: total, description: `Bought ${title} — Marketplace 2`, status: 'success' });
      cache.at = 0;
      checkBalance().catch(() => {});
      res.json({ ok: true, title, quantity, amountPaid: total, keys, balance: user.balance });
    } catch (e) { res.status(500).json({ error: 'Purchase failed: ' + e.message }); }
  });

  // ── Background delivery: keep checking "review" orders until credentials show up ──────
  async function deliverToCustomer(order, keys, note) {
    await Market2Order.updateOne({ _id: order._id }, { $set: { keys, status: 'delivered', note: note || 'Delivered automatically.' } });
    await User.updateOne({ _id: order.userId, 'purchaseDetails.logId': order._id },
      { $set: { 'purchaseDetails.$.logDetails': joinKeys(keys) } });
  }
  async function retryOrder(order) {
    if (!order.novaOrderNumber) return { delivered: false, status: 'no supplier reference' };
    const lk = await lookupOrderCredentials(order.novaOrderNumber);
    await Market2Order.updateOne({ _id: order._id }, { $inc: { attempts: 1 }, $set: { lastTriedAt: new Date() } });
    if (lk.keys.length) { await deliverToCustomer(order, lk.keys); return { delivered: true, count: lk.keys.length, status: lk.status }; }
    try { await Market2Order.updateOne({ _id: order._id }, { $set: { rawResponse: JSON.stringify({ lookup: lk.raws }).slice(0, 6000) } }); } catch (e) {}
    return { delivered: false, status: lk.status || 'unknown', raws: lk.raws };
  }
  let sweeping = false;
  async function sweepPending() {
    if (sweeping || !apiKey()) return; sweeping = true;
    try {
      const since = new Date(Date.now() - 72 * 3600 * 1000);
      const list = await Market2Order.find({ status: 'review', novaOrderNumber: { $ne: '' }, createdAt: { $gte: since }, attempts: { $lt: 200 } }).limit(25);
      for (const o of list) {
        // back off: every 2 min for the first hour, then every 15 min
        const age = Date.now() - o.createdAt.getTime();
        const gap = age < 3600 * 1000 ? 110 * 1000 : 14 * 60 * 1000;
        if (o.lastTriedAt && Date.now() - o.lastTriedAt.getTime() < gap) continue;
        try { const r = await retryOrder(o); if (r.delivered) console.log('[Market2] auto-delivered pending order', o.novaOrderNumber); }
        catch (e) { console.error('[Market2] sweep failed for', o.novaOrderNumber, e.message); }
      }
    } catch (e) { console.error('[Market2] sweeper error', e.message); }
    finally { sweeping = false; }
  }
  setTimeout(() => { sweepPending(); setInterval(sweepPending, 2 * 60 * 1000); }, 30000);

  // ── Admin ─────────────────────────────────────────────────────────────────
  app.get('/api/admin/market2/config', anyAdminAuth, async (req, res) => {
    const c = await getCfg();
    res.json({ ...c.toObject(), apiConnected: !!apiKey(), baseUrl: baseUrl() });
  });
  app.put('/api/admin/market2/config', anyAdminAuth, async (req, res) => {
    const c = await getCfg(); const b = req.body || {};
    if (typeof b.market1Enabled === 'boolean') c.market1Enabled = b.market1Enabled;
    if (typeof b.market2Enabled === 'boolean') c.market2Enabled = b.market2Enabled;
    if (typeof b.maintenanceMessage === 'string') c.maintenanceMessage = b.maintenanceMessage.slice(0, 300);
    if (b.lowBalanceNgn !== undefined && Number(b.lowBalanceNgn) >= 0) c.lowBalanceNgn = Number(b.lowBalanceNgn);
    if (typeof b.alertEmail === 'string') c.alertEmail = b.alertEmail.trim().slice(0, 200);
    await c.save();
    res.json({ ok: true });
  });
  app.get('/api/admin/market2/products', anyAdminAuth, async (req, res) => {
    try { res.json(await mergedProducts(req.query.refresh === '1')); }
    catch (e) { res.status(e.status || 502).json({ error: e.message }); }
  });
  app.put('/api/admin/market2/products/:id', anyAdminAuth, async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    if (!productId) return res.status(400).json({ error: 'Bad product id' });
    const b = req.body || {}; const set = { updatedAt: new Date() };
    if (b.sellPrice !== undefined) {
      const n = Number(b.sellPrice);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: 'Price must be ₦0 or more (0 hides it).' });
      set.sellPrice = n;
    }
    if (typeof b.enabled === 'boolean') set.enabled = b.enabled;
    if (typeof b.customTitle === 'string') set.customTitle = b.customTitle.slice(0, 150);
    if (typeof b.description === 'string') set.description = b.description.slice(0, 1000);
    if (typeof b.picture === 'string') set.picture = b.picture.trim().slice(0, 1000);
    await Market2Price.updateOne({ productId }, { $set: set }, { upsert: true });
    res.json({ ok: true });
  });
  app.get('/api/admin/market2/balance', anyAdminAuth, async (req, res) => {
    try { res.json(await checkBalance()); } catch (e) { res.status(502).json({ error: e.message }); }
  });
  // Manual delivery for an order flagged "review": POST { "keys": ["email:pass", ...] } (or { "text": "..." }).
  app.post('/api/admin/market2/orders/:id/deliver', anyAdminAuth, async (req, res) => {
    try {
      const o = await Market2Order.findById(req.params.id);
      if (!o) return res.status(404).json({ error: 'Order not found' });
      const keys = Array.isArray(req.body?.keys) ? req.body.keys.map(k => String(k).trim()).filter(Boolean)
        : String(req.body?.text || '').split(/\n{2,}/).map(k => k.trim()).filter(Boolean);
      if (!keys.length) return res.status(400).json({ error: 'Send the credentials as keys[] or text.' });
      await Market2Order.updateOne({ _id: o._id }, { $set: { keys, status: 'delivered', note: 'Delivered manually by admin.' } });
      await User.updateOne({ _id: o.userId, 'purchaseDetails.logId': o._id },
        { $set: { 'purchaseDetails.$.logDetails': joinKeys(keys) } });
      res.json({ ok: true, delivered: keys.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // Re-check the supplier for one order right now. Returns the raw supplier reply so you can see its real format.
  app.post('/api/admin/market2/orders/:id/retry', anyAdminAuth, async (req, res) => {
    try {
      const o = await Market2Order.findById(req.params.id);
      if (!o) return res.status(404).json({ error: 'Order not found' });
      const r = await retryOrder(o);
      res.json({ ok: true, ...r });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // See exactly what NovaSolution returns for a supplier order number (admin only; shows raw credentials).
  app.get('/api/admin/market2/debug-order/:number', anyAdminAuth, async (req, res) => {
    try { const lk = await lookupOrderCredentials(req.params.number); res.json({ status: lk.status, parsedCredentialCount: lk.keys.length, raw: lk.raws }); }
    catch (e) { res.status(502).json({ error: e.message }); }
  });
  app.get('/api/admin/market2/orders', anyAdminAuth, async (req, res) => {
    const orders = await Market2Order.find({}).sort({ createdAt: -1 }).limit(200).select('-keys').lean();
    const agg = await Market2Order.aggregate([{ $group: { _id: null, sales: { $sum: '$sellTotal' }, cost: { $sum: '$costTotal' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } }]);
    res.json({ orders, totals: agg[0] || { sales: 0, cost: 0, profit: 0, count: 0 } });
  });
}

module.exports = { register, resolveLogPicture };
