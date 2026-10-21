import 'package:flutter/material.dart';

const String appName = "BanjaraMatch";
// const String baseURL = "http://192.168.1.9:4000/";
/// Single API host. Override at build time with --dart-define=API_HOST=...
const String apiHost = String.fromEnvironment('API_HOST', defaultValue: 'https://api.banjaramatch.com');
const String baseURL = "$apiHost/";
const String itemBaseURL = "${baseURL}";
const String apiURL = "${baseURL}api/";
const String termsURL = "${baseURL}termsOfUse";
const String privacyURL = "${baseURL}privacyPolicy";
const String helpURL = "https://www.banjaramatch.com/contact";
const String notificationTopic = "banjaramatch";

const String contactEmail = 'yourContactMail';

class Limits {
  static int username = 20;
  static int bioCount = 120;
  static int interestCount = 5;
  static int pagination = 10;

  static double imageSize = 720;
  static int quality = 100;
}

extension O on String {
  String addBaseURL() {
    return itemBaseURL + this;
  }
}

// Colors
// const cPrimary = Color(0xFF40E378);
// const cPulsing = Color(0xFFA1E5B3);

const cPrimary = Color(0xFFB83227); // ❤️ Main deep red
const cPulsing = Color(0xFFFFCFCF); // 💗 Soft romantic pink

const cOnPrimary = Color(0xFFFFFFFF); // ✅ White text over primary red button
const cButtonText = Color(0xFFFFFFFF); // ✅ Button text color (use over cPrimary)
const cBackground = Color(0xFFFFF7F5); // 🌸 Light peach background (non-white)
const cCard = Color(0xFFFFFFFF); // Cards or containers
const cLightText = Color(0xFF8A8A8A); // Hints, labels, captions
const cDarkText = Color(0xFF1E1E1E); // Main black text
const cBorder = Color(0xFFEDC8C4); // Borders with soft warm pink tone
const cAccent = Color(0xFFDC3C78); // Rose pink for hearts, interest tags
const cError = Color(0xFFD32F2F); // Strong red for error states

const cWhite = Colors.white;
const cBlack = Color(0xFF0E0E0E);
const cMainText = Color(0xFF2d2d2d);
const cLightIcon = Color(0xFFAEAEAE);
const cLightBg = Color(0xFFF1F1F1);
const cDarkBG = Color(0xFF212121);
const cBG = Color(0xFFFFF7F5);
const cGreen = Color(0xFF2CA757);
const cDarkGreen = Color(0xFF183321);
const cBlueTick = Color(0xFF1D9BF0);
const cRed = Colors.red;

const cGold = Color(0xFFB59410); // 💗 Soft romantic pink

// Corner Radius-Smoothing
const cornerSmoothing = 1.0;
