import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/models/ModelCommonEducationQualificationListResponse.dart';
import 'package:banjaramatch/screens/personal_info_controller.dart';

import '../../screens/profile_screen/profile_controller.dart';
import '../common/api_service/user_service.dart';
import '../common/extensions/font_extension.dart';
import '../common/managers/session_manager.dart';
import '../models/model_cast_gotra_list.dart';
import '../models/registration.dart';
import '../utilities/const.dart';

class EditPreferenceController extends ProfileController {
  double minAgeIndex = 18;
  double maxAgeIndex = 60;

  double minHeightIndex = 0;
  double maxHeightIndex = 10;

  final List<String> heightOptions =
      List.generate(37, (i) => "${(4 + (i ~/ 12))}'${(i % 12)}\""); // Generates from 4'0" to 7'0"

  final income = TextEditingController();
  String selectedMaritalStatus = '';
  final maritalStatusOptions = ['Single', 'Divorced', 'Widowed'];

  List<CasteGotra> allCastes = [], allGotras = [], filteredCastes = [], filteredGotras = [];
  List<CasteGotra> selectedCastes = [], selectedGotras = [];

  List<CommonItem> educationSuggestions = [], professionSuggestions = [];
  List<CommonItem> selectedQualification = [], selectedProfession = [];

  // ---------------- Pagination State ----------------
  int currentPage = 1;

  bool hasMore = true;
  List<User> filteredUsers = [];

  final formKey = GlobalKey<FormState>();

  final String userID;
  User? user;

  bool isNewUser = false;

  bool get isSelf => userID == SessionManager.shared.getUserID();

  String prefersSmoking = "";
  String prefersDrinking = "";

  EditPreferenceController(this.userID) : super('');

  @override
  void onInit() {
    super.onInit();
    // Determine if new or updating
    final localUser = SessionManager.shared.getUser();
    final prefs = localUser?.preferences;

    isNewUser = prefs == null || prefs.ageRange == null;

    if (!isNewUser) {
      minAgeIndex = prefs!.ageRange!.min!.toDouble()!;
      maxAgeIndex = prefs!.ageRange!.max!.toDouble()!;

// Corrected logic for min and max height index
      final String? minHeightString = HeightConverter().cmToImperialString(prefs?.heightRange?.min);
      final String? maxHeightString = HeightConverter().cmToImperialString(prefs?.heightRange?.max);

      minHeightIndex = minHeightString != null && heightOptions.contains(minHeightString)
          ? heightOptions.indexOf(minHeightString).toDouble()
          : 0.0;

      maxHeightIndex = maxHeightString != null && heightOptions.contains(maxHeightString)
          ? heightOptions.indexOf(maxHeightString).toDouble()
          : (heightOptions.length - 1).toDouble();
      print(minHeightIndex.toString() + "askdjlksajkdljklasdasd");

      income.text = prefs?.income?.toString() ?? '';
      prefersSmoking = prefs!.smoke ?? "";
      prefersDrinking = prefs!.drink ?? "";
      selectedCastes = prefs?.caste ?? [];
      selectedGotras = prefs?.gotra ?? [];
      selectedQualification = prefs?.qualification ?? [];
      selectedProfession = prefs?.profession ?? [];
    }

    print("Castes (from session if old): $selectedCastes");
  }

  @override
  void onReady() {
    user = User(id: userID);
    if (isNewUser) getProfile();
    fetchEducation('');
    fetchProfession('');
    fetchCastesX();
    super.onReady();
  }

  void getProfile() {
    UserService.shared.fetchProfile(userID, (fetchedUser) {
      user = fetchedUser;
      if (isSelf) SessionManager.shared.setUser(user!);

      final prefs = fetchedUser.preferences;

      minAgeIndex = prefs!.ageRange!.min!.toDouble()!;
      maxAgeIndex = prefs!.ageRange!.max!.toDouble()!;
      final String? minHeightString = HeightConverter().cmToImperialString(prefs?.heightRange?.min);
      final String? maxHeightString = HeightConverter().cmToImperialString(prefs?.heightRange?.max);

      minHeightIndex = minHeightString != null && heightOptions.contains(minHeightString)
          ? heightOptions.indexOf(minHeightString).toDouble()
          : 0.0;

      maxHeightIndex = maxHeightString != null && heightOptions.contains(maxHeightString)
          ? heightOptions.indexOf(maxHeightString).toDouble()
          : (heightOptions.length - 1).toDouble();
      income.text = prefs?.income?.toString() ?? '';
      prefersSmoking = prefs?.smoke ?? "";
      prefersDrinking = prefs?.drink ?? "";
      selectedCastes = prefs?.caste ?? [];
      selectedGotras = prefs?.gotra ?? [];
      selectedQualification = prefs?.qualification ?? [];
      selectedProfession = prefs?.profession ?? [];

      update();
      stopLoading();
    });
  }

  void submit() {
    final data = {
      "user_id": SessionManager.shared.getUserID(),
      "preferences": {
        "age_range": {
          "min": minAgeIndex.toInt(),
          "max": maxAgeIndex.toInt(),
        },
        "height_range": {
          "min": HeightConverter.imperialToCm(heightOptions[minHeightIndex.round()]),
          "max": HeightConverter.imperialToCm(heightOptions[maxHeightIndex.round()]),
        },
        "income": income.text,
        "caste": selectedCastes.map((e) => e.sId).toList(),
        "gotra": selectedGotras.map((e) => e.sId).toList(),
        "qualification": selectedQualification.map((e) => e.sId).toList(),
        "profession": selectedProfession.map((e) => e.sId).toList(),
      },
    };

    final cleanData = Map<String, Object>.fromEntries(
      data.entries.where((e) => e.value != null).map((e) => MapEntry(e.key, e.value as Object)),
    );

    UserService.shared.editProfile(
      preferences: cleanData,
      completion: (res) {
        user?.preferences = res.preferences;
        if (isSelf) SessionManager.shared.setUser(user!);
        update();
        Get.back();
      },
    );
  }

  void fetchCastesX() {
    UserService.shared.fetchCasteList(
      completion: (list) {
        allCastes = list;
        filteredCastes = List.from(list);

        final selectedIds = selectedCastes.map((e) => e.sId).toSet();
        selectedCastes = allCastes.where((e) => selectedIds.contains(e.sId)).toList();
        update();
      },
      page: 1,
    );
  }

  void fetchGotras() {
    UserService.shared.fetchGotraList(
      completion: (list) {
        allGotras = list;
        filteredGotras = List.from(list);

        final selectedIds = selectedGotras.map((e) => e.sId).toSet();
        selectedGotras = allGotras.where((e) => selectedIds.contains(e.sId)).toList();
        update();
      },
      page: 1,
    );
  }

  void fetchEducation(String value) {
    UserService.shared.fetchQualificationList(
      completion: (res) {
        educationSuggestions = res;
        update();
      },
      search: value,
    );
  }

  void fetchProfession(String value) {
    UserService.shared.fetchProfessionList(
      completion: (res) {
        professionSuggestions = res;
        update();
      },
      search: value,
    );
  }

  void filterCaste(String query) {
    filteredCastes =
        allCastes.where((caste) => caste.name?.toLowerCase().contains(query.toLowerCase()) ?? false).toList();
    update();
  }

  void filterGotra(String query) {
    filteredGotras =
        allGotras.where((gotra) => gotra.name?.toLowerCase().contains(query.toLowerCase()) ?? false).toList();
    update();
  }

  void toggleCasteSelection(CasteGotra caste) {
    final exists = selectedCastes.any((e) => e.sId == caste.sId);
    if (exists) {
      selectedCastes.removeWhere((e) => e.sId == caste.sId);
    } else {
      selectedCastes.add(caste);
    }
    update();
  }

  void toggleGotraSelection(CasteGotra gotra) {
    final exists = selectedGotras.any((e) => e.sId == gotra.sId);
    if (exists) {
      selectedGotras.removeWhere((e) => e.sId == gotra.sId);
    } else {
      selectedGotras.add(gotra);
    }
    update();
  }
}

extension PersonalInfoDropdowns on EditPreferenceController {
  Widget buildStringDropdown({
    required String label,
    required String value,
    required List<String> items,
    required Function(String?) onChanged,
  }) {
    return _buildDropdown<String>(
      label: label,
      value: value.isEmpty ? null : value,
      items: items,
      onChanged: onChanged,
    );
  }

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<T> items,
    required Function(T?) onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 14)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: cLightBg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: DropdownButton<T>(
            value: value,
            isExpanded: true,
            underline: const SizedBox(),
            hint: Text('Select $label', style: MyTextStyle.gilroyRegular(color: cLightText)),
            icon: const Icon(Icons.keyboard_arrow_down_rounded),
            items: items.map((item) {
              return DropdownMenuItem<T>(
                value: item,
                child: Text(
                  item is String
                      ? item
                      : (item is CasteGotra
                          ? item.name ?? ''
                          : item is CommonItem
                              ? item.name ?? ''
                              : item.toString()),
                  style: MyTextStyle.gilroyRegular(color: cDarkText),
                ),
              );
            }).toList(),
            onChanged: onChanged,
          ),
        ),
        const SizedBox(height: 14),
      ],
    );
  }
}

extension PersonalInfoTextFields on EditPreferenceController {
  Widget buildTextField({
    required String label,
    required TextEditingController controller,
    String? hintText,
    int maxLines = 1,
    bool isOptional = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 14)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            color: cLightBg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: TextField(
            controller: controller,
            maxLines: maxLines,
            style: MyTextStyle.gilroyRegular(color: cDarkText),
            decoration: InputDecoration(
              hintText: hintText ?? 'Enter $label',
              hintStyle: MyTextStyle.gilroyRegular(color: cLightText),
              border: InputBorder.none,
            ),
          ),
        ),
        const SizedBox(height: 14),
      ],
    );
  }
}
