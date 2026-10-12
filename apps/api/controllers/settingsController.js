const DocumentType = require('../models/documentType');
const ReportReason = require('../models/ReportReason');
const { getSettings } = require('../services/settingsCache');

// Fetch Settings (public: the app reads this before login)
const Room = require('../models/Room');
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

// Same shape as before, minus the server-side apk.filePath (A4.3).
function publicSettings(settings) {
  if (!settings) return {};
  const out = { ...settings };
  if (out.apk && typeof out.apk === 'object') {
    out.apk = { ...out.apk };
    delete out.apk.filePath;
  }
  return out;
}

exports.fetchSetting = async (req, res) => {
  try {
    const settings = await getSettings();
    const documentTypes = await DocumentType.find();
    const reportReasons = await ReportReason.find();
    const interests = await Interest.find();
    const incomeRanges = await IncomeRange.find().sort({ sortOrder: 1 });

    for (let i = 0; i < interests.length; i++) {
      const interest = interests[i];
      const roomsCount = await Room.countDocuments({
        'user.is_block': 0,
        is_private: 0,
        total_member: { $ne: settings?.setRoomUsersLimit },
        interest_ids: { $in: [interest._id] }
      });
      interest.totalRoomOfInterest = roomsCount;
    }

    res.status(200).json({
      status: true,
      message: 'Fetch Settings successfully',
      data: {
        settings: publicSettings(settings),
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
          downloadUrl: (settings?.apk?.fileName || settings?.apk?.filePath) ? `/api/download-apk` : null,
          fileSize: settings?.apk?.fileSize || 0,
          lastUpdated: settings?.apk?.lastUpdated || new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error in fetchSetting:', error.message);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
    });
  }
};

// The public updateSettings / documentTypes / reportReasons mutations were
// removed (A4.3). Admin equivalents: PUT /api/admin/settings and
// /api/admin/constants/report-reasons.
