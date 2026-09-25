/* ==========================================================================
   core.js — tiny runtime: escaping, i18n, formatting, DOM morph, storage,
   event delegation. Everything renders from one state object (S) into HTML
   strings; morph() patches the live DOM so focus, scroll and CSS transitions
   survive re-renders.
   ========================================================================== */
'use strict';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const attr = esc;
const cls = (...xs) => xs.filter(Boolean).join(' ');
const when = (cond, html) => (cond ? (typeof html === 'function' ? html() : html) : '');
const each = (arr, fn) => (arr || []).map(fn).join('');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = (() => { let n = 0; return (p = 'u') => p + (++n).toString(36) + Date.now().toString(36).slice(-3); })();
const deepClone = (o) => JSON.parse(JSON.stringify(o));

/* ---------- language ---------- */
let LANG = 'ar';
const L = (ar, en) => (LANG === 'en' && en != null ? en : ar);
const isRTL = () => LANG !== 'en';

/* ---------- numbers / money / time ---------- */
const fmtNum = (n, d = 0) => {
  const v = Number(n || 0);
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const money = (n, opts = {}) => {
  const v = Number(n || 0);
  const d = opts.d != null ? opts.d : (Math.round(v) === v ? 0 : 2);
  const s = fmtNum(Math.abs(v), d);
  const sign = v < 0 ? '−' : (opts.plus && v > 0 ? '+' : '');
  return LANG === 'en' ? `${sign}EGP ${s}` : `${sign}${s} ج.م`;
};
/* sim clock: t = minutes since 19:30 on the simulated evening */
const START_MIN = 19 * 60 + 30;
const clockStr = (t) => {
  const m = Math.floor(START_MIN + (t || 0));
  const day = Math.floor(m / 1440);
  const mm = ((m % 1440) + 1440) % 1440;
  let h = Math.floor(mm / 60); const mi = mm % 60;
  const pm = h >= 12; h = h % 12; if (h === 0) h = 12;
  const s = `${h}:${String(mi).padStart(2, '0')}`;
  const suffix = LANG === 'en' ? (pm ? ' PM' : ' AM') : (pm ? ' م' : ' ص');
  return (day > 0 ? L(`بكرة ${s}`, `Tomorrow ${s}`) : s) + suffix;
};
const durStr = (min) => {
  const m = Math.max(0, Math.round(min));
  if (m < 1) return L('أقل من دقيقة', 'under a minute');
  if (m < 60) return LANG === 'en' ? `${m} min` : `${m} دقيقة`;
  const h = Math.floor(m / 60), r = m % 60;
  return LANG === 'en' ? `${h}h ${r}m` : `${h} ساعة${r ? ` و${r} دقيقة` : ''}`;
};

/* ---------- icons ---------- */
const MISSING_ICONS = new Set();
const ic = (name, size = 20, extra = '') => {
  const body = ICONS[name];
  if (!body) { if (!MISSING_ICONS.has(name)) { MISSING_ICONS.add(name); console.warn('missing icon', name); } return ic('circle', size, extra); }
  return `<svg class="ic ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
};
/* icons that carry direction and must mirror in RTL (arrows, chevrons, send) */
/* icons drawn for left-to-right reading that must mirror in RTL. Media controls, clocks, checks and maps never mirror. */
const DIR_ICONS = new Set(['send', 'log-out', 'log-in', 'undo-2', 'redo-2', 'external-link', 'list-filter']);
const icd = (name, size = 20, extra = '') => ic(name, size, cls(extra, DIR_ICONS.has(name) && 'ic-dir'));
/* "forward" chevron in the reading direction */
const fwd = (size = 18) => ic('chevron-left', size, 'ic-fwd');
const back = (size = 22) => ic('arrow-right', size, 'ic-back');

/* ---------- DOM morph ---------- */
function morph(from, to) {
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName ||
      (from.nodeType === 1 && from.getAttribute('data-key') !== to.getAttribute('data-key'))) {
    from.replaceWith(to);
    return to;
  }
  if (from.nodeType === 3 || from.nodeType === 8) {
    if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
    return from;
  }
  syncAttrs(from, to);
  if (from.getAttribute('data-morph') === 'skip') return from;
  morphChildren(from, to);
  return from;
}
function syncAttrs(from, to) {
  const focused = from === document.activeElement;
  const details = from.nodeName === 'DETAILS'; // the reader opens/closes <details>; a re-render must not undo it
  for (const a of Array.from(from.attributes)) {
    if (!to.hasAttribute(a.name)) {
      if (a.name === 'value' && focused) continue;
      if (a.name === 'open' && details) continue;
      from.removeAttribute(a.name);
    }
  }
  for (const a of Array.from(to.attributes)) {
    if (from.getAttribute(a.name) !== a.value) {
      if (a.name === 'value' && focused) continue;
      if (a.name === 'open' && details) continue;
      from.setAttribute(a.name, a.value);
    }
  }
  const tag = from.nodeName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    if (!focused) {
      const v = to.getAttribute('value');
      if (tag === 'TEXTAREA') { const tv = to.textContent; if (from.value !== tv) from.value = tv; }
      else if (tag === 'SELECT') { /* handled after children */ }
      else if (from.type === 'checkbox' || from.type === 'radio') from.checked = to.hasAttribute('checked');
      else if (v != null && from.value !== v) from.value = v;
      else if (v == null && from.value && from.type !== 'file') from.value = '';
    }
  }
}
function morphChildren(from, to) {
  const newKids = Array.from(to.childNodes);
  const pending = new Map();
  for (const k of Array.from(from.childNodes)) if (k.nodeType === 1 && k.hasAttribute('data-key')) pending.set(k.getAttribute('data-key'), k);
  let cursor = from.firstChild;
  for (const nk of newKids) {
    const key = nk.nodeType === 1 ? nk.getAttribute('data-key') : null;
    if (key != null) {
      const match = pending.get(key);
      if (match) {
        pending.delete(key);
        if (match === cursor) cursor = cursor.nextSibling; else from.insertBefore(match, cursor);
        morph(match, nk);
      } else {
        from.insertBefore(nk, cursor);
      }
      continue;
    }
    while (cursor && cursor.nodeType === 1 && cursor.hasAttribute('data-key') && pending.has(cursor.getAttribute('data-key'))) cursor = cursor.nextSibling;
    if (cursor && !(cursor.nodeType === 1 && cursor.hasAttribute('data-key'))) {
      const next = cursor.nextSibling;
      morph(cursor, nk);
      cursor = next;
    } else {
      from.insertBefore(nk, cursor);
    }
  }
  while (cursor) { const n = cursor.nextSibling; if (!(cursor.nodeType === 1 && cursor.hasAttribute('data-key') && !pending.has(cursor.getAttribute('data-key')))) cursor.remove(); cursor = n; }
  pending.forEach((n) => n.remove());
  if (from.nodeName === 'SELECT') {
    const sel = Array.from(to.options || []).findIndex((o) => o.hasAttribute('selected'));
    if (sel >= 0 && from.selectedIndex !== sel && from !== document.activeElement) from.selectedIndex = sel;
  }
}
const TPL = document.createElement('template');
function patch(el, html) {
  if (!el) return;
  TPL.innerHTML = html;
  const next = TPL.content;
  const wrapper = document.createElement(el.nodeName);
  wrapper.appendChild(next);
  morphChildren(el, wrapper);
}

/* ---------- storage (per-viewer conveniences only) ---------- */
const STORE_KEY = 'wasaly.fullapp.v1';
const Store = {
  load() { try { const s = window.localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  save(obj) { try { window.localStorage.setItem(STORE_KEY, JSON.stringify(obj)); return true; } catch (e) { return false; } },
  clear() { try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* storage blocked */ } },
};

/* ---------- actions & delegation ---------- */
const ACT = Object.create(null);
function onAct(name, fn) { ACT[name] = fn; }
function initDelegation(root) {
  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;
    const name = el.getAttribute('data-act');
    const fn = ACT[name];
    if (!fn) { console.warn('no action', name); return; }
    if (el.tagName === 'A') ev.preventDefault();
    fn(el.dataset, el, ev);
  });
  root.addEventListener('input', (ev) => {
    const el = ev.target.closest('[data-bind]');
    if (!el) return;
    const fn = ACT['bind:' + el.getAttribute('data-bind')];
    if (fn) fn(el.type === 'checkbox' ? el.checked : el.value, el, ev);
  });
  root.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-change]');
    if (!el) return;
    const fn = ACT['change:' + el.getAttribute('data-change')];
    if (fn) fn(el.type === 'checkbox' ? el.checked : el.value, el, ev);
  });
  root.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { const fn = ACT['escape']; if (fn) fn({}, null, ev); }
  });
}

/* ---------- small html helpers ---------- */
const btn = (label, act, o = {}) => {
  const data = Object.entries(o.data || {}).map(([k, v]) => ` data-${k}="${attr(v)}"`).join('');
  const kind = o.kind || 'primary';
  const busy = o.busy ? ' data-busy="1" aria-busy="true"' : '';
  const dis = o.disabled ? ' disabled aria-disabled="true"' : '';
  const aria = o.aria ? ` aria-label="${attr(o.aria)}"` : '';
  const icon = o.icon ? icd(o.icon, o.iconSize || 20) : '';
  const tail = o.tail ? `<span class="btn-tail">${o.tail}</span>` : '';
  return `<button type="button" class="${cls('btn', 'btn-' + kind, o.size && 'btn-' + o.size, o.block && 'btn-block', o.cls)}" data-act="${act}"${data}${busy}${dis}${aria}>${icon}<span class="btn-label">${label}</span>${tail}${o.busy ? '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}</button>`;
};
const iconBtn = (icon, label, act, o = {}) => {
  const data = Object.entries(o.data || {}).map(([k, v]) => ` data-${k}="${attr(v)}"`).join('');
  return `<button type="button" class="${cls('icon-btn', o.cls)}" data-act="${act}"${data} aria-label="${attr(label)}" title="${attr(label)}"${o.pressed != null ? ` aria-pressed="${o.pressed}"` : ''}${o.disabled ? ' disabled' : ''}>${icd(icon, o.size || 22)}${o.badge ? `<span class="badge-dot" aria-hidden="true">${o.badge}</span>` : ''}</button>`;
};
const chip = (label, o = {}) => `<span class="${cls('chip', o.tone && 'chip-' + o.tone, o.cls)}">${o.icon ? ic(o.icon, 14) : ''}${label}</span>`;
const SEG_LABELS = { lang: ['اللغة', 'Language'], theme: ['المظهر', 'Theme'], device: ['مقاس الجهاز', 'Device width'], gps: ['حالة GPS', 'GPS state'], network: ['حالة الشبكة', 'Network state'], rcgroup: ['تجميع حسب', 'Group by'], speed: ['سرعة المحاكاة', 'Simulation speed'], mstatus: ['حالة المتجر', 'Store status'] };
const seg = (name, value, options, act = 'seg') => `<div class="seg" role="radiogroup" aria-label="${attr(SEG_LABELS[name] ? L(SEG_LABELS[name][0], SEG_LABELS[name][1]) : name)}">${options.map((o) => `<button type="button" role="radio" aria-checked="${o.v === value}" class="${cls('seg-btn', o.v === value && 'on')}" data-act="${act}" data-k="${attr(name)}" data-v="${attr(o.v)}"${o.title ? ` title="${attr(o.title)}"${o.label ? '' : ` aria-label="${attr(o.title)}"`}` : ''}>${o.icon ? ic(o.icon, 16) : ''}${o.label != null ? `<span>${o.label}</span>` : ''}</button>`).join('')}</div>`;
const toggle = (on, act, label, o = {}) => `<button type="button" role="switch" aria-checked="${!!on}" class="${cls('switch', on && 'on', o.cls)}" data-act="${act}"${o.data ? Object.entries(o.data).map(([k, v]) => ` data-${k}="${attr(v)}"`).join('') : ''} aria-label="${attr(label)}"><span class="knob"></span></button>`;
