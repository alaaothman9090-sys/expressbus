/* ==========================================================================
   illo.js — inline SVG illustration kit (no gradients/ids, so every copy is
   self-contained and safe to render many times). Flat gouache look: base,
   shade and highlight layers, deterministic scatter for texture.
   ========================================================================== */
const IL = (() => {
  const P = (d, f, x = '') => `<path d="${d}" fill="${f}" ${x}/>`;
  const C = (cx, cy, r, f, x = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${x}/>`;
  const E = (cx, cy, rx, ry, f, x = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${x}/>`;
  const R = (x, y, w, h, rx, f, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${e}/>`;
  const L = (x1, y1, x2, y2, s, w = 2, e = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" stroke-linecap="round" ${e}/>`;
  const G = (inner, tr) => `<g transform="${tr}">${inner}</g>`;
  const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const scatter = (n, seed, fn) => { const r = rng(seed); let out = ''; for (let i = 0; i < n; i++) out += fn(r, i); return out; };
  const inCircle = (r, cx, cy, rad) => { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]; };
  const svg = (inner, vb = '0 0 200 200', extra = '') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" ${extra}>${inner}</svg>`;

  const shadow = (cx, cy, rx, ry, o = 0.14) => E(cx, cy, rx, ry, '#1B2238', `opacity="${o}"`);
  const plate = (cx = 100, cy = 104, r = 82) => shadow(cx + 3, cy + 8, r * 0.98, r * 0.9, 0.12) + C(cx, cy, r, '#FFFFFF') + C(cx, cy, r - 3, '#F1F2F6') + C(cx, cy, r - 12, '#FBFBFD');
  const bowl = (cx = 100, cy = 104, r = 76, rim = '#E8DCCB', inner = '#F6EFE4') => shadow(cx + 3, cy + 9, r, r * 0.9, 0.14) + C(cx, cy, r, rim) + C(cx, cy, r - 7, inner);

  /* ---------------------------------------------------------------- foods */
  const pizza = (variant = 'margherita') => {
    let s = shadow(104, 112, 84, 78, 0.15) + C(100, 102, 84, '#8B5A2B') + C(100, 100, 82, '#D9964A') + C(100, 100, 74, '#E9B266');
    s += C(100, 100, 68, '#C8402B') + C(100, 100, 64, '#D5503A');
    s += scatter(16, 7, (r) => { const [x, y] = inCircle(r, 100, 100, 54); return E(x, y, 9 + r() * 8, 7 + r() * 6, '#F6D98A', `transform="rotate(${r() * 180} ${x} ${y})"`); });
    s += scatter(12, 9, (r) => { const [x, y] = inCircle(r, 100, 100, 56); return C(x, y, 5 + r() * 4, '#FBE7A8', 'opacity=".9"'); });
    if (variant === 'pepperoni') s += scatter(9, 21, (r) => { const [x, y] = inCircle(r, 100, 100, 50); return C(x, y, 9, '#9E2A22') + C(x - 2, y - 2, 3, '#B8413A'); });
    if (variant === 'veggie') {
      s += scatter(8, 31, (r) => { const [x, y] = inCircle(r, 100, 100, 52); return P(`M${x - 8} ${y} a8 8 0 0 1 16 0`, 'none', 'stroke="#3F8C3A" stroke-width="4" stroke-linecap="round"'); });
      s += scatter(7, 37, (r) => { const [x, y] = inCircle(r, 100, 100, 50); return C(x, y, 5, '#2B2320') + C(x, y, 2, '#D5503A'); });
    }
    s += scatter(7, 3, (r) => { const [x, y] = inCircle(r, 100, 100, 50); return E(x, y, 7, 3.5, '#3E8A3A', `transform="rotate(${r() * 180} ${x} ${y})"`); });
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 4; s += L(100 - Math.cos(a) * 82, 100 - Math.sin(a) * 82, 100 + Math.cos(a) * 82, 100 + Math.sin(a) * 82, '#B7773A', 1.4, 'opacity=".55"'); }
    return s;
  };
  const kofta = () => {
    let s = plate();
    s += E(128, 128, 22, 16, '#EAD8B5') + E(128, 126, 17, 11, '#F4E8CE') + C(122, 124, 2, '#C9A56B') + C(132, 128, 2, '#C9A56B');
    for (let i = 0; i < 3; i++) {
      const y = 70 + i * 22;
      s += L(38, y + 8, 162, y - 6, '#B98B5B', 3);
      s += R(52, y - 4, 92, 18, 9, '#7A3E22', `transform="rotate(-7 98 ${y + 5})"`) + R(56, y - 3, 84, 8, 4, '#9C5530', `transform="rotate(-7 98 ${y + 5})" opacity=".8"`);
      s += scatter(5, 11 + i, (r, k) => L(62 + k * 16, y + 2 - k * 1.8, 68 + k * 16, y + 9 - k * 1.8, '#3A1C10', 2.2, 'opacity=".7"'));
    }
    s += scatter(14, 41, (r) => { const [x, y] = inCircle(r, 70, 132, 22); return C(x, y, 2.4, '#3E8A3A'); });
    s += P('M60 140 q12 -14 24 0', 'none', 'stroke="#D7B5E0" stroke-width="3"') + P('M66 146 q10 -12 20 0', 'none', 'stroke="#C79BD3" stroke-width="3"');
    s += C(150, 84, 9, '#E34B35') + C(150, 84, 6, '#F07058') + C(148, 82, 1.5, '#F7E3A0');
    return s;
  };
  const chicken = () => {
    let s = plate();
    s += scatter(60, 5, (r) => { const [x, y] = inCircle(r, 70, 118, 30); return E(x, y, 3.2, 1.6, '#F3EAD5', `transform="rotate(${r() * 180} ${x} ${y})"`); });
    s += E(70, 118, 32, 26, '#EFE3C8', 'opacity=".35"');
    s += P('M104 64 C150 58 170 96 156 128 C146 152 110 156 96 138 C84 122 78 76 104 64 Z', '#B8662A');
    s += P('M110 72 C144 68 160 98 150 124 C142 142 116 146 104 132 C94 118 92 84 110 72 Z', '#CF7E36');
    s += P('M118 80 C138 80 148 100 142 116', 'none', 'stroke="#E9A95A" stroke-width="6" stroke-linecap="round" opacity=".7"');
    s += scatter(8, 13, (r) => { const [x, y] = inCircle(r, 128, 108, 22); return L(x, y, x + 8, y + 3, '#6E3413', 2.4, 'opacity=".6"'); });
    s += P('M150 140 l18 10 l-4 8 Z', '#F2D35B') + P('M151 141 l14 8', 'none', 'stroke="#F7E7A0" stroke-width="2"');
    return s;
  };
  const koshary = () => {
    let s = bowl(100, 104, 80, '#D4B38A', '#8A5A33');
    s += C(100, 104, 70, '#A06B3E');
    s += scatter(90, 17, (r) => { const [x, y] = inCircle(r, 100, 104, 64); return E(x, y, 2.6, 1.4, r() > 0.5 ? '#6B3F1F' : '#C89A5E', `transform="rotate(${r() * 180} ${x} ${y})"`); });
    s += scatter(22, 19, (r) => { const [x, y] = inCircle(r, 100, 104, 58); return R(x, y, 10, 4, 2, '#EBC57C', `transform="rotate(${r() * 180} ${x} ${y})"`); });
    s += scatter(14, 23, (r) => { const [x, y] = inCircle(r, 100, 104, 56); return C(x, y, 4.5, '#E9CD92') + C(x - 1, y - 1, 1.5, '#F6E6C0'); });
    s += P('M68 92 C84 70 120 72 132 96 C140 112 118 128 98 122 C78 118 62 108 68 92 Z', '#B8321F', 'opacity=".85"');
    s += scatter(26, 29, (r) => { const [x, y] = inCircle(r, 102, 100, 40); return P(`M${x} ${y} q4 -4 8 0`, 'none', 'stroke="#5A2E12" stroke-width="3" stroke-linecap="round"'); });
    return s;
  };
  const hawawshi = () => {
    let s = plate();
    s += C(100, 104, 62, '#B8742E') + C(100, 104, 58, '#D59245');
    s += L(100, 46, 100, 162, '#8A4A1C', 3) + L(42, 104, 158, 104, '#8A4A1C', 3);
    s += scatter(30, 43, (r) => { const [x, y] = inCircle(r, 100, 104, 54); return C(x, y, 1.6, '#8A4A1C', 'opacity=".6"'); });
    s += P('M100 48 A56 56 0 0 1 156 104 L100 104 Z', '#E4A95C', 'opacity=".35"');
    s += P('M44 98 h52 v10 h-52 z', '#6A2D14', 'opacity=".55"');
    return s;
  };
  const rozBelLaban = () => {
    let s = shadow(104, 150, 58, 16, 0.16);
    s += P('M52 80 L60 150 Q100 166 140 150 L148 80 Z', '#FFFFFF') + P('M52 80 L60 150 Q100 166 140 150 L148 80 Z', 'none', 'stroke="#E3E6EE" stroke-width="2"');
    s += E(100, 80, 48, 14, '#F8F0DB') + E(100, 80, 44, 11, '#F3E4C0');
    s += scatter(40, 51, (r) => { const x = 64 + r() * 72, y = 74 + r() * 12; return C(x, y, 1.2, '#A8683A'); });
    s += C(92, 78, 4, '#8DB255') + C(106, 82, 3.5, '#E8CFA1') + C(114, 76, 3, '#8DB255');
    return s;
  };
  const karkadeh = () => {
    let s = shadow(104, 162, 44, 12, 0.18);
    s += P('M62 50 L72 158 Q100 168 128 158 L138 50 Z', '#F3F6FA', 'opacity=".95"');
    s += P('M65 70 L73 156 Q100 165 127 156 L135 70 Z', '#8E1537');
    s += P('M65 70 L73 156 Q84 160 90 160 L84 70 Z', '#B32550', 'opacity=".6"');
    s += R(78, 78, 18, 16, 4, '#FFFFFF', 'opacity=".45"') + R(102, 90, 16, 15, 4, '#FFFFFF', 'opacity=".4"') + R(88, 104, 15, 14, 4, '#FFFFFF', 'opacity=".35"');
    s += L(112, 30, 100, 150, '#F2C14E', 6) + L(112, 30, 100, 150, '#FFFFFF', 2, 'opacity=".5"');
    s += E(100, 50, 38, 6, '#FFFFFF', 'opacity=".9"');
    return s;
  };
  const soda = () => {
    let s = shadow(104, 166, 34, 10, 0.18);
    s += R(66, 40, 68, 126, 16, '#C8342B') + R(66, 40, 20, 126, 10, '#E0493F', 'opacity=".6"');
    s += E(100, 44, 34, 8, '#D8DCE4') + E(100, 44, 22, 5, '#B9BFCC');
    s += P('M66 104 C88 92 112 118 134 100 L134 126 C112 142 88 116 66 128 Z', '#FFFFFF', 'opacity=".9"');
    return s;
  };
  const salad = () => {
    let s = bowl(100, 104, 78, '#E6ECEF', '#FFFFFF');
    s += scatter(18, 61, (r) => { const [x, y] = inCircle(r, 100, 104, 52); return E(x, y, 18, 10, r() > 0.5 ? '#5FA84C' : '#7BC05E', `transform="rotate(${r() * 180} ${x} ${y})"`); });
    s += scatter(7, 63, (r) => { const [x, y] = inCircle(r, 100, 104, 46); return C(x, y, 9, '#D6452D') + C(x, y, 5, '#E9705A') + C(x - 2, y - 2, 1.4, '#F7D4A0'); });
    s += scatter(7, 67, (r) => { const [x, y] = inCircle(r, 100, 104, 48); return C(x, y, 8, '#9CCB6B') + C(x, y, 5.5, '#DDEFC5'); });
    return s;
  };
  const fries = () => {
    let s = shadow(104, 168, 46, 12, 0.18);
    s += scatter(16, 71, (r, i) => R(62 + i * 5 + r() * 4, 34 + r() * 26, 9, 88, 3, i % 3 ? '#F2C14E' : '#E9AE33', `transform="rotate(${(r() - 0.5) * 22} ${66 + i * 5} 120)"`));
    s += P('M52 92 L148 92 L134 166 L66 166 Z', '#C8342B') + P('M52 92 L148 92 L145 106 L55 106 Z', '#E0493F');
    s += P('M88 120 h24 v24 h-24z', '#FFFFFF', 'opacity=".9"') + C(100, 132, 7, '#C8342B');
    return s;
  };
  const feteer = () => {
    let s = plate();
    s += R(46, 50, 108, 108, 18, '#C9862F', 'transform="rotate(8 100 104)"') + R(50, 54, 100, 100, 16, '#E3B05C', 'transform="rotate(8 100 104)"');
    for (let i = 0; i < 6; i++) s += P(`M${58 + i * 3} ${66 + i * 15} q42 -10 86 2`, 'none', `stroke="#F2CF86" stroke-width="3" opacity=".8" transform="rotate(8 100 104)"`);
    s += P('M60 90 C80 70 110 120 140 96', 'none', 'stroke="#B8740F" stroke-width="5" stroke-linecap="round" opacity=".75"');
    s += scatter(10, 81, (r) => { const [x, y] = inCircle(r, 100, 104, 40); return C(x, y, 2, '#FFF3CF'); });
    return s;
  };
  const baladi = () => {
    let s = shadow(104, 150, 76, 20, 0.14);
    s += E(100, 132, 76, 26, '#A7652C') + E(100, 126, 72, 24, '#C98A4B');
    s += E(84, 96, 58, 22, '#B57236') + E(84, 90, 55, 20, '#D59C5D');
    s += E(118, 72, 50, 19, '#B57236') + E(118, 66, 47, 17, '#DDAA6B');
    s += scatter(40, 91, (r) => { const x = 40 + r() * 120, y = 60 + r() * 80; return C(x, y, 1.1, '#8A4A1C', 'opacity=".55"'); });
    s += E(110, 62, 18, 5, '#F1D0A0', 'opacity=".6"');
    return s;
  };
  const fino = () => {
    let s = shadow(104, 152, 80, 16, 0.14);
    for (let i = 0; i < 4; i++) {
      const y = 70 + i * 22, x = 40 + (i % 2) * 8;
      s += R(x, y, 120, 26, 13, '#C0823F') + R(x + 4, y + 3, 112, 12, 6, '#DDA25E', 'opacity=".8"');
      s += L(x + 30, y + 6, x + 38, y + 20, '#9A5E26', 2) + L(x + 60, y + 6, x + 68, y + 20, '#9A5E26', 2) + L(x + 90, y + 6, x + 98, y + 20, '#9A5E26', 2);
    }
    return s;
  };
  const croissant = () => {
    let s = shadow(104, 150, 70, 16, 0.15);
    s += P('M30 120 C40 60 160 60 170 120 C150 112 140 132 120 128 C112 146 88 146 80 128 C60 132 50 112 30 120 Z', '#C7782E');
    s += P('M48 112 C60 78 140 78 152 112', 'none', 'stroke="#E5A657" stroke-width="10" stroke-linecap="round" opacity=".8"');
    s += L(82, 84, 90, 126, '#8E4E1B', 2.5) + L(100, 78, 100, 132, '#8E4E1B', 2.5) + L(118, 84, 110, 126, '#8E4E1B', 2.5);
    return s;
  };
  const basbousa = () => {
    let s = shadow(104, 160, 84, 14, 0.16) + R(24, 48, 152, 110, 12, '#8B8F99') + R(28, 52, 144, 102, 9, '#D39B3A');
    for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) {
      const cx = 40 + i * 24, cy = 64 + j * 26;
      s += P(`M${cx} ${cy - 12} L${cx + 11} ${cy} L${cx} ${cy + 12} L${cx - 11} ${cy} Z`, 'none', 'stroke="#B97F21" stroke-width="1.8" opacity=".85"');
      s += E(cx, cy, 4.5, 2.8, '#F6E7C8') + E(cx, cy - 1, 2.6, 1.2, '#FFFFFF', 'opacity=".6"');
    }
    s += R(28, 52, 144, 14, 8, '#F0C45B', 'opacity=".35"');
    return s;
  };
  const konafa = () => {
    let s = shadow(104, 112, 84, 78, 0.15) + C(100, 102, 84, '#8B8F99') + C(100, 100, 80, '#B7762A') + C(100, 100, 76, '#E2A23B');
    s += scatter(70, 111, (r) => { const [x, y] = inCircle(r, 100, 100, 70); return P(`M${x} ${y} q6 -3 12 0`, 'none', 'stroke="#F3C766" stroke-width="2" stroke-linecap="round" opacity=".9"'); });
    s += scatter(40, 113, (r) => { const [x, y] = inCircle(r, 100, 100, 70); return P(`M${x} ${y} q5 3 10 0`, 'none', 'stroke="#B8741C" stroke-width="1.6" stroke-linecap="round"'); });
    s += C(100, 100, 24, '#FFFFFF', 'opacity=".85"') + scatter(12, 117, (r) => { const [x, y] = inCircle(r, 100, 100, 18); return C(x, y, 2.6, '#8DB255'); });
    return s;
  };
  const cake = (name = '') => {
    let s = shadow(104, 168, 74, 12, 0.18);
    s += R(26, 150, 148, 12, 6, '#C9CED9');
    s += P('M36 92 L36 150 Q100 166 164 150 L164 92 Z', '#F2C4D2');
    s += E(100, 92, 64, 20, '#F9DCE5') + E(100, 92, 58, 16, '#FCEAF0');
    s += P('M36 110 Q52 122 68 110 Q84 122 100 110 Q116 122 132 110 Q148 122 164 110', 'none', 'stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"');
    s += P('M70 90 q10 -8 18 0 t18 0 t18 0', 'none', 'stroke="#AA1D51" stroke-width="3" stroke-linecap="round"');
    for (let i = 0; i < 3; i++) { const x = 80 + i * 20; s += R(x - 3, 58, 6, 26, 3, i === 1 ? '#6680D2' : '#EFB03F') + E(x, 52, 4, 7, '#F6C665') + E(x, 53, 2, 4, '#FFF3CF'); }
    return s + (name ? '' : '');
  };
  const umAli = () => {
    let s = bowl(100, 104, 76, '#C9CED9', '#F4E7C9');
    s += C(100, 104, 64, '#E7B863') + scatter(40, 131, (r) => { const [x, y] = inCircle(r, 100, 104, 58); return E(x, y, 8, 5, r() > 0.5 ? '#D69A3B' : '#F0CB7A', `transform="rotate(${r() * 180} ${x} ${y})"`); });
    s += scatter(14, 133, (r) => { const [x, y] = inCircle(r, 100, 104, 50); return C(x, y, 3, r() > 0.5 ? '#8DB255' : '#FFFFFF'); });
    return s;
  };
  const milk = () => shadow(104, 168, 40, 10, 0.16) + P('M64 60 L100 36 L136 60 L136 166 L64 166 Z', '#FFFFFF') + P('M64 60 L100 36 L136 60 Z', '#DDE3F7') + R(64, 96, 72, 44, 0, '#6680D2') + C(100, 118, 12, '#FFFFFF') + P('M64 60 L64 166', 'none', 'stroke="#E3E6EE" stroke-width="3"');
  const eggs = () => {
    let s = shadow(104, 150, 82, 18, 0.14) + R(22, 70, 156, 80, 14, '#C9B48E') + R(26, 74, 148, 72, 12, '#DCC8A2');
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) s += E(46 + i * 27, 94 + j * 30, 11, 13, j ? '#F5E9D8' : '#EBD2B0') + E(43 + i * 27, 90 + j * 30, 3, 4, '#FFFFFF', 'opacity=".7"');
    return s;
  };
  const riceBag = () => shadow(104, 168, 50, 12, 0.16) + P('M56 48 Q100 36 144 48 L150 164 Q100 176 50 164 Z', '#F2EEE6') + P('M56 48 Q100 36 144 48 L146 62 Q100 52 54 62 Z', '#2F8C52') + R(70, 92, 60, 44, 8, '#2F8C52') + scatter(18, 141, (r) => C(78 + r() * 44, 102 + r() * 26, 2, '#FFFFFF'));
  const oil = () => shadow(104, 168, 34, 10, 0.16) + R(84, 30, 32, 18, 5, '#2F8C52') + P('M78 50 h44 l14 30 v80 q0 10 -10 10 h-52 q-10 0 -10 -10 v-80 z', '#F2C14E', 'opacity=".95"') + R(70, 100, 60, 36, 6, '#FFFFFF', 'opacity=".85"') + C(100, 118, 8, '#2F8C52');
  const pasta = () => shadow(104, 166, 60, 12, 0.14) + R(40, 56, 120, 104, 12, '#33499F') + R(52, 76, 96, 62, 10, '#F6E6B8') + scatter(22, 151, (r) => R(58 + r() * 80, 82 + r() * 50, 12, 4, 2, '#E3B85C', `transform="rotate(${r() * 180} ${60 + r() * 80} ${84 + r() * 50})"`));
  const icecream = () => shadow(104, 168, 50, 12, 0.16) + P('M46 70 L154 70 L144 164 L56 164 Z', '#FFFFFF') + P('M46 70 L154 70 L151 88 L49 88 Z', '#DD4F80') + E(100, 70, 54, 14, '#F9DCE5') + C(84, 62, 14, '#F6E6C8') + C(112, 60, 15, '#8C5A3B') + C(98, 52, 13, '#F3AEC6');
  const bouquet = (mixed = false) => {
    let s = shadow(104, 172, 44, 10, 0.18);
    s += scatter(8, 161, (r) => { const x = 60 + r() * 80, y = 40 + r() * 60; return E(x, y + 26, 5, 16, '#3E8A3A', `transform="rotate(${(r() - 0.5) * 60} ${x} ${y + 26})"`); });
    const cols = mixed ? ['#C8214F', '#EFB03F', '#DD4F80', '#FFFFFF', '#8067B7'] : ['#C8214F', '#AA1D51', '#C8214F'];
    s += scatter(9, 167, (r, i) => { const x = 62 + r() * 76, y = 40 + r() * 56, c = cols[i % cols.length]; return C(x, y, 15, c) + P(`M${x - 8} ${y} a8 8 0 1 1 8 8 a5 5 0 1 1 -5 -5`, 'none', `stroke="${c === '#FFFFFF' ? '#E3E6EE' : 'rgba(0,0,0,.25)'}" stroke-width="2"`); });
    s += P('M52 92 L148 92 L112 176 L88 176 Z', '#F3E7D8') + P('M52 92 L100 104 L88 176 Z', '#E6D5BE') + P('M86 132 q14 10 28 0 l-4 12 q-10 6 -20 0 z', '#AA1D51');
    return s;
  };
  const giftBox = () => shadow(104, 168, 64, 12, 0.16) + R(40, 80, 120, 86, 8, '#1E2C62') + R(34, 66, 132, 24, 6, '#283A80') + R(92, 66, 16, 100, 2, '#C92A62') + P('M100 66 C80 40 60 52 76 64 Z', '#C92A62') + P('M100 66 C120 40 140 52 124 64 Z', '#C92A62') + scatter(10, 171, (r) => C(46 + r() * 108, 96 + r() * 64, 2.2, '#F6C665', 'opacity=".8"'));
  const card = () => shadow(104, 150, 64, 10, 0.14) + R(36, 58, 128, 86, 8, '#FFFFFF', 'transform="rotate(-6 100 100)"') + R(44, 66, 112, 70, 6, '#FAD7E3', 'transform="rotate(-6 100 100)"') + P('M70 104 q15 -20 30 0 q15 20 30 0', 'none', 'stroke="#AA1D51" stroke-width="4" stroke-linecap="round" transform="rotate(-6 100 100)"');
  const pills = () => shadow(104, 162, 56, 12, 0.14) + R(44, 70, 112, 84, 10, '#E9EBF0') + R(44, 70, 112, 26, 10, '#B9BFCC') + R(90, 104, 20, 40, 3, '#959DAE') + R(80, 114, 40, 20, 3, '#959DAE');
  const basket = () => {
    let s = shadow(104, 168, 70, 12, 0.16);
    s += C(80, 70, 20, '#E34B35') + C(112, 62, 18, '#7BC05E') + R(118, 44, 16, 50, 6, '#F2EEE6') + R(118, 44, 16, 14, 6, '#2F8C52');
    s += P('M36 88 L164 88 L150 164 L50 164 Z', '#B4803E') + P('M36 88 L164 88 L160 100 L40 100 Z', '#8C5A2B');
    for (let i = 0; i < 5; i++) s += L(56 + i * 22, 104, 60 + i * 20, 160, '#8C5A2B', 3, 'opacity=".6"');
    s += P('M60 88 C60 40 140 40 140 88', 'none', 'stroke="#8C5A2B" stroke-width="6"');
    return s;
  };
  const cutlery = () => plate(100, 100, 70) + E(100, 100, 40, 40, '#E9B266', 'opacity=".25"') + C(100, 100, 30, '#7A3E22', 'opacity=".85"') + R(22, 50, 8, 100, 4, '#9AA1B1') + R(170, 50, 8, 100, 4, '#9AA1B1') + R(18, 44, 16, 30, 6, '#9AA1B1');

  const FOOD = { pizza: () => pizza('margherita'), pizza_pep: () => pizza('pepperoni'), pizza_veg: () => pizza('veggie'), kofta, chicken, koshary, hawawshi, rozBelLaban, karkadeh, soda, salad, fries, feteer, baladi, fino, croissant, basbousa, konafa, cake, umAli, milk, eggs, riceBag, oil, pasta, icecream, bouquet: () => bouquet(false), bouquet_mix: () => bouquet(true), giftBox, card, pills, basket, cutlery };
  const food = (kind, o = {}) => svg((FOOD[kind] || cutlery)(), '0 0 200 200', `class="illo ${o.cls || ''}"`);

  /* ----------------------------------------------------- merchant shopfront */
  const shopfront = (m, o = {}) => {
    const a = m.accent, name = esc(m.name);
    const w = 360, h = 150;
    let s = R(0, 0, w, h, 0, m.wall || '#F2EEE6');
    s += scatter(40, m.seed || 3, (r) => R(r() * w, r() * 70, 18 + r() * 20, 8, 1, '#000000', 'opacity=".035"'));
    s += R(28, 26, 304, 124, 6, '#FFFFFF', 'opacity=".55"');
    s += R(40, 22, 280, 36, 8, m.sign || '#1E2C62');
    s += `<text x="180" y="47" text-anchor="middle" font-family="Reem Kufi, Readex Pro, sans-serif" font-size="19" font-weight="700" fill="#FFFFFF">${name}</text>`;
    const stripes = 12; for (let i = 0; i < stripes; i++) s += P(`M${40 + i * (280 / stripes)} 58 h${280 / stripes} v18 q-${140 / stripes} 10 -${280 / stripes} 0 z`, i % 2 ? '#FFFFFF' : a);
    s += R(56, 84, 150, 66, 4, '#20283D', 'opacity=".9"') + R(60, 88, 142, 58, 3, '#FDF7EC');
    const pk = m.window || ['kofta', 'koshary', 'karkadeh'];
    pk.slice(0, 3).forEach((k, i) => { s += G((FOOD[k] || cutlery)(), `translate(${64 + i * 46} 94) scale(.22)`); });
    s += R(222, 84, 82, 66, 4, '#20283D', 'opacity=".92"') + R(226, 88, 36, 62, 2, a, 'opacity=".75"') + R(264, 88, 36, 62, 2, a, 'opacity=".55"') + C(258, 122, 2.4, '#F6C665');
    s += R(0, 146, w, 4, 0, '#20283D', 'opacity=".25"');
    return svg(s, `0 0 ${w} ${h}`, `class="illo shopfront ${o.cls || ''}" preserveAspectRatio="xMidYMid slice"`);
  };

  /* ------------------------------------------------------- scenes / states */
  const khayamiya = (color = '#33499F', o = 0.12) => {
    // an 8-point star lattice in the spirit of tentmaker applique
    let s = '';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = 25 + x * 50, cy = 25 + y * 50;
      s += P(`M${cx} ${cy - 18} L${cx + 6} ${cy - 6} L${cx + 18} ${cy} L${cx + 6} ${cy + 6} L${cx} ${cy + 18} L${cx - 6} ${cy + 6} L${cx - 18} ${cy} L${cx - 6} ${cy - 6} Z`, color, `opacity="${o}"`);
      s += R(cx - 8, cy - 8, 16, 16, 2, 'none', `stroke="${color}" stroke-width="1.5" opacity="${o * 1.4}" transform="rotate(45 ${cx} ${cy})"`);
    }
    return s;
  };
  const patternURI = (color, o) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">${khayamiya(color, o)}</svg>`);
  const town = () => {
    // generic riverside town silhouette — no real landmarks
    let s = R(0, 0, 360, 220, 0, 'transparent');
    s += P('M0 170 C80 150 160 190 240 168 C300 152 330 160 360 156 L360 220 L0 220 Z', '#BFD9EA', 'opacity=".9"');
    const houses = [[20, 96, 44, 74], [70, 110, 36, 60], [112, 84, 52, 86], [172, 104, 40, 66], [218, 92, 48, 78], [272, 112, 38, 58], [314, 98, 40, 72]];
    houses.forEach(([x, y, w, h], i) => { s += R(x, y, w, h, 3, i % 2 ? '#E9E4DA' : '#F4F1EA') + R(x + 8, y + 14, 10, 12, 2, '#33499F', 'opacity=".75"') + R(x + w - 18, y + 14, 10, 12, 2, '#33499F', 'opacity=".75"') + R(x + w / 2 - 6, y + h - 22, 12, 22, 2, '#1E6B8A'); });
    [[62, 60], [200, 66], [300, 58]].forEach(([x, y]) => { s += R(x - 2, y, 4, 70, 2, '#8C5A2B') + P(`M${x} ${y} q-24 -2 -30 10 M${x} ${y} q24 -2 30 10 M${x} ${y} q-14 -16 -24 -14 M${x} ${y} q14 -16 24 -14`, 'none', 'stroke="#3E8A3A" stroke-width="6" stroke-linecap="round"'); });
    return s;
  };
  const scene = (kind) => {
    const S = {
      town: () => svg(town(), '0 0 360 220', 'class="illo scene"'),
      cash: () => svg(R(96, 44, 190, 96, 12, '#237343', 'transform="rotate(-8 190 92)"') + R(104, 52, 174, 80, 8, '#2F8C52', 'transform="rotate(-8 190 92)"') + R(50, 70, 200, 100, 12, '#2F8C52') + R(60, 80, 180, 80, 8, '#3FA466') + C(150, 120, 26, '#2F8C52') + `<text x="150" y="129" text-anchor="middle" font-size="24" font-weight="700" fill="#EAF6EE" font-family="Readex Pro, sans-serif">100</text>` + P('M30 184 q60 -30 120 -10 q40 12 140 -6', 'none', 'stroke="#AA1D51" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round"'), '0 0 320 200', 'class="illo scene"'),
      gift: () => svg(G(giftBox(), 'translate(20 10) scale(.9)') + G(town(), 'translate(150 60) scale(.45)') + P('M150 150 q40 -60 110 -40', 'none', 'stroke="#AA1D51" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round"'), '0 0 320 200', 'class="illo scene"'),
      emptyCart: () => svg(G(basket(), 'translate(40 10) scale(.8)') + P('M30 180 h180', 'none', 'stroke="#B9BFCC" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"'), '0 0 240 200', 'class="illo scene"'),
      offline: () => svg(C(120, 100, 70, '#E9EBF0') + `<g transform="translate(72 52) scale(4)" fill="none" stroke="#6F788B" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS['wifi-off']}</g>`, '0 0 240 200', 'class="illo scene"'),
    };
    return (S[kind] || S.town)();
  };

  return { food, shopfront, scene, patternURI, FOOD };
})();
