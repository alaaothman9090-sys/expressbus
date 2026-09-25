/* ==========================================================================
   act-customer.js — customer interactions
   ========================================================================== */

/* ---------- navigation helpers (shared by every phone role) ---------- */
let NAVDIR = 'none';
function navOf(role) { return S.nav[role]; }
function stackOf(role) { const n = S.nav[role]; return n.stacks[n.tab]; }
function topOf(role) { const st = stackOf(role); return st[st.length - 1]; }
function go(role, s, params = {}) { const st = stackOf(role); st.push(Object.assign({ s }, params)); NAVDIR = 'fwd'; S.sheet = null; }
function goBack(role) { const st = stackOf(role); if (st.length > 1) { st.pop(); NAVDIR = 'back'; } S.sheet = null; }
function setTab(role, tab) { const n = S.nav[role]; if (n.tab === tab) { n.stacks[tab] = n.stacks[tab].slice(0, 1); } n.tab = tab; NAVDIR = 'none'; S.sheet = null; }
function openSheet(sh) { S.sheet = sh; }
function closeSheet() { S.sheet = null; }

/* ---------- network simulation for user-initiated server calls ---------- */
function net(key, fn, o = {}) {
  if (S.busy[key]) return; // a request with this key is already in flight — ignore double taps
  const n = S.set.network;
  if (S.sys.outage && !o.ops) { toast(L('فيه عطل عندنا دلوقتي — مش قادرين نكمّل. جرّب كمان شوية.', 'We have an outage — try again shortly.'), 'danger', 'server-crash'); requestRender(); return; }
  if (n === 'offline') { toast(L('مفيش إنترنت. اتأكد من الاتصال وجرّب تاني.', 'You are offline. Check your connection.'), 'danger', 'wifi-off'); requestRender(); return; }
  const delay = { good: 380, slow: 2300, timeout: 3200, error: 900 }[n] || 380;
  S.busy[key] = true; requestRender();
  setTimeout(() => {
    S.busy[key] = false;
    if (n === 'timeout') {
      if (o.onTimeout) o.onTimeout();
      else S.dialog = { title: L('الطلب ما وصلش للسيرفر', 'Request timed out'), body: L('الاتصال بطيء قوي. جرّب تاني.', 'The connection is very slow. Try again.'), confirm: { label: L('جرّب تاني', 'Retry'), act: 'dialog-retry' }, retry: () => net(key, fn, o) };
    } else if (n === 'error') {
      S.dialog = { title: L('حصلت مشكلة عندنا', 'Something went wrong on our side'), body: L('مش ذنبك. جرّب تاني كمان شوية — ولو اتكررت كلّم الدعم.', 'Not your fault. Try again shortly.'), confirm: { label: L('جرّب تاني', 'Retry'), act: 'dialog-retry' }, retry: () => net(key, fn, o), tone: 'danger' };
    } else fn();
    requestRender();
  }, delay);
}

/* ---------- onboarding & auth ---------- */
onAct('c-onb-start', () => { S.cust.stage = 'onb'; S.cust.onb = 0; NAVDIR = 'fwd'; requestRender(); });
onAct('c-lang', (d) => { setLang(d.v); requestRender(); });
onAct('c-onb-next', () => { S.cust.onb += 1; NAVDIR = 'fwd'; requestRender(); });
onAct('c-onb-skip', () => { S.cust.onb = 4; NAVDIR = 'fwd'; requestRender(); });
onAct('c-onb-back', () => { if (S.cust.stage === 'onb' && S.cust.onb > 0) { S.cust.onb = S.cust.onb === 6 ? 4 : S.cust.onb - 1; } else goBack('customer'); NAVDIR = 'back'; requestRender(); });
onAct('c-perm', (d) => {
  S.cust.perm = d.v;
  if (d.v === 'granted') { S.cust.onb = 5; S.busy.locate = true; requestRender(); setTimeout(() => { S.busy.locate = false; requestRender(); }, S.set.gps === 'weak' ? 1800 : 900); }
  else S.cust.onb = 6;
  NAVDIR = 'fwd'; requestRender();
});
onAct('c-onb-manual', () => { if (S.cust.stage === 'onb') { S.cust.onb = 6; NAVDIR = 'fwd'; } else go('customer', 'c_addrForm'); requestRender(); });
onAct('bind:c-landmark', (v) => { S.cust.draftLandmark = v; });
onAct('c-loc-confirm', () => {
  const outside = S.set.gps === 'outside';
  const a = outside ? OUTSIDE_ADDRESS : S.cust.addresses[0];
  if (S.cust.draftLandmark != null) { if (!S.cust.draftLandmark.trim()) { toast(L('اكتب معلم قريب — الكابتن بيعتمد عليه.', 'Add a landmark — the captain relies on it.'), 'warning', 'landmark'); requestRender(); return; } if (!outside) a.landmark = S.cust.draftLandmark; }
  S.cust.pendingAddr = a; S.cust.onb = 7; S.busy.service = true; NAVDIR = 'fwd'; requestRender();
  setTimeout(() => { S.busy.service = false; requestRender(); }, 1100);
});
onAct('c-addr-label', (d) => { S.cust.addrDraft.label = d.v; requestRender(); });
onAct('change:c-addr-zone', (v) => { S.cust.addrDraft.zone = v; requestRender(); });
['street', 'building', 'floor', 'landmark', 'alt'].forEach((k) => onAct('bind:c-addr-' + k, (v) => { S.cust.addrDraft[k] = v; }));
onAct('c-addr-save', (d) => {
  const x = S.cust.addrDraft; x.err = {};
  if (!x.street.trim()) x.err.street = L('اكتب اسم الشارع.', 'Enter the street.');
  if (!x.landmark.trim()) x.err.landmark = L('المعلم مهم — زي «جنب الجامع».', 'A landmark is required.');
  if (x.alt && !/^01\d{9}$/.test(x.alt.replace(/\s/g, ''))) x.err.alt = L('الرقم لازم يبدأ بـ01 ويكون 11 رقم.', 'Must start with 01 and be 11 digits.');
  if (Object.keys(x.err).length) { requestRender(); focusFirstError(); return; }
  const outside = x.zone === 'عزبة خارج التغطية';
  const id = 'a' + (S.cust.addresses.length + 5);
  const node = outside ? 'n0-0' : { 'وسط البلد': 'n4-6', 'شمال البلد': 'n2-1', 'على المية': 'n6-3', 'المنطقة الصناعية (تجريبي)': 'n1-6' }[x.zone] || 'n4-6';
  const a = { id, label: x.label, labelEn: x.label, icon: x.label === 'الشغل' ? 'briefcase' : 'house', line: `${x.street}${x.building ? ' — ' + x.building : ''}${x.floor ? '، الدور ' + x.floor : ''} (تجريبي)`, landmark: x.landmark, node, zone: x.zone, outside };
  S.cust.addrDraft = null;
  if (d.onb === '1') { if (!outside) { S.cust.addresses.unshift(a); S.cust.addrId = id; } S.cust.pendingAddr = a; S.cust.onb = 7; S.busy.service = true; NAVDIR = 'fwd'; requestRender(); setTimeout(() => { S.busy.service = false; requestRender(); }, 1100); return; }
  if (outside) { toast(L('العنوان ده برّه التغطية — مش هنقدر نوصّل له دلوقتي.', 'Outside coverage for now.'), 'warning', 'map-pin-off'); }
  S.cust.addresses.push(a); if (!outside) S.cust.addrId = id;
  goBack('customer'); toast(L('العنوان اتحفظ', 'Address saved'), 'success', 'check'); requestRender();
});
onAct('c-service-ok', () => { S.cust.stage = 'auth'; NAVDIR = 'fwd'; requestRender(); });
onAct('c-notify-coverage', () => { toast(L('هنبلّغك لما التغطية توصل منطقتك (اقتراح — غير مبني).', 'We’ll notify you (proposal — not built).'), 'info', 'bell'); requestRender(); });
onAct('bind:c-phone', (v) => { S.cust.draftPhone = v; S.cust.phoneErr = null; });
onAct('c-demo-phone', () => { S.cust.draftPhone = '010 0000 0000'; S.cust.phoneErr = null; requestRender(); });
onAct('c-send-code', () => {
  const ph = (S.cust.draftPhone || '').replace(/\s/g, '');
  if (!/^01\d{9}$/.test(ph)) { S.cust.phoneErr = L('الرقم لازم يبدأ بـ01 ويكون 11 رقم (رقم تجريبي).', 'Must start with 01 and have 11 digits.'); requestRender(); focusFirstError(); return; }
  net('sendCode', () => { S.cust.verifyStep = 1; NAVDIR = 'fwd'; });
});
onAct('c-verify-back', () => { S.cust.verifyStep = 0; NAVDIR = 'back'; requestRender(); });
onAct('bind:c-code', (v) => { S.cust.draftCode = v; S.cust.codeErr = null; });
onAct('c-verify', () => {
  if ((S.cust.draftCode || '').trim() !== '4827') { S.cust.codeErr = L('الكود مش صح. استخدم كود المحاكاة 4827.', 'Wrong code. Use the demo code 4827.'); requestRender(); focusFirstError(); return; }
  net('verify', () => { S.cust.loggedIn = true; S.cust.auth = 'phone'; S.cust.stage = 'app'; S.cust.verifyStep = 0; NAVDIR = 'fwd'; toast(L(`أهلًا يا ${PEOPLE.customer.name}`, `Welcome, ${PEOPLE.customer.nameEn}`), 'success', 'hand'); });
});
onAct('c-resend', () => { toast(L('اتبعت تاني (محاكاة — مزوّد الرسائل noop)', 'Resent (simulated — SMS provider is noop)'), 'info', 'refresh-cw'); requestRender(); });
onAct('c-social', (d) => { net('social', () => { S.cust.loggedIn = true; S.cust.auth = d.v; S.cust.stage = 'app'; NAVDIR = 'fwd'; toast(L('دخول محاكاة — مش متحقق إن الطريقة دي مبنية', 'Simulated sign-in — method not verified as built'), 'info', 'flask-conical'); }); });
onAct('c-auth-mode', (d) => { S.cust.authMode = d.v; NAVDIR = 'fwd'; requestRender(); });
onAct('c-auth-back', () => { S.cust.authMode = 'phone'; NAVDIR = 'back'; requestRender(); });
onAct('bind:c-su-name', (v) => { S.cust.suName = v; });
onAct('bind:c-su-email', (v) => { S.cust.suEmail = v; });
onAct('bind:c-su-terms', (v) => { S.cust.suTerms = v; S.cust.suErr = null; });
onAct('c-signup', () => {
  const ph = (S.cust.draftPhone || '').replace(/\s/g, '');
  if (!/^01\d{9}$/.test(ph)) { S.cust.phoneErr = L('الرقم لازم يبدأ بـ01 ويكون 11 رقم.', 'Invalid number.'); requestRender(); focusFirstError(); return; }
  if (!S.cust.suTerms) { S.cust.suErr = L('لازم توافق على الشروط الأول.', 'Please accept the terms.'); requestRender(); return; }
  net('signup', () => { S.cust.verifyStep = 1; S.cust.authMode = 'phone'; NAVDIR = 'fwd'; });
});
onAct('c-forgot-send', () => net('forgot', () => { S.cust.forgotSent = true; }));
onAct('c-logout', () => { S.dialog = { title: L('تسجيل الخروج؟', 'Sign out?'), body: L('هترجع لشاشة الدخول (المحاكاة بتفضل محفوظة).', 'You’ll return to sign-in.'), confirm: { label: L('اخرج', 'Sign out'), act: 'c-logout-do' } }; requestRender(); });
onAct('c-logout-do', () => { S.dialog = null; S.cust.stage = 'auth'; S.cust.loggedIn = false; requestRender(); });

/* ---------- browsing ---------- */
onAct('c-tab', (d) => { S.set.role = 'customer'; if (S.cust.stage !== 'app') S.cust.stage = 'app'; setTab('customer', d.tab); requestRender(); });
onAct('c-go', (d, el) => { const p = Object.assign({}, d); delete p.act; const s = p.s; delete p.s; if (s === 'cart' && !S.cust.cart.lines.length) {} go('customer', s, p); requestRender(); });
onAct('c-search-open', () => { setTab('customer', 'explore'); stackOf('customer')[0].focus = true; requestRender(); setTimeout(() => { const i = document.querySelector('.search-input'); if (i) i.focus(); }, 60); });
onAct('bind:c-q', (v) => { S.cust.q = v; requestRender(); });
onAct('c-q-clear', () => { S.cust.q = ''; requestRender(); });
onAct('c-q-set', (d) => { S.cust.q = d.v; if (!S.cust.recent.includes(d.v)) S.cust.recent.unshift(d.v); S.cust.recent = S.cust.recent.slice(0, 5); requestRender(); });
onAct('c-open-cat', (d) => { go('customer', 'cat', { id: d.id }); requestRender(); });
onAct('c-open-merchant', (d) => { S.cust.menuTab = 0; go('customer', 'merchant', { id: d.id }); requestRender(); });
onAct('c-fav', (d) => { const f = S.cust.favorites; const i = f.indexOf(d.id); if (i >= 0) { f.splice(i, 1); toast(L('اتشال من المفضلة', 'Removed from favourites'), 'info', 'heart'); } else { f.push(d.id); toast(L('اتضاف للمفضلة', 'Added to favourites'), 'success', 'heart'); } requestRender(); });
onAct('c-share', () => { toast(L('المشاركة محاكاة', 'Sharing is simulated'), 'info', 'share-2'); requestRender(); });
onAct('c-menu-tab', (d) => { S.cust.menuTab = +d.i; requestRender(); const sec = document.getElementById(d.target); if (sec) sec.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' }); });
onAct('c-sheet', (d) => { openSheet({ kind: d.kind, id: d.id }); requestRender(); });
onAct('c-addr-sheet', () => { openSheet({ kind: 'addr' }); requestRender(); });
onAct('c-addr-pick', (d) => { if (d.v === 'a4') { S.cust.addresses.find((x) => x.id === 'a4') || S.cust.addresses.push(Object.assign({}, OUTSIDE_ADDRESS)); } S.cust.addrId = d.v; closeSheet(); toast(d.v === 'a4' ? L('العنوان ده برّه التغطية', 'Outside coverage') : L('العنوان اتغيّر', 'Address changed'), d.v === 'a4' ? 'warning' : 'success', 'map-pin'); requestRender(); });
onAct('c-addr-new', () => { closeSheet(); S.cust.addrDraft = null; go('customer', 'c_addrForm'); requestRender(); });
onAct('c-addr-del', (d) => {
  if (S.cust.addresses.length <= 1) { toast(L('لازم يفضل عنوان واحد على الأقل', 'Keep at least one address'), 'warning', 'map-pin'); requestRender(); return; }
  const i = S.cust.addresses.findIndex((a) => a.id === d.id); const [rm] = S.cust.addresses.splice(i, 1);
  if (S.cust.addrId === d.id) S.cust.addrId = S.cust.addresses[0].id;
  S.undo = { kind: 'addr', item: rm, i };
  toast(L('العنوان اتمسح', 'Address deleted'), 'info', 'trash-2'); S.toast.undo = true; requestRender();
});
onAct('undo', () => { if (S.undo && S.undo.kind === 'addr') { S.cust.addresses.splice(S.undo.i, 0, S.undo.item); } S.undo = null; S.toast = null; requestRender(); });
onAct('c-reorder', (d) => { const h = PAST[d.id]; S.cust.cart = { mid: h.mid, lines: h.lines.map((l) => ({ pid: l.pid, qty: l.qty, opts: Object.assign(defaultOpts(l.pid), l.opts), note: '', unitSeen: unitPrice(l.pid, Object.assign(defaultOpts(l.pid), l.opts)) })), note: '', promo: '', extra: [] }; go('customer', 'cart'); toast(L('ضفنا نفس الأصناف للسلة', 'Same items added to your cart'), 'success', 'rotate-ccw'); requestRender(); });
onAct('c-reorder-o', (d) => { const o = ord(d.id); S.cust.cart = { mid: o.mid, lines: o.lines.filter((l) => l.state === 'ok' && !l.subFor).map((l) => ({ pid: l.pid, qty: l.qty, opts: l.opts, note: l.note, unitSeen: unitPrice(l.pid, l.opts) })), note: '', promo: '', extra: [] }; setTab('customer', 'home'); go('customer', 'cart'); requestRender(); });

/* ---------- product & cart ---------- */
onAct('c-open-product', (d) => { const p = PR(d.id); if (M(p.m).blocked) return; openSheet({ kind: 'product', pid: d.id, opts: defaultOpts(d.id), qty: 1, note: '', err: null }); requestRender(); });
onAct('c-quick-add', (d) => { const p = PR(d.id); if ((p.groups || []).some((g) => g.req && g.opts.length > 1) || p.custom) { ACT['c-open-product'](d); return; } addToCart(d.id, defaultOpts(d.id), 1, '', null); requestRender(); });
onAct('c-opt', (d) => {
  const sh = S.sheet; const g = PR(sh.pid).groups.find((x) => x.id === d.g);
  if (g.req) sh.opts[g.id] = d.o;
  else { const cur = sh.opts[g.id] || []; const i = cur.indexOf(d.o); if (i >= 0) cur.splice(i, 1); else if (cur.length < (g.max || 9)) cur.push(d.o); else toast(L(`تقدر تختار لحد ${g.max}`, `Up to ${g.max}`), 'warning', 'info'); sh.opts[g.id] = cur; }
  if (sh.err) delete sh.err[g.id];
  requestRender();
});
onAct('c-pqty-', () => { S.sheet.qty = Math.max(1, S.sheet.qty - 1); requestRender(); });
onAct('c-pqty+', () => { const st = stockOf(S.sheet.pid); S.sheet.qty = Math.min(st.left != null ? st.left : 20, S.sheet.qty + 1); requestRender(); });
onAct('bind:c-pnote', (v) => { S.sheet.note = v; });
onAct('c-add', (d, el) => {
  const sh = S.sheet; const p = PR(sh.pid); const err = {};
  (p.groups || []).forEach((g) => { if (g.req && !sh.opts[g.id]) err[g.id] = L('لازم تختار واحد', 'Please choose one'); });
  if (Object.keys(err).length) { sh.err = err; requestRender(); focusFirstError(); return; }
  addToCart(sh.pid, sh.opts, sh.qty, sh.note, el);
  requestRender();
});
function addToCart(pid, opts, qty, note, srcEl) {
  const p = PR(pid); const c = S.cust.cart;
  if (!canOrderFrom(p.m)) { toast(L('المتجر مش بياخد طلبات دلوقتي', 'The store isn’t taking orders now'), 'warning', 'store'); return; }
  if (c.lines.length && c.mid !== p.m) {
    if ((c.extra || []).some((e) => e.mid === p.m)) { const e = c.extra.find((x) => x.mid === p.m); e.lines.push({ pid, qty, opts: deepClone(opts), note, unitSeen: unitPrice(pid, opts) }); closeSheet(); toast(L('اتضاف (محاكاة متعدد المتاجر)', 'Added (multi-store simulation)'), 'info', 'flask-conical'); return; }
    S.pendingAdd = { pid, opts: deepClone(opts), qty, note };
    openSheet({ kind: 'conflict' }); return;
  }
  c.mid = p.m;
  const same = c.lines.find((l) => l.pid === pid && JSON.stringify(l.opts) === JSON.stringify(opts) && l.note === note);
  if (same) same.qty += qty; else c.lines.push({ pid, qty, opts: deepClone(opts), note, unitSeen: unitPrice(pid, opts) });
  closeSheet();
  flyToCart(srcEl);
  toast(L(`اتضاف ${pName(pid)} للسلة`, `${pName(pid)} added`), 'success', 'shopping-bag');
}
onAct('c-conflict', (d) => {
  const pa = S.pendingAdd; const c = S.cust.cart; closeSheet();
  if (d.v === 'new') { S.cust.cart = { mid: PR(pa.pid).m, lines: [], note: '', promo: '', extra: [] }; addToCart(pa.pid, pa.opts, pa.qty, pa.note); }
  else if (d.v === 'multi') { c.extra = c.extra || []; c.extra.push({ mid: PR(pa.pid).m, lines: [{ pid: pa.pid, qty: pa.qty, opts: pa.opts, note: pa.note, unitSeen: unitPrice(pa.pid, pa.opts) }] }); toast(L('محاكاة: السلة فيها متجرين — ده حل مقترح مش مبني', 'Simulation: two stores — a proposal, not built'), 'info', 'flask-conical'); }
  S.pendingAdd = null; requestRender();
});
function lineRef(d) { const c = S.cust.cart; return d.x != null && d.x !== '' ? { arr: c.extra[+d.x].lines, i: +d.i, extra: +d.x } : { arr: c.lines, i: +d.i }; }
onAct('c-line-', (d) => { const r = lineRef(d); const l = r.arr[r.i]; if (l.qty > 1) l.qty -= 1; else { r.arr.splice(r.i, 1); if (r.extra != null && !r.arr.length) S.cust.cart.extra.splice(r.extra, 1); if (!S.cust.cart.lines.length && !(S.cust.cart.extra || []).length) S.cust.cart.mid = null; toast(L('اتشال من السلة', 'Removed from cart'), 'info', 'trash-2'); } requestRender(); });
onAct('c-line+', (d) => { const r = lineRef(d); const l = r.arr[r.i]; const st = stockOf(l.pid); if (st.left != null && l.qty >= st.left) { toast(L(`فاضل ${st.left} بس`, `Only ${st.left} left`), 'warning', 'package'); } else l.qty += 1; requestRender(); });
onAct('c-price-ok', (d) => { const r = lineRef(d); const l = r.arr[r.i]; l.unitSeen = unitPrice(l.pid, l.opts); requestRender(); });
onAct('c-cart-clear', () => { S.dialog = { title: L('تفضّي السلة؟', 'Clear the cart?'), body: L('كل الأصناف هتتشال.', 'All items will be removed.'), confirm: { label: L('فضّي', 'Clear'), act: 'c-cart-clear-do' }, tone: 'danger' }; requestRender(); });
onAct('c-cart-clear-do', () => { S.dialog = null; S.cust.cart = { mid: null, lines: [], note: '', promo: '', extra: [] }; requestRender(); });
onAct('bind:c-cart-note', (v) => { S.cust.cart.note = v; });
onAct('bind:c-promo', (v) => { S.cust.cart.promoDraft = v; S.cust.cart.promoErr = null; });
onAct('c-promo-apply', () => {
  const v = (S.cust.cart.promoDraft != null ? S.cust.cart.promoDraft : '').trim();
  if (!v) { S.cust.cart.promoErr = L('اكتب الكود الأول.', 'Enter a code first.'); }
  else if (v.toUpperCase() !== 'WASALY10') { S.cust.cart.promoErr = L('الكود ده مش شغال. جرّب WASALY10 (تجريبي).', 'Invalid code. Try WASALY10 (demo).'); }
  else { S.cust.cart.promo = 'WASALY10'; S.cust.cart.promoErr = null; toast(L('الخصم اتطبّق', 'Discount applied'), 'success', 'badge-percent'); }
  requestRender();
});

/* ---------- recipient / schedule / payment ---------- */
onAct('c-rcp-mode', (d) => { S.cust.rcp.mode = d.v; requestRender(); });
onAct('bind:c-rcp-name', (v) => { S.cust.rcp.name = v; if (S.cust.rcp.err) delete S.cust.rcp.err.name; });
onAct('bind:c-rcp-phone', (v) => { S.cust.rcp.phone = v; if (S.cust.rcp.err) delete S.cust.rcp.err.phone; });
onAct('bind:c-rcp-notes', (v) => { S.cust.rcp.notes = v; });
onAct('c-rcp-rel', (d) => { S.cust.rcp.rel = d.v; requestRender(); });
onAct('c-rcp-addr', (d) => { S.cust.rcp.addrId = d.v; requestRender(); });
onAct('c-rcp-hide', () => { S.cust.rcp.hidePrice = !S.cust.rcp.hidePrice; requestRender(); });
onAct('c-rcp-payer', (d) => { S.cust.rcp.payer = d.v; requestRender(); });
onAct('c-rcp-save', () => {
  const r = S.cust.rcp; r.err = {};
  if (r.mode === 'other') { if (!r.name.trim()) r.err.name = L('اكتب اسم المستلم.', 'Enter the name.'); if (!/^01\d{9}$/.test((r.phone || '').replace(/[\s•]/g, '')) && !(r.phone || '').includes('•')) r.err.phone = L('رقم غير صحيح (01 + 9 أرقام).', 'Invalid number.'); }
  if (Object.keys(r.err).length) { requestRender(); focusFirstError(); return; }
  goBack('customer'); toast(r.mode === 'other' ? L(`هيوصل لـ${r.name}`, `Will be delivered to ${r.name}`) : L('إنت اللي هتستلم', 'You will receive it'), 'success', 'users'); requestRender();
});
onAct('c-explain', (d) => { openSheet({ kind: 'explain', k: d.k }); requestRender(); });
onAct('c-sched', (d) => { if (d.v === 'now') S.cust.schedule = null; else S.cust.schedule = S.cust.schedule || { day: 'tomorrow', time: '18:00' }; requestRender(); });
onAct('c-sched-sim', () => { S.cust.schedSim = true; S.cust.schedule = { day: 'tomorrow', time: '18:00' }; toast(L('وضع محاكاة لحل مقترح — الجدولة مش متاحة فعلًا', 'Simulating a proposal — scheduling is not available'), 'info', 'flask-conical'); requestRender(); });
onAct('change:c-sched-day', (v) => { S.cust.schedule.day = v; requestRender(); });
onAct('change:c-sched-time', (v) => { S.cust.schedule.time = v; requestRender(); });
onAct('c-pay', (d) => { S.cust.pay = d.v; requestRender(); });
onAct('c-payfail', () => { S.cust.payFail = !S.cust.payFail; requestRender(); });
onAct('c-payghost', () => { S.cust.payGhost = !S.cust.payGhost; requestRender(); });
onAct('c-cashnote', (d) => { S.cust.cashNote = d.v; requestRender(); });

/* ---------- place order ---------- */
onAct('c-place', () => {
  const c = S.cust.cart; if (!c.lines.length) return;
  const place = () => {
    if (S.cust.pay === 'card' && S.cust.payFail) {
      S.dialog = { title: L('الدفع ما نجحش', 'Payment failed'), body: L('ما اتعملش أي طلب، ولو فيه مبلغ اتحجز هيرجع بنفس الوسيلة. تقدر تدفع كاش بدل كده.', 'No order was created. Any hold is released to the same method. You can pay cash instead.'), confirm: { label: L('ادفع كاش', 'Pay cash'), act: 'c-switch-cash' }, tone: 'danger', anno: 'c-card-notbuilt' };
      return;
    }
    if (S.cust.pay === 'card' && S.cust.payGhost) {
      S.ghostCharge = { at: now(), amount: cartTotals().total };
      S.dialog = { title: L('الطلب ما اتأكدش', 'Order not confirmed'), body: L('حصلت مشكلة وإحنا بنأكد الطلب. لو وصلتك رسالة خصم من البنك، ما تقلقش: هنراجع سجل الدفع ونرجّع أي مبلغ بنفس الوسيلة.', 'Something failed while confirming. If your bank shows a charge, we will check and refund it to the same method.'), confirm: { label: L('بلّغ الدعم', 'Tell support'), act: 'c-ghost-report' }, tone: 'danger' };
      return;
    }
    const multi = (c.extra || []).length ? deepClone(c.extra) : null;
    const t = cartTotals(c);
    const o = makeOrder({ mid: c.mid, lines: c.lines, pay: S.cust.pay, cashNote: S.cust.cashNote, rcp: S.cust.rcp.mode === 'other' ? deepClone(S.cust.rcp) : { mode: 'self' }, addrId: S.cust.rcp.mode === 'other' ? S.cust.rcp.addrId : S.cust.addrId, disc: t.disc, note: c.note, script: { captain: 'k1' } });
    if (multi) { o.sim.proposed = true; o.multi = multi.map((e) => { const sub = makeOrder({ mid: e.mid, lines: e.lines, pay: S.cust.pay, cashNote: 'exact', rcp: o.rcp, addrId: o.addrId, script: {} }); sub.parent = o.id; return sub.id; }); tl(o, { ev: 'multi', actor: 'sim', note: L('محاكاة: طلب متعدد المتاجر — كل متجر طلب فرعي بحالته', 'Simulation: multi-store — each store is a sub-order'), kind: 'sim' }); }
    if (S.cust.schedule) { o.sim.proposed = true; o.scheduled = deepClone(S.cust.schedule); tl(o, { ev: 'scheduled', actor: 'sim', note: L('محاكاة: طلب مجدول — مفيش حجز طاقة في النظام', 'Simulation: scheduled — no capacity reservation exists'), kind: 'sim' }); }
    S.active = o.id; S.cust.cart = { mid: null, lines: [], note: '', promo: '', extra: [] }; S.cust.schedule = null;
    const st = stackOf('customer'); st.splice(1); st.push({ s: 'confirm', id: o.id }); NAVDIR = 'fwd';
    setTimeout(() => { const top = topOf('customer'); if (top.s === 'confirm' && top.id === o.id) { top.s = 'track'; NAVDIR = 'fwd'; requestRender(); } }, 2600);
  };
  net('place', place, { onTimeout: () => {
    // the ambiguous case: the server DID create the order but the reply was lost
    place(); const created = S.active; const st = stackOf('customer'); st.pop(); NAVDIR = 'none';
    S.dialog = { title: L('مش متأكدين إن الطلب اتبعت', 'Not sure the order went through'), body: L('الاتصال قطع قبل ما يوصلنا رد. قبل ما تبعت تاني، بص على «طلباتي».', 'The connection dropped before we got a reply. Check “My orders” before retrying.'), confirm: { label: L('افتح طلباتي', 'Open my orders'), act: 'c-open-orders' }, cancel: { label: L('ابعت تاني', 'Send again'), act: 'c-place-dup' }, anno: 'c-confirm-idempotency', created };
  } });
});
onAct('c-open-orders', () => { S.dialog = null; setTab('customer', 'orders'); requestRender(); });
onAct('c-place-dup', () => {
  const orig = ord(S.dialog && S.dialog.created); S.dialog = null;
  if (orig) { const dup = makeOrder({ mid: orig.mid, lines: orig.lines, pay: orig.pay.method, cashNote: orig.pay.note, rcp: orig.rcp, addrId: orig.addrId, script: {} }); tl(dup, { ev: 'duplicate', actor: 'system', note: L(`طلب مكرر لـ${orig.id} — مفيش مفتاح منع تكرار`, `Duplicate of ${orig.id} — no idempotency key`), kind: 'warn' }); toast(L('اتعمل طلب مكرر — ده بالظبط الخطر INC-0018', 'A duplicate order was created — risk INC-0018'), 'danger', 'copy'); }
  setTab('customer', 'orders'); requestRender();
});
onAct('c-switch-cash', () => { S.dialog = null; S.cust.pay = 'cash'; S.cust.payFail = false; requestRender(); });
onAct('c-ghost-report', () => {
  S.dialog = null;
  const t = ticketCreate({ orderId: null, kind: 'payment', prio: 'now', by: 'customer', text: L(`اتخصم مني ${money(S.ghostCharge.amount)} والطلب ما اتأكدش`, `Charged ${money(S.ghostCharge.amount)} but no order`) });
  ticketLog(t, 'system', L('لازم نراجع سجل الدفع الأول قبل أي وعد (INC-0016).', 'Check the payment record first (INC-0016).'), 'note');
  S.cust.lastTicket = t.id; go('customer', 'ticket', { id: t.id }); requestRender();
});
onAct('c-track', (d) => { S.active = d.id; const st = stackOf('customer'); const top = st[st.length - 1]; if (!(top.s === 'track' && top.id === d.id)) go('customer', 'track', { id: d.id }); requestRender(); });

/* ---------- live order ---------- */
onAct('c-zoom', (d) => { const z = S.cust.mapZoom || 1; S.cust.mapZoom = d.d === '0' ? 1 : clamp(z * (d.d === '1' ? 1.4 : 1 / 1.4), 0.7, 3.2); requestRender(); });
onAct('c-call', (d) => {
  const o = ord(d.id); const answered = !(o && o.door && o.door.mode === 'no_answer');
  openSheet({ kind: 'call', to: d.to, name: d.to === 'captain' ? kName(o.kid) : L('خدمة العملاء', 'Support'), state: 'ringing' }); requestRender();
  if (o) callLog(o, 'customer', d.to, answered ? L('رد', 'answered') : L('مفيش رد', 'no answer'));
  setTimeout(() => { if (S.sheet && S.sheet.kind === 'call') { S.sheet.state = answered ? 'connected' : 'noanswer'; requestRender(); } }, 1600);
});
onAct('c-chat', (d) => { chatThread(d.th, [d.me || 'customer', d.with]); openSheet({ kind: 'chat', th: d.th, with: d.with, me: d.me || 'customer' }); requestRender(); });
onAct('bind:chat-draft', (v) => { S.chatDraft = v; });
onAct('chat-send', (d) => { const v = (S.chatDraft || '').trim(); if (!v) return; chatSend(d.th, d.me, v); S.chatDraft = ''; requestRender(); });
onAct('chat-quick', (d) => { chatSend(d.th, d.me, d.v); requestRender(); });
onAct('c-cancel', (d) => { openSheet({ kind: 'cancel', id: d.id }); requestRender(); });
onAct('c-cancel-why', (d) => { S.cust.cancelWhy = d.v; requestRender(); });
onAct('c-cancel-do', (d) => { const o = ord(d.id); const r = cancelRuling(o); net('cancel', () => { cancelOrder(o, 'customer', L(`العميل ألغى${S.cust.cancelWhy ? ' — ' + S.cust.cancelWhy : ''} (${r.ar})`, `Customer cancelled (${r.en})`)); closeSheet(); toast(L('الطلب اتلغى — مفيش أي رسوم', 'Order cancelled — no charge'), 'success', 'circle-check'); }); });
onAct('c-cancel-sim', (d) => { const o = ord(d.id); closeSheet(); o.sim.proposed = true; cancelOrder(o, 'support', L('محاكاة الخيار 1: إلغاء كامل بلا خصم أثناء التحضير — مش قرار معتمد', 'Simulated option 1 — not an approved decision'), { simulated: true }); toast(L('محاكاة لحل مقترح — مش قرار معتمد', 'Simulated proposal — not an approved decision'), 'info', 'flask-conical'); requestRender(); });
onAct('c-handover', (d) => { const o = ord(d.id); net('handover', () => { customerHandover(o, { given: cashGiven(o) }); toast(L('تمام — الكابتن هيأكد التسليم', 'OK — the captain will confirm'), 'success', 'check'); }); });
onAct('c-door', (d) => { if (d.v === 'refuse') { openSheet({ kind: 'refuse', id: d.id }); requestRender(); return; } const o = ord(d.id); SCN_RUNTIME.doorEvent(o, d.v); requestRender(); });
onAct('bind:c-refuse-words', (v) => { S.cust.refuseWords = v; });
onAct('c-refuse-do', (d) => { const o = ord(d.id); closeSheet(); o.script.words = (S.cust.refuseWords || '').trim() || L('مش عايزه', 'I don’t want it'); SCN_RUNTIME.doorEvent(o, 'refuse'); requestRender(); });
onAct('c-sub', (d) => { const o = ord(d.id); SCN_RUNTIME.subChoice(o, d.v, d.pid); toast(d.v === 'cancel' ? L('الطلب اتلغى — رد كامل', 'Cancelled — full refund') : L('تمام، بلّغنا المتجر', 'Done — the store was told'), 'success', 'check'); requestRender(); });
onAct('c-late', (d) => { SCN_RUNTIME.lateChoice(ord(d.id), d.v); requestRender(); });
onAct('c-nothome', (d) => { SCN_RUNTIME.notHomeChoice(ord(d.id), d.v === 'no' ? 'wait' : d.v); requestRender(); });

/* ---------- after delivery ---------- */
onAct('c-star', (d) => { S.cust.rateDraft.stars = +d.v; requestRender(); });
onAct('c-rtag', (d) => { const t = S.cust.rateDraft.tags; const i = t.indexOf(d.v); if (i >= 0) t.splice(i, 1); else t.push(d.v); requestRender(); });
onAct('bind:c-rtext', (v) => { S.cust.rateDraft.text = v; });
onAct('c-tip', (d) => { S.cust.rateDraft.tip = +d.v; requestRender(); });
onAct('c-rate-submit', (d) => { const o = ord(d.id); const r = S.cust.rateDraft; net('rate', () => { o.rating = { stars: r.stars, tags: r.tags.slice(), text: r.text }; if (r.tip) { o.tip = r.tip; const c = S.captains[o.kid]; c.earned += r.tip; c.tips += r.tip; tl(o, { ev: 'tip', actor: 'customer', note: L(`بقشيش ${money(r.tip)} — كله للكابتن`, `Tip ${money(r.tip)} — all to the captain`) }); } S.cust.rateDraft = null; goBack('customer'); toast(L('شكرًا على تقييمك', 'Thanks for rating'), 'success', 'star'); }); });

/* ---------- support ---------- */
onAct('c-issue', (d) => {
  const o = d.id ? ord(d.id) : null;
  if (['missing', 'wrong', 'damaged', 'food_safety'].includes(d.k) && o) { S.cust.cmpDraft = { kind: d.k, item: o.lines[0].pid, text: '', photo: false }; go('customer', 'complaint', { id: o.id, k: d.k }); requestRender(); return; }
  if (d.k === 'cancel' && o) { openSheet({ kind: 'cancel', id: o.id }); requestRender(); return; }
  if (d.k === 'late' && o) { const t = ticketCreate({ orderId: o.id, kind: 'late', prio: 'today', by: 'customer', text: L('الطلب متأخر', 'Order is late') }); go('customer', 'ticket', { id: t.id }); requestRender(); return; }
  if (d.k === 'address' && o) { toast(L('تغيير العنوان بعد الخروج بيعدّي على العمليات وبيتسجل ويتسعّر من جديد (9-3)', 'Address change after dispatch goes via ops'), 'info', 'map-pin'); requestRender(); return; }
  const t = ticketCreate({ orderId: o ? o.id : null, kind: d.k === 'cash_diff' ? 'cash_diff' : d.k === 'captain' ? 'captain' : d.k === 'payment' ? 'payment' : 'other', prio: d.k === 'captain' ? 'today' : 'next', by: 'customer', text: L('العميل فتح شكوى', 'Customer opened a ticket') });
  go('customer', 'ticket', { id: t.id }); requestRender();
});
onAct('c-cmp-item', (d) => { S.cust.cmpDraft.item = d.v; requestRender(); });
onAct('bind:c-cmp-text', (v) => { S.cust.cmpDraft.text = v; });
onAct('c-cmp-photo', () => { S.cust.cmpDraft.photo = !S.cust.cmpDraft.photo; requestRender(); });
onAct('c-cmp-send', (d) => {
  const o = ord(d.id); const cd = S.cust.cmpDraft;
  net('cmp', () => {
    const line = o.lines.find((l) => l.pid === cd.item) || o.lines[0];
    const t = ticketCreate({ orderId: o.id, kind: cd.kind, prio: cd.kind === 'food_safety' ? 'now' : 'today', by: 'customer', text: cd.text || ticketKindLabel(cd.kind), item: line.pid });
    if (cd.photo) t.evidence.push({ kind: 'photo', note: L('صورة من العميل (محاكاة)', 'Customer photo (simulated)') });
    o.complaint = { kind: cd.kind, ticket: t.id, pid: line.pid, at: now() };
    if (cd.kind === 'food_safety') SCN_RUNTIME.complaint(o, 'food_safety');
    ticketLog(t, 'support', L('وصلتنا شكوتك برقم مرجعي. هنرجّعلك حقك الأول، وبعدين نشوف حصل إزاي.', 'Received with a reference number. We fix it first, then investigate.'), 'msg');
    S.cust.cmpDraft = null; const st = stackOf('customer'); st.pop(); go('customer', 'ticket', { id: t.id });
    toast(L(`اتبعتت — رقمها ${t.id}`, `Sent — ref ${t.id}`), 'success', 'ticket');
  });
});
onAct('c-t-close', (d) => { const t = S.tickets[d.id]; t.status = 'closed'; ticketLog(t, 'customer', L('العميل قفل الشكوى', 'Customer closed the ticket'), 'status'); requestRender(); });
onAct('c-t-reopen', (d) => { const t = S.tickets[d.id]; t.status = 'reopened'; ticketLog(t, 'customer', L('العميل فتح الشكوى تاني', 'Customer reopened'), 'status'); requestRender(); });
onAct('c-t-appeal', (d) => { const t = S.tickets[d.id]; t.status = 'appeal'; ticketLog(t, 'customer', L('العميل قدّم تظلّم — لازم يراجعه حد غير اللي قرر (ولو مفيش، يتقال له).', 'Appeal filed — must be reviewed by someone else.'), 'status'); toast(L('التظلّم اتسجل', 'Appeal filed'), 'info', 'scale'); requestRender(); });
onAct('c-faq', (d, el, ev) => { ev.preventDefault(); S.cust.faqOpen = S.cust.faqOpen === +d.i ? null : +d.i; requestRender(); });
onAct('c-notifs-read', () => { S.notifs.customer.forEach((n) => { n.read = true; }); S.unread.customer = 0; requestRender(); });
onAct('c-pref', (d) => { S.cust.notifPrefs[d.k] = !S.cust.notifPrefs[d.k]; requestRender(); });
onAct('c-privacy', (d) => { S.cust.privacy[d.k] = !S.cust.privacy[d.k]; requestRender(); });
onAct('c-data-req', (d) => { net('data', () => { S.cust.dataReq = d.v; ticketCreate({ orderId: null, kind: 'data', prio: 'routine', by: 'customer', text: d.v === 'delete' ? L('طلب مسح حساب', 'Account deletion request') : L('طلب نسخة من البيانات', 'Data export request') }); }); });

/* ---------- small effects ---------- */
function flyToCart(srcEl) {
  if (prefersReduced() || !srcEl) return;
  const target = document.querySelector('.cartbar, .tab[data-tab="home"]'); if (!target) return;
  const a = srcEl.getBoundingClientRect(), b = target.getBoundingClientRect();
  const dot = document.createElement('div'); dot.className = 'fly-dot'; document.body.appendChild(dot);
  dot.style.left = a.left + a.width / 2 + 'px'; dot.style.top = a.top + 'px';
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top - a.top;
  dot.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx / 2}px, ${dy / 2 - 60}px) scale(.8)`, opacity: 0.9 }, { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0 }], { duration: 460, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = () => dot.remove();
}
function focusFirstError() { setTimeout(() => { const el = document.querySelector('.has-error input, .has-error textarea, .has-error select, .has-error .opt, .field .err'); if (el) { const f = el.closest('.field, .ogroup'); (f && f.querySelector('input, textarea, select, button') || el).focus(); } }, 30); }
const prefersReduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
