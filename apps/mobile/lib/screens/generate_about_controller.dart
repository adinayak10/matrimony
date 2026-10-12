import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/models/generated_about_model.dart';
import 'package:banjaramatch/models/model_about_option.dart';
import 'package:banjaramatch/utilities/params.dart';
import 'package:banjaramatch/utilities/web_service.dart';

import '../../common/api_service/api_service.dart';

class GenerateAboutController extends BaseController {
  int step = 1;
  bool loading = false;
  bool isPulseLoading = false;
  String? selectedTone;
  List<String> selectedTraits = [];
  List<String> selectedHobbies = [];
  List<String> selectedGoals = [];
  String generatedBio = '';

  List<String> tones = [];
  List<String> traits = [];
  List<String> hobbies = [];
  List<String> goals = [];

  // Lifestyle Step - new inputs
  String? smoking;
  String? drinking;
  String? diet;

  List<String> dietOptions = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', 'Other'];

  @override
  void onInit() {
    super.onInit();
    fetchOptionsFromApi();
    prefillFromExistingData();
  }

  void prefillFromExistingData() {
    final userd = SessionManager.shared.getUser();

    if (userd != null) {
      diet = userd.diet;
      smoking = userd.smoke;
      drinking = userd.drink;
    }
    if (userd != null && userd.personalityMap != null) {
      final data = userd.personalityMap;

      selectedTone = data?.tone;
      selectedTraits = List<String>.from(data?.traits ?? []);
      selectedHobbies = List<String>.from(data?.hobbies ?? []);
      selectedGoals = List<String>.from(data?.goals ?? []);
      generatedBio = data?.about ?? '';
    }

    update();
  }

  void fetchOptionsFromApi() {
    loading = true;
    update();

    ApiService.shared.call(
      param: {},
      url: WebService.fetchOptions,
      completion: (Object response) {
        var data = AboutOptionModel.fromJson(response).data;
        if (data != null) {
          tones = data.tone!;
          traits = data.trait!;
          hobbies = data.hobby!;
          goals = data.goal!;
        }

        // Prefill after fetching
        prefillFromExistingData();

        loading = false;
        update();
      },
    );
  }

  void nextStep() {
    if (step < 5) step++;
    update();
  }

  void prevStep() {
    if (step > 1) step--;
    update();
  }

  void setSelectedTone(String value) {
    selectedTone = value;
    update();
  }

  void toggleTrait(String value) {
    if (selectedTraits.contains(value)) {
      selectedTraits.remove(value);
    } else {
      selectedTraits.add(value);
    }
    update();
  }

  void toggleHobby(String value) {
    if (selectedHobbies.contains(value)) {
      selectedHobbies.remove(value);
    } else {
      selectedHobbies.add(value);
    }
    update();
  }

  void toggleGoal(String value) {
    if (selectedGoals.contains(value)) {
      selectedGoals.remove(value);
    } else {
      selectedGoals.add(value);
    }
    update();
  }

  void setSmoking(String? value) {
    smoking = value;
    update();
  }

  void setDrinking(String? value) {
    drinking = value;
    update();
  }

  void setDiet(String value) {
    diet = value;
    update();
  }

  void saveLifestyleStep() async {
    print('Smoking: \$smoking, Drinking: \$drinking, Diet: \$diet');

    final userId = SessionManager.shared.getUser()?.id;
    if (userId == null) return;

    final rawData = {
      'user_id': userId,
      'smoke': smoking,
      'drink': drinking,
      'diet': diet,
    };

    final cleanData = Map<String, Object>.fromEntries(
      rawData.entries.where((entry) => entry.value != null).map((e) => MapEntry(e.key, e.value!)),
    );

    loading = true;
    update();

    UserService.shared.editProfile(
        completion: (user) {
          print("lakjsdlkasdasdasd");
          loading = false;
          update();
          nextStep();
          if (Get.isDialogOpen == true) {
            Get.back();
          }
        },
        extraParam: cleanData);
  }

  void generateBio(BuildContext context) {
    isPulseLoading = true;
    update();

    ApiService.shared.call(
      url: WebService.generateAbout,
      param: {
        'tone': selectedTone,
        'traits': selectedTraits,
        'hobbies': selectedHobbies,
        'goals': selectedGoals,
        Param.myUserId: SessionManager.shared.getUserID()
      },
      completion: (Object response) {
        final model = GeneratedAboutModel.fromJson(response);
        final bioText = model.data?.about ?? "Something went wrong. Please try again.";

        generatedBio = bioText;
        isPulseLoading = false;
        update();

        // ✅ Dismiss full-screen loader
        Navigator.of(context, rootNavigator: true).pop();

        // // ✅ Update profile locally
        // final profileController = Get.find<Gallerr>();
        // profileController.setBioFromAI(bioText);
        // profileController.setPersonalityMap(
        //   tone: selectedTone ?? '',
        //   traits: selectedTraits,
        //   hobbies: selectedHobbies,
        //   goals: selectedGoals,
        //   about: bioText,
        // );

        Get.back(); // Go back to previous step or screen
        showSnackBar("Bio Generated Successfully", type: SnackBarType.success);
      },
    );
  }
}
