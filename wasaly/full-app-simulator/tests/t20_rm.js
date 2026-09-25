const { skipOnboarding } = require('./lib');
module.exports = async (h) => {
  await h.load();
  const anim = () => h.ev(() => { const out = {}; for (const sel of ['.splash::before', '.splash-thread .st-path', '.scr', '.rings i', '.cartbar', '.toast', '.pdetail-media svg']) { const [s, pseudo] = sel.split('::'); const el = document.querySelector(s); if (!el) continue; const cs = getComputedStyle(el, pseudo ? '::' + pseudo : null); out[sel] = cs.animationName + ' ' + cs.animationDuration + ' ' + cs.animationIterationCount; } return out; });
  h.log('splash', await anim());
  await skipOnboarding(h);
  await h.act('c-open-merchant', { id: 'm1' }); await h.act('c-open-product', { id: 'p101' });
  h.log('product', await anim());
  await h.ev(() => { const W = window.__W; W.S.pickScn = 'A'; W.ACT['scn-start'](); W.S.set.role = 'merchant'; W.requestRender(); }); await h.wait(400);
  h.log('merchant', await anim());
};
