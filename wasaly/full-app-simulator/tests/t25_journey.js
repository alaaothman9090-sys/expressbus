module.exports = async (h) => {
  await h.load();
  await h.ev(() => { const W = window.__W; W.S.pickScn = 'B'; W.ACT['scn-start'](); let n = 0; while (n++ < 60) { if (!W.skipAhead()) break; } W.S.set.panel = 'journey'; W.S.journeySel = 15; W.S.toast = null; W.requestRender(); });
  await h.wait(500);
  await h.ev(() => { const el = document.querySelector('#panel .pbody'); const sel = el.querySelector('.jr-detail, .journey-detail, [data-sel="1"]'); if (sel) sel.scrollIntoView(); });
  await h.shot('jr-15', { wait: 400 });
  const txt = await h.ev(() => (document.querySelector('#panel .pbody') || {}).innerText || '');
  h.log(txt.slice(0, 1800));
};
