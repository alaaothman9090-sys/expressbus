/* ==========================================================================
   ui-founder.js — simulator controls + founder review layer
   ========================================================================== */
const JOURNEY = [
  { n: 1, ar: 'فتح التطبيق', en: 'Open app', prev: 1 }, { n: 2, ar: 'العنوان', en: 'Address', prev: 2 }, { n: 3, ar: 'التصفح', en: 'Browse', prev: 3 },
  { n: 4, ar: 'المتجر', en: 'Store', prev: 3 }, { n: 5, ar: 'المنتج', en: 'Product', prev: 4 }, { n: 6, ar: 'السلة', en: 'Cart', prev: 5 },
  { n: 7, ar: 'المستلم', en: 'Recipient', prev: null }, { n: 8, ar: 'الدفع', en: 'Payment', prev: 6 }, { n: 9, ar: 'التأكيد', en: 'Confirm', prev: 7 },
  { n: 10, ar: 'التاجر', en: 'Merchant', prev: 8 }, { n: 11, ar: 'التحضير', en: 'Preparation', prev: 9 }, { n: 12, ar: 'تعيين الكابتن', en: 'Captain assigned', prev: 10 },
  { n: 13, ar: 'الاستلام من التاجر', en: 'Pickup', prev: 11 }, { n: 14, ar: 'الطريق', en: 'On the road', prev: 12 }, { n: 15, ar: 'الوصول', en: 'Arrival', prev: 13 },
  { n: 16, ar: 'الدفع عند الاستلام', en: 'Cash payment', prev: 15 }, { n: 17, ar: 'إثبات التسليم', en: 'Proof of delivery', prev: 16 }, { n: 18, ar: 'التقييم', en: 'Rating', prev: 17 },
];
const STEP7 = { what: 'المشتري بيحدد مين هيستلم، وعنوانه، ومين هيدفع، ولو هيخفي السعر.', who: 'العميل (المشتري)', pol: ['CUSTOMER_007'], problems: ['النظام يعرف حساب واحد', 'إخفاء السعر مستحيل مع الكاش', 'إشعارات ممكن تكشف الهدية'], solution: 'حقول مستلم منفصلة + منع «إخفاء السعر» لما المستلم هو اللي يدفع.', decision: '—', st: ['proposed', 'notbuilt'] };

function journeyStatuses() {
  const o = activeOrder();
  const st = Array(19).fill('waiting');
  if (!o) {
    const c = S.cust; const top = S.cust.stage === 'app' ? topOf('customer').s : null;
    if (c.stage !== 'splash') st[1] = 'completed';
    if (c.stage === 'app' || c.onb >= 7) st[2] = 'completed'; else if (c.stage === 'onb' && c.onb >= 4) st[2] = 'active';
    if (c.stage === 'app') {
      const order = ['home', 'merchant', 'product', 'cart', 'recipient', 'payment', 'checkout'];
      const idx = { home: 3, explore: 3, cat: 3, merchant: 4, cart: 6, recipient: 7, payment: 8, schedule: 9, checkout: 9 }[top] || 3;
      for (let i = 3; i < idx; i++) st[i] = 'completed';
      st[idx] = S.sheet && S.sheet.kind === 'product' ? 'completed' : 'active';
      if (S.sheet && S.sheet.kind === 'product') st[5] = 'active';
      void order;
    } else st[1] = c.stage === 'splash' ? 'active' : 'completed';
    return st;
  }
  for (let i = 1; i <= 9; i++) st[i] = 'completed';
  if (o.rcp.mode !== 'other') st[7] = 'completed';
  const S2 = o.st; const phase = o.cap && o.cap.phase;
  const done = (n) => { st[n] = 'completed'; }; const act = (n) => { st[n] = 'active'; };
  if (S2 === 'placed') act(10);
  if (['accepted', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'completed', 'reattempt'].includes(S2)) done(10);
  if (S2 === 'accepted') act(11);
  if (S2 === 'preparing') act(11);
  if (['ready', 'picked_up', 'in_transit', 'delivered', 'completed', 'reattempt'].includes(S2)) done(11);
  if (o.offer) act(12); if (o.kid) done(12);
  if (phase === 'at_merchant') act(13);
  if (['picked_up', 'in_transit', 'delivered', 'completed', 'reattempt'].includes(S2)) done(13);
  if (phase === 'to_customer') act(14);
  if (['at_customer', 'waiting_ops'].includes(phase) || ['delivered', 'completed'].includes(S2)) done(14);
  if (phase === 'at_customer') act(15);
  if (['delivered', 'completed'].includes(S2)) { done(15); done(16); done(17); }
  if (phase === 'at_customer' && o.handover) act(16);
  if (S2 === 'delivered' && !o.rating) act(18); if (o.rating) done(18);
  if (o.cnd && isActive(o)) { st[15] = o.gate ? 'blocked' : 'failed'; st[16] = 'blocked'; st[17] = 'blocked'; }
  if (S2 === 'cancelled') { for (let i = 10; i <= 18; i++) if (st[i] !== 'completed') st[i] = 'failed'; if (o.label) { st[15] = 'failed'; } }
  if (S2 === 'failed_delivery') { for (let i = 15; i <= 18; i++) st[i] = 'failed'; }
  if (o.changeIssue && !['delivered', 'completed'].includes(S2)) st[16] = 'blocked';
  if (o.lines.some((l) => l.state === 'out') && o.pending.some((a) => a.kind === 'c_sub')) st[11] = 'blocked';
  return st;
}

/* ---------------------------------------------------------------- side panel (desktop controls) */
function renderSide() {
  const r = S.set.role;
  const counts = reviewCounts();
  const o = activeOrder();
  return `<div class="side-inner">
    <div class="side-brand"><span class="wordmark">${L('وصّلي', 'Wasaly')}</span><div><b>${L('محاكي التجربة الكاملة', 'Full experience simulator')}</b><small>${ic('flask-conical', 12)}${L('محاكاة — مش التطبيق الحقيقي', 'Simulation — not the real app')}</small></div></div>
    <section class="side-sec"><h2 class="side-h">${ic('users', 16)}${L('وضع المحاكاة', 'Simulation role')}</h2>
      <div class="role-list" role="radiogroup" aria-label="${attr(L('الدور', 'Role'))}">${ROLES.map((k) => { const pend = pendingFor(k).filter(({ o, a }) => userControlsRole(k, o, a)).length; return `<button type="button" role="radio" aria-checked="${r === k}" class="${cls('role-btn', r === k && 'on')}" data-act="role" data-v="${k}">${ic(ROLE_META[k].icon, 18)}<span>${L(ROLE_META[k].ar, ROLE_META[k].en)}</span>${pend ? `<span class="count" title="${attr(L('مطلوب منك', 'Needs you'))}">${pend}</span>` : ''}</button>`; }).join('')}</div></section>
    <section class="side-sec"><h2 class="side-h">${ic('split', 16)}${L('اختيار السيناريو', 'Scenario')}</h2>
      <label class="sr-only" for="scn-sel">${L('السيناريو', 'Scenario')}</label>
      <select id="scn-sel" class="input" data-change="scn-pick">${Object.entries(SCENARIOS).map(([k, s]) => `<option value="${k}" ${S.pickScn === k || (!S.pickScn && S.scenario.id === k) ? 'selected' : ''}>${k} — ${esc(L(s.title, s.en))}${s.flagship ? ' ★' : ''}</option>`).join('')}</select>
      ${scnBrief(S.pickScn || S.scenario.id || 'B')}
      <div class="stack-8">${btn(L('ابدأ السيناريو', 'Start scenario'), 'scn-start', { icon: 'play', block: true })}${btn(L('اختبر مشكلة', 'Inject a problem'), 'inject-open', { icon: 'triangle-alert', kind: 'secondary', block: true })}</div></section>
    <section class="side-sec"><h2 class="side-h">${ic('clock', 16)}${L('الوقت', 'Time')} <span class="sim-clock num">${clockStr(now())}</span></h2>
      ${seg('speed', S.set.paused ? 'pause' : String(S.set.speed), [{ v: 'pause', icon: 'pause', title: L('إيقاف مؤقت', 'Pause') }, { v: '1', label: '1×' }, { v: '2', label: '2×' }, { v: '5', label: '5×' }], 'speed')}
      ${btn(L('الخطوة الجاية', 'Next event'), 'skip', { kind: 'ghost', size: 'sm', icon: 'skip-forward', block: true })}
      <div class="toggle-row"><span>${L('تشغيل تلقائي للأطراف التانية', 'Autopilot other roles')}</span>${toggle(S.set.autopilot, 'autopilot', L('تشغيل تلقائي', 'Autopilot'))}</div></section>
    <section class="side-sec"><h2 class="side-h">${ic('wifi', 16)}${L('الشبكة', 'Network')}</h2>${seg('network', S.set.network, [{ v: 'good', label: L('كويسة', 'Good') }, { v: 'slow', label: L('بطيئة', 'Slow') }, { v: 'offline', label: L('مقطوعة', 'Offline') }, { v: 'timeout', label: 'Timeout' }, { v: 'error', label: '500' }], 'setk')}
      <h2 class="side-h">${ic('locate-fixed', 16)}GPS</h2>${seg('gps', S.set.gps, [{ v: 'accurate', label: L('دقيق', 'Accurate') }, { v: 'weak', label: L('ضعيف', 'Weak') }, { v: 'unavailable', label: L('مش متاح', 'Off') }, { v: 'outside', label: L('برّه', 'Outside') }, { v: 'manual', label: L('يدوي', 'Manual') }], 'setk')}</section>
    <section class="side-sec"><h2 class="side-h">${ic('smartphone', 16)}${L('الجهاز والعرض', 'Device & display')}</h2>
      ${seg('device', S.set.device, [{ v: '360', label: '360' }, { v: '375', label: '375' }, { v: '390', label: '390' }, { v: '412', label: '412' }], 'setk')}
      ${seg('theme', S.set.theme, [{ v: 'system', icon: 'monitor', title: L('زي الجهاز', 'System') }, { v: 'light', icon: 'sun', title: L('فاتح', 'Light') }, { v: 'dark', icon: 'moon', title: L('غامق', 'Dark') }], 'seg')}
      ${seg('lang', S.set.lang, [{ v: 'ar', label: 'عربي' }, { v: 'en', label: 'EN' }], 'seg')}</section>
    <section class="side-sec side-review"><div class="toggle-row"><div><b>${L('وضع مراجعة المؤسس', 'Founder review mode')}</b><small>${L('يظهر الملاحظات على الشاشات', 'Shows markers on screens')}</small></div>${toggle(S.set.review, 'review', L('وضع المراجعة', 'Review mode'))}</div>
      ${btn(`${L('مركز المراجعة', 'Review center')}`, 'rc-open', { kind: 'secondary', block: true, icon: 'clipboard-list', tail: `<span class="count">${counts.problem}</span>` })}</section>
    <section class="side-sec">${btn(L('إعادة ضبط المحاكاة', 'Reset simulation'), 'reset', { kind: 'danger-ghost', block: true, icon: 'rotate-ccw' })}</section>
    ${o ? `<p class="side-foot">${L('الطلب الحالي', 'Current order')} <bdi dir="ltr">${o.id}</bdi> · ${stPill(o.st)}</p>` : ''}
  </div>`;
}
function userControlsRole(role, o, a) { if (role === 'captain') return (a.kid || o.kid) === S.nav.captain.kid; if (role === 'merchant') return o.mid === S.nav.merchant.mid; return true; }
function scnBrief(id) {
  const s = SCENARIOS[id]; if (!s) return '';
  const t = TRUTH[s.truth];
  return `<div class="scn-brief"><div class="truth-row">${truth(t[2], { label: L(t[0], t[1]) })}${s.flagship ? `<span class="pill pill-brand">${ic('star', 12)}${L('السيناريو الرئيسي', 'Flagship')}</span>` : ''}</div><p>${esc(s.desc)}</p><details><summary>${L('اللي بيحصل النهارده / السياسة / المفتوح', 'Today / policy / open')}</summary><p><b>${L('النهارده:', 'Today:')}</b> ${esc(s.today)}</p><p><b>${L('السياسة:', 'Policy:')}</b> ${esc(s.policy)}</p><p><b>${L('مفتوح:', 'Open:')}</b> ${esc(s.open)}</p><div class="chips-row">${(s.pol || []).map((p) => P(p)).join('')}${(s.fdr || []).map((p) => P(p)).join('')}</div><p class="muted small">${[...(s.inc || []), ...(s.scn || []), ...(s.cfl || [])].join(' · ')}</p></details></div>`;
}

/* ---------------------------------------------------------------- founder panel */
const PANEL_TABS = [{ id: 'state', icon: 'activity', ar: 'الحالة', en: 'State' }, { id: 'policy', icon: 'scroll-text', ar: 'السياسة', en: 'Policy' }, { id: 'money', icon: 'banknote', ar: 'الفلوس فين؟', en: 'Money' }, { id: 'journey', icon: 'route', ar: 'الرحلة', en: 'Journey' }, { id: 'notes', icon: 'clipboard-list', ar: 'الملاحظات', en: 'Notes' }];
function renderPanel(withControls) {
  const tabs = withControls ? [{ id: 'controls', icon: 'sliders-horizontal', ar: 'التحكم', en: 'Controls' }].concat(PANEL_TABS) : PANEL_TABS;
  let tab = S.set.panel; if (!tabs.some((t) => t.id === tab)) tab = 'state';
  const body = tab === 'controls' ? renderSide() : { state: panelState, policy: panelPolicy, money: panelMoney, journey: panelJourney, notes: panelNotes }[tab]();
  return `<div class="panel-inner"><nav class="${cls('ptabs', withControls && 'ptabs-6')}" role="tablist" aria-label="${attr(L('لوحة المؤسس', 'Founder panel'))}">${tabs.map((t) => `<button type="button" role="tab" id="ptab-${t.id}" aria-controls="pbody" aria-selected="${tab === t.id}" tabindex="${tab === t.id ? 0 : -1}" class="${cls('ptab', tab === t.id && 'on')}" data-act="panel" data-v="${t.id}">${ic(t.icon, 18)}<span>${L(t.ar, t.en)}</span>${t.id === 'notes' && S.set.review && CUR.anno.size ? `<span class="count">${CUR.anno.size}</span>` : ''}</button>`).join('')}</nav>
    <div class="pbody" id="pbody" role="tabpanel" aria-labelledby="ptab-${tab}" data-key="pbody-${tab}">${body}</div></div>`;
}
function panelState() {
  const o = activeOrder();
  const pend = ROLES.flatMap((r) => pendingFor(r).map(({ o: oo, a }) => ({ r, oo, a })));
  return `<div class="stack-12">
    ${o ? `<section class="card stack-8"><div class="row-between"><b dir="ltr" class="num">${o.id}</b>${stPill(o.st)}</div>
      <div class="kv"><span>${L('المتجر', 'Store')}</span><b>${esc(mName(o.mid))} · ${stPillStore(S.merchants[o.mid].status)}</b><span>${L('الكابتن', 'Captain')}</span><b>${o.kid ? esc(kName(o.kid)) + ' · ' + phaseLabel(o) : o.offer ? L(`عرض عند ${kName(o.offer.kid)}`, `Offer with ${kName(o.offer.kid)}`) : '—'}</b><span>${L('الدفع', 'Payment')}</span><b>${payLabel(o.pay.method)} · ${payStateLabel(o)}</b><span>${L('المستلم', 'Recipient')}</span><b>${o.rcp.mode === 'other' ? esc(o.rcp.name) : L('العميل', 'Customer')}</b><span>${L('السيناريو', 'Scenario')}</span><b>${o.scn ? `${o.scn} — ${esc(L(SCENARIOS[o.scn].title, SCENARIOS[o.scn].en))}` : L('طلب حر', 'Free order')}</b></div>
      ${o.sim.proposed ? banner('info', 'flask-conical', L(`محاكاة لحل مقترح${o.sim.option ? ` (خيار ${o.sim.option} من ${o.sim.fdr})` : ''} — مش قرار معتمد`, 'Simulated proposal — not an approved decision')) : ''}
      ${o.gate ? `${banner('warning', 'scale', L('قرار مفتوح: مصير البضاعة والفلوس (FDR-0001) — المحاكي مش هيختار.', 'Open decision: FDR-0001 — the simulator will not choose.'))}${btn(L('قارن الحلول', 'Compare solutions'), 'compare-open', { size: 'sm', icon: 'split', data: { fdr: 'FDR-0001', id: o.id } })}` : ''}
    </section>` : `<section class="card stack-12 quickstart"><h3 class="h-sm">${ic('play', 16)}${L('ابدأ من هنا', 'Start here')}</h3>
      <ol class="qs-steps"><li>${L('اختار الدور اللي عايز تجرّبه: العميل، المستلم، التاجر، الكابتن، أو أي لوحة داخلية.', 'Pick a role: customer, recipient, merchant, captain or an internal desk.')}</li><li>${L('ابدأ سيناريو — أو اطلب بنفسك من تطبيق العميل. كل الأدوار شايفة نفس الطلب.', 'Start a scenario — or order yourself. Every role sees the same order.')}</li><li>${L('شغّل «وضع المراجعة» عشان تشوف المشاكل والقرارات المفتوحة على كل شاشة.', 'Turn on review mode to see problems and open decisions on every screen.')}</li></ol>
      ${btn(L('ابدأ السيناريو الرئيسي: رفض أوردر كاش (B)', 'Start the flagship: a refused cash order (B)'), 'scn-quick', { data: { v: 'B' }, icon: 'play', block: true })}
      <p class="muted small">${L(`${FINDINGS.length} ملاحظة مراجعة · ${Object.keys(SCENARIOS).length} سيناريو · ${PREV.DECISIONS.length} قرار مؤسس مفتوح — ولا واحد منهم اتحسم هنا.`, `${FINDINGS.length} findings · ${Object.keys(SCENARIOS).length} scenarios · ${PREV.DECISIONS.length} open founder decisions — none decided here.`)}</p></section>`}
    <section class="card stack-8">${sectionHead(L('مين مطلوب منه حاجة دلوقتي؟', 'Who needs to act now?'), { icon: 'hand' })}${pend.length ? pend.map(({ r, oo, a }) => `<button type="button" class="pend-row" data-act="role" data-v="${r}">${ic(ROLE_META[r].icon, 16)}<span><b>${L(ROLE_META[r].ar, ROLE_META[r].en)}</b> — ${pendLabel(a)}</span><small class="num" dir="ltr">${oo.id}</small>${GATED.has(a.kind) ? truth('decision', { label: L('بشري بس', 'Human only') }) : ''}</button>`).join('') : `<p class="muted">${L('ولا حد.', 'No one.')}</p>`}</section>
    ${o ? `<section class="card">${sectionHead(L('سجل الانتقالات', 'Transitions log'), { icon: 'history' })}${tlList(o, 'ops')}</section>` : ''}
    ${o && o.injected ? `<p class="muted small">${L('مشاكل اتحقنت:', 'Injected:')} ${o.injected.map((x) => L(INJECT[x.key].ar, INJECT[x.key].en)).join(' · ')}</p>` : ''}
  </div>`;
}
const pendLabel = (a) => ({ m_accept: L('يقبل أو يرفض الطلب', 'accept or decline'), m_start: L('يبدأ التحضير', 'start preparing'), m_ready: L('يعلّم الطلب جاهز', 'mark ready'), k_offer: L('يرد على العرض', 'answer the offer'), k_pickup: L('يستلم من المتجر', 'pick up'), c_handover: L('يقابل الكابتن ويدفع', 'meet the captain and pay'), k_deliver: L('يأكد التسليم', 'confirm delivery'), k_report: L('يبلّغ تعذّر التسليم', 'report cannot-deliver'), o_call: L('اتصال مستقل من رقم تاني', 'independent call'), o_hypo: L('يسجل الفرضية', 'record hypothesis'), c_sub: L('يختار بديل/حذف/إلغاء', 'choose substitute/remove/cancel'), c_late: L('يستنى ولا يلغي', 'wait or cancel'), c_nothome: L('يقرر: جاي ولا لأ', 'decide'), m_close_decide: L('يكمّل ولا يلغي الطلب', 'complete or cancel'), o_change: L('يحل مشكلة الفكة', 'solve the change problem'), o_transfer: L('ينقل الطلب لكابتن تاني', 'hand over to another captain') }[a.kind] || a.kind);

function panelPolicy() {
  const ids = Array.from(CUR.pol);
  const byCh = {}; MANUAL.policies.forEach((p) => { (byCh[p.chapter] = byCh[p.chapter] || { t: p.chapterTitle, list: [] }).list.push(p); });
  return `<div class="stack-12"><p class="muted small">${L('السياسات المرتبطة بالشاشة اللي قدامك دلوقتي.', 'Policies linked to the current screen.')}</p>${ids.length ? ids.map((id) => policyCard(id, true)).join('') : `<p class="muted">${L('الشاشة دي مالهاش سياسة مرتبطة.', 'No linked policy.')}</p>`}
    <details class="pol-index"><summary>${L(`كل سياسات الدليل (${MANUAL.policies.length}) — مسودات`, `All manual policies (${MANUAL.policies.length}) — drafts`)}</summary>
      ${Object.keys(byCh).sort((a, b) => a - b).map((ch) => `<div class="pol-ch"><small>${L('الفصل', 'Chapter')} ${ch} — ${esc(byCh[ch].t)}</small><div class="chips-row">${byCh[ch].list.map((p) => `<button type="button" class="pol-chip" data-act="policy" data-id="${attr(p.id)}" title="${attr(p.name)}">${ic('scroll-text', 12)}<span>${esc(p.id)}</span></button>`).join('')}</div></div>`).join('')}
    </details></div>`;
}
function policyCard(id, compact) {
  if (/^FDR-/.test(id)) return fdrCard(id, compact);
  const p = MANUAL.policies.find((x) => x.id === id); if (!p) return '';
  const supTone = { 'مدعومة': 'current', 'مدعومة جزئيًا': 'unknown', 'غير مبنية': 'notbuilt', 'غير محقَّقة': 'unknown', 'الكود يخالف القاعدة': 'problem' }[p.support] || 'unknown';
  return `<article class="card polcard"><header class="row-between"><div><span class="msgq-id" dir="ltr">${p.id}</span><h3>${esc(p.name)}</h3><small class="muted">${L('الفصل', 'Chapter')} ${p.chapter} — ${esc(p.chapterTitle)} · ${p.priority}</small></div>${compact ? iconBtn('maximize-2', L('افتح', 'Open'), 'policy', { data: { id: p.id }, size: 16 }) : ''}</header>
    <div class="truth-row">${truth('draft', { label: L(`الحالة: ${p.doc}`, `Status: ${p.doc}`) })}${truth(supTone, { label: L(`النظام: ${p.support}`, `System: ${p.support}`) })}</div>
    <p class="polsum">${esc((p.summary[0] || '').slice(0, compact ? 260 : 600))}${(p.summary[0] || '').length > (compact ? 260 : 600) ? '…' : ''}</p>
    ${!compact ? `<div class="kv"><span>${L('الجاهزية', 'Readiness')}</span><b>${esc(p.readiness)}</b><span>${L('الأدلة', 'Evidence')}</span><b>${esc(p.evidence)}</b><span>${L('المالك / المعتمد', 'Owner / approver')}</span><b>${esc(p.owner)} / ${esc(p.approver)}</b></div>${p.open ? `<p><b>${L('مفتوح:', 'Open:')}</b> ${esc(p.open)}</p>` : ''}` : ''}
    ${p.fdr.length ? `<div class="chips-row">${p.fdr.map((f) => `<button type="button" class="pol-chip fdr" data-act="policy" data-id="${f.replace('CPOS001-', '')}">${ic('scale', 12)}${f.replace('CPOS001-', '')}</button>`).join('')}</div>` : ''}
    ${!compact && (p.val.length || p.par.length) ? `<p class="muted small">${[...p.val, ...p.par].map((x) => x.replace('CPOS001-', '')).join(' · ')}</p>` : ''}</article>`;
}
function fdrCard(id, compact) {
  const d = PREV.DECISIONS.find((x) => x.code === id); if (!d) return '';
  return `<article class="card polcard fdrcard"><header class="row-between"><div><span class="msgq-id" dir="ltr">${d.code}</span><h3>${esc(d.title)}</h3><small class="muted">${{ now: L('فوري', 'Immediate'), pilot: L('قبل التجربة', 'Before the pilot'), launch: L('قبل الإطلاق', 'Before launch') }[d.urg]} · ${esc(d.rev)}</small></div>${compact ? iconBtn('maximize-2', L('افتح', 'Open'), 'policy', { data: { id }, size: 16 }) : ''}</header>
    <div class="truth-row">${truth('decision')}</div><p class="polsum">${esc(compact ? d.problem.slice(0, 220) + (d.problem.length > 220 ? '…' : '') : d.problem)}</p>
    ${!compact ? `<p><b>${L('ليه مهم:', 'Why it matters:')}</b> ${esc(d.why)}</p><p><b>${L('لو ما اتاخدش:', 'If not taken:')}</b> ${esc(d.ifnot)}</p>` : ''}
    <div class="rec-box"><span>${L('توصية البحث (حزمة السياسات)', 'Research recommendation (policy package)')}</span><b>${esc(d.rec)}</b><small>${L('الثقة:', 'Confidence:')} ${esc(d.conf)}</small></div>
    <div class="decision-box">${ic('scale', 16)}<span>${L('قرار المؤسس: لم يُتخذ. المحاكي ما بيقررش.', 'Founder decision: not taken. The simulator does not decide.')}</span></div>
    ${btn(L('قارن الحلول', 'Compare solutions'), 'compare-open', { kind: 'secondary', size: 'sm', icon: 'split', data: { fdr: id } })}</article>`;
}

function goodsBearer(b) {
  return { merchant: L('على التاجر (محاكاة الخيار أ)', 'on the merchant (simulating option A)'), wasaly: L('على وصّلي (محاكاة الخيار ب)', 'on Wasaly (simulating option B)'), table: L('حسب جدول الفئة — والجدول مش موجود (محاكاة الخيار ج)', 'per the category table — which does not exist (option C)') }[b] || L('مين يتحمله؟ غير محسوم (FDR-0001)', 'who carries it? undecided (FDR-0001)');
}
function panelMoney() {
  const o = activeOrder();
  if (!o) return `<div class="stack-12"><p class="muted">${L('ابدأ سيناريو عشان تشوف الفلوس بتتحرك إزاي.', 'Start a scenario to see how money moves.')}</p>${btn(L('ابدأ السيناريو الرئيسي (B)', 'Start flagship scenario (B)'), 'scn-quick', { data: { v: 'B' }, icon: 'play' })}</div>`;
  const m = moneyOf(o); const cash = o.pay.method === 'cash'; const c = o.kid && S.captains[o.kid];
  const dep = c && c.deposits.length && m.phase !== 'open';
  let sentence;
  if (m.phase === 'open') sentence = cash ? L(`لحد دلوقتي محدش دفع حاجة — الـ${money(o.total)} لسه في جيب ${o.rcp.mode === 'other' && o.rcp.payer === 'recipient' ? 'المستلم' : 'العميل'}. التاجر شغال على حسابه، والكابتن مشواره لسه ما اتحسبلوش.`, `Nobody has paid yet — ${money(o.total)} is still with the customer.`) : L('المبلغ محجوز (محاكاة) لحد التسليم.', 'Amount held (simulated) until delivery.');
  else if (m.phase === 'delivered' || m.phase === 'completed') sentence = cash ? L(`الكابتن استلم ${money(o.pay.collected)} — دي فلوس وصّلي في إيده (عهدة) مش فلوسه. التاجر ليه ${money(m.merchantNet)} ووصّلي ليها ${money(m.wasalyRev)} والكابتن كسب ${money(m.share)}${o.tip ? ` + بقشيش ${money(o.tip)}` : ''}.`, `Captain collected ${money(o.pay.collected)} — Wasaly’s money in custody.`) : L('اتخصم (محاكاة).', 'Charged (simulated).');
  else if (m.phase === 'failed') sentence = L(`محدش دفع حاجة. الأكل (${money(o.sub)} بسعر القائمة) مع الكابتن ومش معروف مصيره. العمولة ما نشأتش — ودي مش خسارة. الخسارة الأكيدة: مشوار ≈ ${money(m.fuel)} بنزين (مثال) + وقت الكابتن. ولسه: مين يتحمل الأكل؟ والكابتن ياخد حاجة؟`, 'Nobody paid. The food is with the captain, fate unknown.');
  else sentence = L('الطلب اتلغى قبل ما أي فلوس تتحرك.', 'Cancelled before any money moved.');
  const node = (label, val, sub, tone) => `<div class="mf-node tone-${tone || 'neutral'}"><small>${label}</small><b class="num">${val}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
  const arrow = (label, status) => `<div class="mf-arrow mf-${status}"><span class="mf-line" aria-hidden="true"></span><small>${label}</small></div>`;
  const delivered = m.phase === 'delivered' || m.phase === 'completed';
  return `<div class="stack-12">
    <p class="mf-sentence">${sentence}</p>
    <div class="mf" aria-label="${attr(L('مسار الفلوس', 'Money flow'))}">
      ${node(L('العميل', 'Customer'), money(delivered ? m.customerPaid : 0), delivered ? L('دفع', 'paid') : L('لسه ما دفعش', 'not paid yet'), delivered ? 'success' : 'neutral')}
      ${arrow(cash ? L(`كاش ${money(o.total)} عند التسليم`, `Cash ${money(o.total)} at delivery`) : L('بطاقة (محاكاة)', 'Card (sim)'), delivered ? 'actual' : m.phase === 'failed' ? 'none' : 'expected')}
      ${node(L('الكابتن (عهدة)', 'Captain (custody)'), money(delivered && !dep ? m.captainHolds : 0), L('فلوس المنصّة في إيده — مش رصيده', 'Platform money — not his balance'), delivered && !dep ? 'warning' : 'neutral')}
      ${arrow(L('توريد يومي', 'Daily deposit'), dep ? 'actual' : delivered ? 'pending' : 'expected')}
      ${node(L('وصّلي', 'Wasaly'), money(delivered ? m.wasalyRev : 0), L(`عمولة ${ECON.commissionPct}% (مثال) + باقي التوصيل`, `${ECON.commissionPct}% commission (illustrative) + delivery remainder`), delivered ? 'info' : 'neutral')}
      <div class="mf-split">${arrow(L(`تسوية بعد ${ECON.settlementHours} س (مش معتمدة)`, `Settlement after ${ECON.settlementHours}h (unapproved)`), delivered ? 'pending' : 'expected')}${node(L('التاجر', 'Merchant'), m.phase === 'failed' ? '?' : money(delivered ? m.merchantNet : 0), m.phase === 'failed' ? L('غير محسوم (FDR-0001)', 'Undecided (FDR-0001)') : L('مستحق بعد التسوية', 'Due after settlement'), m.phase === 'failed' ? 'danger' : delivered ? 'info' : 'neutral')}${node(L('الكابتن (أرباح)', 'Captain (earnings)'), m.phase === 'failed' ? '?' : money(delivered ? m.share + (o.tip || 0) : 0), m.phase === 'failed' ? L('غير محسوم (FDR-0002)', 'Undecided (FDR-0002)') : L(`${ECON.captainSharePct}% (قيمة في الكود)`, `${ECON.captainSharePct}% (code value)`), m.phase === 'failed' ? 'danger' : delivered ? 'success' : 'neutral')}</div>
    </div>
    <table class="tbl"><tbody>
      <tr><th>${L('مين دفع؟', 'Who paid?')}</th><td>${delivered ? `${L('العميل', 'Customer')} ${money(m.customerPaid)}` : L('محدش', 'Nobody')}</td></tr>
      <tr><th>${L('الفلوس مع مين دلوقتي؟', 'Who holds it now?')}</th><td>${delivered ? (dep ? L('وصّلي (اتورّدت)', 'Wasaly (deposited)') : L('الكابتن — عهدة', 'Captain — custody')) : L('العميل', 'Customer')}</td></tr>
      <tr><th>${L('مين كسب؟', 'Who earned?')}</th><td>${delivered ? `${L('التاجر', 'Merchant')} ${money(m.merchantNet)} · ${L('الكابتن', 'Captain')} ${money(m.share)} · ${L('وصّلي', 'Wasaly')} ${money(m.wasalyRev)}` : L('لسه محدش — كله بيتقيّد عند التسليم', 'Nobody yet — booked at delivery')}</td></tr>
      <tr><th>${L('خسارة متوقعة', 'Expected loss')}</th><td>${m.expectedLoss ? `${L('مشوار', 'Trip')} ≈ ${money(m.expectedLoss)} ${L('(بنزين — مثال توضيحي)', '(fuel — illustrative)')}` : '—'}${m.goods ? `<br>${L('الأكل', 'Food')} ${money(m.goods.amount)} ${L('بسعر القائمة (التكلفة الحقيقية مش معروفة)', 'at menu price (real cost unknown)')} — ${goodsBearer(m.goods.bearer)}` : ''}</td></tr>
      <tr><th>${L('خسارة فعلية', 'Actual loss')}</th><td>${m.phase === 'failed' ? L('لسه ما اتحددتش — حسب القرار', 'Not determined — depends on the decision') : '—'}</td></tr>
      <tr><th>${L('متنازع عليه', 'Disputed')}</th><td>${o.tickets.map((t) => S.tickets[t]).filter((t) => t && t.kind === 'cash_diff').length ? L('فيه خلاف على الكاش', 'Cash dispute open') : '—'}</td></tr>
      <tr><th>${L('مستني تسوية', 'Awaiting settlement')}</th><td>${delivered ? `${L('التاجر', 'Merchant')} ${money(m.merchantNet)} · ${L('الكابتن', 'Captain')} ${money(m.share)}` : '—'}</td></tr>
      ${o.refund ? `<tr><th>${L('استرداد', 'Refund')}</th><td>${money(o.refund.amount)} · ${o.refund.stage}${o.refund.route ? ' · ' + routeLabel(o.refund.route) : ''}</td></tr>` : ''}
    </tbody></table>
    <div class="legend">${truth('unknown', { label: L(`العمولة ${ECON.commissionPct}% مثال توضيحي`, 'Commission illustrative') })}${truth('finance', { label: L('70% و48 ساعة قيم في الكود مش معتمدة', '70% and 48h unapproved') })}</div>
    ${m.phase === 'failed' ? btn(L('قارن الحلول (FDR-0001)', 'Compare solutions (FDR-0001)'), 'compare-open', { icon: 'split', block: true, data: { fdr: 'FDR-0001', id: o.id } }) : ''}
  </div>`;
}
function panelJourney() {
  const st = journeyStatuses(); const sel = S.journeySel || null;
  const label = { completed: L('خلص', 'Done'), active: L('شغال', 'Active'), waiting: L('مستني', 'Waiting'), failed: L('فشل', 'Failed'), blocked: L('محجوب — قرار', 'Blocked — decision') };
  const icon = { completed: 'circle-check', active: 'circle-dot', waiting: 'circle', failed: 'circle-x', blocked: 'ban' };
  return `<div class="stack-12"><ol class="journey">${JOURNEY.map((j) => `<li><button type="button" class="${cls('jstep', 'j-' + st[j.n], sel === j.n && 'sel')}" data-act="journey" data-v="${j.n}" aria-expanded="${sel === j.n}"><span class="jnum num">${j.n}</span>${ic(icon[st[j.n]], 16)}<span class="jname">${L(j.ar, j.en)}</span><small>${label[st[j.n]]}</small></button>${sel === j.n ? journeyDetail(j) : ''}</li>`).join('')}</ol></div>`;
}
function journeyDetail(j) {
  const d = j.prev ? PREV.STEPS.find((s) => s.id === j.prev) : STEP7;
  const stMap = { system: 'current', current: 'current', proposed: 'proposal', notbuilt: 'notbuilt', blocked: 'notbuilt', decision: 'decision', example: 'unknown' };
  return `<div class="jdetail stack-8"><div class="truth-row">${(d.st || []).map((x) => truth(stMap[x] || 'unknown')).join('')}</div><p>${esc(d.what)}</p><p><b>${L('مين:', 'Who:')}</b> ${esc(d.who)}</p>${d.money ? `<p><b>${L('الفلوس:', 'Money:')}</b> ${esc(d.money)}</p>` : ''}${d.problems && d.problems.length ? `<p><b>${L('مشاكل:', 'Problems:')}</b></p><ul>${d.problems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${d.solution ? `<p><b>${L('حل مقترح:', 'Proposed:')}</b> ${esc(d.solution)}</p>` : ''}${d.decision && d.decision !== '—' ? `<p><b>${L('قرار:', 'Decision:')}</b> ${esc(d.decision)}</p>` : ''}
    ${d.data ? `<p><b>${L('البيانات اللي بتتسجل:', 'Data recorded:')}</b> ${esc(d.data)}</p>` : ''}
    ${d.sees ? `<div class="kv jsees"><span>${L('العميل بيشوف', 'Customer sees')}</span><b>${esc(d.sees.c || '—')}</b><span>${L('التاجر بيشوف', 'Merchant sees')}</span><b>${esc(d.sees.m || '—')}</b><span>${L('الكابتن بيشوف', 'Captain sees')}</span><b>${esc(d.sees.k || '—')}</b><span>${L('النظام', 'System')}</span><b>${esc(d.sees.s || '—')}</b></div>` : ''}
    ${d.esc ? `<p><b>${L('التصعيد:', 'Escalation:')}</b> ${esc(d.esc)}</p>` : ''}
    <div class="chips-row">${(d.pol || []).filter((p) => /^[A-Z]+_\d{3}$|^FDR-/.test(p)).map((p) => P(p)).join('')}</div>
    ${(() => { const fs = FINDINGS.filter((f) => f.step === j.n); return fs.length ? `<details class="jfind"><summary>${L(`ملاحظات الخطوة دي (${fs.length})`, `Findings for this step (${fs.length})`)}</summary><div class="rc-list">${fs.map((f) => rcItem(f)).join('')}</div></details>` : ''; })()}</div>`;
}
function panelNotes() {
  if (!S.set.review) return `<div class="stack-12"><p>${L('شغّل «وضع مراجعة المؤسس» عشان تشوف الملاحظات على الشاشة.', 'Turn on founder review mode to see markers.')}</p>${btn(L('شغّل وضع المراجعة', 'Turn on review mode'), 'review', { icon: 'eye' })}</div>`;
  const ids = Array.from(CUR.anno);
  return `<div class="stack-8"><p class="muted small">${L('الملاحظات اللي ظاهرة في الشاشة دي:', 'Markers on this screen:')}</p>${ids.length ? ids.map((id) => findingRow(FINDINGS_BY_ID[id])).join('') : `<p class="muted">${L('مفيش ملاحظات على الشاشة دي.', 'No markers here.')}</p>`}${btn(L('افتح مركز المراجعة', 'Open review center'), 'rc-open', { kind: 'secondary', block: true, icon: 'clipboard-list' })}</div>`;
}
function findingRow(f) {
  const t = TRUTH_KINDS[f.type];
  return `<button type="button" class="frow st-${f.type}" data-act="anno" data-id="${f.id}">${ic(t.icon, 16)}<span class="frow-main"><b>${esc(f.title)}</b><small>${f.num} · ${L(t.ar, t.en)} · ${L(SEV[f.sev][0], SEV[f.sev][1])} · ${L(GROUP_AR[f.grp], f.grp)}</small></span>${fwd(16)}</button>`;
}

/* ---------------------------------------------------------------- counts & review center */
function reviewCounts() {
  const c = { problem: 0, proposal: 0, decision: 0, solution: 0 };
  FINDINGS.forEach((f) => { if (f.type === 'problem') c.problem++; if (f.type === 'proposal') c.proposal++; if (f.type === 'decision') c.decision++; if (f.type === 'solution') c.solution++; });
  c.decision += 0; c.fdr = PREV.DECISIONS.length;
  return c;
}
const RC_FILTERS = [['all', 'كل شيء', 'All'], ['problem', 'مشاكل', 'Problems'], ['proposal', 'اقتراحات', 'Proposals'], ['solution', 'حلول', 'Solutions'], ['decision', 'قرار المؤسس', 'Founder decision'], ['legal', 'قانوني', 'Legal'], ['finance', 'مالي', 'Financial'], ['tech', 'تقني', 'Technical'], ['ux', 'تجربة المستخدم', 'UX'], ['ops', 'تشغيل', 'Operations'], ['truth', 'حالة النظام', 'System truth']];
function rcMatch(f, flt) {
  if (flt === 'all') return true;
  if (['problem', 'proposal', 'solution', 'decision'].includes(flt)) return f.type === flt;
  if (flt === 'legal') return f.type === 'legal' || f.cat === 'legal';
  if (flt === 'finance') return f.type === 'finance' || f.cat === 'finance';
  if (flt === 'truth') return ['current', 'notbuilt', 'unknown', 'sim', 'draft', 'pilot'].includes(f.type);
  return f.cat === flt;
}
function renderReviewCenter() {
  const R = S.review; const q = (R.q || '').trim();
  const list = FINDINGS.filter((f) => rcMatch(f, R.filter) && (!q || (f.title + f.what + f.num + (f.pol || []).join(' ')).includes(q)));
  const counts = reviewCounts();
  const groupKey = R.group === 'area' ? 'grp' : R.group === 'sev' ? 'sev' : 'type';
  const groups = {}; list.forEach((f) => { (groups[f[groupKey]] = groups[f[groupKey]] || []).push(f); });
  const order = groupKey === 'grp' ? GROUPS : groupKey === 'sev' ? ['critical', 'high', 'medium', 'low'] : Object.keys(TRUTH_KINDS);
  const gl = (k) => groupKey === 'grp' ? L(GROUP_AR[k], k) : groupKey === 'sev' ? L(SEV[k][0], SEV[k][1]) : L(TRUTH_KINDS[k].ar, TRUTH_KINDS[k].en);
  return `<div class="overlay" data-key="rc"><button type="button" class="scrim" data-act="rc-close" aria-label="${attr(L('إغلاق', 'Close'))}" tabindex="-1"></button>
    <section class="rc" role="dialog" aria-modal="true" aria-labelledby="rc-t" tabindex="-1">
      <header class="rc-head"><div><h2 id="rc-t">${L('مركز مراجعة التجربة', 'Experience review center')}</h2><p class="muted">${L(`${FINDINGS.length} ملاحظة · ${counts.problem} مشكلة · ${counts.proposal} اقتراح · ${counts.solution} حل مقترح · ${counts.decision} قرار مطلوب + ${counts.fdr} قرارات مؤسس في السجل`, `${FINDINGS.length} findings`)}</p></div>${iconBtn('x', L('إغلاق', 'Close'), 'rc-close')}</header>
      <div class="rc-tools"><label class="search-box sm">${ic('search', 18)}<input type="search" class="search-input" data-bind="rc-q" value="${attr(R.q || '')}" placeholder="${attr(L('دوّر في الملاحظات…', 'Search findings…'))}" aria-label="${attr(L('بحث', 'Search'))}"></label>
        <div class="chips-row rc-filters" role="radiogroup" aria-label="${attr(L('تصفية', 'Filter'))}">${RC_FILTERS.map(([k, a, e]) => `<button type="button" role="radio" aria-checked="${R.filter === k}" class="chip-btn ${R.filter === k ? 'on' : ''}" data-act="rc-filter" data-v="${k}">${L(a, e)} <span class="num">${FINDINGS.filter((f) => rcMatch(f, k)).length}</span></button>`).join('')}</div>
        <div class="rc-group"><span>${L('تجميع حسب', 'Group by')}</span>${seg('rcgroup', R.group, [{ v: 'area', label: L('الجهة', 'Area') }, { v: 'sev', label: L('الخطورة', 'Severity') }, { v: 'type', label: L('النوع', 'Type') }], 'rc-group')}</div></div>
      <div class="rc-body">${order.filter((k) => groups[k]).map((k) => `<section class="rc-sec"><h3>${gl(k)} <span class="count">${groups[k].length}</span></h3><div class="rc-list">${groups[k].sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.sev) - ['critical', 'high', 'medium', 'low'].indexOf(b.sev)).map((f) => rcItem(f)).join('')}</div></section>`).join('') || empty('', L('مفيش نتايج', 'No results'), '')}
        <section class="rc-sec"><h3>${L('سجل قرارات المؤسس', 'Founder decision register')} <span class="count">${PREV.DECISIONS.length}</span></h3><div class="rc-list">${PREV.DECISIONS.map((d) => `<button type="button" class="rc-item st-decision" data-act="policy" data-id="${d.code}">${ic('scale', 18)}<span class="rc-main"><b>${d.code} — ${esc(d.title)}</b><small>${L('توصية البحث:', 'Research rec:')} ${esc(d.rec.slice(0, 80))}… · ${L('قرار المؤسس: لم يُتخذ', 'Founder decision: not taken')}</small></span></button>`).join('')}</div></section>
      </div></section></div>`;
}
function rcItem(f) {
  const t = TRUTH_KINDS[f.type];
  return `<button type="button" class="rc-item st-${f.type}" data-act="anno" data-id="${f.id}">${ic(t.icon, 18)}<span class="rc-main"><b>${f.num} — ${esc(f.title)}</b><small>${L(t.ar, t.en)} · <span class="sev sev-${f.sev}">${L(SEV[f.sev][0], SEV[f.sev][1])}</span> · ${L(ROLE_META[f.role] ? ROLE_META[f.role].ar : f.role, f.role)} · ${L('خطوة', 'step')} ${f.step} · ${(f.pol || []).slice(0, 2).join(' ')}</small></span>${fwd(16)}</button>`;
}

/* ---------------------------------------------------------------- annotation detail sheet */
function renderAnnoSheet(id) {
  const f = FINDINGS_BY_ID[id]; if (!f) return '';
  const t = TRUTH_KINDS[f.type];
  const yes = (b) => (b ? `<span class="ok-t">${ic('check', 14)}${L('نعم', 'Yes')}</span>` : `<span class="muted">${L('لا', 'No')}</span>`);
  const rowF = (label, v) => (v && v !== '—' ? `<div class="af-row"><dt>${label}</dt><dd>${v}</dd></div>` : '');
  return `<div class="overlay overlay-top" data-key="anno-${id}"><button type="button" class="scrim" data-act="anno-close" aria-label="${attr(L('إغلاق', 'Close'))}" tabindex="-1"></button>
    <section class="asheet st-${f.type}" role="dialog" aria-modal="true" aria-labelledby="af-t" tabindex="-1">
      <header class="asheet-head"><div class="truth-row">${truth(f.type)}<span class="sev-badge sev-${f.sev}">${ic('gauge', 13)}${L('الخطورة:', 'Severity:')} ${L(SEV[f.sev][0], SEV[f.sev][1])}</span><span class="msgq-id">${f.num}</span></div><h2 id="af-t">${esc(f.title)}</h2>${iconBtn('x', L('إغلاق', 'Close'), 'anno-close')}</header>
      <dl class="af">
        ${rowF(L('نوع الملاحظة', 'Type'), `${L(t.ar, t.en)} · ${L(GROUP_AR[f.grp], f.grp)}`)}
        ${rowF(L('ما الذي يحدث؟', 'What is happening?'), esc(f.what))}
        ${rowF(L('لماذا هي مشكلة؟', 'Why does it matter?'), esc(f.why))}
        ${rowF(L('مثال واقعي', 'Real example'), esc(f.ex))}
        ${rowF(L('السياسة المرتبطة / Policy ID', 'Related policy / ID'), (f.pol || []).map((p) => P(p)).join(' ') || '—')}
        ${rowF(L('الحالة الحالية', 'Current status'), esc(f.cur))}
        <div class="af-row af-impact"><dt>${L('الأثر', 'Impact')}</dt><dd><div class="impact-grid"><div><small>${L('العميل', 'Customer')}</small><span>${esc(f.imp.c)}</span></div><div><small>${L('التاجر', 'Merchant')}</small><span>${esc(f.imp.m)}</span></div><div><small>${L('الكابتن', 'Captain')}</small><span>${esc(f.imp.k)}</span></div><div><small>${L('وصّلي', 'Wasaly')}</small><span>${esc(f.imp.w)}</span></div></div></dd></div>
        ${rowF(L('الأثر المالي', 'Financial impact'), esc(f.fin))}
        ${rowF(L('الخطر', 'Risk'), esc(f.risk))}
        ${rowF(L('الحل المقترح', 'Proposed fix'), esc(f.fix))}
        ${rowF(L('حل بديل 1', 'Alternative 1'), esc(f.alt1))}
        ${rowF(L('حل بديل 2', 'Alternative 2'), esc(f.alt2))}
        <div class="af-row"><dt>${L('يحتاج', 'Needs')}</dt><dd><div class="needs"><span>${L('قرار المؤسس', 'Founder')} ${yes(f.need.f)}</span><span>${L('محامي', 'Lawyer')} ${yes(f.need.l)}</span><span>${L('محاسب', 'Accountant')} ${yes(f.need.a)}</span><span>${L('برمجة', 'Engineering')} ${yes(f.need.d)}</span></div></dd></div>
        ${rowF(L('المصدر / الدليل', 'Source / evidence'), `<span dir="auto">${esc(f.src)}</span>`)}
      </dl>
      <footer class="asheet-foot">${btn(L('روح للشاشة', 'Go to the screen'), 'anno-goto', { kind: 'secondary', icon: 'external-link', data: { id: f.id } })}${f.pol && f.pol[0] ? btn(L('افتح السياسة', 'Open policy'), 'policy', { kind: 'ghost', icon: 'scroll-text', data: { id: f.pol[0] } }) : ''}<p class="muted small">${L('ملاحظة للمراجعة — مش قرار ومش سياسة معتمدة.', 'A review note — not a decision or approved policy.')}</p></footer>
    </section></div>`;
}

/* ---------------------------------------------------------------- policy drawer */
function renderPolicyDrawer(id) {
  return `<div class="overlay overlay-top" data-key="pol-${id}"><button type="button" class="scrim" data-act="policy-close" aria-label="${attr(L('إغلاق', 'Close'))}" tabindex="-1"></button><section class="drawer" role="dialog" aria-modal="true" aria-label="${attr(L('السياسة المرتبطة', 'Related policy'))}" tabindex="-1"><header class="drawer-head"><h2>${L('السياسة المرتبطة', 'Related policy')}</h2>${iconBtn('x', L('إغلاق', 'Close'), 'policy-close')}</header><div class="drawer-body">${policyCard(id, false)}</div></section></div>`;
}

/* ---------------------------------------------------------------- compare solutions */
const ANALYST = {
  'FDR-0001': { 'أ': ['قليل', 'قليل — التاجر شايل الخسارة فمفيش حافز للتلفيق', 'متوسط لعالي — مشاوير رجوع حتى للأكل اللي ما بيرجعش'], 'ب': ['قليل', 'عالي — دفع كامل لأي فشل = حافز تواطؤ (INC-0051)', 'قليل'], 'ج': ['عالي — جدول لكل تاجر', 'متوسط — تكلفة متفق عليها أقل من السعر', 'متوسط — اتفاق عند الضم'], 'د': ['صفر دلوقتي', 'غير معروف — مفيش بيانات', 'عالي ومخفي — تقارير مشوّهة'] },
  'FDR-0002': { 'أ': ['صفر', 'صفر', 'عالي — ضغط على العملاء ليلغوا (CFL-0008)'], 'ب': ['قليل', 'متوسط — يحتاج دليل موقع وتوقيت', 'قليل'], 'ج': ['قليل', 'متوسط لعالي', 'قليل'], 'د': ['متوسط — محتاج المسافة المقطوعة', 'قليل لمتوسط', 'متوسط'] },
  'FDR-0005': { 'أ': ['قليل', 'متوسط — تتقلل بمراجعة النمط', 'متوسط'], 'ب': ['قليل', 'قليل على المنصة — وخطر قانوني', 'متوسط'], 'ج': ['قليل', 'قليل على المنصة — وخطر قانوني عالي جدًا', 'قليل'] },
  'FDR-0010': { 'أ': ['قليل — صرف كاش يدوي', 'قليل', 'متوسط — مشاوير كاش'], 'ب': ['متوسط — اختيار صريح في الواجهة', 'قليل', 'قليل لمتوسط'], 'ج': ['صفر', 'متوسط', 'قليل — والخطر قانوني'] },
};
function renderCompare(fdr, orderId) {
  const d = PREV.DECISIONS.find((x) => x.code === fdr); if (!d) return '';
  const o = orderId ? ord(orderId) : activeOrder();
  const canTry = fdr === 'FDR-0001' && o && o.gate;
  const an = ANALYST[fdr] || {};
  return `<div class="overlay overlay-top" data-key="cmp-${fdr}"><button type="button" class="scrim" data-act="compare-close" aria-label="${attr(L('إغلاق', 'Close'))}" tabindex="-1"></button>
    <section class="cmp" role="dialog" aria-modal="true" aria-labelledby="cmp-t" tabindex="-1">
      <header class="rc-head"><div><span class="msgq-id">${d.code}</span><h2 id="cmp-t">${L('قارن الحلول', 'Compare solutions')} — ${esc(d.title)}</h2><p class="muted">${esc(d.problem)}</p></div>${iconBtn('x', L('إغلاق', 'Close'), 'compare-close')}</header>
      <div class="cmp-grid" tabindex="0" role="group" aria-label="${attr(L('الخيارات', 'Options'))}">${d.opts.map((op) => `<article class="card cmp-card ${o && o.sim && o.sim.option === op.k && o.sim.fdr === fdr ? 'on' : ''}"><header><span class="opt-k">${op.k}</span><h3>${esc(op.name)}</h3></header>
        <div class="kv"><span>${L('العميل', 'Customer')}</span><b>${esc(op.c)}</b><span>${L('التاجر', 'Merchant')}</span><b>${esc(op.m)}</b><span>${L('الكابتن', 'Captain')}</span><b>${esc(op.k2)}</b><span>${L('وصّلي', 'Wasaly')}</span><b>${esc(op.w)}</b><span>${L('التكلفة', 'Cost')}</span><b>${esc(op.cost)}</b><span>${L('الخطر', 'Risk')}</span><b>${esc(op.risk)}</b></div>
        ${an[op.k] ? `<div class="analyst"><small>${ic('lightbulb', 12)}${L('تقدير المحلل — مش من الدليل', 'Analyst estimate — not from the manual')}</small><div class="kv"><span>${L('التعقيد', 'Complexity')}</span><b>${an[op.k][0]}</b><span>${L('خطر إساءة الاستخدام', 'Abuse risk')}</span><b>${an[op.k][1]}</b><span>${L('العبء التشغيلي', 'Ops burden')}</span><b>${an[op.k][2]}</b></div></div>` : ''}
        <p class="muted small">${L('المميزات:', 'Pros:')} ${esc(op.pros)} · ${L('العيوب:', 'Cons:')} ${esc(op.cons)}</p>
        ${canTry ? btn(L(`جرّب الخيار ${op.k} (محاكاة — مش قرار)`, `Try option ${op.k} (simulation — not a decision)`), 'compare-try', { kind: 'secondary', block: true, icon: 'flask-conical', data: { fdr, k: op.k, id: o.id } }) : ''}</article>`).join('')}</div>
      <div class="cmp-foot"><div class="rec-box"><span>${L('توصية البحث (حزمة السياسات) — مش قرار', 'Research recommendation — not a decision')}</span><b>${esc(d.rec)}</b><small>${L('الثقة:', 'Confidence:')} ${esc(d.conf)} · ${L('يحتاج:', 'Needs:')} ${esc(d.needs)}</small></div>
        <div class="decision-box">${ic('scale', 16)}<span>${L('قرار المؤسس: لم يُتخذ. الترتيب هنا مش ترتيب أفضلية — والمحاكي ما بيختارش.', 'Founder decision: not taken. The order is not a ranking — the simulator does not choose.')}</span></div>
        ${!canTry && fdr === 'FDR-0001' ? note(L('«جرّب الخيار» بيشتغل لما يكون فيه طلب واقف عند قرار (مثلًا سيناريو B بعد تعذّر التسليم).', '“Try option” works when an order is waiting on this decision (e.g. scenario B).'), { icon: 'info' }) : ''}</div>
    </section></div>`;
}

/* ---------------------------------------------------------------- inject sheet */
function renderInject() {
  const o = activeOrder(); const list = SCN_RUNTIME.injectable(o);
  return `<div class="overlay overlay-top" data-key="inject"><button type="button" class="scrim" data-act="inject-close" aria-label="${attr(L('إغلاق', 'Close'))}" tabindex="-1"></button><section class="drawer" role="dialog" aria-modal="true" aria-labelledby="inj-t" tabindex="-1"><header class="drawer-head"><h2 id="inj-t">${L('اختبر مشكلة', 'Inject a problem')}</h2>${iconBtn('x', L('إغلاق', 'Close'), 'inject-close')}</header><div class="drawer-body stack-8">
    <p class="muted">${o ? L(`المشاكل المتاحة للطلب ${o.id} في حالته دلوقتي (${(STATUS_META[o.st] || {}).ar || o.st}):`, `Problems available for ${o.id} now:`) : L('مفيش طلب شغال — دي مشاكل النظام العامة بس. ابدأ سيناريو للمزيد.', 'No active order — system-wide problems only.')}</p>
    ${list.map((x) => `<button type="button" class="rcard" data-act="inject-do" data-v="${x.key}"><span class="rcard-ic">${ic(x.icon, 20)}</span><span class="rcard-main"><span class="rcard-title">${L(x.ar, x.en)}</span><span class="rcard-sub" dir="ltr">${x.inc}</span></span></button>`).join('')}
    ${note(L('المشكلة بتغيّر المسار الحقيقي للطلب لكل الأدوار — شوفها من كل دور.', 'The problem changes the real flow for every role.'), { icon: 'split' })}</div></section></div>`;
}

/* ---------------------------------------------------------------- global dialog */
function renderDialog(dg) {
  return `<div class="overlay overlay-top" data-key="dialog"><button type="button" class="scrim" data-act="dialog-close" aria-label="${attr(L('إغلاق', 'Close'))}" tabindex="-1"></button><section class="${cls('dialog', dg.tone && 'tone-' + dg.tone)}" role="alertdialog" aria-modal="true" aria-labelledby="dg-t" aria-describedby="dg-b" tabindex="-1"><h2 id="dg-t">${dg.title}</h2><div id="dg-b" class="dialog-b">${dg.body || ''}</div>
    ${dg.reason ? `<div class="field"><label for="dg-r">${L('السبب (إلزامي)', 'Reason (required)')}</label><input id="dg-r" class="input" data-bind="dialog-reason" value="${attr(dg.reasonText || '')}" autocomplete="off">${dg.err ? `<p class="err" role="alert">${ic('circle-alert', 14)}${dg.err}</p>` : ''}</div>` : ''}
    ${dg.anno ? A(dg.anno) : ''}
    <div class="dialog-actions">${dg.confirm ? btn(dg.confirm.label, dg.confirm.act, { kind: dg.tone === 'danger' ? 'danger' : 'primary', data: dg.confirm.data || {} }) : ''}${btn(dg.cancel ? dg.cancel.label : L('إلغاء', 'Cancel'), dg.cancel ? dg.cancel.act : 'dialog-close', { kind: 'secondary' })}</div></section></div>`;
}

/* ---------------------------------------------------------------- mobile sim bar + sheet */
function renderSimbar() {
  const c = reviewCounts(); const r = S.set.role; const m = ROLE_META[r];
  return `<div class="simbar-inner"><button type="button" class="sb-chip sb-role" data-act="msheet" data-v="role" aria-label="${attr(L('غيّر الدور — الحالي: ', 'Switch role — current: ') + L(m.ar, m.en))}">${ic(m.icon, 16)}<span>${L(m.sar, m.en)}</span>${ic('chevron-down', 14)}</button><button type="button" class="sb-chip" data-act="msheet" data-v="scenario" aria-label="${attr(L('السيناريو', 'Scenario') + (S.scenario.id ? ' ' + S.scenario.id : ''))}">${ic('split', 16)}<span>${S.scenario.id ? S.scenario.id : L('سيناريو', 'Scenario')}</span></button>
    <span class="sb-gap"></span><span class="sb-clock num" aria-label="${attr(L('وقت المحاكاة', 'Simulated time'))}">${clockStr(now())}</span>
    <button type="button" class="${cls('sb-icon', S.set.review && 'on')}" data-act="review" aria-pressed="${S.set.review}" aria-label="${attr(L('وضع مراجعة المؤسس', 'Founder review mode'))}">${ic('eye', 18)}</button>
    <button type="button" class="sb-icon" data-act="rc-open" aria-label="${attr(L(`مركز المراجعة — ${c.problem} مشكلة`, `Review center — ${c.problem} problems`))}">${ic('clipboard-list', 18)}<span class="badge-dot" aria-hidden="true">${c.problem}</span></button>
    <button type="button" class="sb-icon" data-act="msheet" data-v="panel" aria-label="${attr(L('لوحة المؤسس والتحكم', 'Founder panel & controls'))}">${ic('panel-right', 18)}</button></div>${renderCue(r)}`;
}
function renderMobileSheet(kind) {
  let inner = '', title = '';
  if (kind === 'role') { title = L('وضع المحاكاة', 'Simulation role'); inner = `<div class="role-list">${ROLES.map((k) => `<button type="button" class="${cls('role-btn', S.set.role === k && 'on')}" data-act="role" data-v="${k}" role="radio" aria-checked="${S.set.role === k}">${ic(ROLE_META[k].icon, 18)}<span>${L(ROLE_META[k].ar, ROLE_META[k].en)}</span></button>`).join('')}</div>`; }
  else if (kind === 'scenario') { title = L('اختيار السيناريو', 'Scenario'); inner = `<div class="stack-8">${Object.entries(SCENARIOS).map(([k, s]) => `<button type="button" class="${cls('rcard', (S.pickScn || S.scenario.id) === k && 'on')}" data-act="scn-pickbtn" data-v="${k}"><span class="rcard-ic"><b>${k}</b></span><span class="rcard-main"><span class="rcard-title">${esc(L(s.title, s.en))}${s.flagship ? ' ★' : ''}</span><span class="rcard-sub">${L(TRUTH[s.truth][0], TRUTH[s.truth][1])}</span></span></button>`).join('')}</div>${scnBrief(S.pickScn || S.scenario.id || 'B')}<div class="grid-2 sticky-cta">${btn(L('ابدأ', 'Start'), 'scn-start', { icon: 'play' })}${btn(L('اختبر مشكلة', 'Inject'), 'inject-open', { kind: 'secondary', icon: 'triangle-alert' })}</div>`; }
  else { title = L('لوحة المؤسس', 'Founder panel'); inner = renderPanel(true); }
  return `<div class="overlay overlay-top" data-key="msheet-${kind}"><button type="button" class="scrim" data-act="msheet-close" aria-label="${attr(L('إغلاق', 'Close'))}" tabindex="-1"></button><section class="msheet" role="dialog" aria-modal="true" aria-label="${attr(title)}" tabindex="-1"><div class="sheet-grip" aria-hidden="true"></div><header class="drawer-head"><h2>${title}</h2>${iconBtn('x', L('إغلاق', 'Close'), 'msheet-close')}</header><div class="msheet-body">${inner}</div></section></div>`;
}
function counterFab(inBar) {
  const c = reviewCounts();
  return `<button type="button" class="${cls('rc-fab', inBar && 'rc-fab-bar')}" data-act="rc-open" aria-label="${attr(L('مركز المراجعة', 'Review center'))}"><span>${ic('triangle-alert', 15)}<b class="num">${c.problem}</b><small>${L('مشاكل', 'problems')}</small></span><span>${ic('lightbulb', 15)}<b class="num">${c.proposal + c.solution}</b><small>${L('اقتراحات', 'proposals')}</small></span><span>${ic('scale', 15)}<b class="num">${c.decision + c.fdr}</b><small>${L('قرارات مفتوحة', 'open decisions')}</small></span></button>`;
}

/* ---------------------------------------------------------------- director cue: what the person at the keyboard should do now */
function scriptHint(o, a) {
  const sc = o.script || {};
  if (a.kind === 'c_handover' && sc.atDoor) return { refuse: L(`في السيناريو: العميل بيقول للكابتن «${sc.words || 'مش عايزه'}»`, `Scenario: the customer says “${sc.words || 'I don’t want it'}”`), no_answer: L('في السيناريو: العميل مش بيرد على الكابتن', 'Scenario: the customer does not answer'), wrong_address: L('في السيناريو: الكابتن وصل لأرض فاضية — العنوان غلط', 'Scenario: wrong address'), recipient_refuse: L('في السيناريو: المستلمة بتقول «أنا ماطلبتش حاجة»', 'Scenario: the recipient refuses'), not_home: L('في السيناريو: العميل برّه البيت', 'Scenario: the customer is not home') }[sc.atDoor] || null;
  if (a.kind === 'k_offer' && sc.rejectFirst && a.kid === sc.captain && !o.offers.some((x) => x.res === 'rejected')) return L('في السيناريو: أول كابتن بيرفض العرض', 'Scenario: the first captain declines');
  if (a.kind === 'm_ready' && sc.merchantLate && !o.lateNotified) return L('في السيناريو: المطعم متأخر في التحضير', 'Scenario: the kitchen runs late');
  if (a.kind === 'm_accept' && sc.merchantNoResponse) return L('في السيناريو: المطعم مش بيرد على الطلب', 'Scenario: the store does not respond');
  return null;
}
function cueFor(role) {
  const mine = pendingFor(role).filter(({ o, a }) => userControls(o, a));
  if (!mine.length) return null;
  mine.sort((x, y) => x.a.due - y.a.due);
  const { o, a } = mine[0];
  return { o, a, hint: scriptHint(o, a), gated: GATED.has(a.kind), more: mine.length - 1 };
}
function renderCue(role) {
  if (S.sys.outage && role === 'ops') return `<div class="cue cue-gated" role="status" data-key="cue-outage"><span class="cue-ic">${ic('server-crash', 16)}</span><div class="cue-t"><b>${L('المنظومة واقفة — دورك دلوقتي', 'System down — your move')}</b><small>${L('كمّل الطلبات الشغالة بالتليفون وسجّل كل خطوة يدوي. لما الخدمة ترجع اضغط «رجّع الخدمة».', 'Continue live orders by phone and log each step. Press “Restore service” when back.')}</small></div>${btn(L('رجّع الخدمة', 'Restore service'), 'ops-restore', { size: 'sm', kind: 'light', icon: 'refresh-cw' })}</div>`;
  if (S.sys.outage && ['customer', 'merchant', 'captain'].includes(role)) return `<div class="cue" role="status" data-key="cue-outage-${role}"><span class="cue-ic">${ic('server-crash', 16)}</span><div class="cue-t"><b>${L('المنظومة واقفة', 'System down')}</b><small>${L('التطبيق مش هيتحرك لحد ما العمليات ترجّع الخدمة — روح «العمليات».', 'Nothing moves until operations restore service.')}</small></div>${btn(L('روح للعمليات', 'Go to operations'), 'role', { size: 'sm', kind: 'light', data: { v: 'ops' } })}</div>`;
  const c = cueFor(role); if (!c) return '';
  const act = c.gated
    ? `<span class="cue-gate">${ic('scale', 14)}${L('قرار بشري — المحاكي مش هياخده عنك', 'A human decision — the simulator will not take it')}</span>`
    : btn(c.hint ? L('شغّل خطوة السيناريو', 'Play the scripted step') : L('خلّي المحاكي يعملها', 'Let the simulator do it'), 'cue-do', { size: 'sm', kind: 'light', icon: 'play', data: { id: c.o.id, k: c.a.kind } });
  return `<div class="${cls('cue', c.gated && 'cue-gated')}" role="status" data-key="cue-${c.o.id}-${c.a.kind}" title="${attr(pendLabel(c.a) + (c.hint ? ' — ' + c.hint : ''))}"><span class="cue-ic">${ic(c.gated ? 'scale' : 'hand', 16)}</span><div class="cue-t"><b>${L('دورك دلوقتي', 'Your move')}: ${pendLabel(c.a)} <bdi dir="ltr" class="num">${c.o.id}</bdi>${c.more ? ` <small>(+${c.more})</small>` : ''}</b>${c.hint ? `<small>${c.hint}</small>` : `<small class="cue-generic">${L('اعملها من التطبيق نفسه — أو سيب المحاكي يكمّل.', 'Do it in the app — or let the simulator continue.')}</small>`}</div>${act}</div>`;
}
onAct('cue-do', (d) => {
  const o = S.orders[d.id]; if (!o) return;
  const a = o.pending.find((x) => x.kind === d.k); if (!a || GATED.has(a.kind)) return;
  const fn = AUTO[a.kind]; if (fn) fn(o, a);
  requestRender();
});

/* ---------------------------------------------------------------- actions */
onAct('role', (d) => { S.set.role = d.v; S.sheet = null; S.set.mobileSheet = null; NAVDIR = 'none'; S.unread[d.v] = 0; requestRender(); });
onAct('panel', (d) => { S.set.panel = d.v; requestRender(); });
onAct('journey', (d) => { S.journeySel = S.journeySel === +d.v ? null : +d.v; requestRender(); });
onAct('change:scn-pick', (v) => { S.pickScn = v; requestRender(); });
onAct('scn-pickbtn', (d) => { S.pickScn = d.v; requestRender(); });
onAct('scn-start', () => {
  const id = S.pickScn || S.scenario.id || 'B';
  const hasOrders = Object.values(S.orders).some(isActive);
  const go2 = () => { SCN_RUNTIME.start(id); S.set.mobileSheet = null; S.pickScn = id; requestRender(); };
  if (hasOrders) { S.dialog = { title: L('تبدأ سيناريو جديد؟', 'Start a new scenario?'), body: L('العالم هيتعمل من جديد: الطلبات الحالية هتتمسح (إعداداتك بتفضل).', 'The world resets: current orders are cleared (settings kept).'), confirm: { label: L('ابدأ', 'Start'), act: 'scn-start-do', data: { v: id } } }; requestRender(); return; }
  go2();
});
onAct('scn-start-do', () => { const id = S.dialog.confirm.data.v; S.dialog = null; SCN_RUNTIME.start(id); S.set.mobileSheet = null; requestRender(); });
onAct('scn-quick', (d) => { S.pickScn = d.v; ACT['scn-start'](); });
onAct('inject-open', () => { S.set.mobileSheet = null; S.injectOpen = true; requestRender(); });
onAct('inject-close', () => { S.injectOpen = false; requestRender(); });
onAct('inject-do', (d) => { S.injectOpen = false; SCN_RUNTIME.inject(d.v, activeOrder()); requestRender(); });
onAct('speed', (d) => { if (d.v === 'pause') S.set.paused = true; else { S.set.paused = false; S.set.speed = +d.v; } requestRender(); });
onAct('skip', () => { if (!skipAhead()) toast(L('مفيش حدث جاي تلقائي — فيه حد لازم يتصرف', 'No automatic event ahead — someone must act'), 'info', 'hand'); requestRender(); });
onAct('autopilot', () => { S.set.autopilot = !S.set.autopilot; requestRender(); });
onAct('setk', (d) => { S.set[d.k] = d.v; if (d.k === 'network' && d.v === 'good') S.cust.lastSync = now(); if (d.k === 'network' && d.v === 'offline') S.cust.lastSync = now(); requestRender(); });
onAct('seg', (d) => { if (d.k === 'lang') setLang(d.v); else if (d.k === 'theme') setTheme(d.v); requestRender(); });
onAct('review', () => { S.set.review = !S.set.review; if (S.set.review) toast(L('وضع المراجعة شغال — دوس على أي علامة', 'Review mode on — tap any marker'), 'info', 'eye'); requestRender(); });
onAct('rc-open', () => { S.set.mobileSheet = null; S.review.center = true; requestRender(); });
onAct('rc-close', () => { S.review.center = false; requestRender(); });
onAct('rc-filter', (d) => { S.review.filter = d.v; requestRender(); });
onAct('rc-group', (d) => { S.review.group = d.v; requestRender(); });
onAct('bind:rc-q', (v) => { S.review.q = v; requestRender(); });
onAct('anno', (d) => { S.review.open = d.id; requestRender(); });
onAct('anno-close', () => { S.review.open = null; requestRender(); });
onAct('anno-goto', (d) => { const f = FINDINGS_BY_ID[d.id]; S.review.open = null; S.review.center = false; gotoFinding(f); S.set.review = true; requestRender(); });
onAct('policy', (d) => { S.drawer = d.id; requestRender(); });
onAct('policy-close', () => { S.drawer = null; requestRender(); });
onAct('compare-open', (d) => { S.drawer = null; S.review.open = null; S.compare = { fdr: d.fdr, id: d.id || null }; requestRender(); });
onAct('compare-close', () => { S.compare = null; requestRender(); });
onAct('compare-try', (d) => { const o = ord(d.id); simulateOption(o, d.fdr, d.k); S.compare = null; toast(L(`محاكاة الخيار ${d.k} — مش قرار معتمد`, `Simulating option ${d.k} — not an approved decision`), 'info', 'flask-conical'); requestRender(); });
onAct('msheet', (d) => { if (d.v === 'controls') { S.set.panel = 'controls'; S.set.mobileSheet = 'panel'; } else S.set.mobileSheet = d.v; requestRender(); });
onAct('msheet-close', () => { S.set.mobileSheet = null; requestRender(); });
onAct('dialog-close', () => { S.dialog = null; requestRender(); });
onAct('dialog-retry', () => { const r = S.dialog && S.dialog.retry; S.dialog = null; if (r) r(); requestRender(); });
onAct('bind:dialog-reason', (v) => { if (S.dialog) { S.dialog.reasonText = v; S.dialog.err = null; } });
onAct('reset', () => { S.dialog = { title: L('إعادة ضبط المحاكاة؟', 'Reset the simulation?'), body: L('كل الطلبات والشكاوى والسجلات هتتمسح وهترجع لأول التطبيق. المظهر واللغة والجهاز بيفضلوا.', 'All orders, tickets and logs are cleared. Theme, language and device are kept.'), confirm: { label: L('امسح وابدأ من الأول', 'Reset'), act: 'reset-do' }, tone: 'danger' }; requestRender(); });
onAct('reset-do', () => { resetSimulation(true); applyThemeLang(); requestRender(); toast(L('المحاكاة رجعت لأولها', 'Simulation reset'), 'success', 'rotate-ccw'); });
onAct('sheet-close', () => { closeSheet(); requestRender(); });
onAct('back', () => { goBack(S.set.role); requestRender(); });
onAct('noop', () => {});
onAct('escape', () => { if (S.dialog) S.dialog = null; else if (S.review.open) S.review.open = null; else if (S.compare) S.compare = null; else if (S.drawer) S.drawer = null; else if (S.injectOpen) S.injectOpen = false; else if (S.review.center) S.review.center = false; else if (S.set.mobileSheet) S.set.mobileSheet = null; else if (S.sheet) S.sheet = null; requestRender(); });

function gotoFinding(f) {
  const map = {
    customer: () => {
      S.cust.stage = 'app';
      const scr = { login: () => { S.cust.stage = 'auth'; S.cust.verifyStep = 0; S.cust.authMode = 'phone'; }, verify: () => { S.cust.stage = 'auth'; S.cust.verifyStep = 1; }, signup: () => { S.cust.stage = 'auth'; S.cust.verifyStep = 0; S.cust.authMode = 'signup'; }, 'onb-perm': () => { S.cust.stage = 'onb'; S.cust.onb = 4; }, locate: () => { S.cust.stage = 'onb'; S.cust.onb = 5; }, 'addr-form': () => { S.cust.stage = 'onb'; S.cust.onb = 6; }, service: () => { S.cust.stage = 'onb'; S.cust.onb = 7; } }[f.screen];
      if (scr) { scr(); return; }
      const tabOf = { home: 'home', merchant: 'home', product: 'home', cart: 'home', recipient: 'home', schedule: 'home', checkout: 'home', payment: 'home', track: 'orders', rate: 'orders', receipt: 'orders', ticket: 'orders', complaint: 'orders', help: 'orders', assistant: 'assistant', settings: 'account', privacy: 'account', notifs: 'account' }[f.screen] || 'home';
      S.nav.customer.tab = tabOf;
      const st = S.nav.customer.stacks[tabOf]; st.splice(1);
      const o = activeOrder() || Object.values(S.orders)[0];
      if (f.screen === 'merchant') st.push({ s: 'merchant', id: 'm1' });
      if (f.screen === 'product') { st.push({ s: 'merchant', id: 'm1' }); S.sheet = { kind: 'product', pid: 'p101', opts: defaultOpts('p101'), qty: 1, note: '' }; }
      if (['cart', 'checkout', 'recipient', 'schedule', 'payment'].includes(f.screen)) { if (!S.cust.cart.lines.length) S.cust.cart = { mid: 'm1', lines: deepClone(FLAG_LINES).map((l) => Object.assign(l, { unitSeen: unitPrice(l.pid, l.opts) })), note: '', promo: '', extra: [] }; st.push({ s: 'cart' }); if (f.screen !== 'cart') st.push({ s: f.screen }); }
      if (['track', 'rate', 'receipt', 'help', 'complaint'].includes(f.screen) && o) { st.push({ s: 'track', id: o.id }); if (f.screen === 'help') st.push({ s: 'help', id: o.id }); }
      if (f.screen === 'ticket') { const t = Object.values(S.tickets)[0]; if (t) st.push({ s: 'ticket', id: t.id }); }
      if (f.screen === 'settings' || f.screen === 'privacy' || f.screen === 'notifs') st.push({ s: f.screen });
    },
    merchant: () => { S.nav.merchant.loggedIn = f.screen !== 'm-login'; const tab = { 'm-catalog': 'catalog', 'm-money': 'money', 'm-store': 'store' }[f.screen] || 'orders'; S.nav.merchant.tab = tab; },
    captain: () => { S.nav.captain.loggedIn = true; const tab = { 'k-earn': 'earnings', 'k-custody': 'custody', 'k-account': 'account' }[f.screen] || 'home'; S.nav.captain.tab = tab; const trip = myTrip(); if (f.screen === 'k-trip' && trip) S.nav.captain.stacks.home = [{ s: 'k_home' }, { s: 'k_trip', id: trip.id }]; },
    support: () => { S.nav.support.view = f.screen === 'templates' ? 'templates' : f.screen === 'rules' ? 'rules' : 'tickets'; },
    ops: () => { S.nav.ops.view = ['incidents', 'log', 'blocked', 'map', 'people'].includes(f.screen) ? f.screen : 'live'; },
    finance: () => { S.nav.finance.view = ['recon', 'refunds', 'model'].includes(f.screen) ? f.screen : 'orders'; },
    admin: () => { S.nav.admin.view = ['values', 'catalog', 'roles', 'audit', 'areas'].includes(f.screen) ? f.screen : 'flags'; },
    recipient: () => {},
    risk: () => { S.nav.risk.view = ['cases', 'rules'].includes(f.screen) ? f.screen : 'signals'; },
  };
  S.set.role = f.role; NAVDIR = 'none';
  (map[f.role] || (() => {}))();
}
