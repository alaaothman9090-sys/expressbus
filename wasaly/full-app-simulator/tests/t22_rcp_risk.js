const st = (h) => h.ev(() => { const o = window.__W.S.orders['WS-10428']; if (!o) return 'none'; return `${o.st}${o.label ? '/' + o.label : ''} cap=${o.cap ? o.cap.phase : '-'} pay=${o.pay.state} pend=[${o.pending.map((a) => a.role + ':' + a.kind).join(',')}] rcpCode=${!!o.rcpCode} door=${o.door ? o.door.mode : '-'}`; });
const start = (h, id, role) => h.ev(([id, role]) => { const W = window.__W; W.S.set.role = role; W.S.pickScn = id; W.S.dialog = null; W.ACT['scn-start'](); if (W.S.dialog && W.S.dialog.confirm) W.ACT['scn-start-do']({}); W.S.set.role = role; W.S.toast = null; W.requestRender(); }, [id, role]);
const runUntil = (h, kinds, max = 60) => h.ev(([kinds, max]) => { const W = window.__W; let n = 0; while (n++ < max) { const o = W.S.orders['WS-10428']; if (o && o.pending.some((a) => kinds.includes(a.kind))) return true; if (!W.skipAhead()) return false; } return false; }, [kinds, max]);
module.exports = async (h) => {
  const tag = h.W >= 1180 ? 'w' : 'n';
  const snap = async (name) => { await h.shot(`rr-${tag}-${name}`, { wait: 400 }); const o = await h.overflow(); if (o.length) h.log(name, 'OVERFLOW', o.slice(0, 5)); };
  await h.load();
  await h.ev(() => { window.__W.S.cust.stage = 'app'; window.__W.S.set.role = 'recipient'; window.__W.requestRender(); }); await snap('rcp-empty');
  // X: order for someone else, recipient accepts after calling for the code
  await start(h, 'X', 'recipient'); await h.wait(300); await snap('rcp-x-before');
  await runUntil(h, ['c_handover']); await h.ev(() => window.__W.requestRender()); await h.wait(300);
  h.log('X at door', await st(h)); await snap('rcp-x-door');
  await h.click('.rcp-proposed summary', { soft: true }); await snap('rcp-x-proposed');
  await h.act('r-getcode', {}, { soft: true }); await snap('rcp-x-code');
  await h.act('r-accept', {}, { soft: true }); await h.wait(700); h.log('X accept', await st(h));
  await h.ev(() => { const W = window.__W; let n = 0; while (n++ < 30) { if (!W.skipAhead()) break; } W.requestRender(); }); await h.wait(300);
  h.log('X end', await st(h)); await snap('rcp-x-done');
  // buyer view while the recipient is at the door (scenario E)
  await start(h, 'E', 'customer'); await runUntil(h, ['c_handover']); await h.ev(() => window.__W.requestRender()); await h.wait(300);
  h.log('E at door', await st(h)); await snap('buyer-e-door');
  await h.ev(() => { window.__W.S.set.role = 'recipient'; window.__W.requestRender(); }); await snap('rcp-e-door');
  await h.act('r-refuse', {}, { soft: true }); h.log('E refuse', await st(h)); await snap('rcp-e-refused');
  await h.ev(() => { const W = window.__W; let n = 0; while (n++ < 10) { const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.role === 'ops')) break; if (!W.skipAhead()) break; } W.S.set.role = 'customer'; W.requestRender(); }); await h.wait(300);
  h.log('E after report', await st(h)); await snap('buyer-e-after');
  // risk desk after scenario B + N
  await start(h, 'B', 'risk'); await h.ev(() => { const W = window.__W; let n = 0; while (n++ < 60) { if (!W.skipAhead()) break; } W.requestRender(); }); await h.wait(300); await snap('risk-signals');
  await h.act('rk-open', {}, { soft: true }); await snap('risk-case');
  await h.act('rk-status', { v: 'cleared' }, { soft: true }); h.log('without note → toast', await h.ev(() => window.__W.S.toast && window.__W.S.toast.text));
  await h.fill('[data-bind="rk-note"]', 'العميل اتصل وقال إن عنده ظرف — تفسير معقول');
  await h.act('rk-check', { i: '0' }, { soft: true });
  await h.act('rk-propose', {}, { soft: true }); await snap('risk-propose-dialog');
  await h.act('rk-propose-do', {}, { soft: true }); h.log('propose without reason err:', await h.ev(() => window.__W.S.dialog && window.__W.S.dialog.err));
  await h.fill('#dg-r', 'اختبار — اقتراح بس'); await h.act('rk-propose-do', {}, { soft: true });
  h.log('case', await h.ev(() => JSON.stringify(window.__W.S.riskCases.map((c) => ({ id: c.id, st: c.status, log: c.log.length, checks: c.checks.filter(Boolean).length })))));
  await snap('risk-case-after');
  await h.act('desk-view', { role: 'risk', v: 'rules' }); await snap('risk-rules');
  await h.ev(() => { window.__W.S.set.review = true; window.__W.S.nav.risk.view = 'signals'; window.__W.requestRender(); }); await snap('risk-review');
};
