'use strict';
/**
 * services/biodataService.js — rules shared by the biodata controllers.
 *
 *   settings()                       biodata.* settings with defaults applied
 *   readPayload(body, {partial, languages})
 *                                    {error:{status,code,message}} | {fields:{title?,templateId?,design?,data?}}
 *                                    validated with the kit (K.schema.clean / cleanDesign)
 *   stripTags(value)                 deep: removes <tags> from every string (newlines kept)
 *   contentOf(doc) / sameContent(a,b) the versioned part (title, templateId, design, data)
 *   snapshot(doc, reason)            write a BiodataDocumentVersion and prune to VERSIONS_KEPT
 *   enforceCap(userId)               {ok, max, count}
 *   newShareToken()                  48 lowercase hex chars
 *   shareActive(doc, now)            token set and not expired
 *   shareUrl(token)                  https://www.banjaramatch.com/biodata-maker/s/<token>
 *   documentView(doc) / listRow(doc) API shapes (contract §2)
 *   renderHtml({...})                full standalone HTML (mode 'pdf'), fonts + photo embedded
 *   renderParts({...})               {css, body, fontFamilies} (mode 'preview', web font URLs)
 *   withoutContact(data, design)     the shared-view copy (contact section hidden + emptied)
 *   safeFilename(title)              ASCII-only "<title>-biodata.pdf"
 *   logError(where, err)             logs name/code and a short message, never payloads or tokens
 *
 * Photo files: services/biodataPhoto.js (re-exported as removePhoto/copyPhoto/photoPath).
 */
const crypto = require('crypto');
const { kit } = require('./biodataKit');
const registry = require('./biodataRegistry');
const fonts = require('./biodataFonts');
const photo = require('./biodataPhoto');
const { getSettings } = require('./settingsCache');
const BiodataDocumentVersion = require('../models/BiodataDocumentVersion');
const BiodataDocument = require('../models/BiodataDocument');

const { VERSIONS_KEPT } = BiodataDocumentVersion;
const SHARE_BASE = 'https://www.banjaramatch.com/biodata-maker/s/';
const SHARE_TOKEN_RE = /^[a-f0-9]{48}$/;
const SHARE_DAYS = [7, 30, 90];
const DEFAULT_TITLE = 'My biodata';
const SUPPORTED_LANGS = ['en', 'hi'];
const DAY = 24 * 3600 * 1000;

const DEFAULTS = Object.freeze({
  enabled: true,
  guestDownloads: true,
  maxPerUser: BiodataDocument.MAX_PER_USER,
  languages: ['en', 'hi'],
  shareDefaultDays: 30,
});

function clampInt(v, min, max, fallback) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

async function settings() {
  let b = {};
  try {
    const s = await getSettings();
    b = (s && s.biodata) || {};
  } catch (_) {
    b = {};
  }
  const langs = Array.isArray(b.languages) ? b.languages.filter((l) => SUPPORTED_LANGS.includes(l)) : DEFAULTS.languages.slice();
  if (!langs.includes('en')) langs.unshift('en');
  return {
    enabled: b.enabled !== false,
    guestDownloads: b.guestDownloads !== false,
    maxPerUser: clampInt(b.maxPerUser, 1, 50, DEFAULTS.maxPerUser),
    languages: langs,
    shareDefaultDays: clampInt(b.shareDefaultDays, 1, 365, DEFAULTS.shareDefaultDays),
  };
}

/* ---------------- validation ---------------- */

const TAG_RE = /<\/?[A-Za-z!][^>]*>/g;

function stripTags(value) {
  if (typeof value === 'string') return value.replace(TAG_RE, '');
  if (Array.isArray(value)) return value.map(stripTags);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = stripTags(value[k]);
    return out;
  }
  return value;
}

function cleanTitle(v) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') return null;
  const max = (kit().schema.LIMITS && kit().schema.LIMITS.titleMax) || BiodataDocument.TITLE_MAX;
  // eslint-disable-next-line no-control-regex
  let t = v.replace(TAG_RE, '').replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length > max) t = t.slice(0, max).trim();
  return t;
}

function fail(status, code, message) {
  return { error: { status, code, message } };
}

function firstError(errors, fallbackCode) {
  const e = errors[0] || {};
  const code = e.code === 'TOO_MANY_CUSTOM_FIELDS' || e.code === 'UNKNOWN_DESIGN_KEY' ? e.code : fallbackCode;
  const where = e.path ? `${e.path}: ` : '';
  return { code, message: `${where}${e.message || 'Invalid value'}`.slice(0, 200) };
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Validate {title, templateId, design, data}. With partial, absent keys stay
 * absent (PUT); otherwise templateId defaults to the kit default, data to
 * emptyData() and design to {}. `current` = the stored document (for a
 * partial design check against its template).
 */
function readPayload(body, { partial = false, current = null, languages = DEFAULTS.languages } = {}) {
  const K = kit();
  const b = isPlainObject(body) ? body : {};
  const fields = {};

  if (b.title !== undefined || !partial) {
    const t = cleanTitle(b.title);
    if (t === null) return fail(400, 'VALIDATION_ERROR', 'title must be text');
    fields.title = t || DEFAULT_TITLE;
  }

  let templateId = current ? current.templateId : undefined;
  if (b.templateId !== undefined || !partial) {
    const id = b.templateId === undefined || b.templateId === null || b.templateId === '' ? K.DEFAULT_TEMPLATE : b.templateId;
    if (typeof id !== 'string' || !registry.isKnown(id)) return fail(400, 'UNKNOWN_TEMPLATE', 'Unknown template');
    fields.templateId = id;
    templateId = id;
  }

  if (b.data !== undefined || !partial) {
    const raw = b.data === undefined || b.data === null ? K.schema.emptyData() : b.data;
    if (!isPlainObject(raw)) return fail(400, 'VALIDATION_ERROR', 'data must be an object');
    const { data, errors } = K.schema.clean(raw);
    // soft errors (phone/email format) keep the value so half-typed drafts still save
    const hard = (errors || []).filter((e) => !e.soft);
    if (hard.length) {
      const e = firstError(hard, 'VALIDATION_ERROR');
      return fail(400, e.code, e.message);
    }
    const out = stripTags(data);
    const max = (K.schema.LIMITS && K.schema.LIMITS.maxDataBytes) || 65536;
    if (Buffer.byteLength(JSON.stringify(out), 'utf8') > max) return fail(400, 'VALIDATION_ERROR', 'This biodata is too large');
    fields.data = out;
  }

  // A template switch re-checks the stored design against the new template.
  const recheck = partial && b.design === undefined && fields.templateId && current;
  if (b.design !== undefined || !partial || recheck) {
    const raw = recheck ? current.design : b.design;
    if (raw !== null && raw !== undefined && !isPlainObject(raw)) return fail(400, 'VALIDATION_ERROR', 'design must be an object');
    const { design, errors } = K.schema.cleanDesign(raw || {}, templateId || K.DEFAULT_TEMPLATE);
    if (errors && errors.length && !recheck) {
      const e = firstError(errors, 'VALIDATION_ERROR');
      return fail(400, e.code, e.message);
    }
    const d = stripTags(design || {});
    if (d.labelLanguage && d.labelLanguage !== 'en' && !languages.includes('hi')) d.labelLanguage = 'en';
    fields.design = d;
  }

  if (b.status !== undefined) {
    if (b.status !== 'draft' && b.status !== 'completed') return fail(400, 'VALIDATION_ERROR', 'status must be draft or completed');
    fields.status = b.status;
  }
  return { fields };
}

/* ---------------- versions ---------------- */

function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v === undefined ? null : v);
}

function contentOf(doc) {
  return { title: doc.title || '', templateId: doc.templateId || '', design: doc.design || {}, data: doc.data || {} };
}

function sameContent(a, b) {
  return stableStringify(contentOf(a)) === stableStringify(contentOf(b));
}

async function snapshot(doc, reason = 'save') {
  await BiodataDocumentVersion.create({
    document: doc._id,
    user: doc.user,
    version: doc.version,
    title: doc.title,
    templateId: doc.templateId,
    design: doc.design || {},
    data: doc.data || {},
    reason,
  });
  const stale = await BiodataDocumentVersion.find({ document: doc._id })
    .sort({ version: -1, _id: -1 })
    .skip(VERSIONS_KEPT)
    .select('_id')
    .lean();
  if (stale.length) await BiodataDocumentVersion.deleteMany({ _id: { $in: stale.map((r) => r._id) } });
}

async function enforceCap(userId) {
  const { maxPerUser } = await settings();
  const count = await BiodataDocument.countDocuments({ user: userId });
  return { ok: count < maxPerUser, max: maxPerUser, count };
}

/* ---------------- sharing ---------------- */

function newShareToken() {
  return crypto.randomBytes(24).toString('hex');
}

function shareActive(doc, now = new Date()) {
  return !!(doc && doc.shareToken && doc.shareExpiresAt && new Date(doc.shareExpiresAt).getTime() > now.getTime());
}

function shareUrl(token) {
  return `${SHARE_BASE}${token}`;
}

function expiryFor(days, now = new Date()) {
  return new Date(now.getTime() + days * DAY);
}

/* ---------------- views ---------------- */

function photoUrl(doc) {
  if (!doc || !doc.photo || !doc.photo.file) return null;
  return `/api/biodata/documents/${doc._id}/photo?v=${String(doc.photo.file).slice(0, 8)}`;
}

function documentView(doc) {
  const share = shareActive(doc)
    ? { token: doc.shareToken, url: shareUrl(doc.shareToken), expiresAt: doc.shareExpiresAt, views: doc.shareViews || 0 }
    : null;
  return {
    _id: doc._id,
    title: doc.title,
    templateId: doc.templateId,
    design: doc.design || {},
    data: doc.data || {},
    status: doc.status,
    version: doc.version,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastRenderedAt: doc.lastRenderedAt || null,
    photo: doc.photo && doc.photo.file ? { width: doc.photo.width || 0, height: doc.photo.height || 0, size: doc.photo.size || 0, url: photoUrl(doc) } : null,
    share,
  };
}

function listRow(doc) {
  const active = shareActive(doc);
  return {
    _id: doc._id,
    title: doc.title,
    templateId: doc.templateId,
    status: doc.status,
    version: doc.version,
    updatedAt: doc.updatedAt,
    hasPhoto: !!(doc.photo && doc.photo.file),
    shareActive: active,
    shareExpiresAt: active ? doc.shareExpiresAt : null,
  };
}

/* ---------------- rendering ---------------- */

/** Copy of data/design for a shared view: the contact section is hidden and emptied. */
function withoutContact(data, design) {
  const K = kit();
  const d = JSON.parse(JSON.stringify(data || {}));
  const g = JSON.parse(JSON.stringify(design || {}));
  if (g.shareContact === true) return { data: d, design: g };
  const empty = K.schema.emptyData();
  d.contact = empty.contact;
  if (d.custom && typeof d.custom === 'object') delete d.custom.contact;
  const hidden = Array.isArray(g.hiddenSections) ? g.hiddenSections.slice() : [];
  if (!hidden.includes('contact')) hidden.push('contact');
  g.hiddenSections = hidden;
  return { data: d, design: g };
}

function renderError(err) {
  if (err && err.code === 'UNKNOWN_TEMPLATE') return { status: 400, code: 'UNKNOWN_TEMPLATE', message: 'Unknown template' };
  return null;
}

/** Full standalone document for Chromium: fonts and photo as data: URIs. */
function renderHtml({ data, templateId, design, photoDataUri = null, now = new Date() }) {
  return kit().renderBiodataHtml({
    data,
    templateId,
    design,
    photoUrl: photoDataUri || undefined,
    mode: 'pdf',
    fontUrl: fonts.dataUrlFor,
    now,
  });
}

/** Parts for the web (shared view): fonts from the web's /fonts/biodata mount. */
function renderParts({ data, templateId, design, photoUrl: url = null, mode = 'preview', now = new Date() }) {
  return kit().renderBiodataParts({ data, templateId, design, photoUrl: url || undefined, mode, fontUrl: fonts.publicUrlFor, now });
}

// Generic titles ("Untitled biodata", "My biodata") fall back to the person's name.
const GENERIC_TITLE = /^\s*(untitled|my|new|marriage)?\s*biodata\s*(\(copy\))?\s*$/i;
function safeFilename(title, data) {
  const name = data && data.personal && data.personal.fullName;
  const raw = (!title || GENERIC_TITLE.test(String(title))) ? (name || '') : title;
  const base = String(raw || '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[^A-Za-z0-9 _-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '')
    .replace(/-?biodata$/i, '');
  return `${base || 'marriage'}-biodata.pdf`;
}

function pdfHeaders(res, { title, pages, data }) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${safeFilename(title, data)}"`,
    'X-Biodata-Pages': String(pages || 0),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Expose-Headers': 'X-Biodata-Pages, Content-Disposition',
  });
}

/* ---------------- logging ---------------- */

function logError(where, err) {
  const msg = String((err && err.message) || '')
    .replace(/[a-f0-9]{32,}/gi, '[hex]')
    .replace(/"[^"]*"/g, '"…"')
    .slice(0, 120);
  console.error(`[biodata] ${where} failed:`, (err && err.name) || 'Error', (err && err.code) || '', msg);
}

module.exports = {
  settings,
  readPayload,
  stripTags,
  cleanTitle,
  contentOf,
  sameContent,
  stableStringify,
  snapshot,
  enforceCap,
  newShareToken,
  shareActive,
  shareUrl,
  expiryFor,
  photoUrl,
  documentView,
  listRow,
  withoutContact,
  renderError,
  renderHtml,
  renderParts,
  safeFilename,
  pdfHeaders,
  logError,
  // photo helpers (services/biodataPhoto.js)
  removePhoto: photo.removePhoto,
  copyPhoto: photo.copyPhoto,
  photoPath: photo.photoPath,
  SHARE_TOKEN_RE,
  SHARE_DAYS,
  SUPPORTED_LANGS,
  DEFAULTS,
  DEFAULT_TITLE,
};
