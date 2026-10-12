// import 'package:cached_network_image/cached_network_image.dart';
// import 'package:flutter/material.dart';
// import 'package:get/get.dart';
// import 'package:timeago/timeago.dart' as timeago;
// import 'package:banjaramatch/models/registration.dart';
// import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
// import 'package:banjaramatch/screens/users_list_controller.dart';
// import 'package:banjaramatch/utilities/const.dart';
//
// import '../common/extensions/font_extension.dart';
// import '../common/extensions/image_extension.dart';
// import 'member_card.dart';
//
// class BigUserCardItem extends StatelessWidget {
//   final User profile;
//
//   final UsersListController controller;
//
//   const BigUserCardItem({super.key, required this.profile, required this.controller});
//
//   @override
//   Widget build(BuildContext context) {
//     print('alkdjsalkjsdalsdjl;asd../.');
//
//     return GestureDetector(
//       onTap: () {
//         Get.to(ProfileScreen(userId: profile.id!));
//       },
//       child: Container(
//         height: MediaQuery.of(context).size.height * 0.65, // Full height profile card
//         margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
//         child: Stack(
//           children: [
//             /// Background image
//             SizedBox(
//               height: double.infinity,
//               child: ClipRRect(
//                 borderRadius: const BorderRadius.all(Radius.circular(16.0)),
//                 child: CachedNetworkImage(
//                   imageUrl: profile.profile?.addBaseURL() ?? "",
//                   fit: BoxFit.cover,
//                   width: double.infinity,
//                   placeholder: (context, url) => Image.asset(
//                     MyImages.placeHolderImage,
//                     fit: BoxFit.cover,
//                     width: double.infinity,
//                   ),
//                   errorWidget: (context, url, error) => Image.asset(
//                     MyImages.placeHolderImage,
//                     fit: BoxFit.cover,
//                     width: double.infinity,
//                   ),
//                 ),
//               ),
//             ),
//
//             /// Transparent black shade
//             blackShadeOverImage(),
//
//             /// 🔼 Top indicators moved here
//             _buildTopIndicators(profile, context),
//
//             /// Profile info overlay at bottom
//             Positioned(
//               bottom: 0,
//               right: 0,
//               left: 0,
//               child: Padding(
//                 padding: const EdgeInsets.all(16.0),
//                 child: SizedBox(
//                   width: MediaQuery.of(context).size.width,
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       buildNameRow(profile, context),
//                       buildHeightLocationCaste(profile, context),
//                       const SizedBox(height: 20),
//                       _buildActionButtons(profile, controller, context),
//                     ],
//                   ),
//                 ),
//               ),
//             ),
//           ],
//         ),
//       ),
//     );
//   }
//
//   Widget buildHeightLocationCaste(User profile, BuildContext context) {
//     return Row(
//       mainAxisAlignment: MainAxisAlignment.spaceBetween,
//       children: [
//         Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             Row(
//               children: [
//                 // const ImageIcon(
//                 //   AssetImage('assets/icon/icon_person.png'),
//                 //   size: 12,
//                 //   color: Colors.white,
//                 // ),
//                 // SizedBox(
//                 //   width: 5,
//                 // ),
//                 // age and height row
//                 Text(
//                   '${calculateAge(profile.dob).toString()} yrs ${profile.height}',
//                   style: MyTextStyle.gilroySemiBold(size: 12, color: cWhite),
//                 ),
//                 SizedBox(
//                   width: 6,
//                 ),
//                 Text(
//                   '${profile.profession?.name ?? "No Profession"}',
//                   style: MyTextStyle.gilroySemiBold(size: 12, color: cWhite),
//                 ),
//               ],
//             ),
//             Row(
//               children: [
//                 Text(
//                   '${profile.caste?.name ?? "No Caste"}',
//                   style: MyTextStyle.gilroySemiBold(size: 12, color: cWhite),
//                 ),
//                 SizedBox(
//                   width: 6,
//                 ),
//                 Text(
//                   '${profile.location?.city?.name ?? "No City"}',
//                   style: MyTextStyle.gilroySemiBold(size: 12, color: cWhite),
//                 ),
//               ],
//             ),
//           ],
//         ),
//       ],
//     );
//   }
//
//   Widget buildMemberIdRow(BuildContext context, User profile) {
//     return Row(
//       children: [
//         Text(
//           'id',
//           style: const TextStyle(color: Colors.white),
//         ),
//         Text(
//           profile.code!,
//           style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
//         )
//       ],
//     );
//   }
//
//   Widget buildNameRow(User profile, BuildContext context) {
//     return Row(
//       mainAxisAlignment: MainAxisAlignment.spaceBetween,
//       children: [
//         Row(
//           children: [
//             profile.fullName == ''
//                 ? const Text('')
//                 : Text(
//                     '${profile.fullName}',
//                     style: MyTextStyle.gilroyExtraBold(size: 20, color: cWhite),
//                   ),
//             SizedBox(
//               width: 7,
//             ),
//             profile.membershipPlan != null
//                 ? ImageIcon(
//                     const AssetImage('assets/icon/icon_premium.png'),
//                     size: 14,
//                     color: Colors.amber,
//                   )
//                 : const SizedBox(),
//             OnlineStatusWidget(
//               isOnline: profile.isOnline == true,
//               lastSeen: profile.lastSeen != null ? DateTime.parse(profile.lastSeen!) : null,
//             ),
//           ],
//         ),
//       ],
//     );
//   }
//
//   Widget blackShadeOverImage() {
//     return Positioned(
//       bottom: 0,
//       left: 0,
//       right: 0,
//       top: 0,
//       child: Container(
//         decoration: const BoxDecoration(
//           borderRadius: BorderRadius.all(Radius.circular(16.0)),
//           gradient: LinearGradient(
//             begin: Alignment.topCenter,
//             end: Alignment.bottomCenter,
//             stops: [
//               0.4,
//               1,
//             ],
//             colors: [
//               Colors.transparent,
//               Colors.black,
//             ],
//           ),
//         ),
//       ),
//     );
//   }
//
//   Widget _buildActionButtons(User profile, UsersListController controller, BuildContext context) {
//     return Row(
//       mainAxisAlignment: MainAxisAlignment.spaceEvenly,
//       children: [
//         _buildActionButton(
//           onTap: () => _handleInterestAction(profile, controller),
//           icon: _getInterestIcon(profile),
//           color: _getInterestColor(profile),
//           isActive: _isInterestActive(profile),
//           label: _getInterestLabel(profile), // 👈 dynamic label
//         ),
//         _buildActionButton(
//           onTap: () => controller.shortList(profile),
//           icon: Icons.bookmark_outline,
//           color: profile.isShortListed == true ? const Color(0xFFFFB800) : Colors.white.withOpacity(0.8),
//           isActive: profile.isShortListed == true,
//           label: profile.isShortListed == true ? "Shortlisted" : "Shortlist",
//         ),
//         _buildActionButton(
//           onTap: () => print("Chat action triggered."),
//           icon: Icons.chat_bubble_outline,
//           color: Colors.white.withOpacity(0.8),
//           isActive: false,
//           label: "Chat",
//         ),
//       ],
//     );
//   }
//
//   Widget _buildActionButton({
//     required VoidCallback onTap,
//     required IconData icon,
//     required Color color,
//     required bool isActive,
//     required String label,
//   }) {
//     return GestureDetector(
//       onTap: onTap,
//       child: Column(
//         children: [
//           Container(
//             padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
//             decoration: BoxDecoration(
//               color: isActive ? color.withOpacity(0.2) : Colors.white.withOpacity(0.15),
//               borderRadius: BorderRadius.circular(12),
//               border: Border.all(
//                 color: isActive ? color : Colors.white.withOpacity(0.3),
//                 width: 1,
//               ),
//             ),
//             child: Icon(
//               icon,
//               color: color,
//               size: 22,
//             ),
//           ),
//           const SizedBox(height: 4),
//           Text(
//             label,
//             style: TextStyle(
//               fontSize: 12,
//               color: isActive ? color : Colors.white,
//               fontWeight: FontWeight.w500,
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   Widget _buildMoreOptions(User profile, BuildContext context) {
//     return Container(
//       decoration: BoxDecoration(
//         color: Colors.black.withOpacity(0.3),
//         borderRadius: BorderRadius.circular(12),
//       ),
//       child: PopupMenuButton<String>(
//         icon: const Icon(Icons.more_vert, color: Colors.white),
//         color: Colors.white,
//         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
//         onSelected: (value) {
//           switch (value) {
//             case 'report':
//               _showReportDialog(context, profile);
//               break;
//             case 'block':
//               _showBlockDialog(context, profile);
//               break;
//             case 'share':
//               _shareProfile(profile);
//               break;
//           }
//         },
//         itemBuilder: (context) => [
//           const PopupMenuItem(
//             value: 'report',
//             child: Row(
//               children: [
//                 Icon(Icons.report_outlined, color: Colors.red),
//                 SizedBox(width: 12),
//                 Text('Report Profile'),
//               ],
//             ),
//           ),
//           const PopupMenuItem(
//             value: 'block',
//             child: Row(
//               children: [
//                 Icon(Icons.block_outlined, color: Colors.orange),
//                 SizedBox(width: 12),
//                 Text('Block User'),
//               ],
//             ),
//           ),
//           const PopupMenuItem(
//             value: 'share',
//             child: Row(
//               children: [
//                 Icon(Icons.share_outlined, color: Colors.blue),
//                 SizedBox(width: 12),
//                 Text('Share Profile'),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   void _showReportDialog(BuildContext context, User profile) {
//     showDialog(
//       context: context,
//       builder: (context) => AlertDialog(
//         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
//         title: const Text('Report Profile'),
//         content: const Text('Are you sure you want to report this profile for inappropriate content?'),
//         actions: [
//           TextButton(
//             onPressed: () => Navigator.pop(context),
//             child: const Text('Cancel'),
//           ),
//           ElevatedButton(
//             onPressed: () {
//               Navigator.pop(context);
//               _showActionFeedback('Profile reported', const Color(0xFFEF4444));
//             },
//             style: ElevatedButton.styleFrom(
//               backgroundColor: const Color(0xFFEF4444),
//               foregroundColor: Colors.white,
//             ),
//             child: const Text('Report'),
//           ),
//         ],
//       ),
//     );
//   }
//
//   void _showBlockDialog(BuildContext context, User profile) {
//     showDialog(
//       context: context,
//       builder: (context) => AlertDialog(
//         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
//         title: const Text('Block User'),
//         content: const Text('Are you sure you want to block this user? You won\'t see their profile again.'),
//         actions: [
//           TextButton(
//             onPressed: () => Navigator.pop(context),
//             child: const Text('Cancel'),
//           ),
//           ElevatedButton(
//             onPressed: () {
//               Navigator.pop(context);
//               _showActionFeedback('User blocked', const Color(0xFFFF6B6B));
//               _nextProfile();
//             },
//             style: ElevatedButton.styleFrom(
//               backgroundColor: const Color(0xFFFF6B6B),
//               foregroundColor: Colors.white,
//             ),
//             child: const Text('Block'),
//           ),
//         ],
//       ),
//     );
//   }
//
//   void _shareProfile(User profile) {
//     // Implement share functionality
//     _showActionFeedback('Profile shared!', const Color(0xFF3B82F6));
//   }
//
//   void _nextProfile() {
//     // if (_currentIndex < Get.find<UsersListController>().usersList.length - 1) {
//     //   _pageController.nextPage(
//     //     duration: const Duration(milliseconds: 300),
//     //     curve: Curves.easeInOut,
//     //   );
//     // }
//   }
//
//   Widget _buildTopIndicators(User profile, BuildContext contetx) {
//     return Positioned(
//       top: 0 + 10,
//       left: 20,
//       right: 20,
//       child: Row(
//         mainAxisAlignment: MainAxisAlignment.spaceBetween,
//         children: [
//           // Online Status
//           //  if (profile.isOnline == true) _buildOnlineIndicator(),
//
//           const Spacer(),
//
//           // Premium Badge
//           if (profile.membershipPlan != null) _buildPremiumBadge(),
//
//           // More Options
//           _buildMoreOptions(profile, contetx),
//         ],
//       ),
//     );
//   }
//
//   Widget _buildOnlineIndicator() {
//     return Container(
//       padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
//       decoration: BoxDecoration(
//         color: const Color(0xFF10B981),
//         borderRadius: BorderRadius.circular(20),
//         boxShadow: [
//           BoxShadow(
//             color: const Color(0xFF10B981).withOpacity(0.4),
//             blurRadius: 12,
//             offset: const Offset(0, 4),
//           ),
//         ],
//       ),
//       child: Row(
//         mainAxisSize: MainAxisSize.min,
//         children: [
//           Container(
//             width: 8,
//             height: 8,
//             decoration: const BoxDecoration(
//               color: Colors.white,
//               shape: BoxShape.circle,
//             ),
//           ),
//           const SizedBox(width: 6),
//           const Text(
//             'Active now',
//             style: TextStyle(
//               color: Colors.white,
//               fontSize: 10,
//               fontWeight: FontWeight.w600,
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   Widget _buildPremiumBadge() {
//     return Container(
//       padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
//       decoration: BoxDecoration(
//         gradient: const LinearGradient(
//           colors: [Color(0xFFFFD700), Color(0xFFFFB800)],
//         ),
//         borderRadius: BorderRadius.circular(20),
//         boxShadow: [
//           BoxShadow(
//             color: const Color(0xFFFFD700).withOpacity(0.4),
//             blurRadius: 12,
//             offset: const Offset(0, 4),
//           ),
//         ],
//       ),
//       child: Row(
//         mainAxisSize: MainAxisSize.min,
//         children: [
//           const Icon(
//             Icons.star,
//             color: Colors.white,
//             size: 14,
//           ),
//           const SizedBox(width: 4),
//           const Text(
//             'Premium',
//             style: TextStyle(
//               color: Colors.white,
//               fontSize: 12,
//               fontWeight: FontWeight.w700,
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   void _showActionFeedback(String message, Color color) {
//     Get.snackbar(
//       '',
//       message,
//       backgroundColor: color,
//       colorText: Colors.white,
//       duration: const Duration(seconds: 2),
//       margin: const EdgeInsets.all(16),
//       borderRadius: 12,
//       snackPosition: SnackPosition.TOP,
//     );
//   }
//
//   /// 👉 dynamic label for the interest button
//   String _getInterestLabel(User profile) {
//     if (profile.isFriend == true) return "Connected";
//     if (profile.isRejectedByOtherUser == true || profile.isRejected == true) return "Rejected";
//     if (profile.isRequestReceived == true) return "Accept";
//     if (profile.isRequestSent == true) return "Pending";
//     return "Interest";
//   }
//
//   void _handleInterestAction(User profile, UsersListController controller) {
//     if (profile.isFriend == true) {
//       controller.unFriendUser(profile);
//     } else if (profile.isRejectedByOtherUser == true) {
//       // No action for rejected by other user
//       return;
//     } else if (profile.isRejected == true) {
//       // Optionally implement undo reject
//       return;
//     } else if (profile.isCanceled == true) {
//       controller.sendInterest(profile);
//     } else if (profile.isRequestReceived == true) {
//       controller.acceptFriendRequest(profile);
//     } else if (profile.isRequestSent == true) {
//       controller.cancelInterest(profile);
//     } else {
//       controller.sendInterest(profile);
//     }
//   }
//
//   IconData _getInterestIcon(User profile) {
//     if (profile.isFriend == true) return Icons.check_circle;
//     if (profile.isRejectedByOtherUser == true || profile.isRejected == true) return Icons.block;
//     if (profile.isRequestReceived == true) return Icons.thumb_up_outlined;
//     if (profile.isRequestSent == true) return Icons.hourglass_empty;
//     return Icons.favorite_outline;
//   }
//
//   Color _getInterestColor(User profile) {
//     if (profile.isFriend == true) return const Color(0xFF10B981);
//     if (profile.isRejectedByOtherUser == true || profile.isRejected == true) {
//       return Colors.red.withOpacity(0.8);
//     }
//     if (profile.isRequestReceived == true) return const Color(0xFF3B82F6);
//     if (profile.isRequestSent == true) return const Color(0xFFFFB800);
//     return const Color(0xFFEC4899);
//   }
//
//   bool _isInterestActive(User profile) {
//     return profile.isFriend == true || profile.isRequestReceived == true || profile.isRequestSent == true;
//   }
// }
//
// class OnlineStatusWidget extends StatelessWidget {
//   final bool isOnline;
//   final DateTime? lastSeen;
//
//   const OnlineStatusWidget({
//     super.key,
//     required this.isOnline,
//     this.lastSeen,
//   });
//
//   @override
//   Widget build(BuildContext context) {
//     final label = isOnline
//         ? const Text(
//             "Active now",
//             style: TextStyle(
//               fontSize: 12,
//               fontWeight: FontWeight.w600,
//               color: Color(0xFF10B981), // Green shade
//               fontFamily: 'Nunito',
//             ),
//           )
//         : Text(
//             lastSeen != null ? 'Last seen ${timeago.format(lastSeen!)}' : 'Offline',
//             style: TextStyle(
//               fontSize: 12,
//               fontWeight: FontWeight.w500,
//               color: Colors.grey.shade600,
//               fontFamily: 'Nunito',
//             ),
//           );
//
//     return Row(
//       mainAxisSize: MainAxisSize.min,
//       children: [
//         _buildStatusDot(isOnline),
//         const SizedBox(width: 6),
//         label,
//       ],
//     );
//   }
//
//   Widget _buildStatusDot(bool isOnline) {
//     return Container(
//       height: 10,
//       width: 10,
//       decoration: BoxDecoration(
//         shape: BoxShape.circle,
//         gradient: isOnline
//             ? const LinearGradient(
//                 colors: [Color(0xFF34D399), Color(0xFF059669)],
//                 begin: Alignment.topLeft,
//                 end: Alignment.bottomRight,
//               )
//             : null,
//         color: isOnline ? null : Colors.grey.shade400,
//         border: Border.all(
//           color: Colors.white,
//           width: 1.2,
//         ),
//         boxShadow: isOnline
//             ? [
//                 BoxShadow(
//                   color: Colors.green.withOpacity(0.3),
//                   blurRadius: 6,
//                   offset: const Offset(0, 1),
//                 ),
//               ]
//             : [],
//       ),
//     );
//   }
// }
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/personal_info_controller.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/users_list_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../common/extensions/font_extension.dart';
import 'member_card.dart';

class BigUserCardItem extends StatelessWidget {
  final User profile;

  final UsersListController controller;

  const BigUserCardItem({super.key, required this.profile, required this.controller});

  @override
  Widget build(BuildContext context) {
    print('alkdjsalkjsdalsdjl;asd../.');

    return GestureDetector(
      onTap: () {
        Get.to(ProfileScreen(userId: profile.id!));
      },
      child: Container(
        height: MediaQuery.of(context).size.height * 0.65, // Full height profile card
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        child: Stack(
          children: [
            /// Background image
            _buildPhotoSection(),

            /// Transparent black shade
            blackShadeOverImage(),

            /// 🔼 Top indicators moved here
            _buildTopIndicators(profile, context),

            /// Profile info overlay at bottom
            Positioned(
              bottom: 0,
              right: 0,
              left: 0,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: SizedBox(
                  width: MediaQuery.of(context).size.width,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      buildNameRow(profile, context),
                      buildHeightLocationCaste(profile, context),
                      _buildFloatingActionButtons(controller, context, profile)
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFloatingActionButtons(UsersListController controller, BuildContext context, User user) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(30),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildActionButton(
                  onTap: () => _handleInterestAction(user, controller),
                  icon: _getInterestIcon(user),
                  label: _getInterestLabel(user),
                  color: _getInterestColor(user),
                  isActive: _isInterestActive(user),
                ),
                _buildActionButton(
                  onTap: () => _handleShortlistAction(user, controller),
                  icon: Icons.bookmark_outline,
                  label: user?.isShortListed == true ? "Saved" : "Save",
                  color: Colors.amber,
                  isActive: user?.isShortListed == true,
                ),
                _buildActionButton(
                  onTap: () => _handleChatAction(user, controller),
                  icon: Icons.chat_bubble_outline,
                  label: "Chat",
                  color: Colors.blue,
                  isActive: false,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _handleShortlistAction(User profile, UsersListController controller) {
    controller.shortList(profile);

    // Implement shortlist logic
    // _showActionFeedback("Added to shortlist", Colors.amber);
  }

  void _handleChatAction(User profile, UsersListController controller) {
    // Navigate to chat
    _showActionFeedback("Free Chat Coming Soon", Colors.blue);
  }

  Widget _buildActionButton({
    required VoidCallback onTap,
    required IconData icon,
    required String label,
    required Color color,
    required bool isActive,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          color: isActive ? color.withOpacity(0.2) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive ? color.withOpacity(0.5) : Colors.transparent,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isActive ? color.withOpacity(0.3) : Colors.white.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: isActive ? color : Colors.white70, size: 22),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: MyTextStyle.gilroyMedium(
                color: isActive ? color : Colors.white70,
                size: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget buildHeightLocationCaste(User profile, BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // First row: Height, Location, and Caste
          Row(
            children: [
              // Height with proper icon
              Icon(
                Icons.straighten,
                size: 16,
                color: Colors.lightBlue.shade300,
              ),
              const SizedBox(width: 6),
              Text(
                '${HeightConverter().cmToImperialString(profile.height) ?? "No Height"}',
                style: MyTextStyle.gilroySemiBold(size: 14, color: cWhite),
              ),
              const SizedBox(width: 8),

              // Location with proper icon
              Icon(
                Icons.location_city,
                size: 16,
                color: Colors.orange.shade300,
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  '${profile.location?.city?.name ?? "No Location"}',
                  style: MyTextStyle.gilroySemiBold(size: 14, color: cWhite),
                  overflow: TextOverflow.ellipsis,
                ),
              ),

              const SizedBox(width: 8),

              // Caste/Community with proper icon
              Icon(
                Icons.people_outline,
                size: 16,
                color: Colors.purple.shade300,
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  '${profile.caste?.name ?? "No Caste"}',
                  style: MyTextStyle.gilroySemiBold(size: 14, color: cWhite),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Second row: Profession and Income (only if profession exists)
          if (profile.profession?.name != null)
            Row(
              children: [
                // Profession with proper icon
                Icon(
                  Icons.work_outline_rounded,
                  size: 15,
                  color: Colors.teal.shade300,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    '${profile.profession!.name}',
                    style: MyTextStyle.gilroySemiBold(size: 12, color: cWhite),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),

                // Show income only if profession exists
                if (profile.incomeRange?.name != null) ...[
                  const SizedBox(width: 8),

                  // Income with proper icon
                  Icon(
                    Icons.currency_rupee,
                    size: 15,
                    color: Colors.green.shade400,
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      'Earns ${profile.incomeRange!.name}',
                      style: MyTextStyle.gilroySemiBold(size: 12, color: cWhite),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),

          // Add spacing only if profession row was shown
          if (profile.profession?.name != null) const SizedBox(height: 8),

          // Third row: Education (only if education exists)
          if (profile.qualification?.name != null)
            Row(
              children: [
                // Education with proper icon
                Icon(
                  Icons.school_outlined,
                  size: 15,
                  color: Colors.indigo.shade300,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '${profile.qualification!.name}',
                    style: MyTextStyle.gilroySemiBold(size: 12, color: cWhite),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget buildMemberIdRow(BuildContext context, User profile) {
    return Row(
      children: [
        Text(
          'id',
          style: const TextStyle(color: Colors.white),
        ),
        Text(
          profile.code!,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        )
      ],
    );
  }

  Widget buildNameRow(User profile, BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Row(
            children: [
              Expanded(
                child: Text(
                  profile.fullName == ''
                      ? '${calculateAge(profile.dob)}'
                      : '${profile.fullName}, ${calculateAge(profile.dob)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: MyTextStyle.gilroyExtraBold(size: 20, color: cWhite),
                ),
              ),
              const SizedBox(width: 7),
              if (profile.membershipPlan != null)
                const ImageIcon(
                  AssetImage('assets/icon/icon_premium.png'),
                  size: 14,
                  color: Colors.amber,
                ),
              OnlineStatusWidget(
                isOnline: profile.isOnline == true,
                lastSeen: profile.lastSeen != null ? DateTime.parse(profile.lastSeen!) : null,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget blackShadeOverImage() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
      child: Container(
        decoration: const BoxDecoration(
          borderRadius: BorderRadius.all(Radius.circular(16.0)),
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            stops: [
              0.2,
              1,
            ],
            colors: [
              Colors.transparent,
              Colors.black,
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMoreOptions(User profile, BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: PopupMenuButton<String>(
        icon: const Icon(Icons.more_vert, color: Colors.white),
        color: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onSelected: (value) {
          switch (value) {
            case 'report':
              _showReportDialog(context, profile);
              break;
            case 'block':
              _showBlockDialog(context, profile);
              break;
            case 'share':
              _shareProfile(profile);
              break;
          }
        },
        itemBuilder: (context) => [
          const PopupMenuItem(
            value: 'report',
            child: Row(
              children: [
                Icon(Icons.report_outlined, color: Colors.red),
                SizedBox(width: 12),
                Text('Report Profile'),
              ],
            ),
          ),
          const PopupMenuItem(
            value: 'block',
            child: Row(
              children: [
                Icon(Icons.block_outlined, color: Colors.orange),
                SizedBox(width: 12),
                Text('Block User'),
              ],
            ),
          ),
          const PopupMenuItem(
            value: 'share',
            child: Row(
              children: [
                Icon(Icons.share_outlined, color: Colors.blue),
                SizedBox(width: 12),
                Text('Share Profile'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoSection() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.all(Radius.circular(30)),
      ),
      child: Stack(
        children: [
          // Main Photo
          ClipRRect(
            borderRadius: const BorderRadius.all(Radius.circular(30)),
            child: CachedNetworkImage(
              imageUrl: profile.profile?.addBaseURL() ?? "",
              width: double.infinity,
              height: double.infinity,
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      const Color(0xFFF8F9FA),
                      Colors.grey.shade100,
                    ],
                  ),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.grey.withOpacity(0.1),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.person_outline,
                          size: 50,
                          color: Colors.grey.shade400,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Loading photo...',
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              errorWidget: (context, url, error) => Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.grey.shade200,
                      Colors.grey.shade300,
                    ],
                  ),
                ),
                child: Center(
                  child: Icon(
                    Icons.person,
                    size: 80,
                    color: Colors.grey.shade600,
                  ),
                ),
              ),
            ),
          ),

          // Top Status Row
          Positioned(
            top: 20,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Online Status
                // if (profile.isOnline == true)
                //   Container(
                //     padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                //     decoration: BoxDecoration(
                //       color: const Color(0xFF4CAF50),
                //       borderRadius: BorderRadius.circular(25),
                //       boxShadow: [
                //         BoxShadow(
                //           color: const Color(0xFF4CAF50).withOpacity(0.3),
                //           blurRadius: 12,
                //           offset: const Offset(0, 4),
                //         ),
                //       ],
                //     ),
                //     child: Row(
                //       mainAxisSize: MainAxisSize.min,
                //       children: [
                //         Container(
                //           width: 8,
                //           height: 8,
                //           decoration: const BoxDecoration(
                //             color: Colors.white,
                //             shape: BoxShape.circle,
                //           ),
                //         ),
                //         const SizedBox(width: 6),
                //         const Text(
                //           'Online',
                //           style: TextStyle(
                //             color: Colors.white,
                //             fontSize: 12,
                //             fontWeight: FontWeight.w600,
                //           ),
                //         ),
                //       ],
                //     ),
                //   )
                // else
                //   Container(
                //     padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                //     decoration: BoxDecoration(
                //       color: Colors.black.withOpacity(0.6),
                //       borderRadius: BorderRadius.circular(25),
                //     ),
                //     child: Text(
                //       profile.lastSeen != null
                //           ? 'Active ${timeago.format(DateTime.parse(profile.lastSeen!))}'
                //           : 'Offline',
                //       style: const TextStyle(
                //         color: Colors.white,
                //         fontSize: 11,
                //         fontWeight: FontWeight.w500,
                //       ),
                //     ),
                //   ),
                Spacer(),
                // Premium Badge & Menu
                Row(
                  children: [
                    if (profile.membershipPlan != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFFD700), Color(0xFFFFA000)],
                          ),
                          borderRadius: BorderRadius.circular(25),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFFFD700).withOpacity(0.4),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.diamond,
                              color: Colors.white,
                              size: 14,
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'Premium',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (profile.membershipPlan != null) const SizedBox(width: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(25),
                      ),
                      child: PopupMenuButton<String>(
                        icon: const Icon(
                          Icons.more_horiz,
                          color: Colors.white,
                          size: 22,
                        ),
                        color: Colors.white,
                        elevation: 8,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(15),
                        ),
                        onSelected: (asd) {},
                        itemBuilder: (context) => [
                          PopupMenuItem(
                            value: 'report',
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFEBEE),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.report_outlined,
                                    color: Color(0xFFE53E3E),
                                    size: 16,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Text(
                                  'Report Profile',
                                  style: TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'block',
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF3E0),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.block_outlined,
                                    color: Color(0xFFFF9800),
                                    size: 16,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Text(
                                  'Block User',
                                  style: TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'share',
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE3F2FD),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.share_outlined,
                                    color: Color(0xFF2196F3),
                                    size: 16,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Text(
                                  'Share Profile',
                                  style: TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showReportDialog(BuildContext context, User profile) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Report Profile'),
        content: const Text('Are you sure you want to report this profile for inappropriate content?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showActionFeedback('Profile reported', const Color(0xFFEF4444));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
            ),
            child: const Text('Report'),
          ),
        ],
      ),
    );
  }

  void _showBlockDialog(BuildContext context, User profile) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Block User'),
        content: const Text('Are you sure you want to block this user? You won\'t see their profile again.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showActionFeedback('User blocked', const Color(0xFFFF6B6B));
              _nextProfile();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFF6B6B),
              foregroundColor: Colors.white,
            ),
            child: const Text('Block'),
          ),
        ],
      ),
    );
  }

  void _shareProfile(User profile) {
    // Implement share functionality
    _showActionFeedback('Profile shared!', const Color(0xFF3B82F6));
  }

  void _nextProfile() {
    // if (_currentIndex < Get.find<UsersListController>().usersList.length - 1) {
    //   _pageController.nextPage(
    //     duration: const Duration(milliseconds: 300),
    //     curve: Curves.easeInOut,
    //   );
    // }
  }

  Widget _buildTopIndicators(User profile, BuildContext contetx) {
    return Positioned(
      top: 0 + 10,
      left: 20,
      right: 20,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Online Status
          //  if (profile.isOnline == true) _buildOnlineIndicator(),

          const Spacer(),

          // Premium Badge
          if (profile.membershipPlan != null) _buildPremiumBadge(),

          // More Options
          _buildMoreOptions(profile, contetx),
        ],
      ),
    );
  }

  Widget _buildOnlineIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withOpacity(0.4),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          const Text(
            'Active now',
            style: TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPremiumBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFD700), Color(0xFFFFB800)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFFD700).withOpacity(0.4),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.star,
            color: Colors.white,
            size: 14,
          ),
          const SizedBox(width: 4),
          const Text(
            'Premium',
            style: TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  void _showActionFeedback(String message, Color color) {
    Get.snackbar(
      '',
      message,
      backgroundColor: color,
      colorText: Colors.white,
      duration: const Duration(seconds: 2),
      margin: const EdgeInsets.all(16),
      borderRadius: 12,
      snackPosition: SnackPosition.TOP,
    );
  }

  /// 👉 dynamic label for the interest button
  String _getInterestLabel(User profile) {
    if (profile.isFriend == true) return "Connected";
    if (profile.isRejectedByOtherUser == true || profile.isRejected == true) return "Rejected";
    if (profile.isRequestReceived == true) return "Accept";
    if (profile.isRequestSent == true) return "Pending";
    return "Interest";
  }

  void _handleInterestAction(User profile, UsersListController controller) {
    if (profile.isFriend == true) {
      controller.unFriendUser(profile);
    } else if (profile.isRejectedByOtherUser == true) {
      // No action for rejected by other user
      return;
    } else if (profile.isRejected == true) {
      // Optionally implement undo reject
      return;
    } else if (profile.isCanceled == true) {
      controller.sendInterest(profile);
    } else if (profile.isRequestReceived == true) {
      controller.acceptFriendRequest(profile);
    } else if (profile.isRequestSent == true) {
      controller.cancelInterest(profile);
    } else {
      controller.sendInterest(profile);
    }
  }

  IconData _getInterestIcon(User profile) {
    if (profile.isFriend == true) return Icons.check_circle;
    if (profile.isRejectedByOtherUser == true || profile.isRejected == true) return Icons.block;
    if (profile.isRequestReceived == true) return Icons.thumb_up_outlined;
    if (profile.isRequestSent == true) return Icons.hourglass_empty;
    return Icons.favorite_outline;
  }

  Color _getInterestColor(User profile) {
    if (profile.isFriend == true) return const Color(0xFF10B981);
    if (profile.isRejectedByOtherUser == true || profile.isRejected == true) {
      return Colors.red.withOpacity(0.8);
    }
    if (profile.isRequestReceived == true) return const Color(0xFF3B82F6);
    if (profile.isRequestSent == true) return const Color(0xFFFFB800);
    return const Color(0xFFEC4899);
  }

  bool _isInterestActive(User profile) {
    return profile.isFriend == true || profile.isRequestReceived == true || profile.isRequestSent == true;
  }
}

class OnlineStatusWidget extends StatelessWidget {
  final bool isOnline;
  final DateTime? lastSeen;

  const OnlineStatusWidget({
    super.key,
    required this.isOnline,
    this.lastSeen,
  });

  @override
  Widget build(BuildContext context) {
    final label = isOnline
        ? const Text(
            "Active now",
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF10B981), // Green shade
              fontFamily: 'Nunito',
            ),
          )
        : Text(
            lastSeen != null ? 'Last seen ${timeago.format(lastSeen!)}' : 'Offline',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.grey.shade600,
              fontFamily: 'Nunito',
            ),
          );

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildStatusDot(isOnline),
        const SizedBox(width: 6),
        label,
      ],
    );
  }

  Widget _buildStatusDot(bool isOnline) {
    return Container(
      height: 10,
      width: 10,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: isOnline
            ? const LinearGradient(
                colors: [Color(0xFF34D399), Color(0xFF059669)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        color: isOnline ? null : Colors.grey.shade400,
        border: Border.all(
          color: Colors.white,
          width: 1.2,
        ),
        boxShadow: isOnline
            ? [
                BoxShadow(
                  color: Colors.green.withOpacity(0.3),
                  blurRadius: 6,
                  offset: const Offset(0, 1),
                ),
              ]
            : [],
      ),
    );
  }
}

class ModernMatrimonyCard extends StatefulWidget {
  final User profile;
  final UsersListController controller;

  const ModernMatrimonyCard({super.key, required this.profile, required this.controller});

  @override
  State<ModernMatrimonyCard> createState() => _ModernMatrimonyCardState();
}

class _ModernMatrimonyCardState extends State<ModernMatrimonyCard> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic));

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animationController,
      builder: (context, child) {
        return FadeTransition(
          opacity: _fadeAnimation,
          child: SlideTransition(
            position: _slideAnimation,
            child: GestureDetector(
              onTap: () => Get.to(ProfileScreen(userId: widget.profile.id!)),
              child: Container(
                height: MediaQuery.of(context).size.height * 0.75,
                margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 30,
                      offset: const Offset(0, 15),
                      spreadRadius: 0,
                    ),
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 60,
                      offset: const Offset(0, 30),
                      spreadRadius: 0,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Photo Section - Takes 60% of card
                    Expanded(
                      flex: 6,
                      child: _buildPhotoSection(),
                    ),

                    // Info Section - Takes 40% of card
                    Expanded(
                      flex: 4,
                      child: _buildInfoSection(),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildPhotoSection() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(30),
          topRight: Radius.circular(30),
        ),
      ),
      child: Stack(
        children: [
          // Main Photo
          ClipRRect(
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(30),
              topRight: Radius.circular(30),
            ),
            child: CachedNetworkImage(
              imageUrl: widget.profile.profile?.addBaseURL() ?? "",
              width: double.infinity,
              height: double.infinity,
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      const Color(0xFFF8F9FA),
                      Colors.grey.shade100,
                    ],
                  ),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.grey.withOpacity(0.1),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.person_outline,
                          size: 50,
                          color: Colors.grey.shade400,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Loading photo...',
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              errorWidget: (context, url, error) => Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.grey.shade200,
                      Colors.grey.shade300,
                    ],
                  ),
                ),
                child: Center(
                  child: Icon(
                    Icons.person,
                    size: 80,
                    color: Colors.grey.shade600,
                  ),
                ),
              ),
            ),
          ),

          // Top Status Row
          Positioned(
            top: 20,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Online Status
                if (widget.profile.isOnline == true)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF4CAF50),
                      borderRadius: BorderRadius.circular(25),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF4CAF50).withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'Online',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(25),
                    ),
                    child: Text(
                      widget.profile.lastSeen != null
                          ? 'Active ${timeago.format(DateTime.parse(widget.profile.lastSeen!))}'
                          : 'Offline',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),

                // Premium Badge & Menu
                Row(
                  children: [
                    if (widget.profile.membershipPlan != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFFD700), Color(0xFFFFA000)],
                          ),
                          borderRadius: BorderRadius.circular(25),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFFFD700).withOpacity(0.4),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.diamond,
                              color: Colors.white,
                              size: 14,
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'Premium',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (widget.profile.membershipPlan != null) const SizedBox(width: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(25),
                      ),
                      child: PopupMenuButton<String>(
                        icon: const Icon(
                          Icons.more_horiz,
                          color: Colors.white,
                          size: 22,
                        ),
                        color: Colors.white,
                        elevation: 8,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(15),
                        ),
                        onSelected: _handleMenuAction,
                        itemBuilder: (context) => [
                          PopupMenuItem(
                            value: 'report',
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFEBEE),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.report_outlined,
                                    color: Color(0xFFE53E3E),
                                    size: 16,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Text(
                                  'Report Profile',
                                  style: TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'block',
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF3E0),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.block_outlined,
                                    color: Color(0xFFFF9800),
                                    size: 16,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Text(
                                  'Block User',
                                  style: TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'share',
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE3F2FD),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.share_outlined,
                                    color: Color(0xFF2196F3),
                                    size: 16,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Text(
                                  'Share Profile',
                                  style: TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Name & Age Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.profile.fullName ?? 'Unknown',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1A1A1A),
                        letterSpacing: -0.5,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0F9FF),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: const Color(0xFF0EA5E9),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            '${calculateAge(widget.profile.dob)} years old',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0EA5E9),
                            ),
                          ),
                        ),
                        if (widget.profile.height != null && widget.profile.height != 0) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: const Color(0xFF22C55E),
                                width: 1,
                              ),
                            ),
                            child: Text(
                              HeightConverter().cmToImperialString(widget.profile.height)!,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF22C55E),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Professional & Location Info
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (widget.profile.profession?.name != null) ...[
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.work_outline,
                              size: 14,
                              color: Color(0xFFD97706),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.profile.profession!.name!,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF374151),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (widget.profile.location?.city?.name != null) ...[
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEDE9FE),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.location_on,
                              size: 14,
                              color: Color(0xFF7C3AED),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.profile.location!.city!.name!,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF374151),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),

          const Spacer(),

          // Action Buttons
        ],
      ),
    );
  }

  void _handleMenuAction(String value) {
    switch (value) {
      case 'report':
        _showReportDialog();
        break;
      case 'block':
        _showBlockDialog();
        break;
      case 'share':
        _shareProfile();
        break;
    }
  }

  void _showReportDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFEBEE),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.report_outlined,
                color: Color(0xFFE53E3E),
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'Report Profile',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to report this profile for inappropriate content?',
          style: TextStyle(fontSize: 16, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showFeedback('Profile has been reported', const Color(0xFFE53E3E));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE53E3E),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: const Text(
              'Report',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  void _showBlockDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF3E0),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.block_outlined,
                color: Color(0xFFFF9800),
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'Block User',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to block this user? You won\'t see their profile again.',
          style: TextStyle(fontSize: 16, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showFeedback('User has been blocked', const Color(0xFFFF9800));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFF9800),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: const Text(
              'Block',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  void _shareProfile() {
    _showFeedback('Profile link copied to clipboard!', const Color(0xFF2196F3));
  }

  void _showFeedback(String message, Color color) {
    Get.snackbar(
      '',
      message,
      backgroundColor: color,
      colorText: Colors.white,
      duration: const Duration(seconds: 2),
      margin: const EdgeInsets.all(16),
      borderRadius: 15,
      snackPosition: SnackPosition.TOP,
      boxShadows: [
        BoxShadow(
          color: color.withOpacity(0.3),
          blurRadius: 15,
          offset: const Offset(0, 5),
        ),
      ],
    );
  }
}
