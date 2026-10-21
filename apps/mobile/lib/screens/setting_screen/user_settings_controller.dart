import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';

/// Privacy + notification settings (`User.settings`). Every change is sent
/// on its own through `UserService.updateSettings` (the API merges keys) and
/// rolled back locally when the server refuses it.
class UserSettingsController extends BaseController {
  late UserSettings settings = _current();

  /// Key currently being saved (its control is disabled meanwhile).
  final Set<String> saving = {};

  UserSettings _current() {
    final s = SessionManager.shared.getUser()?.settings;
    return UserSettings.fromJson(Map<String, dynamic>.from(s?.toJson() ?? <String, dynamic>{}));
  }

  // Server defaults (models/User.js) when a key was never stored.
  bool get showLocation => settings.showLocation ?? true;
  bool get showIncome => settings.showIncome ?? true;
  String get profilePicVisibility => settings.profilePicVisibility ?? 'everyone';
  String get allowConnections => settings.allowConnections ?? 'everyone';
  String get allowMessages => settings.allowMessages ?? 'onlyAccepted';
  String get emailVisibility => settings.emailVisibility ?? 'private';
  String get mobileVisibility => settings.mobileVisibility ?? 'private';
  bool get allowNotifications => settings.allowNotifications ?? true;
  bool get notifyOnInterest => settings.notifyOnInterest ?? true;
  bool get notifyOnMessage => settings.notifyOnMessage ?? true;
  bool get notifyOnProfileVisit => settings.notifyOnProfileVisit ?? true;

  /// Saves one key; [apply] writes the new value into [settings].
  void save(String key, Object value, void Function(UserSettings s, Object? v) apply, Object? previous,
      {void Function(bool ok)? onDone}) {
    apply(settings, value);
    saving.add(key);
    update();
    UserService.shared.updateSettings(
      {key: value},
      completion: (user) {
        saving.remove(key);
        if (user.settings != null) settings = user.settings!;
        _refreshProfile(user);
        update();
        onDone?.call(true);
      },
      onError: (message) {
        saving.remove(key);
        apply(settings, previous);
        update();
        showSnackBar(message.isNotEmpty ? message : AppKeys.somethingWentWrong.tr, type: SnackBarType.error);
        onDone?.call(false);
      },
    );
  }

  void _refreshProfile(User user) {
    final uid = SessionManager.shared.getUserID();
    if (Get.isRegistered<ProfileController>(tag: uid)) {
      Get.find<ProfileController>(tag: uid).updateMyProfile();
    }
  }

  void setShowLocation(bool v) =>
      save('showLocation', v, (s, x) => s.showLocation = x as bool?, settings.showLocation);
  void setShowIncome(bool v) => save('showIncome', v, (s, x) => s.showIncome = x as bool?, settings.showIncome);
  void setProfilePicVisibility(String v) => save(
      'profilePicVisibility', v, (s, x) => s.profilePicVisibility = x as String?, settings.profilePicVisibility);
  void setAllowConnections(String v) =>
      save('allowConnections', v, (s, x) => s.allowConnections = x as String?, settings.allowConnections);
  void setAllowMessages(String v) =>
      save('allowMessages', v, (s, x) => s.allowMessages = x as String?, settings.allowMessages);
  void setEmailVisibility(String v) =>
      save('emailVisibility', v, (s, x) => s.emailVisibility = x as String?, settings.emailVisibility);
  void setMobileVisibility(String v) =>
      save('mobileVisibility', v, (s, x) => s.mobileVisibility = x as String?, settings.mobileVisibility);
  void setNotifyOnInterest(bool v) =>
      save('notifyOnInterest', v, (s, x) => s.notifyOnInterest = x as bool?, settings.notifyOnInterest);
  void setNotifyOnMessage(bool v) =>
      save('notifyOnMessage', v, (s, x) => s.notifyOnMessage = x as bool?, settings.notifyOnMessage);
  void setNotifyOnProfileVisit(bool v) => save(
      'notifyOnProfileVisit', v, (s, x) => s.notifyOnProfileVisit = x as bool?, settings.notifyOnProfileVisit);
  void setAllowNotifications(bool v, {void Function(bool ok)? onDone}) => save(
      'allowNotifications', v, (s, x) => s.allowNotifications = x as bool?, settings.allowNotifications,
      onDone: onDone);
}
