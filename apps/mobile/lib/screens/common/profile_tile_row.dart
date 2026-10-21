import 'package:flutter/material.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/common/match_percent_chip.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Compact list row for a profile: photo, name + verified tick, a details
/// line (age · height · city · profession), optional extra line/chips, a
/// match % chip and a trailing widget (buttons/menu). Used by the visitors,
/// shortlist, daily-matches, nearby and saved-search result lists.
class ProfileTileRow extends StatelessWidget {
  const ProfileTileRow({
    super.key,
    required this.user,
    this.onTap,
    this.trailing,
    this.subtitle,
    this.chips = const [],
    this.showMatchPercent = true,
    this.avatarSize = 56,
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
  });

  final User user;
  final VoidCallback? onTap;
  final Widget? trailing;

  /// Extra line under the details (e.g. "Viewed you 2h ago"); already translated.
  final String? subtitle;

  /// Extra chips (e.g. daily-match `matchedOn` reasons) shown under the text.
  final List<Widget> chips;

  /// Shows `matchPercent ?? matchScore` when present.
  final bool showMatchPercent;
  final double avatarSize;
  final EdgeInsetsGeometry margin;

  /// "28 yrs · 5'6" · Jaipur · Engineer" from whatever fields are present.
  static String detailsLine(User user) {
    final parts = <String>[];
    if (user.age != null && user.age! > 0) parts.add('${user.age} yrs');
    final h = user.height;
    if (h != null && h > 0) {
      final totalInches = (h / 2.54).round();
      parts.add("${totalInches ~/ 12}'${totalInches % 12}\"");
    }
    final city = user.location?.city?.name;
    if (city != null && city.isNotEmpty) parts.add(city);
    final profession = user.profession?.name;
    if (profession != null && profession.isNotEmpty) parts.add(profession);
    return parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final name = (user.fullName ?? '').trim();
    final details = detailsLine(user);
    final percent = user.matchPercent ?? user.matchScore;
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: cCard,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(avatarSize / 2),
                      child: MyCachedProfileImage(
                        imageUrl: user.profile,
                        fullName: name.isEmpty ? null : name,
                        width: avatarSize,
                        height: avatarSize,
                      ),
                    ),
                    if (user.isOnline == true)
                      Positioned(
                        right: 1,
                        bottom: 1,
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: cGreen,
                            shape: BoxShape.circle,
                            border: Border.all(color: cWhite, width: 2),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: MyTextStyle.gilroyBold(size: 15, color: cDarkText),
                            ),
                          ),
                          if (user.isVerified == 1) ...[
                            const SizedBox(width: 4),
                            const Icon(Icons.verified_rounded, size: 16, color: cBlueTick),
                          ],
                        ],
                      ),
                      if (details.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          details,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: MyTextStyle.gilroyRegular(size: 12, color: cLightText),
                        ),
                      ],
                      if (subtitle != null && subtitle!.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          subtitle!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: MyTextStyle.gilroyMedium(size: 12, color: cDarkText.withOpacity(0.7)),
                        ),
                      ],
                      if ((showMatchPercent && percent != null) || chips.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            if (showMatchPercent && percent != null) MatchPercentChip(percent: percent, compact: true),
                            ...chips,
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) ...[
                  const SizedBox(width: 8),
                  trailing!,
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
