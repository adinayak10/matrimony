// import 'package:figma_squircle/figma_squircle.dart';
// import 'package:flutter/cupertino.dart';
// import 'package:flutter/material.dart';
// import 'package:get/get.dart';
// import 'package:banjaramatch/common/extensions/font_extension.dart';
// import 'package:banjaramatch/common/widgets/my_cached_image.dart';
// import 'package:banjaramatch/common/widgets/no_data_found.dart';
// import 'package:banjaramatch/localization/languages.dart';
// import 'package:banjaramatch/models/registration.dart';
// import 'package:banjaramatch/screens/chats_screen/chat_view/chat_card.dart';
// import 'package:banjaramatch/screens/chats_screen/chats_screen_controller.dart';
// import 'package:banjaramatch/screens/chats_screen/chatting_screen/chatting_view.dart';
// import 'package:banjaramatch/screens/extra_views/back_button.dart';
// import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
// import 'package:banjaramatch/utilities/const.dart';
//
// import '../../common/managers/navigation.dart';
// import '../../models/model_chat_room_list.dart';
//
// class ChatsScreen extends StatelessWidget {
//   const ChatsScreen({Key? key}) : super(key: key);
//
//   @override
//   Widget build(BuildContext context) {
//     ChatsScreensController controller = ChatsScreensController();
//     return GetBuilder<ChatsScreensController>(
//         init: controller,
//         builder: (controller) {
//           return Container(
//             color: cWhite,
//             child: Column(
//               children: [
//                 // top(controller),
//                 Expanded(
//                   child: Column(
//                     children: [
//                       Divider(
//                         height: 1,
//                       ),
//                       if (controller.onlineUsers.isNotEmpty)
//                         OnlineUsersHorizontalList(
//                           fetchUsers: (page) async {
//                             // Replace with your paginated API call
//                             await Future.delayed(const Duration(seconds: 1)); // simulate delay
//                             if (page > 3) return []; // simulate end
//                             return List.generate(
//                                 controller.onlineUsers.length, (index) => controller.onlineUsers[index]);
//                           },
//                         ),
//
//                       Divider(
//                         height: 1,
//                       ),
//                       //  segmentController(controller),
//
//                       Expanded(
//                         child: PageView(
//                           controller: controller.controller,
//                           onPageChanged: controller.onChangePage,
//                           children: [
//                             chatList(controller, 1),
//                             //  chatList(controller, 0),
//                           ],
//                         ),
//                       ),
//                     ],
//                   ),
//                 )
//               ],
//             ),
//           );
//         });
//   }
//
//   Widget chatList(ChatsScreensController controller, int type) {
//     List<ChatRoom> chats = type == 0 ? controller.requestChats : controller.activeChats;
//
//     return chats.isEmpty
//         ? NoDataFound(controller: controller)
//         : ListView.builder(
//             padding: const EdgeInsets.only(top: 0),
//             itemCount: chats.length,
//             itemBuilder: (context, index) {
//               var chatUserRoom = chats[index];
//               return GestureDetector(
//                   onLongPress: () {
//                     Get.bottomSheet(Wrap(
//                       children: [
//                         Container(
//                           decoration: const ShapeDecoration(
//                             shape: SmoothRectangleBorder(
//                                 borderRadius: SmoothBorderRadius.only(
//                                     topLeft: SmoothRadius(cornerRadius: 30, cornerSmoothing: cornerSmoothing),
//                                     topRight: SmoothRadius(cornerRadius: 30, cornerSmoothing: cornerSmoothing))),
//                             color: cBlack,
//                           ),
//                           padding: const EdgeInsets.all(25),
//                           child: SafeArea(
//                             top: false,
//                             child: Column(
//                               crossAxisAlignment: CrossAxisAlignment.start,
//                               children: [
//                                 Row(
//                                   children: [
//                                     Text(
//                                       chatUserRoom.fullName ?? '',
//                                       style: MyTextStyle.gilroyBold(size: 22, color: cWhite),
//                                     ),
//                                     const Spacer(),
//                                     const XMarkButton(),
//                                   ],
//                                 ),
//                                 const SizedBox(height: 40),
//                                 ChatSheetButton(
//                                   title: chatUserRoom.unreadMessagesCount == 0
//                                       ? LKeys.markAsUnread.tr
//                                       : LKeys.markAsRead.tr,
//                                   onTap: () => {
//                                     //  controller.markToggle(chatUserRoom)
//                                   },
//                                 ),
//                                 const Divider(
//                                   color: cLightText,
//                                 ),
//                                 const SizedBox(height: 5),
//                                 ChatSheetButton(
//                                   title: LKeys.clearChat.tr,
//                                   onTap: () => {
//                                     //controller.clearChat(chatUserRoom)
//                                   },
//                                 ),
//                                 const SizedBox(height: 5),
//                                 const Divider(
//                                   color: cLightText,
//                                 ),
//                                 ChatSheetButton(
//                                   title: LKeys.deleteChat.tr,
//                                   onTap: () => {controller.deleteChat(chatUserRoom)},
//                                 ),
//                               ],
//                             ),
//                           ),
//                         ),
//                       ],
//                     ));
//                   },
//                   onTap: () {
//                     controller.markRoomAsSeen(chats[index].roomId!);
//                     Navigate.to(ChattingView(chatRoom: chatUserRoom));
//                   },
//                   child: ChatCard(chatUserRoom: chatUserRoom));
//             },
//           );
//   }
//
//   Widget segmentController(ChatsScreensController controller) {
//     return CupertinoSlidingSegmentedControl(
//       children: {
//         0: buildSegment(LKeys.chats, 0, controller),
//         1: buildSegment(LKeys.requests, 1, controller),
//       },
//       groupValue: controller.selectedPage,
//       backgroundColor: cLightText.withOpacity(0.2),
//       thumbColor: cBlack,
//       padding: const EdgeInsets.all(0),
//       onValueChanged: (value) {
//         controller.onChangeSegment(value ?? 0);
//       },
//     );
//   }
//
//   Widget buildSegment(String text, int index, ChatsScreensController controller) {
//     return Container(
//       alignment: Alignment.center,
//       width: (Get.width / 3) - 30,
//       child: Text(
//         text.toUpperCase(),
//         style: MyTextStyle.gilroySemiBold(size: 13, color: controller.selectedPage == index ? cWhite : cBlack)
//             .copyWith(letterSpacing: 2),
//       ),
//     );
//   }
// }
//
// class ChatSheetButton extends StatelessWidget {
//   final String title;
//   final Function() onTap;
//
//   const ChatSheetButton({super.key, required this.title, required this.onTap});
//
//   @override
//   Widget build(BuildContext context) {
//     return GestureDetector(
//       child: Container(
//           alignment: Alignment.center,
//           width: double.infinity,
//           color: cBlack,
//           child: Text(title, style: MyTextStyle.gilroySemiBold(color: cWhite, size: 18))),
//       onTap: () {
//         Get.back();
//         onTap();
//       },
//     );
//   }
// }
//
// class OnlineUsersHorizontalList extends StatefulWidget {
//   final Future<List<User>> Function(int page) fetchUsers;
//
//   const OnlineUsersHorizontalList({super.key, required this.fetchUsers});
//
//   @override
//   State<OnlineUsersHorizontalList> createState() => _OnlineUsersHorizontalListState();
// }
//
// class _OnlineUsersHorizontalListState extends State<OnlineUsersHorizontalList> {
//   List<User> users = [];
//   bool isLoading = false;
//   bool hasMore = true;
//   int page = 1;
//
//   final ScrollController _scrollController = ScrollController();
//
//   @override
//   void initState() {
//     super.initState();
//     _fetchMore();
//     _scrollController.addListener(() {
//       if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200 &&
//           !isLoading &&
//           hasMore) {
//         _fetchMore();
//       }
//     });
//   }
//
//   Future<void> _fetchMore() async {
//     setState(() => isLoading = true);
//
//     final newUsers = await widget.fetchUsers(page);
//     setState(() {
//       users.addAll(newUsers);
//       isLoading = false;
//       page++;
//
//       if (newUsers.length < 10) hasMore = false;
//     });
//   }
//
//   @override
//   void dispose() {
//     _scrollController.dispose();
//     super.dispose();
//   }
//
//   Widget _buildUserCard(User user) {
//     return GestureDetector(
//       onTap: () {
//         Get.to(ProfileScreen(userId: user.id!));
//       },
//       child: Container(
//         margin: const EdgeInsets.only(right: 8, top: 8),
//         child: Column(
//           children: [
//             Stack(
//               children: [
//                 ClipSmoothRect(
//                   radius: const SmoothBorderRadius.all(
//                     SmoothRadius(cornerRadius: 60, cornerSmoothing: cornerSmoothing),
//                   ),
//                   child: MyCachedProfileImageOnline(
//                     imageUrl: user.profile,
//                     fullName: user.fullName,
//                     width: 56,
//                     height: 56,
//                   ),
//                 ),
//                 if (user.isOnline == true)
//                   Positioned(
//                     bottom: 2,
//                     right: 2,
//                     child: Container(
//                       width: 14,
//                       height: 14,
//                       decoration: BoxDecoration(
//                         color: Colors.green,
//                         shape: BoxShape.circle,
//                         border: Border.all(color: Colors.white, width: 2),
//                       ),
//                     ),
//                   ),
//               ],
//             ),
//             const SizedBox(height: 6),
//             Text(
//               _getShortName(user.fullName) ?? "",
//               style: MyTextStyle.gilroyBold(color: cLightText, size: 12),
//             ),
//           ],
//         ),
//       ),
//     );
//   }
//
//   String _getShortName(String? fullName) {
//     if (fullName == null || fullName.trim().isEmpty) return '';
//     final parts = fullName.trim().split(RegExp(r'\s+'));
//     if (parts.length == 1) {
//       // Return capitalized first word
//       return parts[0][0].toUpperCase() + parts[0].substring(1).toLowerCase();
//     }
//     return '${parts[0][0].toUpperCase()}${parts[0].substring(1).toLowerCase()} ${parts.last[0].toUpperCase()}';
//   }
//
//   Widget _buildLoader() {
//     return const SizedBox(
//       width: 40,
//       child: Center(
//         child: CircularProgressIndicator(strokeWidth: 2),
//       ),
//     );
//   }
//
//   @override
//   Widget build(BuildContext context) {
//     return SizedBox(
//       height: 90,
//       child: Container(
//         margin: const EdgeInsets.only(left: 16, right: 16),
//         child: ListView.builder(
//           controller: _scrollController,
//           scrollDirection: Axis.horizontal,
//           itemCount: users.length + (hasMore ? 1 : 0),
//           itemBuilder: (context, index) {
//             if (index < users.length) {
//               return _buildUserCard(users[index]);
//             } else {
//               return _buildLoader();
//             }
//           },
//         ),
//       ),
//     );
//   }
// }

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/chats_screen/chats_screen_controller.dart';
import 'package:banjaramatch/screens/chats_screen/chatting_screen/chatting_view.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/screens/tabbar/tabbar_controller.dart';

import '../../common/managers/navigation.dart';
import '../../models/model_chat_room_list.dart';

class ChatsScreen extends StatelessWidget {
  const ChatsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    ChatsScreensController controller = ChatsScreensController();
    return GetBuilder<ChatsScreensController>(
        init: controller,
        builder: (controller) {
          return Scaffold(
            backgroundColor: Colors.grey[50],
            body: Column(
              children: [
                // Enhanced Header
                // _buildHeader(controller),

                Expanded(
                  child: Column(
                    children: [
                      // Online Users Section
                      if (controller.onlineUsers.isNotEmpty) ...[
                        _buildSectionHeader("💚 Currently Online", "${controller.onlineUsers.length} members"),
                        OnlineUsersHorizontalList(
                          fetchUsers: (page) async {
                            const int pageSize = 10;
                            final int start = (page - 1) * pageSize;
                            if (start >= controller.onlineUsers.length) return [];

                            final int end = (start + pageSize) > controller.onlineUsers.length
                                ? controller.onlineUsers.length
                                : (start + pageSize);

                            return controller.onlineUsers.sublist(start, end);
                          },
                        ),
                        const SizedBox(height: 8),
                      ],

                      // Chat List
                      Expanded(
                        child: PageView(
                          controller: controller.controller,
                          onPageChanged: controller.onChangePage,
                          children: [
                            _buildChatList(controller, 1),
                          ],
                        ),
                      ),
                    ],
                  ),
                )
              ],
            ),
          );
        });
  }

  Widget _buildHeader(ChatsScreensController controller) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.pink[400]!, Colors.pink[300]!],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.pink.shade200.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Messages",
                        style: MyTextStyle.gilroyBold(size: 24, color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "Connect with your matches",
                        style: MyTextStyle.gilroyMedium(size: 14, color: Colors.white.withOpacity(0.9)),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      _buildHeaderButton(Icons.search, () {}),
                      const SizedBox(width: 12),
                      _buildHeaderButton(Icons.more_vert, () {}),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Quick Stats
              Row(
                children: [
                  _buildStatChip("${controller.activeChats.length}", "Active Chats", Colors.green),
                  const SizedBox(width: 12),
                  _buildStatChip("${controller.onlineUsers.length}", "Online Now", Colors.blue),
                  const SizedBox(width: 12),
                  GetBuilder<TabBarController>(
                    builder: (tabs) => _buildStatChip(
                      "${tabs.matchRequestCount}",
                      AppKeys.chatsPendingRequests.tr,
                      Colors.orange,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  Widget _buildStatChip(String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: MyTextStyle.gilroyBold(size: 16, color: Colors.white),
            ),
            Text(
              label,
              style: MyTextStyle.gilroyMedium(size: 10, color: Colors.white.withOpacity(0.8)),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: MyTextStyle.gilroyBold(size: 16, color: Colors.grey[800]),
              ),
              Text(
                subtitle,
                style: MyTextStyle.gilroyMedium(size: 12, color: Colors.grey[600]),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildChatList(ChatsScreensController controller, int type) {
    List<ChatRoom> chats = type == 0 ? controller.requestChats : controller.activeChats;

    if (chats.isEmpty) {
      return _buildEmptyState(type);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 8),
        itemCount: chats.length,
        itemBuilder: (context, index) {
          var chatUserRoom = chats[index];
          return _buildEnhancedChatCard(chatUserRoom, controller);
        },
      ),
    );
  }

  Widget _buildEmptyState(int type) {
    String title = type == 0 ? "No Chat Requests" : "No Active Chats";
    String subtitle = type == 0 ? "New chat requests will appear here" : "Start conversations with your matches";
    IconData icon = type == 0 ? Icons.mail_outline : Icons.chat_bubble_outline;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.pink[50],
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 48, color: Colors.pink[300]),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: MyTextStyle.gilroyBold(size: 18, color: Colors.grey[700]),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: MyTextStyle.gilroyMedium(size: 14, color: Colors.grey[500]),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
            decoration: BoxDecoration(
              color: Colors.pink[400],
              borderRadius: BorderRadius.circular(25),
            ),
            child: Text(
              "Find Matches",
              style: MyTextStyle.gilroySemiBold(size: 14, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEnhancedChatCard(ChatRoom chatUserRoom, ChatsScreensController controller) {
    return GestureDetector(
      onLongPress: () => _showChatOptions(chatUserRoom, controller),
      onTap: () {
        controller.markRoomAsSeen(chatUserRoom.roomId!);
        Navigate.to(ChattingView(chatRoom: chatUserRoom));
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: ShapeDecoration(
          shape: const SmoothRectangleBorder(
            borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 16, cornerSmoothing: cornerSmoothing)),
          ),
          color: Colors.white,
          shadows: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Profile Image with Status
              Stack(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: chatUserRoom.unreadMessagesCount! > 0 ? Colors.pink[300]! : Colors.grey[200]!,
                        width: 2,
                      ),
                    ),
                    child: ClipSmoothRect(
                      radius: const SmoothBorderRadius.all(
                        SmoothRadius(cornerRadius: 10, cornerSmoothing: cornerSmoothing),
                      ),
                      child: MyCachedProfileImage(
                        imageUrl: chatUserRoom.profile,
                        fullName: chatUserRoom.fullName ?? '',
                        width: 58,
                        height: 58,
                      ),
                    ),
                  ),
                  // Online Status
                  if (chatUserRoom.isOnline == true)
                    Positioned(
                      bottom: 2,
                      right: 2,
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          color: Colors.green,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 16),

              // Chat Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          chatUserRoom.fullName ?? '',
                          style: MyTextStyle.gilroyBold(
                            size: 16,
                            color: chatUserRoom.unreadMessagesCount! > 0 ? Colors.black : Colors.grey[800],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        // // Verification Badge
                        // Container(
                        //   padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        //   decoration: BoxDecoration(
                        //     color: Colors.blue[50],
                        //     borderRadius: BorderRadius.circular(4),
                        //   ),
                        //   child: Text(
                        //     "✓ Verified",
                        //     style: MyTextStyle.gilroySemiBold(size: 9, color: Colors.blue[600]),
                        //   ),
                        // ),

                        // Status Row
                        Row(
                          children: [
                            // Activity Status
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: _getActivityColor(chatUserRoom).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                _getActivityText(chatUserRoom),
                                style: MyTextStyle.gilroySemiBold(
                                  size: 10,
                                  color: _getActivityColor(chatUserRoom),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    // Last Message
                    Text(
                      chatUserRoom.lastMessage?.content ?? "Start your conversation...",
                      style: MyTextStyle.gilroyMedium(
                        size: 13,
                        color: chatUserRoom.unreadMessagesCount! > 0 ? Colors.grey[700] : Colors.grey[500],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),

                    // Timestamp
                    Text(
                      _formatTime(chatUserRoom.lastMessage?.timestamp),
                      style: MyTextStyle.gilroyMedium(size: 11, color: Colors.grey[500]),
                    ),
                  ],
                ),
              ),

              // Action Indicators
              Column(
                children: [
                  if (chatUserRoom.unreadMessagesCount! > 0)
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                      child: Text(
                        chatUserRoom.unreadMessagesCount! > 99 ? "99+" : chatUserRoom.unreadMessagesCount.toString(),
                        style: MyTextStyle.gilroyBold(size: 10, color: Colors.white),
                        textAlign: TextAlign.center,
                      ),
                    )
                  else
                    Icon(Icons.chevron_right, color: Colors.grey[400], size: 20),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getActivityColor(ChatRoom chatRoom) {
    if (chatRoom.isOnline == true) return Colors.green;
    if (chatRoom.lastSeen != null) {
      final lastSeen = DateTime.parse(chatRoom.lastSeen!);
      final diff = DateTime.now().difference(lastSeen);
      if (diff.inHours < 24) return Colors.orange;
    }
    return Colors.grey;
  }

  String _getActivityText(ChatRoom chatRoom) {
    if (chatRoom.isOnline == true) return "Online now";
    if (chatRoom.lastSeen != null) {
      final lastSeen = DateTime.parse(chatRoom.lastSeen!);
      final diff = DateTime.now().difference(lastSeen);
      if (diff.inMinutes < 60) return "${diff.inMinutes}m ago";
      if (diff.inHours < 24) return "${diff.inHours}h ago";
    }
    return "Offline";
  }

  String _formatTime(String? timestamp) {
    if (timestamp == null) return "";
    final time = DateTime.parse(timestamp);
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inDays > 0) return "${diff.inDays}d";
    if (diff.inHours > 0) return "${diff.inHours}h";
    if (diff.inMinutes > 0) return "${diff.inMinutes}m";
    return "now";
  }

  void _showChatOptions(ChatRoom chatUserRoom, ChatsScreensController controller) {
    Get.bottomSheet(
      Container(
        decoration: const ShapeDecoration(
          shape: SmoothRectangleBorder(
            borderRadius: SmoothBorderRadius.only(
              topLeft: SmoothRadius(cornerRadius: 24, cornerSmoothing: cornerSmoothing),
              topRight: SmoothRadius(cornerRadius: 24, cornerSmoothing: cornerSmoothing),
            ),
          ),
          color: Colors.white,
        ),
        padding: const EdgeInsets.all(24),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle bar
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),

              // Header
              Row(
                children: [
                  ClipOval(
                    child: MyCachedProfileImage(
                      imageUrl: chatUserRoom.profile,
                      fullName: chatUserRoom.fullName ?? '',
                      width: 50,
                      height: 50,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          chatUserRoom.fullName ?? '',
                          style: MyTextStyle.gilroyBold(size: 18),
                        ),
                        Text(
                          "Manage conversation",
                          style: MyTextStyle.gilroyMedium(size: 14, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Get.back(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Options
              _buildOptionTile(
                icon: chatUserRoom.unreadMessagesCount == 0 ? Icons.mark_chat_unread : Icons.mark_chat_read,
                title: chatUserRoom.unreadMessagesCount == 0 ? "Mark as Unread" : "Mark as Read",
                onTap: () => Get.back(),
              ),
              _buildOptionTile(
                icon: Icons.clear_all,
                title: "Clear Chat History",
                onTap: () => Get.back(),
              ),
              _buildOptionTile(
                icon: Icons.block,
                title: "Block Contact",
                onTap: () => Get.back(),
                isDestructive: true,
              ),
              _buildOptionTile(
                icon: Icons.delete,
                title: "Delete Conversation",
                onTap: () {
                  Get.back();
                  controller.deleteChat(chatUserRoom);
                },
                isDestructive: true,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOptionTile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: isDestructive ? Colors.red : Colors.grey[700],
      ),
      title: Text(
        title,
        style: MyTextStyle.gilroyMedium(
          size: 16,
          color: isDestructive ? Colors.red : Colors.grey[800],
        ),
      ),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    );
  }
}

class OnlineUsersHorizontalList extends StatefulWidget {
  final Future<List<User>> Function(int page) fetchUsers;

  const OnlineUsersHorizontalList({super.key, required this.fetchUsers});

  @override
  State<OnlineUsersHorizontalList> createState() => _OnlineUsersHorizontalListState();
}

class _OnlineUsersHorizontalListState extends State<OnlineUsersHorizontalList> {
  List<User> users = [];
  bool isLoading = false;
  bool hasMore = true;
  int page = 1;

  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _fetchMore();
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200 &&
          !isLoading &&
          hasMore) {
        _fetchMore();
      }
    });
  }

  Future<void> _fetchMore() async {
    setState(() => isLoading = true);

    final newUsers = await widget.fetchUsers(page);
    setState(() {
      final existingIds = users.map((e) => e.id).whereType<String>().toSet();
      final uniqueNewUsers = newUsers.where((u) {
        final id = u.id;
        if (id == null) return false;
        if (existingIds.contains(id)) return false;
        existingIds.add(id);
        return true;
      }).toList();

      users.addAll(uniqueNewUsers);
      isLoading = false;
      page++;

      if (newUsers.length < 10) hasMore = false;
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Widget _buildUserCard(User user) {
    return GestureDetector(
      onTap: () {
        Get.to(ProfileScreen(userId: user.id!));
      },
      child: Container(
        margin: const EdgeInsets.only(right: 12),
        child: Column(
          children: [
            Stack(
              children: [
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.green.withOpacity(0.3), width: 2),
                  ),
                  child: ClipSmoothRect(
                    radius: const SmoothBorderRadius.all(
                      SmoothRadius(cornerRadius: 14, cornerSmoothing: cornerSmoothing),
                    ),
                    child: MyCachedProfileImageOnline(
                      imageUrl: user.profile,
                      fullName: user.fullName,
                      width: 64,
                      height: 64,
                    ),
                  ),
                ),
                // Online indicator
                Positioned(
                  bottom: 2,
                  right: 2,
                  child: Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      color: user!.isOnline == true ? Colors.green : Colors.yellow,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 3),
                    ),
                    child: Icon(Icons.circle, color: user!.isOnline == true ? Colors.green : Colors.yellow, size: 8),
                  ),
                ),
                // // Quick action
                // Positioned(
                //   top: 2,
                //   right: 2,
                //   child: Container(
                //     width: 24,
                //     height: 24,
                //     decoration: BoxDecoration(
                //       color: Colors.pink[400],
                //       shape: BoxShape.circle,
                //     ),
                //     child: const Icon(Icons.chat, color: Colors.white, size: 12),
                //   ),
                // ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: 70,
              child: Text(
                _getShortName(user.fullName) ?? "",
                style: MyTextStyle.gilroyBold(color: Colors.grey[700], size: 12),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getShortName(String? fullName) {
    if (fullName == null || fullName.trim().isEmpty) return '';
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.length == 1) {
      return parts[0][0].toUpperCase() + parts[0].substring(1).toLowerCase();
    }
    return '${parts[0][0].toUpperCase()}${parts[0].substring(1).toLowerCase()}';
  }

  Widget _buildLoader() {
    return Container(
      width: 64,
      height: 64,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Center(
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 100,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: ListView.builder(
        controller: _scrollController,
        scrollDirection: Axis.horizontal,
        itemCount: users.length + (hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index < users.length) {
            return _buildUserCard(users[index]);
          } else {
            return _buildLoader();
          }
        },
      ),
    );
  }
}
