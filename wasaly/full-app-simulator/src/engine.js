/* ==========================================================================
   engine.js — ONE shared world. Every role reads and writes the same state.
   Order lifecycle follows the manual's §51 path (the code's own state names
   are not reproduced in the manual, so labels here are descriptive):
     placed → accepted → preparing → ready → picked_up → in_transit → delivered → completed
     cancelled (by customer / merchant / ops)
   Proposed states that DO NOT exist in the system are only reachable through
   "simulate a proposed solution" and are flagged o.sim.proposed = true:
     failed_delivery · on_hold · reattempt
   ========================================================================== */
const SCHEMA = 8;
const ROLES = ['customer', 'recipient', 'merchant', 'captain', 'support', 'ops', 'finance', 'admin', 'risk'];
const ROLE_META = {
  customer: { ar: 'تجربة العميل', sar: 'العميل', en: 'Customer', icon: 'user-round', device: 'phone' },
  merchant: { ar: 'تجربة التاجر', sar: 'التاجر', en: 'Merchant', icon: 'store', device: 'phone' },
  recipient: { ar: 'تجربة المستلم', sar: 'المستلم', en: 'Recipient', icon: 'gift', device: 'phone' },
  captain: { ar: 'تجربة الكابتن', sar: 'الكابتن', en: 'Captain', icon: 'bike', device: 'phone' },
  support: { ar: 'خدمة العملاء', sar: 'الدعم', en: 'Support', icon: 'headset', device: 'desk' },
  ops: { ar: 'العمليات', sar: 'العمليات', en: 'Operations', icon: 'radar', device: 'desk' },
  finance: { ar: 'المالية', sar: 'المالية', en: 'Finance', icon: 'calculator', device: 'desk' },
  admin: { ar: 'الإدارة', sar: 'الإدارة', en: 'Admin', icon: 'user-cog', device: 'desk' },
  risk: { ar: 'المخاطر', sar: 'المخاطر', en: 'Risk', icon: 'shield-alert', device: 'desk' },
};
const STATUS_META = {
  placed: { ar: 'مستني قبول المتجر', en: 'Waiting for the store', tone: 'info', step: 1 },
  accepted: { ar: 'المتجر قبل الطلب', en: 'Store accepted', tone: 'info', step: 2 },
  preparing: { ar: 'بيتحضّر', en: 'Being prepared', tone: 'info', step: 3 },
  ready: { ar: 'جاهز ومستني الكابتن', en: 'Ready for pickup', tone: 'info', step: 4 },
  picked_up: { ar: 'الكابتن استلم الطلب', en: 'Picked up', tone: 'info', step: 5 },
  in_transit: { ar: 'في الطريق ليك', en: 'On the way', tone: 'info', step: 6 },
  delivered: { ar: 'اتسلّم', en: 'Delivered', tone: 'success', step: 7 },
  completed: { ar: 'مكتمل', en: 'Completed', tone: 'success', step: 8 },
  cancelled: { ar: 'اتلغى', en: 'Cancelled', tone: 'danger', step: 0 },
  failed_delivery: { ar: 'تعذّر التسليم (حالة مقترحة)', en: 'Failed delivery (proposed state)', tone: 'danger', step: 0, proposed: true },
  on_hold: { ar: 'معلّق مؤقتًا (حالة مقترحة)', en: 'On hold (proposed state)', tone: 'warning', step: 0, proposed: true },
  reattempt: { ar: 'إعادة محاولة (حالة مقترحة)', en: 'Re-attempt (proposed state)', tone: 'warning', step: 6, proposed: true },
};
const ACTIVE_ST = ['placed', 'accepted', 'preparing', 'ready', 'picked_up', 'in_transit', 'on_hold', 'reattempt'];

/* ------------------------------------------------------------ fresh state */
function freshState(keep) {
  const set = Object.assign({ theme: 'system', lang: 'ar', review: false, device: '390', role: 'customer', speed: 1, paused: false, network: 'good', gps: 'accurate', autopilot: true, panel: 'state', sideOpen: true, mobileSheet: null }, keep || {});
  const merchants = {}; Object.keys(MERCHANTS).forEach((id) => { merchants[id] = { status: MERCHANTS[id].blocked ? 'closed' : 'open', stock: {}, price: {} }; });
  const captains = {}; Object.values(CAPTAINS).forEach((k) => { const n = MAP.nodes[k.start]; captains[k.id] = { status: 'online', node: k.start, x: n.x, y: n.y, custody: 0, earned: 0, tips: 0, trips: 0, change: 200, deposits: [], lastFix: 0 }; });
  return {
    v: SCHEMA, set,
    clock: { t: 0 },
    sys: { outage: false },
    cust: { stage: 'splash', onb: 0, perm: 'unknown', loggedIn: false, auth: null, verifyStep: 0, addresses: deepClone(ADDRESSES), addrId: 'a1', favorites: ['m1'], cart: { mid: null, lines: [], note: '', promo: '', extra: [] }, rcp: { mode: 'self', name: '', phone: '', rel: 'أم', hidePrice: true, payer: 'buyer', notes: '', addrId: 'a3' }, pay: 'cash', cashNote: 'exact', schedule: null, recent: ['كشري', 'بيتزا'], notifPrefs: { orders: true, offers: false }, privacy: { shareLoc: true } },
    nav: {
      customer: { tab: 'home', stacks: { home: [{ s: 'home' }], explore: [{ s: 'explore' }], orders: [{ s: 'orders' }], assistant: [{ s: 'assistant' }], account: [{ s: 'account' }] } },
      merchant: { tab: 'orders', stacks: { orders: [{ s: 'm_orders' }], catalog: [{ s: 'm_catalog' }], money: [{ s: 'm_money' }], store: [{ s: 'm_store' }] }, loggedIn: false, mid: 'm1' },
      captain: { tab: 'home', stacks: { home: [{ s: 'k_home' }], trips: [{ s: 'k_trips' }], earnings: [{ s: 'k_earn' }], custody: [{ s: 'k_custody' }], account: [{ s: 'k_account' }] }, loggedIn: false, kid: 'k1' },
      recipient: { tab: 'home', stacks: { home: [{ s: 'r_home' }] } },
      support: { view: 'tickets', sel: null }, ops: { view: 'live', sel: null }, finance: { view: 'orders', sel: null }, admin: { view: 'flags', sel: null }, risk: { view: 'signals', sel: null },
    },
    sheet: null, dialog: null, drawer: null,
    merchants, captains,
    orders: {}, seq: 10427, active: null, history: ['WS-10311', 'WS-10388'],
    tickets: {}, tseq: 3100,
    notifs: { customer: [], recipient: [], merchant: [], captain: [], support: [], ops: [], finance: [], admin: [], risk: [] },
    unread: { customer: 0, recipient: 0, merchant: 0, captain: 0, support: 0, ops: 0, finance: 0, admin: 0, risk: 0 },
    riskCases: [],
    chats: {},
    audit: [], opsLog: [],
    flags: { multiStore: false, scheduled: false, pharmacy: false, cardPay: false, wallet: false, instapay: false, balance: false, sms: 'noop', acceptanceTracking: false, failedState: false, podChecklist: false, maskedCalls: false, autoRestrict: false },
    scenario: { id: null, startedAt: null, log: [] },
    review: { open: null, center: false, filter: 'all', group: 'area', q: '' },
    toast: null, busy: {},
  };
}

let S = freshState();
const PAST = {
  'WS-10311': { id: 'WS-10311', mid: 'm2', when: 'من أسبوع', whenEn: 'Last week', total: 125, items: 'بيتزا مارجريتا · مشروب غازي', itemsEn: 'Margherita pizza · Soft drink', lines: [{ pid: 'p201', qty: 1, opts: { size: 'm' } }, { pid: 'p205', qty: 1, opts: {} }] },
  'WS-10388': { id: 'WS-10388', mid: 'm3', when: 'من 3 أيام', whenEn: '3 days ago', total: 50, items: 'عيش بلدي · كرواسون', itemsEn: 'Baladi bread · Croissant', lines: [{ pid: 'p301', qty: 1, opts: {} }, { pid: 'p303', qty: 1, opts: {} }] },
};

/* ------------------------------------------------------------ persistence */
let saveTimer = null;
const snapshot = () => Object.assign({}, S, { toast: null, busy: {}, dialog: null });
/* throttled (not debounced): the render loop runs every 250 ms, a debounce would never fire */
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; Store.save(snapshot()); }, 600);
}
function flushPersist() { clearTimeout(saveTimer); saveTimer = null; Store.save(snapshot()); }
try {
  window.addEventListener('pagehide', flushPersist);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPersist(); });
} catch (e) { /* non-browser */ }
function restore() {
  const saved = Store.load();
  if (saved && saved.v === SCHEMA) { S = Object.assign(freshState(), saved, { toast: null, busy: {}, dialog: null }); return true; }
  if (saved && saved.set) { S = freshState(saved.set); return false; }
  return false;
}
function resetSimulation(keepSettings = true) {
  const keep = keepSettings ? { theme: S.set.theme, lang: S.set.lang, device: S.set.device, review: S.set.review } : undefined;
  S = freshState(keep);
  Store.clear();
  flushPersist();
}

/* ------------------------------------------------------------ helpers */
const now = () => S.clock.t;
const M = (id) => MERCHANTS[id];
const PR = (id) => PRODUCTS[id];
const K = (id) => CAPTAINS[id];
const ord = (id) => S.orders[id];
const activeOrder = () => (S.active && S.orders[S.active]) || null;
const addrOf = (o) => (S.cust.addresses.find((a) => a.id === (o.addrId)) || S.cust.addresses[0]);
const custAddr = () => (S.cust.addresses.find((a) => a.id === S.cust.addrId) || S.cust.addresses[0]);
const mName = (id) => (LANG === 'en' ? M(id).nameEn : M(id).name);
const pName = (id) => (LANG === 'en' ? PR(id).en : PR(id).ar);
const kName = (id) => (id ? (LANG === 'en' ? K(id).nameEn : K(id).name) : '');
const isActive = (o) => o && ACTIVE_ST.includes(o.st);
/* who stands at the door: the recipient when the buyer ordered for someone else */
const doorRole = (o) => (o.rcp && o.rcp.mode === 'other' ? 'recipient' : 'customer');
const userRole = () => S.set.role;

function unitPrice(pid, opts) {
  const p = PR(pid); let price = (S.merchants[p.m].price[pid] != null ? S.merchants[p.m].price[pid] : p.price);
  (p.groups || []).forEach((g) => {
    const v = opts && opts[g.id];
    if (g.req) { const o = g.opts.find((x) => x.id === v); if (o) price += o.d; }
    else if (Array.isArray(v)) v.forEach((id) => { const o = g.opts.find((x) => x.id === id); if (o) price += o.d; });
  });
  return price;
}
function optsLabel(pid, opts) {
  const p = PR(pid); const parts = [];
  (p.groups || []).forEach((g) => {
    const v = opts && opts[g.id];
    if (g.req) { const o = g.opts.find((x) => x.id === v); if (o) parts.push(L(o.ar, o.en)); }
    else if (Array.isArray(v)) v.forEach((id) => { const o = g.opts.find((x) => x.id === id); if (o) parts.push(L(o.ar, o.en)); });
  });
  return parts.join(' · ');
}
function stockOf(pid) {
  const p = PR(pid); const st = S.merchants[p.m].stock[pid];
  if (st === 'out') return { out: true };
  if (st != null && typeof st === 'number') return { left: st, out: st <= 0 };
  if (p.stock != null) return { left: p.stock, out: p.stock <= 0 };
  return {};
}

/* ------------------------------------------------------------ notifications, audit, toasts */
function notify(role, n) {
  const item = Object.assign({ id: uid('n'), t: now(), read: false }, n);
  S.notifs[role].unshift(item); S.notifs[role] = S.notifs[role].slice(0, 40);
  S.unread[role] = (S.unread[role] || 0) + 1;
  if (userRole() === role && !n.silent) toast(n.title, n.tone || 'info', n.icon);
}
function toast(text, tone = 'info', icon) { S.toast = { id: uid('t'), text, tone, icon, at: Date.now() }; }
function audit(who, what, detail) { S.audit.unshift({ t: now(), who, what, detail }); S.audit = S.audit.slice(0, 80); }
function tl(o, ev) { o.tl.push(Object.assign({ t: now() }, ev)); }

/* ------------------------------------------------------------ pricing */
function cartTotals(cart) {
  const c = cart || S.cust.cart;
  const sub = c.lines.reduce((s, l) => s + unitPrice(l.pid, l.opts) * l.qty, 0);
  const extraSub = (c.extra || []).reduce((s, e) => s + e.lines.reduce((a, l) => a + unitPrice(l.pid, l.opts) * l.qty, 0), 0);
  const mids = [c.mid].concat((c.extra || []).map((e) => e.mid)).filter(Boolean);
  const del = mids.reduce((s, id) => s + (M(id).fee || 0), 0);
  const svc = ECON.serviceFee;
  let disc = 0;
  if ((c.promo || '').toUpperCase() === 'WASALY10') disc = Math.min(30, Math.round((sub + extraSub) * 0.1));
  return { sub: sub + extraSub, del, svc, disc, total: sub + extraSub + del + svc - disc, mids };
}

/* ------------------------------------------------------------ order creation */
function makeOrder(p) {
  const id = 'WS-' + (++S.seq);
  const lines = p.lines.map((l) => ({ pid: l.pid, qty: l.qty, opts: l.opts || {}, note: l.note || '', unit: unitPrice(l.pid, l.opts || {}), state: 'ok' }));
  const sub = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const m = M(p.mid);
  const del = p.del != null ? p.del : m.fee;
  const disc = p.disc || 0;
  const total = sub + del + ECON.serviceFee - disc;
  const rcp = p.rcp || { mode: 'self' };
  const o = {
    id, mid: p.mid, lines, sub, del, svc: ECON.serviceFee, disc, total,
    pay: { method: p.pay || 'cash', state: p.pay === 'card' ? 'authorized_sim' : 'cod_pending', note: p.cashNote || 'exact', payer: rcp.payer || 'buyer', collected: null },
    rcp, addrId: p.addrId || S.cust.addrId, note: p.note || '',
    st: 'placed', stAt: { placed: now() }, placedAt: now(),
    tl: [], pending: [], inc: [], gate: null, tickets: [], calls: [],
    kid: null, offer: null, offers: [], cap: null,
    prep: p.prep || m.prep, eta: null, promise: null,
    code: String(1000 + Math.floor(Math.random() * 9000)),
    refund: null, rating: null, tip: 0,
    scn: p.scn || null, script: p.script || {}, sim: { proposed: false, option: null }, label: null, fate: null, flags: p.flags || {},
  };
  const route = MAP.route(m.node, addrOf(o).node);
  const tripMin = MAP.minutes(MAP.lengthOf(route));
  const lo = Math.round((o.prep + 4 + tripMin) / 5) * 5, hi = lo + 15;
  o.promise = { lo, hi, at: now() };
  S.orders[id] = o;
  tl(o, { st: 'placed', actor: 'customer', note: L('العميل أكّد الطلب', 'Customer confirmed the order') });
  addPending(o, 'm_accept', 'merchant', 1.2);
  o.timers = { mCall: now() + 3, mTimeout: now() + 5 };
  notify('merchant', { title: L(`طلب جديد ${id}`, `New order ${id}`), body: `${money(o.sub)} · ${lines.length} ${L('أصناف', 'items')}`, icon: 'bell-ring', tone: 'brand', orderId: id });
  notify('customer', { title: L('طلبك اتبعت للمتجر — مستنيين يقبله', 'Order sent — waiting for the store'), icon: 'receipt-text', orderId: id, silent: true });
  audit('system', 'order.create', id);
  return o;
}

/* ------------------------------------------------------------ pending actions (who has to act next) */
function addPending(o, kind, role, delay = 0, data = {}) {
  o.pending = o.pending.filter((a) => a.kind !== kind);
  o.pending.push(Object.assign({ id: uid('a'), kind, role, due: now() + delay }, data));
}
const dropPending = (o, kind) => { o.pending = o.pending.filter((a) => a.kind !== kind); };
const hasPending = (o, kind) => o.pending.some((a) => a.kind === kind);
const pendingFor = (role) => Object.values(S.orders).flatMap((o) => o.pending.filter((a) => a.role === role).map((a) => ({ o, a })));

/* ------------------------------------------------------------ transitions */
function setSt(o, st, actor, note) {
  o.st = st; o.stAt[st] = now();
  tl(o, { st, actor, note });
  if (typeof SCN_RUNTIME !== 'undefined') SCN_RUNTIME.on(o, 'st:' + st);
}
function merchantAccept(o, prep) {
  if (o.st !== 'placed') return;
  if (prep) o.prep = prep;
  dropPending(o, 'm_accept'); o.timers.mCall = null; o.timers.mTimeout = null;
  setSt(o, 'accepted', 'merchant', L(`المتجر قبل — وقت التحضير ${o.prep} دقيقة`, `Store accepted — prep ${o.prep} min`));
  addPending(o, 'm_start', 'merchant', 0.8);
  notify('customer', { title: L(`${mName(o.mid)} قبل طلبك`, `${mName(o.mid)} accepted your order`), icon: 'check', tone: 'success', orderId: o.id });
}
function merchantStart(o) {
  if (o.st !== 'accepted') return;
  dropPending(o, 'm_start');
  setSt(o, 'preparing', 'merchant', L('بدأ التحضير', 'Preparation started'));
  const busyExtra = S.merchants[o.mid].status === 'busy' ? 10 : 0;
  o.readyAt = now() + o.prep + busyExtra;
  addPending(o, 'm_ready', 'merchant', o.prep + busyExtra);
  o.timers.dispatch = now() + Math.max(1, o.prep + busyExtra - 7);
  notify('customer', { title: L('المطبخ بدأ يحضّر طلبك', 'The kitchen started your order'), icon: 'chef-hat', orderId: o.id, silent: userRole() !== 'customer' });
}
function merchantReject(o, reason) {
  if (!['placed'].includes(o.st)) return;
  o.pending = [];
  setSt(o, 'cancelled', 'merchant', L(`المتجر رفض: ${reason}`, `Store declined: ${reason}`));
  o.cancel = { by: 'merchant', reason, fee: 0 };
  notify('customer', { title: L('المتجر مقدرش ياخد طلبك — مفيش أي رسوم عليك', 'The store could not take your order — no charge'), icon: 'circle-x', tone: 'danger', orderId: o.id });
  settleCancelMoney(o);
}
function merchantReady(o) {
  if (o.st !== 'preparing') return;
  dropPending(o, 'm_ready');
  setSt(o, 'ready', 'merchant', L('الطلب جاهز', 'Order ready'));
  if (o.cap && o.cap.phase === 'at_merchant') addPending(o, 'k_pickup', 'captain', 0.5);
  if (o.kid) notify('captain', { title: L(`طلب ${o.id} جاهز للاستلام`, `${o.id} is ready for pickup`), icon: 'package-check', orderId: o.id, silent: userRole() !== 'captain' });
}

/* ------------------------------------------------------------ dispatch */
function availableCaptains(exclude = []) {
  return Object.keys(S.captains).filter((k) => S.captains[k].status === 'online' && !exclude.includes(k));
}
function dispatch(o) {
  if (o.kid || !['accepted', 'preparing', 'ready'].includes(o.st)) return;
  const tried = o.offers.map((x) => x.kid);
  let pool = availableCaptains(tried);
  if (!pool.length) { o.offers = []; pool = availableCaptains(); if (!pool.length) { o.timers.dispatch = now() + 1.5; tl(o, { ev: 'no_captain', actor: 'system', note: L('مفيش كابتن متاح دلوقتي — هنحاول تاني', 'No captain available — retrying') }); return; } }
  const mNode = MAP.nodes[M(o.mid).node];
  const pref = o.script.captain && pool.includes(o.script.captain) ? o.script.captain : null;
  const kid = pref || pool.sort((a, b) => Math.hypot(S.captains[a].x - mNode.x, S.captains[a].y - mNode.y) - Math.hypot(S.captains[b].x - mNode.x, S.captains[b].y - mNode.y))[0];
  o.offer = { kid, at: now(), until: now() + 1.2 };
  addPending(o, 'k_offer', 'captain', 0.45, { kid });
  o.timers.dispatch = null;
  tl(o, { ev: 'offer', actor: 'system', note: L(`عرض اتبعت للكابتن ${kName(kid)}`, `Offer sent to ${kName(kid)}`) });
  if (S.nav.captain.kid === kid) notify('captain', { title: L(`عرض توصيل جديد — ${mName(o.mid)}`, `New delivery offer — ${mName(o.mid)}`), icon: 'bell-ring', tone: 'brand', orderId: o.id });
}
function captainDecide(o, accept, reason) {
  if (!o.offer) return;
  const kid = o.offer.kid;
  dropPending(o, 'k_offer');
  o.offers.push({ kid, res: accept ? 'accepted' : 'rejected', at: now(), reason: reason || '' });
  o.offer = null;
  if (!accept) {
    tl(o, { ev: 'offer_rejected', actor: 'captain:' + kid, note: L(`الكابتن ${kName(kid)} رفض العرض — مفيش أي أثر عليه`, `${kName(kid)} declined — no penalty`) });
    o.timers.dispatch = now() + 0.3;
    return;
  }
  assignCaptain(o, kid);
}
function assignCaptain(o, kid) {
  o.kid = kid; const c = S.captains[kid]; c.status = 'on_trip';
  const from = nearestNode(c.x, c.y); const pts = MAP.route(from, M(o.mid).node);
  o.cap = { phase: 'to_merchant', pts, dist: 0, len: MAP.lengthOf(pts), leg: 1 };
  tl(o, { ev: 'assigned', actor: 'captain:' + kid, note: L(`الكابتن ${kName(kid)} قبل التوصيلة`, `${kName(kid)} accepted the trip`) });
  notify('customer', { title: L(`الكابتن ${kName(kid)} هيستلم طلبك`, `${kName(kid)} will pick up your order`), icon: 'bike', orderId: o.id, silent: userRole() !== 'customer' });
  notify('merchant', { title: L(`الكابتن ${kName(kid)} جاي يستلم ${o.id}`, `${kName(kid)} is coming for ${o.id}`), icon: 'bike', orderId: o.id, silent: userRole() !== 'merchant' });
  if (typeof SCN_RUNTIME !== 'undefined') SCN_RUNTIME.on(o, 'assigned');
}
function nearestNode(x, y) {
  let best = null, bd = 1e9;
  for (const n of Object.values(MAP.nodes)) { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n.id; } }
  return best;
}
function captainCancel(o, reason) {
  if (!o.kid) return;
  const kid = o.kid; const c = S.captains[kid];
  c.status = 'online';
  const pos = capPos(o); if (pos) { c.x = pos.x; c.y = pos.y; }
  o.kid = null; o.cap = null;
  dropPending(o, 'k_pickup');
  o.offers.push({ kid, res: 'cancelled', at: now(), reason });
  tl(o, { ev: 'captain_cancel', actor: 'captain:' + kid, note: L(`الكابتن ألغى بعد القبول — السبب كما قاله: «${reason}»`, `Captain cancelled after accepting — reason as stated: “${reason}”`) });
  o.timers.dispatch = now() + 0.2;
  notify('customer', { title: L('الكابتن اعتذر — بندوّر على كابتن تاني دلوقتي', 'Captain dropped out — finding another now'), body: L('هيتأخر الطلب شوية. ولو حابب تلغي من غير رسوم، قولنا.', 'Your order will be a little late. You can cancel free of charge.'), icon: 'bike', tone: 'warning', orderId: o.id });
  notify('ops', { title: L(`إعادة إسناد ${o.id}`, `Reassigning ${o.id}`), icon: 'shuffle', orderId: o.id, silent: userRole() !== 'ops' });
}

/* ------------------------------------------------------------ movement */
function capPos(o) {
  if (!o || !o.cap) return null;
  if (o.cap.phase === 'at_merchant') { const n = MAP.nodes[M(o.mid).node]; return { x: n.x, y: n.y }; }
  if (o.cap.phase === 'at_customer' || o.cap.phase === 'waiting_ops') { const n = MAP.nodes[addrOf(o).node]; return { x: n.x, y: n.y }; }
  return MAP.pointAt(o.cap.pts, o.cap.dist);
}
function moveCaptains(dt) {
  for (const o of Object.values(S.orders)) {
    if (!o.cap || !['to_merchant', 'to_customer'].includes(o.cap.phase)) continue;
    if (o.cap.stopped) continue;
    if (S.sys.outage && o.cap.phase === 'to_customer') { /* captain keeps riding; the app just can't see it */ }
    o.cap.dist += MAP.SPEED * dt;
    const c = S.captains[o.kid]; const p = MAP.pointAt(o.cap.pts, Math.min(o.cap.dist, o.cap.len));
    if (S.set.gps !== 'unavailable' || !c.lastFix) { c.x = p.x; c.y = p.y; c.lastFix = now(); }
    if (o.cap.dist >= o.cap.len) arrive(o);
  }
}
function arrive(o) {
  const c = S.captains[o.kid];
  if (o.cap.phase === 'to_merchant') {
    o.cap.phase = 'at_merchant'; o.cap.atM = now();
    tl(o, { ev: 'at_merchant', actor: 'captain:' + o.kid, note: L('الكابتن وصل المتجر', 'Captain at the store') });
    notify('merchant', { title: L(`الكابتن ${kName(o.kid)} وصل لطلب ${o.id}`, `${kName(o.kid)} arrived for ${o.id}`), icon: 'bike', orderId: o.id, silent: userRole() !== 'merchant' });
    if (o.st === 'ready') addPending(o, 'k_pickup', 'captain', 0.5);
  } else if (o.cap.phase === 'to_customer') {
    o.cap.phase = 'at_customer'; o.cap.atC = now();
    const n = MAP.nodes[addrOf(o).node]; c.x = n.x; c.y = n.y;
    tl(o, { ev: 'at_customer', actor: 'captain:' + o.kid, note: L('الكابتن وصل للعنوان (موقع + توقيت)', 'Captain at the address (location + time)') });
    const who = o.rcp.mode === 'other' ? L('المستلم', 'the recipient') : L('العميل', 'the customer');
    notify('customer', { title: L(`الكابتن ${kName(o.kid)} وصل — جهّز ${money(dueCash(o))}`, `${kName(o.kid)} is here — have ${money(dueCash(o))} ready`), icon: 'map-pin', tone: 'brand', orderId: o.id });
    addPending(o, 'c_handover', doorRole(o), 1.0);
    if (o.rcp.mode === 'other') notify('recipient', { title: L(`كابتن وصّلي على الباب — طلب باسمك من ${PEOPLE.customer.name}`, 'A Wasaly captain is at your door'), icon: 'bike', orderId: o.id, silent: userRole() !== 'recipient' });
    if (typeof SCN_RUNTIME !== 'undefined') SCN_RUNTIME.on(o, 'arrived');
    void who;
  }
}
function pickup(o) {
  if (!(o.st === 'ready' && o.cap && o.cap.phase === 'at_merchant')) return false;
  dropPending(o, 'k_pickup');
  setSt(o, 'picked_up', 'captain:' + o.kid, L('الكابتن استلم الطلب (توقيت فقط — مفيش قائمة أصناف موقّعة في النظام)', 'Captain picked up (time only — no signed item list in the system)'));
  const pts = MAP.route(M(o.mid).node, addrOf(o).node);
  o.cap = { phase: 'to_customer', pts, dist: 0, len: MAP.lengthOf(pts), leg: 2, atM: o.cap.atM };
  setSt(o, 'in_transit', 'captain:' + o.kid, L('في الطريق للعميل', 'On the way to the customer'));
  notify('customer', { title: L(`الكابتن ${kName(o.kid)} استلم طلبك وفي الطريق`, `${kName(o.kid)} picked up your order`), body: o.pay.method === 'cash' ? L(`جهّز ${money(dueCash(o))} كاش`, `Have ${money(dueCash(o))} in cash`) : '', icon: 'bike', orderId: o.id });
  notify('merchant', { title: L(`${o.id} اتسلّم للكابتن`, `${o.id} handed to the captain`), icon: 'package-check', orderId: o.id, silent: userRole() !== 'merchant' });
  return true;
}
const dueCash = (o) => (o.pay.method === 'cash' ? o.total - (o.refund && o.refund.preDelivery ? o.refund.amount : 0) : 0);

/* ------------------------------------------------------------ delivery & cash */
function customerHandover(o, how) {
  // how: {given: number|null, refuse:false}
  dropPending(o, 'c_handover');
  o.handover = Object.assign({ at: now() }, how || {});
  tl(o, { ev: 'customer_met', actor: 'customer', note: o.pay.method === 'cash' ? L(`العميل قابل الكابتن ومعاه ${money(how && how.given || dueCash(o))}`, `Customer met the captain with ${money(how && how.given || dueCash(o))}`) : L('العميل قابل الكابتن', 'Customer met the captain') });
  addPending(o, 'k_deliver', 'captain', 0.4);
}
function deliver(o, input) {
  // input: {code, given}
  if (!(o.st === 'in_transit' || o.st === 'reattempt') || !o.cap || o.cap.phase !== 'at_customer') return { ok: false, err: L('الكابتن لسه ماوصلش', 'Captain has not arrived') };
  if (!input || String(input.code) !== String(o.code)) return { ok: false, err: L('الكود مش مطابق. اطلب الكود من المستلم وهو قدامك — وصّلي عمرها ما بتطلب الكود على التليفون.', 'Code does not match. Ask the recipient face to face — Wasaly never asks for the code by phone.') };
  const c = S.captains[o.kid];
  if (o.pay.method === 'cash') {
    const due = dueCash(o); const given = input.given != null ? input.given : (o.handover && o.handover.given) || due;
    if (given < due) return { ok: false, err: L(`المبلغ أقل من المطلوب (${money(due)}). متسيبش الطلب من غير تحصيل — كلّم العمليات.`, `Less than due (${money(due)}). Call operations.`), code: 'short' };
    const change = given - due;
    if (change > c.change) return { ok: false, err: L(`محتاج فكة ${money(change)} ومعاك ${money(c.change)} بس. الفكة مسؤولية المنصّة — كلّم العمليات.`, `Need ${money(change)} change, you have ${money(c.change)}. Call operations.`), code: 'change' };
    c.change -= change; c.custody += due;
    o.pay.state = 'collected'; o.pay.collected = due; o.pay.given = given; o.pay.change = change;
  } else if (o.pay.method === 'card') { o.pay.state = 'captured_sim'; }
  dropPending(o, 'k_deliver');
  setSt(o, 'delivered', 'captain:' + o.kid, L('اتسلّم — توقيت + كود تحقق (مفيش صورة ولا توقيع في النظام)', 'Delivered — time + verification code (no photo or signature in the system)'));
  const share = Math.round(o.del * ECON.captainSharePct) / 100;
  c.earned += share + (o.tip || 0); c.tips += o.tip || 0; c.trips += 1; c.status = 'online';
  o.earn = { share, at: now() };
  o.cap.phase = 'done';
  o.timers.complete = now() + ECON.disputeHours * 60;
  notify('customer', { title: L('طلبك اتسلّم — بالهنا والشفا', 'Delivered — enjoy!'), icon: 'circle-check', tone: 'success', orderId: o.id });
  notify('merchant', { title: L(`${o.id} اتسلّم للعميل`, `${o.id} delivered`), icon: 'circle-check', orderId: o.id, silent: userRole() !== 'merchant' });
  if (typeof SCN_RUNTIME !== 'undefined') SCN_RUNTIME.on(o, 'delivered');
  return { ok: true };
}
function completeOrder(o) {
  if (o.st !== 'delivered') return;
  o.timers.complete = null;
  setSt(o, 'completed', 'system', L(`اكتمل تلقائيًا بعد نافذة النزاع (${ECON.disputeHours} ساعة — قيمة في الكود مش معتمدة)`, `Auto-completed after the ${ECON.disputeHours}h dispute window (code value, not approved)`));
}

/* ------------------------------------------------------------ cancellation (by state, not by time) */
function cancelRuling(o) {
  switch (o.st) {
    case 'placed': return { allowed: true, kind: 'free', ar: 'إلغاء كامل بلا أي أثر مالي — المتجر لسه ماقبلش.', en: 'Full cancel, no financial effect — store has not accepted.' };
    case 'accepted': return { allowed: true, kind: 'recorded', ar: 'إلغاء كامل، والواقعة بتتسجّل — التكلفة ضئيلة.', en: 'Full cancel; the event is recorded.' };
    case 'preparing': case 'ready': return { allowed: false, kind: 'undecided', ar: 'الإلغاء أثناء التحضير غير محسوم: التاجر بدأ يستهلك مواد وشغل. ولا خيار من التلاتة اتعتمد.', en: 'Cancelling during preparation is undecided.' };
    case 'picked_up': case 'in_transit': case 'reattempt': return { allowed: false, kind: 'failed', ar: 'بعد استلام الكابتن ده مش إلغاء — بيتعامل كتعذّر تسليم.', en: 'After pickup this is not a cancellation — it is handled as failed delivery.' };
    default: return { allowed: false, kind: 'none', ar: 'مفيش إلغاء في الحالة دي.', en: 'Not cancellable in this state.' };
  }
}
function cancelOrder(o, by, reason, extra = {}) {
  const prev = o.st;
  o.pending = []; o.gate = null;
  if (o.kid) { const c = S.captains[o.kid]; c.status = 'online'; const p = capPos(o); if (p) { c.x = p.x; c.y = p.y; } }
  o.cap = o.cap ? Object.assign(o.cap, { phase: 'done' }) : null;
  setSt(o, 'cancelled', by, reason);
  o.cancel = Object.assign({ by, reason, from: prev, fee: 0 }, extra);
  if (o.pay.method === 'card' && o.pay.state !== 'failed_sim') o.pay.state = 'voided_sim';
  settleCancelMoney(o);
}
function settleCancelMoney(o) { if (o.pay.method === 'cash') o.pay.state = 'none_collected'; }

/* ------------------------------------------------------------ cannot deliver (current system: escalation only — SRC-0016) */
function cannotDeliver(o, reason, words) {
  if (!o.cap || o.cap.phase !== 'at_customer') return;
  ['k_deliver', 'c_handover', 'k_report', 'c_nothome'].forEach((k) => dropPending(o, k));
  o.cap.phase = 'waiting_ops';
  o.cnd = { reason, words: words || '', at: now(), calls: (o.cnd && o.cnd.calls) || [] };
  tl(o, { ev: 'cannot_deliver', actor: 'captain:' + o.kid, note: L(`تعذّر التسليم — «${reasonLabel(reason)}»${words ? ` — كلام العميل بنصه: «${words}»` : ''}. (النظام: تصعيد بس — الحالة ما بتتغيرش)`, `Cannot deliver — “${reasonLabel(reason)}”. (System: escalation only — state unchanged)`), kind: 'warn' });
  const tk = ticketCreate({ orderId: o.id, kind: 'cannot_deliver', prio: 'now', by: 'captain', text: L(`الكابتن بلّغ تعذّر تسليم: ${reasonLabel(reason)}`, `Captain reported: ${reasonLabel(reason)}`), queue: 'ops' });
  addPending(o, 'o_call', 'ops', 0.6);
  notify('ops', { title: L(`تعذّر تسليم ${o.id} — ${reasonLabel(reason)}`, `Cannot deliver ${o.id}`), icon: 'triangle-alert', tone: 'danger', orderId: o.id });
  notify('captain', { title: L('اتبلّغت العمليات. البضاعة تفضل معاك لحد قرارهم.', 'Ops notified. Keep the goods until they decide.'), icon: 'package', orderId: o.id, silent: userRole() !== 'captain' });
  void tk;
  if (typeof SCN_RUNTIME !== 'undefined') SCN_RUNTIME.on(o, 'cannot_deliver');
}
const REASONS = {
  no_answer: ['العميل مش بيرد', 'No answer'], refused: ['رفض الاستلام صراحةً', 'Refused explicitly'], wrong_address: ['العنوان غلط أو مش موجود', 'Wrong or missing address'],
  recipient_refused: ['المستلم رفض (مش المشتري)', 'Recipient refused (not the buyer)'], not_home: ['مفيش حد في العنوان', 'Nobody at the address'], change: ['مشكلة فكة', 'Change problem'],
  unsafe: ['حاسس بخطر', 'Feels unsafe'], late_refusal: ['رفض بسبب تأخير كبير', 'Refused due to severe delay'],
};
const reasonLabel = (r) => (REASONS[r] ? L(REASONS[r][0], REASONS[r][1]) : r);
function safetyWithdraw(o) {
  if (!o.kid) return;
  ['k_deliver', 'c_handover', 'k_report', 'c_nothome'].forEach((k) => dropPending(o, k));
  o.cap.phase = 'waiting_ops'; o.cap.stopped = true;
  tl(o, { ev: 'safety', actor: 'captain:' + o.kid, note: L('الكابتن انسحب فورًا لإحساسه بخطر — ده حق، مش محتاج إذن ولا إثبات', 'Captain withdrew for safety — a right, no permission or proof needed'), kind: 'danger' });
  ticketCreate({ orderId: o.id, kind: 'safety', prio: 'now', by: 'captain', text: L('بلاغ سلامة من الكابتن', 'Safety report from captain'), queue: 'ops' });
  notify('ops', { title: L(`بلاغ سلامة — ${o.id}`, `Safety report — ${o.id}`), body: L('الأولوية للأشخاص قبل البضاعة والفلوس', 'People before goods and money'), icon: 'siren', tone: 'danger', orderId: o.id });
  addPending(o, 'o_call', 'ops', 0.3);
}

/* ------------------------------------------------------------ ops handling of a failed delivery */
/* a door problem got solved (customer coming / buyer approved / address fixed): archive it so it cannot loop */
function resumeFromDoor(o) {
  if (o.cnd) o.cndPast = (o.cndPast || []).concat([o.cnd]);
  o.cnd = null; o.door = null; o.gate = null;
  if (o.script) o.script.atDoor = null;
}
function opsIndependentCall(o, outcome) {
  // outcome decided by scenario script (answered/no_answer/confirms_refusal)
  const res = outcome || (o.script.opsCall || 'confirms');
  o.cnd = o.cnd || { calls: [] };
  o.cnd.calls.push({ at: now(), by: 'ops', res });
  dropPending(o, 'o_call');
  tl(o, { ev: 'ops_call', actor: 'ops', note: L(`العمليات اتصلت من رقم تاني — ${callRes(res)}`, `Ops called from another number — ${callRes(res)}`) });
  if (res === 'answered_coming') {
    // customer shows up → resume handover
    resumeFromDoor(o);
    o.cap.phase = 'at_customer';
    addPending(o, 'c_handover', doorRole(o), 0.8);
    closeTicketsFor(o, 'cannot_deliver', L('العميل رد ونزل — كمّلنا التسليم', 'Customer answered — delivery resumed'));
    notify('captain', { title: L('العميل رد وجاي — استناه', 'Customer answered and is coming'), icon: 'phone-call', orderId: o.id, silent: userRole() !== 'captain' });
    return;
  }
  if (res === 'buyer_approves') {
    resumeFromDoor(o);
    o.cap.phase = 'at_customer';
    addPending(o, 'c_handover', doorRole(o), 0.8);
    closeTicketsFor(o, 'cannot_deliver', L('المشتري كلّم المستلمة ووافقت — كمّلنا', 'Buyer called the recipient — resumed'));
    return;
  }
  if (res === 'landmark') {
    resumeFromDoor(o);
    const a = addrOf(o); a.landmark = L('جنب محل العصير، البيت اللي عليه نخلة', 'Next to the juice shop, the house with a palm tree');
    o.cap.phase = 'to_customer'; o.cap.pts = MAP.route(nearestNode(capPos(o).x, capPos(o).y), 'n4-6'); o.cap.dist = 0; o.cap.len = MAP.lengthOf(o.cap.pts);
    o.addrFix = true;
    closeTicketsFor(o, 'cannot_deliver', L('اتصلّح العنوان بوصف معلم', 'Address corrected with a landmark'));
    tl(o, { ev: 'reroute', actor: 'ops', note: L('المسافة الزيادة على المنصّة — مش على العميل', 'Extra distance is on the platform, not the customer') });
    return;
  }
  addPending(o, 'o_hypo', 'ops', 0.2);
}
const callRes = (r) => ({ confirms: L('العميل أكّد إنه مش عايز الطلب', 'customer confirmed refusal'), no_answer: L('مفيش رد برضه', 'still no answer'), answered_coming: L('العميل رد وقال جاي', 'customer answered, coming down'), buyer_approves: L('المشتري رد ووافق', 'buyer answered and approved'), landmark: L('العميل رد ووصف معلم', 'customer answered with a landmark') }[r] || r);
const HYPOS = [
  { id: 'intent', ar: 'رفض متعمَّد', en: 'Deliberate refusal', note: 'لا يُفترض إلا لو العميل قاله بنفسه' },
  { id: 'unreachable', ar: 'تعذّر الاتصال', en: 'Unreachable', note: 'الهاتف المغلق مش دليل على تعمّد' },
  { id: 'emergency', ar: 'طارئ حقيقي', en: 'Genuine emergency', note: 'لازم مسار تصحيح من غير شكوى' },
  { id: 'misunderstanding', ar: 'سوء فهم', en: 'Misunderstanding', note: 'كتير مصدره النظام مش العميل' },
  { id: 'service_failure', ar: 'فشل خدمة', en: 'Service failure', note: 'هنا الرفض ممكن يكون حق' },
];
function opsSetHypothesis(o, h) {
  o.cnd = o.cnd || {}; o.cnd.hypo = h; dropPending(o, 'o_hypo');
  tl(o, { ev: 'hypothesis', actor: 'ops', note: L(`الفرضية المسجّلة: ${HYPOS.find((x) => x.id === h).ar}`, `Recorded hypothesis: ${HYPOS.find((x) => x.id === h).en}`) });
  o.gate = { id: 'fdr1', fdr: 'FDR-0001', role: 'ops', at: now() };
  notify('ops', { title: L(`قرار مطلوب: مصير البضاعة والفلوس في ${o.id}`, `Decision needed: goods & money for ${o.id}`), body: L('السياسة مش محسومة (FDR-0001)', 'Policy undecided (FDR-0001)'), icon: 'scale', tone: 'warning', orderId: o.id, silent: userRole() !== 'ops' });
}
/* the current workaround — manual §53.2 step 6 */
function opsCloseAsTaggedCancel(o) {
  cancelOrder(o, 'ops', L('إلغاء عمليات موسوم «فشل تسليم» (الحل المؤقت — مفيش حالة فشل تسليم في النظام)', 'Ops cancellation tagged “failed delivery” (workaround — no such state exists)'), { tagged: 'failed_delivery' });
  o.label = 'failed_delivery_tag';
  closeTicketsFor(o, 'cannot_deliver', L('اتقفل بإلغاء موسوم — مصير البضاعة والتعويض لسه مش محسومين', 'Closed with tagged cancel — goods fate and compensation undecided'));
  notify('customer', { title: L('مقدرناش نوصّل الطلب النهارده', 'We could not deliver today'), body: L('مفيش أي مبلغ مستحق عليك ولا هيتخصم منك حاجة في أي طلب جاي.', 'You owe nothing, and nothing will be deducted from future orders.'), icon: 'info', orderId: o.id });
  notify('merchant', { title: L(`${o.id} اتلغى بعد ما خرج — تعذّر تسليم`, `${o.id} cancelled after pickup — failed delivery`), body: L('مصير البضاعة وتعويضك: لسه مفيش قاعدة (FDR-0001)', 'Goods fate & compensation: no rule yet (FDR-0001)'), icon: 'package-x', tone: 'warning', orderId: o.id });
  notify('captain', { title: L('العمليات قفلت الطلب — ارجع بالبضاعة للمتجر', 'Ops closed the order — return goods to the store'), body: L('التعويض عن المشوار: غير محسوم (FDR-0002)', 'Trip compensation: undecided (FDR-0002)'), icon: 'package-x', orderId: o.id, silent: userRole() !== 'captain' });
  o.fate = o.fate || { status: 'undecided' };
}

/* ------------------------------------------------------------ simulated proposed solution (never an approved decision) */
function simulateOption(o, fdr, opt) {
  o.sim = { proposed: true, option: opt, fdr };
  const words = { 'أ': 'البضاعة ترجع للتاجر ووصلي تتحمل التوصيل', 'ب': 'وصلي تشتري البضاعة وتتحمل الخسارة', 'ج': 'حسب الفئة بجدول متفق عليه', 'د': 'إلغاء عمليات (الوضع الحالي)' };
  if (opt === 'د') { opsCloseAsTaggedCancel(o); o.sim.proposed = false; o.sim.option = 'د'; return; }
  o.pending = []; o.gate = null;
  if (o.kid) { const c = S.captains[o.kid]; c.status = 'online'; }
  if (o.cap) o.cap.phase = 'done';
  o.pay.state = o.pay.method === 'cash' ? 'none_collected' : 'voided_sim';
  setSt(o, 'failed_delivery', 'ops', L(`محاكاة لحل مقترح — خيار ${opt}: ${words[opt]}. (مش قرار معتمد)`, `Simulated proposed solution — option ${opt}. (Not an approved decision)`));
  o.fate = { status: 'simulated', opt, cat: 'hot_food', action: opt === 'أ' ? 'return_to_merchant' : 'dispose_documented' };
  closeTicketsFor(o, 'cannot_deliver', L(`محاكاة الخيار ${opt}`, `Simulated option ${opt}`));
  notify('customer', { title: L('مقدرناش نوصّل الطلب النهارده', 'We could not deliver today'), body: L('مفيش أي مبلغ مستحق عليك.', 'You owe nothing.'), icon: 'info', orderId: o.id, silent: userRole() !== 'customer' });
}

/* ------------------------------------------------------------ tickets */
const PRIO = { now: ['فورية', 'Immediate', 'danger'], today: ['نفس اليوم', 'Same day', 'warning'], next: ['اليوم التالي', 'Next day', 'info'], routine: ['روتينية', 'Routine', 'neutral'] };
function ticketCreate({ orderId, kind, prio = 'today', by = 'customer', text = '', queue = 'support', item = null }) {
  const id = 'T-' + (++S.tseq);
  const t = { id, orderId, kind, prio, by, queue, status: 'open', at: now(), item, log: [{ t: now(), who: by, kind: 'msg', text }], notes: [], evidence: [], resolution: null, reviewer: null };
  S.tickets[id] = t;
  const o = orderId && S.orders[orderId]; if (o) o.tickets.push(id);
  notify(queue === 'ops' ? 'ops' : 'support', { title: L(`تذكرة ${id} — ${ticketKindLabel(kind)}`, `Ticket ${id} — ${ticketKindLabel(kind)}`), icon: 'ticket', tone: prio === 'now' ? 'danger' : 'info', silent: true });
  return t;
}
const TICKET_KINDS = {
  missing: ['صنف ناقص', 'Missing item'], wrong: ['صنف غلط', 'Wrong item'], damaged: ['صنف تالف', 'Damaged item'], food_safety: ['سلامة غذاء', 'Food safety'],
  cannot_deliver: ['تعذّر تسليم', 'Cannot deliver'], safety: ['سلامة شخص', 'Personal safety'], payment: ['مشكلة دفع', 'Payment issue'], cash_diff: ['فرق نقدي', 'Cash difference'],
  late: ['تأخير', 'Delay'], other: ['أخرى', 'Other'], refund: ['استرداد', 'Refund'], captain: ['سلوك كابتن', 'Captain conduct'], data: ['بيانات', 'Data request'],
};
const ticketKindLabel = (k) => (TICKET_KINDS[k] ? L(TICKET_KINDS[k][0], TICKET_KINDS[k][1]) : k);
function ticketLog(t, who, text, kind = 'msg') { t.log.push({ t: now(), who, text, kind }); }
function closeTicketsFor(o, kind, text) {
  (o.tickets || []).map((id) => S.tickets[id]).filter((t) => t && t.kind === kind && t.status !== 'closed').forEach((t) => { t.status = 'resolved'; t.resolution = text; ticketLog(t, 'ops', text, 'status'); });
}

/* ------------------------------------------------------------ refunds (4 stages — CUSTOMER_004 / FIN_002) */
function refundRequest(o, amount, reason, by = 'support') {
  o.refund = { stage: 'requested', amount, reason, by, at: { requested: now() }, route: null, approver: null };
  tl(o, { ev: 'refund_requested', actor: by, note: L(`استرداد مطلوب ${money(amount)} — ${reason}`, `Refund requested ${money(amount)} — ${reason}`) });
}
function refundApprove(o, approver = 'founder') {
  if (!o.refund || o.refund.stage !== 'requested') return;
  o.refund.stage = 'approved'; o.refund.approver = approver; o.refund.at.approved = now();
  tl(o, { ev: 'refund_approved', actor: approver, note: L('اعتُمد الاسترداد — لسه ما وصلش (ممنوع نقول «تم»)', 'Refund approved — not received yet (never say “done”)') });
  notify('customer', { title: L(`اعتُمد استرداد ${money(o.refund.amount)} — لسه ما وصلكش`, `Refund of ${money(o.refund.amount)} approved — not received yet`), icon: 'hand-coins', orderId: o.id });
}
function refundExecute(o, route) {
  if (!o.refund || o.refund.stage !== 'approved') return;
  o.refund.stage = 'executed'; o.refund.route = route; o.refund.at.executed = now();
  tl(o, { ev: 'refund_executed', actor: 'finance', note: route === 'voucher' ? L('اتنفّذ كقسيمة رصيد — ده سلوك الكود الحالي في طلبات الكاش ويخالف القاعدة 12-2', 'Executed as a voucher — current code behaviour for COD; conflicts with rule 12-2') : L(`اتنفّذ ${routeLabel(route)}`, `Executed ${routeLabel(route)}`) });
}
function refundConfirm(o) {
  if (!o.refund || o.refund.stage !== 'executed') return;
  o.refund.stage = 'confirmed'; o.refund.at.confirmed = now();
  tl(o, { ev: 'refund_confirmed', actor: 'finance', note: L('وصل للعميل فعلًا', 'Actually received by the customer') });
  notify('customer', { title: L(`مبلغ ${money(o.refund.amount)} وصل ${routeLabel(o.refund.route)}`, `${money(o.refund.amount)} reached you ${routeLabel(o.refund.route)}`), icon: 'circle-check', tone: 'success', orderId: o.id });
}
const routeLabel = (r) => ({ cash: L('نقدًا', 'in cash'), same: L('بنفس وسيلة الدفع', 'to the same method'), voucher: L('كقسيمة رصيد', 'as a voucher') }[r] || '');

/* ------------------------------------------------------------ calls & chat (simulated, masked) */
function chatThread(id, parties) { if (!S.chats[id]) S.chats[id] = { id, parties, msgs: [] }; return S.chats[id]; }
function chatSend(id, from, text, auto) {
  const th = S.chats[id]; if (!th) return;
  th.msgs.push({ id: uid('m'), from, text, t: now() });
  if (auto) return;
  const reply = CHAT_REPLY(id, from, text);
  if (reply) setTimeout(() => { th.msgs.push({ id: uid('m'), from: reply.from, text: reply.text, t: now() }); requestRender(); }, 900);
}
function CHAT_REPLY(id, from, text) {
  const th = S.chats[id]; const other = th.parties.find((p) => p !== from);
  if (!other || other === userRole() && !(from === userRole())) return null;
  if (other === 'captain') return { from: 'captain', text: L('تمام يا فندم، أنا قريب — دقايق وأكون عندك.', 'Sure, I am close — a few minutes.') };
  if (other === 'customer') return { from: 'customer', text: L('تمام، مستنيك.', 'OK, waiting for you.') };
  if (other === 'support') return { from: 'support', text: L('معاك سارة من الدعم. وصلني كلامك وبراجعه دلوقتي — مش هقولك حاجة مش متأكدة منها.', 'Sara from support here. Checking now — I will not promise anything I am not sure of.') };
  if (other === 'ops') return { from: 'ops', text: L('معاك كريم من العمليات. شايف الطلب قدامي — ثانية وأرجعلك.', 'Karim from ops. I can see the order — one moment.') };
  if (other === 'merchant') return { from: 'merchant', text: L('حاضر، بنشوفها حالًا.', 'On it.') };
  return null;
}
function callLog(o, from, to, res) { o.calls.push({ t: now(), from, to, res }); tl(o, { ev: 'call', actor: from, note: L(`مكالمة ${from}→${to}: ${res}`, `Call ${from}→${to}: ${res}`) }); }

/* ------------------------------------------------------------ autopilot */
const AUTO = {
  m_accept: (o) => (o.script.merchantNoResponse ? null : merchantAccept(o)),
  m_start: (o) => merchantStart(o),
  m_ready: (o) => (o.script.merchantLate && !o.lateNotified ? null : merchantReady(o)),
  k_offer: (o, a) => captainDecide(o, !(o.script.rejectFirst && o.offers.filter((x) => x.res === 'rejected').length === 0 && a.kid === o.script.captain), L('بعيد عن مكاني', 'Too far from me')),
  k_pickup: (o) => pickup(o),
  c_handover: (o) => (o.script.atDoor ? SCN_RUNTIME.door(o) : customerHandover(o, { given: cashGiven(o) })),
  k_deliver: (o) => { const r = deliver(o, { code: o.code, given: (o.handover && o.handover.given) }); if (!r.ok && typeof SCN_RUNTIME !== 'undefined') SCN_RUNTIME.deliverFailed(o, r); },
  c_sub: (o) => SCN_RUNTIME.subChoice(o, 'remove'),
  c_late: (o) => SCN_RUNTIME.lateChoice(o, 'wait'),
};
const GATED = new Set(['o_call', 'o_hypo', 'o_fate', 'f_reconcile', 's_refund']);
function cashGiven(o) {
  const due = dueCash(o);
  if (o.pay.note === 'exact') return due;
  const n = Number(o.pay.note) || due; return Math.max(n, due);
}
/* does the person at the keyboard control this pending action? */
function userControls(o, a) {
  if (a.role !== userRole()) return false;
  if (a.role === 'captain') return (a.kid || o.kid) === S.nav.captain.kid;
  if (a.role === 'merchant') return o.mid === S.nav.merchant.mid;
  return true;
}
function autopilot() {
  if (!S.set.autopilot || S.sys.outage) return;
  for (const o of Object.values(S.orders)) {
    for (const a of o.pending.slice()) {
      if (GATED.has(a.kind) || now() < a.due || userControls(o, a)) continue;
      const fn = AUTO[a.kind]; if (fn) fn(o, a);
    }
  }
}

/* ------------------------------------------------------------ timers */
function timers() {
  if (S.sys.outage) return; // system down: nothing fires automatically (no auto-cancel caused by our own outage)
  for (const o of Object.values(S.orders)) {
    const T = o.timers || {};
    if (T.mCall && now() >= T.mCall && o.st === 'placed') { T.mCall = null; tl(o, { ev: 'ops_call_merchant', actor: 'ops', note: L('العمليات كلّمت المتجر قبل الإلغاء التلقائي (MSG-M-001)', 'Ops called the store before auto-cancel (MSG-M-001)') }); notify('merchant', { title: L(`فيه طلب مستني ردكم من 3 دقايق — ${o.id}`, `An order has waited 3 minutes — ${o.id}`), body: L('لو مشغولين فعّلوا وضع الانشغال', 'If you are busy, switch to Busy mode'), icon: 'phone-call', tone: 'warning', orderId: o.id }); }
    if (T.mTimeout && now() >= T.mTimeout && o.st === 'placed') { T.mTimeout = null; cancelOrder(o, 'system', L('المتجر ما ردش خلال المهلة — إلغاء تلقائي برد كامل (النموذج المطبّق اليوم)', 'Store did not respond in time — auto-cancelled with full refund'), { auto: true }); notify('customer', { title: L('المتجر ما ردش — اتلغى الطلب من غير أي رسوم', 'Store did not respond — cancelled, no charge'), icon: 'circle-x', tone: 'danger', orderId: o.id }); }
    if (T.dispatch && now() >= T.dispatch) dispatch(o);
    if (o.offer && hasPending(o, 'k_offer')) { const a = o.pending.find((x) => x.kind === 'k_offer'); const grace = a && userControls(o, a) ? 1.5 : 0; if (now() >= o.offer.until + grace) captainDecide(o, false, L('العرض خلص وقته', 'Offer timed out')); }
    if (T.complete && now() >= T.complete) completeOrder(o);
    if (isActive(o) && o.promise && !o.lateFlag && now() > o.placedAt + o.promise.hi) { o.lateFlag = true; tl(o, { ev: 'late', actor: 'system', note: L('الطلب عدّى الميعاد المعلن', 'Order passed the promised window') , kind: 'warn' }); if (typeof SCN_RUNTIME !== 'undefined') SCN_RUNTIME.on(o, 'late'); }
  }
}

/* ------------------------------------------------------------ the clock */
let lastReal = null;
function tick() {
  const nowReal = performance.now();
  const dtReal = lastReal == null ? 0.25 : Math.min(1, (nowReal - lastReal) / 1000);
  lastReal = nowReal;
  if (S.set.paused) return false;
  const dt = (dtReal * S.set.speed) / 3; // 1 sim-minute per 3 real seconds at 1×
  S.clock.t += dt;
  moveCaptains(dt);
  timers();
  autopilot();
  if (typeof SCN_RUNTIME !== 'undefined') SCN_RUNTIME.tick();
  return true;
}
/* jump to the next thing that will happen (for impatient reviewers) */
/* after an outage, push every automatic deadline by the outage length so nobody is penalised for our downtime */
function shiftDeadlines(d) {
  if (!(d > 0)) return;
  for (const o of Object.values(S.orders)) {
    const T = o.timers || {}; Object.keys(T).forEach((k) => { if (T[k]) T[k] += d; });
    if (o.offer && o.offer.until) o.offer.until += d;
    o.pending.forEach((a) => { a.due += d; });
    (o.sched || []).forEach((b) => { b.at += d; });
  }
}
function skipAhead() {
  if (S.sys.outage) return false; // time does not jump while the system is down — restore service first
  const cands = [];
  for (const o of Object.values(S.orders)) {
    o.pending.forEach((a) => { if (!GATED.has(a.kind) && a.role !== userRole()) cands.push(a.due); });
    Object.values(o.timers || {}).forEach((v) => { if (v) cands.push(v); });
    (o.sched || []).forEach((b) => cands.push(b.at));
    if (o.cap && ['to_merchant', 'to_customer'].includes(o.cap.phase) && !o.cap.stopped) cands.push(now() + (o.cap.len - o.cap.dist) / MAP.SPEED);
  }
  const future = cands.filter((x) => x > now()).sort((a, b) => a - b);
  if (!future.length) return false;
  const target = future[0] + 0.01; const steps = Math.ceil((target - now()) / 0.25);
  for (let i = 0; i < steps; i++) { const dt = Math.min(0.25, target - now()); if (dt <= 0) break; S.clock.t += dt; moveCaptains(dt); timers(); if (typeof SCN_RUNTIME !== 'undefined') SCN_RUNTIME.tick(); }
  autopilot();
  return true;
}

/* ------------------------------------------------------------ ETA for the customer */
function etaInfo(o) {
  if (!o || !isActive(o)) return null;
  const route2 = MAP.route(M(o.mid).node, addrOf(o).node); const trip = MAP.minutes(MAP.lengthOf(route2));
  let rem = 0;
  if (['placed', 'accepted'].includes(o.st)) rem = o.prep + trip + 2 + (o.st === 'placed' ? 1 : 0);
  else if (o.st === 'preparing') rem = Math.max(0, (o.readyAt || now()) - now()) + trip + 1;
  else if (o.st === 'ready') rem = (o.cap && o.cap.phase === 'to_merchant' ? (o.cap.len - o.cap.dist) / MAP.SPEED : 1) + trip + 1;
  else if (['picked_up', 'in_transit', 'reattempt'].includes(o.st)) rem = o.cap && o.cap.phase === 'to_customer' ? (o.cap.len - o.cap.dist) / MAP.SPEED : 0;
  if (o.cap && o.cap.stopped) rem += 12;
  const lo = Math.max(1, Math.round(rem)), hi = lo + (rem > 10 ? 10 : 4);
  return { lo, hi, rem, clock: clockStr(now() + rem), late: !!o.lateFlag, uncertain: S.set.gps !== 'accurate' || (o.cap && o.cap.stopped) };
}

/* ------------------------------------------------------------ money: "where is the money?" */
function moneyOf(o) {
  const commission = Math.round(o.sub * ECON.commissionPct) / 100;
  const share = Math.round(o.del * ECON.captainSharePct) / 100;
  const merchantNet = o.sub - commission;
  const wasalyRev = commission + (o.del - share) + o.svc - o.disc;
  const tripKm = (MAP.lengthOf(MAP.route(M(o.mid).node, addrOf(o).node)) * MAP.M_PER_UNIT) / 1000;
  const r = { commission, share, merchantNet, wasalyRev, tripKm, fuel: +(tripKm * 2 * ECON.fuelPerKm).toFixed(1) };
  const delivered = ['delivered', 'completed'].includes(o.st);
  const failed = o.st === 'failed_delivery' || o.label === 'failed_delivery_tag' || (o.cnd && !delivered && o.st !== 'cancelled');
  r.phase = delivered ? (o.st === 'completed' ? 'completed' : 'delivered') : failed ? 'failed' : o.st === 'cancelled' ? 'cancelled' : 'open';
  r.customerPaid = delivered && o.pay.method === 'cash' ? (o.pay.collected || 0) : (o.pay.method === 'card' && ['authorized_sim', 'captured_sim'].includes(o.pay.state) ? o.total : 0);
  r.captainHolds = delivered && o.pay.method === 'cash' && o.pay.state === 'collected' ? o.pay.collected : 0;
  r.refund = o.refund ? o.refund.amount : 0;
  r.expectedLoss = 0; r.actualLoss = 0; r.undecided = [];
  r.goods = null;
  if (r.phase === 'failed' || (o.st === 'cancelled' && o.cancel && o.cancel.tagged)) {
    r.expectedLoss = r.fuel; // only the trip cost is certain (illustrative fuel figure)
    r.undecided.push('FDR-0001', 'FDR-0002');
    // the food at menu price; its real cost is unknown and who carries it is FDR-0001 — no invented split
    const opt = o.sim && o.sim.option;
    r.goods = { amount: o.sub, bearer: opt === 'أ' ? 'merchant' : opt === 'ب' ? 'wasaly' : opt === 'ج' ? 'table' : null };
  }
  return r;
}
