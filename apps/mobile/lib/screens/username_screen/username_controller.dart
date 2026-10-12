import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/interests_screen/interests_controller.dart';

import '../splash_screen/splash_controller.dart';

class UsernameController extends InterestsController {
  TextEditingController textController = TextEditingController();

  @override
  void onInit() {
    super.onInit();
  }

  void updateUsername() {
    if (textController.text.trim().isEmpty) {
      showSnackBar(LKeys.pleaseEnterUsername.tr, type: SnackBarType.error);
      return;
    }

    startLoading();
    UserService.shared.editProfile(
        fullName: textController.text.trim(),
        completion: (p0) {
          stopLoading();
          Get.offAll(() => gotoNextSetupView());
        });
  }
}
