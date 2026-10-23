import 'package:flutter/material.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';

/// One tab of a [SoftSegmentBar].
class SegmentItem {
  const SegmentItem({required this.label, this.icon, this.count = 0, this.alert = false});

  /// Already-translated label.
  final String label;
  final IconData? icon;

  /// Badge count; hidden when 0.
  final int count;

  /// Shows [count] as a solid red "needs action" badge (same look as the
  /// bottom-nav badge) instead of a muted total.
  final bool alert;
}

/// Pink/orange gradient segmented control (extracted from the Interests
/// screen's soft segment controller, which keeps its own copy for now).
class SoftSegmentBar extends StatelessWidget {
  const SoftSegmentBar({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onChanged,
    this.margin = const EdgeInsets.symmetric(horizontal: 20),
  });

  final List<SegmentItem> items;
  final int selectedIndex;
  final ValueChanged<int> onChanged;
  final EdgeInsetsGeometry margin;

  static const Color _pink = Color(0xFFEC4899);
  static const Color _orange = Color(0xFFF97316);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: _pink.withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++) Expanded(child: _tab(items[i], i)),
        ],
      ),
    );
  }

  Widget _tab(SegmentItem item, int index) {
    final bool isSelected = selectedIndex == index;
    return GestureDetector(
      onTap: () => onChanged(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          gradient: isSelected ? const LinearGradient(colors: [_pink, _orange]) : null,
          borderRadius: BorderRadius.circular(16),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: _pink.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        // Shrinks slightly on narrow phones instead of cutting the label off.
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (item.icon != null) ...[
                Icon(
                  item.icon,
                  size: 18,
                  color: isSelected ? Colors.white : const Color(0xFF9CA3AF),
                ),
                const SizedBox(width: 6),
              ],
              Text(
                item.label,
                maxLines: 1,
                style: MyTextStyle.gilroySemiBold(
                  size: 14,
                  color: isSelected ? Colors.white : const Color(0xFF6B7280),
                ),
              ),
              if (item.count > 0) ...[
                const SizedBox(width: 6),
                _badge(item, isSelected),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _badge(SegmentItem item, bool isSelected) {
    final text = item.count > 99 ? '99+' : item.count.toString();
    if (item.alert) {
      return Container(
        constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
        padding: const EdgeInsets.symmetric(horizontal: 5),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.red,
          borderRadius: BorderRadius.circular(10),
          border: isSelected ? Border.all(color: Colors.white, width: 1.5) : null,
        ),
        child: Text(text, style: MyTextStyle.gilroyBold(size: 11, color: Colors.white)),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: isSelected ? Colors.white.withOpacity(0.25) : const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: MyTextStyle.gilroySemiBold(
          size: 11,
          color: isSelected ? Colors.white : const Color(0xFF6B7280),
        ),
      ),
    );
  }
}
