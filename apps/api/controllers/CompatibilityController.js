const mongoose = require('mongoose');
const User = require('../models/User');
const blocks = require('../services/blocks');
const { resolveCaller } = require('../middleware/identity');
const { computeGunaMilan } = require('../utils/gunaMilanTable');

function verdictFor(result) {
  if (!result || !result.available || typeof result.percentage !== 'number') return null;
  if (result.percentage >= 75) return 'Excellent match';
  if (result.percentage >= 50) return 'Good match';
  if (result.percentage >= 25) return 'Average match';
  return 'Challenging match';
}

/**
 * POST /api/compatibility/guna-milan  (authenticate)
 * Body: { user_id }  — the viewer is the token user (a body my_user_id is
 * only compared and logged on mismatch, never trusted).
 * 400 bad id / self, 403 BLOCKED when either side blocked the other,
 * 404 when the other profile is missing or banned. Response shape unchanged.
 */
exports.getGunaMilan = async (req, res) => {
  try {
    const viewerId = resolveCaller(req);
    const { user_id } = req.body || {};

    if (!user_id || !mongoose.isValidObjectId(user_id)) {
      return res.status(400).json({ status: false, message: 'user_id is required' });
    }
    if (String(user_id) === String(viewerId)) {
      return res.status(400).json({ status: false, message: 'Choose another profile to compare with' });
    }
    if (await blocks.isBlockedEither(viewerId, user_id)) {
      return res.status(403).json({ status: false, code: 'BLOCKED', message: 'This profile is not available' });
    }

    const [viewer, profileOwner] = await Promise.all([
      User.findById(viewerId).select('horoscope manglikStatus').lean(),
      User.findById(user_id).select('horoscope manglikStatus is_block').lean(),
    ]);

    if (!viewer || !profileOwner || profileOwner.is_block === 1) {
      return res.status(404).json({ status: false, message: 'User(s) not found' });
    }

    const result = computeGunaMilan(viewer.horoscope, profileOwner.horoscope);

    return res.json({
      status: true,
      message: result.available ? 'Guna Milan calculated' : 'Not enough horoscope information on one or both profiles',
      data: {
        ...result,
        // additive aliases used by the feature-expansion clients (contract names)
        breakdown: (result.kootas || []).map((k) => ({ koota: k.name, points: k.points, max: k.max, label: k.label })),
        verdict: verdictFor(result),
        manglikStatus: {
          viewer: viewer.manglikStatus || 'Not specified',
          match: profileOwner.manglikStatus || 'Not specified',
        },
      },
    });
  } catch (err) {
    console.error('Guna Milan error:', err);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};
