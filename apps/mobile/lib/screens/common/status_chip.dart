import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Small coloured status pill (verification, success stories, saved-search alerts …).
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label, this.color = cLightText, this.icon});

  /// Already-translated label.
  final String label;
  final Color color;
  final IconData? icon;

  /// Maps API status words to a translated, coloured chip:
  /// none, pending, approved, published, rejected, verified (anything else → as-is, grey).
  factory StatusChip.forStatus(String? status, {Key? key}) {
    switch ((status ?? 'none').toLowerCase()) {
      case 'pending':
        return StatusChip(key: key, label: AppKeys.statusPending.tr, color: const Color(0xFFF59E0B), icon: Icons.hourglass_top_rounded);
      case 'approved':
        return StatusChip(key: key, label: AppKeys.statusApproved.tr, color: cGreen, icon: Icons.check_circle_rounded);
      case 'published':
        return StatusChip(key: key, label: AppKeys.statusPublished.tr, color: cGreen, icon: Icons.public_rounded);
      case 'rejected':
        return StatusChip(key: key, label: AppKeys.statusRejected.tr, color: cError, icon: Icons.cancel_rounded);
      case 'verified':
        return StatusChip(key: key, label: AppKeys.statusVerified.tr, color: cBlueTick, icon: Icons.verified_rounded);
      case 'none':
        return StatusChip(key: key, label: AppKeys.statusNone.tr, color: cLightText, icon: Icons.radio_button_unchecked);
      default:
        return StatusChip(key: key, label: status ?? '', color: cLightText);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 4),
          ],
          Text(label, style: MyTextStyle.gilroySemiBold(size: 12, color: color)),
        ],
      ),
    );
  }
}
