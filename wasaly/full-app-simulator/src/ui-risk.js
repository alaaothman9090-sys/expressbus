/* ==========================================================================
   ui-risk.js — risk desk. Signals are read live from the shared state.
   RISK_001: a signal is not proof and never triggers an automatic action.
   RISK_003: any restriction needs six conditions and belongs to the founder.
   RISK_004: no detection rule before a path to correct its mistakes.
   ========================================================================== */
const RISK_CONDITIONS = [
  ['قرار بشري باسم صاحبه — مفيش تقييد أوتوماتيك', 'A named human decision — no automatic restriction'],
  ['أساس مكتوب ودليل بيتعرض على الشخص', 'A written basis and evidence shown to the person'],
  ['إخطار مسبق بالسبب والمدة', 'Prior notice with the reason and the duration'],
  ['مدة محددة وبتنتهي', 'A fixed duration that ends'],
  ['تظلّم لحد تاني غير اللي قرر', 'An appeal to someone other than the decider'],
  ['طريق واضح لرفع التقييد', 'A clear path to lift it'],
];
function riskSignals() {
  const out = [];
  const orders = Object.values(S.orders);
  const doorFails = orders.filter((o) => o.cnd || (o.cndPast && o.cndPast.length) || o.label === 'failed_delivery_tag' || o.st === 'failed_delivery');
  doorFails.forEach((o) => {
    const c = o.cnd || (o.cndPast && o.cndPast[o.cndPast.length - 1]) || {};
    out.push({ id: 'door-' + o.id, kind: 'door', icon: 'door-open', who: o.rcp.mode === 'other' ? L(`${PEOPLE.customer.name} (والمستلمة ${o.rcp.name})`, PEOPLE.customer.nameEn) : L(PEOPLE.customer.name, PEOPLE.customer.nameEn), whoRole: 'customer', orderId: o.id,
      title: L('تعذّر تسليم عند الباب', 'Delivery failed at the door'), detail: `${c.reason ? reasonLabel(c.reason) : L('تعذّر تسليم', 'Cannot deliver')} · ${L(`مرات تعذّر التسليم لنفس العميل في المحاكاة: ${doorFails.length}`, `Door failures for this customer: ${doorFails.length}`)}`, pol: ['RISK_001', 'CUSTOMER_006', 'CUSTOMER_003'], at: c.at || o.placedAt });
  });
  Object.keys(S.captains).forEach((k) => { const c = S.captains[k]; if (c.custody >= ECON.custodyLimit) out.push({ id: 'custody-' + k, kind: 'custody', icon: 'vault', who: kName(k), whoRole: 'captain', title: L('عهدة كاش وصلت الحد اليومي', 'Cash custody reached the daily limit'), detail: `${money(c.custody)} / ${money(ECON.custodyLimit)} — ${L('الحد قيمة في الكود مش معتمدة', 'limit is a code value, not approved')}`, pol: ['FIN_004'], at: now() }); });
  Object.values(S.tickets).filter((t) => t.kind === 'cash_diff').forEach((t) => { const o = t.orderId && S.orders[t.orderId]; out.push({ id: 'cash-' + t.id, kind: 'cash', icon: 'scale', who: o && o.kid ? kName(o.kid) : '—', whoRole: 'captain', orderId: t.orderId, title: L('فرق نقدي في التوريد', 'Cash difference at deposit'), detail: L('اللي عدّ الفلوس ما ينفعش يبقى هو اللي يقرر الفرق', 'The counter cannot also decide the difference'), pol: ['FIN_004', 'RISK_001'], at: t.at }); });
  orders.filter((o) => (o.tl || []).some((e) => e.ev === 'duplicate')).forEach((o) => out.push({ id: 'dup-' + o.id, kind: 'dup', icon: 'copy', who: L(PEOPLE.customer.name, PEOPLE.customer.nameEn), whoRole: 'customer', orderId: o.id, title: L('طلب مكرر', 'Duplicate order'), detail: L('مفيش مفتاح منع تكرار — العطب عندنا مش عند العميل (INC-0018)', 'No idempotency key — our defect, not the customer’s (INC-0018)'), pol: ['RISK_001'], at: o.placedAt }));
  orders.filter((o) => o.refund && o.refund.route === 'voucher').forEach((o) => out.push({ id: 'voucher-' + o.id, kind: 'voucher', icon: 'ticket', who: L(PEOPLE.customer.name, PEOPLE.customer.nameEn), whoRole: 'customer', orderId: o.id, title: L('استرداد اتصرف قسيمة رصيد', 'Refund paid as a stored-value voucher'), detail: L('رصيد مخزّن = سؤال للبنك المركزي (VAL-0008)', 'Stored value = central bank question (VAL-0008)'), pol: ['LEGAL_004'], at: now() }));
  if (S.ghostCharge) out.push({ id: 'ghost', kind: 'ghost', icon: 'receipt', who: L(PEOPLE.customer.name, PEOPLE.customer.nameEn), whoRole: 'customer', title: L('خصم من غير طلب مؤكد (محاكاة)', 'Charge without a confirmed order (sim)'), detail: L('راجع سجل الدفع قبل أي اتهام', 'Check the payment record before any accusation'), pol: ['FIN_002'], at: S.ghostCharge.at });
  return out.sort((a, b) => b.at - a.at);
}
function riskCaseFor(sigId) { return S.riskCases.find((c) => c.sig === sigId); }
function riskDesk() {
  const sig = riskSignals();
  const open = S.riskCases.filter((c) => c.status === 'open');
  const views = [{ id: 'signals', icon: 'radar', label: L('إشارات', 'Signals'), badge: sig.length || '' }, { id: 'cases', icon: 'file-search', label: L('مراجعات بشرية', 'Human reviews'), badge: open.length || '' }, { id: 'rules', icon: 'book-open', label: L('قواعد المخاطر', 'Risk rules') }];
  const v = S.nav.risk.view; let main = '';
  if (v === 'signals') {
    main = `${deskHead(L('إشارات المخاطر', 'Risk signals'), L('الإشارة سؤال مش حكم. مفيش أي إجراء أوتوماتيك — ولا هنا ولا في النظام.', 'A signal is a question, not a verdict. No automatic action.'))}
      <div class="truth-row">${truth('draft', { label: L('RISK_001 مسودة', 'RISK_001 draft') })}${truth('notbuilt', { label: L('شاشة المخاطر مش مبنية — محاكاة', 'Risk screen not built — simulation') })}</div>
      ${AA('rk-signal-not-proof', 'rk-no-baseline')}
      ${sig.length ? `<div class="stack-8">${sig.map((x) => { const c = riskCaseFor(x.id); return `<article class="card risk-sig"><span class="row-ic">${ic(x.icon, 20)}</span><div class="grow"><b>${x.title}</b><small>${esc(x.who)}${x.orderId ? ` · <bdi dir="ltr">${x.orderId}</bdi>` : ''} · ${clockStr(x.at)}</small><p class="small">${x.detail}</p><div class="chips-row">${truth('unknown', { label: L('إشارة — مش دليل', 'Signal — not proof') })}${x.pol.map((p) => P(p)).join('')}</div></div>${c ? `<span class="pill pill-info">${L('في مراجعة', 'In review')}</span>` : btn(L('افتح مراجعة بشرية', 'Open a human review'), 'rk-open', { kind: 'secondary', size: 'sm', data: { id: x.id } })}</article>`; }).join('')}</div>`
        : empty(`<div class="big-ic tone-success">${ic('shield-check', 40)}</div>`, L('مفيش إشارات دلوقتي', 'No signals right now'), L('جرّب السيناريو B أو N أو P — وشوف الإشارات بتظهر إزاي.', 'Try scenario B, N or P.'))}
      ${note(L('مفيش «معدل أساس» لرفض الاستلام في سمالوط (LDG-0001) — يعني ما ينفعش نقول «ده كتير» لسه.', 'No base rate for refusals in Samalout yet (LDG-0001).'), { icon: 'chart-column' })}`;
  } else if (v === 'cases') {
    const sel = S.nav.risk.sel && S.riskCases.find((c) => c.id === S.nav.risk.sel);
    main = `${deskHead(L('مراجعات بشرية', 'Human reviews'), L('كل مراجعة ليها صاحب باسمه، وكل قرار ليه سبب مكتوب.', 'Every review has a named owner and a written reason.'))}
      <div class="${cls('split', sel && 'has-sel')}"><div class="split-list">${S.riskCases.length ? S.riskCases.map((c) => `<button type="button" class="${cls('tk-row', sel && sel.id === c.id && 'on')}" data-act="rk-sel" data-id="${c.id}"><span class="pill pill-${c.status === 'open' ? 'warning' : c.status === 'cleared' ? 'success' : 'info'}">${riskStatusLabel(c.status)}</span><div class="tk-main"><b>${c.id} · ${c.title}</b><small>${esc(c.who)} · ${clockStr(c.at)}</small></div></button>`).join('') : empty(`<div class="big-ic">${ic('file-search', 40)}</div>`, L('مفيش مراجعات', 'No reviews'), L('افتح مراجعة من «إشارات».', 'Open one from Signals.'))}</div>
      <div class="split-detail">${sel ? riskCaseDetail(sel) : `<div class="calm-center">${ic('mouse-pointer-2', 28)}<p>${L('اختار مراجعة', 'Select a review')}</p></div>`}</div></div>`;
  } else {
    main = `${deskHead(L('قواعد المخاطر', 'Risk rules'), L('من الدليل — مسودات مش معتمدة.', 'From the manual — drafts, not approved.'))}
      ${banner('info', 'shield-check', L('التقييد الأوتوماتيك محجوب في المحاكي (autoRestrict) — ومحجوز للمؤسس بالستة شروط.', 'Automatic restriction is blocked and reserved for the founder.'))}
      <div class="stack-12">${['RISK_001', 'RISK_003', 'RISK_004', 'CUSTOMER_006'].map((id) => policyCard(id, true)).join('')}${fdrCard('FDR-0011', true)}</div>
      ${AA('rk-restriction-six', 'rk-correction-first')}`;
  }
  return deskFrame('risk', views, main, { who: L('المؤسس — المخاطر (محاكاة)', 'Founder — risk (simulation)') });
}
const riskStatusLabel = (s) => ({ open: L('مفتوحة', 'Open'), cleared: L('اتقفلت — تفسير معقول', 'Closed — reasonable explanation'), notified: L('توعية اتبعتت (محاكاة)', 'Awareness sent (sim)'), proposed: L('اقتراح تقييد — مش قرار', 'Restriction proposed — not a decision') }[s] || s);
function riskCaseDetail(c) {
  return `<section class="card stack-12 tk-detail"><div class="split-back">${btn(L('رجوع للمراجعات', 'Back to reviews'), 'rk-close', { kind: 'ghost', size: 'sm', icon: 'arrow-right' })}</div>
    <div class="row-between"><h2>${c.id} · ${c.title}</h2><span class="pill pill-${c.status === 'open' ? 'warning' : 'info'}">${riskStatusLabel(c.status)}</span></div>
    <p class="muted">${esc(c.who)}${c.orderId ? ` · <bdi dir="ltr">${c.orderId}</bdi>` : ''} — ${c.detail}</p>
    <section class="stack-8"><h3 class="h-sm">${L('الستة شروط قبل أي تقييد (RISK_003)', 'Six conditions before any restriction (RISK_003)')}</h3>
      <ul class="checklist">${RISK_CONDITIONS.map(([a, e], i) => `<li class="${c.checks[i] ? 'done' : ''}"><button type="button" class="chk" data-act="rk-check" data-id="${c.id}" data-i="${i}" role="checkbox" aria-checked="${!!c.checks[i]}">${ic(c.checks[i] ? 'square-check' : 'square', 18)}<span>${L(a, e)}</span></button></li>`).join('')}</ul>
      <p class="muted small">${L('حتى لو الستة اتعلّموا هنا — التقييد نفسه قرار المؤسس، وسلّمه لسه مش محسوم (FDR-0011).', 'Even with all six ticked, the restriction itself is the founder’s decision (FDR-0011 open).')}</p></section>
    ${field({ label: L('ملاحظة المراجع (باسمك)', 'Reviewer note (named)'), bind: 'rk-note', value: S.nav.risk.note || '', textarea: true, rows: 2, max: 300 })}
    <div class="stack-8">${btn(L('اقفل: تفسير معقول / إنذار كاذب — من غير أي وسم', 'Close: reasonable explanation — no mark'), 'rk-status', { block: true, kind: 'secondary', icon: 'circle-check', data: { id: c.id, v: 'cleared' } })}
      ${btn(L('ابعت توعية للعميل (محاكاة)', 'Send an awareness note (sim)'), 'rk-status', { block: true, kind: 'secondary', icon: 'message-circle', data: { id: c.id, v: 'notified' } })}
      ${btn(L('اقترح تقييد…', 'Propose a restriction…'), 'rk-propose', { block: true, kind: 'danger-ghost', icon: 'lock', data: { id: c.id } })}
      ${btn(L('قارن حلول FDR-0011', 'Compare FDR-0011 options'), 'compare-open', { block: true, kind: 'ghost', icon: 'split', data: { fdr: 'FDR-0011' } })}</div>
    ${c.log.length ? `<section class="stack-8"><h3 class="h-sm">${L('سجل المراجعة', 'Review log')}</h3><ul class="tl-list">${c.log.map((x) => `<li><span class="num tl-t">${clockStr(x.t)}</span><span>${x.text}</span></li>`).join('')}</ul></section>` : ''}
    ${AA('rk-restriction-six', 'rk-correction-first')}</section>`;
}
onAct('rk-open', (d) => {
  const x = riskSignals().find((s) => s.id === d.id); if (!x || riskCaseFor(x.id)) return;
  const c = { id: 'R-' + (201 + S.riskCases.length), sig: x.id, title: x.title, who: x.who, whoRole: x.whoRole, orderId: x.orderId || null, detail: x.detail, status: 'open', at: now(), checks: [false, false, false, false, false, false], log: [{ t: now(), text: L('اتفتحت مراجعة بشرية على إشارة — مش اتهام', 'Human review opened on a signal — not an accusation') }] };
  S.riskCases.unshift(c); S.nav.risk.view = 'cases'; S.nav.risk.sel = c.id;
  audit('founder', 'risk.review.open', `${c.id} ${x.id}`);
  requestRender();
});
onAct('rk-sel', (d) => { S.nav.risk.sel = d.id; requestRender(); });
onAct('rk-close', () => { S.nav.risk.sel = null; requestRender(); });
onAct('rk-check', (d) => { const c = S.riskCases.find((x) => x.id === d.id); if (!c) return; c.checks[+d.i] = !c.checks[+d.i]; requestRender(); });
onAct('bind:rk-note', (v) => { S.nav.risk.note = v; });
onAct('rk-status', (d) => {
  const c = S.riskCases.find((x) => x.id === d.id); if (!c) return;
  const note = (S.nav.risk.note || '').trim();
  if (!note) { toast(L('اكتب سبب مكتوب الأول — كل قرار ليه سبب وصاحب', 'Write a reason first — every decision has a reason and an owner'), 'warning', 'notebook-pen'); requestRender(); return; }
  c.status = d.v; c.log.push({ t: now(), text: `${riskStatusLabel(d.v)} — ${esc(note)}` }); S.nav.risk.note = '';
  audit('founder', 'risk.review.' + d.v, c.id);
  toast(d.v === 'cleared' ? L('اتقفلت من غير أي وسم على الشخص (RISK_004)', 'Closed with no mark on the person (RISK_004)') : L('اتسجلت — محاكاة', 'Logged — simulation'), 'success', 'check');
  requestRender();
});
onAct('rk-propose', (d) => {
  const c = S.riskCases.find((x) => x.id === d.id); if (!c) return;
  const missing = RISK_CONDITIONS.filter((_, i) => !c.checks[i]).length;
  S.dialog = { title: L('اقتراح تقييد — مش تقييد', 'Propose a restriction — not a restriction'), body: `${L('التقييد محجوز للمؤسس، ومحتاج الستة شروط كلها، وسلّم التقييد نفسه (FDR-0011) لسه مش محسوم. المحاكي هيسجّل «اقتراح» في سجل المراجعة بس — ومش هيحصل أي أثر على الشخص.', 'Restriction belongs to the founder, needs all six conditions, and FDR-0011 is open. The simulator logs a proposal only — no effect on the person.')}${missing ? `<br><b>${L(`ناقص ${missing} من 6 شروط.`, `${missing} of 6 conditions missing.`)}</b>` : ''}`, reason: true, confirm: { label: L('سجّل الاقتراح', 'Log the proposal'), act: 'rk-propose-do', data: { id: c.id } }, tone: 'danger' };
  requestRender();
});
onAct('rk-propose-do', () => {
  const id = S.dialog && S.dialog.confirm && S.dialog.confirm.data.id; const c = S.riskCases.find((x) => x.id === id);
  const why = (S.dialog && S.dialog.reasonText || '').trim();
  if (!why) { S.dialog.err = L('اكتب السبب — مفيش اقتراح تقييد من غير سبب مكتوب.', 'Enter a reason.'); requestRender(); return; }
  S.dialog = null; if (!c) return;
  c.status = 'proposed'; c.log.push({ t: now(), text: L(`اقتراح تقييد (محاكاة — مش قرار)${why ? ': ' + esc(why) : ''}`, 'Restriction proposed (simulation — not a decision)') });
  audit('founder', 'risk.restriction.proposed.sim', c.id);
  requestRender();
});
