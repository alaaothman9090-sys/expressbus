module.exports = async (h) => {
  await h.load();
  await h.ev(() => { const W = window.__W; W.S.set.role = 'ops'; W.S.set.theme = 'dark'; W.S.set.review = true; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 60) { if (!W.skipAhead()) break; } W.ACT['ops-hypo']; W.renderAll(); });
  await h.wait(900);
  const before = await h.ev(() => { const W = window.__W; const o = W.S.orders['WS-10428']; return JSON.stringify({ st: o.st, cap: o.cap.phase, pend: o.pending.map((a) => a.kind), t: Math.round(W.now() * 10) / 10, role: W.S.set.role, theme: W.S.set.theme, review: W.S.set.review, tickets: Object.keys(W.S.tickets), sched: (o.sched || []).length }); });
  h.log('before reload', before);
  const raw = await h.ev(() => { try { return (localStorage.getItem('wasaly.fullapp.v1') || '').length; } catch (e) { return 'ERR ' + e; } });
  h.log('stored bytes', raw);
  await h.load(false);
  const after = await h.ev(() => { const W = window.__W; const o = W.S.orders['WS-10428']; return JSON.stringify({ st: o.st, cap: o.cap.phase, pend: o.pending.map((a) => a.kind), t: Math.round(W.now() * 10) / 10, role: W.S.set.role, theme: W.S.set.theme, review: W.S.set.review, tickets: Object.keys(W.S.tickets), sched: (o.sched || []).length }); });
  h.log('after reload ', after);
  await h.shot('persist-after-reload');
  // reset via the UI (dialog)
  await h.ev(() => { window.__W.ACT.reset({}); window.__W.requestRender(); }); await h.wait(300);
  h.log('reset dialog:', await h.ev(() => window.__W.S.dialog && window.__W.S.dialog.title));
  await h.act('reset-do', {}, { soft: true }); await h.wait(500);
  h.log('after reset:', await h.ev(() => JSON.stringify({ orders: Object.keys(window.__W.S.orders), role: window.__W.S.set.role, stage: window.__W.S.cust.stage, theme: window.__W.S.set.theme })));
  // storage blocked: simulate a throwing localStorage
  await h.p.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await h.p.goto('file://' + require('path').resolve(__dirname, '../out/test.html'));
  await h.wait(600);
  h.log('with blocked storage renders:', await h.ev(() => !!document.querySelector('.app')));
};
