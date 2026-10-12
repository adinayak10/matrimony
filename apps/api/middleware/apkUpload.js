'use strict';
/**
 * middleware/apkUpload.js (A7.1) — multer for the admin APK upload.
 *
 * - the extension must be .apk AND the file must start with the ZIP magic
 *   bytes PK\x03\x04 (an APK is a ZIP); anything else is unlinked -> 400
 * - the stored name is forced to BanjaraMatch_v<version>_<ts>.apk built
 *   from a sanitised versionName, never from the client file name
 * - 150 MB limit (nginx caps /api/admin/apk/upload at the same size)
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '..', 'uploads', 'apk');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const PK_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const version = String((req.body && req.body.versionName) || 'app')
      .replace(/[^0-9A-Za-z]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'app';
    cb(null, `BanjaraMatch_v${version}_${Date.now()}.apk`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext !== '.apk') {
    const err = new Error('Only .apk files are allowed');
    err.code = 'INVALID_APK';
    err.status = 400;
    return cb(err, false);
  }
  return cb(null, true);
};

const apkUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 150 * 1024 * 1024, files: 1 },
});

/** Reads the first 4 bytes of the stored file; true when it is a ZIP/APK. */
function hasPkMagic(filePath) {
  let fd = null;
  try {
    fd = fs.openSync(filePath, 'r');
    const head = Buffer.alloc(4);
    const n = fs.readSync(fd, head, 0, 4, 0);
    return n === 4 && head.equals(PK_MAGIC);
  } catch (_) {
    return false;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

/**
 * Runs after apkUpload.single(): rejects (and unlinks) a file that is not a
 * real ZIP container.
 */
function validateApk(req, res, next) {
  if (!req.file) return next();
  if (hasPkMagic(req.file.path)) return next();
  try {
    fs.unlinkSync(req.file.path);
  } catch (_) {
    /* ignore */
  }
  req.file = undefined;
  return res.status(400).json({ success: false, code: 'INVALID_APK', message: 'The uploaded file is not a valid APK' });
}

module.exports = apkUpload;
module.exports.validateApk = validateApk;
module.exports.hasPkMagic = hasPkMagic;
module.exports.uploadDir = uploadDir;
