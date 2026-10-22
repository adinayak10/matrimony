import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/screens/common/empty_state.dart';
import 'package:banjaramatch/screens/common/profile_tile_row.dart';
import 'package:banjaramatch/screens/common/segment_bar.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/setting_screen/feature_app_bar.dart';
import 'package:banjaramatch/screens/shortlist_screen/shortlist_controller.dart';
import 'package:banjaramatch/screens/visitors_screen/user_list_support.dart';
import 'package:banjaramatch/utilities/const.dart';

/// My shortlist / members who shortlisted me.
class ShortlistScreen extends StatefulWidget {
  const ShortlistScreen({super.key, this.initialSegment = 0});

  /// 0 my shortlist, 1 shortlisted me.
  final int initialSegment;

  @override
  State<ShortlistScreen> createState() => _ShortlistScreenState();
}

class _ShortlistScreenState extends State<ShortlistScreen> {
  final String _tag = 'shortlist_${DateTime.now().microsecondsSinceEpoch}';
  late final ShortlistController controller =
      Get.put(ShortlistController(initialSegment: widget.initialSegment), tag: _tag);

  @override
  void dispose() {
    Get.delete<ShortlistController>(tag: _tag);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cBackground,
      appBar: featureAppBar(AppKeys.shortlistTitle.tr),
      body: GetBuilder<ShortlistController>(
        tag: _tag,
        init: controller,
        builder: (c) {
          return Column(
            children: [
              const SizedBox(height: 12),
              SoftSegmentBar(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                items: [
                  SegmentItem(label: AppKeys.shortlistMine.tr, icon: Icons.bookmark_rounded),
                  SegmentItem(label: AppKeys.shortlistedMe.tr, icon: Icons.favorite_rounded),
                ],
                selectedIndex: c.segment,
                onChanged: c.changeSegment,
              ),
              const SizedBox(height: 8),
              Expanded(
                child: PagedUserListBody(
                  controller: c,
                  empty: EmptyState(
                    icon: c.isMine ? Icons.bookmark_border_rounded : Icons.favorite_border_rounded,
                    title: c.isMine ? AppKeys.shortlistMineEmptyTitle.tr : AppKeys.shortlistedMeEmptyTitle.tr,
                    message: c.isMine ? AppKeys.shortlistMineEmptyMessage.tr : AppKeys.shortlistedMeEmptyMessage.tr,
                  ),
                  itemBuilder: (context, user) => ProfileTileRow(
                    user: user,
                    onTap: () {
                      final id = user.id;
                      if (id != null) Get.to(() => ProfileScreen(userId: id));
                    },
                    trailing: c.isMine
                        ? IconButton(
                            tooltip: AppKeys.shortlistRemove.tr,
                            icon: const Icon(Icons.bookmark_remove_rounded, color: cPrimary),
                            onPressed: () => c.removeFromShortlist(user),
                          )
                        : null,
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
