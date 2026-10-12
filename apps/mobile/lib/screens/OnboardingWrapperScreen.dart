import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/screens/splash_screen/splash_controller.dart';

import 'localtion_language_screen/lcoation_language_screen.dart';
import 'personal_info_screen.dart';

class OnboardingWrapperScreen extends StatefulWidget {
  final int startPage;

  const OnboardingWrapperScreen({Key? key, required this.startPage}) : super(key: key);

  @override
  State<OnboardingWrapperScreen> createState() => _OnboardingWrapperScreenState();
}

class _OnboardingWrapperScreenState extends State<OnboardingWrapperScreen> {
  late PageController _pageController = PageController();

  late List<Widget> _steps;

  late int _currentPage;
  final List<String> _titles = [
    "Step 1 of 2: Personal Info",
    "Step 2 of 2: Location & Language",
  ];

  @override
  void initState() {
    super.initState();

    _steps = [
      PersonalInfoScreen(onNext: _nextStep),
      LocationLanguageScreen(onNext: _nextStep),
    ];

    _currentPage = widget.startPage;
    _pageController = PageController(initialPage: _currentPage);
  }

  void _nextStep() {
    print('alkdjslasjdlalsdasd');

    if (_currentPage < _titles.length - 1) {
      setState(() => _currentPage++);
      _pageController.animateToPage(
        _currentPage,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      Get.offAll(() => gotoNextSetupView());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_currentPage]),
        centerTitle: true,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: PageView(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(),
        children: _steps,
      ),
    );
  }
}
