import 'package:banjaramatch/utilities/const.dart';

class WebService {
  static const String fetchSetting = "${apiURL}fetchSetting";
  static const String fetchPlatformNotification = "${apiURL}fetchPlatformNotification";
  static const String fetchUserNotification = "${apiURL}fetchUserNotification";
  static const String fetchFAQs = "${apiURL}fetchFAQs";
  static const String uploadFile = "${apiURL}uploadFile";

  static const String logOut = "${apiURL}auth/logout";
  static const String deleteUser = "${apiURL}deleteUser";
  static const String editProfile = "${apiURL}editProfile";
  static const String checkUsername = "${apiURL}checkUsername";
  static const String addUser = "${apiURL}addUser";
  static const String fetchRandomProfile = "${apiURL}fetchRandomProfile";
  static const String followUser = "${apiURL}followUser";
  static const String unfollowUser = "${apiURL}unfollowUser";
  static const String fetchProfile = "${apiURL}fetchProfile";
  static const String reportUser = "${apiURL}reportUser";
  static const String profileVerification = "${apiURL}profileVerification";
  static const String searchProfile = "${apiURL}searchProfile";
  static const String fetchFollowingList = "${apiURL}fetchFollowingList";
  static const String fetchFollowersList = "${apiURL}fetchFollowersList";
  static const String userBlockedByUser = "${apiURL}UserBlockedByUser";
  static const String userUnBlockedByUser = "${apiURL}UserUnblockedByUser";
  static const String fetchBlockedUserList = "${apiURL}fetchBlockedUserList";

  /// Deletes (hides) a 1:1 chat room — not the removed social "rooms" feature.
  static const String deleteRoom = "${apiURL}deleteRoom";

  static const String fetchUsersList = "${apiURL}fetchUsersList";
  static const String searchProfiles = "${apiURL}searchProfiles";

  static const String sendInterestRequest = "${apiURL}sendInterestRequest";
  static const String cancelInterestRequest = "${apiURL}cancelInterestRequest";
  static const String rejectInterestRequest = "${apiURL}rejectInterestRequest";
  static const String acceptInterestRequest = "${apiURL}acceptInterestRequest";
  static const String removeConnection = "${apiURL}removeConnection";

  static const String toggleShortList = "${apiURL}toggleShortList";
  static const String chatUserList = "${apiURL}fetchUserRooms";
  static const String chatRequestList = "${apiURL}fetchPendingRooms";
  static const String fetchMessages = "${apiURL}fetchMessages";
  static const String fetchRoomId = "${apiURL}fetchOrGenerateRoom";
  static const String profileVisitorSummary = "${apiURL}getProfileVisitorSummary";
  static const String fetchCasteList = "${apiURL}fetchCasteList";
  static const String fetchGotraList = "${apiURL}fetchGotraList";
  static const String fetchCountryList = "${apiURL}countries";
  static const String fetchStateList = "${apiURL}states";
  static const String fetchCityList = "${apiURL}cities";
  static const String getInterestList = "${apiURL}getInterestList";
  static const String fetchBanners = "${apiURL}fetchBanner";

  static const String getTopDailyMatches = "${apiURL}getTopDailyMatches";
  static const String fetchNearbyMatches = "${apiURL}fetchNearbyMatches";
  static const String fetchTrendingProfiles = "${apiURL}fetchTrendingProfiles";
  static const String fetchHighlightedUsers = "${apiURL}fetchHighlightedUsers";

  static const String getMarriageIntent = "${apiURL}getMarriageIntent";
  static const String getUserOnlinePattern = "${apiURL}getUserOnlinePattern";
  static const String getMatchMomentum = "${apiURL}getMatchMomentum";

  static const String markNotificationsRead = "${apiURL}markNotificationsRead";

  static const String uploadUserPhotos = "${apiURL}uploadUserPhotos";
  static const String getUserPhotos = "${apiURL}getUserPhotos";
  static const String deleteUserPhoto = "${apiURL}deleteUserPhoto";
  static const String reorderUserPhotos = "${apiURL}reorderUserPhotos";
  static const String setMainProfileImage = "${apiURL}setMainProfileImage";
  static const String fetchProfessionList = "${apiURL}fetchProfessionList";
  static const String fetchQualificationList = "${apiURL}fetchQualificationList";

  static const fetchIncomeRange = '${apiURL}fetchIncomeRange';
  static const loginWithEmail = '${apiURL}auth/loginWithEmail';
  static const registerWithEmail = '${apiURL}auth/registerWithEmail';
  static const firebaseEmailLogin = '${apiURL}auth/firebase-email-login';
  static const firebaseEmailRegister = '${apiURL}auth/firebase-email-register';
  static const firebaseGoogleLogin = '${apiURL}auth/firebase-google-login';

  static const fetchOptions = '${apiURL}about/options';
  static const generateAbout = '${apiURL}about/generate';
  static const comparePreferencesFit = '${apiURL}comparePreferencesFit';

  static const String fetchLiveActivity = "${apiURL}fetchLiveActivity";

  // ─── Feature expansion 1.1.0 (see docs/plans/01-feature-expansion.md contracts) ───
  static const String getShortListedUsers = "${apiURL}getShortListedUsers";
  static const String fetchRecommendations = "${apiURL}fetchRecommendations";

  // Verification
  static const String fetchVerificationStatus = "${apiURL}fetchVerificationStatus";

  // Guna Milan (POST, authenticated)
  static const String gunaMilan = "${apiURL}compatibility/guna-milan";

  // Saved searches
  static const String fetchSavedSearches = "${apiURL}fetchSavedSearches";
  static const String createSavedSearch = "${apiURL}createSavedSearch";
  static const String updateSavedSearch = "${apiURL}updateSavedSearch";
  static const String deleteSavedSearch = "${apiURL}deleteSavedSearch";
  static const String runSavedSearch = "${apiURL}runSavedSearch";

  // Success stories
  /// Public list: GET ?page&limit(&featured=1)
  static const String successStories = "${apiURL}success-stories";
  static const String fetchMySuccessStories = "${apiURL}fetchMySuccessStories";
  static const String submitSuccessStory = "${apiURL}submitSuccessStory";

  // FAQ (public GET mirror of fetchFAQs)
  static const String faqs = "${apiURL}faqs";

  // Calls (Agora)
  static const String callToken = "${apiURL}calls/token";

  /// GET ?page&limit
  static const String callHistory = "${apiURL}calls/history";

  // Contact / help form
  static const String contactSubmit = "${apiURL}contact/submit";
}
