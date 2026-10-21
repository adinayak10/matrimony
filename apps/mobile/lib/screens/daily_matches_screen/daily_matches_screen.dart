import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/paged_user_list_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/common/empty_state.dart';
import 'package:banjaramatch/screens/common/profile_tile_row.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/setting_screen/feature_app_bar.dart';
import 'package:banjaramatch/screens/visitors_screen/user_list_support.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Today's ranked matches (`getTopDailyMatches`, one list, not paged).
class DailyMatchesController extends PagedUserListController {
  @override
  void fetchPage(int page, void Function(List<User> users) done) {
    UserService.shared.getTopDailyMatches(page: page, completion: done);
  }
}

class DailyMatchesScreen extends StatefulWidget {
  const DailyMatchesScreen({super.key});

  /// API `matchedOn` words → translation keys (unknown reasons show as sent).
  static const Map<String, String> _reasonKeys = {
    'age match': AppKeys.reasonAge,
    'caste match': AppKeys.reasonCaste,
    'qualification': AppKeys.reasonQualification,
    'profession': AppKeys.reasonProfession,
    'income': AppKeys.reasonIncome,
    'same city': AppKeys.reasonSameCity,
    'shared interests': AppKeys.reasonSharedInterests,
  };

  static String reasonLabel(String reason) {
    final key = _reasonKeys[reason.trim().toLowerCase()];
    return key != null ? key.tr : reason;
  }

  /// Small pill for one `matchedOn` reason (e.g. "caste match").
  static Widget reasonChip(String reason) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: cGreen.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(reasonLabel(reason), style: MyTextStyle.gilroyMedium(size: 11, color: cGreen)),
    );
  }

  @override
  State<DailyMatchesScreen> createState() => _DailyMatchesScreenState();
}

class _DailyMatchesScreenState extends State<DailyMatchesScreen> {
  final String _tag = 'daily_${DateTime.now().microsecondsSinceEpoch}';
  late final DailyMatchesController controller = Get.put(DailyMatchesController(), tag: _tag);

  @override
  void dispose() {
    Get.delete<DailyMatchesController>(tag: _tag);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cBackground,
      appBar: featureAppBar(AppKeys.dailyMatchesTitle.tr),
      body: GetBuilder<DailyMatchesController>(
        tag: _tag,
        builder: (c) {
          return PagedUserListBody(
            controller: c,
            header: Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 6),
              child: Text(
                AppKeys.dailyMatchesSubtitle.tr,
                style: MyTextStyle.gilroyMedium(size: 13, color: cLightText),
              ),
            ),
            empty: EmptyState(
              icon: Icons.auto_awesome_rounded,
              title: AppKeys.dailyMatchesEmptyTitle.tr,
              message: AppKeys.dailyMatchesEmptyMessage.tr,
            ),
            itemBuilder: (context, user) => ProfileTileRow(
              user: user,
              chips: (user.matchedOn ?? const <String>[])
                  .where((reason) => reason.trim().isNotEmpty)
                  .take(3)
                  .map(DailyMatchesScreen.reasonChip)
                  .toList(),
              onTap: () {
                final id = user.id;
                if (id != null) Get.to(() => ProfileScreen(userId: id));
              },
            ),
          );
        },
      ),
    );
  }
}
