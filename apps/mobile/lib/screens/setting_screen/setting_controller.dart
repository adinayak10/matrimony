import 'package:firebase_auth/firebase_auth.dart';
import 'package:get/get.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/api_service/verification_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/notification_router.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/verification_status_model.dart';
import 'package:banjaramatch/screens/chats_screen/socketservice.dart';
import 'package:banjaramatch/screens/login_screen/login_screen.dart';
import 'package:banjaramatch/screens/sheets/confirmation_sheet.dart';

/// Settings screen + drawer: app version, verification status chip, logout,
/// account deletion. (Privacy / notification preferences live in
/// `UserSettingsController`.)
class SettingController extends BaseController {
  String version = "";

  /// Latest verification status (null until fetched or when the call fails).
  VerificationStatus? verificationStatus;

  /// none | pending | rejected | verified — falls back to the stored user flag.
  String get verificationState {
    final status = verificationStatus;
    if (status != null) return status.state;
    return SessionManager.shared.getUser()?.isVerified == 1 ? 'verified' : 'none';
  }

  @override
  void onReady() {
    loadVersion();
    super.onReady();
  }

  void loadVersion() {
    PackageInfo.fromPlatform().then((packageInfo) {
      version = "${packageInfo.version} (${packageInfo.buildNumber})";
      update(['version']);
      update();
    });
  }

  void fetchVerificationStatus() {
    VerificationService.shared.fetchStatus(
      completion: (status) {
        verificationStatus = status;
        update();
      },
      onError: (_) {},
    );
  }

  void deleteAccount() {
    Get.bottomSheet(ConfirmationSheet(
        desc: LKeys.deleteAccDesc,
        buttonTitle: LKeys.delete,
        onTap: () {
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
          cleanAllSession();
          Get.offAll(() => const LoginScreen());
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
    NotificationRouter.shared.reset();
  }
}
