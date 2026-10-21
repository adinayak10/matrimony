import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/localization/features/match_strings.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/announcement_model.dart';
import 'package:banjaramatch/models/user_notification_model.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/screens/notification_screen/notification_controller.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';

class NotificationScreen extends StatelessWidget {
  /// [initialSegment]: 0 = For You, 1 = Platform (announcements).
  const NotificationScreen({Key? key, this.initialSegment = 0}) : super(key: key);

  final int initialSegment;

  @override
  Widget build(BuildContext context) {
    NotificationScreenController controller = NotificationScreenController(initialSegment: initialSegment);
    return SafeArea(
      child: Scaffold(
        backgroundColor: const Color(0xFFFDF2F8),
        body: Column(
          children: [
            // Enhanced header with soft design
            _buildSoftHeader(),
            SizedBox(
              height: 10,
            ),

            GetBuilder<NotificationScreenController>(
              init: controller,
              builder: (controller) {
                return Expanded(
                  child: controller.announcements.isEmpty && controller.userNotifications.isEmpty
                      ? _buildEmptyState()
                      : Column(
                          children: [
                            // Soft segment controller
                            _buildSoftSegmentController(controller),

                            // Notification stats
                            //  _buildNotificationStats(controller),

                            //  const SizedBox(height: 16),

                            // Content area
                            Expanded(
                              child: Container(
                                // margin: const EdgeInsets.symmetric(horizontal: 16),
                                // decoration: BoxDecoration(
                                //   color: Colors.white,
                                //   borderRadius: BorderRadius.circular(24),
                                //   boxShadow: [
                                //     BoxShadow(
                                //       color: const Color(0xFFEC4899).withOpacity(0.08),
                                //       blurRadius: 20,
                                //       offset: const Offset(0, 8),
                                //     ),
                                //   ],
                                // ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(24),
                                  child: PageView(
                                    controller: controller.controller,
                                    onPageChanged: controller.onChangePage,
                                    children: [
                                      // For You notifications
                                      controller.userNotifications.isEmpty
                                          ? _buildPageEmptyState(MatchKeys.noPersonalNotifications.tr,
                                              MatchKeys.noPersonalNotificationsMsg.tr, Icons.person_outline)
                                          : _buildNotificationList(
                                              controller.userNotifications,
                                              controller.userScrollController,
                                            ),
                                      // Platform announcements
                                      controller.announcements.isEmpty
                                          ? _buildPageEmptyState(MatchKeys.noAnnouncements.tr,
                                              MatchKeys.noAnnouncementsMsg.tr, Icons.campaign_outlined)
                                          : _buildAnnouncementList(controller),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                );
              },
            ),

          ],
        ),
      ),
    );
  }

  Widget _buildSoftHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFFFDF2F8),
            Colors.white.withOpacity(0.9),
          ],
        ),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Get.back(),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFEC4899).withOpacity(0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.arrow_back_ios_rounded,
                color: Color(0xFF1F2937),
                size: 20,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Notifications",
                  style: MyTextStyle.gilroyBold(size: 26, color: const Color(0xFF1F2937)),
                ),
                Text(
                  "Stay updated with your matrimony journey",
                  style: MyTextStyle.gilroyMedium(size: 14, color: const Color(0xFF6B7280)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSoftSegmentController(NotificationScreenController controller) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFEC4899).withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildSegmentTab(
              LKeys.forYou.tr,
              0,
              controller,
              Icons.favorite_outline,
              controller.userNotifications.length,
            ),
          ),
          Expanded(
            child: _buildSegmentTab(
              LKeys.platform.tr,
              1,
              controller,
              Icons.campaign_outlined,
              controller.announcements.length,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentTab(
    String text,
    int index,
    NotificationScreenController controller,
    IconData icon,
    int count,
  ) {
    final bool isSelected = controller.selectedPage == index;

    return GestureDetector(
      onTap: () => controller.onChangeSegment(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(
                  colors: [
                    const Color(0xFFEC4899),
                    const Color(0xFFF97316),
                  ],
                )
              : null,
          borderRadius: BorderRadius.circular(16),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFFEC4899).withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? Colors.white : const Color(0xFF9CA3AF),
            ),
            const SizedBox(width: 8),
            Text(
              text,
              style: MyTextStyle.gilroySemiBold(
                size: 15,
                color: isSelected ? Colors.white : const Color(0xFF6B7280),
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white.withOpacity(0.25) : const Color(0xFFEC4899).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  count.toString(),
                  style: MyTextStyle.gilroySemiBold(
                    size: 11,
                    color: isSelected ? Colors.white : const Color(0xFFEC4899),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationStats(NotificationScreenController controller) {
    int unreadCount = controller.userNotifications.where((n) => n.isRead != true).length +
        controller.announcements.where((n) => n.isRead != true).length;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFEC4899).withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildStatItem(
            "Total Notifications",
            (controller.userNotifications.length + controller.announcements.length).toString(),
            const Color(0xFF3B82F6),
          ),
          Container(
            height: 20,
            width: 1,
            color: const Color(0xFFE5E7EB),
          ),
          _buildStatItem(
            "Unread",
            unreadCount.toString(),
            const Color(0xFFEF4444),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String count, Color color) {
    return Column(
      children: [
        Text(
          count,
          style: MyTextStyle.gilroyBold(size: 18, color: color),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: MyTextStyle.gilroyMedium(
            size: 12,
            color: const Color(0xFF6B7280),
          ),
        ),
      ],
    );
  }

  Widget _buildNotificationList(List<UserNotification> notifications, ScrollController? scrollController) {
    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.all(20),
      physics: const BouncingScrollPhysics(),
      itemCount: notifications.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: index == notifications.length - 1 ? 0 : 12,
          ),
          child: EnhancedNotificationCard(
            notification: notifications[index],
          ),
        );
      },
    );
  }

  /// Announcements with an auto-loading footer while more pages exist.
  Widget _buildAnnouncementList(NotificationScreenController controller) {
    final rows = controller.announcements;
    return ListView.builder(
      controller: controller.scrollController,
      padding: const EdgeInsets.all(20),
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      itemCount: rows.length + (controller.hasMoreAnnouncements ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= rows.length) {
          WidgetsBinding.instance.addPostFrameCallback((_) => controller.fetchNotification());
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
            ),
          );
        }
        return Padding(
          padding: EdgeInsets.only(bottom: index == rows.length - 1 ? 0 : 12),
          child: AnnouncementCard(announcement: rows[index]),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFFEC4899).withOpacity(0.1),
                  const Color(0xFFF97316).withOpacity(0.1),
                ],
              ),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Icon(
              Icons.notifications_none_rounded,
              size: 48,
              color: const Color(0xFFEC4899).withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            "No Notifications Yet",
            style: MyTextStyle.gilroyBold(size: 24, color: const Color(0xFF1F2937)),
          ),
          const SizedBox(height: 8),
          Text(
            "Your matrimony updates and messages will appear here",
            style: MyTextStyle.gilroyMedium(
              size: 15,
              color: const Color(0xFF6B7280),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildPageEmptyState(String title, String subtitle, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFFEC4899).withOpacity(0.1),
                  const Color(0xFFF97316).withOpacity(0.1),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(
              icon,
              size: 36,
              color: const Color(0xFFEC4899).withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            title,
            style: MyTextStyle.gilroyBold(size: 20, color: const Color(0xFF1F2937)),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: MyTextStyle.gilroyMedium(
              size: 14,
              color: const Color(0xFF6B7280),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class EnhancedNotificationCard extends StatelessWidget {
  final UserNotification notification;

  const EnhancedNotificationCard({Key? key, required this.notification}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final String name = notification.fromUser?.fullName ?? 'Someone';
    final String content = notification.content ?? '';
    final String time = _formatTime(notification.createdAt);
    final bool isRead = notification.isRead ?? false;

    return GestureDetector(
      onTap: () {
        if (notification.fromUser?.sId != null) {
          Get.to(ProfileScreen(userId: notification.fromUser!.sId!));
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isRead ? Colors.white : const Color(0xFFFDF2F8),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isRead ? const Color(0xFFE5E7EB) : const Color(0xFFEC4899).withOpacity(0.2),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFEC4899).withOpacity(isRead ? 0.02 : 0.08),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile image with status indicator
            Stack(
              children: [
                ClipSmoothRect(
                  radius: SmoothBorderRadius(
                    cornerRadius: 16,
                    cornerSmoothing: 0.8,
                  ),
                  child: Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          const Color(0xFFEC4899).withOpacity(0.1),
                          const Color(0xFFF97316).withOpacity(0.1),
                        ],
                      ),
                    ),
                    child: MyCachedProfileImage(
                      imageUrl: notification.fromUser?.profile ?? "",
                      width: 52,
                      height: 52,
                    ),
                  ),
                ),
                if (!isRead)
                  Positioned(
                    top: 4,
                    right: 4,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(width: 14),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        name,
                        style: MyTextStyle.gilroyBold(
                          size: 16,
                          color: const Color(0xFF1F2937),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.verified,
                          color: Colors.white,
                          size: 12,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        time,
                        style: MyTextStyle.gilroyMedium(
                          color: const Color(0xFF9CA3AF),
                          size: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    content,
                    style: MyTextStyle.gilroyMedium(
                      color: const Color(0xFF6B7280),
                      size: 14,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  _buildNotificationActions(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationActions() {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                const Color(0xFFEC4899).withOpacity(0.1),
                const Color(0xFFF97316).withOpacity(0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            "View Profile",
            style: MyTextStyle.gilroySemiBold(
              size: 12,
              color: const Color(0xFFEC4899),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.more_horiz,
            size: 16,
            color: Color(0xFF9CA3AF),
          ),
        ),
      ],
    );
  }

  String _formatTime(String? time) {
    if (time == null) return '';
    try {
      final date = DateTime.parse(time).toLocal();
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return '';
    }
  }
}

/// Platform announcement row (title, body, date, type chip). Tapping opens
/// `linkUrl` only when it is an http(s) or site-relative link.
class AnnouncementCard extends StatelessWidget {
  const AnnouncementCard({Key? key, required this.announcement}) : super(key: key);

  final Announcement announcement;

  static const Color _pink = Color(0xFFEC4899);

  /// Absolute URL for [Announcement.linkUrl] (site-relative paths go to the website).
  static String resolveLink(String link) {
    final url = link.trim();
    if (url.startsWith('/')) return Uri.parse(helpURL).origin + url;
    return url;
  }

  static String typeLabel(String? type) {
    switch (type) {
      case 'update':
        return MatchKeys.typeUpdate.tr;
      case 'maintenance':
        return MatchKeys.typeMaintenance.tr;
      case 'event':
        return MatchKeys.typeEvent.tr;
      default:
        return MatchKeys.typeAnnouncement.tr;
    }
  }

  static IconData typeIcon(String? type) {
    switch (type) {
      case 'update':
        return Icons.system_update_rounded;
      case 'maintenance':
        return Icons.build_circle_outlined;
      case 'event':
        return Icons.event_rounded;
      default:
        return Icons.campaign_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = (announcement.title ?? '').trim();
    final body = (announcement.content ?? '').trim();
    final date = announcement.createdAt;
    final canOpen = announcement.hasSafeLink;
    return GestureDetector(
      onTap: canOpen ? () => BaseController.share.handleURL(url: resolveLink(announcement.linkUrl!)) : null,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
          boxShadow: [
            BoxShadow(color: _pink.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [_pink.withOpacity(0.15), const Color(0xFFF97316).withOpacity(0.15)]),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(typeIcon(announcement.type), color: _pink, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          typeLabel(announcement.type),
                          style: MyTextStyle.gilroySemiBold(size: 11, color: _pink),
                        ),
                      ),
                      if (date != null)
                        Text(
                          DateFormat('d MMM yyyy').format(date),
                          style: MyTextStyle.gilroyMedium(size: 11, color: const Color(0xFF9CA3AF)),
                        ),
                    ],
                  ),
                  if (title.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(title, style: MyTextStyle.gilroyBold(size: 15, color: const Color(0xFF1F2937))),
                  ],
                  if (body.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      body,
                      style: MyTextStyle.gilroyMedium(size: 13, color: const Color(0xFF4B5563)).copyWith(height: 1.4),
                    ),
                  ],
                  if (canOpen) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(MatchKeys.openLink.tr, style: MyTextStyle.gilroySemiBold(size: 13, color: _pink)),
                        const SizedBox(width: 4),
                        const Icon(Icons.open_in_new_rounded, size: 14, color: _pink),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
