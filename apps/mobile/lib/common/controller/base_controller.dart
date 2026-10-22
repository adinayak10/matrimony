import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:path_provider/path_provider.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/screens/sheets/confirmation_sheet.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:url_launcher/url_launcher.dart';

class BaseController extends GetxController {
  static var share = BaseController();
  RxBool isLoading = false.obs;
  bool _isDialogShowing = false;
  BuildContext? _dialogContext; // Store the dialog's context

  @override
  void onClose() {
    // Ensure any open dialogs are closed when controller is disposed
    if (_isDialogShowing) {
      stopLoading();
    }
    super.onClose();
  }

  void startLoading() {
    print('🔄 startLoading called - _isDialogShowing: $_isDialogShowing');
    
    if (_isDialogShowing || _dialogContext != null) {
      print('⚠️ Dialog already showing, returning early');
      return; // Prevent multiple dialogs
    }
    
    _isDialogShowing = true;
    isLoading.value = true;
    print('📝 Set _isDialogShowing=true, isLoading.value=true');
    
    // Use standard showDialog instead of Get.dialog for better control
    if (Get.context != null) {
      var closeScheduled = false;
      showDialog(
        context: Get.context!,
        barrierDismissible: false,
        barrierColor: Colors.black26,
        builder: (BuildContext context) {
          _dialogContext = context; // Store the context
          print('📝 Dialog context stored');
          // stopLoading() can run before this builder (fast responses); it found no
          // context to pop, so the dialog closes itself once it is on screen.
          if (!_isDialogShowing && !closeScheduled) {
            closeScheduled = true;
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (context.mounted) Navigator.of(context).pop();
              if (identical(_dialogContext, context)) _dialogContext = null;
            });
          }
          return WillPopScope(
            onWillPop: () async => false,
            child: Center(
              child: CircularProgressIndicator(
                color: cPrimary,
              ),
            ),
          );
        },
      );
      print('✅ Dialog opened with showDialog');
    } else {
      print('❌ Get.context is null, cannot show dialog');
    }
    
    update();
  }

  void stopLoading([List<Object>? ids, bool condition = true]) {
    print('🛑 stopLoading called - _isDialogShowing: $_isDialogShowing, _dialogContext: ${_dialogContext != null}');
    
    if (!_isDialogShowing) {
      print('⚠️ Dialog was not showing, returning early');
      return;
    }
    
    _isDialogShowing = false;
    isLoading.value = false;
    print('📝 Set _isDialogShowing=false, isLoading.value=false');
    
    // Close the dialog using the stored context
    try {
      if (_dialogContext != null && _dialogContext!.mounted) {
        print('🚪 Closing dialog using stored context');
        Navigator.of(_dialogContext!, rootNavigator: false).pop();
        print('✅ Dialog closed via Navigator.pop with stored context');
        _dialogContext = null;
      } else if (_dialogContext != null) {
        print('⚠️ Dialog context exists but not mounted');
        _dialogContext = null;
      } else {
        print('⚠️ No dialog context stored');
      }
    } catch (e) {
      print('❌ Error closing dialog: $e');
      _dialogContext = null;
    }
    
    update(ids, condition);
    print('✅ stopLoading completed');
  }

  loader({double? value}) {
    Get.dialog(
        Center(
          child: CircularProgressIndicator(
            color: cPrimary,
          ),
        ),
        barrierColor: Colors.transparent);
  }

  void materialSnackBar(String title,
      {SnackBarType type = SnackBarType.info, String? message, Function()? onCompletion}) {
    var color = type == SnackBarType.success ? cGreen : (type == SnackBarType.error ? cRed : cBlack);
    ScaffoldMessenger.of(Get.context!).showSnackBar(
      SnackBar(
        content: Text(
          title.tr.toString(),
          style: MyTextStyle.gilroySemiBold(size: 15, color: cWhite),
        ),
        backgroundColor: color,
        duration: const Duration(milliseconds: 2500),
        behavior: SnackBarBehavior.fixed,
        dismissDirection: DismissDirection.endToStart,
        elevation: 1,
      ),
    );
  }

  void showSnackBar(String title, {SnackBarType type = SnackBarType.info, String? message, Function()? onCompletion}) {
    materialSnackBar(title, type: type, message: message, onCompletion: onCompletion);

    // if (Get.isSnackbarOpen) {
    //   return;
    // }
    // var color = type == SnackBarType.success ? cGreen : (type == SnackBarType.error ? cRed : cBlack);
    // IconData icon = type == SnackBarType.success ? Icons.check_circle_rounded : (type == SnackBarType.error ? Icons.cancel_rounded : Icons.info_rounded);
    // Get.rawSnackbar(
    //   messageText: Text(
    //     title.tr,
    //     style: MyTextStyle.gilroyBold(color: color),
    //   ),
    //   snackPosition: SnackPosition.BOTTOM,
    //   borderRadius: 10,
    //   margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
    //   icon: Icon(
    //     icon,
    //     color: color,
    //     size: 24,
    //   ),
    //   backgroundColor: cWhite,
    //   forwardAnimationCurve: Curves.fastLinearToSlowEaseIn,
    // );
  }

  void showConfirmationSheet({required desc, required buttonTitle, required onTap}) {
    Get.bottomSheet(ConfirmationSheet(
      desc: desc,
      buttonTitle: buttonTitle,
      onTap: onTap,
    ));
  }

  void handleURL({required String url}) async {
    var urlString = url;
    if (!urlString.startsWith('http')) {
      urlString = 'https:\\\\' + urlString;
    }
    final Uri uri = Uri.parse(urlString);

    if (!await launchUrl(uri)) {
      print('Could not launch $uri');
    }
  }

  Future<String> getPath() async {
    Directory? directory =
        await (Platform.isAndroid ? getExternalStorageDirectory() : getApplicationDocumentsDirectory());
    return directory?.path ?? '';
  }
}

enum SnackBarType { info, error, success }
