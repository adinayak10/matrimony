/* global window */
// Formatters. Pure functions, no Intl (behaves the same in Node, Chromium and
// every builder browser). All return plain text; callers escape.
(function (K) {
  'use strict';

  var fmt = {};

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysIn(y, m) { return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }

  // 'YYYY-MM-DD' -> {y, m, d} or null (calendar-valid only).
  fmt.parseIsoDate = function parseIsoDate(iso) {
    if (typeof iso !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m) return null;
    var y = +m[1]; var mo = +m[2]; var d = +m[3];
    if (y < 1000 || mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return { y: y, m: mo, d: d };
  };

  // now: Date | 'YYYY-MM-DD' | undefined (today, local calendar).
  function today(now) {
    if (typeof now === 'string') {
      var p = fmt.parseIsoDate(now.slice(0, 10));
      if (p) return p;
    }
    var dt = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
  }
  fmt.today = today;

  // Completed calendar years. A 29 Feb birthday counts from 1 Mar in common
  // years. Invalid or future dates give null.
  fmt.computeAge = function computeAge(dobIso, now) {
    var b = fmt.parseIsoDate(dobIso);
    if (!b) return null;
    var t = today(now);
    if (b.y > t.y || (b.y === t.y && (b.m > t.m || (b.m === t.m && b.d > t.d)))) return null;
    var age = t.y - b.y;
    if (t.m < b.m || (t.m === b.m && t.d < b.d)) age -= 1;
    return age;
  };

  // { value: number|null, source: 'override'|'dob'|null }. Override wins when 1..100.
  fmt.displayAge = function displayAge(data, now) {
    var p = (data && data.personal) || {};
    var o = parseInt(p.ageOverride, 10);
    if (String(p.ageOverride || '').trim() !== '' && o >= 1 && o <= 100) return { value: o, source: 'override' };
    var a = fmt.computeAge(p.dob, now);
    if (a === null || a < 0 || a > 120) return { value: null, source: null };
    return { value: a, source: 'dob' };
  };

  // style 'long' (14 March 1996) | 'short' (14 Mar 1996) | 'numeric' (14/03/1996)
  fmt.formatDate = function formatDate(iso, opts) {
    var p = fmt.parseIsoDate(iso);
    if (!p) return '';
    var lang = (opts && opts.lang) === 'hi' ? 'hi' : 'en';
    var style = (opts && opts.style) || 'long';
    if (style === 'numeric') return pad2(p.d) + '/' + pad2(p.m) + '/' + p.y;
    var names = K.labels[lang][style === 'short' ? 'monthsShort' : 'months'];
    return p.d + ' ' + names[p.m - 1] + ' ' + p.y;
  };

  // 'HH:MM' (24 h) -> '6:45 AM' / '6:45 पूर्वाह्न'
  fmt.formatTime = function formatTime(hhmm, lang) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return '';
    var h = +m[1]; var mi = +m[2];
    if (h > 23 || mi > 59) return '';
    var l = lang === 'hi' ? 'hi' : 'en';
    var suffix = K.t(l, 'misc', h < 12 ? 'am' : 'pm');
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad2(mi) + ' ' + suffix;
  };

  fmt.cmToFtIn = function cmToFtIn(cm) {
    var n = Number(cm);
    if (!isFinite(n) || n <= 0) return null;
    var total = Math.round(n / 2.54);
    return { ft: Math.floor(total / 12), inch: total % 12 };
  };

  fmt.ftInToCm = function ftInToCm(ft, inch) {
    var f = Number(ft) || 0; var i = Number(inch) || 0;
    if (f < 0 || i < 0) return null;
    var total = f * 12 + i;
    if (total <= 0) return null;
    return Math.round(total * 2.54);
  };

  // mode 'both' -> 5' 7" (170 cm), 'ft' -> 5' 7", 'cm' -> 170 cm
  fmt.formatHeight = function formatHeight(cm, mode, lang) {
    var n = Math.round(Number(cm));
    if (!isFinite(n) || n <= 0 || String(cm).trim() === '') return '';
    var fi = fmt.cmToFtIn(n);
    var ftStr = fi.ft + "' " + fi.inch + '"';
    var cmStr = n + ' ' + K.t(lang === 'hi' ? 'hi' : 'en', 'misc', 'cm');
    if (mode === 'ft') return ftStr;
    if (mode === 'cm') return cmStr;
    return ftStr + ' (' + cmStr + ')';
  };

  // Digit grouping without Intl. Indian: 12,34,56,789. Western: 123,456,789.
  fmt.groupIndian = function groupIndian(n) {
    var s = String(Math.floor(Math.abs(Number(n) || 0)));
    if (s.length <= 3) return s;
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return rest + ',' + last3;
  };
  fmt.groupWestern = function groupWestern(n) {
    return String(Math.floor(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  function trimDecimals(x) {
    // up to 2 decimals, no trailing zeros: 12.50 -> 12.5, 3.00 -> 3
    var s = (Math.round(x * 100) / 100).toFixed(2);
    return s.replace(/\.?0+$/, '');
  }

  var SYMBOLS = { inr: '₹', usd: '$', gbp: '£', eur: '€', aed: 'AED ', cad: 'C$', aud: 'A$', sgd: 'S$' };

  // income: {amount, period, currency, text}. Amount wins; text is appended
  // as a qualifier when both are given; text alone is printed as is.
  fmt.formatIncome = function formatIncome(income, lang) {
    var inc = income || {};
    var l = lang === 'hi' ? 'hi' : 'en';
    var text = String(inc.text || '').trim();
    var raw = String(inc.amount === undefined || inc.amount === null ? '' : inc.amount).replace(/[,\s]/g, '');
    var amt = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
    if (!(amt > 0)) return text;
    var cur = SYMBOLS[inc.currency] ? inc.currency : 'inr';
    var sym = SYMBOLS[cur];
    var out;
    if (cur === 'inr') {
      if (amt >= 1e7) out = sym + trimDecimals(amt / 1e7) + ' ' + K.t(l, 'misc', 'crore');
      else if (amt >= 1e5) out = sym + trimDecimals(amt / 1e5) + ' ' + K.t(l, 'misc', 'lakh');
      else out = sym + fmt.groupIndian(amt);
    } else {
      out = sym + fmt.groupWestern(amt);
    }
    var period = inc.period === 'monthly' ? 'perMonth' : inc.period === 'annual' ? 'perAnnum' : '';
    if (period) out += ' ' + K.t(l, 'misc', period);
    if (text) out += ' · ' + text;
    return out;
  };

  // unit: 'years' | 'height' | any literal suffix. Missing ends read naturally.
  fmt.formatRange = function formatRange(min, max, unit, lang) {
    var l = lang === 'hi' ? 'hi' : 'en';
    var a = String(min === undefined || min === null ? '' : min).trim();
    var b = String(max === undefined || max === null ? '' : max).trim();
    if (a && b && Number(a) > Number(b)) { var tmp = a; a = b; b = tmp; }
    function one(v) {
      if (unit === 'height') return fmt.formatHeight(v, 'ft', l);
      return v;
    }
    var suffix = unit === 'years' ? ' ' + K.t(l, 'misc', 'years') : unit && unit !== 'height' ? ' ' + unit : '';
    if (a && b) {
      if (a === b) return one(a) + suffix;
      return one(a) + ' – ' + one(b) + suffix;
    }
    if (a) return K.t(l, 'misc', 'rangeMin').replace('{v}', one(a) + suffix);
    if (b) return K.t(l, 'misc', 'rangeMax').replace('{v}', one(b) + suffix);
    return '';
  };

  fmt.formatAge = function formatAge(n, lang) {
    if (n === null || n === undefined || n === '') return '';
    return n + ' ' + K.t(lang === 'hi' ? 'hi' : 'en', 'misc', 'years');
  };

  // Display text of a single schema field value (no escaping). field is a
  // K.schema.FIELDS entry (or item field); value is the cleaned value.
  // Arrays of strings are joined with ', '. Lists return '' (rendered by caller).
  fmt.fieldText = function fieldText(field, value, lang) {
    var l = lang === 'hi' ? 'hi' : 'en';
    if (value === undefined || value === null) return '';
    switch (field.type) {
      case 'select':
        return value ? K.t(l, 'values', (field.enumKey || field.key) + '.' + value) : '';
      case 'multiselect':
        if (!Array.isArray(value)) return '';
        return value.map(function (v) {
          var known = field.options && field.options.indexOf(v) >= 0;
          return known ? K.t(l, 'values', (field.enumKey || field.key) + '.' + v) : v;
        }).filter(Boolean).join(', ');
      case 'date':
        return fmt.formatDate(value, { lang: l, style: 'long' });
      case 'time':
        return fmt.formatTime(value, l);
      case 'height':
        return fmt.formatHeight(value, 'both', l);
      case 'number':
        if (value === '') return '';
        return field.unit ? value + ' ' + K.t(l, 'misc', field.unit) : String(value);
      case 'list':
        return '';
      default:
        return String(value);
    }
  };

  K.fmt = fmt;
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
