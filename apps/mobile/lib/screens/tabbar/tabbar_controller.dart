import 'package:banjaramatch/common/controller/base_controller.dart';

class TabBarController extends BaseController {
  int selectedTab = 0;

  int notificationCount = 0;
  int matchRequestCount = 0;
  int unreadChatRoomCount = 0;

  final List<String> tabTitles = ['Explore', 'Matches', 'Interests', 'Chats'];

  /// Custom logic: define tabs where toolbar should be hidden (e.g. index 0 and 2)
  bool get shouldShowToolbar {
    print("🔍 Checking toolbar visibility for tab index: $selectedTab");
    return !(selectedTab == 0 || selectedTab == 2);
  }

  /// Define any index where a custom toolbar should be used (e.g. index 2)
  bool get isCustomToolbar => selectedTab == 2;

  void selectIndex(int index) {
    if (selectedTab == index) return; // Prevent redundant update
    selectedTab = index;
    update();
  }

  void updateNotificationCount(int count) {
    notificationCount = count;
    update();
  }

  void updateMatchRequestCount(int count) {
    matchRequestCount = count;
    update();
  }

  void updateUnreadChatRoomCount(int count) {
    unreadChatRoomCount = count;
    update();
  }

  /// Main heading
  String get currentTabTitle => tabTitles[selectedTab];

  /// Optional subheading (location/filter text etc.)
  String? getSubHeadingForTab() {
    switch (selectedTab) {
      case 0:
        return null;
      case 1:
        return "Based on your Preference";
      case 2:
        return "Smart Shuffle";
      case 3:
        return "My Conversations";

      default:
        return null;
    }
  }

  /// Handle subheading click
  void onSubHeadingTapped() {
    switch (selectedTab) {
      case 1:
        print("Tapped Nearby Filter");
        break;
      case 2:
        print("Tapped Shuffle Mode Info");
        break;
      default:
        break;
    }
  }
}
