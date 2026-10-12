'use strict';
/**
 * services/blocks.js — the Block collection is the only block store (A6.2).
 * User.blocked (array) is retired: 0 users use it.
 *
 * getBlockedIdSet(userId)   Set<string> of ids blocked by OR blocking userId
 * getBlockedIds(userId)     same as ObjectId[] (for $nin)
 * isBlockedEither(a, b)     boolean
 * blockUser(blocker, blocked)
 *   one row (idempotent upsert), deletes PENDING FriendShipRequests between
 *   the two and Shortlist rows in both directions.
 *   -> { created, removedRequests, removedShortlists }
 * unblockUser(blocker, blocked)
 *   only the blocker's own row -> removed row or null (the blocked side
 *   cannot lift a block placed on them).
 */
const mongoose = require('mongoose');
const Block = require('../models/Block');
const FriendShipRequest = require('../models/FriendShipRequest');
const Shortlist = require('../models/ShortList');

class BlockError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'BlockError';
    this.status = status;
    this.code = code;
  }
}

function oid(v) {
  const raw = v && typeof v === 'object' && v._id !== undefined ? v._id : v;
  if (!mongoose.isValidObjectId(raw)) return null;
  return new mongoose.Types.ObjectId(String(raw));
}

async function getBlockedIds(userId) {
  const id = oid(userId);
  if (!id) return [];
  const rows = await Block.find({ $or: [{ blocker: id }, { blocked: id }] })
    .select('blocker blocked')
    .lean();
  const out = new Map();
  for (const r of rows) {
    const other = String(r.blocker) === String(id) ? r.blocked : r.blocker;
    if (other) out.set(String(other), other);
  }
  return Array.from(out.values());
}

async function getBlockedIdSet(userId) {
  const ids = await getBlockedIds(userId);
  return new Set(ids.map(String));
}

async function isBlockedEither(a, b) {
  const x = oid(a);
  const y = oid(b);
  if (!x || !y) return false;
  const row = await Block.exists({
    $or: [
      { blocker: x, blocked: y },
      { blocker: y, blocked: x },
    ],
  });
  return !!row;
}

async function blockUser(blocker, blocked) {
  const x = oid(blocker);
  const y = oid(blocked);
  if (!x || !y) throw new BlockError(400, 'INVALID_ID', 'Invalid user id');
  if (String(x) === String(y)) throw new BlockError(400, 'SELF_BLOCK', 'You cannot block yourself');

  const res = await Block.updateOne(
    { blocker: x, blocked: y },
    { $setOnInsert: { blocker: x, blocked: y, createdAt: new Date() } },
    { upsert: true }
  );
  const created = !!(res.upsertedCount || res.upsertedId);

  const [reqRes, shortRes] = await Promise.all([
    FriendShipRequest.deleteMany({
      status: 'pending',
      $or: [
        { requester: x, recipient: y },
        { requester: y, recipient: x },
      ],
    }),
    Shortlist.deleteMany({
      $or: [
        { userId: x, shortlistedUserId: y },
        { userId: y, shortlistedUserId: x },
      ],
    }),
  ]);

  return {
    created,
    removedRequests: reqRes.deletedCount || 0,
    removedShortlists: shortRes.deletedCount || 0,
  };
}

async function unblockUser(blocker, blocked) {
  const x = oid(blocker);
  const y = oid(blocked);
  if (!x || !y) throw new BlockError(400, 'INVALID_ID', 'Invalid user id');
  return Block.findOneAndDelete({ blocker: x, blocked: y }).lean();
}

module.exports = {
  BlockError,
  getBlockedIds,
  getBlockedIdSet,
  isBlockedEither,
  blockUser,
  unblockUser,
};
