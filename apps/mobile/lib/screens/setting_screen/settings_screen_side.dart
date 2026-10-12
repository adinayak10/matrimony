import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/extra_views/logo_tag.dart';
import 'package:banjaramatch/screens/notification_screen/notification_screen.dart';
import 'package:banjaramatch/screens/partner_preference-view_screen.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/setting_screen/setting_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

class SettingScreenSide extends StatelessWidget {
  const SettingScreenSide({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    SettingController controller = SettingController();
    return Scaffold(
      body: Column(
        children: [
          Padding(
              padding: EdgeInsets.all(16),
              child: LogoTag(
                width: 200,
              )),
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.only(top: 5, bottom: 20, left: 10, right: 10),
                child: SafeArea(
                  top: false,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SettingButton(
                        title: "View and Edit Profile",
                        onTap: () {
                          Navigate.to(ProfileScreen(userId: SessionManager.shared.getUserID()));
                        },
                      ),
                      SettingButton(
                        title: "Partner Preferences",
                        onTap: () {
                          Navigate.to(PartnerPreferenceViewScreen());
                        },
                      ),
                      SettingButton(
                          title: LKeys.notification,
                          onTap: () {
                            Navigate.to(const NotificationScreen());
                          }),
                      // SettingButton(
                      //   title: LKeys.blockList,
                      //   onTap: () {
                      //     Navigate.to(const BlockListScreen());
                      //   },
                      // ),
                      // title: LKeys.languages,
                      // onTap: () {
                      // Navigate.to(const LanguagesScreen());
                      // },
                      // ),       SettingButton(

                      SettingButton(
                        title: LKeys.privacyPolicy,
                        onTap: () {
                          openSheetWithURL(
                              SessionManager.shared.getSettings()?.privacyPolicyUrl ??
                                  'https://api.banjaramatch.com/privacyPolicy',
                              LKeys.privacyPolicy);
                        },
                      ),
                      SettingButton(
                        title: LKeys.termsOfUse,
                        onTap: () {
                          openSheetWithURL(
                              SessionManager.shared.getSettings()?.termsUrl ??
                                  'https://api.banjaramatch.com/termsOfUse',
                              LKeys.termsOfUse);
                        },
                      ),
                      SettingButton(
                        title: LKeys.helpSupport,
                        onTap: () {
                          openSheetWithURL(SessionManager.shared.getSettings()?.helpUrl ?? helpURL,
                              LKeys.helpSupport);
                        },
                      ),
                      GetBuilder<SettingController>(
                          id: controller.notificationID,
                          init: controller,
                          builder: (context) {
                            return SettingButtonWithSwitch(
                              title: LKeys.pushNotification,
                              desc: LKeys.pushNotificationDesc,
                              isOn: controller.isNotification,
                              onChange: controller.changeOfNotification,
                            );
                          }),
                      // SettingButton(
                      //   title: LKeys.faqS,
                      //   onTap: () {
                      //     Navigate.to(const FAQsScreen());
                      //   },
                      // ),
                      SettingButton(
                        title: LKeys.logOut,
                        isNavigationShow: false,
                        onTap: () {
                          controller.logout();
                        },
                      ),
                      const SizedBox(height: 30),

                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 15),
                        child: Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const LogoTag(
                                  width: 120,
                                ),
                                const SizedBox(
                                  height: 4,
                                ),
                                GetBuilder(
                                    init: controller,
                                    id: 'version',
                                    builder: (context) {
                                      return Text(
                                        "${LKeys.version.tr} ${controller.version}",
                                        style: MyTextStyle.gilroyLight(color: cLightText, size: 14),
                                      );
                                    })
                              ],
                            ),
                          ],
                        ),
                      ),
                      // const SizedBox(height: 30),
                      // SettingButton(
                      //   title: LKeys.deleteMyAcc,
                      //   isNavigationShow: false,
                      //   onTap: () {
                      //     controller.deleteAccount();
                      //   },
                      // ),
                    ],
                  ),
                ),
              ),
            ),
          )
        ],
      ),
    );
  }

  void openSheetWithURL(String url, String title) {
    Navigate.openURLSheet(title: title, url: url);
  }
}

class SettingButton extends StatelessWidget {
  final String title;
  final Function()? onTap;
  final bool isNavigationShow;

  const SettingButton({Key? key, required this.title, this.onTap, this.isNavigationShow = true}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: const ShapeDecoration(
            shape: SmoothRectangleBorder(
                borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 8, cornerSmoothing: cornerSmoothing))),
            color: cLightBg),
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
        margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 5),
        child: Row(
          children: [
            Text(
              title.tr,
              style: MyTextStyle.gilroySemiBold(size: 17, color: cDarkText),
            ),
            const Spacer(),
            isNavigationShow
                ? const Icon(
                    Icons.chevron_right_rounded,
                    color: cPrimary,
                    size: 30,
                  )
                : const Opacity(
                    opacity: 0,
                    child: Icon(
                      Icons.chevron_right_rounded,
                      color: cPrimary,
                      size: 30,
                    ),
                  )
          ],
        ),
      ),
    );
  }
}

class SettingButtonWithSwitch extends StatelessWidget {
  final String title;
  final String desc;
  final bool isOn;
  final Function(bool) onChange;

  const SettingButtonWithSwitch(
      {Key? key, required this.title, required this.desc, required this.isOn, required this.onChange})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const ShapeDecoration(
          shape: SmoothRectangleBorder(
              borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 8, cornerSmoothing: cornerSmoothing))),
          color: cLightBg),
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
      margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 5),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title.tr,
                  style: MyTextStyle.gilroySemiBold(size: 17, color: cDarkText),
                ),
                Text(
                  desc.tr,
                  style: MyTextStyle.gilroyRegular(size: 15, color: cLightText),
                ),
              ],
            ),
          ),
          const SizedBox(width: 15),
          CupertinoSwitch(
            activeTrackColor: cPrimary,
            value: isOn,
            onChanged: onChange,
          )
        ],
      ),
    );
  }
}
