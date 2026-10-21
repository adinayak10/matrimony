import 'package:flutter/material.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Dark background used by every call screen.
const Color cCallBackground = Color(0xFF1B1B1F);

/// Large round profile photo with a soft halo (call screens).
class CallAvatar extends StatelessWidget {
  const CallAvatar({super.key, this.imageUrl, this.name, this.size = 120});

  final String? imageUrl;
  final String? name;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: cWhite.withOpacity(0.08),
        border: Border.all(color: cWhite.withOpacity(0.15), width: 1),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size / 2),
        child: MyCachedProfileImage(
          imageUrl: imageUrl,
          fullName: (name == null || name!.trim().isEmpty) ? null : name,
          width: size,
          height: size,
        ),
      ),
    );
  }
}

/// Name + status line under the avatar.
class CallTitle extends StatelessWidget {
  const CallTitle({super.key, required this.name, required this.status});

  final String name;
  final String status;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          name,
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: MyTextStyle.gilroyBold(size: 26, color: cWhite),
        ),
        const SizedBox(height: 8),
        Text(
          status,
          textAlign: TextAlign.center,
          style: MyTextStyle.gilroyMedium(size: 16, color: cWhite.withOpacity(0.75)),
        ),
      ],
    );
  }
}

/// Round call control with a caption (mute, speaker, end, accept…).
class CallRoundButton extends StatelessWidget {
  const CallRoundButton({
    super.key,
    required this.icon,
    required this.onTap,
    this.label,
    this.background,
    this.foreground = cWhite,
    this.size = 64,
    this.active = false,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final String? label;

  /// Defaults to a translucent white circle (white when [active]).
  final Color? background;
  final Color foreground;
  final double size;

  /// Toggled-on state (e.g. muted): white circle with a dark icon.
  final bool active;

  @override
  Widget build(BuildContext context) {
    final bg = background ?? (active ? cWhite : cWhite.withOpacity(0.15));
    final fg = background == null && active ? cBlack : foreground;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: bg,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: SizedBox(
              width: size,
              height: size,
              child: Icon(icon, color: fg, size: size * 0.45),
            ),
          ),
        ),
        if (label != null) ...[
          const SizedBox(height: 8),
          Text(
            label!,
            textAlign: TextAlign.center,
            style: MyTextStyle.gilroyMedium(size: 13, color: cWhite.withOpacity(0.85)),
          ),
        ],
      ],
    );
  }
}
