import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/call_manager.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/screens/call_screen/call_history_screen.dart';
import 'package:banjaramatch/screens/chats_screen/chatting_screen/chatting_view.dart';
import 'package:banjaramatch/screens/notification_screen/notification_screen.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/saved_searches_screen/saved_searches_screen.dart';
import 'package:banjaramatch/screens/shortlist_screen/shortlist_screen.dart';
import 'package:banjaramatch/screens/success_stories_screen/success_stories_screen.dart';
import 'package:banjaramatch/screens/tabbar/tabbar_controller.dart';
import 'package:banjaramatch/screens/user_interests_controller.dart';
import 'package:banjaramatch/screens/verification_screen/verification_screen.dart';
import 'package:banjaramatch/screens/visitors_screen/visitors_screen.dart';

/// Opens the right screen for a push notification / local notification tap.
///
/// Routes on FCM `data['type']` (all values are strings). Until the
/// [TabBarScreen] has been shown (cold start, splash, onboarding) the latest
/// event waits in a pending slot and is flushed by [onTabBarReady], so the
/// splash screen's `Get.offAll` can never close what we opened — this also
/// applies to incoming calls (`type: call`).
class NotificationRouter {
  NotificationRouter._();

  static final NotificationRouter shared = NotificationRouter._();

  static const String blogBaseUrl = 'https://www.banjaramatch.com/blogs/';

  Map<String, dynamic>? _pending;
  bool _ready = false;

  /// Called by TabBarScreen after every frame it builds (idempotent).
  void onTabBarReady() {
    _ready = true;
    final pending = _pending;
    if (pending == null) return;
    _pending = null;
    _route(pending);
  }

  /// Logout: the next session starts cold again.
  void reset() {
    _ready = false;
    _pending = null;
  }

  /// Routes [data] now, or keeps it until the tab bar is up.
  void handle(Map<String, dynamic> data) {
    if (data.isEmpty) return;
    if (!_ready) {
      _pending = Map<String, dynamic>.from(data);
      return;
    }
    _route(data);
  }

  /// Local-notification payload: `jsonEncode(data)`, or the legacy chat
  /// payload `"<senderId>|<senderName>"` written by the socket service.
  void handlePayload(String? payload) {
    final data = parsePayload(payload);
    if (data != null) handle(data);
  }

  static Map<String, dynamic>? parsePayload(String? payload) {
    if (payload == null || payload.trim().isEmpty) return null;
    final text = payload.trim();
    if (text.startsWith('{')) {
      try {
        final decoded = jsonDecode(text);
        if (decoded is Map) {
          return decoded.map((key, value) => MapEntry(key.toString(), value));
        }
      } catch (e) {
        print('NotificationRouter: bad payload $e');
      }
      return null;
    }
    final senderId = text.split('|').first.trim();
    if (senderId.isEmpty) return null;
    return {'type': 'message', 'userId': senderId};
  }

  static String _str(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value == null) return '';
    final text = value.toString().trim();
    return text == 'null' ? '' : text;
  }

  void _route(Map<String, dynamic> data) {
    if (!SessionManager.shared.isLogin()) return;
    final type = _str(data, 'type');
    final userId = _str(data, 'userId').isNotEmpty ? _str(data, 'userId') : _str(data, 'user_id');
    try {
      switch (type) {
        case 'message':
          _openChat(userId);
          break;
        case 'interest':
        case 'interest_request':
          _openInterests(0);
          break;
        case 'interest_accepted':
        case 'friend_accept':
          _openInterests(2);
          break;
        case 'profile_visit':
          if (userId.isNotEmpty) {
            _push(ProfileScreen(userId: userId));
          } else {
            _push(const VisitorsScreen());
          }
          break;
        case 'shortlist':
          if (userId.isNotEmpty) {
            _push(ProfileScreen(userId: userId));
          } else {
            _push(const ShortlistScreen(initialSegment: 1));
          }
          break;
        case 'admin_recommendation':
          if (userId.isNotEmpty) _push(ProfileScreen(userId: userId));
          break;
        case 'announcement':
          _push(const NotificationScreen(initialSegment: 1));
          break;
        case 'verification_approved':
        case 'verification_rejected':
          _push(const VerificationScreen());
          break;
        case 'profile_search_alert':
          _push(const SavedSearchesScreen());
          break;
        case 'success_story_published':
          _push(const SuccessStoriesScreen(initialSegment: 1));
          break;
        case 'missed_call':
          _push(const CallHistoryScreen());
          break;
        case 'call':
          CallManager.shared.handlePushCall(data);
          break;
        case 'admin_message':
          _openAdminLink(data);
          break;
        default:
          // Unknown / legacy types: the notification list is the safest place.
          if (type.isNotEmpty) _push(const NotificationScreen());
      }
    } catch (e) {
      print('NotificationRouter: routing "$type" failed: $e');
    }
  }

  void _push(Widget screen) {
    if (Get.context == null) return;
    Navigate.to(screen);
  }

  void _selectTab(int index) {
    Get.until((route) => route.isFirst);
    if (Get.isRegistered<TabBarController>()) {
      Get.find<TabBarController>().selectIndex(index);
    }
  }

  /// Interests tab; [segment] 0 received, 1 sent, 2 connections.
  void _openInterests(int segment) {
    _selectTab(2);
    InterestUserScreenController.openSegment(segment);
  }

  void _openChat(String userId) {
    if (userId.isEmpty) {
      _selectTab(3);
      return;
    }
    UserService.shared.fetchChatRoom(userId, (room) {
      _push(ChattingView(chatRoom: room));
    });
  }

  void _openAdminLink(Map<String, dynamic> data) {
    switch (_str(data, 'linkType')) {
      case 'profile':
        final id = _str(data, 'userId');
        if (id.isNotEmpty) _push(ProfileScreen(userId: id));
        break;
      case 'blog':
        final slug = _str(data, 'slug');
        if (slug.isNotEmpty) BaseController.share.handleURL(url: '$blogBaseUrl${Uri.encodeComponent(slug)}');
        break;
      case 'url':
        final url = _str(data, 'url');
        if (url.isNotEmpty) BaseController.share.handleURL(url: url);
        break;
      default:
        break; // 'none': opening the app is the whole action
    }
  }
}
