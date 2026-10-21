'use strict';
/**
 * controllers/SuccessStoryController.js — member + public success stories (feature expansion A3).
 *
 *   POST /api/submitSuccessStory      (authenticate, multipart `photo`)
 *   POST /api/fetchMySuccessStories   (authenticate)
 *   GET  /api/success-stories         (public, published only)
 *   GET  /api/success-stories/:id     (public, published only)
 *
 * Public rows never carry submittedBy / partnerUser / status / emails.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const SuccessStory = require('../models/SuccessStory');
const FriendshipRequest = require('../models/FriendShipRequest');
const { resolveCaller } = require('../middleware/identity');
const { uploadDir, ALLOWED_MIME } = require('../middleware/upload');

const DAILY_SUBMISSIONS = 3;
const MIN_STORY = 30;
const MAX_STORY = 5000;
const STORED_PHOTO_RE = /^uploads\/profile_images\/[A-Za-z0-9_-]+\.(jpe?g|png|webp)$/i;

/* ---------- photo upload: same folder/mime/size rules as middleware/upload.js ---------- */

const storyUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdir(path.resolve(process.cwd(), uploadDir), { recursive: true }, () => cb(null, uploadDir));
    },
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.bin`),
  }),
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(String(file.mimetype || '').toLowerCase())) return cb(null, true);
    const err = new Error('Only JPEG, PNG or WebP images are allowed');
    err.code = 'INVALID_IMAGE';
    err.status = 400;
    return cb(err, false);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 30, fieldSize: 64 * 1024 },
});

/** multer single('photo'); errors become JSON 400/413 instead of reaching the app handler. */
function uploadStoryPhoto(req, res, next) {
  storyUpload.single('photo')(req, res, (err) => {
    if (!err) return next();
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      status: false,
      code: err.code === 'INVALID_IMAGE' ? 'INVALID_IMAGE' : 'UPLOAD_ERROR',
      message: status === 413 ? 'Photo is larger than 5 MB' : err.message || 'Upload rejected',
    });
  });
}

function storedPhotoPath(file) {
  if (!file || !file.path) return null;
  const rel = path.relative(process.cwd(), path.resolve(process.cwd(), file.path)).replace(/\\/g, '/');
  return STORED_PHOTO_RE.test(rel) ? rel : null;
}

async function removePhoto(stored) {
  if (!stored || !STORED_PHOTO_RE.test(stored)) return;
  try {
    await fs.promises.unlink(path.resolve(process.cwd(), stored));
  } catch (_) {
    /* already gone */
  }
}

async function discardUpload(req) {
  if (req.file && req.file.path) {
    try {
      await fs.promises.unlink(req.file.path);
    } catch (_) {
      /* ignore */
    }
  }
}

/* ---------- field validation (shared with the admin controller) ---------- */

/**
 * Plain text: stored as typed (no HTML entity encoding; every client escapes on
 * output), control characters dropped, CRLF normalised, trimmed and clipped.
 */
function text(v, max) {
  if (v === undefined || v === null || typeof v === 'object') return '';
  // eslint-disable-next-line no-control-regex
  let out = String(v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (max && out.length > max) out = out.slice(0, max);
  return out;
}

function parseDate(v) {
  if (v === undefined || v === null || v === '') return { ok: true, value: null };
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return { ok: false };
  if (d.getTime() > Date.now() + 366 * 86400000) return { ok: false };
  if (d.getFullYear() < 1950) return { ok: false };
  return { ok: true, value: d };
}

/**
 * Validate story fields. `partial` (admin PUT) only checks keys that are present.
 * Accepts snake_case (member form) and camelCase (admin) names.
 * Returns { errors: [], fields: {} }.
 */
function readStoryFields(body, { partial = false } = {}) {
  const b = body || {};
  const pick = (snake, camel) => (b[snake] !== undefined ? b[snake] : b[camel]);
  const errors = [];
  const fields = {};

  const groom = pick('groom_name', 'groomName');
  if (groom !== undefined || !partial) {
    const v = text(groom, 80);
    if (!v) errors.push('groom_name is required');
    else fields.groomName = v;
  }
  const bride = pick('bride_name', 'brideName');
  if (bride !== undefined || !partial) {
    const v = text(bride, 80);
    if (!v) errors.push('bride_name is required');
    else fields.brideName = v;
  }
  const story = pick('story', 'story');
  if (story !== undefined || !partial) {
    const v = text(story, MAX_STORY + 1);
    if (v.length < MIN_STORY) errors.push(`story must be at least ${MIN_STORY} characters`);
    else if (v.length > MAX_STORY) errors.push(`story must be at most ${MAX_STORY} characters`);
    else fields.story = v;
  }
  const wd = pick('wedding_date', 'weddingDate');
  if (wd !== undefined) {
    const d = parseDate(wd);
    if (!d.ok) errors.push('wedding_date is not a valid date');
    else fields.weddingDate = d.value;
  }
  const city = pick('city', 'city');
  if (city !== undefined) fields.city = text(city, 80);
  return { errors, fields };
}

function publicRow(doc) {
  return {
    _id: doc._id,
    groomName: doc.groomName,
    brideName: doc.brideName,
    story: doc.story,
    photo: doc.photo || null,
    weddingDate: doc.weddingDate || null,
    city: doc.city || '',
    isFeatured: !!doc.isFeatured,
    publishedAt: doc.publishedAt || null,
  };
}

function mineRow(doc) {
  return {
    ...publicRow(doc),
    status: doc.status,
    rejectionReason: doc.status === 'rejected' ? doc.rejectionReason || null : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function bad(res, message, code = 'VALIDATION_ERROR', status = 400) {
  return res.status(status).json({ status: false, code, message });
}

/* ---------- member ---------- */

/** Runs BEFORE multer: 3 submissions per member per 24 h (no file is written when over). */
async function submissionQuota(req, res, next) {
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const n = await SuccessStory.countDocuments({ submittedBy: req.userId, createdAt: { $gte: since } });
    if (n >= DAILY_SUBMISSIONS) {
      return res.status(429).json({ status: false, code: 'DAILY_CAP', message: `You can share up to ${DAILY_SUBMISSIONS} stories per day` });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

async function submitSuccessStory(req, res) {
  try {
    const callerId = resolveCaller(req);
    const { errors, fields } = readStoryFields(req.body);
    if (errors.length) {
      await discardUpload(req);
      return bad(res, errors[0]);
    }

    let partnerUser = null;
    const partnerId = req.body && req.body.partner_user_id;
    if (partnerId !== undefined && partnerId !== null && partnerId !== '') {
      if (!mongoose.isValidObjectId(partnerId) || String(partnerId) === callerId) {
        await discardUpload(req);
        return bad(res, 'partner_user_id is not valid');
      }
      const pairKey = FriendshipRequest.pairKeyOf(callerId, partnerId);
      const connected = await FriendshipRequest.exists({
        status: 'accepted',
        $or: [
          { pairKey },
          { requester: callerId, recipient: partnerId },
          { requester: partnerId, recipient: callerId },
        ],
      });
      if (!connected) {
        await discardUpload(req);
        return bad(res, 'You can only name a partner you are connected with', 'NOT_CONNECTED');
      }
      partnerUser = partnerId;
    }

    const photo = storedPhotoPath(req.file);
    const doc = await SuccessStory.create({
      ...fields,
      submittedBy: callerId,
      partnerUser,
      photo,
      status: 'pending',
    });
    return res.status(201).json({
      status: true,
      message: 'Thank you! Your story will appear after review.',
      data: mineRow(doc.toObject()),
    });
  } catch (err) {
    await discardUpload(req);
    // eslint-disable-next-line no-console
    console.error('[submitSuccessStory]', err.message);
    return res.status(500).json({ status: false, message: 'Could not save your story' });
  }
}

async function fetchMySuccessStories(req, res) {
  try {
    const callerId = resolveCaller(req);
    const rows = await SuccessStory.find({ $or: [{ submittedBy: callerId }, { partnerUser: callerId }] })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ status: true, message: 'Success stories', data: rows.map(mineRow), total: rows.length });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[fetchMySuccessStories]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
}

/* ---------- public ---------- */

async function listPublished(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const query = { status: 'published' };
    if (req.query.featured === '1' || req.query.featured === 'true') query.isFeatured = true;
    const [total, rows] = await Promise.all([
      SuccessStory.countDocuments(query),
      SuccessStory.find(query)
        .sort({ isFeatured: -1, publishedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('groomName brideName story photo weddingDate city isFeatured publishedAt')
        .lean(),
    ]);
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ status: true, message: 'Success stories', data: rows.map(publicRow), total, page, limit });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[success-stories list]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
}

async function getPublished(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'Story not found' });
    const doc = await SuccessStory.findOne({ _id: req.params.id, status: 'published' })
      .select('groomName brideName story photo weddingDate city isFeatured publishedAt')
      .lean();
    if (!doc) return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'Story not found' });
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ status: true, message: 'Success story', data: publicRow(doc) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[success-stories get]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
}

module.exports = {
  DAILY_SUBMISSIONS,
  text,
  uploadStoryPhoto,
  storedPhotoPath,
  removePhoto,
  discardUpload,
  readStoryFields,
  publicRow,
  mineRow,
  submissionQuota,
  submitSuccessStory,
  fetchMySuccessStories,
  listPublished,
  getPublished,
};
