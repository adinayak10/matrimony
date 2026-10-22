import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/screens/personal_info_controller.dart';

import 'extra_views/buttons.dart';
import 'extra_views/top_bar.dart';

class PersonalInfoScreen extends StatelessWidget {
  final VoidCallback onNext;

  PersonalInfoScreen({Key? key, required this.onNext}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Get.put(PersonalInfoController());

    return GetBuilder<PersonalInfoController>(
      builder: (controller) {
        return Scaffold(
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        TopBarForOnBoarding(
                          titleStart: controller.isNewUser ? 'Your' : 'Update',
                          titleEnd: controller.isNewUser ? 'Details' : 'Personal Info',
                          desc: controller.isNewUser
                              ? 'This helps us build your ideal match'
                              : 'You can update your personal information here',
                        ),

                        const SizedBox(height: 20),

                        /// Gender Dropdown
                        controller.buildStringDropdown(
                          label: 'Gender',
                          value: controller.selectedGender,
                          items: controller.genderOptions,
                          onChanged: (val) {
                            controller.selectedGender = val!;
                            controller.update();
                          },
                          enabled: controller.isNewUser, // Only allow changing during onboarding
                        ),

                        /// DOB Picker
                        controller.buildDatePickerField(
                          label: 'Date of Birth',
                          selectedDate: controller.dob,
                          onTap: () async {
                            DateTime? pickedDate = await showDatePicker(
                              context: context,
                              initialDate: controller.dob ?? DateTime(2000),
                              firstDate: DateTime(1950),
                              lastDate: DateTime.now(),
                            );
                            if (pickedDate != null) {
                              controller.dob = pickedDate;
                              controller.update();
                            }
                          },
                        ),

                        /// Height Dropdown
                        controller.buildStringDropdown(
                          label: 'Height',
                          value: controller.selectedHeight,
                          items: controller.heightOptions,
                          onChanged: (val) {
                            print(val);

                            controller.selectedHeight = val!;
                            controller.update();
                          },
                        ),

                        /// Marital Status
                        controller.buildStringDropdown(
                          label: 'Marital Status',
                          value: controller.selectedMaritalStatus,
                          items: controller.maritalStatusOptions,
                          onChanged: (val) {
                            controller.selectedMaritalStatus = val!;
                            controller.update();
                          },
                        ),

                        /// Blood group (optional)
                        controller.buildStringDropdown(
                          label: AppKeys.bloodGroupLabel.tr,
                          value: controller.selectedBloodGroup,
                          items: controller.bloodGroups,
                          onChanged: (val) {
                            controller.selectedBloodGroup = val ?? '';
                            controller.update();
                          },
                        ),

                        /// Who manages this profile
                        controller.buildCreatedByDropdown(),

                        /// Gotra (caste is always Banjara)
                        controller.buildGotraDropdown(),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),
                CommonButton(
                  text: 'Continue',
                  onTap: () {
                    controller.submitPersonalInfo();
                    onNext();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
