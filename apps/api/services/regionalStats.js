'use strict';
/**
 * services/regionalStats.js — real member counts for regional pages (D22).
 *
 * Counts come from the User fields that exist (location.state / location.city,
 * is_block, is_verified, gender); the old isActive/isVerified fields never
 * existed so every stored stat was 0, and the 0.05/0.15 "success stories"
 * multipliers were fabricated. Nothing here is estimated.
 *
 * getStateStats(stateId) / getCityStats(cityId) -> cached 1 h per id.
 * getStateGotraDistribution / getStateProfessionDistribution (D47): only
 * returned when the region has >= 25 members and every bucket >= 5.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const City = require('../models/City');

const TTL_MS = 60 * 60 * 1000;
const MIN_MEMBERS_FOR_DISTRIBUTION = 25;
const MIN_BUCKET = 5;
const cache = new Map();

function oid(v) {
  const raw = v && typeof v === 'object' && v._id !== undefined ? v._id : v;
  if (!mongoose.isValidObjectId(raw)) return null;
  return new mongoose.Types.ObjectId(String(raw));
}

function cached(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  return undefined;
}

function remember(key, value) {
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function countsFor(locationField, id) {
  const base = { [locationField]: id, is_block: { $ne: 1 } };
  const [totalMembers, activeBrides, activeGrooms, verifiedProfiles] = await Promise.all([
    User.countDocuments(base),
    User.countDocuments({ ...base, gender: 'Female' }),
    User.countDocuments({ ...base, gender: 'Male' }),
    User.countDocuments({ ...base, is_verified: 1 }),
  ]);
  return { totalMembers, activeBrides, activeGrooms, verifiedProfiles };
}

async function getStateStats(stateId, { fresh = false } = {}) {
  const id = oid(stateId);
  const empty = { totalMembers: 0, activeBrides: 0, activeGrooms: 0, verifiedProfiles: 0, totalCities: 0, lastUpdated: new Date() };
  if (!id) return empty;
  const key = `state:${id}`;
  if (!fresh) {
    const hit = cached(key);
    if (hit) return hit;
  }
  try {
    const [counts, totalCities] = await Promise.all([
      countsFor('location.state', id),
      City.countDocuments({ state: id }),
    ]);
    return remember(key, { ...counts, totalCities, lastUpdated: new Date() });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[regionalStats] state stats failed:', err.message);
    return empty;
  }
}

async function getCityStats(cityId, { fresh = false } = {}) {
  const id = oid(cityId);
  const empty = { totalMembers: 0, activeBrides: 0, activeGrooms: 0, verifiedProfiles: 0, lastUpdated: new Date() };
  if (!id) return empty;
  const key = `city:${id}`;
  if (!fresh) {
    const hit = cached(key);
    if (hit) return hit;
  }
  try {
    const counts = await countsFor('location.city', id);
    return remember(key, { ...counts, lastUpdated: new Date() });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[regionalStats] city stats failed:', err.message);
    return empty;
  }
}

/**
 * Distribution of a ref field (gotra | profession) for a region, with the
 * D47 thresholds. Returns [] when the thresholds are not met.
 */
async function getDistribution(locationField, regionId, field, collection) {
  const id = oid(regionId);
  if (!id) return [];
  const key = `dist:${locationField}:${id}:${field}`;
  const hit = cached(key);
  if (hit) return hit;
  try {
    const total = await User.countDocuments({ [locationField]: id, is_block: { $ne: 1 } });
    if (total < MIN_MEMBERS_FOR_DISTRIBUTION) return remember(key, []);
    const rows = await User.aggregate([
      { $match: { [locationField]: id, is_block: { $ne: 1 }, [field]: { $ne: null } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $match: { count: { $gte: MIN_BUCKET } } },
      { $sort: { count: -1 } },
      { $limit: 12 },
      { $lookup: { from: collection, localField: '_id', foreignField: '_id', as: 'ref' } },
      { $unwind: '$ref' },
      { $project: { _id: 1, name: '$ref.name', count: 1 } },
    ]);
    return remember(key, rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[regionalStats] distribution failed:', err.message);
    return [];
  }
}

const getStateGotraDistribution = (stateId) => getDistribution('location.state', stateId, 'gotra', 'gotras');
const getStateProfessionDistribution = (stateId) => getDistribution('location.state', stateId, 'profession', 'professions');
const getCityGotraDistribution = (cityId) => getDistribution('location.city', cityId, 'gotra', 'gotras');
const getCityProfessionDistribution = (cityId) => getDistribution('location.city', cityId, 'profession', 'professions');

function invalidate() {
  cache.clear();
}

module.exports = {
  getStateStats,
  getCityStats,
  getStateGotraDistribution,
  getStateProfessionDistribution,
  getCityGotraDistribution,
  getCityProfessionDistribution,
  invalidate,
  TTL_MS,
  MIN_MEMBERS_FOR_DISTRIBUTION,
  MIN_BUCKET,
};
