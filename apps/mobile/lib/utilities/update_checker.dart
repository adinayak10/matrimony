import 'package:get/get.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/models/setting_model.dart';
import 'package:banjaramatch/screens/update_screen/update_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

class UpdateChecker {
  static final UpdateChecker shared = UpdateChecker._internal();
  
  factory UpdateChecker() {
    return shared;
  }
  
  UpdateChecker._internal();

  /// Check for updates and show update screen if needed
  Future<void> checkForUpdates({bool showDialogIfNoUpdate = false}) async {
    try {
      final PackageInfo packageInfo = await PackageInfo.fromPlatform();
      final int currentVersionCode = int.tryParse(packageInfo.buildNumber) ?? 1;
      final String currentVersionName = packageInfo.version;

      print('📱 UPDATE CHECK START');
      print('Current Version: $currentVersionName ($currentVersionCode)');

      final ApkInfo? apkInfo = SessionManager.shared.getSettings()?.apk;

      if (apkInfo == null) {
        print('❌ No APK info available from server');
        return;
      }

      final int serverVersionCode = apkInfo.versionCode ?? 0;
      final String serverVersionName = apkInfo.versionName ?? '1.0.0';

      print('Server Version: $serverVersionName ($serverVersionCode)');
      print('APK FilePath: ${apkInfo.filePath}');
      print('Is Mandatory: ${apkInfo.isMandatoryUpdate}');

      // Check if update is available
      if (serverVersionCode > currentVersionCode) {
        final bool isMandatory = apkInfo.isMandatoryUpdate ?? false;
        
        print('✅ Update available! Mandatory: $isMandatory');
        
        // Fix relative URL if needed
        String downloadUrl = apkInfo.filePath ?? '';
        if (downloadUrl.isNotEmpty && !downloadUrl.startsWith('http')) {
          // Add base URL if path is relative
          downloadUrl = '$apiHost$downloadUrl';
          print('🔗 Fixed URL: $downloadUrl');
        }
        
        // Create updated ApkInfo with full URL
        final updatedApkInfo = ApkInfo(
          versionName: apkInfo.versionName,
          versionCode: apkInfo.versionCode,
          fileName: apkInfo.fileName,
          filePath: downloadUrl,
          fileSize: apkInfo.fileSize,
          releaseNotes: apkInfo.releaseNotes,
          isMandatoryUpdate: apkInfo.isMandatoryUpdate,
          downloadCount: apkInfo.downloadCount,
          lastUpdated: apkInfo.lastUpdated,
        );
        
        // Show update screen
        Get.to(
          () => UpdateScreen(
            apkInfo: updatedApkInfo,
            isMandatoryUpdate: isMandatory,
            currentVersion: currentVersionName,
          ),
          fullscreenDialog: true,
        );
      } else {
        print('ℹ️ App is up to date (Server: $serverVersionCode, Current: $currentVersionCode)');
        if (showDialogIfNoUpdate) {
          Get.snackbar(
            'Up to Date',
            'You are using the latest version of the app',
            snackPosition: SnackPosition.BOTTOM,
          );
        }
      }
    } catch (e) {
      print('❌ Error checking for updates: $e');
    }
  }

  /// Compare version strings (e.g., "1.2.3" vs "1.3.0")
  bool isVersionGreater(String newVersion, String currentVersion) {
    try {
      final List<int> newParts = newVersion.split('.').map((e) => int.tryParse(e) ?? 0).toList();
      final List<int> currentParts = currentVersion.split('.').map((e) => int.tryParse(e) ?? 0).toList();

      for (int i = 0; i < 3; i++) {
        final int newPart = i < newParts.length ? newParts[i] : 0;
        final int currentPart = i < currentParts.length ? currentParts[i] : 0;

        if (newPart > currentPart) return true;
        if (newPart < currentPart) return false;
      }

      return false;
    } catch (e) {
      return false;
    }
  }
}
