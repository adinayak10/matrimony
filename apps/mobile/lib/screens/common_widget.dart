import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../common/extensions/font_extension.dart';
import '../utilities/const.dart';
import 'ddown.dart';
import 'device_info.dart';

class CommonWidget {
  static InkWell social_button({
    String? text,
    Gradient? gradient,
    String? icon,
    double width = 36,
    double height = 36,
    double radius = 12,
    // Color color = const Color.fromRGBO(255, 255, 255, 0.0),
    Color? color,
    Function? onpressed,
    double opacity = 1.0,
  }) {
    return InkWell(
      onTap: onpressed as void Function()?,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: color != null ? color.withOpacity(opacity) : null,
          gradient: color == null ? gradient : null,
          borderRadius: BorderRadius.all(
            Radius.circular(radius),
          ),
        ),
        child: Center(
            child: IconButton(
          icon: Image.asset(
            'assets/icon/${icon}',
            width: 16,
            height: 16,
          ),
          onPressed: null,
          // color: MyTheme.white,
        )
            // child: icon,
            ),
      ),
    );
  }

  // custom input field combined

  static Widget manage_profile_update_box({required context, text}) {
    return Container(
      height: 45,
      width: DeviceInfo(context).width,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: const Alignment(0.8, 1),
          colors: [
            Colors.deepOrange,
            Colors.white,
          ],
        ),
        borderRadius: const BorderRadius.all(
          Radius.circular(6.0),
        ),
      ),
      child: Center(
        child: Text('Save Change'),
      ),
    );
  }

  DropdownButtonFormField<DDown> buildDropdownButtonFormField(List<DDown> list, dynamic f, {dynamic value}) {
    return DropdownButtonFormField<DDown>(
      value: value,
      isExpanded: true,
      iconSize: 0.0,
      decoration: InputDecoration(
        hintText: "Select one",
        isDense: true,
//hintStyle: Styles.regular_gull_grey_12,
        border: const OutlineInputBorder(
          borderSide: BorderSide.none,
        ),
        suffixIcon: Icon(
          Icons.keyboard_arrow_down,
          color: Colors.grey,
        ),
      ),
      items: list.map<DropdownMenuItem<DDown>>((e) {
        return DropdownMenuItem<DDown>(
          value: e,
          child: Text(
            e.name!,
          ),
        );
      }).toList(),
      onChanged: (DDown? newValue) {
        f(newValue);
      },
    );
  }

  DropdownButtonFormField<DDown> buildCommonDropDown(List<DDown> list, DDown? value, dynamic onchange) {
    return DropdownButtonFormField<DDown>(
      value: value,
      isExpanded: true,
      iconSize: 0.0,
      decoration: InputDecoration(
        hintText: "Select one",
        isDense: true,
        border: const OutlineInputBorder(
          borderSide: BorderSide.none,
        ),
        suffixIcon: Icon(
          Icons.keyboard_arrow_down,
          color: Colors.blueGrey,
        ),
      ),
      items: list.map<DropdownMenuItem<DDown>>((e) {
        return DropdownMenuItem<DDown>(
          value: e,
          child: Text(
            e.name!,
          ),
        );
      }).toList(),
      onChanged: (DDown? newValue) {
        onchange(newValue);
      },
    );
  }

  static BoxShadow box_shadow() {
    return BoxShadow(
      color: Colors.grey.withOpacity(0.2),
      spreadRadius: 2,
      blurRadius: 10,
      offset: const Offset(0, 5.0), // changes position of shadow
    );
  }

  static Widget noData = Center(
    child: Text("No data"),
  );

  static Widget noMoreData = const Center(
    child: Text("No more data"),
  );

  static Widget circularIndicator = Center(
    child: CircularProgressIndicator(
      color: Colors.grey,
    ),
  );

  static Widget divider = Divider(
    thickness: 1,
    color: Colors.white.withOpacity(0.50),
  );

  static Widget dialogCrossBtn = IconButton(
    padding: EdgeInsets.zero,
    constraints: const BoxConstraints(),
    onPressed: () => {
      //  LocalCon.popDialog()
    },
    icon: Image.asset(
      'assets/icon/icon_cross.png',
      height: 16,
      width: 16,
    ),
  );
}

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
