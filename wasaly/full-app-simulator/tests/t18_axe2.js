const fs = require('fs'); const path = require('path');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
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
  const setRole = (r, extra) => h.ev(([r, extra]) => { const W = window.__W; W.S.set.role = r; if (extra) Object.assign(W.S.nav[r], extra); W.S.toast = null; W.requestRender(); }, [r, extra || null]);
  await h.ev(() => { const W = window.__W; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 60) { if (!W.skipAhead()) break; } W.requestRender(); });
  for (const [r, views] of Object.entries({ merchant: [null], captain: [null], support: ['tickets', 'templates'], ops: ['live', 'incidents', 'map', 'log'], finance: ['orders', 'recon', 'model'], admin: ['flags', 'values', 'roles', 'audit'] })) {
    for (const v of views) { await setRole(r, v ? { view: v } : null); await scan(`${r}${v ? ':' + v : ''}`); }
  }
  await h.ev(() => { const W = window.__W; W.S.set.mobileSheet = 'panel'; W.S.set.panel = 'money'; W.requestRender(); }); await scan('mobile-panel-money');
  await h.ev(() => { const W = window.__W; W.S.set.panel = 'controls'; W.requestRender(); }); await scan('mobile-panel-controls');
  await h.ev(() => { const W = window.__W; W.S.set.mobileSheet = null; W.S.compare = { fdr: 'FDR-0001', id: 'WS-10428' }; W.requestRender(); }); await scan('compare');
};
