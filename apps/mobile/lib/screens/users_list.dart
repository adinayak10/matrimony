import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/screens/partner_preference-view_screen.dart';
import 'package:banjaramatch/screens/user_profile_big_item.dart';
import 'package:banjaramatch/screens/users_list_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../common/extensions/font_extension.dart';

class UsersListPage extends StatelessWidget {
  const UsersListPage({Key? key}) : super(key: key);

  void _scrollToTop(UsersListController controller) {
    if (!controller.scrollController.hasClients) return;
    controller.scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOutCubic,
    );
  }

  void _applyDiscoveryMode(UsersListController controller, {required bool broaden}) {
    _scrollToTop(controller);
    if (controller.isSearchMode) {
      if (broaden) {
        controller.fetchSearchProfiles(filters: null);
      } else {
        controller.fetchSearchProfiles(filters: controller.isFilterApplied ? controller.activeFilters : null);
      }
      return;
    }

    controller.loadInitialProfiles(matchMyPreference: !broaden);
  }

  @override
  Widget build(BuildContext context) {
    // ✅ Initialize controller once using GetBuilder's init
    return GetBuilder<UsersListController>(
      init: UsersListController()..loadInitialProfiles(matchMyPreference: true),
      builder: (controller) {
        return Scaffold(
          body: Column(
            children: [
              Expanded(
                child: Builder(
                  builder: (_) {
                    if (controller.isLoading.value) {
                      return _buildLoadingState();
                    }

                    if (controller.usersList.isEmpty) {
                      return _buildEmptyState(controller);
                    }

                    return ListView.builder(
                      controller: controller.scrollController,
                      padding: const EdgeInsets.only(bottom: 16),
                      itemCount: controller.usersList.length + 1,
                      itemBuilder: (context, index) {
                        if (index == controller.usersList.length) {
                          if (controller.isLoadingMore) {
                            return const Padding(
                              padding: EdgeInsets.symmetric(vertical: 16),
                              child: Center(child: CircularProgressIndicator()),
                            );
                          }

                          if (!controller.hasMoreData) {
                            return _buildKeepExploringCard(controller);
                          }

                          return const SizedBox.shrink();
                        }

                        final profile = controller.usersList[index];
                        return BigUserCardItem(
                          profile: profile,
                          controller: controller,
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLoadingState() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            cLightBg,
            cLightBg,
          ],
        ),
      ),
      child: const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
          strokeWidth: 3,
        ),
      ),
    );
  }

  Widget _buildEmptyState(UsersListController controller) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [cLightBg, cLightBg],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.people_outline,
                size: 80,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'No profiles found',
              style: MyTextStyle.gilroyBold(size: 22, color: const Color(0xFF1F2937)),
            ),
            const SizedBox(height: 16),
            Text(
              'Try adjusting your preferences\nto discover more matches',
              textAlign: TextAlign.center,
              style: MyTextStyle.gilroyMedium(
                size: 15,
                color: const Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () async {
                await Get.to(() => const PartnerPreferenceViewScreen());
                controller.loadInitialProfiles(matchMyPreference: true);
              },
              icon: const Icon(Icons.tune),
              label: const Text('Adjust Preferences'),
              style: ElevatedButton.styleFrom(
                foregroundColor: const Color(0xFF667eea),
                backgroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKeepExploringCard(UsersListController controller) {
    String headline = 'Nice progress today. More matches are on the way.';
    String subline = 'You are seeing top fits first. We keep adding fresh people who match your vibe.';
    String insightTag = 'Fresh Matches Incoming';

    if (controller.isSearchMode && controller.isFilterApplied) {
      headline = 'Great choices. You unlocked your refined picks.';
      subline = 'New users that match your selected filters will appear here automatically.';
      insightTag = 'Refined Picks Unlocked';
    } else if (!controller.isSearchMode && !controller.matchMyPreferenceEnabled) {
      headline = 'You have checked today\'s broader suggestions.';
      subline = 'More profiles join daily. Your next great conversation could appear anytime.';
      insightTag = 'Daily Picks Completed';
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      child: Stack(
        children: [
          Positioned(
            top: -24,
            right: -14,
            child: Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFF9A8D4).withOpacity(0.35),
              ),
            ),
          ),
          Positioned(
            bottom: -30,
            left: -18,
            child: Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFCE7F3).withOpacity(0.8),
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFFFFFF), Color(0xFFFDF4FF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFF5D0FE), width: 1),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF7E22CE).withOpacity(0.08),
                  blurRadius: 20,
                  offset: const Offset(0, 9),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(11),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF9333EA), Color(0xFFDB2777)],
                        ),
                        borderRadius: BorderRadius.circular(13),
                      ),
                      child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'More Matches Coming',
                            style: MyTextStyle.gilroyBold(size: 18, color: const Color(0xFF111827)),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFAE8FF),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              insightTag,
                              style: MyTextStyle.gilroySemiBold(size: 11, color: const Color(0xFFA21CAF)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  headline,
                  style: MyTextStyle.gilroyBold(size: 15, color: const Color(0xFF1F2937)),
                ),
                const SizedBox(height: 6),
                Text(
                  subline,
                  style: MyTextStyle.gilroyMedium(size: 13, color: const Color(0xFF4B5563)),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _applyDiscoveryMode(controller, broaden: true),
                        icon: const Icon(Icons.explore_rounded, size: 18),
                        label: const Text('Show More Matches'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF7E22CE),
                          side: const BorderSide(color: Color(0xFFE9D5FF)),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAF5FF),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE9D5FF)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.notifications_active_outlined, size: 18, color: Color(0xFF7E22CE)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Stay tuned: new people join every day, so your feed keeps getting better.',
                          style: MyTextStyle.gilroyMedium(size: 12, color: const Color(0xFF6B21A8)),
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
