import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/utilities/const.dart';

class CommonButton extends StatelessWidget {
  final String text;
  final Function onTap;

  const CommonButton({Key? key, required this.text, required this.onTap}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: GestureDetector(
        onTap: () => onTap(),
        child: Container(
          decoration: ShapeDecoration(
            color: cPrimary,
            shape: const SmoothRectangleBorder(
                borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 12, cornerSmoothing: cornerSmoothing))),
            shadows: kMyBoxShadow,
          ),
          padding: const EdgeInsets.symmetric(vertical: 18),
          margin: const EdgeInsets.only(bottom: 15, right: 10, left: 10),
          alignment: Alignment.center,
          width: double.infinity,
          child: Text(
            text.tr,
            style: MyTextStyle.gilroySemiBold(size: 18, color: cButtonText),
          ),
        ),
      ),
    );
  }
}

class CommonSheetButton extends StatelessWidget {
  final Color? color;
  final String title;
  final VoidCallback onTap;

  const CommonSheetButton({Key? key, required this.title, required this.onTap, this.color}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        alignment: Alignment.center,
        margin: const EdgeInsets.only(bottom: 30),
        decoration: ShapeDecoration(
            shape: const SmoothRectangleBorder(
                borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 12, cornerSmoothing: cornerSmoothing))),
            color: color ?? cWhite),
        height: 50,
        width: double.infinity,
        child: Text(
          title.tr,
          style: MyTextStyle.gilroySemiBold(),
        ),
      ),
    );
  }
}

var kMyBoxShadow = [
  BoxShadow(
    color: cPrimary.withOpacity(0.5),
    blurRadius: 10,
    offset: const Offset(0, 4), // Shadow position
  )
];

class CommonSmallButton extends StatelessWidget {
  final String text;
  final Function onTap;

  const CommonSmallButton({Key? key, required this.text, required this.onTap}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: GestureDetector(
        onTap: () => onTap(),
        child: Container(
          decoration: ShapeDecoration(
            color: cPrimary,
            shape: const SmoothRectangleBorder(
                borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 12, cornerSmoothing: cornerSmoothing))),
            shadows: kMyBoxShadow,
          ),
          padding: const EdgeInsets.symmetric(vertical: 12),
          margin: const EdgeInsets.only(bottom: 15, right: 10, left: 10),
          alignment: Alignment.center,
          width: double.infinity,
          child: Text(
            text.tr,
            style: MyTextStyle.gilroySemiBold(size: 18, color: cOnPrimary),
          ),
        ),
      ),
    );
  }
}

class CommonSmallSecondaryButton extends StatelessWidget {
  final String text;
  final Function onTap;

  const CommonSmallSecondaryButton({Key? key, required this.text, required this.onTap}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: GestureDetector(
        onTap: () => onTap(),
        child: Container(
          decoration: ShapeDecoration(
            color: cLightBg,
            shape: const SmoothRectangleBorder(
                borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 12, cornerSmoothing: cornerSmoothing))),
            // shadows: kMyBoxShadow,
          ),
          padding: const EdgeInsets.symmetric(vertical: 12),
          margin: const EdgeInsets.only(bottom: 15, right: 10, left: 10),
          alignment: Alignment.center,
          width: double.infinity,
          child: Text(
            text.tr,
            style: MyTextStyle.gilroySemiBold(size: 18, color: cMainText),
          ),
        ),
      ),
    );
  }
}

class CommonSmallButtonWithIcon extends StatelessWidget {
  final String text;
  final Function onTap;

  final Color color;

  final IconData icon;

  final Color textColor;

  final Color iconTintColor;

  const CommonSmallButtonWithIcon(
      {Key? key,
      required this.text,
      required this.onTap,
      required this.color,
      required this.icon,
      required this.iconTintColor,
      required this.textColor})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: GestureDetector(
        onTap: () => onTap(),
        child: Container(
          decoration: ShapeDecoration(
            color: color,
            shape: const SmoothRectangleBorder(
                borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 12, cornerSmoothing: cornerSmoothing))),
            //  shadows: kMyBoxShadow,
          ),
          padding: const EdgeInsets.symmetric(vertical: 8),
          margin: const EdgeInsets.only(bottom: 0, right: 0, left: 0),
          alignment: Alignment.center,
          width: double.infinity,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: iconTintColor, size: 20),
              const SizedBox(width: 8),
              Text(
                text.tr,
                style: MyTextStyle.gilroySemiBold(size: 14, color: textColor),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
