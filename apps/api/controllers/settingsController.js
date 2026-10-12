const Setting = require('../models/settings');
const DocumentType = require('../models/documentType');
const ReportReason = require('../models/ReportReason');

// Fetch Settings
// Fetch Settings
const Room = require('../models/Room'); // Assuming you have a Room model
const Interest = require('../models/Interest');
const IncomeRange = require('../models/IncomeRange');
const {
  FAMILY_TYPE_ENUM,
  FAMILY_STATUS_ENUM,
  OCCUPATION_ENUM,
  DIET_ENUM,
  SMOKING_ENUM,
  DRINKING_ENUM,
  LIVING_WITH_FAMILY_ENUM,
  SPIRITUAL_BELIEF_ENUM
} = require('../enum/enum');

exports.fetchSetting = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    const documentTypes = await DocumentType.find();
    const reportReasons = await ReportReason.find();
    const interests = await Interest.find();
    const incomeRanges = await IncomeRange.find().sort({ sortOrder: 1 });

    for (let i = 0; i < interests.length; i++) {
      const interest = interests[i];
      const roomsCount = await Room.countDocuments({
        'user.is_block': 0,
        is_private: 0,
        total_member: { $ne: settings.setRoomUsersLimit },
        interest_ids: { $in: [interest._id] }
      });
      interest.totalRoomOfInterest = roomsCount;
    }

    res.status(200).json({
      status: true,
      message: 'Fetch Settings successfully',
      data: {
        settings: settings || {},
        documentTypes: documentTypes || [],
        reportReasons: reportReasons || [],
        interests: interests || [],
        incomeRanges: incomeRanges || [],
        familyTypes: FAMILY_TYPE_ENUM,
        familyStatus: FAMILY_STATUS_ENUM,
        occupations: OCCUPATION_ENUM,

        // ✅ Added Lifestyle Options
        dietOptions: DIET_ENUM,
        smokingOptions: SMOKING_ENUM,
        drinkingOptions: DRINKING_ENUM,
        livingOptions: LIVING_WITH_FAMILY_ENUM,
        spiritualOptions: SPIRITUAL_BELIEF_ENUM,

        // ✅ Legal & Support URLs
        termsUrl: settings?.termsUrl || 'https://www.banjaramatch.com/terms-conditions',
        privacyPolicyUrl: settings?.privacyPolicyUrl || 'https://www.banjaramatch.com/privacy-policy',
        helpUrl: settings?.helpUrl || 'https://www.banjaramatch.com',
        
        // ✅ APK Version Details
        apkVersion: {
          versionName: settings?.apk?.versionName || '1.0.0',
          versionCode: settings?.apk?.versionCode || 1,
          releaseNotes: settings?.apk?.releaseNotes || '',
          isMandatoryUpdate: settings?.apk?.isMandatoryUpdate || false,
          downloadUrl: settings?.apk?.filePath ? `/api/download-apk` : null,
          fileSize: settings?.apk?.fileSize || 0,
          lastUpdated: settings?.apk?.lastUpdated || new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error in fetchSetting:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};






// Update Settings
exports.updateSettings = async (req, res) => {
  try {
    const setting = await Setting.findOne();
    if (!setting) return res.status(404).json({ status: false, message: 'Settings not found' });

    Object.assign(setting, req.body);
    await setting.save();

    res.status(200).json({ status: true, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Document Type CRUD
exports.addDocumentType = async (req, res) => {
  try {
    const existing = await DocumentType.findOne({ title: req.body.title });
    if (existing) return res.status(400).json({ status: false, message: 'Duplicate Document Type' });

    const documentType = new DocumentType(req.body);
    await documentType.save();

    res.status(201).json({ status: true, message: 'Document Type added', data: documentType });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.updateDocumentType = async (req, res) => {
  try {
    const documentType = await DocumentType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!documentType) return res.status(404).json({ status: false, message: 'Document Type not found' });

    res.status(200).json({ status: true, message: 'Document Type updated', data: documentType });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.deleteDocumentType = async (req, res) => {
  try {
    const documentType = await DocumentType.findByIdAndDelete(req.params.id);
    if (!documentType) return res.status(404).json({ status: false, message: 'Document Type not found' });

    res.status(200).json({ status: true, message: 'Document Type deleted' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Report Reason CRUD
exports.addReportReason = async (req, res) => {
  try {
    const existing = await ReportReason.findOne({ title: req.body.title });
    if (existing) return res.status(400).json({ status: false, message: 'Duplicate Report Reason' });

    const reportReason = new ReportReason(req.body);
    await reportReason.save();

    res.status(201).json({ status: true, message: 'Report Reason added', data: reportReason });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.updateReportReason = async (req, res) => {
  try {
    const reportReason = await ReportReason.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reportReason) return res.status(404).json({ status: false, message: 'Report Reason not found' });

    res.status(200).json({ status: true, message: 'Report Reason updated', data: reportReason });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.deleteReportReason = async (req, res) => {
  try {
    const reportReason = await ReportReason.findByIdAndDelete(req.params.id);
    if (!reportReason) return res.status(404).json({ status: false, message: 'Report Reason not found' });

    res.status(200).json({ status: true, message: 'Report Reason deleted' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
