import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Light app bar used by the 1.1.0 screens (settings, lists, verification).
/// [title] is already translated.
PreferredSizeWidget featureAppBar(String title, {List<Widget>? actions}) {
  return AppBar(
    backgroundColor: cWhite,
    foregroundColor: cDarkText,
    surfaceTintColor: cWhite,
    elevation: 0.5,
    centerTitle: false,
    iconTheme: const IconThemeData(color: cDarkText),
    title: Text(title, style: MyTextStyle.gilroyBold(size: 18, color: cDarkText)),
    actions: actions,
  );
}

/// Tappable settings row: leading icon, title, optional subtitle and trailing
/// widget (defaults to a chevron). Texts are already translated.
class SettingsTile extends StatelessWidget {
  const SettingsTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.color = cPrimary,
    this.showChevron = true,
    this.destructive = false,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color color;
  final bool showChevron;

  /// Red title (logout / delete account).
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final titleColor = destructive ? cError : cDarkText;
    final iconColor = destructive ? cError : color;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: iconColor.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, size: 18, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title, style: MyTextStyle.gilroySemiBold(size: 15, color: titleColor)),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(subtitle!, style: MyTextStyle.gilroyRegular(size: 12, color: cLightText)),
                  ],
                ],
              ),
            ),
            if (trailing != null) ...[
              const SizedBox(width: 8),
              trailing!,
            ],
            if (showChevron) ...[
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right_rounded, color: cLightText, size: 22),
            ],
          ],
        ),
      ),
    );
  }
}

/// Settings row with a switch. Texts are already translated.
class SettingsSwitchTile extends StatelessWidget {
  const SettingsSwitchTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: cPrimary.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, size: 18, color: cPrimary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title, style: MyTextStyle.gilroySemiBold(size: 15, color: cDarkText)),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(subtitle!, style: MyTextStyle.gilroyRegular(size: 12, color: cLightText)),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            CupertinoSwitch(
              activeTrackColor: cPrimary,
              value: value,
              onChanged: enabled ? onChanged : null,
            ),
          ],
        ),
      ),
    );
  }
}

/// One option of a [SettingsChoiceGroup].
class SettingsChoice {
  const SettingsChoice({required this.value, required this.label});

  /// API value (e.g. `everyone`).
  final String value;

  /// Already-translated label.
  final String label;
}

/// Title + wrap of choice chips bound to one string setting.
class SettingsChoiceGroup extends StatelessWidget {
  const SettingsChoiceGroup({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    required this.choices,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final List<SettingsChoice> choices;
  final String? value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: cPrimary.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, size: 18, color: cPrimary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(title, style: MyTextStyle.gilroySemiBold(size: 15, color: cDarkText)),
                    if (subtitle != null && subtitle!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(subtitle!, style: MyTextStyle.gilroyRegular(size: 12, color: cLightText)),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: choices.map((choice) {
              final selected = choice.value == value;
              return ChoiceChip(
                label: Text(
                  choice.label,
                  style: MyTextStyle.gilroySemiBold(size: 13, color: selected ? cWhite : cDarkText),
                ),
                selected: selected,
                selectedColor: cPrimary,
                backgroundColor: cLightBg,
                showCheckmark: false,
                onSelected: (_) {
                  if (!selected) onChanged(choice.value);
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
