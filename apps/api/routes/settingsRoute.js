const express = require('express');
const router = express.Router();
const Setting = require('../models/settings');
const fs = require('fs');
const path = require('path');

const settingsController = require('../controllers/settingsController');

// Settings Routes
router.post('/fetchSetting', settingsController.fetchSetting);
router.put('/updateSettings', settingsController.updateSettings);

// Document Type Routes
router.post('/documentTypes', settingsController.addDocumentType);
router.put('/documentTypes/:id', settingsController.updateDocumentType);
router.delete('/documentTypes/:id', settingsController.deleteDocumentType);

// Report Reason Routes
router.post('/reportReasons', settingsController.addReportReason);
router.put('/reportReasons/:id', settingsController.updateReportReason);
router.delete('/reportReasons/:id', settingsController.deleteReportReason);

// Public APK Download Route
router.get('/download-apk', async (req, res) => {
  try {
    const settings = await Setting.findOne();
    
    if (!settings || !settings.apk || !settings.apk.filePath) {
      return res.status(404).json({ 
        success: false, 
        message: 'APK file not found. Please contact admin.' 
      });
    }
    
    const filePath = path.join(__dirname, '..', settings.apk.filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'APK file not found on server.' 
      });
    }
    
    // Increment download count
    settings.apk.downloadCount = (settings.apk.downloadCount || 0) + 1;
    await settings.save();
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${settings.apk.fileName}"`);
    res.setHeader('Content-Length', settings.apk.fileSize);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming APK file:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error downloading file' });
      }
    });
    
  } catch (error) {
    console.error('Download APK error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
