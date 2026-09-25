#!/usr/bin/env python3
"""Assemble WASALY_FULL_APP_EXPERIENCE.html from src/ (one self-contained file).

python3 build.py          -> out/WASALY_FULL_APP_EXPERIENCE.html (fragment for the Artifact host) + out/preview.html (standalone)
python3 build.py --test   -> out/test.html (standalone + window.__W test hook used by tests/*.js)
Tests: NODE_PATH=<dir with playwright-core, axe-core> node tools/t.js tests/<name>.js <width> <height>
"""
import json, os, re, sys
TEST = '--test' in sys.argv
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
CSS = ['tokens.css', 'base.css', 'components.css', 'app.css', 'desk.css']
JS = ['icons.gen.js', 'core.js', 'data.js', 'map.js', 'illo.js', 'engine.js', 'scenarios.js', 'findings.js', 'ui-kit.js',
      'ui-customer-a.js', 'ui-customer-b.js', 'act-customer.js', 'ui-merchant.js', 'ui-captain.js', 'ui-recipient.js', 'ui-desk.js', 'ui-risk.js', 'ui-founder.js', 'ui-shell.js']
manual = json.load(open(os.path.join(ROOT, 'data', 'manual.json'), encoding='utf8'))
manual = {k: manual[k] for k in ['policies', 'inc', 'aut', 'cfl', 'msgs', 'par', 'val']}
prev = json.load(open(os.path.join(ROOT, 'data', 'prev.json'), encoding='utf8'))
prev = {'DECISIONS': prev['DECISIONS'], 'STEPS': prev['STEPS']}
css = '\n'.join(open(os.path.join(SRC, f), encoding='utf8').read() for f in CSS)
css += """
:root { --shell-pat: var(--shell-pat-l); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --shell-pat: var(--shell-pat-d); } }
:root[data-theme="dark"] { --shell-pat: var(--shell-pat-d); }
"""
js = '\n'.join('/* ---- %s ---- */\n' % f + open(os.path.join(SRC, f), encoding='utf8').read() for f in JS)
js = js.replace("'use strict';", '')
boot_patch = """
try { document.getElementById('crash-reset').addEventListener('click', function () { try { localStorage.removeItem('wasaly.fullapp.v1'); } catch (e) {} location.reload(); }); } catch (e) {}
try { const r = document.documentElement.style; r.setProperty('--shell-pat-l', 'url("' + IL.patternURI('#33499F', 0.05) + '")'); r.setProperty('--shell-pat-d', 'url("' + IL.patternURI('#8FA2E0', 0.05) + '")'); } catch (e) {}
"""
data = 'const MANUAL=' + json.dumps(manual, ensure_ascii=False, separators=(',', ':')) + ';\nconst PREV=' + json.dumps(prev, ensure_ascii=False, separators=(',', ':')) + ';\n'
# The Artifact host wraps the file in its own <!doctype html><head>…<body> skeleton (charset + viewport
# with viewport-fit=cover, :root padded by the safe-area insets), so the published file is a fragment:
# title first (only the first 8KB are scanned), then style, markup and script.
early = """<script>try{var d=document.documentElement,l='ar';try{var s=JSON.parse(localStorage.getItem('wasaly.fullapp.v1')||'null');if(s&&s.set&&s.set.lang==='en')l='en';}catch(e){}d.setAttribute('lang',l);d.setAttribute('dir',l==='en'?'ltr':'rtl');var w=window.innerWidth;document.body.setAttribute('data-layout',w>=1180?'wide':w>=820?'mid':'narrow');}catch(e){}</script>"""
html = f"""<title>تجربة وصّلي الكاملة</title>
{early}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;500;600;700&family=Reem+Kufi:wght@700&display=swap" rel="stylesheet">
<style>
{css}
</style>
<a class="sr-only" href="#stage">تخطي للمحاكي</a>
<div id="app-root">
  <aside id="side" aria-label="لوحة التحكم في المحاكاة"></aside>
  <main id="stage" aria-label="التطبيق"></main>
  <aside id="panel" aria-label="لوحة المؤسس"></aside>
  <div id="simbar" role="toolbar" aria-label="أدوات المحاكاة"></div>
</div>
<div id="overlays"></div>
<div id="crash" hidden role="alert"><h2>حصل خطأ في المحاكي — جرّب «إعادة ضبط المحاكاة»</h2><button type="button" id="crash-reset">إعادة ضبط وتحميل</button><pre></pre></div>
<noscript><p style="padding:24px">المحاكي محتاج JavaScript يشتغل.</p></noscript>
<script>
(function () {{
'use strict';
{data}
{js}
{boot_patch}
}})();
</script>
"""
if TEST:
    hook = "window.__W = { get S() { return S; }, set S(v) { S = v; }, ACT, requestRender, renderAll, tick, skipAhead, SCENARIOS, FINDINGS, FINDINGS_BY_ID, MANUAL, PREV, INJECT, now, orderById: (id) => S.orders[id], L, setLang };\n"
    html = html.replace(boot_patch, boot_patch + hook)
# local preview: emulate the host skeleton so file:// renders in standards mode like the published page
SKELETON = """<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;font:14px system-ui,-apple-system,sans-serif;background:#faf9f7}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
</head><body>
{frag}
</body></html>
"""
os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
if TEST:
    out = os.path.join(ROOT, 'out', 'test.html')
    open(out, 'w', encoding='utf8').write(SKELETON.format(frag=html))
else:
    out = os.path.join(ROOT, 'out', 'WASALY_FULL_APP_EXPERIENCE.html')
    open(out, 'w', encoding='utf8').write(html)
    open(os.path.join(ROOT, 'out', 'preview.html'), 'w', encoding='utf8').write(SKELETON.format(frag=html))
print('wrote', out, round(os.path.getsize(out) / 1024), 'KB')
