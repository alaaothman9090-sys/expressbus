/* ==========================================================================
   ui-customer-a.js — customer app: onboarding, auth, browsing, cart, checkout
   ========================================================================== */
const SCR = {};
const catName = (c) => L(c.ar, c.en);
const mTag = (m) => L(m.tagline, m.taglineEn);
function merchantState(mid) {
  const st = S.merchants[mid].status;
  return { open: [L('مفتوح', 'Open'), 'success'], busy: [L('مشغول — وقت أطول', 'Busy — longer wait'), 'warning'], paused: [L('موقف الطلبات مؤقتًا', 'Paused'), 'warning'], closed: [L('مقفول دلوقتي', 'Closed now'), 'danger'] }[st];
}
const canOrderFrom = (mid) => ['open', 'busy'].includes(S.merchants[mid].status) && !M(mid).blocked;

/* ---------------------------------------------------------------- onboarding */
SCR.c_splash = () => ({
  key: 'splash', full: true, bg: 'brand', tabbar: false,
  body: `<div class="splash" style="--pat:url('${IL.patternURI('#FFFFFF', 0.09)}')">
    <div class="splash-mark"><span class="wordmark">${L('وصّلي', 'Wasaly')}</span><span class="splash-sub">${L('من محلات سمالوط لباب بيتك', 'From Samalout shops to your door')}</span></div>
    <svg class="splash-thread" viewBox="0 0 300 120" aria-hidden="true"><g class="st-ic" transform="translate(14 44)"><rect width="36" height="36" rx="10"/><g transform="translate(6 6)" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><svg width="24" height="24" viewBox="0 0 24 24">${ICONS.store}</svg></g></g><path class="st-path" d="M52 62 C 110 10, 190 110, 248 62"/><g class="st-ic" transform="translate(250 44)"><rect width="36" height="36" rx="10"/><g transform="translate(6 6)" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><svg width="24" height="24" viewBox="0 0 24 24">${ICONS.house}</svg></g></g></svg>
    <div class="splash-foot">${btn(L('ابدأ', 'Start'), 'c-onb-start', { kind: 'light', block: true })}<p class="splash-note">${ic('flask-conical', 14)}${L('نسخة محاكاة للتجربة — مش التطبيق الحقيقي', 'A simulation — not the real app')}</p></div>
  </div>`,
});
SCR.c_onb = () => {
  const step = S.cust.onb;
  if (step === 0) return { key: 'onb-lang', tabbar: false, full: true, body: `<div class="onb onb-lang">
      <div class="onb-top">${ic('languages', 36)}</div><h1 class="onb-title">${L('اختار لغتك', 'Choose your language')}</h1><p class="onb-sub">${L('تقدر تغيّرها بعدين من الإعدادات.', 'You can change it later in settings.')}</p>
      <div class="stack-12">${radioCard('lang', 'ar', S.set.lang, 'العربية', 'واجهة عربية كاملة', { act: 'c-lang', icon: 'languages' })}${radioCard('lang', 'en', S.set.lang, 'English', L('واجهة جزئية — محتوى السياسات بالعربي', 'Partial UI — policy content stays Arabic'), { act: 'c-lang', icon: 'globe' })}</div>
      ${AA('c-lang')}
      <div class="onb-cta">${btn(L('التالي', 'Next'), 'c-onb-next', { block: true })}</div></div>` };
  if (step >= 1 && step <= 3) {
    const slides = [
      { illo: IL.scene('town'), t: L('محلات البلد كلها في مكان واحد', 'Your town’s shops in one place'), s: L('مطاعم ومخابز وسوبر ماركت وحلويات وورد — من سمالوط وبيوصل سمالوط.', 'Restaurants, bakeries, groceries, sweets and flowers.') },
      { illo: IL.scene('cash'), t: L('ادفع كاش لما الطلب يوصلك', 'Pay cash when it arrives'), s: L('الكاش عند الاستلام هو طريقة الدفع الشغالة دلوقتي. والسعر كله قدامك قبل ما تأكد.', 'Cash on delivery is the working method today. Full price shown before you confirm.') },
      { illo: IL.scene('gift'), t: L('اطلب لحد بتحبه', 'Order for someone you love'), s: L('ابعت أكل أو ورد لأهلك — وإنت اللي بتقرر لو حصل أي حاجة.', 'Send food or flowers — you stay in control.') },
    ];
    const sl = slides[step - 1];
    return { key: 'onb-' + step, tabbar: false, full: true, body: `<div class="onb onb-slide">
      <div class="onb-skip">${btn(L('تخطي', 'Skip'), 'c-onb-skip', { kind: 'ghost', size: 'sm' })}</div>
      <div class="onb-illo">${sl.illo}</div><h1 class="onb-title">${sl.t}</h1><p class="onb-sub">${sl.s}</p>
      ${step === 2 ? AA('c-cod-only') : ''}${step === 3 ? AA('c-recipient') : ''}
      <div class="dots-nav" role="img" aria-label="${attr(L(`شريحة ${step} من 3`, `Slide ${step} of 3`))}">${[1, 2, 3].map((i) => `<span class="dn ${i === step ? 'on' : ''}" aria-hidden="true"></span>`).join('')}</div>
      <div class="onb-cta">${btn(step === 3 ? L('يلا بينا', 'Let’s go') : L('التالي', 'Next'), 'c-onb-next', { block: true })}</div></div>` };
  }
  if (step === 4) return { key: 'onb-perm', tabbar: false, full: true, body: `<div class="onb onb-perm">
      <div class="perm-illo">${ic('map-pinned', 56)}</div>
      <h1 class="onb-title">${L('نوصل لعنوانك إزاي؟', 'How do we find you?')}</h1>
      <p class="onb-sub">${L('هنستخدم موقعك عشان نعرف لو بنوصّل لمنطقتك ونحط النقطة على الخريطة. الكابتن بيشوف موقع التسليم بس — ومش بنتابعك بعد الطلب.', 'We use your location to check coverage and set the delivery pin.')}</p>
      <ul class="bullets">${[L('بيحدد العنوان أسرع', 'Faster address'), L('بيقلل غلط التوصيل', 'Fewer wrong deliveries'), L('تقدر تكتب العنوان بنفسك بدل كده', 'Or type it yourself')].map((x) => `<li>${ic('check', 16)}${x}</li>`).join('')}</ul>
      ${AA('c-location-perm')}
      <div class="onb-cta stack-8">${btn(L('اسمح بالموقع', 'Allow location'), 'c-perm', { block: true, data: { v: 'granted' }, icon: 'locate-fixed' })}${btn(L('هكتب العنوان بنفسي', 'I’ll type it'), 'c-perm', { block: true, kind: 'secondary', data: { v: 'denied' } })}</div>
      ${note(L('الموقع هنا محاكاة — مش هيطلب موقعك الحقيقي.', 'Location is simulated — your real location is not requested.'), { icon: 'flask-conical' })}</div>` };
  if (step === 5) return SCR.c_locate();
  if (step === 6) return SCR.c_addrForm({ onb: true });
  if (step === 7) return SCR.c_service();
  return SCR.c_login();
};
SCR.c_locate = () => {
  const gps = S.set.gps;
  const detecting = S.busy.locate;
  const outside = gps === 'outside';
  const a = outside ? OUTSIDE_ADDRESS : S.cust.addresses[0];
  const n = MAP.nodes[a.node];
  const mapHtml = MAP.render({ markers: [{ x: n.x, y: n.y, kind: 'home', label: '' }], fit: [n], pad: 260, aspect: 1.1, zoom: 1.6 });
  let status;
  if (detecting) status = `<div class="loc-status">${skel(1)}<span>${L('بنحدد موقعك…', 'Locating…')}</span></div>`;
  else if (gps === 'unavailable') status = banner('danger', 'locate-off', L('مش قادرين نحدد موقعك دلوقتي. اكتب العنوان بنفسك.', 'We can’t get your location. Type the address.'));
  else if (gps === 'weak') status = banner('warning', 'crosshair', L('الإشارة ضعيفة — الدقة حوالي 150 متر. حرّك النقطة لمكانك بالظبط واكتب معلم.', 'Weak signal (~150 m). Adjust the pin and add a landmark.'));
  else if (gps === 'manual') status = banner('info', 'map-pin', L('حرّك الخريطة وحط النقطة على بيتك.', 'Move the map to your door.'));
  else status = banner(outside ? 'warning' : 'success', outside ? 'map-pin-off' : 'badge-check', outside ? L('الموقع اتحدد — بس شكله برّه منطقة التغطية.', 'Located — looks outside coverage.') : L('الموقع اتحدد بدقة كويسة.', 'Located accurately.'));
  return { key: 'locate', tabbar: false, header: appbar(L('حدد مكانك', 'Set your location'), { back: true, backAct: 'c-onb-back' }), body: `
    <div class="map-box map-pick">${mapHtml}<span class="map-pin-center" aria-hidden="true">${ic('map-pin', 34)}</span><span class="map-label">${ic('flask-conical', 12)}${L('خريطة توضيحية — مش حقيقية', 'Illustrative map')}</span></div>
    <div class="pad stack-12">${status}
      <div class="card addr-card">${ic(a.icon || 'house', 20)}<div><b>${esc(L(a.label, a.labelEn))}</b><p>${esc(a.line)}</p></div></div>
      ${field({ label: L('معلم قريب (مهم في سمالوط)', 'Nearby landmark'), bind: 'c-landmark', value: S.cust.draftLandmark != null ? S.cust.draftLandmark : a.landmark, req: true, help: L('زي: جنب الجامع، قدام محل الموبايلات، البيت اللي بابه أزرق.', 'e.g. next to the mosque, the blue-door house.') })}
      ${AA('c-landmark-field', 'c-gps-states')}
    </div>`,
    footer: `<div class="foot-cta stack-8">${btn(L('أكّد العنوان', 'Confirm address'), 'c-loc-confirm', { block: true, disabled: gps === 'unavailable' || detecting })}${btn(L('اكتب العنوان بنفسك', 'Type it instead'), 'c-onb-manual', { block: true, kind: 'ghost' })}</div>` };
};
SCR.c_addrForm = (p = {}) => {
  const d = S.cust.addrDraft || (S.cust.addrDraft = { label: 'البيت', zone: 'وسط البلد', street: '', building: '', floor: '', landmark: '', alt: '', err: {} });
  const zones = ['وسط البلد', 'شمال البلد', 'على المية', 'المنطقة الصناعية (تجريبي)', 'عزبة خارج التغطية'];
  return { key: 'addr-form', tabbar: false, header: appbar(p.edit ? L('تعديل العنوان', 'Edit address') : L('عنوان جديد', 'New address'), { back: true, backAct: p.onb ? 'c-onb-back' : 'back' }), body: `<div class="pad stack-16">
    <div class="field"><span class="label">${L('اسم العنوان', 'Label')}</span><div class="chips-row">${['البيت', 'الشغل', 'بيت الأهل', 'تاني'].map((x) => `<button type="button" class="chip-btn ${d.label === x ? 'on' : ''}" data-act="c-addr-label" data-v="${attr(x)}" aria-pressed="${d.label === x}">${x}</button>`).join('')}</div></div>
    <div class="field"><label for="zone">${L('المنطقة', 'Area')}<span class="req">*</span></label><select id="zone" class="input" data-change="c-addr-zone">${zones.map((z) => `<option ${d.zone === z ? 'selected' : ''}>${z}</option>`).join('')}</select><p class="help">${L('أسماء المناطق هنا تجريبية.', 'Area names are fictional.')}</p></div>
    ${field({ label: L('الشارع', 'Street'), bind: 'c-addr-street', value: d.street, req: true, error: d.err.street, placeholder: L('مثال: شارع 7', 'e.g. Street 7') })}
    <div class="grid-2">${field({ label: L('رقم العمارة/البيت', 'Building'), bind: 'c-addr-building', value: d.building, inputmode: 'numeric' })}${field({ label: L('الدور', 'Floor'), bind: 'c-addr-floor', value: d.floor, inputmode: 'numeric' })}</div>
    ${field({ label: L('معلم قريب', 'Landmark'), bind: 'c-addr-landmark', value: d.landmark, req: true, error: d.err.landmark, help: L('ده أهم سطر — الكابتن بيدوّر بيه.', 'The captain relies on this.') })}
    ${field({ label: L('رقم تاني للتواصل (اختياري)', 'Alternate phone (optional)'), bind: 'c-addr-alt', value: d.alt, type: 'tel', inputmode: 'tel', dir: 'ltr', placeholder: '01X XXXX XXXX', help: L('بيقلل «تعذّر التسليم» لو موبايلك قافل. ما تكتبش رقم حقيقي في المحاكاة.', 'Reduces failed deliveries. Use a fake number here.') })}
    ${AA('c-landmark-field', 'c-alt-phone')}
  </div>`, footer: `<div class="foot-cta">${btn(L('احفظ العنوان', 'Save address'), 'c-addr-save', { block: true, data: { onb: p.onb ? 1 : 0 } })}</div>` };
};
SCR.c_service = () => {
  const a = S.cust.pendingAddr || S.cust.addresses[0];
  const ok = !a.outside && MAP.inCoverage(a.node);
  const checking = S.busy.service;
  return { key: 'service', tabbar: false, full: true, body: `<div class="onb onb-service">
    ${checking ? `<div class="rings" aria-hidden="true"><i></i><i></i><i></i><span>${ic('map-pinned', 26)}</span></div><h1 class="onb-title">${L('بنشوف لو بنوصّل لعندك…', 'Checking coverage…')}</h1>` : ok ? `<div class="big-ic tone-success">${ic('badge-check', 44)}</div><h1 class="onb-title">${L('بنوصّل لحد عندك', 'We deliver to you')}</h1><p class="onb-sub">${esc(a.line)} — ${esc(a.landmark || '')}</p>` : `<div class="big-ic tone-warning">${ic('map-pin-off', 44)}</div><h1 class="onb-title">${L('لسه مش بنوصّل للمنطقة دي', 'Not in this area yet')}</h1><p class="onb-sub">${L('التغطية دلوقتي جوه البلد بس. جرّب عنوان تاني.', 'Coverage is inside town for now.')}</p>`}
    ${AA('c-coverage')}
    <div class="onb-cta stack-8">${checking ? '' : ok ? btn(L('كمّل', 'Continue'), 'c-service-ok', { block: true }) : `${btn(L('جرّب عنوان تاني', 'Try another address'), 'c-onb-manual', { block: true })}${btn(L('بلّغني لما توصلوا', 'Notify me when you arrive'), 'c-notify-coverage', { block: true, kind: 'secondary' })}`}</div>
  </div>` };
};

/* ---------------------------------------------------------------- auth */
SCR.c_login = () => {
  const mode = S.cust.authMode || 'phone';
  if (S.cust.verifyStep === 1) return SCR.c_verify();
  if (mode === 'signup') return SCR.c_signup();
  if (mode === 'forgot') return SCR.c_forgot();
  const ph = S.cust.draftPhone || '';
  return { key: 'login', tabbar: false, full: true, body: `<div class="onb auth">
    <span class="wordmark wordmark-sm">${L('وصّلي', 'Wasaly')}</span>
    <h1 class="onb-title">${L('ادخل برقم موبايلك', 'Sign in with your phone')}</h1>
    <p class="onb-sub">${L('هنبعتلك كود تأكيد. ده محاكاة: ما تكتبش رقمك الحقيقي.', 'We send a code. Simulation: do not type your real number.')}</p>
    <div class="stack-12">
      ${field({ label: L('رقم الموبايل', 'Mobile number'), bind: 'c-phone', value: ph, type: 'tel', inputmode: 'tel', dir: 'ltr', placeholder: '010 0000 0000', error: S.cust.phoneErr, help: L('أي رقم تجريبي يبدأ بـ01 ومن 11 رقم.', 'Any fake number starting 01, 11 digits.') })}
      ${btn(L('استخدم رقم تجريبي', 'Use a demo number'), 'c-demo-phone', { kind: 'ghost', size: 'sm', icon: 'flask-conical' })}
      ${btn(L('ابعت الكود', 'Send code'), 'c-send-code', { block: true, busy: S.busy.sendCode })}
      ${AA('c-sms-noop')}
      <div class="or"><span>${L('أو', 'or')}</span></div>
      ${btn(L('المتابعة بحساب Google (محاكاة)', 'Continue with Google (sim)'), 'c-social', { block: true, kind: 'secondary', icon: 'globe', data: { v: 'google' } })}
      ${btn(L('المتابعة بحساب Apple (محاكاة)', 'Continue with Apple (sim)'), 'c-social', { block: true, kind: 'secondary', icon: 'smartphone', data: { v: 'apple' } })}
      ${btn(L('الدخول بالإيميل (محاكاة)', 'Email sign-in (sim)'), 'c-social', { block: true, kind: 'secondary', icon: 'mail', data: { v: 'email' } })}
      ${AA('c-social-login')}
      <div class="auth-links">${btn(L('حساب جديد', 'Create account'), 'c-auth-mode', { kind: 'link', data: { v: 'signup' } })}${btn(L('نسيت كلمة السر؟', 'Forgot password?'), 'c-auth-mode', { kind: 'link', data: { v: 'forgot' } })}</div>
    </div></div>` };
};
SCR.c_verify = () => {
  const code = S.cust.draftCode || '';
  return { key: 'verify', tabbar: false, header: appbar(L('كود التأكيد', 'Verification code'), { back: true, backAct: 'c-verify-back' }), body: `<div class="pad stack-16">
    <p class="lead">${L('بعتنا كود من 4 أرقام على', 'We sent a 4-digit code to')} <bdi dir="ltr">${esc(S.cust.draftPhone || '010 0000 0000')}</bdi></p>
    <div class="sim-box">${ic('flask-conical', 16)}<div><b>${L('صندوق المحاكاة', 'Simulation box')}</b><p>${L('الكود التجريبي:', 'Demo code:')} <b class="num code-demo" dir="ltr">4827</b></p><p class="muted">${L('في النظام الحقيقي: مزوّد الرسائل في الكود «noop» — يعني الرسالة مش هتوصل أصلًا.', 'In the real system the SMS provider is “noop” — the message would never arrive.')}</p></div></div>
    ${AA('c-sms-noop', 'c-otp-never-ask')}
    ${field({ label: L('اكتب الكود', 'Enter the code'), bind: 'c-code', value: code, inputmode: 'numeric', dir: 'ltr', placeholder: '• • • •', error: S.cust.codeErr, help: L('وصّلي عمرها ما هتطلب منك الكود ده في مكالمة.', 'Wasaly will never ask for this code on a call.') })}
    ${btn(L('تأكيد', 'Verify'), 'c-verify', { block: true, busy: S.busy.verify })}
    ${btn(L('ابعت الكود تاني', 'Resend code'), 'c-resend', { kind: 'ghost', block: true })}
  </div>` };
};
SCR.c_signup = () => ({ key: 'signup', tabbar: false, header: appbar(L('حساب جديد', 'Create account'), { back: true, backAct: 'c-auth-back' }), body: `<div class="pad stack-16">
  ${field({ label: L('الاسم', 'Name'), bind: 'c-su-name', value: S.cust.suName || 'أحمد', req: true, autocomplete: 'off' })}
  ${field({ label: L('رقم الموبايل', 'Mobile'), bind: 'c-phone', value: S.cust.draftPhone || '', type: 'tel', inputmode: 'tel', dir: 'ltr', req: true, placeholder: '010 0000 0000', error: S.cust.phoneErr })}
  ${field({ label: L('الإيميل (اختياري)', 'Email (optional)'), bind: 'c-su-email', value: S.cust.suEmail || '', type: 'email', inputmode: 'email', dir: 'ltr', placeholder: 'demo@example.com' })}
  <label class="check"><input type="checkbox" data-bind="c-su-terms" ${S.cust.suTerms ? 'checked' : ''}><span>${L('موافق على الشروط وسياسة الخصوصية', 'I agree to the terms and privacy policy')}</span></label>
  ${S.cust.suErr ? `<p class="err" role="alert">${ic('circle-alert', 14)}${S.cust.suErr}</p>` : ''}
  ${AA('c-terms-unread')}
  ${btn(L('اعمل الحساب', 'Create account'), 'c-signup', { block: true })}
  ${note(L('محاكاة: ما فيش حساب حقيقي بيتعمل، وما فيش كلمة سر مطلوبة.', 'Simulation: no real account, no password.'), { icon: 'flask-conical' })}
</div>` });
SCR.c_forgot = () => ({ key: 'forgot', tabbar: false, header: appbar(L('نسيت كلمة السر', 'Forgot password'), { back: true, backAct: 'c-auth-back' }), body: `<div class="pad stack-16">
  <p class="lead">${L('ده مسار الدخول بالإيميل (محاكاة). هنبعت رابط لإعادة التعيين.', 'Email sign-in path (simulated).')}</p>
  ${field({ label: L('الإيميل', 'Email'), bind: 'c-su-email', value: S.cust.suEmail || 'demo@example.com', type: 'email', dir: 'ltr' })}
  ${S.cust.forgotSent ? banner('success', 'mail-check', L('لو الإيميل مسجل، هيوصلك رابط (محاكاة — مفيش رسالة حقيقية).', 'If registered, a link is on its way (simulated).')) : btn(L('ابعت الرابط', 'Send link'), 'c-forgot-send', { block: true })}
  ${AA('c-social-login')}
</div>` });

/* ---------------------------------------------------------------- home */
function activeOrdersList() { return Object.values(S.orders).filter((o) => isActive(o) || (o.st === 'delivered' && !o.rating && !o.dismissed)); }
function merchantCard(mid, o = {}) {
  const m = M(mid); const [stLabel, tone] = merchantState(mid); const fav = S.cust.favorites.includes(mid);
  return `<article class="${cls('mcard', o.wide && 'mcard-wide', !canOrderFrom(mid) && 'is-closed')}">
    <button type="button" class="mcard-hit" data-act="c-open-merchant" data-id="${mid}" aria-label="${attr(mName(mid))}"></button>
    <div class="mcard-cover">${IL.shopfront(m)}${!canOrderFrom(mid) ? `<span class="mcard-closed">${stLabel}</span>` : ''}</div>
    <div class="mcard-body">
      <div class="mcard-top">${merchantLogo(m, 38)}<div class="mcard-names"><h3>${esc(mName(mid))} ${demoTag()}</h3><p>${esc(mTag(m))}</p></div>
      <button type="button" class="icon-btn fav ${fav ? 'on' : ''}" data-act="c-fav" data-id="${mid}" aria-pressed="${fav}" aria-label="${attr(fav ? L('شيل من المفضلة', 'Remove favourite') : L('أضف للمفضلة', 'Add favourite'))}">${ic('heart', 20)}</button></div>
      <div class="mcard-meta">${m.rating ? `<span>${ic('star', 14)}<b class="num">${m.rating}</b> <small>(${m.ratings})</small></span>` : ''}<span>${ic('clock', 14)}<span class="num">${m.eta[0]}–${m.eta[1]}</span> ${L('د', 'min')}</span><span>${ic('bike', 14)}${money(m.fee)}</span><span class="dotchip tone-${tone}">${stLabel}</span></div>
    </div></article>`;
}
function productCard(pid, o = {}) {
  const p = PR(pid); const st = stockOf(pid); const m = M(p.m);
  return `<article class="${cls('pcard', st.out && 'is-out')}"><button type="button" class="pcard-hit" data-act="c-open-product" data-id="${pid}" aria-label="${attr(pName(pid))}"></button>
    ${food(p.illo, { bg: m.accentSoft })}
    <div class="pcard-body"><h3>${esc(pName(pid))}</h3>${o.showMerchant ? `<p class="pcard-m">${esc(mName(p.m))}</p>` : `<p class="pcard-d">${esc(L(p.desc, p.descEn))}</p>`}
    <div class="pcard-foot"><b class="num price">${money(unitPrice(pid, defaultOpts(pid)))}</b>${st.out ? `<span class="dotchip tone-danger">${L('خلص', 'Sold out')}</span>` : st.left != null ? `<span class="dotchip tone-warning">${L(`فاضل ${st.left}`, `${st.left} left`)}</span>` : ''}
    ${!st.out ? `<button type="button" class="add-btn" data-act="c-quick-add" data-id="${pid}" aria-label="${attr(L('أضف', 'Add') + ' ' + pName(pid))}">${ic('plus', 18)}</button>` : ''}</div></div></article>`;
}
function defaultOpts(pid) { const o = {}; (PR(pid).groups || []).forEach((g) => { o[g.id] = g.req ? (g.opts.find((x) => x.d === 0) || g.opts[0]).id : []; }); return o; }
SCR.home = () => {
  const a = custAddr(); const unread = S.unread.customer;
  const act = activeOrdersList();
  const rail = (ids) => `<div class="rail" role="list">${ids.map((id) => `<div role="listitem" class="rail-item">${merchantCard(id)}</div>`).join('')}</div>`;
  const near = ['m1', 'm3', 'm2', 'm4', 'm5', 'm6'];
  const fast = near.slice().sort((x, y) => M(x).eta[0] - M(y).eta[0]);
  const popular = ['p101', 'p103', 'p201', 'p401', 'p301', 'p601'];
  return { key: 'home', tab: 'home',
    header: `<header class="home-head"><button type="button" class="addr-btn" data-act="c-addr-sheet"><span class="addr-ic">${ic('map-pin', 18)}</span><span class="addr-txt"><small>${L('التوصيل لـ', 'Deliver to')}</small><b>${esc(L(a.label, a.labelEn))} — ${esc(a.line.split('—')[0])}</b></span>${ic('chevron-down', 16)}</button>${iconBtn('bell', L('الإشعارات', 'Notifications'), 'c-go', { data: { s: 'notifs' }, badge: unread ? String(Math.min(unread, 9)) : '' })}</header>`,
    body: `<div class="home">
      <button type="button" class="search-fake" data-act="c-search-open">${ic('search', 20)}<span>${L('دوّر على أكلة أو محل…', 'Search dishes or shops…')}</span></button>
      <p class="demo-line">${ic('flask-conical', 13)}${DEMO_NOTE()}</p>${AA('c-demo-merchants')}
      ${act.length ? `<section class="sec">${sectionHead(L('طلبك الحالي', 'Your current order'), { icon: 'radar' })}${act.map((o) => liveOrderCard(o)).join('')}</section>` : ''}
      <section class="sec">${sectionHead(L('الأقسام', 'Categories'))}<div class="cats">${CATEGORIES.map((c) => `<button type="button" class="${cls('cat', c.blocked && 'is-blocked')}" data-act="c-open-cat" data-id="${c.id}"><span class="cat-illo">${IL.food(c.illo)}</span><span class="cat-name">${catName(c)}</span>${c.blocked ? `<span class="cat-lock">${ic('lock', 12)}${L('غير مفعّلة', 'Not enabled')}</span>` : ''}</button>`).join('')}</div>${AA('c-pharmacy-blocked')}</section>
      <section class="sec"><div class="promo" style="--pat:url('${IL.patternURI('#FFFFFF', 0.1)}')"><div class="promo-t"><span class="eyebrow">${L('عرض تجريبي', 'Demo offer')}</span><h3>${L('خصم 10% على طلبك', '10% off your order')}</h3><p>${L('استخدم الكود', 'Use code')} <b dir="ltr">WASALY10</b> ${L('— لحد 30 ج.م', '— up to EGP 30')}</p></div><div class="promo-illo">${IL.food('kofta')}</div></div>${AA('c-promo')}</section>
      <section class="sec">${sectionHead(L('قريب منك', 'Near you'))}${rail(near)}</section>
      <section class="sec">${sectionHead(L('بيوصل بسرعة', 'Fast delivery'))}${rail(fast.slice(0, 4))}${AA('c-eta-promise')}</section>
      <section class="sec">${sectionHead(L('الأكثر طلبًا', 'Most ordered'))}<div class="pgrid">${popular.map((pid) => productCard(pid, { showMerchant: true })).join('')}</div></section>
      <section class="sec">${sectionHead(L('اطلب تاني', 'Order again'), { icon: 'rotate-ccw' })}${listBox(S.history.map((id) => { const h = PAST[id]; return row({ media: merchantLogo(M(h.mid), 40), title: esc(mName(h.mid)), sub: `${esc(L(h.items, h.itemsEn))} · ${L(h.when, h.whenEn)}`, end: `<b class="num">${money(h.total)}</b>`, act: 'c-reorder', data: { id } }); }))}</section>
    </div>` };
};
function liveOrderCard(o) {
  const eta = etaInfo(o); const stuck = o.cnd && isActive(o);
  return `<button type="button" class="live-card" data-act="c-track" data-id="${o.id}"><span class="live-ic">${ic(o.st === 'delivered' ? 'circle-check' : 'bike', 22)}</span><span class="live-main"><b>${stuck ? L('الطلب واقف عند الباب', 'Stuck at the door') : L((STATUS_META[o.st] || {}).ar, (STATUS_META[o.st] || {}).en)}</b><small>${esc(mName(o.mid))} · <bdi>${o.id}</bdi>${eta ? ` · ${L('حوالي', 'about')} ${eta.lo}–${eta.hi} ${L('د', 'min')}` : ''}</small></span><span class="live-bar" aria-hidden="true"><i style="width:${Math.round(progressOf(o) * 100)}%"></i></span>${fwd(18)}</button>`;
}
function progressOf(o) {
  const base = { placed: 0.06, accepted: 0.14, preparing: 0.3, ready: 0.45, picked_up: 0.55, in_transit: 0.6, delivered: 1, completed: 1 }[o.st] || 0;
  if (o.st === 'preparing' && o.readyAt) return 0.14 + 0.3 * clamp(1 - (o.readyAt - now()) / o.prep, 0, 1);
  if (['in_transit', 'reattempt'].includes(o.st) && o.cap && o.cap.len) return 0.55 + 0.4 * clamp(o.cap.dist / o.cap.len, 0, 1);
  return base;
}

/* ---------------------------------------------------------------- explore / search / category */
SCR.explore = (p = {}) => {
  const q = (S.cust.q || '').trim();
  const res = q ? searchAll(q) : null;
  return { key: 'explore', tab: 'explore', header: `<header class="search-head"><label class="search-box">${ic('search', 20)}<input type="search" class="search-input" data-bind="c-q" value="${attr(S.cust.q || '')}" placeholder="${attr(L('كشري، بيتزا، عيش…', 'Koshary, pizza, bread…'))}" aria-label="${attr(L('بحث', 'Search'))}" ${p.focus ? 'data-autofocus="1"' : ''}></label>${q ? iconBtn('x', L('امسح البحث', 'Clear search'), 'c-q-clear') : ''}</header>`,
    body: `<div class="pad stack-16">${!q ? `
      <section>${sectionHead(L('دوّرت قبل كده', 'Recent'))}<div class="chips-row">${S.cust.recent.map((r) => `<button type="button" class="chip-btn" data-act="c-q-set" data-v="${attr(r)}">${ic('history', 14)}${esc(r)}</button>`).join('')}</div></section>
      <section>${sectionHead(L('اقتراحات', 'Suggestions'))}<div class="chips-row">${['كفتة', 'فطير', 'كنافة', 'ورد', 'لبن'].map((r) => `<button type="button" class="chip-btn" data-act="c-q-set" data-v="${attr(r)}">${esc(r)}</button>`).join('')}</div></section>
      <section>${sectionHead(L('تصفح الأقسام', 'Browse categories'))}${listBox(CATEGORIES.map((c) => row({ media: `<span class="row-illo">${IL.food(c.illo)}</span>`, title: catName(c), sub: c.blocked ? L('غير مفعّلة — محجوبة', 'Not enabled — blocked') : `${Object.values(MERCHANTS).filter((m) => m.cat === c.id).length} ${L('متجر', 'shops')}`, act: 'c-open-cat', data: { id: c.id } })))}</section>`
      : res.m.length + res.p.length === 0 ? empty(IL.scene('emptyCart'), L(`مفيش نتايج لـ «${esc(q)}»`, `No results for “${esc(q)}”`), L('جرّب كلمة أبسط، زي «كشري» أو «عيش».', 'Try a simpler word.'), btn(L('امسح البحث', 'Clear search'), 'c-q-clear', { kind: 'secondary' }))
      : `${res.m.length ? `<section>${sectionHead(L('المتاجر', 'Shops'))}${res.m.map((id) => merchantCard(id, { wide: true })).join('')}</section>` : ''}${res.p.length ? `<section>${sectionHead(L('الأصناف', 'Dishes'))}<div class="pgrid">${res.p.map((pid) => productCard(pid, { showMerchant: true })).join('')}</div></section>` : ''}${res.blocked ? note(L('فيه نتايج صيدلية — القسم ده محجوب ومش بيتعرض.', 'Pharmacy results exist but the category is blocked.'), { icon: 'lock' }) : ''}`}
    </div>` };
};
function searchAll(q) {
  const n = q.toLowerCase();
  const m = Object.values(MERCHANTS).filter((x) => !x.blocked && (x.name.includes(q) || x.nameEn.toLowerCase().includes(n) || x.tagline.includes(q))).map((x) => x.id);
  const p = Object.keys(PRODUCTS).filter((id) => { const x = PRODUCTS[id]; return !M(x.m).blocked && (x.ar.includes(q) || x.en.toLowerCase().includes(n) || x.desc.includes(q)); });
  const blocked = /دوا|صيدل|pharm|pill|بنادول/i.test(q);
  return { m, p, blocked };
}
SCR.cat = (p) => {
  const c = CATEGORIES.find((x) => x.id === p.id);
  if (!c) return { key: 'cat-missing', header: appbar(L('القسم', 'Category'), { back: true }), body: empty('', L('القسم ده مش موجود', 'Category not found'), '') };
  if (c.blocked) return { key: 'cat-' + c.id, header: appbar(catName(c), { back: true }), body: `<div class="pad stack-16">${empty(`<div class="big-ic tone-neutral">${ic('lock', 44)}</div>`, L('الصيدليات مش مفعّلة', 'Pharmacies are not enabled'), L('القسم ده محجوب لحد ما يتحقق 5 شروط — ومنهم رأي صيدلي مرخّص ومحامي. حتى «العرض بس» سؤال قانوني مفتوح.', 'Blocked until five conditions are met, including a licensed pharmacist’s and a lawyer’s opinion.'))}${AA('c-pharmacy-blocked')}<div class="card stack-8">${P('PHARM_001')}${P('PHARM_002')}${P('PHARM_003')}${P('LEGAL_006')}${P('FDR-0009', { silent: true })}</div></div>` };
  const ids = Object.values(MERCHANTS).filter((m) => m.cat === c.id).map((m) => m.id);
  return { key: 'cat-' + c.id, header: appbar(catName(c), { back: true }), body: `<div class="pad stack-12">${ids.map((id) => merchantCard(id, { wide: true })).join('')}</div>` };
};

/* ---------------------------------------------------------------- merchant page */
SCR.merchant = (p) => {
  const m = M(p.id); const [stLabel, tone] = merchantState(p.id); const fav = S.cust.favorites.includes(p.id);
  const cartOther = S.cust.cart.lines.length && S.cust.cart.mid !== p.id;
  return { key: 'merchant-' + p.id, bg: 'surface', header: `<header class="appbar appbar-float">${`<button type="button" class="icon-btn on-media" data-act="back" aria-label="${attr(L('رجوع', 'Back'))}">${back(22)}</button>`}<div></div><div class="appbar-actions"><button type="button" class="icon-btn on-media ${fav ? 'on' : ''}" data-act="c-fav" data-id="${p.id}" aria-pressed="${fav}" aria-label="${attr(L('المفضلة', 'Favourite'))}">${ic('heart', 20)}</button><button type="button" class="icon-btn on-media" data-act="c-share" aria-label="${attr(L('مشاركة', 'Share'))}">${ic('share-2', 20)}</button></div></header>`,
    body: `<div class="mpage" style="--m-accent:${m.accent};--m-soft:${m.accentSoft}">
      <div class="mpage-cover">${IL.shopfront(m)}</div>
      <div class="mpage-info">${merchantLogo(m, 56)}<div class="mpage-names"><h1>${esc(mName(p.id))}</h1><p>${esc(mTag(m))} ${demoTag()}</p></div></div>
      <div class="mpage-meta">
        ${m.rating ? `<div class="meta-cell">${ic('star', 16)}<b class="num">${m.rating}</b><small>${m.ratings} ${L('تقييم (تجريبي)', 'ratings (demo)')}</small></div>` : ''}
        <div class="meta-cell">${ic('clock', 16)}<b class="num">${m.eta[0]}–${m.eta[1]}</b><small>${L('دقيقة (تقدير)', 'min (estimate)')}</small></div>
        <div class="meta-cell">${ic('bike', 16)}<b class="num">${money(m.fee)}</b><small>${L('توصيل', 'delivery')}</small></div>
      </div>
      <div class="pad-x stack-8"><div class="status-line tone-${tone}">${ic(tone === 'success' ? 'circle-check' : tone === 'warning' ? 'hourglass' : 'circle-x', 16)}<span>${stLabel}</span>${S.merchants[p.id].status === 'busy' ? `<small>${L('— التحضير أطول بحوالي 10 دقايق', '— about 10 min longer')}</small>` : ''}</div>
      ${AA('c-busy-status', 'c-eta-promise', 'c-rating-demo')}
      ${cartOther ? banner('info', 'shopping-bag', L(`سلتك فيها طلب من ${esc(mName(S.cust.cart.mid))}. الطلب من أكتر من متجر مش متاح دلوقتي.`, `Your cart has items from ${esc(mName(S.cust.cart.mid))}. Multi-store orders are not available.`)) : ''}
      </div>
      <nav class="menu-tabs" aria-label="${attr(L('أقسام القائمة', 'Menu sections'))}">${m.menu.map((sec, i) => `<button type="button" class="${cls('mtab', i === (S.cust.menuTab || 0) && 'on')}" data-act="c-menu-tab" data-i="${i}" data-target="sec-${sec.id}">${esc(L(sec.ar, sec.en))}</button>`).join('')}</nav>
      <div class="menu">${m.menu.map((sec) => `<section class="menu-sec" id="sec-${sec.id}">${sectionHead(esc(L(sec.ar, sec.en)))}${sec.items.map((pid) => menuItem(pid)).join('')}</section>`).join('')}</div>
      <div class="pad stack-8">${btn(L('معلومات المتجر', 'Store info'), 'c-sheet', { kind: 'secondary', block: true, icon: 'info', data: { kind: 'minfo', id: p.id } })}<div class="chips-row">${P('MERCHANT_002')}${P('MERCHANT_003')}${P('CUSTOMER_001')}</div></div>
    </div>` };
};
function menuItem(pid) {
  const p = PR(pid); const st = stockOf(pid); const inCart = S.cust.cart.lines.filter((l) => l.pid === pid).reduce((s, l) => s + l.qty, 0);
  return `<article class="${cls('mitem', st.out && 'is-out')}"><button type="button" class="mitem-hit" data-act="c-open-product" data-id="${pid}" aria-label="${attr(pName(pid))}"></button>
    <div class="mitem-main"><h3>${esc(pName(pid))}${p.custom ? ` <span class="dotchip tone-info">${L('بالطلب', 'Custom')}</span>` : ''}</h3><p>${esc(L(p.desc, p.descEn))}</p><div class="mitem-foot"><b class="num price">${money(unitPrice(pid, defaultOpts(pid)))}</b>${st.out ? `<span class="dotchip tone-danger">${L('خلص', 'Sold out')}</span>` : st.left != null ? `<span class="dotchip tone-warning">${L(`فاضل ${st.left}`, `${st.left} left`)}</span>` : ''}${inCart ? `<span class="dotchip tone-brand">${L(`في السلة ×${inCart}`, `In cart ×${inCart}`)}</span>` : ''}</div></div>
    <div class="mitem-media">${food(p.illo, { bg: M(p.m).accentSoft })}${!st.out ? `<span class="add-btn add-btn-float" aria-hidden="true">${ic('plus', 18)}</span>` : ''}</div></article>`;
}

/* ---------------------------------------------------------------- product sheet */
function productSheet(sh) {
  const p = PR(sh.pid); const st = stockOf(sh.pid); const m = M(p.m);
  const unit = unitPrice(sh.pid, sh.opts); const total = unit * sh.qty;
  const maxQty = st.left != null ? st.left : 20;
  const groups = (p.groups || []).map((g) => {
    const err = sh.err && sh.err[g.id];
    return `<fieldset class="${cls('ogroup', err && 'has-error')}" id="og-${g.id}"><legend><span>${esc(L(g.ar, g.en))}</span><small>${g.req ? L('إجباري — اختار واحد', 'Required — pick one') : L(`اختياري — لحد ${g.max}`, `Optional — up to ${g.max}`)}</small></legend>
      ${g.opts.map((o) => { const on = g.req ? sh.opts[g.id] === o.id : (sh.opts[g.id] || []).includes(o.id); return `<button type="button" role="${g.req ? 'radio' : 'checkbox'}" aria-checked="${on}" class="${cls('opt', on && 'on', g.req ? 'opt-radio' : 'opt-check')}" data-act="c-opt" data-g="${g.id}" data-o="${o.id}"><span class="opt-mark" aria-hidden="true">${on ? ic('check', 14) : ''}</span><span class="opt-name">${esc(L(o.ar, o.en))}</span>${o.d ? `<span class="opt-d num">${money(o.d, { plus: true })}</span>` : ''}</button>`; }).join('')}
      ${err ? `<p class="err" role="alert">${ic('circle-alert', 14)}${err}</p>` : ''}</fieldset>`;
  }).join('');
  const allergens = (p.allergens || []).map((a) => `<span class="chip">${ic(ALLERGENS[a][2], 13)}${L(ALLERGENS[a][0], ALLERGENS[a][1])}</span>`).join('');
  return sheetWrap(`<div class="pdetail"><div class="pdetail-media" style="--m-soft:${m.accentSoft}">${IL.food(p.illo)}</div>
    <div class="pad stack-16"><div><h2 class="pdetail-name">${esc(pName(sh.pid))}</h2><p class="pdetail-m">${esc(mName(p.m))} ${demoTag()}</p><p class="pdetail-desc">${esc(L(p.desc, p.descEn))}</p>
    <div class="pdetail-price"><b class="num">${money(unitPrice(sh.pid, defaultOpts(sh.pid)))}</b>${st.left != null && !st.out ? `<span class="dotchip tone-warning">${L(`فاضل ${st.left} بس`, `Only ${st.left} left`)}</span>` : ''}${p.custom ? `<span class="dotchip tone-info">${ic('pencil', 12)}${L('منتج مخصص — ما بيرجعش', 'Custom item — non-returnable')}</span>` : ''}</div></div>
    ${allergens ? `<div><span class="label">${L('مسببات حساسية', 'Allergens')}</span><div class="chips-row">${allergens}</div>${AA('c-allergens')}</div>` : AA('c-allergens')}
    ${groups}
    ${field({ label: L('طلبات خاصة', 'Special instructions'), bind: 'c-pnote', value: sh.note || '', textarea: true, rows: 2, max: 120, placeholder: L('مثال: من غير بصل', 'e.g. no onions'), help: L('المطعم بيحاول — مش بنضمن تنفيذها.', 'The kitchen will try — not guaranteed.') })}
    ${p.custom ? AA('c-custom-product') : ''}${st.left != null ? AA('c-stock-limited') : ''}
    </div></div>`, { key: 'product', tall: true, label: pName(sh.pid),
    footer: st.out ? `<div class="sheet-cta">${btn(L('الصنف ده خلص', 'Sold out'), 'noop', { block: true, disabled: true })}</div>` : `<div class="sheet-cta">${stepper(sh.qty, 'c-pqty-', 'c-pqty+', {}, { minDisabled: sh.qty <= 1, maxDisabled: sh.qty >= maxQty })}${btn(`${L('أضف للسلة', 'Add to cart')}`, 'c-add', { cls: 'grow', tail: `<b class="num">${money(total)}</b>`, busy: S.busy.add })}</div>` });
}

/* ---------------------------------------------------------------- cart */
function cartLineHtml(l, i, extraIdx) {
  const p = PR(l.pid); const st = stockOf(l.pid); const now = unitPrice(l.pid, l.opts);
  const changed = l.unitSeen != null && l.unitSeen !== now;
  const d = extraIdx != null ? { i, x: extraIdx } : { i };
  return `<div class="${cls('cline', (st.out || changed) && 'is-flag')}"><span class="cline-media">${food(p.illo, { bg: M(p.m).accentSoft })}</span>
    <div class="cline-main"><b>${esc(pName(l.pid))}</b>${optsLabel(l.pid, l.opts) ? `<small>${esc(optsLabel(l.pid, l.opts))}</small>` : ''}${l.note ? `<small class="muted">«${esc(l.note)}»</small>` : ''}
    ${st.out ? `<p class="err">${ic('circle-alert', 14)}${L('الصنف ده خلص عند المتجر — شيله عشان تكمّل', 'Sold out — remove it to continue')}</p>` : ''}
    ${changed ? `<p class="warn">${ic('triangle-alert', 14)}${L(`السعر اتغيّر من ${money(l.unitSeen)} لـ ${money(now)}`, `Price changed ${money(l.unitSeen)} → ${money(now)}`)} ${btn(L('موافق', 'OK'), 'c-price-ok', { kind: 'link', data: d })}</p>` : ''}
    <div class="cline-foot"><b class="num">${money(now * l.qty)}</b>${stepper(l.qty, 'c-line-', 'c-line+', d, { trash: true })}</div></div></div>`;
}
SCR.cart = () => {
  const c = S.cust.cart;
  if (!c.lines.length && !(c.extra || []).length) return { key: 'cart', header: appbar(L('السلة', 'Cart'), { back: true }), body: `<div class="pad">${empty(IL.scene('emptyCart'), L('السلة فاضية', 'Your cart is empty'), L('اختار حاجة حلوة من محلات البلد.', 'Pick something from local shops.'), btn(L('تصفح المتاجر', 'Browse shops'), 'c-tab', { data: { tab: 'home' } }))}</div>` };
  const t = cartTotals(c); const m = M(c.mid);
  const blockers = cartBlockers();
  return { key: 'cart', header: appbar(L('السلة', 'Cart'), { back: true, actions: btn(L('فضّي', 'Clear'), 'c-cart-clear', { kind: 'link' }) }), body: `<div class="pad stack-16">
    <section class="card"><div class="cgroup-head">${merchantLogo(m, 36)}<div><b>${esc(mName(c.mid))}</b><small>${esc(mTag(m))}</small></div>${!canOrderFrom(c.mid) ? `<span class="dotchip tone-danger">${merchantState(c.mid)[0]}</span>` : ''}</div>
    ${c.lines.map((l, i) => cartLineHtml(l, i)).join('')}
    ${btn(L('أضف أصناف تانية', 'Add more items'), 'c-open-merchant', { kind: 'ghost', icon: 'plus', data: { id: c.mid } })}</section>
    ${(c.extra || []).map((e, x) => `<section class="card sim-card"><div class="sim-flag">${truth('sim')} ${truth('notbuilt')}</div><div class="cgroup-head">${merchantLogo(M(e.mid), 36)}<div><b>${esc(mName(e.mid))}</b><small>${L('متجر تاني — محاكاة لحل مقترح (OPS_003 محجوب)', 'Second store — simulated proposal')}</small></div></div>${e.lines.map((l, i) => cartLineHtml(l, i, x)).join('')}</section>`).join('')}
    ${(c.extra || []).length ? AA('c-multistore') : ''}
    ${field({ label: L('ملاحظة للمتجر', 'Note to the store'), bind: 'c-cart-note', value: c.note, textarea: true, rows: 2, max: 140, placeholder: L('مثال: رنّوا الجرس مرتين', 'e.g. ring twice') })}
    <div class="promo-in"><label class="sr-only" for="promo">${L('كود خصم', 'Promo code')}</label><input id="promo" class="input" data-bind="c-promo" value="${attr(c.promoDraft != null ? c.promoDraft : c.promo)}" placeholder="${attr(L('كود خصم', 'Promo code'))}" dir="ltr" autocomplete="off">${btn(L('طبّق', 'Apply'), 'c-promo-apply', { kind: 'secondary' })}</div>
    ${c.promoErr ? `<p class="err" role="alert">${ic('circle-alert', 14)}${c.promoErr}</p>` : ''}${c.promo ? `<p class="ok">${ic('badge-percent', 14)}${L(`الكود ${esc(c.promo)} اتطبّق (عرض تجريبي)`, `Code ${esc(c.promo)} applied (demo)`)}</p>` : ''}
    <section class="card">${priceBreakdown(t)}</section>
    ${AA('c-price-breakdown', 'c-service-fee', 'c-price-change')}
    ${blockers.length ? banner('danger', 'circle-alert', blockers.join('<br>')) : ''}
  </div>`, footer: `<div class="foot-cta">${btn(L('كمّل للدفع', 'Go to checkout'), 'c-go', { block: true, data: { s: 'checkout' }, disabled: blockers.length > 0, tail: `<b class="num">${money(t.total)}</b>` })}</div>` };
};
function cartBlockers() {
  const c = S.cust.cart; const out = [];
  if (!canOrderFrom(c.mid)) out.push(L(`${mName(c.mid)} ${merchantState(c.mid)[0]} — مش هتقدر تكمّل الطلب دلوقتي.`, `${mName(c.mid)} is not taking orders now.`));
  if (c.lines.some((l) => stockOf(l.pid).out)) out.push(L('فيه صنف خلص — شيله الأول.', 'An item is sold out — remove it first.'));
  if (c.lines.some((l) => l.unitSeen != null && l.unitSeen !== unitPrice(l.pid, l.opts))) out.push(L('فيه سعر اتغيّر — وافق عليه الأول.', 'A price changed — confirm it first.'));
  return out;
}
function priceBreakdown(t, o = {}) {
  return `<div class="breakdown">${moneyRow(L('قيمة الأصناف', 'Items'), t.sub)}${moneyRow(L('رسوم التوصيل', 'Delivery fee'), t.del, { note: L('عرض سعر منطقة: أساس + لكل كيلو', 'Zone quote: base + per km') })}${moneyRow(L('رسوم الخدمة', 'Service fee'), t.svc, { note: L('القيمة الجارية صفر — مش معتمدة', 'Current value 0 — not approved') })}${t.disc ? moneyRow(L('خصم', 'Discount'), -t.disc, { cls: 'mrow-disc' }) : ''}<hr>${moneyRow(o.totalLabel || L('الإجمالي', 'Total'), t.total, { strong: true })}</div>`;
}

/* ---------------------------------------------------------------- recipient */
SCR.recipient = () => {
  const r = S.cust.rcp; const cash = S.cust.pay === 'cash';
  const addrs = S.cust.addresses;
  return { key: 'recipient', header: appbar(L('مين هيستلم؟', 'Who receives it?'), { back: true }), body: `<div class="pad stack-16">
    <div class="stack-8" role="radiogroup">${radioCard('rmode', 'self', r.mode, L('أنا هستلم', 'Me'), L('على عنواني', 'At my address'), { act: 'c-rcp-mode', icon: 'user-round' })}${radioCard('rmode', 'other', r.mode, L('شخص تاني', 'Someone else'), L('أهلك أو صحابك — وإنت صاحب القرار', 'You stay the decision-maker'), { act: 'c-rcp-mode', icon: 'users' })}</div>
    ${r.mode === 'other' ? `
    ${AA('c-recipient')}
    ${field({ label: L('اسم المستلم', 'Recipient name'), bind: 'c-rcp-name', value: r.name, req: true, error: r.err && r.err.name })}
    ${field({ label: L('موبايل المستلم', 'Recipient mobile'), bind: 'c-rcp-phone', value: r.phone, type: 'tel', inputmode: 'tel', dir: 'ltr', req: true, placeholder: '01X XXXX XXXX', error: r.err && r.err.phone, help: L('رقم تجريبي بس.', 'Fake number only.') })}
    <div class="field"><span class="label">${L('صلة القرابة', 'Relationship')}</span><div class="chips-row">${['أم', 'أب', 'أخ/أخت', 'زوج/زوجة', 'صديق', 'تاني'].map((x) => `<button type="button" class="chip-btn ${r.rel === x ? 'on' : ''}" data-act="c-rcp-rel" data-v="${attr(x)}" aria-pressed="${r.rel === x}">${x}</button>`).join('')}</div></div>
    <div class="field"><span class="label">${L('عنوان المستلم', 'Recipient address')}</span><div class="stack-8">${addrs.map((a) => radioCard('raddr', a.id, r.addrId, esc(L(a.label, a.labelEn)), esc(a.line), { act: 'c-rcp-addr', icon: a.icon })).join('')}</div></div>
    ${field({ label: L('تعليمات للكابتن', 'Instructions for the captain'), bind: 'c-rcp-notes', value: r.notes, textarea: true, rows: 2, max: 140 })}
    <div class="card stack-12"><div class="toggle-row"><div><b>${L('اخفي السعر عن المستلم', 'Hide the price from the recipient')}</b><small>${L('مناسب للهدايا', 'Good for gifts')}</small></div>${toggle(r.hidePrice, 'c-rcp-hide', L('اخفي السعر', 'Hide price'))}</div>
      ${r.hidePrice && cash ? banner('warning', 'triangle-alert', L('مع الكاش عند الاستلام المستلم هو اللي هيدفع — يعني هيعرف السعر. الإخفاء محتاج دفع مسبق، والدفع المسبق مش مبني.', 'With cash on delivery the recipient pays and will see the price. Hiding needs prepayment, which is not built.')) : ''}
      ${AA('c-hide-price-cod')}</div>
    <div class="field"><span class="label">${L('مين هيدفع؟', 'Who pays?')}</span><div class="stack-8">${radioCard('payer', 'recipient', r.payer, L('المستلم يدفع كاش', 'Recipient pays cash'), L('لو مش معاه فلوس، هنكلّمك إنت الأول — ومش هنحرجه.', 'If they can’t pay, we call you first.'), { act: 'c-rcp-payer', icon: 'banknote' })}<button type="button" class="rcard is-disabled" data-act="c-explain" data-k="prepay"><span class="rcard-ic">${ic('credit-card', 22)}</span><span class="rcard-main"><span class="rcard-title">${L('أنا أدفع دلوقتي', 'I pay now')}</span><span class="rcard-sub">${L('محتاج دفع إلكتروني — غير مبني', 'Needs online payment — not built')}</span></span>${truth('notbuilt')}</button></div>${AA('c-payer-recipient', 'c-recipient-privacy')}</div>` : ''}
  </div>`, footer: `<div class="foot-cta">${btn(L('احفظ', 'Save'), 'c-rcp-save', { block: true })}</div>` };
};

/* ---------------------------------------------------------------- schedule */
SCR.schedule = () => {
  const sim = S.cust.schedSim;
  return { key: 'schedule', header: appbar(L('ميعاد التوصيل', 'Delivery time'), { back: true }), body: `<div class="pad stack-16">
    ${radioCard('when', 'now', S.cust.schedule ? 'later' : 'now', L('دلوقتي', 'Now'), L('أول ما يجهز', 'As soon as ready'), { act: 'c-sched', icon: 'bike' })}
    <button type="button" class="rcard ${S.cust.schedule ? 'on' : ''} ${sim ? '' : 'is-disabled'}" data-act="${sim ? 'c-sched' : 'c-explain'}" data-k="${sim ? 'when' : 'schedule'}" data-v="later" role="radio" aria-checked="${!!S.cust.schedule}"><span class="rcard-ic">${ic('calendar-clock', 22)}</span><span class="rcard-main"><span class="rcard-title">${L('جدولة لبعدين', 'Schedule for later')}</span><span class="rcard-sub">${sim ? L('محاكاة لحل مقترح', 'Simulated proposal') : L('غير مفعّلة — مفيش طاقة استيعابية تتحجز في النظام', 'Not enabled — no reservable capacity')}</span></span>${sim ? truth('sim') : truth('notbuilt')}</button>
    <button type="button" class="rcard is-disabled" data-act="c-explain" data-k="occasion"><span class="rcard-ic">${ic('party-popper', 22)}</span><span class="rcard-main"><span class="rcard-title">${L('طلب لمناسبة', 'Occasion order')}</span><span class="rcard-sub">${L('عيد ميلاد، خطوبة… — محجوب', 'Birthday, engagement… — blocked')}</span></span>${truth('notbuilt')}</button>
    ${AA('c-schedule-blocked')}
    ${sim && S.cust.schedule ? `<div class="card sim-card stack-12"><div class="sim-flag">${truth('sim')}</div>
      <div class="grid-2"><div class="field"><label for="sd">${L('اليوم', 'Day')}</label><select id="sd" class="input" data-change="c-sched-day"><option ${S.cust.schedule.day === 'tomorrow' ? 'selected' : ''} value="tomorrow">${L('بكرة', 'Tomorrow')}</option><option ${S.cust.schedule.day === 'after' ? 'selected' : ''} value="after">${L('بعد بكرة', 'Day after')}</option></select></div>
      <div class="field"><label for="stm">${L('الساعة', 'Time')}</label><select id="stm" class="input" data-change="c-sched-time">${['12:00', '15:00', '18:00', '21:00'].map((x) => `<option ${S.cust.schedule.time === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
      ${note(L('أفق الحجز (PAR-0020) مش محدد، ومفيش حجز طاقة عند التاجر ولا الكابتن. ده عرض للفكرة بس.', 'Booking horizon undecided; no capacity reservation.'), { icon: 'triangle-alert' })}</div>` : ''}
    ${!sim ? btn(L('اعرض الحل المقترح (محاكاة)', 'Show the proposal (simulation)'), 'c-sched-sim', { kind: 'secondary', block: true, icon: 'flask-conical' }) : ''}
  </div>`, footer: `<div class="foot-cta">${btn(L('تمام', 'Done'), 'back', { block: true })}</div>` };
};

/* ---------------------------------------------------------------- checkout */
function payLabel(k) { return { cash: L('كاش عند الاستلام', 'Cash on delivery'), card: L('بطاقة (محاكاة)', 'Card (simulated)'), wallet: L('محفظة موبايل', 'Mobile wallet'), instapay: 'InstaPay', balance: L('رصيد وصّلي', 'Wasaly balance') }[k]; }
SCR.checkout = () => {
  const c = S.cust.cart; const t = cartTotals(c); const m = M(c.mid);
  const a = S.cust.rcp.mode === 'other' ? (S.cust.addresses.find((x) => x.id === S.cust.rcp.addrId) || custAddr()) : custAddr();
  const route = MAP.route(m.node, a.node); const km = MAP.km(MAP.lengthOf(route));
  const lo = Math.round((m.prep + 4 + MAP.minutes(MAP.lengthOf(route))) / 5) * 5;
  const blockers = cartBlockers();
  const outside = a.outside || !MAP.inCoverage(a.node);
  if (outside) blockers.push(L('العنوان برّه منطقة التغطية.', 'Address outside coverage.'));
  if (S.set.network === 'offline') blockers.push(L('مفيش إنترنت — مش هنقدر نبعت الطلب.', 'Offline — cannot place the order.'));
  if (S.sys.outage) blockers.push(L('الخدمة واقفة دلوقتي — مش بنستقبل طلبات جديدة.', 'Service is down — not accepting new orders.'));
  const multi = (c.extra || []).length > 0;
  const sched = S.cust.schedule;
  return { key: 'checkout', header: appbar(L('تأكيد الطلب', 'Checkout'), { back: true }), body: `<div class="pad stack-16">
    <section class="card">${row({ icon: a.icon || 'map-pin', title: `${L('التوصيل لـ', 'Deliver to')} ${esc(L(a.label, a.labelEn))}`, sub: `${esc(a.line)}<br>${ic('landmark', 12)} ${esc(a.landmark || '—')}`, act: 'c-addr-sheet' })}
      ${row({ icon: S.cust.rcp.mode === 'other' ? 'users' : 'user-round', title: S.cust.rcp.mode === 'other' ? `${L('المستلم:', 'Recipient:')} ${esc(S.cust.rcp.name || '—')}` : L('إنت هتستلم', 'You receive'), sub: S.cust.rcp.mode === 'other' ? `${esc(S.cust.rcp.rel)} · ${S.cust.rcp.payer === 'recipient' ? L('المستلم يدفع', 'Recipient pays') : ''}${S.cust.rcp.hidePrice ? ' · ' + L('السعر مخفي', 'Price hidden') : ''}` : L('ممكن تبعته لحد تاني', 'You can send it to someone'), act: 'c-go', data: { s: 'recipient' } })}
      ${row({ icon: 'clock', title: sched ? L(`مجدول: ${sched.day === 'tomorrow' ? 'بكرة' : 'بعد بكرة'} ${sched.time}`, `Scheduled: ${sched.time}`) : L('دلوقتي', 'Now'), sub: sched ? L('محاكاة لحل مقترح — مش متاح فعلًا', 'Simulated proposal — not available') : `${L('حوالي', 'About')} <span class="num">${lo}–${lo + 15}</span> ${L('دقيقة', 'min')} · <span class="num">${km.toFixed(1)}</span> ${L('كم', 'km')}`, act: 'c-go', data: { s: 'schedule' } })}</section>
    ${AA('c-eta-promise')}
    <section class="card"><div class="cgroup-head">${merchantLogo(m, 32)}<div><b>${esc(mName(c.mid))}</b><small>${merchantState(c.mid)[0]}</small></div></div>
      <ul class="sum-lines">${c.lines.map((l) => `<li><span class="num">${l.qty}×</span><span>${esc(pName(l.pid))}${optsLabel(l.pid, l.opts) ? `<small>${esc(optsLabel(l.pid, l.opts))}</small>` : ''}</span><b class="num">${money(unitPrice(l.pid, l.opts) * l.qty)}</b></li>`).join('')}</ul>
      ${multi ? `<div class="sim-flag">${truth('sim')} ${L('+ متجر تاني', '+ another store')}</div>` : ''}</section>
    <section class="card">${row({ icon: S.cust.pay === 'cash' ? 'banknote' : 'credit-card', title: payLabel(S.cust.pay), sub: S.cust.pay === 'cash' ? L('ادفع للكابتن لما الطلب يوصل', 'Pay the captain on arrival') : L('محاكاة — مفيش دفع حقيقي', 'Simulated — no real charge'), act: 'c-go', data: { s: 'payment' } })}
      ${S.cust.pay === 'cash' ? `<div class="pad-in"><span class="label">${L('هتدفع إزاي؟', 'How will you pay?')}</span><div class="chips-row">${[['exact', L('المبلغ بالظبط', 'Exact amount')], ['200', L('ورقة 200', '200 note')], ['500', L('ورقة 500', '500 note')]].map(([v, lbl]) => `<button type="button" class="chip-btn ${S.cust.cashNote === v ? 'on' : ''}" data-act="c-cashnote" data-v="${v}" aria-pressed="${S.cust.cashNote === v}">${lbl}</button>`).join('')}</div>${S.cust.cashNote !== 'exact' && Number(S.cust.cashNote) < t.total ? `<p class="warn">${ic('triangle-alert', 14)}${L('الورقة دي أقل من الإجمالي.', 'That note is less than the total.')}</p>` : S.cust.cashNote !== 'exact' ? `<p class="muted">${L(`الكابتن هيحتاج فكة ${money(Number(S.cust.cashNote) - t.total)} — هنبلّغه قبل ما يتحرك.`, `Captain will need ${money(Number(S.cust.cashNote) - t.total)} change — we’ll tell him.`)}</p>` : ''}${AA('c-change-prompt')}</div>` : ''}</section>
    ${AA('c-cod-only')}
    <section class="card">${priceBreakdown(t, { totalLabel: S.cust.pay === 'cash' ? L('هتدفع كاش', 'Cash to pay') : L('الإجمالي', 'Total') })}</section>
    ${AA('c-price-breakdown', 'c-delivery-fee-quote')}
    ${note(L('بتأكيدك الطلب، المتجر لازم يقبله الأول. لو ما ردش في المهلة الطلب بيتلغي تلقائي من غير أي رسوم.', 'The store must accept first. If it doesn’t respond in time, the order is cancelled at no cost.'))}
    ${blockers.length ? banner('danger', 'circle-alert', blockers.join('<br>')) : ''}
    <div class="chips-row">${P('CUSTOMER_001')}${P('CUSTOMER_002')}${P('FIN_001')}</div>
  </div>`, footer: `<div class="foot-cta">${btn(`${L('تأكيد الطلب', 'Confirm order')}`, 'c-place', { block: true, disabled: blockers.length > 0 || (sched && !multi && false), busy: S.busy.place, tail: `<b class="num">${money(t.total)}</b>` })}${AA('c-confirm-idempotency')}</div>` };
};

/* ---------------------------------------------------------------- payment */
SCR.payment = () => {
  const opt = (k, icon, title, sub, kinds, enabled) => `<button type="button" role="radio" aria-checked="${S.cust.pay === k}" class="${cls('rcard', S.cust.pay === k && 'on', !enabled && 'is-disabled')}" data-act="${enabled ? 'c-pay' : 'c-explain'}" data-k="${enabled ? 'pay' : 'pay-' + k}" data-v="${k}"><span class="rcard-ic">${ic(icon, 22)}</span><span class="rcard-main"><span class="rcard-title">${title}</span><span class="rcard-sub">${sub}</span><span class="truth-row">${kinds.map((x) => truth(x)).join('')}</span></span><span class="rcard-dot" aria-hidden="true"></span></button>`;
  return { key: 'payment', header: appbar(L('طريقة الدفع', 'Payment method'), { back: true }), body: `<div class="pad stack-12" role="radiogroup">
    ${opt('cash', 'banknote', L('كاش عند الاستلام', 'Cash on delivery'), L('الطريقة الشغالة دلوقتي', 'The working method today'), ['current'], true)}
    ${opt('card', 'credit-card', L('بطاقة (محاكاة)', 'Card (simulated)'), L('بطاقة وهمية بس — مفيش أي بيانات حقيقية', 'Fake card only — no real data'), ['sim', 'notbuilt'], true)}
    ${S.cust.pay === 'card' ? `<div class="card sim-card stack-8"><div class="fake-card"><span>VISA-like</span><b dir="ltr" class="num">4242 •••• •••• 4242</b><small>${L('بطاقة وهمية للمحاكاة', 'Simulation card')}</small></div><div class="toggle-row"><div><b>${L('اجعل الدفع يفشل (اختبار)', 'Make payment fail (test)')}</b><small>${L('لتجربة سيناريو O', 'Scenario O')}</small></div>${toggle(S.cust.payFail, 'c-payfail', L('فشل الدفع', 'Fail payment'))}</div><div class="toggle-row"><div><b>${L('اتخصم ومتأكدش الطلب (اختبار)', 'Charged but not confirmed (test)')}</b><small>${L('لتجربة سيناريو P', 'Scenario P')}</small></div>${toggle(S.cust.payGhost, 'c-payghost', L('خصم بدون طلب', 'Charge without order'))}</div>${note(L('ما تكتبش بيانات بطاقة حقيقية في أي مكان هنا.', 'Never type real card details here.'), { icon: 'shield-alert' })}</div>` : ''}
    ${opt('wallet', 'smartphone', L('محفظة موبايل', 'Mobile wallet'), L('غير مبنية', 'Not built'), ['notbuilt'], false)}
    ${opt('instapay', 'send', 'InstaPay', L('فكرة غير محقَّقة — تحويل يدوي صعب المطابقة', 'Unverified concept — manual transfer'), ['unknown', 'notbuilt'], false)}
    ${opt('balance', 'wallet', L('رصيد وصّلي', 'Wasaly balance'), L('محجوب لحد قرار FDR-0010 ورأي متخصص مدفوعات', 'Blocked pending FDR-0010'), ['decision', 'legal'], false)}
    ${AA('c-card-notbuilt', 'c-wallet-blocked', 'c-instapay-concept')}
  </div>`, footer: `<div class="foot-cta">${btn(L('تمام', 'Done'), 'back', { block: true })}</div>` };
};

/* ---------------------------------------------------------------- confirmation */
SCR.confirm = (p) => {
  const o = ord(p.id);
  return { key: 'confirm-' + p.id, full: true, tabbar: false, body: `<div class="onb confirm">
    <div class="rings" aria-hidden="true"><i></i><i></i><i></i><span>${ic('receipt-text', 26)}</span></div>
    <h1 class="onb-title">${L('طلبك اتبعت', 'Order sent')}</h1>
    <p class="onb-sub">${L('رقم الطلب', 'Order number')} <b class="num" dir="ltr">${o.id}</b></p>
    <p class="onb-sub">${L(`مستنيين ${mName(o.mid)} يقبله. لو ما ردش في المهلة، الطلب هيتلغي من غير أي رسوم.`, `Waiting for ${mName(o.mid)} to accept.`)}</p>
    <div class="onb-cta stack-8">${btn(L('تابع طلبك', 'Track order'), 'c-track', { block: true, data: { id: o.id } })}${btn(L('رجوع للرئيسية', 'Back to home'), 'c-tab', { block: true, kind: 'ghost', data: { tab: 'home' } })}</div>
  </div>` };
};

/* ---------------------------------------------------------------- sheets used across customer screens */
function customerSheet(sh) {
  if (sh.kind === 'product') return productSheet(sh);
  if (sh.kind === 'addr') {
    return sheetWrap(`<div class="stack-8">${S.cust.addresses.map((a) => radioCard('addr', a.id, S.cust.addrId, esc(L(a.label, a.labelEn)), esc(a.line), { act: 'c-addr-pick', icon: a.icon })).join('')}${radioCard('addr', 'a4', S.cust.addrId, esc(L(OUTSIDE_ADDRESS.label, OUTSIDE_ADDRESS.labelEn)), L('للتجربة: عنوان برّه التغطية', 'Test: outside coverage'), { act: 'c-addr-pick', icon: 'map-pin-off' })}${btn(L('أضف عنوان جديد', 'Add new address'), 'c-addr-new', { kind: 'secondary', block: true, icon: 'plus' })}</div>`, { key: 'addr', title: L('اختار العنوان', 'Choose address') });
  }
  if (sh.kind === 'conflict') {
    return sheetWrap(`<div class="stack-12"><p>${L(`سلتك فيها أصناف من ${esc(mName(S.cust.cart.mid))}. الطلب من أكتر من متجر في نفس الوقت مش متاح دلوقتي.`, `Your cart has items from ${esc(mName(S.cust.cart.mid))}. Multi-store orders are not available.`)}</p>${truth('notbuilt')} ${P('OPS_003')}${AA('c-multistore')}</div>`, { key: 'conflict', title: L('طلب من متجر تاني؟', 'Order from another store?'), footer: `<div class="stack-8">${btn(L('ابدأ سلة جديدة', 'Start a new cart'), 'c-conflict', { block: true, data: { v: 'new' } })}${btn(L('خليني في السلة الحالية', 'Keep my cart'), 'c-conflict', { block: true, kind: 'secondary', data: { v: 'keep' } })}${btn(L('محاكاة: طلب متعدد المتاجر (حل مقترح)', 'Simulate multi-store (proposal)'), 'c-conflict', { block: true, kind: 'ghost', icon: 'flask-conical', data: { v: 'multi' } })}</div>` });
  }
  if (sh.kind === 'minfo') {
    const m = M(sh.id);
    return sheetWrap(`<div class="stack-12">${row({ icon: 'map-pin', title: L('العنوان', 'Address'), sub: L('شارع تجريبي — عنوان وهمي', 'Fictional address') })}${row({ icon: 'clock', title: L('المواعيد', 'Hours'), sub: L('10 ص – 12 بالليل (تجريبي)', '10am – midnight (demo)') })}${row({ icon: 'shield-check', title: L('حالة التحقق', 'Verification'), sub: L('متجر تجريبي — مش نشاط حقيقي متحقق منه', 'Demo store — not a verified real business') })}${AA('c-demo-merchants')}<div class="chips-row">${P('MERCHANT_001')}${P('MERCHANT_006')}</div></div>`, { key: 'minfo', title: esc(mName(m.id)) });
  }
  if (sh.kind === 'explain') return explainSheet(sh.k);
  if (typeof customerSheetB === 'function') return customerSheetB(sh);
  return '';
}
const EXPLAIN = {
  prepay: ['الدفع المسبق مش مبني', 'Prepayment is not built', 'مفيش مسار دفع إلكتروني شغال في النظام دلوقتي، فالمشتري ما يقدرش يدفع مقدمًا عن المستلم. ده كمان سبب إن «إخفاء السعر» في الهدايا مش بيشتغل مع الكاش.', ['notbuilt'], ['FIN_002', 'CUSTOMER_007']],
  schedule: ['الطلب المجدول محجوب', 'Scheduled orders are blocked', 'الجدولة وعد بطاقة في المستقبل، ومفيش في النظام مفهوم طاقة تتحجز للتاجر ولا للكابتن. أفق الحجز (PAR-0020) مش محدد.', ['notbuilt', 'decision'], ['OPS_004']],
  occasion: ['طلب المناسبات محجوب', 'Occasion orders are blocked', 'فشل طلب مناسبة ضرره ما يتصلحش — عيد الميلاد ما بيتعادش. وما يتقبلش بترتيب «على مسؤوليتي».', ['notbuilt'], ['OPS_004']],
  'pay-wallet': ['المحافظ مش مبنية', 'Wallets are not built', 'مفيش ربط بمحافظ الموبايل في النظام.', ['notbuilt'], ['FIN_002']],
  'pay-instapay': ['InstaPay — فكرة غير محقَّقة', 'InstaPay — unverified idea', 'التحويل اليدوي محتاج مطابقة يدوية لكل طلب، وفيه خطر «اتحوّل ومتأكدش». مش مبني ومش متحقق من إمكانيته.', ['unknown', 'notbuilt'], ['FIN_006']],
  'pay-balance': ['رصيد وصّلي محجوب', 'Wasaly balance is blocked', 'أي رصيد مغلق للعميل ممكن يتعتبر «أداة دفع» تحت تنظيم البنك المركزي (VAL-0008). ولحد قرار FDR-0010، ما يتصدرش أي رصيد. والكود النهارده بيصدر قسيمة في استرداد الكاش — وده بيخالف القاعدة.', ['decision', 'legal'], ['LEGAL_004', 'FIN_008']],
};
function explainSheet(k) {
  const e = EXPLAIN[k]; if (!e) return '';
  return sheetWrap(`<div class="stack-12"><div class="truth-row">${e[3].map((x) => truth(x)).join('')}</div><p>${e[2]}</p><div class="chips-row">${e[4].map((x) => P(x)).join('')}</div></div>`, { key: 'explain-' + k, title: L(e[0], e[1]) });
}
