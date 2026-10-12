'use strict';
/**
 * middleware/upload.js (A7.1) — multer for member photos.
 *
 * - mime allowlist image/jpeg|png|webp (the declared type; the real sniff +
 *   re-encode happens in middleware/validateImages.js right after multer)
 * - random file names: crypto.randomUUID() + '.bin' (validateImages renames
 *   the re-encoded file to <uuid>.jpg), so nothing user-controlled reaches
 *   the filesystem
 * - limits: 5 MB per file, 10 files per request, 1 MB of text fields
 * - no body/file logging (A2.6)
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Kept RELATIVE (cwd = apps/api under pm2 and the boot check) on purpose:
// multer's file.path is stored verbatim in User.profile / UserPhoto.imageUrl
// and served as /uploads/profile_images/<name>, so the stored form must stay
// 'uploads/profile_images/<uuid>.jpg'.
const uploadDir = 'uploads/profile_images';

if (!fs.existsSync(path.resolve(process.cwd(), uploadDir))) {
  fs.mkdirSync(path.resolve(process.cwd(), uploadDir), { recursive: true });
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.bin`),
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.has(String(file.mimetype || '').toLowerCase())) return cb(null, true);
  const err = new Error('Only JPEG, PNG or WebP images are allowed');
  err.code = 'INVALID_IMAGE';
  err.status = 400;
  return cb(err, false);
};

const limits = {
  fileSize: 5 * 1024 * 1024, // 5 MB per file
  files: 10,
  fields: 200,
  fieldSize: 1 * 1024 * 1024,
};

const upload = multer({ storage, fileFilter, limits });

module.exports = {
  uploadProfileImages: upload.fields([
    { name: 'profile', maxCount: 1 },
    { name: 'background_image', maxCount: 1 },
  ]),
  uploadUserPhotos: upload.array('photos', 10), // up to 10 photos per upload
  uploadDir,
  ALLOWED_MIME,
};
