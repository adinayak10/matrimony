import 'dart:convert';

import 'package:banjaramatch/common/api_service/api_service.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/models/faq_categories_model.dart';
import 'package:banjaramatch/models/announcement_model.dart';
import 'package:banjaramatch/models/setting_model.dart';
import 'package:banjaramatch/models/user_notification_model.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/params.dart';
import 'package:banjaramatch/utilities/web_service.dart';

class CommonService {
  static var shared = CommonService();

  void fetchGlobalSettings(Function(bool) completion) {
    ApiService.shared.call(
      url: WebService.fetchSetting,
      completion: (p0) {
        var setting = SettingModel.fromJson(p0).data;

        print("////////////////" + jsonEncode(setting?.occupations));
        if (setting != null) {
          SessionManager.shared.setSettings(setting);
          completion(true);
        }
      },
    );
  }

  /// Platform announcements, newest first. [start] is a 0-based offset
  /// (pass the number already loaded). Always calls [completion] (empty list
  /// on failure or on API builds without announcements).
  void fetchPlatformNotification(int start, Function(List<Announcement> announcements) completion,
      {int limit = 10}) {
    var param = {Param.start: start, Param.limit: limit};
    ApiService.shared.call(
      url: WebService.fetchPlatformNotification,
      param: param,
      completion: (response) {
        completion(response is Map && response['status'] == true ? Announcement.listFrom(response['data']) : []);
      },
    );
  }

  void fetchUserNotifications(int start, Function(List<UserNotification> notifications) completion) {
    var param = {Param.start: start, Param.limit: Limits.pagination, Param.myUserId: SessionManager.shared.getUserID()};
    ApiService.shared.call(
      url: WebService.fetchUserNotification,
      param: param,
      completion: (response) {
        var notifications = UserNotificationModel.fromJson(response);
        print(notifications);
        completion(notifications.data!);
      },
    );
  }

  void marNotificationRead(int start, Function() completion) {
    var param = {Param.start: start, Param.limit: Limits.pagination, Param.myUserId: SessionManager.shared.getUserID()};
    ApiService.shared.call(
      url: WebService.markNotificationsRead,
      param: param,
      completion: (response) {
        completion();
      },
    );
  }

  void fetchFAQs(Function(List<FAQsCategory> categories) completion) {
    ApiService.shared.call(
      url: WebService.fetchFAQs,
      completion: (response) {
        var categories = FaqCategoriesModel.fromJson(response).data;
        if (categories != null) {
          completion(categories);
        }
      },
    );
  }
}
