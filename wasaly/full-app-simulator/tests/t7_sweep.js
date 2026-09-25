// run every scenario with the user on the ops desk; autopilot drives customer/merchant/captain
module.exports = async (h) => {
  await h.load();
  const ids = await h.ev(() => Object.keys(window.__W.SCENARIOS));
  for (const id of ids) {
    const r = await h.ev((sid) => {
      const W = window.__W; const out = { id: sid, errs: [] };
      try {
        W.S.set.role = 'ops'; W.S.pickScn = sid; W.S.dialog = null;
        W.ACT['scn-start']();
        if (W.S.dialog && W.S.dialog.confirm) W.ACT['scn-start-do']({});
        W.S.set.role = 'ops';
        let n = 0; while (n++ < 120) { if (!W.skipAhead()) break; }
        W.renderAll();
        const os = Object.values(W.S.orders);
        out.orders = os.map((o) => `${o.id}:${o.st}${o.label ? '/' + o.label : ''}${o.cap ? '@' + o.cap.phase : ''} pend=[${o.pending.map((a) => a.role + ':' + a.kind).join(',')}]${o.gate ? ' gate=' + o.gate.fdr : ''}${o.cnd ? ' cnd=' + o.cnd.reason : ''}${o.sim && o.sim.proposed ? ' SIM' : ''}`);
        out.steps = n; out.t = Math.round(W.now());
        out.tickets = Object.keys(W.S.tickets).length;
        out.sheet = W.S.sheet && W.S.sheet.kind; out.custTop = (() => { const nv = W.S.nav.customer; const st = nv.stacks[nv.tab]; return st[st.length - 1].s; })();
      } catch (e) { out.errs.push(String(e && e.stack || e).slice(0, 300)); }
      return out;
    }, id);
    h.log(`${r.id} steps=${r.steps} t=${r.t} tickets=${r.tickets} custTop=${r.custTop} ${r.errs.join(' | ')}\n   ${(r.orders || []).join('\n   ')}`);
  }
};
