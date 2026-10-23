'use strict';
/**
 * services/biodataPhoto.js — private biodata photos.
 *
 * Owner photos live in PRIVATE_UPLOADS_DIR/biodata, guest render uploads in
 * PRIVATE_UPLOADS_DIR/biodata_tmp (deleted in the request's finally). Neither
 * is under uploads/, so nginx and the /uploads static fallback never serve
 * them. Documents store a BASENAME only; every lookup goes through
 * photoPath(), which refuses anything that resolves outside the directory.
 *
 *   photoDir() / tmpDir()       absolute dirs (not created here)
 *   ensureDir(dir)              mkdir -p 0700
 *   photoPath(name)             absolute path inside photoDir() or null
 *   fromUpload(file)            validate + re-encode a multer file (validateImages.processImageFile),
 *                               returns {file, width, height, size}
 *   toDataUri(absPath)          sharp: <=1200 px, JPEG q82 -> data:image/jpeg;base64,...
 *   removePhoto(name)           unlink quietly; true when a file was removed
 *   copyPhoto(name)             duplicate a stored photo, returns the new basename or null
 *   unlinkQuiet(absPath)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const { processImageFile } = require('../middleware/validateImages');

const NAME_RE = /^[A-Za-z0-9_-]+\.(jpe?g|png|webp)$/i;

function photoDir() {
  return path.join(env.PRIVATE_UPLOADS_DIR, 'biodata');
}

function tmpDir() {
  return path.join(env.PRIVATE_UPLOADS_DIR, 'biodata_tmp');
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function resolveIn(dir, name) {
  if (!name || typeof name !== 'string') return null;
  const base = path.basename(name);
  if (!NAME_RE.test(base)) return null;
  const root = path.resolve(dir);
  const abs = path.resolve(root, base);
  return abs.startsWith(root + path.sep) ? abs : null;
}

function photoPath(name) {
  return resolveIn(photoDir(), name);
}

async function unlinkQuiet(abs) {
  if (!abs) return false;
  try {
    await fs.promises.unlink(abs);
    return true;
  } catch (_) {
    return false;
  }
}

function loadSharp() {
  try {
    // eslint-disable-next-line global-require
    return require('sharp');
  } catch (_) {
    return null;
  }
}

/** Throws err.code='INVALID_IMAGE' for non-images (the caller unlinks req.file.path). */
async function fromUpload(file) {
  await processImageFile(file);
  let width = 0;
  let height = 0;
  const sharp = loadSharp();
  if (sharp) {
    try {
      const meta = await sharp(file.path).metadata();
      width = meta.width || 0;
      height = meta.height || 0;
    } catch (_) {
      /* dimensions are informative only */
    }
  }
  let size = file.size || 0;
  try {
    size = (await fs.promises.stat(file.path)).size;
  } catch (_) {
    /* keep multer's size */
  }
  return { file: path.basename(file.path), width, height, size };
}

async function toDataUri(absPath) {
  const sharp = loadSharp();
  if (!absPath) return null;
  if (!sharp) {
    const buf = await fs.promises.readFile(absPath);
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  }
  const buf = await sharp(absPath)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function removePhoto(name) {
  return unlinkQuiet(photoPath(name));
}

async function copyPhoto(name) {
  const src = photoPath(name);
  if (!src) return null;
  await ensureDir(photoDir());
  const ext = path.extname(src).toLowerCase() || '.jpg';
  const base = `${crypto.randomUUID()}${ext}`;
  try {
    await fs.promises.copyFile(src, path.join(photoDir(), base), fs.constants.COPYFILE_EXCL);
    return base;
  } catch (_) {
    return null;
  }
}

module.exports = { photoDir, tmpDir, ensureDir, photoPath, fromUpload, toDataUri, removePhoto, copyPhoto, unlinkQuiet, NAME_RE };
