const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const settingsController = require('../controllers/settingsController');
const { getSettings } = require('../services/settingsCache');
const Setting = require('../models/settings');

// Public: the app reads this before login (forced-update path)
router.post('/fetchSetting', settingsController.fetchSetting);

// The public PUT /updateSettings and the documentTypes / reportReasons
// mutations were removed (A4.3): the admin equivalents live under /api/admin.

// Public APK download. Only a basename under uploads/apk is ever served; the
// stored apk.filePath is never used for filesystem access (A4.3).
const APK_DIR = path.resolve(__dirname, '..', 'uploads', 'apk');

router.get('/download-apk', async (req, res) => {
  try {
    const settings = await getSettings();
    const apk = settings && settings.apk;
    const name = apk ? path.basename(apk.fileName || path.basename(apk.filePath || '')) : '';

    if (!name || name === '.' || name === '..') {
      return res.status(404).json({ success: false, message: 'APK file not found. Please contact admin.' });
    }

    const file = path.resolve(APK_DIR, name);
    if (!file.startsWith(APK_DIR + path.sep)) {
      return res.status(404).json({ success: false, message: 'APK file not found.' });
    }

    let stat;
    try {
      stat = await fs.promises.stat(file);
    } catch (_) {
      stat = null;
    }
    if (!stat || !stat.isFile()) {
      return res.status(404).json({ success: false, message: 'APK file not found on server.' });
    }

    // Download counter (fire-and-forget, never blocks the stream)
    if (req.method === 'GET') {
      Setting.updateOne({ _id: settings._id }, { $inc: { 'apk.downloadCount': 1 } }).catch(() => {});
    }

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/"/g, '')}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'HEAD') return res.end();

    const fileStream = fs.createReadStream(file);
    fileStream.on('error', (error) => {
      console.error('Error streaming APK file:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error downloading file' });
      } else {
        res.destroy();
      }
    });
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download APK error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
