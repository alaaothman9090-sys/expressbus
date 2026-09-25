// Usage: node tools/shot.js file.html out.png [width] [height]
const { chromium } = require('playwright-core');
(async () => {
  const [,, file, out, w = '1200', h = '420'] = process.argv;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  await p.goto('file://' + require('path').resolve(file));
  await p.waitForTimeout(400);
  await p.screenshot({ path: out, fullPage: false });
  await b.close();
})();
