import 'package:flutter/material.dart';
import 'package:banjaramatch/utilities/const.dart';

class MySearchBar extends StatelessWidget {
  final TextEditingController controller;
  final Function(String text)? onChange;

  const MySearchBar({Key? key, required this.controller, this.onChange}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(10.0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(100),
        child: Container(
          color: cLightBg,
          padding: const EdgeInsets.only(right: 15, left: 5),
          child: Row(
            children: [],
          ),
        ),
      ),
    );
  }
}
