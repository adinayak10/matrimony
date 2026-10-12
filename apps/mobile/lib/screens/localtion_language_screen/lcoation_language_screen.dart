import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/models/model_location_list.dart';

import '../../common/extensions/font_extension.dart';
import '../../utilities/const.dart';
import '../extra_views/buttons.dart';
import '../extra_views/top_bar.dart';
import 'location_language_controller.dart';

class LocationLanguageScreen extends StatelessWidget {
  final VoidCallback onNext;

  const LocationLanguageScreen({Key? key, required this.onNext}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(LocationLanguageController());

    return Scaffold(
      body: SafeArea(
        child: GetBuilder<LocationLanguageController>(builder: (_) {
          return controller.isLoading.value
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: const TopBarForOnBoarding(
                        titleStart: 'Your',
                        titleEnd: 'Location',
                        desc: 'This helps us find nearby matches.',
                      ),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: pOnBoarding,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildLocationDropdown(
                              label: 'Country',
                              value: controller.selectedCountry,
                              items: controller.countryOptions,
                              onChanged: (val) {
                                controller.selectedCountry = val;
                                controller.fetchStates(val!.sId!);
                              },
                            ),
                            if (controller.selectedCountry != null)
                              _buildLocationDropdown(
                                label: 'State',
                                value: controller.selectedState,
                                items: controller.stateOptions,
                                onChanged: (val) {
                                  controller.selectedState = val;
                                  controller.fetchCities(val!.sId!);
                                },
                              ),
                            if (controller.selectedState != null)
                              _buildLocationDropdown(
                                label: 'City',
                                value: controller.selectedCity,
                                items: controller.cityOptions,
                                onChanged: (val) {
                                  controller.selectedCity = val;
                                  controller.update();
                                },
                              ),
                            const SizedBox(height: 10),
                            _buildLocationDropdown(
                              label: 'Mother Tongue',
                              value: controller.selectedMotherTongue,
                              items: controller.languageOptions,
                              onChanged: (val) {
                                controller.selectedMotherTongue = val;
                                controller.update();
                              },
                            ),
                            const SizedBox(height: 10),
                            Text('Other Known Languages', style: MyTextStyle.gilroySemiBold(size: 14)),
                            Wrap(
                              spacing: 8,
                              children: controller.languageOptions.map((lang) {
                                final isSelected = controller.selectedKnownLanguages.contains(lang);
                                return FilterChip(
                                  label: Text(lang.name!),
                                  selected: isSelected,
                                  onSelected: (selected) {
                                    if (selected) {
                                      controller.selectedKnownLanguages.add(lang);
                                    } else {
                                      controller.selectedKnownLanguages.remove(lang);
                                    }
                                    controller.update();
                                  },
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 20),
                          ],
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      child: CommonButton(
                        text: 'Continue',
                        onTap: () {
                          controller.submitLocationLanguageInfo();
                          onNext();
                        }, // 👈 Navigate to next page
                      ),
                    ),
                  ],
                );
        }),
      ),
    );
  }
}

Widget _buildLocationDropdown({
  required String label,
  required LocationData? value,
  required List<LocationData> items,
  required ValueChanged<LocationData?> onChanged,
}) {
  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: MyTextStyle.gilroySemiBold(size: 14, color: cDarkText)),
      const SizedBox(height: 6),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: cLightBg,
          borderRadius: BorderRadius.circular(10),
        ),
        child: DropdownButton<LocationData>(
          value: value,
          isExpanded: true,
          hint: Text('Select $label', style: MyTextStyle.gilroyRegular(color: cLightText)),
          underline: const SizedBox(),
          icon: const Icon(Icons.keyboard_arrow_down_rounded),
          items: items.map((item) {
            return DropdownMenuItem<LocationData>(
              value: item,
              child: Text(item.name!, style: MyTextStyle.gilroyRegular(color: cDarkText)),
            );
          }).toList(),
          onChanged: onChanged,
        ),
      ),
      const SizedBox(height: 14),
    ],
  );
}
