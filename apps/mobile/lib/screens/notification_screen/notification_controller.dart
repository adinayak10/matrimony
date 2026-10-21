import 'package:flutter/material.dart';
import 'package:banjaramatch/common/api_service/common_service.dart';
import 'package:banjaramatch/common/controller/cupertino_controller.dart';
import 'package:banjaramatch/models/announcement_model.dart';
import 'package:banjaramatch/models/user_notification_model.dart';
import 'package:banjaramatch/utilities/const.dart';

class NotificationScreenController extends CupertinoController {
  /// [initialSegment]: 0 = For You, 1 = Platform (announcements).
  NotificationScreenController({int initialSegment = 0}) {
    selectedPage = initialSegment == 1 ? 1 : 0;
    controller = PageController(initialPage: selectedPage);
  }

  ScrollController scrollController = ScrollController();
  ScrollController userScrollController = ScrollController();

  /// Platform announcements (`fetchPlatformNotification`, offset-paged).
  List<Announcement> announcements = [];
  List<UserNotification> userNotifications = [];
  bool isPlatformNotificationLoading = false;
  bool hasMoreAnnouncements = true;

  @override
  void onReady() {
    scrollController.addListener(
      () {
        if (scrollController.position.pixels >= scrollController.position.maxScrollExtent - 200) {
          fetchNotification();
        }
      },
    );
    userScrollController.addListener(() {
      if (userScrollController.offset == userScrollController.position.maxScrollExtent) {
        if (!isLoading.value) {
          fetchUserNotifications();
        }
      }
    });
    fetchUserNotifications();
    fetchNotification();

    marNotificationRead();

    super.onReady();
  }

  /// Next page of platform announcements (offset = rows already loaded).
  void fetchNotification() {
    if (isPlatformNotificationLoading || !hasMoreAnnouncements) return;
    isPlatformNotificationLoading = true;
    final limit = Limits.pagination;
    CommonService.shared.fetchPlatformNotification(announcements.length, (rows) {
      isPlatformNotificationLoading = false;
      final known = announcements.map((e) => e.id).toSet();
      announcements.addAll(rows.where((e) => e.id == null || !known.contains(e.id)));
      if (rows.length < limit) hasMoreAnnouncements = false;
      update();
    }, limit: limit);
  }

  void fetchUserNotifications() {
    if (userNotifications.isEmpty) {
      // startLoading();
    }

    CommonService.shared.fetchUserNotifications(userNotifications.length, (notifications) {
      if (userNotifications.isEmpty) {
        stopLoading();
      }

      userNotifications.addAll(notifications);
      print(userNotifications.length.toString());
      update();
    });
  }

  void marNotificationRead() {
    CommonService.shared.marNotificationRead(0, () {
      update();
    });
  }
}
