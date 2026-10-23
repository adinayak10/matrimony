'use strict';
/**
 * middleware/biodataUpload.js — multer for biodata photos (private storage).
 *
 *   ownerPhotoUpload   single file `photo` -> PRIVATE_UPLOADS_DIR/biodata
 *   renderUpload       guest render: text field `payload` (<= 256 KB JSON) and an
 *                      optional file `photo` -> PRIVATE_UPLOADS_DIR/biodata_tmp
 *                      (the controller unlinks it in a finally)
 *
 * Same rules as middleware/privateUpload.js: declared-mime allowlist, random
 * names, 5 MB, directories created 0700 on first use (never at require time).
 * Run services/biodataPhoto.fromUpload (validateImages.processImageFile) after.
 * Multer errors become JSON (400 INVALID_IMAGE / UPLOAD_ERROR, 413 PAYLOAD_TOO_LARGE).
 */
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { photoDir, tmpDir } = require('../services/biodataPhoto');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE = 5 * 1024 * 1024;
const MAX_PAYLOAD = 256 * 1024;

function storageIn(dirFn) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = dirFn();
      fs.mkdir(dir, { recursive: true, mode: 0o700 }, (err) => cb(err, dir));
    },
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.bin`),
  });
}

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.has(String(file.mimetype || '').toLowerCase())) return cb(null, true);
  const err = new Error('Only JPEG, PNG or WebP images are allowed');
  err.code = 'INVALID_IMAGE';
  err.status = 400;
  return cb(err, false);
};

const owner = multer({
  storage: storageIn(photoDir),
  fileFilter,
  limits: { fileSize: MAX_FILE, files: 1, fields: 5, fieldSize: 1024 },
});

const render = multer({
  storage: storageIn(tmpDir),
  fileFilter,
  limits: { fileSize: MAX_FILE, files: 1, fields: 3, fieldSize: MAX_PAYLOAD },
});

async function discard(req) {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files && typeof req.files === 'object') for (const list of Object.values(req.files)) if (Array.isArray(list)) files.push(...list);
  await Promise.all(
    files.map((f) =>
      f && f.path
        ? fs.promises.unlink(f.path).catch(() => {})
        : null
    )
  );
}

function wrap(mw) {
  return (req, res, next) => {
    mw(req, res, async (err) => {
      if (!err) return next();
      await discard(req);
      const tooLarge = err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FIELD_VALUE';
      if (tooLarge) {
        return res.status(413).json({
          status: false,
          code: 'PAYLOAD_TOO_LARGE',
          message: err.code === 'LIMIT_FILE_SIZE' ? 'Photo is larger than 5 MB' : 'Biodata is too large',
        });
      }
      return res.status(400).json({
        status: false,
        code: err.code === 'INVALID_IMAGE' ? 'INVALID_IMAGE' : 'UPLOAD_ERROR',
        message: err.code === 'INVALID_IMAGE' ? err.message : 'Upload rejected',
      });
    });
  };
}

module.exports = {
  ownerPhotoUpload: wrap(owner.single('photo')),
  renderUpload: wrap(render.single('photo')),
  discard,
  ALLOWED_MIME,
  MAX_FILE,
  MAX_PAYLOAD,
};
