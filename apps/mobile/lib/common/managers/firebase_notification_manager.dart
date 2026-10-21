import 'dart:convert';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/managers/notification_router.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/params.dart';

/// FCM + local notifications. Taps (FCM `onMessageOpenedApp`, cold-start
/// `getInitialMessage`, local-notification payloads) go to
/// [NotificationRouter]; `type: call` pushes use the full-screen
/// `banjaramatch_calls` channel.
class FirebaseNotificationManager {
  static var shared = FirebaseNotificationManager();
  FirebaseMessaging firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

  static const String defaultChannelId = 'banjaramatch';
  static const String callChannelId = 'banjaramatch_calls';

  /// Channel the API names in `android.notification.channelId`.
  static const String serverChannelId = 'chatter';

  /// Fixed id so a newer call notification replaces the previous one.
  static const int callNotificationId = 4242;

  AndroidNotificationChannel channel = AndroidNotificationChannel(
      defaultChannelId, // id
      'BanjaraMatch Notification', // title
      playSound: true,
      enableLights: true,
      enableVibration: true,
      importance: Importance.max);

  static final AndroidNotificationChannel callChannel = AndroidNotificationChannel(
    callChannelId,
    'Calls',
    description: 'Incoming voice and video calls',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
  );

  static final AndroidNotificationChannel serverChannel = AndroidNotificationChannel(
    serverChannelId,
    'Messages & activity',
    importance: Importance.high,
    playSound: true,
    enableVibration: true,
  );

  bool _initialized = false;

  FirebaseNotificationManager() {
    init();
  }

  static InitializationSettings get _initializationSettings => InitializationSettings(
        android: const AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: const DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
          defaultPresentAlert: true,
          defaultPresentSound: true,
          defaultPresentBadge: false,
        ),
      );

  static Future<void> _createChannels(FlutterLocalNotificationsPlugin plugin, AndroidNotificationChannel main) async {
    final android = plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (android == null) return;
    await android.createNotificationChannel(main);
    await android.createNotificationChannel(callChannel);
    await android.createNotificationChannel(serverChannel);
  }

  void init() async {
    if (_initialized) return;
    _initialized = true;

    subscribeToTopic(notificationTopic);

    try {
      await flutterLocalNotificationsPlugin.initialize(
        _initializationSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          NotificationRouter.shared.handlePayload(response.payload);
        },
      );
      await _createChannels(flutterLocalNotificationsPlugin, channel);

      // Cold start from a local notification (e.g. the full-screen call alert).
      final launch = await flutterLocalNotificationsPlugin.getNotificationAppLaunchDetails();
      if (launch?.didNotificationLaunchApp == true) {
        NotificationRouter.shared.handlePayload(launch?.notificationResponse?.payload);
      }
    } catch (e) {
      print('Local notifications init failed: $e');
    }

    // Cold start from an FCM notification; the router keeps it pending until
    // the tab bar is on screen.
    try {
      final initial = await firebaseMessaging.getInitialMessage();
      if (initial != null) NotificationRouter.shared.handle(initial.data);
    } catch (e) {
      print('getInitialMessage failed: $e');
    }

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      NotificationRouter.shared.handle(message.data);
    });

    FirebaseMessaging.onMessage.listen(_onForegroundMessage);

    firebaseMessaging.onTokenRefresh.listen((token) {
      UserService.shared.updateDeviceToken(token);
    });

    flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();

    flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, sound: true);

    try {
      await firebaseMessaging.requestPermission(alert: true, badge: false, sound: true);
    } catch (e) {
      print('FCM permission request failed: $e');
    }

    getNotificationToken((token) {
      if (token.isNotEmpty && token != 'No Token' && SessionManager.shared.isLogin()) {
        UserService.shared.updateDeviceToken(token);
      }
    });
  }

  void _onForegroundMessage(RemoteMessage message) {
    final data = message.data;
    final type = '${data['type'] ?? ''}';
    if (type == 'call') {
      // The callee's socket was offline when the call started; ring in-app.
      NotificationRouter.shared.handle(data);
      return;
    }
    final stored = SessionManager.shared.getStoredConversation();
    if (stored.isNotEmpty && (data[Param.conversationId] == stored || data['roomId'] == stored)) {
      print('In Same Chat');
      return;
    }
    showNotification(message);
  }

  void showNotification(RemoteMessage message) {
    _show(flutterLocalNotificationsPlugin, message.data,
        title: message.notification?.title, body: message.notification?.body);
  }

  /// Socket chat messages (`showLocalNotification` in main.dart).
  void showLocal({required String title, required String body, required String payload}) {
    if (title.isEmpty || body.isEmpty) return;
    final id = DateTime.now().millisecondsSinceEpoch.remainder(100000);
    flutterLocalNotificationsPlugin.show(id, title, body, _details(isCall: false), payload: payload);
  }

  /// Background isolate (`FirebaseMessaging.onBackgroundMessage`): builds its
  /// own plugin instance, never touches [shared].
  static Future<void> showInBackground(RemoteMessage message) async {
    final data = message.data;
    final isCall = '${data['type'] ?? ''}' == 'call';
    // The system already showed messages that carry a notification title.
    if (!isCall && (message.notification?.title ?? '').isNotEmpty) return;
    final plugin = FlutterLocalNotificationsPlugin();
    try {
      await plugin.initialize(_initializationSettings);
      await _createChannels(
        plugin,
        AndroidNotificationChannel(defaultChannelId, 'BanjaraMatch Notification',
            playSound: true, enableLights: true, enableVibration: true, importance: Importance.max),
      );
      await _show(plugin, data, title: message.notification?.title, body: message.notification?.body);
    } catch (e) {
      print('Background notification failed: $e');
    }
  }

  static NotificationDetails _details({required bool isCall}) {
    if (isCall) {
      return NotificationDetails(
        android: AndroidNotificationDetails(
          callChannelId,
          'Calls',
          channelDescription: 'Incoming voice and video calls',
          importance: Importance.max,
          priority: Priority.max,
          category: AndroidNotificationCategory.call,
          fullScreenIntent: true,
          ongoing: true,
          autoCancel: true,
          timeoutAfter: 45000,
        ),
        iOS: const DarwinNotificationDetails(presentSound: true, presentAlert: true, presentBadge: false),
      );
    }
    return const NotificationDetails(
      iOS: DarwinNotificationDetails(presentSound: true, presentAlert: true, presentBadge: false),
      android: AndroidNotificationDetails(
        defaultChannelId,
        'BanjaraMatch Notification',
        importance: Importance.max,
        priority: Priority.high,
      ),
    );
  }

  static Future<void> _show(FlutterLocalNotificationsPlugin plugin, Map<String, dynamic> data,
      {String? title, String? body}) async {
    final isCall = '${data['type'] ?? ''}' == 'call';
    var t = '${data['title'] ?? title ?? ''}'.trim();
    var b = '${data['body'] ?? body ?? ''}'.trim();
    if (isCall) {
      final caller = '${data['fromUserName'] ?? ''}'.trim();
      final video = '${data['callType'] ?? ''}' == 'video';
      if (t.isEmpty) t = caller.isNotEmpty ? caller : appName;
      if (b.isEmpty) b = video ? 'Incoming video call' : 'Incoming voice call';
    }
    if (t.isEmpty || b.isEmpty) {
      print("⚠️ Skipping notification with empty title or body");
      return;
    }
    final id = isCall ? callNotificationId : DateTime.now().millisecondsSinceEpoch.remainder(100000);
    await plugin.show(id, t, b, _details(isCall: isCall), payload: jsonEncode(data));
  }

  void getNotificationToken(Function(String token) completion) {
    FirebaseMessaging.instance.getToken().then((value) {
      print('Token: ${value}');
      completion(value ?? 'No Token');
    }).catchError((e) {
      print('getToken failed: $e');
    });
  }

  /// Subscribes to the platform announcement topic when the user allows push
  /// notifications ([force] skips the stored-flag check, e.g. right after the
  /// user switched notifications on).
  void subscribeToTopic(String topic, {bool force = false}) async {
    var user = SessionManager.shared.getUser();
    if (force || user == null || user.isPushNotifications == 1) {
      await firebaseMessaging
          .subscribeToTopic('${topic}_${Platform.isIOS ? 'ios' : 'android'}')
          .onError((error, stackTrace) {
        print(error);
      });
    }
  }

  void unsubscribeToTopic(String topic) async {
    await firebaseMessaging.unsubscribeFromTopic('${topic}_${Platform.isIOS ? 'ios' : 'android'}');
  }

  /// Kept for older call sites; listeners are registered once in [init].
  void setupListener() {}
}
