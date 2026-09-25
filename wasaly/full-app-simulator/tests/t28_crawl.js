// click every visible control in representative states; restore state after each click; report crashes
module.exports = async (h) => {
  await h.load();
  const states = [
    ['home', () => { const W = window.__W; W.S.cust.stage = 'app'; W.S.set.role = 'customer'; }],
    ['merchant-page', () => { const W = window.__W; W.S.cust.stage = 'app'; const n = W.S.nav.customer; n.tab = 'home'; n.stacks.home = [{ s: 'home' }, { s: 'merchant', id: 'm1' }]; }],
    ['flag-door', () => { const W = window.__W; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 40) { const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.role === 'customer')) break; if (!W.skipAhead()) break; } }],
    ['flag-ops', () => { const W = window.__W; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 60) { if (!W.skipAhead()) break; } W.S.set.role = 'ops'; W.S.nav.ops.view = 'incidents'; }],
    ['merchant-incoming', () => { const W = window.__W; W.S.pickScn = 'A'; W.ACT['scn-start'](); W.S.set.role = 'merchant'; }],
    ['captain-offer', () => { const W = window.__W; W.S.pickScn = 'A'; W.ACT['scn-start'](); W.S.set.role = 'captain'; let n = 0; while (n++ < 30) { const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.kind === 'k_offer')) break; if (!W.skipAhead()) break; } }],
    ['support-ticket', () => { const W = window.__W; W.S.pickScn = 'Q'; W.ACT['scn-start'](); let n = 0; while (n++ < 60) { if (!W.skipAhead()) break; } W.S.set.role = 'support'; W.S.nav.support.sel = Object.keys(W.S.tickets)[0]; }],
    ['finance-recon', () => { const W = window.__W; W.S.pickScn = 'N'; W.ACT['scn-start'](); let n = 0; while (n++ < 60) { if (!W.skipAhead()) break; } W.S.set.role = 'finance'; W.S.nav.finance.view = 'recon'; }],
    ['admin-flags', () => { const W = window.__W; W.S.set.role = 'admin'; W.S.nav.admin.view = 'flags'; }],
    ['risk-signals', () => { const W = window.__W; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 60) { if (!W.skipAhead()) break; } W.S.set.role = 'risk'; }],
    ['recipient-door', () => { const W = window.__W; W.S.pickScn = 'X'; W.ACT['scn-start'](); W.S.set.role = 'recipient'; let n = 0; while (n++ < 40) { const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.role === 'recipient')) break; if (!W.skipAhead()) break; } }],
  ];
  const skip = new Set(['reset-do', 'scn-start-do', 'noop']);
  let total = 0; const problems = [];
  for (const [name, setup] of states) {
    await h.ev((src) => { const W = window.__W; W.S.dialog = null; W.S.sheet = null; (0, eval)('(' + src + ')')(); W.S.dialog = null; W.S.toast = null; W.renderAll(); }, setup.toString());
    await h.wait(300);
    const res = await h.ev((skipArr) => {
      const W = window.__W; const skip = new Set(skipArr); const out = { clicked: 0, errs: [] };
      const snap = JSON.stringify(W.S);
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
      const targets = Array.from(document.querySelectorAll('[data-act]')).filter((el) => vis(el) && !el.disabled && !skip.has(el.dataset.act)).slice(0, 120);
      const sig = targets.map((el) => ({ act: el.dataset.act, data: Object.assign({}, el.dataset), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30) }));
      for (const t of sig) {
        try {
          W.S = JSON.parse(snap); W.renderAll();
          const sel = '[data-act="' + t.act + '"]' + Object.entries(t.data).filter(([k]) => k !== 'act').map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${String(v).replace(/"/g, '\\"')}"]`).join('');
          const el = Array.from(document.querySelectorAll(sel)).find(vis);
          if (!el) continue;
          el.click(); W.renderAll(); out.clicked++;
        } catch (e) { out.errs.push(`${t.act} «${t.label}»: ${String(e && e.message || e).slice(0, 160)}`); }
      }
      W.S = JSON.parse(snap); W.renderAll();
      return out;
    }, [...skip]);
    total += res.clicked; if (res.errs.length) problems.push(`${name}: ${res.errs.join(' | ')}`);
    h.log(`${name}: clicked ${res.clicked}${res.errs.length ? ' ERRORS ' + res.errs.length : ''}`);
    await h.wait(1200); // let pending timers (net delays) fire against the restored state
  }
  h.log('TOTAL CLICKED', total); if (problems.length) h.log(problems.join('\n'));
};
