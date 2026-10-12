import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';

import '../../utilities/const.dart';
import '../model_gallery_photo.dart';
import '../tabbar/tabbar_screen.dart';

class GalleryManagementController extends BaseController {
  TextEditingController fullNameController = TextEditingController();
  TextEditingController bioEditController = TextEditingController();
  XFile? backgroundImageFile;

  // 🔹 Gallery management
  List<String> imagePaths = [];
  List<XFile> files = [];
  List<GalleryPhoto> galleryPhotos = []; // assumes you have a UserPhoto model

  final String userID;

  bool get isSelf => true; // adjust if you’re editing someone else’s profile

  @override
  void onReady() {
    fetchUserPhotos();

    super.onReady();
  }

  final ImagePicker picker = ImagePicker();
  String imagePath = "";
  XFile? file;

  void pickProfileImage({ImageSource source = ImageSource.gallery}) async {
    try {
      XFile? image = await picker.pickImage(
          source: source, maxHeight: Limits.imageSize, maxWidth: Limits.imageSize, imageQuality: Limits.quality);
      if (image != null) {
        file = image;
        imagePath = image.path;
        print(imagePath);
        update();
      }
    } catch (e) {
      showSnackBar("Invalid Image");
    }
  }

  void setProfileImage() {
    print('kajsbdkajsdlahvsldhgasd');

    if (file == null) {
      print("akjsdhlakjsdlasd");
      showSnackBar(LKeys.pleaseSelectImage.tr);
      return;
    }
    UserService.shared.editProfileWithMultipart(
      profileImage: file,
      completion: (p0) {
        Get.offAll(() => TabBarScreen());
      },
    );
  }

  // 🔹 Background Image Picker
  void pickBGImage({ImageSource source = ImageSource.gallery}) async {
    try {
      XFile? image = await picker.pickImage(source: source);
      if (image != null) {
        backgroundImageFile = image;
        update();
      }
    } catch (e) {
      showSnackBar("Invalid Image");
    }
  }

  late User user;

  GalleryManagementController(this.userID);

  void fetchUserPhotos() {
    print(":aljdslasdadsa" + userID);
    UserService.shared.fetchUserPhotos(
      userId: userID,
      completion: (photos) {
        galleryPhotos = photos;
        update();
      },
    );
  }

  void onSubmit() {
    startLoading();

    var user = SessionManager.shared.getUser();
    // Sync with backend
    final settingsMap = user!.settings!.toJson().cast<String, Object>();
    UserService.shared.editProfile(
      settings: settingsMap,
      completion: (updatedUser) {
        showSnackBar("Privacy settings updated");
      },
    );
    UserService.shared.editProfileWithMultipart(
      profileImage: file,
      bgImage: backgroundImageFile,
      completion: (p0) {
        stopLoading();
        Get.find<ProfileController>().getProfile();
        Get.back();
        showSnackBar(LKeys.profileUpdatedSuccessfully.tr, type: SnackBarType.success);
      },
    );
  }

  void setBioFromAI(String bio) {
    bioEditController.text = bio;
    update(['bio']);
  }

  void setPersonalityMap({
    required String tone,
    required List<String> traits,
    required List<String> hobbies,
    required List<String> goals,
    required String about,
  }) {
    var user = SessionManager.shared.getUser();
    if (user != null) {
      user.personalityMap = PersonalityMap(
        tone: tone,
        traits: traits,
        hobbies: hobbies,
        goals: goals,
        about: about,
      );
      update();
    }
  }

  // 🔹 Gallery Photo Management
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
          update();
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
        user.profile = updatedUrl;
        if (isSelf) SessionManager.shared.setUser(user);
        update();
      },
    );
  }

  void reorderPhotos(List<String> orderedIds) {
    UserService.shared.reorderUserPhotos(
      userId: userID,
      orderedImageIds: orderedIds,
      completion: (_) {
        // optional refresh after reorder
      },
    );
  }

  // Static local settings (can be moved to controller later)
  String galleryVisibility = 'Public'; // Public, Connected, Private
  int currentPhotoIndex = 0;
  PageController pageController = PageController();

  void setGalleryVisibility(String visibility) {
    /* implementation */
  }

  void setAllowPhotoRequests(bool allow) {
    /* implementation */
  }

  void setAutoApproveRequests(bool auto) {
    /* implementation */
  }

  void togglePhotoPrivacy(String photoId) {
    /* implementation */
  }

  void requestPhotoAccess() {
    /* implementation */
  }

  void requestSpecificPhoto(String photoId) {
    /* implementation */
  }

  // Privacy settings update
  void updatePrivacySetting(String key, dynamic value) {
    var user = SessionManager.shared.getUser();
    if (user != null) {
      if (user.settings == null) {
        user.settings = UserSettings();
      }

      // Update the specific setting
      switch (key) {
        case 'profilePicVisibility':
          user.settings!.profilePicVisibility = value;
          break;
        case 'emailVisibility':
          user.settings!.emailVisibility = value;
          break;
        case 'mobileVisibility':
          user.settings!.mobileVisibility = value;
          break;
      }

      SessionManager.shared.setUser(user);
      update();
    }
  }
}
