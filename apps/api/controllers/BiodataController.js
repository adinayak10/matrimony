'use strict';
/**
 * controllers/BiodataController.js — public, guest and owner endpoints of the
 * biodata maker (docs/plans/02-biodata-maker.md Phase 2, contract §2).
 * Mounted at /api/biodata by routes/biodataRoutes.js.
 *
 * Envelope {status:true, data} / {status:false, code, message}.
 * Owner routes always scope by {_id, user: req.userId}; anything else is 404.
 * Nothing here logs request bodies, biodata content or share tokens
 * (svc.logError keeps only the error name/code and a masked short message).
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const BiodataDocument = require('../models/BiodataDocument');
const BiodataDocumentVersion = require('../models/BiodataDocumentVersion');
const BiodataPage = require('../models/BiodataPage');
const svc = require('../services/biodataService');
const registry = require('../services/biodataRegistry');
const photo = require('../services/biodataPhoto');
const pdf = require('../services/biodataPdf');
const { MAX_PAYLOAD } = require('../middleware/biodataUpload');

const SHARED_404 = 'This biodata link is invalid or has expired';
const PAGE_SLUG_RE = /^[a-z0-9-]{2,80}$/;
const PAGE_KINDS = ['landing', 'guide', 'category'];

/* ---------------- helpers ---------------- */

function fail(res, status, code, message, extra) {
  return res.status(status).json({ status: false, code, message, ...(extra || {}) });
}

function notFound(res) {
  return fail(res, 404, 'NOT_FOUND', 'Biodata not found');
}

function serverError(res, where, err) {
  svc.logError(where, err);
  if (res.headersSent) return undefined;
  return fail(res, 500, 'SERVER_ERROR', 'Something went wrong, please try again');
}

function isPdfError(err) {
  return !!err && (err instanceof pdf.PdfError || err.code === 'PDF_UNAVAILABLE' || err.code === 'PDF_BUSY');
}

function pdfFail(res, err) {
  if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
  return fail(res, 503, err.code, err.message);
}

function sendPayloadError(res, error) {
  return fail(res, error.status, error.code, error.message);
}

function photoContentType(abs) {
  const ext = path.extname(abs).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function streamPhoto(res, abs, robots) {
  res.set({
    'Content-Type': photoContentType(abs),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': robots,
    'Content-Disposition': 'inline',
  });
  fs.createReadStream(abs)
    .on('error', () => {
      if (!res.headersSent) fail(res, 404, 'NOT_FOUND', 'Photo not found');
      else res.end();
    })
    .pipe(res);
}

async function photoDataUriOf(doc) {
  if (!doc.photo || !doc.photo.file) return null;
  const abs = photo.photoPath(doc.photo.file);
  if (!abs || !fs.existsSync(abs)) return null;
  return photo.toDataUri(abs);
}

async function renderAndSend(res, { title, templateId, design, data, photoDataUri }) {
  let html;
  try {
    html = svc.renderHtml({ data, templateId, design, photoDataUri });
  } catch (err) {
    const known = svc.renderError(err);
    if (known) return fail(res, known.status, known.code, known.message);
    throw err;
  }
  const { buffer, pages } = await pdf.renderPdf({ html });
  svc.pdfHeaders(res, { title, pages, data });
  return res.status(200).send(buffer);
}

/* ---------------- middleware ---------------- */

/** 503 FEATURE_DISABLED when biodata.enabled is false. Sets req.biodataSettings. */
async function requireEnabled(req, res, next) {
  try {
    const s = await svc.settings();
    req.biodataSettings = s;
    if (!s.enabled) return fail(res, 503, 'FEATURE_DISABLED', 'The biodata maker is switched off right now');
    return next();
  } catch (err) {
    return serverError(res, 'settings', err);
  }
}

/** Guests may download only while biodata.guestDownloads is on (runs before the upload). */
function guestGate(req, res, next) {
  if (!req.userId && req.biodataSettings && !req.biodataSettings.guestDownloads) {
    return fail(res, 403, 'GUEST_DOWNLOADS_OFF', 'Please log in to download your biodata');
  }
  return next();
}

/** Loads req.biodataDoc for the caller; any other id answers 404. */
async function loadOwned(req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return notFound(res);
    const doc = await BiodataDocument.findOne({ _id: id, user: req.userId }).lean();
    if (!doc) return notFound(res);
    req.biodataDoc = doc;
    return next();
  } catch (err) {
    return serverError(res, 'load document', err);
  }
}

/** Every shared response is noindex and uncached, including the 404s. */
function sharedHeaders(req, res, next) {
  res.set({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
  next();
}

async function loadShared(req, res, next) {
  try {
    const token = String(req.params.token || '');
    if (!svc.SHARE_TOKEN_RE.test(token)) return fail(res, 404, 'NOT_FOUND', SHARED_404);
    const doc = await BiodataDocument.findOne({ shareToken: token, shareExpiresAt: { $gt: new Date() } }).lean();
    if (!doc) return fail(res, 404, 'NOT_FOUND', SHARED_404);
    req.biodataDoc = doc;
    return next();
  } catch (err) {
    return serverError(res, 'load shared', err);
  }
}

/* ---------------- public ---------------- */

async function config(req, res) {
  try {
    const s = await svc.settings();
    res.set('Cache-Control', 'public, max-age=60');
    return res.json({
      status: true,
      data: {
        enabled: s.enabled,
        guestDownloads: s.guestDownloads,
        maxPerUser: s.maxPerUser,
        languages: s.languages,
        shareDefaultDays: s.shareDefaultDays,
        pdf: pdf.status(),
      },
    });
  } catch (err) {
    return serverError(res, 'config', err);
  }
}

async function templates(req, res) {
  try {
    const rows = await registry.listPublic();
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ status: true, data: rows, categories: registry.categories(rows) });
  } catch (err) {
    return serverError(res, 'templates', err);
  }
}

async function listPages(req, res) {
  try {
    const query = { isPublished: true };
    if (req.query.kind !== undefined) {
      if (!PAGE_KINDS.includes(String(req.query.kind))) return res.json({ status: true, data: [] });
      query.kind = String(req.query.kind);
    }
    const rows = await BiodataPage.find(query).select('slug kind metaTitle updatedAt contentWords').sort({ kind: 1, slug: 1 }).lean();
    res.set('Cache-Control', 'public, max-age=60');
    return res.json({
      status: true,
      data: rows.map((r) => ({ slug: r.slug, kind: r.kind, metaTitle: r.metaTitle, updatedAt: r.updatedAt, contentWords: r.contentWords || 0 })),
    });
  } catch (err) {
    return serverError(res, 'pages list', err);
  }
}

async function getPage(req, res) {
  try {
    const slug = String(req.params.slug || '');
    if (!PAGE_SLUG_RE.test(slug)) return fail(res, 404, 'NOT_FOUND', 'Page not found');
    const page = await BiodataPage.findOne({ slug, isPublished: true }).select('-createdBy -updatedBy -__v').lean();
    if (!page) return fail(res, 404, 'NOT_FOUND', 'Page not found');
    res.set('Cache-Control', 'public, max-age=60');
    return res.json({ status: true, data: page });
  } catch (err) {
    return serverError(res, 'page get', err);
  }
}

/* ---------------- guest render (nothing stored) ---------------- */

async function render(req, res) {
  const s = req.biodataSettings || (await svc.settings());
  const uploaded = req.file && req.file.path ? req.file.path : null;
  try {
    const raw = req.body ? req.body.payload : undefined;
    if (typeof raw !== 'string' || !raw.trim()) return fail(res, 400, 'VALIDATION_ERROR', 'payload is required');
    if (Buffer.byteLength(raw, 'utf8') > MAX_PAYLOAD) return fail(res, 413, 'PAYLOAD_TOO_LARGE', 'Biodata is too large');
    let body;
    try {
      body = JSON.parse(raw);
    } catch (_) {
      return fail(res, 400, 'VALIDATION_ERROR', 'payload must be JSON');
    }
    const r = svc.readPayload(body, { languages: s.languages });
    if (r.error) return sendPayloadError(res, r.error);
    if (!(await registry.isActive(r.fields.templateId))) return fail(res, 400, 'UNKNOWN_TEMPLATE', 'Unknown template');
    if (pdf.status() !== 'ready') throw new pdf.PdfError('PDF_UNAVAILABLE');

    let photoDataUri = null;
    if (req.file) {
      try {
        await photo.fromUpload(req.file);
      } catch (err) {
        if (err && err.code === 'INVALID_IMAGE') return fail(res, 400, 'INVALID_IMAGE', err.message);
        throw err;
      }
      photoDataUri = await photo.toDataUri(req.file.path);
      // nothing about a guest stays on disk while the PDF renders (finally is the backstop)
      await photo.unlinkQuiet(req.file.path);
    }
    return await renderAndSend(res, { ...r.fields, photoDataUri });
  } catch (err) {
    if (isPdfError(err)) return pdfFail(res, err);
    return serverError(res, 'render', err);
  } finally {
    await photo.unlinkQuiet(uploaded);
    if (req.file && req.file.path && req.file.path !== uploaded) await photo.unlinkQuiet(req.file.path);
  }
}

/* ---------------- owner documents ---------------- */

async function listDocuments(req, res) {
  try {
    const s = req.biodataSettings || (await svc.settings());
    const rows = await BiodataDocument.find({ user: req.userId }).select('-data -design').sort({ updatedAt: -1 }).limit(100).lean();
    return res.json({ status: true, data: rows.map(svc.listRow), max: s.maxPerUser });
  } catch (err) {
    return serverError(res, 'list', err);
  }
}

async function createDocument(req, res) {
  try {
    const s = req.biodataSettings || (await svc.settings());
    const cap = await svc.enforceCap(req.userId);
    if (!cap.ok) return fail(res, 409, 'LIMIT_REACHED', `You can keep up to ${cap.max} biodatas`, { max: cap.max });
    const r = svc.readPayload(req.body, { languages: s.languages });
    if (r.error) return sendPayloadError(res, r.error);
    if (!(await registry.isActive(r.fields.templateId))) return fail(res, 400, 'UNKNOWN_TEMPLATE', 'Unknown template');
    const doc = await BiodataDocument.create({ ...r.fields, user: req.userId, version: 1 });
    const lean = doc.toObject();
    await svc.snapshot(lean, 'save');
    return res.status(201).json({ status: true, data: svc.documentView(lean) });
  } catch (err) {
    return serverError(res, 'create', err);
  }
}

function getDocument(req, res) {
  return res.json({ status: true, data: svc.documentView(req.biodataDoc) });
}

async function conflict(res, doc) {
  const fresh = await BiodataDocument.findById(doc._id).select('version').lean();
  return fail(res, 409, 'VERSION_CONFLICT', 'This biodata was changed elsewhere; reload to continue', { version: fresh ? fresh.version : doc.version });
}

async function updateDocument(req, res) {
  try {
    const s = req.biodataSettings || (await svc.settings());
    const doc = req.biodataDoc;
    const b = req.body || {};
    if (b.ifVersion !== undefined && b.ifVersion !== null) {
      const v = Number(b.ifVersion);
      if (!Number.isInteger(v)) return fail(res, 400, 'VALIDATION_ERROR', 'ifVersion must be a number');
      if (v !== doc.version) return fail(res, 409, 'VERSION_CONFLICT', 'This biodata was changed elsewhere; reload to continue', { version: doc.version });
    }
    const r = svc.readPayload(b, { partial: true, current: doc, languages: s.languages });
    if (r.error) return sendPayloadError(res, r.error);
    if (r.fields.templateId && r.fields.templateId !== doc.templateId && !(await registry.isActive(r.fields.templateId))) {
      return fail(res, 400, 'UNKNOWN_TEMPLATE', 'Unknown template');
    }
    const next = { ...svc.contentOf(doc) };
    for (const k of ['title', 'templateId', 'design', 'data']) if (r.fields[k] !== undefined) next[k] = r.fields[k];
    const changed = !svc.sameContent(doc, next);
    const statusChanged = r.fields.status !== undefined && r.fields.status !== doc.status;
    if (!changed && !statusChanged) return res.json({ status: true, data: svc.documentView(doc) });

    const $set = {};
    if (changed) Object.assign($set, next);
    if (statusChanged) $set.status = r.fields.status;
    const update = changed ? { $set, $inc: { version: 1 } } : { $set };
    const updated = await BiodataDocument.findOneAndUpdate({ _id: doc._id, user: req.userId, version: doc.version }, update, { new: true }).lean();
    if (!updated) return conflict(res, doc);
    if (changed) await svc.snapshot(updated, 'save');
    return res.json({ status: true, data: svc.documentView(updated) });
  } catch (err) {
    return serverError(res, 'update', err);
  }
}

async function deleteDocument(req, res) {
  try {
    const doc = req.biodataDoc;
    const removed = await BiodataDocument.deleteOne({ _id: doc._id, user: req.userId });
    if (!removed.deletedCount) return notFound(res);
    await BiodataDocumentVersion.deleteMany({ document: doc._id });
    if (doc.photo && doc.photo.file) await svc.removePhoto(doc.photo.file);
    return res.json({ status: true, data: { _id: doc._id, deleted: true } });
  } catch (err) {
    return serverError(res, 'delete', err);
  }
}

async function duplicateDocument(req, res) {
  let copied = null;
  try {
    const doc = req.biodataDoc;
    const cap = await svc.enforceCap(req.userId);
    if (!cap.ok) return fail(res, 409, 'LIMIT_REACHED', `You can keep up to ${cap.max} biodatas`, { max: cap.max });
    if (doc.photo && doc.photo.file) copied = await svc.copyPhoto(doc.photo.file);
    const max = BiodataDocument.TITLE_MAX;
    const title = `${doc.title || svc.DEFAULT_TITLE} (copy)`.slice(0, max);
    const created = await BiodataDocument.create({
      user: req.userId,
      title,
      templateId: doc.templateId,
      design: doc.design || {},
      data: doc.data || {},
      status: 'draft',
      version: 1,
      photo: copied ? { file: copied, width: doc.photo.width, height: doc.photo.height, size: doc.photo.size } : null,
    });
    copied = null;
    const lean = created.toObject();
    await svc.snapshot(lean, 'duplicate');
    return res.status(201).json({ status: true, data: svc.documentView(lean) });
  } catch (err) {
    if (copied) await svc.removePhoto(copied);
    return serverError(res, 'duplicate', err);
  }
}

/* ---------------- versions ---------------- */

function versionNumber(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function listVersions(req, res) {
  try {
    const rows = await BiodataDocumentVersion.find({ document: req.biodataDoc._id })
      .select('version title templateId reason createdAt')
      .sort({ version: -1 })
      .lean();
    return res.json({
      status: true,
      data: rows.map((r) => ({ version: r.version, title: r.title, templateId: r.templateId, reason: r.reason, createdAt: r.createdAt })),
      current: req.biodataDoc.version,
    });
  } catch (err) {
    return serverError(res, 'versions', err);
  }
}

async function findVersion(req) {
  const v = versionNumber(req.params.v);
  if (!v) return null;
  return BiodataDocumentVersion.findOne({ document: req.biodataDoc._id, version: v }).lean();
}

async function getVersion(req, res) {
  try {
    const row = await findVersion(req);
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Version not found');
    return res.json({
      status: true,
      data: { version: row.version, title: row.title, templateId: row.templateId, design: row.design || {}, data: row.data || {}, reason: row.reason, createdAt: row.createdAt },
    });
  } catch (err) {
    return serverError(res, 'version', err);
  }
}

async function restoreVersion(req, res) {
  try {
    const doc = req.biodataDoc;
    const row = await findVersion(req);
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Version not found');
    if (!registry.isKnown(row.templateId)) return fail(res, 400, 'UNKNOWN_TEMPLATE', 'That version uses a template that no longer exists');
    const $set = { title: row.title, templateId: row.templateId, design: row.design || {}, data: row.data || {} };
    const updated = await BiodataDocument.findOneAndUpdate(
      { _id: doc._id, user: req.userId, version: doc.version },
      { $set, $inc: { version: 1 } },
      { new: true }
    ).lean();
    if (!updated) return conflict(res, doc);
    await svc.snapshot(updated, 'restore');
    return res.json({ status: true, data: svc.documentView(updated) });
  } catch (err) {
    return serverError(res, 'restore', err);
  }
}

/* ---------------- photo ---------------- */

async function uploadPhoto(req, res) {
  const doc = req.biodataDoc;
  if (!req.file) return fail(res, 400, 'VALIDATION_ERROR', 'photo is required');
  let info = null;
  try {
    try {
      info = await photo.fromUpload(req.file);
    } catch (err) {
      await photo.unlinkQuiet(req.file.path);
      if (err && err.code === 'INVALID_IMAGE') return fail(res, 400, 'INVALID_IMAGE', err.message);
      throw err;
    }
    const updated = await BiodataDocument.findOneAndUpdate({ _id: doc._id, user: req.userId }, { $set: { photo: info } }, { new: true }).lean();
    if (!updated) {
      await svc.removePhoto(info.file);
      return notFound(res);
    }
    if (doc.photo && doc.photo.file && doc.photo.file !== info.file) await svc.removePhoto(doc.photo.file);
    return res.json({ status: true, data: svc.documentView(updated) });
  } catch (err) {
    if (info) await svc.removePhoto(info.file);
    else if (req.file && req.file.path) await photo.unlinkQuiet(req.file.path);
    return serverError(res, 'photo upload', err);
  }
}

async function deletePhoto(req, res) {
  try {
    const doc = req.biodataDoc;
    const updated = await BiodataDocument.findOneAndUpdate({ _id: doc._id, user: req.userId }, { $set: { photo: null } }, { new: true }).lean();
    if (!updated) return notFound(res);
    if (doc.photo && doc.photo.file) await svc.removePhoto(doc.photo.file);
    return res.json({ status: true, data: svc.documentView(updated) });
  } catch (err) {
    return serverError(res, 'photo delete', err);
  }
}

function getPhoto(req, res) {
  const doc = req.biodataDoc;
  const abs = doc.photo && doc.photo.file ? photo.photoPath(doc.photo.file) : null;
  if (!abs || !fs.existsSync(abs)) return fail(res, 404, 'NOT_FOUND', 'Photo not found');
  return streamPhoto(res, abs, 'noindex');
}

/* ---------------- owner pdf ---------------- */

async function documentPdf(req, res) {
  try {
    const doc = req.biodataDoc;
    if (pdf.status() !== 'ready') throw new pdf.PdfError('PDF_UNAVAILABLE');
    const photoDataUri = await photoDataUriOf(doc);
    const out = await renderAndSend(res, { title: doc.title, templateId: doc.templateId, design: doc.design || {}, data: doc.data || {}, photoDataUri });
    if (res.statusCode === 200) {
      BiodataDocument.updateOne({ _id: doc._id }, { $set: { lastRenderedAt: new Date() } }, { timestamps: false }).catch(() => {});
    }
    return out;
  } catch (err) {
    if (isPdfError(err)) return pdfFail(res, err);
    return serverError(res, 'document pdf', err);
  }
}

/* ---------------- sharing ---------------- */

function parseBool(v) {
  if (v === true || v === 'true' || v === 1 || v === '1') return true;
  if (v === false || v === 'false' || v === 0 || v === '0') return false;
  return undefined;
}

function shareResult(doc) {
  const view = svc.documentView(doc);
  return { share: view.share, shareUrl: view.share ? view.share.url : null };
}

async function share(req, res) {
  try {
    const s = req.biodataSettings || (await svc.settings());
    const doc = req.biodataDoc;
    const b = req.body || {};
    const enabled = b.enabled === undefined ? true : parseBool(b.enabled);
    if (enabled === undefined) return fail(res, 400, 'VALIDATION_ERROR', 'enabled must be true or false');

    if (!enabled) {
      const updated = await BiodataDocument.findOneAndUpdate(
        { _id: doc._id, user: req.userId },
        { $unset: { shareToken: 1 }, $set: { shareExpiresAt: null, shareViews: 0 } },
        { new: true }
      ).lean();
      if (!updated) return notFound(res);
      return res.json({ status: true, data: shareResult(updated) });
    }

    let days = s.shareDefaultDays;
    if (b.days !== undefined && b.days !== null && b.days !== '') {
      days = Number(b.days);
      if (!svc.SHARE_DAYS.includes(days)) return fail(res, 400, 'VALIDATION_ERROR', `days must be one of ${svc.SHARE_DAYS.join(', ')}`);
    }
    const keep = svc.shareActive(doc);
    const $set = { shareToken: keep ? doc.shareToken : svc.newShareToken(), shareExpiresAt: svc.expiryFor(days) };
    if (!keep) $set.shareViews = 0;
    const updated = await BiodataDocument.findOneAndUpdate({ _id: doc._id, user: req.userId }, { $set }, { new: true }).lean();
    if (!updated) return notFound(res);
    return res.json({ status: true, data: shareResult(updated) });
  } catch (err) {
    return serverError(res, 'share', err);
  }
}

async function rotateShare(req, res) {
  try {
    const doc = req.biodataDoc;
    if (!svc.shareActive(doc)) return fail(res, 409, 'SHARE_OFF', 'Sharing is not switched on for this biodata');
    const updated = await BiodataDocument.findOneAndUpdate(
      { _id: doc._id, user: req.userId },
      { $set: { shareToken: svc.newShareToken(), shareViews: 0 } },
      { new: true }
    ).lean();
    if (!updated) return notFound(res);
    return res.json({ status: true, data: shareResult(updated) });
  } catch (err) {
    return serverError(res, 'share rotate', err);
  }
}

/* ---------------- shared (public, by token) ---------------- */

async function sharedView(req, res) {
  try {
    const doc = req.biodataDoc;
    const { data, design } = svc.withoutContact(doc.data, doc.design);
    const token = doc.shareToken;
    let parts;
    try {
      parts = svc.renderParts({
        data,
        templateId: doc.templateId,
        design,
        photoUrl: doc.photo && doc.photo.file ? `/api/biodata/shared/${token}/photo` : null,
        mode: 'preview',
      });
    } catch (err) {
      if (svc.renderError(err)) return fail(res, 404, 'NOT_FOUND', SHARED_404);
      throw err;
    }
    BiodataDocument.updateOne({ _id: doc._id }, { $inc: { shareViews: 1 } }, { timestamps: false }).catch(() => {});
    return res.json({
      status: true,
      data: {
        title: doc.title,
        templateId: doc.templateId,
        design: { labelLanguage: (design && design.labelLanguage) || 'en' },
        expiresAt: doc.shareExpiresAt,
        html: parts.body,
        css: parts.css,
        fontFamilies: parts.fontFamilies || [],
      },
    });
  } catch (err) {
    return serverError(res, 'shared view', err);
  }
}

function sharedPhoto(req, res) {
  const doc = req.biodataDoc;
  const abs = doc.photo && doc.photo.file ? photo.photoPath(doc.photo.file) : null;
  if (!abs || !fs.existsSync(abs)) return fail(res, 404, 'NOT_FOUND', SHARED_404);
  return streamPhoto(res, abs, 'noindex, nofollow');
}

async function sharedPdf(req, res) {
  try {
    const doc = req.biodataDoc;
    if (pdf.status() !== 'ready') throw new pdf.PdfError('PDF_UNAVAILABLE');
    const { data, design } = svc.withoutContact(doc.data, doc.design);
    const photoDataUri = await photoDataUriOf(doc);
    return await renderAndSend(res, { title: doc.title, templateId: doc.templateId, design, data, photoDataUri });
  } catch (err) {
    if (isPdfError(err)) return pdfFail(res, err);
    return serverError(res, 'shared pdf', err);
  }
}

module.exports = {
  // middleware
  requireEnabled,
  guestGate,
  loadOwned,
  sharedHeaders,
  loadShared,
  // public
  config,
  templates,
  listPages,
  getPage,
  render,
  // owner
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  duplicateDocument,
  listVersions,
  getVersion,
  restoreVersion,
  uploadPhoto,
  deletePhoto,
  getPhoto,
  documentPdf,
  share,
  rotateShare,
  // shared
  sharedView,
  sharedPhoto,
  sharedPdf,
  SHARED_404,
};
