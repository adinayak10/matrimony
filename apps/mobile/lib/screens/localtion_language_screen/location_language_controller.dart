import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/models/model_location_list.dart';

import '../../../common/managers/session_manager.dart';
import '../../common/api_service/api_service.dart';
import '../../common/api_service/user_service.dart';
import '../../common/controller/base_controller.dart';
import '../../utilities/web_service.dart';
import '../profile_screen/profile_controller.dart';

class LocationLanguageController extends BaseController {
  LocationData? selectedCountry;
  LocationData? selectedState;
  LocationData? selectedCity;
  LocationData? selectedMotherTongue;
  List<LocationData> selectedKnownLanguages = [];

  List<LocationData> countryOptions = [];
  List<LocationData> stateOptions = [];
  List<LocationData> cityOptions = [];
  List<LocationData> languageOptions = [];

  bool isNewUser = false;

  @override
  void onInit() {
    super.onInit();
    determineIfNewUser();
    fetchCountries().then((_) {
      if (!isNewUser) {
        prefillFromLocal();
      }
    });
    fetchLanguages();
  }

  void determineIfNewUser() {
    final user = SessionManager.shared.getUser();
    if (user != null) {
      final hasCity = user.location?.city != null;
      isNewUser = !hasCity;
    }
  }

  Future<void> fetchCountries() async {
    final response = await ApiService.shared.callAsync(
      url: WebService.fetchCountryList,
      param: {"my_user_id": SessionManager.shared.getUserID()},
    );

    final res = ModelLocationList.fromJson(response);
    if (res.status == true && res.data != null) {
      countryOptions = res.data!;
    }
    update();
  }

  void prefillFromLocal() async {
    final user = SessionManager.shared.getUser();
    if (user == null) return;

    final countryId = user.location?.country?.sId;
    final stateId = user.location?.state?.sId;
    final cityId = user.location?.city?.sId;

    if (countryId != null) {
      selectedCountry = countryOptions.firstWhereOrNull((c) => c.sId == countryId);
      await fetchStatesAsync(countryId);
    }

    if (stateId != null) {
      selectedState = stateOptions.firstWhereOrNull((s) => s.sId == stateId);
      await fetchCitiesAsync(stateId);
    }

    if (cityId != null) {
      selectedCity = cityOptions.firstWhereOrNull((c) => c.sId == cityId);
    }

    // if (user.motherTongue != null && user.motherTongue!.isNotEmpty) {
    //   selectedMotherTongue = LocationData(sId: '', name: user.motherTongue);
    // }
    //
    // if (user.knownLanguages != null && user.knownLanguages!.isNotEmpty) {
    //   selectedKnownLanguages = user.knownLanguages!
    //       .map((lang) => LocationData(sId: '', name: lang))
    //       .toList();
    // }

    update();
  }

  Future<void> fetchStatesAsync(String countryId) async {
    final response = await ApiService.shared.callAsync(
      url: WebService.fetchStateList,
      param: {"my_user_id": SessionManager.shared.getUserID(), "country": countryId},
    );

    final res = ModelLocationList.fromJson(response);
    if (res.status == true && res.data != null) {
      stateOptions = res.data!;
    }
    update();
  }

  Future<void> fetchCitiesAsync(String stateId) async {
    final response = await ApiService.shared.callAsync(
      url: WebService.fetchCityList,
      param: {"my_user_id": SessionManager.shared.getUserID(), "state": stateId},
    );

    final res = ModelLocationList.fromJson(response);
    if (res.status == true && res.data != null) {
      cityOptions = res.data!;
    }
    update();
  }

  void fetchStates(String countryId) {
    selectedState = null;
    selectedCity = null;
    stateOptions.clear();
    cityOptions.clear();
    update();

    fetchStatesAsync(countryId);
  }

  void fetchCities(String stateId) {
    selectedCity = null;
    cityOptions.clear();
    update();

    fetchCitiesAsync(stateId);
  }

  void fetchLanguages() {
    // Placeholder for future language API
  }

  void submitLocationLanguageInfo() {
    startLoading();

    final rawData = {
      "my_user_id": SessionManager.shared.getUserID(),
      "user_id": SessionManager.shared.getUserID(),
      "location": selectedCity?.sId != null ? {"city": selectedCity!.sId} : null,
      "mother_tongue": selectedMotherTongue,
      "known_languages": selectedKnownLanguages,
    };

    final cleanData = Map<String, Object>.fromEntries(
      rawData.entries.where((entry) => entry.value != null).map((entry) => MapEntry(entry.key, entry.value as Object)),
    );

    UserService.shared.editProfile(
        extraParam: cleanData,
        completion: (user) async {
          try {
            SessionManager.shared.setUser(user);
            final profileController = Get.find<ProfileController>(tag: SessionManager.shared.getUserID());
            profileController.user = user;
            profileController.updateMyProfile();
            
            Get.snackbar('Success', 'Profile updated successfully!',
                snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.green, colorText: Colors.white);
          } catch (e) {
            print('ProfileController not found: $e');
          }
          
          // Close the loading dialog
          stopLoading();
          
          // Small delay to ensure dialog closes
          await Future.delayed(const Duration(milliseconds: 150));
          
          // Navigate back
          if (!isNewUser) {
            Get.back();
          }
        });
  }
}
