import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/api_service.dart';
import 'package:banjaramatch/common/controller/paged_user_list_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/utilities/const.dart';

/// POSTs [param] to [url] and hands the `data` rows to [done] exactly once.
/// Any failure (network, non-list `data`) yields an empty list and a row that
/// fails to parse is skipped, so [PagedUserListController.fetchPage]
/// implementations can rely on it.
void requestUserRows(String url, Map<String, dynamic> param, void Function(List<User> users) done) {
  var finished = false;
  void finish(List<User> rows) {
    if (finished) return;
    finished = true;
    done(rows);
  }

  ApiService.shared.call(
    url: url,
    param: param,
    completion: (response) {
      final rows = <User>[];
      final data = response is Map ? response['data'] : null;
      if (data is List) {
        for (final raw in data) {
          if (raw is! Map) continue;
          try {
            final row = Map<String, dynamic>.from(raw);
            // `User.distanceKm` is a double; the API rounds and may send 3 (int).
            final distance = row['distanceKm'];
            if (distance is num) row['distanceKm'] = distance.toDouble();
            rows.add(User.fromJson(row));
          } catch (e) {
            print('requestUserRows($url) skipped a row: $e');
          }
        }
      }
      finish(rows);
    },
  );
}

/// Body for a [PagedUserListController] list: first-load spinner, pull to
/// refresh, empty state and a load-more footer. Rebuild it from the screen's
/// `GetBuilder` so it reads the latest controller state.
class PagedUserListBody extends StatelessWidget {
  const PagedUserListBody({
    super.key,
    required this.controller,
    required this.itemBuilder,
    required this.empty,
    this.header,
  });

  final PagedUserListController controller;
  final Widget Function(BuildContext context, User user) itemBuilder;

  /// Shown (scrollable, so pull-to-refresh still works) when there are no rows.
  final Widget empty;

  /// Optional widget scrolled above the rows (e.g. a hint card).
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    final users = controller.users;
    if (controller.isLoading.value && users.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: cPrimary));
    }
    final hasHeader = header != null;
    if (users.isEmpty) {
      return RefreshIndicator(
        color: cPrimary,
        onRefresh: controller.loadFirst,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            if (hasHeader) header!,
            empty,
          ],
        ),
      );
    }
    final offset = hasHeader ? 1 : 0;
    final showFooter = controller.isLoadingMore;
    return RefreshIndicator(
      color: cPrimary,
      onRefresh: controller.loadFirst,
      child: ListView.builder(
        controller: controller.scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(top: 4, bottom: 24),
        itemCount: users.length + offset + (showFooter ? 1 : 0),
        itemBuilder: (context, index) {
          if (hasHeader && index == 0) return header!;
          final i = index - offset;
          if (i >= users.length) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: cPrimary),
                  ),
                  const SizedBox(width: 10),
                  Text(AppKeys.loadingMore.tr, style: MyTextStyle.gilroyMedium(size: 13, color: cLightText)),
                ],
              ),
            );
          }
          return itemBuilder(context, users[i]);
        },
      ),
    );
  }
}
