'use strict';
/**
 * Member side of profile verification (feature expansion A1).
 *
 *   POST /api/profileVerification   multipart: user_id?, full_name, document_type,
 *                                   document (1-2 images), selfie (1 image)
 *       -> {_id, status:'pending', submittedAt}
 *       400 ALREADY_VERIFIED | 409 PENDING_EXISTS | 400 VALIDATION | 403 FORBIDDEN
 *   POST /api/fetchVerificationStatus {}
 *       -> {is_verified, verifiedAt, canSubmit, latest:{_id,status,documentType,reason,submittedAt,reviewedAt}|null}
 *
 * The caller is always the token user. Uploaded files are unlinked on every
 * rejection path so nothing orphaned stays in the private directory.
 */
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Verification = require('../models/Verification');
const DocumentType = require('../models/documentType');
const { requireSelfOr403 } = require('../middleware/identity');

function uploadedFiles(req) {
  const out = [];
  if (req.files && typeof req.files === 'object') {
    for (const list of Object.values(req.files)) if (Array.isArray(list)) out.push(...list);
  }
  return out.filter((f) => f && f.path);
}

async function discard(req) {
  await Promise.all(uploadedFiles(req).map((f) => fs.promises.unlink(f.path).catch(() => {})));
}

function bad(res, status, code, message) {
  return res.status(status).json({ status: false, code, message });
}

function latestView(row) {
  if (!row) return null;
  return {
    _id: row._id,
    status: row.status,
    documentType: row.documentType,
    reason: row.status === 'rejected' ? row.reason || null : null,
    submittedAt: row.createdAt,
    reviewedAt: row.reviewedAt || null,
  };
}

/** document_type: a DocumentType title or id (from fetchSetting.documentTypes) or short free text. */
async function normaliseDocumentType(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v || v.length > 60) return null;
  if (mongoose.isValidObjectId(v)) {
    const row = await DocumentType.findById(v).select('title').lean();
    if (row) return row.title;
  }
  return v;
}

exports.submitVerification = async (req, res) => {
  try {
    const self = requireSelfOr403(req, 'user_id');
    if (!self.ok) {
      await discard(req);
      return res.status(self.status).json(self.body);
    }
    const userId = req.userId;
    const body = req.body || {};
    const files = req.files && typeof req.files === 'object' && !Array.isArray(req.files) ? req.files : {};
    const documents = Array.isArray(files.document) ? files.document : [];
    const selfie = Array.isArray(files.selfie) ? files.selfie[0] : null;

    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const documentType = await normaliseDocumentType(body.document_type);
    if (fullName.length < 2 || fullName.length > 120) {
      await discard(req);
      return bad(res, 400, 'VALIDATION', 'full_name is required');
    }
    if (!documentType) {
      await discard(req);
      return bad(res, 400, 'VALIDATION', 'document_type is required');
    }
    if (!documents.length || documents.length > 2 || !selfie) {
      await discard(req);
      return bad(res, 400, 'VALIDATION', 'Upload 1-2 document photos and a selfie');
    }

    const user = await User.findById(userId).select('is_verified').lean();
    if (!user) {
      await discard(req);
      return bad(res, 404, 'NOT_FOUND', 'User not found');
    }
    if (user.is_verified === 1) {
      await discard(req);
      return bad(res, 400, 'ALREADY_VERIFIED', 'Your profile is already verified');
    }
    if (await Verification.exists({ user: userId, status: 'pending' })) {
      await discard(req);
      return bad(res, 409, 'PENDING_EXISTS', 'You already have a verification request under review');
    }

    let row;
    try {
      row = await Verification.create({
        user: userId,
        fullName,
        documentType,
        documentFiles: documents.map((f) => f.filename),
        selfieFile: selfie.filename,
        status: 'pending',
      });
    } catch (err) {
      await discard(req);
      if (err && err.code === 11000) return bad(res, 409, 'PENDING_EXISTS', 'You already have a verification request under review');
      throw err;
    }

    return res.json({
      status: true,
      message: 'Verification request submitted',
      data: { _id: row._id, status: row.status, submittedAt: row.createdAt },
    });
  } catch (err) {
    await discard(req);
    console.error('[verification] submit failed:', err.message);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

exports.fetchVerificationStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const [user, latest] = await Promise.all([
      User.findById(userId).select('is_verified verifiedAt').lean(),
      Verification.findOne({ user: userId }).sort({ createdAt: -1 }).lean(),
    ]);
    if (!user) return bad(res, 404, 'NOT_FOUND', 'User not found');
    const isVerified = user.is_verified === 1;
    return res.json({
      status: true,
      message: 'Verification status',
      data: {
        is_verified: user.is_verified || 0,
        verifiedAt: user.verifiedAt || null,
        canSubmit: !isVerified && !(latest && latest.status === 'pending'),
        latest: latestView(latest),
      },
    });
  } catch (err) {
    console.error('[verification] status failed:', err.message);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

exports._latestView = latestView;
