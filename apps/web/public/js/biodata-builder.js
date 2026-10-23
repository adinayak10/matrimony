/* Biodata builder (docs/plans/02-biodata-maker.md, Phase 3 "Builder").
 *
 * One IIFE, internal modules:
 *   util     DOM construction (no innerHTML for user data), icons, paths, fetch helper
 *   store    app state with structural sharing, undo/redo of previous `doc` references
 *   modal    focus-trapped dialogs and drawers, a confirm helper, notices and toasts
 *   persist  guest localStorage autosave, owner cloud autosave (POST/PUT with ifVersion)
 *   forms    step panels generated from K.schema.FIELDS
 *   sections section order / visibility / titles (design.sectionOrder, hiddenSections, data.sectionTitles)
 *   photo    BiodataCropper + owner upload
 *   preview  same-origin iframe from K.previewShell, re-rendered with K.renderBiodataParts
 *   exporter server PDF (guest render or owner document) with Print fallback
 *   stepper  12-step tablist with progress and completion dots
 *
 * Reads window.BM_BIODATA_BOOT (views/pages/biodata-maker-create.ejs) and
 * window.BiodataKit (packages/shared/biodata). Styles: css/biodata-builder.css.
 * The only innerHTML sink is the preview root (kit output, escaped by the kit).
 */
(function (w, d) {
  'use strict';

  var app = d.getElementById('bdm-app');
  if (!app) return;

  var K = w.BiodataKit;
  var BOOT = w.BM_BIODATA_BOOT || {};
  var LS_KEY = 'bm:biodata:v1';
  var API = '/api/biodata';
  var A4W = 794;
  var REDUCED = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var MQ_DESKTOP = w.matchMedia ? w.matchMedia('(min-width: 992px)') : { matches: true, addListener: function () {} };
  var MQ_WIDE = w.matchMedia ? w.matchMedia('(min-width: 1280px)') : { matches: true, addListener: function () {} };

  // ---------------------------------------------------------------- util
  var NS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
    plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
    trash: 'M9 3h6l1 1h4v2H4V4h4l1-1zM6 8h12l-1 13H7L6 8z',
    up: 'M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z',
    down: 'M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z',
    eye: 'M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    eyeOff: 'M2.1 3.5 3.5 2.1l18.4 18.4-1.4 1.4-3.2-3.2A11 11 0 0 1 12 19c-5 0-9-4.5-10-7 .6-1.5 2-3.6 4.1-5.2L2.1 3.5zM12 5c5 0 9 4.5 10 7-.4 1-1.2 2.4-2.4 3.7L16 12.1A4 4 0 0 0 11.9 8L9.3 5.4C10.2 5.1 11.1 5 12 5z',
    drag: 'M9 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM9 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM9 18a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
    edit: 'M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    camera: 'M9 3h6l1.8 2H20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.2L9 3zm3 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
    history: 'M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8H12z',
    copy: 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z',
    link: 'M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10z',
    refresh: 'M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    left: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    right: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
    info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 5h2v2h-2V7zm0 4h2v6h-2v-6z',
    warn: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    lock: 'M6 10V8a6 6 0 1 1 12 0v2h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1h1zm2 0h8V8a4 4 0 1 0-8 0v2z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    star: 'M12 2l2.4 6.9H22l-6 4.6 2.3 7L12 16.2 5.7 20.5l2.3-7-6-4.6h7.6z',
    download: 'M11 3h2v9.17l3.59-3.58L18 10l-6 6-6-6 1.41-1.41L11 12.17V3zM5 19h14v2H5v-2z',
    print: 'M7 3h10v4H7V3zM5 8h14a3 3 0 0 1 3 3v6h-4v4H6v-4H2v-6a3 3 0 0 1 3-3zm3 8v3h8v-3H8z',
    image: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z',
    user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-9 2.2-9 5v3h18v-3c0-2.8-4.6-5-9-5z',
    people: 'M16 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm-8 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm0 2c-2.7 0-8 1.3-8 4v3h10v-3c0-1.2.6-2.2 1.6-3A13 13 0 0 0 8 13zm8 0c-.4 0-.8 0-1.3.1 1.4 1 2.3 2.3 2.3 3.9v3h7v-3c0-2.7-5.3-4-8-4z',
    cap: 'M12 3 1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2v4L12 21l7-3.8v-4L12 17l-7-3.8z',
    briefcase: 'M10 3h4a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v4H2V9a2 2 0 0 1 2-2h4V5a2 2 0 0 1 2-2zm0 4h4V5h-4v2zM2 15h8v2h4v-2h8v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z',
    rupee: 'M6 3h12v2h-3.3c.5.6.9 1.3 1.1 2H18v2h-2.2c-.5 2.6-2.7 4.6-5.5 4.9L16.6 21h-2.7l-6.1-7.1V12h2c1.7 0 3.1-1.1 3.5-3H6V7h7.3c-.5-1.2-1.6-2-3.3-2H6V3z',
    diya: 'M12 2c1 3 4 4.5 4 8.5A4 4 0 0 1 12 15a4 4 0 0 1-4-4.5c0-1.6.8-2.8 1.6-3.8.2 1.4 1 2.3 1.9 2.3C11.5 6.5 10.7 4.5 12 2zM3 16h18l-2.5 5h-13L3 16z',
    leaf: 'M17 8C8 10 5.9 16.2 3.8 21.3l1.9.7 1-2.3c.5.2 1 .3 1.3.3C19 20 22 3 22 3c-1 2-8 2.3-13 3.3S2 11.5 2 13.5s1.8 3.8 1.8 3.8C7 8 17 8 17 8z',
    heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    phone: 'M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z',
    note: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM8 12h8v2H8v-2zm0 4h8v2H8v-2zm5-7V3.5L18.5 9H13z',
    palette: 'M12 2a10 10 0 0 0 0 20c.9 0 1.5-.7 1.5-1.5 0-.4-.1-.7-.4-1-.2-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a6 6 0 0 0 6-6c0-5-4.5-9-10-9zM6.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
    share: 'M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1z',
    folder: 'M10 4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6z',
    reset: 'M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z',
    sections: 'M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z',
  };
  var STEP_META = {
    personal: { title: 'Personal details', icon: 'user', desc: 'Start with the basics: name, birth details, height and a short introduction.' },
    photo: { title: 'Photo', icon: 'camera', desc: 'A clear, recent photo makes a biodata feel complete. Crop and rotate it here.' },
    family: { title: 'Family', icon: 'people', desc: 'Parents, siblings and a few words about your family.' },
    education: { title: 'Education', icon: 'cap', desc: 'Your highest qualification and the degrees you want to list.' },
    profession: { title: 'Profession', icon: 'briefcase', desc: 'What you do and where you work.' },
    income: { title: 'Income', icon: 'rupee', desc: 'Optional. Show an amount, words such as "Well settled", or leave it out.' },
    religion: { title: 'Religion & community', icon: 'diya', desc: 'Religion, community, gotra and horoscope details. Fields adapt to the religion you choose.' },
    lifestyle: { title: 'Lifestyle', icon: 'leaf', desc: 'Diet, habits, hobbies and interests.' },
    partner: { title: 'Partner preferences', icon: 'heart', desc: 'What you are looking for in a life partner.' },
    contact: { title: 'Contact', icon: 'phone', desc: 'Who families should contact. Hide anything you prefer to share later.' },
    additional: { title: 'Additional details', icon: 'note', desc: 'Anything else: horoscope note, expectations, a closing line.' },
    design: { title: 'Design & export', icon: 'palette', desc: 'Pick a template, colours and fonts, arrange sections, then download or print.' },
  };
  var SUGGEST = {
    'personal.about': [
      'I am a calm, family-oriented person who values honesty and respect. I enjoy reading, cooking for my family and travelling to new places on weekends.',
      'Born and raised in a close-knit family, I work as a software engineer and believe in balancing career and family life. I am looking for a caring and understanding partner.',
    ],
    'family.familyAbout': [
      'We are a simple, God-fearing family with traditional values and a modern outlook. Our family is settled in our native place and we stay closely connected with relatives.',
    ],
    'partner.other': [
      'Looking for a well-educated, kind and understanding partner from a respectable family, who values both tradition and personal growth.',
    ],
    'additional.expectations': [
      'We are looking for a simple, mutual-respect based alliance. Families are welcome to contact us for further details and horoscope matching.',
    ],
  };
  var LIST_NOUN = { siblings: 'sibling', degrees: 'qualification' };

  function el(tag, attrs, kids) {
    var n = d.createElement(tag);
    var deferred = null;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'text') n.textContent = v;
        else if (k === 'className') n.className = v;
        else if (k === 'value' || k === 'checked' || k === 'selected') { deferred = deferred || {}; deferred[k] = v; }
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : String(v));
      });
    }
    append(n, kids);
    if (deferred) Object.keys(deferred).forEach(function (k) { n[k] = deferred[k]; });
    return n;
  }
  function append(n, kids) {
    if (kids === null || kids === undefined || kids === false) return n;
    if (!Array.isArray(kids)) kids = [kids];
    kids.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) append(n, c);
      else n.appendChild(typeof c === 'string' || typeof c === 'number' ? d.createTextNode(String(c)) : c);
    });
    return n;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function icon(name, size) {
    var svg = d.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size || 18));
    svg.setAttribute('height', String(size || 18));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'bdm-ic');
    var p = d.createElementNS(NS, 'path');
    p.setAttribute('d', ICONS[name] || ICONS.info);
    p.setAttribute('fill', 'currentColor');
    p.setAttribute('fill-rule', 'evenodd');
    svg.appendChild(p);
    return svg;
  }
  function btn(label, opts) {
    opts = opts || {};
    var cls = 'bdm-btn bdm-btn--' + (opts.kind || 'ghost') + (opts.size ? ' bdm-btn--' + opts.size : '') + (opts.className ? ' ' + opts.className : '');
    var attrs = { type: 'button', className: cls, onclick: opts.onClick, 'aria-label': opts.ariaLabel, title: opts.title, 'aria-pressed': opts.pressed === undefined ? null : String(!!opts.pressed), disabled: opts.disabled, 'data-fkey': opts.fkey };
    return el('button', attrs, [opts.icon ? icon(opts.icon, 16) : null, label ? el('span', { text: label }) : null]);
  }
  function iconBtn(name, label, onClick, extra) {
    var b = el('button', { type: 'button', className: 'bdm-iconbtn' + (extra && extra.className ? ' ' + extra.className : ''), 'aria-label': label, title: label, onclick: onClick, disabled: extra && extra.disabled, 'data-fkey': extra && extra.fkey }, [icon(name, 16)]);
    return b;
  }
  function getIn(obj, path) {
    var cur = obj;
    for (var i = 0; i < path.length; i += 1) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[path[i]];
    }
    return cur;
  }
  function setIn(obj, path, value) {
    if (!path.length) return value;
    var k = path[0];
    var copy;
    if (Array.isArray(obj)) copy = obj.slice();
    else if (obj && typeof obj === 'object') copy = Object.assign({}, obj);
    else copy = typeof k === 'number' ? [] : {};
    copy[k] = setIn(obj && typeof obj === 'object' ? obj[k] : undefined, path.slice(1), value);
    return copy;
  }
  function humanize(key) {
    var s = String(key || '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(t) { var x = new Date(t); return pad2(x.getHours()) + ':' + pad2(x.getMinutes()); }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function niceDate(t, withTime) {
    var x = new Date(t);
    if (isNaN(x.getTime())) return '';
    return x.getDate() + ' ' + MONTHS[x.getMonth()] + ' ' + x.getFullYear() + (withTime ? ', ' + hhmm(x) : '');
  }
  function uid(p) { return (p || 'c') + Math.random().toString(36).slice(2, 9); }
  function isTextTarget(t) {
    if (!t || !t.tagName) return false;
    if (t.isContentEditable) return true;
    var tag = t.tagName.toLowerCase();
    if (tag === 'textarea') return true;
    if (tag !== 'input') return false;
    return ['text', 'email', 'tel', 'number', 'search', 'url', 'date', 'time', 'password'].indexOf((t.type || 'text').toLowerCase()) !== -1;
  }
  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
  function fontUrl(file) { return '/fonts/biodata/' + file; }
  function today() { var t = new Date(); return t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()); }

  // fetch helper: always same-origin credentials, JSON envelope {status,data}/{status:false,code,message}.
  function api(method, url, body, opts) {
    opts = opts || {};
    var init = { method: method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) { init.body = JSON.stringify(body); init.headers['Content-Type'] = 'application/json'; }
    if (opts.signal) init.signal = opts.signal;
    return fetch(url, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        var ok = res.ok && j && j.status !== false;
        return { ok: ok, status: res.status, data: j ? j.data : null, body: j || {}, code: (j && j.code) || (ok ? '' : 'HTTP_' + res.status), message: (j && j.message) || '' };
      });
    }, function (err) {
      return { ok: false, status: 0, data: null, body: {}, code: err && err.name === 'AbortError' ? 'ABORTED' : 'NETWORK', message: '' };
    });
  }

  // ---------------------------------------------------------------- kit guard
  function fatal(msg) {
    app.classList.remove('is-loading');
    app.classList.add('is-error');
    var panel = d.getElementById('bdm-panel');
    clear(panel);
    append(panel, el('div', { className: 'bdm-empty' }, [
      el('span', { className: 'bdm-empty__icon' }, [icon('warn', 28)]),
      el('h2', { className: 'bdm-h2', text: 'The biodata maker could not start' }),
      el('p', { className: 'bdm-muted', text: msg }),
      el('button', { type: 'button', className: 'bdm-btn bdm-btn--primary', onclick: function () { w.location.reload(); } }, [icon('refresh', 16), el('span', { text: 'Reload the page' })]),
    ]));
  }
  if (!K || !K.schema || !K.registry || typeof K.renderBiodataParts !== 'function' || typeof K.previewShell !== 'function') {
    fatal('A required file did not load. Please check your connection and reload the page.');
    return;
  }

  var schema = K.schema;
  var FIELDS = schema.FIELDS || [];
  var STEPS = schema.STEPS || ['personal', 'photo', 'family', 'education', 'profession', 'income', 'religion', 'lifestyle', 'partner', 'contact', 'additional', 'design'];
  var SECTIONS = schema.SECTIONS || schema.DEFAULT_ORDER || ['personal', 'family', 'education', 'profession', 'income', 'religion', 'lifestyle', 'partner', 'contact', 'additional'];
  var LIMITS = Object.assign({ customPerSection: 6, customTotal: 20, titleMax: 80 }, schema.LIMITS || {});
  var FIELD_BY_ID = {};
  FIELDS.forEach(function (f) { FIELD_BY_ID[f.id] = f; });

  function tAny(lang, group, key) {
    var v = safe(function () { return K.t(lang, group, key); }, key);
    return v === key ? '' : v;
  }
  function fieldLabel(id) { return tAny('en', 'fields', id) || humanize(String(id).split('.').pop()); }
  function sectionLabel(s, lang) { return tAny(lang || 'en', 'sections', s) || (STEP_META[s] ? STEP_META[s].title : humanize(s)); }
  function optValues(f) { return (f.options || []).map(function (o) { return o && typeof o === 'object' ? (o.value || o.id) : o; }); }
  function optLabel(f, v) { return tAny('en', 'values', (f.enumKey || f.key) + '.' + v) || humanize(v); }
  function stepTitle(s) { return STEP_META[s] ? STEP_META[s].title : sectionLabel(s); }

  // ---------------------------------------------------------------- templates
  var TEMPLATES = (Array.isArray(BOOT.templates) && BOOT.templates.length ? BOOT.templates : safe(function () { return K.registry.summary(); }, []))
    .map(function (t) { return Object.assign({}, t, { id: t.id || t.templateId }); })
    .filter(function (t) { return t.id && K.registry.get(t.id); });
  if (!TEMPLATES.length) TEMPLATES = safe(function () { return K.registry.summary(); }, []);
  var CATEGORIES = Array.isArray(BOOT.categories) && BOOT.categories.length ? BOOT.categories : (K.registry.CATEGORIES || []);
  function tplDef(id) { return K.registry.get(id) || K.registry.get(K.DEFAULT_TEMPLATE) || K.registry.get(TEMPLATES[0] && TEMPLATES[0].id); }
  function tplRow(id) { for (var i = 0; i < TEMPLATES.length; i += 1) if (TEMPLATES[i].id === id) return TEMPLATES[i]; return null; }
  function tplName(id) {
    var row = tplRow(id); var def = K.registry.get(id);
    var n = (row && (row.displayName || row.name)) || (def && def.name) || id;
    return typeof n === 'object' ? (n.en || id) : n;
  }
  function pickTemplate(id) {
    if (id && tplRow(id)) return id;
    if (BOOT.templateId && tplRow(BOOT.templateId)) return BOOT.templateId;
    if (K.DEFAULT_TEMPLATE && tplRow(K.DEFAULT_TEMPLATE)) return K.DEFAULT_TEMPLATE;
    return TEMPLATES[0] ? TEMPLATES[0].id : K.DEFAULT_TEMPLATE;
  }

  // ---------------------------------------------------------------- data helpers
  function emptyData() { return schema.emptyData(); }
  function mergeShape(base, raw) {
    if (Array.isArray(base)) return Array.isArray(raw) ? raw : base;
    if (base && typeof base === 'object') {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
      var out = Object.assign({}, base);
      Object.keys(raw).forEach(function (k) {
        out[k] = Object.prototype.hasOwnProperty.call(base, k) ? mergeShape(base[k], raw[k]) : raw[k];
      });
      return out;
    }
    if (raw === undefined || raw === null) return base;
    return typeof raw === 'object' ? base : raw;
  }
  function normalizeData(raw) {
    var merged = mergeShape(emptyData(), raw || {});
    var cleaned = safe(function () { return schema.clean(merged).data; }, merged) || merged;
    return mergeShape(emptyData(), cleaned);
  }
  function hasContent(data) {
    if (!data) return false;
    var e = emptyData();
    var n = normalizeData(data);
    e.invocation = '';
    n = Object.assign({}, n, { invocation: '' });
    return JSON.stringify(n) !== JSON.stringify(e);
  }
  function resolvedDesign(doc) {
    doc = doc || state.doc;
    var def = tplDef(doc.templateId);
    return safe(function () { return K.registry.resolveDesign(def, doc.design || {}); }, null) || Object.assign({}, def && def.defaults, doc.design || {});
  }
  function cleanDesignFor(design, templateId) {
    return safe(function () { return schema.cleanDesign(design || {}, templateId).design; }, design || {}) || {};
  }
  function photoAspect() {
    var def = tplDef(state.doc.templateId);
    var rd = resolvedDesign();
    if (def && def.photoAspect) return def.photoAspect;
    return /^(circle|round)$/.test(String(rd.photoShape || '')) ? 1 : 3 / 4;
  }

  // ---------------------------------------------------------------- store
  var state = {
    doc: { title: '', templateId: pickTemplate(BOOT.templateId), design: {}, data: emptyData() },
    photo: { dataUrl: '', url: '', busy: false, error: '' },
    ui: { step: 0, mobileTab: 'edit', touched: {}, warned: {}, visited: {} },
    meta: { documentId: '', version: 0, mode: BOOT.user ? 'owner' : 'guest', share: null },
  };
  // A new biodata starts with the template's suggested invocation line (editable, optional).
  function freshData(templateId) {
    var dd = emptyData();
    var def = tplDef(templateId);
    if (def && def.defaults && def.defaults.invocation) dd.invocation = def.defaults.invocation;
    return dd;
  }
  state.doc.data = freshData(state.doc.templateId);
  var listeners = [];
  var hist = { past: [], future: [], key: '', at: 0 };

  function record(prevDoc, key, coalesce) {
    var now = Date.now();
    if (coalesce && key === hist.key && now - hist.at < 1200) { hist.at = now; return; }
    hist.past.push(prevDoc);
    if (hist.past.length > 50) hist.past.shift();
    hist.future = [];
    hist.key = key;
    hist.at = now;
  }
  function emit(path, opts) { listeners.forEach(function (fn) { fn(path, opts || {}); }); }

  var store = {
    get: function (path) { return path ? getIn(state, path) : state; },
    set: function (path, value, opts) {
      opts = opts || {};
      if (getIn(state, path) === value) return;
      var before = state;
      state = setIn(state, path, value);
      if (path[0] === 'doc' && !opts.noHistory) record(before.doc, path.join('.'), !!opts.coalesce);
      emit(path, opts);
    },
    data: function (path, value, opts) { store.set(['doc', 'data'].concat(path), value, opts); },
    design: function (key, value, opts) {
      var next = Object.assign({}, state.doc.design || {});
      if (value === undefined) delete next[key]; else next[key] = value;
      store.set(['doc', 'design'], next, Object.assign({ rerender: true }, opts || {}));
    },
    replaceDoc: function (doc, opts) {
      opts = opts || {};
      var before = state;
      state = setIn(state, ['doc'], doc);
      if (!opts.noHistory) record(before.doc, 'replace:' + Date.now(), false);
      emit(['doc'], Object.assign({ external: true }, opts));
    },
    canUndo: function () { return hist.past.length > 0; },
    canRedo: function () { return hist.future.length > 0; },
    undo: function () {
      if (!hist.past.length) return;
      hist.future.push(state.doc);
      state = setIn(state, ['doc'], hist.past.pop());
      hist.key = '';
      emit(['doc'], { external: true, source: 'history' });
      announce('Undone');
    },
    redo: function () {
      if (!hist.future.length) return;
      hist.past.push(state.doc);
      state = setIn(state, ['doc'], hist.future.pop());
      hist.key = '';
      emit(['doc'], { external: true, source: 'history' });
      announce('Redone');
    },
    resetHistory: function () { hist.past = []; hist.future = []; hist.key = ''; },
    subscribe: function (fn) { listeners.push(fn); },
  };

  // ---------------------------------------------------------------- announcements, notices, toasts
  var liveEl = d.getElementById('bdm-live');
  function announce(msg) {
    if (!liveEl) return;
    liveEl.textContent = '';
    setTimeout(function () { liveEl.textContent = msg; }, 40);
  }
  var noticeBox = d.getElementById('bdm-notices');
  var notices = {
    set: function (key, o) {
      notices.hide(key);
      var actions = (o.actions || []).map(function (a) {
        if (a.href) return el('a', { className: 'bdm-btn bdm-btn--' + (a.kind || 'ghost') + ' bdm-btn--sm', href: a.href, text: a.label });
        return btn(a.label, { kind: a.kind || 'ghost', size: 'sm', onClick: a.onClick });
      });
      var n = el('div', { className: 'bdm-notice bdm-notice--' + (o.kind || 'info'), 'data-key': key, role: o.kind === 'error' ? 'alert' : 'status' }, [
        el('span', { className: 'bdm-notice__icon' }, [icon(o.kind === 'success' ? 'check' : o.kind === 'info' ? 'info' : 'warn', 18)]),
        el('div', { className: 'bdm-notice__body' }, [
          o.title ? el('p', { className: 'bdm-notice__title', text: o.title }) : null,
          o.text ? el('p', { className: 'bdm-notice__text', text: o.text }) : null,
        ]),
        actions.length ? el('div', { className: 'bdm-notice__actions' }, actions) : null,
        o.dismissible === false ? null : iconBtn('close', 'Dismiss', function () { notices.hide(key); if (o.onDismiss) o.onDismiss(); }, { className: 'bdm-iconbtn--sm' }),
      ]);
      noticeBox.appendChild(n);
    },
    hide: function (key) {
      var n = noticeBox.querySelector('[data-key="' + key + '"]');
      if (n) n.remove();
    },
  };
  var toastBox = d.getElementById('bdm-toasts');
  function toast(text, kind) {
    var t = el('div', { className: 'bdm-toast bdm-toast--' + (kind || 'ok') }, [icon(kind === 'error' ? 'warn' : 'check', 16), el('span', { text: text })]);
    toastBox.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); }, 2600);
    setTimeout(function () { t.remove(); }, 3000);
  }

  // ---------------------------------------------------------------- modal
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var modalStack = [];
  var modal = {
    open: function (o) {
      var opener = d.activeElement;
      var titleId = uid('bdm-mt-');
      var bodyId = uid('bdm-mb-');
      var body = el('div', { className: 'bdm-modal__body', id: bodyId }, typeof o.body === 'string' ? el('p', { text: o.body }) : o.body);
      var foot = el('div', { className: 'bdm-modal__foot' });
      var dialog = el('div', {
        className: 'bdm-modal__dialog' + (o.variant === 'drawer' ? ' bdm-modal__dialog--drawer' : '') + (o.size ? ' bdm-modal__dialog--' + o.size : ''),
        role: o.role || 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, 'aria-describedby': o.describe === false ? null : bodyId, tabindex: '-1',
      }, [
        el('div', { className: 'bdm-modal__head' }, [
          o.icon ? el('span', { className: 'bdm-modal__icon bdm-modal__icon--' + (o.tone || 'brand') }, [icon(o.icon, 20)]) : null,
          el('h2', { className: 'bdm-modal__title', id: titleId, text: o.title }),
          o.dismissible === false ? null : iconBtn('close', 'Close', function () { handle.close(null); }, { className: 'bdm-modal__x' }),
        ]),
        body,
        foot,
      ]);
      var overlay = el('div', { className: 'bdm-modal' + (o.variant === 'drawer' ? ' bdm-modal--drawer' : '') }, [dialog]);
      var closed = false;
      var handle = {
        el: dialog, body: body, foot: foot,
        close: function (result) {
          if (closed) return;
          closed = true;
          d.removeEventListener('keydown', onKey, true);
          overlay.classList.add('is-closing');
          setTimeout(function () { overlay.remove(); }, REDUCED ? 0 : 160);
          modalStack.splice(modalStack.indexOf(handle), 1);
          if (!modalStack.length) d.documentElement.classList.remove('bdm-lock');
          if (opener && opener.focus && d.contains(opener)) opener.focus();
          if (o.onClose) o.onClose(result);
        },
        setActions: function (actions) {
          clear(foot);
          (actions || []).forEach(function (a) {
            var b = a.href
              ? el('a', { className: 'bdm-btn bdm-btn--' + (a.kind || 'ghost'), href: a.href, text: a.label })
              : btn(a.label, { kind: a.kind || 'ghost', icon: a.icon, onClick: function () { var r = a.onClick ? a.onClick(handle) : undefined; if (r !== false) handle.close(a.value === undefined ? null : a.value); } });
            if (a.autofocus) b.setAttribute('data-autofocus', '');
            foot.appendChild(b);
          });
          foot.hidden = !foot.firstChild;
        },
      };
      function onKey(ev) {
        if (modalStack[modalStack.length - 1] !== handle) return;
        if (ev.key === 'Escape' && o.dismissible !== false) { ev.preventDefault(); ev.stopPropagation(); handle.close(null); return; }
        if (ev.key !== 'Tab') return;
        var items = Array.prototype.filter.call(dialog.querySelectorAll(FOCUSABLE), function (x) { return x.offsetParent !== null || x === d.activeElement; });
        if (!items.length) { ev.preventDefault(); dialog.focus(); return; }
        var first = items[0]; var last = items[items.length - 1];
        if (ev.shiftKey && (d.activeElement === first || d.activeElement === dialog)) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && d.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
      overlay.addEventListener('mousedown', function (ev) { if (ev.target === overlay && o.dismissible !== false) handle.close(null); });
      handle.setActions(o.actions);
      d.body.appendChild(overlay);
      d.documentElement.classList.add('bdm-lock');
      modalStack.push(handle);
      d.addEventListener('keydown', onKey, true);
      var auto = dialog.querySelector('[data-autofocus]') || dialog.querySelector('.bdm-modal__body ' + FOCUSABLE) || dialog;
      setTimeout(function () { auto.focus(); }, 30);
      return handle;
    },
    confirm: function (o) {
      return new Promise(function (resolve) {
        modal.open({
          title: o.title, body: o.message, icon: o.icon || (o.danger ? 'warn' : 'info'), tone: o.danger ? 'danger' : 'brand', size: 'sm',
          actions: [
            { label: o.cancelLabel || 'Cancel', kind: 'ghost', value: false },
            { label: o.confirmLabel || 'Continue', kind: o.danger ? 'danger' : 'primary', value: true, autofocus: true },
          ],
          onClose: function (r) { resolve(r === true); },
        });
      });
    },
  };

  // ---------------------------------------------------------------- status pill
  var statusEl = d.getElementById('bdm-status');
  var statusText = statusEl.querySelector('.bdm-status__text');
  var retryBtn = null;
  function setStatus(kind, text) {
    statusEl.className = 'bdm-status bdm-status--' + kind;
    statusText.textContent = text;
    if (kind === 'failed') {
      if (!retryBtn) {
        retryBtn = btn('Retry', { kind: 'link', size: 'sm', icon: 'refresh', onClick: function () { persist.retryNow(); } });
        retryBtn.classList.add('bdm-status__retry');
        statusEl.parentNode.insertBefore(retryBtn, statusEl.nextSibling);
      }
    } else if (retryBtn) { retryBtn.remove(); retryBtn = null; }
  }

  // ---------------------------------------------------------------- persist
  var persist = (function () {
    var localTimer = null;
    var remoteTimer = null;
    var retryTimer = null;
    var inflight = null;
    var dirty = false;
    var again = false;
    var failures = 0;
    var quotaWarned = false;
    var blocked = false; // conflict / limit modal open: no automatic saves
    var conflictVersion = 0;

    function isRemote() { return state.meta.mode === 'owner'; }
    function readLocal() {
      return safe(function () {
        var raw = w.localStorage.getItem(LS_KEY);
        if (!raw) return null;
        var j = JSON.parse(raw);
        return j && j.v === 1 && j.data ? j : null;
      }, null);
    }
    function writeLocal() {
      var payload = {
        v: 1, savedAt: Date.now(),
        userId: BOOT.user ? String(BOOT.user.id || '') : '',
        documentId: state.meta.documentId || '',
        title: state.doc.title, templateId: state.doc.templateId, design: state.doc.design, data: state.doc.data,
        photo: state.photo.dataUrl ? { dataUrl: state.photo.dataUrl } : null,
      };
      try {
        w.localStorage.setItem(LS_KEY, JSON.stringify(payload));
        return true;
      } catch (e) {
        payload.photo = null; // biggest item first
        try { w.localStorage.setItem(LS_KEY, JSON.stringify(payload)); return true; } catch (e2) {
          if (!quotaWarned) {
            quotaWarned = true;
            notices.set('quota', { kind: 'warn', title: 'Browser storage is full', text: 'Your changes are not being saved on this device. Download or print your biodata before closing this tab.' });
          }
          return false;
        }
      }
    }
    function clearLocal() { safe(function () { w.localStorage.removeItem(LS_KEY); }); }

    function saveLocalSoon() {
      clearTimeout(localTimer);
      localTimer = setTimeout(function () {
        var ok = writeLocal();
        if (!isRemote()) setStatus(ok ? 'local' : 'failed-local', ok ? 'Saved on this device · ' + hhmm(Date.now()) : 'Not saved');
      }, 500);
    }

    function changed() {
      saveLocalSoon();
      if (!isRemote()) return;
      dirty = true;
      setStatus('dirty', 'Unsaved changes');
      if (blocked) return;
      clearTimeout(remoteTimer);
      remoteTimer = setTimeout(saveRemote, 1500);
    }

    function payload(withVersion) {
      var p = { title: state.doc.title || '', templateId: state.doc.templateId, design: state.doc.design || {}, data: state.doc.data };
      if (withVersion && state.meta.version) p.ifVersion = state.meta.version;
      return p;
    }

    function applyServerDoc(doc) {
      if (!doc) return;
      state.meta = Object.assign({}, state.meta, { documentId: String(doc._id || state.meta.documentId), version: doc.version || state.meta.version, share: doc.share || null });
      app.setAttribute('data-doc', state.meta.documentId);
      if (w.history && w.history.replaceState && state.meta.documentId) {
        var u = new URL(w.location.href);
        if (u.searchParams.get('doc') !== state.meta.documentId) {
          u.searchParams.set('doc', state.meta.documentId);
          u.searchParams.delete('template');
          w.history.replaceState(null, '', u.pathname + u.search + u.hash);
        }
      }
    }

    function saveRemote() {
      clearTimeout(remoteTimer);
      if (!isRemote() || blocked) return Promise.resolve(false);
      if (inflight) { again = true; return inflight; }
      if (!dirty) return Promise.resolve(true);
      dirty = false;
      setStatus('saving', 'Saving…');
      var id = state.meta.documentId;
      var req = id
        ? api('PUT', API + '/documents/' + encodeURIComponent(id), payload(true))
        : api('POST', API + '/documents', payload(false));
      inflight = req.then(function (res) {
        inflight = null;
        if (res.ok) {
          failures = 0;
          applyServerDoc(res.data);
          writeLocal();
          if (state.photo.pendingUpload) photo.uploadPending();
          if (again || dirty) { again = false; dirty = true; return saveRemote(); }
          setStatus('saved', 'Saved · ' + hhmm(Date.now()));
          return true;
        }
        dirty = true;
        again = false;
        if (res.status === 401) { degrade('signedout'); return false; }
        if (res.code === 'LIMIT_REACHED') { limitReached(res); return false; }
        if (res.code === 'VERSION_CONFLICT') { conflictVersion = Number(res.body.version) || 0; conflict(); return false; }
        if (res.code === 'FEATURE_DISABLED') { degrade('disabled'); return false; }
        if (res.status === 400 || res.status === 413) {
          setStatus('failed', 'Not saved');
          notices.set('save400', { kind: 'error', title: 'Some details could not be saved', text: res.message || 'Please check the highlighted fields and try again.' });
          return false;
        }
        scheduleRetry();
        return false;
      });
      return inflight;
    }

    function scheduleRetry() {
      failures += 1;
      if (failures > 3) { setStatus('failed', 'Save failed'); return; }
      var delay = [2000, 4000, 8000][failures - 1];
      setStatus('failed', 'Save failed – retrying in ' + delay / 1000 + ' s');
      clearTimeout(retryTimer);
      retryTimer = setTimeout(saveRemote, delay);
    }
    function retryNow() {
      failures = 0;
      notices.hide('save400');
      if (!isRemote()) { saveLocalSoon(); return; }
      dirty = true;
      saveRemote();
    }

    function flush() {
      clearTimeout(localTimer);
      writeLocal();
      if (!isRemote()) return Promise.resolve(true);
      if (inflight) return inflight.then(function () { return dirty ? saveRemote() : true; });
      if (dirty || !state.meta.documentId) { dirty = true; return saveRemote(); }
      return Promise.resolve(true);
    }

    function degrade(reason) {
      state.meta.mode = 'local';
      clearTimeout(remoteTimer);
      clearTimeout(retryTimer);
      writeLocal();
      setStatus('local', 'Saved on this device');
      app.setAttribute('data-owner', '0');
      if (reason === 'signedout') {
        notices.set('mode', {
          kind: 'warn', title: 'You are signed out',
          text: 'Your changes are kept on this device only. Log in again to save them to your account.',
          actions: [{ label: 'Log in', href: BOOT.loginUrl || '/login?returnTo=/biodata-maker/create', kind: 'primary' }],
        });
      } else if (reason === 'disabled') {
        notices.set('mode', { kind: 'warn', title: 'Cloud saving is paused', text: 'Your changes are kept on this device for now.' });
      } else {
        notices.set('mode', { kind: 'info', title: 'Saving on this device', text: 'This biodata is not saved to your account. It stays in this browser until you clear it.' });
      }
      toolbar.refresh();
    }

    function limitReached(res) {
      blocked = true;
      var max = (res && res.body && res.body.max) || (BOOT.config && BOOT.config.maxPerUser) || '';
      modal.open({
        title: 'You have reached your biodata limit', icon: 'folder', size: 'sm',
        body: el('div', {}, [
          el('p', { text: 'Your account can keep ' + (max ? max + ' biodatas' : 'a limited number of biodatas') + '. Delete one you no longer need to save this one to your account.' }),
          el('p', { className: 'bdm-muted', text: 'Until then, this biodata is saved on this device, and you can still download or print it.' }),
        ]),
        actions: [
          { label: 'Keep working on this device', kind: 'ghost' },
          { label: 'Open My biodatas', kind: 'primary', href: '/biodata-maker/my' },
        ],
        onClose: function () { degrade('limit'); },
      });
    }

    function conflict() {
      blocked = true;
      setStatus('failed', 'Not saved – changed elsewhere');
      modal.open({
        title: 'This biodata was changed somewhere else', icon: 'warn', tone: 'warn', size: 'sm', dismissible: false,
        body: el('div', {}, [
          el('p', { text: 'It was saved from another tab or device after you opened it here.' }),
          el('p', { className: 'bdm-muted', text: 'Load the latest version (your unsaved edits here are discarded), or keep your version and overwrite the other one.' }),
        ]),
        actions: [
          { label: 'Load latest version', kind: 'ghost', onClick: function () { loadLatest(); } },
          { label: 'Keep mine and overwrite', kind: 'primary', onClick: function () { overwrite(); } },
        ],
      });
    }
    function fetchDoc() { return api('GET', API + '/documents/' + encodeURIComponent(state.meta.documentId)); }
    function loadLatest() {
      setStatus('saving', 'Loading…');
      fetchDoc().then(function (res) {
        blocked = false;
        if (!res.ok) { if (res.status === 401) degrade('signedout'); else setStatus('failed', 'Could not load'); return; }
        dirty = false;
        applyServerDoc(res.data);
        loadServerDoc(res.data);
        store.resetHistory();
        setStatus('saved', 'Saved · ' + hhmm(Date.now()));
        toast('Latest version loaded');
      });
    }
    function overwrite() {
      if (conflictVersion) {
        blocked = false;
        state.meta.version = conflictVersion;
        conflictVersion = 0;
        dirty = true;
        saveRemote();
        return;
      }
      fetchDoc().then(function (res) {
        blocked = false;
        if (!res.ok) { if (res.status === 401) degrade('signedout'); else scheduleRetry(); return; }
        state.meta.version = res.data.version;
        dirty = true;
        saveRemote();
      });
    }

    function hasUnsaved() { return isRemote() && (dirty || !!inflight); }

    w.addEventListener('beforeunload', function (ev) {
      clearTimeout(localTimer);
      writeLocal();
      if (hasUnsaved()) { ev.preventDefault(); ev.returnValue = ''; return ''; }
      return undefined;
    });

    return {
      readLocal: readLocal, writeLocal: writeLocal, changedLocal: saveLocalSoon, clearLocal: clearLocal, changed: changed, flush: flush,
      retryNow: retryNow, degrade: degrade, isRemote: isRemote, applyServerDoc: applyServerDoc,
      hasUnsaved: hasUnsaved, markSaved: function () { dirty = false; },
    };
  })();

  function loadServerDoc(doc) {
    var next = {
      title: doc.title || '',
      templateId: pickTemplate(doc.templateId),
      design: doc.design || {},
      data: normalizeData(doc.data),
    };
    state.photo = { dataUrl: '', url: doc.photo && doc.photo.url ? doc.photo.url : '', busy: false, error: '' };
    store.replaceDoc(next, { noHistory: true, silent: true });
    emit(['photo'], { silent: true });
  }

  // ---------------------------------------------------------------- toolbar
  var titleInput = d.getElementById('bdm-title');
  var toolbar = {
    init: function () {
      titleInput.maxLength = LIMITS.titleMax || 80;
      titleInput.disabled = false;
      titleInput.addEventListener('input', function () { store.set(['doc', 'title'], titleInput.value, { coalesce: true }); });
      app.querySelectorAll('[data-action]').forEach(function (b) { b.disabled = false; });
      app.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-action]');
        if (!b || !app.contains(b)) return;
        var a = b.getAttribute('data-action');
        if (a === 'undo') store.undo();
        else if (a === 'redo') store.redo();
        else if (a === 'sections') sections.openDrawer();
        else if (a === 'sample') loadSample();
        else if (a === 'menu') menu.toggle();
        else if (a === 'export') exporter.run();
        else if (a === 'print') exporter.print();
        else if (a === 'zoom-in') preview.zoomBy(0.1);
        else if (a === 'zoom-out') preview.zoomBy(-0.1);
        else if (a === 'zoom-reset') preview.setZoom(1);
        else if (a === 'zoom-fit') preview.setZoom('fit');
        else if (a === 'show-preview') layout.setTab('preview', true);
      });
      toolbar.refresh();
      w.addEventListener('resize', function () { toolbar.refresh(); });
    },
    refresh: function () {
      var u = app.querySelector('[data-action="undo"]');
      var r = app.querySelector('[data-action="redo"]');
      u.disabled = !store.canUndo();
      r.disabled = !store.canRedo();
      if (d.activeElement !== titleInput) titleInput.value = state.doc.title || '';
      var lbl = app.querySelector('.bdm-export-label');
      var narrow = w.innerWidth <= 400;
      lbl.textContent = BOOT.pdfAvailable === false ? (narrow ? 'Print / PDF' : 'Print / Save as PDF') : (narrow ? 'PDF' : 'Download PDF');
    },
  };

  // More-actions menu (role=menu, arrow keys, Escape).
  var menu = (function () {
    var trigger = app.querySelector('[data-action="menu"]');
    var list = d.getElementById('bdm-menu');
    function items() {
      var owner = persist.isRemote();
      var out = [];
      out.push({ label: 'Sections & order', icon: 'sections', run: function () { sections.openDrawer(); } });
      if (owner) {
        out.push({ label: 'Version history', icon: 'history', run: function () { versions.open(); } });
        out.push({ label: 'Share link', icon: 'share', run: function () { share.open(); } });
        out.push({ label: 'Duplicate', icon: 'copy', run: duplicateDoc });
        out.push({ label: 'My biodatas', icon: 'folder', href: '/biodata-maker/my' });
      } else if (!BOOT.user) {
        out.push({ label: 'Log in to save online', icon: 'lock', href: BOOT.loginUrl || '/login?returnTo=/biodata-maker/create' });
      }
      out.push({ label: 'Print', icon: 'print', run: function () { exporter.print(); } });
      out.push({ label: 'Start over', icon: 'reset', danger: true, run: resetAll });
      return out;
    }
    function open() {
      clear(list);
      items().forEach(function (it) {
        var node = it.href
          ? el('a', { role: 'menuitem', className: 'bdm-menu__item', href: it.href, tabindex: '-1' }, [icon(it.icon, 16), el('span', { text: it.label })])
          : el('button', { type: 'button', role: 'menuitem', className: 'bdm-menu__item' + (it.danger ? ' is-danger' : ''), tabindex: '-1', onclick: function () { close(); it.run(); } }, [icon(it.icon, 16), el('span', { text: it.label })]);
        list.appendChild(node);
      });
      list.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      var first = list.querySelector('[role="menuitem"]');
      if (first) first.focus();
      setTimeout(function () { d.addEventListener('mousedown', outside, true); }, 0);
    }
    function close(refocus) {
      if (list.hidden) return;
      list.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      d.removeEventListener('mousedown', outside, true);
      if (refocus) trigger.focus();
    }
    function outside(ev) { if (!list.contains(ev.target) && ev.target !== trigger && !trigger.contains(ev.target)) close(); }
    list.addEventListener('keydown', function (ev) {
      var all = Array.prototype.slice.call(list.querySelectorAll('[role="menuitem"]'));
      var i = all.indexOf(d.activeElement);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); all[(i + 1) % all.length].focus(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); all[(i - 1 + all.length) % all.length].focus(); }
      else if (ev.key === 'Home') { ev.preventDefault(); all[0].focus(); }
      else if (ev.key === 'End') { ev.preventDefault(); all[all.length - 1].focus(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); close(true); }
      else if (ev.key === 'Tab') close();
    });
    return { toggle: function () { if (list.hidden) open(); else close(true); }, close: close };
  })();

  // ---------------------------------------------------------------- layout (desktop split / mobile tabs)
  var layout = (function () {
    var editor = d.getElementById('bdm-editor');
    var pane = d.getElementById('bdm-preview');
    var tabEdit = d.getElementById('bdm-mtab-edit');
    var tabPreview = d.getElementById('bdm-mtab-preview');
    var pill = app.querySelector('.bdm-pill');
    var stepsList = d.getElementById('bdm-steps');
    function apply() {
      var desk = MQ_DESKTOP.matches;
      app.classList.toggle('is-desktop', desk);
      if (desk) {
        editor.removeAttribute('role'); pane.removeAttribute('role');
        editor.removeAttribute('aria-labelledby'); pane.removeAttribute('aria-labelledby');
        editor.hidden = false;
        pane.classList.remove('is-offscreen');
        pane.removeAttribute('aria-hidden');
        app.classList.remove('is-tab-preview');
        pill.hidden = true;
      } else {
        editor.setAttribute('role', 'tabpanel'); editor.setAttribute('aria-labelledby', 'bdm-mtab-edit');
        pane.setAttribute('role', 'tabpanel'); pane.setAttribute('aria-labelledby', 'bdm-mtab-preview');
        setTab(state.ui.mobileTab, false);
      }
      stepsList.setAttribute('aria-orientation', MQ_WIDE.matches ? 'vertical' : 'horizontal');
      preview.fit();
    }
    function setTab(tab, focus) {
      state.ui.mobileTab = tab;
      if (MQ_DESKTOP.matches) return;
      var isPrev = tab === 'preview';
      tabEdit.setAttribute('aria-selected', String(!isPrev));
      tabPreview.setAttribute('aria-selected', String(isPrev));
      tabEdit.tabIndex = isPrev ? -1 : 0;
      tabPreview.tabIndex = isPrev ? 0 : -1;
      editor.hidden = isPrev;
      app.classList.toggle('is-tab-preview', isPrev);
      // Keep the preview laid out off-tab so the paginator can measure.
      pane.classList.toggle('is-offscreen', !isPrev);
      if (isPrev) pane.removeAttribute('aria-hidden'); else pane.setAttribute('aria-hidden', 'true');
      pill.hidden = isPrev;
      if (isPrev) { preview.fit(); if (focus) tabPreview.focus(); }
      else if (focus) tabEdit.focus();
    }
    [tabEdit, tabPreview].forEach(function (t) {
      t.addEventListener('click', function () { setTab(t === tabPreview ? 'preview' : 'edit', true); });
      t.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft' || ev.key === 'Home' || ev.key === 'End') {
          ev.preventDefault();
          setTab(state.ui.mobileTab === 'edit' ? 'preview' : 'edit', true);
        }
      });
    });
    function listen(mq) { if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply); }
    return { apply: apply, setTab: setTab, init: function () { listen(MQ_DESKTOP); listen(MQ_WIDE); apply(); } };
  })();

  // ---------------------------------------------------------------- stepper
  var stepper = (function () {
    var list = d.getElementById('bdm-steps');
    var tabs = [];
    var bar = app.querySelector('.bdm-progress');
    var fill = app.querySelector('.bdm-progress__fill');
    var countEl = d.getElementById('bdm-steps-count');
    var pctEl = app.querySelector('[data-bind="pct"]');
    function status(stepId) {
      if (stepId === 'photo') return state.photo.url || state.photo.dataUrl ? 'complete' : 'empty';
      if (stepId === 'design') return state.ui.visited.design ? 'complete' : 'empty';
      return safe(function () { return schema.stepStatus(state.doc.data, stepId); }, 'empty') || 'empty';
    }
    function build() {
      clear(list);
      tabs = STEPS.map(function (s, i) {
        var t = el('button', {
          type: 'button', role: 'tab', id: 'bdm-tab-' + s, className: 'bdm-step', 'aria-controls': 'bdm-panel',
          'aria-selected': 'false', tabindex: '-1', 'data-step': String(i),
        }, [
          el('span', { className: 'bdm-step__dot', 'aria-hidden': 'true' }, [el('span', { className: 'bdm-step__num', text: String(i + 1) }), icon('check', 14)]),
          el('span', { className: 'bdm-step__text' }, [
            el('span', { className: 'bdm-step__label', text: stepTitle(s) }),
            el('span', { className: 'bdm-step__state' }),
          ]),
        ]);
        t.addEventListener('click', function () { go(i); });
        t.addEventListener('keydown', onKey);
        list.appendChild(t);
        return t;
      });
    }
    function onKey(ev) {
      var i = Number(ev.currentTarget.getAttribute('data-step'));
      var next = null;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') next = (i + 1) % STEPS.length;
      else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') next = (i - 1 + STEPS.length) % STEPS.length;
      else if (ev.key === 'Home') next = 0;
      else if (ev.key === 'End') next = STEPS.length - 1;
      if (next === null) return;
      ev.preventDefault();
      go(next);
      tabs[next].focus();
    }
    function refresh() {
      var score = 0;
      tabs.forEach(function (t, i) {
        var st = status(STEPS[i]);
        score += st === 'complete' ? 1 : st === 'partial' ? 0.5 : 0;
        var sel = i === state.ui.step;
        t.setAttribute('aria-selected', String(sel));
        t.tabIndex = sel ? 0 : -1;
        t.className = 'bdm-step is-' + st + (sel ? ' is-current' : '');
        t.querySelector('.bdm-step__state').textContent = st === 'complete' ? 'Complete' : st === 'partial' ? 'In progress' : 'Not started';
      });
      var pct = Math.round(score / STEPS.length * 100);
      fill.style.width = pct + '%';
      bar.setAttribute('aria-valuenow', String(pct));
      bar.setAttribute('aria-valuetext', pct + '% complete');
      pctEl.textContent = String(pct);
      countEl.textContent = 'Step ' + (state.ui.step + 1) + ' of ' + STEPS.length;
    }
    function go(i, opts) {
      i = Math.max(0, Math.min(STEPS.length - 1, i));
      var changedStep = i !== state.ui.step;
      state.ui.step = i;
      if (STEPS[i] === 'design') state.ui.visited.design = true;
      refresh();
      forms.render();
      if (changedStep) {
        var cur = tabs[i];
        if (cur && cur.scrollIntoView && !MQ_WIDE.matches) cur.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
        var top = app.getBoundingClientRect().top;
        if (top < 0) w.scrollTo({ top: w.pageYOffset + top - 8, behavior: REDUCED ? 'auto' : 'smooth' });
        if (opts && opts.focusPanel) {
          var h = d.querySelector('#bdm-panel .bdm-panel__title');
          if (h) h.focus({ preventScroll: true });
        }
        announce('Step ' + (i + 1) + ' of ' + STEPS.length + ': ' + stepTitle(STEPS[i]));
      }
    }
    return { build: build, refresh: refresh, go: go, status: status };
  })();

  // ---------------------------------------------------------------- forms
  var forms = (function () {
    var panel = d.getElementById('bdm-panel');
    var reg = [];
    var errors = {};

    function currentStep() { return STEPS[state.ui.step]; }
    function fieldsFor(stepId) {
      return FIELDS.filter(function (f) { return (f.step || f.section) === stepId && f.id !== 'invocation' && f.key !== 'ageOverride'; });
    }
    function pathKey(path) { return path.join('.'); }
    function domId(path) { return 'bdm-f-' + path.join('-'); }
    function isVisible(f) {
      if (typeof f.when !== 'function') return true;
      return !!safe(function () { return f.when(state.doc.data); }, true);
    }
    function isHiddenField(id) { return (state.doc.data.hiddenFields || []).indexOf(id) !== -1; }

    function computeErrors() { errors = safe(function () { return schema.validate(state.doc.data) || {}; }, {}); }

    // ---- render
    function render(opts) {
      opts = opts || {};
      var focusKey = opts.focus || (d.activeElement && panel.contains(d.activeElement) ? d.activeElement.getAttribute('data-fkey') : null);
      var scrollY = w.pageYOffset;
      reg = [];
      computeErrors();
      clear(panel);
      var s = currentStep();
      panel.setAttribute('aria-labelledby', 'bdm-tab-' + s);
      var meta = STEP_META[s] || { title: humanize(s), icon: 'note', desc: '' };
      panel.appendChild(el('header', { className: 'bdm-panel__head' }, [
        el('span', { className: 'bdm-panel__icon' }, [icon(meta.icon, 22)]),
        el('div', { className: 'bdm-panel__headtext' }, [
          el('p', { className: 'bdm-panel__eyebrow', text: 'Step ' + (state.ui.step + 1) + ' of ' + STEPS.length }),
          el('h2', { className: 'bdm-panel__title', tabindex: '-1', text: meta.title }),
          meta.desc ? el('p', { className: 'bdm-panel__desc', text: meta.desc }) : null,
        ]),
        jumpSelect(),
      ]));
      var body = el('div', { className: 'bdm-panel__body' });
      panel.appendChild(body);
      if (s === 'photo') photo.renderStep(body);
      else if (s === 'design') design.render(body);
      else renderSectionStep(s, body);
      panel.appendChild(footer());
      sync();
      if (focusKey) {
        var target = panel.querySelector('[data-fkey="' + focusKey + '"]');
        if (target) { target.focus({ preventScroll: true }); w.scrollTo(0, scrollY); }
      }
    }

    function jumpSelect() {
      var id = 'bdm-jump';
      var sel = el('select', { id: id, className: 'bdm-select bdm-select--sm' }, STEPS.map(function (s, i) {
        return el('option', { value: String(i), text: (i + 1) + '. ' + stepTitle(s) });
      }));
      sel.value = String(state.ui.step);
      sel.addEventListener('change', function () { stepper.go(Number(sel.value), { focusPanel: true }); });
      return el('div', { className: 'bdm-jump' }, [el('label', { className: 'bdm-sr', for: id, text: 'Jump to step' }), sel]);
    }

    function footer() {
      var i = state.ui.step;
      var s = STEPS[i];
      var warnBox = el('div', { className: 'bdm-stepwarn', id: 'bdm-stepwarn', 'aria-live': 'polite' });
      var back = btn('Back', { kind: 'ghost', icon: 'left', disabled: i === 0, onClick: function () { stepper.go(i - 1, { focusPanel: true }); } });
      var next;
      if (s === 'design') {
        next = btn(BOOT.pdfAvailable === false ? 'Print / Save as PDF' : 'Download PDF', { kind: 'primary', icon: 'download', onClick: function () { exporter.run(); } });
      } else {
        next = el('button', { type: 'button', className: 'bdm-btn bdm-btn--primary', onclick: onNext }, [
          el('span', { text: 'Next: ' + stepTitle(STEPS[i + 1]) }), icon('right', 16),
        ]);
      }
      return el('footer', { className: 'bdm-panel__foot' }, [warnBox, el('div', { className: 'bdm-panel__nav' }, [back, el('span', { className: 'bdm-panel__count', text: (i + 1) + ' of ' + STEPS.length }), next])]);
    }

    function stepErrorKeys() {
      var s = currentStep();
      return Object.keys(errors).filter(function (k) { return k.split('.')[0] === s; }).filter(function (k) {
        var f = FIELD_BY_ID[k] || FIELD_BY_ID[k.split('.').slice(0, 2).join('.')];
        return !f || isVisible(f);
      });
    }

    function onNext() {
      var i = state.ui.step;
      var s = STEPS[i];
      computeErrors();
      var keys = stepErrorKeys();
      if (keys.length && !state.ui.warned[s]) {
        state.ui.warned[s] = true;
        keys.forEach(function (k) { state.ui.touched[k] = true; });
        sync();
        var box = d.getElementById('bdm-stepwarn');
        clear(box);
        append(box, el('div', { className: 'bdm-callout bdm-callout--warn' }, [
          icon('warn', 18),
          el('div', {}, [
            el('p', { className: 'bdm-callout__title', text: keys.length === 1 ? '1 detail needs attention' : keys.length + ' details need attention' }),
            el('p', { text: 'You can fix it now or continue and come back later.' }),
          ]),
          el('div', { className: 'bdm-callout__actions' }, [
            btn('Review', { kind: 'ghost', size: 'sm', onClick: function () { var bad = panel.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); } }),
            btn('Continue anyway', { kind: 'soft', size: 'sm', onClick: function () { stepper.go(i + 1, { focusPanel: true }); } }),
          ]),
        ]));
        return;
      }
      stepper.go(i + 1, { focusPanel: true });
    }

    function renderSectionStep(s, body) {
      var fields = fieldsFor(s);
      var grid = el('div', { className: 'bdm-grid' });
      fields.forEach(function (f) { grid.appendChild(renderField(f, [f.section || s], f.id)); });
      body.appendChild(el('div', { className: 'bdm-card' }, [grid]));
      body.appendChild(renderCustom(s));
      if (s === 'personal') append(body, sampleHint());
    }

    function sampleHint() {
      if (hasContent(state.doc.data)) return null;
      return el('div', { className: 'bdm-callout bdm-callout--brand' }, [
        icon('star', 18),
        el('div', {}, [
          el('p', { className: 'bdm-callout__title', text: 'Want to see a finished biodata first?' }),
          el('p', { text: 'Load fictional sample details, explore the templates, then replace them with your own.' }),
        ]),
        el('div', { className: 'bdm-callout__actions' }, [btn('Load sample', { kind: 'soft', size: 'sm', onClick: loadSample })]),
      ]);
    }

    // ---- one field
    function renderField(f, base, labelId) {
      var path = base.concat([f.key]);
      var id = domId(path);
      var type = f.type || 'text';
      var wide = type === 'textarea' || type === 'list' || type === 'multiselect' || f.multiline || f.wide;
      var wrap = el('div', { className: 'bdm-field bdm-field--' + type + (wide ? ' bdm-field--full' : ''), 'data-path': pathKey(path) });
      var label = fieldLabel(labelId);
      var groupish = type === 'height' || type === 'multiselect' || type === 'list';
      var labelNode = groupish
        ? el('span', { className: 'bdm-label', id: id + '-label', text: label })
        : el('label', { className: 'bdm-label', id: id + '-label', for: id, text: label });
      var head = el('div', { className: 'bdm-field__head' }, [
        labelNode,
        f.required ? el('span', { className: 'bdm-req', 'aria-hidden': 'true', text: 'Required' }) : el('span', { className: 'bdm-opt', text: 'Optional' }),
      ]);
      if (f.privacy && labelId === f.id) head.appendChild(privacyToggle(f));
      wrap.appendChild(head);

      var value = getIn(state.doc.data, path);
      var hintId = id + '-hint';
      var errId = id + '-err';
      var countId = id + '-count';
      var control;
      var entry = { f: f, path: path, wrap: wrap, id: id, labelId: labelId, refresh: null };

      if (type === 'textarea' || f.multiline) control = textArea(f, path, id, value, entry);
      else if (type === 'select') control = selectBox(f, path, id, value);
      else if (type === 'multiselect') control = chips(f, path, id, value);
      else if (type === 'date') control = dateBox(f, path, id, value, entry);
      else if (type === 'height') control = heightBox(f, path, id, value, entry);
      else if (type === 'income') control = incomeBox(f, path, id, value, entry);
      else if (type === 'list') control = listBox(f, path, id, value, labelId);
      else control = textBox(f, path, id, value, entry);
      wrap.appendChild(control);

      var hint = f.hint || (type === 'height' ? 'Choose feet and inches, or type centimetres.' : '');
      var foot = el('div', { className: 'bdm-field__foot' }, [
        hint ? el('p', { className: 'bdm-hint', id: hintId, text: hint }) : null,
        entry.counter || null,
      ]);
      if (foot.firstChild) wrap.appendChild(foot);
      var errEl = el('p', { className: 'bdm-error', id: errId, 'aria-live': 'polite' });
      wrap.appendChild(errEl);
      entry.errEl = errEl;
      var sugg = f.examples || f.suggestions || SUGGEST[labelId];
      if (sugg && sugg.length && (type === 'textarea' || f.multiline)) wrap.appendChild(suggestions(sugg, path, id));

      var describers = [hint ? hintId : null, entry.counter ? countId : null, errId].filter(Boolean).join(' ');
      wrap.querySelectorAll('input, select, textarea').forEach(function (inp) {
        if (!inp.getAttribute('aria-describedby')) inp.setAttribute('aria-describedby', describers);
      });
      if (groupish) {
        var g = wrap.querySelector('[role="group"]');
        if (g) g.setAttribute('aria-describedby', describers);
      }
      reg.push(entry);
      if (typeof f.when === 'function') {
        entry.cond = true;
        if (!isVisible(f)) { wrap.hidden = true; wrap.classList.add('is-collapsed'); }
      }
      return wrap;
    }

    function setData(path, v, extra) { store.data(path, v, Object.assign({ source: 'form', coalesce: true }, extra || {})); }
    function touch(path) { state.ui.touched[pathKey(path)] = true; sync(); }

    function textBox(f, path, id, value, entry) {
      var t = f.type;
      var input = el('input', {
        id: id, 'data-fkey': id, className: 'bdm-input',
        type: t === 'email' ? 'email' : t === 'phone' ? 'tel' : 'text',
        inputmode: t === 'number' ? 'numeric' : t === 'phone' ? 'tel' : null,
        autocomplete: autoFor(f), maxlength: f.max || null, placeholder: f.placeholder || null,
        'aria-required': f.required ? 'true' : null, value: value === undefined || value === null ? '' : String(value),
        spellcheck: t === 'email' || t === 'phone' || t === 'number' ? 'false' : null,
      });
      input.addEventListener('input', function () {
        var v = input.value;
        if (t === 'number') {
          var c = v.replace(/[^\d]/g, '');
          if (c !== v) input.value = c;
          v = c;
        }
        setData(path, v);
        if (entry.counter) updateCounter(entry.counter, input.value.length, f.max);
      });
      input.addEventListener('blur', function () { touch(path); });
      if (f.max && f.max >= 100) entry.counter = counterEl(id, String(input.value).length, f.max);
      var unit = f.unit ? tAny('en', 'misc', f.unit) || f.unit : '';
      if (unit) return el('div', { className: 'bdm-affix' }, [input, el('span', { className: 'bdm-affix__text', 'aria-hidden': 'true', text: unit })]);
      return input;
    }

    function autoFor(f) {
      var map = { 'personal.fullName': 'name', 'contact.email': 'email', 'contact.phone': 'tel', 'contact.altPhone': 'tel', 'contact.whatsapp': 'tel', 'contact.address': 'street-address', 'contact.city': 'address-level2', 'contact.state': 'address-level1', 'contact.country': 'country-name' };
      return map[f.id] || 'off';
    }

    function counterEl(id, n, max) {
      var c = el('span', { className: 'bdm-counter', id: id + '-count', 'aria-live': 'off' });
      updateCounter(c, n, max);
      return c;
    }
    function updateCounter(c, n, max) {
      c.textContent = n + ' / ' + max;
      c.classList.toggle('is-near', n > max * 0.9);
    }

    function textArea(f, path, id, value, entry) {
      var ta = el('textarea', {
        id: id, 'data-fkey': id, className: 'bdm-input bdm-textarea', rows: f.rows || (f.max && f.max > 400 ? 5 : 3),
        maxlength: f.max || null, placeholder: f.placeholder || null, 'aria-required': f.required ? 'true' : null,
        value: value || '',
      });
      ta.addEventListener('input', function () {
        setData(path, ta.value);
        if (entry.counter) updateCounter(entry.counter, ta.value.length, f.max);
      });
      ta.addEventListener('blur', function () { touch(path); });
      if (f.max) entry.counter = counterEl(id, String(value || '').length, f.max);
      return ta;
    }

    function selectBox(f, path, id, value) {
      var opts = optValues(f);
      var sel = el('select', { id: id, 'data-fkey': id, className: 'bdm-select', 'aria-required': f.required ? 'true' : null }, [
        el('option', { value: '', text: f.placeholder || 'Select…' }),
      ].concat(opts.map(function (v) { return el('option', { value: v, text: optLabel(f, v) }); })));
      sel.value = value || '';
      sel.addEventListener('change', function () { store.data(path, sel.value, { source: 'form' }); touch(path); });
      return sel;
    }

    function chips(f, path, id, value) {
      var vals = Array.isArray(value) ? value : [];
      var opts = optValues(f);
      var max = f.maxItems || 15;
      var group = el('div', { className: 'bdm-chips', role: 'group', 'aria-labelledby': id + '-label' });
      function toggle(v) {
        var cur = (getIn(state.doc.data, path) || []).slice();
        var at = cur.indexOf(v);
        if (at === -1) { if (cur.length >= max) { announce('You can choose up to ' + max); return; } cur.push(v); }
        else cur.splice(at, 1);
        store.data(path, cur, { source: 'form', rerender: true, focus: id + '-' + v });
      }
      opts.forEach(function (v) {
        var on = vals.indexOf(v) !== -1;
        group.appendChild(el('button', {
          type: 'button', className: 'bdm-chip' + (on ? ' is-on' : ''), 'aria-pressed': String(on), 'data-fkey': id + '-' + v,
          onclick: function () { toggle(v); },
        }, [on ? icon('check', 14) : null, el('span', { text: optLabel(f, v) })]));
      });
      vals.filter(function (v) { return opts.indexOf(v) === -1; }).forEach(function (v) {
        group.appendChild(el('span', { className: 'bdm-chip is-on is-custom' }, [
          el('span', { text: v }),
          el('button', { type: 'button', className: 'bdm-chip__x', 'aria-label': 'Remove ' + v, 'data-fkey': id + '-x-' + v, onclick: function () { toggle(v); } }, [icon('close', 12)]),
        ]));
      });
      if (!f.free) return group;
      var addId = id + '-add';
      var input = el('input', { id: addId, 'data-fkey': addId, className: 'bdm-input bdm-input--sm', type: 'text', maxlength: f.itemMax || 40, placeholder: opts.length ? 'Add another…' : 'Type and press Enter' });
      function add() {
        var v = input.value.trim();
        if (!v) return;
        var cur = (getIn(state.doc.data, path) || []).slice();
        var known = opts.filter(function (o) { return optLabel(f, o).toLowerCase() === v.toLowerCase(); })[0];
        v = known || v;
        if (cur.indexOf(v) !== -1) { input.value = ''; return; }
        if (cur.length >= max) { announce('You can add up to ' + max); return; }
        cur.push(v);
        store.data(path, cur, { source: 'form', rerender: true, focus: addId });
      }
      input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); add(); } });
      return el('div', { className: 'bdm-chipfield' }, [
        group,
        el('div', { className: 'bdm-chipadd' }, [
          el('label', { className: 'bdm-sr', for: addId, text: 'Add your own ' + fieldLabel(f.id).toLowerCase() }),
          input,
          btn('Add', { kind: 'soft', size: 'sm', icon: 'plus', onClick: add }),
        ]),
      ]);
    }

    function dateBox(f, path, id, value, entry) {
      var input = el('input', { id: id, 'data-fkey': id, className: 'bdm-input', type: 'date', value: value || '', max: today(), min: '1930-01-01', 'aria-required': f.required ? 'true' : null });
      input.addEventListener('change', function () { store.data(path, input.value, { source: 'form' }); });
      input.addEventListener('input', function () { store.data(path, input.value, { source: 'form', coalesce: true }); });
      input.addEventListener('blur', function () { touch(path); });
      if (f.id !== 'personal.dob') return input;
      var ageOut = el('span', { className: 'bdm-age', 'aria-live': 'polite' });
      var ov = FIELD_BY_ID['personal.ageOverride'];
      var ovPath = ['personal', 'ageOverride'];
      var ovId = domId(ovPath);
      var ovVal = getIn(state.doc.data, ovPath) || '';
      var ovWrap = el('div', { className: 'bdm-override', hidden: !ovVal });
      var ovBtn = btn(ovVal ? 'Use date of birth' : 'Enter age manually', { kind: 'link', size: 'sm', fkey: id + '-ovbtn', onClick: function () {
        if (ovWrap.hidden) { ovWrap.hidden = false; ovBtn.querySelector('span').textContent = 'Use date of birth'; ovWrap.querySelector('input').focus(); }
        else { ovWrap.hidden = true; ovBtn.querySelector('span').textContent = 'Enter age manually'; store.data(ovPath, '', { source: 'form' }); }
      } });
      if (ov) {
        var ovInput = el('input', { id: ovId, 'data-fkey': ovId, className: 'bdm-input bdm-input--age', type: 'text', inputmode: 'numeric', maxlength: 3, value: ovVal, placeholder: 'e.g. 27' });
        ovInput.addEventListener('input', function () {
          var c = ovInput.value.replace(/[^\d]/g, '');
          if (c !== ovInput.value) ovInput.value = c;
          setData(ovPath, c);
        });
        append(ovWrap, [el('label', { className: 'bdm-label bdm-label--inline', for: ovId, text: 'Age shown on biodata' }), ovInput, el('span', { className: 'bdm-muted', text: 'years' })]);
      }
      entry.refresh = function () {
        var a = safe(function () { return K.fmt.displayAge(state.doc.data, new Date()); }, { value: null });
        ageOut.textContent = a && a.value !== null ? 'Age: ' + a.value + ' years' + (a.source === 'override' ? ' (entered manually)' : '') : '';
        ageOut.hidden = !ageOut.textContent;
      };
      return el('div', { className: 'bdm-datewrap' }, [input, el('div', { className: 'bdm-agebar' }, [ageOut, ov ? ovBtn : null]), ov ? ovWrap : null]);
    }

    function heightBox(f, path, id, value, entry) {
      var fi = safe(function () { return K.fmt.cmToFtIn(value); }, null);
      var ft = el('select', { id: id, 'data-fkey': id, className: 'bdm-select', 'aria-label': fieldLabel(entry.labelId) + ', feet' }, [el('option', { value: '', text: 'ft' })].concat([3, 4, 5, 6, 7].map(function (n) { return el('option', { value: String(n), text: n + ' ft' }); })));
      var inch = el('select', { id: id + '-in', 'data-fkey': id + '-in', className: 'bdm-select', 'aria-label': fieldLabel(entry.labelId) + ', inches' }, [el('option', { value: '', text: 'in' })].concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (n) { return el('option', { value: String(n), text: n + ' in' }); })));
      var cm = el('input', { id: id + '-cm', 'data-fkey': id + '-cm', className: 'bdm-input', type: 'text', inputmode: 'numeric', maxlength: 3, placeholder: 'cm', value: value || '', 'aria-label': fieldLabel(entry.labelId) + ', centimetres' });
      function fromCm(v) {
        var x = safe(function () { return K.fmt.cmToFtIn(v); }, null);
        ft.value = x ? String(x.ft) : '';
        inch.value = x ? String(x.inch) : '';
      }
      fromCm(value);
      function fromFtIn() {
        if (!ft.value) { cm.value = ''; store.data(path, '', { source: 'form' }); return; }
        var c = safe(function () { return K.fmt.ftInToCm(ft.value, inch.value || 0); }, null);
        cm.value = c ? String(c) : '';
        store.data(path, c ? String(c) : '', { source: 'form' });
      }
      ft.addEventListener('change', fromFtIn);
      inch.addEventListener('change', fromFtIn);
      cm.addEventListener('input', function () {
        var c = cm.value.replace(/[^\d]/g, '');
        if (c !== cm.value) cm.value = c;
        setData(path, c);
        fromCm(c);
      });
      cm.addEventListener('blur', function () { touch(path); });
      if (fi) { ft.value = String(fi.ft); inch.value = String(fi.inch); }
      return el('div', { className: 'bdm-height', role: 'group', 'aria-labelledby': id + '-label' }, [ft, inch, el('span', { className: 'bdm-height__or', 'aria-hidden': 'true', text: 'or' }), el('div', { className: 'bdm-affix' }, [cm, el('span', { className: 'bdm-affix__text', 'aria-hidden': 'true', text: 'cm' })])]);
    }

    function incomeBox(f, path, id, value, entry) {
      var input = el('input', { id: id, 'data-fkey': id, className: 'bdm-input', type: 'text', inputmode: 'numeric', maxlength: f.max || 12, placeholder: f.placeholder || 'e.g. 1200000', value: value || '' });
      var out = el('p', { className: 'bdm-income-out', 'aria-live': 'polite' });
      input.addEventListener('input', function () {
        var c = input.value.replace(/[^\d]/g, '');
        if (c !== input.value) input.value = c;
        setData(path, c);
      });
      input.addEventListener('blur', function () { touch(path); });
      entry.refresh = function () {
        var txt = safe(function () { return K.fmt.formatIncome(state.doc.data.income, 'en'); }, '');
        out.textContent = txt ? 'Shows as: ' + txt : 'Type the amount in digits; it is shown in Lakh / Crore.';
      };
      return el('div', {}, [el('div', { className: 'bdm-affix bdm-affix--pre' }, [el('span', { className: 'bdm-affix__text', 'aria-hidden': 'true', text: '₹' }), input]), out]);
    }

    function listBox(f, path, id, value, labelId) {
      var items = Array.isArray(value) ? value : [];
      var max = f.maxItems || 12;
      var noun = f.itemLabel || LIST_NOUN[f.key] || 'item';
      var box = el('div', { className: 'bdm-list', role: 'group', 'aria-labelledby': id + '-label' });
      function setItems(next, focus) { store.data(path, next, { source: 'form', rerender: true, focus: focus }); }
      items.forEach(function (item, i) {
        var itemPath = path.concat([i]);
        var grid = el('div', { className: 'bdm-grid bdm-grid--tight' });
        (f.itemFields || []).forEach(function (itf) { grid.appendChild(renderField(itf, itemPath, labelId + '.' + itf.key)); });
        var title = humanize(noun) + ' ' + (i + 1);
        box.appendChild(el('div', { className: 'bdm-list__item' }, [
          el('div', { className: 'bdm-list__head' }, [
            el('p', { className: 'bdm-list__title', text: title }),
            el('div', { className: 'bdm-list__tools' }, [
              iconBtn('up', 'Move ' + title + ' up', function () { var n = items.slice(); var t = n[i - 1]; n[i - 1] = n[i]; n[i] = t; setItems(n, domId(path) + '-up-' + (i - 1)); announce(title + ' moved up'); }, { disabled: i === 0, fkey: domId(path) + '-up-' + i }),
              iconBtn('down', 'Move ' + title + ' down', function () { var n = items.slice(); var t = n[i + 1]; n[i + 1] = n[i]; n[i] = t; setItems(n, domId(path) + '-down-' + (i + 1)); announce(title + ' moved down'); }, { disabled: i === items.length - 1, fkey: domId(path) + '-down-' + i }),
              iconBtn('trash', 'Remove ' + title, function () { var n = items.slice(); n.splice(i, 1); setItems(n, domId(path) + '-add'); announce(title + ' removed'); }, { className: 'bdm-iconbtn--danger' }),
            ]),
          ]),
          grid,
        ]));
      });
      if (!items.length) box.appendChild(el('p', { className: 'bdm-list__empty', text: 'No ' + noun + ' added yet.' }));
      var add = btn('Add ' + noun, { kind: 'soft', icon: 'plus', fkey: domId(path) + '-add', disabled: items.length >= max, onClick: function () {
        var blank = {};
        (f.itemFields || []).forEach(function (itf) { blank[itf.key] = itf.type === 'multiselect' ? [] : ''; });
        var first = f.itemFields && f.itemFields[0] ? domId(path.concat([items.length, f.itemFields[0].key])) : null;
        setItems(items.concat([blank]), first);
        announce(humanize(noun) + ' ' + (items.length + 1) + ' added');
      } });
      box.appendChild(add);
      return box;
    }

    function privacyToggle(f) {
      var on = isHiddenField(f.id);
      var b = el('button', { type: 'button', className: 'bdm-privacy' + (on ? ' is-on' : ''), 'aria-pressed': String(on), 'aria-label': 'Hide ' + fieldLabel(f.id) + ' on the biodata', 'data-fkey': 'priv-' + f.id, title: 'Hide this detail on the printed biodata (it stays saved here)' }, [
        icon(on ? 'eyeOff' : 'eye', 15), el('span', { text: on ? 'Hidden' : 'Hide', 'aria-hidden': 'true' }),
      ]);
      b.addEventListener('click', function () {
        var cur = (state.doc.data.hiddenFields || []).slice();
        var at = cur.indexOf(f.id);
        if (at === -1) cur.push(f.id); else cur.splice(at, 1);
        store.data(['hiddenFields'], cur, { source: 'form', rerender: true, focus: 'priv-' + f.id });
        announce(fieldLabel(f.id) + (at === -1 ? ' hidden on the biodata' : ' shown on the biodata'));
      });
      return b;
    }

    function suggestions(list, path, id) {
      var det = el('details', { className: 'bdm-suggest' }, [
        el('summary', { className: 'bdm-suggest__sum' }, [icon('star', 14), el('span', { text: 'Need ideas? See example wording' })]),
      ]);
      list.forEach(function (text, i) {
        det.appendChild(el('div', { className: 'bdm-suggest__item' }, [
          el('p', { text: text }),
          btn('Use this', { kind: 'soft', size: 'sm', fkey: id + '-sugg-' + i, onClick: function () {
            store.data(path, text, { source: 'form', rerender: true, focus: id });
            announce('Example text inserted. You can edit it.');
          } }),
        ]));
      });
      return det;
    }

    // ---- custom fields
    function renderCustom(section) {
      var all = state.doc.data.custom || {};
      var rows = Array.isArray(all[section]) ? all[section] : [];
      var total = Object.keys(all).reduce(function (n, k) { return n + (Array.isArray(all[k]) ? all[k].length : 0); }, 0);
      var capSection = rows.length >= LIMITS.customPerSection;
      var capTotal = total >= LIMITS.customTotal;
      var base = ['custom', section];
      var card = el('div', { className: 'bdm-card bdm-card--custom' }, [
        el('div', { className: 'bdm-card__head' }, [
          el('h3', { className: 'bdm-h3', text: 'Your own fields' }),
          el('p', { className: 'bdm-muted', text: 'Add anything not covered above, with an optional Hindi label. Up to ' + LIMITS.customPerSection + ' here, ' + LIMITS.customTotal + ' in total.' }),
        ]),
      ]);
      function setRows(next, focus) { store.data(base, next, { source: 'form', rerender: true, focus: focus }); }
      rows.forEach(function (row, i) {
        var p = base.concat([i]);
        var idb = domId(p);
        var en = el('input', { id: idb + '-en', 'data-fkey': idb + '-en', className: 'bdm-input', type: 'text', maxlength: LIMITS.customLabelMax || 40, placeholder: 'Label, e.g. Native village', value: (row.label && row.label.en) || '' });
        var hi = el('input', { id: idb + '-hi', 'data-fkey': idb + '-hi', className: 'bdm-input', type: 'text', maxlength: LIMITS.customLabelMax || 40, lang: 'hi', placeholder: 'हिंदी लेबल (वैकल्पिक)', value: (row.label && row.label.hi) || '' });
        var val = el('input', { id: idb + '-v', 'data-fkey': idb + '-v', className: 'bdm-input', type: 'text', maxlength: LIMITS.customValueMax || 200, placeholder: 'Value', value: row.value || '' });
        en.addEventListener('input', function () { setData(p.concat(['label', 'en']), en.value); });
        hi.addEventListener('input', function () { setData(p.concat(['label', 'hi']), hi.value); });
        val.addEventListener('input', function () { setData(p.concat(['value']), val.value); });
        card.appendChild(el('div', { className: 'bdm-custom' }, [
          el('div', { className: 'bdm-custom__f' }, [el('label', { className: 'bdm-label', for: idb + '-en', text: 'Label (English)' }), en]),
          el('div', { className: 'bdm-custom__f' }, [el('label', { className: 'bdm-label', for: idb + '-hi', text: 'Label (Hindi)' }), hi]),
          el('div', { className: 'bdm-custom__f bdm-custom__f--wide' }, [el('label', { className: 'bdm-label', for: idb + '-v', text: 'Value' }), val]),
          iconBtn('trash', 'Remove this field', function () { var n = rows.slice(); n.splice(i, 1); setRows(n, domId(base) + '-add'); announce('Custom field removed'); }, { className: 'bdm-iconbtn--danger bdm-custom__rm' }),
        ]));
      });
      var add = btn('Add a field', { kind: 'soft', icon: 'plus', fkey: domId(base) + '-add', disabled: capSection || capTotal, onClick: function () {
        setRows(rows.concat([{ id: uid('c'), label: { en: '', hi: '' }, value: '' }]), domId(base.concat([rows.length])) + '-en');
      } });
      card.appendChild(el('div', { className: 'bdm-card__foot' }, [
        add,
        capSection || capTotal ? el('p', { className: 'bdm-muted', text: capTotal ? 'You have used all ' + LIMITS.customTotal + ' custom fields.' : 'This section already has ' + LIMITS.customPerSection + ' custom fields.' }) : null,
      ]));
      return card;
    }

    // ---- sync (no rebuild): visibility, computed text, errors
    function sync() {
      computeErrors();
      reg.forEach(function (e) {
        if (e.cond) setVisible(e.wrap, isVisible(e.f));
        if (e.refresh) e.refresh();
        var key = pathKey(e.path);
        var msg = state.ui.touched[key] ? errors[key] : '';
        var inputs = e.wrap.querySelectorAll('#' + cssId(e.id) + ', #' + cssId(e.id) + '-cm');
        if (e.errEl) e.errEl.textContent = msg || '';
        e.wrap.classList.toggle('has-error', !!msg);
        inputs.forEach(function (inp) { if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); });
      });
      var wb = d.getElementById('bdm-stepwarn');
      if (wb && wb.firstChild && !stepErrorKeys().length) clear(wb);
    }
    function cssId(id) { return id.replace(/([^\w-])/g, '\\$1'); }
    function setVisible(wrap, show) {
      var shown = !wrap.hidden && !wrap.classList.contains('is-collapsed');
      if (show === shown) return;
      if (REDUCED) { wrap.hidden = !show; wrap.classList.toggle('is-collapsed', !show); return; }
      if (show) {
        wrap.hidden = false;
        void wrap.offsetHeight;
        wrap.classList.remove('is-collapsed');
      } else {
        wrap.classList.add('is-collapsed');
        setTimeout(function () { if (wrap.classList.contains('is-collapsed')) wrap.hidden = true; }, 220);
      }
    }

    return { render: render, sync: sync, currentStep: currentStep };
  })();

  // ---------------------------------------------------------------- sections (order, visibility, titles)
  var sections = (function () {
    function order() {
      var rd = resolvedDesign();
      var o = Array.isArray(rd.sectionOrder) && rd.sectionOrder.length ? rd.sectionOrder.slice() : SECTIONS.slice();
      o = o.filter(function (s) { return SECTIONS.indexOf(s) !== -1; });
      SECTIONS.forEach(function (s) { if (o.indexOf(s) === -1) o.push(s); });
      return o;
    }
    function hidden() { var rd = resolvedDesign(); return Array.isArray(rd.hiddenSections) ? rd.hiddenSections : []; }
    function title(s) {
      var t = state.doc.data.sectionTitles && state.doc.data.sectionTitles[s];
      return (t && t.en) || sectionLabel(s, 'en');
    }
    function setOrder(next, moved) {
      store.design('sectionOrder', next, { focus: moved ? 'sec-drag-' + moved : null });
      if (moved) announce(title(moved) + ' moved to position ' + (next.indexOf(moved) + 1) + ' of ' + next.length);
    }

    function render(container, opts) {
      opts = opts || {};
      var list = el('ol', { className: 'bdm-seclist', 'aria-label': 'Biodata sections in print order' });
      var o = order();
      var hid = hidden();
      o.forEach(function (s, i) {
        var isHidden = hid.indexOf(s) !== -1;
        var name = title(s);
        var renameId = 'bdm-sec-rename-' + s;
        var handle = el('button', { type: 'button', className: 'bdm-seclist__handle', 'aria-label': 'Reorder ' + name + '. Drag, or use the arrow keys.', 'data-fkey': 'sec-drag-' + s }, [icon('drag', 16)]);
        var row = el('li', { className: 'bdm-seclist__row' + (isHidden ? ' is-hidden' : ''), 'data-section': s }, [
          el('div', { className: 'bdm-seclist__main' }, [
            handle,
            el('span', { className: 'bdm-seclist__name' }, [
              el('span', { className: 'bdm-seclist__title', text: name }),
              isHidden ? el('span', { className: 'bdm-badge', text: 'Hidden' }) : null,
            ]),
            el('div', { className: 'bdm-seclist__tools' }, [
              iconBtn('up', 'Move ' + name + ' up', function () { move(s, -1); }, { disabled: i === 0, fkey: 'sec-up-' + s }),
              iconBtn('down', 'Move ' + name + ' down', function () { move(s, 1); }, { disabled: i === o.length - 1, fkey: 'sec-down-' + s }),
              el('button', { type: 'button', className: 'bdm-iconbtn', 'aria-expanded': 'false', 'aria-controls': renameId, 'aria-label': 'Rename ' + name, title: 'Rename', 'data-fkey': 'sec-ren-' + s, onclick: function (ev) {
                var b = ev.currentTarget; var box = d.getElementById(renameId);
                box.hidden = !box.hidden; b.setAttribute('aria-expanded', String(!box.hidden));
                if (!box.hidden) box.querySelector('input').focus();
              } }, [icon('edit', 16)]),
              el('button', { type: 'button', className: 'bdm-switch' + (isHidden ? '' : ' is-on'), role: 'switch', 'aria-checked': String(!isHidden), 'aria-label': 'Show ' + name + ' on biodata', 'data-fkey': 'sec-vis-' + s, onclick: function () { toggleHidden(s); } }, [el('span', { className: 'bdm-switch__knob' })]),
            ]),
          ]),
          renameBox(s, renameId),
        ]);
        handle.addEventListener('keydown', function (ev) {
          if (ev.key === 'ArrowUp') { ev.preventDefault(); move(s, -1); }
          else if (ev.key === 'ArrowDown') { ev.preventDefault(); move(s, 1); }
        });
        handle.addEventListener('pointerdown', function (ev) { startDrag(ev, row, list); });
        list.appendChild(row);
      });
      container.appendChild(list);
      if (opts.note !== false) container.appendChild(el('p', { className: 'bdm-hint', text: 'Hidden sections keep their details; they are just left out of the biodata. Custom titles are used in the printed document.' }));
    }

    function renameBox(s, id) {
      var t = (state.doc.data.sectionTitles && state.doc.data.sectionTitles[s]) || {};
      var en = el('input', { id: id + '-en', 'data-fkey': id + '-en', className: 'bdm-input bdm-input--sm', type: 'text', maxlength: LIMITS.sectionTitleMax || 40, placeholder: sectionLabel(s, 'en'), value: t.en || '' });
      var hi = el('input', { id: id + '-hi', 'data-fkey': id + '-hi', className: 'bdm-input bdm-input--sm', type: 'text', maxlength: LIMITS.sectionTitleMax || 40, lang: 'hi', placeholder: sectionLabel(s, 'hi'), value: t.hi || '' });
      function save() {
        var cur = Object.assign({}, state.doc.data.sectionTitles || {});
        if (!en.value.trim() && !hi.value.trim()) delete cur[s];
        else cur[s] = { en: en.value, hi: hi.value };
        store.data(['sectionTitles'], cur, { source: 'form', coalesce: true });
      }
      en.addEventListener('input', save);
      hi.addEventListener('input', save);
      return el('div', { className: 'bdm-seclist__rename', id: id, hidden: !(t.en || t.hi) }, [
        el('div', {}, [el('label', { className: 'bdm-label', for: id + '-en', text: 'Title (English)' }), en]),
        el('div', {}, [el('label', { className: 'bdm-label', for: id + '-hi', text: 'Title (Hindi)' }), hi]),
      ]);
    }

    function move(s, delta) {
      var o = order();
      var i = o.indexOf(s);
      var j = i + delta;
      if (j < 0 || j >= o.length) return;
      o.splice(i, 1);
      o.splice(j, 0, s);
      setOrder(o, s);
    }
    function toggleHidden(s) {
      var h = hidden().slice();
      var at = h.indexOf(s);
      if (at === -1) h.push(s); else h.splice(at, 1);
      store.design('hiddenSections', h, { focus: 'sec-vis-' + s });
      announce(title(s) + (at === -1 ? ' hidden on the biodata' : ' shown on the biodata'));
    }

    // Pointer drag with a floating ghost; rows reorder live, order is saved on drop.
    function startDrag(ev, row, list) {
      if (ev.button !== undefined && ev.button !== 0) return;
      ev.preventDefault();
      // Listen on the document: moving the row in the DOM would drop pointer capture on the handle.
      var pid = ev.pointerId;
      var rect = row.getBoundingClientRect();
      var offsetY = ev.clientY - rect.top;
      var ghost = row.cloneNode(true);
      ghost.className += ' bdm-seclist__ghost';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.style.width = rect.width + 'px';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      d.body.appendChild(ghost);
      row.classList.add('is-dragging');
      function onMove(e) {
        if (e.pointerId !== pid) return;
        ghost.style.top = (e.clientY - offsetY) + 'px';
        var rows = Array.prototype.slice.call(list.children).filter(function (r) { return r !== row; });
        var before = null;
        for (var i = 0; i < rows.length; i += 1) {
          var r = rows[i].getBoundingClientRect();
          if (e.clientY < r.top + r.height / 2) { before = rows[i]; break; }
        }
        if (before) { if (row.nextSibling !== before) list.insertBefore(row, before); }
        else if (list.lastChild !== row) list.appendChild(row);
      }
      function onUp(e) {
        if (e.pointerId !== pid) return;
        d.removeEventListener('pointermove', onMove);
        d.removeEventListener('pointerup', onUp);
        d.removeEventListener('pointercancel', onUp);
        ghost.remove();
        row.classList.remove('is-dragging');
        var next = Array.prototype.map.call(list.children, function (r) { return r.getAttribute('data-section'); });
        var s = row.getAttribute('data-section');
        if (next.join() !== order().join()) setOrder(next, s);
      }
      d.addEventListener('pointermove', onMove);
      d.addEventListener('pointerup', onUp);
      d.addEventListener('pointercancel', onUp);
    }

    var drawer = null;
    function openDrawer() {
      var box = el('div', { className: 'bdm-drawer-sections' });
      render(box);
      drawer = modal.open({
        title: 'Sections & order', variant: 'drawer', body: box, describe: false,
        actions: [{ label: 'Done', kind: 'primary' }],
        onClose: function () { drawer = null; },
      });
    }
    function refreshDrawer() {
      if (!drawer) return;
      var box = drawer.body.querySelector('.bdm-drawer-sections');
      if (!box) return;
      var key = d.activeElement && box.contains(d.activeElement) ? d.activeElement.getAttribute('data-fkey') : null;
      clear(box);
      render(box);
      if (key) { var t = box.querySelector('[data-fkey="' + key + '"]'); if (t) t.focus(); }
    }
    return { render: render, openDrawer: openDrawer, refreshDrawer: refreshDrawer, order: order };
  })();

  // ---------------------------------------------------------------- design step
  var design = (function () {
    var category = 'all';
    var loadedFontCss = {};
    var SHAPE_LABEL = { rect: 'Rectangle', square: 'Square', rounded: 'Rounded', circle: 'Circle', round: 'Circle', arch: 'Arch', oval: 'Oval' };
    var PLACE_LABEL = { left: 'Left', right: 'Right', center: 'Centre', centre: 'Centre', top: 'Top', header: 'In header', sidebar: 'Sidebar', rail: 'Side rail', hero: 'Large hero', none: 'No photo', 'top-right': 'Top right', 'top-left': 'Top left' };

    function section(title, desc, kids, extraClass) {
      return el('section', { className: 'bdm-card bdm-dsec' + (extraClass ? ' ' + extraClass : '') }, [
        el('div', { className: 'bdm-card__head' }, [el('h3', { className: 'bdm-h3', text: title }), desc ? el('p', { className: 'bdm-muted', text: desc }) : null]),
      ].concat(kids));
    }
    function segmented(name, options, current, onPick) {
      var g = el('div', { className: 'bdm-seg', role: 'radiogroup', 'aria-label': name });
      options.forEach(function (o) {
        var on = String(o.value) === String(current);
        g.appendChild(el('button', { type: 'button', role: 'radio', className: 'bdm-seg__opt' + (on ? ' is-on' : ''), 'aria-checked': String(on), tabindex: on ? '0' : '-1', 'data-fkey': 'seg-' + name + '-' + o.value, lang: o.lang || null, onclick: function () { onPick(o.value); } }, [el('span', { text: o.label })]));
      });
      radioKeys(g);
      if (!g.querySelector('[tabindex="0"]') && g.firstChild) g.firstChild.tabIndex = 0;
      return g;
    }
    function radioKeys(g) {
      g.addEventListener('keydown', function (ev) {
        var opts = Array.prototype.slice.call(g.querySelectorAll('[role="radio"]'));
        var i = opts.indexOf(d.activeElement);
        if (i === -1) return;
        var n = null;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') n = (i + 1) % opts.length;
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') n = (i - 1 + opts.length) % opts.length;
        if (n === null) return;
        ev.preventDefault();
        opts[n].click();
      });
    }

    function render(body) {
      var def = tplDef(state.doc.templateId);
      var rd = resolvedDesign();
      body.appendChild(templatePicker(def));
      body.appendChild(styleCard(def, rd));
      body.appendChild(photoCard(def, rd));
      body.appendChild(textCard(def, rd));
      var secBox = el('div', {});
      sections.render(secBox);
      body.appendChild(section('Sections', 'Show, hide, rename and reorder the sections of your biodata.', [secBox]));
      if (persist.isRemote()) body.appendChild(shareCard(rd));
      body.appendChild(exportCard());
    }

    function templatePicker(def) {
      var cats = [{ slug: 'all', name: 'All' }].concat(CATEGORIES.filter(function (c) {
        return TEMPLATES.some(function (t) { return (t.categories || [t.category]).indexOf(c.slug) !== -1; });
      }));
      var filter = segmentedChips(cats, category, function (slug) { category = slug; forms.render({ focus: 'cat-' + slug }); });
      var grid = el('div', { className: 'bdm-tpls', role: 'radiogroup', 'aria-label': 'Template' });
      TEMPLATES.filter(function (t) { return category === 'all' || (t.categories || [t.category]).indexOf(category) !== -1; }).forEach(function (t) {
        var on = t.id === state.doc.templateId;
        var name = tplName(t.id);
        var thumb = el('span', { className: 'bdm-tpl__thumb' });
        var img = el('img', { src: '/images/biodata/' + t.id + '.webp', alt: '', loading: 'lazy', width: 210, height: 297, decoding: 'async' });
        img.addEventListener('error', function () {
          img.remove();
          var tdef = K.registry.get(t.id);
          var pal = tdef && K.palettes[(tdef.defaults && tdef.defaults.palette) || (tdef.palettes || [])[0]];
          var v = pal ? pal.vars : {};
          var fb = el('span', { className: 'bdm-tpl__fallback' }, [el('span', { className: 'bdm-tpl__fbname', text: name })]);
          fb.style.setProperty('--fb-primary', v.primary || '#be123c');
          fb.style.setProperty('--fb-paper', v.paper || '#ffffff');
          fb.style.setProperty('--fb-accent', v.accent || '#f59e0b');
          thumb.appendChild(fb);
        });
        thumb.appendChild(img);
        grid.appendChild(el('button', { type: 'button', role: 'radio', className: 'bdm-tpl' + (on ? ' is-on' : ''), 'aria-checked': String(on), tabindex: on ? '0' : '-1', 'data-fkey': 'tpl-' + t.id, onclick: function () { switchTemplate(t.id); } }, [
          thumb,
          el('span', { className: 'bdm-tpl__name', text: name }),
          on ? el('span', { className: 'bdm-tpl__check', 'aria-hidden': 'true' }, [icon('check', 14)]) : null,
        ]));
      });
      if (!grid.querySelector('[tabindex="0"]') && grid.firstChild) grid.firstChild.tabIndex = 0;
      radioKeys(grid);
      return section('Template', 'Switching templates keeps everything you have entered.', [filter, grid], 'bdm-dsec--tpl');
    }
    function segmentedChips(cats, current, onPick) {
      var g = el('div', { className: 'bdm-catbar', role: 'group', 'aria-label': 'Filter templates by category' });
      cats.forEach(function (c) {
        var on = c.slug === current;
        g.appendChild(el('button', { type: 'button', className: 'bdm-chip bdm-chip--sm' + (on ? ' is-on' : ''), 'aria-pressed': String(on), 'data-fkey': 'cat-' + c.slug, onclick: function () { onPick(c.slug); } }, [el('span', { text: c.name })]));
      });
      return g;
    }

    function switchTemplate(id) {
      if (id === state.doc.templateId) return;
      var next = tplDef(id);
      var cur = Object.assign({}, state.doc.design || {});
      // Template-specific keys that the new template does not offer fall back to its defaults.
      if (cur.palette && next.palettes && next.palettes.indexOf(cur.palette) === -1) delete cur.palette;
      if (cur.font && next.fonts && next.fonts.indexOf(cur.font) === -1) delete cur.font;
      if (cur.photoPlacement && next.photoPlacements && next.photoPlacements.indexOf(cur.photoPlacement) === -1) delete cur.photoPlacement;
      var cleaned = cleanDesignFor(cur, id);
      var data = state.doc.data;
      var prevInv = (tplDef(state.doc.templateId).defaults || {}).invocation || '';
      var nextInv = (next.defaults || {}).invocation || '';
      if (!data.invocation || data.invocation === prevInv) data = Object.assign({}, data, { invocation: nextInv });
      store.set(['doc'], Object.assign({}, state.doc, { templateId: id, design: cleaned, data: data }), { rerender: true, focus: 'tpl-' + id });
      announce('Template changed to ' + tplName(id) + '. Your details are kept.');
    }

    function ensureFontCss(families) {
      var need = families.filter(function (f) { return !loadedFontCss[f]; });
      if (!need.length || typeof K.fontFaceCss !== 'function') return;
      need.forEach(function (f) { loadedFontCss[f] = true; });
      var css = safe(function () { return K.fontFaceCss(need, fontUrl); }, '');
      if (css) d.head.appendChild(el('style', { 'data-bdm-fonts': '', text: css }));
    }

    function styleCard(def, rd) {
      var pals = (def.palettes || Object.keys(K.palettes)).filter(function (p) { return K.palettes[p]; });
      var swatches = el('div', { className: 'bdm-swatches', role: 'radiogroup', 'aria-label': 'Colour palette' });
      pals.forEach(function (p) {
        var pal = K.palettes[p];
        var on = p === rd.palette;
        var dot = el('span', { className: 'bdm-swatch__dot', 'aria-hidden': 'true' }, [el('span'), el('span'), el('span')]);
        dot.children[0].style.background = pal.vars.primary;
        dot.children[1].style.background = pal.vars.accent;
        dot.children[2].style.background = pal.vars.paper;
        swatches.appendChild(el('button', { type: 'button', role: 'radio', className: 'bdm-swatch' + (on ? ' is-on' : ''), 'aria-checked': String(on), tabindex: on ? '0' : '-1', 'data-fkey': 'pal-' + p, onclick: function () { store.design('palette', p, { focus: 'pal-' + p }); } }, [dot, el('span', { className: 'bdm-swatch__name', text: pal.name })]));
      });
      if (!swatches.querySelector('[tabindex="0"]') && swatches.firstChild) swatches.firstChild.tabIndex = 0;
      radioKeys(swatches);

      var fonts = (def.fonts || Object.keys(K.fontPresets || {})).filter(function (f) { return K.fontPresets && K.fontPresets[f]; });
      var fam = [];
      fonts.forEach(function (f) { (K.fontPresets[f].families || []).forEach(function (x) { if (fam.indexOf(x) === -1) fam.push(x); }); });
      ensureFontCss(fam);
      var fontGrid = el('div', { className: 'bdm-fonts', role: 'radiogroup', 'aria-label': 'Font pairing' });
      fonts.forEach(function (f) {
        var fp = K.fontPresets[f];
        var on = f === rd.font;
        var sample = el('span', { className: 'bdm-font__sample', 'aria-hidden': 'true', text: 'Aa' });
        sample.style.fontFamily = fp.display;
        var sub = el('span', { className: 'bdm-font__body', text: 'Biodata' });
        sub.style.fontFamily = fp.body;
        fontGrid.appendChild(el('button', { type: 'button', role: 'radio', className: 'bdm-font' + (on ? ' is-on' : ''), 'aria-checked': String(on), tabindex: on ? '0' : '-1', 'data-fkey': 'font-' + f, onclick: function () { store.design('font', f, { focus: 'font-' + f }); } }, [sample, el('span', { className: 'bdm-font__meta' }, [el('span', { className: 'bdm-font__name', text: fp.name }), sub])]));
      });
      if (!fontGrid.querySelector('[tabindex="0"]') && fontGrid.firstChild) fontGrid.firstChild.tabIndex = 0;
      radioKeys(fontGrid);

      var scale = Number(rd.scale) || 1;
      var scaleId = 'bdm-scale';
      var scaleOut = el('output', { className: 'bdm-range__out', for: scaleId, text: Math.round(scale * 100) + '%' });
      var range = el('input', { id: scaleId, 'data-fkey': scaleId, className: 'bdm-range', type: 'range', min: '0.85', max: '1.15', step: '0.05', value: String(scale), 'aria-valuetext': Math.round(scale * 100) + '%' });
      range.addEventListener('input', function () {
        var v = Math.round(Number(range.value) * 100) / 100;
        scaleOut.textContent = Math.round(v * 100) + '%';
        range.setAttribute('aria-valuetext', Math.round(v * 100) + '%');
        var next = Object.assign({}, state.doc.design || {}, { scale: v });
        store.set(['doc', 'design'], next, { coalesce: true });
      });
      var spacing = segmented('spacing', [{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Relaxed' }], rd.spacing || 'normal', function (v) { store.design('spacing', v, { focus: 'seg-spacing-' + v }); });

      return section('Style', 'Colours, fonts and text size.', [
        el('p', { className: 'bdm-label', id: 'bdm-pal-label', text: 'Colour palette' }), swatches,
        el('p', { className: 'bdm-label', text: 'Fonts' }), fontGrid,
        el('div', { className: 'bdm-row2' }, [
          el('div', { className: 'bdm-range-wrap' }, [el('div', { className: 'bdm-field__head' }, [el('label', { className: 'bdm-label', for: scaleId, text: 'Text size' }), scaleOut]), range, el('div', { className: 'bdm-range__ticks', 'aria-hidden': 'true' }, [el('span', { text: 'Smaller' }), el('span', { text: 'Larger' })])]),
          el('div', {}, [el('p', { className: 'bdm-label', text: 'Spacing' }), spacing]),
        ]),
      ]);
    }

    function photoCard(def, rd) {
      var places = def.photoPlacements || [];
      var shapes = (schema.PHOTO_SHAPES || def.photoShapes || ['rounded', 'square', 'circle']);
      var kids = [];
      if (places.length > 1) kids.push(el('p', { className: 'bdm-label', text: 'Placement' }), segmented('placement', places.map(function (p) { return { value: p, label: PLACE_LABEL[p] || humanize(p) }; }), rd.photoPlacement, function (v) { store.design('photoPlacement', v, { focus: 'seg-placement-' + v }); }));
      kids.push(el('p', { className: 'bdm-label', text: 'Shape' }), segmented('shape', shapes.map(function (p) { return { value: p, label: SHAPE_LABEL[p] || humanize(p) }; }), rd.photoShape || shapes[0], function (v) { store.design('photoShape', v, { focus: 'seg-shape-' + v }); }));
      if (!state.photo.url && !state.photo.dataUrl) kids.push(el('p', { className: 'bdm-hint' }, ['No photo yet. ', el('button', { type: 'button', className: 'bdm-linkbtn', onclick: function () { stepper.go(STEPS.indexOf('photo'), { focusPanel: true }); }, text: 'Add a photo' }), '.']));
      return section('Photo', null, kids);
    }

    function textCard(def, rd) {
      var langs = (BOOT.config && Array.isArray(BOOT.config.languages) && BOOT.config.languages.length ? BOOT.config.languages : ['en', 'hi']);
      var langOpts = [{ value: 'en', label: 'English' }];
      if (langs.indexOf('hi') !== -1) langOpts.push({ value: 'hi', label: 'हिन्दी', lang: 'hi' }, { value: 'both', label: 'Both' });
      var langSeg = segmented('labels', langOpts, rd.labelLanguage || 'en', function (v) { store.design('labelLanguage', v, { focus: 'seg-labels-' + v }); });

      var invId = 'bdm-invocation';
      var invField = FIELD_BY_ID.invocation || { max: 80 };
      var tplInv = (def.defaults && def.defaults.invocation) || '';
      var inv = el('input', { id: invId, 'data-fkey': invId, className: 'bdm-input', type: 'text', maxlength: LIMITS.invocationMax || invField.max || 60, value: state.doc.data.invocation || '', placeholder: tplInv || 'e.g. ॥ श्री गणेशाय नमः ॥', dir: 'auto' });
      inv.addEventListener('input', function () { store.data(['invocation'], inv.value, { source: 'form', coalesce: true }); });
      var invSugg = [tplInv, '॥ श्री गणेशाय नमः ॥', 'ॐ', '|| Jai Sevalal ||'].filter(function (x, i, a) { return x && a.indexOf(x) === i; });
      var invChips = el('div', { className: 'bdm-chips bdm-chips--inline', role: 'group', 'aria-label': 'Suggested invocation lines' }, invSugg.map(function (s, i) {
        return el('button', { type: 'button', className: 'bdm-chip bdm-chip--sm', dir: 'auto', 'data-fkey': 'inv-' + i, onclick: function () { store.data(['invocation'], s, { source: 'form', rerender: true, focus: invId }); } }, [el('span', { text: s })]);
      }));

      var footId = 'bdm-footer-text';
      var foot = el('input', { id: footId, 'data-fkey': footId, className: 'bdm-input', type: 'text', maxlength: LIMITS.footerMax || 80, value: rd.footerText || '', placeholder: 'e.g. Prepared with love by the Rathod family' });
      foot.addEventListener('input', function () {
        var next = Object.assign({}, state.doc.design || {}, { footerText: foot.value });
        store.set(['doc', 'design'], next, { coalesce: true });
      });

      return section('Text & language', null, [
        el('p', { className: 'bdm-label', text: 'Label language' }), langSeg,
        el('p', { className: 'bdm-hint', text: 'Labels such as "Date of Birth" can print in English, Hindi or both. What you typed is printed as you wrote it.' }),
        el('div', { className: 'bdm-field' }, [el('div', { className: 'bdm-field__head' }, [el('label', { className: 'bdm-label', for: invId, text: 'Invocation line' }), el('span', { className: 'bdm-opt', text: 'Optional' })]), inv, invChips]),
        el('div', { className: 'bdm-field' }, [el('div', { className: 'bdm-field__head' }, [el('label', { className: 'bdm-label', for: footId, text: 'Footer text' }), el('span', { className: 'bdm-opt', text: 'Optional' })]), foot]),
      ]);
    }

    function shareCard(rd) {
      var on = !!rd.shareContact;
      var sw = el('button', { type: 'button', role: 'switch', className: 'bdm-switch' + (on ? ' is-on' : ''), 'aria-checked': String(on), 'aria-labelledby': 'bdm-sharecontact-l', 'data-fkey': 'share-contact', onclick: function () { store.design('shareContact', !on, { focus: 'share-contact' }); } }, [el('span', { className: 'bdm-switch__knob' })]);
      return section('Share link', 'Send a private link instead of a file. Only people with the link can open it.', [
        el('div', { className: 'bdm-switchrow' }, [el('div', {}, [el('p', { className: 'bdm-label', id: 'bdm-sharecontact-l', text: 'Include contact details in the share link' }), el('p', { className: 'bdm-hint', text: 'Off by default: the shared page leaves out your Contact section.' })]), sw]),
        btn(state.meta.share && state.meta.share.url ? 'Manage share link' : 'Create share link', { kind: 'soft', icon: 'link', onClick: function () { share.open(); } }),
      ]);
    }

    function exportCard() {
      var pdf = BOOT.pdfAvailable !== false;
      return el('section', { className: 'bdm-card bdm-export' }, [
        el('div', { className: 'bdm-export__art', 'aria-hidden': 'true' }, [icon('download', 28)]),
        el('div', { className: 'bdm-export__text' }, [
          el('h3', { className: 'bdm-h3', text: 'Your biodata is ready' }),
          el('p', { className: 'bdm-muted', text: pdf ? 'Download a print-ready A4 PDF, or print it directly. Both give the same document as the preview.' : 'Use Print and choose "Save as PDF" to get the same document as the preview.' }),
        ]),
        el('div', { className: 'bdm-export__actions' }, [
          btn(pdf ? 'Download PDF' : 'Print / Save as PDF', { kind: 'primary', icon: 'download', onClick: function () { exporter.run(); } }),
          pdf ? btn('Print', { kind: 'ghost', icon: 'print', onClick: function () { exporter.print(); } }) : null,
        ]),
      ]);
    }

    return { render: render };
  })();

  // ---------------------------------------------------------------- photo
  var photo = (function () {
    var lastFile = null;
    function src() { return state.photo.url || state.photo.dataUrl || ''; }
    function setPhoto(patch) { store.set(['photo'], Object.assign({}, state.photo, patch)); }

    function renderStep(body) {
      var has = !!src();
      var fileId = 'bdm-photo-file';
      var input = el('input', { id: fileId, type: 'file', accept: 'image/jpeg,image/png,image/webp', className: 'bdm-sr', tabindex: '-1' });
      input.addEventListener('change', function () { var f = input.files && input.files[0]; input.value = ''; if (f) handleFile(f); });
      var errorEl = el('p', { className: 'bdm-error', id: 'bdm-photo-err', 'aria-live': 'polite', text: state.photo.error || '' });
      var choose = btn(has ? 'Replace photo' : 'Choose a photo', { kind: has ? 'ghost' : 'primary', icon: 'camera', fkey: 'photo-choose', onClick: function () { input.click(); } });
      choose.setAttribute('aria-describedby', 'bdm-photo-help bdm-photo-err');
      var main;
      if (has) {
        var shape = resolvedDesign().photoShape || '';
        var img = el('img', { src: src(), alt: 'Your biodata photo', className: 'bdm-photo__img' + (/^(circle|round)$/.test(shape) ? ' is-round' : '') });
        main = el('div', { className: 'bdm-photo' }, [
          el('div', { className: 'bdm-photo__frame' + (state.photo.busy ? ' is-busy' : '') }, [img, state.photo.busy ? el('span', { className: 'bdm-spinner', role: 'status', 'aria-label': 'Uploading' }) : null]),
          el('div', { className: 'bdm-photo__side' }, [
            el('p', { className: 'bdm-photo__state' }, photoStateText()),
            el('div', { className: 'bdm-photo__actions' }, [
              choose,
              lastFile ? btn('Adjust crop', { kind: 'ghost', icon: 'edit', onClick: function () { crop(lastFile); } }) : null,
              btn('Remove', { kind: 'ghost', icon: 'trash', className: 'bdm-btn--dangertext', onClick: remove }),
            ]),
            state.photo.pendingUpload && persist.isRemote() && !state.photo.busy ? btn('Retry upload', { kind: 'soft', size: 'sm', icon: 'refresh', onClick: uploadPending }) : null,
            errorEl,
          ]),
        ]);
      } else {
        var drop = el('div', { className: 'bdm-drop', 'data-fkey': 'photo-drop' }, [
          el('span', { className: 'bdm-drop__icon', 'aria-hidden': 'true' }, [icon('image', 30)]),
          el('p', { className: 'bdm-drop__title', text: 'Drag a photo here' }),
          el('p', { className: 'bdm-muted', text: 'or' }),
          choose,
          el('p', { className: 'bdm-hint', id: 'bdm-photo-help', text: 'JPEG, PNG or WebP, up to 10 MB. You can crop it next.' }),
          errorEl,
        ]);
        ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.classList.add('is-over'); }); });
        ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove('is-over'); }); });
        drop.addEventListener('drop', function (ev) { ev.preventDefault(); var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]; if (f) handleFile(f); });
        main = drop;
      }
      body.appendChild(el('div', { className: 'bdm-card' }, [input, main]));
      body.appendChild(el('div', { className: 'bdm-card bdm-tips' }, [
        el('h3', { className: 'bdm-h3', text: 'Tips for a great biodata photo' }),
        el('ul', { className: 'bdm-tips__list' }, [
          'A recent photo where your face is clearly visible',
          'Natural light and a plain background',
          'Just you: no group photos, sunglasses or heavy filters',
        ].map(function (t) { return el('li', {}, [icon('check', 14), el('span', { text: t })]); })),
        el('p', { className: 'bdm-hint' }, [icon('lock', 14), ' ', persist.isRemote() ? 'Your photo is stored privately for this biodata. It is never shown on your matrimony profile.' : 'Your photo stays in this browser. It is sent to our server only when you download the PDF, and is not stored.']),
      ]));
    }

    function photoStateText() {
      if (state.photo.busy) return [el('span', { className: 'bdm-badge bdm-badge--info', text: 'Uploading…' })];
      if (state.photo.url) return [el('span', { className: 'bdm-badge bdm-badge--ok' }, [icon('check', 12), ' Saved to your account'])];
      if (state.photo.pendingUpload && persist.isRemote()) return [el('span', { className: 'bdm-badge bdm-badge--warn', text: 'Not uploaded yet' })];
      return [el('span', { className: 'bdm-badge', text: 'Saved on this device' })];
    }

    function handleFile(file) {
      var problem = w.BiodataCropper ? w.BiodataCropper.validate(file) : 'The photo tool did not load. Reload the page and try again.';
      if (problem) { setPhoto({ error: problem }); forms.render({ focus: 'photo-choose' }); return; }
      lastFile = file;
      crop(file);
    }

    function crop(file) {
      var rd = resolvedDesign();
      w.BiodataCropper.open(file, { aspect: photoAspect(), round: /^(circle|round)$/.test(String(rd.photoShape || '')) }).then(function (blob) {
        if (!blob) return;
        var reader = new FileReader();
        reader.onload = function () {
          setPhoto({ dataUrl: String(reader.result), url: '', error: '', pendingUpload: persist.isRemote() ? blob : null });
          forms.render({ focus: 'photo-choose' });
          toast('Photo added');
          if (persist.isRemote()) uploadPending();
        };
        reader.readAsDataURL(blob);
      }, function (err) {
        setPhoto({ error: (err && err.message) || 'This photo could not be opened.' });
        forms.render({ focus: 'photo-choose' });
      });
    }

    function uploadPending() {
      var blob = state.photo.pendingUpload;
      if (!blob || !persist.isRemote()) return;
      if (!state.meta.documentId) {
        // The document is created by the first save; the upload follows it (persist.saveRemote).
        persist.flush();
        return;
      }
      setPhoto({ busy: true, error: '' });
      if (forms.currentStep() === 'photo') forms.render();
      var fd = new FormData();
      fd.append('photo', blob, 'photo.jpg');
      api('POST', API + '/documents/' + encodeURIComponent(state.meta.documentId) + '/photo', fd).then(function (res) {
        if (res.ok) {
          var p = (res.data && (res.data.photo || res.data)) || {};
          var url = p.url || (API + '/documents/' + encodeURIComponent(state.meta.documentId) + '/photo');
          setPhoto({ busy: false, pendingUpload: null, dataUrl: '', url: url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now(), error: '' });
          toast('Photo saved to your account');
        } else if (res.status === 401) {
          setPhoto({ busy: false });
          persist.degrade('signedout');
        } else {
          setPhoto({ busy: false, error: res.code === 'INVALID_IMAGE' ? 'This image could not be processed. Try another photo.' : 'The photo could not be uploaded. It is kept on this device; try again.' });
        }
        if (forms.currentStep() === 'photo') forms.render();
      });
    }

    function remove() {
      modal.confirm({ title: 'Remove this photo?', message: 'The biodata will be printed without a photo. You can add one again any time.', confirmLabel: 'Remove photo', danger: true }).then(function (ok) {
        if (!ok) return;
        var hadServer = !!state.photo.url && persist.isRemote() && state.meta.documentId;
        setPhoto({ dataUrl: '', url: '', error: '', pendingUpload: null });
        lastFile = null;
        forms.render({ focus: 'photo-choose' });
        if (hadServer) {
          api('DELETE', API + '/documents/' + encodeURIComponent(state.meta.documentId) + '/photo').then(function (res) {
            if (!res.ok && res.status === 401) persist.degrade('signedout');
            else if (!res.ok) toast('The photo could not be removed from your account', 'error');
          });
        }
        toast('Photo removed');
      });
    }

    return { renderStep: renderStep, uploadPending: uploadPending, src: src };
  })();

  // ---------------------------------------------------------------- preview
  var preview = (function () {
    var frame = d.getElementById('bdm-frame');
    var viewport = d.getElementById('bdm-viewport');
    var scaler = d.getElementById('bdm-scaler');
    var noticeEl = d.getElementById('bdm-preview-notice');
    var zoomEl = app.querySelector('[data-bind="zoom"]');
    var fitBtn = app.querySelector('[data-action="zoom-fit"]');
    var pageInfo = app.querySelector('[data-bind="pageinfo"]');
    var pagesBind = app.querySelector('[data-bind="pages"]');
    var pagesShort = app.querySelector('[data-bind="pagesShort"]');
    var ready = false;
    var timer = null;
    var warnings = [];
    var zoom = 'fit';
    var scale = 1;
    var size = { w: A4W, h: 1123 };
    var pages = 0;
    var override = null;
    var WARN_TEXT = {
      OVERFLOW: 'Some text is too long to fit on one page and is cut off (outlined in red). Shorten it or choose a smaller text size.',
      PHOTO_REJECTED: 'The photo could not be shown. Please add it again from the Photo step.',
      PAGINATE_FAILED: 'The preview could not be split into pages. Your details are safe; try another template or reload the page.',
    };

    function idoc() { return frame.contentDocument; }
    function init() {
      var html = K.previewShell({ fontUrl: fontUrl });
      var doc = idoc();
      doc.open();
      doc.write(html);
      doc.close();
      ready = !!doc.getElementById('bd-root');
      if (!ready) frame.addEventListener('load', function () { ready = true; listenPaginated(); render(); }, { once: true });
      else listenPaginated();
      viewport.addEventListener('scroll', updatePageInfo, { passive: true });
      if (w.ResizeObserver) new w.ResizeObserver(function () { if (zoom === 'fit') fit(); }).observe(viewport);
      else w.addEventListener('resize', function () { if (zoom === 'fit') fit(); });
    }
    function listenPaginated() {
      var win = frame.contentWindow;
      if (win && win.addEventListener) win.addEventListener('bd:paginated', function (ev) { if (!inRender) afterPaginate(ev.detail); });
    }
    var inRender = false;
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(function () { (w.requestAnimationFrame || setTimeout)(render); }, 150);
    }
    function render() {
      if (!ready) return;
      var doc = idoc();
      var root = doc.getElementById('bd-root');
      var cssEl = doc.getElementById('bd-css');
      if (!root || !cssEl) return;
      var src = override ? override.doc : state.doc;
      var parts;
      try {
        parts = K.renderBiodataParts({ data: src.data, templateId: src.templateId, design: src.design || {}, photoUrl: override ? override.photoUrl : photo.src(), mode: 'preview', fontUrl: fontUrl, now: new Date() });
      } catch (err) {
        showNotice([{ message: 'The preview could not be updated (' + (err && err.code ? err.code : 'render error') + ').' }], 'error');
        if (w.console) console.error('[biodata] preview render failed', err);
        return;
      }
      cssEl.textContent = parts.css || '';
      // raw-ok: kit output; renderBiodataParts escapes every user string (K.esc/K.attr) and allow-lists the photo URL.
      root.innerHTML = parts.body || '';
      warnings = parts.warnings || [];
      repaginate();
    }
    function repaginate() {
      var win = frame.contentWindow;
      var n = 0;
      inRender = true;
      try { n = win && typeof win.__bdRepaginate === 'function' ? win.__bdRepaginate() : 0; } catch (e) { n = 0; }
      inRender = false;
      afterPaginate(n);
    }
    // Also called when the shell re-paginates by itself after late fonts load.
    function afterPaginate(n) {
      var doc = idoc();
      pages = Number(n) > 0 ? Number(n) : doc.querySelectorAll('.bd-page').length || 1;
      measure();
      updatePageInfo();
      var list = warnings.slice();
      if (doc.querySelector('#bd-pages .bd-overflow')) list.push('OVERFLOW');
      if (Number(n) === -1) list.push('PAGINATE_FAILED');
      showNotice(list, 'warn');
    }
    function measure() {
      var doc = idoc();
      var de = doc.documentElement;
      size.w = Math.max(A4W, de.scrollWidth || A4W);
      frame.style.width = size.w + 'px';
      frame.style.height = '10px';
      size.h = Math.max(200, de.scrollHeight || doc.body.scrollHeight || 1123);
      frame.style.height = size.h + 'px';
      applyScale();
    }
    function applyScale() {
      if (zoom === 'fit') {
        var avail = viewport.clientWidth - 32;
        scale = avail > 0 ? Math.max(0.25, Math.min(1.5, avail / size.w)) : 0.5;
      } else scale = zoom;
      frame.style.transform = 'scale(' + scale + ')';
      scaler.style.width = Math.round(size.w * scale) + 'px';
      scaler.style.height = Math.round(size.h * scale) + 'px';
      zoomEl.textContent = Math.round(scale * 100) + '%';
      fitBtn.setAttribute('aria-pressed', String(zoom === 'fit'));
    }
    function setZoom(z) {
      var frac = viewport.scrollHeight ? viewport.scrollTop / viewport.scrollHeight : 0;
      zoom = z === 'fit' ? 'fit' : Math.max(0.3, Math.min(2, Math.round(z * 100) / 100));
      applyScale();
      viewport.scrollTop = frac * viewport.scrollHeight;
      updatePageInfo();
    }
    function zoomBy(delta) { setZoom((zoom === 'fit' ? scale : zoom) + delta); }
    function fit() { if (zoom === 'fit') { applyScale(); updatePageInfo(); } }
    function updatePageInfo() {
      var doc = idoc();
      var list = doc ? doc.querySelectorAll('.bd-page') : [];
      var cur = 1;
      var probe = viewport.scrollTop + viewport.clientHeight * 0.35;
      for (var i = 0; i < list.length; i += 1) { if (list[i].offsetTop * scale <= probe) cur = i + 1; }
      var n = pages || list.length || 1;
      pageInfo.textContent = (override ? 'Version preview · ' : '') + 'Page ' + Math.min(cur, n) + ' of ' + n;
      var label = n + (n === 1 ? ' page' : ' pages');
      pagesBind.textContent = '· ' + n;
      pagesShort.textContent = label;
    }
    function showNotice(list, kind) {
      clear(noticeEl);
      if (!list || !list.length) { noticeEl.hidden = true; return; }
      var msgs = list.map(function (x) {
        if (typeof x === 'string') return WARN_TEXT[x] || humanize(x);
        if (x && x.message) return x.message;
        return x && x.code ? WARN_TEXT[x.code] || humanize(x.code) : '';
      }).filter(Boolean);
      if (!msgs.length) { noticeEl.hidden = true; return; }
      noticeEl.className = 'bdm-preview__notice bdm-preview__notice--' + kind;
      append(noticeEl, [icon(kind === 'error' ? 'warn' : 'info', 16), el('span', { text: msgs.join(' ') })]);
      noticeEl.hidden = false;
    }
    function setOverride(o) {
      override = o;
      app.classList.toggle('is-version-preview', !!o);
      render();
    }
    function print() {
      var win = frame.contentWindow;
      if (!win) return;
      render();
      try { win.focus(); win.print(); } catch (e) { toast('Printing is not available in this browser', 'error'); }
    }
    return { init: init, schedule: schedule, render: render, setZoom: setZoom, zoomBy: zoomBy, fit: fit, print: print, setOverride: setOverride, pages: function () { return pages; } };
  })();

  // ---------------------------------------------------------------- exporter
  var exporter = (function () {
    var busy = false;
    function guestDownloadsOff() { return !persist.isRemote() && BOOT.config && BOOT.config.guestDownloads === false; }
    function print() {
      preview.print();
    }
    function fallback(reason) {
      modal.open({
        title: 'PDF download is unavailable right now', icon: 'print', size: 'sm',
        body: el('div', {}, [
          el('p', { text: reason || 'PDF download is unavailable right now — use Print and choose Save as PDF; the result is identical.' }),
          el('p', { className: 'bdm-muted', text: 'In the print dialog, set the destination to "Save as PDF", paper size A4 and margins to None.' }),
        ]),
        actions: [{ label: 'Close', kind: 'ghost' }, { label: 'Print', kind: 'primary', icon: 'print', autofocus: true, onClick: function () { setTimeout(print, 50); } }],
      });
    }
    function loginPrompt() {
      modal.open({
        title: 'Log in to download the PDF', icon: 'lock', size: 'sm',
        body: el('div', {}, [
          el('p', { text: 'PDF downloads need a free BanjaraMatch account right now. Your biodata is kept on this device while you log in.' }),
          el('p', { className: 'bdm-muted', text: 'You can also use Print and choose "Save as PDF"; the result is identical.' }),
        ]),
        actions: [
          { label: 'Print instead', kind: 'ghost', onClick: function () { setTimeout(print, 50); } },
          { label: 'Log in', kind: 'primary', href: BOOT.loginUrl || '/login?returnTo=/biodata-maker/create' },
        ],
      });
    }
    function dataUrlToBlob(u) {
      var m = /^data:([^;]+);base64,(.*)$/.exec(u || '');
      if (!m) return null;
      var bin = atob(m[2]);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: m[1] });
    }
    function filenameFrom(res) {
      var cd = res.headers.get('Content-Disposition') || '';
      var m = /filename\*=UTF-8''([^;]+)/i.exec(cd);
      if (m) return safe(function () { return decodeURIComponent(m[1]); }, 'biodata.pdf');
      m = /filename="?([^";]+)"?/i.exec(cd);
      if (m) return m[1];
      var base = (state.doc.data.personal && state.doc.data.personal.fullName) || state.doc.title || 'biodata';
      return String(base).replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) + '-biodata.pdf';
    }
    function guestRequest(signal) {
      var fd = new FormData();
      fd.append('payload', JSON.stringify({ title: state.doc.title || '', templateId: state.doc.templateId, design: state.doc.design || {}, data: state.doc.data }));
      var blob = state.photo.pendingUpload || dataUrlToBlob(state.photo.dataUrl);
      if (blob) fd.append('photo', blob, 'photo.jpg');
      return fetch(API + '/render', { method: 'POST', body: fd, credentials: 'same-origin', signal: signal });
    }
    function run() {
      if (busy) return;
      if (BOOT.pdfAvailable === false) { print(); return; }
      if (guestDownloadsOff()) { loginPrompt(); return; }
      busy = true;
      var ctrl = w.AbortController ? new AbortController() : null;
      var cancelled = false;
      var progress = el('div', { className: 'bdm-progressbox' }, [
        el('div', { className: 'bdm-indeterminate', role: 'progressbar', 'aria-label': 'Preparing PDF' }, [el('span')]),
        el('p', { className: 'bdm-muted', text: 'We are typesetting your biodata on A4 pages. This usually takes a few seconds.' }),
      ]);
      var m = modal.open({
        title: 'Preparing your PDF…', icon: 'download', size: 'sm', body: progress, dismissible: false,
        actions: [{ label: 'Cancel', kind: 'ghost', onClick: function () { cancelled = true; if (ctrl) ctrl.abort(); } }],
      });
      var timeout = setTimeout(function () { if (ctrl) ctrl.abort(); }, 45000);
      var owner = persist.isRemote();
      var start = owner
        ? persist.flush().then(function (ok) {
          if (ok && state.meta.documentId) return fetch(API + '/documents/' + encodeURIComponent(state.meta.documentId) + '/pdf', { credentials: 'same-origin', signal: ctrl ? ctrl.signal : undefined });
          return guestRequest(ctrl ? ctrl.signal : undefined);
        })
        : guestRequest(ctrl ? ctrl.signal : undefined);
      start.then(function (res) {
        var type = res.headers.get('Content-Type') || '';
        if (res.ok && type.indexOf('application/pdf') !== -1) {
          return res.blob().then(function (blob) {
            var name = filenameFrom(res);
            var url = URL.createObjectURL(blob);
            var a = el('a', { href: url, download: name, className: 'bdm-sr' });
            d.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 20000);
            m.close();
            var n = res.headers.get('X-Biodata-Pages');
            toast('PDF downloaded' + (n ? ' · ' + n + (n === '1' ? ' page' : ' pages') : ''));
          });
        }
        return res.json().catch(function () { return {}; }).then(function (j) {
          m.close();
          var code = j && j.code;
          if (code === 'PDF_BUSY') {
            modal.open({ title: 'Our PDF service is busy', icon: 'history', size: 'sm', body: 'Lots of people are downloading right now. Please try again in a few seconds.', actions: [{ label: 'Print instead', kind: 'ghost', onClick: function () { setTimeout(print, 50); } }, { label: 'Retry', kind: 'primary', autofocus: true, onClick: function () { setTimeout(run, 0); } }] });
          } else if (code === 'GUEST_DOWNLOADS_OFF' || (res.status === 401 && !owner)) {
            loginPrompt();
          } else if (res.status === 401) {
            persist.degrade('signedout');
            fallback();
          } else if (res.status === 400) {
            modal.open({ title: 'Some details need fixing', icon: 'warn', tone: 'warn', size: 'sm', body: (j && j.message) || 'A field has a value that cannot be printed. Check the highlighted steps and try again.', actions: [{ label: 'OK', kind: 'primary' }] });
          } else {
            fallback();
          }
        });
      }).catch(function () {
        m.close();
        if (!cancelled) fallback();
      }).then(function () {
        clearTimeout(timeout);
        busy = false;
      });
    }
    return { run: run, print: print };
  })();

  // ---------------------------------------------------------------- owner tools: share, versions, duplicate
  function needDoc() {
    return persist.flush().then(function (ok) {
      if (!state.meta.documentId) { toast('Save your biodata first', 'error'); return false; }
      return ok !== false || !!state.meta.documentId;
    });
  }

  var share = (function () {
    var handle = null;
    function open() {
      needDoc().then(function (ok) {
        if (!ok) return;
        var box = el('div', { className: 'bdm-share' });
        handle = modal.open({ title: 'Share link', icon: 'share', variant: 'drawer', body: box, describe: false, onClose: function () { handle = null; } });
        draw(box);
      });
    }
    function days() {
      var def = Number(BOOT.config && BOOT.config.shareDefaultDays) || 30;
      return [7, 30, 90].reduce(function (best, x) { return Math.abs(x - def) < Math.abs(best - def) ? x : best; }, 30);
    }
    function absUrl(u) { return /^https?:/i.test(u) ? u : w.location.origin + u; }
    function shareUrl(sh) { return sh ? (sh.url || sh.shareUrl || (sh.token ? '/biodata-maker/s/' + sh.token : '')) : ''; }
    function draw(box, msg) {
      clear(box);
      var sh = state.meta.share;
      var active = sh && shareUrl(sh) && (!sh.expiresAt || new Date(sh.expiresAt).getTime() > Date.now());
      var daysId = 'bdm-share-days';
      var sel = el('select', { id: daysId, className: 'bdm-select' }, [7, 30, 90].map(function (n) { return el('option', { value: String(n), text: n + ' days' }); }));
      sel.value = String(days());
      if (msg) box.appendChild(el('p', { className: 'bdm-callout bdm-callout--ok', role: 'status', text: msg }));
      if (!active) {
        append(box, [
          el('p', { text: 'Create a private link to your biodata that you can send on WhatsApp or email. Anyone with the link can view it until it expires.' }),
          el('div', { className: 'bdm-field' }, [el('label', { className: 'bdm-label', for: daysId, text: 'Link expires after' }), sel]),
          el('p', { className: 'bdm-hint', text: resolvedDesign().shareContact ? 'Your contact details are included in the shared page.' : 'Your Contact section is left out of the shared page. Turn it on in Design & export.' }),
          btn('Create link', { kind: 'primary', icon: 'link', onClick: function () { call('POST', '/share', { enabled: true, days: Number(sel.value) }, box, 'Link created'); } }),
        ]);
        return;
      }
      var url = absUrl(shareUrl(sh));
      var urlId = 'bdm-share-url';
      var input = el('input', { id: urlId, className: 'bdm-input', type: 'text', readonly: true, value: url });
      input.addEventListener('focus', function () { input.select(); });
      append(box, [
        el('label', { className: 'bdm-label', for: urlId, text: 'Your private link' }),
        el('div', { className: 'bdm-copyrow' }, [input, btn('Copy', { kind: 'primary', icon: 'copy', onClick: function () { copy(url, input); } })]),
        el('p', { className: 'bdm-hint', text: (sh.expiresAt ? 'Expires on ' + niceDate(sh.expiresAt) : 'Active') + (sh.views !== undefined ? ' · ' + sh.views + (sh.views === 1 ? ' view' : ' views') : '') }),
        el('div', { className: 'bdm-field' }, [el('label', { className: 'bdm-label', for: daysId, text: 'Change expiry' }), el('div', { className: 'bdm-copyrow' }, [sel, btn('Update', { kind: 'ghost', onClick: function () { call('POST', '/share', { enabled: true, days: Number(sel.value) }, box, 'Expiry updated'); } })])]),
        el('div', { className: 'bdm-share__danger' }, [
          btn('New link', { kind: 'ghost', icon: 'refresh', onClick: function () {
            modal.confirm({ title: 'Create a new link?', message: 'The current link stops working immediately. Anyone you sent it to will need the new one.', confirmLabel: 'Create new link', danger: true }).then(function (ok) { if (ok) call('POST', '/share/rotate', {}, box, 'New link created'); });
          } }),
          btn('Turn off sharing', { kind: 'ghost', className: 'bdm-btn--dangertext', icon: 'close', onClick: function () {
            modal.confirm({ title: 'Turn off the share link?', message: 'The link stops working for everyone. You can create a new one later.', confirmLabel: 'Turn off', danger: true }).then(function (ok) { if (ok) call('POST', '/share', { enabled: false }, box, 'Sharing turned off'); });
          } }),
        ]),
      ]);
    }
    function call(method, suffix, body, box, okMsg) {
      box.classList.add('is-busy');
      api(method, API + '/documents/' + encodeURIComponent(state.meta.documentId) + suffix, body).then(function (res) {
        box.classList.remove('is-busy');
        if (res.ok) {
          var dd = res.data || {};
          var sh = dd.share !== undefined ? dd.share : (dd.token || dd.url || dd.shareUrl ? dd : null);
          if (body && body.enabled === false) sh = null;
          state.meta.share = sh;
          if (dd.version) state.meta.version = dd.version;
          if (box.isConnected) draw(box, okMsg);
          announce(okMsg);
        } else if (res.status === 401) { if (handle) handle.close(); persist.degrade('signedout'); }
        else toast(res.message || 'That did not work. Please try again.', 'error');
      });
    }
    function copy(text, input) {
      var done = function () { toast('Link copied'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { input.select(); toast('Press Ctrl+C to copy'); });
      else { input.select(); toast('Press Ctrl+C to copy'); }
    }
    return { open: open };
  })();

  var versions = (function () {
    var handle = null;
    var REASONS = { save: 'Saved', restore: 'Restored', duplicate: 'Copied' };
    function open() {
      needDoc().then(function (ok) {
        if (!ok) return;
        var box = el('div', { className: 'bdm-versions' }, [el('div', { className: 'bdm-loading' }, [el('span', { className: 'bdm-spinner', 'aria-hidden': 'true' }), el('span', { text: 'Loading versions…' })])]);
        handle = modal.open({ title: 'Version history', icon: 'history', variant: 'drawer', body: box, describe: false, onClose: function () { handle = null; } });
        api('GET', API + '/documents/' + encodeURIComponent(state.meta.documentId) + '/versions').then(function (res) {
          clear(box);
          if (!res.ok) {
            if (res.status === 401) { handle.close(); persist.degrade('signedout'); return; }
            append(box, el('div', { className: 'bdm-empty bdm-empty--sm' }, [el('p', { text: 'Versions could not be loaded.' }), btn('Try again', { kind: 'soft', onClick: function () { handle.close(); open(); } })]));
            return;
          }
          var rows = Array.isArray(res.data) ? res.data : (res.data && (res.data.versions || res.data.items)) || [];
          if (!rows.length) {
            append(box, el('div', { className: 'bdm-empty bdm-empty--sm' }, [icon('history', 26), el('p', { text: 'No earlier versions yet. A version is kept each time your changes are saved (the last 20).' })]));
            return;
          }
          append(box, el('p', { className: 'bdm-hint', text: 'The last 20 saved versions. Preview one, then restore it if you need it back.' }));
          var list = el('ul', { className: 'bdm-vlist' });
          rows.forEach(function (v) {
            var n = v.version;
            var current = n === state.meta.version;
            list.appendChild(el('li', { className: 'bdm-vlist__row' + (current ? ' is-current' : '') }, [
              el('div', { className: 'bdm-vlist__meta' }, [
                el('p', { className: 'bdm-vlist__title', text: 'Version ' + n + (current ? ' (current)' : '') }),
                el('p', { className: 'bdm-muted', text: [niceDate(v.createdAt || v.updatedAt, true), REASONS[v.reason] || ''].filter(Boolean).join(' · ') }),
              ]),
              current ? null : el('div', { className: 'bdm-vlist__actions' }, [
                btn('Preview', { kind: 'ghost', size: 'sm', icon: 'eye', onClick: function () { previewVersion(n); } }),
                btn('Restore', { kind: 'soft', size: 'sm', icon: 'history', onClick: function () { restore(n); } }),
              ]),
            ]));
          });
          box.appendChild(list);
        });
      });
    }
    function previewVersion(n) {
      api('GET', API + '/documents/' + encodeURIComponent(state.meta.documentId) + '/versions/' + n).then(function (res) {
        if (!res.ok) { toast('That version could not be loaded', 'error'); return; }
        var v = res.data || {};
        if (handle) handle.close();
        preview.setOverride({ doc: { templateId: pickTemplate(v.templateId), design: v.design || {}, data: normalizeData(v.data) }, photoUrl: photo.src() });
        notices.set('version', {
          kind: 'info', title: 'Previewing version ' + n, text: 'This is read-only. Your current biodata has not changed.', dismissible: false,
          actions: [
            { label: 'Back to current', kind: 'ghost', onClick: endPreview },
            { label: 'Restore this version', kind: 'primary', onClick: function () { restore(n); } },
          ],
        });
        if (!MQ_DESKTOP.matches) layout.setTab('preview', true);
      });
    }
    function endPreview() {
      notices.hide('version');
      preview.setOverride(null);
    }
    function restore(n) {
      modal.confirm({ title: 'Restore version ' + n + '?', message: 'Your current biodata is replaced by this version. The current one stays in the history, so you can switch back.', confirmLabel: 'Restore', icon: 'history' }).then(function (ok) {
        if (!ok) return;
        persist.flush().then(function () {
          return api('POST', API + '/documents/' + encodeURIComponent(state.meta.documentId) + '/versions/' + n + '/restore');
        }).then(function (res) {
          if (!res.ok) { if (res.status === 401) persist.degrade('signedout'); else toast('The version could not be restored', 'error'); return; }
          endPreview();
          if (handle) handle.close();
          persist.applyServerDoc(res.data);
          var doc = res.data || {};
          store.replaceDoc({ title: doc.title || '', templateId: pickTemplate(doc.templateId), design: doc.design || {}, data: normalizeData(doc.data) }, { silent: true });
          persist.markSaved();
          persist.writeLocal();
          setStatus('saved', 'Restored · ' + hhmm(Date.now()));
          toast('Version ' + n + ' restored');
        });
      });
    }
    return { open: open };
  })();

  function duplicateDoc() {
    needDoc().then(function (ok) {
      if (!ok) return;
      var m = modal.open({ title: 'Duplicating…', icon: 'copy', size: 'sm', dismissible: false, body: el('div', { className: 'bdm-loading' }, [el('span', { className: 'bdm-spinner', 'aria-hidden': 'true' }), el('span', { text: 'Making a copy of this biodata.' })]) });
      api('POST', API + '/documents/' + encodeURIComponent(state.meta.documentId) + '/duplicate').then(function (res) {
        if (res.ok && res.data && res.data._id) {
          w.location.href = '/biodata-maker/create?doc=' + encodeURIComponent(res.data._id);
          return;
        }
        m.close();
        if (res.code === 'LIMIT_REACHED') {
          modal.open({ title: 'You have reached your biodata limit', icon: 'folder', size: 'sm', body: 'Delete a biodata you no longer need, then try again.', actions: [{ label: 'Close', kind: 'ghost' }, { label: 'Open My biodatas', kind: 'primary', href: '/biodata-maker/my' }] });
        } else if (res.status === 401) persist.degrade('signedout');
        else toast('The biodata could not be duplicated', 'error');
      });
    });
  }

  // ---------------------------------------------------------------- sample / reset
  function loadSample() {
    var apply = function () {
      var g = state.doc.data.personal && state.doc.data.personal.gender;
      var sample = safe(function () { return K.sampleData(g || undefined); }, null);
      if (!sample) { toast('Sample data is not available', 'error'); return; }
      store.replaceDoc(Object.assign({}, state.doc, { data: normalizeData(sample) }));
      notices.set('sample', { kind: 'info', title: 'Sample details loaded', text: 'These are fictional. Replace them with your own, or press Undo to go back.', actions: [{ label: 'Undo', kind: 'ghost', onClick: function () { store.undo(); notices.hide('sample'); } }] });
      toast('Sample loaded');
    };
    if (!hasContent(state.doc.data)) { apply(); return; }
    modal.confirm({ title: 'Replace your details with the sample?', message: 'Every step is filled with a fictional example. You can undo this straight after.', confirmLabel: 'Load sample', icon: 'star' }).then(function (ok) { if (ok) apply(); });
  }
  function resetAll() {
    modal.confirm({ title: 'Start over?', message: 'All details, the title and design choices are cleared. Your photo is kept; remove it from the Photo step if you want. You can undo this straight after.', confirmLabel: 'Clear everything', danger: true }).then(function (ok) {
      if (!ok) return;
      state.ui.touched = {};
      state.ui.warned = {};
      store.replaceDoc({ title: '', templateId: state.doc.templateId, design: {}, data: freshData(state.doc.templateId) });
      notices.hide('sample');
      stepper.go(0, { focusPanel: true });
      toast('Biodata cleared');
    });
  }

  // ---------------------------------------------------------------- keyboard shortcuts
  d.addEventListener('keydown', function (ev) {
    if (modalStack.length) return;
    var mod = ev.ctrlKey || ev.metaKey;
    if (!mod) return;
    var k = String(ev.key).toLowerCase();
    if (k === 's') { ev.preventDefault(); persist.flush(); return; }
    if (isTextTarget(ev.target)) return;
    if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); store.undo(); }
    else if ((k === 'z' && ev.shiftKey) || k === 'y') { ev.preventDefault(); store.redo(); }
  });

  // ---------------------------------------------------------------- wiring
  store.subscribe(function (path, opts) {
    var root = path[0];
    if (root === 'doc' || root === 'photo') preview.schedule();
    if (root === 'doc') {
      if (!opts.silent) persist.changed();
      if (opts.external || opts.rerender) forms.render({ focus: opts.focus });
      else forms.sync();
      if (opts.external || opts.rerender) sections.refreshDrawer();
      refreshSoon();
      toolbar.refresh();
    } else if (root === 'photo') {
      if (!opts.silent) persist.changedLocal();
      stepper.refresh();
    }
  });

  var refreshTimer = null;
  function refreshSoon() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { stepper.refresh(); }, 250);
  }

  // ---------------------------------------------------------------- boot
  function startState() {
    var local = persist.readLocal();
    var doc = BOOT.document;
    var urlTemplate = safe(function () { return new URL(w.location.href).searchParams.get('template'); }, null);
    if (BOOT.user && doc && doc._id) {
      persist.applyServerDoc(doc);
      loadServerDoc(doc);
      var serverAt = Date.parse(doc.updatedAt || '') || 0;
      if (local && String(local.documentId) === String(doc._id) && local.savedAt > serverAt + 2000 && JSON.stringify(local.data) !== JSON.stringify(state.doc.data)) {
        return ask('You have newer unsaved changes on this device', 'Changes to "' + (local.title || doc.title || 'this biodata') + '" from ' + niceDate(local.savedAt, true) + ' were not saved to your account.', 'Use device changes', 'Keep saved version').then(function (use) {
          if (use) { applyLocal(local, null); persist.changed(); }
        });
      }
      setStatus('saved', 'Saved · ' + hhmm(serverAt || Date.now()));
      return Promise.resolve();
    }
    if (BOOT.user && local && local.documentId && String(local.userId) === String(BOOT.user.id)) {
      return ask('Continue where you left off?', 'You were editing "' + (local.title || (local.data.personal && local.data.personal.fullName) || 'a biodata') + '" (' + niceDate(local.savedAt, true) + ').', 'Open it', 'Start a new biodata').then(function (use) {
        if (use) { w.location.href = '/biodata-maker/create?doc=' + encodeURIComponent(local.documentId); return new Promise(function () {}); }
        persist.clearLocal();
        return undefined;
      });
    }
    var usable = local && !local.documentId && (!local.userId || (BOOT.user && String(local.userId) === String(BOOT.user.id)));
    if (usable && (hasContent(local.data) || (local.photo && local.photo.dataUrl))) {
      return ask('Continue where you left off?', 'We found a biodata draft saved in this browser on ' + niceDate(local.savedAt, true) + (local.data.personal && local.data.personal.fullName ? ' for ' + local.data.personal.fullName : '') + '.', 'Continue', 'Start fresh').then(function (use) {
        if (use) {
          applyLocal(local, urlTemplate);
          if (persist.isRemote()) persist.changed();
          else setStatus('local', 'Saved on this device · ' + hhmm(local.savedAt));
        } else persist.clearLocal();
      });
    }
    setStatus(persist.isRemote() ? 'idle' : 'idle', persist.isRemote() ? 'Saves automatically' : 'Saves in this browser');
    return Promise.resolve();
  }
  function applyLocal(local, templateOverride) {
    var next = {
      title: local.title || '',
      templateId: pickTemplate(templateOverride || local.templateId),
      design: templateOverride && templateOverride !== local.templateId ? cleanDesignFor(local.design || {}, pickTemplate(templateOverride)) : (local.design || {}),
      data: normalizeData(local.data),
    };
    if (local.photo && local.photo.dataUrl && /^data:image\/(jpeg|png|webp);base64,/.test(local.photo.dataUrl)) {
      state.photo = Object.assign({}, state.photo, { dataUrl: local.photo.dataUrl, url: state.photo.url });
      if (persist.isRemote() && !state.photo.url) {
        var blob = safe(function () {
          var m = /^data:([^;]+);base64,(.*)$/.exec(local.photo.dataUrl);
          var bin = atob(m[2]); var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
          return new Blob([arr], { type: m[1] });
        }, null);
        state.photo.pendingUpload = blob;
      }
    }
    store.replaceDoc(next, { noHistory: true, silent: true });
  }
  function ask(title, message, yes, no) {
    return new Promise(function (resolve) {
      modal.open({
        title: title, icon: 'history', size: 'sm', body: message, dismissible: false,
        actions: [{ label: no, kind: 'ghost', value: false }, { label: yes, kind: 'primary', value: true, autofocus: true }],
        onClose: function (r) { resolve(r === true); },
      });
    });
  }

  function start() {
    app.classList.remove('is-loading');
    clear(d.getElementById('bdm-panel'));
    if (BOOT.config && BOOT.config.enabled === false) {
      notices.set('disabled', { kind: 'warn', title: 'The biodata maker is paused', text: 'You can keep editing and print your biodata; downloads and saving to your account are unavailable for now.', dismissible: false });
    }
    var guestSeen = safe(function () { return w.localStorage.getItem('bm:biodata:guest-note') === '1'; }, false);
    if (!BOOT.user && !guestSeen) {
      notices.set('guest', {
        onDismiss: function () { safe(function () { w.localStorage.setItem('bm:biodata:guest-note', '1'); }); },
        kind: 'info', title: 'Free, no account needed',
        text: 'Your biodata is saved in this browser as you type. Log in to keep it in your account, make several biodatas and share private links.',
        actions: [{ label: 'Log in', href: BOOT.loginUrl || '/login?returnTo=/biodata-maker/create' }],
      });
    }
    stepper.build();
    toolbar.init();
    preview.init();
    layout.init();
    forms.render();
    stepper.refresh();
    startState().then(function () {
      forms.render();
      stepper.refresh();
      toolbar.refresh();
      preview.render();
      if (state.photo.pendingUpload && persist.isRemote()) photo.uploadPending();
    });
  }

  start();
})(window, document);
