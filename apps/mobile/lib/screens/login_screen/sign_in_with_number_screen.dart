import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/extensions/string_extension.dart';
import 'package:banjaramatch/screens/extra_views/logo_tag.dart';
import 'package:banjaramatch/screens/login_screen/otp_verification_screen.dart';
import 'package:banjaramatch/screens/login_screen/sign_in_with_email_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../common_widget.dart';
import 'login_controller.dart'; // For MyTextField and EmailButton

class PhoneNumberLoginScreen extends StatefulWidget {
  const PhoneNumberLoginScreen({Key? key}) : super(key: key);

  @override
  State<PhoneNumberLoginScreen> createState() => _PhoneNumberLoginScreenState();
}

class _PhoneNumberLoginScreenState extends State<PhoneNumberLoginScreen> {
  final TextEditingController phoneController = TextEditingController();
  bool isSending = false;

  final LoginController controller = Get.put(LoginController());

  void sendOTP() {
    final phone = phoneController.text.trim();
    if (phone.length != 10) {
      Get.snackbar("Invalid", "Enter a valid 10-digit mobile number");
      return;
    }

    controller.requestOtp(phone, () {
      Get.to(() => OTPVerificationScreen(
            phone: phone,
            verificationId: "local_verification",
          ));
    });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ClipSmoothRect(
        radius: const SmoothBorderRadius.only(
          topRight: SmoothRadius(cornerRadius: 12, cornerSmoothing: cornerSmoothing),
          topLeft: SmoothRadius(cornerRadius: 12, cornerSmoothing: cornerSmoothing),
        ),
        child: Container(
          color: Colors.white,
          child: Column(
            children: [
              Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: GestureDetector(
                      child: const Icon(Icons.close_rounded, color: cBlack, size: 30),
                      onTap: () => Get.back(),
                    ),
                  ),
                  const Spacer(),
                ],
              ),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      const SizedBox(height: 40),
                      const LogoTag(width: 300),
                      const SizedBox(height: 40),
                      "Mobile Number".toTextTR(MyTextStyle.gilroyBold(size: 23)),
                      const SizedBox(height: 20),
                      mobileView(),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    phoneController.addListener(() {
      setState(() {});
    });
  }

  Widget mobileView() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        children: [
          MyTextField(controller: phoneController, placeHolder: "Enter your mobile number"),
          const SizedBox(height: 12),
          EmailButton(
            text: "Continue",
            isDisable: phoneController.text.length != 10 || isSending,
            onTap: sendOTP,
          ),
        ],
      ),
    );
  }
}
