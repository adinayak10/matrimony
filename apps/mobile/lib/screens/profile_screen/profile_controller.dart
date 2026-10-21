import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_branch_sdk/flutter_branch_sdk.dart';
import 'package:get/get_utils/src/platform/platform.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/extensions/image_extension.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/widgets/functions.dart';
import 'package:banjaramatch/models/marrige_intent_model.dart';
import 'package:banjaramatch/models/model_chat_room_list.dart';
import 'package:banjaramatch/models/model_match_momemtum.dart';
import 'package:banjaramatch/models/model_user_online_pattern.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/chats_screen/chatting_screen/block_user_controller.dart';
import 'package:banjaramatch/screens/model_gallery_photo.dart';
import 'package:banjaramatch/screens/preference_fit_model.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/params.dart';

class ProfileController extends BlockUserController {
  ScrollController scrollController = ScrollController();
  User? user;
  final String userID;
  Color? profileColor;

  bool get isSelf => userID == SessionManager.shared.getUserID();

  final String followBtnID = "follow_btn";
  final String scrollID = "${DateTime.now().millisecondsSinceEpoch}scrollID";
  double maxExtent = 250.0;
  double currentExtent = 250.0;
  bool isFollowLoading = false;
  bool isAuthUser = true;
  MatchMomentum? matchMomentum;
  OnlinePattern? onlinePattern;
  MarrigeIntent? marrigeIntent;

  bool isFetching = true;
  ChatRoom? connectedRoom;
  PreferenceFitModel? preferenceFitModel;

  ProfileController(this.userID);

  final ImagePicker picker = ImagePicker();
  List<String> imagePaths = [];
  List<XFile> files = [];
  List<GalleryPhoto> galleryPhotos = [];

  void updateEverything() {
    update([scrollID]);
    update();
  }

  void updateMyProfile() {
    if (isSelf) {
      user = SessionManager.shared.getUser();

      updateEverything();
    }
  }

  Color? getColor() {
    return profileColor;
  }

  @override
  void onReady() {
    super.onReady();
    user = User(id: userID);
    getProfile();
    scrollController.addListener(() {
      currentExtent = maxExtent - scrollController.offset;
      if (currentExtent < 0) currentExtent = 0.0;
      if (currentExtent > maxExtent) currentExtent = maxExtent;
      update([scrollID]);
    });
    fetchMarriageIntent();
    fetchOnlinePatternUsers();
    fetchMatchMomentumUsers();
    fetchRoomId();
    fetchUserPhotos();
  }

  @override
  void onClose() {
    // ⚡ Properly dispose scroll controller to prevent memory leaks
    scrollController.dispose();
    Functions.changStatusBar(StatusBarStyle.white);
    super.onClose();
  }

  void getProfile() {
    UserService.shared.fetchProfile(userID, (fetchedUser) {
      user = fetchedUser;
      if (isSelf) SessionManager.shared.setUser(user!);

      if (user?.gender == "Male") {
        profileColor = cPrimary;
      } else {
        profileColor = cGreen;
      }

      print(":kjahsdkjlsad" + jsonEncode(user));

      updateEverything();
      stopLoading();
    });
  }

  void fetchUserPhotos() {
    UserService.shared.fetchUserPhotos(
      userId: userID,
      completion: (photos) {
        galleryPhotos = photos;
        isFetching = false;
        update();
      },
    );
  }

  void fetchFitCompareApi() {
    UserService.shared.fetchProfileFitApi(userID, (preferenceData) {
      print("alkjdlasjdasda");
      preferenceFitModel = preferenceData;
      update();
    });
  }

  void pickImage({ImageSource source = ImageSource.gallery}) async {
    try {
      XFile? image = await picker.pickImage(
        source: source,
        maxHeight: Limits.imageSize,
        maxWidth: Limits.imageSize,
        imageQuality: Limits.quality,
      );
      if (image != null) {
        imagePaths.add(image.path);
        files.add(image);
        uploadPhotos([image]);
        update();
      }
    } catch (e) {
      showSnackBar("Invalid Image");
    }
  }

  void uploadPhotos(List<XFile> files) {
    if (files.isEmpty) return;
    UserService.shared.uploadUserPhotos(files.first, userID, (uploadedList) {
      galleryPhotos.addAll(uploadedList);
      print(galleryPhotos.length);
      print("kajshdkjlasdklasdasd");
      update();
    });
  }

  void deletePhoto(String photoId) {
    UserService.shared.deleteUserPhoto(
      imageId: photoId,
      userId: userID,
      completion: (bool success) {
        if (success) {
          galleryPhotos.removeWhere((p) => p.sId == photoId);
          update(); // 🔄 Refresh UI
        } else {
          showSnackBar("Failed to delete photo");
        }
      },
    );
  }

  void setAsMainProfilePhoto(String photoId) {
    UserService.shared.setMainProfileImage(
      userId: userID,
      imageId: photoId,
      completion: (String updatedUrl) {
        user?.profile = updatedUrl;
        if (isSelf) SessionManager.shared.setUser(user!);
        update();
      },
    );
  }

  void reorderPhotos(List<String> orderedIds) {
    UserService.shared.reorderUserPhotos(
      userId: userID,
      orderedImageIds: orderedIds,
      completion: (_) {
        // update();
      },
    );
  }

  void followToggle() {
    (user?.followingStatus ?? 0) > 1 ? unfollow() : follow();
  }

  void follow() {
    isFollowLoading = true;
    update();
    UserService.shared.followUser(userID, () {
      isFollowLoading = false;
      user?.followingStatus = 2;
      user?.followers = (user?.followers ?? 0) + 1;
      update();
    });
  }

  void unfollow() {
    isFollowLoading = true;
    update();
    UserService.shared.unfollowUser(userID, () {
      isFollowLoading = false;
      user?.followingStatus = 0;
      user?.followers = (user?.followers ?? 0) - 1;
      update();
    });
  }

  void fetchRoomId() {
    UserService.shared.fetchChatRoom(userID, (room) {
      connectedRoom = room;
    });
  }

  void fetchMatchMomentumUsers() {
    UserService.shared.fetchMatchMomentumUsers(
      userId: userID,
      completion: (data) {
        matchMomentum = data;
        update();
      },
    );
  }

  void fetchOnlinePatternUsers() {
    UserService.shared.fetchOnlinePatternUsers(
      userId: userID,
      completion: (data) {
        onlinePattern = data;
        update();
      },
    );
  }

  void fetchMarriageIntent() {
    UserService.shared.fetchMarriageIntent(
      userId: userID,
      completion: (data) {
        marrigeIntent = data;
        update();
      },
    );
  }

  void shareProfile() {
    final buo = BranchUniversalObject(
      canonicalIdentifier: 'flutter/branch',
      title: user?.fullName ?? '',
      imageUrl: user?.profile?.addBaseURL() ?? '',
      contentDescription: user?.fullName ?? '',
      publiclyIndex: true,
      locallyIndex: true,
    );
    final lp = BranchLinkProperties()..addControlParam(Param.userId, userID);
    if (GetPlatform.isIOS) {
      if (buo.imageUrl != '') {
        FlutterBranchSdk.showShareSheet(buo: buo, linkProperties: lp, messageText: '');
      } else {
        rootBundle.load(MyImages.appIcon).then((data) {
          FlutterBranchSdk.shareWithLPLinkMetadata(
            buo: buo,
            linkProperties: lp,
            icon: data.buffer.asUint8List(),
            title: user?.fullName ?? '',
          );
        });
      }
    } else {
      FlutterBranchSdk.getShortUrl(buo: buo, linkProperties: lp).then((value) {
        Share.share(value.result ?? '', subject: user?.fullName ?? '');
      });
    }
  }
}

extension InterestActions on ProfileController {
  void sendInterest(User profile) {
    UserService.shared.sendInterest(
      profile.id!,
      () {
        profile.isRequestSent = true;
        profile.isCanceled = false;
        update();
        showSnackBar("Interest sent");
      },
    );
  }

  void cancelInterest(User profile) {
    UserService.shared.cancelInterest(
      profile.id!,
      () {
        profile.isRequestSent = false;
        profile.isCanceled = true;
        update();
        showSnackBar("Interest cancelled");
      },
    );
  }

  void acceptFriendRequest(User profile) {
    UserService.shared.acceptFriendReuquest(
      profile.id!,
      () {
        profile.isFriend = true;
        profile.isRequestReceived = false;
        update();
        showSnackBar("Request accepted");
      },
    );
  }

  void unFriendUser(User profile) {
    UserService.shared.unfriendUser(
      profile.id!,
      () {
        profile.isFriend = false;
        update();
        showSnackBar("Connection removed");
      },
    );
  }

  void shortList(User profile) {
    final bool currentStatus = profile.isShortListed ?? false;

    UserService.shared.shortlist(profile.id!, () {
      profile.isShortListed = !currentStatus;
      update();
    });
  }

  void updateContactPrivacy(String key, String value) {
    if (user == null) return;

    // Initialize settings if null
    if (user!.settings == null) {
      user!.settings = UserSettings();
    }

    // Update the specific privacy field
    switch (key) {
      case 'emailVisibility':
        user!.settings!.emailVisibility = value;
        break;
      case 'mobileVisibility':
        user!.settings!.mobileVisibility = value;
        break;
    }

    // Save to SessionManager
    // SessionManager.shared.setUser(user!);
    // update();

    // Sync with backend
    final settingsMap = user!.settings!.toJson().cast<String, Object>();
    UserService.shared.editProfile(
      settings: settingsMap,
      completion: (updatedUser) {
        SessionManager.shared.setUser(updatedUser);
        update();
        showSnackBar("Privacy settings updated");
      },
    );
  }
}
