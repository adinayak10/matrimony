import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/setting_model.dart';
import 'package:banjaramatch/screens/splash_screen/splash_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

class InterestsController extends BaseController {
  static List<Interest> interests = SessionManager.shared.getSettings()?.interests ?? [];
  List<Interest> selectedInterests = [];

  void toggleInterest(Interest interest) {
    if (selectedInterests.contains(interest)) {
      removeInterest(interest);
    } else {
      if (selectedInterests.length < Limits.interestCount) {
        addInterest(interest);
      } else {
        showSnackBar("${LKeys.youCanNotSelectMoreThan.tr} ${Limits.interestCount}", type: SnackBarType.error);
      }
    }
  }

  void addInterest(Interest interest) {
    selectedInterests.add(interest);
    update();
  }

  void removeInterest(Interest interest) {
    selectedInterests.remove(interest);
    update();
  }

  void updateInterests() {
    //  startLoading();
    // Print properties manually without overriding toString()
    selectedInterests.forEach((interest) {
      print('Interest Name: ${interest.id}');
    });
    UserService.shared.editProfile(
        interests: selectedInterests,
        completion: (p0) {
          stopLoading();

          print("al;kjsdlkjsadlpa;sasd");

          Get.offAll(() => gotoNextSetupView());
        });
  }
}
