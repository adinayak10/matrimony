// App-wide strings for the 1.1.0 feature expansion (owner: Mobile-B; the
// foundation agent added the shared-widget keys below).
//
// Rules (keep every language file compiling):
// * every key VALUE starts with "app_" so it can never collide with LKeys or
//   the match_/call_ feature files (non-Hindi language maps are `const`, and a
//   const map with two equal keys does not compile);
// * add each key to appStringsEn; add a Hindi translation to appStringsHi when
//   you have one (Hindi spreads En first, so missing Hindi keys fall back to English);
// * other languages get English automatically through the spread.
// Use with GetX: `AppKeys.retry.tr`, `AppKeys.percentMatch.trParams({'percent': '87'})`.

abstract class AppKeys {
  // shared widgets (foundation)
  static const emptyTitle = 'app_emptyTitle';
  static const emptyMessage = 'app_emptyMessage';
  static const retry = 'app_retry';
  static const seeAll = 'app_seeAll';
  static const loadingMore = 'app_loadingMore';
  static const somethingWentWrong = 'app_somethingWentWrong';
  static const uploadFailed = 'app_uploadFailed';

  /// "@percent% match" — use `.trParams({'percent': '87'})`.
  static const percentMatch = 'app_percentMatch';

  // status chips (StatusChip.forStatus)
  static const statusNone = 'app_statusNone';
  static const statusPending = 'app_statusPending';
  static const statusApproved = 'app_statusApproved';
  static const statusPublished = 'app_statusPublished';
  static const statusRejected = 'app_statusRejected';
  static const statusVerified = 'app_statusVerified';

  // drawer (Mobile-B)
  static const drawerProfile = 'app_drawerProfile';
  static const drawerViewProfile = 'app_drawerViewProfile';
  static const drawerDiscover = 'app_drawerDiscover';
  static const drawerSavedSearches = 'app_drawerSavedSearches';
  static const drawerCommunity = 'app_drawerCommunity';
  static const drawerSuccessStories = 'app_drawerSuccessStories';
  static const drawerActivity = 'app_drawerActivity';
  static const drawerCallHistory = 'app_drawerCallHistory';
  static const drawerMore = 'app_drawerMore';

  // settings (Mobile-B)
  static const settingsTitle = 'app_settingsTitle';
  static const settingsAccount = 'app_settingsAccount';
  static const settingsEditProfile = 'app_settingsEditProfile';
  static const settingsPartnerPreferences = 'app_settingsPartnerPreferences';
  static const settingsPhotos = 'app_settingsPhotos';
  static const settingsVerification = 'app_settingsVerification';
  static const settingsPrivacySafety = 'app_settingsPrivacySafety';
  static const settingsPrivacy = 'app_settingsPrivacy';
  static const settingsPrivacyDesc = 'app_settingsPrivacyDesc';
  static const settingsNotifications = 'app_settingsNotifications';
  static const settingsNotificationsDesc = 'app_settingsNotificationsDesc';
  static const settingsApp = 'app_settingsApp';
  static const settingsCheckUpdates = 'app_settingsCheckUpdates';
  static const settingsHelp = 'app_settingsHelp';
  static const settingsHelpContact = 'app_settingsHelpContact';
  static const settingsLegal = 'app_settingsLegal';

  // privacy (Mobile-B)
  static const privacyTitle = 'app_privacyTitle';
  static const privacyProfileSection = 'app_privacyProfileSection';
  static const privacyPhotoVisibility = 'app_privacyPhotoVisibility';
  static const privacyShowLocation = 'app_privacyShowLocation';
  static const privacyShowLocationDesc = 'app_privacyShowLocationDesc';
  static const privacyShowIncome = 'app_privacyShowIncome';
  static const privacyShowIncomeDesc = 'app_privacyShowIncomeDesc';
  static const privacyContactSection = 'app_privacyContactSection';
  static const privacyAllowInterests = 'app_privacyAllowInterests';
  static const privacyAllowMessages = 'app_privacyAllowMessages';
  static const privacyContactDetailsSection = 'app_privacyContactDetailsSection';
  static const privacyEmailVisibility = 'app_privacyEmailVisibility';
  static const privacyMobileVisibility = 'app_privacyMobileVisibility';
  static const optionEveryone = 'app_optionEveryone';
  static const optionConnections = 'app_optionConnections';
  static const optionNobody = 'app_optionNobody';
  static const optionVisible = 'app_optionVisible';
  static const optionHidden = 'app_optionHidden';

  // notif (Mobile-B)
  static const notifSettingsTitle = 'app_notifSettingsTitle';
  static const notifAllow = 'app_notifAllow';
  static const notifAllowDesc = 'app_notifAllowDesc';
  static const notifNotifyMeSection = 'app_notifNotifyMeSection';
  static const notifInterests = 'app_notifInterests';
  static const notifInterestsDesc = 'app_notifInterestsDesc';
  static const notifMessages = 'app_notifMessages';
  static const notifMessagesDesc = 'app_notifMessagesDesc';
  static const notifVisits = 'app_notifVisits';
  static const notifVisitsDesc = 'app_notifVisitsDesc';
  static const notifOffHint = 'app_notifOffHint';

  // contact (Mobile-B)
  static const contactTitle = 'app_contactTitle';
  static const contactFaqTitle = 'app_contactFaqTitle';
  static const contactFaqSubtitle = 'app_contactFaqSubtitle';
  static const contactOpenFaq = 'app_contactOpenFaq';
  static const contactFormTitle = 'app_contactFormTitle';
  static const contactFormSubtitle = 'app_contactFormSubtitle';
  static const contactName = 'app_contactName';
  static const contactEmail = 'app_contactEmail';
  static const contactPhone = 'app_contactPhone';
  static const contactMessage = 'app_contactMessage';
  static const contactSend = 'app_contactSend';
  static const contactNameRequired = 'app_contactNameRequired';
  static const contactEmailInvalid = 'app_contactEmailInvalid';
  static const contactPhoneInvalid = 'app_contactPhoneInvalid';
  static const contactMessageShort = 'app_contactMessageShort';
  static const contactSentTitle = 'app_contactSentTitle';
  static const contactSentMessage = 'app_contactSentMessage';
  static const contactWriteAnother = 'app_contactWriteAnother';

  // verify (Mobile-B)
  static const verifyTitle = 'app_verifyTitle';
  static const verifyNoneTitle = 'app_verifyNoneTitle';
  static const verifyNoneMessage = 'app_verifyNoneMessage';
  static const verifyPendingTitle = 'app_verifyPendingTitle';
  static const verifyPendingMessage = 'app_verifyPendingMessage';
  static const verifyPendingSince = 'app_verifyPendingSince';
  static const verifyRejectedTitle = 'app_verifyRejectedTitle';
  static const verifyRejectedMessage = 'app_verifyRejectedMessage';
  static const verifyRejectedReason = 'app_verifyRejectedReason';
  static const verifyVerifiedTitle = 'app_verifyVerifiedTitle';
  static const verifyVerifiedMessage = 'app_verifyVerifiedMessage';
  static const verifyVerifiedOn = 'app_verifyVerifiedOn';
  static const verifySubmitAgain = 'app_verifySubmitAgain';
  static const verifyBenefitTrust = 'app_verifyBenefitTrust';
  static const verifyBenefitPrivate = 'app_verifyBenefitPrivate';
  static const verifyDetailsTitle = 'app_verifyDetailsTitle';
  static const verifyFullName = 'app_verifyFullName';
  static const verifyFullNameHint = 'app_verifyFullNameHint';
  static const verifyDocumentType = 'app_verifyDocumentType';
  static const verifyDocumentTypeHint = 'app_verifyDocumentTypeHint';
  static const verifyDocumentPhotos = 'app_verifyDocumentPhotos';
  static const verifyDocumentPhotosHint = 'app_verifyDocumentPhotosHint';
  static const verifyAddFront = 'app_verifyAddFront';
  static const verifyAddBack = 'app_verifyAddBack';
  static const verifySelfie = 'app_verifySelfie';
  static const verifySelfieHint = 'app_verifySelfieHint';
  static const verifyTakeSelfie = 'app_verifyTakeSelfie';
  static const verifyCamera = 'app_verifyCamera';
  static const verifyGallery = 'app_verifyGallery';
  static const verifyPrivacyNote = 'app_verifyPrivacyNote';
  static const verifySubmit = 'app_verifySubmit';
  static const verifySubmitted = 'app_verifySubmitted';
  static const verifyNameRequired = 'app_verifyNameRequired';
  static const verifyTypeRequired = 'app_verifyTypeRequired';
  static const verifyDocumentRequired = 'app_verifyDocumentRequired';
  static const verifySelfieRequired = 'app_verifySelfieRequired';
  static const verifyPickFailed = 'app_verifyPickFailed';

  // visitors (Mobile-B)
  static const visitorsTitle = 'app_visitorsTitle';
  static const visitorsTheyViewed = 'app_visitorsTheyViewed';
  static const visitorsIViewed = 'app_visitorsIViewed';
  static const visitorsMutual = 'app_visitorsMutual';
  static const visitorsEmptyTitle = 'app_visitorsEmptyTitle';
  static const visitorsEmptyMessage = 'app_visitorsEmptyMessage';
  static const viewedYouAgo = 'app_viewedYouAgo';
  static const youViewedAgo = 'app_youViewedAgo';

  // shortlist (Mobile-B)
  static const shortlistTitle = 'app_shortlistTitle';
  static const shortlistMine = 'app_shortlistMine';
  static const shortlistedMe = 'app_shortlistedMe';
  static const shortlistMineEmptyTitle = 'app_shortlistMineEmptyTitle';
  static const shortlistMineEmptyMessage = 'app_shortlistMineEmptyMessage';
  static const shortlistedMeEmptyTitle = 'app_shortlistedMeEmptyTitle';
  static const shortlistedMeEmptyMessage = 'app_shortlistedMeEmptyMessage';
  static const shortlistRemove = 'app_shortlistRemove';
  static const shortlistRemoved = 'app_shortlistRemoved';

  // daily (Mobile-B)
  static const dailyMatchesTitle = 'app_dailyMatchesTitle';
  static const dailyMatchesSubtitle = 'app_dailyMatchesSubtitle';
  static const dailyMatchesEmptyTitle = 'app_dailyMatchesEmptyTitle';
  static const dailyMatchesEmptyMessage = 'app_dailyMatchesEmptyMessage';
  static const reasonAge = 'app_reasonAge';
  static const reasonCaste = 'app_reasonCaste';
  static const reasonQualification = 'app_reasonQualification';
  static const reasonProfession = 'app_reasonProfession';
  static const reasonIncome = 'app_reasonIncome';
  static const reasonSameCity = 'app_reasonSameCity';
  static const reasonSharedInterests = 'app_reasonSharedInterests';

  // nearby (Mobile-B)
  static const nearbyTitle = 'app_nearbyTitle';
  static const nearbyRadius = 'app_nearbyRadius';
  static const nearbyDistance = 'app_nearbyDistance';
  static const nearbyLocating = 'app_nearbyLocating';
  static const nearbyServiceOffTitle = 'app_nearbyServiceOffTitle';
  static const nearbyServiceOffMessage = 'app_nearbyServiceOffMessage';
  static const nearbyPermissionTitle = 'app_nearbyPermissionTitle';
  static const nearbyPermissionMessage = 'app_nearbyPermissionMessage';
  static const nearbyDeniedForeverMessage = 'app_nearbyDeniedForeverMessage';
  static const nearbyAllow = 'app_nearbyAllow';
  static const nearbyOpenSettings = 'app_nearbyOpenSettings';
  static const nearbyLocationFailedTitle = 'app_nearbyLocationFailedTitle';
  static const nearbyLocationFailedMessage = 'app_nearbyLocationFailedMessage';
  static const nearbyEmptyTitle = 'app_nearbyEmptyTitle';
  static const nearbyEmptyMessage = 'app_nearbyEmptyMessage';
  static const nearbyHiddenHint = 'app_nearbyHiddenHint';
  static const nearbyChange = 'app_nearbyChange';

  // explore (Mobile-B)
  static const exploreActivityTitle = 'app_exploreActivityTitle';
  static const exploreActivityVisitors = 'app_exploreActivityVisitors';
  static const exploreActivityShortlisted = 'app_exploreActivityShortlisted';
  static const exploreActivityInterests = 'app_exploreActivityInterests';
  static const exploreActivityConnections = 'app_exploreActivityConnections';

  // interests (Mobile-B)
  static const interestsTitle = 'app_interestsTitle';
  static const interestsSubtitle = 'app_interestsSubtitle';
  static const interestsReceived = 'app_interestsReceived';
  static const interestsSent = 'app_interestsSent';
  static const interestsConnections = 'app_interestsConnections';
  static const interestsReceivedEmptyTitle = 'app_interestsReceivedEmptyTitle';
  static const interestsReceivedEmptyMessage = 'app_interestsReceivedEmptyMessage';
  static const interestsSentEmptyTitle = 'app_interestsSentEmptyTitle';
  static const interestsSentEmptyMessage = 'app_interestsSentEmptyMessage';
  static const connectionsEmptyTitle = 'app_connectionsEmptyTitle';
  static const connectionsEmptyMessage = 'app_connectionsEmptyMessage';
  static const connectionConnected = 'app_connectionConnected';
  static const connectionSince = 'app_connectionSince';
  static const connectionMessage = 'app_connectionMessage';
  static const connectionCall = 'app_connectionCall';
  static const connectionRemove = 'app_connectionRemove';
  static const connectionRemoveConfirm = 'app_connectionRemoveConfirm';
  static const connectionRemoved = 'app_connectionRemoved';

  // chat (Mobile-B)
  static const chatConnectFirst = 'app_chatConnectFirst';
  static const chatsPendingRequests = 'app_chatsPendingRequests';

  // profile (Mobile-B)
  static const bloodGroupLabel = 'app_bloodGroupLabel';
  static const createdByLabel = 'app_createdByLabel';
  static const createdByHint = 'app_createdByHint';
  static const createdBySelf = 'app_createdBySelf';
  static const createdByParent = 'app_createdByParent';
  static const createdBySibling = 'app_createdBySibling';
  static const createdByRelative = 'app_createdByRelative';
  static const createdByFriend = 'app_createdByFriend';
}

const Map<String, String> appStringsEn = {
  AppKeys.emptyTitle: 'Nothing here yet',
  AppKeys.emptyMessage: 'Check back a little later.',
  AppKeys.retry: 'Try again',
  AppKeys.seeAll: 'See all',
  AppKeys.loadingMore: 'Loading more…',
  AppKeys.somethingWentWrong: 'Something went wrong. Please try again.',
  AppKeys.uploadFailed: 'Upload failed. Please try again.',
  AppKeys.percentMatch: '@percent% match',
  AppKeys.statusNone: 'Not submitted',
  AppKeys.statusPending: 'Under review',
  AppKeys.statusApproved: 'Approved',
  AppKeys.statusPublished: 'Published',
  AppKeys.statusRejected: 'Rejected',
  AppKeys.statusVerified: 'Verified',
  AppKeys.drawerProfile: 'Profile',
  AppKeys.drawerViewProfile: 'View & edit profile',
  AppKeys.drawerDiscover: 'Discover',
  AppKeys.drawerSavedSearches: 'Saved searches',
  AppKeys.drawerCommunity: 'Community',
  AppKeys.drawerSuccessStories: 'Success stories',
  AppKeys.drawerActivity: 'Activity',
  AppKeys.drawerCallHistory: 'Call history',
  AppKeys.drawerMore: 'More',
  AppKeys.settingsTitle: 'Settings',
  AppKeys.settingsAccount: 'Account',
  AppKeys.settingsEditProfile: 'Edit profile',
  AppKeys.settingsPartnerPreferences: 'Partner preferences',
  AppKeys.settingsPhotos: 'Photos',
  AppKeys.settingsVerification: 'Profile verification',
  AppKeys.settingsPrivacySafety: 'Privacy & safety',
  AppKeys.settingsPrivacy: 'Privacy',
  AppKeys.settingsPrivacyDesc: 'Who can see your photos and contact you',
  AppKeys.settingsNotifications: 'Notifications',
  AppKeys.settingsNotificationsDesc: 'Choose what we notify you about',
  AppKeys.settingsApp: 'App',
  AppKeys.settingsCheckUpdates: 'Check for updates',
  AppKeys.settingsHelp: 'Help',
  AppKeys.settingsHelpContact: 'Help & contact',
  AppKeys.settingsLegal: 'Legal',
  AppKeys.privacyTitle: 'Privacy',
  AppKeys.privacyProfileSection: 'Your profile',
  AppKeys.privacyPhotoVisibility: 'Who can see my photos',
  AppKeys.privacyShowLocation: 'Show my location',
  AppKeys.privacyShowLocationDesc: 'Needed to appear in other members\' Nearby list',
  AppKeys.privacyShowIncome: 'Show my income',
  AppKeys.privacyShowIncomeDesc: 'Hide it to keep your income range private',
  AppKeys.privacyContactSection: 'Contact',
  AppKeys.privacyAllowInterests: 'Who can send me interests',
  AppKeys.privacyAllowMessages: 'Who can message me',
  AppKeys.privacyContactDetailsSection: 'Contact details',
  AppKeys.privacyEmailVisibility: 'Email address',
  AppKeys.privacyMobileVisibility: 'Mobile number',
  AppKeys.optionEveryone: 'Everyone',
  AppKeys.optionConnections: 'My connections',
  AppKeys.optionNobody: 'Nobody',
  AppKeys.optionVisible: 'Visible',
  AppKeys.optionHidden: 'Hidden',
  AppKeys.notifSettingsTitle: 'Notifications',
  AppKeys.notifAllow: 'Push notifications',
  AppKeys.notifAllowDesc: 'Receive notifications on this phone',
  AppKeys.notifNotifyMeSection: 'Notify me about',
  AppKeys.notifInterests: 'Interests',
  AppKeys.notifInterestsDesc: 'New and accepted interests',
  AppKeys.notifMessages: 'Messages',
  AppKeys.notifMessagesDesc: 'New chat messages',
  AppKeys.notifVisits: 'Profile visits',
  AppKeys.notifVisitsDesc: 'When someone views your profile',
  AppKeys.notifOffHint: 'Push notifications are off. You will still see everything in the app.',
  AppKeys.contactTitle: 'Help & contact',
  AppKeys.contactFaqTitle: 'Frequently asked questions',
  AppKeys.contactFaqSubtitle: 'Quick answers to common questions',
  AppKeys.contactOpenFaq: 'Open FAQ',
  AppKeys.contactFormTitle: 'Write to us',
  AppKeys.contactFormSubtitle: 'Our team replies by email or phone',
  AppKeys.contactName: 'Your name',
  AppKeys.contactEmail: 'Email',
  AppKeys.contactPhone: 'Mobile number (10 digits)',
  AppKeys.contactMessage: 'How can we help?',
  AppKeys.contactSend: 'Send message',
  AppKeys.contactNameRequired: 'Please enter your name.',
  AppKeys.contactEmailInvalid: 'Please enter a valid email address.',
  AppKeys.contactPhoneInvalid: 'Please enter a 10-digit mobile number.',
  AppKeys.contactMessageShort: 'Please describe your question in a few words.',
  AppKeys.contactSentTitle: 'Message sent',
  AppKeys.contactSentMessage: 'Thank you! We will get back to you soon.',
  AppKeys.contactWriteAnother: 'Write another message',
  AppKeys.verifyTitle: 'Profile verification',
  AppKeys.verifyNoneTitle: 'Get the verified badge',
  AppKeys.verifyNoneMessage: 'Submit a government ID and a selfie. Our team checks them and adds the blue tick to your profile.',
  AppKeys.verifyPendingTitle: 'Under review',
  AppKeys.verifyPendingMessage: 'We received your documents and will review them soon.',
  AppKeys.verifyPendingSince: 'Submitted on @date. We will review it soon.',
  AppKeys.verifyRejectedTitle: 'Verification not approved',
  AppKeys.verifyRejectedMessage: 'Your last request was not approved. You can submit again.',
  AppKeys.verifyRejectedReason: 'Reason: @reason',
  AppKeys.verifyVerifiedTitle: 'Your profile is verified',
  AppKeys.verifyVerifiedMessage: 'Members see the blue tick on your profile.',
  AppKeys.verifyVerifiedOn: 'Verified on @date. Members see the blue tick on your profile.',
  AppKeys.verifySubmitAgain: 'Submit again',
  AppKeys.verifyBenefitTrust: 'Verified profiles get more responses from families',
  AppKeys.verifyBenefitPrivate: 'Documents are only seen by our review team, never by members',
  AppKeys.verifyDetailsTitle: 'Your details',
  AppKeys.verifyFullName: 'Full name (as on the document)',
  AppKeys.verifyFullNameHint: 'Enter your full name',
  AppKeys.verifyDocumentType: 'Document type',
  AppKeys.verifyDocumentTypeHint: 'Select a document',
  AppKeys.verifyDocumentPhotos: 'Document photos',
  AppKeys.verifyDocumentPhotosHint: 'Front side required, back side if it has details',
  AppKeys.verifyAddFront: 'Add front',
  AppKeys.verifyAddBack: 'Add back (optional)',
  AppKeys.verifySelfie: 'Selfie',
  AppKeys.verifySelfieHint: 'A clear photo of your face, without sunglasses',
  AppKeys.verifyTakeSelfie: 'Take selfie',
  AppKeys.verifyCamera: 'Take a photo',
  AppKeys.verifyGallery: 'Choose from gallery',
  AppKeys.verifyPrivacyNote: 'Your documents are stored privately and deleted after review.',
  AppKeys.verifySubmit: 'Submit for verification',
  AppKeys.verifySubmitted: 'Submitted. We will review it soon.',
  AppKeys.verifyNameRequired: 'Please enter your full name.',
  AppKeys.verifyTypeRequired: 'Please select a document type.',
  AppKeys.verifyDocumentRequired: 'Please add a photo of your document.',
  AppKeys.verifySelfieRequired: 'Please take a selfie.',
  AppKeys.verifyPickFailed: 'Could not get the photo. Please try again.',
  AppKeys.visitorsTitle: 'Profile visitors',
  AppKeys.visitorsTheyViewed: 'Viewed me',
  AppKeys.visitorsIViewed: 'I viewed',
  AppKeys.visitorsMutual: 'Mutual',
  AppKeys.visitorsEmptyTitle: 'No visits yet',
  AppKeys.visitorsEmptyMessage: 'A complete profile with photos gets more visits.',
  AppKeys.viewedYouAgo: 'Viewed you @time',
  AppKeys.youViewedAgo: 'You viewed @time',
  AppKeys.shortlistTitle: 'Shortlist',
  AppKeys.shortlistMine: 'My shortlist',
  AppKeys.shortlistedMe: 'Shortlisted me',
  AppKeys.shortlistMineEmptyTitle: 'Your shortlist is empty',
  AppKeys.shortlistMineEmptyMessage: 'Tap Save on a profile to keep it here.',
  AppKeys.shortlistedMeEmptyTitle: 'No one has shortlisted you yet',
  AppKeys.shortlistedMeEmptyMessage: 'Members who save your profile appear here.',
  AppKeys.shortlistRemove: 'Remove from shortlist',
  AppKeys.shortlistRemoved: 'Removed from your shortlist',
  AppKeys.dailyMatchesTitle: 'Today\'s matches',
  AppKeys.dailyMatchesSubtitle: 'Picked for you from your partner preferences',
  AppKeys.dailyMatchesEmptyTitle: 'No matches for today yet',
  AppKeys.dailyMatchesEmptyMessage: 'Complete your partner preferences to get daily matches.',
  AppKeys.reasonAge: 'Age match',
  AppKeys.reasonCaste: 'Caste match',
  AppKeys.reasonQualification: 'Education',
  AppKeys.reasonProfession: 'Profession',
  AppKeys.reasonIncome: 'Income',
  AppKeys.reasonSameCity: 'Same city',
  AppKeys.reasonSharedInterests: 'Shared interests',
  AppKeys.nearbyTitle: 'Nearby',
  AppKeys.nearbyRadius: '@km km',
  AppKeys.nearbyDistance: '@km km away',
  AppKeys.nearbyLocating: 'Finding your location…',
  AppKeys.nearbyServiceOffTitle: 'Location is turned off',
  AppKeys.nearbyServiceOffMessage: 'Turn on location services to see members near you.',
  AppKeys.nearbyPermissionTitle: 'Allow location access',
  AppKeys.nearbyPermissionMessage: 'We use your approximate location only to show members near you.',
  AppKeys.nearbyDeniedForeverMessage: 'Location access is blocked. Allow it in the app settings to use Nearby.',
  AppKeys.nearbyAllow: 'Allow',
  AppKeys.nearbyOpenSettings: 'Open settings',
  AppKeys.nearbyLocationFailedTitle: 'Could not get your location',
  AppKeys.nearbyLocationFailedMessage: 'Check your GPS signal and try again.',
  AppKeys.nearbyEmptyTitle: 'No members nearby',
  AppKeys.nearbyEmptyMessage: 'Try a larger distance.',
  AppKeys.nearbyHiddenHint: 'Your location is hidden, so others cannot find you in Nearby.',
  AppKeys.nearbyChange: 'Change',
  AppKeys.exploreActivityTitle: 'Your activity',
  AppKeys.exploreActivityVisitors: 'Visitors',
  AppKeys.exploreActivityShortlisted: 'Shortlisted you',
  AppKeys.exploreActivityInterests: 'New interests',
  AppKeys.exploreActivityConnections: 'Connections',
  AppKeys.interestsTitle: 'My Interests',
  AppKeys.interestsSubtitle: 'Manage your matrimony connections',
  AppKeys.interestsReceived: 'Received',
  AppKeys.interestsSent: 'Sent',
  AppKeys.interestsConnections: 'Connections',
  AppKeys.interestsReceivedEmptyTitle: 'No new interests',
  AppKeys.interestsReceivedEmptyMessage: 'New interests from members will appear here.',
  AppKeys.interestsSentEmptyTitle: 'No interests sent yet',
  AppKeys.interestsSentEmptyMessage: 'Send an interest from a profile you like.',
  AppKeys.connectionsEmptyTitle: 'No connections yet',
  AppKeys.connectionsEmptyMessage: 'When an interest is accepted, you can chat and call here.',
  AppKeys.connectionConnected: 'Connected',
  AppKeys.connectionSince: 'Connected since @date',
  AppKeys.connectionMessage: 'Send Message',
  AppKeys.connectionCall: 'Call Now',
  AppKeys.connectionRemove: 'Remove',
  AppKeys.connectionRemoveConfirm: 'Remove @name from your connections? You will no longer be able to chat.',
  AppKeys.connectionRemoved: 'Connection removed',
  AppKeys.chatConnectFirst: 'Chat opens once your interest is accepted.',
  AppKeys.chatsPendingRequests: 'Pending Requests',
  AppKeys.bloodGroupLabel: 'Blood group',
  AppKeys.createdByLabel: 'Profile created by',
  AppKeys.createdByHint: 'Select who manages this profile',
  AppKeys.createdBySelf: 'Self',
  AppKeys.createdByParent: 'Parent',
  AppKeys.createdBySibling: 'Sibling',
  AppKeys.createdByRelative: 'Relative',
  AppKeys.createdByFriend: 'Friend',
};

const Map<String, String> appStringsHi = {
  AppKeys.emptyTitle: 'अभी यहाँ कुछ नहीं है',
  AppKeys.emptyMessage: 'थोड़ी देर बाद फिर देखें।',
  AppKeys.retry: 'फिर से कोशिश करें',
  AppKeys.seeAll: 'सभी देखें',
  AppKeys.loadingMore: 'और लोड हो रहा है…',
  AppKeys.somethingWentWrong: 'कुछ गलत हो गया। कृपया फिर से कोशिश करें।',
  AppKeys.uploadFailed: 'अपलोड नहीं हो सका। कृपया फिर से कोशिश करें।',
  AppKeys.percentMatch: '@percent% मेल',
  AppKeys.statusNone: 'जमा नहीं किया',
  AppKeys.statusPending: 'समीक्षा में',
  AppKeys.statusApproved: 'स्वीकृत',
  AppKeys.statusPublished: 'प्रकाशित',
  AppKeys.statusRejected: 'अस्वीकृत',
  AppKeys.statusVerified: 'सत्यापित',
  AppKeys.drawerProfile: 'प्रोफ़ाइल',
  AppKeys.drawerViewProfile: 'प्रोफ़ाइल देखें और बदलें',
  AppKeys.drawerDiscover: 'खोजें',
  AppKeys.drawerSavedSearches: 'सहेजी गई खोजें',
  AppKeys.drawerCommunity: 'समुदाय',
  AppKeys.drawerSuccessStories: 'सफल जोड़ियों की कहानियाँ',
  AppKeys.drawerActivity: 'गतिविधि',
  AppKeys.drawerCallHistory: 'कॉल इतिहास',
  AppKeys.drawerMore: 'और',
  AppKeys.settingsTitle: 'सेटिंग्स',
  AppKeys.settingsAccount: 'खाता',
  AppKeys.settingsEditProfile: 'प्रोफ़ाइल बदलें',
  AppKeys.settingsPartnerPreferences: 'जीवनसाथी की पसंद',
  AppKeys.settingsPhotos: 'फ़ोटो',
  AppKeys.settingsVerification: 'प्रोफ़ाइल सत्यापन',
  AppKeys.settingsPrivacySafety: 'गोपनीयता और सुरक्षा',
  AppKeys.settingsPrivacy: 'गोपनीयता',
  AppKeys.settingsPrivacyDesc: 'कौन आपकी फ़ोटो देख सकता है और आपसे संपर्क कर सकता है',
  AppKeys.settingsNotifications: 'सूचनाएँ',
  AppKeys.settingsNotificationsDesc: 'चुनें कि हम आपको किस बारे में सूचित करें',
  AppKeys.settingsApp: 'ऐप',
  AppKeys.settingsCheckUpdates: 'अपडेट देखें',
  AppKeys.settingsHelp: 'मदद',
  AppKeys.settingsHelpContact: 'मदद और संपर्क',
  AppKeys.settingsLegal: 'कानूनी',
  AppKeys.privacyTitle: 'गोपनीयता',
  AppKeys.privacyProfileSection: 'आपकी प्रोफ़ाइल',
  AppKeys.privacyPhotoVisibility: 'मेरी फ़ोटो कौन देख सकता है',
  AppKeys.privacyShowLocation: 'मेरा स्थान दिखाएँ',
  AppKeys.privacyShowLocationDesc: 'दूसरे सदस्यों की \'आस-पास\' सूची में दिखने के लिए ज़रूरी',
  AppKeys.privacyShowIncome: 'मेरी आय दिखाएँ',
  AppKeys.privacyShowIncomeDesc: 'आय सीमा निजी रखने के लिए इसे छिपाएँ',
  AppKeys.privacyContactSection: 'संपर्क',
  AppKeys.privacyAllowInterests: 'मुझे रुचि कौन भेज सकता है',
  AppKeys.privacyAllowMessages: 'मुझे संदेश कौन भेज सकता है',
  AppKeys.privacyContactDetailsSection: 'संपर्क विवरण',
  AppKeys.privacyEmailVisibility: 'ईमेल पता',
  AppKeys.privacyMobileVisibility: 'मोबाइल नंबर',
  AppKeys.optionEveryone: 'सभी',
  AppKeys.optionConnections: 'मेरे कनेक्शन',
  AppKeys.optionNobody: 'कोई नहीं',
  AppKeys.optionVisible: 'दिखाएँ',
  AppKeys.optionHidden: 'छिपाएँ',
  AppKeys.notifSettingsTitle: 'सूचनाएँ',
  AppKeys.notifAllow: 'पुश सूचनाएँ',
  AppKeys.notifAllowDesc: 'इस फ़ोन पर सूचनाएँ पाएँ',
  AppKeys.notifNotifyMeSection: 'मुझे इनके बारे में सूचित करें',
  AppKeys.notifInterests: 'रुचियाँ',
  AppKeys.notifInterestsDesc: 'नई और स्वीकार की गई रुचियाँ',
  AppKeys.notifMessages: 'संदेश',
  AppKeys.notifMessagesDesc: 'नए चैट संदेश',
  AppKeys.notifVisits: 'प्रोफ़ाइल विज़िट',
  AppKeys.notifVisitsDesc: 'जब कोई आपकी प्रोफ़ाइल देखे',
  AppKeys.notifOffHint: 'पुश सूचनाएँ बंद हैं। आप ऐप में सब कुछ देख सकेंगे।',
  AppKeys.contactTitle: 'मदद और संपर्क',
  AppKeys.contactFaqTitle: 'अक्सर पूछे जाने वाले प्रश्न',
  AppKeys.contactFaqSubtitle: 'आम सवालों के तुरंत जवाब',
  AppKeys.contactOpenFaq: 'FAQ खोलें',
  AppKeys.contactFormTitle: 'हमें लिखें',
  AppKeys.contactFormSubtitle: 'हमारी टीम ईमेल या फ़ोन से जवाब देगी',
  AppKeys.contactName: 'आपका नाम',
  AppKeys.contactEmail: 'ईमेल',
  AppKeys.contactPhone: 'मोबाइल नंबर (10 अंक)',
  AppKeys.contactMessage: 'हम आपकी कैसे मदद करें?',
  AppKeys.contactSend: 'संदेश भेजें',
  AppKeys.contactNameRequired: 'कृपया अपना नाम लिखें।',
  AppKeys.contactEmailInvalid: 'कृपया सही ईमेल पता लिखें।',
  AppKeys.contactPhoneInvalid: 'कृपया 10 अंकों का मोबाइल नंबर लिखें।',
  AppKeys.contactMessageShort: 'कृपया अपना सवाल कुछ शब्दों में लिखें।',
  AppKeys.contactSentTitle: 'संदेश भेज दिया गया',
  AppKeys.contactSentMessage: 'धन्यवाद! हम जल्द ही आपसे संपर्क करेंगे।',
  AppKeys.contactWriteAnother: 'एक और संदेश लिखें',
  AppKeys.verifyTitle: 'प्रोफ़ाइल सत्यापन',
  AppKeys.verifyNoneTitle: 'सत्यापित बैज पाएँ',
  AppKeys.verifyNoneMessage: 'सरकारी पहचान पत्र और एक सेल्फ़ी जमा करें। हमारी टीम जाँच करके आपकी प्रोफ़ाइल पर नीला निशान लगाएगी।',
  AppKeys.verifyPendingTitle: 'समीक्षा में',
  AppKeys.verifyPendingMessage: 'हमें आपके दस्तावेज़ मिल गए हैं, जल्द ही उनकी समीक्षा होगी।',
  AppKeys.verifyPendingSince: '@date को जमा किया गया। जल्द ही समीक्षा होगी।',
  AppKeys.verifyRejectedTitle: 'सत्यापन स्वीकृत नहीं हुआ',
  AppKeys.verifyRejectedMessage: 'आपका पिछला अनुरोध स्वीकृत नहीं हुआ। आप फिर से जमा कर सकते हैं।',
  AppKeys.verifyRejectedReason: 'कारण: @reason',
  AppKeys.verifyVerifiedTitle: 'आपकी प्रोफ़ाइल सत्यापित है',
  AppKeys.verifyVerifiedMessage: 'सदस्यों को आपकी प्रोफ़ाइल पर नीला निशान दिखता है।',
  AppKeys.verifyVerifiedOn: '@date को सत्यापित। सदस्यों को आपकी प्रोफ़ाइल पर नीला निशान दिखता है।',
  AppKeys.verifySubmitAgain: 'फिर से जमा करें',
  AppKeys.verifyBenefitTrust: 'सत्यापित प्रोफ़ाइल को परिवारों से ज़्यादा जवाब मिलते हैं',
  AppKeys.verifyBenefitPrivate: 'दस्तावेज़ केवल हमारी समीक्षा टीम देखती है, सदस्य कभी नहीं',
  AppKeys.verifyDetailsTitle: 'आपका विवरण',
  AppKeys.verifyFullName: 'पूरा नाम (दस्तावेज़ के अनुसार)',
  AppKeys.verifyFullNameHint: 'अपना पूरा नाम लिखें',
  AppKeys.verifyDocumentType: 'दस्तावेज़ का प्रकार',
  AppKeys.verifyDocumentTypeHint: 'दस्तावेज़ चुनें',
  AppKeys.verifyDocumentPhotos: 'दस्तावेज़ की फ़ोटो',
  AppKeys.verifyDocumentPhotosHint: 'आगे का हिस्सा ज़रूरी, पीछे का हिस्सा अगर उस पर विवरण हो',
  AppKeys.verifyAddFront: 'आगे का भाग जोड़ें',
  AppKeys.verifyAddBack: 'पीछे का भाग जोड़ें (वैकल्पिक)',
  AppKeys.verifySelfie: 'सेल्फ़ी',
  AppKeys.verifySelfieHint: 'आपके चेहरे की साफ़ फ़ोटो, बिना धूप के चश्मे के',
  AppKeys.verifyTakeSelfie: 'सेल्फ़ी लें',
  AppKeys.verifyCamera: 'फ़ोटो लें',
  AppKeys.verifyGallery: 'गैलरी से चुनें',
  AppKeys.verifyPrivacyNote: 'आपके दस्तावेज़ निजी रूप से रखे जाते हैं और समीक्षा के बाद हटा दिए जाते हैं।',
  AppKeys.verifySubmit: 'सत्यापन के लिए जमा करें',
  AppKeys.verifySubmitted: 'जमा हो गया। जल्द ही समीक्षा होगी।',
  AppKeys.verifyNameRequired: 'कृपया अपना पूरा नाम लिखें।',
  AppKeys.verifyTypeRequired: 'कृपया दस्तावेज़ का प्रकार चुनें।',
  AppKeys.verifyDocumentRequired: 'कृपया अपने दस्तावेज़ की फ़ोटो जोड़ें।',
  AppKeys.verifySelfieRequired: 'कृपया एक सेल्फ़ी लें।',
  AppKeys.verifyPickFailed: 'फ़ोटो नहीं मिल सकी। कृपया फिर से कोशिश करें।',
  AppKeys.visitorsTitle: 'प्रोफ़ाइल विज़िटर',
  AppKeys.visitorsTheyViewed: 'मुझे देखा',
  AppKeys.visitorsIViewed: 'मैंने देखा',
  AppKeys.visitorsMutual: 'आपसी',
  AppKeys.visitorsEmptyTitle: 'अभी कोई विज़िट नहीं',
  AppKeys.visitorsEmptyMessage: 'फ़ोटो के साथ पूरी प्रोफ़ाइल को ज़्यादा विज़िट मिलती हैं।',
  AppKeys.viewedYouAgo: 'आपको @time देखा',
  AppKeys.youViewedAgo: 'आपने @time देखा',
  AppKeys.shortlistTitle: 'शॉर्टलिस्ट',
  AppKeys.shortlistMine: 'मेरी शॉर्टलिस्ट',
  AppKeys.shortlistedMe: 'मुझे शॉर्टलिस्ट किया',
  AppKeys.shortlistMineEmptyTitle: 'आपकी शॉर्टलिस्ट खाली है',
  AppKeys.shortlistMineEmptyMessage: 'प्रोफ़ाइल पर सेव दबाकर उसे यहाँ रखें।',
  AppKeys.shortlistedMeEmptyTitle: 'अभी किसी ने आपको शॉर्टलिस्ट नहीं किया',
  AppKeys.shortlistedMeEmptyMessage: 'जो सदस्य आपकी प्रोफ़ाइल सेव करते हैं वे यहाँ दिखेंगे।',
  AppKeys.shortlistRemove: 'शॉर्टलिस्ट से हटाएँ',
  AppKeys.shortlistRemoved: 'आपकी शॉर्टलिस्ट से हटा दिया गया',
  AppKeys.dailyMatchesTitle: 'आज के मैच',
  AppKeys.dailyMatchesSubtitle: 'आपकी पसंद के अनुसार आपके लिए चुने गए',
  AppKeys.dailyMatchesEmptyTitle: 'आज के लिए अभी कोई मैच नहीं',
  AppKeys.dailyMatchesEmptyMessage: 'रोज़ मैच पाने के लिए अपनी पसंद पूरी करें।',
  AppKeys.reasonAge: 'उम्र मेल',
  AppKeys.reasonCaste: 'जाति मेल',
  AppKeys.reasonQualification: 'शिक्षा',
  AppKeys.reasonProfession: 'व्यवसाय',
  AppKeys.reasonIncome: 'आय',
  AppKeys.reasonSameCity: 'एक ही शहर',
  AppKeys.reasonSharedInterests: 'समान रुचियाँ',
  AppKeys.nearbyTitle: 'आस-पास',
  AppKeys.nearbyRadius: '@km किमी',
  AppKeys.nearbyDistance: '@km किमी दूर',
  AppKeys.nearbyLocating: 'आपका स्थान खोजा जा रहा है…',
  AppKeys.nearbyServiceOffTitle: 'स्थान सेवा बंद है',
  AppKeys.nearbyServiceOffMessage: 'आस-पास के सदस्य देखने के लिए स्थान सेवा चालू करें।',
  AppKeys.nearbyPermissionTitle: 'स्थान की अनुमति दें',
  AppKeys.nearbyPermissionMessage: 'हम आपका अनुमानित स्थान केवल आस-पास के सदस्य दिखाने के लिए उपयोग करते हैं।',
  AppKeys.nearbyDeniedForeverMessage: 'स्थान की अनुमति बंद है। \'आस-पास\' के लिए ऐप सेटिंग्स में अनुमति दें।',
  AppKeys.nearbyAllow: 'अनुमति दें',
  AppKeys.nearbyOpenSettings: 'सेटिंग्स खोलें',
  AppKeys.nearbyLocationFailedTitle: 'आपका स्थान नहीं मिल सका',
  AppKeys.nearbyLocationFailedMessage: 'अपना GPS सिग्नल जाँचें और फिर से कोशिश करें।',
  AppKeys.nearbyEmptyTitle: 'आस-पास कोई सदस्य नहीं',
  AppKeys.nearbyEmptyMessage: 'ज़्यादा दूरी चुनकर देखें।',
  AppKeys.nearbyHiddenHint: 'आपका स्थान छिपा है, इसलिए दूसरे आपको \'आस-पास\' में नहीं देख सकते।',
  AppKeys.nearbyChange: 'बदलें',
  AppKeys.exploreActivityTitle: 'आपकी गतिविधि',
  AppKeys.exploreActivityVisitors: 'विज़िटर',
  AppKeys.exploreActivityShortlisted: 'आपको शॉर्टलिस्ट किया',
  AppKeys.exploreActivityInterests: 'नई रुचियाँ',
  AppKeys.exploreActivityConnections: 'कनेक्शन',
  AppKeys.interestsTitle: 'मेरी रुचियाँ',
  AppKeys.interestsSubtitle: 'अपने रिश्तों के कनेक्शन संभालें',
  AppKeys.interestsReceived: 'प्राप्त',
  AppKeys.interestsSent: 'भेजी गई',
  AppKeys.interestsConnections: 'कनेक्शन',
  AppKeys.interestsReceivedEmptyTitle: 'कोई नई रुचि नहीं',
  AppKeys.interestsReceivedEmptyMessage: 'सदस्यों की नई रुचियाँ यहाँ दिखेंगी।',
  AppKeys.interestsSentEmptyTitle: 'अभी कोई रुचि नहीं भेजी',
  AppKeys.interestsSentEmptyMessage: 'पसंद की प्रोफ़ाइल पर रुचि भेजें।',
  AppKeys.connectionsEmptyTitle: 'अभी कोई कनेक्शन नहीं',
  AppKeys.connectionsEmptyMessage: 'रुचि स्वीकार होने पर आप यहाँ चैट और कॉल कर सकते हैं।',
  AppKeys.connectionConnected: 'जुड़े हुए',
  AppKeys.connectionSince: '@date से जुड़े हुए',
  AppKeys.connectionMessage: 'संदेश भेजें',
  AppKeys.connectionCall: 'अभी कॉल करें',
  AppKeys.connectionRemove: 'हटाएँ',
  AppKeys.connectionRemoveConfirm: '@name को अपने कनेक्शन से हटाएँ? इसके बाद आप चैट नहीं कर पाएँगे।',
  AppKeys.connectionRemoved: 'कनेक्शन हटा दिया गया',
  AppKeys.chatConnectFirst: 'रुचि स्वीकार होने के बाद चैट शुरू होगी।',
  AppKeys.chatsPendingRequests: 'लंबित अनुरोध',
  AppKeys.bloodGroupLabel: 'रक्त समूह',
  AppKeys.createdByLabel: 'प्रोफ़ाइल किसने बनाई',
  AppKeys.createdByHint: 'चुनें कि यह प्रोफ़ाइल कौन संभालता है',
  AppKeys.createdBySelf: 'स्वयं',
  AppKeys.createdByParent: 'माता-पिता',
  AppKeys.createdBySibling: 'भाई-बहन',
  AppKeys.createdByRelative: 'रिश्तेदार',
  AppKeys.createdByFriend: 'मित्र',
};
