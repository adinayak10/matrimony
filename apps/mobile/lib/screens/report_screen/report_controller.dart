import 'package:flutter/material.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/models/setting_model.dart';

class ReportController extends BaseController {
  final List<Interest> reasons = SessionManager.shared.getSettings()?.reportReasons ?? [];
  Interest? selectedReason;
  TextEditingController reasonTextController = TextEditingController();

  @override
  void onInit() {
    super.onInit();
    selectedReason = reasons.isNotEmpty ? reasons.first : null;
  }

  void onReasonChange(Interest? reason) {
    selectedReason = reason;
    update();
  }

  void submitReport(User? user) {
    if (selectedReason == null) {
      showSnackBar("Please select a reason");
      return;
    }
    if (reasonTextController.text.isEmpty) {
      showSnackBar(LKeys.pleaseEnterDescription);
      return;
    }
    FocusManager.instance.primaryFocus?.unfocus();
    startLoading();
    if (user != null) {
      UserService.shared.reportUser(user.id ?? "0", selectedReason?.title ?? '', reasonTextController.text);
    }
  }
}
