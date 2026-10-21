// import 'package:flutter/material.dart';
// import 'package:get/get.dart';
// import 'package:banjaramatch/models/model_cast_gotra_list.dart';
// import 'package:banjaramatch/screens/extra_views/top_bar.dart';
// import 'package:banjaramatch/screens/rooms_you_own/create_room_screen/create_room_screen.dart';
// import 'package:banjaramatch/screens/search_profile_controller.dart';
// import 'package:banjaramatch/screens/user_list_screen_search_result.dart';
// import 'package:banjaramatch/screens/users_list_controller.dart';
//
// import '../../../common/extensions/font_extension.dart';
// import '../models/ModelCommonEducationQualificationListResponse.dart';
// import '../utilities/const.dart';
// import 'extra_views/buttons.dart';
//
// class SearchUserScreen extends StatelessWidget {
//   const SearchUserScreen({super.key});
//
//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       body: GetBuilder<SearchUserController>(
//         init: SearchUserController(),
//         builder: (controller) {
//           return Column(
//             children: [
//               TopBarForInView(
//                 title: "Search Profiles",
//               ),
//               Expanded(
//                 child: SingleChildScrollView(
//                   padding: const EdgeInsets.all(16),
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       _filterSection(
//                         title: 'Basic Details',
//                         children: [
//                           const SizedBox(height: 12),
//                           Column(
//                             crossAxisAlignment: CrossAxisAlignment.start,
//                             children: [
//                               Text('Age Range', style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 14)),
//                               const SizedBox(height: 6),
//                               GetBuilder<SearchUserController>(
//                                 builder: (controller) {
//                                   return Column(
//                                     crossAxisAlignment: CrossAxisAlignment.start,
//                                     children: [
//                                       RangeSlider(
//                                         values: RangeValues(controller.minAgeIndex, controller.maxAgeIndex),
//                                         min: 18,
//                                         max: 60,
//                                         divisions: 42,
//                                         labels: RangeLabels(
//                                           '${controller.minAgeIndex.round()}',
//                                           '${controller.maxAgeIndex.round()}',
//                                         ),
//                                         onChanged: (values) {
//                                           controller.minAgeIndex = values.start;
//                                           controller.maxAgeIndex = values.end;
//                                           controller.update();
//                                         },
//                                         activeColor: cPrimary,
//                                         inactiveColor: Colors.grey[300],
//                                       ),
//                                       Text(
//                                         'Selected: ${controller.minAgeIndex.round()} - ${controller.maxAgeIndex.round()} years',
//                                         style: MyTextStyle.gilroyRegular(color: cDarkText, size: 13),
//                                       ),
//                                       const SizedBox(height: 16),
//                                     ],
//                                   );
//                                 },
//                               ),
//                             ],
//                           ),
//                           Column(
//                             crossAxisAlignment: CrossAxisAlignment.start,
//                             children: [
//                               Text('Height Range', style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 14)),
//                               const SizedBox(height: 6),
//                               GetBuilder<SearchUserController>(
//                                 builder: (controller) {
//                                   return Column(
//                                     crossAxisAlignment: CrossAxisAlignment.start,
//                                     children: [
//                                       RangeSlider(
//                                         values: RangeValues(controller.minHeightIndex, controller.maxHeightIndex),
//                                         min: 0,
//                                         max: (controller.heightOptions.length - 1).toDouble(),
//                                         divisions: controller.heightOptions.length - 1,
//                                         labels: RangeLabels(
//                                           controller.heightOptions[controller.minHeightIndex.round()],
//                                           controller.heightOptions[controller.maxHeightIndex.round()],
//                                         ),
//                                         onChanged: (values) {
//                                           controller.minHeightIndex = values.start;
//                                           controller.maxHeightIndex = values.end;
//                                           controller.update();
//                                         },
//                                         activeColor: cPrimary,
//                                         inactiveColor: Colors.grey[300],
//                                       ),
//                                       Text(
//                                         'Selected: ${controller.heightOptions[controller.minHeightIndex.round()]} - ${controller.heightOptions[controller.maxHeightIndex.round()]}',
//                                         style: MyTextStyle.gilroyRegular(color: cDarkText, size: 13),
//                                       ),
//                                       const SizedBox(height: 14),
//                                     ],
//                                   );
//                                 },
//                               ),
//                             ],
//                           ),
//                         ],
//                       ),
//                       _filterSection(
//                         title: 'Caste & Gotra',
//                         children: [
//                           multiSelectChooserFieldCasteGotra(
//                             context: context,
//                             controller: controller,
//                             title: 'Caste',
//                             getItems: () => controller.allCastes,
//                             selectedItems: controller.selectedCastes,
//                             fetch: controller.filterCaste,
//                             onSelectionChanged: (selected) {
//                               controller.selectedCastes = selected;
//                             },
//                           ),
//                           const SizedBox(height: 12),
//                           multiSelectChooserFieldCasteGotra(
//                             context: context,
//                             controller: controller,
//                             title: 'Gotra',
//                             getItems: () => controller.allGotras,
//                             selectedItems: controller.selectedGotras,
//                             fetch: controller.filterGotra,
//                             onSelectionChanged: (selected) {
//                               controller.selectedGotras = selected;
//                             },
//                           ),
//                         ],
//                       ),
//                       _filterSection(
//                         title: 'Education & Profession',
//                         children: [
//                           multiSelectChooserField(
//                             context: context,
//                             controller: controller,
//                             title: "Education",
//                             getItems: () => controller.educationSuggestions,
//                             selectedItems: controller.selectedQualification,
//                             fetch: controller.fetchEducation,
//                             onSelectionChanged: (selected) {
//                               controller.selectedQualification = selected;
//                             },
//                           ),
//                           const SizedBox(height: 12),
//                           multiSelectChooserField(
//                             context: context,
//                             controller: controller,
//                             title: "Profession",
//                             getItems: () => controller.professionSuggestions,
//                             selectedItems: controller.selectedProfession,
//                             fetch: controller.fetchProfession,
//                             onSelectionChanged: (selected) {
//                               controller.selectedProfession = selected;
//                             },
//                           ),
//                         ],
//                       ),
//                       const SizedBox(height: 24),
//                       CommonButton(
//                         text: 'Search',
//                         onTap: () {
//                           // Create a unique tag so every search screen has a fresh controller
//                           final tag = UniqueKey().toString();
//
//                           Get.to(
//                             () => UsersListSearchResult(tag: tag),
//                             arguments: {
//                               'filters': controller.buildFilterPayload(), // 👈 pass filters cleanly
//                             },
//                             binding: BindingsBuilder(() {
//                               // register controller fresh with tag
//                               Get.put(UsersListController(), tag: tag);
//                             }),
//                           );
//                         },
//                       ),
//                     ],
//                   ),
//                 ),
//               )
//             ],
//           );
//         },
//       ),
//     );
//   }
//
//   Widget _filterSection({required String title, required List<Widget> children}) {
//     return Padding(
//       padding: const EdgeInsets.all(0),
//       child: Column(
//         crossAxisAlignment: CrossAxisAlignment.start,
//         children: [
//           const SizedBox(
//             height: 10,
//           ),
//           Text(title, style: MyTextStyle.gilroyBold(size: 16)),
//           const SizedBox(
//             height: 10,
//           ),
//           ...children
//         ],
//       ),
//     );
//   }
//
//   static Widget multiSelectChooserField({
//     required BuildContext context,
//     required SearchUserController controller,
//     required String title,
//     required List<CommonItem> Function() getItems,
//     required List<CommonItem> selectedItems,
//     required void Function(List<CommonItem>) onSelectionChanged,
//     required Function(String) fetch,
//   }) {
//     final displayController = TextEditingController(
//       text: selectedItems.map((e) => e.name).join(', '),
//     );
//
//     final searchController = TextEditingController();
//
//     return GestureDetector(
//       onTap: () {
//         List<CommonItem> tempSelected = List.from(selectedItems);
//
//         Get.bottomSheet(
//           StatefulBuilder(
//             builder: (context, setState) {
//               return DraggableScrollableSheet(
//                 expand: false,
//                 initialChildSize: 0.9,
//                 maxChildSize: 0.95,
//                 minChildSize: 0.5,
//                 builder: (_, scrollController) => Container(
//                   padding: const EdgeInsets.all(16),
//                   decoration: const BoxDecoration(
//                     color: Colors.white,
//                     borderRadius: BorderRadius.only(
//                       topLeft: Radius.circular(16),
//                       topRight: Radius.circular(16),
//                     ),
//                   ),
//                   child: GetBuilder<SearchUserController>(
//                     builder: (ctrl) {
//                       final items = getItems();
//
//                       bool isSelected(CommonItem item) => tempSelected.any((e) => e.sId == item.sId);
//
//                       void toggle(CommonItem item, bool selected) {
//                         setState(() {
//                           if (selected) {
//                             if (!isSelected(item)) tempSelected.add(item);
//                           } else {
//                             tempSelected.removeWhere((e) => e.sId == item.sId);
//                           }
//                         });
//                       }
//
//                       return Column(
//                         crossAxisAlignment: CrossAxisAlignment.start,
//                         children: [
//                           Text("Select $title", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
//                           const SizedBox(height: 12),
//                           TextField(
//                             controller: searchController,
//                             decoration: InputDecoration(
//                               hintText: "Search $title...",
//                               prefixIcon: const Icon(Icons.search),
//                               border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
//                             ),
//                             onChanged: fetch,
//                           ),
//                           const SizedBox(height: 12),
//                           if (tempSelected.isNotEmpty)
//                             Wrap(
//                               spacing: 8,
//                               runSpacing: 8,
//                               children: tempSelected.map((item) {
//                                 return Chip(
//                                   label: Text(item.name ?? ''),
//                                   onDeleted: () {
//                                     setState(() {
//                                       tempSelected.removeWhere((e) => e.sId == item.sId);
//                                     });
//                                   },
//                                 );
//                               }).toList(),
//                             ),
//                           const SizedBox(height: 12),
//                           Expanded(
//                             child: items.isEmpty
//                                 ? Center(child: Text("No $title found"))
//                                 : ListView.builder(
//                                     controller: scrollController,
//                                     itemCount: items.length,
//                                     itemBuilder: (_, index) {
//                                       final item = items[index];
//                                       return CheckboxListTile(
//                                         value: isSelected(item),
//                                         title: Text(item.name ?? ''),
//                                         onChanged: (selected) {
//                                           toggle(item, selected ?? false);
//                                         },
//                                       );
//                                     },
//                                   ),
//                           ),
//                           const SizedBox(height: 16),
//                           CommonButton(
//                             text: "Done",
//                             onTap: () {
//                               onSelectionChanged(tempSelected);
//                               controller.update();
//                               Get.back();
//                             },
//                           )
//                         ],
//                       );
//                     },
//                   ),
//                 ),
//               );
//             },
//           ),
//           isScrollControlled: true,
//         );
//       },
//       child: AbsorbPointer(
//         child: MyTextField(
//           placeHolder: title,
//           controller: displayController,
//         ),
//       ),
//     );
//   }
//
//   static Widget multiSelectChooserFieldCasteGotra({
//     required BuildContext context,
//     required SearchUserController controller,
//     required String title,
//     required List<CasteGotra> Function() getItems,
//     required List<CasteGotra> selectedItems,
//     required void Function(List<CasteGotra>) onSelectionChanged,
//     required Function(String) fetch,
//   }) {
//     final displayController = TextEditingController(
//       text: selectedItems.map((e) => e.name).join(', '),
//     );
//
//     final searchController = TextEditingController();
//
//     return GestureDetector(
//       onTap: () {
//         List<CasteGotra> tempSelected = List.from(selectedItems);
//
//         Get.bottomSheet(
//           StatefulBuilder(
//             builder: (context, setState) {
//               return DraggableScrollableSheet(
//                 expand: false,
//                 initialChildSize: 0.9,
//                 maxChildSize: 0.95,
//                 minChildSize: 0.5,
//                 builder: (_, scrollController) => Container(
//                   padding: const EdgeInsets.all(16),
//                   decoration: const BoxDecoration(
//                     color: Colors.white,
//                     borderRadius: BorderRadius.only(
//                       topLeft: Radius.circular(16),
//                       topRight: Radius.circular(16),
//                     ),
//                   ),
//                   child: GetBuilder<SearchUserController>(
//                     builder: (ctrl) {
//                       final items = getItems();
//
//                       bool isSelected(CasteGotra item) => tempSelected.any((e) => e.sId == item.sId);
//
//                       void toggle(CasteGotra item, bool selected) {
//                         setState(() {
//                           if (selected) {
//                             if (!isSelected(item)) tempSelected.add(item);
//                           } else {
//                             tempSelected.removeWhere((e) => e.sId == item.sId);
//                           }
//                         });
//                       }
//
//                       return Column(
//                         crossAxisAlignment: CrossAxisAlignment.start,
//                         children: [
//                           Text("Select $title", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
//                           const SizedBox(height: 12),
//                           TextField(
//                             controller: searchController,
//                             decoration: InputDecoration(
//                               hintText: "Search $title...",
//                               prefixIcon: const Icon(Icons.search),
//                               border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
//                             ),
//                             onChanged: fetch,
//                           ),
//                           const SizedBox(height: 12),
//                           if (tempSelected.isNotEmpty)
//                             Wrap(
//                               spacing: 8,
//                               runSpacing: 8,
//                               children: tempSelected.map((item) {
//                                 return Chip(
//                                   label: Text(item.name ?? ''),
//                                   onDeleted: () {
//                                     setState(() {
//                                       tempSelected.removeWhere((e) => e.sId == item.sId);
//                                     });
//                                   },
//                                 );
//                               }).toList(),
//                             ),
//                           const SizedBox(height: 12),
//                           Expanded(
//                             child: items.isEmpty
//                                 ? Center(child: Text("No $title found"))
//                                 : ListView.builder(
//                                     controller: scrollController,
//                                     itemCount: items.length,
//                                     itemBuilder: (_, index) {
//                                       final item = items[index];
//                                       return CheckboxListTile(
//                                         value: isSelected(item),
//                                         title: Text(item.name ?? ''),
//                                         onChanged: (selected) {
//                                           toggle(item, selected ?? false);
//                                         },
//                                       );
//                                     },
//                                   ),
//                           ),
//                           const SizedBox(height: 16),
//                           CommonButton(
//                             text: "Done",
//                             onTap: () {
//                               onSelectionChanged(tempSelected);
//                               controller.update();
//                               Get.back();
//                             },
//                           )
//                         ],
//                       );
//                     },
//                   ),
//                 ),
//               );
//             },
//           ),
//           isScrollControlled: true,
//         );
//       },
//       child: AbsorbPointer(
//         child: MyTextField(
//           placeHolder: title,
//           controller: displayController,
//         ),
//       ),
//     );
//   }
// }

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/localization/features/match_strings.dart';
import 'package:banjaramatch/models/saved_search_model.dart';
import 'package:banjaramatch/screens/saved_searches_screen/saved_searches_screen.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/search_profile_controller.dart';
import 'package:banjaramatch/screens/user_list_screen_search_result.dart';
import 'package:banjaramatch/screens/users_list_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

import 'package:banjaramatch/common/extensions/font_extension.dart';
import '../models/ModelCommonEducationQualificationListResponse.dart';
import '../models/model_cast_gotra_list.dart';

class SearchUserScreen extends StatelessWidget {
  const SearchUserScreen({super.key, this.savedSearch});

  /// Opened from Saved searches → Edit: starts with these filters and the
  /// save sheet can update this saved search.
  final SavedSearch? savedSearch;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      body: GetBuilder<SearchUserController>(
        init: SearchUserController(editingSavedSearch: savedSearch),
        builder: (controller) {
          return Column(
            children: [
              TopBarForInView(
                title: "Search your match",
                child: IconButton(
                  tooltip: MatchKeys.savedSearches.tr,
                  onPressed: () => Navigate.to(const SavedSearchesScreen()),
                  icon: const Icon(Icons.bookmarks_outlined, color: Colors.white),
                ),
              ),
              // _buildEnhancedHeader(),

              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        height: 0,
                      ),
                      _buildWelcomeCard(),
                      const SizedBox(height: 24),

                      // Basic Preferences Card
                      _buildFilterCard(
                        title: 'Basic Preferences',
                        icon: Icons.person_outline,
                        iconColor: Colors.pink.shade400,
                        children: [
                          _buildAgeRangeSelector(controller),
                          const SizedBox(height: 20),
                          _buildHeightRangeSelector(controller),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // Cultural Background Card
                      _buildFilterCard(
                        title: 'Cultural Background',
                        icon: Icons.public,
                        iconColor: Colors.purple.shade400,
                        children: [
                          _buildEnhancedMultiSelect(
                            context: context,
                            controller: controller,
                            title: 'Caste',
                            icon: Icons.groups_outlined,
                            selectedCount: controller.selectedCastes.length,
                            onTap: () => _showCasteGotraBottomSheet(
                              context: context,
                              controller: controller,
                              title: 'Caste',
                              getItems: () => controller.allCastes,
                              selectedItems: controller.selectedCastes,
                              fetch: controller.filterCaste,
                              onSelectionChanged: (selected) {
                                controller.selectedCastes = selected;
                              },
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildEnhancedMultiSelect(
                            context: context,
                            controller: controller,
                            title: 'Gotra',
                            icon: Icons.family_restroom,
                            selectedCount: controller.selectedGotras.length,
                            onTap: () => _showCasteGotraBottomSheet(
                              context: context,
                              controller: controller,
                              title: 'Gotra',
                              getItems: () => controller.allGotras,
                              selectedItems: controller.selectedGotras,
                              fetch: controller.filterGotra,
                              onSelectionChanged: (selected) {
                                controller.selectedGotras = selected;
                              },
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // Professional Background Card
                      _buildFilterCard(
                        title: 'Professional Background',
                        icon: Icons.work_outline,
                        iconColor: Colors.blue.shade400,
                        children: [
                          _buildEnhancedMultiSelect(
                            context: context,
                            controller: controller,
                            title: 'Education',
                            icon: Icons.school_outlined,
                            selectedCount: controller.selectedQualification.length,
                            onTap: () => _showCommonItemBottomSheet(
                              context: context,
                              controller: controller,
                              title: 'Education',
                              getItems: () => controller.educationSuggestions,
                              selectedItems: controller.selectedQualification,
                              fetch: controller.fetchEducation,
                              onSelectionChanged: (selected) {
                                controller.selectedQualification = selected;
                              },
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildEnhancedMultiSelect(
                            context: context,
                            controller: controller,
                            title: 'Profession',
                            icon: Icons.business_center_outlined,
                            selectedCount: controller.selectedProfession.length,
                            onTap: () => _showCommonItemBottomSheet(
                              context: context,
                              controller: controller,
                              title: 'Profession',
                              getItems: () => controller.professionSuggestions,
                              selectedItems: controller.selectedProfession,
                              fetch: controller.fetchProfession,
                              onSelectionChanged: (selected) {
                                controller.selectedProfession = selected;
                              },
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 32),
                      _buildSearchButton(controller),
                      const SizedBox(height: 12),
                      _buildSaveSearchButton(context, controller),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              )
            ],
          );
        },
      ),
    );
  }

  Widget _buildEnhancedHeader() {
    return Container(
      padding: const EdgeInsets.only(top: 50, left: 20, right: 20, bottom: 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.pink.shade400,
            Colors.purple.shade400,
          ],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(30),
          bottomRight: Radius.circular(30),
        ),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Get.back(),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.arrow_back_ios_new,
                color: Colors.white,
                size: 20,
              ),
            ),
          ),
          const Spacer(),
          Column(
            children: [
              const Text(
                "Find Your Match",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                "Set your preferences",
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.tune,
              color: Colors.white,
              size: 20,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.pink.shade50,
            Colors.purple.shade50,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.pink.shade100),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.pink.shade400,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.search,
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Discover Your Perfect Match",
                  style: MyTextStyle.gilroyBold(color: Colors.grey.shade800, size: 16),
                ),
                const SizedBox(height: 4),
                Text(
                  "Use filters to find profiles that align with your preferences and values.",
                  style: MyTextStyle.gilroyRegular(color: Colors.grey.shade600, size: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterCard({
    required String title,
    required IconData icon,
    required Color iconColor,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            spreadRadius: 0,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: iconColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: MyTextStyle.gilroyBold(color: Colors.grey.shade800, size: 16),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildAgeRangeSelector(SearchUserController controller) {
    return GetBuilder<SearchUserController>(
      builder: (controller) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Age Range',
                  style: MyTextStyle.gilroySemiBold(color: Colors.grey.shade700, size: 14),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.pink.shade50,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${controller.minAgeIndex.round()} - ${controller.maxAgeIndex.round()} years',
                    style: MyTextStyle.gilroySemiBold(color: Colors.pink.shade600, size: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SliderTheme(
              data: SliderTheme.of(Get.context!).copyWith(
                trackHeight: 6,
                rangeThumbShape: const RoundRangeSliderThumbShape(
                  enabledThumbRadius: 12,
                  elevation: 2,
                ),
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 20),
              ),
              child: RangeSlider(
                values: RangeValues(controller.minAgeIndex, controller.maxAgeIndex),
                min: 18,
                max: 60,
                divisions: 42,
                activeColor: Colors.pink.shade400,
                inactiveColor: Colors.grey.shade200,
                onChanged: (values) {
                  controller.minAgeIndex = values.start;
                  controller.maxAgeIndex = values.end;
                  controller.update();
                },
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHeightRangeSelector(SearchUserController controller) {
    return GetBuilder<SearchUserController>(
      builder: (controller) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Height Range',
                  style: MyTextStyle.gilroySemiBold(color: Colors.grey.shade700, size: 14),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.purple.shade50,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${controller.heightOptions[controller.minHeightIndex.round()]} - ${controller.heightOptions[controller.maxHeightIndex.round()]}',
                    style: MyTextStyle.gilroySemiBold(color: Colors.purple.shade600, size: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SliderTheme(
              data: SliderTheme.of(Get.context!).copyWith(
                trackHeight: 6,
                rangeThumbShape: const RoundRangeSliderThumbShape(
                  enabledThumbRadius: 12,
                  elevation: 2,
                ),
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 20),
              ),
              child: RangeSlider(
                values: RangeValues(controller.minHeightIndex, controller.maxHeightIndex),
                min: 0,
                max: (controller.heightOptions.length - 1).toDouble(),
                divisions: controller.heightOptions.length - 1,
                activeColor: Colors.purple.shade400,
                inactiveColor: Colors.grey.shade200,
                onChanged: (values) {
                  controller.minHeightIndex = values.start;
                  controller.maxHeightIndex = values.end;
                  controller.update();
                },
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildEnhancedMultiSelect({
    required BuildContext context,
    required SearchUserController controller,
    required String title,
    required IconData icon,
    required int selectedCount,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selectedCount > 0 ? Colors.pink.shade300 : Colors.grey.shade200,
            width: selectedCount > 0 ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: selectedCount > 0 ? Colors.pink.shade400 : Colors.grey.shade500,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: MyTextStyle.gilroySemiBold(
                      color: Colors.grey.shade700,
                      size: 14,
                    ),
                  ),
                  if (selectedCount > 0) ...[
                    const SizedBox(height: 2),
                    Text(
                      '$selectedCount selected',
                      style: MyTextStyle.gilroyRegular(
                        color: Colors.pink.shade600,
                        size: 12,
                      ),
                    ),
                  ] else
                    Text(
                      'Tap to select',
                      style: MyTextStyle.gilroyRegular(
                        color: Colors.grey.shade500,
                        size: 12,
                      ),
                    ),
                ],
              ),
            ),
            if (selectedCount > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.pink.shade400,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$selectedCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            const SizedBox(width: 8),
            Icon(
              Icons.keyboard_arrow_right,
              color: Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchButton(SearchUserController controller) {
    return Container(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: () {
          final tag = UniqueKey().toString();
          Get.to(
            () => UsersListSearchResult(tag: tag),
            arguments: {
              'filters': controller.buildFilterPayload(),
            },
            binding: BindingsBuilder(() {
              Get.put(UsersListController(), tag: tag);
            }),
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.pink.shade400,
          foregroundColor: Colors.white,
          elevation: 2,
          shadowColor: Colors.pink.shade400.withOpacity(0.3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.search, size: 20),
            const SizedBox(width: 8),
            const Text(
              'Find Matches',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSaveSearchButton(BuildContext context, SearchUserController controller) {
    final editing = controller.editingSavedSearch;
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: OutlinedButton.icon(
        onPressed: () => _showSaveSearchSheet(context, controller),
        icon: Icon(editing != null ? Icons.bookmark_rounded : Icons.bookmark_add_outlined, size: 20),
        label: Text(
          editing != null
              ? MatchKeys.editingSavedSearch.trParams({'name': editing.name})
              : MatchKeys.saveThisSearch.tr,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: MyTextStyle.gilroySemiBold(size: 15, color: Colors.pink.shade400),
        ),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.pink.shade400,
          side: BorderSide(color: Colors.pink.shade200),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }

  /// "Save this search" sheet: name + alert switch. When editing a saved
  /// search it offers "Update saved search" and "Save as new".
  void _showSaveSearchSheet(BuildContext context, SearchUserController controller) {
    final editing = controller.editingSavedSearch;
    final nameController = TextEditingController(text: editing?.name ?? '');
    bool alertEnabled = editing?.alertEnabled ?? false;
    bool saving = false;
    String? errorText;

    Get.bottomSheet(
      StatefulBuilder(
        builder: (context, setState) {
          void submit({required bool asNew}) {
            final name = nameController.text.trim().replaceAll(RegExp(r'\s+'), ' ');
            if (name.isEmpty || name.length > 60) {
              setState(() => errorText = MatchKeys.searchNameRequired.tr);
              return;
            }
            setState(() {
              saving = true;
              errorText = null;
            });
            controller.saveCurrentSearch(
              name: name,
              alertEnabled: alertEnabled,
              asNew: asNew,
              completion: (search, created) {
                if (Get.isBottomSheetOpen ?? false) Get.back();
                BaseController.share.showSnackBar(
                  created ? MatchKeys.searchSaved.tr : MatchKeys.searchUpdated.tr,
                  type: SnackBarType.success,
                );
              },
              onError: (message) {
                if (!context.mounted) return;
                setState(() {
                  saving = false;
                  errorText = message;
                });
              },
            );
          }

          return Container(
            padding: EdgeInsets.fromLTRB(20, 16, 20, 16 + MediaQuery.of(context).viewInsets.bottom),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    editing != null ? MatchKeys.updateSavedSearch.tr : MatchKeys.saveThisSearch.tr,
                    style: MyTextStyle.gilroyBold(size: 18, color: cDarkText),
                  ),
                  const SizedBox(height: 16),
                  Text(MatchKeys.searchName.tr, style: MyTextStyle.gilroySemiBold(size: 14, color: cDarkText)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(color: cLightBg, borderRadius: BorderRadius.circular(10)),
                    child: TextField(
                      controller: nameController,
                      maxLength: 60,
                      autofocus: editing == null,
                      textCapitalization: TextCapitalization.sentences,
                      style: MyTextStyle.gilroyRegular(color: cDarkText),
                      decoration: InputDecoration(
                        hintText: MatchKeys.searchNameHint.tr,
                        hintStyle: MyTextStyle.gilroyRegular(color: cLightText),
                        border: InputBorder.none,
                        counterText: '',
                      ),
                    ),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    value: alertEnabled,
                    activeColor: Colors.pink.shade400,
                    onChanged: saving ? null : (v) => setState(() => alertEnabled = v),
                    title: Text(MatchKeys.alertMe.tr, style: MyTextStyle.gilroySemiBold(size: 14, color: cDarkText)),
                    subtitle: Text(MatchKeys.alertMeHint.tr,
                        style: MyTextStyle.gilroyRegular(size: 12, color: cLightText)),
                  ),
                  if (errorText != null) ...[
                    Text(errorText!, style: MyTextStyle.gilroyMedium(size: 13, color: cError)),
                    const SizedBox(height: 8),
                  ],
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: saving ? null : () => submit(asNew: editing == null),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.pink.shade400,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: saving
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(
                              editing != null ? MatchKeys.updateSavedSearch.tr : MatchKeys.save.tr,
                              style: MyTextStyle.gilroyBold(size: 15, color: Colors.white),
                            ),
                    ),
                  ),
                  if (editing != null) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: TextButton(
                        onPressed: saving ? null : () => submit(asNew: true),
                        child: Text(MatchKeys.saveAsNew.tr,
                            style: MyTextStyle.gilroySemiBold(size: 14, color: Colors.pink.shade400)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
      isScrollControlled: true,
    );
  }

  void _showCommonItemBottomSheet({
    required BuildContext context,
    required SearchUserController controller,
    required String title,
    required List<CommonItem> Function() getItems,
    required List<CommonItem> selectedItems,
    required void Function(List<CommonItem>) onSelectionChanged,
    required Function(String) fetch,
  }) {
    List<CommonItem> tempSelected = List.from(selectedItems);
    final searchController = TextEditingController();

    Get.bottomSheet(
      StatefulBuilder(
        builder: (context, setState) {
          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.85,
            maxChildSize: 0.95,
            minChildSize: 0.5,
            builder: (_, scrollController) => Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              child: Column(
                children: [
                  // Handle bar
                  Container(
                    margin: const EdgeInsets.only(top: 8, bottom: 16),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),

                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: GetBuilder<SearchUserController>(
                        builder: (ctrl) {
                          final items = getItems();

                          bool isSelected(CommonItem item) => tempSelected.any((e) => e.sId == item.sId);

                          void toggle(CommonItem item, bool selected) {
                            setState(() {
                              if (selected) {
                                if (!isSelected(item)) tempSelected.add(item);
                              } else {
                                tempSelected.removeWhere((e) => e.sId == item.sId);
                              }
                            });
                          }

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Header
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.pink.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(
                                      Icons.tune,
                                      color: Colors.pink.shade400,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    "Select $title",
                                    style: MyTextStyle.gilroyBold(size: 18),
                                  ),
                                  const Spacer(),
                                  if (tempSelected.isNotEmpty)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.pink.shade400,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        '${tempSelected.length}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                ],
                              ),

                              const SizedBox(height: 20),

                              // Search field
                              Container(
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.shade200),
                                ),
                                child: TextField(
                                  controller: searchController,
                                  decoration: InputDecoration(
                                    hintText: "Search $title...",
                                    prefixIcon: Icon(Icons.search, color: Colors.grey.shade500),
                                    border: InputBorder.none,
                                    contentPadding: const EdgeInsets.all(16),
                                  ),
                                  onChanged: fetch,
                                ),
                              ),

                              const SizedBox(height: 16),

                              // Selected items chips
                              if (tempSelected.isNotEmpty) ...[
                                SizedBox(
                                  height: 40,
                                  child: ListView.builder(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: tempSelected.length,
                                    itemBuilder: (_, index) {
                                      final item = tempSelected[index];
                                      return Container(
                                        margin: const EdgeInsets.only(right: 8),
                                        child: Chip(
                                          label: Text(item.name ?? ''),
                                          onDeleted: () {
                                            setState(() {
                                              tempSelected.removeWhere((e) => e.sId == item.sId);
                                            });
                                          },
                                          backgroundColor: Colors.purple.shade50,
                                          deleteIconColor: Colors.purple.shade400,
                                          labelStyle: TextStyle(color: Colors.purple.shade700),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                                const SizedBox(height: 16),
                              ],

                              // Items list
                              Expanded(
                                child: items.isEmpty
                                    ? Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(
                                              Icons.search_off,
                                              size: 48,
                                              color: Colors.grey.shade400,
                                            ),
                                            const SizedBox(height: 16),
                                            Text(
                                              "No $title found",
                                              style: MyTextStyle.gilroyRegular(
                                                color: Colors.grey.shade600,
                                                size: 16,
                                              ),
                                            ),
                                          ],
                                        ),
                                      )
                                    : ListView.builder(
                                        controller: scrollController,
                                        itemCount: items.length,
                                        itemBuilder: (_, index) {
                                          final item = items[index];
                                          final selected = isSelected(item);

                                          return Container(
                                            margin: const EdgeInsets.only(bottom: 8),
                                            decoration: BoxDecoration(
                                              color: selected ? Colors.purple.shade50 : Colors.transparent,
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: CheckboxListTile(
                                              value: selected,
                                              title: Text(
                                                item.name ?? '',
                                                style: MyTextStyle.gilroyMedium(
                                                  color: selected ? Colors.purple.shade700 : Colors.grey.shade800,
                                                  size: 14,
                                                ),
                                              ),
                                              onChanged: (value) {
                                                toggle(item, value ?? false);
                                              },
                                              activeColor: Colors.purple.shade400,
                                              contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                                            ),
                                          );
                                        },
                                      ),
                              ),

                              const SizedBox(height: 16),

                              // Done button
                              SizedBox(
                                width: double.infinity,
                                height: 48,
                                child: ElevatedButton(
                                  onPressed: () {
                                    onSelectionChanged(tempSelected);
                                    controller.update();
                                    Get.back();
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.purple.shade400,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  child: Text(
                                    tempSelected.isEmpty ? "Done" : "Done (${tempSelected.length})",
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),

                              const SizedBox(height: 20),
                            ],
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
    );
  }
}

void _showCasteGotraBottomSheet({
  required BuildContext context,
  required SearchUserController controller,
  required String title,
  required List<CasteGotra> Function() getItems,
  required List<CasteGotra> selectedItems,
  required void Function(List<CasteGotra>) onSelectionChanged,
  required Function(String) fetch,
}) {
  List<CasteGotra> tempSelected = List.from(selectedItems);
  final searchController = TextEditingController();

  Get.bottomSheet(
    StatefulBuilder(
      builder: (context, setState) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.85,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          builder: (_, scrollController) => Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
            ),
            child: Column(
              children: [
                // Handle bar
                Container(
                  margin: const EdgeInsets.only(top: 8, bottom: 16),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: GetBuilder<SearchUserController>(
                      builder: (ctrl) {
                        final items = getItems();

                        bool isSelected(CasteGotra item) => tempSelected.any((e) => e.sId == item.sId);

                        void toggle(CasteGotra item, bool selected) {
                          setState(() {
                            if (selected) {
                              if (!isSelected(item)) tempSelected.add(item);
                            } else {
                              tempSelected.removeWhere((e) => e.sId == item.sId);
                            }
                          });
                        }

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.purple.shade50,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    title == 'Caste' ? Icons.groups_outlined : Icons.family_restroom,
                                    color: Colors.purple.shade400,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  "Select $title",
                                  style: MyTextStyle.gilroyBold(size: 18),
                                ),
                                const Spacer(),
                                if (tempSelected.isNotEmpty)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.purple.shade400,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      '${tempSelected.length}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                              ],
                            ),

                            const SizedBox(height: 20),

                            // Search field
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.grey.shade200),
                              ),
                              child: TextField(
                                controller: searchController,
                                decoration: InputDecoration(
                                  hintText: "Search $title...",
                                  prefixIcon: Icon(Icons.search, color: Colors.grey.shade500),
                                  border: InputBorder.none,
                                  contentPadding: const EdgeInsets.all(16),
                                ),
                                onChanged: fetch,
                              ),
                            ),

                            const SizedBox(height: 16),

                            // Selected items chips
                            if (tempSelected.isNotEmpty) ...[
                              SizedBox(
                                height: 40,
                                child: ListView.builder(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: tempSelected.length,
                                  itemBuilder: (_, index) {
                                    final item = tempSelected[index];
                                    return Container(
                                      margin: const EdgeInsets.only(right: 8),
                                      child: Chip(
                                        label: Text(item.name ?? ''),
                                        onDeleted: () {
                                          setState(() {
                                            tempSelected.removeWhere((e) => e.sId == item.sId);
                                          });
                                        },
                                        backgroundColor: Colors.purple.shade50,
                                        deleteIconColor: Colors.purple.shade400,
                                        labelStyle: TextStyle(color: Colors.purple.shade700),
                                      ),
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            // Items list
                            Expanded(
                              child: items.isEmpty
                                  ? Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            Icons.search_off,
                                            size: 48,
                                            color: Colors.grey.shade400,
                                          ),
                                          const SizedBox(height: 16),
                                          Text(
                                            "No $title found",
                                            style: MyTextStyle.gilroyRegular(
                                              color: Colors.grey.shade600,
                                              size: 16,
                                            ),
                                          ),
                                        ],
                                      ),
                                    )
                                  : ListView.builder(
                                      controller: scrollController,
                                      itemCount: items.length,
                                      itemBuilder: (_, index) {
                                        final item = items[index];
                                        final selected = isSelected(item);

                                        return Container(
                                          margin: const EdgeInsets.only(bottom: 8),
                                          decoration: BoxDecoration(
                                            color: selected ? Colors.purple.shade50 : Colors.transparent,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: CheckboxListTile(
                                            value: selected,
                                            title: Text(
                                              item.name ?? '',
                                              style: MyTextStyle.gilroyMedium(
                                                color: selected ? Colors.purple.shade700 : Colors.grey.shade800,
                                                size: 14,
                                              ),
                                            ),
                                            onChanged: (value) {
                                              toggle(item, value ?? false);
                                            },
                                            activeColor: Colors.purple.shade400,
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                                          ),
                                        );
                                      },
                                    ),
                            ),

                            const SizedBox(height: 16),

                            // Done button
                            SizedBox(
                              width: double.infinity,
                              height: 48,
                              child: ElevatedButton(
                                onPressed: () {
                                  onSelectionChanged(tempSelected);
                                  controller.update();
                                  Get.back();
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.purple.shade400,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: Text(
                                  tempSelected.isEmpty ? "Done" : "Done (${tempSelected.length})",
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),

                            const SizedBox(height: 20),
                          ],
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    ),
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
  );
}
