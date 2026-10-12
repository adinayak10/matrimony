import 'package:banjaramatch/utilities/const.dart';

class WebService {
  static const String fetchSetting = "${apiURL}fetchSetting";
  static const String fetchPlatformNotification = "${apiURL}fetchPlatformNotification";
  static const String fetchUserNotification = "${apiURL}fetchUserNotification";
  static const String fetchFAQs = "${apiURL}fetchFAQs";
  static const String fetchPosts = "${apiURL}fetchPosts";
  static const String likePost = "${apiURL}likePost";
  static const String dislikePost = "${apiURL}dislikePost";
  static const String deleteMyPost = "${apiURL}deleteMyPost";
  static const String addPost = "${apiURL}addPost";
  static const String fetchPostByUser = "${apiURL}fetchPostByUser";
  static const String reportPost = "${apiURL}reportPost";
  static const String addComment = "${apiURL}addComment";
  static const String deleteComment = "${apiURL}deleteComment";
  static const String fetchComments = "${apiURL}fetchComments";
  static const String fetchPostsByHashtag = "${apiURL}fetchPostsByHashtag";
  static const String fetchPostByPostId = "${apiURL}fetchPostByPostId";
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

  static const String createRoom = "${apiURL}createRoom";
  static const String editRoom = "${apiURL}editRoom";
  static const String fetchMyOwnRooms = "${apiURL}fetchMyOwnRooms";
  static const String fetchRoomsByInterest = "${apiURL}fetchRoomsByInterest";
  static const String fetchRandomRooms = "${apiURL}fetchRandomRooms";
  static const String fetchRoomDetail = "${apiURL}fetchRoomDetail";
  static const String reportRoom = "${apiURL}reportRoom";
  static const String joinOrRequestRoom = "${apiURL}joinOrRequestRoom";
  static const String acceptInvitation = "${apiURL}acceptInvitation";
  static const String rejectInvitation = "${apiURL}rejectInvitation";
  static const String getInvitationList = "${apiURL}getInvitationList";
  static const String inviteUserToRoom = "${apiURL}inviteUserToRoom";
  static const String leaveThisRoom = "${apiURL}leaveThisRoom";
  static const String fetchRoomRequestList = "${apiURL}fetchRoomRequestList";
  static const String acceptRoomRequest = "${apiURL}acceptRoomRequest";
  static const String rejectRoomRequest = "${apiURL}rejectRoomRequest";
  static const String deleteRoom = "${apiURL}deleteRoom";
  static const String fetchRoomUsersList = "${apiURL}fetchRoomUsersList";
  static const String fetchRoomAdmins = "${apiURL}fetchRoomAdmins";
  static const String removeUserFromRoom = "${apiURL}removeUserFromRoom";
  static const String makeRoomAdmin = "${apiURL}makeRoomAdmin";
  static const String removeAdminFromRoom = "${apiURL}removeAdminFromRoom";
  static const String searchUserForInvitation = "${apiURL}searchUserForInvitation";
  static const String muteUnmuteRoomNotification = "${apiURL}muteUnmuteRoomNotification";
  static const String fetchRoomsIAmIn = "${apiURL}fetchRoomsIAmIn";

  static const String fetchStories = "${apiURL}fetchStory";
  static const String viewStory = "${apiURL}viewStory";
  static const String createStory = "${apiURL}createStory";
  static const String deleteStory = "${apiURL}deleteStory";

  ///////////////////
  static const String banners = "${apiURL}fetchBanners";
  static const String premiumUsers = "${apiURL}fetchPremiumUsers";
  static const String trustedUsers = "${apiURL}fetchtrustedUsers";
  static const String packages = "${apiURL}fetchPackages";
  static const String happyStories = "${apiURL}fetchHappyStories";
  static const String stories = "${apiURL}fetchStories";
  static const String reviews = "${apiURL}fetchReviews";
  static const String blogs = "${apiURL}fetchBlogs";
  static const String fetchUsersList = "${apiURL}fetchUsersList";
  static const String searchProfiles = "${apiURL}searchProfiles";

  static const String pushNotificationToSingleUser = "${apiURL}pushNotificationToSingleUser";

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
  static const requestOtp = '${apiURL}auth/request-otp';
  static const verifyOtp = '${apiURL}auth/verify-otp';
  static const loginWithEmail = '${apiURL}auth/loginWithEmail';
  static const registerWithEmail = '${apiURL}auth/registerWithEmail';
  static const firebaseEmailLogin = '${apiURL}auth/firebase-email-login';
  static const firebaseEmailRegister = '${apiURL}auth/firebase-email-register';
  static const firebaseGoogleLogin = '${apiURL}auth/firebase-google-login';

  static const fetchOptions = '${apiURL}about/options';
  static const generateAbout = '${apiURL}about/generate';
  static const comparePreferencesFit = '${apiURL}comparePreferencesFit';

  static const String fetchLiveActivity = "${apiURL}fetchLiveActivity";
}
