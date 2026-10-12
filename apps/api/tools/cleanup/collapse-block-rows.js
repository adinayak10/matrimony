'use strict';
/**
 * tools/cleanup/collapse-block-rows.js (A8.7)
 *
 * The old blockUser wrote two rows (A->B and B->A). For reverse pairs created
 * within 2 s of each other keep the EARLIER row (the real blocker) and delete
 * the mirror. Genuine mutual blocks made at different times are kept.
 * Idempotent.
 *
 *   node tools/cleanup/collapse-block-rows.js
 *   node tools/cleanup/collapse-block-rows.js --apply --yes-i-know --prod
 */
const g = require('../_guard');
const Block = require('../../models/Block');

const WINDOW_MS = 2000;

g.run(async ({ apply }) => {
  const rows = await Block.find().select('_id blocker blocked createdAt').sort({ createdAt: 1, _id: 1 }).lean();
  const byPair = new Map();
  for (const r of rows) byPair.set(`${r.blocker}:${r.blocked}`, r);

  const toDelete = [];
  const seen = new Set();
  for (const r of rows) {
    const key = `${r.blocker}:${r.blocked}`;
    if (seen.has(key)) continue;
    const mirror = byPair.get(`${r.blocked}:${r.blocker}`);
    if (!mirror) continue;
    const t1 = new Date(r.createdAt || 0).getTime();
    const t2 = new Date(mirror.createdAt || 0).getTime();
    if (Math.abs(t1 - t2) > WINDOW_MS) continue;
    // rows are sorted ascending, so r is the earlier one
    seen.add(key);
    seen.add(`${mirror.blocker}:${mirror.blocked}`);
    toDelete.push(mirror);
    // eslint-disable-next-line no-console
    console.log(`collapse: keep ${r._id} (${r.blocker} -> ${r.blocked}), drop mirror ${mirror._id}`);
  }

  let deleted = 0;
  if (apply && toDelete.length) {
    const r = await Block.deleteMany({ _id: { $in: toDelete.map((x) => x._id) } });
    deleted = r.deletedCount || 0;
  }
  // eslint-disable-next-line no-console
  console.log({ rows: rows.length, mirrorsFound: toDelete.length, deleted, applied: apply });
});
