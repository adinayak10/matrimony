import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/screens/common/section_card.dart';
import 'package:banjaramatch/screens/setting_screen/feature_app_bar.dart';
import 'package:banjaramatch/screens/setting_screen/user_settings_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Who can see / contact me. The product is free: no premium-only options.
class PrivacySettingsScreen extends StatefulWidget {
  const PrivacySettingsScreen({super.key});

  @override
  State<PrivacySettingsScreen> createState() => _PrivacySettingsScreenState();
}

class _PrivacySettingsScreenState extends State<PrivacySettingsScreen> {
  final String _tag = 'privacy_${DateTime.now().microsecondsSinceEpoch}';
  late final UserSettingsController controller = Get.put(UserSettingsController(), tag: _tag);

  @override
  void dispose() {
    Get.delete<UserSettingsController>(tag: _tag);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cBackground,
      appBar: featureAppBar(AppKeys.privacyTitle.tr),
      body: GetBuilder<UserSettingsController>(
        tag: _tag,
        builder: (c) {
          return ListView(
            padding: const EdgeInsets.only(top: 8, bottom: 32),
            children: [
              SectionCard(
                title: AppKeys.privacyProfileSection.tr,
                icon: Icons.person_outline_rounded,
                child: Column(
                  children: [
                    SettingsChoiceGroup(
                      icon: Icons.photo_outlined,
                      title: AppKeys.privacyPhotoVisibility.tr,
                      choices: [
                        SettingsChoice(value: 'everyone', label: AppKeys.optionEveryone.tr),
                        SettingsChoice(value: 'onlyAccepted', label: AppKeys.optionConnections.tr),
                        SettingsChoice(value: 'nobody', label: AppKeys.optionNobody.tr),
                      ],
                      value: c.profilePicVisibility,
                      onChanged: c.saving.contains('profilePicVisibility') ? (_) {} : c.setProfilePicVisibility,
                    ),
                    const Divider(height: 20),
                    SettingsSwitchTile(
                      icon: Icons.location_on_outlined,
                      title: AppKeys.privacyShowLocation.tr,
                      subtitle: AppKeys.privacyShowLocationDesc.tr,
                      value: c.showLocation,
                      enabled: !c.saving.contains('showLocation'),
                      onChanged: c.setShowLocation,
                    ),
                    SettingsSwitchTile(
                      icon: Icons.currency_rupee_rounded,
                      title: AppKeys.privacyShowIncome.tr,
                      subtitle: AppKeys.privacyShowIncomeDesc.tr,
                      value: c.showIncome,
                      enabled: !c.saving.contains('showIncome'),
                      onChanged: c.setShowIncome,
                    ),
                  ],
                ),
              ),
              SectionCard(
                title: AppKeys.privacyContactSection.tr,
                icon: Icons.forum_outlined,
                child: Column(
                  children: [
                    SettingsChoiceGroup(
                      icon: Icons.favorite_border_rounded,
                      title: AppKeys.privacyAllowInterests.tr,
                      choices: [
                        SettingsChoice(value: 'everyone', label: AppKeys.optionEveryone.tr),
                        SettingsChoice(value: 'nobody', label: AppKeys.optionNobody.tr),
                      ],
                      value: c.allowConnections,
                      onChanged: c.saving.contains('allowConnections') ? (_) {} : c.setAllowConnections,
                    ),
                    const Divider(height: 20),
                    SettingsChoiceGroup(
                      icon: Icons.chat_bubble_outline_rounded,
                      title: AppKeys.privacyAllowMessages.tr,
                      choices: [
                        SettingsChoice(value: 'everyone', label: AppKeys.optionEveryone.tr),
                        SettingsChoice(value: 'onlyAccepted', label: AppKeys.optionConnections.tr),
                        SettingsChoice(value: 'nobody', label: AppKeys.optionNobody.tr),
                      ],
                      value: c.allowMessages,
                      onChanged: c.saving.contains('allowMessages') ? (_) {} : c.setAllowMessages,
                    ),
                  ],
                ),
              ),
              SectionCard(
                title: AppKeys.privacyContactDetailsSection.tr,
                icon: Icons.contact_mail_outlined,
                child: Column(
                  children: [
                    SettingsChoiceGroup(
                      icon: Icons.email_outlined,
                      title: AppKeys.privacyEmailVisibility.tr,
                      choices: [
                        SettingsChoice(value: 'public', label: AppKeys.optionVisible.tr),
                        SettingsChoice(value: 'private', label: AppKeys.optionHidden.tr),
                      ],
                      value: c.emailVisibility,
                      onChanged: c.saving.contains('emailVisibility') ? (_) {} : c.setEmailVisibility,
                    ),
                    const Divider(height: 20),
                    SettingsChoiceGroup(
                      icon: Icons.phone_outlined,
                      title: AppKeys.privacyMobileVisibility.tr,
                      choices: [
                        SettingsChoice(value: 'public', label: AppKeys.optionVisible.tr),
                        SettingsChoice(value: 'private', label: AppKeys.optionHidden.tr),
                      ],
                      value: c.mobileVisibility,
                      onChanged: c.saving.contains('mobileVisibility') ? (_) {} : c.setMobileVisibility,
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
