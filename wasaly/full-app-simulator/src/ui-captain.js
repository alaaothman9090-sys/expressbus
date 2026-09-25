/* ==========================================================================
   ui-captain.js — captain app on the shared order state
   ========================================================================== */
const KID = () => S.nav.captain.kid;
const myCap = () => S.captains[KID()];
const myTrip = () => Object.values(S.orders).find((o) => o.kid === KID() && o.cap && o.cap.phase !== 'done');
const myOffer = () => Object.values(S.orders).find((o) => o.offer && o.offer.kid === KID() && o.pending.some((a) => a.kind === 'k_offer'));

SCR.k_login = () => ({ key: 'k-login', tabbar: false, full: true, body: `<div class="onb auth">
  <span class="wordmark wordmark-sm">${L('وصّلي', 'Wasaly')} <small class="wm-tag">${L('للكباتن', 'for captains')}</small></span>
  <h1 class="onb-title">${L('دخول الكابتن', 'Captain sign-in')}</h1>
  <div class="stack-12">${Object.values(CAPTAINS).map((k) => radioCard('kid', k.id, KID(), `${esc(L(k.name, k.nameEn))}`, `${esc(k.vehicle)} · <bdi>${esc(k.plate)}</bdi>`, { act: 'k-pick', icon: 'bike' })).join('')}
  ${btn(L('ادخل', 'Sign in'), 'k-login', { block: true })}${note(L('محاكاة — كل الكباتن وهميين.', 'Simulation — all captains are fictional.'), { icon: 'flask-conical' })}${AA('k-classification')}</div></div>` });

function capMap(o, phaseOverride) {
  const c = myCap(); const legs = []; const markers = [];
  if (o) {
    const mn = MAP.nodes[M(o.mid).node]; const an = MAP.nodes[addrOf(o).node];
    markers.push({ x: mn.x, y: mn.y, kind: 'merchant' });
    if (o.cap && ['to_customer', 'at_customer', 'waiting_ops'].includes(o.cap.phase) || phaseOverride === 'offer') markers.push({ x: an.x, y: an.y, kind: 'home' });
    if (o.cap && o.cap.pts) legs.push({ pts: o.cap.pts, done: o.cap.dist / o.cap.len });
    else if (phaseOverride === 'offer') { legs.push({ pts: MAP.route(nearestNode(c.x, c.y), M(o.mid).node), done: 0 }); legs.push({ pts: MAP.route(M(o.mid).node, addrOf(o).node), done: 0, muted: true }); }
  } else Object.values(MERCHANTS).filter((m) => !m.blocked).forEach((m) => { const n = MAP.nodes[m.node]; markers.push({ x: n.x, y: n.y, kind: 'merchant' }); });
  const fit = o ? legs.flatMap((l) => l.pts).concat(markers) : [{ x: c.x - 250, y: c.y - 250 }, { x: c.x + 250, y: c.y + 250 }];
  let x = c.x, y = c.y; if (S.set.gps === 'weak') { const j = Math.sin(now() * 11) * 14; x += j; y += j * 0.6; }
  return MAP.render({ legs, markers, captain: { x, y, gps: S.set.gps, stale: S.set.gps === 'unavailable' }, fit, zoom: S.nav.captain.zoom || 1, aspect: 1.2, pad: 90 });
}

SCR.k_home = () => {
  const c = myCap(); const trip = myTrip(); const offer = myOffer();
  const online = c.status !== 'offline';
  return { key: 'k-home', tab: 'home', footer: offer ? offerActions(offer) : '', header: `<header class="appbar"><div class="appbar-title"><span class="eyebrow">${L('أهلًا يا كابتن', 'Hi captain')}</span><h1>${esc(kName(KID()))}</h1></div><div class="appbar-actions"><div class="avail ${online ? 'on' : ''}"><span>${online ? L('متاح', 'Online') : L('مش متاح', 'Offline')}</span>${toggle(online, 'k-online', L('متاح لاستقبال عروض', 'Available for offers'))}</div></div></header>`,
    body: `<div class="kapp">
      <div class="${cls('map-box', 'map-cap', offer && 'map-cap-sm')}">${capMap(offer || trip, offer ? 'offer' : null)}<span class="map-label">${ic('flask-conical', 12)}${L('خريطة توضيحية', 'Illustrative map')}</span>${S.set.gps !== 'accurate' ? `<span class="map-gps tone-warning">${ic('locate-off', 12)}${S.set.gps === 'weak' ? L('GPS ضعيف', 'Weak GPS') : L('GPS مش متاح', 'GPS unavailable')}</span>` : ''}</div>
      <div class="pad stack-16">
      ${offer ? offerCard(offer) : trip ? `<button type="button" class="live-card" data-act="k-go" data-s="k_trip" data-id="${trip.id}"><span class="live-ic">${ic('bike', 22)}</span><span class="live-main"><b>${L('رحلة شغالة', 'Active trip')} · <bdi dir="ltr">${trip.id}</bdi></b><small>${phaseLabel(trip)}</small></span>${fwd(18)}</button>` : online ? `<div class="card calm waiting-offers"><div class="rings rings-sm" aria-hidden="true"><i></i><i></i><i></i><span>${ic('radar', 18)}</span></div><div><b>${L('مستني عروض', 'Waiting for offers')}</b><small>${L('العروض بتيجي على حسب القرب. الرفض مالوش أي أثر عليك.', 'Offers come by proximity. Declining has no effect on you.')}</small></div></div>` : `<div class="card calm">${ic('moon', 20)}<span>${L('إنت مش متاح — مش هيوصلك عروض.', 'You are offline — no offers.')}</span></div>`}
      ${AA('k-offer-reject-free')}
      <div class="stats"><div class="stat"><small>${L('رحلات النهارده', 'Trips today')}</small><b class="num">${c.trips}</b></div><div class="stat"><small>${L('أرباح', 'Earned')}</small><b class="num">${money(c.earned)}</b></div><div class="stat"><small>${L('عهدة كاش', 'Cash custody')}</small><b class="num">${money(c.custody)}</b></div></div>
      ${note(L('مفيش «معدل قبول» بيتحسب عليك في التطبيق ده — وده مقصود لحد ما يتحسم بند الاتفاقية.', 'No acceptance rate is tracked — on purpose, until the contract clause is resolved.'), { icon: 'shield-check' })}${AA('k-acceptance-rate')}
      </div></div>` };
};
function offerCard(o) {
  const c = myCap(); const toM = MAP.lengthOf(MAP.route(nearestNode(c.x, c.y), M(o.mid).node)); const toC = MAP.lengthOf(MAP.route(M(o.mid).node, addrOf(o).node));
  const km = MAP.km(toM + toC); const mins = Math.round(MAP.minutes(toM + toC) + 4); const pay = Math.round(o.del * ECON.captainSharePct) / 100;
  const left = Math.max(0, o.offer.until + 1.5 - now());
  return `<article class="card offer"><div class="offer-head"><span class="rings rings-sm" aria-hidden="true"><i></i><i></i><i></i><span>${ic('bell-ring', 18)}</span></span><div><span class="eyebrow">${L('عرض توصيل', 'Delivery offer')}</span><h2>${esc(mName(o.mid))}</h2></div><span class="countdown num" aria-label="${attr(L('الوقت المتبقي', 'Time left'))}">${Math.ceil(left * 60 / 3)}${L('ث', 's')}</span></div>
    <div class="offer-grid"><div>${ic('store', 16)}<small>${L('الاستلام', 'Pickup')}</small><b>${esc(mName(o.mid))}</b></div><div>${ic('map-pin', 16)}<small>${L('التسليم', 'Drop-off')}</small><b>${esc(addrOf(o).zone || '')}</b><small class="muted">${L('العنوان الكامل بعد القبول', 'Full address after accepting')}</small></div><div>${ic('route', 16)}<small>${L('المسافة', 'Distance')}</small><b class="num">${km.toFixed(1)} ${L('كم', 'km')}</b></div><div>${ic('clock', 16)}<small>${L('الوقت', 'Time')}</small><b class="num">~${mins} ${L('د', 'min')}</b></div></div>
    <div class="offer-pay"><span>${L('أرباح تقديرية', 'Estimated earning')}</span><b class="num">${money(pay)}</b><small>${L(`${ECON.captainSharePct}% من رسوم التوصيل — قيمة في الكود مش معتمدة`, `${ECON.captainSharePct}% of the delivery fee — code value, not approved`)}</small>${o.pay.method === 'cash' ? `<small>${ic('banknote', 12)} ${L(`هتحصّل ${money(o.total)} كاش`, `Collect ${money(o.total)} cash`)}${o.pay.note !== 'exact' ? L(` — العميل معاه ${o.pay.note}، جهّز فكة ${money(Number(o.pay.note) - o.total)}`, ` — customer has ${o.pay.note}`) : ''}</small>` : ''}</div>
    ${AA('k-payout-estimate', 'k-dest-privacy')}
    <p class="muted small">${ic('shield-check', 12)} ${L('التخطي حقك ومالوش أي أثر مالي ولا على العروض الجاية.', 'Skipping is your right and has no effect.')}</p></article>`;
}
function offerActions(o) {
  return `<div class="grid-2">${btn(L('اقبل', 'Accept'), 'k-accept', { data: { id: o.id }, icon: 'check', busy: S.busy['k-accept'] })}${btn(L('تخطّي', 'Skip'), 'k-skip', { kind: 'secondary', data: { id: o.id } })}</div>`;
}
function phaseLabel(o) {
  if (!o.cap) return '';
  return { to_merchant: L('رايح للمتجر', 'Heading to the store'), at_merchant: o.st === 'ready' ? L('الطلب جاهز — استلم', 'Order ready — pick up') : L('مستني المتجر يجهّز', 'Waiting for the store'), to_customer: L('رايح للعميل', 'Heading to the customer'), at_customer: L('عند العميل', 'At the customer'), waiting_ops: L('مستني قرار العمليات', 'Waiting for operations'), done: L('خلصت', 'Done') }[o.cap.phase] || '';
}

SCR.k_trip = (p) => {
  const o = ord(p.id); if (!o || o.kid !== KID()) return SCR.k_home();
  const ph = o.cap ? o.cap.phase : 'done'; const a = addrOf(o); const k = S.nav.captain;
  let panel = '';
  if (ph === 'to_merchant') panel = `<div class="trip-step"><span class="eyebrow">${L('1 — الاستلام', '1 — Pickup')}</span><h2>${L('رايح لـ', 'To ')}${esc(mName(o.mid))}</h2><p class="num-line">${ic('route', 16)}<b class="num">${MAP.km(o.cap.len - o.cap.dist).toFixed(1)} ${L('كم', 'km')}</b> · ~<b class="num">${Math.ceil((o.cap.len - o.cap.dist) / MAP.SPEED)}</b> ${L('د', 'min')}</p><div class="grid-2">${btn(L('كلّم المتجر', 'Call store'), 'k-call', { kind: 'secondary', icon: 'phone', data: { to: 'merchant', id: o.id } })}${btn(L('ألغي الرحلة', 'Drop trip'), 'k-cancel-trip', { kind: 'ghost', data: { id: o.id } })}</div>${AA('k-drop-trip')}</div>`;
  else if (ph === 'at_merchant') { const waited = now() - (o.cap.atM || now()); panel = `<div class="trip-step"><span class="eyebrow">${L('1 — الاستلام', '1 — Pickup')}</span><h2>${L('إنت في المتجر', 'You’re at the store')}</h2><p class="num-line">${ic('timer', 16)}${L('مستني من', 'Waiting')} <b class="num">${Math.floor(waited)}</b> ${L('د', 'min')}${o.st !== 'ready' ? ` — ${L('الطلب لسه بيتحضّر', 'still preparing')}` : ''}</p>${waited > 5 && o.st !== 'ready' ? `${banner('warning', 'hourglass', L('الانتظار ده وقت منك ومش محسوب لك. بلّغ العمليات لو طوّل.', 'This wait costs you and isn’t paid. Tell ops if it drags on.'))}${AA('k-wait-cost')}` : ''}
    <div class="stack-8"><b>${L('اتأكد قبل ما تستلم', 'Check before pickup')}</b> ${truth('solution')}${o.lines.filter((l) => l.state === 'ok').map((l, i) => `<label class="check"><input type="checkbox" data-bind="k-check" data-i="${i}" ${(k.check || {})[o.id + ':' + i] ? 'checked' : ''}><span>${l.qty}× ${esc(pName(l.pid))}</span></label>`).join('')}${AA('k-pickup-checklist')}</div>
    ${btn(L('استلمت الطلب', 'Picked up'), 'k-pickup', { busy: S.busy['k-pickup'], block: true, icon: 'package-check', disabled: o.st !== 'ready', data: { id: o.id } })}</div>`; }
  else if (ph === 'to_customer') panel = `<div class="trip-step"><span class="eyebrow">${L('2 — التسليم', '2 — Drop-off')}</span><h2>${L('رايح لـ', 'To ')}${o.rcp.mode === 'other' ? esc(o.rcp.name) : esc(L(PEOPLE.customer.name, PEOPLE.customer.nameEn))}</h2><p>${esc(a.line)}</p><p class="landmark">${ic('landmark', 14)}${esc(a.landmark)}</p>${o.rcp.notes ? `<p class="muted">«${esc(o.rcp.notes)}»</p>` : ''}<p class="num-line">${ic('route', 16)}<b class="num">${MAP.km(o.cap.len - o.cap.dist).toFixed(1)} ${L('كم', 'km')}</b> · ~<b class="num">${Math.ceil((o.cap.len - o.cap.dist) / MAP.SPEED)}</b> ${L('د', 'min')}</p>
    ${o.cap.stopped ? banner('warning', 'wrench', L('واقف — العمليات بترتّب حل', 'Stopped — ops arranging')) : ''}
    <div class="grid-2">${btn(L('كلّم العميل', 'Call customer'), 'k-call', { kind: 'secondary', icon: 'phone', data: { to: 'customer', id: o.id } })}${btn(L('مشكلة في الطريق', 'Problem en route'), 'k-road', { kind: 'ghost', data: { id: o.id } })}</div>${AA('c-masked-call', 'k-breakdown-handoff')}</div>`;
  else if (ph === 'at_customer') {
    const due = dueCash(o); const given = k.cash != null ? k.cash : '';
    const chg = given !== '' ? Number(given) - due : null;
    panel = `<div class="trip-step"><span class="eyebrow">${L('2 — التسليم', '2 — Drop-off')}</span><h2>${L('إنت عند العميل', 'You’re at the customer')}</h2>
      ${o.pending.some((x) => x.kind === 'k_report') ? `<section class="card action-card tone-warning"><h3 class="h-sm">${ic('triangle-alert', 18)}${{ refused: L('العميل رفض الاستلام', 'Customer refused'), no_answer: L('العميل مش بيرد', 'No answer'), wrong_address: L('العنوان مش لاقيه', 'Address not found'), recipient_refused: L('المستلمة رافضة', 'Recipient refuses'), not_home: L('مفيش حد', 'Nobody home') }[o.pending.find((x) => x.kind === 'k_report').reason] || ''}</h3><p>${L('ما تتصرفش لوحدك. استخدم «تعذّر التسليم» وبلّغ العمليات — والبضاعة تفضل معاك.', 'Don’t act alone. Report “cannot deliver” — keep the goods.')}</p>${btn(L('بلّغ تعذّر التسليم', 'Report cannot deliver'), 'k-problem', { block: true, data: { id: o.id, reason: o.pending.find((x) => x.kind === 'k_report').reason } })}${AA('k-attempt-rules')}</section>` : ''}
      <div class="field"><label for="kcode">${L('كود الاستلام من المستلم', 'Delivery code from the recipient')}</label><input id="kcode" class="input input-code num" data-bind="k-code" value="${attr(k.code || '')}" inputmode="numeric" maxlength="4" dir="ltr" placeholder="• • • •" autocomplete="off"><p class="help">${L('اطلبه منه وهو قدامك بس.', 'Ask face to face only.')}</p>${k.codeErr ? `<p class="err" role="alert">${ic('circle-alert', 14)}${k.codeErr}</p>` : ''}</div>
      ${AA('c-delivery-code')}
      ${o.pay.method === 'cash' ? `<section class="card stack-8"><div class="row-between"><b>${L('المطلوب كاش', 'Cash due')}</b><b class="num big">${money(due)}</b></div>${o.rcp.mode === 'other' && o.rcp.hidePrice ? note(L('المشتري طالب إخفاء السعر — بس المستلم هو اللي بيدفع. ده تعارض لازم العمليات تحله.', 'Buyer asked to hide the price — but the recipient pays.'), { icon: 'triangle-alert' }) : ''}
        <div class="field"><label for="kcash">${L('استلمت كام؟', 'Cash received')}</label><input id="kcash" class="input num" data-bind="k-cash" value="${attr(given)}" inputmode="numeric" dir="ltr"></div>
        <div class="chips-row">${[due, 400, 500].map((v) => `<button type="button" class="chip-btn" data-act="k-cashchip" data-v="${v}">${money(v)}</button>`).join('')}</div>
        ${chg != null ? (chg < 0 ? `<p class="err">${ic('circle-alert', 14)}${L('المبلغ أقل من المطلوب', 'Less than due')}</p>` : `<p class="num-line">${L('الفكة:', 'Change:')} <b class="num">${money(chg)}</b> · ${L('معاك فكة', 'You have')} <b class="num">${money(myCap().change)}</b></p>`) : ''}
        ${AA('k-cash-change')}</section>` : ''}
      ${k.delErr ? banner('danger', 'circle-alert', k.delErr) : ''}
      ${btn(L('تأكيد التسليم', 'Confirm delivery'), 'k-deliver', { block: true, icon: 'circle-check', data: { id: o.id }, busy: S.busy['k-deliver'] })}
      <div class="grid-2">${btn(L('تعذّر التسليم', 'Cannot deliver'), 'k-problem', { kind: 'secondary', data: { id: o.id } })}${btn(L('حاسس بخطر', 'I feel unsafe'), 'k-safety', { kind: 'danger-ghost', icon: 'siren', data: { id: o.id } })}</div>${AA('k-safety')}</div>`;
  } else if (ph === 'waiting_ops') panel = `<div class="trip-step"><span class="eyebrow">${L('مستني العمليات', 'Waiting for operations')}</span><h2>${L('اتبلّغت العمليات', 'Operations notified')}</h2>${msgQuote('MSG-K-001')}<p class="num-line">${ic('timer', 16)}${L('مستني من', 'Waiting')} <b class="num">${Math.floor(now() - ((o.cnd && o.cnd.at) || now()))}</b> ${L('د', 'min')}</p>${banner('warning', 'hand-coins', L('المشوار ده ليك فيه حاجة؟ لسه مفيش قرار (FDR-0002). النظام بيقيّد أرباحك عند «اتسلّم» بس.', 'Paid for this trip? No decision yet (FDR-0002). Earnings are booked only at “delivered”.'))}${AA('k-cannot-deliver-escalation', 'k-failed-trip-pay', 'k-goods-hold')}${btn(L('كلّم العمليات', 'Call operations'), 'k-chat-ops', { kind: 'secondary', block: true, icon: 'headset' })}</div>`;
  else panel = `<div class="trip-step"><h2>${L('الرحلة خلصت', 'Trip finished')}</h2>${o.earn ? moneyRow(L('حصتك', 'Your share'), o.earn.share) : ''}${o.tip ? moneyRow(L('بقشيش (كله ليك)', 'Tip (all yours)'), o.tip) : ''}</div>`;
  return { key: 'k-trip-' + o.id, header: appbar(`<bdi dir="ltr">${o.id}</bdi>`, { back: true, backAct: 'k-back', eyebrow: phaseLabel(o) }), body: `<div class="kapp"><div class="map-box map-cap">${capMap(o)}<div class="map-ctrls">${iconBtn('plus', L('تكبير', 'Zoom in'), 'k-zoom', { data: { d: '1' }, size: 18 })}${iconBtn('minus', L('تصغير', 'Zoom out'), 'k-zoom', { data: { d: '-1' }, size: 18 })}</div><span class="map-label">${ic('flask-conical', 12)}${L('خريطة توضيحية', 'Illustrative map')}</span></div><div class="pad stack-16">${panel}
    <section class="card">${sectionHead(L('سجل الرحلة', 'Trip log'), { icon: 'history' })}${tlList(o, 'captain')}</section>
    <div class="chips-row">${P('CAPTAIN_005')}${P('CAPTAIN_006')}${P('CAPTAIN_007')}</div></div></div>` };
};
SCR.k_trips = () => {
  const mine = Object.values(S.orders).filter((o) => o.kid === KID() || o.offers.some((x) => x.kid === KID()));
  return { key: 'k-trips', tab: 'trips', header: appbar(L('رحلاتي', 'My trips')), body: `<div class="pad stack-8">${mine.length ? mine.map((o) => row({ icon: 'bike', title: `<bdi dir="ltr">${o.id}</bdi> · ${esc(mName(o.mid))}`, sub: `${stPill(o.st)} ${o.offers.filter((x) => x.kid === KID()).map((x) => ` · ${x.res === 'rejected' ? L('رفضت العرض', 'You declined') : x.res === 'cancelled' ? L('ألغيت بعد القبول', 'You dropped') : ''}`).join('')}`, act: o.kid === KID() ? 'k-go' : null, data: { s: 'k_trip', id: o.id } })).join('') : empty(`<div class="big-ic">${ic('bike', 40)}</div>`, L('مفيش رحلات لسه', 'No trips yet'), '')}</div>` };
};
SCR.k_earn = () => {
  const c = myCap(); const done = Object.values(S.orders).filter((o) => o.kid === KID() && o.earn);
  const failed = Object.values(S.orders).filter((o) => (o.offers.some((x) => x.kid === KID() && x.res === 'accepted')) && (o.label === 'failed_delivery_tag' || o.st === 'failed_delivery' || o.cnd && !o.earn));
  return { key: 'k-earn', tab: 'earnings', header: appbar(L('أرباحي', 'Earnings')), body: `<div class="pad stack-16">
    <section class="card stack-8">${moneyRow(L('حصة التوصيل', 'Delivery share'), c.earned - c.tips)}${moneyRow(L('بقشيش (كله ليك)', 'Tips (all yours)'), c.tips)}<hr>${moneyRow(L('الإجمالي', 'Total'), c.earned, { strong: true })}<div class="truth-row">${truth('finance', { label: L(`${ECON.captainSharePct}% قيمة في الكود — مش معتمدة`, 'Share is a code value — not approved') })}</div></section>
    <section class="card">${sectionHead(L('تفصيل كل رحلة', 'Per-trip breakdown'), { icon: 'list' })}${done.length ? done.map((o) => row({ icon: 'receipt', title: `<bdi dir="ltr">${o.id}</bdi>`, sub: `${L('توصيل', 'Delivery')} ${money(o.del)} × ${ECON.captainSharePct}%${o.tip ? ` + ${L('بقشيش', 'tip')} ${money(o.tip)}` : ''}`, end: `<b class="num">${money(o.earn.share + (o.tip || 0))}</b>` })).join('') : `<p class="muted">${L('مفيش رحلات مكتملة.', 'No completed trips.')}</p>`}${AA('k-earnings-transparency')}</section>
    ${failed.length ? `<section class="card">${sectionHead(L('رحلات ما اتسلّمتش', 'Undelivered trips'), { icon: 'package-x' })}${failed.map((o) => row({ icon: 'package-x', title: `<bdi dir="ltr">${o.id}</bdi>`, sub: L('مشيت وما اتسلّمش — التعويض غير محسوم', 'Undelivered — compensation undecided'), end: `<b class="num">${money(0)}</b>` })).join('')}${AA('k-failed-trip-pay')}</section>` : ''}
    ${note(L('مفيش «معدل قبول» ولا «ساعات اتصال» بتتحسب هنا.', 'No acceptance rate or online hours are measured.'), { icon: 'shield-check' })}${msgQuote('MSG-K-008')}
    <div class="chips-row">${P('CAPTAIN_009')}${P('FIN_004')}${P('FDR-0002', { silent: true })}</div></div>` };
};
SCR.k_custody = () => {
  const c = myCap(); const pct = clamp(c.custody / ECON.custodyLimit, 0, 1);
  return { key: 'k-custody', tab: 'custody', header: appbar(L('العهدة النقدية', 'Cash custody')), body: `<div class="pad stack-16">
    <section class="card stack-8"><div class="row-between"><b>${L('الكاش اللي معاك (ملك المنصّة)', 'Cash you hold (platform’s money)')}</b><b class="num big">${money(c.custody)}</b></div>
      <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${ECON.custodyLimit}" aria-valuenow="${c.custody}" aria-label="${attr(L('العهدة من الحد', 'Custody vs limit'))}"><i style="width:${Math.round(pct * 100)}%" class="${pct > 0.85 ? 'hot' : ''}"></i></div>
      <p class="muted small">${L(`الحد اليومي ${money(ECON.custodyLimit)} — قيمة في النظام مش قرار معتمد. ده حوالي 4 طلبات بـ325.`, `Daily limit ${money(ECON.custodyLimit)} — a system value, not an approved decision.`)}</p>${AA('k-custody-limit')}
      <p>${L('العهدة مش محفظتك ومش دين عليك — دي فلوس المنصّة في إيدك لحد التوريد.', 'Custody is not your wallet or your debt.')}</p>
      ${btn(L('ورّد الكاش للمكتب', 'Deposit cash'), 'k-deposit', { block: true, icon: 'vault', disabled: !c.custody })}</section>
    ${c.deposits.length ? `<section class="card">${sectionHead(L('التوريدات', 'Deposits'), { icon: 'history' })}${c.deposits.map((d) => row({ icon: d.diff ? 'scale' : 'circle-check', title: `${L('متوقع', 'Expected')} ${money(d.expected)} · ${L('فعلي', 'Actual')} ${money(d.actual)}`, sub: d.diff ? L(`فرق ${money(d.diff)} — «فرق» مش «عجز»، ومش هيتخصم منك حاجة دلوقتي`, `Difference ${money(d.diff)} — nothing deducted now`) : L('مطابق', 'Matched'), end: d.diff ? truth('decision') : truth('current') })).join('')}${AA('k-cash-diff')}${c.deposits.some((d) => d.diff) ? msgQuote('MSG-K-006') : ''}</section>` : ''}
    <div class="chips-row">${P('CAPTAIN_006')}${P('FIN_001')}${P('FDR-0005', { silent: true })}</div></div>` };
};
SCR.k_account = () => ({ key: 'k-account', tab: 'account', header: appbar(L('حسابي', 'Account')), body: `<div class="pad stack-16">
  <div class="profile"><span class="avatar avatar-lg" style="--av:${K(KID()).color}">${esc(kName(KID()).slice(0, 1))}</span><div><h2>${esc(kName(KID()))}</h2><p>${esc(K(KID()).vehicle)} · <bdi>${esc(K(KID()).plate)}</bdi></p><p class="muted small">${ic('flask-conical', 12)}${L('كابتن تجريبي', 'Demo captain')}</p></div></div>
  <section class="card stack-8">${sectionHead(L('علاقتك بوصّلي', 'Your relationship with Wasaly'), { icon: 'scale' })}<p>${L('الاتفاقية بتوصفك «مقاول مستقل» — بس فيها ضمان شهري مشروط بساعات وأيام ونسبة قبول. التصنيف القانوني مش محسوم، ووصف العقد لوحده ما يحسمهوش.', 'The contract says “independent contractor” but ties a guarantee to hours, days and acceptance. Classification is unresolved.')}</p>${AA('k-classification', 'k-acceptance-rate')}</section>
  ${listBox([row({ icon: 'file-text', title: L('المستندات', 'Documents'), sub: L('هوية ورخص — بيانات حساسة، بتتشاف بالحد الأدنى', 'ID and licences — sensitive, minimal access') }), row({ icon: 'headset', title: L('كلّم العمليات', 'Talk to operations'), act: 'k-chat-ops' }), row({ icon: 'scale', title: L('تظلّم على قرار', 'Appeal a decision'), act: 'k-appeal' }), row({ icon: 'shield-alert', title: L('بلاغ سلامة', 'Safety report'), act: 'k-safety-general', iconTone: 'danger' })])}
  ${S.nav.captain.appealed ? banner('info', 'scale', L('التظلّم اتسجل. المفروض يراجعه حد غير اللي قرر — ولو مفيش، هيتقالك ده صراحةً.', 'Appeal logged. Should be reviewed by someone else.')) : ''}${AA('k-appeal')}
  ${listBox([row({ icon: 'log-out', title: L('خروج', 'Sign out'), act: 'k-logout', noChevron: true, iconTone: 'danger' })])}
  <div class="chips-row">${P('CAPTAIN_001')}${P('CAPTAIN_002')}${P('CAPTAIN_010')}${P('LEGAL_002')}</div></div>` });

function captainSheet(sh) {
  if (sh.kind === 'k-problem') {
    const reasons = ['no_answer', 'refused', 'wrong_address', 'recipient_refused', 'not_home', 'change'];
    return sheetWrap(`<div class="stack-8">${reasons.map((r) => `<button type="button" role="radio" aria-checked="${S.nav.captain.reason === r}" class="rcard ${S.nav.captain.reason === r ? 'on' : ''}" data-act="k-reason" data-v="${r}"><span class="rcard-main"><span class="rcard-title">${reasonLabel(r)}</span></span><span class="rcard-dot"></span></button>`).join('')}
      ${field({ label: L('كلام العميل بنصه (لو قال حاجة)', 'Customer’s exact words (if any)'), bind: 'k-words', value: S.nav.captain.words || '', textarea: true, rows: 2, max: 140, help: L('اكتبه زي ما اتقال — من غير تفسير. السبب ده ما بيتشاركش مع التاجر.', 'Write it as said. Not shared with the store.') })}
      ${note(L('النظام هيبعت تصعيد للعمليات بس — الطلب مش هيتقفل ولا هيتحسب ليك حاجة لحد قرارهم.', 'The system only escalates — the order is not closed and nothing is booked for you.'), { icon: 'info' })}${AA('k-cannot-deliver-escalation')}</div>`, { key: 'k-problem', title: L('تعذّر التسليم — إيه اللي حصل؟', 'Cannot deliver — what happened?'), footer: btn(L('بلّغ العمليات', 'Report to operations'), 'k-report', { busy: S.busy['k-report'], kind: 'danger', block: true, disabled: !S.nav.captain.reason, data: { id: sh.id } }) });
  }
  if (sh.kind === 'k-road') return sheetWrap(`<div class="stack-8">${btn(L('الموتوسيكل عطل', 'Bike broke down'), 'k-road-do', { block: true, kind: 'secondary', icon: 'wrench', data: { id: sh.id, v: 'breakdown' } })}${btn(L('حصلتلي حادثة', 'I had an accident'), 'k-road-do', { block: true, kind: 'danger-ghost', icon: 'ambulance', data: { id: sh.id, v: 'accident' } })}${btn(L('الطريق مقفول / مطر شديد', 'Road closed / heavy rain'), 'k-road-do', { block: true, kind: 'secondary', icon: 'cloud-rain', data: { id: sh.id, v: 'weather' } })}${msgQuote('MSG-K-004')}</div>`, { key: 'k-road', title: L('مشكلة في الطريق', 'Problem on the road') });
  if (sh.kind === 'k-cancel') return sheetWrap(`<div class="stack-8">${[L('الموتوسيكل فيه مشكلة', 'Bike problem'), L('ظرف شخصي', 'Personal emergency'), L('حاسس إن المكان مش آمن', 'Feels unsafe'), L('المتجر مطوّل جدًا', 'Store is taking too long')].map((r) => `<button type="button" role="radio" aria-checked="${S.nav.captain.cancelWhy === r}" class="rcard ${S.nav.captain.cancelWhy === r ? 'on' : ''}" data-act="k-cancel-why" data-v="${attr(r)}"><span class="rcard-main"><span class="rcard-title">${r}</span></span><span class="rcard-dot"></span></button>`).join('')}${note(L('السبب بيتسجل زي ما قلته. مفيش خصم عليك بسبب الإلغاء.', 'Your reason is recorded as stated. No deduction.'))}${AA('k-drop-trip')}</div>`, { key: 'k-cancel', title: L('ليه هتلغي الرحلة؟', 'Why drop the trip?'), footer: btn(L('ألغي الرحلة', 'Drop trip'), 'k-cancel-do', { kind: 'danger', block: true, disabled: !S.nav.captain.cancelWhy, data: { id: sh.id } }) });
  return '';
}
onAct('k-pick', (d) => { S.nav.captain.kid = d.v; requestRender(); });
onAct('k-login', () => { S.nav.captain.loggedIn = true; requestRender(); });
onAct('k-logout', () => { S.nav.captain.loggedIn = false; requestRender(); });
onAct('k-go', (d) => { const p = Object.assign({}, d); const s = p.s; delete p.s; go('captain', s, p); requestRender(); });
onAct('k-back', () => { goBack('captain'); requestRender(); });
onAct('k-online', () => { const c = myCap(); if (c.status === 'on_trip') { toast(L('عندك رحلة شغالة', 'You have an active trip'), 'warning', 'bike'); requestRender(); return; } c.status = c.status === 'offline' ? 'online' : 'offline'; requestRender(); });
onAct('k-accept', (d) => { const o = ord(d.id); net('k-accept', () => { captainDecide(o, true); S.nav.captain.stacks.home = [{ s: 'k_home' }, { s: 'k_trip', id: o.id }]; S.nav.captain.tab = 'home'; NAVDIR = 'fwd'; toast(L('قبلت — روح للمتجر', 'Accepted — head to the store'), 'success', 'bike'); }); });
onAct('k-skip', (d) => { captainDecide(ord(d.id), false, L('الكابتن تخطّى', 'Captain skipped')); toast(L('تخطيت العرض — مفيش أي أثر عليك', 'Skipped — no effect on you'), 'info', 'x'); requestRender(); });
onAct('bind:k-check', (v, el) => { const top = topOf('captain'); S.nav.captain.check = S.nav.captain.check || {}; S.nav.captain.check[top.id + ':' + el.dataset.i] = v; });
onAct('k-pickup', (d) => { const o = ord(d.id); net('k-pickup', () => { if (pickup(o)) toast(L('استلمت — روح للعميل', 'Picked up — head to the customer'), 'success', 'package-check'); }); });
onAct('bind:k-code', (v) => { S.nav.captain.code = v; S.nav.captain.codeErr = null; });
onAct('bind:k-cash', (v) => { S.nav.captain.cash = v === '' ? null : Number(v); requestRender(); });
onAct('k-cashchip', (d) => { S.nav.captain.cash = Number(d.v); requestRender(); });
onAct('k-deliver', (d) => {
  const o = ord(d.id); const k = S.nav.captain;
  if (!k.code || String(k.code).length !== 4) { k.codeErr = L('اكتب الكود المكوّن من 4 أرقام.', 'Enter the 4-digit code.'); requestRender(); focusFirstError(); return; }
  net('k-deliver', () => {
    if (!o.handover) customerHandover(o, { given: k.cash });
    const r = deliver(o, { code: k.code, given: k.cash });
    if (!r.ok) { k.delErr = r.err; if (r.code === 'change' || r.code === 'short') SCN_RUNTIME.deliverFailed(o, r); if (String(k.code) !== String(o.code)) k.codeErr = r.err; }
    else { k.delErr = null; k.code = ''; k.cash = null; toast(L('اتسلّم — عاش يا كابتن', 'Delivered — well done'), 'success', 'circle-check'); }
  });
});
onAct('k-problem', (d) => { S.nav.captain.reason = d.reason || null; S.nav.captain.words = (ord(d.id).script.words || ''); openSheet({ kind: 'k-problem', id: d.id }); requestRender(); });
onAct('k-reason', (d) => { S.nav.captain.reason = d.v; requestRender(); });
onAct('bind:k-words', (v) => { S.nav.captain.words = v; });
onAct('k-report', (d) => { const o = ord(d.id); closeSheet(); net('k-report', () => { cannotDeliver(o, S.nav.captain.reason, S.nav.captain.words); toast(L('اتبلّغت العمليات — خلي البضاعة معاك', 'Ops notified — keep the goods'), 'info', 'headset'); }); });
onAct('k-safety', (d) => { safetyWithdraw(ord(d.id)); toast(L('امشي حالًا — مش محتاج إذن ولا إثبات', 'Leave now — no permission or proof needed'), 'danger', 'siren'); requestRender(); });
onAct('k-safety-general', () => { toast(L('بلاغ السلامة حق — العمليات هتكلمك فورًا (محاكاة)', 'Safety report sent (simulated)'), 'danger', 'siren'); requestRender(); });
onAct('k-road', (d) => { openSheet({ kind: 'k-road', id: d.id }); requestRender(); });
onAct('k-road-do', (d) => { const o = ord(d.id); closeSheet(); if (d.v === 'breakdown') SCN_RUNTIME.breakdown(o); else if (d.v === 'accident') SCN_RUNTIME.accident(o); else { o.cap.stopped = true; tl(o, { ev: 'weather', actor: 'captain:' + o.kid, note: L('ظرف استثنائي (طقس/طريق) — لا يُحمَّل على الكابتن', 'Force majeure — not on the captain'), kind: 'warn' }); addPending(o, 'o_transfer', 'ops', 5); } requestRender(); });
onAct('k-cancel-trip', (d) => { S.nav.captain.cancelWhy = null; openSheet({ kind: 'k-cancel', id: d.id }); requestRender(); });
onAct('k-cancel-why', (d) => { S.nav.captain.cancelWhy = d.v; requestRender(); });
onAct('k-cancel-do', (d) => { const o = ord(d.id); closeSheet(); captainCancel(o, S.nav.captain.cancelWhy); S.nav.captain.stacks.home = [{ s: 'k_home' }]; NAVDIR = 'back'; requestRender(); });
onAct('k-call', (d) => { const o = ord(d.id); const answered = !(d.to === 'customer' && o.door && o.door.mode === 'no_answer'); openSheet({ kind: 'call', to: d.to, name: d.to === 'merchant' ? mName(o.mid) : (o.rcp.mode === 'other' ? o.rcp.name : L(PEOPLE.customer.name, PEOPLE.customer.nameEn)), state: 'ringing' }); callLog(o, 'captain', d.to, answered ? L('رد', 'answered') : L('مفيش رد', 'no answer')); requestRender(); setTimeout(() => { if (S.sheet && S.sheet.kind === 'call') { S.sheet.state = answered ? 'connected' : 'noanswer'; requestRender(); } }, 1500); });
onAct('k-zoom', (d) => { const z = S.nav.captain.zoom || 1; S.nav.captain.zoom = d.d === '0' ? 1 : clamp(z * (d.d === '1' ? 1.4 : 1 / 1.4), 0.7, 3.2); requestRender(); });
onAct('k-deposit', () => { const c = myCap(); const diff = S.scenario.id === 'N' && !c.deposits.some((x) => x.diff) ? 20 : 0; c.deposits.push({ t: now(), expected: c.custody, actual: c.custody - diff, diff, status: diff ? 'open' : 'matched' }); if (diff) { notify('finance', { title: L(`فرق نقدي ${money(diff)} — ${kName(KID())}`, `Cash difference ${money(diff)}`), icon: 'scale', tone: 'warning' }); } c.custody = 0; toast(diff ? L('اتورّد — فيه فرق هيتراجع من غير خصم', 'Deposited — a difference will be reviewed, no deduction') : L('اتورّد ومطابق', 'Deposited and matched'), diff ? 'warning' : 'success', 'vault'); requestRender(); });
onAct('k-chat-ops', () => { chatThread('ko-' + KID(), ['captain', 'ops']); openSheet({ kind: 'chat', th: 'ko-' + KID(), with: 'ops', me: 'captain' }); requestRender(); });
onAct('k-appeal', () => { S.nav.captain.appealed = true; ticketCreate({ orderId: null, kind: 'other', prio: 'next', by: 'captain', text: L('تظلّم كابتن', 'Captain appeal'), queue: 'support' }); requestRender(); });
