import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../common/extensions/font_extension.dart';
import '../../utilities/const.dart';
import '../models/model_location_list.dart';
import '../models/setting_model.dart';
import 'extra_views/buttons.dart';
import 'extra_views/top_bar.dart';
import 'family_details_controller.dart';

class FamilyDetailsScreen extends StatelessWidget {
  final VoidCallback onNext;

  const FamilyDetailsScreen({Key? key, required this.onNext}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(FamilyDetailsController());

    return Scaffold(
      body: SafeArea(
        child: GetBuilder<FamilyDetailsController>(builder: (_) {
          return controller.isLoading.value
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    const Padding(
                      padding: EdgeInsets.all(20),
                      child: TopBarForOnBoarding(
                        titleStart: 'Family',
                        titleEnd: 'Details',
                        desc: 'Tell us about your family background.',
                      ),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: pOnBoarding,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // _buildDropdown(
                            //   label: 'Father Profession',
                            //   value: controller.fatherProfession,
                            //   items: controller.professionOptions,
                            //   onChanged: (val) {
                            //     controller.fatherProfession = val;
                            //     controller.update();
                            //   },
                            // ),
                            // _buildSwitch(
                            //     'Father Alive?', controller.fatherAlive, (val) => controller.toggleFatherAlive(val)),
                            // _buildDropdown(
                            //   label: 'Mother Profession',
                            //   value: controller.motherProfession,
                            //   items: controller.professionOptions,
                            //   onChanged: (val) {
                            //     controller.motherProfession = val;
                            //     controller.update();
                            //   },
                            // ),
                            // _buildSwitch(
                            //     'Mother Alive?', controller.motherAlive, (val) => controller.toggleMotherAlive(val)),
                            _buildNumberField('Total Brothers', controller.totalBrothers),
                            _buildNumberField('Total Sisters', controller.totalSisters),
                            _buildDropdown(
                              label: 'Family Type',
                              value: controller.selectedFamilyType,
                              items: controller.familyTypes,
                              onChanged: (val) {
                                controller.selectedFamilyType = val;
                                controller.update();
                              },
                            ),
                            _buildDropdown(
                              label: 'Family Status',
                              value: controller.selectedFamilyStatus,
                              items: controller.familyStatusList,
                              onChanged: (val) {
                                controller.selectedFamilyStatus = val;
                                controller.update();
                              },
                            ),

                            _buildDropdown(
                              label: 'Mothers Occupation',
                              value: controller.selectedMotherProfession,
                              items: controller.professionOptions,
                              onChanged: (val) {
                                controller.selectedMotherProfession = val;
                                controller.update();
                              },
                            ),

                            _buildDropdown(
                              label: 'Father Occupation',
                              value: controller.selectedFatherProfession,
                              items: controller.professionOptions,
                              onChanged: (val) {
                                controller.selectedFatherProfession = val;
                                controller.update();
                              },
                            ),

                            _buildIncomeRangeDropdown(
                              label: 'Family Income Range',
                              value: controller.selectedFamilyIncome,
                              items: controller.incomeOptions,
                              onChanged: (val) {
                                controller.selectedFamilyIncome = val;
                                controller.update();
                              },
                            ),

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
                          ],
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      child: CommonButton(
                        text: 'Continue',
                        onTap: () => controller.submitFamilyDetails(),
                      ),
                    ),
                  ],
                );
        }),
      ),
    );
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

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<T> items,
    required ValueChanged<T?> onChanged,
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
          child: DropdownButton<T>(
            value: value,
            isExpanded: true,
            hint: Text('Select $label', style: MyTextStyle.gilroyRegular(color: cLightText)),
            underline: const SizedBox(),
            icon: const Icon(Icons.keyboard_arrow_down_rounded),
            items: items.map((item) {
              return DropdownMenuItem<T>(
                value: item,
                child: Text(item.toString(), style: MyTextStyle.gilroyRegular(color: cDarkText)),
              );
            }).toList(),
            onChanged: onChanged,
          ),
        ),
        const SizedBox(height: 14),
      ],
    );
  }

  Widget _buildSwitch(String label, bool value, ValueChanged<bool> onChanged) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: MyTextStyle.gilroyRegular(size: 14, color: cDarkText)),
        Switch(value: value, onChanged: onChanged)
      ],
    );
  }

  Widget _buildNumberField(String label, TextEditingController controller) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controller,
        keyboardType: TextInputType.number,
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
    );
  }

  Widget _buildIncomeRangeDropdown({
    required String label,
    required IncomeRange? value,
    required List<IncomeRange> items,
    required ValueChanged<IncomeRange?> onChanged,
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
          child: DropdownButton<IncomeRange>(
            value: value,
            isExpanded: true,
            hint: Text('Select $label', style: MyTextStyle.gilroyRegular(color: cLightText)),
            underline: const SizedBox(),
            icon: const Icon(Icons.keyboard_arrow_down_rounded),
            items: items.map((item) {
              return DropdownMenuItem<IncomeRange>(
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
}
