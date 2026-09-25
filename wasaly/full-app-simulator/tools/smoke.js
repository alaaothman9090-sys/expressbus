const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const file = 'file://' + path.resolve(__dirname, '../out/preview.html');
  const sizes = [[1440, 900, 'wide'], [1024, 800, 'mid'], [390, 844, 'narrow']];
  for (const [w, h, n] of sizes) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/ERR_CERT|net::/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(file); await p.waitForTimeout(900);
    await p.screenshot({ path: path.resolve(__dirname, `../shots/smoke-${n}.png`) });
    console.log(n, errs.length ? errs.join('\n') : 'no errors');
    await p.close();
  }
  await b.close();
})();
