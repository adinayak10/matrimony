import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/common/empty_state.dart';
import 'package:banjaramatch/screens/common/profile_tile_row.dart';
import 'package:banjaramatch/screens/common/segment_bar.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/setting_screen/feature_app_bar.dart';
import 'package:banjaramatch/screens/visitors_screen/user_list_support.dart';
import 'package:banjaramatch/screens/visitors_screen/visitors_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Who viewed me / whom I viewed / mutual views.
class VisitorsScreen extends StatefulWidget {
  const VisitorsScreen({super.key, this.initialSegment = 0});

  /// 0 they viewed me, 1 I viewed, 2 mutual.
  final int initialSegment;

  @override
  State<VisitorsScreen> createState() => _VisitorsScreenState();
}

class _VisitorsScreenState extends State<VisitorsScreen> {
  final String _tag = 'visitors_${DateTime.now().microsecondsSinceEpoch}';
  late final VisitorsController controller =
      Get.put(VisitorsController(initialSegment: widget.initialSegment), tag: _tag);

  @override
  void dispose() {
    Get.delete<VisitorsController>(tag: _tag);
    super.dispose();
  }

  static String? visitedLine(User user, int segment) {
    final raw = user.lastVisitedAt;
    if (raw == null || raw.isEmpty) return null;
    final date = DateTime.tryParse(raw);
    if (date == null) return null;
    final ago = timeago.format(date.toLocal());
    final key = segment == 1 ? AppKeys.youViewedAgo : AppKeys.viewedYouAgo;
    return key.trParams({'time': ago});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cBackground,
      appBar: featureAppBar(AppKeys.visitorsTitle.tr),
      body: GetBuilder<VisitorsController>(
        tag: _tag,
        builder: (c) {
          return Column(
            children: [
              const SizedBox(height: 12),
              SoftSegmentBar(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                items: [
                  SegmentItem(label: AppKeys.visitorsTheyViewed.tr, icon: Icons.visibility_rounded),
                  SegmentItem(label: AppKeys.visitorsIViewed.tr, icon: Icons.history_rounded),
                  SegmentItem(label: AppKeys.visitorsMutual.tr, icon: Icons.sync_alt_rounded),
                ],
                selectedIndex: c.segment,
                onChanged: c.changeSegment,
              ),
              const SizedBox(height: 8),
              Expanded(
                child: PagedUserListBody(
                  controller: c,
                  empty: EmptyState(
                    icon: Icons.visibility_outlined,
                    title: AppKeys.visitorsEmptyTitle.tr,
                    message: AppKeys.visitorsEmptyMessage.tr,
                  ),
                  itemBuilder: (context, user) => ProfileTileRow(
                    user: user,
                    subtitle: visitedLine(user, c.segment),
                    onTap: () {
                      final id = user.id;
                      if (id != null) Get.to(() => ProfileScreen(userId: id));
                    },
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
