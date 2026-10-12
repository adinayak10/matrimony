import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/extra_views/buttons.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/username_screen/username_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

class UserNameScreen extends StatelessWidget {
  const UserNameScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    var controller = Get.put(UsernameController());
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: pOnBoarding,
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      const TopBarForOnBoarding(
                        titleStart: 'Set Your',
                        titleEnd: 'Name',
                        desc: 'Enter your full name to get started',
                      ),
                      Padding(
                        padding: EdgeInsets.symmetric(vertical: Get.height / 9),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            CircleAvatar(
                              radius: 120,
                              backgroundColor: cLightText.withOpacity(0.03),
                            ),
                            CircleAvatar(
                              radius: 90,
                              backgroundColor: cLightText.withOpacity(0.05),
                            ),
                            CircleAvatar(
                              radius: 60,
                              backgroundColor: cLightText.withOpacity(0.07),
                            ),
                            Text(
                              "👤",
                              style: TextStyle(fontSize: 70),
                            )
                          ],
                        ),
                      ),
                      GetBuilder<UsernameController>(
                        builder: (controller) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'Full Name',
                                      style: MyTextStyle.gilroySemiBold(),
                                    ),
                                    const SizedBox(
                                      width: 5,
                                    ),
                                    Text(
                                      "(${controller.textController.text.length}/50)",
                                      style: MyTextStyle.gilroyLight(color: cLightText),
                                    ),
                                  ],
                                ),
                                const SizedBox(
                                  height: 10,
                                ),
                                Container(
                                  decoration: const ShapeDecoration(
                                      shape: SmoothRectangleBorder(
                                          borderRadius: SmoothBorderRadius.all(
                                              SmoothRadius(cornerRadius: 8, cornerSmoothing: cornerSmoothing))),
                                      color: cLightBg),
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                                  child: TextField(
                                    maxLength: 50,
                                    decoration: InputDecoration(
                                        hintText: "Enter your full name",
                                        hintStyle: MyTextStyle.gilroyRegular(color: cLightText),
                                        border: InputBorder.none,
                                        counterText: '',
                                        isDense: true,
                                        contentPadding: const EdgeInsets.all(0)),
                                    cursorColor: cPrimary,
                                    style: MyTextStyle.gilroyRegular(color: cDarkText),
                                    controller: controller.textController,
                                    onChanged: (val) {
                                      controller.update();
                                    },
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
              CommonButton(
                  text: LKeys.continue1,
                  onTap: () {
                    controller.updateUsername();
                  })
            ],
          ),
        ),
      ),
    );
  }
}
