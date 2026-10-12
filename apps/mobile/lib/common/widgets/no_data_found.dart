import 'package:flutter/material.dart';
import 'package:get/utils.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/utilities/const.dart';

class NoDataFound extends StatelessWidget {
  final String title;
  final BaseController controller;

  const NoDataFound({
    super.key,
    this.title = LKeys.noDataFound,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    return !controller.isLoading.value
        ? Center(
            child: Text(
            title.tr,
            style: MyTextStyle.gilroySemiBold(color: cLightText),
          ))
        : Container();
  }
}
