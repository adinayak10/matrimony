import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/screens/personal_info_controller.dart';

import '../common/api_service/saved_search_service.dart';
import '../common/api_service/user_service.dart';
import '../common/extensions/font_extension.dart';
import '../models/ModelCommonEducationQualificationListResponse.dart';
import '../models/model_cast_gotra_list.dart';
import '../models/registration.dart';
import '../models/saved_search_model.dart';
import '../utilities/const.dart';

class SearchUserController extends GetxController {
  /// Opened from "Saved searches → Edit": the screen starts with its filters
  /// and the save sheet offers to update it.
  SearchUserController({this.editingSavedSearch});

  SavedSearch? editingSavedSearch;

  /// Saved-search filter keys this screen has no control for (incomeRange,
  /// isVerify, recentlyActive); kept so editing a saved search does not drop them.
  Map<String, dynamic> _carriedSavedFilters = {};

  // ---------------- Filters ----------------
  double minAgeIndex = 18;
  double maxAgeIndex = 30;

  final List<String> heightOptions =
      List.generate(37, (i) => "${(4 + (i ~/ 12))}'${(i % 12)}\""); // Generates from 4'0" to 7'0"

  // Default height filter is the whole range (it was 4'0"-4'10", which hid almost everyone).
  double minHeightIndex = 0;
  late double maxHeightIndex = (heightOptions.length - 1).toDouble();

  final income = TextEditingController();
  String selectedMaritalStatus = '';
  final maritalStatusOptions = ['Single', 'Divorced', 'Widowed'];

  List<CasteGotra> allGotras = [], filteredGotras = [];
  List<CasteGotra> selectedGotras = [];

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
    fetchGotras();
    fetchEducation("");
    fetchProfession("");
    final saved = editingSavedSearch;
    if (saved != null) applySavedFilters(saved.filters);
  }

  // ---------------- Filters Data Fetch ----------------
  void fetchGotras() {
    UserService.shared.fetchGotraList(
        page: 1,
        completion: (list) {
          allGotras = list;
          filteredGotras = List.from(list);
          _resolveSavedSelections();
          update();
        });
  }

  void filterGotra(String query) {
    filteredGotras = allGotras.where((g) => g.name?.toLowerCase().contains(query.toLowerCase()) ?? false).toList();
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
          _resolveSavedSelections();
          update();
        });
  }

  void fetchProfession(String query) {
    UserService.shared.fetchProfessionList(
        search: query,
        completion: (res) {
          professionSuggestions = res;
          _resolveSavedSelections();
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
      "gotra": selectedGotras.map((e) => e.sId).toList(),
      "qualification": selectedQualification.map((e) => e.sId).toList(),
      "profession": selectedProfession.map((e) => e.sId).toList(),
    };
  }

  // ---------------- Saved searches ----------------

  /// The current selections in the saved-search contract shape
  /// `{age_range:{min,max}, height_range:{min,max} (cm), marital_status[],
  /// gotra[], qualification[], profession[], incomeRange?, isVerify?,
  /// recentlyActive?}`, derived from [buildFilterPayload] so a saved search
  /// returns what "Find Matches" returns.
  Map<String, dynamic> buildSavedSearchFilters() {
    final payload = buildFilterPayload();
    final out = <String, dynamic>{};

    final age = payload['age_range'];
    if (age is Map) {
      final min = int.tryParse('${age['min']}');
      final max = int.tryParse('${age['max']}');
      if (min != null || max != null) out['age_range'] = {'min': min, 'max': max};
    }
    final height = payload['height_range'];
    if (height is Map) {
      final min = height['min'] is num ? (height['min'] as num).round() : null;
      final max = height['max'] is num ? (height['max'] as num).round() : null;
      if (min != null || max != null) out['height_range'] = {'min': min, 'max': max};
    }
    final marital = '${payload['marital_status'] ?? ''}'.trim();
    if (marital.isNotEmpty) out['marital_status'] = [marital];
    for (final key in const ['gotra', 'qualification', 'profession']) {
      final list = payload[key];
      if (list is List) {
        final ids = list.whereType<String>().where((e) => e.isNotEmpty).toSet().toList();
        if (ids.isNotEmpty) out[key] = ids;
      }
    }
    for (final entry in _carriedSavedFilters.entries) {
      out.putIfAbsent(entry.key, () => entry.value);
    }
    return out;
  }

  /// Loads a saved search's filters into the selections (see [buildSavedSearchFilters]).
  /// Ids not yet in the loaded gotra/education/profession lists are kept
  /// selected and get their names once the lists arrive.
  void applySavedFilters(Map<String, dynamic> filters) {
    final age = filters['age_range'];
    if (age is Map) {
      double minAge = (_asInt(age['min']) ?? minAgeIndex.round()).toDouble().clamp(18, 60).toDouble();
      double maxAge = (_asInt(age['max']) ?? maxAgeIndex.round()).toDouble().clamp(18, 60).toDouble();
      if (minAge > maxAge) {
        final t = minAge;
        minAge = maxAge;
        maxAge = t;
      }
      minAgeIndex = minAge;
      maxAgeIndex = maxAge;
    }
    final height = filters['height_range'];
    if (height is Map) {
      final minCm = _asInt(height['min']);
      final maxCm = _asInt(height['max']);
      double minH = minCm != null ? _heightIndexForCm(minCm).toDouble() : minHeightIndex;
      double maxH = maxCm != null ? _heightIndexForCm(maxCm).toDouble() : maxHeightIndex;
      if (minH > maxH) {
        final t = minH;
        minH = maxH;
        maxH = t;
      }
      minHeightIndex = minH;
      maxHeightIndex = maxH;
    }
    final marital = filters['marital_status'];
    final maritalList = marital is List ? marital.map((e) => '$e').toList() : (marital is String ? [marital] : <String>[]);
    selectedMaritalStatus = maritalList.isNotEmpty ? maritalList.first : '';

    selectedGotras = _idsOf(filters['gotra']).map((id) => CasteGotra(sId: id)).toList();
    selectedQualification = _idsOf(filters['qualification']).map((id) => CommonItem(sId: id)).toList();
    selectedProfession = _idsOf(filters['profession']).map((id) => CommonItem(sId: id)).toList();

    _carriedSavedFilters = {
      for (final key in const ['incomeRange', 'isVerify', 'recentlyActive'])
        if (filters[key] != null) key: filters[key],
    };
    _resolveSavedSelections();
    update();
  }

  /// Creates a saved search from the current selections, or updates
  /// [editingSavedSearch] when [asNew] is false. 409 LIMIT_REACHED and
  /// validation messages arrive in [onError].
  void saveCurrentSearch({
    required String name,
    required bool alertEnabled,
    bool asNew = true,
    required Function(SavedSearch search, bool created) completion,
    required Function(String message) onError,
  }) {
    final filters = buildSavedSearchFilters();
    final editing = editingSavedSearch;
    if (!asNew && editing != null && editing.id != null) {
      SavedSearchService.shared.update(
        id: editing.id!,
        name: name,
        filters: filters,
        alertEnabled: alertEnabled,
        completion: (search) {
          editingSavedSearch = search;
          update();
          completion(search, false);
        },
        onError: onError,
      );
      return;
    }
    SavedSearchService.shared.create(
      name: name,
      filters: filters,
      alertEnabled: alertEnabled,
      completion: (search) {
        editingSavedSearch = search;
        update();
        completion(search, true);
      },
      onError: onError,
    );
  }

  int _heightIndexForCm(int cm) {
    var best = 0;
    var bestDiff = 1 << 30;
    for (var i = 0; i < heightOptions.length; i++) {
      final diff = (HeightConverter.imperialToCm(heightOptions[i]) - cm).abs();
      if (diff < bestDiff) {
        best = i;
        bestDiff = diff;
      }
    }
    return best;
  }

  void _resolveSavedSelections() {
    CasteGotra resolveCg(CasteGotra item, List<CasteGotra> all) =>
        item.name != null ? item : (all.firstWhereOrNull((e) => e.sId == item.sId) ?? item);
    CommonItem resolveCi(CommonItem item, List<CommonItem> all) =>
        item.name != null ? item : (all.firstWhereOrNull((e) => e.sId == item.sId) ?? item);
    selectedGotras = selectedGotras.map((e) => resolveCg(e, allGotras)).toList();
    selectedQualification = selectedQualification.map((e) => resolveCi(e, educationSuggestions)).toList();
    selectedProfession = selectedProfession.map((e) => resolveCi(e, professionSuggestions)).toList();
  }

  static int? _asInt(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.round();
    if (v is String) return num.tryParse(v)?.round();
    return null;
  }

  static List<String> _idsOf(dynamic v) {
    final list = v is List ? v : (v == null ? const [] : [v]);
    return list.map((e) => '$e').where((e) => e.isNotEmpty).toSet().toList();
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
