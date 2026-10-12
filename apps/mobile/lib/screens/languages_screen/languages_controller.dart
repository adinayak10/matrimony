import 'package:get/get.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/allLanguages.dart';
import 'package:banjaramatch/screens/splash_screen/splash_controller.dart';

class LanguagesController extends BaseController {
  List<Lang> languages = LANGUAGES;
  Lang selectedLan = SessionManager.shared.getLang();

  void setLang(Lang lang) {
    selectedLan = lang;
    // update();

    Future.delayed(
      Duration(milliseconds: 200),
      () {
        SessionManager.shared.setLang(lang);
        Get.updateLocale(lang.language.local);
        Get.offAll(() => gotoNextSetupView());
      },
    );
  }
}
