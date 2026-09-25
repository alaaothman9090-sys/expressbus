const { where, role, advance } = require('./lib');
const st = (h) => h.ev(() => { const o = window.__W.S.orders['WS-10428']; if (!o) return 'no order'; return `t=${Math.round(window.__W.now())} st=${o.st} label=${o.label || '-'} kid=${o.kid} cap=${o.cap ? o.cap.phase : '-'} pend=[${o.pending.map((a) => a.role + ':' + a.kind).join(',')}] gate=${o.gate ? o.gate.fdr : '-'} cnd=${o.cnd ? JSON.stringify(o.cnd).slice(0, 120) : '-'} sim=${JSON.stringify(o.sim)} pay=${JSON.stringify(o.pay).slice(0, 120)}`; });
const runUntil = async (h, pred, max = 40) => { for (let i = 0; i < max; i++) { const o = await h.order('WS-10428'); if (pred(o)) return true; const ok = await h.ev(() => window.__W.skipAhead()); if (!ok) return false; } return false; };
module.exports = async (h) => {
  await h.load();
  await h.ev(() => { window.__W.S.pickScn = 'B'; window.__W.ACT['scn-start'](); });
  await h.wait(400);
  await runUntil(h, (o) => o.pending.some((a) => a.kind === 'c_handover'));
  await h.ev(() => window.__W.requestRender()); await h.wait(400);
  h.log('AT DOOR', await st(h)); await h.shot('b02-customer-at-door');
  // use the cue to play the scripted step
  await h.act('cue-do'); h.log('after cue', await st(h)); await h.shot('b03-customer-refused');
  await runUntil(h, (o) => o.pending.some((a) => a.role === 'ops') || !!o.cnd, 10);
  await h.ev(() => window.__W.requestRender()); await h.wait(300);
  h.log('AFTER REPORT', await st(h)); await h.shot('b04-customer-after-report');
  await role(h, 'captain'); await h.shot('b05-captain');
  await role(h, 'ops'); await h.shot('b06-ops');
  await h.act('desk-view', { role: 'ops', v: 'incidents' }); await h.shot('b07-ops-incidents');
  // independent call
  await h.act('ops-call', { id: 'WS-10428' }); await h.wait(1200); h.log('after call', await st(h)); await h.shot('b08-ops-after-call');
  const hypos = await h.ev(() => Array.from(document.querySelectorAll('[data-act="ops-hypo"]')).map((b) => b.dataset.v)); h.log('hypos', hypos);
  if (hypos.length) { await h.act('ops-hypo', { id: 'WS-10428', v: hypos[0] }); }
  h.log('after hypo', await st(h)); await h.shot('b09-ops-gate');
  // compare
  await h.act('compare-open', { fdr: 'FDR-0001', id: 'WS-10428' }, { soft: true }); await h.shot('b10-compare');
  const opts = await h.ev(() => Array.from(document.querySelectorAll('[data-act="compare-try"]')).map((b) => b.dataset.k)); h.log('compare options', opts);
  await h.p.evaluate(() => { const d = document.querySelector('#overlays .drawer-body, #overlays .cmp-body, #overlays [role=dialog]'); if (d) d.scrollTop = 900; }); await h.shot('b11-compare-scrolled');
  if (opts.length) { await h.act('compare-try', { k: opts[0] }); }
  h.log('after try', await st(h)); await h.shot('b12-after-try');
  await role(h, 'customer'); await h.shot('b13-customer-after');
  await role(h, 'finance'); await h.shot('b14-finance');
  await role(h, 'support'); await h.shot('b15-support');
  await h.act('panel', { v: 'money' }); await h.shot('b16-money');
  await h.act('panel', { v: 'journey' }); await h.shot('b17-journey');
};
