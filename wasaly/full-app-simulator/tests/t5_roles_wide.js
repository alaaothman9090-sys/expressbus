const { skipOnboarding, where, role, placeOrder, advance } = require('./lib');
module.exports = async (h) => {
  await h.load(); await skipOnboarding(h);
  await h.shot('w01-home');
  await placeOrder(h);
  await h.act('c-track', {}, { soft: true }); await h.shot('w02-track');
  // switch to merchant with user control: set autopilot off first
  await h.ev(() => { window.__W.S.set.autopilot = false; window.__W.requestRender(); });
  await role(h, 'merchant'); await h.shot('w03-merchant-login');
  h.log(await where(h, 'merchant'));
  const S = await h.S(); h.log('merchant loggedIn', S.nav.merchant.loggedIn);
  for (const tab of ['state', 'policy', 'money', 'journey', 'notes']) { await h.act('panel', { v: tab }); await h.shot('w04-panel-' + tab); }
  h.log(await h.overflow());
};
