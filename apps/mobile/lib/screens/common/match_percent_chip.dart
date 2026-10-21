import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/utilities/const.dart';

/// "87% match" pill. Renders nothing when [percent] is null (older API builds
/// or profiles without preferences). Typical use:
/// `MatchPercentChip(percent: user.matchPercent ?? user.matchScore)`.
class MatchPercentChip extends StatelessWidget {
  const MatchPercentChip({super.key, required this.percent, this.compact = false, this.onDark = false});

  final int? percent;

  /// Smaller padding/text for dense cards.
  final bool compact;

  /// White translucent style for use on photos/gradients.
  final bool onDark;

  /// Green ≥ 75, amber ≥ 50, otherwise the brand red.
  static Color colorFor(int percent) {
    if (percent >= 75) return cGreen;
    if (percent >= 50) return const Color(0xFFF59E0B);
    return cPrimary;
  }

  @override
  Widget build(BuildContext context) {
    final value = percent;
    if (value == null) return const SizedBox.shrink();
    final clamped = value.clamp(0, 100).toInt();
    final color = colorFor(clamped);
    return Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 6 : 10, vertical: compact ? 3 : 5),
      decoration: BoxDecoration(
        color: onDark ? Colors.black.withOpacity(0.35) : color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: onDark ? Colors.white.withOpacity(0.5) : color.withOpacity(0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.favorite_rounded, size: compact ? 10 : 12, color: onDark ? Colors.white : color),
          SizedBox(width: compact ? 3 : 4),
          Text(
            AppKeys.percentMatch.trParams({'percent': '$clamped'}),
            style: MyTextStyle.gilroySemiBold(size: compact ? 10 : 12, color: onDark ? Colors.white : color),
          ),
        ],
      ),
    );
  }
}
