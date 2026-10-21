import 'dart:async';
import 'package:flutter/material.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/models/model_trending_profiles_response.dart';
import 'package:banjaramatch/models/registration.dart';

import '../../common/api_service/api_service.dart';
import '../../common/api_service/user_service.dart';
import '../../common/managers/session_manager.dart';
import '../../utilities/params.dart';
import '../../utilities/web_service.dart';
import '../visitors_screen/user_list_support.dart';
import '../banner.dart';
import 'model_live_activity.dart';

class ExploreController extends BaseController {
  List<AppBanner> banners = [];
  List<User> trustedUsers = [];
  List<User> recentViewedUsers = [];
  List<User> recentVisitors = [];
  List<Result> trendingUsers = [];
  List<User> newUsers = [];
  List<User> myShortListUsers = [];
  List<User> membersLookingForMe = [];
  List<User> usersshortlistedme = [];

  List<User> nearbyUsers = [];
  List<User> highlightedUsers = [];

  /// Today's ranked matches (Explore strip).
  List<User> dailyMatches = [];

  // Activity strip (real counts; the first two are capped page sizes).
  static const int visitorsCap = 50;
  static const int shortlistedMeCap = 50;
  int visitorsCount = 0;
  int shortlistedMeCount = 0;
  int pendingInterestsCount = 0;
  int connectionsCount = 0;

  PageController bannerController = PageController();

  ScrollController scrollController = ScrollController();

  @override
  void onReady() {
    super.onReady();
    loadAllData();
  }

  Future<void> loadAllData() async {
    isLoading.value = true;
    update();
    
    // Load data in parallel for faster loading. Some service calls never
    // call back on an error response, so each request is capped in time.
    await Future.wait([
      _fetchBannersAsync(),
      _fetchNewMembersAsync(),
      _fetchPeopleLookingForMeAsync(),
      _fetchMyShortlistAsync(),
      _fetchWhoShortListedMeAsync(),
      _fetchTrustedMembersAsync(),
      _fetchRecentViewersAsync(),
      _fetchRecentViewedUsersAsync(),
      _fetchLiveActivityAsync(),
      _fetchTrendingProfilesAsync(),
      _fetchDailyMatchesAsync(),
      _fetchActivityCountsAsync(),
    ].map((f) => f.timeout(const Duration(seconds: 20), onTimeout: () {})));
    
    await Future.delayed(Duration(milliseconds: 300)); // Smooth transition
    isLoading.value = false;
    update();
  }

  /// Pull-to-refresh on Explore.
  Future<void> refreshAllData() => loadAllData();

  Future<void> _fetchDailyMatchesAsync() {
    final completer = Completer<void>();
    UserService.shared.getTopDailyMatches(
      page: 1,
      limit: 10,
      completion: (users) {
        dailyMatches = users;
        if (!completer.isCompleted) completer.complete();
      },
    );
    return completer.future;
  }

  Future<void> _fetchActivityCountsAsync() {
    final myId = SessionManager.shared.getUserID();
    final visitors = Completer<void>();
    requestUserRows(
      WebService.profileVisitorSummary,
      {Param.myUserId: myId, 'type': 'they_viewed_me', 'page': 1, Param.limit: visitorsCap},
      (users) {
        visitorsCount = users.length;
        if (!visitors.isCompleted) visitors.complete();
      },
    );
    final shortlisted = Completer<void>();
    requestUserRows(
      WebService.fetchUsersList,
      {Param.myUserId: myId, 'page': 1, Param.start: 1, Param.limit: shortlistedMeCap, 'isShortListedByThey': true},
      (users) {
        shortlistedMeCount = users.length;
        if (!shortlisted.isCompleted) shortlisted.complete();
      },
    );
    return Future.wait([
      visitors.future,
      shortlisted.future,
      _interestTotal(type: 'received', status: 'pending').then((n) => pendingInterestsCount = n),
      _interestTotal(status: 'accepted').then((n) => connectionsCount = n),
    ]);
  }

  /// `total` of `getInterestList` for the given filters (0 on failure).
  Future<int> _interestTotal({String? type, required String status}) {
    final completer = Completer<int>();
    final param = <String, dynamic>{
      Param.myUserId: SessionManager.shared.getUserID(),
      'status': status,
      Param.start: 1,
      Param.limit: 1,
    };
    if (type != null) param['type'] = type;
    ApiService.shared.call(
      url: WebService.getInterestList,
      param: param,
      completion: (response) {
        var total = 0;
        if (response is Map) {
          final value = response['total'];
          if (value is num) {
            total = value.toInt();
          } else if (response['data'] is List) {
            total = (response['data'] as List).length;
          }
        }
        if (!completer.isCompleted) completer.complete(total);
      },
    );
    return completer.future;
  }

  // Async wrapper methods for parallel loading
  Future<void> _fetchBannersAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchBanners((banners) {
      this.banners = banners;
      completer.complete();
    });
    return completer.future;
  }

  Future<void> _fetchNewMembersAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchProfiles(
      filters: {},
      matchMyPreference: true,
      page: 1,
      sortByNewUsers: true,
      completion: (users) {
        newUsers = users;
        completer.complete();
      },
    );
    return completer.future;
  }

  Future<void> _fetchPeopleLookingForMeAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchProfiles(
      filters: {},
      matchTheirPreference: true,
      page: 1,
      sortByNewUsers: true,
      completion: (users) {
        membersLookingForMe = users;
        completer.complete();
      },
    );
    return completer.future;
  }

  Future<void> _fetchMyShortlistAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchProfiles(
      filters: {},
      page: 1,
      isShortListedByMe: true,
      completion: (users) {
        myShortListUsers = users;
        completer.complete();
      },
    );
    return completer.future;
  }

  Future<void> _fetchWhoShortListedMeAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchProfiles(
      filters: {},
      page: 1,
      isShortListedByThey: true,
      completion: (users) {
        usersshortlistedme = users;
        completer.complete();
      },
    );
    return completer.future;
  }

  Future<void> _fetchTrustedMembersAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchProfiles(
      filters: {},
      page: 1,
      isVerify: 1,
      completion: (users) {
        trustedUsers = users;
        completer.complete();
      },
    );
    return completer.future;
  }

  Future<void> _fetchRecentViewersAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchProfileVisitors("they_viewed_me", (users) {
      recentVisitors = users;
      completer.complete();
    });
    return completer.future;
  }

  Future<void> _fetchRecentViewedUsersAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchProfileVisitors("i_viewed", (users) {
      recentViewedUsers = users;
      completer.complete();
    });
    return completer.future;
  }

  Future<void> _fetchLiveActivityAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchLiveActivityData("i_viewed", (users) {
      liveActivities = users;
      completer.complete();
    });
    return completer.future;
  }

  Future<void> _fetchTrendingProfilesAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchTrendingProfiles(
      page: 1,
      completion: (users) {
        trendingUsers = users;
        completer.complete();
      },
    );
    return completer.future;
  }

  void fetchBanners() {
    UserService.shared.fetchBanners((banners) {
      this.banners = banners;
      stopLoading();
      update();
    });
  }

  void fetchTrustedMembers() {
    UserService.shared.fetchProfiles(
        filters: {},
        page: 1,
        isVerify: 1,
        completion: (users) {
          trustedUsers = users;
          stopLoading();
          update();
        });
  }

  void fetchNewMembers() {
    UserService.shared.fetchProfiles(
        filters: {},
        matchMyPreference: true,
        page: 1,
        sortByNewUsers: true,
        completion: (users) {
          newUsers = users;
          stopLoading();
          update();
        });
  }

  void fetchPeopleLookingForMe() {
    UserService.shared.fetchProfiles(
        filters: {},
        matchTheirPreference: true,
        page: 1,
        sortByNewUsers: true,
        completion: (users) {
          membersLookingForMe = users;
          stopLoading();
          update();
        });
  }

  void fetchMyShortlist() {
    UserService.shared.fetchProfiles(
        filters: {},
        page: 1,
        isShortListedByMe: true,
        completion: (users) {
          myShortListUsers = users;
          stopLoading();
          update();
        });
  }

  void fetchnearbyUsers() {
    UserService.shared.fetchNearbyProfiles(
        page: 1,
        completion: (users) {
          nearbyUsers = users;
          stopLoading();
          update();
        });
  }

  void realAddNotifications() {
    UserService.shared.fetchHighlightedProfiles(
        page: 1,
        completion: (users) {
          highlightedUsers = users;
          stopLoading();
          update();
        });
  }

  void fetchWhoShortLIstedMe() {
    UserService.shared.fetchProfiles(
        filters: {},
        page: 1,
        isShortListedByThey: true,
        completion: (users) {
          usersshortlistedme = users;
          stopLoading();
          update();
        });
  }

  void fetchTrendingProfiles() {
    UserService.shared.fetchTrendingProfiles(
        page: 1,
        completion: (users) {
          trendingUsers = users;
          stopLoading();
          update();
        });
  }

  void toggleShortlistTrending(String userId, int index) {
    UserService.shared.shortlist(userId, () {
      if (index >= 0 && index < trendingUsers.length) {
        trendingUsers[index].user?.isShortListed = !(trendingUsers[index].user?.isShortListed ?? false);
        update();
      }
    });
  }

  void fetchRecentViewers() {
    UserService.shared.fetchProfileVisitors("they_viewed_me", (users) {
      recentVisitors = users;
    });
  }

  void fetchRecentViewedUsers() {
    UserService.shared.fetchProfileVisitors("i_viewed", (users) {
      recentViewedUsers = users;
    });
  }

  List<LiveActivity> liveActivities = []; // <-- new variable

  void fetchLiveActivity() {
    UserService.shared.fetchLiveActivityData("i_viewed", (users) {
      liveActivities = users;
    });
  }
}
