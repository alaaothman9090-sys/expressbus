// inject every applicable problem at every lifecycle stage; network modes; chat/call sheets
module.exports = async (h) => {
  await h.load();
  const res = await h.ev(() => {
    const W = window.__W; const out = [];
    const keys = Object.keys(W.INJECT);
    const stages = ['placed', 'accepted', 'preparing', 'ready', 'to_merchant', 'to_customer', 'at_customer', 'delivered'];
    const reach = (o, stage) => { let n = 0; while (n++ < 80) { const cap = o.cap && o.cap.phase; if (o.st === stage || cap === stage) return true; if (['delivered', 'completed', 'cancelled'].includes(o.st) && stage !== 'delivered') return false; if (!W.skipAhead()) return o.st === stage || cap === stage; } return false; };
    for (const key of keys) {
      for (const stage of stages) {
        try {
          W.S.set.role = 'ops'; W.S.pickScn = 'A'; W.S.dialog = null; W.ACT['scn-start'](); if (W.S.dialog && W.S.dialog.confirm) W.ACT['scn-start-do']({}); W.S.set.role = 'ops';
          const o = W.S.orders['WS-10428'];
          if (!reach(o, stage)) continue;
          const d = W.INJECT[key];
          const ok = !d.when || d.when(o);
          if (!ok) continue;
          W.ACT['inject-do']({ v: key });
          let n = 0; while (n++ < 80) { if (!W.skipAhead()) break; }
          W.renderAll();
          ['customer', 'recipient', 'merchant', 'captain', 'support', 'ops', 'finance', 'admin', 'risk'].forEach((r) => { W.S.set.role = r; W.renderAll(); });
          const o2 = W.S.orders['WS-10428'];
          out.push(`${key}@${stage} → ${o2.st}${o2.label ? '/' + o2.label : ''}${o2.cap ? '@' + o2.cap.phase : ''} pend=[${o2.pending.map((a) => a.role + ':' + a.kind).join(',')}]`);
        } catch (e) { out.push(`ERROR ${key}@${stage}: ${String(e && e.stack || e).slice(0, 240)}`); }
      }
    }
    return out;
  });
  h.log(res.join('\n'));
};
