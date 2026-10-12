// import 'package:flutter/cupertino.dart';
// import 'package:get/get.dart';
// import 'package:banjaramatch/common/extensions/font_extension.dart';
// import 'package:banjaramatch/common/widgets/no_data_found.dart';
// import 'package:banjaramatch/models/model_interest_user_list.dart';
// import 'package:banjaramatch/screens/user_interests_controller.dart';
// import 'package:banjaramatch/utilities/const.dart';
//
// import 'interest_card.dart';
//
// class InterestUserScreen extends StatelessWidget {
//   const InterestUserScreen({Key? key}) : super(key: key);
//
//   @override
//   Widget build(BuildContext context) {
//     return GetBuilder<InterestUserScreenController>(
//       init: InterestUserScreenController(),
//       builder: (controller) {
//         return Column(
//           children: [
//             const SizedBox(height: 15),
//             segmentController(controller),
//             const SizedBox(height: 15),
//             Expanded(
//               child: PageView(
//                 controller: controller.pageController!,
//                 onPageChanged: controller.onChangePage,
//                 children: [
//                   userList(controller, false), // Interest Sent
//                   userList(controller, true), // Interest Received
//                 ],
//               ),
//             ),
//           ],
//         );
//       },
//     );
//   }
//
//   Widget userList(InterestUserScreenController controller, bool isSent) {
//     List<UserInterest> users = isSent ? controller.sentList : controller.receivedList;
//
//     print(users.length);
//
//     return users.isEmpty
//         ? NoDataFound(
//             controller: controller,
//           )
//         : ListView.builder(
//             itemCount: users.length,
//             padding: const EdgeInsets.only(top: 0),
//             itemBuilder: (context, index) {
//               return InterestCard(
//                 userInterest: users[index],
//                 onReject: () {
//                   controller.declineInterest(users[index].user!.id!);
//                 },
//                 onCancel: () {
//                   controller.cencelInterest(users[index].user!.id!);
//                 },
//                 onAccept: () {
//                   controller.acceptInterest(users[index].user!.id!);
//                 },
//                 onSendRequest: () {
//                   controller.sendInterest(users[index].user!.id!);
//                 },
//                 onCall: () {},
//               );
//             },
//           );
//   }
//
//   Widget segmentController(InterestUserScreenController controller) {
//     return CupertinoSlidingSegmentedControl(
//       children: {
//         0: buildSegment("Received", 0, controller),
//         1: buildSegment("Sent", 1, controller),
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
//   Widget buildSegment(String text, int index, InterestUserScreenController controller) {
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

// import 'package:flutter/material.dart';
// import 'package:get/get.dart';
// import 'package:banjaramatch/common/extensions/font_extension.dart';
// import 'package:banjaramatch/models/model_interest_user_list.dart';
// import 'package:banjaramatch/screens/user_interests_controller.dart';
//
// import 'interest_card.dart';
//
// class InterestUserScreen extends StatelessWidget {
//   const InterestUserScreen({Key? key}) : super(key: key);
//
//   @override
//   Widget build(BuildContext context) {
//     return GetBuilder<InterestUserScreenController>(
//       init: InterestUserScreenController(),
//       builder: (controller) {
//         return Scaffold(
//           backgroundColor: const Color(0xFFFAFAFA),
//           body: Column(
//             children: [
//               const SizedBox(height: 20),
//
//               // Clean header
//               _buildSimpleHeader(),
//
//               const SizedBox(height: 24),
//
//               // Refined segment controller
//               _buildCleanSegmentController(controller),
//
//               const SizedBox(height: 32),
//
//               // Content area
//               Expanded(
//                 child: PageView(
//                   controller: controller.pageController!,
//                   onPageChanged: controller.onChangePage,
//                   children: [
//                     _buildUserList(controller, false), // Interest Received
//                     _buildUserList(controller, true), // Interest Sent
//                   ],
//                 ),
//               ),
//             ],
//           ),
//         );
//       },
//     );
//   }
//
//   Widget _buildSimpleHeader() {
//     return Padding(
//       padding: const EdgeInsets.symmetric(horizontal: 24),
//       child: Row(
//         children: [
//           Text(
//             "Interests",
//             style: MyTextStyle.gilroyBold(size: 28, color: const Color(0xFF2D3748)),
//           ),
//           const Spacer(),
//           Container(
//             padding: const EdgeInsets.all(8),
//             decoration: BoxDecoration(
//               color: Colors.white,
//               borderRadius: BorderRadius.circular(12),
//               boxShadow: [
//                 BoxShadow(
//                   color: Colors.black.withOpacity(0.04),
//                   blurRadius: 8,
//                   offset: const Offset(0, 2),
//                 ),
//               ],
//             ),
//             child: const Icon(
//               Icons.notifications_none_rounded,
//               color: Color(0xFF64748B),
//               size: 20,
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   Widget _buildCleanSegmentController(InterestUserScreenController controller) {
//     return Container(
//       margin: const EdgeInsets.symmetric(horizontal: 24),
//       padding: const EdgeInsets.all(6),
//       decoration: BoxDecoration(
//         color: Colors.white,
//         borderRadius: BorderRadius.circular(16),
//         boxShadow: [
//           BoxShadow(
//             color: Colors.black.withOpacity(0.06),
//             blurRadius: 12,
//             offset: const Offset(0, 4),
//           ),
//         ],
//       ),
//       child: Row(
//         children: [
//           Expanded(
//             child: _buildSegmentTab(
//               "Received",
//               0,
//               controller,
//               controller.receivedList.length,
//             ),
//           ),
//           Expanded(
//             child: _buildSegmentTab(
//               "Sent",
//               1,
//               controller,
//               controller.sentList.length,
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   Widget _buildSegmentTab(
//     String text,
//     int index,
//     InterestUserScreenController controller,
//     int count,
//   ) {
//     final bool isSelected = controller.selectedPage == index;
//
//     return GestureDetector(
//       onTap: () => controller.onChangeSegment(index),
//       child: AnimatedContainer(
//         duration: const Duration(milliseconds: 250),
//         curve: Curves.easeOutCubic,
//         padding: const EdgeInsets.symmetric(vertical: 14),
//         decoration: BoxDecoration(
//           color: isSelected ? const Color(0xFF6366F1) : Colors.transparent,
//           borderRadius: BorderRadius.circular(12),
//           boxShadow: isSelected
//               ? [
//                   BoxShadow(
//                     color: const Color(0xFF6366F1).withOpacity(0.25),
//                     blurRadius: 8,
//                     offset: const Offset(0, 2),
//                   ),
//                 ]
//               : null,
//         ),
//         child: Row(
//           mainAxisAlignment: MainAxisAlignment.center,
//           children: [
//             Text(
//               text,
//               style: MyTextStyle.gilroySemiBold(
//                 size: 15,
//                 color: isSelected ? Colors.white : const Color(0xFF64748B),
//               ),
//             ),
//             if (count > 0) ...[
//               const SizedBox(width: 8),
//               Container(
//                 padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
//                 decoration: BoxDecoration(
//                   color: isSelected ? Colors.white.withOpacity(0.2) : const Color(0xFFEF4444),
//                   borderRadius: BorderRadius.circular(12),
//                 ),
//                 child: Text(
//                   count.toString(),
//                   style: MyTextStyle.gilroySemiBold(
//                     size: 12,
//                     color: Colors.white,
//                   ),
//                 ),
//               ),
//             ],
//           ],
//         ),
//       ),
//     );
//   }
//
//   Widget _buildUserList(InterestUserScreenController controller, bool isSent) {
//     List<UserInterest> users = isSent ? controller.sentList : controller.receivedList;
//
//     if (users.isEmpty) {
//       return _buildEmptyState(isSent);
//     }
//
//     return ListView.builder(
//       itemCount: users.length,
//       padding: const EdgeInsets.symmetric(horizontal: 24),
//       physics: const BouncingScrollPhysics(),
//       itemBuilder: (context, index) {
//         return Padding(
//           padding: EdgeInsets.only(
//             bottom: index == users.length - 1 ? 24 : 16,
//           ),
//           child: InterestCard(
//             userInterest: users[index],
//             onReject: () {
//               controller.declineInterest(users[index].user!.id!);
//             },
//             onCancel: () {
//               controller.cencelInterest(users[index].user!.id!);
//             },
//             onAccept: () {
//               controller.acceptInterest(users[index].user!.id!);
//             },
//             onSendRequest: () {
//               controller.sendInterest(users[index].user!.id!);
//             },
//             onCall: () {},
//           ),
//         );
//       },
//     );
//   }
//
//   Widget _buildEmptyState(bool isSent) {
//     return Center(
//       child: Padding(
//         padding: const EdgeInsets.all(48),
//         child: Column(
//           mainAxisAlignment: MainAxisAlignment.center,
//           children: [
//             Container(
//               width: 80,
//               height: 80,
//               decoration: BoxDecoration(
//                 color: const Color(0xFFF1F5F9),
//                 borderRadius: BorderRadius.circular(24),
//               ),
//               child: Icon(
//                 isSent ? Icons.send_outlined : Icons.inbox_outlined,
//                 size: 36,
//                 color: const Color(0xFF94A3B8),
//               ),
//             ),
//             const SizedBox(height: 24),
//             Text(
//               isSent ? "No interests sent yet" : "No interests received",
//               style: MyTextStyle.gilroyBold(size: 20, color: const Color(0xFF2D3748)),
//             ),
//             const SizedBox(height: 8),
//             Text(
//               isSent ? "Start connecting with profiles that interest you" : "Your perfect match will find you soon",
//               style: MyTextStyle.gilroyMedium(
//                 size: 15,
//                 color: const Color(0xFF64748B),
//               ),
//               textAlign: TextAlign.center,
//             ),
//             if (isSent) ...[
//               const SizedBox(height: 32),
//               ElevatedButton(
//                 onPressed: () => Get.back(),
//                 style: ElevatedButton.styleFrom(
//                   backgroundColor: const Color(0xFF6366F1),
//                   foregroundColor: Colors.white,
//                   elevation: 0,
//                   padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
//                   shape: RoundedRectangleBorder(
//                     borderRadius: BorderRadius.circular(12),
//                   ),
//                 ),
//                 child: Text(
//                   "Explore Profiles",
//                   style: MyTextStyle.gilroySemiBold(size: 15, color: Colors.white),
//                 ),
//               ),
//             ],
//           ],
//         ),
//       ),
//     );
//   }
// }

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/models/model_interest_user_list.dart';
import 'package:banjaramatch/screens/user_interests_controller.dart';

import 'interest_card.dart';

class InterestUserScreen extends StatelessWidget {
  const InterestUserScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GetBuilder<InterestUserScreenController>(
      init: InterestUserScreenController(),
      builder: (controller) {
        return Scaffold(
          backgroundColor: const Color(0xFFFDF2F8), // Soft pink background
          body: Column(
            children: [
              const SizedBox(height: 16),

              // Informative header with soft design
              _buildInformativeHeader(),

              const SizedBox(height: 20),

              // Enhanced segment controller with counts
              _buildSoftSegmentController(controller),

              const SizedBox(height: 12),

              // Content area with soft container
              Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFEC4899).withOpacity(0.08),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: PageView(
                      controller: controller.pageController!,
                      onPageChanged: controller.onChangePage,
                      children: [
                        _buildUserList(controller, false), // Interest Received
                        _buildUserList(controller, true), // Interest Sent
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInformativeHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFFEC4899).withOpacity(0.1),
                      const Color(0xFFF97316).withOpacity(0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.favorite_rounded,
                  color: Color(0xFFEC4899),
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "My Interests",
                      style: MyTextStyle.gilroyBold(size: 26, color: const Color(0xFF1F2937)),
                    ),
                    Text(
                      "Manage your matrimony connections",
                      style: MyTextStyle.gilroyMedium(size: 14, color: const Color(0xFF6B7280)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSoftSegmentController(InterestUserScreenController controller) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFEC4899).withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildSoftSegmentTab(
              "Received",
              0,
              controller,
              Icons.inbox_rounded,
              controller.receivedList.length,
            ),
          ),
          Expanded(
            child: _buildSoftSegmentTab(
              "Sent",
              1,
              controller,
              Icons.send_rounded,
              controller.sentList.length,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSoftSegmentTab(
    String text,
    int index,
    InterestUserScreenController controller,
    IconData icon,
    int count,
  ) {
    final bool isSelected = controller.selectedPage == index;

    return GestureDetector(
      onTap: () => controller.onChangeSegment(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(
                  colors: [
                    const Color(0xFFEC4899),
                    const Color(0xFFF97316),
                  ],
                )
              : null,
          borderRadius: BorderRadius.circular(16),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFFEC4899).withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? Colors.white : const Color(0xFF9CA3AF),
            ),
            const SizedBox(width: 8),
            Text(
              text,
              style: MyTextStyle.gilroySemiBold(
                size: 15,
                color: isSelected ? Colors.white : const Color(0xFF6B7280),
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white.withOpacity(0.25) : const Color(0xFFEC4899).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  count.toString(),
                  style: MyTextStyle.gilroySemiBold(
                    size: 11,
                    color: isSelected ? Colors.white : const Color(0xFFEC4899),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String count, Color color) {
    return Column(
      children: [
        Text(
          count,
          style: MyTextStyle.gilroyBold(size: 20, color: color),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: MyTextStyle.gilroyMedium(
            size: 12,
            color: const Color(0xFF6B7280),
          ),
        ),
      ],
    );
  }

  Widget _buildUserList(InterestUserScreenController controller, bool isSent) {
    List<UserInterest> users = isSent ? controller.sentList : controller.receivedList;

    if (users.isEmpty) {
      return _buildSoftEmptyState(isSent);
    }

    return ListView.builder(
      itemCount: users.length,
      padding: const EdgeInsets.all(20),
      physics: const BouncingScrollPhysics(),
      itemBuilder: (context, index) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: index == users.length - 1 ? 0 : 14,
          ),
          child: InterestCard(
            userInterest: users[index],
            onReject: () {
              controller.declineInterest(users[index].user!.id!);
            },
            onCancel: () {
              controller.cencelInterest(users[index].user!.id!);
            },
            onAccept: () {
              controller.acceptInterest(users[index].user!.id!);
            },
            onSendRequest: () {
              controller.sendInterest(users[index].user!.id!);
            },
            onCall: () {},
          ),
        );
      },
    );
  }

  Widget _buildSoftEmptyState(bool isSent) {
    return Container(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFFEC4899).withOpacity(0.1),
                  const Color(0xFFF97316).withOpacity(0.1),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(
              isSent ? Icons.send_rounded : Icons.inbox_rounded,
              size: 36,
              color: const Color(0xFFEC4899).withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            isSent ? "No Interests Sent Yet" : "No New Interests",
            style: MyTextStyle.gilroyBold(size: 22, color: const Color(0xFF1F2937)),
          ),
          const SizedBox(height: 8),
          Text(
            isSent ? "Start connecting with profiles you find interesting" : "New matrimony interests will appear here",
            style: MyTextStyle.gilroyMedium(
              size: 15,
              color: const Color(0xFF6B7280),
            ),
            textAlign: TextAlign.center,
          ),
          if (isSent) ...[
            const SizedBox(height: 28),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFFEC4899),
                    const Color(0xFFF97316),
                  ],
                ),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFEC4899).withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton.icon(
                onPressed: () => Get.back(),
                icon: const Icon(Icons.search_rounded, size: 20),
                label: Text(
                  "Browse Profiles",
                  style: MyTextStyle.gilroySemiBold(size: 15, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
