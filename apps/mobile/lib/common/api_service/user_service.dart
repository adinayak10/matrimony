import 'dart:convert';

import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:banjaramatch/common/api_service/api_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/ModelCommonEducationQualificationListResponse.dart';
import 'package:banjaramatch/models/common_response.dart';
import 'package:banjaramatch/models/marrige_intent_model.dart';
import 'package:banjaramatch/models/model_cast_gotra_list.dart';
import 'package:banjaramatch/models/model_chat_room_list.dart';
import 'package:banjaramatch/models/model_fetch_room_id.dart';
import 'package:banjaramatch/models/model_interest_user_list.dart';
import 'package:banjaramatch/models/model_match_momemtum.dart';
import 'package:banjaramatch/models/model_recent_visitor_list.dart';
import 'package:banjaramatch/models/model_trending_profiles_response.dart';
import 'package:banjaramatch/models/model_user_online_pattern.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/models/users_model.dart';
import 'package:banjaramatch/screens/banner.dart';
import 'package:banjaramatch/screens/login_screen/login_controller.dart';
import 'package:banjaramatch/screens/model_gallery_photo.dart';
import 'package:banjaramatch/screens/model_upload_gallery_photos.dart';
import 'package:banjaramatch/screens/preference_fit_model.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/params.dart';
import 'package:banjaramatch/utilities/web_service.dart';

import '../../models/setting_model.dart';
import '../../screens/explore_screen/model_live_activity.dart';

class UserService {
  static var shared = UserService();

  void fetchFollowingList(String userId, int start, Function(List<User> users) completion) {
    var param = {
      Param.myUserId: userId,
      Param.start: start,
      Param.limit: Limits.pagination,
    };
    ApiService.shared.call(
      url: WebService.fetchFollowingList,
      param: param,
      completion: (response) {
        var users = UsersModel.fromJson(response).data;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  void fetchFollowerList(String userId, int start, Function(List<User> users) completion) {
    var param = {
      Param.userId: userId,
      Param.start: start,
      Param.limit: Limits.pagination,
    };
    ApiService.shared.call(
      url: WebService.fetchFollowersList,
      param: param,
      completion: (response) {
        var users = UsersModel.fromJson(response).data;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  void searchProfile(String keyword, int start, Function(List<User> users) completion) {
    var param = {
      Param.myUserId: SessionManager.shared.getUserID(),
      Param.keyword: keyword,
      Param.start: start,
      Param.limit: Limits.pagination,
    };

    ApiService.shared.call(
      url: WebService.searchProfile,
      param: param,
      completion: (response) {
        var users = UsersModel.fromJson(response).data;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  void fetchBlockedUserList(Function(List<User> users) completion) {
    var param = {
      Param.myUserId: SessionManager.shared.getUserID(),
      Param.limit: Limits.pagination,
    };

    ApiService.shared.call(
      url: WebService.fetchBlockedUserList,
      param: param,
      completion: (response) {
        var users = UsersModel.fromJson(response).data;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  void reportUser(String userId, String reason, String desc) {
    var param = {
      Param.userId: userId,
      Param.myUserId: SessionManager.shared.getUserID(),
      Param.reason: reason,
      Param.desc: desc
    };
    ApiService.shared.call(
      url: WebService.reportUser,
      param: param,
      completion: (response) {
        var obj = CommonResponse.fromJson(response);
        if (obj.status == true) {
          Get.back();
          Get.back();
          BaseController.share.showSnackBar(LKeys.reportAddedSuccessfully.tr, type: SnackBarType.success);
        }
      },
    );
  }

  void followUser(String userId, Function() completion) {
    var param = {Param.userId: userId, Param.myUserId: SessionManager.shared.getUserID()};
    ApiService.shared.call(
      url: WebService.followUser,
      param: param,
      completion: (response) {
        var obj = CommonResponse.fromJson(response);
        if (obj.status == true) {
          completion();
        }
      },
    );
  }

  void acceptFriendReuquest(String userId, Function() completion) {
    var param = {Param.userId: userId, Param.myUserId: SessionManager.shared.getUserID()};
    ApiService.shared.call(
      url: WebService.acceptInterestRequest,
      param: param,
      completion: (response) {
        var obj = CommonResponse.fromJson(response);
        if (obj.status == true) {
          completion();
        }
      },
    );
  }

  void blockUser(String userId, Function() completion) {
    var param = {Param.userId: userId, Param.myUserId: SessionManager.shared.getUserID()};
    ApiService.shared.call(
      url: WebService.userBlockedByUser,
      param: param,
      completion: (response) {
        var obj = CommonResponse.fromJson(response);
        if (obj.status == true) {
          completion();
        }
      },
    );
  }

  void unblockUser(String userId, Function() completion) {
    var param = {Param.userId: userId, Param.myUserId: SessionManager.shared.getUserID()};
    ApiService.shared.call(
      url: WebService.userUnBlockedByUser,
      param: param,
      completion: (response) {
        var obj = Registration.fromJson(response);
        if (obj.status == true) {
          SessionManager.shared.setUser(obj.data);
          completion();
        }
      },
    );
  }

  void unfollowUser(String userId, Function() completion) {
    var param = {Param.userId: userId, Param.myUserId: SessionManager.shared.getUserID()};
    ApiService.shared.call(
      url: WebService.unfollowUser,
      param: param,
      completion: (response) {
        var obj = CommonResponse.fromJson(response);
        if (obj.status == true) {
          completion();
        }
      },
    );
  }

  void fetchProfile(String userID, Function(User user) completion) {
    var param = {Param.myUserId: SessionManager.shared.getUserID(), Param.userId: userID.toString()};

    ApiService.shared.call(
      param: param,
      url: WebService.fetchProfile,
      completion: (p0) {
        var user = Registration.fromJson(p0).data;
        if (user != null) {
          completion(user);
        }
      },
    );
  }

  void fetchUserPhotos({
    required String userId,
    required Function(List<GalleryPhoto> photos) completion,
  }) {
    ApiService.shared.call(
      url: WebService.getUserPhotos,
      param: {"user_id": userId},
      completion: (response) {
        var res = ModelGalleryPhotos.fromJson(response);

        completion(res.data!);
      },
    );
  }

  void uploadUserPhotos(XFile file, String userId, Function(List<GalleryPhoto>) completion) {
    var param = {
      Param.userId: userId,
    };
    ApiService.shared.multiPartCallApi(
      param: param,
      url: WebService.uploadUserPhotos,
      filesMap: {
        'photos': [file]
      },
      completion: (response) {
        var res = ModelUploadPhotos.fromJson(response);

        completion(res.data!);
      },
    );
  }

  void deleteUserPhoto({
    required String imageId,
    required String userId,
    required Function(bool success) completion,
  }) {
    ApiService.shared.call(
      url: WebService.deleteUserPhoto,
      param: {"user_id": userId, "image_id": imageId},
      completion: (response) {
        var obj = CommonResponse.fromJson(response).status;
        if (obj == true) {
          completion(true);
        }
      },
    );
  }

  void reorderUserPhotos({
    required String userId,
    required List<String> orderedImageIds,
    required Function(bool success) completion,
  }) {
    ApiService.shared.call(
      url: WebService.reorderUserPhotos,
      param: {
        "user_id": userId,
        "ordered_ids": orderedImageIds,
      },
      completion: (response) {
        var obj = CommonResponse.fromJson(response).status;
        if (obj == true) {
          completion(true);
        }
      },
    );
  }

  void setMainProfileImage({
    required String userId,
    required String imageId,
    required Function(String profileUrl) completion,
  }) {
    ApiService.shared.call(
      url: WebService.setMainProfileImage,
      param: {
        "user_id": userId,
        "image_id": imageId,
      },
      completion: (response) {
        var obj = CommonResponse.fromJson(response).status;
        if (obj == true) {
          completion("");
        }
      },
    );
  }

  void fetchProfileVisitors(String type, Function(List<User> users) completion) {
    var param = {
      Param.myUserId: SessionManager.shared.getUserID(),
      'type': type, // 'i_viewed', 'they_viewed_me', or 'mutual'
      Param.limit: Limits.pagination,
    };

    ApiService.shared.call(
      param: param,
      url: WebService.profileVisitorSummary,
      completion: (res) {
        var response = ModelRecentUserList.fromJson(res);

        completion(response.data!);
      },
    );
  }

  void fetchLiveActivityData(String type, Function(List<LiveActivity> users) completion) {
    var param = {
      Param.myUserId: SessionManager.shared.getUserID(),
      'type': type, // 'i_viewed', 'they_viewed_me', or 'mutual'
      Param.limit: Limits.pagination,
    };

    ApiService.shared.call(
      param: param,
      url: WebService.fetchLiveActivity,
      completion: (res) {
        final liveActivityResponse = LiveActivityResponse.fromJson(res);
        completion(liveActivityResponse.data);
      },
    );
  }

  void fetchProfileFitApi(String userID, Function(PreferenceFitModel preferencefit) completion) {
    var param = {Param.myUserId: SessionManager.shared.getUserID(), Param.userId: userID.toString()};

    ApiService.shared.call(
      param: param,
      url: WebService.comparePreferencesFit,
      completion: (res) {
        var response = PreferenceFitModel.fromJson(res);

        completion(response);
      },
    );
  }

  void fetchBanners(Function(List<AppBanner> banners) completion) {
    var param = {
      Param.myUserId: SessionManager.shared.getUserID(),
    };

    ApiService.shared.call(
      param: param,
      url: WebService.fetchBanners,
      completion: (res) {
        var response = ModelBannerList.fromJson(res).data;
        completion(response!);
      },
    );
  }

  void fetchChatRoom(String userId, Function(ChatRoom roomId) completion) {
    var param = {
      "userA_id": SessionManager.shared.getUserID(),
      "userB_id": userId,
    };

    ApiService.shared.call(
      url: WebService.fetchRoomId,
      // e.g. '/api/chat/fetchRoomId'

      param: param,
      completion: (response) {
        var obj = ModelFetchRoomId.fromJson(response);
        if (obj.status == true) {
          print("/////////////////");
          print(jsonEncode(obj.room));

          completion(obj!.room!);
        }
      },
    );
  }

  void fetchMyProfile({required String userID, String? myUserId, required Function(User? user) completion}) {
    var param = {Param.myUserId: myUserId ?? SessionManager.shared.getUserID(), Param.userId: userID.toString()};

    ApiService.shared.call(
      param: param,
      url: WebService.fetchProfile,
      completion: (p0) {
        var user = Registration.fromJson(p0).data;
        if (user != null) {
          completion(user);
        } else {
          completion(null);
        }
      },
    );
  }

  void fetchRandomProfile(Function(User user) completion) {
    var param = {Param.myUserId: SessionManager.shared.getUserID()};
    ApiService.shared.call(
      url: WebService.fetchRandomProfile,
      param: param,
      completion: (response) {
        User? user = Registration.fromJson(response).data;
        if (user != null) {
          completion(user);
        }
      },
    );
  }

  void logOut(Function() completion) {
    var param = {Param.userId: SessionManager.shared.getUserID()};
    ApiService.shared.call(
      url: WebService.logOut,
      param: param,
      completion: (data) {
        var obj = CommonResponse.fromJson(data).status;
        if (obj == true) {
          completion();
        }
      },
    );
  }

  void deleteUser(Function() completion) {
    var param = {Param.userId: SessionManager.shared.getUserID()};
    ApiService.shared.call(
      url: WebService.deleteUser,
      param: param,
      completion: (data) {
        var obj = CommonResponse.fromJson(data).status;
        if (obj == true) {
          completion();
        }
      },
    );
  }

  void editProfileWithMultipart({
    String? fullName,
    String? bio,
    List<Interest>? interests,
    XFile? profileImage,
    XFile? bgImage,
    String? blockUserIds,
    bool? isPushNotifications,
    bool? isInvitedToRoom,
    int? isVerified,
    Map<String, Object>? extraParam,
    Map<String, dynamic>? preferences,
    Map<String, Object>? settings,
    required Function(User) completion,
  }) {
    Map<String, Object> param = {Param.userId: SessionManager.shared.getUserID()};

    if (fullName != null) {
      param[Param.fullName] = fullName;
    }

    if (bio != null) {
      param[Param.bio] = bio;
    }

    if (isVerified != null) {
      param[Param.isVerified] = isVerified;
    }

    if (blockUserIds != null) {
      param[Param.blockUserIds] = blockUserIds;
    }
    if (isPushNotifications != null) {
      param[Param.isPushNotifications] = isPushNotifications ? 1 : 0;
    }
    if (isInvitedToRoom != null) {
      param[Param.isInvitedToRoom] = isInvitedToRoom ? 1 : 0;
    }

    if (interests?.isNotEmpty == true) {
      var str = (interests ?? []).map((e) => "${e.id ?? 0}").toList().join(",");
      param[Param.interestIds] = str;
    }

    if (settings != null) {
      param['settings'] = settings;
    }

    if (extraParam?.isNotEmpty == true) {
      param.addAll(extraParam!);
    }

    ApiService.shared.multiPartCallApi(
      url: WebService.editProfile,
      param: param,
      filesMap: {
        Param.profile: [profileImage],
        Param.backgroundImage: [bgImage]
      },
      completion: (data) {
        var user = Registration.fromJson(data).data;
        if (user != null) {
          SessionManager.shared.setUser(user);
          completion(user);
        }
      },
    );
  }

  void editProfile({
    String? fullName,
    String? bio,
    List<Interest>? interests,
    XFile? profileImage,
    XFile? bgImage,
    String? blockUserIds,
    bool? isPushNotifications,
    bool? isInvitedToRoom,
    int? isVerified,
    Map<String, Object>? extraParam,
    Map<String, Object>? preferences,
    Map<String, Object>? family,
    Map<String, Object>? settings,
    required Function(User) completion,
  }) {
    Map<String, Object> param = {Param.userId: SessionManager.shared.getUserID()};

    if (fullName != null) {
      param[Param.fullName] = fullName;
    }

    if (bio != null) {
      param[Param.bio] = bio;
    }

    if (isVerified != null) {
      param[Param.isVerified] = isVerified;
    }

    if (blockUserIds != null) {
      param[Param.blockUserIds] = blockUserIds;
    }
    if (isPushNotifications != null) {
      param[Param.isPushNotifications] = isPushNotifications ? 1 : 0;
    }
    if (isInvitedToRoom != null) {
      param[Param.isInvitedToRoom] = isInvitedToRoom ? 1 : 0;
    }

    if (interests?.isNotEmpty == true) {
      var str = (interests ?? []).map((e) => "${e.id ?? 0}").toList().join(",");
      param[Param.interestIds] = str;
    }

    if (extraParam?.isNotEmpty == true) {
      param.addAll(extraParam!);
    }
    if (preferences?.isNotEmpty == true) {
      print(preferences);
      print('////////////////////////////////');

      param.addAll(preferences!);
    }
    if (family?.isNotEmpty == true) {
      print(family);
      print('////////////////////////////////');
      param.addAll(family!);
    }
    if (settings != null) {
      param['settings'] = settings;
    }

    ApiService.shared.call(
      url: WebService.editProfile,
      param: param,
      completion: (data) {
        var user = Registration.fromJson(data).data;
        if (user != null) {
          SessionManager.shared.setUser(user);
          completion(user);
        }
      },
    );
  }

  void registration(
      {String? name,
      required String identity,
      required String deviceToken,
      required LoginType loginType,
      required Function(Registration) completion}) async {
    Map<String, String> map = {};
    if (name != null) {
      map[Param.fullName] = name;
    }
    map[Param.identity] = identity;
    map[Param.deviceToken] = deviceToken;
    map[Param.loginType] = loginType.value.toString();
    map[Param.deviceType] = (GetPlatform.isIOS ? 1 : 0).toString();

    ApiService.shared.call(
      url: WebService.addUser,
      param: map,
      completion: (p0) {
        var registration = Registration.fromJson(p0);
        var user = registration.data;
        print("alksdjlaksdaalskdhajlsd");
        if (user != null) {
          print("alksdjlaksda");
          SessionManager.shared.setUser(user);
          completion(registration);
        }
      },
    );
  }

  void loginWithEmail({
    required String email,
    required String password,
    required String deviceToken,
    required int deviceType,
    required Function(Registration) completion,
  }) {
    Map<String, String> map = {
      'email': email,
      'password': password,
      'device_token': deviceToken,
      'device_type': deviceType.toString(),
    };

    ApiService.shared.call(
      url: WebService.loginWithEmail,
      param: map,
      completion: (p0) {
        var registration = Registration.fromJson(p0);
        var user = registration.data;
        if (user != null) {
          SessionManager.shared.setUser(user);
          completion(registration);
        } else {
          completion(registration);
        }
      },
    );
  }

  void registerWithEmail({
    required String fullName,
    required String email,
    required String password,
    String? phone,
    required String deviceToken,
    required int deviceType,
    required Function(Registration) completion,
  }) {
    Map<String, String> map = {
      'full_name': fullName,
      'email': email,
      'password': password,
      'device_token': deviceToken,
      'device_type': deviceType.toString(),
    };

    if (phone != null && phone.isNotEmpty) {
      map['phone'] = phone;
    }

    ApiService.shared.call(
      url: WebService.registerWithEmail,
      param: map,
      completion: (p0) {
        var registration = Registration.fromJson(p0);
        var user = registration.data;
        if (user != null) {
          SessionManager.shared.setUser(user);
          completion(registration);
        } else {
          completion(registration);
        }
      },
    );
  }

  // Firebase Email Authentication methods
  void firebaseEmailLogin({
    required String email,
    required String firebaseUid,
    required String firebaseToken,
    required String deviceToken,
    required int deviceType,
    required Function(Registration) completion,
  }) {
    Map<String, String> map = {
      'email': email,
      'firebaseUid': firebaseUid,
      'firebaseToken': firebaseToken,
      'device_token': deviceToken,
      'device_type': deviceType.toString(),
    };

    ApiService.shared.call(
      url: WebService.firebaseEmailLogin,
      param: map,
      completion: (p0) {
        var registration = Registration.fromJson(p0);
        var user = registration.data;
        if (user != null) {
          SessionManager.shared.setUser(user);
          completion(registration);
        } else {
          completion(registration);
        }
      },
    );
  }

  void firebaseEmailRegister({
    required String fullName,
    required String email,
    required String firebaseUid,
    required String firebaseToken,
    String? phone,
    required String deviceToken,
    required int deviceType,
    required Function(Registration) completion,
  }) {
    Map<String, String> map = {
      'full_name': fullName,
      'email': email,
      'firebaseUid': firebaseUid,
      'firebaseToken': firebaseToken,
      'device_token': deviceToken,
      'device_type': deviceType.toString(),
    };

    if (phone != null && phone.isNotEmpty) {
      map['phone'] = phone;
    }

    ApiService.shared.call(
      url: WebService.firebaseEmailRegister,
      param: map,
      completion: (p0) {
        var registration = Registration.fromJson(p0);
        var user = registration.data;
        if (user != null) {
          SessionManager.shared.setUser(user);
          completion(registration);
        } else {
          completion(registration);
        }
      },
    );
  }

  void firebaseGoogleLogin({
    required String email,
    required String fullName,
    required String firebaseUid,
    required String firebaseToken,
    String? photoURL,
    required String deviceToken,
    required int deviceType,
    required Function(Registration) completion,
  }) {
    Map<String, String> map = {
      'email': email,
      'full_name': fullName,
      'firebaseUid': firebaseUid,
      'firebaseToken': firebaseToken,
      'device_token': deviceToken,
      'device_type': deviceType.toString(),
    };

    if (photoURL != null && photoURL.isNotEmpty) {
      map['photoURL'] = photoURL;
    }

    ApiService.shared.call(
      url: WebService.firebaseGoogleLogin,
      param: map,
      completion: (p0) {
        var registration = Registration.fromJson(p0);
        var user = registration.data;
        if (user != null) {
          SessionManager.shared.setUser(user);
          completion(registration);
        } else {
          completion(registration);
        }
      },
    );
  }

  void fetchProfiles({
    required int page,
    Map<String, dynamic>? filters,
    String? type,
    bool? matchMyPreference,
    bool? matchTheirPreference,
    bool? onlyProWithoutPlan,
    bool? sortByNewUsers,
    bool? isShortListedByMe,
    bool? isShortListedByThey,
    int? isVerify,
    required Function(List<User>) completion,
  }) {
    // Start building parameters
    var param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
      'page': page,
      Param.start: page,
      Param.limit: Limits.pagination,
    };

    // Add optional params only if they are provided
    if (filters != null && filters.isNotEmpty) {
      param['filters'] = filters;
    }
    if (type != null) {
      param['type'] = type;
    }
    if (matchMyPreference != null) {
      param['matchMyPreference'] = matchMyPreference;
    }
    if (matchTheirPreference != null) {
      param['matchTheirPreference'] = matchTheirPreference;
    }
    if (onlyProWithoutPlan != null) {
      param['onlyProWithPlan'] = onlyProWithoutPlan;
    }
    if (isVerify == 1) {
      param['isVerify'] = isVerify;
    }

    if (isShortListedByMe != null) {
      param['isShortListedByMe'] = isShortListedByMe;
    }

    if (isShortListedByThey != null) {
      param['isShortListedByThey'] = isShortListedByThey;
    }

    if (sortByNewUsers != null) {
      param['sortByNewUsers'] = sortByNewUsers;
    }

    // API call
    ApiService.shared.call(
      url: WebService.fetchUsersList,
      param: param,
      completion: (response) {
        var users = UsersModel.fromJson(response).data;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  void fetchTrendingProfiles({
    required int page,
    required Function(List<Result>) completion,
  }) {
    // Start building parameters
    var param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
      Param.start: page,
      Param.limit: Limits.pagination,
    };

    // API call
    ApiService.shared.call(
      url: WebService.fetchTrendingProfiles,
      param: param,
      completion: (response) {
        var users = ModelTrendingProfileListResponse.fromJson(response).result;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  void searchAndFetchProfiles({
    required int page,
    Map<String, dynamic>? filters,
    String? type,
    bool? matchMyPreference,
    bool? matchTheirPreference,
    bool? onlyProWithoutPlan,
    bool? sortByNewUsers,
    bool? isShortListedByMe,
    bool? isShortListedByThey,
    int? isVerify,
    required Function(List<User>) completion,
  }) {
    // Start building parameters
    var param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
      'page': page,
      Param.start: page,
      Param.limit: Limits.pagination,
    };

    // Add optional params only if they are provided
    if (filters != null && filters.isNotEmpty) {
      param['filters'] = filters;
    }
    if (type != null) {
      param['type'] = type;
    }
    if (matchMyPreference != null) {
      param['matchMyPreference'] = matchMyPreference;
    }
    if (matchTheirPreference != null) {
      param['matchTheirPreference'] = matchTheirPreference;
    }
    if (onlyProWithoutPlan != null) {
      param['onlyProWithPlan'] = onlyProWithoutPlan;
    }
    if (isVerify == 1) {
      param['isVerify'] = isVerify;
    }

    if (isShortListedByMe != null) {
      param['isShortListedByMe'] = isShortListedByMe;
    }

    if (isShortListedByThey != null) {
      param['isShortListedByThey'] = isShortListedByThey;
    }

    if (sortByNewUsers != null) {
      param['sortByNewUsers'] = sortByNewUsers;
    }

    // API call
    ApiService.shared.call(
      url: WebService.searchProfiles,
      param: param,
      completion: (response) {
        print("alkdjslksadfhlasdljfaksf");

        var users = UsersModel.fromJson(response).data;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  /// `fetchNearbyMatches`: needs coordinates on the profile (see [updateCoordinates]).
  /// Always calls [completion] (empty list on failure, incl. 400 "no coordinates").
  void fetchNearbyProfiles({
    required int page,
    int? radiusKm,
    int? limit,
    required Function(List<User>) completion,
  }) {
    var param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
      'page': page,
      Param.start: page,
      Param.limit: limit ?? Limits.pagination,
    };
    if (radiusKm != null) {
      param['radiusKm'] = radiusKm;
    }

    ApiService.shared.call(
      url: WebService.fetchNearbyMatches,
      param: param,
      completion: (response) {
        completion(UsersModel.fromJson(response).data ?? []);
      },
    );
  }

  /// `getTopDailyMatches` returns one ranked list (no paging): page > 1 yields
  /// an empty list so paged screens stop. Rows carry `matchScore`, `matchedOn`,
  /// `matchPercent`. Always calls [completion].
  void getTopDailyMatches({
    required int page,
    int? limit,
    required Function(List<User>) completion,
  }) {
    if (page > 1) {
      completion([]);
      return;
    }
    var param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
      Param.limit: limit ?? 20,
    };

    ApiService.shared.call(
      url: WebService.getTopDailyMatches,
      param: param,
      completion: (response) {
        completion(UsersModel.fromJson(response).data ?? []);
      },
    );
  }

  void fetchCasteList({
    required int page,
    required Function(List<CasteGotra>) completion,
  }) {
    // Start building parameters
    var param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
      Param.start: page,
      Param.limit: Limits.pagination,
    };

    // API call
    ApiService.shared.call(
      url: WebService.fetchCasteList,
      param: param,
      completion: (response) {
        final obj = ModelCasteGotraList.fromJson(response);

        completion(obj.data!);
      },
    );
  }

  void fetchGotraList({
    required int page,
    required Function(List<CasteGotra>) completion,
  }) {
    // Start building parameters
    var param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
      Param.start: page,
      Param.limit: Limits.pagination,
    };

    // API call
    ApiService.shared.call(
      url: WebService.fetchGotraList,
      param: param,
      completion: (response) {
        final obj = ModelCasteGotraList.fromJson(response);
        completion(obj.data!);
      },
    );
  }

  void fetchHighlightedProfiles({
    required int page,
    required Function(List<User>) completion,
  }) {
    // Start building parameters
    var param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
      Param.start: page,
      Param.limit: Limits.pagination,
    };

    // API call
    ApiService.shared.call(
      url: WebService.fetchHighlightedUsers,
      param: param,
      completion: (response) {
        var users = UsersModel.fromJson(response).data;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  void markNotificationsRead({
    required int page,
    required Function(List<User>) completion,
  }) {
    // Start building parameters
    var param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
    };

    // API call
    ApiService.shared.call(
      url: WebService.markNotificationsRead,
      param: param,
      completion: (response) {
        var users = UsersModel.fromJson(response).data;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  void fetchMarriageIntent({
    required userId,
    required Function(MarrigeIntent) completion,
  }) {
    var param = <String, dynamic>{
      Param.userId: userId,
    };

    ApiService.shared.call(
      url: WebService.getMarriageIntent,
      param: param,
      completion: (response) {
        var users = MarrigeIntentModel.fromJson(response).data;
        completion(users!);
      },
    );
  }

  void fetchOnlinePatternUsers({
    required userId,
    required Function(OnlinePattern) completion,
  }) {
    var param = <String, dynamic>{
      Param.userId: userId,
    };

    ApiService.shared.call(
      url: WebService.getUserOnlinePattern,
      param: param,
      completion: (response) {
        var users = UserOnlinePatternModel.fromJson(response).data;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  void fetchMatchMomentumUsers({
    required userId,
    required Function(MatchMomentum) completion,
  }) {
    var param = <String, dynamic>{
      Param.userId: userId,
    };

    ApiService.shared.call(
      url: WebService.getMatchMomentum,
      param: param,
      completion: (response) {
        var users = ModelMatchMomemtum.fromJson(response).data;
        if (users != null) {
          completion(users);
        }
      },
    );
  }

  void sendInterest(String profileId, Function completion) {
    var param = {Param.myUserId: SessionManager.shared.getUserID(), Param.userId: profileId};
    ApiService.shared.call(
      url: WebService.sendInterestRequest,
      param: param,
      completion: (data) {
        var obj = CommonResponse.fromJson(data).status;
        if (obj == true) {
          completion();
        }
      },
    );
  }

  void fetchInterestList({
    required int page,
    int limit = 10,
    String? status, // 'pending', 'accepted', 'rejected'
    String? type, // 'sent', 'received'
    required Function(List<UserInterest>) completion,
  }) {
    final param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
      // API `start` is a 1-based row offset (skip = start - 1), not a page number
      Param.start: (page < 1 ? 0 : page - 1) * limit + 1,
      Param.limit: limit,
    };

    if (status != null) {
      param['status'] = status;
    }

    if (type != null) {
      param['type'] = type;
    }

    ApiService.shared.call(
      url: WebService.getInterestList,
      param: param,
      completion: (response) {
        final interestData = ModelInterestedUserList.fromJson(response).data;
        if (interestData != null) {
          completion(interestData);
        }
      },
    );
  }

  void fetchQualificationList({
    String? search, // 'sent', 'received'
    required Function(List<CommonItem>) completion,
  }) {
    final param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
    };

    if (search != null) {
      param['search'] = search;
    }

    ApiService.shared.call(
      url: WebService.fetchQualificationList,
      param: param,
      completion: (response) {
        final interestData = ModelDropdownCommonList.fromJson(response).data;
        if (interestData != null) {
          completion(interestData);
        }
      },
    );
  }

  void fetchProfessionList({
    String? search, // 'pending', 'accepted', 'rejected'

    required Function(List<CommonItem>) completion,
  }) {
    final param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
    };

    if (search != null) {
      param['search'] = search;
    }

    ApiService.shared.call(
      url: WebService.fetchProfessionList,
      param: param,
      completion: (response) {
        final interestData = ModelDropdownCommonList.fromJson(response).data;
        if (interestData != null) {
          completion(interestData);
        }
      },
    );
  }

  void unfriendUser(String profileId, Function completion) {
    var param = {Param.myUserId: SessionManager.shared.getUserID(), Param.userId: profileId};
    ApiService.shared.call(
      url: WebService.removeConnection,
      param: param,
      completion: (data) {
        var obj = CommonResponse.fromJson(data).status;
        if (obj == true) {
          completion();
        }
      },
    );
  }

  void cancelInterest(String profileId, Function completion) {
    var param = {Param.myUserId: SessionManager.shared.getUserID(), Param.userId: profileId};
    ApiService.shared.call(
      url: WebService.cancelInterestRequest,
      param: param,
      completion: (data) {
        var obj = CommonResponse.fromJson(data).status;
        if (obj == true) {
          completion();
          print("asdjasjdkasdad");
        }
        print("asdjasjdkasdasdfsdfd");
      },
    );
  }

  void rejectInterest(String profileId, Function completion) {
    var param = {Param.myUserId: SessionManager.shared.getUserID(), Param.userId: profileId};
    ApiService.shared.call(
      url: WebService.rejectInterestRequest,
      param: param,
      completion: (data) {
        var obj = CommonResponse.fromJson(data).status;
        if (obj == true) {
          completion();
        }
      },
    );
  }

  void shortlist(String profileId, Function completion) {
    var param = {Param.myUserId: SessionManager.shared.getUserID(), Param.userId: profileId};
    ApiService.shared.call(
      url: WebService.toggleShortList,
      param: param,
      completion: (data) {
        var obj = CommonResponse.fromJson(data).status;
        if (obj == true) {
          completion();
        }
      },
    );
  }

  // ─── Feature expansion 1.1.0 ───────────────────────────────────────────

  /// Profiles I shortlisted (`getShortListedUsers`, not paged): page > 1 yields
  /// an empty list. "Shortlisted me" is `fetchProfiles(isShortListedByThey: true)`.
  /// Always calls [completion].
  void fetchShortlistedUsers({int page = 1, required Function(List<User>) completion}) {
    if (page > 1) {
      completion([]);
      return;
    }
    ApiService.shared.call(
      url: WebService.getShortListedUsers,
      param: {Param.myUserId: SessionManager.shared.getUserID()},
      completion: (response) {
        completion(UsersModel.fromJson(response).data ?? []);
      },
    );
  }

  /// Accepted connections in both directions (`getInterestList {status:'accepted'}`,
  /// no `type`); each row's `user` is the other person. Always calls [completion].
  void fetchConnections({
    required int page,
    int limit = 10,
    required Function(List<UserInterest>) completion,
  }) {
    ApiService.shared.call(
      url: WebService.getInterestList,
      param: {
        Param.myUserId: SessionManager.shared.getUserID(),
        'status': 'accepted',
        // API `start` is a 1-based row offset (skip = start - 1), not a page number
        Param.start: (page < 1 ? 0 : page - 1) * limit + 1,
        Param.limit: limit,
      },
      completion: (response) {
        completion(ModelInterestedUserList.fromJson(response).data ?? []);
      },
    );
  }

  /// Saves the FCM token on the profile (call on login and on token refresh).
  void updateDeviceToken(String token, {Function()? completion}) {
    if (token.isEmpty || !SessionManager.shared.isLogin()) return;
    ApiService.shared.call(
      url: WebService.editProfile,
      param: {
        Param.userId: SessionManager.shared.getUserID(),
        Param.deviceToken: token,
        Param.deviceType: GetPlatform.isIOS ? 1 : 0,
      },
      completion: (response) {
        if (CommonResponse.fromJson(response).status == true) {
          completion?.call();
        }
      },
    );
  }

  /// Merges privacy / notification settings (only the given keys change on the
  /// server). Keys: showLocation, showIncome, profilePicVisibility,
  /// allowConnections, allowMessages, emailVisibility, mobileVisibility,
  /// allowNotifications, notifyOnProfileVisit, notifyOnInterest, notifyOnMessage …
  void updateSettings(
    Map<String, Object> settings, {
    required Function(User user) completion,
    Function(String message)? onError,
  }) {
    _editProfileJson({'settings': settings}, completion: completion, onError: onError);
  }

  /// Horoscope + manglik + horoscopeRequired (JSON editProfile; nested object
  /// never goes through the multipart variant). Pass only what changed.
  void updateHoroscope({
    Horoscope? horoscope,
    String? manglikStatus,
    bool? horoscopeRequired,
    required Function(User user) completion,
    Function(String message)? onError,
  }) {
    final param = <String, Object>{};
    if (horoscope != null) param['horoscope'] = horoscope.toJson();
    if (manglikStatus != null) param['manglikStatus'] = manglikStatus;
    if (horoscopeRequired != null) param['horoscopeRequired'] = horoscopeRequired;
    _editProfileJson(param, completion: completion, onError: onError);
  }

  /// Stores the device location for "Nearby" (`coordinates: {lat, lng}`).
  void updateCoordinates({
    required double lat,
    required double lng,
    required Function(User user) completion,
    Function(String message)? onError,
  }) {
    _editProfileJson({
      'coordinates': {'lat': lat, 'lng': lng}
    }, completion: completion, onError: onError);
  }

  /// `POST /api/uploadFile` (multipart field `uploadFile`, images only) → URL in `data`.
  void uploadFile(XFile file, {required Function(String url) completion, Function(String message)? onError}) {
    ApiService.shared.multiPartCallApi(
      url: WebService.uploadFile,
      param: {},
      filesMap: {
        'uploadFile': [file]
      },
      completion: (response) {
        final data = response is Map ? response['data'] : null;
        if (CommonResponse.fromJson(response).status == true && data is String && data.isNotEmpty) {
          completion(data);
        } else {
          onError?.call(CommonResponse.fromJson(response).message ?? AppKeys.somethingWentWrong.tr);
        }
      },
      onError: (message) => onError?.call(message),
    );
  }

  /// `POST /api/profileVerification` (multipart: full_name, document_type,
  /// document ×1-2, selfie). Does NOT mark the local user verified: the badge
  /// only appears after an admin approves (re-fetch the profile / status).
  /// Errors: 409 PENDING_EXISTS, 400 ALREADY_VERIFIED → [onError] with the server message.
  void submitVerification({
    required String fullName,
    required String documentType,
    required List<XFile> documents,
    required XFile selfie,
    required Function() completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.multiPartCallApi(
      url: WebService.profileVerification,
      param: {
        Param.fullName: fullName,
        Param.documentType: documentType,
      },
      filesMap: {
        Param.document: documents.take(2).toList(),
        Param.selfie: [selfie],
      },
      completion: (response) {
        final obj = CommonResponse.fromJson(response);
        if (obj.status == true) {
          completion();
        } else {
          onError?.call(obj.message ?? AppKeys.somethingWentWrong.tr);
        }
      },
      onError: (message) => onError?.call(message),
    );
  }

  /// JSON `editProfile` (nested objects allowed); stores the returned user.
  void _editProfileJson(
    Map<String, Object> param, {
    required Function(User user) completion,
    Function(String message)? onError,
  }) {
    final body = <String, Object>{Param.userId: SessionManager.shared.getUserID(), ...param};
    ApiService.shared.call(
      url: WebService.editProfile,
      param: body,
      completion: (data) {
        final registration = Registration.fromJson(data);
        final user = registration.data;
        if (registration.status == true && user != null) {
          SessionManager.shared.setUser(user);
          completion(user);
        } else {
          onError?.call(registration.message ?? AppKeys.somethingWentWrong.tr);
        }
      },
    );
  }
}
