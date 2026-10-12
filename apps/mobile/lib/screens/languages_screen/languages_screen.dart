import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/localization/allLanguages.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/languages_screen/languages_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

class LanguagesScreen extends StatelessWidget {
  const LanguagesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    LanguagesController controller = LanguagesController();
    return Scaffold(
      body: GetBuilder(
          init: controller,
          builder: (c) {
            return Column(
              children: [
                TopBarForInView(title: LKeys.languages.tr),
                Expanded(
                  child: SafeArea(
                    top: false,
                    child: ListView.builder(
                      padding: EdgeInsets.zero,
                      itemCount: controller.languages.length,
                      itemBuilder: (context, index) {
                        return RadioListTile<Lang>(
                          groupValue: controller.selectedLan,
                          value: controller.languages[index],
                          dense: true,
                          fillColor: WidgetStateProperty.all(cPrimary),
                          // tileColor: cPrimary,
                          onChanged: (Lang? value) {
                            controller.setLang(value!);
                          },
                          title: Text(
                            controller.languages[index].displayName,
                            style: MyTextStyle.gilroyMedium(size: 18),
                          ),
                          subtitle: Text(
                            controller.languages[index].nameInEnglish,
                            style: MyTextStyle.gilroyRegular(
                                size: 14, color: cLightText),
                          ),
                        );
                      },
                    ),
                  ),
                )
              ],
            );
          }),
    );
  }
}
