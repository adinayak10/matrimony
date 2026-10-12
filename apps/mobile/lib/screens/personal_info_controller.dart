import 'dart:convert'; // Still needed for jsonEncode if you keep the print statements

import 'package:flutter/material.dart';
import 'package:get/get.dart'; // Import GetX
import 'package:intl/intl.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/models/model_cast_gotra_list.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';

import '../../../common/managers/session_manager.dart';
import '../common/api_service/api_service.dart';
import '../common/extensions/font_extension.dart';
import '../models/registration.dart';
import '../utilities/const.dart';
import '../utilities/web_service.dart';

class PersonalInfoController extends BaseController {
  // Controllers
  final gotraController = TextEditingController();

  // Form fields
  String selectedHeight = '';
  String selectedMaritalStatus = '';
  String selectedBloodGroup = '';
  String selectedGender = '';
  DateTime? dob;

  // Dropdown options
  final List<String> heightOptions =
      List.generate(37, (i) => "${(4 + (i ~/ 12))}'${(i % 12)}\""); // Generates from 4'0" to 7'0"

  final List<String> maritalStatusOptions = ['Never Married', 'Divorced', 'Widowed', 'Separated', 'Awaiting Divorce'];
  final List<String> bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  final List<String> genderOptions = ['Male', 'Female', 'Not specified'];

  // Castes & Gotras
  CasteGotra? selectedCaste;
  CasteGotra? selectedGotra;
  List<CasteGotra> castes = [];
  List<CasteGotra> gotras = [];

  // State

  bool isNewUser = false;

  @override
  void onInit() {
    super.onInit();
    _initializeData();
  }

  Future<void> _initializeData() async {
    await fetchCastesAsync();
    await fetchAndSetUserInfoFromLocal(); // No API call
  }

  Future<void> fetchAndSetUserInfoFromLocal() async {
    isLoading.value = true;
    update();

    try {
      final user = SessionManager.shared.getUser();
      if (user != null) {
        selectedGender = user.gender ?? '';
        selectedHeight = HeightConverter().cmToImperialString(user.height) ?? '';
        selectedMaritalStatus = user.maritalStatus ?? '';
        dob = user.dob != null ? DateTime.tryParse(user.dob!) : null;

        isNewUser =
            (selectedGender.isEmpty || selectedGender == "Not specified" || dob == null || selectedHeight.isEmpty);
        print("//////////////////");
        print(isNewUser);
        if (user.caste != null) {
          selectedCaste = castes.firstWhereOrNull((c) => c.sId == user.caste!.sId);
        }

        if (selectedCaste?.sId != null) {
          await fetchGotrasAsync(selectedCaste!.sId!);
        }

        if (user.gotra != null) {
          selectedGotra = gotras.firstWhereOrNull((g) => g.sId == user.gotra!.sId);
          gotraController.text = selectedGotra?.name ?? '';
        }
      }
    } catch (e) {
      print('Error reading local profile: $e');
      Get.snackbar('Error', 'Failed to load personal info.', snackPosition: SnackPosition.BOTTOM);
    } finally {
      isLoading.value = false;
      update();
    }
  }

  Future<void> fetchCastesAsync() async {
    castes.clear();
    gotras.clear();
    final userId = SessionManager.shared.getUserID();

    try {
      final response = await ApiService.shared.callAsync(
        url: WebService.fetchCasteList,
        param: {"my_user_id": userId},
      );
      final obj = ModelCasteGotraList.fromJson(response);
      if (obj.status == true && obj.data != null) {
        castes.addAll(obj.data!);
      }
    } catch (e) {
      print('Error fetching castes: $e');
    }
    update();
  }

  Future<void> fetchGotrasAsync(String casteId) async {
    gotras.clear();
    final userId = SessionManager.shared.getUserID();

    try {
      final response = await ApiService.shared.callAsync(
        url: WebService.fetchGotraList,
        param: {"my_user_id": userId, "caste_id": casteId},
      );
      final obj = ModelCasteGotraList.fromJson(response);
      if (obj.status == true && obj.data != null) {
        gotras.addAll(obj.data!);
      }
    } catch (e) {
      print('Error fetching gotras: $e');
    }
    update();
  }

  void onCasteSelected(CasteGotra caste) {
    selectedCaste = caste;
    selectedGotra = null;
    gotraController.clear();
    update();
    fetchGotrasAsync(caste.sId ?? '');
  }

  void onGotraSelected(CasteGotra gotra) {
    selectedGotra = gotra;
    gotraController.text = gotra.name ?? '';
    update();
  }

  Future<void> submitPersonalInfo() async {
    isLoading.value = true;
    update();

    final data = {
      "my_user_id": SessionManager.shared.getUserID(),
      "user_id": SessionManager.shared.getUserID(),
      "height": HeightConverter.imperialToCm(selectedHeight),
      "marital_status": selectedMaritalStatus,
      "casteId": selectedCaste?.sId ?? '',
      "gotraId": selectedGotra?.sId ?? gotraController.text.trim(),
      "dob": dob != null ? DateFormat('yyyy-MM-dd').format(dob!) : '',
      "gender": selectedGender,
      "bloodGroup": selectedBloodGroup,
    };

    try {
      final response = await ApiService.shared.callAsync(
        url: WebService.editProfile,
        param: data,
      );

      var user = Registration.fromJson(response).data;
      if (user != null) {
        SessionManager.shared.setUser(user);

        try {
          final profileController = Get.find<ProfileController>(tag: SessionManager.shared.getUserID());
          profileController.user = user;
          print("alsjdasjd;asdk;asd");
          profileController.updateMyProfile();
          if (!isNewUser) {
            Get.back();
          }
        } catch (e) {
          print('ProfileController not found: $e');
        }

        Get.snackbar('Success', 'Profile updated successfully!',
            snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.green, colorText: Colors.white);
      }
    } catch (e) {
      print('Error submitting personal info: $e');
      Get.snackbar('Error', 'An error occurred while updating profile.',
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      isLoading.value = false;
      update();
    }
  }

  Widget buildDatePickerField({
    required String label,
    required DateTime? selectedDate,
    required VoidCallback onTap,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 14)),
        const SizedBox(height: 6),
        GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: cLightBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    selectedDate != null ? DateFormat('dd MMM yyyy').format(selectedDate) : 'Select Date of Birth',
                    style: MyTextStyle.gilroyRegular(
                      color: selectedDate != null ? cDarkText : cLightText,
                    ),
                  ),
                ),
                const Icon(Icons.calendar_today, color: cLightText, size: 18),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
      ],
    );
  }
}

extension PersonalInfoDropdowns on PersonalInfoController {
  Widget buildStringDropdown({
    required String label,
    required String value,
    required List<String> items,
    required Function(String?) onChanged,
    bool enabled = true,
  }) {
    return _buildDropdown<String>(
      label: label,
      value: value.isEmpty ? null : value,
      items: items,
      onChanged: enabled ? onChanged : null,
      enabled: enabled,
    );
  }

  Widget buildCasteDropdown() {
    // These print statements are for debugging and can be removed in production
    print(selectedCaste);
    print(jsonEncode(selectedCaste));
    print("........................");
    print(castes);
    print(jsonEncode(castes));

    return _buildDropdown<CasteGotra>(
      label: 'Caste',
      value: selectedCaste,
      items: castes,
      onChanged: (val) {
        if (val != null) onCasteSelected(val);
      },
    );
  }

  Widget buildGotraDropdown() {
    return _buildDropdown<CasteGotra>(
      label: 'Gotra',
      value: selectedGotra,
      items: gotras,
      onChanged: (val) {
        if (val != null) onGotraSelected(val);
      },
    );
  }

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<T> items,
    required Function(T?)? onChanged,
    bool enabled = true,
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
          child: IgnorePointer(
            ignoring: !enabled,
            child: Opacity(
              opacity: enabled ? 1.0 : 0.6,
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
                      // Simplified type checking for display text
                      item is String
                          ? item
                          : (item is CasteGotra
                              ? item.name ?? '' // Handles both CasteGotra types
                              : item.toString()), // Fallback
                      style: MyTextStyle.gilroyRegular(color: cDarkText),
                    ),
                  );
                }).toList(),
                onChanged: onChanged,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
      ],
    );
  }
}

extension PersonalInfoTextFields on PersonalInfoController {
  Widget buildTextField({
    required String label,
    required TextEditingController controller,
    String? hintText,
    int maxLines = 1,
    bool isOptional = false, // Not used in implementation, consider removing if truly not needed
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

class HeightConverter {
  /// Converts a string like "5'5" or "5ft 5in" to centimeters (rounded to int)
  static int imperialToCm(String height) {
    final regex = RegExp(r"(\d+)[^\d]+(\d+)");
    final match = regex.firstMatch(height);

    if (match == null) throw FormatException('Invalid height format: $height');

    final feet = int.parse(match.group(1)!);
    final inches = int.parse(match.group(2)!);

    final cm = (feet * 30.48) + (inches * 2.54);
    return cm.round(); // 👈 Return as int
  }

  /// Converts centimeters to a string like "5'5"
  String? cmToImperialString(dynamic cmValue) {
    // Handle cases where the value might be null or not a number
    if (cmValue == null || (cmValue is! int && cmValue is! double)) {
      return null;
    }

    double cm = cmValue.toDouble();
    double totalInches = cm / 2.54;
    int feet = (totalInches / 12).floor();
    int inches = (totalInches % 12).round();

    // Ensure inches don't roll over to feet (e.g., 12 inches becomes 0 feet 1 inch)
    if (inches == 12) {
      feet += 1;
      inches = 0;
    }

    return "$feet'$inches\"";
  }
}
