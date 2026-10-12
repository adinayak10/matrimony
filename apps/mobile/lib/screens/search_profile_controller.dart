import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/screens/personal_info_controller.dart';

import '../common/api_service/user_service.dart';
import '../common/extensions/font_extension.dart';
import '../models/ModelCommonEducationQualificationListResponse.dart';
import '../models/model_cast_gotra_list.dart';
import '../models/registration.dart';
import '../utilities/const.dart';

class SearchUserController extends GetxController {
  // ---------------- Filters ----------------
  double minAgeIndex = 18;
  double maxAgeIndex = 30;

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
  bool isLoading = false;
  bool hasMore = true;
  List<User> filteredUsers = [];

  @override
  void onInit() {
    super.onInit();
    fetchCastes();
    fetchGotras();
    fetchEducation("");
    fetchProfession("");
  }

  // ---------------- Filters Data Fetch ----------------
  void fetchCastes() {
    UserService.shared.fetchCasteList(
        page: 1,
        completion: (list) {
          allCastes = list;
          filteredCastes = List.from(list);
          update();
        });
  }

  void fetchGotras() {
    UserService.shared.fetchGotraList(
        page: 1,
        completion: (list) {
          allGotras = list;
          filteredGotras = List.from(list);
          update();
        });
  }

  void filterCaste(String query) {
    filteredCastes = allCastes.where((c) => c.name?.toLowerCase().contains(query.toLowerCase()) ?? false).toList();
    update();
  }

  void filterGotra(String query) {
    filteredGotras = allGotras.where((g) => g.name?.toLowerCase().contains(query.toLowerCase()) ?? false).toList();
    update();
  }

  void toggleCasteSelection(CasteGotra caste) {
    final exists = selectedCastes.any((e) => e.sId == caste.sId);
    exists ? selectedCastes.removeWhere((e) => e.sId == caste.sId) : selectedCastes.add(caste);
    update();
  }

  void toggleGotraSelection(CasteGotra gotra) {
    final exists = selectedGotras.any((e) => e.sId == gotra.sId);
    exists ? selectedGotras.removeWhere((e) => e.sId == gotra.sId) : selectedGotras.add(gotra);
    update();
  }

  void fetchEducation(String query) {
    UserService.shared.fetchQualificationList(
        search: query,
        completion: (res) {
          educationSuggestions = res;
          update();
        });
  }

  void fetchProfession(String query) {
    UserService.shared.fetchProfessionList(
        search: query,
        completion: (res) {
          professionSuggestions = res;
          update();
        });
  }

  // ---------------- Search Users ----------------
  // void searchUsers(Function(List<User>) onResult, {bool reset = true}) {
  //   if (isLoading || (!hasMore && !reset)) return;
  //
  //   if (reset) {
  //     currentPage = 1;
  //     hasMore = true;
  //     filteredUsers.clear();
  //     update();
  //   }
  //
  //   isLoading = true;
  //   update();
  //
  //   final data = {
  //     "age_range": {
  //       "min": minAgeIndex.round().toString(),
  //       "max": maxAgeIndex.round().toString(),
  //     },
  //     "height_range": {
  //       "min": heightOptions[minHeightIndex.round()],
  //       "max": heightOptions[maxHeightIndex.round()],
  //     },
  //     "income": income.text.trim(),
  //     "marital_status": selectedMaritalStatus,
  //     "caste": selectedCastes.map((e) => e.sId).toList(),
  //     "gotra": selectedGotras.map((e) => e.sId).toList(),
  //     "qualification": selectedQualification.map((e) => e.sId).toList(),
  //     "profession": selectedProfession.map((e) => e.sId).toList(),
  //   };
  //
  //   UserService.shared.fetchProfiles(
  //     filters: data,
  //     page: currentPage,
  //     completion: (List<User> newUsers) {
  //       isLoading = false;
  //
  //       if (newUsers.isEmpty) {
  //         hasMore = false;
  //       } else {
  //         currentPage++;
  //         filteredUsers.addAll(newUsers);
  //       }
  //
  //       update();
  //       onResult(filteredUsers);
  //     },
  //   );
  // }

  Map<String, dynamic> buildFilterPayload() {
    return {
      "age_range": {
        "min": minAgeIndex.round().toString(),
        "max": maxAgeIndex.round().toString(),
      },
      "height_range": {
        "min": HeightConverter.imperialToCm(heightOptions[minHeightIndex.round()]),
        "max": HeightConverter.imperialToCm(heightOptions[maxHeightIndex.round()]),
      },
      "income": income.text.trim(),
      "marital_status": selectedMaritalStatus,
      "caste": selectedCastes.map((e) => e.sId).toList(),
      "gotra": selectedGotras.map((e) => e.sId).toList(),
      "qualification": selectedQualification.map((e) => e.sId).toList(),
      "profession": selectedProfession.map((e) => e.sId).toList(),
    };
  }
}

extension PersonalInfoDropdowns on SearchUserController {
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

extension PersonalInfoTextFields on SearchUserController {
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
