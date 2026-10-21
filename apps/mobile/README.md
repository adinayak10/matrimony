# apps/mobile — BanjaraMatch Flutter app

The app lives in the monorepo but is **never built on the VPS**: there is no
Dart/Flutter toolchain there and the signing keystore must not be on a
server that is reachable from the internet. Build, sign and publish from a
laptop.

- Package: `com.banjaramatch` (`android/app/build.gradle`), `pubspec.yaml` name `banjaramatch`.
- Version: `version: 1.1.0+N` in `pubspec.yaml` (1.1.0+5 is the feature-expansion release). `N` is the Android
  `versionCode` and is what the forced-update check compares (see below).
- API host: `https://api.banjaramatch.com/` (`lib/utilities/const.dart`).
  The host and the `/socket.io` path must not change; every installed app has them baked in.
- Firebase client config (`android/app/google-services.json`,
  `ios/Runner/GoogleService-Info.plist`) is committed on purpose: the keys in
  it are client identifiers restricted by package + signing certificate, not
  secrets (`.gitleaks.toml` allowlists them).

## One-time laptop setup

1. Install Flutter (stable channel) and Android Studio / the Android SDK.
2. `git clone` the repo and `cd apps/mobile`.
3. Copy the signing files from the server's secrets folder
   (`/var/www/banjaramatch-shared/secrets/`) or from the password manager:
   - `android/key.properties`
   - `android/upload-keystore.jks` (the path inside `key.properties` must point at it)

   Both are gitignored. **Never commit them** and never put them anywhere
   under `apps/mobile` that is not ignored. Keep a copy in the password manager;
   if the upload keystore is lost the app cannot be updated on Play.
4. `flutter pub get`.

## Build

```sh
cd apps/mobile
# 1. bump the build number first, e.g. 1.0.0+4
#    (pubspec.yaml: version: 1.0.0+<N>)
flutter pub get
flutter analyze

# sideload / admin APK manager
flutter build apk --release
#   -> build/app/outputs/flutter-apk/app-release.apk

# Google Play
flutter build appbundle --release
#   -> build/app/outputs/bundle/release/app-release.aab
```

`android/app/build.gradle` signs the release build with
`signingConfigs.release` read from `key.properties`; if the file is missing
the build fails at the signing step, which is the intended guard.

## 1.1.0 laptop build checklist

1.1.0 (feature expansion, `docs/plans/01-feature-expansion.md` Track M) was
written on the server without a Flutter toolchain, so the first laptop build
is also its first compile:

1. `git pull`, then `cd apps/mobile`.
2. `flutter clean && flutter pub get` — the dependency list changed
   (removed: cloud_firestore, purchases_flutter, camera, the old social-feed
   widgets, app_tracking_transparency, sign_in_with_apple …; added:
   agora_rtc_engine, permission_handler, geolocator, http_parser, mime), so
   `pubspec.lock` is regenerated here. Commit the new `pubspec.lock`.
3. `flutter analyze` — must report no errors. Fix anything it finds before building.
4. iOS only: `cd ios && pod install --repo-update && cd ..` (the Podfile now
   sets the permission_handler macros for camera, microphone, location
   when-in-use and notifications).
5. `flutter build apk --release` (admin APK manager) and/or
   `flutter build appbundle --release` (Play). Version is `1.1.0+5`.
6. Smoke test on a phone: login, Explore, Matches, Interests, chat (text and
   an image), notification permission prompt, then the 1.1.0 features as they land.
7. Calls need real `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` in the API env;
   without them `/api/calls/token` answers 503 and the call screens show the error.

## Publish

Two channels, same build:

1. **Admin APK manager** (`https://admin.banjaramatch.com/apk-manager`):
   upload `app-release.apk` with the version name, the build number as
   `versionCode`, release notes, and the "mandatory update" switch. This is
   `POST /api/admin/apk/upload`; the file is stored under
   `/var/www/banjaramatch-shared/uploads/apk/` and `Setting.apk` is updated.
   Installed apps pick the new version up on their next cold start.
2. **Google Play**: upload the `.aab` in Play Console as usual.

Optionally archive each build on GitHub:
`gh release create app-1.0.0+N build/app/outputs/flutter-apk/app-release.apk`.

## Forced-update API contract

The update prompt only works while these keep today's behaviour. Server
changes must not alter them without an app release that goes out first.

| Call | Used for |
|---|---|
| `POST /api/fetchSetting` (public, body `{}`) | returns `data.settings.apk` = `{versionName, versionCode, fileName, filePath, fileSize, releaseNotes, isMandatoryUpdate, downloadCount, lastUpdated}` |
| `GET /api/download-apk` (public) | streams the current APK (`Content-Type: application/vnd.android.package-archive`) |
| `GET https://api.banjaramatch.com/uploads/apk/<file>` | direct download; `filePath` is `/uploads/apk/<file>` and the app prefixes the API host when it is relative |
| `POST /api/fetchProfile` | must keep working for old clients (splash flow) |
| host `api.banjaramatch.com` + path `/socket.io` | chat |

Client logic (`lib/utilities/update_checker.dart`): after the settings load,
compare `apk.versionCode` with the app's own build number; if the server's
is greater show the update screen, dismissible unless `isMandatoryUpdate`
is `true`, then download `filePath` and install it (`REQUEST_INSTALL_PACKAGES`).

## Known follow-ups (Track D, laptop only)

Listed in `docs/plans/00-master-plan.md` Phase 3k: socket `auth.token`, update
check independent of `fetchProfile`, real logout, drop `is_verified` from
`editProfile`, remove placeholder images, single `--dart-define=API_HOST`,
then publish `1.0.0+4` as a mandatory update.
