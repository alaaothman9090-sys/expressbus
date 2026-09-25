// Test runner. Usage: node tools/t.js <script.js> [width] [height]
// The script exports async (h) => {...}; h has helpers below. Uses out/test.html (window.__W hook).
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
(async () => {
  const scriptPath = path.resolve(process.argv[2]);
  const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
  const script = require(scriptPath);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: process.env.SCHEME || 'light', reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  p.on('console', (m) => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/fonts\.g|ERR_CERT|net::|Failed to load resource/.test(t)) errs.push('CONSOLE ' + m.type() + ' ' + t); });
  const file = 'file://' + path.resolve(__dirname, '../out/test.html');
  const shotDir = path.resolve(__dirname, '../shots/t');
  fs.mkdirSync(shotDir, { recursive: true });
  const h = {
    p, W, H,
    async load(fresh = true) { await p.goto(file); if (fresh) { await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await p.goto(file); } await p.waitForTimeout(500); },
    async shot(name, opts = {}) { await p.waitForTimeout(opts.wait ?? 450); await p.screenshot({ path: path.join(shotDir, name + '.png'), fullPage: false }); },
    async el(sel) { const loc = p.locator(sel).filter({ visible: true }).first(); return loc; },
    async click(sel, opts = {}) {
      const loc = p.locator(sel).filter({ visible: true }).first();
      const n = await loc.count();
      if (!n) { errs.push('NOCLICK ' + sel); if (opts.soft) return false; throw new Error('No visible element: ' + sel); }
      await loc.click({ timeout: 4000 }); await p.waitForTimeout(opts.wait ?? 260); return true;
    },
    async act(name, data = {}, opts = {}) {
      const sel = `[data-act="${name}"]` + Object.entries(data).map(([k, v]) => `[data-${k}="${v}"]`).join('');
      return h.click(sel, opts);
    },
    async text(t, opts = {}) {
      const loc = p.locator(opts.sel || 'button, [role="button"], a, label').filter({ hasText: t }).filter({ visible: true }).first();
      if (!(await loc.count())) { errs.push('NOTEXT ' + t); if (opts.soft) return false; throw new Error('No visible text: ' + t); }
      await loc.click({ timeout: 4000 }); await p.waitForTimeout(opts.wait ?? 260); return true;
    },
    async has(sel) { return (await p.locator(sel).filter({ visible: true }).count()) > 0; },
    async hasText(t, sel = 'body') { return (await p.locator(sel).filter({ hasText: t }).count()) > 0; },
    async fill(sel, v) { const loc = p.locator(sel).filter({ visible: true }).first(); await loc.fill(String(v)); await p.waitForTimeout(150); },
    async select(sel, v) { const loc = p.locator(sel).filter({ visible: true }).first(); await loc.selectOption(String(v)); await p.waitForTimeout(200); },
    S: () => p.evaluate(() => JSON.parse(JSON.stringify(window.__W.S))),
    ev: (fn, arg) => p.evaluate(fn, arg),
    async skip(min) { await p.evaluate((m) => { window.__W.skipAhead(m); window.__W.requestRender(); }, min); await p.waitForTimeout(300); },
    async order(id) { return p.evaluate((i) => JSON.parse(JSON.stringify(window.__W.orderById(i) || null)), id); },
    wait: (ms) => p.waitForTimeout(ms),
    log: (...a) => console.log(...a),
    errs,
    async overflow() {
      return p.evaluate(() => {
        const out = [];
        const roots = document.querySelectorAll('.app, .desk, #panel, #side, #simbar, #overlays > *');
        roots.forEach((r) => {
          const rb = r.getBoundingClientRect();
          r.querySelectorAll('*').forEach((el) => {
            const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
            if (el.classList.contains('add-btn') || el.classList.contains('pcard-foot') || el.classList.contains('anno') || el.classList.contains('rings') || el.classList.contains('pdetail')) return;
            if (el.scrollWidth > el.clientWidth + 2 && ['auto', 'scroll', 'hidden'].indexOf(cs.overflowX) < 0 && el.clientWidth > 0 && !(el.closest('svg'))) out.push('SCROLLW ' + el.tagName + '.' + (el.className && el.className.baseVal == null ? el.className : '') + ' ' + el.scrollWidth + '>' + el.clientWidth + ' «' + (el.textContent || '').trim().slice(0, 40) + '»');
          });
        });
        return out.slice(0, 30);
      });
    },
  };
  let failed = null;
  try { await script(h); } catch (e) { failed = e; }
  if (failed) { console.log('SCRIPT FAILED:', failed.message.split('\n').slice(0, 6).join('\n')); try { await p.screenshot({ path: path.join(shotDir, '_fail.png') }); } catch (e) {} }
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no page errors');
  await b.close();
})();
