// import 'package:figma_squircle/figma_squircle.dart';
// import 'package:flutter/material.dart';
// import 'package:banjaramatch/common/extensions/date_time_extension.dart';
// import 'package:banjaramatch/common/extensions/font_extension.dart';
// import 'package:banjaramatch/common/widgets/my_cached_image.dart';
// import 'package:banjaramatch/models/model_interest_user_list.dart';
// import 'package:banjaramatch/screens/extra_views/buttons.dart';
// import 'package:banjaramatch/screens/member_card.dart';
// import 'package:banjaramatch/utilities/const.dart';
//
// class InterestCard extends StatelessWidget {
//   final UserInterest userInterest;
//   final VoidCallback? onAccept;
//   final VoidCallback? onReject;
//   final VoidCallback? onCancel;
//
//   final VoidCallback? onSendRequest;
//
//   final VoidCallback? onCall;
//
//   const InterestCard({
//     super.key,
//     required this.userInterest,
//     this.onAccept,
//     this.onReject,
//     this.onCancel,
//     this.onSendRequest,
//     this.onCall,
//   });
//
//   @override
//   Widget build(BuildContext context) {
//     final user = userInterest.user!;
//
//     return Container(
//       decoration: const ShapeDecoration(
//         shape: SmoothRectangleBorder(
//           borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 10, cornerSmoothing: cornerSmoothing)),
//         ),
//         color: cLightBg,
//       ),
//       margin: const EdgeInsets.symmetric(vertical: 5, horizontal: 12),
//       padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
//       child: Column(
//         children: [
//           Row(
//             children: [
//               ClipSmoothRect(
//                 radius: const SmoothBorderRadius.all(SmoothRadius(cornerRadius: 15, cornerSmoothing: cornerSmoothing)),
//                 child: MyCachedProfileImage(
//                   imageUrl: user.profile,
//                   fullName: user.fullName ?? '',
//                   width: 100,
//                   height: 100,
//                 ),
//               ),
//               const SizedBox(width: 12),
//               Expanded(
//                 child: Column(
//                   crossAxisAlignment: CrossAxisAlignment.start,
//                   children: [
//                     Text(
//                       user.fullName ?? '',
//                       style: MyTextStyle.gilroyBold(size: 16),
//                       maxLines: 1,
//                       overflow: TextOverflow.ellipsis,
//                     ),
//                     const SizedBox(height: 4),
//                     Row(
//                       children: [
//                         Text(
//                           calculateAge(user.dob).toString() ?? '',
//                           style: MyTextStyle.gilroyRegular(size: 14, color: cDarkText),
//                         ),
//                         const SizedBox(width: 4),
//                         Text(
//                           "yrs",
//                           style: MyTextStyle.gilroyRegular(size: 14, color: cDarkText),
//                         ),
//                         const SizedBox(width: 4),
//                         Text(
//                           user.height ?? '',
//                           style: MyTextStyle.gilroyRegular(size: 14, color: cDarkText),
//                         ),
//                       ],
//                     ),
//                     const SizedBox(height: 4),
//                     Text(
//                       user.location?.city?.name ?? '',
//                       style: MyTextStyle.gilroyMedium(size: 12),
//                       maxLines: 1,
//                       overflow: TextOverflow.ellipsis,
//                     ),
//
//                     const SizedBox(height: 6),
//                     //  _buildStatusLabel(userInterest),
//                   ],
//                 ),
//               ),
//
//               //_buildActionButtons(userInterest),
//             ],
//           ),
//           SizedBox(
//             height: 10,
//           ),
//           userInterest.type == "received"
//               ? ReceivedInterestItemWidget(userInterest)
//               : SentInterestItemWidget(userInterest),
//         ],
//       ),
//     );
//   }
//
//   Widget ReceivedInterestItemWidget(UserInterest interest) {
//     print("asdjkhasikgfoliaudglsasdgfsdgsddfgdasfdaefgdeg");
//     Widget actions = const SizedBox();
//     String labelText = "";
//     final gender = interest.user?.gender?.toLowerCase() ?? "they";
//     final fullName = interest.user?.fullName ?? "Someone";
//
//     final isFemale = gender == "female";
//     final pronoun = isFemale ? "She" : "He";
//
//     // Generate label based on type and status
//     if (interest.type == "received") {
//       if (interest.status == "pending") {
//         labelText = "$pronoun sent you a request.";
//         actions = Row(
//           children: [
//             Expanded(
//               child: CommonSmallButtonWithIcon(
//                 text: "Reject",
//                 onTap: () {
//                   onReject!();
//                 },
//                 color: cWhite,
//                 icon: Icons.cancel_outlined,
//                 textColor: cPrimary,
//                 iconTintColor: cPrimary,
//               ),
//             ),
//             const SizedBox(width: 10),
//             Expanded(
//               child: CommonSmallButtonWithIcon(
//                 text: "Accept",
//                 onTap: () {
//                   onAccept!();
//                 },
//                 color: cPrimary,
//                 icon: Icons.check,
//                 textColor: cBlack,
//                 iconTintColor: cBlack,
//               ),
//             ),
//           ],
//         );
//       } else if (interest.status == "accepted") {
//         labelText = "You have accepted their interest on ${DateTime.parse(interest.createdAt ?? '').formatFullDate()}";
//         actions = Row(
//           children: [
//             Expanded(
//               child: CommonSmallButtonWithIcon(
//                 text: "Send Message",
//                 onTap: () {},
//                 color: cWhite,
//                 icon: Icons.send,
//                 textColor: cPrimary,
//                 iconTintColor: cPrimary,
//               ),
//             ),
//             const SizedBox(width: 10),
//             Expanded(
//               child: CommonSmallButtonWithIcon(
//                 text: "Call Now",
//                 onTap: () {},
//                 color: cPrimary,
//                 icon: Icons.call,
//                 textColor: cOnPrimary,
//                 iconTintColor: cOnPrimary,
//               ),
//             ),
//           ],
//         );
//       } else if (interest.status == "rejected") {
//         print("asdjkhasikgfoliaudglsa");
//         actions = buildRejectedInterestWidget(interest);
//       }
//     }
//
//     return Column(
//       crossAxisAlignment: CrossAxisAlignment.start,
//       children: [
//         Text(
//           labelText,
//           style: MyTextStyle.gilroySemiBold(size: 14, color: cDarkText),
//         ),
//         const SizedBox(height: 10),
//         actions,
//       ],
//     );
//   }
//
//   Widget SentInterestItemWidget(UserInterest interest) {
//     Widget actions = const SizedBox();
//     String labelText = "";
//     final gender = interest.user?.gender?.toLowerCase() ?? "they";
//     final fullName = interest.user?.fullName ?? "Someone";
//
//     final isFemale = gender == "Female";
//     final pronoun = isFemale ? "She" : "He";
//
//     if (interest.type == "sent") {
//       if (interest.status == "pending") {
//         labelText = "You sent a request to $fullName.";
//         actions = CommonSmallButtonWithIcon(
//           text: "Cancel Request",
//           onTap: onCancel!,
//           color: Colors.orange,
//           icon: Icons.cancel,
//           textColor: cWhite,
//           iconTintColor: cWhite,
//         );
//       } else if (interest.status == "accepted") {
//         labelText = "$pronoun accepted your request on ${DateTime.parse(interest.updatedAt ?? '').formatFullDate()}";
//         actions = Row(
//           children: [
//             Expanded(
//               child: CommonSmallButtonWithIcon(
//                 text: "Send Message",
//                 onTap: onCall!,
//                 color: cWhite,
//                 icon: Icons.send,
//                 textColor: cPrimary,
//                 iconTintColor: cPrimary,
//               ),
//             ),
//             const SizedBox(width: 10),
//             Expanded(
//               child: CommonSmallButtonWithIcon(
//                 text: "Call Now",
//                 onTap: onCall!,
//                 color: cPrimary,
//                 icon: Icons.call,
//                 textColor: cBlack,
//                 iconTintColor: cBlack,
//               ),
//             ),
//           ],
//         );
//       } else if (interest.status == "rejected") {
//         labelText = "$pronoun rejected your request.";
//         actions = CommonSmallButtonWithIcon(
//           text: "Send Again",
//           onTap: () {
//             onSendRequest!();
//           },
//           color: cPrimary,
//           icon: Icons.refresh,
//           textColor: cWhite,
//           iconTintColor: cWhite,
//         );
//       }
//     }
//
//     return Column(
//       crossAxisAlignment: CrossAxisAlignment.start,
//       children: [
//         Text(
//           labelText,
//           style: MyTextStyle.gilroySemiBold(size: 14, color: cDarkText),
//         ),
//         const SizedBox(height: 10),
//         actions,
//       ],
//     );
//   }
//
//   Widget buildRejectedInterestWidget(UserInterest interest) {
//     print("akjsdhaskjdkaskjdhaksjhdjasd");
//     final user = interest.user;
//     final fullName = user?.fullName ?? "this user";
//     final gender = user?.gender?.toLowerCase();
//     final pronoun = (gender == "female")
//         ? "her"
//         : (gender == "male")
//             ? "him"
//             : "them";
//
//     return Column(
//       crossAxisAlignment: CrossAxisAlignment.start,
//       children: [
//         Text(
//           "You rejected $pronoun, but if you've changed your mind...",
//           style: MyTextStyle.gilroySemiBold(size: 14, color: cDarkText),
//         ),
//         const SizedBox(height: 10),
//         Row(
//           children: [
//             Expanded(
//               child: CommonSmallButtonWithIcon(
//                 text: "Send Interest Again",
//                 onTap: () {
//                   // Trigger resend logic
//                   onSendRequest!();
//                 },
//                 color: cPrimary,
//                 icon: Icons.refresh,
//                 textColor: cWhite,
//                 iconTintColor: cWhite,
//               ),
//             ),
//             const SizedBox(width: 10),
//             Expanded(
//               child: CommonSmallButtonWithIcon(
//                 text: "Call Now",
//                 onTap: () {
//                   // Trigger call action
//                   onCall!();
//                 },
//                 color: Colors.green,
//                 icon: Icons.call,
//                 textColor: cWhite,
//                 iconTintColor: cWhite,
//               ),
//             ),
//           ],
//         ),
//       ],
//     );
//   }
// }

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:banjaramatch/common/extensions/date_time_extension.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/models/model_interest_user_list.dart';
import 'package:banjaramatch/screens/member_card.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../common/managers/navigation.dart';

class InterestCard extends StatelessWidget {
  final UserInterest userInterest;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;
  final VoidCallback? onCancel;
  final VoidCallback? onSendRequest;
  final VoidCallback? onCall;

  const InterestCard({
    super.key,
    required this.userInterest,
    this.onAccept,
    this.onReject,
    this.onCancel,
    this.onSendRequest,
    this.onCall,
  });

  @override
  Widget build(BuildContext context) {
    final user = userInterest.user!;

    return Container(
      decoration: ShapeDecoration(
        shape: const SmoothRectangleBorder(
          borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 14, cornerSmoothing: cornerSmoothing)),
        ),
        color: Colors.white,
        shadows: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      margin: const EdgeInsets.symmetric(vertical: 0, horizontal: 0),
      child: Column(
        children: [
          // Header with profile info and status badge
          Container(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                // Profile image with status ring
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _getStatusColor().withOpacity(0.3),
                      width: 2,
                    ),
                  ),
                  child: ClipSmoothRect(
                    radius:
                        const SmoothBorderRadius.all(SmoothRadius(cornerRadius: 10, cornerSmoothing: cornerSmoothing)),
                    child: MyCachedProfileImage(
                      imageUrl: user.profile,
                      fullName: user.fullName ?? '',
                      width: 70,
                      height: 70,
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Profile details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Name and verification
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              user.fullName ?? '',
                              style: MyTextStyle.gilroyBold(size: 16),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.blue[50],
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.verified, size: 12, color: Colors.blue[600]),
                                const SizedBox(width: 2),
                                Text(
                                  "Verified",
                                  style: MyTextStyle.gilroySemiBold(size: 9, color: Colors.blue[600]),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Age, height, location
                      Row(
                        children: [
                          Icon(Icons.cake_outlined, size: 14, color: Colors.grey[500]),
                          const SizedBox(width: 4),
                          Text(
                            "${calculateAge(user.dob)} yrs",
                            style: MyTextStyle.gilroyMedium(size: 12, color: Colors.grey[600]),
                          ),
                          Text(
                            " • ${user.height ?? ''} • ",
                            style: MyTextStyle.gilroyRegular(size: 12, color: Colors.grey[500]),
                          ),
                          Icon(Icons.location_on_outlined, size: 14, color: Colors.grey[500]),
                          Expanded(
                            child: Text(
                              user.location?.city?.name ?? '',
                              style: MyTextStyle.gilroyMedium(size: 12, color: Colors.grey[600]),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Quick info tags
                      Row(
                        children: [
                          _buildInfoTag(user.profession?.name ?? "Professional", Colors.blue),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Interest section with colored background
          Container(
            decoration: BoxDecoration(
              color: _getStatusBackgroundColor(),
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(14),
                bottomRight: Radius.circular(14),
              ),
            ),
            padding: const EdgeInsets.all(14),
            child: userInterest.type == "received"
                ? _buildReceivedInterestWidget(userInterest)
                : _buildSentInterestWidget(userInterest),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTag(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: MyTextStyle.gilroySemiBold(size: 9, color: color),
      ),
    );
  }

  Widget _buildReceivedInterestWidget(UserInterest interest) {
    final gender = interest.user?.gender?.toLowerCase() ?? "they";
    final fullName = interest.user?.fullName ?? "Someone";
    final pronoun = gender == "female" ? "She" : "He";
    final possessive = gender == "female" ? "her" : "his";

    if (interest.status == "pending") {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.orange[100],
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.favorite, size: 16, color: Colors.orange[600]),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "💝 $fullName is interested in you!",
                      style: MyTextStyle.gilroyBold(size: 13, color: Colors.orange[800]),
                    ),
                    Text(
                      "$pronoun wants to connect • Tap to respond",
                      style: MyTextStyle.gilroyMedium(size: 11, color: Colors.orange[600]),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildActionButton(
                  text: "Not Interested",
                  onTap: onReject!,
                  backgroundColor: Colors.white,
                  textColor: Colors.grey[700]!,
                  borderColor: Colors.grey[300]!,
                  icon: Icons.close,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildActionButton(
                  text: "Accept & Chat",
                  onTap: onAccept!,
                  backgroundColor: Colors.pink[500]!,
                  textColor: Colors.white,
                  icon: Icons.chat_bubble,
                  isPrimary: true,
                ),
              ),
            ],
          ),
        ],
      );
    } else if (interest.status == "accepted") {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.green[100],
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.favorite, size: 16, color: Colors.green[600]),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "🎉 You both are interested!",
                      style: MyTextStyle.gilroyBold(size: 13, color: Colors.green[800]),
                    ),
                    Text(
                      "Start your conversation • ${DateTime.parse(interest.createdAt ?? '').formatFullDate()}",
                      style: MyTextStyle.gilroyMedium(size: 11, color: Colors.green[600]),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildActionButton(
                  text: "Send Message",
                  onTap: () {
                    Navigate.to(ProfileScreen(
                      userId: interest?.user?.id ?? "",
                      isFromTabBar: false,
                    ));
                  },
                  backgroundColor: Colors.blue[500]!,
                  textColor: Colors.white,
                  icon: Icons.message,
                  isPrimary: true,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildActionButton(
                  text: "Call Now",
                  onTap: () {},
                  backgroundColor: Colors.green[500]!,
                  textColor: Colors.white,
                  icon: Icons.call,
                  isPrimary: true,
                ),
              ),
            ],
          ),
        ],
      );
    } else if (interest.status == "rejected") {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.blue[100],
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.psychology, size: 16, color: Colors.blue[600]),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "💭 Changed your mind about $possessive?",
                      style: MyTextStyle.gilroyBold(size: 13, color: Colors.blue[800]),
                    ),
                    Text(
                      "Give $possessive another chance • Send interest again",
                      style: MyTextStyle.gilroyMedium(size: 11, color: Colors.blue[600]),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildActionButton(
                  text: "Send Interest",
                  onTap: onSendRequest!,
                  backgroundColor: Colors.pink[500]!,
                  textColor: Colors.white,
                  icon: Icons.favorite,
                  isPrimary: true,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildActionButton(
                  text: "Call Directly",
                  onTap: onCall!,
                  backgroundColor: Colors.white,
                  textColor: Colors.green[700]!,
                  borderColor: Colors.green[300]!,
                  icon: Icons.call,
                ),
              ),
            ],
          ),
        ],
      );
    }

    return const SizedBox();
  }

  Widget _buildSentInterestWidget(UserInterest interest) {
    final gender = interest.user?.gender?.toLowerCase() ?? "they";
    final fullName = interest.user?.fullName ?? "Someone";
    final pronoun = gender == "female" ? "She" : "He";

    if (interest.status == "pending") {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.orange[100],
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.schedule, size: 16, color: Colors.orange[600]),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "⏳ Waiting for $fullName's response...",
                      style: MyTextStyle.gilroyBold(size: 13, color: Colors.orange[800]),
                    ),
                    Text(
                      "Your interest is pending • Be patient",
                      style: MyTextStyle.gilroyMedium(size: 11, color: Colors.orange[600]),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Center(
            child: _buildActionButton(
              text: "Cancel Request",
              onTap: onCancel!,
              backgroundColor: Colors.white,
              textColor: Colors.grey[700]!,
              borderColor: Colors.grey[300]!,
              icon: Icons.cancel_outlined,
              isCompact: true,
            ),
          ),
        ],
      );
    } else if (interest.status == "accepted") {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.green[100],
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.favorite, size: 16, color: Colors.green[600]),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "🎉 $pronoun accepted your interest!",
                      style: MyTextStyle.gilroyBold(size: 13, color: Colors.green[800]),
                    ),
                    Text(
                      "Start connecting • ${DateTime.parse(interest.updatedAt ?? '').formatFullDate()}",
                      style: MyTextStyle.gilroyMedium(size: 11, color: Colors.green[600]),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildActionButton(
                  text: "Send Message",
                  onTap: onCall!,
                  backgroundColor: Colors.blue[500]!,
                  textColor: Colors.white,
                  icon: Icons.message,
                  isPrimary: true,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildActionButton(
                  text: "Call Now",
                  onTap: onCall!,
                  backgroundColor: Colors.green[500]!,
                  textColor: Colors.white,
                  icon: Icons.call,
                  isPrimary: true,
                ),
              ),
            ],
          ),
        ],
      );
    } else if (interest.status == "rejected") {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.red[100],
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.heart_broken, size: 16, color: Colors.red[600]),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "💔 $pronoun declined your interest",
                      style: MyTextStyle.gilroyBold(size: 13, color: Colors.red[800]),
                    ),
                    Text(
                      "Don't give up • Try again after some time",
                      style: MyTextStyle.gilroyMedium(size: 11, color: Colors.red[600]),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Center(
            child: _buildActionButton(
              text: "Try Again Later",
              onTap: onSendRequest!,
              backgroundColor: Colors.pink[500]!,
              textColor: Colors.white,
              icon: Icons.refresh,
              isPrimary: true,
              isCompact: true,
            ),
          ),
        ],
      );
    }

    return const SizedBox();
  }

  Widget _buildActionButton({
    required String text,
    required VoidCallback onTap,
    required Color backgroundColor,
    required Color textColor,
    Color? borderColor,
    required IconData icon,
    bool isPrimary = false,
    bool isCompact = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(
          vertical: isCompact ? 8 : 10,
          horizontal: isCompact ? 16 : 12,
        ),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(8),
          border: borderColor != null ? Border.all(color: borderColor, width: 1) : null,
          boxShadow: isPrimary
              ? [
                  BoxShadow(
                    color: backgroundColor.withOpacity(0.3),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: isCompact ? MainAxisSize.min : MainAxisSize.max,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: textColor),
            const SizedBox(width: 6),
            Text(
              text,
              style: MyTextStyle.gilroySemiBold(size: 12, color: textColor),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor() {
    switch (userInterest.status) {
      case "pending":
        return Colors.orange;
      case "accepted":
        return Colors.green;
      case "rejected":
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _getStatusBackgroundColor() {
    switch (userInterest.status) {
      case "pending":
        return Colors.orange.shade50;
      case "accepted":
        return Colors.green.shade50;
      case "rejected":
        return userInterest.type == "received" ? Colors.blue.shade50 : Colors.red.shade50;
      default:
        return Colors.grey.shade50;
    }
  }
}
