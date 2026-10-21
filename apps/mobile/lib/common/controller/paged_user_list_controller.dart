import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Shared paging for the 1.1.0 user lists (visitors, shortlist, daily matches,
/// nearby, saved-search results …). Subclasses only implement [fetchPage];
/// UI binds with `GetBuilder<YourController>` and reads [users], [isLoading],
/// [isLoadingMore], [hasMore] and attaches [scrollController] to the list.
///
/// ```dart
/// class ShortlistController extends PagedUserListController {
///   @override
///   void fetchPage(int page, void Function(List<User> users) done) {
///     UserService.shared.fetchShortlistedUsers(page: page, completion: done);
///   }
/// }
/// ```
/// [fetchPage] implementations must ALWAYS call `done` (pass `[]` on failure),
/// otherwise the loading flags never reset.
abstract class PagedUserListController extends BaseController {
  final List<User> users = [];

  /// Last page requested (1-based).
  int page = 1;
  bool hasMore = true;
  bool isLoadingMore = false;

  /// A page shorter than this means there is nothing more to load.
  int pageSize = Limits.pagination;

  final ScrollController scrollController = ScrollController();

  /// Bumped on every [loadFirst] so late responses from an older request
  /// (e.g. after a segment/filter change) are ignored.
  int _generation = 0;

  /// Loads page [page] and hands the rows to [done] exactly once.
  void fetchPage(int page, void Function(List<User> users) done);

  /// Set false to manage loading manually (e.g. after a permission prompt).
  bool get loadOnInit => true;

  @override
  void onInit() {
    super.onInit();
    scrollController.addListener(_onScroll);
    if (loadOnInit) loadFirst();
  }

  void _onScroll() {
    if (!scrollController.hasClients) return;
    final position = scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 120) {
      loadMore();
    }
  }

  /// (Re)loads from page 1, replacing [users]. The future completes when the
  /// first page arrives, so it can back a `RefreshIndicator`.
  Future<void> loadFirst() {
    final completer = Completer<void>();
    final generation = ++_generation;
    page = 1;
    hasMore = true;
    isLoadingMore = false;
    isLoading.value = true;
    update();
    fetchPage(1, (rows) {
      if (!completer.isCompleted) completer.complete();
      if (generation != _generation) return;
      users
        ..clear()
        ..addAll(rows);
      hasMore = rows.length >= pageSize;
      isLoading.value = false;
      update();
    });
    return completer.future;
  }

  /// Loads the next page when not already loading and more rows may exist.
  void loadMore() {
    if (isLoadingMore || !hasMore || isLoading.value) return;
    final generation = _generation;
    final nextPage = page + 1;
    isLoadingMore = true;
    update();
    fetchPage(nextPage, (rows) {
      if (generation != _generation) return;
      if (rows.isEmpty) {
        hasMore = false;
      } else {
        page = nextPage;
        users.addAll(rows);
        hasMore = rows.length >= pageSize;
      }
      isLoadingMore = false;
      update();
    });
  }

  /// Removes a user locally (e.g. after un-shortlisting or blocking).
  void removeUser(String? userId) {
    if (userId == null) return;
    users.removeWhere((u) => u.id == userId);
    update();
  }

  @override
  void onClose() {
    scrollController.removeListener(_onScroll);
    scrollController.dispose();
    super.onClose();
  }
}
