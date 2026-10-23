'use strict';
/**
 * controllers/admin/biodataAdminController.js — biodata maker admin
 * (docs/plans/02-biodata-maker.md Phase 2/4). Mounted under /api/admin/biodata.
 *
 *   GET    /stats                         counts only (admins never see member documents)
 *   GET    /templates                     registry x overrides, usage counts, categories
 *   PUT    /templates/:templateId         {isActive,isFeatured,order,displayName,description,category,tags,thumbnailUrl}
 *   POST   /templates/reorder             {templateIds}  order = position
 *   DELETE /templates/:templateId/overrides
 *   GET    /pages?kind&published
 *   POST   /pages
 *   GET    /pages/:id
 *   PUT    /pages/:id                     published slug frozen (409 SLUG_FROZEN), kind frozen
 *   DELETE /pages/:id                     landing undeletable (409 LANDING_PROTECTED)
 *   POST   /pages/:id/publish             {published}
 *
 * Every write is audited; template writes invalidate services/biodataRegistry;
 * page publish/unpublish/delete (and edits of a published page) trigger the
 * web's sitemap regeneration.
 */
const mongoose = require('mongoose');
const BiodataDocument = require('../../models/BiodataDocument');
const BiodataTemplateMeta = require('../../models/BiodataTemplateMeta');
const BiodataPage = require('../../models/BiodataPage');
const registry = require('../../services/biodataRegistry');
const pdf = require('../../services/biodataPdf');
const sitemapService = require('../../services/sitemapService');
const { record: audit } = require('../../services/auditLog');
const { sanitizeRich, sanitizeText, contentWords } = require('../../services/sanitize');

const LANDING_SLUG = 'biodata-maker';
const GUIDE_SLUG_RE = /^(marriage|banjara)-biodata-[a-z0-9-]{2,60}$/;
const CONTENT_FIELDS = ['h1', 'intro', 'contentBlocks', 'faqs'];
const { BLOCK_TYPES } = BiodataPage;

/* ---------------- helpers ---------------- */

function fail(res, status, code, message, field) {
  return res.status(status).json({ status: false, code, message, ...(field ? { field } : {}) });
}
/** r = a message, or {error, field} from a reader */
function invalid(res, r) {
  if (r && typeof r === 'object') return fail(res, 400, 'VALIDATION_ERROR', r.error, r.field);
  return fail(res, 400, 'VALIDATION_ERROR', r);
}
function notFound(res, what) {
  return fail(res, 404, 'NOT_FOUND', `${what} not found`);
}
function serverError(res, where, err) {
  console.error(`[admin biodata] ${where} failed:`, err && err.message);
  return res.status(500).json({ status: false, code: 'SERVER_ERROR', message: 'Server error' });
}
function onePage(rows) {
  return { total: rows.length, page: 1, limit: rows.length, pages: rows.length ? 1 : 0 };
}
function bool(v) {
  if (v === true || v === 'true' || v === 1 || v === '1') return true;
  if (v === false || v === 'false' || v === 0 || v === '0') return false;
  return undefined;
}
function sitemap() {
  // property access (not destructured) so tests can observe the call
  Promise.resolve()
    .then(() => sitemapService.triggerSitemapRegeneration())
    .catch(() => {});
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&nbsp;': ' ' };

/**
 * Plain text: tags removed (sanitizeText), then the entities sanitize-html
 * adds are decoded again so "A & B" is stored as typed (every consumer escapes
 * on output; an entity copy would show as "&amp;"). Control chars dropped.
 */
function plain(v, max) {
  if (v === undefined || v === null || typeof v === 'object') return '';
  let s = sanitizeText(String(v)) || '';
  s = s.replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (m) => ENTITIES[m] || m);
  // eslint-disable-next-line no-control-regex
  s = s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return max && s.length > max ? s.slice(0, max).trim() : s;
}

function rich(v, max) {
  if (v === undefined || v === null || typeof v !== 'string') return '';
  const s = (sanitizeRich(v) || '').trim();
  return max && s.length > max ? null : s;
}

/** Same-site links only: "/path", no protocol-relative, no backslashes. */
const INTERNAL_HREF_RE = /^\/(?![/\\])[A-Za-z0-9\-._~/?#=&%+:@!$'()*,;]*$/;
function internalHref(v) {
  if (v === undefined || v === null || v === '') return '';
  const s = String(v).trim();
  if (s.length > 300 || !INTERNAL_HREF_RE.test(s)) return null;
  return s;
}

const OWN_IMAGE_RE = /^(https:\/\/www\.banjaramatch\.com)?\/images\/[A-Za-z0-9/_.-]+\.(webp|png|jpe?g)$/;
const CANONICAL_RE = /^(https:\/\/www\.banjaramatch\.com)?\/[a-z0-9\-/]*$/;

/* ---------------- stats ---------------- */

exports.stats = async (req, res) => {
  try {
    const now = new Date();
    const days = (n) => new Date(now.getTime() - n * 24 * 3600 * 1000);
    const [documents, users, withPhoto, sharedActive, last7, last30, byTemplate, pagesTotal, pagesPublished] = await Promise.all([
      BiodataDocument.estimatedDocumentCount(),
      BiodataDocument.distinct('user').then((r) => r.length),
      BiodataDocument.countDocuments({ 'photo.file': { $type: 'string' } }),
      BiodataDocument.countDocuments({ shareToken: { $type: 'string' }, shareExpiresAt: { $gt: now } }),
      BiodataDocument.countDocuments({ createdAt: { $gte: days(7) } }),
      BiodataDocument.countDocuments({ createdAt: { $gte: days(30) } }),
      BiodataDocument.aggregate([{ $group: { _id: '$templateId', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      BiodataPage.countDocuments(),
      BiodataPage.countDocuments({ isPublished: true }),
    ]);
    const templates = await registry.listAdmin();
    return res.json({
      status: true,
      data: {
        documents: { total: documents, last30Days: last30, last7Days: last7, users, withPhoto },
        shares: { active: sharedActive },
        templates: { active: templates.filter((t) => t.isActive).length, total: templates.length },
        pages: { published: pagesPublished, total: pagesTotal },
        byTemplate: byTemplate.map((r) => ({ templateId: r._id, count: r.count })),
        pdf: pdf.status(),
      },
    });
  } catch (err) {
    return serverError(res, 'stats', err);
  }
};

/* ---------------- templates ---------------- */

/**
 * Admin row: the RAW stored overrides flat ('' / [] when unset, never merged
 * values), the kit defaults under registry{}, plus state and usage.
 */
function adminTemplateRow(r, usage) {
  const o = r.overrides || {};
  return {
    templateId: r.templateId,
    slug: r.slug,
    culture: r.culture,
    archetype: r.archetype,
    categories: r.categories,
    isActive: r.isActive,
    isFeatured: r.isFeatured,
    order: r.order,
    usageCount: usage ? usage.get(r.templateId) || 0 : 0,
    hasOverrides: !!r.hasOverrides,
    displayName: o.displayName || '',
    description: o.description || '',
    category: o.category || '',
    tags: Array.isArray(o.tags) ? o.tags : [],
    thumbnailUrl: o.thumbnailUrl || '',
    registry: r.registry,
    updatedAt: o.updatedAt || null,
  };
}

async function adminTemplate(id) {
  const [rows, usage] = await Promise.all([registry.listAdmin(), usageCounts()]);
  const row = rows.find((x) => x.templateId === id);
  return row ? adminTemplateRow(row, usage) : null;
}

async function usageCounts() {
  const rows = await BiodataDocument.aggregate([{ $group: { _id: '$templateId', count: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id, r.count]));
}

exports.listTemplates = async (req, res) => {
  try {
    const [rows, usage] = await Promise.all([registry.listAdmin(), usageCounts()]);
    const data = rows.map((r) => adminTemplateRow(r, usage));
    return res.json({ status: true, data, categories: registry.categories(rows), pagination: onePage(data) });
  } catch (err) {
    return serverError(res, 'templates list', err);
  }
};

function readTemplateMeta(b) {
  const fields = {};
  if (b.isActive !== undefined) {
    const v = bool(b.isActive);
    if (v === undefined) return { error: 'isActive must be true or false', field: 'isActive' };
    fields.isActive = v;
  }
  if (b.isFeatured !== undefined) {
    const v = bool(b.isFeatured);
    if (v === undefined) return { error: 'isFeatured must be true or false', field: 'isFeatured' };
    fields.isFeatured = v;
  }
  if (b.order !== undefined) {
    if (b.order === null || b.order === '') fields.order = null;
    else {
      const n = parseInt(b.order, 10);
      if (!Number.isFinite(n) || n < 0 || n > 100000) return { error: 'order must be a number from 0 to 100000', field: 'order' };
      fields.order = n;
    }
  }
  if (b.displayName !== undefined) {
    const v = plain(b.displayName, 81);
    if (v.length > 80) return { error: 'displayName must be at most 80 characters', field: 'displayName' };
    fields.displayName = v;
  }
  if (b.description !== undefined) {
    const v = plain(b.description, 501);
    if (v.length > 500) return { error: 'description must be at most 500 characters', field: 'description' };
    fields.description = v;
  }
  if (b.category !== undefined) {
    const v = plain(b.category, 40);
    if (v && !registry.categorySlugs().includes(v)) return { error: 'category must be one of the template categories', field: 'category' };
    fields.category = v;
  }
  if (b.tags !== undefined) {
    const list = Array.isArray(b.tags) ? b.tags : typeof b.tags === 'string' ? b.tags.split(',') : null;
    if (!list) return { error: 'tags must be a list', field: 'tags' };
    const tags = [];
    for (const t of list) {
      const v = plain(t, 40).toLowerCase();
      if (v && !tags.includes(v)) tags.push(v);
    }
    if (tags.length > 10) return { error: 'at most 10 tags', field: 'tags' };
    fields.tags = tags;
  }
  if (b.thumbnailUrl !== undefined) {
    const v = String(b.thumbnailUrl || '').trim();
    if (v && !OWN_IMAGE_RE.test(v)) return { error: 'thumbnailUrl must be an image under /images/ on this site', field: 'thumbnailUrl' };
    fields.thumbnailUrl = v;
  }
  return { fields };
}

exports.updateTemplate = async (req, res) => {
  try {
    const id = String(req.params.templateId || '');
    if (!registry.isKnown(id)) return notFound(res, 'Template');
    const r = readTemplateMeta(req.body || {});
    if (r.error) return invalid(res, r);
    if (!Object.keys(r.fields).length) return invalid(res, 'Nothing to update');
    const before = await BiodataTemplateMeta.findOne({ templateId: id }).lean();
    await BiodataTemplateMeta.updateOne(
      { templateId: id },
      { $set: { ...r.fields, updatedBy: req.userId }, $setOnInsert: { templateId: id } },
      { upsert: true, runValidators: true }
    );
    registry.invalidate();
    audit(req, 'biodataTemplate.update', { type: 'biodataTemplate', id }, { before: before ? pick(before, Object.keys(r.fields)) : null, after: r.fields });
    return res.json({ status: true, data: await adminTemplate(id) });
  } catch (err) {
    return serverError(res, 'template update', err);
  }
};

function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

exports.reorderTemplates = async (req, res) => {
  try {
    const ids = (req.body || {}).templateIds;
    if (!Array.isArray(ids) || !ids.length || ids.length > 200) return invalid(res, 'templateIds must be a non-empty array');
    if (!ids.every((id) => typeof id === 'string' && registry.isKnown(id))) return invalid(res, 'templateIds must be known template ids');
    if (new Set(ids).size !== ids.length) return invalid(res, 'templateIds must not repeat');
    await BiodataTemplateMeta.bulkWrite(
      ids.map((id, i) => ({
        updateOne: { filter: { templateId: id }, update: { $set: { order: i, updatedBy: req.userId }, $setOnInsert: { templateId: id } }, upsert: true },
      }))
    );
    registry.invalidate();
    audit(req, 'biodataTemplate.reorder', { type: 'biodataTemplate', id: null }, { after: { templateIds: ids } });
    const rows = await registry.listAdmin();
    return res.json({ status: true, data: rows.map((r) => ({ templateId: r.templateId, order: r.order })) });
  } catch (err) {
    return serverError(res, 'template reorder', err);
  }
};

exports.resetTemplate = async (req, res) => {
  try {
    const id = String(req.params.templateId || '');
    if (!registry.isKnown(id)) return notFound(res, 'Template');
    const before = await BiodataTemplateMeta.findOneAndDelete({ templateId: id }).lean();
    registry.invalidate();
    audit(req, 'biodataTemplate.reset', { type: 'biodataTemplate', id }, { before: before || null });
    return res.json({ status: true, data: await adminTemplate(id) });
  } catch (err) {
    return serverError(res, 'template reset', err);
  }
};

/* ---------------- pages ---------------- */

function slugError(kind, slug) {
  if (kind === 'landing') return slug === LANDING_SLUG ? null : `the landing page slug is ${LANDING_SLUG}`;
  if (kind === 'guide') return GUIDE_SLUG_RE.test(slug) ? null : 'a guide slug must look like marriage-biodata-<words> or banjara-biodata-<words>';
  if (kind === 'category') return registry.categorySlugs().includes(slug) ? null : `a category page slug must be one of: ${registry.categorySlugs().join(', ')}`;
  return 'unknown kind';
}

function readBlock(raw, i) {
  if (!raw || typeof raw !== 'object') return { error: `contentBlocks[${i}] must be an object`, field: 'contentBlocks' };
  if (!BLOCK_TYPES.includes(raw.type)) return { error: `contentBlocks[${i}].type must be one of ${BLOCK_TYPES.join(', ')}`, field: 'contentBlocks' };
  const block = { type: raw.type, heading: plain(raw.heading, 150), html: '', items: [], rows: [], ctaLabel: '', ctaHref: '' };
  if (raw.html !== undefined) {
    const h = rich(raw.html, 20000);
    if (h === null) return { error: `contentBlocks[${i}].html is too long`, field: 'contentBlocks' };
    block.html = h;
  }
  if (raw.items !== undefined) {
    if (!Array.isArray(raw.items) || raw.items.length > 30) return { error: `contentBlocks[${i}].items must be a list of at most 30`, field: 'contentBlocks' };
    block.items = raw.items.map((x) => plain(x, 500)).filter(Boolean);
  }
  if (raw.rows !== undefined) {
    if (!Array.isArray(raw.rows) || raw.rows.length > 40) return { error: `contentBlocks[${i}].rows must be a list of at most 40`, field: 'contentBlocks' };
    const rows = [];
    for (const row of raw.rows) {
      if (!Array.isArray(row) || row.length > 6) return { error: `contentBlocks[${i}].rows must hold rows of at most 6 cells`, field: 'contentBlocks' };
      rows.push(row.map((c) => plain(c, 300)));
    }
    block.rows = rows;
  }
  if (raw.ctaLabel !== undefined) block.ctaLabel = plain(raw.ctaLabel, 60);
  if (raw.ctaHref !== undefined) {
    const href = internalHref(raw.ctaHref);
    if (href === null) return { error: `contentBlocks[${i}].ctaHref must be a link on this site (starting with /)`, field: 'contentBlocks' };
    block.ctaHref = href;
  }
  return { block };
}

/**
 * Validate a page body. partial = PUT (absent keys untouched). Returns
 * {fields} or {error}. kind/slug rules are checked by the callers (they need the stored page).
 */
function readPage(b, { partial = false } = {}) {
  const f = {};
  const has = (k) => b[k] !== undefined || !partial;

  if (b.kind !== undefined || !partial) {
    if (!['landing', 'guide', 'category'].includes(b.kind)) return { error: 'kind must be landing, guide or category', field: 'kind' };
    f.kind = b.kind;
  }
  if (b.slug !== undefined || !partial) {
    const slug = String(b.slug || '').trim().toLowerCase();
    if (!slug) return { error: 'slug is required', field: 'slug' };
    f.slug = slug;
  }
  if (has('metaTitle')) {
    const v = plain(b.metaTitle, 71);
    if (v.length > 70) return { error: 'metaTitle must be at most 70 characters', field: 'metaTitle' };
    f.metaTitle = v;
  }
  if (has('metaDescription')) {
    const v = plain(b.metaDescription, 171);
    if (v.length > 170) return { error: 'metaDescription must be at most 170 characters', field: 'metaDescription' };
    f.metaDescription = v;
  }
  if (has('canonicalOverride')) {
    const v = String(b.canonicalOverride || '').trim();
    if (v && (v.length > 300 || !CANONICAL_RE.test(v))) return { error: 'canonicalOverride must be a path or https://www.banjaramatch.com URL', field: 'canonicalOverride' };
    f.canonicalOverride = v;
  }
  if (has('ogImage')) {
    const v = String(b.ogImage || '').trim();
    if (v && !OWN_IMAGE_RE.test(v)) return { error: 'ogImage must be an image under /images/ on this site', field: 'ogImage' };
    f.ogImage = v;
  }
  if (has('h1')) f.h1 = plain(b.h1, 150);
  if (has('intro')) {
    const v = rich(b.intro, 20000);
    if (v === null) return { error: 'intro is too long', field: 'intro' };
    f.intro = v;
  }
  if (has('contentBlocks')) {
    const list = b.contentBlocks === undefined || b.contentBlocks === null ? [] : b.contentBlocks;
    if (!Array.isArray(list) || list.length > 20) return { error: 'contentBlocks must be a list of at most 20 blocks', field: 'contentBlocks' };
    const blocks = [];
    for (let i = 0; i < list.length; i++) {
      const r = readBlock(list[i], i);
      if (r.error) return r;
      blocks.push(r.block);
    }
    f.contentBlocks = blocks;
  }
  if (has('faqs')) {
    const list = b.faqs === undefined || b.faqs === null ? [] : b.faqs;
    if (!Array.isArray(list) || list.length > 15) return { error: 'faqs must be a list of at most 15', field: 'faqs' };
    const faqs = [];
    for (const q of list) {
      if (!q || typeof q !== 'object') return { error: 'each faq needs a question and an answer', field: 'faqs' };
      const question = plain(q.question, 300);
      const answer = plain(q.answer, 3000);
      if (!question || !answer) return { error: 'each faq needs a question and an answer', field: 'faqs' };
      faqs.push({ question, answer });
    }
    f.faqs = faqs;
  }
  if (has('ctaConfig')) {
    const c = b.ctaConfig && typeof b.ctaConfig === 'object' ? b.ctaConfig : {};
    const primaryHref = internalHref(c.primaryHref);
    const secondaryHref = internalHref(c.secondaryHref);
    if (primaryHref === null || secondaryHref === null) return { error: 'ctaConfig links must be links on this site (starting with /)', field: 'ctaConfig' };
    f.ctaConfig = {
      heading: plain(c.heading, 120),
      text: plain(c.text, 500),
      primaryLabel: plain(c.primaryLabel, 60),
      primaryHref,
      secondaryLabel: plain(c.secondaryLabel, 60),
      secondaryHref,
    };
  }
  if (has('relatedLinks')) {
    const list = b.relatedLinks === undefined || b.relatedLinks === null ? [] : b.relatedLinks;
    if (!Array.isArray(list) || list.length > 8) return { error: 'relatedLinks must be a list of at most 8', field: 'relatedLinks' };
    const links = [];
    for (const l of list) {
      const label = plain(l && l.label, 100);
      const href = internalHref(l && l.href);
      if (!label || !href) return { error: 'each related link needs a label and a link on this site (starting with /)', field: 'relatedLinks' };
      links.push({ label, href });
    }
    f.relatedLinks = links;
  }
  return { fields: f };
}

function wordsOf(page) {
  return contentWords(page, CONTENT_FIELDS);
}

function adminRow(p) {
  return {
    _id: p._id,
    slug: p.slug,
    kind: p.kind,
    metaTitle: p.metaTitle,
    h1: p.h1,
    isPublished: !!p.isPublished,
    publishedAt: p.publishedAt || null,
    contentWords: p.contentWords || 0,
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
  };
}

exports.listPages = async (req, res) => {
  try {
    const query = {};
    if (req.query.kind) {
      if (!['landing', 'guide', 'category'].includes(String(req.query.kind))) return res.json({ status: true, data: [], pagination: onePage([]) });
      query.kind = String(req.query.kind);
    }
    if (req.query.published !== undefined && req.query.published !== '') {
      const p = bool(req.query.published);
      if (p !== undefined) query.isPublished = p;
    }
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const [total, rows] = await Promise.all([
      BiodataPage.countDocuments(query),
      BiodataPage.find(query).sort({ kind: 1, slug: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    const data = rows.map(adminRow);
    return res.json({ status: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return serverError(res, 'pages list', err);
  }
};

exports.getPageById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, 'Page');
    const page = await BiodataPage.findById(req.params.id).lean();
    if (!page) return notFound(res, 'Page');
    return res.json({ status: true, data: page });
  } catch (err) {
    return serverError(res, 'page get', err);
  }
};

exports.createPage = async (req, res) => {
  try {
    const r = readPage(req.body || {}, { partial: false });
    if (r.error) return invalid(res, r);
    const se = slugError(r.fields.kind, r.fields.slug);
    if (se) return invalid(res, { error: se, field: 'slug' });
    if (await BiodataPage.exists({ slug: r.fields.slug })) return fail(res, 409, 'SLUG_TAKEN', 'A page with this slug already exists', 'slug');
    const fields = { ...r.fields, contentWords: wordsOf(r.fields), createdBy: req.userId, updatedBy: req.userId, isPublished: false, publishedAt: null };
    const doc = await BiodataPage.create(fields);
    audit(req, 'biodataPage.create', { type: 'biodataPage', id: doc._id }, { after: { slug: doc.slug, kind: doc.kind } });
    return res.status(201).json({ status: true, data: doc.toObject() });
  } catch (err) {
    if (err && err.code === 11000) return fail(res, 409, 'SLUG_TAKEN', 'A page with this slug already exists', 'slug');
    return serverError(res, 'page create', err);
  }
};

exports.updatePage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, 'Page');
    const page = await BiodataPage.findById(req.params.id);
    if (!page) return notFound(res, 'Page');
    const r = readPage(req.body || {}, { partial: true });
    if (r.error) return invalid(res, r);
    if (r.fields.kind !== undefined && r.fields.kind !== page.kind) return invalid(res, { error: 'kind cannot be changed', field: 'kind' });
    delete r.fields.kind;
    if (r.fields.slug !== undefined && r.fields.slug !== page.slug) {
      if (page.isPublished) return fail(res, 409, 'SLUG_FROZEN', 'A published page keeps its slug; unpublish it first', 'slug');
      const se = slugError(page.kind, r.fields.slug);
      if (se) return invalid(res, { error: se, field: 'slug' });
      if (await BiodataPage.exists({ slug: r.fields.slug, _id: { $ne: page._id } })) return fail(res, 409, 'SLUG_TAKEN', 'A page with this slug already exists', 'slug');
    } else delete r.fields.slug;

    const before = {};
    for (const k of Object.keys(r.fields)) before[k] = page[k];
    page.set(r.fields);
    page.contentWords = wordsOf(page.toObject());
    page.updatedBy = req.userId;
    await page.save();
    audit(req, 'biodataPage.update', { type: 'biodataPage', id: page._id }, { before: { slug: before.slug, fields: Object.keys(r.fields) }, after: { slug: page.slug, contentWords: page.contentWords } });
    if (page.isPublished) sitemap();
    return res.json({ status: true, data: page.toObject() });
  } catch (err) {
    if (err && err.code === 11000) return fail(res, 409, 'SLUG_TAKEN', 'A page with this slug already exists', 'slug');
    return serverError(res, 'page update', err);
  }
};

exports.deletePage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, 'Page');
    const page = await BiodataPage.findById(req.params.id).lean();
    if (!page) return notFound(res, 'Page');
    if (page.kind === 'landing') return fail(res, 409, 'LANDING_PROTECTED', 'The landing page cannot be deleted; edit or unpublish it instead');
    await BiodataPage.deleteOne({ _id: page._id });
    audit(req, 'biodataPage.delete', { type: 'biodataPage', id: page._id }, { before: { slug: page.slug, kind: page.kind, isPublished: page.isPublished } });
    sitemap();
    return res.json({ status: true, data: { _id: page._id, deleted: true } });
  } catch (err) {
    return serverError(res, 'page delete', err);
  }
};

exports.publishPage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, 'Page');
    const published = bool((req.body || {}).published);
    if (published === undefined) return invalid(res, { error: 'published must be true or false', field: 'published' });
    const page = await BiodataPage.findById(req.params.id);
    if (!page) return notFound(res, 'Page');
    const was = !!page.isPublished;
    page.isPublished = published;
    if (published && !page.publishedAt) page.publishedAt = new Date();
    page.contentWords = wordsOf(page.toObject());
    page.updatedBy = req.userId;
    await page.save();
    audit(req, published ? 'biodataPage.publish' : 'biodataPage.unpublish', { type: 'biodataPage', id: page._id }, { before: { isPublished: was }, after: { isPublished: published, slug: page.slug } });
    if (was !== published) sitemap();
    return res.json({ status: true, data: page.toObject() });
  } catch (err) {
    return serverError(res, 'page publish', err);
  }
};

// shared with tools/seedBiodataPages.js
exports.readPage = readPage;
exports.slugError = slugError;
exports.wordsOf = wordsOf;
exports.plain = plain;
exports.internalHref = internalHref;
exports.LANDING_SLUG = LANDING_SLUG;
exports.GUIDE_SLUG_RE = GUIDE_SLUG_RE;
exports.CONTENT_FIELDS = CONTENT_FIELDS;
