import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/extensions/image_extension.dart';
import 'package:banjaramatch/common/widgets/functions.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/chats_screen/chats_screen.dart';
import 'package:banjaramatch/screens/explore_screen/Explorescreen.dart';
import 'package:banjaramatch/screens/partner_preference-view_screen.dart';
import 'package:banjaramatch/screens/setting_screen/settings_screen_side.dart';
import 'package:banjaramatch/screens/tabbar/tabbar_controller.dart';
import 'package:banjaramatch/screens/user_interest_screen.dart';
import 'package:banjaramatch/screens/users_list.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../../common/managers/navigation.dart';
import '../../common/managers/session_manager.dart';
import '../../common/widgets/my_cached_image.dart';
import '../notification_screen/notification_screen.dart';
import '../profile_screen/profile_controller.dart';
import '../search_profiles_screen.dart';

class TabBarScreen extends StatelessWidget {
  TabBarScreen({Key? key}) : super(key: key);
  final TabBarController controller = Get.put(TabBarController());

  final GlobalKey<ScaffoldState> scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    Functions.changStatusBar(StatusBarStyle.black);

    return SafeArea(
      child: Scaffold(
        key: scaffoldKey,
        drawer: Drawer(
          backgroundColor: cBackground,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.only(
              topRight: Radius.circular(0),
              bottomRight: Radius.circular(0),
            ),
          ),
          child: SettingScreenSide(),
        ),
        backgroundColor: cWhite,
        body: GetBuilder<TabBarController>(
          builder: (controller) {
            return Column(
              children: [
                if (controller.shouldShowToolbar)
                  GetBuilder<ProfileController>(
                    builder: (profileController) {
                      return DashboardTopHeader(
                        subTitle: controller.getSubHeadingForTab(),
                        profileImageUrl:
                            profileController.user?.profile ?? SessionManager.shared.getUser()?.profile ?? '',
                        fullName:
                            profileController.user?.fullName ?? SessionManager.shared.getUser()?.fullName ?? 'Guest',
                        onProfileTap: () => {
                          // Navigate.to(ProfileScreen(
                          //   isFromTabBar: true,
                          //   userId: SessionManager.shared.getUserID(),
                          // ))

                          scaffoldKey.currentState?.openDrawer()
                        },
                        onEditTap: () {
                          scaffoldKey.currentState?.openDrawer();
                        },
                        onNotificationTap: () => Navigate.to(NotificationScreen()),
                        onSearchTap: () => Navigate.to(SearchUserScreen()),
                        title: controller.currentTabTitle,
                        onTapOnEditPreference: () {
                          Navigate.to(PartnerPreferenceViewScreen());
                        },
                      );
                    },
                  ),
                Expanded(child: screen()),
                Container(
                  color: cWhite,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: SafeArea(
                    top: false,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        button(LKeys.explore, MyImages.quill, 0),
                        button(LKeys.matches, MyImages.meeting, 1, badgeCount: 0),
                        // button(LKeys.randoms, MyImages.random, 2),
                        button(LKeys.interests, MyImages.chat, 2, badgeCount: controller.matchRequestCount),
                        button(LKeys.chats, MyImages.chat, 3, badgeCount: controller.unreadChatRoomCount),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget screen() {
    switch (controller.selectedTab) {
      case 1:
        return UsersListPage();
      // case 2:
      //   return const RandomScreen();
      case 2:
        return InterestUserScreen();
      case 3:
        return const ChatsScreen();
      default:
        return ExplorePage(scaffoldKey);
    }
  }

  Widget button(String title, String image, int index, {int badgeCount = 0}) {
    return GestureDetector(
      onTap: () => controller.selectIndex(index),
      child: Container(
        color: cWhite,
        width: Get.width / 5,
        child: TabBarButton(
          image: image,
          title: title,
          isSelected: controller.selectedTab == index,
          badgeCount: badgeCount,
        ),
      ),
    );
  }
}

class TabBarButton extends StatelessWidget {
  final String title;
  final String image;
  final bool isSelected;
  final int badgeCount;

  const TabBarButton({
    Key? key,
    required this.title,
    required this.image,
    required this.isSelected,
    this.badgeCount = 0,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Image.asset(
              image,
              width: 20,
              height: 20,
              color: isSelected ? cPrimary : cLightText,
            ),
            if (badgeCount > 0)
              Positioned(
                right: -6,
                top: -6,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                  child: Text(
                    badgeCount > 99 ? '99+' : badgeCount.toString(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 5),
        Text(
          title.tr,
          style: MyTextStyle.gilroyRegular(
            size: 12,
            color: isSelected ? cPrimary : cLightText,
          ),
        ),
      ],
    );
  }
}

class DashboardTopHeader extends StatelessWidget {
  final String? title;
  final String? subTitle;

  final String profileImageUrl;
  final String fullName;
  final VoidCallback onProfileTap;
  final VoidCallback onEditTap;
  final VoidCallback onNotificationTap;
  final VoidCallback onSearchTap;
  final VoidCallback onTapOnEditPreference;

  DashboardTopHeader({
    super.key,
    required this.profileImageUrl,
    required this.fullName,
    required this.onProfileTap,
    required this.onEditTap,
    required this.onNotificationTap,
    required this.onSearchTap,
    required this.title,
    this.subTitle,
    required this.onTapOnEditPreference,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Stack(
                  children: [
                    GestureDetector(
                      onTap: onProfileTap,
                      child: ClipSmoothRect(
                        radius: const SmoothBorderRadius.all(SmoothRadius(cornerRadius: 100, cornerSmoothing: 1)),
                        child: MyCachedImage(
                          imageUrl: profileImageUrl,
                          width: 46,
                          height: 46,
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: onEditTap,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                            boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 2)],
                          ),
                          padding: const EdgeInsets.all(2),
                          child: const Icon(
                            CupertinoIcons.line_horizontal_3,
                            size: 14,
                            color: cPrimary,
                          ),
                        ),
                      ),
                    )
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title ?? "",
                        style: MyTextStyle.gilroyBold(size: 16, color: cDarkText),
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subTitle != null) const SizedBox(height: 2),
                      if (subTitle != null)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            GestureDetector(
                              child: Text(
                                subTitle ?? "",
                                style: MyTextStyle.gilroySemiBold(
                                  size: 13,
                                  color: subTitle == "Based on your Preference" ? cPrimary : cDarkText,
                                ),
                              ),
                              onTap: () {
                                onTapOnEditPreference();
                              },
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
                GetBuilder<TabBarController>(builder: (controller) {
                  return Stack(
                    children: [
                      IconButton(
                        icon: const Icon(CupertinoIcons.bell, size: 22, color: cDarkText),
                        onPressed: () {
                          controller.notificationCount = 0;
                          controller.update();
                          onNotificationTap();
                        },
                        tooltip: 'Notifications',
                      ),
                      if (controller.notificationCount > 0)
                        Positioned(
                          right: 4,
                          top: 4,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                            child: Text(
                              controller.notificationCount.toString(),
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  );
                }),
                IconButton(
                  icon: const Icon(CupertinoIcons.search, size: 22, color: cDarkText),
                  onPressed: onSearchTap,
                  tooltip: 'Search Profile',
                )
              ],
            ),
          ),
        ),
      ],
    );
  }
}
