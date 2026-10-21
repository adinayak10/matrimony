import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/firebase_notification_manager.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/screens/common/section_card.dart';
import 'package:banjaramatch/screens/setting_screen/feature_app_bar.dart';
import 'package:banjaramatch/screens/setting_screen/user_settings_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Push notification preferences (`allowNotifications` + the three notify flags).
class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  final String _tag = 'notif_settings_${DateTime.now().microsecondsSinceEpoch}';
  late final UserSettingsController controller = Get.put(UserSettingsController(), tag: _tag);

  @override
  void dispose() {
    Get.delete<UserSettingsController>(tag: _tag);
    super.dispose();
  }

  void _setMaster(UserSettingsController c, bool value) {
    c.setAllowNotifications(value, onDone: (ok) {
      if (!ok) return;
      // Keep the legacy per-device flag and the announcement topic in step.
      UserService.shared.editProfile(isPushNotifications: value, completion: (_) {});
      if (value) {
        FirebaseNotificationManager.shared.subscribeToTopic(notificationTopic, force: true);
      } else {
        FirebaseNotificationManager.shared.unsubscribeToTopic(notificationTopic);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cBackground,
      appBar: featureAppBar(AppKeys.notifSettingsTitle.tr),
      body: GetBuilder<UserSettingsController>(
        tag: _tag,
        builder: (c) {
          final master = c.allowNotifications;
          final masterBusy = c.saving.contains('allowNotifications');
          return ListView(
            padding: const EdgeInsets.only(top: 8, bottom: 32),
            children: [
              SectionCard(
                child: SettingsSwitchTile(
                  icon: Icons.notifications_active_outlined,
                  title: AppKeys.notifAllow.tr,
                  subtitle: AppKeys.notifAllowDesc.tr,
                  value: master,
                  enabled: !masterBusy,
                  onChanged: (v) => _setMaster(c, v),
                ),
              ),
              SectionCard(
                title: AppKeys.notifNotifyMeSection.tr,
                icon: Icons.tune_rounded,
                child: Column(
                  children: [
                    SettingsSwitchTile(
                      icon: Icons.favorite_border_rounded,
                      title: AppKeys.notifInterests.tr,
                      subtitle: AppKeys.notifInterestsDesc.tr,
                      value: c.notifyOnInterest,
                      enabled: master && !c.saving.contains('notifyOnInterest'),
                      onChanged: c.setNotifyOnInterest,
                    ),
                    SettingsSwitchTile(
                      icon: Icons.chat_bubble_outline_rounded,
                      title: AppKeys.notifMessages.tr,
                      subtitle: AppKeys.notifMessagesDesc.tr,
                      value: c.notifyOnMessage,
                      enabled: master && !c.saving.contains('notifyOnMessage'),
                      onChanged: c.setNotifyOnMessage,
                    ),
                    SettingsSwitchTile(
                      icon: Icons.visibility_outlined,
                      title: AppKeys.notifVisits.tr,
                      subtitle: AppKeys.notifVisitsDesc.tr,
                      value: c.notifyOnProfileVisit,
                      enabled: master && !c.saving.contains('notifyOnProfileVisit'),
                      onChanged: c.setNotifyOnProfileVisit,
                    ),
                  ],
                ),
              ),
              if (!master)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
                  child: Text(
                    AppKeys.notifOffHint.tr,
                    style: MyTextStyle.gilroyRegular(size: 12, color: cLightText),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
