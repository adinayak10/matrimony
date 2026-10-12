import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/extensions/image_extension.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/extra_views/logo_tag.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/login_screen/login_button.dart';
import 'package:banjaramatch/screens/login_screen/login_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    var controller = LoginController();
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Spacer(),
            const LogoTag(width: 300),
            const Spacer(),
            const TopBarForLogin(
              titleStart: LKeys.signInTo,
              titleEnd: LKeys.continue1,
              alignment: MainAxisAlignment.center,
            ),
            const SizedBox(
              height: 6,
            ),
            Text(
              textAlign: TextAlign.center,
              LKeys.signInDesc.tr,
              style: MyTextStyle.gilroyLight(color: cLightText, size: 18),
            ),
            const Spacer(),
            Column(
              children: [
                LoginButton(
                  text: LKeys.signInWithGoogle,
                  assetName: MyImages.google,
                  onTap: () {
                    controller.googleLogin();
                  },
                ),
                LoginButton(
                  text: LKeys.signInWithEmail,
                  assetName: MyImages.email,
                  onTap: () {
                    controller.emailLogin();
                  },
                ),
                // LoginButton(
                //   text: "Sign in with Mobile",
                //   assetName: MyImages.email, // ⚠️ Make sure you have an appropriate icon
                //   onTap: () {
                //     controller.mobileLogin(); // ✅ You need to define this method in LoginController
                //   },
                // ),
                if (GetPlatform.isIOS)
                  LoginButton(
                    text: LKeys.signInWithApple,
                    assetName: MyImages.apple,
                    onTap: () {
                      //  controller.appleLogin();
                    },
                  ),
              ],
            ),
            const Spacer(),
            Text(
              textAlign: TextAlign.center,
              LKeys.bySelectingAgree.tr,
              style: MyTextStyle.gilroyLight(color: cLightText, size: 14),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  LKeys.iAgreeTo.tr,
                  style: MyTextStyle.gilroyLight(color: cLightText, size: 14),
                ),
                const SizedBox(
                  width: 6,
                ),
                GestureDetector(
                  onTap: () {
                    Navigate.openURLSheet(
                        title: LKeys.termsOfUse.tr,
                        url:
                            SessionManager.shared.getSettings()?.termsUrl ?? 'https://api.banjaramatch.com/termsOfUse');
                  },
                  child: Text(
                    LKeys.termsOfUse.tr,
                    style: MyTextStyle.gilroySemiBold(color: cGold, size: 14),
                  ),
                ),
                const SizedBox(
                  width: 6,
                ),
                Text(
                  LKeys.and.tr,
                  style: MyTextStyle.gilroyLight(color: cLightText, size: 14),
                ),
                const SizedBox(
                  width: 6,
                ),
                GestureDetector(
                  onTap: () {
                    Navigate.openURLSheet(
                        title: LKeys.privacyPolicy.tr,
                        url: SessionManager.shared.getSettings()?.privacyPolicyUrl ??
                            'https://api.banjaramatch.com/privacyPolicy');
                  },
                  child: Text(
                    LKeys.privacyPolicy.tr,
                    style: MyTextStyle.gilroySemiBold(color: cGold, size: 14),
                  ),
                ),
              ],
            ),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}
