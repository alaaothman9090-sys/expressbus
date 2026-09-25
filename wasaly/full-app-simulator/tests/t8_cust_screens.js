// visit every customer screen at phone size, screenshot + overflow check
const { skipOnboarding, placeOrder, advance } = require('./lib');
module.exports = async (h) => {
  await h.load(); await skipOnboarding(h);
  const nav = async (s, params = {}, tab = 'home') => { await h.ev(([s, p, t]) => { const W = window.__W; const n = W.S.nav.customer; n.tab = t; n.stacks[t] = n.stacks[t].slice(0, 1); if (s !== n.stacks[t][0].s) n.stacks[t].push(Object.assign({ s }, p)); W.S.sheet = null; W.requestRender(); }, [s, params, tab]); await h.wait(420); };
  const snap = async (name) => { await h.shot('cs-' + name, { wait: 380 }); const o = await h.overflow(); if (o.length) h.log(name, 'OVERFLOW', o.slice(0, 6)); };
  await nav('explore', {}, 'explore'); await snap('explore');
  await h.fill('[data-bind="c-q"]', 'كفتة').catch(() => h.log('no search input')); await snap('explore-q');
  await nav('cat', { id: 'pharmacy' }); await snap('cat-pharmacy');
  await nav('cat', { id: 'food' }); await snap('cat-food');
  await nav('merchant', { id: 'm2' }); await snap('merchant-m2');
  await h.ev(() => { const s = document.querySelector('.scr'); s.scrollTop = 600; }); await snap('merchant-m2-scroll');
  await h.act('c-open-product', { id: await h.ev(() => document.querySelector('[data-act="c-open-product"]').dataset.id) }); await snap('product-m2');
  await h.act('c-add', {}, { soft: true }); await h.wait(300);
  await nav('cart'); await snap('cart');
  await nav('recipient'); await snap('recipient');
  await nav('schedule'); await snap('schedule');
  await nav('checkout'); await snap('checkout');
  await nav('payment'); await snap('payment');
  await h.act('c-pay', { v: 'card' }, { soft: true }); await snap('payment-card');
  await nav('orders', {}, 'orders'); await snap('orders-empty');
  await nav('assistant', {}, 'assistant'); await snap('assistant');
  await nav('account', {}, 'account'); await snap('account');
  for (const s of ['addresses', 'paymethods', 'favorites', 'offers', 'notifs', 'settings', 'privacy']) { await nav(s, {}, 'account'); await snap(s); }
  await nav('help', {}, 'account'); await snap('help');
  // order + post-delivery screens
  await nav('home', {}, 'home');
  // adding from another store while the cart has items → conflict sheet
  await h.act('c-open-merchant', { id: 'm1' }); await h.act('c-open-product', { id: 'p101' }); await h.act('c-add'); await snap('cart-conflict');
  await h.ev(() => { const W = window.__W; W.S.sheet = null; W.S.cust.cart = { mid: null, lines: [], note: '', promo: '', extra: [] }; W.requestRender(); }); await h.wait(300);
  await nav('home', {}, 'home');
  await placeOrder(h);
  await h.ev(() => { const W = window.__W; let n = 0; while (n++ < 60) { const o = W.S.orders['WS-10428']; if (o.st === 'delivered' || o.st === 'completed') break; const p = o.pending.find((a) => a.role === 'customer'); if (p) { W.ACT['cue-do']({ id: o.id, k: p.kind }); continue; } if (!W.skipAhead()) break; } W.requestRender(); });
  await h.wait(400);
  const st = await h.ev(() => window.__W.S.orders['WS-10428'].st); h.log('order state', st);
  await nav('receipt', { id: 'WS-10428' }, 'orders'); await snap('receipt');
  await nav('rate', { id: 'WS-10428' }, 'orders'); await snap('rate');
  await nav('orders', {}, 'orders'); await snap('orders');
  await nav('help', { id: 'WS-10428' }, 'orders'); await snap('help-order');
  await nav('complaint', { id: 'WS-10428', k: 'food_safety' }, 'orders'); await snap('complaint');
};
