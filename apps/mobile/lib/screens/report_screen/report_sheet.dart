import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/extensions/string_extension.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/models/setting_model.dart';
import 'package:banjaramatch/screens/extra_views/back_button.dart';
import 'package:banjaramatch/screens/extra_views/buttons.dart';
import 'package:banjaramatch/screens/report_screen/report_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../common_widget.dart';

class ReportSheet extends StatelessWidget {
  final User? user;

  const ReportSheet({Key? key, this.user}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    ReportController controller = ReportController();
    return SafeArea(
      bottom: false,
      child: Container(
        decoration: const ShapeDecoration(
          shape: SmoothRectangleBorder(
              borderRadius: SmoothBorderRadius.only(
                  topLeft: SmoothRadius(cornerRadius: 30, cornerSmoothing: cornerSmoothing),
                  topRight: SmoothRadius(cornerRadius: 30, cornerSmoothing: cornerSmoothing))),
          color: cBlack,
        ),
        padding: const EdgeInsets.all(25),
        child: SafeArea(
          top: false,
          child: Wrap(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      sheetHeading().toTextTR(MyTextStyle.gilroyLight(color: cPrimary)),
                      const Spacer(),
                      const XMarkButton()
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (user != null)
                    Row(
                      children: [
                        ClipOval(
                          child: MyCachedImage(
                            imageUrl: image(),
                            width: 50,
                            height: 50,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    title(),
                                    style: MyTextStyle.gilroyBold(size: 18, color: cWhite),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  else
                    Container(),
                  const SizedBox(height: 20),
                  dropDown(controller),
                  const SizedBox(height: 20),
                  LKeys.tellUsMore.toTextTR(MyTextStyle.gilroyLight(color: cWhite)),
                  const SizedBox(height: 4),
                  MyTextField(
                    controller: controller.reasonTextController,
                    placeHolder: LKeys.writeSomething,
                    isEditor: true,
                    color: cWhite.withOpacity(0.1),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
              CommonSheetButton(
                title: LKeys.submitReport,
                onTap: () {
                  controller.submitReport(user);
                },
              )
            ],
          ),
        ),
      ),
    );
  }

  String sheetHeading() {
    return LKeys.reportUser;
  }

  String? image() {
    return user?.profile;
  }

  String title() {
    return user?.fullName ?? '';
  }

  Widget dropDown(ReportController controller) {
    return GetBuilder<ReportController>(
        init: controller,
        builder: (context) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 15),
            decoration: ShapeDecoration(
              shape: const SmoothRectangleBorder(
                  borderRadius:
                      SmoothBorderRadius.all(SmoothRadius(cornerRadius: 12, cornerSmoothing: cornerSmoothing))),
              color: cWhite.withOpacity(0.1),
            ),
            child: DropdownButton<Interest>(
              borderRadius: BorderRadius.circular(12),
              dropdownColor: cBlack,
              value: controller.selectedReason,
              elevation: 16,
              isExpanded: true,
              underline: const SizedBox(),
              style: MyTextStyle.gilroyRegular(color: cWhite),
              onChanged: controller.onReasonChange,
              items: controller.reasons.map<DropdownMenuItem<Interest>>((Interest value) {
                return DropdownMenuItem<Interest>(
                  value: value,
                  child: Text(value.title ??
                      ""
                          ""),
                );
              }).toList(),
            ),
          );
        });
  }
}
