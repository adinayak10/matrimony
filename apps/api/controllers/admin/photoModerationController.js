const UserPhoto = require('../../models/UserPhoto');

/**
 * List photos in a given moderation state (default: pending), for admins who
 * choose to proactively review — not required for new uploads to go live,
 * since the schema default is 'approved' (see models/UserPhoto.js).
 */
exports.getPhotosByStatus = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 40 } = req.query;

    const query = status === 'all' ? {} : { moderationStatus: status };

    const total = await UserPhoto.countDocuments(query);
    const photos = await UserPhoto.find(query)
      .populate('userId', 'full_name email is_block')
      .populate('moderatedBy', 'full_name email')
      .sort('-uploadedAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      status: true,
      data: photos,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Admin getPhotosByStatus error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.approvePhoto = async (req, res) => {
  try {
    const photo = await UserPhoto.findByIdAndUpdate(
      req.params.id,
      { moderationStatus: 'approved', moderatedBy: req.userId, moderatedAt: new Date(), rejectionReason: undefined },
      { new: true }
    );
    if (!photo) return res.status(404).json({ status: false, message: 'Photo not found' });
    res.json({ status: true, message: 'Photo approved', data: photo });
  } catch (error) {
    console.error('Admin approvePhoto error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.rejectPhoto = async (req, res) => {
  try {
    const { reason } = req.body;
    const photo = await UserPhoto.findByIdAndUpdate(
      req.params.id,
      { moderationStatus: 'rejected', moderatedBy: req.userId, moderatedAt: new Date(), rejectionReason: reason || '' },
      { new: true }
    );
    if (!photo) return res.status(404).json({ status: false, message: 'Photo not found' });
    res.json({ status: true, message: 'Photo rejected and hidden from the user\'s gallery', data: photo });
  } catch (error) {
    console.error('Admin rejectPhoto error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};
