'use strict';
/**
 * services/jobs/verificationFilePurge.js — delete verification documents and
 * selfies VERIFICATION_FILE_RETENTION_DAYS after the request was reviewed
 * (feature expansion A1). The request row (status, reason, reviewer) stays;
 * files are unlinked and filesPurgedAt is set. Pending requests are never touched.
 *
 * Plain async function: no timers or queries at require time.
 */
const env = require('../../config/env');
const Verification = require('../../models/Verification');
const { removeFiles } = require('../verificationService');

const DAY = 24 * 3600 * 1000;

async function runVerificationFilePurge({ now = new Date(), retentionDays = env.VERIFICATION_FILE_RETENTION_DAYS } = {}) {
  const cutoff = new Date(now.getTime() - retentionDays * DAY);
  const rows = await Verification.find({
    status: { $in: ['approved', 'rejected'] },
    reviewedAt: { $lte: cutoff },
    filesPurgedAt: null,
  })
    .select('documentFiles selfieFile')
    .limit(1000)
    .lean();

  let files = 0;
  for (const row of rows) {
    files += await removeFiles(row);
    await Verification.updateOne({ _id: row._id }, { $set: { documentFiles: [], selfieFile: null, filesPurgedAt: now } });
  }
  return { requests: rows.length, files };
}

module.exports = runVerificationFilePurge;
module.exports.runVerificationFilePurge = runVerificationFilePurge;
