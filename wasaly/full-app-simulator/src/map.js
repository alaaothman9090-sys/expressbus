/* ==========================================================================
   map.js — an illustrative town plan (NOT a real map of Samalout: no real
   street names, no claimed geography). Road graph + Dijkstra routing, a
   cached static base layer and a dynamic layer for routes and markers.
   Scale: 1 map unit ≈ 2.6 m. Motorbike ≈ 22 km/h ≈ 141 units / sim-minute.
   ========================================================================== */
const MAP = (() => {
  const XS = [70, 210, 350, 500, 640, 780, 900];
  const YS = [80, 240, 410, 600, 780, 960, 1140, 1280];
  const W = 1000, H = 1340, M_PER_UNIT = 2.6, SPEED = 141;
  const nodes = {};
  XS.forEach((x, i) => YS.forEach((y, j) => { nodes[`n${i}-${j}`] = { id: `n${i}-${j}`, x, y, i, j }; }));
  const edges = [];
  const cut = new Set(['n0-1|n0-2', 'n1-6|n2-6', 'n5-0|n6-0', 'n6-4|n6-5', 'n2-0|n3-0', 'n0-6|n0-7', 'n4-6|n4-7', 'n6-6|n6-7', 'n1-7|n2-7']);
  const add = (a, b) => { if (!cut.has(`${a}|${b}`) && !cut.has(`${b}|${a}`)) edges.push([a, b]); };
  XS.forEach((x, i) => YS.forEach((y, j) => {
    if (i < XS.length - 1) add(`n${i}-${j}`, `n${i + 1}-${j}`);
    if (j < YS.length - 1) add(`n${i}-${j}`, `n${i}-${j + 1}`);
  }));
  const isMain = (a, b) => (nodes[a].i === 3 && nodes[b].i === 3) || (nodes[a].j === 3 && nodes[b].j === 3);
  const adj = {};
  edges.forEach(([a, b]) => {
    const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
    (adj[a] = adj[a] || []).push([b, d]); (adj[b] = adj[b] || []).push([a, d]);
  });

  function route(from, to) {
    if (from === to) return [nodes[from]];
    const dist = { [from]: 0 }, prev = {}, seen = new Set();
    const q = [from];
    while (q.length) {
      q.sort((a, b) => dist[a] - dist[b]);
      const u = q.shift();
      if (seen.has(u)) continue; seen.add(u);
      if (u === to) break;
      for (const [v, w] of adj[u] || []) {
        const nd = dist[u] + w;
        if (dist[v] == null || nd < dist[v]) { dist[v] = nd; prev[v] = u; q.push(v); }
      }
    }
    const path = []; let c = to;
    while (c) { path.unshift(nodes[c]); c = prev[c]; }
    return path[0] && path[0].id === from ? path : [nodes[from], nodes[to]];
  }
  const lengthOf = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
  function pointAt(pts, d) {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (acc + seg >= d) { const t = seg ? (d - acc) / seg : 0; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t, i }; }
      acc += seg;
    }
    const last = pts[pts.length - 1]; return { x: last.x, y: last.y, i: pts.length - 1 };
  }
  function split(pts, d) {
    const p = pointAt(pts, d);
    return [pts.slice(0, p.i).concat([p]), [p].concat(pts.slice(p.i))];
  }
  const km = (units) => (units * M_PER_UNIT) / 1000;
  const minutes = (units) => units / SPEED;

  /* ------------------------------------------------ static base layer */
  const coverage = [[130, 150], [960, 150], [960, 1250], [130, 1250]];
  const inCoverage = (n) => { const p = nodes[n]; return p && p.x >= 130 && p.x <= 960 && p.y >= 150 && p.y <= 1250; };
  const SPECIAL = {
    '0-2': { kind: 'park', ar: 'حديقة', en: 'Park' }, '3-2': { kind: 'market', ar: 'السوق', en: 'Market' }, '1-0': { kind: 'school', ar: 'المدرسة', en: 'School' },
    '4-5': { kind: 'mosque', ar: 'الجامع', en: 'Mosque' }, '2-3': { kind: 'church', ar: 'الكنيسة', en: 'Church' }, '3-6': { kind: 'station', ar: 'الموقف', en: 'Bus stop' },
    '5-4': { kind: 'hospital', ar: 'المستشفى (توضيحي)', en: 'Hospital (illustrative)' }, '1-5': { kind: 'park', ar: 'ملعب', en: 'Pitch' },
  };
  let baseCache = null;
  function base() {
    if (baseCache && baseCache.lang === LANG) return baseCache.svg;
    let s = `<rect class="m-land" x="-400" y="-400" width="${W + 800}" height="${H + 800}"/>`;
    s += `<path class="m-water" d="M930 -400 C 900 200, 990 520, 940 820 S 950 1400, 960 1800 L1500 1800 L1500 -400 Z"/>`;
    s += `<text class="m-lbl m-lbl-water" x="985" y="700" transform="rotate(90 985 700)">${L('مجرى مائي — توضيحي', 'Waterway — illustrative')}</text>`;
    const rnd = (() => { let v = 7; return () => ((v = (v * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
    for (let i = 0; i < XS.length - 1; i++) for (let j = 0; j < YS.length - 1; j++) {
      const x0 = XS[i] + 18, y0 = YS[j] + 18, x1 = XS[i + 1] - 18, y1 = YS[j + 1] - 18;
      const sp = SPECIAL[`${i}-${j}`];
      if (sp && (sp.kind === 'park')) { s += `<rect class="m-green" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="14"/>`; }
      else {
        const cols = 2 + Math.floor(rnd() * 2), rows = 2 + Math.floor(rnd() * 2);
        const bw = (x1 - x0) / cols, bh = (y1 - y0) / rows;
        for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
          const pad = 4 + rnd() * 6;
          s += `<rect class="${rnd() > 0.7 ? 'm-block2' : 'm-block'}" x="${(x0 + a * bw + pad).toFixed(0)}" y="${(y0 + b * bh + pad).toFixed(0)}" width="${(bw - pad * 2).toFixed(0)}" height="${(bh - pad * 2).toFixed(0)}" rx="5"/>`;
        }
      }
      if (sp) s += `<g class="m-poi"><circle cx="${(x0 + x1) / 2}" cy="${(y0 + y1) / 2}" r="15"/><text class="m-lbl" x="${(x0 + x1) / 2}" y="${(y0 + y1) / 2 + 34}" text-anchor="middle">${L(sp.ar, sp.en)}</text></g>`;
    }
    edges.forEach(([a, b]) => { const A = nodes[a], B = nodes[b]; s += `<line class="${isMain(a, b) ? 'm-main-e' : 'm-road-e'}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`; });
    edges.forEach(([a, b]) => { const A = nodes[a], B = nodes[b]; s += `<line class="${isMain(a, b) ? 'm-main' : 'm-road'}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`; });
    s += `<path class="m-bridge" d="M900 380 L1010 380 L1010 440 L900 440 Z"/>`;
    s += `<text class="m-lbl" x="500" y="592" text-anchor="middle">${L('الشارع الرئيسي (اسم توضيحي)', 'Main street (illustrative name)')}</text>`;
    s += `<polygon class="m-cover" points="${coverage.map((p) => p.join(',')).join(' ')}"/>`;
    s += `<text class="m-lbl m-lbl-cover" x="140" y="140">${L('حدود التغطية (مثال)', 'Coverage limit (example)')}</text>`;
    baseCache = { lang: LANG, svg: s };
    return s;
  }

  /* ------------------------------------------------ dynamic layer */
  const pin = (x, y, kind, label, extra = '') => {
    const icon = { merchant: 'store', home: 'house', captain: 'bike', other: 'map-pin', pharmacy: 'pill' }[kind] || 'map-pin';
    return `<g class="mk mk-${kind} ${extra}" style="transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px)"><circle class="mk-halo" r="30"/><circle class="mk-dot" r="21"/><g transform="translate(-12 -12)" class="mk-ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</svg></g>${label ? `<text class="mk-lbl" y="46" text-anchor="middle">${esc(label)}</text>` : ''}</g>`;
  };
  const polyline = (pts) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  /* o: {legs:[{pts, done(0..1)}], markers:[{x,y,kind,label}], captain:{x,y,gps,stale}, fit:[pts], zoom, pad} */
  function render(o) {
    const fitPts = (o.fit && o.fit.length ? o.fit : [{ x: 0, y: 0 }, { x: W, y: H }]);
    let minX = Math.min(...fitPts.map((p) => p.x)), maxX = Math.max(...fitPts.map((p) => p.x));
    let minY = Math.min(...fitPts.map((p) => p.y)), maxY = Math.max(...fitPts.map((p) => p.y));
    const pad = o.pad != null ? o.pad : 110;
    minX -= pad; maxX += pad; minY -= pad; maxY += pad;
    const aspect = o.aspect || 1.25;
    let w = maxX - minX, h = maxY - minY;
    if (w / h < aspect) { const nw = h * aspect; minX -= (nw - w) / 2; w = nw; } else { const nh = w / aspect; minY -= (nh - h) / 2; h = nh; }
    const z = o.zoom || 1; const cx = minX + w / 2, cy = minY + h / 2; w /= z; h /= z;
    const vb = `${(cx - w / 2).toFixed(0)} ${(cy - h / 2).toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`;
    let dyn = '';
    (o.legs || []).forEach((leg, k) => {
      if (!leg.pts || leg.pts.length < 2) return;
      const len = lengthOf(leg.pts); const d = len * clamp(leg.done || 0, 0, 1);
      const [a, b] = split(leg.pts, d);
      dyn += `<polyline class="rt-shadow" points="${polyline(leg.pts)}"/>`;
      dyn += `<polyline class="rt-todo ${leg.muted ? 'muted' : ''}" points="${polyline(b)}"/>`;
      if (d > 0) dyn += `<polyline class="rt-done" points="${polyline(a)}"/>`;
    });
    (o.markers || []).forEach((m) => { dyn += pin(m.x, m.y, m.kind, m.label, m.cls || ''); });
    if (o.captain) {
      const c = o.captain; const jit = c.gps === 'weak';
      if (jit || c.stale) dyn += `<circle class="acc-halo ${c.stale ? 'stale' : ''}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.stale ? 70 : 55}"/>`;
      dyn += pin(c.x, c.y, 'captain', c.label || '', c.stale ? 'stale' : '');
    }
    return `<svg class="map-svg" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${attr(o.aria || L('خريطة توضيحية للمحاكاة', 'Illustrative simulation map'))}"><g class="map-base" data-morph="skip">${base()}</g><g class="map-dyn">${dyn}</g></svg>`;
  }
  return { nodes, route, lengthOf, pointAt, split, km, minutes, render, inCoverage, SPEED, M_PER_UNIT, XS, YS };
})();
