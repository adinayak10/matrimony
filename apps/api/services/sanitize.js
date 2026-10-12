'use strict';
/**
 * services/sanitize.js — sanitize-html on every CMS/blog write (D, Track A).
 *
 *   sanitizeRich(html)      rich text (blog content, regional CMS sections):
 *                           a conservative tag allowlist, http(s)/mailto links,
 *                           images only from our own hosts, no scripts/styles/
 *                           event handlers.
 *   sanitizeText(s)         strips every tag (names, titles, messages)
 *   sanitizeDeep(value)     walks an object/array: strings through
 *                           sanitizeRich, Dates/ObjectIds untouched.
 *   contentWords(page, fields) unique-word count of the CMS-authored fields
 *                           (D47 index rule: >= 300 unique words).
 */
const sanitizeHtml = require('sanitize-html');

const RICH_OPTIONS = {
  allowedTags: [
    'p', 'br', 'hr', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup', 'small', 'mark',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'div', 'span', 'section', 'article',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan', 'scope'],
    '*': ['id', 'class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attribs) => {
      const out = { ...attribs };
      if (out.target === '_blank') out.rel = 'noopener noreferrer';
      return { tagName, attribs: out };
    },
  },
};

const TEXT_OPTIONS = { allowedTags: [], allowedAttributes: {} };

function sanitizeRich(html) {
  if (html === null || html === undefined) return html;
  if (typeof html !== 'string') return html;
  return sanitizeHtml(html, RICH_OPTIONS);
}

function sanitizeText(s, max) {
  if (s === null || s === undefined) return s;
  if (typeof s !== 'string') return s;
  let out = sanitizeHtml(s, TEXT_OPTIONS).trim();
  if (max && out.length > max) out = out.slice(0, max);
  return out;
}

function isPassthrough(v) {
  return v instanceof Date || (v && typeof v === 'object' && v._bsontype) || Buffer.isBuffer(v);
}

function sanitizeDeep(value, fn = sanitizeRich) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return fn(value);
  if (isPassthrough(value)) return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeDeep(v, fn));
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = sanitizeDeep(value[k], fn);
    return out;
  }
  return value;
}

/** Collect every string under the given top-level fields of a page. */
function collectStrings(value, out) {
  if (value === null || value === undefined) return out;
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (isPassthrough(value)) return out;
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const k of Object.keys(value)) collectStrings(value[k], out);
  }
  return out;
}

const DEFAULT_CONTENT_FIELDS = [
  'introSection', 'aboutSection', 'localitiesSection', 'faqSection',
  'introContent', 'aboutContent', 'faqs', 'customContentBlocks',
  'communityInsights', 'cityDemographics', 'stateInfo', 'heritageSection',
];

function contentWords(page, fields = DEFAULT_CONTENT_FIELDS) {
  if (!page || typeof page !== 'object') return 0;
  const strings = [];
  for (const f of fields) if (page[f] !== undefined) collectStrings(page[f], strings);
  const words = new Set();
  for (const s of strings) {
    const text = sanitizeText(s) || '';
    for (const w of text.toLowerCase().split(/[^a-z0-9\u0900-\u097f]+/iu)) {
      if (w && w.length > 1 && !/^\$\{/.test(w)) words.add(w);
    }
  }
  return words.size;
}

module.exports = { sanitizeRich, sanitizeText, sanitizeDeep, contentWords, DEFAULT_CONTENT_FIELDS, RICH_OPTIONS };
