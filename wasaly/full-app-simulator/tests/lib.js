// shared helpers for tests
exports.skipOnboarding = async (h) => {
  await h.ev(() => { const S = window.__W.S; S.cust.stage = 'app'; S.cust.onb = 7; S.cust.authed = true; window.__W.requestRender(); });
  await h.wait(400);
};
exports.where = (h, role = 'customer') => h.ev((r) => { const S = window.__W.S; const n = S.nav[r]; const st = n.stacks[n.tab]; const t = st[st.length - 1]; return r + ' tab=' + n.tab + ' top=' + t.s + (t.id ? ':' + t.id : '') + ' sheet=' + (S.sheet ? S.sheet.kind : '-') + ' dialog=' + (S.dialog ? S.dialog.title : '-'); }, role);
exports.role = async (h, r) => { await h.ev((x) => { window.__W.ACT.role({ v: x }); }, r); await h.wait(350); };
exports.advance = async (h, min) => { await h.ev((m) => { const W = window.__W; const target = W.now() + m; let guard = 0; while (W.now() < target && guard++ < 200) { if (!W.skipAhead()) break; } W.requestRender(); }, min); await h.wait(350); };
exports.placeOrder = async (h) => {
  await h.act('c-open-merchant', { id: 'm1' }); await h.act('c-open-product', { id: 'p101' }); await h.act('c-add');
  await h.click('.cartbar'); await h.act('c-go', { s: 'checkout' }); await h.act('c-place'); await h.wait(900);
};
