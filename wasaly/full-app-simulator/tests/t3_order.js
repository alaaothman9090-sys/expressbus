const { skipOnboarding, where } = require('./lib');
module.exports = async (h) => {
  await h.load(); await skipOnboarding(h);
  await h.shot('o01-home');
  await h.act('c-open-merchant', { id: 'm1' }); h.log(await where(h)); await h.shot('o02-merchant');
  // open first product with options
  const pid = await h.ev(() => { const b = document.querySelector('[data-act="c-open-product"]'); return b && b.dataset.id; }); h.log('first product', pid);
  await h.act('c-open-product', { id: pid }); h.log(await where(h)); await h.shot('o03-product');
  await h.act('c-add'); h.log(await where(h)); await h.shot('o04-added');
  await h.act('c-go', { s: 'cart' }, { soft: true }); if (!(await where(h)).includes('cart')) await h.click('.cartbar'); h.log(await where(h)); await h.shot('o05-cart');
  await h.act('c-go', { s: 'checkout' }); h.log(await where(h)); await h.shot('o06-checkout');
  await h.p.evaluate(() => { const s = document.querySelector('.scr'); s.scrollTop = s.scrollHeight; }); await h.shot('o07-checkout-bottom');
  h.log(await h.overflow());
  const blockers = await h.ev(() => Array.from(document.querySelectorAll('.blocker, .banner')).map((b) => b.textContent.trim().slice(0, 80)));
  h.log('banners', blockers);
  await h.act('c-place'); await h.wait(800); h.log(await where(h)); await h.shot('o08-placed');
  const S = await h.S(); h.log('orders', S.orders.map ? S.orders.map((o) => o.id + ':' + o.st) : Object.keys(S.orders));
};
