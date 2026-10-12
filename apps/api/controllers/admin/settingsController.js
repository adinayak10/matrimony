// Admin Settings Management Controller
const Setting = require('../../models/settings');

/**
 * Get all settings
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne();

    if (!settings) {
      return res.status(404).json({ status: false, message: 'Settings not found' });
    }

    res.json({
      status: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Update settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    let settings = await Setting.findOne();

    if (!settings) {
      // Create if doesn't exist
      settings = new Setting(updates);
    } else {
      // Update existing
      Object.assign(settings, updates);
    }

    await settings.save();

    res.json({
      status: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};
