const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const Setting = require('../models/settings');
const blogController = require('../controllers/admin/blogController');
const apkUpload = require('../middleware/apkUpload');
const fs = require('fs');
const path = require('path');
const { invalidate: invalidateSettings } = require('../services/settingsCache');
const { record: audit } = require('../services/auditLog');

// APK files live only here; any stored path is reduced to its basename and
// must resolve inside this directory before it is unlinked (A4.3).
const APK_DIR = path.resolve(__dirname, '..', 'uploads', 'apk');
function resolveApkFile(apk) {
  if (!apk) return null;
  const name = path.basename(apk.fileName || path.basename(apk.filePath || ''));
  if (!name || name === '.' || name === '..') return null;
  const file = path.resolve(APK_DIR, name);
  return file.startsWith(APK_DIR + path.sep) ? file : null;
}
function unlinkApkQuiet(file) {
  if (!file) return false;
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      return true;
    }
  } catch (err) {
    console.error('❌ Error deleting APK:', err.message);
  }
  return false;
}

// NOTE: this file previously duplicated /users, /banners, a generic constants
// CRUD factory, and /stats/overview from routes/admin.js, guarded by a fake
// adminAuth that only checked a token was *present* (never verified the JWT
// or admin role). Since index.js mounts routes/admin.js first, those
// duplicates were already unreachable (shadowed) or confirmed unused by the
// live admin panel — removed outright. What remains below (/blogs*, /apk/*)
// is the part actually used by admin.banjaramatch.com, now behind the same
// real adminAuth (JWT + role check) that routes/admin.js uses.

// ==================== BLOG MANAGEMENT ====================

// IMPORTANT: Specific routes MUST come before parameterized routes (:id)

// Get blog statistics (must be before /:id)
router.get('/blogs/stats', adminAuth, blogController.getBlogStats);

// Get all blogs with filters
router.get('/blogs', adminAuth, blogController.getAllBlogs);

// Get single blog by ID
router.get('/blogs/:id', adminAuth, blogController.getBlogById);

// Create new blog
router.post('/blogs', adminAuth, blogController.upload.single('featuredImage'), blogController.createBlog);

// Update blog
router.put('/blogs/:id', adminAuth, blogController.upload.single('featuredImage'), blogController.updateBlog);

// Delete blog
router.delete('/blogs/:id', adminAuth, blogController.deleteBlog);

// Toggle featured status
router.patch('/blogs/:id/featured', adminAuth, blogController.toggleFeatured);

// Update blog status (publish/draft/archive)
router.patch('/blogs/:id/status', adminAuth, blogController.updateStatus);

// ==================== APK MANAGEMENT ====================

// Upload APK and update version info
router.post('/apk/upload', adminAuth, apkUpload.single('apkFile'), apkUpload.validateApk, async (req, res) => {
  try {
    const { versionName, versionCode, releaseNotes, isMandatoryUpdate } = req.body;
    
    // Validate required fields
    if (!versionName || !versionCode) {
      // Remove uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Version name and version code are required' 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'APK file is required' 
      });
    }
    
    // Get settings document
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }
    
    // Delete old APK file if exists (basename under uploads/apk only)
    if (settings.apk?.fileName || settings.apk?.filePath) {
      const oldFile = resolveApkFile(settings.apk);
      if (oldFile && oldFile !== path.resolve(req.file.path) && unlinkApkQuiet(oldFile)) {
        console.log('✅ Old APK file deleted');
      }
    }
    
    // Update APK details in settings
    settings.apk = {
      versionName: versionName,
      versionCode: parseInt(versionCode),
      fileName: req.file.filename,
      filePath: `/uploads/apk/${req.file.filename}`,
      fileSize: req.file.size,
      releaseNotes: releaseNotes || '',
      isMandatoryUpdate: isMandatoryUpdate === 'true' || isMandatoryUpdate === true,
      downloadCount: 0,
      lastUpdated: new Date()
    };
    
    await settings.save();
    invalidateSettings();
    audit(req, 'apk.upload', { type: 'apk', id: settings._id }, { after: { versionName: settings.apk.versionName, versionCode: settings.apk.versionCode, fileName: settings.apk.fileName, fileSize: settings.apk.fileSize, isMandatoryUpdate: settings.apk.isMandatoryUpdate } });
    
    res.json({ 
      success: true, 
      message: 'APK uploaded successfully',
      data: {
        versionName: settings.apk.versionName,
        versionCode: settings.apk.versionCode,
        fileName: settings.apk.fileName,
        fileSize: settings.apk.fileSize,
        releaseNotes: settings.apk.releaseNotes,
        isMandatoryUpdate: settings.apk.isMandatoryUpdate,
        lastUpdated: settings.apk.lastUpdated
      }
    });
  } catch (error) {
    console.error('APK upload error:', error);
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error cleaning up file:', err);
      }
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get current APK info
router.get('/apk/info', adminAuth, async (req, res) => {
  try {
    const settings = await Setting.findOne();
    
    if (!settings || !settings.apk) {
      return res.json({ 
        success: true, 
        data: null,
        message: 'No APK uploaded yet'
      });
    }
    
    res.json({ 
      success: true, 
      data: {
        versionName: settings.apk.versionName,
        versionCode: settings.apk.versionCode,
        fileName: settings.apk.fileName,
        filePath: settings.apk.filePath,
        fileSize: settings.apk.fileSize,
        releaseNotes: settings.apk.releaseNotes,
        isMandatoryUpdate: settings.apk.isMandatoryUpdate,
        downloadCount: settings.apk.downloadCount,
        lastUpdated: settings.apk.lastUpdated
      }
    });
  } catch (error) {
    console.error('Get APK info error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update APK metadata (without uploading new file)
router.put('/apk/update-info', adminAuth, async (req, res) => {
  try {
    const { versionName, versionCode, releaseNotes, isMandatoryUpdate } = req.body;
    
    const settings = await Setting.findOne();
    if (!settings || !settings.apk) {
      return res.status(404).json({ 
        success: false, 
        message: 'No APK found. Please upload an APK first.' 
      });
    }
    
    // Update version info if provided
    if (versionName !== undefined && versionName.trim() !== '') {
      settings.apk.versionName = versionName.trim();
    }
    
    if (versionCode !== undefined && !isNaN(versionCode)) {
      settings.apk.versionCode = parseInt(versionCode);
    }
    
    if (releaseNotes !== undefined) {
      settings.apk.releaseNotes = releaseNotes;
    }
    
    if (isMandatoryUpdate !== undefined) {
      settings.apk.isMandatoryUpdate = isMandatoryUpdate;
    }
    
    // Update last updated timestamp
    settings.apk.lastUpdated = new Date();
    
    await settings.save();
    invalidateSettings();
    audit(req, 'apk.updateInfo', { type: 'apk', id: settings._id }, { after: { versionName: settings.apk.versionName, versionCode: settings.apk.versionCode, isMandatoryUpdate: settings.apk.isMandatoryUpdate } });
    
    res.json({ 
      success: true, 
      message: 'APK info updated successfully',
      data: settings.apk
    });
  } catch (error) {
    console.error('Update APK info error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete APK
router.delete('/apk/delete', adminAuth, async (req, res) => {
  try {
    const settings = await Setting.findOne();
    
    if (!settings || !settings.apk || !settings.apk.filePath) {
      return res.status(404).json({ 
        success: false, 
        message: 'No APK found' 
      });
    }
    
    // Delete physical file (basename under uploads/apk only)
    if (unlinkApkQuiet(resolveApkFile(settings.apk))) {
      console.log('✅ APK file deleted');
    }
    
    // Reset APK data in settings
    settings.apk = {
      versionName: '1.0.0',
      versionCode: 1,
      fileName: '',
      filePath: '',
      fileSize: 0,
      releaseNotes: '',
      isMandatoryUpdate: false,
      downloadCount: 0,
      lastUpdated: new Date()
    };
    
    await settings.save();
    invalidateSettings();
    audit(req, 'apk.delete', { type: 'apk', id: settings._id });
    
    res.json({ 
      success: true, 
      message: 'APK deleted successfully'
    });
  } catch (error) {
    console.error('Delete APK error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


module.exports = router;
