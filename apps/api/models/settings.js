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
  
  // APK Management Fields
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
  }
});

module.exports = mongoose.model('Setting', settingSchema);
