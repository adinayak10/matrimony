import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../common/extensions/font_extension.dart';
import '../utilities/const.dart';

class MyTextField extends StatelessWidget {
  final TextEditingController controller;
  final String placeHolder;
  final bool isEditor;
  final bool obscureText;
  final Color? color;
  final int? limit;
  final Function(String text)? onChange;

  const MyTextField(
      {Key? key,
      required this.controller,
      required this.placeHolder,
      this.isEditor = false,
      this.color,
      this.limit,
      this.onChange,
      this.obscureText = false})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: isEditor ? 130 : 45,
      decoration: BoxDecoration(
        color: color ?? cLightBg,
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
      child: TextField(
        obscureText: obscureText,
        onChanged: onChange,
        textCapitalization: TextCapitalization.sentences,
        expands: isEditor ? true : false,
        minLines: isEditor ? null : 1,
        maxLines: isEditor ? null : 1,
        decoration: InputDecoration(
            hintText: placeHolder.tr,
            hintStyle: MyTextStyle.gilroyRegular(color: cLightText.withOpacity(0.6)),
            border: InputBorder.none,
            counterText: '',
            isDense: true,
            contentPadding: const EdgeInsets.all(0)),
        cursorColor: cPrimary,
        maxLength: isEditor ? limit : null,
        style: MyTextStyle.gilroyRegular(color: cLightText),
        controller: controller,
        textInputAction: TextInputAction.newline,
      ),
    );
  }
}
