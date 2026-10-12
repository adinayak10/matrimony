import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/screens/chats_screen/socketservice.dart';

import '../common/api_service/user_service.dart';
import '../common/controller/base_controller.dart';
import '../models/registration.dart';
import '../utilities/const.dart';

class UsersListController extends BaseController {
  List<User> usersList = [];
  ScrollController scrollController = ScrollController();
  int currentPage = 1;
  bool isLoadingMore = false;
  bool hasMoreData = true;
  bool matchMyPreferenceEnabled = true;

  Map<String, dynamic> activeFilters = {};
  bool isFilterApplied = false;

  bool isSearchMode = false; // ✅ true = search API, false = normal listing

  @override
  void onInit() {
    super.onInit();

    // ✅ Get filters from navigation arguments
    final filters = Get.arguments?['filters'];
    if (filters != null) {
      activeFilters = filters;
      isFilterApplied = true;
      isSearchMode = true;
    }

    // ✅ Trigger correct API
    if (isSearchMode) {
      fetchSearchProfiles(filters: activeFilters);
    } else {
      // loadInitialProfiles();
    }
  }

  @override
  void onReady() {
    scrollController.addListener(() {
      if (scrollController.position.pixels >= scrollController.position.maxScrollExtent - 80 && !isLoadingMore) {
        fetchMoreProfiles();
      }
    });
    _bindSocketListeners();
    super.onReady();
  }

  /// 🔄 Load initial profiles (normal listing)
  void loadInitialProfiles({bool matchMyPreference = false}) {
    print("alkhdjlkasdasd" + matchMyPreference.toString());

    isSearchMode = false;
    matchMyPreferenceEnabled = matchMyPreference;
    currentPage = 1;
    hasMoreData = true;
    isLoading.value = true;

    UserService.shared.fetchProfiles(
      page: currentPage,
      matchMyPreference: matchMyPreference,
      filters: isFilterApplied ? activeFilters : null,
      completion: (users) {
        usersList = users;
        hasMoreData = users.length >= Limits.pagination;
        isLoading.value = false;
        update();
      },
    );
  }

  /// 🔍 Search profiles (search API)
  void fetchSearchProfiles({Map<String, dynamic>? filters}) {
    isSearchMode = true;
    currentPage = 1;
    hasMoreData = true;
    isFilterApplied = filters != null;
    activeFilters = filters ?? {};
    isLoading.value = true;

    UserService.shared.searchAndFetchProfiles(
      page: currentPage,
      filters: activeFilters,
      completion: (users) {
        usersList = users;
        hasMoreData = users.length >= Limits.pagination;
        isLoading.value = false;
        update();
      },
    );
  }

  /// 🎯 Apply filters
  void applyFilters(Map<String, dynamic> filters) {
    currentPage = 1;
    activeFilters = filters;
    isFilterApplied = true;

    if (isSearchMode) {
      fetchSearchProfiles(filters: activeFilters);
    } else {
      loadInitialProfiles();
    }
  }

  /// ❌ Clear filters
  void clearFilters() {
    activeFilters.clear();
    isFilterApplied = false;
    currentPage = 1;

    if (isSearchMode) {
      fetchSearchProfiles();
    } else {
      loadInitialProfiles();
    }
  }

  /// 📥 Load more profiles (pagination)
  void fetchMoreProfiles() {
    if (isLoadingMore || !hasMoreData || isLoading.value) return;

    isLoadingMore = true;
    update();
    currentPage++;

    if (isSearchMode) {
      UserService.shared.searchAndFetchProfiles(
        page: currentPage,
        filters: isFilterApplied ? activeFilters : null,
        completion: (users) {
          if (users.isEmpty) {
            hasMoreData = false;
          } else {
            usersList.addAll(users);
            hasMoreData = users.length >= Limits.pagination;
          }
          isLoadingMore = false;
          update();
        },
      );
      return;
    }

    UserService.shared.fetchProfiles(
      page: currentPage,
      matchMyPreference: matchMyPreferenceEnabled,
      filters: isFilterApplied ? activeFilters : null,
      completion: (users) {
        if (users.isEmpty) {
          hasMoreData = false;
        } else {
          usersList.addAll(users);
          hasMoreData = users.length >= Limits.pagination;
        }
        isLoadingMore = false;
        update();
      },
    );
  }

  /// 👫 Interest / Requests actions
  void sendInterest(User profile) {
    UserService.shared.sendInterest(profile.id!, () {
      int index = usersList.indexWhere((user) => user.id == profile.id);
      if (index != -1) {
        usersList[index].isCanceled = false;
        usersList[index].isRequestSent = true;
        Get.snackbar("Success", "${profile.name} has been Requested.");
        update();
      }
    });
  }

  void acceptFriendRequest(User profile) {
    UserService.shared.acceptFriendReuquest(profile.id!, () {
      int index = usersList.indexWhere((user) => user.id == profile.id);
      if (index != -1) {
        usersList[index].isCanceled = false;
        usersList[index].isRequestSent = false;
        usersList[index].isFriend = true;
        Get.snackbar("Success", "${profile.name} has been Accepted.");
        update();
      }
    });
  }

  void unFriendUser(User profile) {
    UserService.shared.unfriendUser(profile.id!, () {
      int index = usersList.indexWhere((user) => user.id == profile.id);
      if (index != -1) {
        usersList[index].isRequestSent = false;
        usersList[index].isFriend = false;
        update();
      }
    });
  }

  void cancelInterest(User profile) {
    UserService.shared.cancelInterest(profile.id!, () {
      int index = usersList.indexWhere((user) => user.id == profile.id);
      if (index != -1) {
        usersList[index].isCanceled = true;
        usersList[index].isRequestSent = false;
        Get.snackbar("Success", "${profile.name} has been Cancelled.");
        update();
      }
    });
  }

  void shortList(User profile) {
    UserService.shared.shortlist(profile.id!, () {
      int index = usersList.indexWhere((user) => user.id == profile.id);
      if (index != -1) {
        usersList[index].isShortListed = !(usersList[index].isShortListed ?? false);
        update();
      }
    });
  }

  void sendMessage(User profile) {
    // 📩 placeholder for messaging feature
  }

  void superInterest(User profile) {
    UserService.shared.superInterest(profile.id!, () {
      // Optionally show snackbar
    });
  }

  /// 🔌 Socket Listeners
  void _bindSocketListeners() {
    SocketService.shared.onUserOnline((data) {
      String userId = data['userId'];
      for (var user in usersList) {
        if (user.id == userId) {
          user.isOnline = true;
          break;
        }
      }
      update();
    });

    SocketService.shared.onUserOffline((data) {
      String userId = data['userId'];
      String lastSeen = data['lastSeen'];
      for (var user in usersList) {
        if (user.id == userId) {
          user.isOnline = false;
          user.lastSeen = lastSeen;
          break;
        }
      }
      update();
    });
  }
}
