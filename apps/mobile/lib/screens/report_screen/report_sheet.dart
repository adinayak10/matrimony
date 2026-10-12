import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/extensions/int_extension.dart';
import 'package:banjaramatch/common/extensions/string_extension.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/feeds_model.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/models/room_model.dart';
import 'package:banjaramatch/models/setting_model.dart';
import 'package:banjaramatch/screens/extra_views/back_button.dart';
import 'package:banjaramatch/screens/extra_views/buttons.dart';
import 'package:banjaramatch/screens/report_screen/report_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../common_widget.dart';

class ReportSheet extends StatelessWidget {
  final User? user;
  final Room? room;
  final Feed? post;

  const ReportSheet({Key? key, this.user, this.room, this.post}) : super(key: key);

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
                  if (room != null || user != null)
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
                              subTitle()
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
                  controller.submitReport(room, post, user);
                },
              )
            ],
          ),
        ),
      ),
    );
  }

  String sheetHeading() {
    if (room != null) {
      return LKeys.reportRoom;
    } else if (post != null) {
      return LKeys.reportPost;
    } else if (user != null) {
      return LKeys.reportUser;
    }
    return "No";
  }

  String? image() {
    if (room != null) {
      return room?.photo;
    } else if (post != null) {
      return post?.content.first.thumbnail ?? post?.content.first.content;
    } else if (user != null) {
      return user?.profile;
    }
    return "No";
  }

  String title() {
    if (room != null) {
      return room?.title ?? '';
    } else if (post != null) {
      return post?.desc ?? '';
    } else if (user != null) {
      return user?.fullName ?? '';
    }
    return "No";
  }

  Widget subTitle() {
    var count = 0;
    var title = "";
    if (room != null) {
      count = room?.totalMember?.toInt() ?? 0;
      title = LKeys.members;
    } else if (post != null) {
      count = post?.likesCount.toInt() ?? 0;
      title = LKeys.likes;
    } else if (user != null) {
      count = (user?.followers ?? 0).toInt();
      title = LKeys.followers;
    }
    return Row(
      children: [
        Text(
          count.makeToString(),
          style: MyTextStyle.gilroyBold(size: 14, color: cLightText),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(width: 5),
        title.toTextTR(MyTextStyle.gilroyLight(size: 14, color: cLightText))
      ],
    );
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
