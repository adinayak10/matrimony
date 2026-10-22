import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/call_manager.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/models/model_interest_user_list.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/common/empty_state.dart';
import 'package:banjaramatch/screens/common/segment_bar.dart';
import 'package:banjaramatch/screens/user_interests_controller.dart';
import 'package:banjaramatch/screens/users_list_controller.dart';

import 'interest_card.dart';

/// Interests tab: Received / Sent / Connections.
class InterestUserScreen extends StatelessWidget {
  const InterestUserScreen({Key? key}) : super(key: key);

  static void _chat(User? user) {
    if (user == null) return;
    UsersListController.openChatWithUser(user, requireConnected: false);
  }

  static void _call(User? user) {
    if (user == null) return;
    CallManager.shared.startCallWithUser(user, callType: 'audio');
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<InterestUserScreenController>(
      init: InterestUserScreenController(),
      builder: (controller) {
        return Scaffold(
          backgroundColor: const Color(0xFFFDF2F8), // Soft pink background
          body: Column(
            children: [
              const SizedBox(height: 16),
              _buildInformativeHeader(),
              const SizedBox(height: 20),
              SoftSegmentBar(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                items: [
                  SegmentItem(
                    label: AppKeys.interestsReceived.tr,
                    icon: Icons.inbox_rounded,
                    count: controller.receivedList.length,
                  ),
                  SegmentItem(
                    label: AppKeys.interestsSent.tr,
                    icon: Icons.send_rounded,
                    count: controller.sentList.length,
                  ),
                  SegmentItem(
                    label: AppKeys.interestsConnections.tr,
                    icon: Icons.people_alt_rounded,
                    count: controller.connections.length,
                  ),
                ],
                selectedIndex: controller.selectedPage,
                onChanged: controller.onChangeSegment,
              ),
              const SizedBox(height: 12),
              Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFEC4899).withOpacity(0.08),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: PageView(
                      controller: controller.pageController,
                      onPageChanged: controller.onChangePage,
                      children: [
                        _buildUserList(controller, false), // Interest Received
                        _buildUserList(controller, true), // Interest Sent
                        _buildConnections(controller),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInformativeHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFFEC4899).withOpacity(0.1),
                  const Color(0xFFF97316).withOpacity(0.1),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.favorite_rounded,
              color: Color(0xFFEC4899),
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppKeys.interestsTitle.tr,
                  style: MyTextStyle.gilroyBold(size: 26, color: const Color(0xFF1F2937)),
                ),
                Text(
                  AppKeys.interestsSubtitle.tr,
                  style: MyTextStyle.gilroyMedium(size: 14, color: const Color(0xFF6B7280)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserList(InterestUserScreenController controller, bool isSent) {
    final List<UserInterest> users = (isSent ? controller.sentList : controller.receivedList)
        .where((row) => row.user?.id != null)
        .toList();

    if (users.isEmpty) {
      return EmptyState(
        icon: isSent ? Icons.send_rounded : Icons.inbox_rounded,
        title: isSent ? AppKeys.interestsSentEmptyTitle.tr : AppKeys.interestsReceivedEmptyTitle.tr,
        message: isSent ? AppKeys.interestsSentEmptyMessage.tr : AppKeys.interestsReceivedEmptyMessage.tr,
      );
    }

    return RefreshIndicator(
      onRefresh: () async => controller.refreshAll(),
      child: ListView.builder(
        itemCount: users.length,
        padding: const EdgeInsets.all(20),
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        itemBuilder: (context, index) {
          final row = users[index];
          final userId = row.user!.id!;
          return Padding(
            padding: EdgeInsets.only(bottom: index == users.length - 1 ? 0 : 14),
            child: InterestCard(
              userInterest: row,
              onReject: () => controller.declineInterest(userId),
              onCancel: () => controller.cencelInterest(userId),
              onAccept: () => controller.acceptInterest(userId, onAccepted: () => _chat(row.user)),
              onSendRequest: () => controller.sendInterest(userId),
              onMessage: () => _chat(row.user),
              onCall: () => _call(row.user),
            ),
          );
        },
      ),
    );
  }

  Widget _buildConnections(InterestUserScreenController controller) {
    final rows = controller.connections;
    if (rows.isEmpty) {
      if (controller.connectionsLoading) {
        return const Center(child: CircularProgressIndicator(color: Color(0xFFEC4899)));
      }
      return EmptyState(
        icon: Icons.people_outline_rounded,
        title: AppKeys.connectionsEmptyTitle.tr,
        message: AppKeys.connectionsEmptyMessage.tr,
      );
    }
    return RefreshIndicator(
      onRefresh: () async => controller.fetchConnections(),
      child: ListView.builder(
        itemCount: rows.length,
        padding: const EdgeInsets.all(20),
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        itemBuilder: (context, index) {
          final row = rows[index];
          return Padding(
            padding: EdgeInsets.only(bottom: index == rows.length - 1 ? 0 : 14),
            child: InterestCard(
              userInterest: row,
              isConnection: true,
              onMessage: () => _chat(row.user),
              onCall: () => _call(row.user),
              onRemove: () => controller.removeConnection(row),
            ),
          );
        },
      ),
    );
  }
}
