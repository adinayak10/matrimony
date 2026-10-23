const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  version: String,
  appName: String,
  setRoomUsersLimit: Number,
  minuteLimitInCreatingStory: Number,
  maxImagesCanBeUploadedInOnePost: Number,
  adBannerAndroid: String,
  adInterstitialAndroid: String,
  isAdmobOn: Boolean,
  termsUrl: {
    type: String,
    default: 'https://www.banjaramatch.com/terms-conditions'
  },
  privacyPolicyUrl: {
    type: String,
    default: 'https://www.banjaramatch.com/privacy-policy'
  },
  helpUrl: {
    type: String,
    default: 'https://www.banjaramatch.com'
  },

  // APK Management Fields (only PUT /api/admin/apk/* may change these)
  apk: {
    versionName: {
      type: String,
      default: '1.0.0'
    },
    versionCode: {
      type: Number,
      default: 1
    },
    fileName: {
      type: String,
      default: ''
    },
    filePath: {
      type: String,
      default: ''
    },
    fileSize: {
      type: Number, // Size in bytes
      default: 0
    },
    releaseNotes: {
      type: String,
      default: ''
    },
    isMandatoryUpdate: {
      type: Boolean,
      default: false
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  // Matching rules (A6.1): exclude the viewer's own and mother's gotra
  matching: {
    enforceGotraExogamy: { type: Boolean, default: true }
  },

  // Socket sunset switch (A5.1): while true, clients without a handshake
  // token may still bind with join(userId). Flip to false only after the
  // auth-aware app build is mandatory and legacy_socket_join logs reach zero.
  security: {
    legacySocketJoin: { type: Boolean, default: true }
  },

  // Interest rules (A6.3)
  limits: {
    interestDailyCap: { type: Number, default: 20 }
  },

  // Biodata maker (docs/plans/02-biodata-maker.md). Read through
  // services/biodataService.settings(), which applies these same defaults
  // when the stored document predates the fields.
  biodata: {
    enabled: { type: Boolean, default: true },
    guestDownloads: { type: Boolean, default: true },
    maxPerUser: { type: Number, default: 10, min: 1, max: 50 },
    languages: { type: [String], default: () => ['en', 'hi'] },
    shareDefaultDays: { type: Number, default: 30, min: 1, max: 365 }
  }
});

module.exports = mongoose.model('Setting', settingSchema);
