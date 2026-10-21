import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_branch_sdk/flutter_branch_sdk.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:get/get.dart';
import 'package:http/http.dart';
import 'package:one_context/one_context.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:banjaramatch/common/managers/firebase_notification_manager.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/managers/cache_manager.dart';
import 'package:banjaramatch/common/widgets/functions.dart';
import 'package:banjaramatch/localization/allLanguages.dart';
import 'package:banjaramatch/screens/OnboardingWrapperScreen.dart';
import 'package:banjaramatch/screens/chats_screen/socketservice.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/splash_screen/splash_screen_view.dart';
import 'package:banjaramatch/screens/tabbar/tabbar_controller.dart';
import 'package:banjaramatch/screens/tabbar/tabbar_screen.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/params.dart';

import 'localization/languages.dart';

void main() async {
  print("akjhdkjasdklasdas");
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  await Firebase.initializeApp();
  // Set the background messaging handler early on, as a named top-level function
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  // ⚡ Initialize cache manager for API response caching
  await CacheManager.shared.init();
  
  SessionManager.shared;
  FirebaseNotificationManager.shared;
  PackageInfo.fromPlatform();
  print(";lkjsfdlksajf;kljsadfsadf");

  runApp(const MyApp());
  // OnePlatform.app = () => MyApp();

  // Register TabBarController early
  Get.put(TabBarController());

  Get.put(ProfileController(SessionManager.shared.getUserID())); // 👈 Register here

  if (SessionManager.shared.isLogin()) {
    // ⬇️ Initialize your socket connection here ONCE
    print("oaisdfjlsadf");
    SocketService.shared.startCommonListening();
  } else {
    print("oaisdfjlsadfsadfrd");
  }

  setupLocalNotifications();
  OnePlatform.app = () => MyApp();
}

void showLocalNotification({required String title, required String body, required String payload}) async {
  const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
    'chat_channel',
    'Chat Notifications',
    importance: Importance.max,
    priority: Priority.high,
  );

  const NotificationDetails notificationDetails = NotificationDetails(android: androidDetails);

  await flutterLocalNotificationsPlugin.show(
    0,
    title,
    body,
    notificationDetails,
    payload: payload,
  );
}

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

Future<void> setupLocalNotifications() async {
  const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

  final InitializationSettings settings = InitializationSettings(android: androidSettings);

  await flutterLocalNotificationsPlugin.initialize(
    settings,
    onDidReceiveNotificationResponse: (NotificationResponse response) {
      final payload = response.payload;
      if (payload != null && payload.contains('|')) {
        final parts = payload.split('|');
        final userId = parts[0];
        final userName = parts.length > 1 ? parts[1] : '';

        // Navigate using Get or Navigator
        //  Get.to(() => ChatScreen(userId: userId, userName: userName));
      }
    },
  );
}

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print("Handling a background message: ${message.data}");
  await Firebase.initializeApp();
  FirebaseNotificationManager.shared.showNotification(message);
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    Functions.changStatusBar(StatusBarStyle.black);
    Lang lang = SessionManager.shared.getLang();
    getFcmToken();
    return GetMaterialApp(
      builder: OneContext().builder,
      navigatorKey: OneContext().key,
      // ADD THIS
      translations: Languages(),
      locale: lang.language.local,
      fallbackLocale: LANGUAGES.first.language.local,
      debugShowCheckedModeBanner: false,
      title: appName,
      theme: ThemeData(useMaterial3: false),
      home: const MyHomePage(),
      getPages: [
        GetPage(name: '/dashboard', page: () => TabBarScreen()),
        GetPage(
            name: '/onboarding',
            page: () => const OnboardingWrapperScreen(
                  startPage: 0,
                )),
        // Add more pages if needed
      ],
    );
    ;
  }
}

Future<void> getFcmToken() async {
  FirebaseMessaging messaging = FirebaseMessaging.instance;

  // Request permission on iOS
  await messaging.requestPermission();

  // Get the token
  String? token = await messaging.getToken();
  print('🔐 FCM Token: $token');

  // You can now send this token to your backend
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  @override
  void initState() {
    handleBranch();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SplashScreenView(),
    );
  }

  Future<String> downloadImage({required String url}) async {
    var response = await get(Uri.parse(url)); // <--2
    var documentDirectory = await getApplicationDocumentsDirectory();
    var firstPath = "${documentDirectory.path}/images";
    var filePathAndName = '${documentDirectory.path}/images/pic.jpg';
    await Directory(firstPath).create(recursive: true); // <-- 1
    File file2 = File(filePathAndName); // <-- 2
    file2.writeAsBytesSync(response.bodyBytes);
    return filePathAndName;
  }

  void handleBranch() {
    FlutterBranchSdk.init().then((value) {
      FlutterBranchSdk.listSession().listen(
        (data) {
          if (data.containsKey("+clicked_branch_link") && data["+clicked_branch_link"] == true) {
            if (data.containsKey(Param.userId)) {
              var userId = data[Param.userId];
              if (userId is String) {
                Get.to(() => ProfileScreen(userId: userId));
              }

              // else if (userId is double) {
              //   Get.to(() => ProfileScreen(userId: userId));
              // }
            }
          }
          FlutterBranchSdk.clearPartnerParameters();
        },
        onError: (error) {
          PlatformException platformException = error as PlatformException;
          print(platformException.message);
        },
      );
    });
  }
}

class MyScrollBehavior extends ScrollBehavior {
  @override
  Widget buildOverscrollIndicator(BuildContext context, Widget child, ScrollableDetails details) {
    return child;
  }
}
