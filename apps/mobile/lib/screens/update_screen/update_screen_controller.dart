import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'package:banjaramatch/models/setting_model.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:open_filex/open_filex.dart';

class UpdateScreenController extends GetxController {
  final ApkInfo apkInfo;
  final bool isMandatoryUpdate;

  UpdateScreenController({
    required this.apkInfo,
    required this.isMandatoryUpdate,
  });

  final RxBool isDownloading = false.obs;
  final RxDouble downloadProgress = 0.0.obs;
  final RxString downloadStatus = ''.obs;
  final RxBool isInstalling = false.obs;

  /// Download and install APK
  Future<void> downloadAndInstallUpdate() async {
    if (apkInfo.filePath == null || apkInfo.filePath!.isEmpty) {
      Get.snackbar(
        'Error',
        'Download link not available',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return;
    }

    try {
      isDownloading.value = true;
      downloadStatus.value = 'Preparing download...';

      // Get external storage directory
      final Directory? directory = await getExternalStorageDirectory();
      if (directory == null) {
        throw Exception('Could not access storage');
      }

      final String fileName = apkInfo.fileName ?? 'app_update.apk';
      final String savePath = '${directory.path}/$fileName';
      final File file = File(savePath);

      // Delete old file if exists
      if (await file.exists()) {
        await file.delete();
      }

      downloadStatus.value = 'Downloading update...';

      // Download file with progress
      final http.StreamedResponse response = await http.Client().send(
        http.Request('GET', Uri.parse(apkInfo.filePath!)),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to download update');
      }

      final int totalBytes = response.contentLength ?? 0;
      int receivedBytes = 0;

      final List<int> bytes = [];
      await for (var chunk in response.stream) {
        bytes.addAll(chunk);
        receivedBytes += chunk.length;

        if (totalBytes > 0) {
          downloadProgress.value = receivedBytes / totalBytes;
          final int percentage = (downloadProgress.value * 100).round();
          downloadStatus.value = 'Downloading... $percentage%';
        }
      }

      // Write to file
      await file.writeAsBytes(bytes);
      downloadStatus.value = 'Download complete!';

      // Install APK
      await Future.delayed(const Duration(seconds: 1));
      await _installApk(savePath);
    } catch (e) {
      isDownloading.value = false;
      downloadProgress.value = 0.0;
      Get.snackbar(
        'Download Failed',
        'Error: $e',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  /// Install APK file (Android only)
  Future<void> _installApk(String filePath) async {
    if (!Platform.isAndroid) {
      Get.snackbar(
        'Not Supported',
        'APK installation is only supported on Android',
        snackPosition: SnackPosition.BOTTOM,
      );
      return;
    }

    try {
      isInstalling.value = true;
      downloadStatus.value = 'Installing...';

      // Use OpenFilex to properly trigger Android package installer
      final result = await OpenFilex.open(
        filePath,
        type: 'application/vnd.android.package-archive',
      );

      isDownloading.value = false;
      isInstalling.value = false;

      // Check result
      if (result.type == ResultType.done) {
        print('✅ APK installer opened successfully');
      } else if (result.type == ResultType.noAppToOpen) {
        Get.snackbar(
          'Installation Error',
          'No app found to install APK. Please check your device settings.',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.orange,
          colorText: Colors.white,
          duration: const Duration(seconds: 5),
        );
      } else if (result.type == ResultType.error) {
        Get.snackbar(
          'Installation Error',
          result.message ?? 'Failed to open installer',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red,
          colorText: Colors.white,
          duration: const Duration(seconds: 5),
        );
      }
    } catch (e) {
      isInstalling.value = false;
      isDownloading.value = false;
      
      // Show instructions for manual installation
      Get.snackbar(
        'Installation Info',
        'APK downloaded successfully. Please check your Downloads folder and install manually if the installer didn\'t open automatically.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.blue,
        colorText: Colors.white,
        duration: const Duration(seconds: 5),
      );
    }
  }

  /// Open download link in browser
  Future<void> openDownloadLink() async {
    if (apkInfo.filePath == null || apkInfo.filePath!.isEmpty) {
      Get.snackbar(
        'Error',
        'Download link not available',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return;
    }

    try {
      final Uri url = Uri.parse(apkInfo.filePath!);
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        throw Exception('Could not launch URL');
      }
    } catch (e) {
      Get.snackbar(
        'Error',
        'Could not open download link',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  /// Handle back button press
  void onBackPressed() {
    if (isMandatoryUpdate) {
      // Show exit app dialog
      Get.dialog(
        AlertDialog(
          title: const Text('Update Required'),
          content: const Text(
            'This update is mandatory. The app cannot be used without updating. Do you want to exit?',
          ),
          actions: [
            TextButton(
              onPressed: () => Get.back(),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Get.back();
                exit(0);
              },
              child: const Text('Exit App'),
            ),
          ],
        ),
      );
    } else {
      Get.back();
    }
  }

  String get formattedFileSize {
    final int bytes = apkInfo.fileSize ?? 0;
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(2)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
  }
}
