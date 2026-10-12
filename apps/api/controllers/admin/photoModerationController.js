const mongoose = require('mongoose');
const UserPhoto = require('../../models/UserPhoto');
const User = require('../../models/User');
const { record: audit } = require('../../services/auditLog');

/**
 * List photos in a given moderation state (default: pending), for admins who
 * choose to proactively review — not required for new uploads to go live,
 * since the schema default is 'approved' (see models/UserPhoto.js).
 */
exports.getPhotosByStatus = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));

    const query = status === 'all' ? {} : ['pending', 'approved', 'rejected'].includes(status) ? { moderationStatus: status } : { moderationStatus: 'pending' };

    const [total, photos] = await Promise.all([
      UserPhoto.countDocuments(query),
      UserPhoto.find(query)
        .populate('userId', 'full_name email is_block profile')
        .populate('moderatedBy', 'full_name email')
        .sort('-uploadedAt')
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
    ]);

    res.json({
      status: true,
      data: photos,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Admin getPhotosByStatus error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.approvePhoto = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ status: false, message: 'Photo not found' });
    const photo = await UserPhoto.findByIdAndUpdate(
      req.params.id,
      { moderationStatus: 'approved', moderatedBy: req.userId, moderatedAt: new Date(), rejectionReason: undefined },
      { new: true }
    );
    if (!photo) return res.status(404).json({ status: false, message: 'Photo not found' });
    audit(req, 'photo.approve', { type: 'photo', id: req.params.id }, { after: { userId: String(photo.userId) } });
    res.json({ status: true, message: 'Photo approved', data: photo });
  } catch (error) {
    console.error('Admin approvePhoto error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.rejectPhoto = async (req, res) => {
  try {
    const { reason } = req.body || {};
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ status: false, message: 'Photo not found' });
    const photo = await UserPhoto.findByIdAndUpdate(
      req.params.id,
      { moderationStatus: 'rejected', moderatedBy: req.userId, moderatedAt: new Date(), rejectionReason: typeof reason === 'string' ? reason.slice(0, 500) : '', isProfile: false },
      { new: true }
    );
    if (!photo) return res.status(404).json({ status: false, message: 'Photo not found' });

    // C4.11 / A6.8: a rejected main photo stops being the profile image
    const owner = await User.findById(photo.userId).select('profile').lean();
    let profileCleared = false;
    if (owner && (photo.isProfile || (owner.profile && owner.profile === photo.imageUrl))) {
      await User.updateOne({ _id: photo.userId }, { $set: { profile: null } });
      profileCleared = true;
    }

    audit(req, 'photo.reject', { type: 'photo', id: req.params.id }, { after: { userId: String(photo.userId), reason: photo.rejectionReason, profileCleared } });
    res.json({ status: true, message: 'Photo rejected and hidden from the user\'s gallery', data: photo, profileCleared });
  } catch (error) {
    console.error('Admin rejectPhoto error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};
