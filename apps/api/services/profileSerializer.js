'use strict';
/**
 * services/profileSerializer.js — what a viewer may see of a user (A1.3).
 *
 * PUBLIC_USER_SELECT  mongoose select string for list queries.
 * serializeProfileFor(viewer, doc, { relation })
 *   viewer   id | ObjectId | lean user ({_id, role})  | null (anonymous)
 *   doc      mongoose doc or lean object (not mutated; a copy is returned)
 *   relation 'accepted' | 'pending' | 'rejected' | 'none' | undefined —
 *            the FriendShipRequest state between viewer and doc, used for
 *            profilePicVisibility === 'onlyAccepted'
 * resolveRelation(viewerId, otherId)       -> relation string (async)
 * resolveRelations(viewerId, otherIds)     -> Map(idString -> relation)
 * serializeMany(viewer, docs, relationMap) -> array
 *
 * Rules (extends applyPrivacySettings, UserController.js:29-49):
 *  self / admin viewer -> full document minus secrets
 *  others              -> secrets removed; email/phone null unless
 *                         settings.emailVisibility/mobileVisibility === 'public';
 *                         showLocation=false -> location.city, presentAddress,
 *                         permanentAddress, pinCode, coordinates dropped;
 *                         showIncome=false -> incomeRange, family.incomeRange
 *                         dropped; profilePicVisibility 'nobody' -> profile,
 *                         background_image null + photosHidden:true;
 *                         'onlyAccepted' -> same unless relation==='accepted';
 *                         'onlyPremium' collapses to 'everyone' (A6.14).
 */
const {
  PROFILE_PIC_VISIBILITY_ENUM,
  ALLOW_CONNECTIONS_ENUM,
  ALLOW_MESSAGES_ENUM,
  EMAIL_VISIBILITY_ENUM,
  MOBILE_VISIBILITY_ENUM,
} = require('../enum/enum');

const PUBLIC_USER_SELECT =
  '-password -device_token -firebase_uid -coordinates -blocked -role -login_type -device_type -personalityMap -is_block';

// Never leave the server for anyone, including self.
const SECRET_FIELDS = ['password', 'device_token', 'firebase_uid', '__v', 'blocked', 'personalityMap', 'tokenVersion'];
// Removed for every viewer other than self/admin.
const PRIVATE_FIELDS = ['role', 'login_type', 'device_type', 'is_block', 'is_push_notifications', 'is_invited_to_room', 'block_reason'];
// Settings keys another member may see (needed by clients to decide UI).
const PUBLIC_SETTINGS_KEYS = [
  'showLocation',
  'showIncome',
  'profilePicVisibility',
  'profilePicRequestRequired',
  'allowConnections',
  'allowMessages',
  'emailVisibility',
  'mobileVisibility',
];

function idOf(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v._id !== undefined) return String(v._id);
  return String(v);
}

function toPlain(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === 'function') return doc.toObject({ virtuals: false, getters: false });
  return doc;
}

/**
 * 'onlyPremium' -> 'everyone' (product is free, A6.14); unknown -> default.
 */
function effectiveVisibility(value, allowed, fallback) {
  if (value === 'onlyPremium') return 'everyone';
  return allowed.includes(value) ? value : fallback;
}

function stripSecrets(out) {
  for (const f of SECRET_FIELDS) delete out[f];
  return out;
}

function serializeProfileFor(viewer, doc, { relation } = {}) {
  const src = toPlain(doc);
  if (!src) return null;
  const out = { ...src };
  stripSecrets(out);

  const viewerId = idOf(viewer);
  const viewerIsAdmin = !!(viewer && typeof viewer === 'object' && viewer.role === 'admin');
  const isSelf = !!(viewerId && out._id && String(out._id) === viewerId);
  if (isSelf || viewerIsAdmin) return out;

  for (const f of PRIVATE_FIELDS) delete out[f];

  const settings = src.settings && typeof src.settings === 'object' ? src.settings : {};

  // Contact details
  const emailVis = effectiveVisibility(settings.emailVisibility, EMAIL_VISIBILITY_ENUM, 'private');
  const mobileVis = effectiveVisibility(settings.mobileVisibility, MOBILE_VISIBILITY_ENUM, 'private');
  if (emailVis !== 'public' && 'email' in out) out.email = null;
  if (mobileVis !== 'public') {
    if ('phone' in out) out.phone = null;
    if ('alternateContact' in out) out.alternateContact = '';
    if ('isOnWhatsapp' in out) out.isOnWhatsapp = false;
  }

  // Location
  if (settings.showLocation === false) {
    if (out.location && typeof out.location === 'object') {
      out.location = { ...out.location, city: null };
    }
    if ('presentAddress' in out) out.presentAddress = '';
    if ('permanentAddress' in out) out.permanentAddress = '';
    if ('pinCode' in out) out.pinCode = '';
    delete out.coordinates;
  }

  // Income
  if (settings.showIncome === false) {
    if ('incomeRange' in out) out.incomeRange = null;
    if (out.family && typeof out.family === 'object') {
      out.family = { ...out.family, incomeRange: null };
    }
  }

  // Photos
  const picVis = effectiveVisibility(settings.profilePicVisibility, PROFILE_PIC_VISIBILITY_ENUM, 'everyone');
  let hidePhotos = false;
  if (picVis === 'nobody') hidePhotos = true;
  else if (picVis === 'onlyAccepted') hidePhotos = relation !== 'accepted';
  if (hidePhotos) {
    out.profile = null;
    out.background_image = null;
    out.photosHidden = true;
  } else {
    out.photosHidden = false;
  }

  // Reduced settings object: other members only need the visibility flags.
  if (src.settings) {
    const pub = {};
    for (const k of PUBLIC_SETTINGS_KEYS) if (k in settings) pub[k] = settings[k];
    pub.profilePicVisibility = picVis;
    pub.allowConnections = effectiveVisibility(settings.allowConnections, ALLOW_CONNECTIONS_ENUM, 'everyone');
    pub.allowMessages = effectiveVisibility(settings.allowMessages, ALLOW_MESSAGES_ENUM, 'onlyAccepted');
    out.settings = pub;
  }

  // Notification tokens / raw preferences of others are not needed by the UI
  delete out.profileCompletion;

  return out;
}

/**
 * Minimal public card (blockUser/unblockUser/visitor lists).
 */
function serializeCard(doc) {
  const src = toPlain(doc);
  if (!src) return null;
  return {
    _id: src._id,
    full_name: src.full_name,
    profile: src.profile || null,
    is_verified: src.is_verified || 0,
    profileCreatedBy: src.profileCreatedBy || 'self',
  };
}

function unavailableCard(id) {
  return { _id: id, full_name: 'Unavailable', profile: null, unavailable: true };
}

/* ---------- relation helpers (async, FriendShipRequest) ---------- */

function FriendShipRequest() {
  // lazy so the serializer stays usable without a DB connection
  return require('../models/FriendShipRequest');
}

async function resolveRelation(viewerId, otherId) {
  const a = idOf(viewerId);
  const b = idOf(otherId);
  if (!a || !b || a === b) return 'self';
  const row = await FriendShipRequest()
    .findOne({
      $or: [
        { requester: a, recipient: b },
        { requester: b, recipient: a },
      ],
    })
    .select('status')
    .lean();
  return row && row.status ? row.status : 'none';
}

async function resolveRelations(viewerId, otherIds) {
  const a = idOf(viewerId);
  const ids = (otherIds || []).map(idOf).filter(Boolean);
  const map = new Map();
  if (!a || !ids.length) return map;
  const rows = await FriendShipRequest()
    .find({
      $or: [
        { requester: a, recipient: { $in: ids } },
        { requester: { $in: ids }, recipient: a },
      ],
    })
    .select('requester recipient status')
    .lean();
  for (const r of rows) {
    const other = String(r.requester) === a ? String(r.recipient) : String(r.requester);
    map.set(other, r.status || 'none');
  }
  return map;
}

function serializeMany(viewer, docs, relationMap) {
  return (docs || []).map((d) => {
    const id = idOf(d);
    const relation = relationMap && id ? relationMap.get(id) || 'none' : undefined;
    return serializeProfileFor(viewer, d, { relation });
  });
}

module.exports = {
  PUBLIC_USER_SELECT,
  SECRET_FIELDS,
  PRIVATE_FIELDS,
  serializeProfileFor,
  serializeCard,
  unavailableCard,
  resolveRelation,
  resolveRelations,
  serializeMany,
  effectiveVisibility,
  stripSecrets,
};
