import 'dart:async';

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:otp_text_field/otp_field.dart';
import 'package:otp_text_field/style.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/extensions/string_extension.dart';
import 'package:banjaramatch/screens/extra_views/logo_tag.dart';
import 'package:banjaramatch/screens/login_screen/sign_in_with_email_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

import 'login_controller.dart';

class OTPVerificationScreen extends StatefulWidget {
  final String phone;
  final String verificationId;

  const OTPVerificationScreen({
    Key? key,
    required this.phone,
    required this.verificationId,
  }) : super(key: key);

  @override
  State<OTPVerificationScreen> createState() => _OTPVerificationScreenState();
}

class _OTPVerificationScreenState extends State<OTPVerificationScreen> {
  final LoginController controller = Get.put(LoginController());
  final OtpFieldController otpController = OtpFieldController();

  String otp = '';
  int secondsRemaining = 30;
  Timer? timer;

  @override
  void initState() {
    super.initState();
    startTimer();
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  void startTimer() {
    timer?.cancel();
    secondsRemaining = 30;
    timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (secondsRemaining > 0) {
          secondsRemaining--;
        } else {
          timer.cancel();
        }
      });
    });
  }

  void verifyOTP() {
    if (otp.length != 6) {
      Get.snackbar("Invalid", "Enter 6-digit OTP");
      return;
    }

    controller.verifyOtpAndLogin(
      phone: widget.phone,
      otp: otp,
      fullName: null,
    );
  }

  void resendOTP() {
    if (secondsRemaining == 0) {
      controller.requestOtp(widget.phone, () {
        Get.snackbar("OTP Resent", "A new OTP has been sent to your mobile.");
        startTimer();
      });
    }
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
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
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
                      "Enter OTP".toTextTR(MyTextStyle.gilroyBold(size: 23)),
                      const SizedBox(height: 10),
                      "Sent to +91 ${widget.phone}".toTextTR(
                        MyTextStyle.gilroyLight(size: 15, color: cLightText),
                      ),
                      const SizedBox(height: 20),
                      otpInputView(),
                      const SizedBox(height: 12),
                      EmailButton(
                        text: "Verify",
                        isDisable: otp.length != 6,
                        onTap: verifyOTP,
                      ),
                      const SizedBox(height: 12),
                      secondsRemaining > 0
                          ? Text(
                              "Resend in $secondsRemaining sec",
                              style: MyTextStyle.gilroyLight(color: cLightText, size: 14),
                            )
                          : GestureDetector(
                              onTap: resendOTP,
                              child: "Resend OTP".toTextTR(
                                MyTextStyle.gilroySemiBold(color: cPrimary, size: 14),
                              ),
                            ),
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

  Widget otpInputView() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: OTPTextField(
        controller: otpController,
        length: 6,
        width: MediaQuery.of(context).size.width,
        fieldWidth: 45,
        style: const TextStyle(fontSize: 18),
        textFieldAlignment: MainAxisAlignment.spaceEvenly,
        fieldStyle: FieldStyle.box,
        keyboardType: TextInputType.number,
        onChanged: (code) => setState(() => otp = code),
        onCompleted: (code) => setState(() => otp = code),
      ),
    );
  }
}
