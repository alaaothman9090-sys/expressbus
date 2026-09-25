// axe-core scan over representative states
const fs = require('fs'); const path = require('path');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const { skipOnboarding } = require('./lib');
module.exports = async (h) => {
  await h.load();
  const scan = async (name) => {
    await h.wait(450);
    const res = await h.ev(async (src) => { if (!window.axe) { const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); }
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 3).map((x) => x.target.join(' ') + ' :: ' + (x.failureSummary || '').split('\n').slice(0, 2).join(' ')) })); }, AXE);
    h.log(`== ${name}: ${res.length} rule violations`);
    res.forEach((v) => h.log(`  [${v.impact}] ${v.id} ×${v.n} — ${v.help}\n     ${v.sample.join('\n     ')}`));
  };
  await scan('splash');
  await skipOnboarding(h); await scan('home');
  await h.act('c-open-merchant', { id: 'm1' }); await scan('merchant');
  await h.act('c-open-product', { id: 'p101' }); await scan('product-sheet');
  await h.ev(() => { const W = window.__W; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 40) { const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.role === 'customer')) break; if (!W.skipAhead()) break; } W.S.toast = null; W.requestRender(); });
  await scan('track-at-door');
  await h.ev(() => { const W = window.__W; W.S.set.role = 'ops'; W.S.nav.ops.view = 'incidents'; W.requestRender(); }); await scan('ops-incidents');
  await h.ev(() => { const W = window.__W; W.S.review.center = true; W.requestRender(); }); await scan('review-center');
  await h.ev(() => { const W = window.__W; W.S.review.center = false; W.S.set.theme = 'dark'; W.S.set.role = 'customer'; W.S.set.review = true; W.requestRender(); }); await scan('dark-review');
};
