'use strict';
/**
 * services/jobs/biodataSharePrune.js — daily housekeeping for the biodata maker.
 *
 *   1. Expired share links: shareToken unset, shareExpiresAt/shareViews reset.
 *      (Expired tokens already answer 404; this keeps the unique index small
 *      and makes "expired" permanent even if a clock is wrong later.)
 *   2. Stale guest-render temp files (PRIVATE_UPLOADS_DIR/biodata_tmp older
 *      than an hour): requests delete their own files in a finally; this only
 *      catches leftovers from a crash or kill mid-request.
 *
 * Plain async function: no timers or queries at require time.
 */
const fs = require('fs');
const path = require('path');
const BiodataDocument = require('../../models/BiodataDocument');
const { tmpDir } = require('../biodataPhoto');

const TMP_MAX_AGE_MS = 60 * 60 * 1000;

async function pruneTmp(now) {
  const dir = tmpDir();
  let names = [];
  try {
    names = await fs.promises.readdir(dir);
  } catch (_) {
    return 0;
  }
  let removed = 0;
  for (const name of names) {
    const abs = path.join(dir, name);
    try {
      const st = await fs.promises.stat(abs);
      if (st.isFile() && now.getTime() - st.mtimeMs > TMP_MAX_AGE_MS) {
        await fs.promises.unlink(abs);
        removed++;
      }
    } catch (_) {
      /* vanished */
    }
  }
  return removed;
}

async function runBiodataSharePrune({ now = new Date() } = {}) {
  const r = await BiodataDocument.updateMany(
    { shareToken: { $type: 'string' }, shareExpiresAt: { $lte: now } },
    { $unset: { shareToken: 1 }, $set: { shareExpiresAt: null, shareViews: 0 } },
    { timestamps: false }
  );
  const tmpFiles = await pruneTmp(now);
  return { expiredShares: r.modifiedCount || 0, tmpFiles };
}

module.exports = runBiodataSharePrune;
module.exports.runBiodataSharePrune = runBiodataSharePrune;
