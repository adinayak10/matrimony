// Matching-depth strings (horoscope, Guna Milan, saved searches, success
// stories, announcements) for the 1.1.0 feature expansion. Owner: Mobile-C.
//
// Rules: every key VALUE starts with "match_" (non-Hindi language maps are
// `const`; equal keys would not compile). Add each key to matchStringsEn and,
// when available, to matchStringsHi (Hindi falls back to English per key).
// Use with GetX: `MatchKeys.gunaMilan.tr`, `MatchKeys.managedBy.trParams({'who': 'Parent'})`.

abstract class MatchKeys {
  static const horoscope = 'match_horoscope';
  static const gunaMilan = 'match_gunaMilan';
  static const savedSearches = 'match_savedSearches';
  static const successStories = 'match_successStories';

  // ---- common ----
  static const save = 'match_save';
  static const cancel = 'match_cancel';
  static const clear = 'match_clear';
  static const edit = 'match_edit';
  static const delete = 'match_delete';
  static const select = 'match_select';
  static const optional = 'match_optional';
  static const notSpecified = 'match_notSpecified';
  static const you = 'match_you';

  // ---- horoscope screen ----
  static const horoscopeIntro = 'match_horoscopeIntro';
  static const birthTime = 'match_birthTime';
  static const birthTimeHint = 'match_birthTimeHint';
  static const birthPlace = 'match_birthPlace';
  static const birthPlaceHint = 'match_birthPlaceHint';
  static const rashi = 'match_rashi';
  static const nakshatra = 'match_nakshatra';
  static const manglikStatus = 'match_manglikStatus';
  static const manglikYes = 'match_manglikYes';
  static const manglikNo = 'match_manglikNo';
  static const manglikPartial = 'match_manglikPartial';
  static const manglikNotSpecified = 'match_manglikNotSpecified';
  static const horoscopeRequired = 'match_horoscopeRequired';
  static const horoscopeRequiredHint = 'match_horoscopeRequiredHint';
  static const horoscopeSaved = 'match_horoscopeSaved';

  // ---- profile screen ----
  static const bloodGroup = 'match_bloodGroup';
  static const horoscopeMatch = 'match_horoscopeMatch';
  static const required = 'match_required';
  static const notRequired = 'match_notRequired';
  static const checkKundli = 'match_checkKundli';
  static const addHoroscope = 'match_addHoroscope';
  static const managedBy = 'match_managedBy';
  static const createdByParent = 'match_createdByParent';
  static const createdBySibling = 'match_createdBySibling';
  static const createdByRelative = 'match_createdByRelative';
  static const createdByFriend = 'match_createdByFriend';

  // ---- Guna Milan ----
  static const gunaScore = 'match_gunaScore';
  static const gunaPoints = 'match_gunaPoints';
  static const kootaBreakdown = 'match_kootaBreakdown';
  static const birthDetails = 'match_birthDetails';
  static const gunaMissingTitle = 'match_gunaMissingTitle';
  static const gunaMissingSelf = 'match_gunaMissingSelf';
  static const gunaMissingOther = 'match_gunaMissingOther';
  static const gunaMissingGeneric = 'match_gunaMissingGeneric';
  static const addYourHoroscope = 'match_addYourHoroscope';
  static const gunaDisclaimer = 'match_gunaDisclaimer';
  static const thisProfile = 'match_thisProfile';

  // ---- saved searches ----
  static const saveThisSearch = 'match_saveThisSearch';
  static const updateSavedSearch = 'match_updateSavedSearch';
  static const saveAsNew = 'match_saveAsNew';
  static const searchName = 'match_searchName';
  static const searchNameHint = 'match_searchNameHint';
  static const searchNameRequired = 'match_searchNameRequired';
  static const alertMe = 'match_alertMe';
  static const alertMeHint = 'match_alertMeHint';
  static const searchSaved = 'match_searchSaved';
  static const searchUpdated = 'match_searchUpdated';
  static const searchDeleted = 'match_searchDeleted';
  static const savedLimit = 'match_savedLimit';
  static const savedCount = 'match_savedCount';
  static const noSavedSearches = 'match_noSavedSearches';
  static const noSavedSearchesMsg = 'match_noSavedSearchesMsg';
  static const startSearch = 'match_startSearch';
  static const runSearch = 'match_runSearch';
  static const deleteSavedSearchConfirm = 'match_deleteSavedSearchConfirm';
  static const editingSavedSearch = 'match_editingSavedSearch';
  static const filterAge = 'match_filterAge';
  static const filterHeight = 'match_filterHeight';
  static const filterCaste = 'match_filterCaste';
  static const filterGotra = 'match_filterGotra';
  static const filterEducation = 'match_filterEducation';
  static const filterProfession = 'match_filterProfession';
  static const filterIncome = 'match_filterIncome';
  static const filterVerified = 'match_filterVerified';
  static const filterRecent = 'match_filterRecent';
  static const filterAny = 'match_filterAny';

  // ---- success stories ----
  static const community = 'match_community';
  static const myStories = 'match_myStories';
  static const shareStory = 'match_shareStory';
  static const noStoriesTitle = 'match_noStoriesTitle';
  static const noStoriesMsg = 'match_noStoriesMsg';
  static const noMyStoriesTitle = 'match_noMyStoriesTitle';
  static const noMyStoriesMsg = 'match_noMyStoriesMsg';
  static const marriedOn = 'match_marriedOn';
  static const featured = 'match_featured';
  static const readMore = 'match_readMore';
  static const showLess = 'match_showLess';
  static const rejectionReason = 'match_rejectionReason';

  // ---- submit success story ----
  static const submitStory = 'match_submitStory';
  static const reviewNote = 'match_reviewNote';
  static const partner = 'match_partner';
  static const partnerHint = 'match_partnerHint';
  static const choosePartner = 'match_choosePartner';
  static const noConnections = 'match_noConnections';
  static const groomName = 'match_groomName';
  static const brideName = 'match_brideName';
  static const story = 'match_story';
  static const storyHint = 'match_storyHint';
  static const storyCount = 'match_storyCount';
  static const weddingDate = 'match_weddingDate';
  static const city = 'match_city';
  static const photo = 'match_photo';
  static const addPhoto = 'match_addPhoto';
  static const groomRequired = 'match_groomRequired';
  static const brideRequired = 'match_brideRequired';
  static const storyTooShort = 'match_storyTooShort';
  static const storyTooLong = 'match_storyTooLong';
  static const storySubmitted = 'match_storySubmitted';

  // ---- announcements ----
  static const noAnnouncements = 'match_noAnnouncements';
  static const noAnnouncementsMsg = 'match_noAnnouncementsMsg';
  static const noPersonalNotifications = 'match_noPersonalNotifications';
  static const noPersonalNotificationsMsg = 'match_noPersonalNotificationsMsg';
  static const openLink = 'match_openLink';
  static const typeAnnouncement = 'match_typeAnnouncement';
  static const typeUpdate = 'match_typeUpdate';
  static const typeMaintenance = 'match_typeMaintenance';
  static const typeEvent = 'match_typeEvent';
}

const Map<String, String> matchStringsEn = {
  MatchKeys.horoscope: 'Horoscope',
  MatchKeys.gunaMilan: 'Kundli match',
  MatchKeys.savedSearches: 'Saved searches',
  MatchKeys.successStories: 'Success stories',
  // common
  MatchKeys.save: 'Save',
  MatchKeys.cancel: 'Cancel',
  MatchKeys.clear: 'Clear',
  MatchKeys.edit: 'Edit',
  MatchKeys.delete: 'Delete',
  MatchKeys.select: 'Select',
  MatchKeys.optional: 'Optional',
  MatchKeys.notSpecified: 'Not specified',
  MatchKeys.you: 'You',
  // horoscope screen
  MatchKeys.horoscopeIntro: 'Your Rashi and Nakshatra are used for the Kundli match with other profiles.',
  MatchKeys.birthTime: 'Birth time',
  MatchKeys.birthTimeHint: 'Tap to choose',
  MatchKeys.birthPlace: 'Birth place',
  MatchKeys.birthPlaceHint: 'Town or village of birth',
  MatchKeys.rashi: 'Rashi (Moon sign)',
  MatchKeys.nakshatra: 'Nakshatra',
  MatchKeys.manglikStatus: 'Manglik status',
  MatchKeys.manglikYes: 'Yes',
  MatchKeys.manglikNo: 'No',
  MatchKeys.manglikPartial: 'Partial',
  MatchKeys.manglikNotSpecified: 'Not specified',
  MatchKeys.horoscopeRequired: 'Horoscope match required',
  MatchKeys.horoscopeRequiredHint: 'Let families know you want the horoscopes matched',
  MatchKeys.horoscopeSaved: 'Horoscope saved',
  // profile screen
  MatchKeys.bloodGroup: 'Blood group',
  MatchKeys.horoscopeMatch: 'Horoscope match',
  MatchKeys.required: 'Required',
  MatchKeys.notRequired: 'Not required',
  MatchKeys.checkKundli: 'Check Kundli match',
  MatchKeys.addHoroscope: 'Add horoscope',
  MatchKeys.managedBy: 'Profile managed by @who',
  MatchKeys.createdByParent: 'Parent',
  MatchKeys.createdBySibling: 'Sibling',
  MatchKeys.createdByRelative: 'Relative',
  MatchKeys.createdByFriend: 'Friend',
  // Guna Milan
  MatchKeys.gunaScore: 'Compatibility score',
  MatchKeys.gunaPoints: '@points of @max points',
  MatchKeys.kootaBreakdown: 'Koota breakdown',
  MatchKeys.birthDetails: 'Birth details',
  MatchKeys.gunaMissingTitle: 'Horoscope details missing',
  MatchKeys.gunaMissingSelf: 'Add your Rashi and Nakshatra to see the Kundli match.',
  MatchKeys.gunaMissingOther: '@name has not added Rashi or Nakshatra yet.',
  MatchKeys.gunaMissingGeneric: 'Not enough horoscope information on one or both profiles.',
  MatchKeys.addYourHoroscope: 'Add your horoscope',
  MatchKeys.gunaDisclaimer: 'For guidance only. Consult a family astrologer for a complete reading.',
  MatchKeys.thisProfile: 'This profile',
  // saved searches
  MatchKeys.saveThisSearch: 'Save this search',
  MatchKeys.updateSavedSearch: 'Update saved search',
  MatchKeys.saveAsNew: 'Save as new',
  MatchKeys.searchName: 'Name',
  MatchKeys.searchNameHint: 'e.g. Jaipur, 25-30',
  MatchKeys.searchNameRequired: 'Please enter a name (up to 60 characters)',
  MatchKeys.alertMe: 'Alert me about new matches',
  MatchKeys.alertMeHint: 'Get a notification when new profiles match this search',
  MatchKeys.searchSaved: 'Search saved',
  MatchKeys.searchUpdated: 'Saved search updated',
  MatchKeys.searchDeleted: 'Saved search deleted',
  MatchKeys.savedLimit: 'You can keep up to @max saved searches. Delete one to save another.',
  MatchKeys.savedCount: '@count of @max saved',
  MatchKeys.noSavedSearches: 'No saved searches yet',
  MatchKeys.noSavedSearchesMsg: 'Save a search to run it again in one tap and get alerts about new matches.',
  MatchKeys.startSearch: 'Start a search',
  MatchKeys.runSearch: 'Run',
  MatchKeys.deleteSavedSearchConfirm: 'Delete the saved search "@name"?',
  MatchKeys.editingSavedSearch: 'Editing "@name"',
  MatchKeys.filterAge: 'Age @min-@max',
  MatchKeys.filterHeight: 'Height @min-@max',
  MatchKeys.filterCaste: 'Caste (@count)',
  MatchKeys.filterGotra: 'Gotra (@count)',
  MatchKeys.filterEducation: 'Education (@count)',
  MatchKeys.filterProfession: 'Profession (@count)',
  MatchKeys.filterIncome: 'Income range',
  MatchKeys.filterVerified: 'Verified only',
  MatchKeys.filterRecent: 'Recently active',
  MatchKeys.filterAny: 'All profiles',
  // success stories
  MatchKeys.community: 'Community',
  MatchKeys.myStories: 'My stories',
  MatchKeys.shareStory: 'Share your story',
  MatchKeys.noStoriesTitle: 'No stories yet',
  MatchKeys.noStoriesMsg: 'Stories from couples who met on BanjaraMatch will appear here once they are published.',
  MatchKeys.noMyStoriesTitle: 'You have not shared a story',
  MatchKeys.noMyStoriesMsg: 'Found your partner here? Share your story with the community.',
  MatchKeys.marriedOn: 'Married @date',
  MatchKeys.featured: 'Featured',
  MatchKeys.readMore: 'Read more',
  MatchKeys.showLess: 'Show less',
  MatchKeys.rejectionReason: 'Reason: @reason',
  // submit success story
  MatchKeys.submitStory: 'Submit story',
  MatchKeys.reviewNote: 'Our team reviews every story before it is published.',
  MatchKeys.partner: 'Your partner',
  MatchKeys.partnerHint: 'Choose from your connections (optional)',
  MatchKeys.choosePartner: 'Choose partner',
  MatchKeys.noConnections: 'You have no connections yet. You can type both names below.',
  MatchKeys.groomName: "Groom's name",
  MatchKeys.brideName: "Bride's name",
  MatchKeys.story: 'Your story',
  MatchKeys.storyHint: 'How did you meet? What made you choose each other?',
  MatchKeys.storyCount: '@count / @max',
  MatchKeys.weddingDate: 'Wedding date',
  MatchKeys.city: 'City',
  MatchKeys.photo: 'Photo',
  MatchKeys.addPhoto: 'Add a photo',
  MatchKeys.groomRequired: "Please enter the groom's name",
  MatchKeys.brideRequired: "Please enter the bride's name",
  MatchKeys.storyTooShort: 'Your story needs at least @min characters',
  MatchKeys.storyTooLong: 'Your story can have at most @max characters',
  MatchKeys.storySubmitted: 'Thank you! Your story will appear after review.',
  // announcements
  MatchKeys.noAnnouncements: 'No platform updates',
  MatchKeys.noAnnouncementsMsg: 'Announcements from BanjaraMatch will appear here',
  MatchKeys.noPersonalNotifications: 'No personal notifications',
  MatchKeys.noPersonalNotificationsMsg: 'Your matrimony updates will appear here',
  MatchKeys.openLink: 'Open link',
  MatchKeys.typeAnnouncement: 'Announcement',
  MatchKeys.typeUpdate: 'Update',
  MatchKeys.typeMaintenance: 'Maintenance',
  MatchKeys.typeEvent: 'Event',
};

const Map<String, String> matchStringsHi = {
  MatchKeys.horoscope: 'कुंडली विवरण',
  MatchKeys.gunaMilan: 'कुंडली मिलान',
  MatchKeys.savedSearches: 'सहेजी गई खोजें',
  MatchKeys.successStories: 'सफल जोड़ियाँ',
  // common
  MatchKeys.save: 'सहेजें',
  MatchKeys.cancel: 'रद्द करें',
  MatchKeys.clear: 'हटाएँ',
  MatchKeys.edit: 'बदलें',
  MatchKeys.delete: 'मिटाएँ',
  MatchKeys.select: 'चुनें',
  MatchKeys.optional: 'वैकल्पिक',
  MatchKeys.notSpecified: 'नहीं बताया',
  MatchKeys.you: 'आप',
  // horoscope screen
  MatchKeys.horoscopeIntro: 'आपकी राशि और नक्षत्र से दूसरे प्रोफ़ाइल के साथ कुंडली मिलान किया जाता है।',
  MatchKeys.birthTime: 'जन्म समय',
  MatchKeys.birthTimeHint: 'चुनने के लिए टैप करें',
  MatchKeys.birthPlace: 'जन्म स्थान',
  MatchKeys.birthPlaceHint: 'जन्म का शहर या गाँव',
  MatchKeys.rashi: 'राशि (चंद्र राशि)',
  MatchKeys.nakshatra: 'नक्षत्र',
  MatchKeys.manglikStatus: 'मांगलिक स्थिति',
  MatchKeys.manglikYes: 'हाँ',
  MatchKeys.manglikNo: 'नहीं',
  MatchKeys.manglikPartial: 'आंशिक',
  MatchKeys.manglikNotSpecified: 'नहीं बताया',
  MatchKeys.horoscopeRequired: 'कुंडली मिलान ज़रूरी है',
  MatchKeys.horoscopeRequiredHint: 'परिवारों को बताएँ कि आप कुंडली मिलान चाहते हैं',
  MatchKeys.horoscopeSaved: 'कुंडली सहेज ली गई',
  // profile screen
  MatchKeys.bloodGroup: 'ब्लड ग्रुप',
  MatchKeys.horoscopeMatch: 'कुंडली मिलान',
  MatchKeys.required: 'ज़रूरी',
  MatchKeys.notRequired: 'ज़रूरी नहीं',
  MatchKeys.checkKundli: 'कुंडली मिलान देखें',
  MatchKeys.addHoroscope: 'कुंडली जोड़ें',
  MatchKeys.managedBy: 'प्रोफ़ाइल @who द्वारा संभाली जाती है',
  MatchKeys.createdByParent: 'माता-पिता',
  MatchKeys.createdBySibling: 'भाई-बहन',
  MatchKeys.createdByRelative: 'रिश्तेदार',
  MatchKeys.createdByFriend: 'मित्र',
  // Guna Milan
  MatchKeys.gunaScore: 'अनुकूलता अंक',
  MatchKeys.gunaPoints: '@max में से @points अंक',
  MatchKeys.kootaBreakdown: 'कूट विवरण',
  MatchKeys.birthDetails: 'जन्म विवरण',
  MatchKeys.gunaMissingTitle: 'कुंडली विवरण नहीं है',
  MatchKeys.gunaMissingSelf: 'कुंडली मिलान देखने के लिए अपनी राशि और नक्षत्र जोड़ें।',
  MatchKeys.gunaMissingOther: '@name ने अभी राशि या नक्षत्र नहीं जोड़ा है।',
  MatchKeys.gunaMissingGeneric: 'एक या दोनों प्रोफ़ाइल में कुंडली की पूरी जानकारी नहीं है।',
  MatchKeys.addYourHoroscope: 'अपनी कुंडली जोड़ें',
  MatchKeys.gunaDisclaimer: 'केवल मार्गदर्शन के लिए। पूरी जानकारी के लिए पारिवारिक ज्योतिषी से सलाह लें।',
  MatchKeys.thisProfile: 'यह प्रोफ़ाइल',
  // saved searches
  MatchKeys.saveThisSearch: 'यह खोज सहेजें',
  MatchKeys.updateSavedSearch: 'सहेजी खोज अपडेट करें',
  MatchKeys.saveAsNew: 'नई खोज के रूप में सहेजें',
  MatchKeys.searchName: 'नाम',
  MatchKeys.searchNameHint: 'जैसे जयपुर, 25-30',
  MatchKeys.searchNameRequired: 'कृपया नाम लिखें (60 अक्षर तक)',
  MatchKeys.alertMe: 'नए मैच की सूचना दें',
  MatchKeys.alertMeHint: 'इस खोज से मेल खाने वाले नए प्रोफ़ाइल आने पर सूचना पाएँ',
  MatchKeys.searchSaved: 'खोज सहेज ली गई',
  MatchKeys.searchUpdated: 'सहेजी खोज अपडेट हो गई',
  MatchKeys.searchDeleted: 'सहेजी खोज मिटा दी गई',
  MatchKeys.savedLimit: 'आप अधिकतम @max खोजें सहेज सकते हैं। नई सहेजने के लिए एक मिटाएँ।',
  MatchKeys.savedCount: '@max में से @count सहेजी गईं',
  MatchKeys.noSavedSearches: 'अभी कोई सहेजी खोज नहीं',
  MatchKeys.noSavedSearchesMsg: 'खोज सहेजें ताकि एक टैप में दोबारा चला सकें और नए मैच की सूचना पा सकें।',
  MatchKeys.startSearch: 'खोज शुरू करें',
  MatchKeys.runSearch: 'चलाएँ',
  MatchKeys.deleteSavedSearchConfirm: 'सहेजी खोज "@name" मिटाएँ?',
  MatchKeys.editingSavedSearch: '"@name" बदल रहे हैं',
  MatchKeys.filterAge: 'उम्र @min-@max',
  MatchKeys.filterHeight: 'लंबाई @min-@max',
  MatchKeys.filterCaste: 'जाति (@count)',
  MatchKeys.filterGotra: 'गोत्र (@count)',
  MatchKeys.filterEducation: 'शिक्षा (@count)',
  MatchKeys.filterProfession: 'पेशा (@count)',
  MatchKeys.filterIncome: 'आय सीमा',
  MatchKeys.filterVerified: 'केवल सत्यापित',
  MatchKeys.filterRecent: 'हाल ही में सक्रिय',
  MatchKeys.filterAny: 'सभी प्रोफ़ाइल',
  // success stories
  MatchKeys.community: 'समुदाय',
  MatchKeys.myStories: 'मेरी कहानियाँ',
  MatchKeys.shareStory: 'अपनी कहानी बताएँ',
  MatchKeys.noStoriesTitle: 'अभी कोई कहानी नहीं',
  MatchKeys.noStoriesMsg: 'BanjaraMatch पर मिले जोड़ों की कहानियाँ प्रकाशित होने के बाद यहाँ दिखेंगी।',
  MatchKeys.noMyStoriesTitle: 'आपने अभी कोई कहानी नहीं बताई',
  MatchKeys.noMyStoriesMsg: 'यहाँ जीवनसाथी मिला? अपनी कहानी समुदाय के साथ बाँटें।',
  MatchKeys.marriedOn: 'विवाह @date',
  MatchKeys.featured: 'विशेष',
  MatchKeys.readMore: 'और पढ़ें',
  MatchKeys.showLess: 'कम दिखाएँ',
  MatchKeys.rejectionReason: 'कारण: @reason',
  // submit success story
  MatchKeys.submitStory: 'कहानी भेजें',
  MatchKeys.reviewNote: 'हर कहानी प्रकाशित होने से पहले हमारी टीम उसकी जाँच करती है।',
  MatchKeys.partner: 'आपका जीवनसाथी',
  MatchKeys.partnerHint: 'अपने कनेक्शन में से चुनें (वैकल्पिक)',
  MatchKeys.choosePartner: 'जीवनसाथी चुनें',
  MatchKeys.noConnections: 'अभी आपका कोई कनेक्शन नहीं है। आप नीचे दोनों नाम लिख सकते हैं।',
  MatchKeys.groomName: 'वर का नाम',
  MatchKeys.brideName: 'वधू का नाम',
  MatchKeys.story: 'आपकी कहानी',
  MatchKeys.storyHint: 'आप कैसे मिले? आपने एक-दूसरे को क्यों चुना?',
  MatchKeys.weddingDate: 'विवाह की तारीख',
  MatchKeys.city: 'शहर',
  MatchKeys.photo: 'फ़ोटो',
  MatchKeys.addPhoto: 'फ़ोटो जोड़ें',
  MatchKeys.groomRequired: 'कृपया वर का नाम लिखें',
  MatchKeys.brideRequired: 'कृपया वधू का नाम लिखें',
  MatchKeys.storyTooShort: 'कहानी कम से कम @min अक्षरों की होनी चाहिए',
  MatchKeys.storyTooLong: 'कहानी अधिकतम @max अक्षरों की हो सकती है',
  MatchKeys.storySubmitted: 'धन्यवाद! जाँच के बाद आपकी कहानी दिखेगी।',
  // announcements
  MatchKeys.noAnnouncements: 'कोई प्लेटफ़ॉर्म अपडेट नहीं',
  MatchKeys.noAnnouncementsMsg: 'BanjaraMatch की घोषणाएँ यहाँ दिखेंगी',
  MatchKeys.noPersonalNotifications: 'कोई व्यक्तिगत सूचना नहीं',
  MatchKeys.noPersonalNotificationsMsg: 'आपके रिश्तों से जुड़े अपडेट यहाँ दिखेंगे',
  MatchKeys.openLink: 'लिंक खोलें',
  MatchKeys.typeAnnouncement: 'घोषणा',
  MatchKeys.typeUpdate: 'अपडेट',
  MatchKeys.typeMaintenance: 'रखरखाव',
  MatchKeys.typeEvent: 'कार्यक्रम',
};
