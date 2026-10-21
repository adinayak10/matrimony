'use strict';
/**
 * middleware/privateUpload.js — multer for verification documents (feature
 * expansion A1).
 *
 * Files go to <PRIVATE_UPLOADS_DIR>/verification, a directory that is NOT under
 * uploads/, so nginx and the /uploads static fallback (UPLOAD_PATH_RE) can never
 * serve them; only the admin route streams them. Same rules as
 * middleware/upload.js: declared-mime allowlist, random names, 5 MB per file.
 * Run middleware/validateImages.js right after (it sniffs + re-encodes in the
 * file's own directory, stripping EXIF/GPS).
 *
 * The directory is created on first use (never at require time).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function verificationDir() {
  return path.join(env.PRIVATE_UPLOADS_DIR, 'verification');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = verificationDir();
    fs.mkdir(dir, { recursive: true, mode: 0o700 }, (err) => cb(err, dir));
  },
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.bin`),
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.has(String(file.mimetype || '').toLowerCase())) return cb(null, true);
  const err = new Error('Only JPEG, PNG or WebP images are allowed');
  err.code = 'INVALID_IMAGE';
  err.status = 400;
  return cb(err, false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 3, fields: 20, fieldSize: 64 * 1024 },
});

module.exports = {
  verificationUpload: upload.fields([
    { name: 'document', maxCount: 2 },
    { name: 'selfie', maxCount: 1 },
  ]),
  verificationDir,
  ALLOWED_MIME,
};
