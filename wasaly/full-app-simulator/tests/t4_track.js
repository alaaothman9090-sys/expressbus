const { skipOnboarding, where, role } = require('./lib');
module.exports = async (h) => {
  await h.load(); await skipOnboarding(h);
  await h.act('c-open-merchant', { id: 'm1' });
  await h.act('c-open-product', { id: 'p101' }); await h.act('c-add');
  await h.click('.cartbar'); await h.act('c-go', { s: 'checkout' }); await h.act('c-place'); await h.wait(900);
  await h.act('c-track', {}, { soft: true }); h.log(await where(h)); await h.shot('tr01-track-placed');
  // let autopilot run: merchant accepts etc
  for (const m of [2, 3, 5, 10, 15]) { await h.skip(m); const o = await h.order('WS-10428'); h.log('+' + m, o.st, 'kid', o.kid, 'offer', o.offer && o.offer.kid, 'pending', o.pending.map((a) => a.role + ':' + a.kind).join(',')); }
  await h.shot('tr02-track-mid');
  await h.p.evaluate(() => { const s = document.querySelector('.scr'); s.scrollTop = 500; }); await h.shot('tr03-track-scrolled');
  for (const m of [5, 5, 10]) { await h.skip(m); const o = await h.order('WS-10428'); h.log('+' + m, o.st, 'phase', o.phase, 'pending', o.pending.map((a) => a.role + ':' + a.kind).join(',')); }
  await h.p.evaluate(() => { const s = document.querySelector('.scr'); s.scrollTop = 0; }); await h.shot('tr04-track-late');
  h.log(await h.overflow());
};
