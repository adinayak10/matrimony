const User = require('../models/User');
const { computeGunaMilan } = require('../utils/gunaMilanTable');

/**
 * POST /api/compatibility/guna-milan
 * Body: { my_user_id, user_id }
 * Mirrors comparePreferencesFit's payload shape for consistency with the
 * rest of this app's compatibility endpoints.
 */
exports.getGunaMilan = async (req, res) => {
  try {
    const { my_user_id, user_id } = req.body;

    if (!my_user_id || !user_id) {
      return res.status(400).json({ status: false, message: 'Both my_user_id and user_id are required' });
    }

    const [viewer, profileOwner] = await Promise.all([
      User.findById(my_user_id).select('horoscope manglikStatus'),
      User.findById(user_id).select('horoscope manglikStatus'),
    ]);

    if (!viewer || !profileOwner) {
      return res.status(404).json({ status: false, message: 'User(s) not found' });
    }

    const result = computeGunaMilan(viewer.horoscope, profileOwner.horoscope);

    return res.json({
      status: true,
      message: result.available ? 'Guna Milan calculated' : 'Not enough horoscope information on one or both profiles',
      data: {
        ...result,
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
