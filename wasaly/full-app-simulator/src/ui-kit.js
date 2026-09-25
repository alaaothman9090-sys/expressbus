/* ==========================================================================
   ui-kit.js — shared building blocks for every role's screens.
   ========================================================================== */

/* ---------- truth classification (never blurred) ---------- */
const TRUTH_KINDS = {
  current: { ar: 'موجود حاليًا', en: 'Current / verified', icon: 'badge-check' },
  draft: { ar: 'مسودة سياسة', en: 'Policy draft', icon: 'file-text' },
  proposal: { ar: 'اقتراح', en: 'Proposal', icon: 'lightbulb' },
  problem: { ar: 'مشكلة مكتشفة', en: 'Problem found', icon: 'triangle-alert' },
  solution: { ar: 'حل مقترح', en: 'Proposed solution', icon: 'wrench' },
  decision: { ar: 'قرار المؤسس مطلوب', en: 'Founder decision required', icon: 'scale' },
  legal: { ar: 'مراجعة قانونية مطلوبة', en: 'Legal review required', icon: 'landmark' },
  finance: { ar: 'مراجعة مالية مطلوبة', en: 'Financial review required', icon: 'calculator' },
  pilot: { ar: 'يحتاج تجربة فعلية', en: 'Pilot validation required', icon: 'clipboard-check' },
  notbuilt: { ar: 'غير مبني حاليًا', en: 'Not built', icon: 'construction' },
  sim: { ar: 'محاكاة فقط', en: 'Simulation only', icon: 'flask-conical' },
  unknown: { ar: 'غير محسوم', en: 'Unknown', icon: 'circle-help' },
};
const truth = (k, o = {}) => { const t = TRUTH_KINDS[k] || TRUTH_KINDS.unknown; return `<span class="${cls('truth', 'st-' + k, o.cls)}" title="${attr(L(t.ar, t.en))}">${ic(t.icon, o.size || 13)}<span>${o.label || L(t.ar, t.en)}</span></span>`; };

/* ---------- annotation marker: only visible in founder review mode ---------- */
function A(id, o = {}) {
  if (!S.set.review) return '';
  const f = FINDINGS_BY_ID[id]; if (!f) return '';
  CUR.anno.add(id);
  const t = TRUTH_KINDS[f.type] || TRUTH_KINDS.unknown;
  return `<button type="button" class="${cls('anno', 'st-' + f.type, o.cls)}" data-act="anno" data-id="${attr(id)}" aria-label="${attr(`${L(t.ar, t.en)}: ${f.title}`)}">${ic(t.icon, 14)}<span class="anno-k">${f.num}</span><span class="anno-t">${esc(o.short || f.short || f.title)}</span></button>`;
}
/* several markers in a row */
const AA = (...ids) => { const x = ids.map((i) => A(i)).join(''); return x ? `<div class="anno-row">${x}</div>` : ''; };
/* policy reference chip (opens the policy drawer) */
function P(id, o = {}) {
  CUR.pol.add(id);
  if (o.silent) return '';
  return `<button type="button" class="pol-chip" data-act="policy" data-id="${attr(id)}">${ic('scroll-text', 12)}<span>${esc(id)}</span></button>`;
}

/* ---------- per-render context (what the current screen references) ---------- */
const CUR = { pol: new Set(), anno: new Set(), step: null, title: '' };
function resetCur() { CUR.pol = new Set(); CUR.anno = new Set(); CUR.step = null; CUR.title = ''; }

/* ---------- headers ---------- */
function appbar(title, o = {}) {
  const left = o.back ? `<button type="button" class="icon-btn appbar-back" data-act="${o.backAct || 'back'}" aria-label="${attr(L('رجوع', 'Back'))}">${back(22)}</button>` : (o.lead || '');
  return `<header class="${cls('appbar', o.transparent && 'appbar-clear', o.cls)}">${left}<div class="appbar-title">${o.eyebrow ? `<span class="eyebrow">${o.eyebrow}</span>` : ''}<h1>${title}</h1></div><div class="appbar-actions">${o.actions || ''}</div></header>`;
}
const sectionHead = (title, o = {}) => `<div class="sec-head">${o.icon ? ic(o.icon, 18) : ''}<h2>${title}</h2>${o.aside ? `<div class="sec-aside">${o.aside}</div>` : ''}</div>`;

/* ---------- list rows ---------- */
function row(o) {
  const tag = o.act ? 'button' : 'div';
  const data = o.act ? ` type="button" data-act="${o.act}"${Object.entries(o.data || {}).map(([k, v]) => ` data-${k}="${attr(v)}"`).join('')}` : '';
  return `<${tag} class="${cls('row', o.act && 'row-tap', o.cls)}"${data}>${o.icon ? `<span class="row-ic ${o.iconTone ? 'tone-' + o.iconTone : ''}">${ic(o.icon, 20)}</span>` : ''}${o.media || ''}<span class="row-main"><span class="row-title">${o.title}</span>${o.sub ? `<span class="row-sub">${o.sub}</span>` : ''}</span>${o.end ? `<span class="row-end">${o.end}</span>` : ''}${o.act && !o.noChevron ? `<span class="row-chev">${fwd(18)}</span>` : ''}</${tag}>`;
}
const listBox = (rows, o = {}) => `<div class="${cls('list', o.cls)}">${rows.join('')}</div>`;

/* ---------- status pill ---------- */
function stPill(st) {
  const m = STATUS_META[st] || { ar: st, en: st, tone: 'neutral' };
  return `<span class="${cls('pill', 'pill-' + m.tone)}">${m.proposed ? ic('flask-conical', 12) : ''}${L(m.ar, m.en)}</span>`;
}

/* ---------- media ---------- */
const food = (kind, o = {}) => `<span class="${cls('food', o.cls)}" style="${o.bg ? `--food-bg:${o.bg}` : ''}">${IL.food(kind)}</span>`;
const merchantLogo = (m, size = 44) => `<span class="mlogo" style="--m-accent:${m.accent};--m-soft:${m.accentSoft};width:${size}px;height:${size}px">${ic(m.logoIcon || 'store', Math.round(size * 0.5))}</span>`;
const demoTag = () => `<span class="demo-tag" title="${attr(L('بيانات تجريبية', 'Fictional demo data'))}">${ic('flask-conical', 11)}${L('تجريبي', 'Demo')}</span>`;

/* ---------- money line ---------- */
const moneyRow = (label, v, o = {}) => `<div class="${cls('mrow', o.strong && 'mrow-strong', o.cls)}"><span>${label}${o.note ? `<small>${o.note}</small>` : ''}</span><b class="num">${o.raw ? v : money(v, o)}</b></div>`;

/* ---------- empty / skeleton / banner ---------- */
const empty = (illo, title, sub, action) => `<div class="empty">${illo ? `<div class="empty-illo">${illo}</div>` : ''}<h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}${action || ''}</div>`;
const skel = (n = 3) => `<div class="skel-wrap" aria-busy="true" aria-label="${attr(L('جاري التحميل', 'Loading'))}">${Array.from({ length: n }, () => '<div class="skel skel-card"></div>').join('')}</div>`;
const banner = (tone, icon, text, action) => `<div class="banner banner-${tone}" role="status">${ic(icon, 18)}<div class="banner-t">${text}</div>${action || ''}</div>`;
const note = (text, o = {}) => `<p class="${cls('note', o.cls)}">${o.icon !== false ? ic(o.icon || 'info', 14) : ''}<span>${text}</span></p>`;

/* ---------- stepper (quantity) ---------- */
const stepper = (val, actMinus, actPlus, data = {}, o = {}) => {
  const d = Object.entries(data).map(([k, v]) => ` data-${k}="${attr(v)}"`).join('');
  return `<div class="stepper" role="group" aria-label="${attr(L('الكمية', 'Quantity'))}"><button type="button" class="stp-btn" data-act="${actMinus}"${d} aria-label="${attr(L('قلّل', 'Decrease'))}"${o.minDisabled ? ' disabled' : ''}>${ic(val <= 1 && o.trash ? 'trash-2' : 'minus', 18)}</button><output class="stp-val num" aria-live="polite">${val}</output><button type="button" class="stp-btn" data-act="${actPlus}"${d} aria-label="${attr(L('زوّد', 'Increase'))}"${o.maxDisabled ? ' disabled' : ''}>${ic('plus', 18)}</button></div>`;
};

/* ---------- timeline (the stitched thread) ---------- */
function thread(steps) {
  // steps: [{label, sub, state: done|now|todo|fail|block, icon}]
  return `<ol class="thread">${steps.map((s) => `<li class="th-step th-${s.state}"><span class="th-dot">${ic(s.state === 'done' ? 'check' : s.state === 'fail' ? 'x' : s.state === 'block' ? 'ban' : (s.icon || 'circle'), 14)}</span><div class="th-body"><span class="th-label">${s.label}</span>${s.sub ? `<span class="th-sub">${s.sub}</span>` : ''}${s.extra || ''}</div></li>`).join('')}</ol>`;
}

/* ---------- sheet & dialog containers (rendered by the shell) ---------- */
function sheetWrap(inner, o = {}) {
  return `<div class="sheet-layer" data-key="sheet-${o.key || 'x'}"><button type="button" class="scrim" data-act="${o.closeAct || 'sheet-close'}" aria-label="${attr(L('إغلاق', 'Close'))}" tabindex="-1"></button><section class="${cls('sheet', o.tall && 'sheet-tall', o.cls)}" role="dialog" aria-modal="true" aria-label="${attr(o.label || '')}" tabindex="-1"><div class="sheet-grip" aria-hidden="true"></div>${o.title ? `<div class="sheet-head"><h2>${o.title}</h2><button type="button" class="icon-btn" data-act="${o.closeAct || 'sheet-close'}" aria-label="${attr(L('إغلاق', 'Close'))}">${ic('x', 20)}</button></div>` : ''}<div class="sheet-body">${inner}</div>${o.footer ? `<div class="sheet-foot">${o.footer}</div>` : ''}</section></div>`;
}

/* ---------- form fields ---------- */
function field(o) {
  const id = o.id || uid('f');
  const req = o.req ? `<span class="req" aria-hidden="true">*</span>` : '';
  const input = o.textarea
    ? `<textarea id="${id}" class="input textarea" data-bind="${o.bind}" rows="${o.rows || 3}" ${o.placeholder ? `placeholder="${attr(o.placeholder)}"` : ''} ${o.max ? `maxlength="${o.max}"` : ''}>${esc(o.value || '')}</textarea>`
    : `<input id="${id}" class="input" data-bind="${o.bind}" type="${o.type || 'text'}" value="${attr(o.value || '')}" ${o.placeholder ? `placeholder="${attr(o.placeholder)}"` : ''} ${o.inputmode ? `inputmode="${o.inputmode}"` : ''} ${o.autocomplete ? `autocomplete="${o.autocomplete}"` : 'autocomplete="off"'} ${o.disabled ? 'disabled' : ''} ${o.dir ? `dir="${o.dir}"` : ''}>`;
  return `<div class="${cls('field', o.error && 'has-error')}"><label for="${id}">${o.label}${req}</label>${input}${o.help ? `<p class="help">${o.help}</p>` : ''}${o.error ? `<p class="err" role="alert">${ic('circle-alert', 14)}${o.error}</p>` : ''}</div>`;
}
const radioCard = (name, value, cur, title, sub, o = {}) => `<button type="button" role="radio" aria-checked="${value === cur}" class="${cls('rcard', value === cur && 'on', o.disabled && 'is-disabled', o.cls)}" data-act="${o.act || 'pick'}" data-k="${attr(name)}" data-v="${attr(value)}"${o.disabled ? ' aria-disabled="true"' : ''}>${o.icon ? `<span class="rcard-ic">${ic(o.icon, 22)}</span>` : ''}<span class="rcard-main"><span class="rcard-title">${title}</span>${sub ? `<span class="rcard-sub">${sub}</span>` : ''}</span>${o.end || ''}<span class="rcard-dot" aria-hidden="true"></span></button>`;
