const { skipOnboarding } = require('./lib');
const fillCart = (h) => h.ev(() => { const W = window.__W; W.S.cust.cart = { mid: 'm1', lines: [{ pid: 'p101', qty: 1, opts: { size: 'q', add: [] }, note: '', unitSeen: 95 }], note: '', promo: '', extra: [] }; const n = W.S.nav.customer; n.tab = 'home'; n.stacks.home = [{ s: 'home' }, { s: 'cart' }, { s: 'checkout' }]; W.requestRender(); }).then(() => h.wait(450));
module.exports = async (h) => {
  await h.load(); await skipOnboarding(h);
  const snap = (n) => h.shot('nc-' + n, { wait: 350 });
  const setNet = (v) => h.ev((v) => { window.__W.S.set.network = v; window.__W.requestRender(); }, v);
  // offline
  await fillCart(h); await setNet('offline'); await h.wait(300);
  h.log('offline: place disabled =', await h.ev(() => document.querySelector('[data-act="c-place"]').disabled), 'blocker:', await h.ev(() => (document.querySelector('.banner') || {}).textContent)); await snap('offline');
  // error 500
  await setNet('error'); await h.act('c-place'); await h.wait(1200); h.log('500 dialog:', await h.ev(() => window.__W.S.dialog && window.__W.S.dialog.title)); await snap('error500');
  await setNet('good'); await h.act('dialog-retry', {}, { soft: true }); await h.wait(800); h.log('after retry orders:', await h.ev(() => Object.keys(window.__W.S.orders)));
  // slow: busy state visible
  await fillCart(h); await setNet('slow'); await h.wait(400); await snap('before-slow');
  h.log('where', await h.ev(() => { const n = window.__W.S.nav.customer; const s = n.stacks[n.tab]; return n.tab + ':' + s.map((x) => x.s).join('>') + ' sheet=' + (window.__W.S.sheet && window.__W.S.sheet.kind) + ' dialog=' + (window.__W.S.dialog && window.__W.S.dialog.title); }));
  await h.act('c-place'); await h.wait(500);
  h.log('slow busy:', await h.ev(() => !!document.querySelector('[data-act="c-place"][aria-busy="true"]'))); await snap('slow-busy');
  // double tap during slow request must not duplicate
  await h.ev(() => { const b = document.querySelector('[data-act="c-place"]'); if (b) b.click(); });
  await h.wait(2600); h.log('orders after slow + double tap:', await h.ev(() => Object.keys(window.__W.S.orders)));
  // timeout: ambiguous → dup dialog
  await fillCart(h); await setNet('timeout'); await h.act('c-place'); await h.wait(3600);
  h.log('timeout dialog:', await h.ev(() => window.__W.S.dialog && window.__W.S.dialog.title), 'orders', await h.ev(() => Object.keys(window.__W.S.orders))); await snap('timeout');
  await h.click('#overlays [data-act="c-place-dup"]', { soft: true }); await h.wait(400);
  h.log('after send again:', await h.ev(() => Object.keys(window.__W.S.orders))); await snap('dup');
  await setNet('good');
  // chat + call from tracking
  await h.ev(() => { const W = window.__W; const id = Object.keys(W.S.orders)[0]; const o = W.S.orders[id]; let n = 0; while (n++ < 30) { if (o.kid) break; if (!W.skipAhead()) break; } const nv = W.S.nav.customer; nv.tab = 'orders'; nv.stacks.orders = [{ s: 'orders' }, { s: 'track', id }]; W.requestRender(); }).then(() => h.wait(450));
  await h.wait(400);
  await h.act('c-chat', {}, { soft: true }); await snap('chat');
  const q = await h.ev(() => Array.from(document.querySelectorAll('[data-act="chat-quick"]')).map((b) => b.textContent.trim()).slice(0, 4)); h.log('quick replies', q);
  if (q.length) await h.act('chat-quick', {}, { soft: true });
  await h.wait(2500); await snap('chat-reply');
  h.log('chat msgs:', await h.ev(() => Array.from(document.querySelectorAll('.chat-msg, .msg')).map((m) => m.textContent.trim().slice(0, 40))));
  await h.ev(() => { window.__W.S.sheet = null; window.__W.requestRender(); }); await h.wait(300);
  await h.act('c-call', {}, { soft: true }); await snap('call'); await h.wait(2500); await snap('call-2');
};
