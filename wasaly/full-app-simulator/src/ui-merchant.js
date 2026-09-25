/* ==========================================================================
   ui-merchant.js — merchant app (owner / staff) on the shared order state
   ========================================================================== */
const MID = () => S.nav.merchant.mid;
const mOrders = () => Object.values(S.orders).filter((o) => o.mid === MID()).sort((a, b) => b.placedAt - a.placedAt);

SCR.m_login = () => ({ key: 'm-login', tabbar: false, full: true, body: `<div class="onb auth">
  <span class="wordmark wordmark-sm">${L('وصّلي', 'Wasaly')} <small class="wm-tag">${L('للتجار', 'for merchants')}</small></span>
  <h1 class="onb-title">${L('دخول المتجر', 'Store sign-in')}</h1><p class="onb-sub">${L('اختار حساب تجريبي.', 'Pick a demo account.')}</p>
  <div class="stack-12">${radioCard('macct', 'owner', S.nav.merchant.acct || 'owner', L('صاحب المحل — مطعم تجريبي', 'Owner — Demo Restaurant'), L('كل الصلاحيات', 'Full access'), { act: 'm-acct', icon: 'store' })}${radioCard('macct', 'staff', S.nav.merchant.acct || 'owner', L('كاشير (موظف)', 'Cashier (staff)'), L('صلاحيات الموظفين غير متحقق منها', 'Staff permissions not verified'), { act: 'm-acct', icon: 'user-round' })}${AA('m-staff-roles')}
  ${btn(L('ادخل', 'Sign in'), 'm-login', { block: true })}${note(L('محاكاة — ما فيش كلمة سر.', 'Simulation — no password.'), { icon: 'flask-conical' })}</div></div>` });

function mStatusControl() {
  const st = S.merchants[MID()].status;
  return `<div class="card stack-8"><div class="row-between"><b>${L('حالة المتجر', 'Store status')}</b>${stPillStore(st)}</div>${seg('mstatus', st, [{ v: 'open', label: L('مفتوح', 'Open') }, { v: 'busy', label: L('مشغول', 'Busy') }, { v: 'paused', label: L('موقف مؤقت', 'Paused') }, { v: 'closed', label: L('مقفول', 'Closed') }], 'm-status')}<p class="muted small">${{ open: L('بتستقبل طلبات بالوتيرة العادية.', 'Taking orders normally.'), busy: L('العميل هيشوف وقت أطول — ومفيش أي عقاب على «مشغول».', 'Customers see a longer time — no penalty for Busy.'), paused: L('مش هتستقبل طلبات جديدة لحد ما ترجّعها.', 'No new orders until you resume.'), closed: L('المتجر مقفول. الطلبات اللي شغالة لازم تتكمّل أو تتلغي برد كامل.', 'Closed. Active orders must be completed or cancelled with full refund.') }[st]}</p>${AA('m-busy-mode', 'm-close-with-orders')}</div>`;
}
const stPillStore = (st) => `<span class="pill pill-${{ open: 'success', busy: 'warning', paused: 'warning', closed: 'danger' }[st]}">${{ open: L('مفتوح', 'Open'), busy: L('مشغول', 'Busy'), paused: L('موقف', 'Paused'), closed: L('مقفول', 'Closed') }[st]}</span>`;

SCR.m_orders = () => {
  const list = mOrders(); const m = M(MID());
  const incoming = list.filter((o) => o.st === 'placed');
  const working = list.filter((o) => ['accepted', 'preparing', 'ready'].includes(o.st) || (['picked_up', 'in_transit'].includes(o.st) && o.cnd));
  const done = list.filter((o) => !incoming.includes(o) && !working.includes(o));
  const delivered = list.filter((o) => ['delivered', 'completed'].includes(o.st));
  const sales = delivered.reduce((s, o) => s + o.sub, 0);
  const closeDecide = list.find((o) => o.pending.some((a) => a.kind === 'm_close_decide'));
  return { key: 'm-orders', tab: 'orders', header: appbar(esc(mName(MID())), { eyebrow: L('لوحة المتجر', 'Store dashboard'), lead: merchantLogo(m, 36), actions: iconBtn('bell', L('الإشعارات', 'Notifications'), 'm-go', { data: { s: 'm_notifs' }, badge: S.unread.merchant ? String(Math.min(9, S.unread.merchant)) : '' }) }), body: `<div class="pad stack-16">
    ${mStatusControl()}
    ${closeDecide ? `<section class="card action-card tone-danger"><h3 class="h-sm">${ic('door-open', 18)}${L('قفلت المتجر وعندك طلب شغال', 'You closed with an active order')}</h3><p>${L('لازم تقرر: تكمّله، ولا يتلغي برد كامل للعميل. ما ينفعش يفضل معلّق.', 'Complete it or cancel with a full refund — it cannot hang.')}</p><div class="grid-2">${btn(L('هكمّله', 'I’ll complete it'), 'm-close-decide', { data: { id: closeDecide.id, v: 'complete' } })}${btn(L('الغيه برد كامل', 'Cancel, full refund'), 'm-close-decide', { kind: 'secondary', data: { id: closeDecide.id, v: 'cancel' } })}</div></section>` : ''}
    <div class="stats"><div class="stat"><small>${L('طلبات النهارده', 'Orders today')}</small><b class="num">${list.length}</b></div><div class="stat"><small>${L('مبيعات اتسلّمت', 'Delivered sales')}</small><b class="num">${money(sales)}</b></div><div class="stat"><small>${L('شغالة', 'Active')}</small><b class="num">${working.length + incoming.length}</b></div></div>
    ${incoming.length ? `<section>${sectionHead(L('طلبات جديدة', 'New orders'), { icon: 'bell-ring' })}${incoming.map((o) => incomingCard(o)).join('')}</section>` : `<div class="card calm">${ic('coffee', 20)}<span>${L('مفيش طلبات جديدة دلوقتي.', 'No new orders right now.')}</span></div>`}
    ${working.length ? `<section>${sectionHead(L('قيد التنفيذ', 'In progress'))}${working.map((o) => mOrderRow(o)).join('')}</section>` : ''}
    ${done.length ? `<section>${sectionHead(L('خلصت', 'Finished'))}${done.map((o) => mOrderRow(o)).join('')}</section>` : ''}
    ${!list.length ? note(L('ابدأ سيناريو أو اطلب من تطبيق العميل — الطلب هيوصل هنا.', 'Start a scenario or order from the customer app.'), { icon: 'flask-conical' }) : ''}
  </div>` };
};
function incomingCard(o) {
  const left = Math.max(0, (o.timers && o.timers.mTimeout ? o.timers.mTimeout : now()) - now());
  return `<article class="card incoming"><div class="incoming-head"><div class="rings rings-sm" aria-hidden="true"><i></i><i></i><i></i><span>${ic('bell-ring', 18)}</span></div><div><b dir="ltr" class="num">${o.id}</b><small>${o.lines.length} ${L('أصناف', 'items')} · ${money(o.sub)} · ${o.pay.method === 'cash' ? L('كاش', 'Cash') : L('بطاقة (محاكاة)', 'Card (sim)')}</small></div><span class="countdown num">${Math.ceil(left)} ${L('د', 'min')}</span></div>
    <ul class="sum-lines">${o.lines.map((l) => `<li><span class="num">${l.qty}×</span><span>${esc(pName(l.pid))}${optsLabel(l.pid, l.opts) ? `<small>${esc(optsLabel(l.pid, l.opts))}</small>` : ''}${l.note ? `<small class="muted">«${esc(l.note)}»</small>` : ''}</span></li>`).join('')}</ul>
    <div class="field"><span class="label">${L('وقت التحضير', 'Prep time')}</span><div class="chips-row">${[10, 14, 20, 30].map((v) => `<button type="button" class="chip-btn ${(S.nav.merchant.prep || o.prep) === v ? 'on' : ''}" data-act="m-prep" data-v="${v}">${v} ${L('د', 'min')}</button>`).join('')}</div></div>
    <div class="grid-2">${btn(L('اقبل', 'Accept'), 'm-accept', { data: { id: o.id }, icon: 'check', busy: S.busy['m-accept'] })}${btn(L('ارفض', 'Decline'), 'm-reject', { kind: 'secondary', data: { id: o.id } })}</div>
    <p class="muted small">${L('لو ما ردّيتش في المهلة الطلب بيتلغي تلقائي برد كامل، وبتتسجل الواقعة بوصف محايد.', 'If you don’t respond in time the order auto-cancels with a full refund.')}</p>${AA('m-accept-model', 'm-call-before-autocancel')}</article>`;
}
function mOrderRow(o) {
  return row({ media: `<span class="row-ic">${ic({ accepted: 'check', preparing: 'chef-hat', ready: 'package-check', picked_up: 'bike', in_transit: 'bike', delivered: 'circle-check', completed: 'circle-check', cancelled: 'circle-x', failed_delivery: 'package-x' }[o.st] || 'receipt', 20)}</span>`, title: `<bdi dir="ltr">${o.id}</bdi> · ${money(o.sub)}`, sub: `${stPill(o.st)}${o.st === 'preparing' && o.readyAt ? ` · ${L('جاهز خلال', 'ready in')} <span class="num">${Math.max(0, Math.ceil(o.readyAt - now()))}</span> ${L('د', 'min')}` : ''}${o.cnd ? ` · <span class="err-t">${L('تعذّر التسليم', 'Delivery failed')}</span>` : ''}`, act: 'm-go', data: { s: 'm_order', id: o.id } });
}
SCR.m_order = (p) => {
  const o = ord(p.id); const pend = o.pending.filter((a) => a.role === 'merchant');
  const capHere = o.cap && o.cap.phase === 'at_merchant';
  const checklist = S.nav.merchant.check || {};
  return { key: 'm-order-' + o.id, header: appbar(`<bdi dir="ltr">${o.id}</bdi>`, { back: true, backAct: 'm-back', eyebrow: L('طلب', 'Order') }), body: `<div class="pad stack-16">
    <div class="card"><div class="row-between">${stPill(o.st)}<small class="muted">${L('اتعمل', 'Placed')} ${clockStr(o.placedAt)}</small></div>
      <p class="muted small">${L('العميل:', 'Customer:')} ${esc(L(PEOPLE.customer.name, PEOPLE.customer.nameEn))} — ${L('بيانات العميل بالحد الأدنى (مفيش عنوان كامل ولا رقم).', 'Minimal customer data (no full address or number).')}</p></div>
    ${o.st === 'accepted' ? btn(L('ابدأ التحضير', 'Start preparing'), 'm-start', { block: true, icon: 'chef-hat', data: { id: o.id } }) : ''}
    ${o.st === 'preparing' ? `<section class="card stack-12"><div class="prep-timer"><span class="ring-timer" style="--p:${clamp(1 - (o.readyAt - now()) / o.prep, 0, 1)}"><b class="num">${Math.max(0, Math.ceil(o.readyAt - now()))}</b><small>${L('دقيقة', 'min')}</small></span><div><b>${L('بيتحضّر', 'Preparing')}</b><p class="muted small">${L('وقت التحضير المعلن', 'Declared prep')}: ${o.prep} ${L('د', 'min')}</p><div class="chips-row">${btn('+5', 'm-extend', { kind: 'secondary', size: 'sm', data: { id: o.id } })}</div></div></div>${btn(L('الطلب جاهز', 'Order ready'), 'm-ready', { busy: S.busy['m-ready'], block: true, icon: 'package-check', data: { id: o.id } })}</section>` : ''}
    <section class="card">${sectionHead(L('الأصناف', 'Items'))}${o.lines.map((l, i) => `<div class="mline ${l.state !== 'ok' ? 'is-struck' : ''}"><span class="num">${l.qty}×</span><div class="grow"><b>${esc(pName(l.pid))}</b>${optsLabel(l.pid, l.opts) ? `<small>${esc(optsLabel(l.pid, l.opts))}</small>` : ''}${l.note ? `<small class="muted">«${esc(l.note)}»</small>` : ''}${l.state === 'out' ? `<small class="err-t">${L('خلص — مستنيين اختيار العميل', 'Out — waiting for the customer')}</small>` : ''}</div>${['accepted', 'preparing'].includes(o.st) && l.state === 'ok' ? btn(L('خلص', 'Out'), 'm-itemout', { kind: 'ghost', size: 'sm', data: { id: o.id, pid: l.pid } }) : ''}</div>`).join('')}${AA('m-substitution')}</section>
    ${o.kid ? `<section class="card">${row({ icon: 'bike', title: `${L('الكابتن', 'Captain')} ${esc(kName(o.kid))}`, sub: capHere ? L('وصل ومستني', 'Here and waiting') : o.cap && o.cap.phase === 'to_merchant' ? L('في الطريق ليك', 'On the way') : '' })}
      ${capHere ? `<div class="stack-8"><b>${L('قائمة التسليم للكابتن', 'Handover checklist')}</b> ${truth('solution')}${o.lines.filter((l) => l.state === 'ok').map((l, i) => `<label class="check"><input type="checkbox" data-bind="m-check" data-i="${i}" ${checklist[o.id + ':' + i] ? 'checked' : ''}><span>${l.qty}× ${esc(pName(l.pid))}</span></label>`).join('')}<label class="check"><input type="checkbox" data-bind="m-check" data-i="pack" ${checklist[o.id + ':pack'] ? 'checked' : ''}><span>${L('التغليف سليم — الساخن منفصل عن البارد', 'Packaging OK — hot separate from cold')}</span></label>${note(L('النظام بيسجل توقيت الاستلام بس. القائمة دي حل يدوي مقترح يوقّع عليه الكابتن (60-2).', 'The system records only the pickup time. This is a proposed manual list signed by the captain.'))}${AA('m-pickup-proof')}</div>` : ''}</section>` : ''}
    <section class="card">${sectionHead(L('سجل الطلب', 'Order log'), { icon: 'history' })}${tlList(o, 'merchant')}</section>
    ${o.st === 'cancelled' && o.cancel && o.cancel.from && ['picked_up', 'in_transit'].includes(o.cancel.from) ? `<section class="card action-card tone-warning"><h3 class="h-sm">${ic('package-x', 18)}${L('الطلب خرج ومتسلمش', 'Left the store and was not delivered')}</h3><p>${L('الكابتن راجع بالأكل؟ هيتدفعلك تمنه؟ — مفيش قاعدة لسه (FDR-0001).', 'Is the food coming back? Will you be paid? — no rule yet (FDR-0001).')}</p>${AA('m-failed-delivery-comp')}${msgQuote('MSG-M-002')}</section>` : ''}
    <div class="chips-row">${P('MERCHANT_003')}${P('MERCHANT_004')}${P('MERCHANT_005')}</div>
  </div>` };
};
function tlList(o, viewer) {
  const hideCustomerReason = viewer === 'merchant' || viewer === 'captain';
  return `<ol class="tl">${o.tl.slice().reverse().map((e) => `<li class="tl-i tl-${e.kind || 'n'}"><span class="tl-t num">${clockStr(e.t)}</span><span class="tl-note">${hideCustomerReason && (e.ev === 'refused' || e.ev === 'cannot_deliver') ? L('تعذّر التسليم (السبب محفوظ عند العمليات — خصوصية)', 'Delivery failed (reason kept by ops — privacy)') : esc(e.note || e.st || e.ev)}</span><span class="tl-a">${esc(actorLabel(e.actor))}</span></li>`).join('')}</ol>`;
}
function actorLabel(a) {
  if (!a) return '';
  if (a.startsWith('captain:')) return L('الكابتن', 'Captain') + ' ' + kName(a.split(':')[1]);
  return { customer: L('العميل', 'Customer'), merchant: L('المتجر', 'Store'), system: L('النظام', 'System'), ops: L('العمليات', 'Ops'), support: L('الدعم', 'Support'), finance: L('المالية', 'Finance'), founder: L('المؤسس', 'Founder'), sim: L('المحاكي', 'Simulator'), recipient: L('المستلم', 'Recipient') }[a] || a;
}
function msgQuote(id) { const m = MANUAL.msgs[id]; if (!m) return ''; return `<blockquote class="msgq"><span class="msgq-id">${id}</span><p>${esc(m.spoken)}</p>${m.note ? `<small>${esc(m.note)}</small>` : ''}</blockquote>`; }

SCR.m_catalog = () => {
  const m = M(MID());
  return { key: 'm-catalog', tab: 'catalog', header: appbar(L('القائمة والمخزون', 'Menu & stock')), body: `<div class="pad stack-12">
    ${m.menu.map((sec) => `<section class="card">${sectionHead(esc(L(sec.ar, sec.en)))}${sec.items.map((pid) => { const st = stockOf(pid); const susp = S.merchants[MID()].suspended && S.merchants[MID()].suspended[pid]; return `<div class="cat-item">${food(PR(pid).illo, { bg: m.accentSoft, cls: 'food-sm' })}<div class="grow"><b>${esc(pName(pid))}</b><small class="num">${money(unitPrice(pid, defaultOpts(pid)))}</small>${susp ? `<small class="err-t">${L('موقوف مؤقتًا لمراجعة بلاغ — إجراء حماية مش حكم', 'Paused pending review — protection, not a verdict')}</small>` : ''}</div>${toggle(!st.out, 'm-stock', L('متاح', 'Available'), { data: { pid } })}</div>`; }).join('')}</section>`).join('')}
    ${btn(L('غيّر سعر (تجربة)', 'Change a price (test)'), 'm-price', { kind: 'secondary', block: true, icon: 'pencil' })}
    ${note(L('تحديث السعر بيسري على الطلبات الجديدة بس — والسعر اللي العميل شافه هو الملزم (25-1).', 'Price updates apply to new orders only.'))}
    ${AA('m-price-sync', 'm-food-safety-suspend')}
  </div>` };
};
SCR.m_money = () => {
  const list = mOrders(); const delivered = list.filter((o) => ['delivered', 'completed'].includes(o.st));
  const gross = delivered.reduce((s, o) => s + o.sub, 0); const comm = delivered.reduce((s, o) => s + moneyOf(o).commission, 0);
  const failed = list.filter((o) => o.label === 'failed_delivery_tag' || o.st === 'failed_delivery');
  return { key: 'm-money', tab: 'money', header: appbar(L('الحسابات والتسوية', 'Settlements')), body: `<div class="pad stack-16">
    <section class="card stack-8">${sectionHead(L('دورة النهارده', 'Today’s cycle'), { icon: 'receipt-text' })}
      ${moneyRow(L('مبيعات اتسلّمت', 'Delivered sales'), gross)}${moneyRow(L(`عمولة وصّلي (${ECON.commissionPct}% — مثال توضيحي)`, `Wasaly commission (${ECON.commissionPct}% — illustrative)`), -comm)}<hr>${moneyRow(L('صافي مستحق ليك', 'Net due to you'), gross - comm, { strong: true })}
      <div class="truth-row">${truth('finance')}${truth('unknown', { label: L('نسبة العمولة مش محددة في الدليل', 'Commission rate not set in the manual') })}</div>${AA('f-commission-unknown')}</section>
    <section class="card stack-8">${sectionHead(L('ميعاد الصرف والغرامة', 'Payout timing & penalty'), { icon: 'calendar-clock' })}
      ${moneyRow(L('مهلة التسوية', 'Settlement window'), `${ECON.settlementHours} ${L('ساعة', 'h')}`, { raw: true })}${moneyRow(L('غرامة التأخير يوميًا', 'Daily late penalty'), `${ECON.penaltyPct}%`, { raw: true })}${moneyRow(L('أيام سماح', 'Grace days'), `${ECON.graceDays}`, { raw: true })}${moneyRow(L('حد أقصى للغرامة', 'Penalty cap'), `${ECON.penaltyMaxPct}%`, { raw: true })}
      ${banner('warning', 'triangle-alert', L('القيم دي شغالة في الكود من غير قرار موثّق — ومعرّفات القرار نفسها متعارضة. ما يتطالبش حد بغرامة على أساسها قبل الاعتماد.', 'These values run in code without a documented decision. No one is charged on them before approval.'))}${AA('m-settlement-values')}</section>
    ${failed.length ? `<section class="card stack-8">${sectionHead(L('طلبات خرجت ومتسلمتش', 'Left but not delivered'), { icon: 'package-x' })}${failed.map((o) => row({ icon: 'package-x', title: `<bdi dir="ltr">${o.id}</bdi> · ${money(o.sub)}`, sub: L('تعويضك عن الأكل: غير محسوم (FDR-0001)', 'Your food compensation: undecided (FDR-0001)'), end: truth('decision') })).join('')}${AA('m-failed-delivery-comp')}</section>` : ''}
    <section class="card stack-8">${sectionHead(L('خصومات ونزاعات', 'Deductions & disputes'), { icon: 'scale' })}<p class="muted">${L('مفيش خصم من غير بند متفق عليه + إخطار + دليل. والخصم اللي عليه نزاع بيتعلّق لحد ما يتبتّ فيه.', 'No deduction without an agreed clause, notice and evidence.')}</p>${btn(L('اعترض على خصم (تجربة)', 'Dispute a deduction (test)'), 'm-dispute', { kind: 'secondary', block: true })}${S.nav.merchant.disputed ? banner('info', 'scale', L('الاعتراض اتسجل. المفروض يراجعه حد غير اللي قرر — ولو مفيش شخص تاني، هيتقالك ده صراحةً.', 'Dispute logged. It should be reviewed by someone else — if not possible, you’ll be told.')) : ''}${AA('m-deduction-rules')}</section>
    ${msgQuote('MSG-M-006')}
    <div class="chips-row">${P('MERCHANT_007')}${P('FIN_003')}${P('FDR-0006', { silent: true })}</div>
  </div>` };
};
SCR.m_store = () => ({ key: 'm-store', tab: 'store', header: appbar(L('المتجر', 'Store')), body: `<div class="pad stack-16">
  ${mStatusControl()}
  <section class="card stack-8">${sectionHead(L('جدول مصير البضاعة حسب الفئة', 'Goods-fate table by category'), { icon: 'clipboard-list' })}<p class="muted">${L('لو طلب خرج ومتسلمش: الأكل يرجع؟ يتعدم؟ مين يدفع؟ الدليل بيقول يتفق عليه عند الضم مش عند الباب وقت الأزمة.', 'Agree this at onboarding, not at the door.')}</p>
    <table class="tbl"><thead><tr><th>${L('الفئة', 'Category')}</th><th>${L('ترجع؟', 'Return?')}</th><th>${L('الحالة', 'Status')}</th></tr></thead><tbody>${[[L('أكل محضّر ساخن', 'Hot prepared food'), L('لأ', 'No')], [L('مخبوزات', 'Bakery'), L('لأ عمليًا', 'Practically no')], [L('تورتة مكتوبة / مخصص', 'Custom cake'), L('لأ', 'No')], [L('بقالة جافة مقفولة', 'Sealed dry grocery'), L('غالبًا أيوه', 'Usually yes')]].map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${truth('decision', { label: L('غير متفق عليه', 'Not agreed') })}</td></tr>`).join('')}</tbody></table>${AA('m-goods-category-table')}</section>
  ${listBox([row({ icon: 'users', title: L('الموظفين والصلاحيات', 'Staff & permissions'), sub: L('غير متحقق منها', 'Not verified'), end: truth('unknown') }), row({ icon: 'messages-square', title: L('كلّم العمليات', 'Talk to operations'), act: 'm-chat' }), row({ icon: 'scroll-text', title: L('اتفاقية التاجر', 'Merchant agreement'), sub: L('الملف موجود — بنوده ما اتقرتش منهجيًا', 'File exists — clauses not systematically read'), end: truth('unknown') })])}
  ${AA('m-staff-roles')}
  ${listBox([row({ icon: 'log-out', title: L('خروج', 'Sign out'), act: 'm-logout', noChevron: true, iconTone: 'danger' })])}
  <div class="chips-row">${P('MERCHANT_001')}${P('MERCHANT_002')}${P('MERCHANT_008')}</div>
</div>` });
SCR.m_notifs = () => ({ key: 'm-notifs', header: appbar(L('الإشعارات', 'Notifications'), { back: true, backAct: 'm-back' }), body: `<div class="pad stack-8">${S.notifs.merchant.map((n) => `<div class="notif notif-row"><span class="notif-ic">${ic(n.icon || 'bell', 16)}</span><div><b>${n.title}</b>${n.body ? `<p>${n.body}</p>` : ''}<small>${clockStr(n.t)}</small></div></div>`).join('') || empty(`<div class="big-ic">${ic('bell', 40)}</div>`, L('مفيش إشعارات', 'No notifications'), '')}</div>` });

function merchantSheet(sh) {
  if (sh.kind === 'm-reject') return sheetWrap(`<div class="stack-8">${[L('صنف خلص', 'An item is out'), L('المطبخ زحمة قوي', 'Kitchen overloaded'), L('قافلين قريب', 'Closing soon'), L('سبب تاني', 'Other reason')].map((r) => `<button type="button" class="rcard ${S.nav.merchant.rejWhy === r ? 'on' : ''}" data-act="m-rej-why" data-v="${attr(r)}" role="radio" aria-checked="${S.nav.merchant.rejWhy === r}"><span class="rcard-main"><span class="rcard-title">${r}</span></span><span class="rcard-dot"></span></button>`).join('')}${note(L('الرفض قبل القبول مش بيتعاقب عليه — ده أحسن من قبول وبعدين فشل. العميل مش هيدفع حاجة.', 'Declining early is not penalised — better than accepting then failing.'))}${AA('m-accept-model')}</div>`, { key: 'm-reject', title: L('ليه هترفض؟', 'Why decline?'), footer: btn(L('ارفض الطلب', 'Decline order'), 'm-reject-do', { kind: 'danger', block: true, disabled: !S.nav.merchant.rejWhy, data: { id: sh.id } }) });
  if (sh.kind === 'm-price') return sheetWrap(`<div class="stack-12"><p>${L('هنرفع سعر «كفتة مشوية» 10 ج. العميل اللي عنده الصنف في السلة هيشوف التغيير ولازم يوافق — والطلبات المؤكدة ما بتتأثرش.', 'Raise kofta by 10. Carts must re-confirm; confirmed orders are unaffected.')}</p>${AA('c-price-change')}</div>`, { key: 'm-price', title: L('تغيير سعر', 'Change price'), footer: btn(L('طبّق +10', 'Apply +10'), 'm-price-do', { block: true }) });
  return '';
}
onAct('m-acct', (d) => { S.nav.merchant.acct = d.v; requestRender(); });
onAct('m-login', () => { S.nav.merchant.loggedIn = true; requestRender(); });
onAct('m-logout', () => { S.nav.merchant.loggedIn = false; requestRender(); });
onAct('m-go', (d) => { const p = Object.assign({}, d); const s = p.s; delete p.s; go('merchant', s, p); requestRender(); });
onAct('m-back', () => { goBack('merchant'); requestRender(); });
onAct('m-status', (d) => {
  const prev = S.merchants[MID()].status; S.merchants[MID()].status = d.v;
  audit('merchant', 'store.status', `${prev} → ${d.v}`);
  if (d.v === 'closed') { mOrders().filter((o) => ['accepted', 'preparing'].includes(o.st)).forEach((o) => { if (!o.pending.some((a) => a.kind === 'm_close_decide')) addPending(o, 'm_close_decide', 'merchant', 1.5); }); }
  toast(L('حالة المتجر اتغيرت — العميل بيشوفها فورًا', 'Status updated — customers see it immediately'), 'success', 'store'); requestRender();
});
onAct('m-close-decide', (d) => { const o = ord(d.id); dropPending(o, 'm_close_decide'); if (d.v === 'cancel') AUTO.m_close_decide(o); else tl(o, { ev: 'complete_after_close', actor: 'merchant', note: L('المتجر هيكمّل الطلب رغم القفل', 'Store will complete this order') }); requestRender(); });
onAct('m-prep', (d) => { S.nav.merchant.prep = +d.v; requestRender(); });
onAct('m-accept', (d) => { const o = ord(d.id); net('m-accept', () => { merchantAccept(o, S.nav.merchant.prep || o.prep); S.nav.merchant.prep = null; toast(L('قبلت الطلب', 'Order accepted'), 'success', 'check'); }); });
onAct('m-reject', (d) => { S.nav.merchant.rejWhy = null; openSheet({ kind: 'm-reject', id: d.id }); requestRender(); });
onAct('m-rej-why', (d) => { S.nav.merchant.rejWhy = d.v; requestRender(); });
onAct('m-reject-do', (d) => { const o = ord(d.id); closeSheet(); merchantReject(o, S.nav.merchant.rejWhy); requestRender(); });
onAct('m-start', (d) => { merchantStart(ord(d.id)); requestRender(); });
onAct('m-extend', (d) => { const o = ord(d.id); o.readyAt += 5; o.prep += 5; const a = o.pending.find((x) => x.kind === 'm_ready'); if (a) a.due = o.readyAt; tl(o, { ev: 'extend', actor: 'merchant', note: L('المتجر زوّد وقت التحضير 5 دقايق', 'Store added 5 minutes') }); if (!o.lateNotified && o.readyAt - o.placedAt > o.promise.hi - 10) SCN_RUNTIME.makeLate(o); requestRender(); });
onAct('m-ready', (d) => { const o = ord(d.id); net('m-ready', () => { merchantReady(o); toast(L('الطلب جاهز', 'Order ready'), 'success', 'package-check'); }); });
onAct('m-itemout', (d) => { SCN_RUNTIME.itemOut(ord(d.id), d.pid); toast(L('بلّغنا العميل يختار — مش هيتبعت بديل من غير موافقته', 'Customer asked to choose'), 'info', 'package-x'); requestRender(); });
onAct('bind:m-check', (v, el) => { const top = topOf('merchant'); S.nav.merchant.check = S.nav.merchant.check || {}; S.nav.merchant.check[top.id + ':' + el.dataset.i] = v; });
onAct('m-stock', (d) => { const m = S.merchants[MID()]; const cur = stockOf(d.pid); m.stock[d.pid] = cur.out ? null : 'out'; if (!cur.out) Object.values(S.cust.cart.lines).forEach(() => {}); requestRender(); });
onAct('m-price', () => { openSheet({ kind: 'm-price' }); requestRender(); });
onAct('m-price-do', () => { const m = S.merchants[MID()]; m.price.p101 = (m.price.p101 != null ? m.price.p101 : PR('p101').price) + 10; closeSheet(); audit('merchant', 'price.change', 'p101 +10'); toast(L('السعر اتغيّر — بيسري على الطلبات الجديدة', 'Price changed — new orders only'), 'success', 'pencil'); requestRender(); });
onAct('m-dispute', () => { S.nav.merchant.disputed = true; ticketCreate({ orderId: null, kind: 'other', prio: 'next', by: 'merchant', text: L('التاجر معترض على خصم', 'Merchant disputes a deduction'), queue: 'support' }); requestRender(); });
onAct('m-chat', () => { chatThread('mo-' + MID(), ['merchant', 'ops']); openSheet({ kind: 'chat', th: 'mo-' + MID(), with: 'ops', me: 'merchant' }); requestRender(); });
