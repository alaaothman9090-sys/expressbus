module.exports = async (h) => {
  const tag = h.W >= 1180 ? 'w' : h.W >= 820 ? 'm' : 'n';
  await h.load();
  const snap = async (name) => { await h.shot(`dk-${tag}-${name}`, { wait: 380 }); const o = await h.overflow(); if (o.length) h.log(name, 'OVERFLOW', o.slice(0, 6)); };
  // world: scenario B up to the ops gate + a complaint ticket from scenario Q
  await h.ev(() => { const W = window.__W; W.S.set.role = 'ops'; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 60) { if (!W.skipAhead()) break; } W.requestRender(); });
  await h.wait(300);
  const views = { support: ['tickets', 'templates', 'rules'], ops: ['live', 'incidents', 'map', 'people', 'log', 'blocked'], finance: ['orders', 'recon', 'refunds', 'model'], admin: ['flags', 'values', 'catalog', 'areas', 'roles', 'audit'] };
  for (const [role, vs] of Object.entries(views)) {
    await h.ev((r) => { window.__W.ACT.role({ v: r }); }, role); await h.wait(300);
    for (const v of vs) {
      await h.ev(([r, vv]) => { const W = window.__W; W.S.nav[r].view = vv; W.requestRender(); }, [role, v]); await h.wait(250);
      if (role === 'support' && v === 'tickets') { await h.act('s-open', {}, { soft: true }); }
      if (role === 'ops' && v === 'live') { await h.act('ops-open', {}, { soft: true }); }
      await snap(`${role}-${v}`);
    }
  }
};
