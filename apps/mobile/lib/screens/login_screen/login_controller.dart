import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/firebase_notification_manager.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/screens/block_by_admin_screen/block_by_admin_screen.dart';
import 'package:banjaramatch/screens/interests_screen/interests_screen.dart';
import 'package:banjaramatch/screens/login_screen/sign_in_with_email_screen.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';
import 'package:banjaramatch/screens/tabbar/tabbar_screen.dart';
import 'package:banjaramatch/screens/username_screen/username_screen.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/update_checker.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../OnboardingWrapperScreen.dart';
import '../chats_screen/socketservice.dart';

class LoginController extends BaseController {
  void emailLogin() {
    Get.bottomSheet(SignInWithEmailScreen(
      onSubmit: (fullName, identity) {
        //registerUser(identity: identity, loginType: LoginType.email, fullName: fullName);
      },
    ), isScrollControlled: true, ignoreSafeArea: false);
  }

  void googleLogin() async {
    try {
      startLoading();

      // Step 1: Initialize Google Sign-In instance
      await GoogleSignIn.instance.initialize();

      // Step 2: Start authentication flow
      final GoogleSignInAccount user = await GoogleSignIn.instance.authenticate();

      // Step 3: Get user information
      final email = user.email;
      final displayName = user.displayName ?? email.split('@')[0];
      final photoUrl = user.photoUrl;

      // Step 4: Get authentication tokens for Firebase
      final GoogleSignInAuthentication auth = await user.authentication;
      
      // In v7.2.0, only idToken is available in GoogleSignInAuthentication
      final idToken = auth.idToken;

      if (idToken == null) {
        stopLoading();
        showSnackBar('Failed to get authentication token');
        return;
      }

      // Step 5: Create Firebase credential with Google ID token
      final credential = GoogleAuthProvider.credential(
        idToken: idToken,
      );

      // Step 6: Sign in to Firebase with Google credential
      final userCredential = await FirebaseAuth.instance.signInWithCredential(credential);
      final firebaseUser = userCredential.user;

      if (firebaseUser == null) {
        stopLoading();
        showSnackBar('Google sign-in failed');
        return;
      }

      // Step 7: Get Firebase ID token and UID
      final firebaseToken = await firebaseUser.getIdToken();
      final firebaseUid = firebaseUser.uid;

      // Step 8: Authenticate with backend (auto-handles registration)
      FirebaseNotificationManager.shared.getNotificationToken((deviceToken) {
        UserService.shared.firebaseGoogleLogin(
          email: email,
          fullName: displayName,
          firebaseUid: firebaseUid,
          firebaseToken: firebaseToken ?? '',
          photoURL: photoUrl,
          deviceToken: deviceToken,
          deviceType: GetPlatform.isIOS ? 1 : 0,
          completion: (response) {
            stopLoading();

            if (response.status == true) {
              SessionManager.shared.setLogin(true);
              var user = response.data;

              if (SessionManager.shared.isLogin()) {
                SessionManager.shared.setToken(response.token!);
                SocketService.shared.startCommonListening();
              }

              // Update ProfileController
              try {
                final profileController = Get.find<ProfileController>();
                profileController.user = user;
                if (user?.id != null) {
                  UserService.shared.fetchMyProfile(
                    userID: user!.id!,
                    completion: (fetchedUser) {
                      profileController.user = fetchedUser;
                      SessionManager.shared.setUser(fetchedUser);
                      profileController.update();
                    },
                  );
                } else {
                  profileController.update();
                }
              } catch (e) {
                print('ProfileController not found: $e');
              }

              if (user?.isPushNotifications == 1) {
                FirebaseNotificationManager.shared.subscribeToTopic(notificationTopic);
              }

              Widget w = TabBarScreen();
              if (user?.isBlock == 1) {
                w = const BlockedByAdminScreen();
              } else if (user?.fullName == null) {
                w = const UserNameScreen();
              } else if (user?.gender == "Not specified") {
                w = OnboardingWrapperScreen(startPage: 0);
              } else if (user?.location == null) {
                w = OnboardingWrapperScreen(startPage: 1);
              } else if (user?.interest == null || user!.interest!.isEmpty) {
                w = InterestScreen();
              }

              Get.offAll(() => w);
              UpdateChecker.shared.checkForUpdates();
            } else {
              showSnackBar(response.message ?? 'Google sign-in failed');
            }
          },
        );
      });
    } on GoogleSignInException catch (e) {
      stopLoading();
      print('Google Sign-In Exception: ${e.code}');
      String errorMessage = 'Google sign-in failed';
      if (e.code == GoogleSignInExceptionCode.canceled) {
        errorMessage = 'Sign-in cancelled';
      } else if (e.code == GoogleSignInExceptionCode.clientConfigurationError) {
        errorMessage = 'Google Sign-In is not properly configured. Please check your setup.';
      } else {
        errorMessage = 'Google sign-in error: ${e.code}';
      }
      showSnackBar(errorMessage);
    } catch (e) {
      stopLoading();
      print('Google Sign-In Error: $e');
      showSnackBar('Google sign-in failed: ${e.toString()}');
    }
  }
}

enum LoginType {
  google(0),
  apple(1),
  email(2);

  const LoginType(this.value);

  final int value;
}
