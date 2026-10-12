import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/widgets/buttons/circle_button.dart';
import 'package:banjaramatch/utilities/const.dart';

class XmarkButton extends StatelessWidget {
  final Function onTap;

  const XmarkButton({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      child: const CircleIcon(color: cBlack, iconData: Icons.close),
      onTap: () {
        Get.back();
        onTap();
      },
    );
  }
}
