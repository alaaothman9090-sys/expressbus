const { skipOnboarding } = require('./lib');
module.exports = async (h) => {
  await h.load(); await skipOnboarding(h);
  const focused = () => h.ev(() => { const a = document.activeElement; return a ? `${a.tagName}.${(a.className && a.className.baseVal == null ? a.className : '')}[${a.getAttribute('data-act') || ''}] «${(a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 30)}»` : 'none'; });
  const seq = [];
  for (let i = 0; i < 14; i++) { await h.p.keyboard.press('Tab'); seq.push(await focused()); }
  h.log('TAB ORDER\n  ' + seq.join('\n  '));
  // open a merchant via keyboard
  await h.ev(() => { const b = document.querySelector('[data-act="c-open-merchant"]'); b.focus(); });
  await h.p.keyboard.press('Enter'); await h.wait(500);
  h.log('after Enter on merchant:', await h.ev(() => { const n = window.__W.S.nav.customer; const s = n.stacks[n.tab]; return s[s.length - 1].s; }));
  await h.ev(() => { const b = document.querySelector('[data-act="c-open-product"]'); b.focus(); });
  await h.p.keyboard.press('Enter'); await h.wait(600);
  h.log('sheet open:', await h.ev(() => window.__W.S.sheet && window.__W.S.sheet.kind), 'focus:', await focused());
  for (let i = 0; i < 4; i++) await h.p.keyboard.press('Tab');
  h.log('focus inside sheet after tabs:', await focused(), await h.ev(() => !!document.activeElement.closest('.sheet')));
  await h.p.keyboard.press('Escape'); await h.wait(500);
  h.log('after Escape sheet:', await h.ev(() => window.__W.S.sheet && window.__W.S.sheet.kind), 'focus:', await focused());
  // overlay: review center via keyboard + escape
  await h.ev(() => { window.__W.ACT['rc-open'](); }); await h.wait(500);
  h.log('rc focus:', await focused());
  await h.p.keyboard.press('Escape'); await h.wait(400);
  h.log('rc after escape open?', await h.ev(() => window.__W.S.review.center));
  // tablist arrows
  await h.ev(() => { document.querySelector('#panel [role="tab"][aria-selected="true"]').focus(); });
  await h.p.keyboard.press('ArrowLeft'); await h.wait(300);
  h.log('panel tab after ArrowLeft (RTL → next):', await h.ev(() => window.__W.S.set.panel), await focused());
};
