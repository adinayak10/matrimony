import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/utilities/const.dart';

import 'extra_views/buttons.dart';
import 'interests_screen/interests_screen.dart';
import 'lifestyle_step_controller.dart';

class LifestyleStepScreen extends StatelessWidget {
  const LifestyleStepScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GetBuilder<LifestyleStepController>(
      init: LifestyleStepController(),
      builder: (c) {
        return Scaffold(
          backgroundColor: cWhite,
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const TopBarForInView(title: 'Your Lifestyle'),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Step ${c.step} of 4", style: MyTextStyle.gilroyRegular(size: 14, color: cDarkText)),
                      const SizedBox(height: 12),

                      // Step 1: Diet
                      if (c.step == 1)
                        _buildStep(
                          title: "What's your diet like?",
                          note: "Let others know your food preferences.",
                          options: c.dietOptions,
                          selected: c.diet,
                          onSelect: c.setDiet,
                          single: true,
                        ),

                      // Step 2: Smoke → Drink
                      if (c.step == 2) ...[
                        _buildStep(
                          title: "Do you smoke?",
                          note: "Helps others understand your lifestyle.",
                          options: c.smokingOptions,
                          selected: c.smokeStatus,
                          onSelect: c.setSmokeStatus,
                          single: true,
                        ),
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          child: c.showDrink
                              ? Padding(
                                  padding: const EdgeInsets.only(top: 20),
                                  child: _buildStep(
                                    title: "Do you drink?",
                                    note: "Be honest – compatibility matters!",
                                    options: c.drinkingOptions,
                                    selected: c.drinkStatus,
                                    onSelect: c.setDrinkStatus,
                                    single: true,
                                  ),
                                )
                              : const SizedBox.shrink(),
                        )
                      ],

                      // Step 3: Living → Spiritual
                      if (c.step == 3) ...[
                        _buildStep(
                          title: "Do you live with your family?",
                          note: "Some people prefer knowing this early.",
                          options: c.livingOptions,
                          selected: c.livingWithFamily,
                          onSelect: c.setLivingWithFamily,
                          single: true,
                        ),
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          child: c.showSpiritual
                              ? Padding(
                                  padding: const EdgeInsets.only(top: 20),
                                  child: _buildStep(
                                    title: "Your spiritual belief?",
                                    note: "This helps others understand your values.",
                                    options: c.spiritualOptions,
                                    selected: c.spiritualBelief,
                                    onSelect: c.setSpiritualBelief,
                                    single: true,
                                  ),
                                )
                              : const SizedBox.shrink(),
                        )
                      ],

                      // Step 4: Preview
                      if (c.step == 4) _buildPreview(c),

                      const Spacer(),
                      Row(
                        children: [
                          if (c.step > 1)
                            Expanded(
                              child: CommonSmallSecondaryButton(
                                text: 'Previous',
                                onTap: c.prevStep,
                              ),
                            ),
                          if (c.step > 1) const SizedBox(width: 12),
                          Expanded(
                            child: CommonSmallButton(
                              text: c.step < 4 ? "Next" : "Save",
                              onTap: c.step < 4
                                  ? c.nextStep
                                  : () {
                                      c.saveLifestyleStep();
                                    },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStep({
    required String title,
    required String note,
    required List<String> options,
    required dynamic selected,
    required Function(String) onSelect,
    bool single = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: MyTextStyle.gilroyBold(size: 16)),
        const SizedBox(height: 4),
        Text(note, style: MyTextStyle.gilroyRegular(size: 13, color: cLightText)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: options.map((item) {
            final isSelected = single ? selected == item : selected.contains(item);
            return InterestTag(
              interest: item,
              isContain: isSelected,
              onTap: () => onSelect(item),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildPreview(LifestyleStepController c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Preview", style: MyTextStyle.gilroyBold(size: 16)),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: cPrimary.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: cPrimary.withOpacity(0.2)),
          ),
          child: Text(
            """
🍽 Diet: ${c.diet}
🚬 Smoking: ${c.smokeStatus}
🍷 Drinking: ${c.drinkStatus}
🏠 Living with family: ${c.livingWithFamily}
🕉 Spiritual belief: ${c.spiritualBelief}
            """,
            style: MyTextStyle.gilroyRegular(size: 14, color: cDarkText),
          ),
        ),
      ],
    );
  }
}
