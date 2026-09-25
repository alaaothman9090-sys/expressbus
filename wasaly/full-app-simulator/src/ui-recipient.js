/* ==========================================================================
   ui-recipient.js — the person who receives an order someone else placed.
   Today the system knows one account only (CUSTOMER_007 unverified) and SMS
   is a no-op (SRC-0019 / CFL-0011): the recipient gets nothing from Wasaly.
   ========================================================================== */
function rcpOrder() {
  const list = Object.values(S.orders).filter((o) => o.rcp && o.rcp.mode === 'other').sort((a, b) => b.placedAt - a.placedAt);
  return list.find(isActive) || list[0] || null;
}
/* sample texts, written for this simulator to show the idea — not from the manual's message library */
function rcpProposedMsgs(o) {
  const out = [];
  const eta = etaInfo(o);
  const m = esc(mName(o.mid)); const buyer = L(PEOPLE.customer.name, PEOPLE.customer.nameEn);
  out.push({ at: o.placedAt, text: L(`${buyer} بعتلك طلب من ${m} عن طريق وصّلي.${eta ? ` هيوصلك حوالي ${clockStr(now() + eta.hi)}.` : ''}${o.rcp.payer === 'recipient' && o.pay.method === 'cash' ? (o.rcp.hidePrice ? ' مطلوب دفع كاش عند الاستلام.' : ` مطلوب ${money(o.total)} كاش عند الاستلام.`) : ' مدفوع — مش مطلوب منك فلوس.'}`, `${buyer} sent you an order from ${m}.`) });
  if (o.stAt && o.stAt.picked_up) out.push({ at: o.stAt.picked_up, text: L(`الكابتن ${esc(kName(o.kid))} استلم الطلب وجاي لك.`, `Captain ${esc(kName(o.kid))} is on the way.`) });
  if (o.cap && ['at_customer', 'waiting_ops'].includes(o.cap.phase) || (o.stAt && o.stAt.delivered)) out.push({ at: (o.cap && o.cap.atC) || now(), text: L(`الكابتن على الباب. كود الاستلام: ${o.code} — قوله للكابتن وهو قدامك بس.`, `Captain at the door. Code: ${o.code}.`) });
  return out;
}
SCR.r_home = () => {
  const o = rcpOrder();
  const name = o ? o.rcp.name : L(PEOPLE.mother.name, PEOPLE.mother.nameEn);
  const header = `<header class="appbar"><div class="appbar-title"><span class="eyebrow">${L('موبايل المستلم — مش عميل في النظام', 'Recipient’s phone — not a system user')}</span><h1>${esc(name)}</h1></div></header>`;
  if (!o) {
    return { key: 'r-home-empty', tabbar: false, header, body: `<div class="pad stack-16">
      ${empty(`<div class="big-ic">${ic('gift', 40)}</div>`, L('مفيش طلب جاي لك دلوقتي', 'No order is on its way'), L('الشاشة دي بتوضح المستلم — اللي حد تاني طلبله — بيشوف إيه. ابدأ سيناريو فيه طلب لشخص تاني.', 'This shows what a recipient sees. Start a scenario with an order for someone else.'))}
      <div class="grid-2">${btn(L('سيناريو E — المستلم مختلف', 'Scenario E'), 'scn-quick', { kind: 'secondary', data: { v: 'E' } })}${btn(L('سيناريو X — طلب لشخص آخر', 'Scenario X'), 'scn-quick', { kind: 'secondary', data: { v: 'X' } })}</div>
      ${AA('c-recipient', 'r-no-account')}</div>` };
  }
  const atDoor = o.pending.some((a) => a.kind === 'c_handover' && a.role === 'recipient');
  const cashDue = o.pay.method === 'cash' && o.rcp.payer === 'recipient';
  const buyer = L(PEOPLE.customer.name, PEOPLE.customer.nameEn);
  let main = '';
  if (atDoor) {
    main = `<section class="card handover-card stack-12">
      <h3 class="h-sm">${ic('bike', 18)}${L('كابتن وصّلي على الباب', 'A Wasaly captain is at your door')}</h3>
      <p>${L(`معاه طلب باسمك من ${buyer} — من ${esc(mName(o.mid))}. ما وصلكش أي رسالة قبلها.`, `An order in your name from ${buyer}. You received no message before this.`)}</p>
      ${cashDue ? (o.rcp.hidePrice
        ? banner('danger', 'eye-off', L('الطلب «السعر مخفي» — بس المطلوب منك تدفع كاش. يعني هتعرف السعر من الكابتن على الباب.', 'Price is “hidden” — yet you must pay cash at the door.'))
        : `<div class="cash-due">${ic('banknote', 20)}<span>${L('مطلوب منك كاش', 'You pay in cash')}</span><b class="num">${money(dueCash(o))}</b></div>`)
        : note(L(`${buyer} هو اللي هيدفع — مش مطلوب منك فلوس.`, `${buyer} pays — nothing is due from you.`), { icon: 'shield-check' })}
      ${o.rcpCode
        ? `<div class="code-box"><span>${L('كود الاستلام (قاله لك المشتري في التليفون)', 'Delivery code (the buyer told you)')}</span><b class="num code" dir="ltr">${o.code.split('').join(' ')}</b><small>${L('قوله للكابتن وهو قدامك بس.', 'Say it face to face only.')}</small></div>`
        : `<div class="sim-box">${ic('message-circle-warning', 20)}<div class="stack-8"><b>${L('الكابتن هيطلب منك «كود الاستلام»', 'The captain will ask for the delivery code')}</b><p class="small">${L('الكود بيظهر في تطبيق المشتري بس، ومفيش رسالة بتوصلك. من غيره التسليم ما يتثبتش.', 'The code is only in the buyer’s app and no message reaches you.')}</p>${btn(L(`اتصل بـ${buyer} وخد الكود (محاكاة)`, `Call ${buyer} for the code (sim)`), 'r-getcode', { kind: 'secondary', size: 'sm', icon: 'phone', data: { id: o.id } })}</div></div>`}
      <div class="stack-8">${btn(L('استلمت', 'I received it'), 'r-accept', { block: true, busy: S.busy.handover, disabled: !o.rcpCode, data: { id: o.id } })}
        ${!o.rcpCode ? `<p class="muted small center">${L('محتاج الكود الأول عشان الكابتن يأكد التسليم.', 'You need the code first so the captain can confirm.')}</p>` : ''}
        ${btn(L('أنا ماطلبتش حاجة', 'I did not order anything'), 'r-refuse', { kind: 'danger-ghost', block: true, data: { id: o.id } })}</div>
      <p class="muted small">${ic('info', 12)} ${L('المستلم يقدر يستلم أو يرفض بس — أي حاجة تانية (إلغاء، بديل، فلوس، عنوان) بترجع للمشتري.', 'The recipient can only accept or refuse — everything else goes back to the buyer.')}</p>
      ${AA('r-code-gap', 'c-hide-price-cod', 'c-payer-recipient')}${P('CUSTOMER_007')}</section>`;
  } else if (o.door && o.door.mode === 'recipient_refuse' && isActive(o)) {
    main = `<section class="card door-card"><div class="strong-line">${ic('hand', 20)}<span>${L('قلت إنك ماطلبتش حاجة', 'You said you did not order anything')}</span></div><p class="muted">${L(`الكابتن بيبلّغ العمليات، والعمليات هتكلم ${buyer} — هو صاحب القرار في الطلب.`, `Operations will call ${buyer} — the buyer decides.`)}</p></section>`;
  } else if (['delivered', 'completed'].includes(o.st)) {
    main = `<section class="card outcome tone-success"><h3 class="h-sm">${ic('circle-check', 18)}${L('استلمت الطلب', 'You received the order')}</h3><p class="muted">${L('التقييم والشكوى من حساب المشتري بس — إنت مالكش حساب في النظام. لو فيه مشكلة لازم تكلم المشتري.', 'Rating and complaints only from the buyer’s account.')}</p>${AA('r-no-account')}</section>`;
  } else if (!isActive(o)) {
    main = `<section class="card outcome"><h3 class="h-sm">${ic('circle-x', 18)}${L('الطلب ما اتسلمش', 'The order was not delivered')}</h3><p class="muted">${L('ولا وصلك أي إشعار بكده.', 'And no message told you so.')}</p></section>`;
  } else {
    main = `<section class="card calm">${ic('bell-off', 18)}<span>${L('مفيش أي معلومة وصلتك عن الطلب ده — إنت مش عارف إن فيه حاجة جاية.', 'Nothing has reached you — you do not know anything is coming.')}</span></section>`;
  }
  const proposed = rcpProposedMsgs(o);
  return { key: 'r-home-' + o.id, tabbar: false, bg: 'surface', header, body: `<div class="pad stack-16">
    ${main}
    <section class="card stack-12">${sectionHead(L('رسائل وصّلي (SMS)', 'Wasaly messages (SMS)'), { icon: 'message-circle' })}
      <div class="truth-row">${truth('current', { label: L('موجود حاليًا: مزوّد الرسائل noop', 'Current: SMS provider is a no-op') })}</div>
      <p class="muted">${L('مفيش رسائل وصلت من وصّلي.', 'No messages from Wasaly.')}</p>
      ${AA('r-no-sms')}
      <details class="rcp-proposed"><summary>${L('لو الرسائل كانت شغالة — كان هيوصلك إيه؟', 'If messages worked — what would arrive?')}</summary>
        <div class="truth-row">${truth('proposal')}${truth('notbuilt')}</div>
        <p class="muted small">${L('نصوص توضيحية مكتوبة للمحاكي — مش من مكتبة رسائل الدليل.', 'Illustrative texts written for this simulator — not from the manual’s library.')}</p>
        <ul class="sms-list">${proposed.map((x) => `<li class="sms"><span>${x.text}</span><small class="num">${clockStr(x.at)}</small></li>`).join('')}</ul>
        ${AA('c-recipient-privacy')}</details>
    </section>
    <div class="chips-row">${P('CUSTOMER_007')}${P('DATA_003')}${P('DATA_002')}</div>
  </div>` };
};
function recipientSheet() { return ''; }

onAct('r-getcode', (d) => {
  const o = ord(d.id); if (!o) return;
  o.rcpCode = true;
  tl(o, { ev: 'rcp_code', actor: 'recipient', note: L('المستلمة كلّمت المشتري وخدت الكود منه — مفيش رسالة وصلتها', 'Recipient called the buyer for the code — no message reached her') });
  toast(L(`${PEOPLE.customer.name} في التليفون: «الكود ${o.code}»`, `${PEOPLE.customer.nameEn} on the phone: “the code is ${o.code}”`), 'info', 'phone-call');
  requestRender();
});
onAct('r-accept', (d) => {
  const o = ord(d.id); if (!o || !o.rcpCode) return;
  net('handover', () => { customerHandover(o, { given: cashGiven(o) }); toast(L('تمام — الكابتن هيأكد التسليم', 'OK — the captain will confirm'), 'success', 'check'); });
});
onAct('r-refuse', (d) => { const o = ord(d.id); if (!o) return; SCN_RUNTIME.doorEvent(o, 'recipient_refuse'); requestRender(); });
