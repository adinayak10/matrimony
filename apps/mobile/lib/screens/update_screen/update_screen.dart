import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/models/setting_model.dart';
import 'package:banjaramatch/screens/update_screen/update_screen_controller.dart';

class UpdateScreen extends StatelessWidget {
  final ApkInfo apkInfo;
  final bool isMandatoryUpdate;
  final String currentVersion;

  const UpdateScreen({
    Key? key,
    required this.apkInfo,
    required this.isMandatoryUpdate,
    required this.currentVersion,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(UpdateScreenController(
      apkInfo: apkInfo,
      isMandatoryUpdate: isMandatoryUpdate,
    ));

    final primaryColor = isMandatoryUpdate ? const Color(0xFFE53935) : const Color(0xFF1976D2);
    final lightColor = isMandatoryUpdate ? const Color(0xFFFFEBEE) : const Color(0xFFE3F2FD);

    return WillPopScope(
      onWillPop: () async {
        if (isMandatoryUpdate) {
          controller.onBackPressed();
          return false;
        }
        return true;
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Column(
            children: [
              // Close button for optional updates
              if (!isMandatoryUpdate)
                Align(
                  alignment: Alignment.topRight,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: IconButton(
                      icon: Icon(Icons.close, color: Colors.grey[600]),
                      onPressed: () => Get.back(),
                    ),
                  ),
                ),
              
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: [
                      const SizedBox(height: 20),
                      
                      // App Icon/Update Illustration
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          color: lightColor,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.system_update_alt,
                          size: 50,
                          color: primaryColor,
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Title
                      Text(
                        isMandatoryUpdate ? 'Update Required' : 'Update Available',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF212121),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Version Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(25),
                        ),
                        child: Text(
                          'v$currentVersion → v${apkInfo.versionName}',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey[800],
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Mandatory Warning
                      if (isMandatoryUpdate)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFEBEE),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.info_outline, color: primaryColor, size: 22),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'This update is mandatory to continue using the app',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey[900],
                                    height: 1.4,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                      const SizedBox(height: 32),

                      // Release Notes Section
                      if (apkInfo.releaseNotes != null && apkInfo.releaseNotes!.isNotEmpty)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'What\'s New',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[900],
                              ),
                            ),
                            const SizedBox(height: 16),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: Colors.grey[50],
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.grey[200]!),
                              ),
                              child: Text(
                                apkInfo.releaseNotes!,
                                style: TextStyle(
                                  fontSize: 15,
                                  height: 1.6,
                                  color: Colors.grey[700],
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                          ],
                        ),

                      // Download Info
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.download_outlined, size: 18, color: Colors.grey[600]),
                          const SizedBox(width: 8),
                          Text(
                            'Size: ${controller.formattedFileSize}',
                            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                          ),
                        ],
                      ),

                      const SizedBox(height: 32),

                      // Download Progress
                      Obx(() {
                        if (controller.isDownloading.value) {
                          return Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: lightColor,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Column(
                              children: [
                                SizedBox(
                                  height: 6,
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(3),
                                    child: LinearProgressIndicator(
                                      value: controller.downloadProgress.value,
                                      backgroundColor: Colors.white,
                                      valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  controller.downloadStatus.value,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: primaryColor,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }
                        return const SizedBox.shrink();
                      }),

                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),

              // Action Buttons
              Padding(
                padding: const EdgeInsets.all(24),
                child: Obx(() {
                  if (controller.isDownloading.value || controller.isInstalling.value) {
                    return const SizedBox.shrink();
                  }

                  return Column(
                    children: [
                      // Primary Action Button
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: ElevatedButton(
                          onPressed: controller.downloadAndInstallUpdate,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryColor,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text(
                            'Update Now',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Secondary Action Button
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: TextButton(
                          onPressed: isMandatoryUpdate ? controller.onBackPressed : () => Get.back(),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.grey[700],
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: Text(
                            isMandatoryUpdate ? 'Exit App' : 'Maybe Later',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
