import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/screens/login_screen/login_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

class OnBoardingScreen extends StatefulWidget {
  const OnBoardingScreen({Key? key}) : super(key: key);

  @override
  State<OnBoardingScreen> createState() => _OnBoardingScreenState();
}

class _OnBoardingScreenState extends State<OnBoardingScreen> with TickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  late List<AnimationController> _animationControllers;
  late List<Animation<double>> _fadeAnimations;
  late List<Animation<Offset>> _slideAnimations;
  late AnimationController _floatingController;

  final List<OnboardingData> _onboardingPages = [
    OnboardingData(
      title: 'Discover Your\nSoulmate',
      subtitle: 'Smart AI Matching',
      description:
          'Experience intelligent matchmaking designed exclusively for the Banjara community with advanced compatibility algorithms',
      lottieAsset: '💕',
      gradient: [Color(0xFFE94057), Color(0xFF8A2387)],
      accentColor: Color(0xFFFF6B9D),
      features: [
        FeatureItem(
          icon: Icons.psychology_rounded,
          title: 'AI-Powered Compatibility',
          description: 'Advanced matching algorithm',
        ),
        FeatureItem(
          icon: Icons.verified_user_rounded,
          title: 'Verified Profiles',
          description: '100% authentic members',
        ),
        FeatureItem(
          icon: Icons.people_rounded,
          title: 'Community First',
          description: 'Banjara traditions & values',
        ),
      ],
    ),
    OnboardingData(
      title: 'Connect With\nConfidence',
      subtitle: 'Safe & Secure Platform',
      description:
          'Build meaningful relationships through secure messaging, voice & video calls in a trusted environment',
      lottieAsset: '💬',
      gradient: [Color(0xFF667eea), Color(0xFF764ba2)],
      accentColor: Color(0xFF8E9FFF),
      features: [
        FeatureItem(
          icon: Icons.shield_rounded,
          title: 'Privacy Protected',
          description: 'Your data is always secure',
        ),
        FeatureItem(
          icon: Icons.video_call_rounded,
          title: 'Video Meetings',
          description: 'Face-to-face conversations',
        ),
        FeatureItem(
          icon: Icons.chat_bubble_rounded,
          title: 'Instant Messaging',
          description: 'Real-time communication',
        ),
      ],
    ),
    OnboardingData(
      title: 'Begin Your\nLove Story',
      subtitle: 'Where Tradition Meets Technology',
      description: 'Join thousands of successful matches in the Banjara community. Your perfect partner awaits!',
      lottieAsset: '🎊',
      gradient: [Color(0xFFf093fb), Color(0xFFf5576c)],
      accentColor: Color(0xFFFF8DC7),
      features: [
        FeatureItem(
          icon: Icons.favorite_rounded,
          title: 'Success Stories',
          description: '10,000+ happy couples',
        ),
        FeatureItem(
          icon: Icons.family_restroom_rounded,
          title: 'Family Focused',
          description: 'Involving loved ones',
        ),
        FeatureItem(
          icon: Icons.celebration_rounded,
          title: 'Cultural Harmony',
          description: 'Preserving heritage',
        ),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();

    // Animation controllers for each page
    _animationControllers = List.generate(
      _onboardingPages.length,
      (index) => AnimationController(
        duration: const Duration(milliseconds: 1200),
        vsync: this,
      ),
    );

    _fadeAnimations = _animationControllers
        .map((controller) => Tween<double>(begin: 0.0, end: 1.0).animate(
              CurvedAnimation(parent: controller, curve: Curves.easeInOut),
            ))
        .toList();

    _slideAnimations = _animationControllers
        .map((controller) => Tween<Offset>(
              begin: const Offset(0, 0.5),
              end: Offset.zero,
            ).animate(
              CurvedAnimation(parent: controller, curve: Curves.easeOutCubic),
            ))
        .toList();

    // Floating animation for decorative elements
    _floatingController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat(reverse: true);

    _animationControllers[0].forward();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _floatingController.dispose();
    for (var controller in _animationControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _onPageChanged(int index) {
    setState(() {
      _currentPage = index;
    });
    _animationControllers[index].forward();
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Animated background gradients
          ...List.generate(
            3,
            (index) => AnimatedBuilder(
              animation: _floatingController,
              builder: (context, child) {
                return Positioned(
                  top: screenHeight * (0.1 + index * 0.3) +
                      (math.sin(_floatingController.value * 2 * math.pi + index) * 30),
                  right: -100 + (index * 50),
                  child: Opacity(
                    opacity: 0.05,
                    child: Container(
                      width: 200 + (index * 50),
                      height: 200 + (index * 50),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: _onboardingPages[_currentPage].gradient,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Top bar with skip and logo
                Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Logo
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [cPrimary, cPrimary.withOpacity(0.7)],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.favorite,
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'BanjaraMatch',
                            style: MyTextStyle.gilroyBold(
                              size: 18,
                              color: cDarkText,
                            ),
                          ),
                        ],
                      ),
                      // Skip button
                      if (_currentPage < _onboardingPages.length - 1)
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: TextButton(
                            onPressed: () {
                              _pageController.animateToPage(
                                _onboardingPages.length - 1,
                                duration: const Duration(milliseconds: 400),
                                curve: Curves.easeInOut,
                              );
                            },
                            child: Text(
                              'Skip',
                              style: MyTextStyle.gilroySemiBold(
                                size: 14,
                                color: cLightText,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // Page indicator at top
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _onboardingPages.length,
                      (index) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 4,
                        width: _currentPage == index ? 32 : 16,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(2),
                          gradient: _currentPage == index
                              ? LinearGradient(
                                  colors: _onboardingPages[_currentPage].gradient,
                                )
                              : null,
                          color: _currentPage == index ? null : Colors.grey.shade300,
                        ),
                      ),
                    ),
                  ),
                ),

                // PageView
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    onPageChanged: _onPageChanged,
                    itemCount: _onboardingPages.length,
                    itemBuilder: (context, index) {
                      return AnimatedBuilder(
                        animation: _animationControllers[index],
                        builder: (context, child) {
                          return FadeTransition(
                            opacity: _fadeAnimations[index],
                            child: SlideTransition(
                              position: _slideAnimations[index],
                              child: OnboardingPage(
                                data: _onboardingPages[index],
                                pageIndex: index,
                                floatingAnimation: _floatingController,
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),

                // Bottom action buttons
                Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    children: [
                      // Main CTA button
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        width: double.infinity,
                        height: 60,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: _onboardingPages[_currentPage].gradient,
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [
                            BoxShadow(
                              color: _onboardingPages[_currentPage].gradient[0].withOpacity(0.4),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(30),
                            onTap: () {
                              if (_currentPage < _onboardingPages.length - 1) {
                                _pageController.nextPage(
                                  duration: const Duration(milliseconds: 400),
                                  curve: Curves.easeInOut,
                                );
                              } else {
                                Get.off(() => const LoginScreen(), transition: Transition.fadeIn);
                              }
                            },
                            child: Center(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    _currentPage < _onboardingPages.length - 1 ? 'Continue' : 'Get Started',
                                    style: MyTextStyle.gilroyBold(
                                      size: 18,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(
                                    Icons.arrow_forward_rounded,
                                    color: Colors.white,
                                    size: 22,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Progress text
                      Text(
                        '${_currentPage + 1} of ${_onboardingPages.length}',
                        style: MyTextStyle.gilroyMedium(
                          size: 14,
                          color: cLightText,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class OnboardingData {
  final String title;
  final String subtitle;
  final String description;
  final String lottieAsset;
  final List<Color> gradient;
  final Color accentColor;
  final List<FeatureItem> features;

  OnboardingData({
    required this.title,
    required this.subtitle,
    required this.description,
    required this.lottieAsset,
    required this.gradient,
    required this.accentColor,
    required this.features,
  });
}

class FeatureItem {
  final IconData icon;
  final String title;
  final String description;

  FeatureItem({
    required this.icon,
    required this.title,
    required this.description,
  });
}

class OnboardingPage extends StatelessWidget {
  final OnboardingData data;
  final int pageIndex;
  final AnimationController floatingAnimation;

  const OnboardingPage({
    Key? key,
    required this.data,
    required this.pageIndex,
    required this.floatingAnimation,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: Column(
          children: [
            const SizedBox(height: 20),

            // Hero illustration with floating animation
            AnimatedBuilder(
              animation: floatingAnimation,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(
                    0,
                    math.sin(floatingAnimation.value * 2 * math.pi) * 10,
                  ),
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0.0, end: 1.0),
                    duration: const Duration(milliseconds: 1200),
                    curve: Curves.elasticOut,
                    builder: (context, value, child) {
                      return Transform.scale(
                        scale: value,
                        child: Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              colors: [
                                data.gradient[0].withOpacity(0.15),
                                data.gradient[1].withOpacity(0.05),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                          ),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              // Outer ring
                              Container(
                                width: 140,
                                height: 140,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: data.accentColor.withOpacity(0.2),
                                    width: 2,
                                  ),
                                ),
                              ),
                              // Inner gradient circle
                              Container(
                                width: 140,
                                height: 140,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                    colors: data.gradient,
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: data.gradient[0].withOpacity(0.4),
                                      blurRadius: 40,
                                      offset: const Offset(0, 20),
                                    ),
                                  ],
                                ),
                                child: Center(
                                  child: Text(
                                    data.lottieAsset,
                                    style: const TextStyle(fontSize: 80),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),

            const SizedBox(height: 24),

            // Title with premium styling
            ShaderMask(
              shaderCallback: (bounds) => LinearGradient(
                colors: data.gradient,
              ).createShader(bounds),
              child: Text(
                data.title,
                textAlign: TextAlign.center,
                style: MyTextStyle.gilroyBold(
                  size: 28,
                  color: Colors.white,
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Subtitle with accent
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(
                color: data.accentColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: data.accentColor.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Text(
                data.subtitle,
                textAlign: TextAlign.center,
                style: MyTextStyle.gilroySemiBold(
                  size: 14,
                  color: data.gradient[0],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Description
            Text(
              data.description,
              textAlign: TextAlign.center,
              style: MyTextStyle.gilroyMedium(
                size: 15,
                color: cLightText,
              ),
            ),

            const SizedBox(height: 16),

            // Features list with cards
            ...List.generate(
              data.features.length,
              (index) => TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.0, end: 1.0),
                duration: Duration(milliseconds: 800 + (index * 200)),
                curve: Curves.easeOutCubic,
                builder: (context, value, child) {
                  return Transform.translate(
                    offset: Offset(0, 30 * (1 - value)),
                    child: Opacity(
                      opacity: value,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.grey.shade200,
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: data.gradient[0].withOpacity(0.08),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            // Icon container
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    data.gradient[0].withOpacity(0.15),
                                    data.gradient[1].withOpacity(0.15),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                data.features[index].icon,
                                color: data.gradient[0],
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 16),
                            // Text content
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    data.features[index].title,
                                    style: MyTextStyle.gilroySemiBold(
                                      size: 15,
                                      color: cDarkText,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    data.features[index].description,
                                    style: MyTextStyle.gilroyMedium(
                                      size: 13,
                                      color: cLightText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Checkmark
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: data.gradient,
                                ),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.check,
                                color: Colors.white,
                                size: 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
