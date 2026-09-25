module.exports = async (h) => {
  await h.load();
  const where = async () => h.ev(() => { const S = window.__W.S; const n = S.nav.customer; const st = n.stacks[n.tab]; return S.cust.stage + '/' + S.cust.onb + ' tab=' + n.tab + ' top=' + (st && st[st.length - 1].s); });
  await h.shot('c01-splash');
  await h.act('c-onb-start'); h.log(await where()); await h.shot('c02-lang');
  await h.act('c-onb-next'); h.log(await where()); await h.shot('c03-slide1');
  await h.act('c-onb-next'); await h.shot('c04-slide2');
  await h.act('c-onb-next'); await h.shot('c05-slide3');
  await h.act('c-onb-next'); h.log(await where()); await h.shot('c06-perm');
  await h.act('c-perm', { v: 'granted' }); await h.wait(1200); h.log(await where()); await h.shot('c07-locate');
  // landmark input
  if (await h.has('[data-bind="c-landmark"]')) await h.fill('[data-bind="c-landmark"]', 'جنب مسجد النور');
  await h.act('c-loc-confirm'); await h.wait(1300); h.log(await where()); await h.shot('c08-service');
  await h.act('c-service-ok', {}, { soft: true }); h.log(await where()); await h.shot('c09-login');
  await h.act('c-demo-phone', {}, { soft: true }); await h.shot('c10-login-filled');
  await h.act('c-send-code', {}, { soft: true }); await h.wait(700); h.log(await where()); await h.shot('c11-verify');
  const inputs = await h.p.locator('input').filter({ visible: true }).count(); h.log('inputs on verify', inputs);
  if (await h.has('[data-bind="c-code"]')) await h.fill('[data-bind="c-code"]', '4827');
  await h.shot('c12-verify-filled');
  await h.act('c-verify', {}, { soft: true }); await h.wait(900); h.log(await where()); await h.shot('c13-home');
  h.log(await h.overflow());
};
