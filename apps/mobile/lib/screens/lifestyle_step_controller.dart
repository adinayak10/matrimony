import 'dart:convert';

import 'package:get/get.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';

import '../common/api_service/user_service.dart';
import '../common/controller/base_controller.dart';
import '../common/managers/session_manager.dart';

class LifestyleStepController extends BaseController {
  int step = 1;

  // Options from settings
  List<String> dietOptions = [];
  List<String> smokingOptions = [];
  List<String> drinkingOptions = [];
  List<String> livingOptions = ['Yes', 'No'];
  List<String> spiritualOptions = [];

  // Selected values
  String diet = '';
  String smokeStatus = '';
  String drinkStatus = '';
  String livingWithFamily = '';
  String spiritualBelief = '';

  // Show additional question flags
  bool showDrink = false;
  bool showSpiritual = false;

  @override
  void onInit() {
    super.onInit();
    _loadOptionsFromSettings();
    _preloadLifestyleValues();
  }

  void _loadOptionsFromSettings() {
    final settings = SessionManager.shared.getSettings();
    print(":akoljsdasdasdsdfsdfsd");
    if (settings == null) return;

    print(":akoljsdasdasd" + jsonEncode(settings.dietOptions));
    dietOptions = settings.dietOptions!;

    smokingOptions = settings.smokingOptions!;
    drinkingOptions = settings.drinkingOptions!;

    spiritualOptions = settings.spiritualOptions!;
  }

  void _preloadLifestyleValues() {
    final user = SessionManager.shared.getUser();
    if (user == null) return;

    diet = user.diet ?? "";
    smokeStatus = user.smoke ?? '';
    drinkStatus = user.drink ?? '';
    livingWithFamily = user.livingWithFamily == true ? 'Yes' : 'No';
    spiritualBelief = user.spiritualBelief ?? '';

    // Automatically reveal next questions if values already exist
    showDrink = smokeStatus.isNotEmpty;
    showSpiritual = livingWithFamily.isNotEmpty;

    update();
  }

  void nextStep() {
    step++;
    update();
  }

  void prevStep() {
    step--;
    update();
  }

  void setDiet(String val) {
    diet = val;
    update();
  }

  void setSmokeStatus(String val) {
    smokeStatus = val;
    showDrink = true;
    update();
  }

  void setDrinkStatus(String val) {
    drinkStatus = val;
    update();
  }

  void setLivingWithFamily(String val) {
    livingWithFamily = val;
    showSpiritual = true;
    update();
  }

  void setSpiritualBelief(String val) {
    spiritualBelief = val;
    update();
  }

  void saveLifestyleStep() async {
    final userId = SessionManager.shared.getUser()?.id;
    if (userId == null) return;

    startLoading();

    final rawData = {
      'user_id': userId,
      'smoke': smokeStatus,
      'drink': drinkStatus,
      'diet': diet,
      'livingWithFamily': livingWithFamily == "Yes",
      'spiritualBelief': spiritualBelief,
    };

    final cleanData = Map<String, Object>.fromEntries(
      rawData.entries.where((entry) => entry.value != null).map((e) => MapEntry(e.key, e.value!)),
    );

    UserService.shared.editProfile(
      completion: (user) async {
        try {
          final profileController = Get.find<ProfileController>(tag: SessionManager.shared.getUserID());
          profileController.user = user;
          profileController.updateMyProfile();
        } catch (e) {
          print('ProfileController not found: $e');
        }

        // Close the loading dialog
        stopLoading();

        // Small delay to ensure dialog closes
        await Future.delayed(const Duration(milliseconds: 150));

        // Navigate back
        Get.back();
      },
      extraParam: cleanData,
    );
  }
}
