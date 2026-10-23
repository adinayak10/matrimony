import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/models/model_interest_user_list.dart';

import '../common/controller/cupertino_controller.dart';
import 'chats_screen/socketservice.dart';

/// Interests tab: 0 received, 1 sent, 2 connections (accepted, both directions).
class InterestUserScreenController extends CupertinoController {
  InterestUserScreenController() {
    final requested = _requestedSegment;
    _requestedSegment = null;
    selectedPage = (requested ?? 0).clamp(0, segmentCount - 1).toInt();
    pageController = PageController(initialPage: selectedPage);
  }

  static const int segmentCount = 3;

  /// Segment to show when the tab is opened next (push taps, Explore strip).
  static int? _requestedSegment;

  /// Shows [segment] now when the Interests tab is on screen, otherwise when
  /// it opens next.
  static void openSegment(int segment) {
    if (Get.isRegistered<InterestUserScreenController>()) {
      final controller = Get.find<InterestUserScreenController>();
      controller.onChangeSegment(segment);
      controller.refreshAll();
    } else {
      _requestedSegment = segment;
    }
  }

  late final PageController pageController;

  List<UserInterest> sentList = [];
  List<UserInterest> receivedList = [];
  List<UserInterest> connections = [];
  bool connectionsLoading = false;

  /// Received interests still awaiting a reply (same rule as the server's
  /// bottom-nav badge: status 'pending').
  int get pendingReceivedCount => receivedList.where((row) => row.status == 'pending').length;

  @override
  void onInit() {
    super.onInit();
    refreshAll();
  }

  @override
  void onClose() {
    pageController.dispose();
    super.onClose();
  }

  void refreshAll() {
    fetchInterestsFromOthers();
    fetchIntereststoOthers();
    fetchConnections();
  }

  @override
  void onChangeSegment(int index) {
    if (index < 0 || index >= segmentCount) return;
    selectedPage = index;
    if (pageController.hasClients) {
      pageController.animateToPage(index, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    }
    update();
  }

  @override
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

  /// Accepted connections (first 100; the list is small for most members).
  void fetchConnections() {
    connectionsLoading = true;
    update();
    UserService.shared.fetchConnections(
      page: 1,
      limit: 100,
      completion: (rows) {
        connections = rows.where((row) => row.user?.id != null).toList();
        connectionsLoading = false;
        update();
      },
    );
  }

  /// [onAccepted] runs after the API confirms (the "Accept & Chat" button opens the chat).
  void acceptInterest(String userId, {VoidCallback? onAccepted}) async {
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
      fetchConnections();
      // The server only pushes badge counts on send/cancel; refresh after accept.
      SocketService.shared.requestAllBadgeCounts();
      onAccepted?.call();
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
      SocketService.shared.requestAllBadgeCounts();
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

  /// Removes a connection after confirmation (`removeConnection`).
  void removeConnection(UserInterest connection) {
    final userId = connection.user?.id;
    if (userId == null) return;
    final name = (connection.user?.fullName ?? '').trim();
    showConfirmationSheet(
      desc: AppKeys.connectionRemoveConfirm.trParams({'name': name.isEmpty ? '-' : name}),
      buttonTitle: AppKeys.connectionRemove.tr,
      onTap: () {
        UserService.shared.unfriendUser(userId, () {
          connections.removeWhere((row) => row.user?.id == userId);
          for (final list in [sentList, receivedList]) {
            for (final row in list) {
              if (row.user?.id == userId && row.status == 'accepted') row.status = 'cancelled';
            }
          }
          update();
          showSnackBar(AppKeys.connectionRemoved.tr);
        });
      },
    );
  }
}
