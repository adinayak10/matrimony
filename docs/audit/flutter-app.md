# flutter-app

## summary
I went through the Flutter app at /var/www/banjaramatch.com/banjaramatch_app: pubspec, main.dart, const.dart, web_service.dart, api_service.dart, the session, notification, subscription and cache managers, the Android Gradle files and manifest, iOS Info.plist and entitlements, all .gitignore files, the docs, and analysis_options. The app is a reskin of a vendor template (Retrytech 'chatter' social app). It is still called 'untitled' in pubspec and imports, the Kotlin source sits under com/retrytech/chatter/untitled, and the iOS associated domains still point at chatter.app.link. Of the app's ~133 endpoint constants, 59 (posts, rooms, stories, follow, FAQs, banners, logOut and others) are not served by the API's /api routers. The only API host is hardcoded in three places: const.dart baseURL, socketservice.dart and update_checker.dart. All of them use https://api.banjaramatch.com, so that host must stay as it is through the monorepo move. Signing material is sitting loose in the tree: android/key.properties, android/upload-keystore.jks, and a file named 'orange' at the app root that is a PKCS12 keystore from the template vendor. The folder is not a git repo yet. android/.gitignore covers key.properties and *.jks but nothing covers 'orange', so that file would be committed by a monorepo `git add -A`. HTTP probes return 404 for these files, so the website does not serve them. Firebase is mixed up: Android and the API's service account use project socialmedia-dcdd8, iOS GoogleService-Info.plist points at chatter-2ee95, and the Firestore rules in the tree allow anyone to read and write. The most serious issue sits between the app and the API. The app sends `user_id` and `is_verified` to /api/editProfile, and that route has no `authenticate` middleware and accepts is_verified and membership from the request body. That means anyone can edit any user's profile, mark themselves verified, or upgrade their own membership. Also broken: Branch keys are placeholders, the Android App Links target banjaramatch.com but /.well-known/assetlinks.json returns 404, the hardcoded terms/privacy fallback URLs return 404, AdMob uses Google's sample test ID, and RevenueCat keys are empty or placeholders. There is no Flutter toolchain on this VPS. The feribazaar deploy.ps1 approach (build the signed .aab on the laptop, attach it to a GitHub Release, publish to Play from a workflow) can be reused almost as-is once the paths and package name are changed.

## findings (18)

### [CRITICAL][security] App sends user_id + is_verified to unauthenticated /api/editProfile, so anyone can edit any profile and self-verify or upgrade membership
- where: /var/www/api.banjaramatch.com/routes/userRoutes.js:13
- evidence: userRoutes.js:13 `router.post('/editProfile',  upload.uploadProfileImages, UserController.editProfile);` (no authenticate). UserController.js:128-144 destructures `user_id, ... is_verified, ... membership` from req.body; :164 `User.findById(user_id)`; :276 `if (membership) user.membershipPlan = membership;` :335 `if (is_verified !== undefined) user.is_verified = Boolean(is_verified);`. App side: lib/common/managers/subscription_manager.dart:187-188 `UserService.shared.editProfile( isVerified: isSubscribe ? 3 : 0,` and lib/utilities/params.dart:46 `static const isVerified = 'is_verified';`
- impact: Anyone with curl can POST {user_id:<victim>, is_verified:1, membership:'premium', bio:'...'} and change any user's profile, verification badge or paid plan, with no login. Paid features can be had for free, and a matrimony site's verification badge stops meaning anything.
- fix: Add the authenticate middleware to editProfile (and the other user routes). Take the user id from req.user, not the body, and drop is_verified/membership from what users can edit; only the admin or a payment webhook should set them. Remove the client-side editProfile(isVerified:) call in subscription_manager.dart.

### [CRITICAL][secrets] Release keystore, key.properties and a vendor PKCS12 keystore ('orange') sit in the app tree, and 'orange' is not gitignored
- where: /var/www/banjaramatch.com/banjaramatch_app/orange:1
- evidence: ls: `-rw-r--r-- 1 root root  2524 Dec 10  2024 orange` (binary PKCS12, `file`: data), `android/key.properties` (113 bytes; keys: storePassword,keyPassword,keyAlias,storeFile), `android/upload-keystore.jks` (2268 bytes). android/.gitignore covers only `key.properties`, `**/*.keystore`, `**/*.jks`; the root .gitignore has no entry for 'orange'.
- impact: Turning this folder into a monorepo with `git add -A` (the exact mistake feribazaar's deploy.ps1:48-50 warns about) would push the 'orange' keystore, and key.properties too if the root ignore is ever changed. If the upload key and password leak, anyone can sign APKs as com.banjaramatch, which also feeds the self-update flow.
- fix: Before `git init`, move key.properties, upload-keystore.jks and 'orange' out of the tree (keep them only on the owner's laptop or in a password manager). Add `**/key.properties`, `**/*.jks`, `**/*.keystore`, `**/*.p12` and `banjaramatch_app/orange` to the root .gitignore, and add a gitleaks CI job like feribazaar's .gitleaks.toml. File permissions are 644 root, so also check who else can read them on the VPS.

### [HIGH][security] Firestore rules in the tree allow anyone to read and write, and the app still writes block state to Firestore
- where: /var/www/banjaramatch.com/banjaramatch_app/android/firestore.rules:4
- evidence: `match /{document=**} {
      allow read, write: if true;` ; android/.firebaserc `"default": "socialmedia-dcdd8"` ; lib/screens/chats_screen/chatting_screen/block_user_controller.dart:27 `FirebaseFirestore.instance
 .collection(FirebaseConst.users)`
- impact: If these rules are deployed to socialmedia-dcdd8 (the same project the API's serviceAccountKey.json uses), anyone can read or overwrite every document in Firestore, including users' block lists.
- fix: Check the live rules in the Firebase console. Lock them down (deny all, or auth-scoped rules), or drop Firestore from the app altogether, since blocking is already handled by the API (UserBlockedByUser). Remove cloud_firestore if it ends up unused.

### [HIGH][infra] iOS and Android point at different Firebase projects
- where: /var/www/banjaramatch.com/banjaramatch_app/ios/Runner/GoogleService-Info.plist:1
- evidence: iOS plist: `<key>PROJECT_ID</key> <string>chatter-2ee95</string>`, GCM_SENDER_ID 283720524531; android/app/google-services.json: `"project_id": "socialmedia-dcdd8"`, project_number 799990198329; api serviceAccountKey.json project_id socialmedia-dcdd8
- impact: An iOS build would register FCM tokens and Firebase Auth in the template vendor's project, so the API (admin SDK on socialmedia-dcdd8) cannot push to iOS users or verify their Google/Firebase ID tokens.
- fix: Register the com.banjaramatch iOS app in socialmedia-dcdd8, then replace GoogleService-Info.plist and the reversed-client-id URL scheme in Info.plist:32.

### [HIGH][business-logic] 59 endpoint constants call routes the API does not serve (template leftovers)
- where: /var/www/banjaramatch.com/banjaramatch_app/lib/utilities/web_service.dart:22
- evidence: `static const String logOut = "${apiURL}logOut";` plus acceptInvitation, addPost, addUser, createRoom, createStory, fetchPosts, fetchFAQs, fetchBanners, fetchPackages, followUser, profileVerification, pushNotificationToSingleUser, reportPost, searchProfile, uploadFile, viewStory ... (59 in total). None of them match a route in settingsRoute/userRoutes/aboutRoutes/authRoute (case-insensitive check). The API's logout is `router.post('/logout', AuthController.logout)` under /api/auth.
- impact: Screens that still call these (FAQ in common_service.dart:71, logOut in user_service.dart:457, addUser user_service.dart:643, feed/rooms/stories) get 404 HTML, which surfaces as 'Invalid response from server' (api_service.dart:82). Logout never revokes the token on the server.
- fix: Delete the dead social-template features (posts, rooms, stories, follow) along with their services, models and screens. Point logout at /api/auth/logout. Add a CI check that diffs web_service.dart against the API route list.

### [HIGH][infra] API host hardcoded in three places; moving it breaks every installed app
- where: /var/www/banjaramatch.com/banjaramatch_app/lib/utilities/const.dart:5
- evidence: const.dart:5 `const String baseURL = "https://api.banjaramatch.com/";`; socketservice.dart:15 `final String baseUrl = 'https://api.banjaramatch.com';`; update_checker.dart:50 `downloadUrl = 'https://api.banjaramatch.com$downloadUrl';`
- impact: If the monorepo moves the API to banjaramatch.com/api or another host, every installed APK loses all REST calls, chat sockets (websocket-only transport) and self-update downloads. Image URLs built with addBaseURL() (itemBaseURL) break too. Old installs cannot be fixed without an update, and the update path depends on this same host.
- fix: Keep api.banjaramatch.com as a permanent nginx host, even if it proxies into the monorepo's single node process, and keep the /api/*, /socket.io and uploads paths unchanged. In the app, read the host from one place (`--dart-define=API_HOST`) instead of three literals.

### [HIGH][seo-applinks] Android App Links autoVerify targets banjaramatch.com but assetlinks.json returns 404; Branch keys are placeholders
- where: /var/www/banjaramatch.com/banjaramatch_app/android/app/src/main/AndroidManifest.xml:45
- evidence: `<intent-filter android:autoVerify="true">` ... `<data android:host="banjaramatch.com" />` ... `<data android:host="alternate.banjaramatch.com" />`; :68 `android:value="your_branch_live_key"`; Info.plist:96 `<string>your_branch_live_key</string>`; Runner.entitlements `chatter.app.link`. curl: https://banjaramatch.com/.well-known/assetlinks.json returns 404 (www returns a 301 to the apex)
- impact: Links to banjaramatch.com never verify and open in the browser. FlutterBranchSdk.init() in main.dart:207 runs with an invalid key, so profile share deep links (Param.userId) do not work. The iOS associated domains belong to the template vendor.
- fix: Either set up Branch properly (real keys, banjaramatch.app.link) or drop Branch and serve /.well-known/assetlinks.json and apple-app-site-association from the website using the upload/Play signing SHA-256. Remove the unused alternate.banjaramatch.com host.

### [MEDIUM][security] Cleartext traffic and arbitrary loads allowed
- where: /var/www/banjaramatch.com/banjaramatch_app/android/app/src/main/AndroidManifest.xml:9
- evidence: `android:usesCleartextTraffic="true">`; ios/Runner/Info.plist:52-53 `<key>NSAllowsArbitraryLoads</key>
		<true/>`
- impact: Any http:// URL (for example the 'http://www.yourHelpURL.com' fallback, or an http APK filePath from settings) is fetched unencrypted, so a MITM can tamper with what the app loads, including the self-update APK download.
- fix: Set usesCleartextTraffic=false and remove NSAllowsArbitraryLoads. Every production host is already https.

### [MEDIUM][security] Self-updating APK plus REQUEST_INSTALL_PACKAGES, with no signature or checksum check
- where: /var/www/banjaramatch.com/banjaramatch_app/android/app/src/main/AndroidManifest.xml:4
- evidence: `<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />`; UPDATE_FEATURE_README.md: 'APK Signature Verification: Verify APK authenticity before installing' listed under Future Enhancements; update_checker.dart:50 builds the download URL from settings.apk.filePath
- impact: Whoever controls admin settings or the upload path (admin.banjaramatch.com/apk-manager) can push an arbitrary APK to every user. Google Play also restricts this permission and bans apps that update themselves, which blocks a Play listing.
- fix: For Play builds, remove the self-update code and permission and use the feribazaar .aab and Play pipeline. If sideload distribution stays, verify the SHA-256 and signing cert before install and serve the APK over https only.

### [MEDIUM][security] Static 'apikey: 123' header, FCM token printed in release builds, bearer token stored in plain GetStorage
- where: /var/www/banjaramatch.com/banjaramatch_app/lib/common/api_service/api_service.dart:25
- evidence: api_service.dart:25 `'apikey': '123',`; main.dart:169 `print('🔐 FCM Token: $token');`; firebase_notification_manager.dart:92 `print('Token: ${value}');`; session_manager.dart:43 `storage.write(SessionKeys.token, token);`. There are 189 `print(` calls in lib, and only 11 are guarded by kDebugMode/debugPrint.
- impact: The apikey adds no protection. Tokens and the API responses printed in multiPartCallApi (api_service.dart:198-202, unguarded) show up in logcat on release builds.
- fix: Wrap logging in kDebugMode or use a logger with release stripping, and remove the apikey header or replace it with real auth. Store the JWT with flutter_secure_storage.

### [MEDIUM][business-logic] Default GetStorage container is never initialised before SessionManager reads login state
- where: /var/www/banjaramatch.com/banjaramatch_app/lib/main.dart:48
- evidence: main.dart:48 `await CacheManager.shared.init();` then :50 `SessionManager.shared;` and :67 `if (SessionManager.shared.isLogin())`; the only init call is cache_manager.dart:14 `await GetStorage.init('api_cache');` (no `GetStorage.init()` for the default box used by session_manager.dart:10 `var storage = GetStorage();`)
- impact: On a cold start, isLogin() and getToken() can read an empty box, so the socket is not started and the API is called without a Bearer token until the box loads. Users may look logged out or miss chat badge counts.
- fix: Add `await GetStorage.init();` before touching SessionManager, and connect the socket after the login state has loaded.

### [MEDIUM][placeholder] Placeholder or stock images and URLs left in production screens
- where: /var/www/banjaramatch.com/banjaramatch_app/lib/screens/explore_screen/Explorescreen.dart:643
- evidence: Explorescreen.dart:643 `: "https://picsum.photos/400/240?random=$index",`; :763 `'image1': 'https://picsum.photos/60/60?random=${index * 2}',` (with hardcoded 'Raj & Priya' success stories); further picsum at :1171, :1501, :2261, :2479; profile_screen.dart:2034 `NetworkImage('https://picsum.photos/400/300?random=1')`, :2086, :2259; ExplorerController.dart:465-502 themost.com.tr stock photos; models/matches.dart:11-253 pinimg/ftcdn/imagesvibe photos of real people
- impact: Users see random photos and made-up couples on a matrimony app, which hurts trust and may infringe image rights. If Explorescreen.dart:763 is reachable, the success stories are fake testimonials.
- fix: Replace these with local assets or skeleton loaders, take success stories from fetchHappyStories (or remove the section), and delete models/matches.dart and component/cartwithdetails.dart if they are only demo code.

### [MEDIUM][placeholder] Template constants never filled in: help URL, contact email, RevenueCat keys, AdMob test ID
- where: /var/www/banjaramatch.com/banjaramatch_app/lib/utilities/const.dart:10
- evidence: const.dart:10 `const String helpURL = "http://www.yourHelpURL.com";`, :13 `revenuecatAppleApiKey = 'your_ios_revenuecat_api_key';`, :14 `revenuecatAndroidApiKey = '';`, :16 `contactEmail = 'yourContactMail';`; setting_screen.dart:127 and settings_screen_side.dart:90 fall back to 'http://www.yourHelpURL.com'; AndroidManifest.xml:62 and Info.plist:47 `ca-app-pub-3940256099942544~1458002511` (Google sample ID)
- impact: If settings.helpUrl is missing, Help opens a dead domain over http. SubscriptionManager.initPlatformState still calls Purchases.getOfferings without configure on Android. Purchases do nothing at all (makePurchase is fully commented out, subscription_manager.dart:241-249).
- fix: Point help at https://www.banjaramatch.com/contact (or similar) and set contactEmail. Remove RevenueCat and AdMob unless they are actually planned, or configure them properly.

### [MEDIUM][bug] Hardcoded terms and privacy fallback URLs return 404
- where: /var/www/banjaramatch.com/banjaramatch_app/lib/screens/login_screen/login_screen.dart:96
- evidence: login_screen.dart:96 `SessionManager.shared.getSettings()?.termsUrl ?? 'https://api.banjaramatch.com/termsOfUse');` and :118 privacyPolicy; const.dart:8-9 `termsURL = "${baseURL}termsOfUse"`. curl: `404 https://api.banjaramatch.com/termsOfUse`, `404 https://api.banjaramatch.com/privacyPolicy`
- impact: When the settings call fails (offline or on first launch), the login-screen consent links open a 404. Both stores require a working privacy policy link.
- fix: Use the website pages (UPDATE_FEATURE_README shows termsUrl https://www.banjaramatch.com/terms-conditions) as the fallbacks in const.dart and in all screens.

### [MEDIUM][build] Release build has R8 disabled and points at a missing proguard file; versionCode is still 3
- where: /var/www/banjaramatch.com/banjaramatch_app/android/app/build.gradle:84
- evidence: `minifyEnabled false
            shrinkResources false
            proguardFiles getDefaultProguardFile(
                    'proguard-android-optimize.txt'
            ), 'proguard-rules.pro'` (android/app/proguard-rules.pro does not exist); pubspec.yaml `version: 1.0.0+3`; android/app/release/output-metadata.json `"applicationId": "com.socialmedianew"`
- impact: The APK is bigger and unobfuscated. Turning minify on now would fail or strip plugin classes because there are no rules. The stale release metadata is from a different app id.
- fix: Add proguard-rules.pro (Flutter, Firebase and socket keep rules) and enable minify/shrink. Bump the version on each release, as feribazaar's deploy.ps1 Get-AppVersion does. Delete android/app/release.

### [MEDIUM][repo-hygiene] About 40 MB of build and IDE junk in the tree, a broken analysis_options.yaml, and a template test that would fail
- where: /var/www/banjaramatch.com/banjaramatch_app/analysis_options.yaml:25
- evidence: analysis_options.yaml:25-26 `avoid_print: false
      - implementation_imports` (invalid YAML: a list item under a map value). du: android/.gradle 35M, android/app/.cxx 4.4M, .idea 256K, android/.idea 164K, android/build 152K, ios/.symlinks 92K, android/.kotlin 8K, plus ios/build and ios/chatter. test/widget_test.dart:15 `testWidgets('Counter increments smoke test'` expects find.text('0'). Empty flutter_01.png, .flutter-plugins*, android/local.properties (`flutter.sdk=C:\\flutter`)
- impact: `flutter analyze` errors out on the YAML, so lints never run. A careless first commit would add about 40 MB of Gradle cache, and the test fails as soon as CI runs it.
- fix: Monorepo .gitignore: banjaramatch_app/{build,.dart_tool,.idea,android/.gradle,android/.kotlin,android/app/.cxx,android/build,android/app/release,android/local.properties,ios/build,ios/.symlinks,ios/Pods,ios/Flutter/Generated.xcconfig,ios/Flutter/ephemeral,.flutter-plugins*}, plus flutter_01.png. Fix analysis_options to `rules:\n  avoid_print: false\n  implementation_imports: true`. Replace the test with a real smoke test.

### [LOW][dependencies] Duplicate, unused and missing dependencies
- where: /var/www/banjaramatch.com/banjaramatch_app/pubspec.yaml:30
- evidence: Import counts in lib: pinch_zoom=0, backdrop=0, sign_in_with_apple=0 (only commented code at login_controller.dart:264), zoom_pinch_overlay=1, photo_view=1 (three zoom libraries); `flutter_lints: ^5.0.0` listed under dependencies instead of dev_dependencies; google_mobile_ads imported by lib/common/managers/ads/banner_ad.dart and interstitial_manager.dart but missing from pubspec (those files are only imported by commented-out lines); http_parser and mime imported directly (api_service.dart:7,9) but only present as transitive deps; cloud_firestore used only for block flags
- impact: Larger app, slower builds, and a latent compile error if someone uncomments the ad imports. depend_on_referenced_packages lint warnings.
- fix: Remove pinch_zoom, backdrop, sign_in_with_apple (unless iOS Apple login is planned), and either zoom_pinch_overlay or photo_view. Move flutter_lints to dev_dependencies. Delete the ads folder or add google_mobile_ads. Declare http_parser and mime explicitly.

### [LOW][cleanup] Template identity everywhere: package 'untitled', 'A new Flutter project', vendor Kotlin path, debug prints in main
- where: /var/www/banjaramatch.com/banjaramatch_app/pubspec.yaml:1
- evidence: pubspec.yaml:1-2 `name: untitled` / `description: A new Flutter project.`; every import is `package:untitled/...`; MainActivity at android/app/src/main/kotlin/com/retrytech/chatter/untitled/MainActivity.kt with `package com.banjaramatch.untitled`; manifest :11 `android:name=".untitled.MainActivity"`; main.dart:35 `print("akjhdkjasdklasdas");` :57, :69, :72; README.md is an old vendor changelog (26 Apr 2024); lib/library/* vendors camera_filters and story_view (68K each), used only by the story feature
- impact: Confusing to maintain. Renaming the package later touches all 259 dart files, so it is better done in one commit during the move.
- fix: Rename the package to banjaramatch (one sed over the imports), move MainActivity.kt to kotlin/com/banjaramatch/, and rewrite README with real build steps. Drop lib/library and the story screens if stories are not a matrimony feature.

## inventory
- App path: /var/www/banjaramatch.com/banjaramatch_app (not a git repo; /var/www/banjaramatch.com has no .git either). 259 .dart files; Explorescreen.dart 3301 lines, profile_screen.dart 2518 lines
- Dart package name: untitled (pubspec.yaml:1); description 'A new Flutter project.'
- Version: 1.0.0+3 (pubspec.yaml); local.properties flutter.versionName=1.0.0 versionCode=3
- Dart SDK constraint: '>=3.0.6 <4.0.0'; .metadata flutter revision d9111f64021372856901a1fd5bfbc386cade3318 (stable)
- Android: applicationId com.banjaramatch, namespace com.banjaramatch, compileSdk 36, minSdk 24, targetSdk 36, ndk 27.0.12077973, Java 11, multidex, desugaring; AGP 8.12.3, Kotlin 2.1.0 (buildscript) vs 2.2.21 (settings plugins), google-services 4.4.4, crashlytics plugin 3.0.6 declared apply false and unused; Gradle wrapper 9.2.1
- Android signing: app/build.gradle:31 reads rootProject.file('key.properties') -> storeFile/keyAlias/keyPassword/storePassword. Present in tree: android/key.properties (113B), android/upload-keystore.jks (2268B), app-root 'orange' (2524B PKCS12 vendor keystore). Release minifyEnabled=false; proguard-rules.pro is missing
- iOS: bundle id com.banjaramatch, DEVELOPMENT_TEAM WGTZ762S3W, IPHONEOS_DEPLOYMENT_TARGET 12.0 in pbxproj vs Podfile platform 14.0; aps-environment development; associated-domains chatter.app.link, chatter-alternate.app.link (vendor)
- Network host (REST): https://api.banjaramatch.com/ (const.dart:5 baseURL; apiURL = baseURL + 'api/'; itemBaseURL = baseURL, used for media via String.addBaseURL()); commented dev host http://192.168.1.9:4000/
- Socket.IO host: https://api.banjaramatch.com (lib/screens/chats_screen/socketservice.dart:15), transports ['websocket'], emits 'join' and listens to notification_count / new_match_request; /socket.io polling returns 200
- Self-update APK host: https://api.banjaramatch.com + settings.apk.filePath (lib/utilities/update_checker.dart:50); APK managed via admin.banjaramatch.com/apk-manager and GET /api/download-apk (api APK_MANAGER_GUIDE.md)
- Webview / sheet URLs: settings.termsUrl/privacyUrl/helpUrl, falling back to https://api.banjaramatch.com/termsOfUse and /privacyPolicy (both 404) and http://www.yourHelpURL.com
- Deep links: custom scheme banjaramatch://open (Android manifest :35-37, iOS CFBundleURLSchemes 'banjaramatch'); App Links autoVerify for https://banjaramatch.com and alternate.banjaramatch.com (assetlinks.json 404); Branch keys 'your_branch_live_key' / 'your_branch_test_key' (placeholders), branch_universal_link_domains banjaramatch.com, alternate.banjaramatch.com; Branch params postId/userId/roomId -> ProfileScreen / SingleRoomScreen
- Google sign-in: iOS URL scheme com.googleusercontent.apps.283720524531-7u258o7l8jv0uhkcv2jsbk11qff55lf0 (chatter-2ee95 project); GoogleSignIn.instance.initialize() with no serverClientId (login_controller.dart:133)
- Firebase config files: android/app/google-services.json (project socialmedia-dcdd8, #799990198329, package com.banjaramatch); ios/Runner/GoogleService-Info.plist (project chatter-2ee95, sender 283720524531); android/.firebaserc default socialmedia-dcdd8; android/firestore.rules (allow read, write: if true); api serviceAccountKey.json project socialmedia-dcdd8
- FCM: topic 'banjaramatch_android'/'banjaramatch_ios' (notificationTopic + platform), channel id 'banjaramatch'; the token is printed and never sent to the backend in main.dart getFcmToken()
- Third-party IDs: AdMob app id ca-app-pub-3940256099942544~1458002511 (Google test); RevenueCat keys empty or placeholder
- HTTP client: every API call is POST with JSON body, headers apikey:'123', Content-Type json, Authorization Bearer <GetStorage 'device_token_bearer'>; 30s timeout on call(), none on callAsync()
- Endpoints the app calls that exist on the API (/api prefix): fetchSetting, fetchUserNotification, editProfile, checkUsername, deleteUser, fetchRandomProfile, fetchProfile, reportUser, fetchFollowingList, fetchFollowersList, UserBlockedByUser, UserUnblockedByUser, fetchBlockedUserList, fetchUsersList, searchProfiles, sendInterestRequest, cancelInterestRequest, rejectInterestRequest, acceptInterestRequest, removeConnection, toggleShortList (API: toggleShortlist, Express is case-insensitive), fetchUserRooms, fetchPendingRooms, fetchMessages, fetchOrGenerateRoom, getProfileVisitorSummary, fetchCasteList, fetchGotraList, countries, states, cities, getInterestList, fetchBanner, getTopDailyMatches, fetchNearbyMatches, fetchTrendingProfiles, fetchHighlightedUsers, getMarriageIntent, getUserOnlinePattern, getMatchMomentum, markNotificationsRead, uploadUserPhotos, getUserPhotos, deleteUserPhoto, reorderUserPhotos, setMainProfileImage, fetchProfessionList, fetchQualificationList, fetchIncomeRange, comparePreferencesFit, fetchLiveActivity, about/options, about/generate, auth/request-otp, auth/verify-otp, auth/loginWithEmail, auth/registerWithEmail, auth/firebase-email-login, auth/firebase-email-register, auth/firebase-google-login
- Endpoints defined in the app with NO matching API route (59): acceptInvitation acceptRoomRequest addComment addPost addUser createRoom createStory deleteComment deleteMyPost deleteStory dislikePost editRoom fetchBanners fetchBlogs fetchComments fetchFAQs fetchHappyStories fetchMyOwnRooms fetchPackages fetchPlatformNotification fetchPostByPostId fetchPostByUser fetchPosts fetchPostsByHashtag fetchPremiumUsers fetchRandomRooms fetchReviews fetchRoomAdmins fetchRoomDetail fetchRoomRequestList fetchRoomUsersList fetchRoomsByInterest fetchRoomsIAmIn fetchStories fetchStory fetchtrustedUsers followUser getInvitationList inviteUserToRoom joinOrRequestRoom leaveThisRoom likePost logOut makeRoomAdmin muteUnmuteRoomNotification profileVerification pushNotificationToSingleUser rejectInvitation rejectRoomRequest removeAdminFromRoom removeUserFromRoom reportPost reportRoom searchProfile searchUserForInvitation unfollowUser uploadFile viewStory
- Dir sizes (app root): android 40M (of which android/.gradle 35M, android/app/.cxx 4.4M, android/build 152K, android/.idea 164K, android/.kotlin 8K, android/app/release 28K), lib 2.9M (screens 1.9M, localization 396K, library 136K), assets 2.2M, ios 1.3M (ios/.symlinks 92K, ios/build, ios/chatter leftovers), .idea 256K, test 8K, pubspec.lock 44K. No build/ or .dart_tool/ at the app root
- Paths to gitignore in the monorepo: banjaramatch_app/{build/,.dart_tool/,.idea/,.flutter-plugins,.flutter-plugins-dependencies,flutter_01.png,orange,android/.gradle/,android/.kotlin/,android/.idea/,android/build/,android/app/.cxx/,android/app/release/,android/local.properties,android/key.properties,**/*.jks,ios/build/,ios/.symlinks/,ios/Pods/,ios/Flutter/Generated.xcconfig,ios/Flutter/ephemeral/,ios/Flutter/flutter_export_environment.sh}
- Existing app .gitignore already covers .idea/, .dart_tool/, /build/, .flutter-plugins*, /android/app/release; android/.gitignore covers /.gradle, /local.properties, key.properties, **/*.jks, **/*.keystore; ios/.gitignore covers Generated.xcconfig and ephemeral/. Not covered: 'orange', android/.kotlin, android/app/.cxx, android/build
- Website check: https://www.banjaramatch.com/banjaramatch_app/* returns 404 (web app.js:114 serves only ./public), so the keystore files are not exposed over HTTP
- No Flutter toolchain on the VPS; local.properties shows the app is built on Windows (flutter.sdk=C:\\flutter)

## reusable
- /var/www/feribazaar.com/deploy.ps1: reusable almost as-is. Change $Repo, flutter_app_v2 -> banjaramatch_app and the file names. Get-AppVersion (pubspec x.y.z+N), Build-AppBundle (flutter build appbundle on the laptop that holds the key, SHA256SUMS, mapping.txt), Publish-AppBundle (gh release create app-<ver>-<build>), explicit staging (no git add -A), branch guard, and pre-push lint/lockfile/test checks
- /var/www/feribazaar.com/.github/workflows/android-publish.yml: reusable for Play publishing. Change packageName com.feribazaar.app -> com.banjaramatch; secrets PLAY_SERVICE_ACCOUNT_JSON, vars ANDROID_UPLOAD_CERT_SHA256 / PLAY_RELEASE_STATUS; keytool cert check and r0adkll/upload-google-play@v1. Needs release.yml (the admin-panel trigger) as its caller, also in /var/www/feribazaar.com/.github/workflows/
- /var/www/feribazaar.com/.gitignore (lines 15-63): monorepo patterns for a Flutter subfolder (**/key.properties, flutter_app_v2/android/build/, flutter_app_v2/dist/, .idea/)
- /var/www/feribazaar.com/.gitleaks.toml: gitleaks config that allowlists google-services.json; copy it with banjaramatch_app paths
- /var/www/feribazaar.com/ecosystem.config.js and /var/www/feribazaar.com/deploy/: the pm2 + push-webhook deploy pattern ('push to main goes live by itself') the user wants for banjaramatch
- /var/www/banjaramatch.com/banjaramatch_app/lib/common/managers/cache_manager.dart: TTL cache over GetStorage (short/medium/long), worth keeping
- /var/www/banjaramatch.com/banjaramatch_app/lib/common/api_service/api_service.dart: one POST wrapper with timeout and error mapping, the single place to add a dart-define host, auth refresh and logging guards
- /var/www/banjaramatch.com/banjaramatch_app/lib/utilities/web_service.dart: the single endpoint registry; prune it to the ~60 live routes and use it for an app/API contract check in CI
- /var/www/banjaramatch.com/banjaramatch_app/lib/utilities/const.dart: brand color palette (cPrimary 0xFFB83227 etc.), which can feed the shared web/admin design tokens

## open_questions
- Is the app on Google Play, or only sideloaded through the self-update APK at /api/download-apk? That decides whether REQUEST_INSTALL_PACKAGES and the update flow stay, and whether the feribazaar Play pipeline applies.
- Is iOS shipped at all? The iOS Firebase project (chatter-2ee95), associated domains and URL scheme are all from the template vendor.
- Are the open Firestore rules in android/firestore.rules actually deployed to socialmedia-dcdd8? Check in the Firebase console.
- Is android/upload-keystore.jks the real Play upload key, and does the owner's laptop hold a backup? It must leave the server tree before the monorepo git init.
- Which template features (posts, rooms, stories, follow) are still visible in the UI? 59 of their endpoints return 404 on the API, so they are probably dead and could be deleted.
- Should Branch be configured or replaced with self-hosted assetlinks.json / apple-app-site-association on banjaramatch.com?
- After the monorepo move, will api.banjaramatch.com stay as an nginx server_name? Every installed app depends on it for REST, the websocket and APK downloads.
