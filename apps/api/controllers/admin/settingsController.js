'use strict';
// Admin Settings Management Controller (A4.3 + integrator #16 allowlist)
const Setting = require('../../models/settings');
const { getSettings, invalidate } = require('../../services/settingsCache');
const { record: audit } = require('../../services/auditLog');

/**
 * Fields the admin settings page may change, with their expected type.
 * apk.* is NEVER settable here — only through PUT /api/admin/apk/update-info.
 * Nested fields must arrive as nested objects ({security:{legacySocketJoin:false}})
 * because express-mongo-sanitize strips dotted body keys; the server builds
 * the dot paths for $set itself.
 */
const ALLOWED = {
  appName: 'string',
  helpUrl: 'string',
  termsUrl: 'string',
  privacyPolicyUrl: 'string',
  setRoomUsersLimit: 'number',
  maxImagesCanBeUploadedInOnePost: 'number',
  minuteLimitInCreatingStory: 'number',
  isAdmobOn: 'boolean',
  adBannerAndroid: 'string',
  adInterstitialAndroid: 'string',
  'matching.enforceGotraExogamy': 'boolean',
  'security.legacySocketJoin': 'boolean',
  'limits.interestDailyCap': 'number',
};

function readPath(obj, dotted) {
  return dotted.split('.').reduce((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), obj);
}

function coerce(value, type) {
  if (type === 'string') return typeof value === 'string' ? value.trim().slice(0, 500) : undefined;
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    return undefined;
  }
  if (type === 'number') {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }
  return undefined;
}

/** Build the $set from an admin body; unknown/invalid fields are ignored. */
function buildSettingsUpdate(body) {
  const $set = {};
  const rejected = [];
  if (!body || typeof body !== 'object') return { $set, rejected };
  for (const [dotted, type] of Object.entries(ALLOWED)) {
    const raw = readPath(body, dotted);
    if (raw === undefined || raw === null) continue;
    const v = coerce(raw, type);
    if (v === undefined) rejected.push(dotted);
    else $set[dotted] = v;
  }
  if ($set['limits.interestDailyCap'] !== undefined) {
    $set['limits.interestDailyCap'] = Math.max(1, Math.min(500, Math.floor($set['limits.interestDailyCap'])));
  }
  return { $set, rejected };
}

/**
 * Get all settings
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await getSettings({ fresh: true });

    if (!settings) {
      return res.status(404).json({ status: false, message: 'Settings not found' });
    }

    res.json({ status: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * Update settings — allowlisted $set with dot paths (never apk.*)
 */
exports.updateSettings = async (req, res) => {
  try {
    const { $set, rejected } = buildSettingsUpdate(req.body);

    if (rejected.length) {
      return res.status(400).json({ status: false, message: `Invalid value for: ${rejected.join(', ')}` });
    }
    if (!Object.keys($set).length) {
      return res.status(400).json({ status: false, message: 'No updatable settings in request' });
    }

    const current = await Setting.findOne().sort({ _id: 1 }).select('_id').lean();
    let settings;
    if (current) {
      settings = await Setting.findByIdAndUpdate(current._id, { $set }, { new: true, runValidators: true }).lean();
    } else {
      settings = (await Setting.create({})).toObject();
      settings = await Setting.findByIdAndUpdate(settings._id, { $set }, { new: true, runValidators: true }).lean();
    }
    invalidate();
    audit(req, 'settings.update', { type: 'settings', id: settings && settings._id }, { after: $set });

    res.json({
      status: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    console.error('Update settings error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.ALLOWED_SETTINGS = ALLOWED;
exports.buildSettingsUpdate = buildSettingsUpdate;
