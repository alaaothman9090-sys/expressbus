const { role } = require('./lib');
module.exports = async (h) => {
  await h.load();
  const snap = async (name) => { await h.shot('mk-' + name, { wait: 380 }); const o = await h.overflow(); if (o.length) h.log(name, 'OVERFLOW', o.slice(0, 6)); };
  const st = () => h.ev(() => { const o = window.__W.S.orders['WS-10428']; return o ? `${o.st} cap=${o.cap ? o.cap.phase : '-'} pend=[${o.pending.map((a) => a.role + ':' + a.kind).join(',')}]` : 'none'; });
  // merchant: start scenario A as the merchant (store logs in fresh)
  await h.ev(() => { const W = window.__W; W.S.set.role = 'merchant'; W.S.pickScn = 'A'; W.ACT['scn-start'](); W.S.nav.merchant.loggedIn = false; W.requestRender(); });
  await h.wait(500); await snap('m-login');
  await h.act('m-acct', { v: 'staff' }, { soft: true }); await snap('m-login-staff');
  await h.act('m-acct', { v: 'owner' }, { soft: true });
  await h.act('m-login'); await snap('m-orders-incoming'); h.log('A1', await st());
  await h.act('m-accept', { id: 'WS-10428' }); await h.wait(600); h.log('A2', await st()); await snap('m-order-accepted');
  await h.act('m-go', { s: 'm_order', id: 'WS-10428' }, { soft: true }); await snap('m-order-detail');
  await h.act('m-start', { id: 'WS-10428' }, { soft: true }); h.log('A3', await st()); await snap('m-order-preparing');
  await h.act('m-extend', { id: 'WS-10428' }, { soft: true });
  await h.act('m-ready', { id: 'WS-10428' }, { soft: true }); await h.wait(600); h.log('A4', await st()); await snap('m-order-ready');
  await h.act('m-back', {}, { soft: true }) || await h.act('back', {}, { soft: true });
  for (const t of ['catalog', 'money', 'store']) { await h.act('tab', { role: 'merchant', tab: t }); await snap('m-' + t); }
  // captain
  await role(h, 'captain'); await snap('k-home');
  await h.ev(() => { let n = 0; const W = window.__W; while (n++ < 20) { const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.role === 'captain')) break; if (!W.skipAhead()) break; } W.requestRender(); });
  h.log('K1', await st()); await snap('k-offer-or-trip');
  const hasAccept = await h.has('[data-act="k-accept"]'); if (hasAccept) { await h.act('k-accept'); await h.wait(600); }
  h.log('K2', await st()); await snap('k-trip');
  await h.ev(() => { let n = 0; const W = window.__W; while (n++ < 20) { const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.kind === 'k_pickup')) break; if (!W.skipAhead()) break; } W.requestRender(); });
  h.log('K3', await st()); await snap('k-at-merchant');
  await h.act('k-pickup', {}, { soft: true }); await h.wait(700); h.log('K4', await st()); await snap('k-to-customer');
  await h.ev(() => { let n = 0; const W = window.__W; while (n++ < 20) { const o = W.S.orders['WS-10428']; if (o.cap && o.cap.phase === 'at_customer') break; if (!W.skipAhead()) break; } W.requestRender(); });
  h.log('K5', await st()); await snap('k-at-customer');
  await h.ev(() => { const s = document.querySelector('.scr'); s.scrollTop = s.scrollHeight; }); await snap('k-at-customer-bottom');
  // cannot-deliver sheet (just open it)
  await h.act('k-problem', {}, { soft: true }); await snap('k-problem-sheet');
  await h.ev(() => { window.__W.S.sheet = null; window.__W.requestRender(); }); await h.wait(250);
  // enter code and deliver
  const code = await h.ev(() => window.__W.S.orders['WS-10428'].code);
  if (await h.has('[data-bind="k-code"]')) await h.fill('[data-bind="k-code"]', code);
  await snap('k-code-filled');
  await h.act('k-deliver', {}, { soft: true }); await h.wait(800); h.log('K6', await st()); await snap('k-delivered');
  await h.act('k-back', {}, { soft: true }); await snap('k-home-after');
  for (const t of ['trips', 'earnings', 'custody', 'account']) { await h.act('tab', { role: 'captain', tab: t }, { soft: true }); await snap('k-' + t); }
};
