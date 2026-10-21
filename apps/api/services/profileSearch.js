'use strict';
/**
 * services/profileSearch.js — the searchProfiles core (feature expansion A2),
 * shared by POST /api/searchProfiles and POST /api/runSavedSearch, and by the
 * saved-search alert job (count of new matches).
 *
 *   filterClauses(filters)                       app `filters` -> Mongo clauses (A6.4)
 *   buildSearchQuery(currentUser, opts)          -> query | null (viewer has no usable gender)
 *       opts: { filters, isVerify, recentlyActive, excludeConnections = true, createdAfter }
 *   runSearch(currentUser, opts)                 -> { rows, total, page, limit, noGender }
 *       opts: buildSearchQuery opts + { sortByNewUsers, nearby, lat, lng, maxDistanceKm, page, limit }
 *       rows are lean, populated, with `age` and `isJustJoined` added (the
 *       caller serializes them for the viewer).
 *
 * Nothing runs at require time.
 */
const User = require('../models/User');
const FriendShipRequest = require('../models/FriendShipRequest');
const mq = require('./matchQuery');
const blocks = require('./blocks');
const { getSettings } = require('./settingsCache');
const { PUBLIC_USER_SELECT } = require('./profileSerializer');
const { MARITAL_STATUS_ENUM } = require('../enum/enum');

const SEARCH_POPULATE =
  'location.country location.state location.city caste gotra profession qualification incomeRange family.basedOut.city family.basedOut.state family.basedOut.country';
const GEO_PROJECT = { password: 0, device_token: 0, firebase_uid: 0, coordinates: 0, blocked: 0, role: 0, login_type: 0, device_type: 0, personalityMap: 0, is_block: 0, tokenVersion: 0, block_reason: 0 };

function toBoolFlag(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

/**
 * Build the Mongo clauses for the app's `filters` object (A6.4): every
 * filter runs in the database, ids are validated, `income` maps to the
 * incomeRange reference the schema really has.
 */
function filterClauses(filters) {
  const f = filters && typeof filters === 'object' ? filters : {};
  const out = [];
  if (f.age_range) out.push(mq.ageRangeToDobFilter(f.age_range.min, f.age_range.max));
  if (f.height_range) out.push(mq.heightFilter(f.height_range.min, f.height_range.max));
  if (f.marital_status) out.push(mq.enumInFilter('maritalStatus', f.marital_status, MARITAL_STATUS_ENUM));
  out.push(mq.idInFilter('caste', f.caste));
  out.push(mq.idInFilter('gotra', f.gotra));
  out.push(mq.idInFilter('qualification', f.qualification));
  out.push(mq.idInFilter('profession', f.profession));
  out.push(mq.idInFilter('incomeRange', f.income || f.incomeRange));
  return out.filter(Boolean);
}

async function buildSearchQuery(currentUser, opts = {}) {
  const userId = String(currentUser._id);
  const { filters = {}, isVerify = false, recentlyActive = false, excludeConnections = true, createdAfter = null } = opts;

  // Exclude blocked (both ways) and anyone already connected / requested
  const blockedIds = await blocks.getBlockedIds(userId);
  let excludeIds = [];
  if (excludeConnections) {
    const connections = await FriendShipRequest.find({ $or: [{ requester: userId }, { recipient: userId }] })
      .select('requester recipient')
      .lean();
    excludeIds = connections.map((r) => (String(r.requester) === userId ? r.recipient : r.requester));
  }

  const base = mq.buildMatchQuery(currentUser, await getSettings(), { blockedIds, excludeIds });
  if (!base) return null;

  const clauses = filterClauses(filters);
  if (isVerify) clauses.push({ is_verified: 1 });
  if (recentlyActive) clauses.push({ lastSeen: { $gte: new Date(Date.now() - 48 * 3600 * 1000) } });
  if (createdAfter) clauses.push({ createdAt: { $gt: new Date(createdAfter) } });
  return mq.mergeQuery(base, ...clauses);
}

async function runSearch(currentUser, opts = {}) {
  const { page, limit, skip } = mq.clampPage(opts.page, opts.limit);
  const query = await buildSearchQuery(currentUser, opts);
  if (!query) return { rows: [], total: 0, page, limit, noGender: true };

  const lat = Number(opts.lat);
  const lng = Number(opts.lng);
  const maxDistanceKm = Math.min(5000, Math.max(1, Number(opts.maxDistanceKm) || 50));

  let rows;
  let total;
  if (opts.nearby && Number.isFinite(lat) && Number.isFinite(lng)) {
    await User.init(); // 2dsphere index must exist before $geoNear (first call only)
    const [agg] = await User.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceInMeters',
          spherical: true,
          maxDistance: maxDistanceKm * 1000,
          key: 'coordinates',
          query,
        },
      },
      { $addFields: { distanceKm: { $round: [{ $divide: ['$distanceInMeters', 1000] }, 2] } } },
      { $project: GEO_PROJECT },
      { $facet: { rows: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'n' }] } },
    ]);
    total = (agg && agg.total[0] && agg.total[0].n) || 0;
    rows = await User.populate(agg ? agg.rows : [], SEARCH_POPULATE.split(' ').map((path) => ({ path })));
  } else {
    // Stable sort: online/recently active first, then verified, newest (no premium bonus, A6.14)
    const sort = opts.sortByNewUsers
      ? { createdAt: -1, _id: -1 }
      : { isOnline: -1, is_verified: -1, lastSeen: -1, createdAt: -1, _id: -1 };
    [rows, total] = await Promise.all([
      User.find(query).select(PUBLIC_USER_SELECT).sort(sort).skip(skip).limit(limit).populate(SEARCH_POPULATE).lean(),
      User.countDocuments(query),
    ]);
  }

  const now = Date.now();
  const decorated = rows.map((u) => {
    const daysSinceSignup = (now - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return { ...u, age: mq.calculateAge(u.dob), isJustJoined: daysSinceSignup < 7 };
  });

  return { rows: decorated, total, page, limit, noGender: false };
}

module.exports = { filterClauses, buildSearchQuery, runSearch, toBoolFlag, SEARCH_POPULATE };
