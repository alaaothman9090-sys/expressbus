const { skipOnboarding } = require('./lib');
module.exports = async (h) => {
  await h.load(); await skipOnboarding(h);
  await h.act('c-open-merchant', { id: 'm2' });
  await h.act('c-open-product', { id: 'p201' });
  const wide = await h.ev(() => { const d = document.querySelector('.pdetail'); const out = []; d.querySelectorAll('*').forEach((el) => { const r = el.getBoundingClientRect(); const pr = d.getBoundingClientRect(); if (r.right > pr.right + 1 || r.left < pr.left - 1) out.push(el.tagName + '.' + el.className.baseVal === undefined ? '' : el.tagName + '.' + (el.className.baseVal ?? el.className) + ' ' + Math.round(r.left) + '..' + Math.round(r.right) + ' vs ' + Math.round(pr.left) + '..' + Math.round(pr.right)); }); return out.slice(0, 12); });
  h.log(wide);
  await h.shot('dbg-product');
  await h.act('c-add');
  await h.ev(() => { window.__cb = document.querySelector('.cartbar'); window.__rep = 0; const mo = new MutationObserver(() => { const n = document.querySelector('.cartbar'); if (n !== window.__cb) { window.__rep++; window.__cb = n; } }); mo.observe(document.body, { subtree: true, childList: true }); });
  await h.wait(2000);
  h.log('cartbar replaced', await h.ev(() => window.__rep));
};
