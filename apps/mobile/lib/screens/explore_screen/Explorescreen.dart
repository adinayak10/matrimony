import 'dart:convert';

import 'package:blur/blur.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shimmer/shimmer.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/models/model_trending_profiles_response.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/notification_screen/notification_screen.dart';
import 'package:banjaramatch/screens/personal_info_controller.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/search_profiles_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../../common/managers/navigation.dart';
import '../../common/widgets/my_cached_image.dart';
import '../member_card.dart';
import '../profile_screen/profile_controller.dart';
import '../tabbar/tabbar_controller.dart';
import 'ExplorerController.dart';

class ExplorePage extends StatelessWidget {
  final GlobalKey<ScaffoldState> scaffoldKey;

  ExplorePage(this.scaffoldKey, {Key? key}) : super(key: key);

  void _goToMatchesTab() {
    if (Get.isRegistered<TabBarController>()) {
      Get.find<TabBarController>().selectIndex(1);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: GetBuilder<ExploreController>(
        init: ExploreController(),
        builder: (controller) {
          return RefreshIndicator(
            onRefresh: () async {
              await controller.refreshAllData();
            },
            child: Column(
              children: [
                GetBuilder<ProfileController>(
                  builder: (profileController) {
                    return MatrimonyTopHeader(
                      profileImageUrl:
                          profileController.user?.profile ?? SessionManager.shared.getUser()?.profile ?? '',
                      fullName:
                          profileController.user?.fullName ?? SessionManager.shared.getUser()?.fullName ?? 'Guest',
                      membershipPlan: profileController.user?.membershipPlan?.name ??
                          SessionManager.shared.getUser()?.membershipPlan?.name ??
                          'Free',
                      isFreeUser: (profileController.user?.membershipPlan?.name ??
                                  SessionManager.shared.getUser()?.membershipPlan?.name ??
                                  'free')
                              .toLowerCase() ==
                          'free',
                      onProfileTap: () => scaffoldKey.currentState?.openDrawer(),
                      onEditTap: () => scaffoldKey.currentState?.openDrawer(),
                      onNotificationTap: () => Navigate.to(NotificationScreen()),
                      onSearchTap: () => Navigate.to(SearchUserScreen()),
                      onUpgradeTap: () => Navigator.pushNamed(context, '/membership'),
                    );
                  },
                ),
                controller.isLoading.value
                    ? _buildShimmerLoading()
                    : Expanded(
                        child: CustomScrollView(
                          controller: controller.scrollController,
                          physics: const BouncingScrollPhysics(),
                          slivers: [
                            // Enhanced Banner with Stories
                            SliverToBoxAdapter(
                              child: buildEnhancedBannerSection(controller),
                            ),

                            // // Premium Members Spotlight
                            // SliverToBoxAdapter(
                            //   child: buildEnhancedPremiumSection(controller),
                            // ),

                            // Live Activity Feed
                            SliverToBoxAdapter(
                              child: _buildLiveActivitySection(controller),
                            ),

                            // Enhanced New Matches with AI Suggestions
                            SliverToBoxAdapter(
                              child: buildEnhancedExploreUserSection(
                                title: "Recently Joined Profiles",
                                subtitle: "People who match your preferences and joined recently",
                                users: controller.newUsers,
                                icon: Icons.auto_awesome,
                                gradientColors: [Color(0xFFE8F5E8), Color(0xFFB8E6B8)],
                                onSeeAll: _goToMatchesTab,
                                showMatchPercentage: true,
                                showDistance: false,
                                showOnlineStatus: true,
                              ),
                            ),

                            // Recent Profile Visitors with Enhanced Info
                            SliverToBoxAdapter(
                              child: buildEnhancedExploreUserSection(
                                title: "Recent Visitors",
                                subtitle: "Members who viewed your profile in last 7 days",
                                users: controller.recentVisitors,
                                icon: Icons.visibility,
                                gradientColors: [Color(0xFFE8F0FF), Color(0xFFB8D4FF)],
                                onSeeAll: () {},
                                showViewedDate: true,
                                showMatchPercentage: true,
                              ),
                            ),

                            SliverToBoxAdapter(child: _buildAIRecommendationsSection(controller)),

                            // Who Shortlisted You with Enhanced CTA
                            SliverToBoxAdapter(
                              child: buildEnhancedExploreUserSection(
                                title: "Who Shortlisted You",
                                subtitle: "Members who added you to their favorites",
                                users: controller.usersshortlistedme,
                                icon: Icons.favorite,
                                gradientColors: [Color(0xFFFFE8F0), Color(0xFFFFB8D4)],
                                onSeeAll: () {},
                                showShortlistDate: true,
                                showCallToAction: true,
                              ),
                            ),

                            // Members Looking for You
                            SliverToBoxAdapter(
                              child: buildEnhancedExploreUserSection(
                                title: "Looking for You",
                                subtitle: "Profiles matching your criteria who are actively searching",
                                users: controller.membersLookingForMe,
                                icon: Icons.supervised_user_circle,
                                gradientColors: [Color(0xFFF7E8FF), Color(0xFFD2B8FF)],
                                onSeeAll: _goToMatchesTab,
                                showMatchPercentage: true,
                                showActiveStatus: true,
                              ),
                            ),

                            // // Enhanced Nearby with Map Integration
                            // SliverToBoxAdapter(
                            //   child: _buildInteractiveNearbySection(controller),
                            // ),

                            // Trending This Week
                            SliverToBoxAdapter(
                              child: _buildTrendingSection(controller),
                            ),

                            // Your Activity Section
                            SliverToBoxAdapter(
                              child: buildEnhancedExploreUserSection(
                                title: "Your Favorites",
                                subtitle: "Profiles you've liked and saved for later",
                                users: controller.myShortListUsers,
                                icon: Icons.heart_broken,
                                gradientColors: [Color(0xFFFFF0E8), Color(0xFFFFD4B8)],
                                onSeeAll: () {},
                                showShortlistDate: true,
                              ),
                            ),

                            // Recently Viewed with Better Tracking
                            SliverToBoxAdapter(
                              child: buildEnhancedExploreUserSection(
                                title: "Recently Viewed",
                                subtitle: "Profiles you've checked out recently",
                                users: controller.recentViewedUsers,
                                icon: Icons.history,
                                gradientColors: [Color(0xFFF0F0FF), Color(0xFFD4D4FF)],
                                onSeeAll: () {},
                                showViewedDate: true,
                                showRevisitCTA: true,
                              ),
                            ),

                            // // Premium Recommendations
                            // SliverToBoxAdapter(
                            //   child: _buildPremiumRecommendations(controller),
                            // ),

                            // Footer with Tips
                            SliverToBoxAdapter(
                              child: _buildFooterTipsSection(),
                            ),

                            // Bottom padding
                            SliverToBoxAdapter(
                              child: SizedBox(height: 100),
                            ),
                          ],
                        ),
                      ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildShimmerLoading() {
    return Expanded(
      child: CustomScrollView(
        physics: const NeverScrollableScrollPhysics(),
        slivers: [
          // Banner shimmer
          SliverToBoxAdapter(
            child: _buildBannerShimmer(),
          ),

          // Profile completion shimmer
          SliverToBoxAdapter(
            child: _buildProfileCompletionShimmer(),
          ),

          // Section shimmers (repeating)
          SliverToBoxAdapter(
            child: Column(
              children: [
                _buildSectionShimmer("Recently Joined Profiles"),
                SizedBox(height: 16),
                _buildSectionShimmer("Recent Visitors"),
                SizedBox(height: 16),
                _buildSectionShimmer("AI Recommendations"),
                SizedBox(height: 16),
                _buildTrendingShimmer(),
                SizedBox(height: 16),
                _buildSectionShimmer("Your Favorites"),
                SizedBox(height: 100),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderShimmer() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(100),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 120,
                    height: 16,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: 80,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBannerShimmer() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          children: [
            Container(
              height: 180,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                3,
                (index) => Container(
                  width: index == 0 ? 24 : 8,
                  height: 8,
                  margin: EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileCompletionShimmer() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        padding: EdgeInsets.all(12),
        margin: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 100,
                  height: 12,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                Container(
                  width: 30,
                  height: 12,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
            SizedBox(height: 8),
            Container(
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionShimmer(String sectionTitle) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    shape: BoxShape.circle,
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 180,
                        height: 16,
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      SizedBox(height: 6),
                      Container(
                        width: 240,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: NeverScrollableScrollPhysics(),
              child: Row(
                children: List.generate(
                  4,
                  (index) => Container(
                    width: 140,
                    margin: EdgeInsets.only(right: 16),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      children: [
                        Container(
                          margin: EdgeInsets.all(4),
                          width: 132,
                          height: 140,
                          decoration: BoxDecoration(
                            color: Colors.grey[300],
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        Padding(
                          padding: EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 90,
                                height: 14,
                                decoration: BoxDecoration(
                                  color: Colors.grey[300],
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                              SizedBox(height: 6),
                              Container(
                                width: 60,
                                height: 12,
                                decoration: BoxDecoration(
                                  color: Colors.grey[300],
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                            ],
                          ),
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
    );
  }

  Widget _buildTrendingShimmer() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    shape: BoxShape.circle,
                  ),
                ),
                SizedBox(width: 8),
                Container(
                  width: 140,
                  height: 18,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: NeverScrollableScrollPhysics(),
              child: Row(
                children: List.generate(
                  3,
                  (index) => Container(
                    width: 170,
                    margin: EdgeInsets.only(right: 16),
                    child: Container(
                      padding: EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Column(
                        children: [
                          Container(
                            width: 140,
                            height: 180,
                            decoration: BoxDecoration(
                              color: Colors.grey[300],
                              borderRadius: BorderRadius.circular(20),
                            ),
                          ),
                          SizedBox(height: 16),
                          Container(
                            width: 100,
                            height: 16,
                            decoration: BoxDecoration(
                              color: Colors.grey[300],
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          SizedBox(height: 8),
                          Container(
                            width: 80,
                            height: 12,
                            decoration: BoxDecoration(
                              color: Colors.grey[300],
                              borderRadius: BorderRadius.circular(4),
                            ),
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
    );
  }

  Widget buildEnhancedBannerSection(ExploreController controller) {
    if (controller.banners.isEmpty) return SizedBox.shrink();

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Column(
        children: [
          ClipSmoothRect(
            radius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 20, cornerSmoothing: 0.6)),
            child: SizedBox(
              height: 180,
              child: PageView.builder(
                controller: controller.bannerController,
                itemCount: controller.banners.length,
                itemBuilder: (context, index) {
                  return Stack(
                    fit: StackFit.expand,
                    children: [
                      MyCachedImageWthoutBaseUrl(
                        imageUrl: controller.banners[index].imageUrl,
                        width: double.infinity,
                        height: 240,
                      ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withOpacity(0.2),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 20,
                        left: 20,
                        right: 20,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Text(
                            //   controller.banners.isNotEmpty
                            //       ? (controller.banners[index].title ?? "Find Your Soulmate")
                            //       : "Find Your Perfect Match Today",
                            //   style: MyTextStyle.gilroyBold(color: Colors.white, size: 24),
                            // ),
                            // SizedBox(height: 4),
                            // Text(
                            //   "Join thousands of happy couples who found love here",
                            //   style: MyTextStyle.gilroyRegular(color: Colors.white.withOpacity(0.9), size: 14),
                            // ),
                            SizedBox(height: 12),
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: cPrimary,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                controller.banners[index].title ?? "Find Your Soulmate",
                                style: MyTextStyle.gilroyBold(color: Colors.white, size: 10),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
          SizedBox(height: 16),
          // Enhanced banner indicators
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              controller.banners.length,
              (index) => AnimatedContainer(
                duration: Duration(milliseconds: 300),
                width: index == 0 ? 24 : 8,
                height: 8,
                margin: EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  color: index == 0 ? cPrimary : Colors.grey.withOpacity(0.3),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget buildEnhancedPremiumSection(ExploreController controller) {
    if (controller.premiumMembers.isEmpty) return SizedBox.shrink();

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFFFE0B2), Color(0xFFFF9800)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.orange.withOpacity(0.3),
            blurRadius: 15,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.diamond, color: Colors.white, size: 28),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Premium Members",
                      style: MyTextStyle.gilroyBold(color: Colors.white, size: 20),
                    ),
                    Text(
                      "Verified profiles with enhanced features",
                      style: MyTextStyle.gilroyRegular(color: Colors.white.withOpacity(0.9), size: 14),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 16),
          MemberCard(
            isFetching: controller.isLoading.value,
            memberList: controller.premiumMembers,
            controller: controller.bannerController,
          ),
        ],
      ),
    );
  }

  Widget _buildLiveActivitySection(ExploreController controller) {
    if (controller.liveActivities.isEmpty) {
      return SizedBox.shrink(); // Don't show anything if empty
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFF0F9FF), Color(0xFFF5F3FF)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDDE7FF)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1D4ED8).withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, 8),
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
                  color: const Color(0xFF1D4ED8),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 16),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Live Activity",
                      style: MyTextStyle.gilroyBold(color: cDarkText, size: 18),
                    ),
                    Text(
                      "Real-time actions from active members",
                      style: MyTextStyle.gilroyRegular(color: cLightText, size: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: controller.liveActivities.map((activity) {
                return GestureDetector(
                  onTap: () {
                    Get.to(ProfileScreen(userId: activity.userId));
                  },
                  child: _buildActivityCard(activity.title, activity.timeAgo, activity.icon),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityCard(String title, String time, String icon) {
    return Container(
      width: 250,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFFFFF), Color(0xFFF8FAFF)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: const Color(0xFFDBEAFE),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: CachedNetworkImage(
                imageUrl: icon,
                height: 20,
                width: 20,
                fit: BoxFit.contain,
                placeholder: (context, url) => const SizedBox(
                  height: 14,
                  width: 14,
                  child: Center(child: CircularProgressIndicator(strokeWidth: 1)),
                ),
                errorWidget: (context, url, error) => const Icon(Icons.flash_on_rounded, size: 18),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: MyTextStyle.gilroySemiBold(color: cDarkText, size: 13),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    time,
                    style: MyTextStyle.gilroyRegular(color: const Color(0xFF1D4ED8), size: 10),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget buildEnhancedExploreUserSection({
    required String title,
    required String subtitle,
    required List<User> users,
    required VoidCallback onSeeAll,
    required IconData icon,
    required List<Color> gradientColors,
    bool showMatchPercentage = false,
    bool showDistance = false,
    bool showOnlineStatus = false,
    bool showViewedDate = false,
    bool showShortlistDate = false,
    bool showCallToAction = false,
    bool showRevisitCTA = false,
    bool showActiveStatus = false,
  }) {
    // If no real users, create mock data for demonstration
    List<User> displayUsers = users;

    if (displayUsers.isEmpty) return SizedBox();

    int displayCount = displayUsers.length > 5 ? 5 : displayUsers.length;
    int remaining = displayUsers.length - 4;

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: gradientColors[0].withOpacity(0.3),
            blurRadius: 15,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.9),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: cPrimary, size: 20),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: MyTextStyle.gilroyBold(color: cDarkText, size: 16),
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: MyTextStyle.gilroySemiBold(color: cLightText, size: 12),
                        softWrap: true,
                        overflow: TextOverflow.ellipsis,
                        maxLines: 2,
                      ),
                    ],
                  ),
                ),
                if (displayUsers.length > 5)
                  GestureDetector(
                    onTap: onSeeAll,
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            "View All",
                            style: MyTextStyle.gilroyMedium(color: cPrimary, size: 12),
                          ),
                          SizedBox(width: 4),
                          Icon(Icons.arrow_forward_ios, color: cPrimary, size: 12),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(displayCount, (index) {
                  bool isLast = index == 4 && displayUsers.length > 5;
                  return GestureDetector(
                    onTap: () => isLast ? onSeeAll() : _onUserCardTap(displayUsers[index]),
                    child: Padding(
                      padding: const EdgeInsets.only(right: 16),
                      child: _buildEnhancedUserCard(
                        displayUsers[index],
                        isBlurred: isLast,
                        remaining: remaining,
                        showMatchPercentage: showMatchPercentage,
                        showDistance: showDistance,
                        showOnlineStatus: showOnlineStatus,
                        showViewedDate: showViewedDate,
                        showShortlistDate: showShortlistDate,
                        showCallToAction: showCallToAction,
                        showRevisitCTA: showRevisitCTA,
                        showActiveStatus: showActiveStatus,
                      ),
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _onUserCardTap(User user) {
    Get.to(ProfileScreen(userId: user.id!));
  }

  Widget _buildInteractiveNearbySection(ExploreController controller) {
    List<User> nearbyUsers = controller.nearbyUsers;

    if (nearbyUsers.isEmpty) return SizedBox();

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.location_on, color: Colors.red, size: 24),
              SizedBox(width: 8),
              Text(
                "Nearby Matches",
                style: MyTextStyle.gilroyBold(color: cDarkText, size: 18),
              ),
              Spacer(),
              GestureDetector(
                onTap: () {
                  // Toggle map view
                },
                child: Container(
                  padding: EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: cPrimary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.map, color: cPrimary, size: 16),
                      SizedBox(width: 4),
                      Text(
                        "Map View",
                        style: MyTextStyle.gilroyMedium(color: cPrimary, size: 12),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 16),
          Container(
            height: 320,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFFFE0E6), Color(0xFFFFF0F5)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Stack(
              children: [
                // Mock map background with location markers
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    color: Color(0xFFE8F5E8).withOpacity(0.5),
                  ),
                  child: CustomPaint(
                    painter: MapPatternPainter(),
                    size: Size.infinite,
                  ),
                ),
                // User cards floating on map
                ...List.generate(
                  nearbyUsers.take(4).length,
                  (index) => Positioned(
                    left: 30.0 + (index * 80),
                    top: 60.0 + ((index % 2) * 80),
                    child: _buildFloatingUserCard(nearbyUsers[index], "${(index + 1) * 2} km"),
                  ),
                ),
                // Distance filter
                Positioned(
                  top: 16,
                  right: 16,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 8,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.tune, color: cPrimary, size: 16),
                        SizedBox(width: 4),
                        Text(
                          "Within 10km",
                          style: MyTextStyle.gilroyMedium(color: cPrimary, size: 12),
                        ),
                      ],
                    ),
                  ),
                ),
                // View all button
                Positioned(
                  bottom: 16,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: cPrimary,
                      borderRadius: BorderRadius.circular(25),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 8,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.explore, color: Colors.white, size: 16),
                        SizedBox(width: 8),
                        Text(
                          "Explore All Nearby Matches",
                          style: MyTextStyle.gilroyBold(color: Colors.white, size: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingUserCard(User user, String distance) {
    return Container(
      width: 90,
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Stack(
              children: [
                ClipOval(
                  child: MyCachedImage(
                    imageUrl: user.profile ?? "",
                    width: 60,
                    height: 60,
                  ),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 6),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ],
            ),
            child: Column(
              children: [
                Text(
                  user.fullName?.split(' ').first ?? 'Unknown',
                  style: MyTextStyle.gilroyBold(color: cDarkText, size: 10),
                  textAlign: TextAlign.center,
                ),
                Text(
                  distance,
                  style: MyTextStyle.gilroyRegular(color: cLightText, size: 8),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendingSection(ExploreController controller) {
    if (controller.trendingUsers.isEmpty) {
      return Container();
    }

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFE1F5FE), Color(0xFFF3E5F5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.trending_up, color: Colors.purple, size: 24),
              SizedBox(width: 8),
              Text(
                "Trending This Week",
                style: MyTextStyle.gilroyBold(color: cDarkText, size: 18),
              ),
            ],
          ),
          SizedBox(height: 16),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(controller.trendingUsers.length, (index) {
                return _buildTrendingCard(controller.trendingUsers[index], index);
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendingCard(Result data, int index) {
    // Helper to convert hex string to Color
    Color hexToColor(String hex) {
      hex = hex.replaceAll("#", "");
      if (hex.length == 6) hex = "FF$hex"; // add opacity if missing
      return Color(int.parse(hex, radix: 16));
    }

    final gradientColors = data.gradient?.map((c) => hexToColor(c)).toList() ?? [Colors.blue, Colors.blueAccent];
    final bgGradientColors = data.bgGradient?.map((c) => hexToColor(c)).toList() ??
        [Colors.blue.withOpacity(0.1), Colors.blue.withOpacity(0.05)];

    final user = data.user;

    return GestureDetector(
      onTap: () {
        Get.to(ProfileScreen(userId: user?.id ?? ""));
      },
      child: Container(
        width: 170,
        margin: EdgeInsets.only(right: 16),
        child: AnimatedContainer(
          duration: Duration(milliseconds: 300),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: bgGradientColors,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: gradientColors[0].withOpacity(0.15),
                  blurRadius: 20,
                  offset: Offset(0, 10),
                  spreadRadius: -5,
                ),
                BoxShadow(
                  color: Colors.white.withOpacity(0.8),
                  blurRadius: 16,
                  offset: Offset(0, -2),
                  spreadRadius: -8,
                ),
              ],
              border: Border.all(
                color: gradientColors[0].withOpacity(0.1),
                width: 1.5,
              ),
            ),
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Profile Image with Premium Frame
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    // Soft glow background
                    Container(
                      width: 140,
                      height: 180,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: RadialGradient(
                          center: Alignment.center,
                          radius: 1.2,
                          colors: [
                            gradientColors[0].withOpacity(0.1),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),

                    // Main image container
                    Container(
                      width: 140,
                      height: 180,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withOpacity(0.1),
                          ],
                          stops: [0.6, 1.0],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: gradientColors[0].withOpacity(0.2),
                            blurRadius: 16,
                            offset: Offset(0, 8),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: Stack(
                          children: [
                            MyCachedProfileImage(
                              imageUrl: user?.profile,
                              width: 140,
                              height: 180,
                            ),
                            // Subtle gradient overlay
                            Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.transparent,
                                    Colors.black.withOpacity(0.05),
                                  ],
                                  stops: [0.7, 1.0],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Premium ranking badge
                    Positioned(
                      top: -5,
                      left: -5,
                      child: Container(
                        padding: EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: gradientColors,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: gradientColors[0].withOpacity(0.4),
                              blurRadius: 12,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _getIconForLabel(data.label),
                              color: Colors.white,
                              size: 14,
                            ),
                            SizedBox(width: 4),
                            Text(
                              "#${index + 1}",
                              style: MyTextStyle.gilroyBold(
                                color: Colors.white,
                                size: 12,
                              ).copyWith(
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Verification badge
                    if (user?.verified ?? false)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Color(0xFF4CAF50).withOpacity(0.3),
                                blurRadius: 8,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                          child: Icon(
                            Icons.verified,
                            color: Color(0xFF4CAF50),
                            size: 16,
                          ),
                        ),
                      ),

                    // Shortlist/Like button
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: GetBuilder<ExploreController>(
                        builder: (controller) {
                          final isShortlisted = user?.isShortListed == true;
                          return GestureDetector(
                            onTap: () {
                              if (user?.id != null) {
                                controller.toggleShortlistTrending(user!.id!, index);
                              }
                            },
                            child: Container(
                              padding: EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isShortlisted
                                    ? Color(0xFFE91E63).withOpacity(0.95)
                                    : Colors.white.withOpacity(0.95),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: isShortlisted
                                        ? Color(0xFFE91E63).withOpacity(0.3)
                                        : Colors.black.withOpacity(0.1),
                                    blurRadius: 8,
                                    offset: Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Icon(
                                isShortlisted ? Icons.favorite : Icons.favorite_border,
                                color: isShortlisted ? Colors.white : Color(0xFFE91E63),
                                size: 18,
                              ),
                            ),
                          );
                        },
                      ),
                    ),

                    // Online status indicator (only show if user is online)
                    if (user?.isOnline == true)
                      Positioned(
                        bottom: 8,
                        left: 8,
                        child: Container(
                          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Color(0xFF4CAF50),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Color(0xFF4CAF50).withOpacity(0.3),
                                blurRadius: 6,
                                offset: Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              SizedBox(width: 4),
                              Text(
                                "Online",
                                style: MyTextStyle.gilroyBold(
                                  color: Colors.white,
                                  size: 9,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),

                SizedBox(height: 16),

                // User Information
                Column(
                  children: [
                    // Name and Age
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Flexible(
                          child: Text(
                            user?.name ?? "Unknown",
                            style: MyTextStyle.gilroyBold(
                              color: Color(0xFF2A2A2A),
                              size: 16,
                            ).copyWith(
                              height: 1.2,
                              letterSpacing: -0.3,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        SizedBox(width: 6),
                        if (user?.dob != null)
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: gradientColors[0].withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              calculateAge(user!.dob!).toString(),
                              style: MyTextStyle.gilroySemiBold(
                                color: gradientColors[0],
                                size: 12,
                              ),
                            ),
                          ),
                      ],
                    ),

                    SizedBox(height: 6),

                    // Profession
                    Text(
                      user?.profession ?? "",
                      style: MyTextStyle.gilroyMedium(
                        color: Color(0xFF666666),
                        size: 12,
                      ).copyWith(
                        letterSpacing: 0.1,
                      ),
                      textAlign: TextAlign.center,
                    ),

                    SizedBox(height: 4),

                    // Location
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.location_on,
                          color: Color(0xFF999999),
                          size: 12,
                        ),
                        SizedBox(width: 2),
                        Text(
                          user?.location ?? "",
                          style: MyTextStyle.gilroyRegular(
                            color: Color(0xFF999999),
                            size: 11,
                          ),
                        ),
                      ],
                    ),

                    SizedBox(height: 12),

                    // Trending reason badge
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            gradientColors[0].withOpacity(0.15),
                            gradientColors[1].withOpacity(0.05),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: gradientColors[0].withOpacity(0.2),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _getIconForLabel(data.label),
                            color: gradientColors[0],
                            size: 12,
                          ),
                          SizedBox(width: 4),
                          Text(
                            data.label ?? "",
                            style: MyTextStyle.gilroySemiBold(
                              color: gradientColors[0],
                              size: 11,
                            ).copyWith(
                              letterSpacing: 0.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

// Helper method to get the icon based on label string
  IconData _getIconForLabel(String? label) {
    switch (label?.toLowerCase()) {
      case "most viewed":
        return Icons.visibility;
      case "most liked":
        return Icons.favorite;
      case "new member":
        return Icons.new_releases;
      case "active user":
        return Icons.bolt;
      case "featured":
        return Icons.star;
      default:
        return Icons.star; // default icon
    }
  }

  Widget _buildPremiumRecommendations(ExploreController controller) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1A237E), Color(0xFF3F51B5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.3),
            blurRadius: 15,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.star, color: Colors.amber, size: 28),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Premium Recommendations",
                      style: MyTextStyle.gilroyBold(color: Colors.white, size: 18),
                    ),
                    Text(
                      "Unlock exclusive matches with premium membership",
                      style: MyTextStyle.gilroyRegular(color: Colors.white.withOpacity(0.8), size: 14),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildPremiumFeature("Priority Matches", Icons.flash_on),
              ),
              SizedBox(width: 16),
              Expanded(
                child: _buildPremiumFeature("Advanced Filters", Icons.tune),
              ),
              SizedBox(width: 16),
              Expanded(
                child: _buildPremiumFeature("Unlimited Likes", Icons.favorite),
              ),
            ],
          ),
          SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: Colors.amber,
              borderRadius: BorderRadius.circular(25),
            ),
            child: Text(
              "Upgrade to Premium",
              style: MyTextStyle.gilroyBold(color: Colors.white, size: 16),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPremiumFeature(String title, IconData icon) {
    return Column(
      children: [
        Container(
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: Colors.white, size: 24),
        ),
        SizedBox(height: 8),
        Text(
          title,
          style: MyTextStyle.gilroyMedium(color: Colors.white, size: 12),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildFooterTipsSection() {
    return Container(
      margin: EdgeInsets.all(16),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.lightbulb, color: Colors.amber, size: 24),
              SizedBox(width: 8),
              Text(
                "Profile Tips",
                style: MyTextStyle.gilroyBold(color: cDarkText, size: 18),
              ),
            ],
          ),
          SizedBox(height: 16),
          _buildTipItem("Add more photos to get 3x more profile views"),
          _buildTipItem("Complete your profile to increase match quality"),
          _buildTipItem("Be active daily to appear in more searches"),
          _buildTipItem("Respond to messages quickly to build connections"),
          SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: cPrimary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(25),
              border: Border.all(color: cPrimary.withOpacity(0.3)),
            ),
            child: Text(
              "Improve Your Profile",
              style: MyTextStyle.gilroyBold(color: cPrimary, size: 14),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTipItem(String tip) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 6,
            height: 6,
            margin: EdgeInsets.only(top: 6, right: 12),
            decoration: BoxDecoration(
              color: cPrimary,
              shape: BoxShape.circle,
            ),
          ),
          Expanded(
            child: Text(
              tip,
              style: MyTextStyle.gilroyRegular(color: cDarkText, size: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEnhancedUserCard(
    User user, {
    bool isBlurred = false,
    int remaining = 0,
    bool showMatchPercentage = false,
    bool showDistance = false,
    bool showOnlineStatus = false,
    bool showViewedDate = false,
    bool showShortlistDate = false,
    bool showCallToAction = false,
    bool showRevisitCTA = false,
    bool showActiveStatus = false,
  }) {
    Widget image = ClipSmoothRect(
      radius: const SmoothBorderRadius.all(SmoothRadius(cornerRadius: 16, cornerSmoothing: 0.6)),
      child: Stack(
        children: [
          MyCachedImage(imageUrl: user.profile ?? "", width: 140, height: 140),
          if (!isBlurred && showOnlineStatus)
            // Positioned(
            //   bottom: 8,
            //   left: 8,
            //   child: Container(
            //     padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            //     decoration: BoxDecoration(
            //       color: Colors.green,
            //       borderRadius: BorderRadius.circular(10),
            //     ),
            //     child: Row(
            //       mainAxisSize: MainAxisSize.min,
            //       children: [
            //         Container(
            //           width: 4,
            //           height: 4,
            //           decoration: BoxDecoration(
            //             color: Colors.white,
            //             shape: BoxShape.circle,
            //           ),
            //         ),
            //         SizedBox(width: 4),
            //         Text(
            //           "Online",
            //           style: MyTextStyle.gilroyBold(color: Colors.white, size: 8),
            //         ),
            //       ],
            //     ),
            //   ),
            // ),
            if (!isBlurred)
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding: EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.9),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.favorite_border, color: cPrimary, size: 14),
                ),
              ),
        ],
      ),
    );

    if (isBlurred) {
      image = image.blurred(
        blur: 4,
        colorOpacity: 0.25,
        borderRadius: BorderRadius.circular(16),
        overlay: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_circle, color: Colors.white, size: 32),
              SizedBox(height: 4),
              Text(
                "+$remaining\nMore",
                textAlign: TextAlign.center,
                style: MyTextStyle.gilroyBold(color: Colors.white, size: 14),
              ),
            ],
          ),
        ),
      );
    }

    int? age;
    if (user.dob != null) {
      final birthDate = DateTime.tryParse(user.dob!);
      if (birthDate != null) {
        final now = DateTime.now();
        age = now.year - birthDate.year;
        if (now.month < birthDate.month || (now.month == birthDate.month && now.day < birthDate.day)) {
          age--;
        }
      }
    }

    String? viewedDate;
    if (showViewedDate && user.lastVisitedAt != null) {
      final date = DateTime.tryParse(user.lastVisitedAt!);
      if (date != null) {
        final now = DateTime.now();
        final difference = now.difference(date);
        if (difference.inDays == 0) {
          viewedDate = "Today";
        } else if (difference.inDays == 1) {
          viewedDate = "Yesterday";
        } else if (difference.inDays < 7) {
          viewedDate = "${difference.inDays} days ago";
        } else {
          viewedDate = "${date.day}/${date.month}/${date.year}";
        }
      }
    }

    return GestureDetector(
      onTap: () {
        if (!isBlurred) {
          Get.to(ProfileScreen(userId: user.id!));
        }
      },
      child: Container(
        width: 140,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 12,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            Padding(
              padding: EdgeInsets.all(4),
              child: image,
            ),
            Container(
              width: double.infinity,
              padding: EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user.fullName?.capitalizeFirst ?? 'Unknown',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: MyTextStyle.gilroyBold(color: cDarkText, size: 14),
                  ),
                  SizedBox(height: 4),
                  Row(
                    children: [
                      if (age != null)
                        Row(
                          children: [
                            Icon(Icons.cake, size: 12, color: cLightText),
                            SizedBox(width: 2),
                            Text(
                              "$age yrs",
                              style: MyTextStyle.gilroySemiBold(color: cLightText, size: 11),
                            ),
                          ],
                        ),
                      if (age != null && user.height != null)
                        Text(
                          " • ",
                          style: MyTextStyle.gilroySemiBold(color: cLightText, size: 11),
                        ),
                      if (user.height != null)
                        Text(
                          "${HeightConverter().cmToImperialString(user.height)}",
                          style: MyTextStyle.gilroySemiBold(color: cLightText, size: 11),
                        ),
                    ],
                  ),
                  if (showDistance) ...[
                    SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.location_on, size: 12, color: Colors.red),
                        SizedBox(width: 2),
                        Text(
                          "${2 + (user.id?.hashCode.abs() ?? 0) % 8} km away",
                          style: MyTextStyle.gilroyMedium(color: Colors.red, size: 11),
                        ),
                      ],
                    ),
                  ],
                  if (viewedDate != null) ...[
                    SizedBox(height: 6),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        "Viewed $viewedDate",
                        style: MyTextStyle.gilroyMedium(color: Colors.blue, size: 10),
                      ),
                    ),
                  ],
                  // if (showShortlistDate) ...[
                  //   SizedBox(height: 6),
                  //   Container(
                  //     padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  //     decoration: BoxDecoration(
                  //       color: Colors.pink.withOpacity(0.1),
                  //       borderRadius: BorderRadius.circular(8),
                  //     ),
                  //     child: Text(
                  //       "Liked 2d ago",
                  //       style: MyTextStyle.gilroyMedium(color: Colors.pink, size: 10),
                  //     ),
                  //   ),
                  // ],
                  if (showCallToAction) ...[
                    SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.symmetric(vertical: 6),
                      decoration: BoxDecoration(
                        color: cPrimary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        "Connect Now",
                        style: MyTextStyle.gilroyBold(color: Colors.white, size: 12),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                  if (showRevisitCTA) ...[
                    SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.symmetric(vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.orange.withOpacity(0.3)),
                      ),
                      child: Text(
                        "View Again",
                        style: MyTextStyle.gilroyBold(color: Colors.orange, size: 12),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}

// Custom painter for map pattern
class MapPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    // Draw grid pattern to simulate map
    final double gridSize = 30;
    for (double i = 0; i < size.width; i += gridSize) {
      canvas.drawLine(
        Offset(i, 0),
        Offset(i, size.height),
        paint,
      );
    }
    for (double i = 0; i < size.height; i += gridSize) {
      canvas.drawLine(
        Offset(0, i),
        Offset(size.width, i),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}

class MatrimonyTopHeader extends StatelessWidget {
  final String profileImageUrl;
  final String fullName;
  final String membershipPlan;
  final bool isFreeUser;
  final VoidCallback onProfileTap;
  final VoidCallback onEditTap;
  final VoidCallback onNotificationTap;
  final VoidCallback onSearchTap;
  final VoidCallback onUpgradeTap;

  MatrimonyTopHeader({
    super.key,
    required this.profileImageUrl,
    required this.fullName,
    required this.membershipPlan,
    required this.isFreeUser,
    required this.onProfileTap,
    required this.onEditTap,
    required this.onNotificationTap,
    required this.onSearchTap,
    required this.onUpgradeTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SafeArea(
          child: Container(
            color: cWhite,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Stack(
                  children: [
                    GestureDetector(
                      onTap: onProfileTap,
                      child: ClipSmoothRect(
                        radius: const SmoothBorderRadius.all(SmoothRadius(cornerRadius: 100, cornerSmoothing: 1)),
                        child: MyCachedImage(
                          imageUrl: profileImageUrl,
                          width: 46,
                          height: 46,
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: onEditTap,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                            boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 2)],
                          ),
                          padding: const EdgeInsets.all(2),
                          child: const Icon(
                            CupertinoIcons.line_horizontal_3,
                            size: 14,
                            color: cPrimary,
                          ),
                        ),
                      ),
                    )
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fullName,
                        style: MyTextStyle.gilroyBold(size: 16, color: cDarkText),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            membershipPlan + " Member",
                            style: MyTextStyle.gilroyRegular(
                              size: 13,
                              color: membershipPlan.toLowerCase() == 'free' ? cDarkText : cPrimary,
                            ),
                          ),
                          // SizedBox(
                          //   width: 10,
                          // ),
                          // Container(
                          //   decoration: BoxDecoration(
                          //       border: Border.all(color: cRed, width: 1),
                          //       borderRadius: BorderRadius.all(Radius.circular(16))),
                          //   alignment: Alignment.center,
                          //   padding: EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                          //   child: Text(
                          //     "Upgrade",
                          //     style: MyTextStyle.gilroyRegular(size: 11, color: cRed),
                          //   ),
                          // ),
                        ],
                      ),
                    ],
                  ),
                ),
                GetBuilder<TabBarController>(builder: (controller) {
                  return Stack(
                    children: [
                      IconButton(
                        icon: const Icon(CupertinoIcons.bell, size: 22, color: cDarkText),
                        onPressed: () {
                          controller.notificationCount = 0;
                          controller.update();
                          onNotificationTap();
                        },
                        tooltip: 'Notifications',
                      ),
                      if (controller.notificationCount > 0)
                        Positioned(
                          right: 4,
                          top: 4,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                            child: Text(
                              controller.notificationCount.toString(),
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  );
                }),
                IconButton(
                  icon: const Icon(CupertinoIcons.search, size: 22, color: cDarkText),
                  onPressed: onSearchTap,
                  tooltip: 'Search Profile',
                )
              ],
            ),
          ),
        ),

        // Profile completion bar
        // Profile completion bar
        GetBuilder<ProfileController>(
          builder: (profileController) {
            final user = SessionManager.shared.getUser();
            final percentage = user?.profileCompletion?.percentage ?? 0;
            print("lakjsdlasdasd" + jsonEncode(user?.profileCompletion));
            print("lakjsdlasdasd" + percentage.toString());
            if (percentage == 100) {
              // Hide the widget if profile is fully complete
              return SizedBox.shrink();
            }

            return GestureDetector(
              onTap: () {
                Get.to(ProfileScreen(userId: SessionManager.shared.getUserID()));
              },
              child: Container(
                padding: EdgeInsets.all(8),
                margin: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "Profile Completion",
                          style: MyTextStyle.gilroyMedium(color: cDarkText, size: 12),
                        ),
                        Text(
                          "$percentage%",
                          style: MyTextStyle.gilroyBold(color: Colors.blue, size: 12),
                        ),
                      ],
                    ),
                    SizedBox(height: 6),
                    LinearProgressIndicator(
                      value: percentage / 100,
                      backgroundColor: Colors.grey.withOpacity(0.3),
                      valueColor: AlwaysStoppedAnimation(Colors.blue),
                    ),
                    SizedBox(height: 4),
                    Text(
                      user?.profileCompletion?.suggestion ?? "Complete your profile to get better matches",
                      style: MyTextStyle.gilroyRegular(color: cLightText, size: 10),
                    ),
                  ],
                ),
              ),
            );
          },
        )
      ],
    );
  }
}

// Extension for ExploreController to add missing properties and methods
extension ExploreControllerExtension on ExploreController {
  // Mock data properties that should be added to the actual controller
  Map<String, int> get profileStats => {
        'views': 127,
        'likes': 43,
        'interests': 18,
        'matches': 29,
      };

  Map<String, int> get todayStats => {
        'newMatches': 5,
        'profileViews': 12,
        'interests': 3,
      };

  Future<void> refreshAllData() async {
    // Call the controller's loadAllData method for consistent behavior
    await loadAllData();
  }
}

Widget _buildAIRecommendationsSection(ExploreController controller) {
  return Container(
    margin: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    padding: EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: LinearGradient(
        colors: [Color(0xFFE3F2FD), Color(0xFFF1F8E9)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(20),
      boxShadow: [
        BoxShadow(
          color: Colors.blue.withOpacity(0.1),
          blurRadius: 20,
          offset: Offset(0, 8),
        ),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.auto_awesome, color: Colors.blue, size: 24),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "AI Recommendations",
                    style: MyTextStyle.gilroyBold(color: cDarkText, size: 20),
                  ),
                  Text(
                    "Smart matches based on your behavior",
                    style: MyTextStyle.gilroyRegular(color: cLightText, size: 14),
                  ),
                ],
              ),
            ),
          ],
        ),
        SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildRecommendationCard(
                "Profile Boost",
                "Increase visibility by 3x",
                Icons.trending_up,
                Colors.green,
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: _buildRecommendationCard(
                "Better Photos",
                "Upload more pictures",
                Icons.camera_alt,
                Colors.orange,
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

Widget _buildRecommendationCard(String title, String subtitle, IconData icon, Color color) {
  return Container(
    padding: EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.05),
          blurRadius: 8,
          offset: Offset(0, 2),
        ),
      ],
    ),
    child: Column(
      children: [
        Icon(icon, color: color, size: 28),
        SizedBox(height: 8),
        Text(
          title,
          style: MyTextStyle.gilroyBold(color: cDarkText, size: 14),
          textAlign: TextAlign.center,
        ),
        Text(
          subtitle,
          style: MyTextStyle.gilroyRegular(color: cLightText, size: 12),
          textAlign: TextAlign.center,
        ),
      ],
    ),
  );
}
