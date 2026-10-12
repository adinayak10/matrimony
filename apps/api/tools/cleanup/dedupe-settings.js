'use strict';
/**
 * tools/cleanup/dedupe-settings.js (A8.9) — run FIRST in the cleanup order.
 *
 * Seven Setting documents exist (six empty, from seed.js). Keep the one with
 * apk.filePath (prod: 69287b6712fb5b6b9b3fb6e4, overridable with --keep=<id>),
 * delete the others. If none has apk.filePath, keep the oldest. Idempotent.
 *
 *   node tools/cleanup/dedupe-settings.js
 *   node tools/cleanup/dedupe-settings.js --apply --yes-i-know --prod
 */
const mongoose = require('mongoose');
const g = require('../_guard');
const Setting = require('../../models/settings');

const PREFERRED_ID = '69287b6712fb5b6b9b3fb6e4';

g.run(async ({ apply, args }) => {
  const docs = await Setting.find().sort({ _id: 1 }).lean();
  if (docs.length <= 1) {
    // eslint-disable-next-line no-console
    console.log({ settingsDocs: docs.length, deleted: 0, applied: apply, note: 'nothing to dedupe' });
    return;
  }

  const wantId = typeof args.keep === 'string' && mongoose.isValidObjectId(args.keep) ? args.keep : PREFERRED_ID;
  let keep =
    docs.find((d) => String(d._id) === wantId) ||
    docs.find((d) => d.apk && d.apk.filePath) ||
    docs.find((d) => d.apk && d.apk.fileName) ||
    docs[0];

  const drop = docs.filter((d) => String(d._id) !== String(keep._id));
  // eslint-disable-next-line no-console
  console.log(`keep ${keep._id} (apk.fileName=${(keep.apk && keep.apk.fileName) || '-'}, appName=${keep.appName || '-'})`);
  for (const d of drop) {
    // eslint-disable-next-line no-console
    console.log(`${apply ? 'delete' : 'would delete'} ${d._id} (apk.fileName=${(d.apk && d.apk.fileName) || '-'})`);
  }
  let deleted = 0;
  if (apply && drop.length) {
    const r = await Setting.deleteMany({ _id: { $in: drop.map((d) => d._id) } });
    deleted = r.deletedCount || 0;
  }
  // eslint-disable-next-line no-console
  console.log({ settingsDocs: docs.length, kept: String(keep._id), deleted, applied: apply });
});
