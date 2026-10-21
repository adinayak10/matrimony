import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/block_list_screen/blocklist_screen.dart';
import 'package:banjaramatch/screens/common/section_card.dart';
import 'package:banjaramatch/screens/common/status_chip.dart';
import 'package:banjaramatch/screens/faq_screen/faq_screen.dart';
import 'package:banjaramatch/screens/gallary_management_screen/gallery_management_screen.dart';
import 'package:banjaramatch/screens/languages_screen/languages_screen.dart';
import 'package:banjaramatch/screens/partner_preference-view_screen.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/setting_screen/contact_screen.dart';
import 'package:banjaramatch/screens/setting_screen/feature_app_bar.dart';
import 'package:banjaramatch/screens/setting_screen/notification_settings_screen.dart';
import 'package:banjaramatch/screens/setting_screen/privacy_settings_screen.dart';
import 'package:banjaramatch/screens/setting_screen/setting_controller.dart';
import 'package:banjaramatch/screens/verification_screen/verification_screen.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/update_checker.dart';

/// App settings: account, privacy, notifications, safety, help, legal, session.
class SettingScreen extends StatefulWidget {
  const SettingScreen({Key? key}) : super(key: key);

  @override
  State<SettingScreen> createState() => _SettingScreenState();
}

class _SettingScreenState extends State<SettingScreen> {
  final String _tag = 'settings_${DateTime.now().microsecondsSinceEpoch}';
  late final SettingController controller = Get.put(SettingController(), tag: _tag);

  @override
  void initState() {
    super.initState();
    controller.fetchVerificationStatus();
  }

  @override
  void dispose() {
    Get.delete<SettingController>(tag: _tag);
    super.dispose();
  }

  void _openURL(String url, String titleKey) {
    Navigate.openURLSheet(title: titleKey, url: url);
  }

  @override
  Widget build(BuildContext context) {
    final userId = SessionManager.shared.getUserID();
    return Scaffold(
      backgroundColor: cBackground,
      appBar: featureAppBar(AppKeys.settingsTitle.tr),
      body: GetBuilder<SettingController>(
        tag: _tag,
        builder: (c) {
          return ListView(
            padding: const EdgeInsets.only(top: 8, bottom: 32),
            children: [
              SectionCard(
                title: AppKeys.settingsAccount.tr,
                icon: Icons.person_outline_rounded,
                child: Column(
                  children: [
                    SettingsTile(
                      icon: Icons.edit_outlined,
                      title: AppKeys.settingsEditProfile.tr,
                      onTap: () => Navigate.to(ProfileScreen(userId: userId)),
                    ),
                    SettingsTile(
                      icon: Icons.tune_rounded,
                      title: AppKeys.settingsPartnerPreferences.tr,
                      onTap: () => Navigate.to(const PartnerPreferenceViewScreen()),
                    ),
                    SettingsTile(
                      icon: Icons.photo_library_outlined,
                      title: AppKeys.settingsPhotos.tr,
                      onTap: () => Navigate.to(GalleryManagementScreen(userId: userId)),
                    ),
                    SettingsTile(
                      icon: Icons.verified_outlined,
                      title: AppKeys.settingsVerification.tr,
                      trailing: StatusChip.forStatus(c.verificationState),
                      onTap: () async {
                        await Navigate.to(const VerificationScreen());
                        c.fetchVerificationStatus();
                      },
                    ),
                  ],
                ),
              ),
              SectionCard(
                title: AppKeys.settingsPrivacySafety.tr,
                icon: Icons.shield_outlined,
                child: Column(
                  children: [
                    SettingsTile(
                      icon: Icons.lock_outline_rounded,
                      title: AppKeys.settingsPrivacy.tr,
                      subtitle: AppKeys.settingsPrivacyDesc.tr,
                      onTap: () => Navigate.to(const PrivacySettingsScreen()),
                    ),
                    SettingsTile(
                      icon: Icons.notifications_none_rounded,
                      title: AppKeys.settingsNotifications.tr,
                      subtitle: AppKeys.settingsNotificationsDesc.tr,
                      onTap: () => Navigate.to(const NotificationSettingsScreen()),
                    ),
                    SettingsTile(
                      icon: Icons.block_rounded,
                      title: LKeys.blockList.tr,
                      onTap: () => Navigate.to(const BlockListScreen()),
                    ),
                  ],
                ),
              ),
              SectionCard(
                title: AppKeys.settingsApp.tr,
                icon: Icons.phone_android_rounded,
                child: Column(
                  children: [
                    SettingsTile(
                      icon: Icons.translate_rounded,
                      title: LKeys.languages.tr,
                      onTap: () => Navigate.to(const LanguagesScreen()),
                    ),
                    SettingsTile(
                      icon: Icons.system_update_rounded,
                      title: AppKeys.settingsCheckUpdates.tr,
                      onTap: () => UpdateChecker.shared.checkForUpdates(showDialogIfNoUpdate: true),
                    ),
                  ],
                ),
              ),
              SectionCard(
                title: AppKeys.settingsHelp.tr,
                icon: Icons.support_agent_rounded,
                child: Column(
                  children: [
                    SettingsTile(
                      icon: Icons.help_outline_rounded,
                      title: LKeys.faqS.tr,
                      onTap: () => Navigate.to(const FAQsScreen()),
                    ),
                    SettingsTile(
                      icon: Icons.mail_outline_rounded,
                      title: AppKeys.settingsHelpContact.tr,
                      onTap: () => Navigate.to(const ContactScreen()),
                    ),
                  ],
                ),
              ),
              SectionCard(
                title: AppKeys.settingsLegal.tr,
                icon: Icons.gavel_rounded,
                child: Column(
                  children: [
                    SettingsTile(
                      icon: Icons.privacy_tip_outlined,
                      title: LKeys.privacyPolicy.tr,
                      onTap: () => _openURL(
                          SessionManager.shared.getSettings()?.privacyPolicyUrl ?? privacyURL, LKeys.privacyPolicy),
                    ),
                    SettingsTile(
                      icon: Icons.description_outlined,
                      title: LKeys.termsOfUse.tr,
                      onTap: () =>
                          _openURL(SessionManager.shared.getSettings()?.termsUrl ?? termsURL, LKeys.termsOfUse),
                    ),
                  ],
                ),
              ),
              SectionCard(
                child: Column(
                  children: [
                    SettingsTile(
                      icon: Icons.logout_rounded,
                      title: LKeys.logOut.tr,
                      showChevron: false,
                      destructive: true,
                      onTap: c.logout,
                    ),
                    SettingsTile(
                      icon: Icons.delete_outline_rounded,
                      title: LKeys.deleteMyAcc.tr,
                      showChevron: false,
                      destructive: true,
                      onTap: c.deleteAccount,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  "${LKeys.version.tr} ${c.version}",
                  style: MyTextStyle.gilroyLight(color: cLightText, size: 13),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
