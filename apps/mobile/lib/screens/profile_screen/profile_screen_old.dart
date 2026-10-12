import 'package:flutter/material.dart';

import '../../common/extensions/font_extension.dart';
import '../../models/registration.dart';
import '../../utilities/const.dart';
import '../preference_fit_model.dart';

class PreferenceFitWidget extends StatelessWidget {
  final List<MatchList> fitList;
  final List<Common> commonList;

  final User user;

  const PreferenceFitWidget({
    Key? key,
    required this.fitList,
    required this.commonList,
    required this.user,
  }) : super(key: key);

  Widget _fitRow(MatchList item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [

          /// Label Column
          SizedBox(
            width: 130,
            child: Text(
              "${item.label}:",
              style: MyTextStyle.gilroyBold(size: 14, color: cDarkText),
            ),
          ),

          /// Value Column
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("${item.expectedValue ?? '-'}", style: MyTextStyle.gilroyRegular(size: 14, color: cLightText)),
              ],
            ),
          ),

          /// Icon Column (at end)
          Icon(
            item.isFit == null
                ? Icons.help_outline // fallback icon for null
                : item.isFit!
                ? Icons.check_circle
                : Icons.cancel,
            color: item.isFit == null
                ? Colors.grey
                : item.isFit!
                ? Colors.green
                : Colors.red,
            size: 20,
          )
        ],
      ),
    );
  }

  Widget _commonRow(Common item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              "${item.label}:",
              style: MyTextStyle.gilroyBold(size: 14, color: cDarkText),
            ),
          ),
          Expanded(
            child: Text(
              item.value!.isNotEmpty ? item.value!.join(', ') : "-",
              style: MyTextStyle.gilroyRegular(size: 14, color: cPrimary),
            ),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    int matchedCount = fitList
        .where((item) => item.isFit == true)
        .length;
    int totalPreferences = fitList.length;

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cWhite,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: cPrimary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.psychology, color: cPrimary, size: 20),
              ),
              SizedBox(width: 12),
              Text("${user.gender == "Male" ? "His" : "Her"} Partner Preference",
                  style: MyTextStyle.gilroyBold(size: 18, color: cDarkText)),
            ],
          ),
          SizedBox(
            height: 20,
          ),

          // Match count display
          Text(
            "You match on $matchedCount out of $totalPreferences preferences.",
            style: MyTextStyle.gilroyBold(size: 16, color: cDarkText),
          ),
          const SizedBox(height: 20),
          SizedBox(height: 20),
          const SizedBox(height: 12),
          ...fitList.map(_fitRow).toList(),
          if (commonList.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text("What You Both Have in Common", style: MyTextStyle.gilroyBold(size: 18, color: cDarkText)),
            const SizedBox(height: 12),
            ...commonList.map(_commonRow).toList(),
          ]
        ],
      ),
    );
  }

// Widget _buildVSHeader() {
//   return Container(
//     padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
//     decoration: BoxDecoration(
//       gradient: LinearGradient(
//         begin: Alignment.topLeft,
//         end: Alignment.bottomRight,
//         colors: [
//           cPrimary.withOpacity(0.03),
//           Colors.pink.withOpacity(0.02),
//         ],
//       ),
//       borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
//     ),
//     child: Column(
//       children: [
//         // Profile VS Profile section
//         Row(
//           mainAxisAlignment: MainAxisAlignment.spaceEvenly,
//           children: [
//             // Your profile
//             Column(
//               children: [
//                 Container(
//                   width: 70,
//                   height: 70,
//                   decoration: BoxDecoration(
//                     shape: BoxShape.circle,
//                     gradient: LinearGradient(
//                       colors: [cPrimary.withOpacity(0.1), cPrimary.withOpacity(0.05)],
//                     ),
//                     border: Border.all(color: cPrimary.withOpacity(0.2), width: 3),
//                     boxShadow: [
//                       BoxShadow(
//                         color: cPrimary.withOpacity(0.1),
//                         blurRadius: 12,
//                         offset: const Offset(0, 4),
//                       ),
//                     ],
//                   ),
//                   child: const Icon(
//                     Icons.person,
//                     color: cPrimary,
//                     size: 32,
//                   ),
//                 ),
//                 const SizedBox(height: 8),
//                 Text(
//                   "You",
//                   style: MyTextStyle.gilroyMedium(size: 12, color: cPrimary),
//                 ),
//               ],
//             ),
//
//             // Animated Heart VS
//             AnimatedBuilder(
//               animation: _heartBeat,
//               builder: (context, child) {
//                 return Transform.scale(
//                   scale: _heartBeat.value,
//                   child: Container(
//                     width: 50,
//                     height: 50,
//                     decoration: BoxDecoration(
//                       shape: BoxShape.circle,
//                       color: Colors.white,
//                       boxShadow: [
//                         BoxShadow(
//                           color: Colors.pink.withOpacity(0.2),
//                           blurRadius: 15,
//                           offset: const Offset(0, 3),
//                         ),
//                       ],
//                     ),
//                     child: const Icon(
//                       Icons.favorite,
//                       color: Colors.pink,
//                       size: 28,
//                     ),
//                   ),
//                 );
//               },
//             ),
//
//             // Partner's profile
//             Column(
//               children: [
//                 Container(
//                   width: 70,
//                   height: 70,
//                   decoration: BoxDecoration(
//                     shape: BoxShape.circle,
//                     gradient: LinearGradient(
//                       colors: [Colors.pink.withOpacity(0.1), Colors.pink.withOpacity(0.05)],
//                     ),
//                     border: Border.all(color: Colors.pink.withOpacity(0.2), width: 3),
//                     boxShadow: [
//                       BoxShadow(
//                         color: Colors.pink.withOpacity(0.1),
//                         blurRadius: 12,
//                         offset: const Offset(0, 4),
//                       ),
//                     ],
//                   ),
//                   child: ClipOval(
//                     child: widget.user.profile != null && widget.user.profile!.isNotEmpty
//                         ? Image.network(
//                             widget.user.profile!,
//                             fit: BoxFit.cover,
//                             errorBuilder: (context, error, stackTrace) {
//                               return const Icon(
//                                 Icons.person,
//                                 color: Colors.pink,
//                                 size: 32,
//                               );
//                             },
//                           )
//                         : const Icon(
//                             Icons.person,
//                             color: Colors.pink,
//                             size: 32,
//                           ),
//                   ),
//                 ),
//                 const SizedBox(height: 8),
//                 Text(
//                   widget.user.gender == "Male" ? "Him" : "Her",
//                   style: MyTextStyle.gilroyMedium(size: 12, color: Colors.pink),
//                 ),
//               ],
//             ),
//           ],
//         ),
//
//         const SizedBox(height: 20),
//
//         // Title
//         Text(
//           "${widget.user.gender == "Male" ? "His" : "Her"} Partner Preferences",
//           style: MyTextStyle.gilroyBold(size: 18, color: cDarkText),
//           textAlign: TextAlign.center,
//         ),
//       ],
//     ),
//   );
// }
}
