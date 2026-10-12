// import 'package:flutter/material.dart';
// import 'package:banjaramatch/common/controller/base_controller.dart';
// import 'package:banjaramatch/screens/member_data.dart';
//
// import 'Blog.dart';
// import 'ExploreService.dart';
// import 'HappyStory.dart';
// import 'Package.dart';
// import 'Review.dart';
// import 'banner.dart';
//
// class ExploreController extends BaseController {
//   List<BannerModel> banners = [];
//   List<MemberData> premiumMembers = [];
//   List<MemberData> trustedUsers = [];
//   List<Package> packages = [];
//   List<HappyStory> happyStories = [];
//   List<Blog> blogs = [];
//   List<Review> reviews = [];
//
//   PageController bannerController = PageController();
//   PageController happyStoriesController = PageController();
//   PageController reviewController = PageController();
//
//   ScrollController scrollController = ScrollController();
//
//   @override
//   void onReady() {
//     fetchBanners();
//     fetchPremiumMembers();
//     fetchTrustedUsers();
//     fetchPackages();
//     fetchHappyStories();
//     fetchBlogs();
//     fetchReviews();
//
//     scrollController.addListener(() {
//       if (scrollController.offset == scrollController.position.maxScrollExtent) {
//         if (!isLoading) {
//           fetchBlogs();
//         }
//       }
//     });
//
//     super.onReady();
//   }
//
//   void fetchBanners() {
//     //startLoading();
//     ExploreService.shared.fetchBanners((bannerList) {
//       banners.addAll(bannerList);
//       stopLoading();
//       update();
//     });
//   }
//
//   void fetchPremiumMembers() {
//     //startLoading();
//     ExploreService.shared.fetchPremiumMembers((members) {
//       premiumMembers.addAll(members);
//       stopLoading();
//       update();
//     });
//   }
//
//   void fetchTrustedUsers() {
//     //startLoading();
//     ExploreService.shared.fetchTrustedUsers((users) {
//       trustedUsers.addAll(users);
//       stopLoading();
//       update();
//     });
//   }
//
//   void fetchPackages() {
//     //startLoading();
//     ExploreService.shared.fetchPackages((packageList) {
//       packages.addAll(packageList);
//       stopLoading();
//       update();
//     });
//   }
//
//   void fetchHappyStories() {
//     //startLoading();
//     ExploreService.shared.fetchHappyStories((stories) {
//       happyStories.addAll(stories);
//       stopLoading();
//       update();
//     });
//   }
//
//   void fetchBlogs() {
//     if (blogs.isEmpty) {
//       //startLoading();
//     }
//     isLoading = true;
//     ExploreService.shared.fetchBlogs(blogs.length, (blogList) {
//       if (blogs.isEmpty) {
//         stopLoading();
//       }
//       isLoading = false;
//       blogs.addAll(blogList);
//       update();
//     });
//   }
//
//   void fetchReviews() {
//     //startLoading();
//     ExploreService.shared.fetchReviews((reviewList) {
//       reviews.addAll(reviewList);
//       stopLoading();
//       update();
//     });
//   }
// }

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/models/model_trending_profiles_response.dart';
import 'package:banjaramatch/models/registration.dart';

import '../../common/api_service/user_service.dart';
import '../Blog.dart';
import '../HappyStory.dart';
import '../Package.dart';
import '../Review.dart';
import '../banner.dart';
import 'model_live_activity.dart';

class ExploreController extends BaseController {
  List<AppBanner> banners = [];
  List<User> premiumMembers = [];
  List<User> trustedUsers = [];
  List<Package> packages = [];
  List<HappyStory> happyStories = [];
  List<Blog> blogs = [];
  List<Review> reviews = [];
  List<User> recentViewedUsers = [];
  List<User> recentVisitors = [];
  List<Result> trendingUsers = [];
  List<User> newUsers = [];
  List<User> myShortListUsers = [];
  List<User> membersLookingForMe = [];
  List<User> usersshortlistedme = [];

  List<User> nearbyUsers = [];
  List<User> highlightedUsers = [];

  PageController bannerController = PageController();
  PageController happyStoriesController = PageController();
  PageController reviewController = PageController();

  ScrollController scrollController = ScrollController();

  @override
  void onReady() {
    super.onReady();
    loadAllData();
  }

  Future<void> loadAllData() async {
    isLoading.value = true;
    update();
    
    // Load data in parallel for faster loading
    await Future.wait([
      _fetchBannersAsync(),
      _fetchPremiumMembersAsync(),
      _fetchNewMembersAsync(),
      _fetchPeopleLookingForMeAsync(),
      _fetchMyShortlistAsync(),
      _fetchWhoShortListedMeAsync(),
      _fetchTrustedMembersAsync(),
      _fetchRecentViewersAsync(),
      _fetchRecentViewedUsersAsync(),
      _fetchLiveActivityAsync(),
      _fetchTrendingProfilesAsync(),
    ]);
    
    await Future.delayed(Duration(milliseconds: 300)); // Smooth transition
    isLoading.value = false;
    update();
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

  Future<void> _fetchPremiumMembersAsync() {
    final completer = Completer<void>();
    UserService.shared.fetchProfiles(
      onlyProWithoutPlan: true,
      page: 1,
      completion: (users) {
        premiumMembers = users;
        completer.complete();
      },
    );
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

  // Fetch premium members
  void fetchPremiumMembers() {
    UserService.shared.fetchProfiles(
        onlyProWithoutPlan: true,
        page: 1,
        completion: (users) {
          premiumMembers = users;
          stopLoading();
          update();
        });
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
