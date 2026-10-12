import 'package:flutter/material.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/models/model_interest_user_list.dart';

import '../common/controller/cupertino_controller.dart';

class InterestUserScreenController extends CupertinoController {
  int selectedPage = 0;
  final PageController pageController = PageController();

  List<UserInterest> sentList = [];
  List<UserInterest> receivedList = [];

  @override
  void onInit() {
    super.onInit();
    fetchInterestsFromOthers();
    fetchIntereststoOthers();
  }

  void onChangeSegment(int index) {
    selectedPage = index;
    pageController.animateToPage(index, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    update();
  }

  void onChangePage(int index) {
    selectedPage = index;
    update();
  }

  void fetchInterestsFromOthers() async {
    isLoading.value = true;
    update();

    UserService.shared.fetchInterestList(
        type: "received",
        page: 1,
        completion: (users) {
          receivedList = users;
          isLoading.value = false;
          update();
        });
  }

  void fetchIntereststoOthers() async {
    isLoading.value = true;
    update();

    UserService.shared.fetchInterestList(
        type: "sent",
        page: 1,
        completion: (users) {
          sentList = users;
          isLoading.value = false;
          update();
        });
  }

  void acceptInterest(String userId) async {
    isLoading.value = true;
    update();

    UserService.shared.acceptFriendReuquest(userId, () {
      // Find and update the user in receivedList
      int index = receivedList.indexWhere((element) => element.user?.id == userId);
      if (index != -1) {
        receivedList[index].status = 'accepted';
      }

      isLoading.value = false;
      update();
    });
  }

  void sendInterest(String userId) async {
    isLoading.value = true;
    update();

    UserService.shared.sendInterest(userId, () {
      // Move user from received list to sent list with pending status.
      final int receivedIndex = receivedList.indexWhere((element) => element.user?.id == userId);
      if (receivedIndex != -1) {
        final movedInterest = receivedList.removeAt(receivedIndex);
        movedInterest.status = 'pending';
        movedInterest.type = 'sent';
        movedInterest.updatedAt = DateTime.now().toIso8601String();

        final int existingSentIndex = sentList.indexWhere((element) => element.user?.id == userId);
        if (existingSentIndex != -1) {
          sentList[existingSentIndex] = movedInterest;
        } else {
          sentList.insert(0, movedInterest);
        }
      }

      isLoading.value = false;
      update();
    });
  }

  void declineInterest(String userId) async {
    isLoading.value = true;
    update();

    UserService.shared.rejectInterest(userId, () {
      // Find and update the user in receivedList
      int index = receivedList.indexWhere((element) => element.user?.id == userId);
      if (index != -1) {
        receivedList[index].status = 'rejected';
      }

      isLoading.value = false;
      update();
    });
  }

  void cencelInterest(String userId) async {
    isLoading.value = true;
    update();

    UserService.shared.cancelInterest(userId, () {
      // Find and update the user in receivedList
      int index = sentList.indexWhere((element) => element.user?.id == userId);
      if (index != -1) {
        sentList[index].status = 'cancelled';
      }

      isLoading.value = false;
      update();
    });
  }
}
