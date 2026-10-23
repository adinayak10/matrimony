import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/call_screen/call_history_screen.dart';
import 'package:banjaramatch/screens/daily_matches_screen/daily_matches_screen.dart';
import 'package:banjaramatch/screens/extra_views/logo_tag.dart';
import 'package:banjaramatch/screens/faq_screen/faq_screen.dart';
import 'package:banjaramatch/screens/nearby_screen/nearby_screen.dart';
import 'package:banjaramatch/screens/notification_screen/notification_screen.dart';
import 'package:banjaramatch/screens/partner_preference-view_screen.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/saved_searches_screen/saved_searches_screen.dart';
import 'package:banjaramatch/screens/setting_screen/contact_screen.dart';
import 'package:banjaramatch/screens/setting_screen/setting_controller.dart';
import 'package:banjaramatch/screens/setting_screen/setting_screen.dart';
import 'package:banjaramatch/screens/shortlist_screen/shortlist_screen.dart';
import 'package:banjaramatch/screens/success_stories_screen/success_stories_screen.dart';
import 'package:banjaramatch/screens/verification_screen/verification_screen.dart';
import 'package:banjaramatch/screens/visitors_screen/visitors_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Navigation drawer: every 1.1.0 screen is reachable from here.
class SettingScreenSide extends StatelessWidget {
  const SettingScreenSide({Key? key}) : super(key: key);

  /// Closes the drawer, then pushes [screen].
  void _open(BuildContext context, Widget screen) {
    Navigator.of(context).pop();
    Navigate.to(screen);
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<SettingController>(
      init: SettingController(),
      builder: (controller) {
        final user = SessionManager.shared.getUser();
        final userId = SessionManager.shared.getUserID();
        return Scaffold(
          backgroundColor: cBackground,
          body: SafeArea(
            child: Column(
              children: [
                _header(context, user?.fullName, user?.profile, user?.isVerified == 1, userId),
                Expanded(
                  child: ListView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(10, 4, 10, 20),
                    children: [
                      _section(AppKeys.drawerProfile.tr),
                      _row(context, Icons.person_outline_rounded, AppKeys.drawerViewProfile.tr,
                          () => _open(context, ProfileScreen(userId: userId))),
                      _row(context, Icons.tune_rounded, AppKeys.settingsPartnerPreferences.tr,
                          () => _open(context, const PartnerPreferenceViewScreen())),
                      _row(context, Icons.verified_outlined, AppKeys.settingsVerification.tr,
                          () => _open(context, const VerificationScreen())),
                      _section(AppKeys.drawerDiscover.tr),
                      _row(context, Icons.auto_awesome_rounded, AppKeys.dailyMatchesTitle.tr,
                          () => _open(context, const DailyMatchesScreen())),
                      _row(context, Icons.near_me_outlined, AppKeys.nearbyTitle.tr,
                          () => _open(context, const NearbyScreen())),
                      _row(context, Icons.visibility_outlined, AppKeys.visitorsTitle.tr,
                          () => _open(context, const VisitorsScreen())),
                      _row(context, Icons.bookmark_border_rounded, AppKeys.shortlistTitle.tr,
                          () => _open(context, const ShortlistScreen())),
                      _row(context, Icons.saved_search_rounded, AppKeys.drawerSavedSearches.tr,
                          () => _open(context, const SavedSearchesScreen())),
                      _section(AppKeys.drawerCommunity.tr),
                      _row(context, Icons.celebration_outlined, AppKeys.drawerSuccessStories.tr,
                          () => _open(context, const SuccessStoriesScreen())),
                      _section(AppKeys.drawerActivity.tr),
                      _row(context, Icons.notifications_none_rounded, LKeys.notification.tr,
                          () => _open(context, const NotificationScreen())),
                      _row(context, Icons.call_outlined, AppKeys.drawerCallHistory.tr,
                          () => _open(context, const CallHistoryScreen())),
                      _section(AppKeys.drawerMore.tr),
                      _row(context, Icons.settings_outlined, AppKeys.settingsTitle.tr,
                          () => _open(context, const SettingScreen())),
                      _row(context, Icons.help_outline_rounded, LKeys.faqS.tr,
                          () => _open(context, const FAQsScreen())),
                      _row(context, Icons.mail_outline_rounded, AppKeys.settingsHelpContact.tr,
                          () => _open(context, const ContactScreen())),
                      _row(context, Icons.logout_rounded, LKeys.logOut.tr, controller.logout, destructive: true),
                      const SizedBox(height: 24),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const LogoTag(width: 120),
                            const SizedBox(height: 4),
                            GetBuilder<SettingController>(
                              id: 'version',
                              builder: (c) => Text(
                                "${LKeys.version.tr} ${c.version}",
                                style: MyTextStyle.gilroyLight(color: cLightText, size: 14),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _header(BuildContext context, String? name, String? photo, bool verified, String userId) {
    return InkWell(
      onTap: () => _open(context, ProfileScreen(userId: userId)),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: MyCachedProfileImage(imageUrl: photo, fullName: name, width: 56, height: 56),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          (name ?? '').trim().isEmpty ? appName : name!.trim(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: MyTextStyle.gilroyBold(size: 17, color: cDarkText),
                        ),
                      ),
                      if (verified) ...[
                        const SizedBox(width: 4),
                        const Icon(Icons.verified_rounded, size: 16, color: cBlueTick),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(AppKeys.drawerViewProfile.tr, style: MyTextStyle.gilroyMedium(size: 12, color: cPrimary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _section(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 4),
      child: Text(
        title.toUpperCase(),
        style: MyTextStyle.gilroySemiBold(size: 11, color: cLightText).copyWith(letterSpacing: 1.2),
      ),
    );
  }

  Widget _row(BuildContext context, IconData icon, String title, VoidCallback onTap, {bool destructive = false}) {
    final color = destructive ? cError : cDarkText;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        child: Row(
          children: [
            Icon(icon, size: 20, color: destructive ? cError : cPrimary),
            const SizedBox(width: 14),
            Expanded(child: Text(title, style: MyTextStyle.gilroySemiBold(size: 15, color: color))),
          ],
        ),
      ),
    );
  }
}
