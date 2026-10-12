'use strict';
/**
 * middleware/validateImages.js — runs AFTER multer (A7.1 + integrator #13).
 *
 * For every uploaded file (req.file, req.files array, or req.files fields map):
 *   1. sharp(file.path).metadata() must report format jpeg|png|webp,
 *      otherwise the file is unlinked and the request gets 400.
 *   2. Re-encode with sharp().rotate().resize({width:1600,
 *      withoutEnlargement:true}).jpeg({quality:85}) to <crypto.randomUUID()>.jpg
 *      in the same directory (strips EXIF/GPS), unlink the original and update
 *      file.path / file.filename / file.mimetype / file.size.
 *
 * sharp is required lazily inside the handler. If it cannot be loaded (native
 * build failed on the VPS) the middleware falls back to an extension + mime
 * allowlist and a random rename, and logs that once.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

let sharpModule; // undefined = not tried, null = unavailable
let warnedFallback = false;

function loadSharp() {
  if (sharpModule !== undefined) return sharpModule;
  try {
    // eslint-disable-next-line global-require
    sharpModule = require('sharp');
  } catch (err) {
    sharpModule = null;
    if (!warnedFallback) {
      warnedFallback = true;
      // eslint-disable-next-line no-console
      console.warn(
        '[validateImages] sharp is not available (' +
          err.message.split('\n')[0] +
          '); falling back to extension/mime allowlist + random rename. Install sharp to enable re-encoding.'
      );
    }
  }
  return sharpModule;
}

function collectFiles(req) {
  const out = [];
  if (req.file) out.push(req.file);
  if (Array.isArray(req.files)) out.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    for (const list of Object.values(req.files)) if (Array.isArray(list)) out.push(...list);
  }
  return out.filter((f) => f && f.path);
}

async function unlinkQuiet(p) {
  try {
    await fs.promises.unlink(p);
  } catch (_) {
    /* ignore */
  }
}

function applyNewFile(file, newPath, mimetype, size) {
  file.path = newPath.replace(/\\/g, '/');
  file.filename = path.basename(newPath);
  file.destination = path.dirname(newPath);
  file.mimetype = mimetype;
  if (typeof size === 'number') file.size = size;
}

/**
 * Validate + re-encode one multer file in place. Throws on rejection
 * (caller unlinks). Returns the file.
 */
async function processImageFile(file) {
  const sharp = loadSharp();
  const dir = path.dirname(file.path);

  if (sharp) {
    let meta;
    try {
      meta = await sharp(file.path).metadata();
    } catch (_) {
      const err = new Error('File is not a valid image');
      err.code = 'INVALID_IMAGE';
      throw err;
    }
    if (!meta || !ALLOWED_FORMATS.has(meta.format)) {
      const err = new Error('Only JPEG, PNG or WebP images are allowed');
      err.code = 'INVALID_IMAGE';
      throw err;
    }
    const outPath = path.join(dir, `${crypto.randomUUID()}.jpg`);
    const info = await sharp(file.path)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(outPath);
    await unlinkQuiet(file.path);
    applyNewFile(file, outPath, 'image/jpeg', info && info.size);
    return file;
  }

  // Fallback: allowlist by extension + declared mime, random name, keep ext.
  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(mime)) {
    const err = new Error('Only JPEG, PNG or WebP images are allowed');
    err.code = 'INVALID_IMAGE';
    throw err;
  }
  const safeExt = ext === '.jpeg' ? '.jpg' : ext;
  const outPath = path.join(dir, `${crypto.randomUUID()}${safeExt}`);
  await fs.promises.rename(file.path, outPath);
  applyNewFile(file, outPath, mime, file.size);
  return file;
}

async function validateImages(req, res, next) {
  const files = collectFiles(req);
  if (!files.length) return next();
  try {
    for (const file of files) {
      try {
        await processImageFile(file);
      } catch (err) {
        // reject the whole request: unlink everything received so far
        await Promise.all(files.map((f) => unlinkQuiet(f.path)));
        if (err && err.code === 'INVALID_IMAGE') {
          return res.status(400).json({ status: false, code: 'INVALID_IMAGE', message: err.message });
        }
        throw err;
      }
    }
    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[validateImages] failed:', err.message);
    return res.status(500).json({ status: false, message: 'Image processing failed' });
  }
}

module.exports = validateImages;
module.exports.validateImages = validateImages;
module.exports.processImageFile = processImageFile;
module.exports.ALLOWED_FORMATS = ALLOWED_FORMATS;
module.exports.ALLOWED_MIME = ALLOWED_MIME;
