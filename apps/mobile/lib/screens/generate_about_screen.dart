import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/utilities/const.dart';

import 'extra_views/buttons.dart';
import 'generate_about_controller.dart';
import 'interests_screen/interests_screen.dart';

class GenerateAboutScreen extends StatelessWidget {
  const GenerateAboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GetBuilder<GenerateAboutController>(
      init: GenerateAboutController()..fetchOptionsFromApi(),
      builder: (controller) {
        return Scaffold(
          backgroundColor: cWhite,
          body: controller.loading
              ? const Center(child: CircularProgressIndicator(color: cPrimary))
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TopBarForInView(title: 'Generate Your Bio'),
                    Expanded(
                      child: Container(
                        padding: EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text("Step ${controller.step} of 5",
                                style: MyTextStyle.gilroyRegular(size: 14, color: cDarkText)),
                            const SizedBox(height: 12),
                            if (controller.step == 1)
                              _buildStep("Choose a tone", controller.tones, controller.selectedTone,
                                  (v) => controller.setSelectedTone(v),
                                  single: true),
                            if (controller.step == 2)
                              _buildStep("Pick your traits", controller.traits, controller.selectedTraits,
                                  controller.toggleTrait),
                            if (controller.step == 3)
                              _buildStep("Select hobbies", controller.hobbies, controller.selectedHobbies,
                                  controller.toggleHobby),
                            if (controller.step == 4) _buildPreviewStep(controller),
                            const Spacer(),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                if (controller.step > 1)
                                  Expanded(
                                      child: CommonSmallSecondaryButton(text: 'Previous', onTap: controller.prevStep)),
                                if (controller.step > 1) const SizedBox(width: 12),
                                Expanded(
                                  child: CommonSmallButton(
                                    text: controller.step < 4 ? "Next" : "Generate",
                                    onTap: () {
                                      if (controller.step < 4) {
                                        controller.nextStep();
                                      } else {
                                        showDialog(
                                          context: context,
                                          barrierDismissible: false,
                                          barrierColor: Colors.transparent,
                                          builder: (_) => const AIPulseLoader(),
                                        );

                                        controller.generateBio(context);
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    )
                  ],
                ),
        );
      },
    );
  }

  Widget _buildStep(String title, List<String> options, dynamic selected, Function(String) onSelect,
      {bool single = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: MyTextStyle.gilroyBold(size: 16)),
        const SizedBox(height: 10),
        Center(
          child: Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: options.map((item) {
              final isSelected = single ? selected == item : selected.contains(item);
              return InterestTag(
                interest: item,
                isContain: isSelected,
                onTap: () => onSelect(item),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildPreviewStep(GenerateAboutController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Preview", style: MyTextStyle.gilroyBold(size: 16)),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: cPulsing.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: cPrimary.withOpacity(0.3)),
          ),
          child: Text(
            controller.generatedBio.isEmpty
                ? "Tap 'Generate' to create a bio based on your selections."
                : controller.generatedBio,
            style: MyTextStyle.gilroyRegular(size: 14, color: cDarkText),
          ),
        ),
      ],
    );
  }
}

class AIPulseLoader extends StatelessWidget {
  const AIPulseLoader({super.key});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.black.withOpacity(0.7),
      elevation: 0,
      insetPadding: EdgeInsets.zero,
      child: SizedBox.expand(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [Colors.purpleAccent, Colors.blueAccent],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ).createShader(bounds),
                child: const Icon(Icons.auto_awesome, size: 60, color: Colors.white),
              ),
              const SizedBox(height: 20),
              const Text(
                "AI is crafting your profile story...",
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white70,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              const _GlowingDots(),
            ],
          ),
        ),
      ),
    );
  }
}

class _GlowingDots extends StatefulWidget {
  const _GlowingDots();

  @override
  State<_GlowingDots> createState() => _GlowingDotsState();
}

class _GlowingDotsState extends State<_GlowingDots> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _dot1;
  late Animation<double> _dot2;
  late Animation<double> _dot3;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(duration: const Duration(seconds: 2), vsync: this)..repeat();

    _dot1 = Tween<double>(begin: 0.2, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.4, curve: Curves.easeInOut)),
    );
    _dot2 = Tween<double>(begin: 0.2, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.2, 0.6, curve: Curves.easeInOut)),
    );
    _dot3 = Tween<double>(begin: 0.2, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.4, 1.0, curve: Curves.easeInOut)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) => Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildDot(_dot1.value),
          const SizedBox(width: 10),
          _buildDot(_dot2.value),
          const SizedBox(width: 10),
          _buildDot(_dot3.value),
        ],
      ),
    );
  }

  Widget _buildDot(double opacity) {
    return Opacity(
      opacity: opacity,
      child: Container(
        width: 10,
        height: 10,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.blueAccent,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
