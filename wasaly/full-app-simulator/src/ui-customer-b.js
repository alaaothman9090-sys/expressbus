/* ==========================================================================
   ui-customer-b.js — customer app: live order, handover, after-delivery,
   orders, support, assistant, account.
   ========================================================================== */

function orderMap(o, o2 = {}) {
  const m = M(o.mid); const mn = MAP.nodes[m.node]; const a = addrOf(o); const an = MAP.nodes[a.node];
  const legs = []; let cap = null;
  const mainRoute = MAP.route(m.node, a.node);
  if (o.cap && o.cap.phase === 'to_merchant') { legs.push({ pts: o.cap.pts, done: o.cap.dist / o.cap.len }); legs.push({ pts: mainRoute, done: 0, muted: true }); }
  else if (o.cap && ['to_customer'].includes(o.cap.phase)) { legs.push({ pts: o.cap.pts, done: o.cap.dist / o.cap.len }); }
  else if (o.cap && ['at_customer', 'waiting_ops', 'done'].includes(o.cap.phase)) { legs.push({ pts: o.cap.pts || mainRoute, done: 1 }); }
  else legs.push({ pts: mainRoute, done: 0, muted: true });
  if (o.kid && o.cap && o.cap.phase !== 'done') {
    const c = S.captains[o.kid]; let x = c.x, y = c.y; const gps = S.set.gps;
    if (gps === 'weak') { const j = (Math.sin(now() * 13) + Math.cos(now() * 7)) * 14; x += j; y -= j * 0.7; }
    cap = { x, y, gps, stale: gps === 'unavailable', label: '' };
  }
  const fit = mainRoute.concat(o.cap && o.cap.pts ? o.cap.pts : []);
  return MAP.render({ legs, markers: [{ x: mn.x, y: mn.y, kind: 'merchant' }, { x: an.x, y: an.y, kind: 'home' }], captain: cap, fit, zoom: S.cust.mapZoom || 1, aspect: o2.aspect || 1.35, pad: 90 });
}
function custTimeline(o) {
  const ev = (name) => o.tl.find((x) => x.ev === name);
  const at = (st) => o.stAt[st];
  const failed = o.st === 'cancelled' || o.st === 'failed_delivery';
  const steps = [
    { k: 'placed', label: L('الطلب اتبعت', 'Order placed'), t: at('placed') },
    { k: 'accepted', label: L('المتجر قبل', 'Store accepted'), t: at('accepted') },
    { k: 'preparing', label: L('بيتحضّر', 'Preparing'), t: at('preparing') },
    { k: 'assigned', label: o.kid ? L(`الكابتن ${kName(o.kid)} اتعيّن`, `${kName(o.kid)} assigned`) : L('بندوّر على كابتن', 'Finding a captain'), t: ev('assigned') && ev('assigned').t },
    { k: 'picked_up', label: L('الكابتن استلم', 'Picked up'), t: at('picked_up') },
    { k: 'at_customer', label: L('الكابتن وصل', 'Captain arrived'), t: ev('at_customer') && ev('at_customer').t },
    { k: 'delivered', label: L('اتسلّم', 'Delivered'), t: at('delivered') },
  ];
  let seenNow = false;
  return thread(steps.map((s) => {
    let state = s.t != null ? 'done' : 'todo';
    if (state === 'todo' && !seenNow && !failed) { state = 'now'; seenNow = true; }
    if (state === 'todo' && failed && !seenNow) { state = 'fail'; seenNow = true; }
    return { label: s.label, sub: s.t != null ? clockStr(s.t) : '', state };
  }));
}
function captainCard(o) {
  if (!o.kid) return '';
  const k = K(o.kid);
  return `<div class="cap-card"><span class="avatar" style="--av:${k.color}">${esc(kName(o.kid).slice(0, 1))}</span><div class="cap-main"><b>${L('الكابتن', 'Captain')} ${esc(kName(o.kid))}</b><small>${esc(k.vehicle)} · ${ic('star', 12)}<span class="num">${k.rating}</span> · <bdi>${esc(k.plate)}</bdi></small></div>
    ${iconBtn('phone', L('اتصل بالكابتن', 'Call captain'), 'c-call', { data: { to: 'captain', id: o.id } })}${iconBtn('message-circle', L('راسل الكابتن', 'Message captain'), 'c-chat', { data: { th: 'cc-' + o.id, with: 'captain' } })}</div>${AA('c-masked-call')}`;
}

/* ---------------------------------------------------------------- live tracking */
SCR.track = (p) => {
  const o = ord(p.id);
  if (!o) return { key: 'track-missing', header: appbar(L('الطلب', 'Order'), { back: true }), body: empty('', L('الطلب ده مش موجود', 'Order not found'), '') };
  CUR.step = journeyStepOf(o);
  const eta = etaInfo(o); const m = M(o.mid); const offline = S.set.network === 'offline';
  const stuck = o.cnd && isActive(o);
  const headline = trackHeadline(o, stuck);
  const cr = cancelRuling(o);
  const pend = o.pending.filter((a) => a.role === 'customer');
  return { key: 'track-' + o.id, bg: 'surface',
    header: appbar(`<bdi dir="ltr">${o.id}</bdi>`, { back: true, eyebrow: L('طلبك', 'Your order'), actions: iconBtn('headset', L('المساعدة', 'Help'), 'c-go', { data: { s: 'help', id: o.id } }) }),
    body: `<div class="track">
      ${offline ? banner('warning', 'wifi-off', L(`مفيش إنترنت — دي آخر حالة وصلتنا (${clockStr(S.cust.lastSync || now())}). الطلب شغال عادي.`, 'Offline — showing the last known status. Your order continues.')) : ''}
      ${S.sys.outage ? banner('danger', 'server-crash', L('فيه عطل عندنا دلوقتي وإحنا بنشتغل عليه. طلبك متابَع بالتليفون ومش هنسيبك من غير رد.', 'We have an outage. Your order is followed by phone.')) : ''}
      ${isActive(o) || o.st === 'delivered' ? `<div class="map-box map-track">${orderMap(o)}
        <div class="map-ctrls">${iconBtn('plus', L('تكبير', 'Zoom in'), 'c-zoom', { data: { d: '1' }, size: 18 })}${iconBtn('minus', L('تصغير', 'Zoom out'), 'c-zoom', { data: { d: '-1' }, size: 18 })}${iconBtn('crosshair', L('رجّع الخريطة', 'Re-centre'), 'c-zoom', { data: { d: '0' }, size: 18 })}</div>
        <span class="map-label">${ic('flask-conical', 12)}${L('خريطة توضيحية', 'Illustrative map')}</span>
        ${S.set.gps !== 'accurate' && o.kid ? `<span class="map-gps tone-warning">${ic('locate-off', 12)}${S.set.gps === 'weak' ? L('موقع الكابتن تقريبي', 'Approximate location') : L(`آخر موقع من ${Math.max(1, Math.round(now() - (S.captains[o.kid].lastFix || now())))} د`, 'Last known location')}</span>` : ''}
      </div>${AA('c-gps-states')}` : ''}
      <section class="track-head"><h2 class="track-title">${headline}</h2>
        ${eta ? `<p class="track-eta">${ic('clock', 16)}${eta.uncertain ? L('الوقت مش مؤكد دلوقتي — ', 'Time uncertain — ') : ''}${L('توصل حوالي', 'Arrives about')} <b class="num">${clockStr(now() + eta.lo)} – ${clockStr(now() + eta.hi)}</b>${eta.late ? ` <span class="dotchip tone-danger">${L('متأخر عن الميعاد', 'Late')}</span>` : ''}</p>` : ''}
        ${isActive(o) ? `<div class="stitch-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progressOf(o) * 100)}" aria-label="${attr(L('تقدم الطلب', 'Order progress'))}"><i style="width:${Math.round(progressOf(o) * 100)}%"></i></div>` : ''}
        ${AA('c-eta-promise', 'c-eta-uncertain')}
        ${stuck ? `${banner('warning', 'triangle-alert', L('الطلب واقف عند الباب — العمليات بتتابعه. مفيش أي مبلغ مستحق عليك.', 'Stopped at the door — operations are on it. You owe nothing.'))}${AA('c-stuck-in-transit')}` : ''}
      </section>
      ${pend.map((a) => customerActionCard(o, a)).join('')}
      ${o.cap && o.cap.phase === 'at_customer' && !pend.length && !o.door && o.st === 'in_transit' && o.rcp.mode !== 'other' ? `<section class="card handover-card">${handoverHtml(o)}</section>` : ''}
      ${o.door && isActive(o) && !o.cnd && !pend.length && o.rcp.mode !== 'other' ? doorCard(o) : ''}
      ${o.pending.some((a) => a.kind === 'c_handover' && a.role === 'recipient') ? `<section class="card handover-card stack-12"><h3 class="h-sm">${ic('bike', 18)}${L(`الكابتن وصل عند ${esc(o.rcp.name)}`, `The captain reached ${esc(o.rcp.name)}`)}</h3><div class="code-box"><span>${L('كود الاستلام', 'Delivery code')}</span><b class="num code" dir="ltr">${o.code.split('').join(' ')}</b><small>${L('وصّلي مش بتبعت الكود للمستلم — لازم تبلغه إنت بنفسك في التليفون.', 'Wasaly does not send the code to the recipient — tell them yourself by phone.')}</small></div>${AA('r-code-gap')}</section>` : ''}
      ${o.door && o.door.mode === 'recipient_refuse' && isActive(o) && !o.cnd ? `<section class="card door-card"><div class="strong-line">${ic('users', 20)}<span>${L(`${esc(o.rcp.name)} قالت إنها ماطلبتش حاجة`, `${esc(o.rcp.name)} said she ordered nothing`)}</span></div><p class="muted">${L('إنت اللي طلبت، فالقرار ليك. العمليات هتكلمك.', 'You placed the order, so it is your call. Operations will call you.')}</p></section>` : ''}
      ${outcomeCard(o)}
      ${captainCard(o)}
      <section class="card">${sectionHead(L('مراحل الطلب', 'Order progress'), { icon: 'route' })}${custTimeline(o)}${AA('c-transitions')}</section>
      <section class="card">${sectionHead(L('تفاصيل الطلب', 'Order details'), { icon: 'receipt-text' })}
        <div class="cgroup-head">${merchantLogo(m, 32)}<div><b>${esc(mName(o.mid))}</b><small>${demoTag()}</small></div></div>
        <ul class="sum-lines">${o.lines.map((l) => `<li class="${l.state !== 'ok' ? 'is-struck' : ''}"><span class="num">${l.qty}×</span><span>${esc(pName(l.pid))}${l.state === 'out' ? ` <small class="err-t">${L('خلص', 'Sold out')}</small>` : l.state === 'removed' ? ` <small>${L('اتشال', 'Removed')}</small>` : l.state === 'sub' ? ` <small>${L('اتبدّل', 'Substituted')}</small>` : l.subFor ? ` <small>${L('بديل بموافقتك', 'Approved substitute')}</small>` : ''}</span><b class="num">${money(l.unit * l.qty)}</b></li>`).join('')}</ul>
        ${priceBreakdown({ sub: o.sub, del: o.del, svc: o.svc, disc: o.disc, total: o.total }, { totalLabel: o.pay.method === 'cash' ? L('هتدفع كاش', 'Cash to pay') : L('الإجمالي', 'Total') })}
        ${row({ icon: o.pay.method === 'cash' ? 'banknote' : 'credit-card', title: payLabel(o.pay.method), sub: payStateLabel(o) })}
        ${o.rcp.mode === 'other' ? row({ icon: 'users', title: `${L('المستلم', 'Recipient')}: ${esc(o.rcp.name)}`, sub: `${esc(o.rcp.rel)} · <bdi dir="ltr">${esc(o.rcp.phone)}</bdi>${o.rcp.hidePrice ? ' · ' + L('السعر مخفي عن المستلم', 'Price hidden') : ''}` }) : ''}
        ${row({ icon: 'map-pin', title: esc(L(addrOf(o).label, addrOf(o).labelEn)), sub: `${esc(addrOf(o).line)} · ${esc(addrOf(o).landmark)}` })}
      </section>
      ${custNotifs(o)}
      <section class="stack-8 pad-x">${btn(L('محتاج مساعدة؟', 'Need help?'), 'c-go', { kind: 'secondary', block: true, icon: 'headset', data: { s: 'help', id: o.id } })}
        ${isActive(o) ? (cr.allowed ? btn(L('إلغاء الطلب', 'Cancel order'), 'c-cancel', { kind: 'danger-ghost', block: true, data: { id: o.id } }) : ['preparing', 'ready'].includes(o.st) ? btn(L('عايز ألغي؟', 'Want to cancel?'), 'c-cancel', { kind: 'ghost', block: true, data: { id: o.id } }) : '') : ''}
        ${AA('c-cancel-matrix')}</section>
      <div class="chips-row pad-x">${P('OPS_001')}${P('CUSTOMER_002')}${P('CUSTOMER_003')}${P('CUSTOMER_008')}</div>
    </div>` };
};
function trackHeadline(o, stuck) {
  const k = o.kid ? kName(o.kid) : '';
  if (stuck) return L('الكابتن عند العنوان — فيه مشكلة في التسليم', 'Captain at the address — delivery issue');
  switch (o.st) {
    case 'placed': return L('مستنيين المتجر يقبل طلبك', 'Waiting for the store to accept');
    case 'accepted': return L('المتجر قبل طلبك', 'The store accepted');
    case 'preparing': return o.lateNotified ? L('طلبك لسه بيتجهز — فيه تأخير', 'Still preparing — delayed') : L('طلبك بيتحضّر دلوقتي', 'Your order is being prepared');
    case 'ready': return o.kid ? L(`طلبك جاهز والكابتن ${k} جاي يستلمه`, `Ready — ${k} is on the way to pick up`) : L('طلبك جاهز — بندوّر على كابتن', 'Ready — finding a captain');
    case 'picked_up': case 'in_transit': return o.cap && o.cap.phase === 'at_customer' ? L(`الكابتن ${k} وصل`, `${k} has arrived`) : o.cap && o.cap.stopped ? L('حصل ظرف في الطريق', 'Issue on the way') : L(`الكابتن ${k} في الطريق ليك`, `${k} is on the way`);
    case 'delivered': return L('طلبك اتسلّم — بالهنا والشفا', 'Delivered — enjoy!');
    case 'completed': return L('الطلب مكتمل', 'Order completed');
    case 'cancelled': return o.label === 'failed_delivery_tag' ? L('مقدرناش نوصّل الطلب', 'We could not deliver') : L('الطلب اتلغى', 'Order cancelled');
    case 'failed_delivery': return L('تعذّر التسليم', 'Delivery failed');
    default: return L((STATUS_META[o.st] || {}).ar || o.st, (STATUS_META[o.st] || {}).en || o.st);
  }
}
function payStateLabel(o) {
  const s = o.pay.state;
  return { cod_pending: L('هتدفع للكابتن عند الاستلام', 'Pay the captain on delivery'), collected: L(`اتدفع ${money(o.pay.collected)} للكابتن${o.pay.change ? ` — فكة ${money(o.pay.change)}` : ''}`, `Paid ${money(o.pay.collected)}`), none_collected: L('ما اتدفعش أي مبلغ', 'Nothing was paid'), authorized_sim: L('مبلغ محجوز (محاكاة)', 'Amount held (simulated)'), captured_sim: L('اتخصم (محاكاة)', 'Charged (simulated)'), voided_sim: L('الحجز اتلغى (محاكاة)', 'Hold released (simulated)'), failed_sim: L('الدفع فشل (محاكاة)', 'Payment failed (simulated)') }[s] || s;
}
function doorCard(o) {
  const mode = o.door.mode;
  const t = {
    refuse: [L('قلت للكابتن إنك مش عايز الطلب', 'You told the captain you do not want the order'), L('مش هتدفع أي حاجة، ومفيش دين هيتسجل عليك. الكابتن بيبلّغ العمليات دلوقتي، وممكن يكلموك من رقم تاني يتأكدوا.', 'You pay nothing and no debt is recorded. The captain is informing operations; they may call you to confirm.'), 'hand'],
    no_answer: [L('الكابتن بيتصل بيك ومش لاقيك', 'The captain is calling you'), L('لو إنت موجود، رد أو كلّمه من هنا.', 'If you are there, answer or call from here.'), 'phone-missed'],
    wrong_address: [L('الكابتن مش لاقي العنوان', 'The captain cannot find the address'), L('كلّمه ووصفله معلم قريب — المسافة الزيادة مش عليك.', 'Call and describe a landmark — extra distance is not on you.'), 'map-pin-off'],
    recipient_refuse: [L('المستلم مش عايز يستلم', 'The recipient did not accept'), L('إنت اللي طلبت، فالقرار ليك. العمليات هتكلمك.', 'You placed the order, so the decision is yours. Operations will call you.'), 'users'],
    not_home: [L('الكابتن عند الباب وإنت برّه', 'The captain is at the door and you are out'), L('الطلب كاش — ما ينفعش يتساب من غير دفع.', 'Cash order — it cannot be left unpaid.'), 'door-open'],
  }[mode] || [L('فيه مشكلة في التسليم', 'Delivery issue'), '', 'triangle-alert'];
  return `<section class="card door-card"><div class="strong-line">${ic(t[2], 20)}<span>${t[0]}</span></div>${t[1] ? `<p class="muted">${t[1]}</p>` : ''}
    ${mode !== 'refuse' ? `<div class="grid-2">${btn(L('اتصل بالكابتن', 'Call captain'), 'c-call', { kind: 'secondary', icon: 'phone', data: { to: 'captain', id: o.id } })}${btn(L('راسله', 'Message'), 'c-chat', { kind: 'secondary', icon: 'message-circle', data: { th: 'cc-' + o.id, with: 'captain' } })}</div>` : ''}
    ${AA('c-stuck-in-transit')}</section>`;
}
function handoverHtml(o) {
  return `<div class="stack-12"><h3 class="h-sm">${L('الكابتن وصل', 'Your captain is here')}</h3>
    <div class="code-box"><span>${L('كود الاستلام', 'Delivery code')}</span><b class="num code" dir="ltr">${o.code.split('').join(' ')}</b><small>${L('قوله للكابتن وهو قدامك بس — وصّلي عمرها ما هتطلبه في مكالمة.', 'Tell it face to face only — Wasaly never asks for it by phone.')}</small></div>
    ${AA('c-delivery-code')}
    ${o.pay.method === 'cash' ? `<div class="cash-due">${ic('banknote', 20)}<span>${L('جهّز', 'Have ready')}</span><b class="num">${money(dueCash(o))}</b></div>` : ''}
    <div class="stack-8">${btn(L('أنا نازل — استلمت', 'Coming down'), 'c-handover', { busy: S.busy['handover'], block: true, data: { id: o.id } })}
    <div class="grid-2">${btn(L('مش عايز الأوردر', 'I don’t want it'), 'c-door', { kind: 'secondary', data: { id: o.id, v: 'refuse' } })}${btn(L('مش في البيت', 'I’m not home'), 'c-door', { kind: 'secondary', data: { id: o.id, v: 'not_home' } })}</div></div></div>`;
}
function customerActionCard(o, a) {
  if (a.kind === 'c_handover') return `<section class="card handover-card">${handoverHtml(o)}</section>`;
  if (a.kind === 'c_sub') {
    const line = o.lines.find((l) => l.pid === a.pid);
    const alts = ['p107', 'p108', 'p105'].filter((x) => x !== a.pid && PR(x).m === o.mid && !stockOf(x).out);
    return `<section class="card action-card tone-warning"><h3 class="h-sm">${ic('package-x', 18)}${L(`${pName(a.pid)} خلص عند المتجر`, `${pName(a.pid)} ran out`)}</h3><p>${L('إنت اللي تختار — ومش هيتبعت بديل من غير موافقتك.', 'You decide — no substitute without your consent.')}</p>
      <div class="stack-8">${alts.map((x) => btn(L(`ابعت ${pName(x)} بداله (${money(unitPrice(x, {}) * line.qty)})`, `Send ${pName(x)} instead`), 'c-sub', { block: true, kind: 'secondary', data: { id: o.id, v: 'sub', pid: x } })).join('')}${btn(L(`شيله ومتحاسبنيش عليه (−${money(line.unit * line.qty)})`, 'Remove it'), 'c-sub', { block: true, data: { id: o.id, v: 'remove' } })}${btn(L('ألغي الطلب كله — رد كامل', 'Cancel everything — full refund'), 'c-sub', { block: true, kind: 'danger-ghost', data: { id: o.id, v: 'cancel' } })}</div>${AA('m-substitution')}</section>`;
  }
  if (a.kind === 'c_late') return `<section class="card action-card tone-warning"><h3 class="h-sm">${ic('hourglass', 18)}${L('طلبك متأخر عند المتجر', 'The store is running late')}</h3><p>${L('مش هنقولك ميعاد مش متأكدين منه. تقدر تستنى، أو تلغي دلوقتي من غير أي رسوم.', 'We won’t guess a time. Wait, or cancel free of charge.')}</p><div class="grid-2">${btn(L('هستنى', 'I’ll wait'), 'c-late', { data: { id: o.id, v: 'wait' } })}${btn(L('ألغي من غير رسوم', 'Cancel, no charge'), 'c-late', { kind: 'secondary', data: { id: o.id, v: 'cancel' } })}</div></section>`;
  if (a.kind === 'c_nothome') return `<section class="card action-card tone-warning"><h3 class="h-sm">${ic('door-open', 18)}${L('الكابتن عند الباب وإنت برّه', 'Captain is at the door and you’re out')}</h3><p>${L('الطلب كاش — ما ينفعش يتساب من غير دفع. والترك مع حد تاني لازم يكون تعليمة صريحة منك وتبقى مسؤوليتك.', 'Cash order — it can’t be left unpaid.')}</p><div class="stack-8">${btn(L('جاي في 5 دقايق', 'Coming in 5 min'), 'c-nothome', { block: true, data: { id: o.id, v: 'coming' } })}${btn(L('سيبه مع البواب', 'Leave it with the doorman'), 'c-nothome', { block: true, kind: 'secondary', data: { id: o.id, v: 'leave' } })}${btn(L('مش هقدر أستلم', 'I can’t receive it'), 'c-nothome', { block: true, kind: 'ghost', data: { id: o.id, v: 'no' } })}</div>${AA('c-leave-with-neighbor')}</section>`;
  return '';
}
function outcomeCard(o) {
  if (o.st === 'cancelled') {
    const tagged = o.label === 'failed_delivery_tag';
    return `<section class="card outcome tone-${tagged ? 'warning' : 'danger'}"><h3 class="h-sm">${ic(tagged ? 'package-x' : 'circle-x', 18)}${tagged ? L('مقدرناش نوصّل الطلب النهارده', 'We could not deliver today') : L('الطلب اتلغى', 'Order cancelled')}</h3><p>${esc(o.cancel && o.cancel.reason || '')}</p><p class="strong-line">${ic('shield-check', 16)}${L('مفيش أي مبلغ مستحق عليك، ومش هيتخصم منك حاجة في أي طلب جاي.', 'You owe nothing, and nothing will be deducted from future orders.')}</p>${tagged ? AA('c-neutral-wording') : ''}${btn(L('اطلب تاني', 'Order again'), 'c-reorder-o', { kind: 'secondary', block: true, data: { id: o.id } })}</section>`;
  }
  if (o.st === 'failed_delivery') return `<section class="card outcome sim-card"><div class="sim-flag">${truth('sim')} ${L('حالة مقترحة — مش موجودة في النظام', 'Proposed state — not in the system')}</div><h3 class="h-sm">${L('تعذّر التسليم', 'Delivery failed')}</h3><p class="strong-line">${ic('shield-check', 16)}${L('مفيش أي مبلغ مستحق عليك.', 'You owe nothing.')}</p></section>`;
  if (o.st === 'delivered' || o.st === 'completed') return `<section class="card outcome tone-success"><h3 class="h-sm">${ic('circle-check', 18)}${L('اتسلّم', 'Delivered')} · ${clockStr(o.stAt.delivered)}</h3>${o.pay.method === 'cash' ? `<p>${o.pay.change ? L(`اديت الكابتن ${money(o.pay.given)} وخدت الباقي ${money(o.pay.change)} — يعني دفعت ${money(o.pay.collected)}`, `You gave ${money(o.pay.given)} and got ${money(o.pay.change)} back — paid ${money(o.pay.collected)}`) : L(`دفعت ${money(o.pay.collected)}`, `Paid ${money(o.pay.collected)}`)}</p>` : ''}<div class="stack-8">${!o.rating ? btn(L('قيّم الطلب', 'Rate the order'), 'c-go', { block: true, data: { s: 'rate', id: o.id } }) : `<p class="ok">${ic('star', 14)}${L(`قيّمت ${o.rating.stars} من 5`, `Rated ${o.rating.stars}/5`)}</p>`}${btn(L('الفاتورة', 'Receipt'), 'c-go', { block: true, kind: 'secondary', data: { s: 'receipt', id: o.id } })}${btn(L('فيه مشكلة في الطلب؟', 'Problem with the order?'), 'c-go', { block: true, kind: 'ghost', data: { s: 'help', id: o.id } })}</div>${o.st === 'delivered' ? `<p class="muted small">${L(`الطلب هيكتمل تلقائيًا بعد ${ECON.disputeHours} ساعة — وتقدر تشتكي بعدها برضه.`, `Auto-completes after ${ECON.disputeHours}h — you can still complain after.`)}</p>${AA('c-dispute-window')}` : ''}</section>`;
  return '';
}
function custNotifs(o) {
  const list = S.notifs.customer.filter((n) => n.orderId === o.id).slice(0, 4);
  if (!list.length) return '';
  return `<section class="card">${sectionHead(L('الإشعارات', 'Notifications'), { icon: 'bell' })}${list.map((n) => `<div class="notif"><span class="notif-ic">${ic(n.icon || 'bell', 16)}</span><div><b>${n.title}</b>${n.body ? `<p>${n.body}</p>` : ''}<small>${clockStr(n.t)}</small></div></div>`).join('')}${AA('c-notif-language')}</section>`;
}
function journeyStepOf(o) {
  if (!o) return 1;
  if (o.cnd || ['cancelled', 'failed_delivery'].includes(o.st) && o.label) return 15;
  return { placed: 9, accepted: 10, preparing: 11, ready: 12, picked_up: 13, in_transit: o.cap && o.cap.phase === 'at_customer' ? 15 : 14, delivered: 17, completed: 18, cancelled: 10 }[o.st] || 9;
}

/* ---------------------------------------------------------------- receipt / rating / tip */
SCR.receipt = (p) => {
  const o = ord(p.id);
  return { key: 'receipt-' + o.id, header: appbar(L('الفاتورة', 'Receipt'), { back: true }), body: `<div class="pad"><article class="receipt"><div class="receipt-head"><span class="wordmark wordmark-sm">${L('وصّلي', 'Wasaly')}</span><small>${L('إيصال محاكاة — مش مستند حقيقي', 'Simulated receipt — not a real document')}</small></div>
    <div class="receipt-meta"><span>${L('رقم الطلب', 'Order')}</span><b dir="ltr" class="num">${o.id}</b><span>${L('المتجر', 'Store')}</span><b>${esc(mName(o.mid))}</b><span>${L('التسليم', 'Delivered')}</span><b>${o.stAt.delivered ? clockStr(o.stAt.delivered) : '—'}</b><span>${L('الكابتن', 'Captain')}</span><b>${esc(kName(o.kid))}</b></div>
    <ul class="sum-lines">${o.lines.filter((l) => l.state === 'ok').map((l) => `<li><span class="num">${l.qty}×</span><span>${esc(pName(l.pid))}</span><b class="num">${money(l.unit * l.qty)}</b></li>`).join('')}</ul>
    ${priceBreakdown({ sub: o.sub, del: o.del, svc: o.svc, disc: o.disc, total: o.total })}
    ${o.pay.method === 'cash' && o.pay.collected != null ? `${moneyRow(L('مدفوع كاش', 'Paid cash'), o.pay.given || o.pay.collected)}${o.pay.change ? moneyRow(L('فكة', 'Change'), o.pay.change) : ''}` : ''}
    ${o.tip ? moneyRow(L('بقشيش للكابتن (كله ليه)', 'Tip (all to captain)'), o.tip) : ''}
    <div class="receipt-edge" aria-hidden="true"></div></article>
    <div class="stack-8 mt-16">${btn(L('اطلب نفس الطلب تاني', 'Order the same again'), 'c-reorder-o', { block: true, data: { id: o.id } })}${AA('c-receipt-legal')}</div></div>` };
};
SCR.rate = (p) => {
  const o = ord(p.id); const d = S.cust.rateDraft || (S.cust.rateDraft = { stars: 0, tags: [], tip: 0, text: '' });
  const tags = [L('الأكل سخن', 'Hot food'), L('الكابتن محترم', 'Polite captain'), L('وصل بسرعة', 'Fast'), L('التغليف كويس', 'Good packaging'), L('كان فيه تأخير', 'Delayed')];
  return { key: 'rate-' + o.id, header: appbar(L('قيّم طلبك', 'Rate your order'), { back: true }), body: `<div class="pad stack-16">
    <div class="rate-stars" role="radiogroup" aria-label="${attr(L('التقييم', 'Rating'))}">${[1, 2, 3, 4, 5].map((i) => `<button type="button" role="radio" aria-checked="${d.stars === i}" class="star ${d.stars >= i ? 'on' : ''}" data-act="c-star" data-v="${i}" aria-label="${attr(`${i} ${L('من 5', 'of 5')}`)}">${ic('star', 34)}</button>`).join('')}</div>
    <div class="chips-row">${tags.map((t) => `<button type="button" class="chip-btn ${d.tags.includes(t) ? 'on' : ''}" data-act="c-rtag" data-v="${attr(t)}" aria-pressed="${d.tags.includes(t)}">${t}</button>`).join('')}</div>
    ${field({ label: L('تعليق (اختياري)', 'Comment (optional)'), bind: 'c-rtext', value: d.text, textarea: true, rows: 3, max: 200 })}
    ${AA('c-rating')}
    <section class="card stack-12"><div><b>${L('بقشيش للكابتن', 'Tip the captain')}</b><p class="muted">${L('البقشيش كله للكابتن — وصّلي ما بتاخدش منه حاجة.', 'All of it goes to the captain.')}</p></div>
      <div class="chips-row">${[0, 5, 10, 20].map((v) => `<button type="button" class="chip-btn ${d.tip === v ? 'on' : ''}" data-act="c-tip" data-v="${v}" aria-pressed="${d.tip === v}">${v ? money(v) : L('من غير', 'None')}</button>`).join('')}</div>${AA('c-tip')}</section>
  </div>`, footer: `<div class="foot-cta">${btn(L('ابعت التقييم', 'Submit rating'), 'c-rate-submit', { busy: S.busy['rate'], block: true, disabled: !d.stars, data: { id: o.id } })}</div>` };
};

/* ---------------------------------------------------------------- orders tab */
SCR.orders = () => {
  const mine = Object.values(S.orders).sort((a, b) => b.placedAt - a.placedAt);
  const active = mine.filter((o) => isActive(o)); const done = mine.filter((o) => !isActive(o));
  return { key: 'orders', tab: 'orders', header: appbar(L('طلباتي', 'My orders')), body: `<div class="pad stack-16">
    ${active.length ? `<section>${sectionHead(L('شغالة دلوقتي', 'Active'))}${active.map((o) => liveOrderCard(o)).join('')}</section>` : ''}
    <section>${sectionHead(L('طلبات قبل كده', 'Past orders'))}${listBox(done.map((o) => row({ media: merchantLogo(M(o.mid), 40), title: `${esc(mName(o.mid))} · <bdi dir="ltr">${o.id}</bdi>`, sub: `${stPill(o.st)} · ${clockStr(o.placedAt)}`, end: `<b class="num">${money(o.total)}</b>`, act: 'c-track', data: { id: o.id } })).concat(S.history.map((id) => { const h = PAST[id]; return row({ media: merchantLogo(M(h.mid), 40), title: `${esc(mName(h.mid))} · <bdi dir="ltr">${id}</bdi>`, sub: `${stPill('completed')} · ${L(h.when, h.whenEn)}`, end: `<b class="num">${money(h.total)}</b>`, act: 'c-reorder', data: { id } }); })))}</section>
    ${!mine.length ? note(L('ابدأ سيناريو من لوحة المحاكاة، أو اطلب من الرئيسية.', 'Start a scenario from the simulator panel, or order from Home.'), { icon: 'flask-conical' }) : ''}
  </div>` };
};

/* ---------------------------------------------------------------- help / complaint / refund */
SCR.help = (p) => {
  const o = p.id ? ord(p.id) : activeOrder() || Object.values(S.orders)[0];
  const delivered = o && ['delivered', 'completed'].includes(o.st);
  const issues = delivered ? [['missing', 'package-x', L('صنف ناقص', 'Missing item')], ['wrong', 'shuffle', L('صنف غلط', 'Wrong item')], ['damaged', 'package-x', L('صنف تالف أو مدلوق', 'Damaged / spilled')], ['food_safety', 'heart-pulse', L('تعبت بعد الأكل (عاجل)', 'I got sick (urgent)')], ['cash_diff', 'coins', L('مشكلة في الفلوس أو الفكة', 'Money or change problem')], ['captain', 'user-x', L('سلوك الكابتن', 'Captain behaviour')], ['other', 'message-circle', L('حاجة تانية', 'Something else')]]
    : [['late', 'hourglass', L('الطلب متأخر', 'Order is late')], ['cancel', 'circle-x', L('عايز ألغي', 'I want to cancel')], ['address', 'map-pin', L('عايز أغيّر العنوان', 'Change address')], ['payment', 'credit-card', L('مشكلة في الدفع', 'Payment problem')], ['other', 'message-circle', L('حاجة تانية', 'Something else')]];
  const tks = o ? o.tickets.map((id) => S.tickets[id]).filter(Boolean) : [];
  return { key: 'help-' + (o ? o.id : 'x'), header: appbar(L('المساعدة', 'Help'), { back: true }), body: `<div class="pad stack-16">
    ${o ? `<div class="card">${row({ media: merchantLogo(M(o.mid), 36), title: `<bdi dir="ltr">${o.id}</bdi> · ${esc(mName(o.mid))}`, sub: stPill(o.st) })}</div>` : ''}
    ${tks.length ? `<section>${sectionHead(L('شكاويك', 'Your tickets'))}${listBox(tks.map((t) => row({ icon: 'ticket', title: `${t.id} · ${ticketKindLabel(t.kind)}`, sub: ticketStatusLabel(t.status), act: 'c-go', data: { s: 'ticket', id: t.id } })))}</section>` : ''}
    <section>${sectionHead(L('إيه المشكلة؟', 'What’s wrong?'))}${listBox(issues.map(([k, icn, lbl]) => row({ icon: icn, title: lbl, act: 'c-issue', data: { k, id: o ? o.id : '' }, iconTone: k === 'food_safety' ? 'danger' : '' })))}</section>
    ${btn(L('كلّم خدمة العملاء', 'Chat with support'), 'c-chat', { kind: 'secondary', block: true, icon: 'messages-square', data: { th: 'cs-' + (o ? o.id : 'x'), with: 'support' } })}
    ${AA('c-support-hours', 'c-no-photo')}
  </div>` };
};
const ticketStatusLabel = (s) => ({ open: L('مفتوحة', 'Open'), investigating: L('بنراجعها', 'Investigating'), awaiting: L('مستنيين رد', 'Awaiting info'), resolved: L('اتحلّت', 'Resolved'), closed: L('مقفولة', 'Closed'), reopened: L('اتفتحت تاني', 'Reopened'), appeal: L('تظلّم', 'Appeal') }[s] || s);
SCR.complaint = (p) => {
  const o = ord(p.id);
  if (!o) return { key: 'complaint-missing', header: appbar(L('شكوى', 'Complaint'), { back: true }), body: empty('', L('الطلب ده مش موجود', 'Order not found'), '') };
  let d = S.cust.cmpDraft;
  if (!d || (p.k && d.kind !== p.k)) d = S.cust.cmpDraft = { kind: p.k || 'missing', item: o.lines[0].pid, text: '', photo: false };
  const k = d.kind;
  return { key: 'complaint-' + o.id, header: appbar(ticketKindLabel(k), { back: true }), body: `<div class="pad stack-16">
    ${k === 'food_safety' ? banner('danger', 'heart-pulse', L('قبل أي حاجة: حضرتك كويس؟ لو فيه حد محتاج دكتور، روحوا فورًا — ده أهم من أي شكوى.', 'First: are you OK? If someone needs a doctor, go now.')) : ''}
    <div class="field"><span class="label">${L('الصنف', 'Item')}</span><div class="stack-8">${o.lines.map((l) => radioCard('citem', l.pid, d.item, esc(pName(l.pid)), money(l.unit * l.qty), { act: 'c-cmp-item' })).join('')}</div></div>
    ${field({ label: L('احكيلنا اللي حصل', 'Tell us what happened'), bind: 'c-cmp-text', value: d.text, textarea: true, rows: 3, max: 300 })}
    <div class="card stack-8"><div class="toggle-row"><div><b>${L('إرفاق صورة (اختياري)', 'Attach a photo (optional)')}</b><small>${L('مش مطلوبة للمبالغ الصغيرة.', 'Not required for small amounts.')}</small></div>${toggle(d.photo, 'c-cmp-photo', L('صورة', 'Photo'))}</div>${d.photo ? note(L('محاكاة: مفيش رفع صور حقيقي.', 'Simulation: no real upload.'), { icon: 'flask-conical' }) : ''}</div>
    ${AA('c-no-photo', k === 'food_safety' ? 'c-food-safety' : 'c-refund-stages')}
    ${note(L('هنرجّعلك حقك الأول، وبعدين ندوّر مين المسؤول — مش هتستنى التحقيق.', 'We fix it for you first, then investigate.'))}
  </div>`, footer: `<div class="foot-cta">${btn(L('ابعت الشكوى', 'Send complaint'), 'c-cmp-send', { block: true, data: { id: o.id }, busy: S.busy.cmp })}</div>` };
};
SCR.ticket = (p) => {
  const t = S.tickets[p.id]; const o = t && ord(t.orderId);
  const rf = o && o.refund;
  const stages = [['requested', L('مطلوب', 'Requested')], ['approved', L('اعتُمد', 'Approved')], ['executed', L('اتنفّذ', 'Executed')], ['confirmed', L('وصلك', 'Received')]];
  const idx = rf ? stages.findIndex((s) => s[0] === rf.stage) : -1;
  return { key: 'ticket-' + t.id, header: appbar(`${t.id}`, { back: true, eyebrow: ticketKindLabel(t.kind) }), body: `<div class="pad stack-16">
    <div class="card">${row({ icon: 'ticket', title: `${L('رقم الشكوى', 'Reference')} <bdi dir="ltr">${t.id}</bdi>`, sub: `${ticketStatusLabel(t.status)} · ${L('الأولوية', 'Priority')}: ${L(PRIO[t.prio][0], PRIO[t.prio][1])}` })}</div>
    ${rf ? `<section class="card">${sectionHead(L('الاسترداد', 'Refund'), { icon: 'hand-coins' })}<p class="num-line"><b class="num">${money(rf.amount)}</b> ${rf.route ? routeLabel(rf.route) : ''}</p>${thread(stages.map((s, i) => ({ label: s[1], sub: rf.at[s[0]] != null ? clockStr(rf.at[s[0]]) : '', state: i < idx ? 'done' : i === idx ? (i === 3 ? 'done' : 'now') : 'todo' })))}
      ${rf.stage === 'approved' ? note(L('«اعتُمد» مش معناها «وصل». هنبلّغك أول ما يوصل فعلًا.', '“Approved” is not “received”.')) : ''}${rf.route === 'voucher' ? banner('warning', 'triangle-alert', L('الاسترداد اتعمل «قسيمة رصيد» — ده سلوك الكود الحالي في طلبات الكاش، والسياسة بتقول يرجع نقدًا. من حقك تطلب كاش.', 'Issued as a voucher — current code behaviour; policy says cash.')) : ''}${AA('c-refund-voucher', 'c-refund-stages')}</section>` : ''}
    <section class="card">${sectionHead(L('المحادثة', 'Conversation'), { icon: 'messages-square' })}${t.log.filter((x) => x.kind !== 'note').map((x) => `<div class="bubble ${x.who === 'customer' ? 'me' : ''}"><p>${esc(x.text)}</p><small>${clockStr(x.t)}</small></div>`).join('')}</section>
    ${t.status === 'resolved' ? `<div class="grid-2">${btn(L('اتحلّت، شكرًا', 'Resolved, thanks'), 'c-t-close', { data: { id: t.id } })}${btn(L('افتحها تاني', 'Reopen'), 'c-t-reopen', { kind: 'secondary', data: { id: t.id } })}</div>` : ''}
    ${t.status === 'closed' ? btn(L('تظلّم على القرار', 'Appeal the decision'), 'c-t-appeal', { kind: 'secondary', block: true, data: { id: t.id } }) : ''}
    ${AA('s-independent-review')}
  </div>` };
};

/* ---------------------------------------------------------------- assistant tab (proposal — not built) */
const FAQ = [
  { q: 'لو ما ردّيتش على الكابتن يحصل إيه؟', a: 'الكابتن بيتصل ويستنى، وبعدين العمليات بتتصل بيك من رقم تاني. لو ما وصلناش ليك، الطلب «تعذّر تسليمه» — ومفيش أي مبلغ هيتعمل عليك، ولا هيتخصم منك حاجة بعدين.', p: ['CUSTOMER_003'] },
  { q: 'أقدر ألغي الطلب؟', a: 'قبل ما المتجر يقبل: أيوه ومن غير أي أثر. بعد القبول وقبل التحضير: أيوه والإلغاء بيتسجل. أثناء التحضير: القاعدة لسه مش محسومة — كلّم الدعم. بعد ما الكابتن يستلم: ده مش إلغاء.', p: ['CUSTOMER_002'] },
  { q: 'لو في صنف ناقص؟', a: 'قولنا من «المساعدة». هنرجّعلك قيمته الأول من غير ما نطلب صورة لو المبلغ صغير، وبعدين ندوّر مين المسؤول.', p: ['CUSTOMER_004'] },
  { q: 'الفلوس بترجع إزاي؟', a: 'القاعدة: بنفس طريقة الدفع — والكاش يرجع كاش. بس النظام الحالي بيحوّل استرداد الكاش لقسيمة رصيد، ودي نقطة لسه محتاجة قرار.', p: ['CUSTOMER_004', 'FIN_002'] },
  { q: 'مين بيشوف رقمي؟', a: 'الكابتن محتاج يوصلك وقت التسليم. هل الرقم بيتخفّى بوسيط؟ ده مش متحقق منه لسه.', p: ['DATA_002'] },
];
SCR.assistant = () => ({ key: 'assistant', tab: 'assistant', header: appbar(L('المساعد', 'Assistant'), { eyebrow: L('أسئلة شائعة', 'FAQ') }), body: `<div class="pad stack-16">
  <div class="sim-flag">${truth('proposal')} ${truth('notbuilt')}</div>${AA('c-assistant')}
  <p class="lead">${L('إجابات قصيرة مبنية على مسودة السياسات — مش وعود.', 'Short answers based on the draft policies — not promises.')}</p>
  ${FAQ.map((f, i) => `<details class="faq" ${S.cust.faqOpen === i ? 'open' : ''}><summary data-act="c-faq" data-i="${i}">${ic('circle-help', 18)}<span>${f.q}</span>${ic('chevron-down', 16)}</summary><div class="faq-a"><p>${f.a}</p><div class="chips-row">${f.p.map((x) => P(x)).join('')}</div></div></details>`).join('')}
  ${btn(L('كلّم خدمة العملاء', 'Chat with support'), 'c-chat', { block: true, kind: 'secondary', icon: 'messages-square', data: { th: 'cs-general', with: 'support' } })}
</div>` });

/* ---------------------------------------------------------------- account & settings */
SCR.account = () => ({ key: 'account', tab: 'account', header: appbar(L('حسابي', 'Account')), body: `<div class="pad stack-16">
  <div class="profile"><span class="avatar avatar-lg" style="--av:var(--primary)">${esc(L(PEOPLE.customer.name, PEOPLE.customer.nameEn).slice(0, 1))}</span><div><h2>${esc(L(PEOPLE.customer.name, PEOPLE.customer.nameEn))}</h2><p dir="ltr" class="num">${PEOPLE.customer.phone}</p><p class="muted small">${ic('flask-conical', 12)}${L('حساب تجريبي', 'Demo account')}</p></div></div>
  ${listBox([row({ icon: 'map-pin', title: L('عناويني', 'My addresses'), act: 'c-go', data: { s: 'addresses' } }), row({ icon: 'wallet', title: L('طرق الدفع', 'Payment methods'), act: 'c-go', data: { s: 'paymethods' } }), row({ icon: 'heart', title: L('المفضلة', 'Favourites'), act: 'c-go', data: { s: 'favorites' } }), row({ icon: 'badge-percent', title: L('العروض', 'Offers'), act: 'c-go', data: { s: 'offers' } }), row({ icon: 'bell', title: L('الإشعارات', 'Notifications'), end: S.unread.customer ? `<span class="count">${S.unread.customer}</span>` : '', act: 'c-go', data: { s: 'notifs' } })])}
  ${listBox([row({ icon: 'languages', title: L('اللغة', 'Language'), end: S.set.lang === 'ar' ? 'العربية' : 'English', act: 'c-go', data: { s: 'settings' } }), row({ icon: 'moon', title: L('المظهر', 'Appearance'), end: { system: L('زي الجهاز', 'System'), light: L('فاتح', 'Light'), dark: L('غامق', 'Dark') }[S.set.theme], act: 'c-go', data: { s: 'settings' } }), row({ icon: 'shield', title: L('الخصوصية وبياناتي', 'Privacy & my data'), act: 'c-go', data: { s: 'privacy' } }), row({ icon: 'headset', title: L('المساعدة', 'Help'), act: 'c-go', data: { s: 'help' } })])}
  ${listBox([row({ icon: 'log-out', title: L('تسجيل الخروج', 'Sign out'), act: 'c-logout', iconTone: 'danger', noChevron: true })])}
  <p class="muted small center">${L('وصّلي — محاكي التجربة · بيانات تجريبية', 'Wasaly — experience simulator · demo data')}</p>
</div>` });
SCR.addresses = () => ({ key: 'addresses', header: appbar(L('عناويني', 'My addresses'), { back: true }), body: `<div class="pad stack-12">${S.cust.addresses.map((a) => `<div class="card addr-row">${ic(a.icon || 'map-pin', 20)}<div class="grow"><b>${esc(L(a.label, a.labelEn))}${a.id === S.cust.addrId ? ` <span class="dotchip tone-brand">${L('الأساسي', 'Default')}</span>` : ''}</b><p>${esc(a.line)}</p><small>${ic('landmark', 12)} ${esc(a.landmark || '—')}</small></div>${iconBtn('trash-2', L('امسح العنوان', 'Delete address'), 'c-addr-del', { data: { id: a.id } })}</div>`).join('')}${btn(L('أضف عنوان', 'Add address'), 'c-addr-new', { kind: 'secondary', block: true, icon: 'plus' })}${AA('c-landmark-field')}</div>` });
SCR.paymethods = () => ({ key: 'paymethods', header: appbar(L('طرق الدفع', 'Payment methods'), { back: true }), body: `<div class="pad stack-12">${row({ icon: 'banknote', title: L('كاش عند الاستلام', 'Cash on delivery'), sub: L('الطريقة الأساسية', 'Default'), end: truth('current') })}${row({ icon: 'credit-card', title: L('إضافة بطاقة', 'Add a card'), sub: L('غير مبنية — ما تكتبش بيانات بطاقة حقيقية', 'Not built — never enter real card data'), end: truth('notbuilt'), act: 'c-explain', data: { k: 'pay-wallet' } })}${row({ icon: 'wallet', title: L('رصيد وصّلي', 'Wasaly balance'), sub: L('محجوب — FDR-0010', 'Blocked — FDR-0010'), end: truth('decision'), act: 'c-explain', data: { k: 'pay-balance' } })}${AA('c-wallet-blocked', 'f-voucher-liability')}</div>` });
SCR.favorites = () => ({ key: 'favorites', header: appbar(L('المفضلة', 'Favourites'), { back: true }), body: `<div class="pad stack-12">${S.cust.favorites.length ? S.cust.favorites.map((id) => merchantCard(id, { wide: true })).join('') : empty(`<div class="big-ic">${ic('heart', 40)}</div>`, L('مفيش مفضلة لسه', 'No favourites yet'), L('دوس على القلب في أي متجر.', 'Tap the heart on any shop.'))}</div>` });
SCR.offers = () => ({ key: 'offers', header: appbar(L('العروض', 'Offers'), { back: true }), body: `<div class="pad stack-12"><div class="promo" style="--pat:url('${IL.patternURI('#FFFFFF', 0.1)}')"><div class="promo-t"><span class="eyebrow">${L('عرض تجريبي', 'Demo offer')}</span><h3>${L('خصم 10%', '10% off')}</h3><p><b dir="ltr">WASALY10</b> — ${L('لحد 30 ج.م', 'up to EGP 30')}</p></div><div class="promo-illo">${IL.food('pizza')}</div></div>${AA('c-promo')}${note(L('مين بيموّل الخصم — وصّلي ولا التاجر؟ لازم يتحدد قبل أي عرض حقيقي.', 'Who funds the discount must be decided first.'))}</div>` });
SCR.notifs = () => { const list = S.notifs.customer; return { key: 'notifs', header: appbar(L('الإشعارات', 'Notifications'), { back: true, actions: list.length ? btn(L('اقرأ الكل', 'Mark all read'), 'c-notifs-read', { kind: 'link' }) : '' }), body: `<div class="pad stack-8">${list.length ? list.map((n) => `<button type="button" class="notif notif-row ${n.read ? '' : 'unread'}" data-act="${n.orderId ? 'c-track' : 'noop'}" data-id="${n.orderId || ''}"><span class="notif-ic">${ic(n.icon || 'bell', 16)}</span><div><b>${n.title}</b>${n.body ? `<p>${n.body}</p>` : ''}<small>${clockStr(n.t)}</small></div></button>`).join('') : empty(`<div class="big-ic">${ic('bell', 40)}</div>`, L('مفيش إشعارات', 'No notifications'), '')}${AA('c-notif-language')}<section class="card stack-12">${sectionHead(L('تفضيلات', 'Preferences'))}<div class="toggle-row"><div><b>${L('تحديثات الطلب', 'Order updates')}</b></div>${toggle(S.cust.notifPrefs.orders, 'c-pref', L('تحديثات الطلب', 'Order updates'), { data: { k: 'orders' } })}</div><div class="toggle-row"><div><b>${L('العروض', 'Offers')}</b></div>${toggle(S.cust.notifPrefs.offers, 'c-pref', L('العروض', 'Offers'), { data: { k: 'offers' } })}</div></section></div>` }; };
SCR.settings = () => ({ key: 'settings', header: appbar(L('الإعدادات', 'Settings'), { back: true }), body: `<div class="pad stack-16"><section class="card stack-12"><span class="label">${L('اللغة', 'Language')}</span>${seg('lang', S.set.lang, [{ v: 'ar', label: 'العربية' }, { v: 'en', label: 'English' }])}${S.set.lang === 'en' ? note('Policy content stays in Arabic (source manual language).', { icon: 'info' }) : ''}</section><section class="card stack-12"><span class="label">${L('المظهر', 'Appearance')}</span>${seg('theme', S.set.theme, [{ v: 'system', label: L('زي الجهاز', 'System'), icon: 'monitor' }, { v: 'light', label: L('فاتح', 'Light'), icon: 'sun' }, { v: 'dark', label: L('غامق', 'Dark'), icon: 'moon' }])}</section>${AA('c-lang')}</div>` });
SCR.privacy = () => ({ key: 'privacy', header: appbar(L('الخصوصية وبياناتي', 'Privacy & data'), { back: true }), body: `<div class="pad stack-16">
  <section class="card stack-12"><div class="toggle-row"><div><b>${L('مشاركة الموقع أثناء الطلب', 'Share location during orders')}</b><small>${L('بنستخدمه للتوصيل بس', 'Used for delivery only')}</small></div>${toggle(S.cust.privacy.shareLoc, 'c-privacy', L('مشاركة الموقع', 'Share location'), { data: { k: 'shareLoc' } })}</div></section>
  ${listBox([row({ icon: 'download', title: L('اطلب نسخة من بياناتي', 'Request a copy of my data'), act: 'c-data-req', data: { v: 'export' } }), row({ icon: 'trash-2', title: L('اطلب مسح حسابي', 'Request account deletion'), act: 'c-data-req', data: { v: 'delete' }, iconTone: 'danger' })])}
  ${S.cust.dataReq ? banner('info', 'mail-check', L('وصلنا طلبك. فيه حاجات نقدر نمسحها وحاجات ممكن القانون يلزمنا نحتفظ بيها فترة — ولسه بنتأكد من التفاصيل. هنرد عليك برد واضح.', 'Request received. Some data can be deleted, some may need to be kept — we’re confirming.')) : ''}
  ${AA('c-data-delete')}<div class="chips-row">${P('DATA_002')}${P('LEGAL_005')}${P('DATA_005')}</div></div>` });

/* ---------------------------------------------------------------- chat sheet (customer ↔ captain / support) */
function chatSheet(sh) {
  const th = S.chats[sh.th]; const who = sh.with;
  const title = who === 'captain' ? L('رسالة للكابتن', 'Message the captain') : who === 'support' ? L('خدمة العملاء', 'Support') : who === 'ops' ? L('العمليات', 'Operations') : L('محادثة', 'Chat');
  const me = sh.me || 'customer';
  const quick = who === 'captain' ? [L('أنا نازل حالًا', 'Coming down now'), L('الباب الأزرق جنب الفرن', 'Blue door next to the bakery'), L('رن الجرس مرتين', 'Ring twice')] : who === 'support' ? [L('الطلب متأخر', 'My order is late'), L('فيه صنف ناقص', 'An item is missing')] : [L('تمام', 'OK')];
  return sheetWrap(`<div class="chat">${(th ? th.msgs : []).map((m) => `<div class="bubble ${m.from === me ? 'me' : ''}"><p>${esc(m.text)}</p><small>${clockStr(m.t)}</small></div>`).join('') || `<p class="muted center">${L('ابدأ المحادثة', 'Start the conversation')}</p>`}</div>${who === 'captain' ? note(L('المحادثة من خلال التطبيق — أرقام الطرفين المفروض ما تظهرش (غير متحقق إنه مبني).', 'In-app chat — numbers should stay hidden (not verified as built).'), { icon: 'shield' }) : ''}`, { key: 'chat-' + sh.th, title, tall: true,
    footer: `<div class="stack-8"><div class="chips-row">${quick.map((q) => `<button type="button" class="chip-btn" data-act="chat-quick" data-th="${sh.th}" data-me="${me}" data-v="${attr(q)}">${q}</button>`).join('')}</div><div class="chat-in"><label class="sr-only" for="chatin">${L('رسالة', 'Message')}</label><input id="chatin" class="input" data-bind="chat-draft" value="${attr(S.chatDraft || '')}" placeholder="${attr(L('اكتب رسالة…', 'Write a message…'))}" autocomplete="off">${iconBtn('send', L('ابعت', 'Send'), 'chat-send', { data: { th: sh.th, me } })}</div></div>` });
}
function callSheet(sh) {
  const st = sh.state || 'ringing';
  return sheetWrap(`<div class="call"><span class="avatar avatar-lg" style="--av:var(--primary)">${ic(sh.to === 'captain' ? 'bike' : sh.to === 'customer' ? 'user-round' : 'headset', 28)}</span><h3>${sh.name || ''}</h3><p class="call-st">${st === 'ringing' ? L('جاري الاتصال…', 'Calling…') : st === 'noanswer' ? L('مفيش رد', 'No answer') : L('المكالمة شغالة (محاكاة)', 'Connected (simulated)')}</p>${note(L('مكالمة محاكاة — مفيش اتصال حقيقي. رقمك المفروض يوصل من خلال رقم وسيط (غير متحقق).', 'Simulated call — no real call.'), { icon: 'flask-conical' })}</div>`, { key: 'call', title: L('مكالمة', 'Call'), footer: btn(L('إنهاء', 'End'), 'sheet-close', { kind: 'danger', block: true, icon: 'phone-off' }) });
}
function cancelSheet(sh) {
  const o = ord(sh.id); const r = cancelRuling(o);
  if (r.allowed) return sheetWrap(`<div class="stack-12"><p>${L(r.ar, r.en)}</p>${truth('current')} ${AA('c-cancel-matrix')}<div class="field"><span class="label">${L('السبب (اختياري)', 'Reason (optional)')}</span><div class="chips-row">${[L('غيّرت رأيي', 'Changed my mind'), L('طلبت غلط', 'Ordered by mistake'), L('هيتأخر', 'Too slow')].map((x) => `<button type="button" class="chip-btn ${S.cust.cancelWhy === x ? 'on' : ''}" data-act="c-cancel-why" data-v="${attr(x)}">${x}</button>`).join('')}</div></div></div>`, { key: 'cancel', title: L('إلغاء الطلب؟', 'Cancel the order?'), footer: `<div class="grid-2">${btn(L('أيوه، الغي', 'Yes, cancel'), 'c-cancel-do', { busy: S.busy['cancel'], kind: 'danger', data: { id: o.id } })}${btn(L('لأ، كمّل', 'Keep it'), 'sheet-close', { kind: 'secondary' })}</div>` });
  return sheetWrap(`<div class="stack-12"><p>${L(r.ar, r.en)}</p><div class="truth-row">${truth('decision')}${truth('legal')}</div>
    <div class="card stack-8"><b>${L('الخيارات اللي في الدليل (ولا واحد متعتمد):', 'Options in the manual (none approved):')}</b><ol class="opts-list"><li>${L('إلغاء كامل بلا خصم — المنصّة أو التاجر يتحمل', 'Full cancel, no charge')}</li><li>${L('احتجاز جزء معلن مسبقًا — محتاج إعلان قبل التأكيد ومراجعة قانونية', 'Retain a pre-announced part')}</li><li>${L('منع الإلغاء بعد بدء التحضير — الأشد وممكن يصطدم بحق قانوني', 'Block cancellation after prep starts')}</li></ol></div>${AA('c-cancel-matrix')}</div>`, { key: 'cancel', title: L('الإلغاء أثناء التحضير', 'Cancelling during preparation'), footer: `<div class="stack-8">${btn(L('كلّم الدعم', 'Talk to support'), 'c-chat', { block: true, data: { th: 'cs-' + o.id, with: 'support' } })}${S.set.review ? btn(L('محاكاة: خيار 1 — إلغاء كامل بلا خصم', 'Simulate option 1'), 'c-cancel-sim', { block: true, kind: 'ghost', icon: 'flask-conical', data: { id: o.id } }) : ''}</div>` });
}
function refuseSheet(sh) {
  return sheetWrap(`<div class="stack-12"><p>${L('مش هتدفع أي حاجة ومش هيتعمل عليك دين. هنسجّل اللي حصل بوصف محايد، ومن حقك تقولنا السبب لو حابب.', 'You pay nothing and no debt is created. We record it neutrally.')}</p>${field({ label: L('السبب (اختياري)', 'Reason (optional)'), bind: 'c-refuse-words', value: S.cust.refuseWords || '', textarea: true, rows: 2, max: 120 })}${AA('c-refuse-rights')}</div>`, { key: 'refuse', title: L('مش عايز الطلب؟', 'Don’t want the order?'), footer: `<div class="grid-2">${btn(L('أيوه، رافض الاستلام', 'Yes, refuse'), 'c-refuse-do', { kind: 'danger', data: { id: sh.id } })}${btn(L('لأ، هستلم', 'No, I’ll take it'), 'sheet-close', { kind: 'secondary' })}</div>` });
}
function customerSheetB(sh) {
  if (sh.kind === 'chat') return chatSheet(sh);
  if (sh.kind === 'call') return callSheet(sh);
  if (sh.kind === 'cancel') return cancelSheet(sh);
  if (sh.kind === 'refuse') return refuseSheet(sh);
  return '';
}
