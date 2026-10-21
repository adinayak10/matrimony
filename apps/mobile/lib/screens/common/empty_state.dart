import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Centered icon + title + message + optional action button. Used for empty
/// lists (no fabricated content: stories, FAQs, announcements start empty).
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    this.icon = Icons.inbox_rounded,
    this.title,
    this.message,
    this.actionLabel,
    this.onAction,
    this.compact = false,
  });

  final IconData icon;

  /// Already-translated; defaults to [AppKeys.emptyTitle].
  final String? title;

  /// Already-translated; defaults to [AppKeys.emptyMessage]. Pass '' to hide.
  final String? message;

  /// Already-translated button text; the button shows when [onAction] is set
  /// (defaults to [AppKeys.retry]).
  final String? actionLabel;
  final VoidCallback? onAction;

  /// Less padding, smaller icon (inside cards/strips).
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final msg = message ?? AppKeys.emptyMessage.tr;
    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 24, vertical: compact ? 16 : 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: EdgeInsets.all(compact ? 12 : 20),
              decoration: BoxDecoration(color: cPrimary.withOpacity(0.08), shape: BoxShape.circle),
              child: Icon(icon, size: compact ? 28 : 44, color: cPrimary.withOpacity(0.8)),
            ),
            SizedBox(height: compact ? 10 : 16),
            Text(
              title ?? AppKeys.emptyTitle.tr,
              textAlign: TextAlign.center,
              style: MyTextStyle.gilroyBold(size: compact ? 15 : 18, color: cDarkText),
            ),
            if (msg.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                msg,
                textAlign: TextAlign.center,
                style: MyTextStyle.gilroyRegular(size: compact ? 12 : 14, color: cLightText),
              ),
            ],
            if (onAction != null) ...[
              SizedBox(height: compact ? 12 : 20),
              ElevatedButton(
                onPressed: onAction,
                style: ElevatedButton.styleFrom(
                  backgroundColor: cPrimary,
                  foregroundColor: cOnPrimary,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
                child: Text(actionLabel ?? AppKeys.retry.tr, style: MyTextStyle.gilroySemiBold(size: 14, color: cOnPrimary)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
