// Admin Banner Management Controller
const mongoose = require('mongoose');
const Banner = require('../../models/Banner');
const { record: audit } = require('../../services/auditLog');

const ALLOW = ['title', 'imageUrl', 'link', 'isActive', 'order', 'type'];
function pick(body) {
  const out = {};
  for (const k of ALLOW) if (body && body[k] !== undefined) out[k] = body[k];
  if (out.order !== undefined) out.order = Number(out.order) || 0;
  if (out.isActive !== undefined) out.isActive = out.isActive === true || out.isActive === 'true';
  for (const k of ['title', 'imageUrl', 'link', 'type']) if (typeof out[k] === 'string') out[k] = out[k].trim().slice(0, 500);
  return out;
}

/**
 * Get all banners
 */
exports.getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });

    res.json({
      status: true,
      data: banners
    });
  } catch (error) {
    console.error('Get all banners error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get single banner
 */
exports.getBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({ status: false, message: 'Banner not found' });
    }

    res.json({
      status: true,
      data: banner
    });
  } catch (error) {
    console.error('Get banner error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Create new banner
 */
exports.createBanner = async (req, res) => {
  try {
    const { title, imageUrl, link, isActive, order, type } = req.body;

    const banner = new Banner({
      title,
      imageUrl,
      link,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
      type: type || 'general'
    });

    await banner.save();
    audit(req, 'banner.create', { type: 'banner', id: banner._id }, { after: pick(req.body) });

    res.json({
      status: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Update banner
 */
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ status: false, message: 'Banner not found' });
    const updates = pick(req.body);

    const banner = await Banner.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ status: false, message: 'Banner not found' });
    }
    audit(req, 'banner.update', { type: 'banner', id }, { after: updates });

    res.json({
      status: true,
      message: 'Banner updated successfully',
      data: banner
    });
  } catch (error) {
    console.error('Update banner error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Delete banner
 */
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ status: false, message: 'Banner not found' });
    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({ status: false, message: 'Banner not found' });
    }
    audit(req, 'banner.delete', { type: 'banner', id }, { before: banner.toObject() });

    res.json({
      status: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Toggle banner active status
 */
exports.toggleBannerStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({ status: false, message: 'Banner not found' });
    }

    banner.isActive = !banner.isActive;
    await banner.save();
    audit(req, 'banner.toggle', { type: 'banner', id }, { after: { isActive: banner.isActive } });

    res.json({
      status: true,
      message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
      data: banner
    });
  } catch (error) {
    console.error('Toggle banner status error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};
