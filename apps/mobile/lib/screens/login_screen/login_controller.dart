import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:banjaramatch/common/api_service/notification_service.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/firebase_notification_manager.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/screens/block_by_admin_screen/block_by_admin_screen.dart';
import 'package:banjaramatch/screens/interests_screen/interests_screen.dart';
import 'package:banjaramatch/screens/login_screen/sign_in_with_email_screen.dart';
import 'package:banjaramatch/screens/login_screen/sign_in_with_number_screen.dart';
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

  void mobileLogin() {
    Get.bottomSheet(PhoneNumberLoginScreen(), isScrollControlled: true, ignoreSafeArea: false);
  }

  void requestOtp(String phone, VoidCallback onSent) {
    // startLoading();
    UserService.shared.requestOtp(
      phone: phone,
      completion: (response) {
        stopLoading();
        if (response.status == true) {
          onSent();
        } else {
          showSnackBar(response.message ?? 'Failed to send OTP');
        }
      },
    );
  }

  void verifyOtpAndLogin({
    required String phone,
    required String otp,
    required String? fullName,
  }) {
    //  startLoading();
    FirebaseNotificationManager.shared.getNotificationToken((token) {
      UserService.shared.verifyOtp(
        phone: phone,
        otp: otp,
        fullName: fullName,
        deviceToken: token,
        deviceType: 0,
        completion: (response) {
          print(";alkdjskl;adssad");
          stopLoading();
          if (response.status == true) {
            SessionManager.shared.setLogin(true);
            var user = response.data;

            if (SessionManager.shared.isLogin()) {
              SessionManager.shared.setToken(response.token!);
              SocketService.shared.startCommonListening();
            }

            // Update ProfileController with the logged-in user
            try {
              final profileController = Get.find<ProfileController>();
              profileController.user = user;
              // Fetch complete profile to get profileCompletion and other data
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

            Purchases.logIn('${user?.id ?? 0}');
            if (user?.isPushNotifications == 1) {
              FirebaseNotificationManager.shared.subscribeToTopic(notificationTopic);
              NotificationService.shared.subscribeToAllMyRoom();
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

            // else if (user?.profile == null) {
            //   w = const ProfilePictureScreen();
            // }

            Get.offAll(() => w);
            UpdateChecker.shared.checkForUpdates();
          } else {
            showSnackBar(response.message ?? 'OTP verification failed');
          }
        },
      );
    });
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

              Purchases.logIn('${user?.id ?? 0}');

              if (user?.isPushNotifications == 1) {
                FirebaseNotificationManager.shared.subscribeToTopic(notificationTopic);
                NotificationService.shared.subscribeToAllMyRoom();
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
//
// void appleLogin() async {
//   try {
//     AuthorizationCredentialAppleID value = await SignInWithApple.getAppleIDCredential(
//         scopes: [AppleIDAuthorizationScopes.email, AppleIDAuthorizationScopes.fullName]);
//     registerUser(
//         fullName: '${value.givenName} ${value.familyName}',
//         identity: value.userIdentifier ?? '',
//         loginType: LoginType.apple);
//   } on SignInWithAppleException catch (exception) {
//     log("Something wrong ${exception.toString()}");
//   }
// }
//
//   void registerUser({String? fullName, required String identity, required LoginType loginType}) {
//     // startLoading();
//     FirebaseNotificationManager.shared.getNotificationToken((token) {
//       UserService.shared.registration(
//         name: fullName,
//         identity: identity,
//         deviceToken: token,
//         loginType: loginType,
//         completion: (p0) {
//           SessionManager.shared.setLogin(true);
//
//           if (SessionManager.shared.isLogin()) {
//             SocketService.shared.startCommonListening(); // connect socket
//           }
//
//           var user = p0.data;
//           Purchases.logIn('${user?.id ?? 0}');
//
//           if (user?.isPushNotifications == 1) {
//             FirebaseNotificationManager.shared.subscribeToTopic(notificationTopic);
//             NotificationService.shared.subscribeToAllMyRoom();
//           }
//
//           Widget w = Container(); // default fallback
//
//           if (user?.isBlock == 1) {
//             w = const BlockedByAdminScreen();
//           } else if (user?.fullName == null) {
//             w = const UserNameScreen();
//           } else if (user?.height == "Not specified") {
//             w = w = OnboardingWrapperScreen(
//               startPage: 0,
//             ); //
//
// // Personal Info + Location
//           } else if (user?.location == null) {
//             return const OnboardingWrapperScreen(
//               startPage: 1,
//             ); // Includes personal info + location/language
//           } else if (user?.interest == null || user!.interest!.isEmpty) {
//             w = InterestScreen();
//           } else if (user?.profile == null) {
//             w = const ProfilePictureScreen();
//           } else {
//             print("alkdjlkasjdlasd");
//             w = TabBarScreen();
//           }
//
//           stopLoading(); // dismiss loader
//           Get.offAll(() => w); // navigate
//         },
//       );
//     });
//   }
}

enum LoginType {
  google(0),
  apple(1),
  email(2);

  const LoginType(this.value);

  final int value;
}
