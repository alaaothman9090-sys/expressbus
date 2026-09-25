module.exports = async (h) => {
  await h.load();
  await h.ev(() => { const W = window.__W; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 40) { const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.role === 'customer')) break; if (!W.skipAhead()) break; } W.S.toast = null; W.requestRender(); });
  await h.shot(`lap-${h.W}-customer`, { wait: 500 });
  await h.ev(() => { const W = window.__W; W.S.set.role = 'ops'; W.S.nav.ops.view = 'live'; W.requestRender(); }); await h.shot(`lap-${h.W}-ops`, { wait: 400 });
  h.log(await h.overflow());
};
