import 'package:flutter/material.dart';
import 'package:banjaramatch/common/extensions/image_extension.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/screens/extra_views/logo_tag.dart';
import 'package:banjaramatch/screens/notification_screen/notification_screen.dart';
import 'package:banjaramatch/screens/search_screen/search_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

class FeedScreenTopBar extends StatelessWidget {
  const FeedScreenTopBar({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    double imageSize = 25;
    return Container(
      color: cBG,
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            GestureDetector(
              onTap: () {
                Navigate.to(const NotificationScreen());
              },
              child: Image.asset(
                MyImages.bell,
                width: imageSize,
                height: imageSize,
              ),
            ),
            const LogoTag(),
            GestureDetector(
              onTap: () {
                Navigate.to(const SearchScreen());
              },
              child: Image.asset(
                MyImages.search,
                width: imageSize,
                height: imageSize,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
