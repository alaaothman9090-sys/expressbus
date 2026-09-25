const { skipOnboarding } = require('./lib');
module.exports = async (h) => {
  await h.load(); await skipOnboarding(h);
  const snap = async (name) => { await h.shot('mid-' + name, { wait: 400 }); const o = await h.overflow(); if (o.length) h.log(name, 'OVERFLOW', o.slice(0, 6)); };
  await snap('home');
  await h.act('panel', { v: 'controls' }); await snap('controls');
  await h.ev(() => { document.querySelector('#panel .pbody').scrollTop = 2000; }); await snap('controls-bottom');
  await h.ev(() => { const W = window.__W; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 40) { const o = W.S.orders['WS-10428']; if (o.pending.some((a) => a.role === 'customer')) break; if (!W.skipAhead()) break; } W.S.toast = null; W.requestRender(); });
  await h.act('panel', { v: 'state' }); await snap('state-cue');
  await h.act('panel', { v: 'money' }); await snap('money');
  await h.act('panel', { v: 'journey' }); await snap('journey');
  await h.act('journey', { v: '15' }, { soft: true }); await snap('journey-15');
  await h.act('panel', { v: 'policy' }); await snap('policy');
  await h.act('policy', {}, { soft: true }); await snap('policy-drawer');
  await h.act('review'); await h.act('panel', { v: 'notes' }); await snap('notes');
};
