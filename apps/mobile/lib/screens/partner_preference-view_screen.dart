// // 📱 UI: partner_preference_view_screen.dart
//
// import 'package:flutter/material.dart';
// import 'package:get/get.dart';
// import 'package:banjaramatch/common/managers/session_manager.dart';
// import 'package:banjaramatch/models/ModelCommonEducationQualificationListResponse.dart';
// import 'package:banjaramatch/screens/extra_views/top_bar.dart';
//
// import '../../common/extensions/font_extension.dart';
// import '../../utilities/const.dart';
// import 'edit_preference_controller.dart';
// import 'extra_views/buttons.dart';
// import 'rooms_you_own/create_room_screen/create_room_screen.dart';
//
// class PartnerPreferenceViewScreen extends StatelessWidget {
//   const PartnerPreferenceViewScreen({super.key});
//
//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       body: GetBuilder<EditPreferenceController>(
//         init: EditPreferenceController(SessionManager.shared.getUserID()),
//         builder: (controller) {
//           final p = controller.user?.preferences;
//           return p == null
//               ? const Center(child: Text('No preference data'))
//               : Column(
//                   children: [
//                     TopBarForInView(title: "Partner Preference"),
//                     Expanded(
//                       child: SingleChildScrollView(
//                         padding: const EdgeInsets.all(16),
//                         child: Column(
//                           crossAxisAlignment: CrossAxisAlignment.start,
//                           children: [
//                             _sectionCard(
//                               title: 'Basic Details',
//                               onEdit: () => _showBasicEditSheet(context, controller),
//                               children: [
//                                 _rowItem('Age Range', '${p.ageRange?.min ?? '-'} - ${p.ageRange?.max ?? '-'}'),
//                                 _rowItem('Height Range', '${p.heightRange?.min ?? '-'} - ${p.heightRange?.max ?? '-'}'),
//                                 _rowItem(
//                                   'Preferred Marital Status',
//                                   // Check if the preferences list is not null and not empty.
//                                   p.maritalStatus != null && p.maritalStatus!.isNotEmpty
//                                       ? p.maritalStatus!.join(', ') // Correctly joins the list elements into a string.
//                                       : 'Any', // Default to 'Any' if the list is empty or null.
//                                 )
//                               ],
//                             ),
//                             _sectionCard(
//                               title: 'Education & Occupation',
//                               onEdit: () => _showEducationEditSheet(context, controller),
//                               children: [
//                                 _rowItem(
//                                   'Highest Education',
//                                   (p.qualification?.isNotEmpty ?? false)
//                                       ? p.qualification!.map((e) => e.name ?? '').join(', ')
//                                       : '-',
//                                 ),
//                                 _rowItem(
//                                   'Occupation',
//                                   (p.profession?.isNotEmpty ?? false)
//                                       ? p.profession!.map((e) => e.name ?? '').join(', ')
//                                       : '-',
//                                 ),
//                               ],
//                             ),
//                             _sectionCard(
//                               title: 'Caste & Language',
//                               onEdit: () => _showCasteEditSheet(context, controller),
//                               children: [
//                                 _rowItem(
//                                   'Caste Preference',
//                                   (p.caste?.isNotEmpty ?? false) ? p.caste!.map((e) => e.name ?? '').join(', ') : '-',
//                                 ),
//                                 _rowItem(
//                                   'Gotra Preference',
//                                   (p.gotra?.isNotEmpty ?? false) ? p.gotra!.map((e) => e.name ?? '').join(', ') : '-',
//                                 ),
//                               ],
//                             )
//                           ],
//                         ),
//                       ),
//                     ),
//                   ],
//                 );
//         },
//       ),
//     );
//   }
//
//   static void _showBasicEditSheet(BuildContext context, EditPreferenceController controller) {
//     showModalBottomSheet(
//       context: context,
//       isScrollControlled: true,
//       backgroundColor: Colors.white,
//       builder: (_) => DraggableScrollableSheet(
//         initialChildSize: 0.95,
//         minChildSize: 0.5,
//         maxChildSize: 0.95,
//         expand: false,
//         builder: (_, scrollController) => Padding(
//           padding: const EdgeInsets.all(16),
//           child: SingleChildScrollView(
//             controller: scrollController,
//             child: Form(
//               // Wrap with Form widget
//               key: controller.formKey, // Assign the form key
//               child: Column(
//                 crossAxisAlignment: CrossAxisAlignment.start,
//                 children: [
//                   Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       Text('Age Range', style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 14)),
//                       const SizedBox(height: 6),
//                       GetBuilder<EditPreferenceController>(builder: (controller) {
//                         return Column(
//                           crossAxisAlignment: CrossAxisAlignment.start,
//                           children: [
//                             RangeSlider(
//                               values: RangeValues(controller.minAgeIndex, controller.maxAgeIndex),
//                               min: 18,
//                               max: 60,
//                               divisions: 42,
//                               labels: RangeLabels(
//                                 '${controller.minAgeIndex.round()}',
//                                 '${controller.maxAgeIndex.round()}',
//                               ),
//                               onChanged: (values) {
//                                 controller.minAgeIndex = values.start;
//                                 controller.maxAgeIndex = values.end;
//                                 controller.update();
//                               },
//                               activeColor: cPrimary,
//                               inactiveColor: Colors.grey[300],
//                             ),
//                             Text(
//                               'Selected: ${controller.minAgeIndex.round()} - ${controller.maxAgeIndex.round()} years',
//                               style: MyTextStyle.gilroyRegular(color: cDarkText, size: 13),
//                             ),
//                             const SizedBox(height: 16),
//                           ],
//                         );
//                       }),
//                     ],
//                   ),
//                   Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       Text('Height Range', style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 14)),
//                       const SizedBox(height: 6),
//                       GetBuilder<EditPreferenceController>(builder: (controller) {
//                         return Column(
//                           crossAxisAlignment: CrossAxisAlignment.start,
//                           children: [
//                             RangeSlider(
//                               values: RangeValues(controller.minHeightIndex, controller.maxHeightIndex),
//                               min: 0,
//                               max: (controller.heightOptions.length - 1).toDouble(),
//                               divisions: controller.heightOptions.length - 1,
//                               labels: RangeLabels(
//                                 controller.heightOptions[controller.minHeightIndex.round()],
//                                 controller.heightOptions[controller.maxHeightIndex.round()],
//                               ),
//                               onChanged: (values) {
//                                 print("a;sdklas;da");
//                                 controller.minHeightIndex = values.start;
//                                 controller.maxHeightIndex = values.end;
//                                 controller.update();
//                               },
//                               activeColor: cPrimary,
//                               inactiveColor: Colors.grey[300],
//                             ),
//                             Text(
//                               'Selected: ${controller.heightOptions[controller.minHeightIndex.round()]} - ${controller.heightOptions[controller.maxHeightIndex.round()]}',
//                               style: MyTextStyle.gilroyRegular(color: cDarkText, size: 13),
//                             ),
//                             const SizedBox(height: 14),
//                           ],
//                         );
//                       }),
//                     ],
//                   ),
//                   const SizedBox(height: 24),
//                   CommonButton(
//                     text: 'Save',
//                     onTap: () {
//                       controller.submit();
//
//                       //   Get.back();
//                     },
//                   ),
//                 ],
//               ),
//             ),
//           ),
//         ),
//       ),
//     );
//   }
//
//   static void _showEducationEditSheet(BuildContext context, EditPreferenceController controller) {
//     showModalBottomSheet(
//       context: context,
//       isScrollControlled: true,
//       backgroundColor: Colors.white,
//       shape: const RoundedRectangleBorder(
//         borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
//       ),
//       builder: (_) => GetBuilder<EditPreferenceController>(
//         builder: (_) => DraggableScrollableSheet(
//           initialChildSize: 0.95,
//           minChildSize: 0.5,
//           maxChildSize: 0.95,
//           expand: false,
//           builder: (_, scrollController) => Column(
//             children: [
//               // --- Top handle and title ---
//               Padding(
//                 padding: const EdgeInsets.only(top: 12),
//                 child: Column(
//                   children: [
//                     Container(
//                       width: 40,
//                       height: 4,
//                       decoration: BoxDecoration(
//                         color: Colors.grey.shade300,
//                         borderRadius: BorderRadius.circular(2),
//                       ),
//                     ),
//                     const SizedBox(height: 12),
//                     Text("Edit Career Preferences", style: MyTextStyle.gilroyBold(size: 18, color: cDarkText)),
//                   ],
//                 ),
//               ),
//               const Divider(height: 0),
//
//               // --- Content ---
//               Expanded(
//                 child: SingleChildScrollView(
//                   controller: scrollController,
//                   padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       // ---- Education ----
//                       Text("Highest Qualification", style: MyTextStyle.gilroySemiBold(size: 15, color: cDarkText)),
//                       const SizedBox(height: 8),
//                       multiSelectChooserField(
//                         context: context,
//                         controller: controller,
//                         title: "Education",
//                         getItems: () => controller.educationSuggestions,
//                         selectedItems: controller.selectedQualification,
//                         fetch: controller.fetchEducation,
//                         onSelectionChanged: (selected) {
//                           controller.selectedQualification = selected;
//                         },
//                       ),
//
//                       const SizedBox(height: 20),
//
//                       // ---- Profession ----
//                       Text("Preferred Profession", style: MyTextStyle.gilroySemiBold(size: 15, color: cDarkText)),
//                       const SizedBox(height: 8),
//                       multiSelectChooserField(
//                         context: context,
//                         controller: controller,
//                         title: "Profession",
//                         getItems: () => controller.professionSuggestions,
//                         selectedItems: controller.selectedProfession,
//                         fetch: controller.fetchProfession,
//                         onSelectionChanged: (selected) {
//                           controller.selectedProfession = selected;
//                         },
//                       ),
//
//                       const SizedBox(height: 20),
//
//                       // ---- Salary ----
//                       Text("Expected Salary (Monthly in ₹)",
//                           style: MyTextStyle.gilroySemiBold(size: 15, color: cDarkText)),
//                       const SizedBox(height: 8),
//                       MyTextField(
//                         placeHolder: "e.g. 50000",
//                         controller: controller.income,
//                         onChange: (_) => controller.update(),
//                       ),
//
//                       const SizedBox(height: 30),
//
//                       // ---- Save Button ----
//                       SizedBox(
//                         width: double.infinity,
//                         child: ElevatedButton(
//                           style: ElevatedButton.styleFrom(
//                             backgroundColor: cPrimary,
//                             foregroundColor: cWhite,
//                             shape: RoundedRectangleBorder(
//                               borderRadius: BorderRadius.circular(10),
//                             ),
//                             padding: const EdgeInsets.symmetric(vertical: 14),
//                           ),
//                           onPressed: () => controller.submit(),
//                           child: Text("Save", style: MyTextStyle.gilroyBold(size: 16, color: cWhite)),
//                         ),
//                       ),
//                     ],
//                   ),
//                 ),
//               ),
//             ],
//           ),
//         ),
//       ),
//     );
//   }
//
//   static void _showCasteEditSheet(BuildContext context, EditPreferenceController controller) {
//     showModalBottomSheet(
//       context: context,
//       isScrollControlled: true,
//       backgroundColor: Colors.white,
//       shape: const RoundedRectangleBorder(
//         borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
//       ),
//       builder: (_) => GetBuilder<EditPreferenceController>(
//         builder: (controller) => DraggableScrollableSheet(
//           initialChildSize: 0.95,
//           minChildSize: 0.5,
//           maxChildSize: 0.95,
//           expand: false,
//           builder: (_, scrollController) => Padding(
//             padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 Center(
//                   child: Container(
//                     width: 40,
//                     height: 4,
//                     decoration: BoxDecoration(
//                       color: Colors.grey.shade300,
//                       borderRadius: BorderRadius.circular(2),
//                     ),
//                   ),
//                 ),
//                 const SizedBox(height: 16),
//                 Text("Select Caste", style: MyTextStyle.gilroyBold(size: 18, color: cDarkText)),
//                 const SizedBox(height: 12),
//                 if (controller.selectedCastes.isNotEmpty)
//                   Wrap(
//                     spacing: 8,
//                     runSpacing: 8,
//                     children: controller.selectedCastes.map((caste) {
//                       return Chip(
//                         label: Text(caste.name ?? '', style: MyTextStyle.gilroyRegular(color: cDarkText)),
//                         backgroundColor: cPulsing.withOpacity(0.3),
//                         deleteIcon: const Icon(Icons.close, size: 16),
//                         onDeleted: () => controller.toggleCasteSelection(caste),
//                         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
//                       );
//                     }).toList(),
//                   ),
//                 const SizedBox(height: 16),
//                 TextField(
//                   onChanged: controller.filterCaste,
//                   decoration: InputDecoration(
//                     hintText: 'Search caste...',
//                     hintStyle: MyTextStyle.gilroyRegular(color: cLightText),
//                     prefixIcon: const Icon(Icons.search),
//                     filled: true,
//                     fillColor: Colors.grey.shade100,
//                     contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
//                     border: OutlineInputBorder(
//                       borderRadius: BorderRadius.circular(12),
//                       borderSide: BorderSide(color: Colors.grey.shade300),
//                     ),
//                     enabledBorder: OutlineInputBorder(
//                       borderRadius: BorderRadius.circular(12),
//                       borderSide: BorderSide(color: Colors.grey.shade300),
//                     ),
//                   ),
//                 ),
//                 const SizedBox(height: 16),
//                 Expanded(
//                   child: ListView.separated(
//                     controller: scrollController,
//                     itemCount: controller.filteredCastes.length,
//                     separatorBuilder: (_, __) => const Divider(height: 0),
//                     itemBuilder: (context, index) {
//                       final caste = controller.filteredCastes[index];
//                       final isSelected = controller.selectedCastes.any((e) => e.sId == caste.sId);
//
//                       return CheckboxListTile(
//                         value: isSelected,
//                         activeColor: cPrimary,
//                         checkboxShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
//                         contentPadding: EdgeInsets.zero,
//                         title: Text(caste.name ?? '', style: MyTextStyle.gilroyRegular()),
//                         onChanged: (_) => controller.toggleCasteSelection(caste),
//                       );
//                     },
//                   ),
//                 ),
//                 const SizedBox(height: 16),
//                 SizedBox(
//                   width: double.infinity,
//                   child: ElevatedButton(
//                     style: ElevatedButton.styleFrom(
//                       backgroundColor: cPrimary,
//                       foregroundColor: cWhite,
//                       shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
//                       padding: const EdgeInsets.symmetric(vertical: 14),
//                     ),
//                     onPressed: () => controller.submit(),
//                     child: Text("Save", style: MyTextStyle.gilroyBold(size: 16, color: cWhite)),
//                   ),
//                 ),
//               ],
//             ),
//           ),
//         ),
//       ),
//     );
//   }
//
//   Widget _sectionCard({
//     required String title,
//     required List<Widget> children,
//     required VoidCallback onEdit,
//   }) {
//     return Card(
//       color: Colors.white,
//       elevation: 2,
//       margin: const EdgeInsets.only(bottom: 20),
//       shape: RoundedRectangleBorder(
//         borderRadius: BorderRadius.circular(16),
//       ),
//       shadowColor: cPrimary.withOpacity(0.2),
//       child: Padding(
//         padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             Row(
//               children: [
//                 Text(
//                   title,
//                   style: MyTextStyle.gilroyBold(size: 18, color: cDarkText),
//                 ),
//                 const Spacer(),
//                 GestureDetector(
//                   onTap: onEdit,
//                   child: Container(
//                     padding: const EdgeInsets.all(6),
//                     decoration: BoxDecoration(
//                       color: cPrimary.withOpacity(0.1),
//                       shape: BoxShape.circle,
//                     ),
//                     child: const Icon(Icons.edit, size: 18, color: cPrimary),
//                   ),
//                 ),
//               ],
//             ),
//             const SizedBox(height: 8),
//             Divider(
//               color: cPrimary.withOpacity(0.15),
//               thickness: 1,
//               height: 0,
//             ),
//             const SizedBox(height: 12),
//             ...children,
//           ],
//         ),
//       ),
//     );
//   }
//
//   Widget _rowItem(String title, String value) {
//     return Padding(
//       padding: const EdgeInsets.symmetric(vertical: 6),
//       child: Row(
//         mainAxisAlignment: MainAxisAlignment.spaceBetween,
//         children: [
//           Expanded(child: Text(title, style: MyTextStyle.gilroyRegular(color: cLightText))),
//           Expanded(
//             child: Text(
//               value,
//               textAlign: TextAlign.end,
//               style: MyTextStyle.gilroySemiBold(color: cDarkText),
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   static Widget _autoSuggestField(
//     BuildContext context,
//     EditPreferenceController controller,
//     String title,
//     TextEditingController fieldController,
//     List Function() getItems, // ✅ getter instead of static list
//     Function(String) fetch,
//   ) {
//     final searchController = TextEditingController();
//     return GestureDetector(
//       onTap: () {
//         Get.bottomSheet(
//           StatefulBuilder(
//             builder: (context, setState) => DraggableScrollableSheet(
//               expand: false,
//               initialChildSize: 0.9,
//               maxChildSize: 0.95,
//               minChildSize: 0.5,
//               builder: (_, scrollController) => Container(
//                 padding: const EdgeInsets.all(16),
//                 decoration: const BoxDecoration(
//                   color: Colors.white,
//                   borderRadius: BorderRadius.only(
//                     topLeft: Radius.circular(16),
//                     topRight: Radius.circular(16),
//                   ),
//                 ),
//                 child: GetBuilder<EditPreferenceController>(
//                   builder: (ctrl) => Column(
//                     children: [
//                       Text("Select $title", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
//                       const SizedBox(height: 12),
//                       TextField(
//                         controller: searchController,
//                         decoration: InputDecoration(
//                           hintText: "Search $title",
//                           prefixIcon: const Icon(Icons.search),
//                           border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
//                         ),
//                         onChanged: (val) {
//                           fetch(val);
//                         },
//                       ),
//                       const SizedBox(height: 12),
//                       Expanded(
//                         child: getItems().isEmpty
//                             ? Center(child: Text("No $title found"))
//                             : ListView.builder(
//                                 controller: scrollController,
//                                 itemCount: getItems().length,
//                                 itemBuilder: (_, index) => ListTile(
//                                   title: Text(getItems()[index].name ?? ''),
//                                   onTap: () {
//                                     fieldController.text = getItems()[index].name ?? '';
//                                     controller.update();
//                                     Get.back();
//                                   },
//                                 ),
//                               ),
//                       ),
//                     ],
//                   ),
//                 ),
//               ),
//             ),
//           ),
//           isScrollControlled: true,
//         );
//       },
//       child: AbsorbPointer(
//         child: MyTextField(
//           placeHolder: title,
//           controller: fieldController,
//         ),
//       ),
//     );
//   }
// }
//
// Widget multiSelectChooserField({
//   required BuildContext context,
//   required EditPreferenceController controller,
//   required String title,
//   required List<CommonItem> Function() getItems,
//   required List<CommonItem> selectedItems,
//   required void Function(List<CommonItem>) onSelectionChanged,
//   required Function(String) fetch,
// }) {
//   final displayController = TextEditingController(
//     text: selectedItems.map((e) => e.name).join(', '),
//   );
//
//   final searchController = TextEditingController();
//
//   return GestureDetector(
//     onTap: () {
//       List<CommonItem> tempSelected = List.from(selectedItems);
//
//       Get.bottomSheet(
//         StatefulBuilder(
//           builder: (context, setState) {
//             return DraggableScrollableSheet(
//               expand: false,
//               initialChildSize: 0.95,
//               maxChildSize: 0.95,
//               minChildSize: 0.5,
//               builder: (_, scrollController) => Container(
//                 decoration: const BoxDecoration(
//                   color: Colors.white,
//                   borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
//                 ),
//                 child: GetBuilder<EditPreferenceController>(
//                   builder: (_) {
//                     final items = getItems();
//                     bool isSelected(CommonItem item) => tempSelected.any((e) => e.sId == item.sId);
//
//                     void toggle(CommonItem item, bool selected) {
//                       setState(() {
//                         if (selected && !isSelected(item)) {
//                           tempSelected.add(item);
//                         } else {
//                           tempSelected.removeWhere((e) => e.sId == item.sId);
//                         }
//                       });
//                     }
//
//                     return Column(
//                       crossAxisAlignment: CrossAxisAlignment.start,
//                       children: [
// // Topbar
//                         Container(
//                           padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
//                           decoration: BoxDecoration(
//                             borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
//                             color: cPrimary,
//                           ),
//                           child: Row(
//                             children: [
//                               Expanded(
//                                 child: Text(
//                                   "Select $title",
//                                   style: MyTextStyle.gilroyBold(size: 18, color: cWhite),
//                                 ),
//                               ),
//                               GestureDetector(
//                                 onTap: () => Get.back(),
//                                 child: const Icon(Icons.close_rounded, color: cWhite),
//                               ),
//                             ],
//                           ),
//                         ),
//
//                         const SizedBox(height: 12),
//
// // Search field
//                         Padding(
//                           padding: const EdgeInsets.symmetric(horizontal: 16),
//                           child: TextField(
//                             controller: searchController,
//                             decoration: InputDecoration(
//                               hintText: "Search $title...",
//                               prefixIcon: const Icon(Icons.search),
//                               contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
//                               border: OutlineInputBorder(
//                                 borderRadius: BorderRadius.circular(10),
//                                 borderSide: BorderSide(color: cPrimary.withOpacity(0.3)),
//                               ),
//                             ),
//                             onChanged: fetch,
//                           ),
//                         ),
//
//                         const SizedBox(height: 12),
//
// // Selected chips
//                         if (tempSelected.isNotEmpty)
//                           Padding(
//                             padding: const EdgeInsets.symmetric(horizontal: 16),
//                             child: Wrap(
//                               spacing: 8,
//                               runSpacing: 8,
//                               children: tempSelected.map((item) {
//                                 return Chip(
//                                   label: Text(item.name ?? ''),
//                                   backgroundColor: cPrimary.withOpacity(0.15),
//                                   onDeleted: () {
//                                     setState(() {
//                                       tempSelected.removeWhere((e) => e.sId == item.sId);
//                                     });
//                                   },
//                                 );
//                               }).toList(),
//                             ),
//                           ),
//
//                         const SizedBox(height: 12),
//
// // List items
//                         Expanded(
//                           child: Padding(
//                             padding: const EdgeInsets.symmetric(horizontal: 8),
//                             child: items.isEmpty
//                                 ? Center(child: Text("No $title found", style: MyTextStyle.gilroyRegular()))
//                                 : ListView.builder(
//                                     controller: scrollController,
//                                     itemCount: items.length,
//                                     itemBuilder: (_, index) {
//                                       final item = items[index];
//                                       return CheckboxListTile(
//                                         value: isSelected(item),
//                                         contentPadding: const EdgeInsets.symmetric(horizontal: 12),
//                                         title: Text(item.name ?? '', style: MyTextStyle.gilroyRegular()),
//                                         onChanged: (selected) {
//                                           toggle(item, selected ?? false);
//                                         },
//                                       );
//                                     },
//                                   ),
//                           ),
//                         ),
//
//                         const SizedBox(height: 16),
//
// // Save Button
//                         Padding(
//                           padding: const EdgeInsets.symmetric(horizontal: 16),
//                           child: SizedBox(
//                             width: double.infinity,
//                             child: ElevatedButton(
//                               onPressed: () {
//                                 onSelectionChanged(tempSelected);
//                                 controller.update();
//                                 Get.back();
//                               },
//                               style: ElevatedButton.styleFrom(
//                                 backgroundColor: cPrimary,
//                                 foregroundColor: cWhite,
//                                 padding: const EdgeInsets.symmetric(vertical: 14),
//                                 shape: RoundedRectangleBorder(
//                                   borderRadius: BorderRadius.circular(10),
//                                 ),
//                               ),
//                               child: Text("Done", style: MyTextStyle.gilroyBold(size: 16, color: cWhite)),
//                             ),
//                           ),
//                         ),
//
//                         const SizedBox(height: 16),
//                       ],
//                     );
//                   },
//                 ),
//               ),
//             );
//           },
//         ),
//         isScrollControlled: true,
//       );
//     },
//     child: AbsorbPointer(
//       child: MyTextField(
//         placeHolder: title,
//         controller: displayController,
//       ),
//     ),
//   );
// }

// 📱 Modern UI: partner_preference_view_screen.dart

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/models/ModelCommonEducationQualificationListResponse.dart';

import '../../common/extensions/font_extension.dart';
import '../../utilities/const.dart';
import 'common_widget.dart';
import 'edit_preference_controller.dart';
import 'extra_views/top_bar.dart';

class PartnerPreferenceViewScreen extends StatefulWidget {
  const PartnerPreferenceViewScreen({super.key});

  @override
  State<PartnerPreferenceViewScreen> createState() => _PartnerPreferenceViewScreenState();
}

class _PartnerPreferenceViewScreenState extends State<PartnerPreferenceViewScreen> with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic));

    _fadeController.forward();
    _slideController.forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: GetBuilder<EditPreferenceController>(
        init: EditPreferenceController(SessionManager.shared.getUserID()),
        builder: (controller) {
          final p = controller.user?.preferences;
          return p == null
              ? _buildLoadingState()
              : FadeTransition(
                  opacity: _fadeAnimation,
                  child: SlideTransition(
                    position: _slideAnimation,
                    child: Column(
                      children: [
                        //  _buildModernTopBar(),
                        TopBarForInView(title: "Set your Partner Preference"),
                        Expanded(
                          child: _buildPreferenceContent(controller, p),
                        ),
                      ],
                    ),
                  ),
                );
        },
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: cPrimary.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(cPrimary),
              strokeWidth: 3,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Loading preferences...',
            style: MyTextStyle.gilroyMedium(color: cDarkText, size: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildModernTopBar() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [cPrimary, cPrimary.withOpacity(0.8)],
        ),
        boxShadow: [
          BoxShadow(
            color: cPrimary.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Row(
            children: [
              GestureDetector(
                onTap: () => Get.back(),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.3)),
                  ),
                  child: const Icon(
                    Icons.arrow_back_ios_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Partner Preferences',
                      style: MyTextStyle.gilroyBold(color: Colors.white, size: 22),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Customize your ideal match',
                      style: MyTextStyle.gilroyRegular(
                        color: Colors.white.withOpacity(0.8),
                        size: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.3)),
                ),
                child: const Icon(
                  Icons.tune_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPreferenceContent(EditPreferenceController controller, preferences) {
    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        const SliverToBoxAdapter(child: SizedBox(height: 20)),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: [
                _buildModernSectionCard(
                  icon: Icons.person_outline_rounded,
                  iconColor: Colors.blue,
                  title: 'Basic Details',
                  subtitle: 'Age, height & marital status',
                  onEdit: () => _showBasicEditSheet(context, controller),
                  children: [
                    _buildModernRowItem(
                      'Age Range',
                      '${preferences.ageRange?.min ?? '-'} - ${preferences.ageRange?.max ?? '-'} years',
                      Icons.cake_outlined,
                    ),
                    _buildModernRowItem(
                      'Height Range',
                      '${preferences.heightRange?.min ?? '-'} - ${preferences.heightRange?.max ?? '-'}',
                      Icons.height_rounded,
                    ),
                    _buildModernRowItem(
                      'Marital Status',
                      preferences.maritalStatus != null && preferences.maritalStatus!.isNotEmpty
                          ? preferences.maritalStatus!.join(', ')
                          : 'Any',
                      Icons.favorite_border_rounded,
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _buildModernSectionCard(
                  icon: Icons.work_outline_rounded,
                  iconColor: Colors.green,
                  title: 'Career & Education',
                  subtitle: 'Qualification & profession',
                  onEdit: () => _showEducationEditSheet(context, controller),
                  children: [
                    _buildModernRowItem(
                      'Education',
                      (preferences.qualification?.isNotEmpty ?? false)
                          ? preferences.qualification!.map((e) => e.name ?? '').join(', ')
                          : 'Not specified',
                      Icons.school_outlined,
                    ),
                    _buildModernRowItem(
                      'Profession',
                      (preferences.profession?.isNotEmpty ?? false)
                          ? preferences.profession!.map((e) => e.name ?? '').join(', ')
                          : 'Not specified',
                      Icons.business_center_outlined,
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _buildModernSectionCard(
                  icon: Icons.language_rounded,
                  iconColor: Colors.orange,
                  title: 'Culture & Background',
                  subtitle: 'Caste & community preferences',
                  onEdit: () => _showCasteEditSheet(context, controller),
                  children: [
                    _buildModernRowItem(
                      'Caste',
                      (preferences.caste?.isNotEmpty ?? false)
                          ? preferences.caste!.map((e) => e.name ?? '').join(', ')
                          : 'Any',
                      Icons.group_outlined,
                    ),
                    _buildModernRowItem(
                      'Gotra',
                      (preferences.gotra?.isNotEmpty ?? false)
                          ? preferences.gotra!.map((e) => e.name ?? '').join(', ')
                          : 'Any',
                      Icons.family_restroom_outlined,
                    ),
                  ],
                ),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildModernSectionCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required List<Widget> children,
    required VoidCallback onEdit,
  }) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 600),
      builder: (context, value, child) {
        return Transform.scale(
          scale: 0.95 + (0.05 * value),
          child: Opacity(
            opacity: value,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                  BoxShadow(
                    color: iconColor.withOpacity(0.08),
                    blurRadius: 40,
                    offset: const Offset(0, 16),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(24),
                  onTap: onEdit,
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: iconColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: iconColor.withOpacity(0.2),
                                  width: 1,
                                ),
                              ),
                              child: Icon(icon, color: iconColor, size: 24),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    title,
                                    style: MyTextStyle.gilroyBold(
                                      size: 18,
                                      color: cDarkText,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    subtitle,
                                    style: MyTextStyle.gilroyRegular(
                                      color: cLightText,
                                      size: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: cPrimary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                Icons.edit_outlined,
                                size: 18,
                                color: cPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Container(
                          height: 1,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                iconColor.withOpacity(0.1),
                                iconColor.withOpacity(0.3),
                                iconColor.withOpacity(0.1),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        ...children.map((child) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: child,
                            )),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildModernRowItem(String title, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 16, color: cPrimary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: MyTextStyle.gilroyMedium(color: cLightText, size: 12),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static void _showBasicEditSheet(BuildContext context, EditPreferenceController controller) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.95,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
          ),
          child: Column(
            children: [
              // Modern Handle
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Container(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.person_outline, color: Colors.blue),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Basic Preferences',
                            style: MyTextStyle.gilroyBold(size: 20, color: cDarkText),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Set age, height & marital status',
                            style: MyTextStyle.gilroyRegular(color: cLightText, size: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Content
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                  child: Form(
                    key: controller.formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildModernSliderSection(
                          'Age Range',
                          'Select preferred age range',
                          Icons.cake_outlined,
                          Colors.blue,
                          GetBuilder<EditPreferenceController>(builder: (controller) {
                            return Column(
                              children: [
                                RangeSlider(
                                  values: RangeValues(controller.minAgeIndex, controller.maxAgeIndex),
                                  min: 18,
                                  max: 60,
                                  divisions: 42,
                                  activeColor: Colors.blue,
                                  inactiveColor: Colors.blue.withOpacity(0.2),
                                  onChanged: (values) {
                                    controller.minAgeIndex = values.start;
                                    controller.maxAgeIndex = values.end;
                                    controller.update();
                                  },
                                ),
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.blue.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        '${controller.minAgeIndex.round()} - ${controller.maxAgeIndex.round()} years',
                                        style: MyTextStyle.gilroySemiBold(
                                          color: Colors.blue,
                                          size: 16,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            );
                          }),
                        ),

                        const SizedBox(height: 32),

                        _buildModernSliderSection(
                          'Height Range',
                          'Select preferred height range',
                          Icons.height_rounded,
                          Colors.green,
                          GetBuilder<EditPreferenceController>(builder: (controller) {
                            return Column(
                              children: [
                                RangeSlider(
                                  values: RangeValues(controller.minHeightIndex, controller.maxHeightIndex),
                                  min: 0,
                                  max: (controller.heightOptions.length - 1).toDouble(),
                                  divisions: controller.heightOptions.length - 1,
                                  activeColor: Colors.green,
                                  inactiveColor: Colors.green.withOpacity(0.2),
                                  onChanged: (values) {
                                    controller.minHeightIndex = values.start;
                                    controller.maxHeightIndex = values.end;
                                    controller.update();
                                  },
                                ),
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.green.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        '${controller.heightOptions[controller.minHeightIndex.round()]} - ${controller.heightOptions[controller.maxHeightIndex.round()]}',
                                        style: MyTextStyle.gilroySemiBold(
                                          color: Colors.green,
                                          size: 16,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            );
                          }),
                        ),

                        const SizedBox(height: 40),

                        // Modern Save Button
                        Container(
                          width: double.infinity,
                          height: 56,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [cPrimary, cPrimary.withOpacity(0.8)],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: cPrimary.withOpacity(0.3),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () => controller.submit(),
                              child: Center(
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.save_outlined, color: Colors.white),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Save Preferences',
                                      style: MyTextStyle.gilroyBold(size: 16, color: Colors.white),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _buildModernSliderSection(
    String title,
    String subtitle,
    IconData icon,
    Color color,
    Widget content,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 16)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: MyTextStyle.gilroyRegular(color: cLightText, size: 12)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          content,
        ],
      ),
    );
  }

  static void _showEducationEditSheet(BuildContext context, EditPreferenceController controller) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => GetBuilder<EditPreferenceController>(
        builder: (_) => DraggableScrollableSheet(
          initialChildSize: 0.95,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (_, scrollController) => Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
            ),
            child: Column(
              children: [
                // Handle
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // Header with gradient
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.green.withOpacity(0.1), Colors.green.withOpacity(0.05)],
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.green,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.green.withOpacity(0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.work_outline, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Career Preferences',
                              style: MyTextStyle.gilroyBold(size: 22, color: cDarkText),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Education, profession & salary expectations',
                              style: MyTextStyle.gilroyRegular(color: cLightText, size: 14),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Content
                Expanded(
                  child: SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildModernFieldSection(
                          'Highest Qualification',
                          'Educational background preference',
                          Icons.school_outlined,
                          Colors.blue,
                          multiSelectChooserField(
                            context: context,
                            controller: controller,
                            title: "Education",
                            getItems: () => controller.educationSuggestions,
                            selectedItems: controller.selectedQualification,
                            fetch: controller.fetchEducation,
                            onSelectionChanged: (selected) {
                              controller.selectedQualification = selected;
                            },
                          ),
                        ),

                        const SizedBox(height: 24),

                        _buildModernFieldSection(
                          'Preferred Profession',
                          'Career field preference',
                          Icons.business_center_outlined,
                          Colors.orange,
                          multiSelectChooserField(
                            context: context,
                            controller: controller,
                            title: "Profession",
                            getItems: () => controller.professionSuggestions,
                            selectedItems: controller.selectedProfession,
                            fetch: controller.fetchProfession,
                            onSelectionChanged: (selected) {
                              controller.selectedProfession = selected;
                            },
                          ),
                        ),

                        const SizedBox(height: 24),

                        _buildModernFieldSection(
                          'Expected Salary',
                          'Monthly income expectation in ₹',
                          Icons.currency_rupee_outlined,
                          Colors.green,
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.grey[50],
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey[200]!),
                            ),
                            child: MyTextField(
                              placeHolder: "e.g. 50,000",
                              controller: controller.income,
                              onChange: (_) => controller.update(),
                            ),
                          ),
                        ),

                        const SizedBox(height: 40),

                        // Save Button
                        Container(
                          width: double.infinity,
                          height: 56,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Colors.green, Colors.green.withOpacity(0.8)],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.green.withOpacity(0.3),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () => controller.submit(),
                              child: Center(
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.save_outlined, color: Colors.white),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Save Career Preferences',
                                      style: MyTextStyle.gilroyBold(size: 16, color: Colors.white),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static Widget _buildModernFieldSection(
    String title,
    String subtitle,
    IconData icon,
    Color color,
    Widget field,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 16)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: MyTextStyle.gilroyRegular(color: cLightText, size: 12)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          field,
        ],
      ),
    );
  }

  static void _showCasteEditSheet(BuildContext context, EditPreferenceController controller) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => GetBuilder<EditPreferenceController>(
        builder: (controller) => DraggableScrollableSheet(
          initialChildSize: 0.95,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (_, scrollController) => Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
            ),
            child: Column(
              children: [
                // Handle
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // Header with gradient background
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.orange.withOpacity(0.1), Colors.orange.withOpacity(0.05)],
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.orange,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.orange.withOpacity(0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.language_rounded, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Cultural Preferences',
                              style: MyTextStyle.gilroyBold(size: 22, color: cDarkText),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Community and cultural background',
                              style: MyTextStyle.gilroyRegular(color: cLightText, size: 14),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Selected chips section
                if (controller.selectedCastes.isNotEmpty)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.orange.withOpacity(0.1)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Selected (${controller.selectedCastes.length})',
                          style: MyTextStyle.gilroySemiBold(color: Colors.orange, size: 14),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: controller.selectedCastes.map((caste) {
                            return Container(
                              decoration: BoxDecoration(
                                color: Colors.orange,
                                borderRadius: BorderRadius.circular(25),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.orange.withOpacity(0.2),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(25),
                                  onTap: () => controller.toggleCasteSelection(caste),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          caste.name ?? '',
                                          style: MyTextStyle.gilroySemiBold(
                                            color: Colors.white,
                                            size: 12,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        const Icon(
                                          Icons.close,
                                          size: 14,
                                          color: Colors.white,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),

                // Search field
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    child: TextField(
                      onChanged: controller.filterCaste,
                      decoration: InputDecoration(
                        hintText: 'Search community...',
                        hintStyle: MyTextStyle.gilroyRegular(color: cLightText),
                        prefixIcon: Container(
                          margin: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.orange.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.search, color: Colors.orange),
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      ),
                    ),
                  ),
                ),

                // List
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                    ),
                    child: controller.filteredCastes.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.search_off_rounded,
                                  size: 64,
                                  color: Colors.grey[400],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No communities found',
                                  style: MyTextStyle.gilroySemiBold(
                                    color: Colors.grey[600]!,
                                    size: 16,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Try adjusting your search',
                                  style: MyTextStyle.gilroyRegular(
                                    color: Colors.grey[500]!,
                                    size: 14,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: scrollController,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            itemCount: controller.filteredCastes.length,
                            itemBuilder: (context, index) {
                              final caste = controller.filteredCastes[index];
                              final isSelected = controller.selectedCastes.any((e) => e.sId == caste.sId);

                              return Container(
                                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isSelected ? Colors.orange.withOpacity(0.1) : Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSelected ? Colors.orange.withOpacity(0.3) : Colors.grey[200]!,
                                  ),
                                ),
                                child: CheckboxListTile(
                                  value: isSelected,
                                  activeColor: Colors.orange,
                                  checkboxShape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                  title: Text(
                                    caste.name ?? '',
                                    style: MyTextStyle.gilroyMedium(
                                      color: isSelected ? Colors.orange : cDarkText,
                                      size: 14,
                                    ),
                                  ),
                                  onChanged: (_) => controller.toggleCasteSelection(caste),
                                ),
                              );
                            },
                          ),
                  ),
                ),

                // Save Button
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Container(
                    width: double.infinity,
                    height: 56,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.orange, Colors.orange.withOpacity(0.8)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.orange.withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => controller.submit(),
                        child: Center(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.save_outlined, color: Colors.white),
                              const SizedBox(width: 8),
                              Text(
                                'Save Cultural Preferences',
                                style: MyTextStyle.gilroyBold(size: 16, color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Enhanced Multi-Select Chooser Field
Widget multiSelectChooserField({
  required BuildContext context,
  required EditPreferenceController controller,
  required String title,
  required List<CommonItem> Function() getItems,
  required List<CommonItem> selectedItems,
  required void Function(List<CommonItem>) onSelectionChanged,
  required Function(String) fetch,
}) {
  final displayController = TextEditingController(
    text: selectedItems.isEmpty ? 'Select $title' : selectedItems.map((e) => e.name).join(', '),
  );

  return GestureDetector(
    onTap: () {
      List<CommonItem> tempSelected = List.from(selectedItems);
      final searchController = TextEditingController();

      Get.bottomSheet(
        StatefulBuilder(
          builder: (context, setState) {
            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.95,
              maxChildSize: 0.95,
              minChildSize: 0.5,
              builder: (_, scrollController) => Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
                ),
                child: GetBuilder<EditPreferenceController>(
                  builder: (_) {
                    final items = getItems();
                    bool isSelected(CommonItem item) => tempSelected.any((e) => e.sId == item.sId);

                    void toggle(CommonItem item, bool selected) {
                      setState(() {
                        if (selected && !isSelected(item)) {
                          tempSelected.add(item);
                        } else {
                          tempSelected.removeWhere((e) => e.sId == item.sId);
                        }
                      });
                    }

                    return Column(
                      children: [
                        // Handle
                        Container(
                          margin: const EdgeInsets.only(top: 12, bottom: 8),
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.grey[300],
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),

                        // Header
                        Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [cPrimary, cPrimary.withOpacity(0.8)],
                            ),
                          ),
                          padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.list_alt_rounded, color: Colors.white),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "Select $title",
                                      style: MyTextStyle.gilroyBold(size: 20, color: Colors.white),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      "Choose multiple options",
                                      style: MyTextStyle.gilroyRegular(
                                        color: Colors.white.withOpacity(0.8),
                                        size: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              GestureDetector(
                                onTap: () => Get.back(),
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.close, color: Colors.white, size: 20),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Search field
                        Padding(
                          padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.grey[50],
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey[200]!),
                            ),
                            child: TextField(
                              controller: searchController,
                              decoration: InputDecoration(
                                hintText: "Search $title...",
                                hintStyle: MyTextStyle.gilroyRegular(color: cLightText),
                                prefixIcon: Container(
                                  margin: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: cPrimary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(Icons.search, color: cPrimary),
                                ),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                              ),
                              onChanged: fetch,
                            ),
                          ),
                        ),

                        // Selected items chips
                        if (tempSelected.isNotEmpty)
                          Container(
                            width: double.infinity,
                            margin: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: cPrimary.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: cPrimary.withOpacity(0.1)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Selected (${tempSelected.length})',
                                  style: MyTextStyle.gilroySemiBold(color: cPrimary, size: 14),
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: tempSelected.map((item) {
                                    return Container(
                                      decoration: BoxDecoration(
                                        color: cPrimary,
                                        borderRadius: BorderRadius.circular(20),
                                        boxShadow: [
                                          BoxShadow(
                                            color: cPrimary.withOpacity(0.2),
                                            blurRadius: 6,
                                            offset: const Offset(0, 2),
                                          ),
                                        ],
                                      ),
                                      child: Material(
                                        color: Colors.transparent,
                                        child: InkWell(
                                          borderRadius: BorderRadius.circular(20),
                                          onTap: () {
                                            setState(() {
                                              tempSelected.removeWhere((e) => e.sId == item.sId);
                                            });
                                          },
                                          child: Padding(
                                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Text(
                                                  item.name ?? '',
                                                  style: MyTextStyle.gilroySemiBold(
                                                    color: Colors.white,
                                                    size: 11,
                                                  ),
                                                ),
                                                const SizedBox(width: 6),
                                                const Icon(
                                                  Icons.close,
                                                  size: 12,
                                                  color: Colors.white,
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          ),

                        // Items list
                        Expanded(
                          child: Container(
                            margin: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                            child: items.isEmpty
                                ? Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.search_off_rounded,
                                          size: 64,
                                          color: Colors.grey[400],
                                        ),
                                        const SizedBox(height: 16),
                                        Text(
                                          'No $title found',
                                          style: MyTextStyle.gilroySemiBold(
                                            color: Colors.grey[600]!,
                                            size: 16,
                                          ),
                                        ),
                                      ],
                                    ),
                                  )
                                : ListView.builder(
                                    controller: scrollController,
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    itemCount: items.length,
                                    itemBuilder: (_, index) {
                                      final item = items[index];
                                      final selected = isSelected(item);

                                      return Container(
                                        margin: const EdgeInsets.symmetric(vertical: 2),
                                        decoration: BoxDecoration(
                                          color: selected ? cPrimary.withOpacity(0.1) : Colors.white,
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(
                                            color: selected ? cPrimary.withOpacity(0.3) : Colors.grey[200]!,
                                          ),
                                        ),
                                        child: CheckboxListTile(
                                          value: selected,
                                          activeColor: cPrimary,
                                          checkboxShape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          contentPadding: const EdgeInsets.symmetric(
                                            horizontal: 16,
                                            vertical: 4,
                                          ),
                                          title: Text(
                                            item.name ?? '',
                                            style: MyTextStyle.gilroyMedium(
                                              color: selected ? cPrimary : cDarkText,
                                              size: 14,
                                            ),
                                          ),
                                          onChanged: (value) => toggle(item, value ?? false),
                                        ),
                                      );
                                    },
                                  ),
                          ),
                        ),

                        // Done Button
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: Container(
                            width: double.infinity,
                            height: 56,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [cPrimary, cPrimary.withOpacity(0.8)],
                              ),
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: cPrimary.withOpacity(0.3),
                                  blurRadius: 20,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(16),
                                onTap: () {
                                  onSelectionChanged(tempSelected);
                                  controller.update();
                                  Get.back();
                                },
                                child: Center(
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.check_circle_outline, color: Colors.white),
                                      const SizedBox(width: 8),
                                      Text(
                                        "Done (${tempSelected.length})",
                                        style: MyTextStyle.gilroyBold(size: 16, color: Colors.white),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            );
          },
        ),
        isScrollControlled: true,
      );
    },
    child: AbsorbPointer(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                displayController.text,
                style: MyTextStyle.gilroyRegular(
                  color: selectedItems.isEmpty ? cLightText : cDarkText,
                  size: 14,
                ),
              ),
            ),
            Icon(
              Icons.keyboard_arrow_down_rounded,
              color: cPrimary,
              size: 20,
            ),
          ],
        ),
      ),
    ),
  );
}
