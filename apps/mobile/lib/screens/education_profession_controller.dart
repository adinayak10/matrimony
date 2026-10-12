import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';

import '../../../common/api_service/api_service.dart';
import '../../../common/api_service/user_service.dart';
import '../../../common/managers/session_manager.dart';
import '../../../utilities/web_service.dart';
import '../models/ModelCommonEducationQualificationListResponse.dart';
import '../models/model_income_range_list.dart';
import '../models/setting_model.dart';

class EducationProfessionController extends BaseController {
  CommonItem? selectedQualification;
  CommonItem? selectedProfession;
  IncomeRange? selectedIncome;

  List<CommonItem> educationOptions = [];
  List<CommonItem> professionOptions = [];
  List<IncomeRange> incomeOptions = [];

  bool isNewUser = false;

  @override
  void onInit() {
    super.onInit();
    determineIfNewUser();
    fetchEducations().then((_) {
      if (!isNewUser) {
        prefillFromLocal();
      }
    });
    fetchProfessions();
    fetchIncomeRanges();
  }

  void determineIfNewUser() {
    final user = SessionManager.shared.getUser();
    if (user != null) {
      final hasEducation = user.qualification?.sId != null;
      print("alkdjsasdasd" + hasEducation.toString());
      isNewUser = !hasEducation;
    }
  }

  Future<void> fetchEducations() async {
    isLoading.value = true;
    update();

    final response = await ApiService.shared.callAsync(
      url: WebService.fetchQualificationList,
      param: {"my_user_id": SessionManager.shared.getUserID()},
    );

    final data = ModelDropdownCommonList.fromJson(response).data;
    if (data != null) educationOptions = data;

    print("alksjdlkajsdlkasd");
    isLoading.value = false;
    update();
  }

  Future<void> fetchProfessions() async {
    final response = await ApiService.shared.callAsync(
      url: WebService.fetchProfessionList,
      param: {"my_user_id": SessionManager.shared.getUserID()},
    );

    final data = ModelDropdownCommonList.fromJson(response).data;
    if (data != null) professionOptions = data;

    update();
  }

  Future<void> fetchIncomeRanges() async {
    final response = await ApiService.shared.callAsync(
      url: WebService.fetchIncomeRange,
      param: {"my_user_id": SessionManager.shared.getUserID()},
    );

    final data = ModelIncomeRangeList.fromJson(response).data;
    if (data != null) incomeOptions = data;

    update();
  }

  void prefillFromLocal() {
    final user = SessionManager.shared.getUser();
    if (user == null) return;

    selectedQualification = educationOptions.firstWhereOrNull((e) => e.sId == user.qualification?.sId);
    selectedProfession = professionOptions.firstWhereOrNull((p) => p.sId == user.profession?.sId);
    selectedIncome = incomeOptions.firstWhereOrNull((i) => i.id == user.incomeRange?.id);

    update();
  }

  void submitEducationProfessionInfo() {
    final rawData = {
      "my_user_id": SessionManager.shared.getUserID(),
      "user_id": SessionManager.shared.getUserID(),
      "qualification": selectedQualification?.sId,
      "profession": selectedProfession?.sId,
      "income_range": selectedIncome?.id,
    };

    final cleanData = Map<String, Object>.fromEntries(
      rawData.entries.where((entry) => entry.value != null).map((e) => MapEntry(e.key, e.value!)),
    );

    UserService.shared.editProfile(
      extraParam: cleanData,
      completion: (user) {
        SessionManager.shared.setUser(user);

        try {
          final profileController = Get.find<ProfileController>(tag: SessionManager.shared.getUserID());
          profileController.user = user;
          profileController.updateMyProfile();
          if (!isNewUser) {
            Get.back();
          }
        } catch (e) {
          print('ProfileController not found: $e');
        }

        Get.snackbar('Success', 'Profile updated successfully!',
            snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.green, colorText: Colors.white);
      },
    );
  }
}
