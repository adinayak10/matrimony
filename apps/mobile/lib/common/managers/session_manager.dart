import 'dart:io';

import 'package:get_storage/get_storage.dart';
import 'package:banjaramatch/localization/allLanguages.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/models/setting_model.dart';

class SessionManager {
  static var shared = SessionManager();
  var storage = GetStorage();
  var conversationId = '';

  void setLang(Lang lang) {
    storage.write("lang", lang.language.languageCode);
  }

  Lang getLang() {
    return LANGUAGES.firstWhere(
        (element) => element.language.languageCode == (storage.read("lang") ?? LANGUAGES.first.language.languageCode));
  }

  String getStoredConversation() {
    return conversationId;
  }

  void setStoredConversation(String conversation) {
    conversationId = conversation;
  }

  bool isLogin() {
    return storage.read(SessionKeys.isLogin) ?? false;
  }

  void setLogin(bool isLog) {
    storage.write(SessionKeys.isLogin, isLog);
  }

  String getToken() {
    return storage.read(SessionKeys.token) ?? "";
  }

  void setToken(String token) {
    storage.write(SessionKeys.token, token);
  }

  void setUser(User? obj) {
    storage.write("user", obj);
  }

  User? getUser() {
    var user = storage.read("user");
    if (user is User?) {
      return user;
    } else {
      return User.fromJson(user);
    }
  }

  String getUserID() {
    return (getUser()?.id ?? "0");
  }

  void setSettings(Settings settings) {
    storage.write("setting", settings);
  }

  Settings? getSettings() {
    var data = storage.read("setting");
    if (data is Map<String, dynamic>) {
      return Settings.fromJson(data);
    } else if (data is Settings) {
      return data;
    }
    return null;
  }

  String getBannerAdId() {
    return (Platform.isAndroid ? (getSettings()?.adBannerAndroid) : (getSettings()?.adBannerIOS)) ?? '';
  }

  String getInterstitialAdId() {
    return (Platform.isAndroid ? (getSettings()?.adInterstitialAndroid) : (getSettings()?.adInterstitialIOS)) ?? '';
  }

  bool isAdMobOn() {
    return getSettings()?.isAdmobOn == 1 ? true : false;
  }

  void clear() {
    storage.erase();
  }

  /// Removes only the per-login keys (login flag, JWT, user). Global
  /// settings (fetched once at splash, needed by the update check after a
  /// re-login) and device preferences such as language are kept.
  void clearSession() {
    storage.remove(SessionKeys.isLogin);
    storage.remove(SessionKeys.token);
    storage.remove("user");
  }
}

class SessionKeys {
  static const isLogin = "isLogin";
  static const token = "device_token_bearer";
}
