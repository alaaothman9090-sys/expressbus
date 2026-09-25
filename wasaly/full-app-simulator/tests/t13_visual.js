// the required visual-QA screen list at one viewport; SCHEME env picks light/dark
const { skipOnboarding } = require('./lib');
module.exports = async (h) => {
  const tag = `${h.W}x${h.H}-${process.env.SCHEME || 'light'}`;
  await h.load(); await skipOnboarding(h);
  const snap = async (name) => { await h.shot(`vq-${tag}-${name}`, { wait: 420 }); const o = await h.overflow(); if (o.length) h.log(tag, name, 'OVERFLOW', o.slice(0, 5)); };
  const W = (fn, arg) => h.ev(fn, arg);
  const custNav = (s, p = {}, tab = 'home') => W(([s, p, t]) => { const W = window.__W; W.S.set.role = 'customer'; const n = W.S.nav.customer; n.tab = t; n.stacks[t] = n.stacks[t].slice(0, 1); if (s !== n.stacks[t][0].s) n.stacks[t].push(Object.assign({ s }, p)); W.S.sheet = null; W.requestRender(); }, [s, p, tab]);
  await snap('01-home');
  await custNav('merchant', { id: 'm1' }); await h.wait(300); await snap('02-merchant');
  await h.act('c-open-product', { id: 'p101' }); await snap('03-product');
  await h.act('c-add'); await h.wait(3600);
  await custNav('cart'); await snap('04-cart');
  await custNav('checkout'); await snap('05-checkout');
  // flagship world for the live order / failed delivery / desks
  await W(() => { const W = window.__W; W.S.set.role = 'customer'; W.S.pickScn = 'B'; W.S.dialog = null; W.ACT['scn-start'](); if (W.S.dialog) W.ACT['scn-start-do']({}); let n = 0; while (n++ < 40) { const o = W.S.orders['WS-10428']; if (o.cap && o.cap.phase === 'to_customer' && o.cap.dist > o.cap.len * 0.4) break; if (!W.skipAhead()) break; } W.S.toast = null; W.requestRender(); });
  await h.wait(500); await snap('06-live-order');
  await W(() => { const s = document.querySelector('.scr'); if (s) s.scrollTop = 0; });
  await h.act('c-zoom', { d: '1' }, { soft: true }); await snap('07-map');
  await W(() => { const W = window.__W; let n = 0; while (n++ < 40) { const o = W.S.orders['WS-10428']; const p = o.pending.find((a) => a.role === 'customer'); if (p) { W.ACT['cue-do']({ id: o.id, k: p.kind }); continue; } if (o.pending.some((a) => a.role === 'ops')) break; if (!W.skipAhead()) break; } W.S.toast = null; W.requestRender(); });
  await h.wait(400); await snap('08-failed-delivery');
  // merchant incoming order: fresh scenario A as merchant
  await W(() => { const W = window.__W; W.S.set.role = 'merchant'; W.S.pickScn = 'A'; W.S.dialog = null; W.ACT['scn-start'](); if (W.S.dialog) W.ACT['scn-start-do']({}); W.S.toast = null; W.requestRender(); });
  await h.wait(400); await snap('09-merchant-incoming');
  await W(() => { const W = window.__W; const o = W.S.orders['WS-10428']; W.ACT['cue-do']({ id: o.id, k: 'm_accept' }); W.S.set.role = 'captain'; let n = 0; while (n++ < 30) { if (o.pending.some((a) => a.kind === 'k_offer')) break; if (!W.skipAhead()) break; } W.S.toast = null; W.requestRender(); });
  await h.wait(400); await snap('10-captain-offer');
  await W(() => { const W = window.__W; const o = W.S.orders['WS-10428']; const a = o.pending.find((x) => x.kind === 'k_offer'); if (a) W.ACT['cue-do']({ id: o.id, k: 'k_offer' }); let n = 0; while (n++ < 40) { if (o.cap && o.cap.phase === 'at_customer') break; const p = o.pending.find((x) => x.role === 'captain'); if (p && p.kind === 'k_pickup') { W.ACT['cue-do']({ id: o.id, k: p.kind }); continue; } if (!W.skipAhead()) break; } const n2 = W.S.nav.captain; n2.tab = 'home'; n2.stacks.home = [{ s: 'k_home' }, { s: 'k_trip', id: o.id }]; W.S.toast = null; W.requestRender(); });
  await h.wait(400); await snap('11-captain-delivery');
  // desks on the flagship world
  await W(() => { const W = window.__W; W.S.set.role = 'ops'; W.S.pickScn = 'B'; W.S.dialog = null; W.ACT['scn-start'](); if (W.S.dialog) W.ACT['scn-start-do']({}); let n = 0; while (n++ < 60) { if (!W.skipAhead()) break; } W.S.set.role = 'support'; const t = Object.keys(W.S.tickets)[0]; W.S.nav.support.view = 'tickets'; W.S.nav.support.sel = t; W.S.toast = null; W.requestRender(); });
  await h.wait(400); await snap('12-support-ticket');
  await W(() => { const W = window.__W; W.S.set.role = 'ops'; W.S.nav.ops.view = 'incidents'; W.requestRender(); }); await snap('13-ops');
  await W(() => { const W = window.__W; W.S.set.role = 'finance'; W.S.nav.finance.view = 'orders'; W.requestRender(); }); await snap('14-finance');
  await W(() => { const W = window.__W; W.S.review.center = true; W.requestRender(); }); await snap('15-review-center');
  await W(() => { const W = window.__W; W.S.review.center = false; W.S.set.role = 'customer'; W.S.set.review = true; W.requestRender(); }); await snap('16-customer-review-mode');
};
