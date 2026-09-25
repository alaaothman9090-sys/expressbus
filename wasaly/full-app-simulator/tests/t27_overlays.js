module.exports = async (h) => {
  const tag = h.W >= 1180 ? 'w' : 'n';
  await h.load();
  await h.ev(() => { const W = window.__W; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 40) { const o = W.S.orders['WS-10428']; if (o.cap && o.cap.phase === 'to_customer') break; if (!W.skipAhead()) break; } W.S.toast = null; W.requestRender(); });
  await h.ev(() => { window.__W.ACT['inject-open'](); }); await h.shot(`ov-${tag}-inject`, { wait: 450 });
  await h.ev(() => { window.__W.ACT['inject-close'](); window.__W.ACT.policy({ id: 'CUSTOMER_003' }); }); await h.shot(`ov-${tag}-policy`, { wait: 450 });
  await h.ev(() => { window.__W.ACT['policy-close'](); window.__W.ACT.policy({ id: 'FDR-0001' }); }); await h.shot(`ov-${tag}-fdr`, { wait: 450 });
  await h.ev(() => { window.__W.ACT['policy-close'](); window.__W.S.compare = { fdr: 'FDR-0011', id: null }; window.__W.requestRender(); }); await h.shot(`ov-${tag}-compare11`, { wait: 450 });
  await h.ev(() => { window.__W.S.compare = null; window.__W.S.set.mobileSheet = 'scenario'; window.__W.requestRender(); }); await h.shot(`ov-${tag}-scnsheet`, { wait: 450 });
  await h.ev(() => { window.__W.S.set.mobileSheet = 'role'; window.__W.requestRender(); }); await h.shot(`ov-${tag}-rolesheet`, { wait: 450 });
};
