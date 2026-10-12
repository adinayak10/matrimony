import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/screens/education_profession_controller.dart';

import '../../common/extensions/font_extension.dart';
import '../../utilities/const.dart';
import '../models/ModelCommonEducationQualificationListResponse.dart';
import '../models/setting_model.dart';
import 'extra_views/buttons.dart';
import 'extra_views/top_bar.dart';

class EducationCareerScreen extends StatelessWidget {
  final VoidCallback onNext;

  const EducationCareerScreen({Key? key, required this.onNext}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(EducationProfessionController());

    return Scaffold(
      body: SafeArea(
        child: GetBuilder<EducationProfessionController>(builder: (_) {
          return controller.isLoading.value
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    const Padding(
                      padding: EdgeInsets.all(20),
                      child: TopBarForOnBoarding(
                        titleStart: 'Education &',
                        titleEnd: 'Career',
                        desc: 'Let us know your background and work details.',
                      ),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: pOnBoarding,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildDropdown(
                              label: 'Highest Qualification',
                              value: controller.selectedQualification,
                              items: controller.educationOptions,
                              onChanged: (val) {
                                controller.selectedQualification = val;
                                controller.update();
                              },
                            ),
                            _buildDropdown(
                              label: 'Profession',
                              value: controller.selectedProfession,
                              items: controller.professionOptions,
                              onChanged: (val) {
                                controller.selectedProfession = val;
                                controller.update();
                              },
                            ),
                            _buildIncomeRangeDropdown(
                              label: 'Annual Income',
                              value: controller.selectedIncome,
                              items: controller.incomeOptions,
                              onChanged: (val) {
                                controller.selectedIncome = val;
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
                        onTap: () {
                          controller.submitEducationProfessionInfo();
                        },
                      ),
                    ),
                  ],
                );
        }),
      ),
    );
  }

  Widget _buildDropdown({
    required String label,
    required CommonItem? value,
    required List<CommonItem> items,
    required ValueChanged<CommonItem?> onChanged,
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
          child: DropdownButton<CommonItem>(
            value: value,
            isExpanded: true,
            hint: Text('Select $label', style: MyTextStyle.gilroyRegular(color: cLightText)),
            underline: const SizedBox(),
            icon: const Icon(Icons.keyboard_arrow_down_rounded),
            items: items.map((item) {
              return DropdownMenuItem<CommonItem>(
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
