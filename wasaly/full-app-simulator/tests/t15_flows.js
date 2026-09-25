// play scenarios through the real UI of the role that must act
const start = (h, id, role) => h.ev(([id, role]) => { const W = window.__W; W.S.set.role = role; W.S.pickScn = id; W.S.dialog = null; W.ACT['scn-start'](); if (W.S.dialog && W.S.dialog.confirm) W.ACT['scn-start-do']({}); W.S.set.role = role; W.S.toast = null; W.requestRender(); }, [id, role]);
const runUntil = (h, kinds, max = 60) => h.ev(([kinds, max]) => { const W = window.__W; let n = 0; while (n++ < max) { const o = W.S.orders['WS-10428']; if (o && o.pending.some((a) => kinds.includes(a.kind))) return true; if (o && !['placed','accepted','preparing','ready','picked_up','in_transit','reattempt'].includes(o.st)) return false; if (!W.skipAhead()) return false; } return false; }, [kinds, max]);
const drain = (h) => h.ev(() => { const W = window.__W; let n = 0; while (n++ < 80) { if (!W.skipAhead()) break; } W.requestRender(); });
const st = (h) => h.ev(() => { const o = window.__W.S.orders['WS-10428']; if (!o) return 'none'; const W = window.__W; return `${o.st}${o.label ? '/' + o.label : ''} cap=${o.cap ? o.cap.phase : '-'} pay=${o.pay.state}${o.pay.collected != null ? ':' + o.pay.collected : ''} total=${o.total} refund=${o.refund ? JSON.stringify(o.refund).slice(0, 90) : '-'} pend=[${o.pending.map((a) => a.role + ':' + a.kind).join(',')}] tickets=${Object.values(W.S.tickets).map((t) => t.id + ':' + t.kind + ':' + t.status).join(',')}`; });
const shot = (h, n) => h.shot('fl-' + n, { wait: 350 });
module.exports = async (h) => {
  await h.load();
  // F: item out → customer removes it
  await start(h, 'F', 'customer'); await runUntil(h, ['c_sub']); await h.ev(() => window.__W.requestRender()); await h.wait(300); await shot(h, 'F-choice');
  await h.act('c-sub', { v: 'remove' }); await drain(h); h.log('F remove →', await st(h)); await shot(h, 'F-after');
  // G: merchant late → customer cancels free
  await start(h, 'G', 'customer'); await runUntil(h, ['c_late']); await h.ev(() => window.__W.requestRender()); await h.wait(300); await shot(h, 'G-choice');
  await h.act('c-late', { v: 'cancel' }, { soft: true }); await h.wait(300); h.log('G cancel →', await st(h)); await shot(h, 'G-after');
  // L: not home → coming
  await start(h, 'L', 'customer'); await runUntil(h, ['c_nothome', 'c_handover']); await h.ev(() => { const W = window.__W; const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.kind === 'c_handover')) W.ACT['c-door']({ id: o.id, v: 'not_home' }); W.requestRender(); }); await h.wait(300); await shot(h, 'L-choice');
  await h.act('c-nothome', { v: 'coming' }, { soft: true }); await runUntil(h, ['c_handover']); await h.ev(() => window.__W.requestRender()); await h.wait(300); h.log('L coming →', await st(h)); await shot(h, 'L-coming');
  await h.act('c-handover', {}, { soft: true }); await drain(h); h.log('L handover →', await st(h));
  // M: change problem → ops fixes
  await start(h, 'M', 'ops'); await runUntil(h, ['o_change']); await h.ev(() => { const W = window.__W; W.S.nav.ops.view = 'incidents'; W.requestRender(); }); await h.wait(300); await shot(h, 'M-ops');
  const chg = await h.ev(() => Array.from(document.querySelectorAll('[data-act="ops-change"]')).map((b) => b.dataset.v)); h.log('M options', chg);
  if (chg.length) await h.act('ops-change', { v: chg[0] }); await drain(h); h.log('M fix →', await st(h));
  // K: breakdown → ops transfer
  await start(h, 'K', 'ops'); await runUntil(h, ['o_transfer']); await h.ev(() => { const W = window.__W; W.S.nav.ops.view = 'incidents'; W.requestRender(); }); await h.wait(300); await shot(h, 'K-ops');
  await h.act('ops-transfer', {}, { soft: true }); await drain(h); h.log('K transfer →', await st(h));
  // J: captain cancels after accepting
  await start(h, 'J', 'ops'); await drain(h); h.log('J →', await st(h));
  // I: captain rejects
  await start(h, 'I', 'ops'); await drain(h); h.log('I →', await st(h));
  // H: merchant closes → customer
  await start(h, 'H', 'customer'); await drain(h); h.log('H →', await st(h)); await shot(h, 'H-customer');
  // N: cash mismatch → finance recon
  await start(h, 'N', 'finance'); await drain(h); await h.ev(() => { const W = window.__W; W.S.nav.finance.view = 'recon'; W.requestRender(); }); await h.wait(300); h.log('N →', await st(h)); await shot(h, 'N-finance');
  const recon = await h.ev(() => Array.from(document.querySelectorAll('.desk-main [data-act]')).map((b) => b.dataset.act + (b.dataset.v ? ':' + b.dataset.v : '')).slice(0, 20)); h.log('N actions', recon);
  // Q: missing item complaint → support refund
  await start(h, 'Q', 'support'); await drain(h); h.log('Q →', await st(h));
  await h.ev(() => { const W = window.__W; W.S.nav.support.view = 'tickets'; W.S.nav.support.sel = Object.keys(W.S.tickets)[0]; W.requestRender(); }); await h.wait(300); await shot(h, 'Q-support');
  const sacts = await h.ev(() => Array.from(document.querySelectorAll('.desk-main [data-act]')).map((b) => b.dataset.act + (b.dataset.v ? ':' + b.dataset.v : '')).filter((x) => x.startsWith('s-'))); h.log('Q actions', sacts);
  // O: payment fails (customer checkout)
  await start(h, 'O', 'customer'); await h.wait(300); await shot(h, 'O-cart'); h.log('O start', await h.ev(() => { const W = window.__W; const n = W.S.nav.customer; const s = n.stacks[n.tab]; return s[s.length - 1].s + ' pay=' + W.S.cust.pay + ' fail=' + W.S.cust.payFail; }));
  // X: recipient hide price
  await start(h, 'X', 'customer'); await drain(h); h.log('X →', await st(h));
  // Y / Z
  await start(h, 'Y', 'customer'); await h.wait(300); await shot(h, 'Y-cart');
  await start(h, 'Z', 'customer'); await h.wait(300); await shot(h, 'Z-cart');
  // U / V / W
  await start(h, 'U', 'customer'); await drain(h); h.log('U →', await st(h));
  await start(h, 'V', 'customer'); await drain(h); h.log('V →', await st(h));
  await start(h, 'W', 'ops'); await drain(h); h.log('W before restore →', await st(h), await h.ev(() => window.__W.S.sys.outage)); await shot(h, 'W-ops');
  await h.act('ops-restore', {}, { soft: true }); await drain(h); h.log('W after restore →', await st(h));
};
