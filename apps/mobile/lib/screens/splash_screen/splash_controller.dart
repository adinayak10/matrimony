import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/common_service.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/screens/block_by_admin_screen/block_by_admin_screen.dart';
import 'package:banjaramatch/screens/interests_screen/interests_screen.dart';
import 'package:banjaramatch/screens/on_boarding_screen/on_boarding_screen.dart';
import 'package:banjaramatch/screens/tabbar/tabbar_screen.dart';
import 'package:banjaramatch/screens/username_screen/username_screen.dart';

import '../../utilities/update_checker.dart';
import '../OnboardingWrapperScreen.dart';
import '../chats_screen/socketservice.dart';
import '../login_screen/login_screen.dart';

class SplashController extends BaseController {
  @override
  void onInit() {
    super.onInit();
    // Video will trigger fetchSettings when it completes
  }

  void fetchUser(Function() completion) {
    if (SessionManager.shared.getUser()?.id != null) {
      UserService.shared.fetchMyProfile(
        userID: SessionManager.shared.getUser()?.id ?? "0",
        completion: (user) {
          if (user != null) {
            print(user);
            SessionManager.shared.setUser(user);
            SocketService.shared.startCommonListening();
            completion();
          } else {
            SessionManager.shared.setLogin(false);
            Get.offAll(() => const LoginScreen());
            // Settings are already loaded, so the update check still runs
            // when the profile fetch fails (expired JWT etc.).
            UpdateChecker.shared.checkForUpdates();
          }
        },
      );
    } else {
      completion();
    }
  }

  void fetchSettings() {
    // Global settings (incl. settings.apk) are fetched first, so the update
    // check no longer depends on fetchProfile succeeding.
    bool proceeded = false;
    void proceed() {
      if (proceeded) return;
      proceeded = true;
      fetchUser(() {
        Get.offAll(() => gotoNextSetupView());
        // Run after navigation so a mandatory UpdateScreen stays on top.
        UpdateChecker.shared.checkForUpdates();
      });
    }

    CommonService.shared.fetchGlobalSettings((p0) {
      if (p0) proceed();
    });
    // fetchGlobalSettings never reports failure; do not leave the user on
    // the splash screen if the settings call fails or times out.
    Future.delayed(const Duration(seconds: 10), proceed);
  }
}

Widget gotoNextSetupView() {
  if (SessionManager.shared.isLogin()) {
    var user = SessionManager.shared.getUser();

    if (user?.isBlock == 1) {
      return const BlockedByAdminScreen();
    }

    if (user?.fullName == "Not specified") {
      return const UserNameScreen();
    }

    if (user?.gender == "Not specified") {
      return const OnboardingWrapperScreen(
        startPage: 0,
      ); // Includes personal info + location/language
    }

    if (user?.location == null) {
      return const OnboardingWrapperScreen(
        startPage: 1,
      ); // Includes personal info + location/language
    }

    if (user?.interest == null || user!.interest!.isEmpty) {
      return InterestScreen();
    }

    // if (user.profile == null) {
    //   return const ProfilePictureScreen();
    // }

    return TabBarScreen();
  }

  return const OnBoardingScreen();
}
