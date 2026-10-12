import 'package:blur/blur.dart';
import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';

import '../common/extensions/font_extension.dart';
import '../common/widgets/my_cached_image.dart';
import '../utilities/const.dart';

class MemberCard extends StatelessWidget {
  final bool isFetching;
  final List<User> memberList;
  final PageController controller;

  const MemberCard({
    super.key,
    required this.isFetching,
    required this.memberList,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    if (isFetching) {
      return const Center(child: CircularProgressIndicator());
    }

    if (memberList.isEmpty) {
      return const Text('No members found');
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        return ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          controller: controller,
          scrollDirection: Axis.horizontal,
          itemCount: memberList.length,
          shrinkWrap: true,
          separatorBuilder: (_, __) => const SizedBox(width: 20),
          itemBuilder: (_, index) {
            return GestureDetector(
              onTap: () {
                // Handle tap
              },
              child: _buildProUserCard(memberList[index]),
            );
          },
        );
      },
    );
  }
}

class Shades {
  /// Returns a semi-transparent dark shade (e.g., black with 50% opacity).
  static Color transparentDark([double opacity = 0.5]) {
    return Colors.black.withOpacity(opacity);
  }

  /// You can add more predefined shades if needed
  static Color lightGray() => const Color(0xFFE0E0E0);

  static Color mediumGray() => const Color(0xFFBDBDBD);

  static Color darkGray() => const Color(0xFF424242);
}

Widget _buildProUserCard(User user, {bool isBlurred = false, int remaining = 0}) {
  // Handle image with optional blur
  Widget image = MyCachedImage(imageUrl: user.profile!, width: 120, height: 120);
  if (isBlurred) {
    image = image.blurred(
      blur: 4,
      colorOpacity: 0.25,
      borderRadius: BorderRadius.circular(12),
      overlay: Center(
        child: Text(
          "+$remaining\nMore",
          textAlign: TextAlign.center,
          style: MyTextStyle.gilroyBold(color: cWhite, size: 14),
        ),
      ),
    );
  }

  // Calculate age
  int? age;
  if (user.dob != null) {
    final birthDate = DateTime.tryParse(user.dob!);
    if (birthDate != null) {
      final now = DateTime.now();
      age = now.year - birthDate.year;
      if (now.month < birthDate.month || (now.month == birthDate.month && now.day < birthDate.day)) {
        age--;
      }
    }
  }

  // Format view date (assumes `user.lastVisitedAt` is a string)
  String? viewedDate;
  if (user.lastVisitedAt != null) {
    final date = DateTime.tryParse(user.lastVisitedAt!);
    if (date != null) {
      viewedDate = "${date.day.toString().padLeft(2, '0')}-${date.month.toString().padLeft(2, '0')}-${date.year}";
    }
  }

  return GestureDetector(
    onTap: () {
      Get.to(ProfileScreen(userId: user.id!));
    },
    child: Container(
      width: 120,
      child: Column(
        children: [
          ClipSmoothRect(
            radius: const SmoothBorderRadius.all(SmoothRadius(cornerRadius: 14, cornerSmoothing: 0.6)),
            child: image,
          ),
          Container(
            width: double.infinity,
            padding: EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.fullName ?? 'Unknown',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.start,
                  style: MyTextStyle.gilroyBold(color: cDarkText, size: 12),
                ),
                Row(
                  children: [
                    if (age != null)
                      Text(
                        "$age yrs, ",
                        style: MyTextStyle.gilroySemiBold(color: cLightText, size: 10),
                      ),
                    Text(
                      "${user.height}",
                      style: MyTextStyle.gilroySemiBold(color: cLightText, size: 10),
                    ),
                  ],
                ),
                if (viewedDate != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        height: 6,
                      ),
                      Text(
                        "Viewed on",
                        style: MyTextStyle.gilroyRegular(color: cLightText, size: 10),
                      ),
                      Text(
                        viewedDate,
                        style: MyTextStyle.gilroyRegular(color: cDarkText, size: 10),
                      ),
                    ],
                  ),
              ],
            ),
          )
        ],
      ),
    ),
  );
}

int? calculateAge(String? dob) {
  if (dob == null) return null;

  final birthDate = DateTime.tryParse(dob);
  if (birthDate == null) return null;

  final now = DateTime.now();
  int age = now.year - birthDate.year;

  if (now.month < birthDate.month || (now.month == birthDate.month && now.day < birthDate.day)) {
    age--;
  }

  return age;
}
