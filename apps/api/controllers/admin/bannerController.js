// Admin Banner Management Controller
const Banner = require('../../models/Banner');
const upload = require('../../middleware/upload');

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
    const updates = req.body;

    const banner = await Banner.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ status: false, message: 'Banner not found' });
    }

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

    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({ status: false, message: 'Banner not found' });
    }

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
