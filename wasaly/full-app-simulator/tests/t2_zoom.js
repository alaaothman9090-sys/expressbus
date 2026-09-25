module.exports = async (h) => {
  await h.load();
  await h.ev(() => { const S = window.__W.S; S.cust.stage = 'app'; S.cust.onb = 7; window.__W.requestRender(); });
  await h.wait(600);
  await h.p.screenshot({ path: require('path').resolve(__dirname, '../shots/t/z-home.png'), clip: { x: 0, y: 40, width: 390, height: 440 } });
};
