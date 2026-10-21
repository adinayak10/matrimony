import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/utilities/const.dart';

/// White rounded card with an optional header row (icon, title, subtitle,
/// trailing widget or a "See all" link). Used by settings groups, profile
/// sections and Explore strips.
class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    this.title,
    this.subtitle,
    this.icon,
    this.trailing,
    this.onSeeAll,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
  });

  /// Already-translated text (pass `SomeKeys.x.tr`).
  final String? title;
  final String? subtitle;
  final IconData? icon;

  /// Shown at the end of the header; ignored when [onSeeAll] is set.
  final Widget? trailing;

  /// Shows a translated "See all" link in the header.
  final VoidCallback? onSeeAll;
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;

  @override
  Widget build(BuildContext context) {
    final hasHeader = title != null || icon != null || trailing != null || onSeeAll != null;
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: cCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (hasHeader) ...[
            Row(
              children: [
                if (icon != null) ...[
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: cPrimary.withOpacity(0.1), shape: BoxShape.circle),
                    child: Icon(icon, color: cPrimary, size: 18),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (title != null)
                        Text(title!, style: MyTextStyle.gilroyBold(size: 16, color: cDarkText)),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(subtitle!, style: MyTextStyle.gilroyRegular(size: 12, color: cLightText)),
                      ],
                    ],
                  ),
                ),
                if (onSeeAll != null)
                  GestureDetector(
                    onTap: onSeeAll,
                    behavior: HitTestBehavior.opaque,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                      child: Text(AppKeys.seeAll.tr, style: MyTextStyle.gilroySemiBold(size: 13, color: cPrimary)),
                    ),
                  )
                else if (trailing != null)
                  trailing!,
              ],
            ),
            const SizedBox(height: 12),
          ],
          child,
        ],
      ),
    );
  }
}
