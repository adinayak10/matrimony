import 'package:firebase_auth/firebase_auth.dart';
import 'package:get/get.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:banjaramatch/common/api_service/notification_service.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/firebase_notification_manager.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/chats_screen/socketservice.dart';
import 'package:banjaramatch/screens/login_screen/login_screen.dart';
import 'package:banjaramatch/screens/sheets/confirmation_sheet.dart';
import 'package:banjaramatch/utilities/const.dart';

class SettingController extends BaseController {
  bool isNotification = SessionManager.shared.getUser()?.isPushNotifications == 1 ? true : false;
  bool isGetInvited = SessionManager.shared.getUser()?.isInvitedToRoom == 1 ? true : false;
  String notificationID = "notificationID";
  String getInvitedID = "getInvitedID";
  String version = "";

  @override
  void onReady() {
    PackageInfo.fromPlatform().then((packageInfo) {
      String version = packageInfo.version;
      String buildNumber = packageInfo.buildNumber;
      print("$version $buildNumber");
      this.version = "$version ($buildNumber)";
      update(['version']);
    });
    super.onReady();
  }

  void changeOfNotification(bool value) {
    isNotification = value;
    update([notificationID]);
    UserService.shared.editProfile(
      isPushNotifications: isNotification,
      completion: (p0) {},
    );
    if (value) {
      NotificationService.shared.subscribeToAllMyRoom();
      FirebaseNotificationManager.shared.subscribeToTopic(notificationTopic);
    } else {
      NotificationService.shared.unsubscribeToAllMyRoom();
      FirebaseNotificationManager.shared.unsubscribeToTopic(notificationTopic);
    }
  }

  void changeOfGetInvited(bool value) {
    isGetInvited = value;
    update([getInvitedID]);
    UserService.shared.editProfile(
      isInvitedToRoom: isGetInvited,
      completion: (p0) {},
    );
  }

  void tapRoomsYouOwn() {}

  void tapRoomInvitation() {}

  void deleteAccount() {
    Get.bottomSheet(ConfirmationSheet(
        desc: LKeys.deleteAccDesc,
        buttonTitle: LKeys.delete,
        onTap: () {
          //startLoading();
          UserService.shared.deleteUser(() {
            FirebaseAuth.instance.currentUser?.delete();
            cleanAllSession();
            Get.offAll(() => const LoginScreen());
          });
        }));
  }

  void logout() {
    Get.bottomSheet(ConfirmationSheet(
        desc: LKeys.logoutDesc,
        buttonTitle: LKeys.logOut,
        onTap: () {
          //startLoading();
          //  FirebaseAuth.instance.signOut();
          cleanAllSession();
          Get.offAll(() => const LoginScreen());
          // UserService.shared.logOut(() {
          //   FirebaseAuth.instance.signOut();
          //   cleanAllSession();
          //   Get.offAll(() => const LoginScreen());
          // });
        }));
  }

  void cleanAllSession() {
    // 1. Tell the API (POST /api/auth/logout with the current Bearer header).
    //    The token is read before the local clear below; a failed call must
    //    never block clearing the session.
    try {
      UserService.shared.logOut(() {});
    } catch (e) {
      print('⚠️ logout API call failed: $e');
    }

    // 2. Drop the realtime connection.
    try {
      SocketService.shared.disconnect();
    } catch (e) {
      print('⚠️ socket disconnect failed: $e');
    }

    // 3. Clear the local session (login flag, JWT, user, settings).
    SessionManager.shared.setLogin(false);
    SessionManager.shared.clearSession();

    // final GoogleSignIn googleSignIn = GoogleSignIn();
    // FirebaseNotificationManager.shared.subscribeToTopic(notificationTopic);
    // NotificationService.shared.unsubscribeToAllMyRoom();
    // SessionManager.shared.setUser(null);
    // Purchases.logOut();
    // googleSignIn.signOut();
    // stopLoading();
  }
}
