import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/sheets/confirmation_sheet.dart';
import 'package:banjaramatch/utilities/firebase_const.dart';

class BlockUserController extends BaseController {
  void blockUser(User? user, Function() completion) {
    Future.delayed(const Duration(milliseconds: 1), () {
      Get.bottomSheet(ConfirmationSheet(
        desc: LKeys.blockDesc,
        buttonTitle: LKeys.block,
        onTap: () {
          var myUser = SessionManager.shared.getUser();
          if (myUser?.blocked == null) {
            myUser?.blocked = [];
          }
          myUser?.blocked?.add(user!);
          SessionManager.shared.setUser(myUser);
          UserService.shared.blockUser(user?.id ?? "0", () {
            var othersMap = {FirebaseConst.iAmBlocked: true};

            FirebaseFirestore.instance
                .collection(FirebaseConst.users)
                .doc(user?.firebaseId())
                .collection(FirebaseConst.userList)
                .doc(myUser?.firebaseId())
                .update(othersMap);
            var myMap = {FirebaseConst.iBlocked: true};
            FirebaseFirestore.instance
                .collection(FirebaseConst.users)
                .doc(myUser?.firebaseId())
                .collection(FirebaseConst.userList)
                .doc(user?.firebaseId())
                .update(myMap);
            completion();
          });
        },
      ));
    });
  }

  void unblockUser(User? user, Function() completion) {
    Future.delayed(const Duration(milliseconds: 1), () {
      Get.bottomSheet(ConfirmationSheet(
        desc: LKeys.unblockDesc,
        buttonTitle: LKeys.unBlock,
        onTap: () {
          print(user!.id.toString() + "mainnnnblokeduser");
          print(SessionManager.shared.getUser()!.id.toString() + "mainnnnblokeduserppl");

          UserService.shared.unblockUser(user.id ?? "0", () {
            var myUser = SessionManager.shared.getUser();
            var othersMap = {FirebaseConst.iAmBlocked: false};
            FirebaseFirestore.instance
                .collection(FirebaseConst.users)
                .doc(user.firebaseId())
                .collection(FirebaseConst.userList)
                .doc(myUser?.firebaseId())
                .update(othersMap);
            var myMap = {FirebaseConst.iBlocked: false};
            FirebaseFirestore.instance
                .collection(FirebaseConst.users)
                .doc(myUser?.firebaseId())
                .collection(FirebaseConst.userList)
                .doc(user.firebaseId())
                .update(myMap);
            completion();
          });
        },
      ));
    });
  }
}
