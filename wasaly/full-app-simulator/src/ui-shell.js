/* ==========================================================================
   ui-shell.js — layout, device frame, per-role app composition, render loop
   ========================================================================== */
const DEVICE_H = { 360: 800, 375: 812, 390: 844, 412: 915 };
const TABS = {
  customer: [['home', 'house', 'الرئيسية', 'Home'], ['explore', 'compass', 'استكشاف', 'Explore'], ['orders', 'receipt-text', 'الطلبات', 'Orders'], ['assistant', 'messages-square', 'المساعد', 'Assistant'], ['account', 'circle-user', 'حسابي', 'Account']],
  merchant: [['orders', 'receipt-text', 'الطلبات', 'Orders'], ['catalog', 'layout-grid', 'القائمة', 'Menu'], ['money', 'banknote', 'الحسابات', 'Money'], ['store', 'store', 'المتجر', 'Store']],
  captain: [['home', 'radar', 'الرئيسية', 'Home'], ['trips', 'route', 'رحلاتي', 'Trips'], ['earnings', 'hand-coins', 'أرباحي', 'Earnings'], ['custody', 'vault', 'العهدة', 'Custody'], ['account', 'circle-user', 'حسابي', 'Account']],
};
let $side, $stage, $panel, $simbar, $overlays;
const scrollMem = {};
let lastOverlayKeys = [];
let lastFocusBeforeOverlay = null;
let sheetTrigger = null, sheetOpen = false;

function layoutMode() { const w = window.innerWidth; return w >= 1180 ? 'wide' : w >= 820 ? 'mid' : 'narrow'; }
function setLang(v) { S.set.lang = v; LANG = v; }
function setTheme(v) { S.set.theme = v; }
/* the host (claude.ai) may stamp data-theme on <html> for the viewer's own choice; "system" in the
   simulator means: follow whatever the host says, or the OS when it says nothing */
let HOST_THEME = null, lastWrittenTheme;
function applyThemeLang() {
  const h = document.documentElement;
  LANG = S.set.lang;
  if (h.getAttribute('lang') !== (S.set.lang === 'en' ? 'en' : 'ar')) h.setAttribute('lang', S.set.lang === 'en' ? 'en' : 'ar');
  if (h.getAttribute('dir') !== (S.set.lang === 'en' ? 'ltr' : 'rtl')) h.setAttribute('dir', S.set.lang === 'en' ? 'ltr' : 'rtl');
  const want = (S.set.theme === 'system' ? HOST_THEME : S.set.theme) || null;
  if (h.getAttribute('data-theme') !== want) { if (want) h.setAttribute('data-theme', want); else h.removeAttribute('data-theme'); }
  lastWrittenTheme = want;
}

/* ---------------------------------------------------------------- screen resolution per role */
function resolveScreen(role) {
  if (role === 'customer') {
    const c = S.cust;
    if (c.stage === 'splash') return SCR.c_splash();
    if (c.stage === 'onb') return SCR.c_onb();
    if (c.stage === 'auth') return SCR.c_login();
    const top = topOf('customer'); const fn = SCR[top.s] || SCR.home;
    return fn(top);
  }
  if (role === 'merchant') {
    if (!S.nav.merchant.loggedIn) return SCR.m_login();
    const top = topOf('merchant'); return (SCR[top.s] || SCR.m_orders)(top);
  }
  if (role === 'captain') {
    if (!S.nav.captain.loggedIn) return SCR.k_login();
    const top = topOf('captain'); return (SCR[top.s] || SCR.k_home)(top);
  }
  if (role === 'recipient') return SCR.r_home();
  return null;
}
function phoneSheet(role) {
  if (!S.sheet) return '';
  if (['chat', 'call'].includes(S.sheet.kind)) return customerSheetB(S.sheet);
  if (role === 'customer') return customerSheet(S.sheet);
  if (role === 'merchant') return merchantSheet(S.sheet);
  if (role === 'captain') return captainSheet(S.sheet);
  return '';
}
function tabbar(role) {
  const nav = S.nav[role]; const tabs = TABS[role]; const i = Math.max(0, tabs.findIndex((t) => t[0] === nav.tab));
  const badge = (t) => (role === 'customer' && t === 'orders' && activeOrdersList().length ? `<span class="tab-badge" aria-hidden="true">${activeOrdersList().length}</span>` : role === 'merchant' && t === 'orders' && mOrders().some((o) => o.st === 'placed') ? '<span class="tab-badge dot" aria-hidden="true"></span>' : role === 'captain' && t === 'home' && myOffer() ? '<span class="tab-badge dot" aria-hidden="true"></span>' : '');
  return `<nav class="tabbar" aria-label="${attr(L('التنقل الرئيسي', 'Main navigation'))}" style="--n:${tabs.length};--i:${i}"><span class="tab-pill" aria-hidden="true"></span>${tabs.map(([k, icon, ar, en]) => `<button type="button" class="${cls('tab', nav.tab === k && 'on')}" data-act="tab" data-role="${role}" data-tab="${k}" ${nav.tab === k ? 'aria-current="page"' : ''}>${ic(icon, 22)}<span>${L(ar, en)}</span>${badge(k)}</button>`).join('')}</nav>`;
}
onAct('tab', (d) => { setTab(d.role, d.tab); requestRender(); });
function cartBar(scr) {
  if (!['home', 'explore', 'merchant-', 'cat-', 'favorites'].some((k) => scr.key.startsWith(k))) return '';
  const c = S.cust.cart; if (!c.lines.length) return '';
  const t = cartTotals(c); const n = c.lines.reduce((s, l) => s + l.qty, 0);
  return `<button type="button" class="cartbar" data-act="c-go" data-s="cart"><span class="cartbar-n num">${n}</span><span class="cartbar-t">${L('اعرض السلة', 'View cart')}<small>${esc(mName(c.mid))}</small></span><b class="num">${money(t.total)}</b></button>`;
}
function statusBar() {
  return `<div class="statusbar" aria-hidden="true"><span class="num">${clockStr(now()).replace(/ [مصAPM]+$/, '')}</span><span class="sb-notch"></span><span class="sb-icons">${ic('signal', 14)}${S.set.network === 'offline' ? ic('wifi-off', 14) : ic('wifi', 14)}${ic('battery-full', 16)}</span></div>`;
}
function toastHtml() {
  const t = S.toast; if (!t) return '';
  return `<div class="toast tone-${t.tone}" role="status" aria-live="polite" data-key="toast-${t.id}">${ic(t.icon || 'info', 18)}<span>${t.text}</span>${t.undo ? btn(L('تراجع', 'Undo'), 'undo', { kind: 'link' }) : ''}</div>`;
}

/* ---------------------------------------------------------------- phone app */
function renderPhoneApp(role, framed) {
  const scr = resolveScreen(role);
  const showTab = scr.tabbar !== false && !scr.full && (scr.tab || isTabRoot(role, scr));
  const dir = NAVDIR;
  return `<div class="${cls('app', scr.bg && 'bg-' + scr.bg, scr.full && 'app-full')}" data-role="${role}">
    ${framed ? statusBar() : ''}
    <div class="app-main">
      ${role !== 'customer' && S.set.network === 'offline' ? banner('warning', 'wifi-off', L('مفيش إنترنت — التحديثات هتوصل لما النت يرجع.', 'Offline — updates will sync when back online.')) : ''}
      ${role !== 'customer' && S.sys.outage ? banner('danger', 'server-crash', L('المنظومة واقفة — العمليات هتكلمك بالتليفون.', 'System down — ops will call you.')) : ''}
      <div class="${cls('scr', scr.full && 'scr-full')}" data-key="${role}:${scr.key}" data-dir="${dir}" data-scr="${scr.key}">${scr.header || ''}<div class="scr-body">${scr.body}</div></div>
      ${scr.footer ? `<div class="app-foot">${scr.footer}</div>` : ''}
      ${role === 'customer' ? cartBar(scr) : ''}
      ${showTab ? tabbar(role) : ''}
    </div>
    <div class="app-sheet">${phoneSheet(role)}</div>
    <div class="app-toast">${toastHtml()}</div>
    ${framed ? '<div class="home-ind" aria-hidden="true"></div>' : ''}
  </div>`;
}
function isTabRoot(role, scr) { const st = stackOf(role); return st.length === 1; }

function renderStage(layout) {
  const role = S.set.role; const meta = ROLE_META[role];
  if (meta.device === 'phone') {
    const app = renderPhoneApp(role, layout !== 'narrow');
    if (layout === 'narrow') return `<div class="stage-phone-full">${app}</div>`;
    const w = +S.set.device, h = DEVICE_H[w];
    const cue = renderCue(role);
    const avH = window.innerHeight - 40 - (cue ? 62 : 0), avW = ($stage ? $stage.clientWidth : 600) - 40;
    const s = Math.min(1, avH / (h + 24), avW / (w + 24));
    return `<div class="stage-center"><div class="device-cap"><span>${ic(meta.icon, 14)}${L(meta.ar, meta.en)}</span><span class="num" dir="ltr">${w}×${h}</span></div>${cue}<div class="device-wrap" style="width:${Math.round((w + 24) * s)}px;height:${Math.round((h + 24) * s)}px"><div class="device" style="width:${w + 24}px;height:${h + 24}px;transform:scale(${s.toFixed(4)})"><div class="device-screen" style="width:${w}px;height:${h}px">${app}</div></div></div>${S.set.review ? counterFab() : ''}</div>`;
  }
  const console = { support: supportDesk, ops: opsCenter, finance: financeDesk, admin: adminDesk, risk: riskDesk }[role]();
  return `<div class="${cls('stage-desk', layout === 'narrow' && 'stage-desk-full')}">${layout !== 'narrow' ? `<div class="browser-bar"><span class="bb-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="bb-title">${ic('lock', 12)}${L('لوحة داخلية — محاكاة', 'Internal console — simulation')}</span>${S.set.review ? counterFab(true) : ''}</div>${renderCue(role)}` : ''}<div class="desk-shell">${console}<div class="desk-toast">${toastHtml()}</div></div></div>`;
}
function renderOverlays(layout) {
  let h = '';
  if (layout === 'narrow' && S.set.mobileSheet) h += renderMobileSheet(S.set.mobileSheet);
  if (S.injectOpen) h += renderInject();
  if (S.review.center) h += renderReviewCenter();
  if (S.compare) h += renderCompare(S.compare.fdr, S.compare.id);
  if (S.drawer) h += renderPolicyDrawer(S.drawer);
  if (S.review.open) h += renderAnnoSheet(S.review.open);
  if (S.dialog) h += renderDialog(S.dialog);
  return h;
}

/* ---------------------------------------------------------------- render loop */
let renderQueued = false;
function requestRender() { if (renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; try { renderAll(); } catch (e) { console.error(e); showCrash(e); } }); }
let toastTimer = null, lastToastId = null;
function renderAll() {
  applyThemeLang();
  const layout = layoutMode();
  document.body.setAttribute('data-layout', layout);
  // remember scroll of the current screen
  const curScr = $stage.querySelector('.scr'); if (curScr) scrollMem[curScr.getAttribute('data-key')] = curScr.scrollTop;
  resetCur();
  patch($stage, renderStage(layout));
  if (layout === 'wide') patch($side, renderSide()); else if ($side.firstChild) $side.innerHTML = '';
  if (layout !== 'narrow') patch($panel, renderPanel(layout === 'mid')); else if ($panel.firstChild) $panel.innerHTML = '';
  if (layout === 'narrow') patch($simbar, renderSimbar()); else if ($simbar.firstChild) $simbar.innerHTML = '';
  patch($overlays, renderOverlays(layout));
  afterRender();
  persist();
}
/* responsive tables: every cell carries its column header so narrow containers can show rows as cards */
function labelTables(root) {
  root.querySelectorAll('table.tbl').forEach((t) => {
    const heads = Array.from(t.querySelectorAll('thead th')).map((th) => th.textContent.trim());
    if (!heads.length) return;
    t.querySelectorAll('tbody tr').forEach((tr) => Array.from(tr.children).forEach((td, i) => { if (heads[i] != null && td.getAttribute('data-label') !== heads[i]) td.setAttribute('data-label', heads[i]); }));
  });
}
function afterRender() {
  labelTables(document);
  const scr = $stage.querySelector('.scr');
  if (scr) {
    const k = scr.getAttribute('data-key');
    if (scr.getAttribute('data-dir') === 'back' && scrollMem[k] != null && !scr.dataset.restored) { scr.scrollTop = scrollMem[k]; scr.dataset.restored = '1'; }
    if (scr.getAttribute('data-dir') === 'fwd' && !scr.dataset.restored) { scr.scrollTop = 0; scr.dataset.restored = '1'; }
  }
  NAVDIR = 'none';
  const af = document.querySelector('[data-autofocus="1"]'); if (af && document.activeElement !== af && !af.dataset.done) { af.focus(); af.dataset.done = '1'; }
  // overlay focus management
  const keys = Array.from($overlays.children).map((n) => n.getAttribute('data-key'));
  const added = keys.filter((k) => !lastOverlayKeys.includes(k));
  if (added.length) {
    if (!lastOverlayKeys.length) lastFocusBeforeOverlay = document.activeElement;
    const top = $overlays.querySelector(`[data-key="${added[added.length - 1]}"] [role="dialog"], [data-key="${added[added.length - 1]}"] [role="alertdialog"]`);
    if (top) setTimeout(() => top.focus({ preventScroll: true }), 30);
  } else if (!keys.length && lastOverlayKeys.length && lastFocusBeforeOverlay && document.contains(lastFocusBeforeOverlay)) { lastFocusBeforeOverlay.focus({ preventScroll: true }); lastFocusBeforeOverlay = null; }
  lastOverlayKeys = keys;
  const sheet = $stage.querySelector('.sheet-layer .sheet');
  if (sheet && !sheet.dataset.focused) { sheet.dataset.focused = '1'; if (!sheetTrigger || !sheetOpen) sheetTrigger = document.activeElement; sheetOpen = true; setTimeout(() => sheet.focus({ preventScroll: true }), 30); }
  else if (!sheet && sheetOpen) {
    sheetOpen = false; const t = sheetTrigger; sheetTrigger = null;
    if (t && document.contains(t) && t !== document.body) t.focus({ preventScroll: true });
    else { const scr = $stage.querySelector('.scr'); if (scr) { scr.setAttribute('tabindex', '-1'); scr.focus({ preventScroll: true }); } }
  }
  // toast lifetime
  if (S.toast && S.toast.id !== lastToastId) { lastToastId = S.toast.id; clearTimeout(toastTimer); const id = S.toast.id; toastTimer = setTimeout(() => { if (S.toast && S.toast.id === id) { S.toast = null; requestRender(); } }, S.toast.undo ? 5000 : 3400); }
}
function showCrash(e) {
  const box = document.getElementById('crash'); if (!box) return;
  box.hidden = false; box.querySelector('pre').textContent = String(e && e.stack || e);
}

/* ---------------------------------------------------------------- boot */
function boot() {
  HOST_THEME = document.documentElement.getAttribute('data-theme');
  try { new MutationObserver(() => { const v = document.documentElement.getAttribute('data-theme'); if (v === lastWrittenTheme) return; HOST_THEME = v; if (S.set.theme !== 'system') applyThemeLang(); else requestRender(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { /* old browsers */ }
  $side = document.getElementById('side'); $stage = document.getElementById('stage'); $panel = document.getElementById('panel'); $simbar = document.getElementById('simbar'); $overlays = document.getElementById('overlays');
  restore();
  LANG = S.set.lang;
  initDelegation(document);
  // trap Tab inside the top-most overlay
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Tab') return;
    const layer = $overlays.lastElementChild || ($stage.querySelector('.sheet-layer'));
    if (!layer) return;
    const f = Array.from(layer.querySelectorAll('button:not([disabled]):not([tabindex="-1"]), input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); } else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });
  // roving focus for tablists (arrow keys follow reading direction)
  document.addEventListener('keydown', (ev) => {
    const t = ev.target && ev.target.closest ? ev.target.closest('[role="tab"]') : null;
    if (!t || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
    const list = Array.from(t.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
    let i = list.indexOf(t); const rtl = document.documentElement.getAttribute('dir') === 'rtl';
    if (ev.key === 'Home') i = 0; else if (ev.key === 'End') i = list.length - 1;
    else i = (i + (((ev.key === 'ArrowRight') !== rtl) ? 1 : -1) + list.length) % list.length;
    ev.preventDefault(); const id = list[i].id; list[i].click();
    setTimeout(() => { const n = id && document.getElementById(id); if (n) n.focus(); }, 40);
  });
  let rt = null; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(requestRender, 120); });
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', requestRender); } catch (e) { /* old browsers */ }
  renderAll();
  if (S.cust.stage === 'splash') setTimeout(() => { if (S.cust.stage === 'splash' && !prefersReduced()) { /* stay: user taps Start */ } }, 0);
  setInterval(() => { if (tick()) requestRender(); }, 250);
}
document.addEventListener('DOMContentLoaded', boot);
