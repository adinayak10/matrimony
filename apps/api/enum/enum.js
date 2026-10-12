// enums/enum.js

// 🧑 Gender
exports.GENDER_ENUM = ['Male', 'Female', 'Not specified'];

// 💍 Marital Status
exports.MARITAL_STATUS_ENUM = ['Single', 'Divorced', 'Widowed', 'Never Married'];
exports.MARITAL_STATUS_PREFERENCE_ENUM = ['Never Married', 'Divorced', 'Widowed'];

// 👨‍👩‍👧‍👦 Family-related
exports.FAMILY_TYPE_ENUM = ['Joint', 'Nuclear', 'Extended', 'Others', 'Not specified'];
exports.FAMILY_STATUS_ENUM = ['Middle Class', 'Upper Middle Class', 'Affluent', 'Rich', 'Not specified'];
exports.FAMILY_VALUES_ENUM = ['Traditional', 'Moderate', 'Liberal', 'Not specified'];

// 🧑‍💼 Occupation (for Father/Mother - now deprecated, use Profession model instead)
exports.OCCUPATION_ENUM = [
    'Not specified',
  'Private Job',
  'Government Job',
  'Business',
  'Self-Employed',
  'Farmer',
  'Doctor',
  'Engineer',
  'Teacher',
  'Student',
  'Retired',
  'Homemaker',       // ✅ for housewife
  'Unemployed',
  'Other'

];

// 🍽 Diet
exports.DIET_ENUM = [
  'Vegetarian',
  'Non-Vegetarian',
  'Eggetarian',
  'Vegan',
  'Occasionally Non-Veg',
  'Not specified'
];
exports.DIET_PREFERENCE_ENUM = [
  'Vegetarian',
  'Non-Vegetarian',
  'Eggetarian',
  'Vegan',
  'Occasionally Non-Veg',
  'Any'
];

// 🚬 Smoking
exports.SMOKING_ENUM = ['Yes', 'No', 'Occasionally', 'Not specified'];
exports.SMOKING_PREFERENCE_ENUM = ['Yes', 'No', 'Occasionally', 'Any'];

// 🍷 Drinking
exports.DRINKING_ENUM = ['Yes', 'No', 'Occasionally', 'Not specified'];
exports.DRINKING_PREFERENCE_ENUM = ['Yes', 'No', 'Occasionally', 'Any'];

// 🕉️ Spiritual Belief
exports.SPIRITUAL_BELIEF_ENUM = [
  'Atheist',
  'Spiritual',
  'Very Religious',
  'Occasionally Religious',
  'Not specified'
];

// 🧘 Manglik Status
exports.MANGLIK_STATUS_ENUM = ['Yes', 'No', 'Partial', 'Not specified'];
exports.MANGLIK_PREFERENCE_ENUM = ['Yes', 'No', 'Partial', 'Don\'t Know', 'Any'];

// 🧬 Physical Attributes
exports.COMPLEXION_ENUM = ['Fair', 'Wheatish', 'Dark', 'Very Fair', 'Not specified'];
exports.BODY_TYPE_ENUM = ['Slim', 'Average', 'Athletic', 'Heavy', 'Not specified'];
exports.BODY_TYPE_PREFERENCE_ENUM = ['Slim', 'Average', 'Athletic', 'Heavy', 'Any'];
exports.DISABILITY_ENUM = ['None', 'Physical', 'Visual', 'Hearing', 'Other', 'Not specified'];

// 🏠 Residency
exports.VISA_STATUS_ENUM = ['Citizen', 'Permanent Resident', 'Work Permit', 'Student Visa', 'Other', 'Not specified'];
exports.RESIDENCY_STATUS_ENUM = ['Living in India', 'NRI', 'OCI', 'PIO', 'Other', 'Not specified'];

// ⚙️ Privacy Settings
exports.PROFILE_PIC_VISIBILITY_ENUM = ['everyone', 'onlyPremium', 'onlyAccepted', 'nobody'];
exports.ALLOW_CONNECTIONS_ENUM = ['everyone', 'onlyPremium', 'onlyAccepted', 'nobody'];
exports.ALLOW_MESSAGES_ENUM = ['everyone', 'onlyAccepted', 'nobody'];
exports.EMAIL_VISIBILITY_ENUM = ['public', 'private'];
exports.MOBILE_VISIBILITY_ENUM = ['public', 'private'];

// 💖 Partner Preferences
exports.PERSONAL_VALUE_ENUM = ['Traditional', 'Moderate', 'Liberal', 'Any'];

