'use strict';
/**
 * tools/cleanup/orphan-photos.js (A8.3)
 *
 *  1. UserPhoto rows whose userId has no User -> delete the row and move the
 *     file.
 *  2. Files in uploads/profile_images not referenced by User.profile,
 *     User.background_image or UserPhoto.imageUrl -> listed; with --apply
 *     they are MOVED to uploads/_orphaned/<YYYY-MM-DD>/ (never deleted).
 *
 * UPLOADS_DIR env overrides the default apps/api/uploads.
 *
 *   node tools/cleanup/orphan-photos.js
 *   node tools/cleanup/orphan-photos.js --apply --yes-i-know --prod
 */
const fs = require('fs');
const path = require('path');
const g = require('../_guard');
const User = require('../../models/User');
const UserPhoto = require('../../models/UserPhoto');

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads'));
const IMG_DIR = path.join(UPLOADS_DIR, 'profile_images');

function basenameOf(ref) {
  if (!ref || typeof ref !== 'string') return null;
  const clean = ref.replace(/\\/g, '/').replace(/^https?:\/\/[^/]+/i, '');
  if (!/profile_images\//.test(clean)) return null;
  return path.posix.basename(clean);
}

async function moveToOrphaned(name, apply) {
  const src = path.join(IMG_DIR, name);
  const dayDir = path.join(UPLOADS_DIR, '_orphaned', new Date().toISOString().slice(0, 10));
  const dst = path.join(dayDir, name);
  if (!apply) return false;
  try {
    await fs.promises.mkdir(dayDir, { recursive: true });
    await fs.promises.rename(src, dst);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

g.run(async ({ apply }) => {
  // --- 1. rows without a user ---
  const photos = await UserPhoto.find().select('_id userId imageUrl').lean();
  const userIds = new Set((await User.find().select('_id').lean()).map((u) => String(u._id)));
  const orphanRows = photos.filter((p) => !p.userId || !userIds.has(String(p.userId)));
  let movedRowFiles = 0;
  for (const p of orphanRows) {
    // eslint-disable-next-line no-console
    console.log(`orphan row ${p._id} (user ${p.userId}) -> ${p.imageUrl}`);
    const name = basenameOf(p.imageUrl);
    if (name && (await moveToOrphaned(name, apply))) movedRowFiles++;
    if (apply) await UserPhoto.deleteOne({ _id: p._id });
  }

  // --- 2. files without a reference ---
  const referenced = new Set();
  for (const p of photos) {
    const n = basenameOf(p.imageUrl);
    if (n) referenced.add(n);
  }
  const users = await User.find().select('profile background_image').lean();
  for (const u of users) {
    for (const ref of [u.profile, u.background_image]) {
      const n = basenameOf(ref);
      if (n) referenced.add(n);
    }
  }

  let files = [];
  try {
    files = (await fs.promises.readdir(IMG_DIR, { withFileTypes: true })).filter((d) => d.isFile()).map((d) => d.name);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`cannot read ${IMG_DIR}: ${err.message}`);
  }
  const orphanFiles = files.filter((n) => !referenced.has(n));
  let movedFiles = 0;
  for (const n of orphanFiles) {
    // eslint-disable-next-line no-console
    console.log(`unreferenced file ${n}`);
    if (await moveToOrphaned(n, apply)) movedFiles++;
  }

  // eslint-disable-next-line no-console
  console.log({
    photoRows: photos.length,
    orphanRows: orphanRows.length,
    orphanRowFilesMoved: movedRowFiles,
    filesOnDisk: files.length,
    referencedFiles: referenced.size,
    unreferencedFiles: orphanFiles.length,
    unreferencedFilesMoved: movedFiles,
    uploadsDir: UPLOADS_DIR,
    applied: apply,
  });
});
