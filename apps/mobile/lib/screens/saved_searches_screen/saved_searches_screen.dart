import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/saved_search_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/localization/features/match_strings.dart';
import 'package:banjaramatch/models/saved_search_model.dart';
import 'package:banjaramatch/screens/common/empty_state.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/personal_info_controller.dart';
import 'package:banjaramatch/screens/search_profile_controller.dart';
import 'package:banjaramatch/screens/search_profiles_screen.dart';
import 'package:banjaramatch/screens/user_list_screen_search_result.dart';
import 'package:banjaramatch/screens/users_list_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

/// The member's saved searches (max [SavedSearch.maxPerUser]): run, edit,
/// toggle new-match alerts, delete.
class SavedSearchesScreen extends StatelessWidget {
  const SavedSearchesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GetBuilder<SavedSearchesController>(
      init: SavedSearchesController(),
      tag: 'saved_searches',
      builder: (controller) {
        return Scaffold(
          backgroundColor: cBackground,
          body: Column(
            children: [
              TopBarForInView(
                title: MatchKeys.savedSearches,
                verticalChild: controller.searches.isEmpty
                    ? null
                    : Text(
                        MatchKeys.savedCount.trParams({
                          'count': '${controller.searches.length}',
                          'max': '${SavedSearch.maxPerUser}',
                        }),
                        style: MyTextStyle.gilroyRegular(size: 12, color: cWhite.withOpacity(0.7)),
                      ),
                child: IconButton(
                  onPressed: controller.openNewSearch,
                  icon: const Icon(Icons.add_rounded, color: cWhite),
                ),
              ),
              Expanded(child: _body(controller)),
            ],
          ),
        );
      },
    );
  }

  Widget _body(SavedSearchesController controller) {
    if (controller.isFetching && controller.searches.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: cPrimary));
    }
    if (controller.errorMessage != null && controller.searches.isEmpty) {
      return EmptyState(
        icon: Icons.cloud_off_rounded,
        title: AppKeys.somethingWentWrong.tr,
        message: controller.errorMessage!,
        onAction: controller.fetch,
      );
    }
    if (controller.searches.isEmpty) {
      return EmptyState(
        icon: Icons.bookmark_border_rounded,
        title: MatchKeys.noSavedSearches.tr,
        message: MatchKeys.noSavedSearchesMsg.tr,
        actionLabel: MatchKeys.startSearch.tr,
        onAction: controller.openNewSearch,
      );
    }
    return RefreshIndicator(
      color: cPrimary,
      onRefresh: () async => controller.fetch(),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 10),
        itemCount: controller.searches.length,
        itemBuilder: (context, index) => _SavedSearchCard(
          search: controller.searches[index],
          controller: controller,
        ),
      ),
    );
  }
}

class _SavedSearchCard extends StatelessWidget {
  const _SavedSearchCard({required this.search, required this.controller});

  final SavedSearch search;
  final SavedSearchesController controller;

  @override
  Widget build(BuildContext context) {
    final chips = SavedSearchesController.summaryOf(search.filters);
    final busy = controller.busyIds.contains(search.id);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.fromLTRB(16, 14, 8, 8),
      decoration: BoxDecoration(
        color: cCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 3))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: cPrimary.withOpacity(0.1), shape: BoxShape.circle),
                child: const Icon(Icons.manage_search_rounded, color: cPrimary, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  search.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: MyTextStyle.gilroyBold(size: 16, color: cDarkText),
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, color: cLightText),
                onSelected: (value) {
                  if (value == 'edit') controller.editSearch(search);
                  if (value == 'delete') controller.confirmDelete(search);
                },
                itemBuilder: (_) => [
                  PopupMenuItem(value: 'edit', child: Text(MatchKeys.edit.tr)),
                  PopupMenuItem(value: 'delete', child: Text(MatchKeys.delete.tr, style: const TextStyle(color: cError))),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: chips
                .map((text) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: cLightBg, borderRadius: BorderRadius.circular(20)),
                      child: Text(text, style: MyTextStyle.gilroyMedium(size: 12, color: cDarkText)),
                    ))
                .toList(),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(
                search.alertEnabled ? Icons.notifications_active_rounded : Icons.notifications_off_outlined,
                size: 18,
                color: search.alertEnabled ? cPrimary : cLightText,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(MatchKeys.alertMe.tr, style: MyTextStyle.gilroyMedium(size: 13, color: cDarkText)),
              ),
              Switch(
                value: search.alertEnabled,
                activeColor: cPrimary,
                onChanged: busy ? null : (v) => controller.toggleAlert(search, v),
              ),
              const SizedBox(width: 4),
              ElevatedButton.icon(
                onPressed: () => controller.runSearch(search),
                icon: const Icon(Icons.search_rounded, size: 18),
                label: Text(MatchKeys.runSearch.tr, style: MyTextStyle.gilroySemiBold(size: 14, color: cOnPrimary)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: cPrimary,
                  foregroundColor: cOnPrimary,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
              ),
              const SizedBox(width: 8),
            ],
          ),
        ],
      ),
    );
  }
}

class SavedSearchesController extends BaseController {
  List<SavedSearch> searches = [];
  bool isFetching = true;
  String? errorMessage;

  /// Rows with a request in flight (alert toggle / delete).
  final Set<String?> busyIds = {};

  @override
  void onReady() {
    super.onReady();
    fetch();
  }

  void fetch() {
    isFetching = true;
    errorMessage = null;
    update();
    SavedSearchService.shared.list(
      completion: (list) {
        searches = list;
        isFetching = false;
        update();
      },
      onError: (message) {
        errorMessage = message;
        isFetching = false;
        update();
      },
    );
  }

  void toggleAlert(SavedSearch search, bool enabled) {
    final id = search.id;
    if (id == null) return;
    final previous = search.alertEnabled;
    search.alertEnabled = enabled;
    busyIds.add(id);
    update();
    SavedSearchService.shared.update(
      id: id,
      alertEnabled: enabled,
      completion: (saved) {
        busyIds.remove(id);
        _replace(saved);
      },
      onError: (message) {
        busyIds.remove(id);
        search.alertEnabled = previous;
        update();
        showSnackBar(message, type: SnackBarType.error);
      },
    );
  }

  void confirmDelete(SavedSearch search) {
    showConfirmationSheet(
      desc: MatchKeys.deleteSavedSearchConfirm.trParams({'name': search.name}),
      buttonTitle: MatchKeys.delete.tr,
      onTap: () => _delete(search),
    );
  }

  void _delete(SavedSearch search) {
    final id = search.id;
    if (id == null) return;
    busyIds.add(id);
    update();
    SavedSearchService.shared.delete(
      id: id,
      completion: () {
        busyIds.remove(id);
        searches.removeWhere((e) => e.id == id);
        update();
        showSnackBar(MatchKeys.searchDeleted.tr, type: SnackBarType.success);
      },
      onError: (message) {
        busyIds.remove(id);
        update();
        showSnackBar(message, type: SnackBarType.error);
      },
    );
  }

  /// Runs the saved filters through the regular search results screen.
  void runSearch(SavedSearch search) {
    final tag = UniqueKey().toString();
    Get.to(
      () => UsersListSearchResult(tag: tag),
      arguments: {'filters': Map<String, dynamic>.from(search.filters)},
      binding: BindingsBuilder(() {
        Get.put(UsersListController(), tag: tag);
      }),
    );
  }

  /// Opens the search screen pre-filled with [search]; its save sheet can update it.
  Future<void> editSearch(SavedSearch search) async {
    // A search screen already in the stack owns the (untagged) controller: load the filters into it.
    if (Get.isRegistered<SearchUserController>()) {
      final existing = Get.find<SearchUserController>();
      existing.editingSavedSearch = search;
      existing.applySavedFilters(search.filters);
    }
    await Navigate.to(SearchUserScreen(savedSearch: search));
    fetch();
  }

  Future<void> openNewSearch() async {
    if (searches.length >= SavedSearch.maxPerUser) {
      showSnackBar(MatchKeys.savedLimit.trParams({'max': '${SavedSearch.maxPerUser}'}), type: SnackBarType.error);
    }
    await Navigate.to(const SearchUserScreen());
    fetch();
  }

  void _replace(SavedSearch saved) {
    final index = searches.indexWhere((e) => e.id == saved.id);
    if (index >= 0) searches[index] = saved;
    update();
  }

  /// Short, translated chips describing a filters map (contract keys).
  static List<String> summaryOf(Map<String, dynamic> f) {
    final out = <String>[];
    final age = f['age_range'];
    if (age is Map && (age['min'] != null || age['max'] != null)) {
      out.add(MatchKeys.filterAge.trParams({'min': '${age['min'] ?? 18}', 'max': '${age['max'] ?? '-'}'}));
    }
    final height = f['height_range'];
    if (height is Map && (height['min'] != null || height['max'] != null)) {
      String fmt(dynamic cm) => cm is num ? (HeightConverter().cmToImperialString(cm) ?? '-') : '-';
      out.add(MatchKeys.filterHeight.trParams({'min': fmt(height['min']), 'max': fmt(height['max'])}));
    }
    final marital = f['marital_status'];
    if (marital is List && marital.isNotEmpty) out.add(marital.join(', '));
    void count(String key, String labelKey) {
      final v = f[key];
      if (v is List && v.isNotEmpty) out.add(labelKey.trParams({'count': '${v.length}'}));
    }

    count('caste', MatchKeys.filterCaste);
    count('gotra', MatchKeys.filterGotra);
    count('qualification', MatchKeys.filterEducation);
    count('profession', MatchKeys.filterProfession);
    final income = f['incomeRange'];
    if (income != null && !(income is List && income.isEmpty) && '$income'.isNotEmpty) {
      out.add(MatchKeys.filterIncome.tr);
    }
    if (f['isVerify'] == true) out.add(MatchKeys.filterVerified.tr);
    if (f['recentlyActive'] == true) out.add(MatchKeys.filterRecent.tr);
    if (out.isEmpty) out.add(MatchKeys.filterAny.tr);
    return out;
  }
}
