/* King Social Hub — in-page banners & confirmation cards.
 * Replaces the browser's plain "website says…" pop-ups.
 *   alert(msg)              -> slides in a banner (non-blocking)
 *   showToast(msg, type)    -> same banner style
 *   await kslConfirm(msg)   -> nice confirmation card, resolves true / false
 *   KLS.banner(msg, 'success'|'error'|'info'|'warn', {title, ms})
 */
(function () {
  if (window.KLS) return;
  var ICONS = {
    success: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.6 2.6L16 9.5"/></svg>',
    error:   '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warn:    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18.2v.1"/></svg>',
    info:    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7.5v.1"/></svg>'
  };
  var TITLES = { success: 'Success', error: 'Something went wrong', warn: 'Please note', info: 'Notice' };
  var css = '' +
    '#klsBanners{position:fixed;left:0;right:0;top:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px;pointer-events:none}' +
    '.kls-b{pointer-events:auto;display:flex;align-items:flex-start;gap:12px;width:min(520px,100%);box-sizing:border-box;padding:14px 16px;border-radius:16px;background:#12141c;color:#f4f4f8;border:1px solid rgba(255,255,255,.08);box-shadow:0 14px 40px rgba(0,0,0,.35);transform:translateY(-130%);opacity:0;transition:transform .35s cubic-bezier(.2,.9,.3,1.2),opacity .25s;font-family:inherit;border-left:5px solid var(--kc)}' +
    '.kls-b.in{transform:none;opacity:1}.kls-b .ic{color:var(--kc);flex:0 0 auto;margin-top:1px}' +
    '.kls-b .tx{flex:1;min-width:0}.kls-b .tt{font-weight:800;font-size:15px;margin:0 0 2px}.kls-b .ms{font-size:14px;line-height:1.45;opacity:.9;word-break:break-word;white-space:pre-line}' +
    '.kls-b .x{background:none;border:0;color:inherit;opacity:.6;font-size:20px;line-height:1;cursor:pointer;padding:0 2px}.kls-b .x:hover{opacity:1}' +
    '.kls-b.success{--kc:#22c55e}.kls-b.error{--kc:#ef4444}.kls-b.warn{--kc:#f59e0b}.kls-b.info{--kc:#38bdf8}' +
    '#klsDlg{position:fixed;inset:0;z-index:2147483100;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(5,7,12,.62);backdrop-filter:blur(3px)}' +
    '#klsDlg.show{display:flex;animation:klsFade .18s}@keyframes klsFade{from{opacity:0}to{opacity:1}}' +
    '.kls-card{width:min(430px,100%);background:#12141c;color:#f4f4f8;border:1px solid rgba(255,255,255,.09);border-radius:22px;padding:24px 22px 20px;box-shadow:0 24px 70px rgba(0,0,0,.5);animation:klsPop .25s cubic-bezier(.2,.9,.3,1.25)}' +
    '@keyframes klsPop{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}' +
    '.kls-card .hd{display:flex;align-items:center;gap:12px;margin-bottom:10px}.kls-card .hd .ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(22,163,74,.16);color:#22c55e}' +
    '.kls-card h3{margin:0;font-size:18px}.kls-card p{margin:0 0 20px;font-size:14.5px;line-height:1.55;opacity:.85;white-space:pre-line}' +
    '.kls-card .row{display:flex;gap:10px}.kls-card button{flex:1;padding:12px 14px;border-radius:12px;font-weight:800;font-size:15px;cursor:pointer;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit}' +
    '.kls-card button.ok{background:#16a34a;border-color:#16a34a;color:#fff}.kls-card button.ok.danger{background:#dc2626;border-color:#dc2626}.kls-card button:active{transform:scale(.98)}' +
    '@media (prefers-color-scheme:light){html:not([data-theme="dark"]) .kls-b,html:not([data-theme="dark"]) .kls-card{background:#fff;color:#111827;border-color:rgba(0,0,0,.1)}}' +
    '[data-theme="light"] .kls-b,[data-theme="light"] .kls-card{background:#fff;color:#111827;border-color:rgba(0,0,0,.1)}';
  var box, dlg;
  function ready(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function mount() {
    if (box) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'klsBanners'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box);
    dlg = document.createElement('div'); dlg.id = 'klsDlg'; document.body.appendChild(dlg);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function guess(msg, type) {
    var t = String(type || '').toLowerCase();
    if (/^(ok|success|good)$/.test(t)) return 'success';
    if (/^(err|error|bad|fail)/.test(t)) return 'error';
    if (/^(warn|warning)$/.test(t)) return 'warn';
    if (/^(info)$/.test(t)) return 'info';
    var m = String(msg || '');
    if (/✓|✅|success|successful|submitted|received|copied|saved|refunded|credited|added|done|cancelled|selected/i.test(m)) return 'success';
    if (/fail|error|invalid|insufficient|not available|unable|couldn.t|can.t|wrong|denied|expired|rejected|no longer|please (log|select|enter|choose|re-)/i.test(m)) return 'error';
    return 'info';
  }
  function banner(msg, type, opts) {
    opts = opts || {};
    ready(function () {
      mount();
      var kind = guess(msg, type);
      var el = document.createElement('div');
      el.className = 'kls-b ' + kind; el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
      el.innerHTML = '<span class="ic">' + ICONS[kind] + '</span><div class="tx"><div class="tt">' + esc(opts.title || TITLES[kind]) + '</div><div class="ms">' + esc(String(msg == null ? '' : msg).replace(/^\s+/, '')) + '</div></div><button class="x" aria-label="Close">×</button>';
      box.appendChild(el);
      while (box.children.length > 3) box.removeChild(box.firstChild);
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); }); });
      var gone = false;
      function close() { if (gone) return; gone = true; el.classList.remove('in'); setTimeout(function () { el.remove(); }, 350); }
      el.querySelector('.x').onclick = close;
      var ms = opts.ms || (kind === 'error' ? 7000 : 4500);
      setTimeout(close, ms);
    });
  }
  var queue = Promise.resolve();
  function confirmCard(message, opts) {
    opts = opts || {};
    var run = function () {
      return new Promise(function (resolve) {
        ready(function () {
          mount();
          var danger = !!opts.danger || /cancel|revoke|sign .*out|delete|close this/i.test(String(message));
          dlg.innerHTML = '<div class="kls-card" role="dialog" aria-modal="true"><div class="hd"><span class="ic">' + ICONS[danger ? 'warn' : 'info'] + '</span><h3>' + esc(opts.title || (danger ? 'Are you sure?' : 'Please confirm')) + '</h3></div><p>' + esc(message) + '</p><div class="row"><button type="button" class="no">' + esc(opts.cancelText || 'No, go back') + '</button><button type="button" class="ok' + (danger ? ' danger' : '') + '">' + esc(opts.okText || (danger ? 'Yes, continue' : 'Yes, confirm')) + '</button></div></div>';
          dlg.classList.add('show');
          var done = false;
          function finish(v) { if (done) return; done = true; dlg.classList.remove('show'); dlg.innerHTML = ''; document.removeEventListener('keydown', key); resolve(v); }
          function key(e) { if (e.key === 'Escape') finish(false); if (e.key === 'Enter') finish(true); }
          dlg.querySelector('.ok').onclick = function () { finish(true); };
          dlg.querySelector('.no').onclick = function () { finish(false); };
          dlg.onclick = function (e) { if (e.target === dlg) finish(false); };
          document.addEventListener('keydown', key);
          setTimeout(function () { var b = dlg.querySelector('.ok'); if (b) b.focus(); }, 30);
        });
      });
    };
    var p = queue.then(run); queue = p.catch(function () {}); return p;
  }
  window.KLS = { banner: banner, confirm: confirmCard };
  window.kslConfirm = confirmCard;
  window.alert = function (m) { banner(m); };
  // Wrap each page's own showToast (defined later by page scripts) so it uses the banner too.
  function hookToast() {
    var cur = window.showToast;
    if (typeof cur === 'function' && !cur.__kls) {
      var w = function (m, t) { banner(m, t); }; w.__kls = true; window.showToast = w;
    }
  }
  window.addEventListener('DOMContentLoaded', hookToast);
  window.addEventListener('load', hookToast);
  setTimeout(hookToast, 1500);
})();
