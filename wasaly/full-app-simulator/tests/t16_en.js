const { skipOnboarding } = require('./lib');
module.exports = async (h) => {
  const tag = h.W >= 1180 ? 'w' : 'n';
  await h.load(); await skipOnboarding(h);
  await h.ev(() => { window.__W.S.set.lang = 'en'; window.__W.requestRender(); }); await h.wait(400);
  const snap = async (name) => { await h.shot(`en-${tag}-${name}`, { wait: 380 }); const o = await h.overflow(); if (o.length) h.log(name, 'OVERFLOW', o.slice(0, 6)); };
  await snap('home');
  await h.act('c-open-merchant', { id: 'm1' }); await snap('merchant');
  await h.act('c-open-product', { id: 'p101' }); await snap('product');
  await h.ev(() => { const W = window.__W; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 40) { const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.role === 'customer')) break; if (!W.skipAhead()) break; } W.S.toast = null; W.requestRender(); });
  await snap('track');
  await h.ev(() => { const W = window.__W; W.S.set.role = 'ops'; W.S.nav.ops.view = 'live'; W.requestRender(); }); await snap('ops');
  await h.ev(() => { const W = window.__W; W.S.review.center = true; W.requestRender(); }); await snap('rc');
  await h.ev(() => { const W = window.__W; W.S.review.center = false; W.S.set.role = 'captain'; W.requestRender(); }); await snap('captain');
  // map labels must follow language
  const mapTxt = await h.ev(() => Array.from(document.querySelectorAll('svg text')).slice(0, 6).map((t) => t.textContent));
  h.log('map labels', mapTxt);
};
