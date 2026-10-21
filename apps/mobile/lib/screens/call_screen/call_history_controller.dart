import 'dart:async';

import 'package:flutter/material.dart';
import 'package:banjaramatch/common/api_service/call_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/call_manager.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/models/call_log_model.dart';
import 'package:banjaramatch/models/registration.dart';

/// Paged `GET /api/calls/history` (newest first) with pull-to-refresh and
/// infinite scroll.
class CallHistoryController extends BaseController {
  static const int pageSize = 20;

  final ScrollController scrollController = ScrollController();

  List<CallLog> calls = [];
  bool loading = false;

  /// True until the first page (or its error) arrived.
  bool firstLoad = true;
  String? error;

  int _nextPage = 1;
  bool _hasMore = true;

  /// Bumped on every reload so late responses of an older load are dropped.
  int _generation = 0;

  String get myUserId => SessionManager.shared.getUserID();

  @override
  void onInit() {
    super.onInit();
    scrollController.addListener(_onScroll);
    reload();
  }

  void _onScroll() {
    if (!scrollController.hasClients) return;
    final position = scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 200) loadMore();
  }

  /// First page again (pull-to-refresh / retry).
  Future<void> reload() {
    _generation++;
    _nextPage = 1;
    _hasMore = true;
    loading = false;
    return _load(reset: true);
  }

  void loadMore() {
    if (loading || !_hasMore || firstLoad) return;
    _load(reset: false);
  }

  Future<void> _load({required bool reset}) {
    final completer = Completer<void>();
    final generation = _generation;
    loading = true;
    if (reset) error = null;
    update();
    CallService.shared.fetchHistory(
      page: _nextPage,
      limit: pageSize,
      completion: (page) {
        if (generation == _generation && !isClosed) {
          calls = reset ? List<CallLog>.from(page.calls) : [...calls, ...page.calls];
          _hasMore = page.hasMore && page.calls.isNotEmpty;
          _nextPage = page.page + 1;
          loading = false;
          firstLoad = false;
          error = null;
          update();
        }
        if (!completer.isCompleted) completer.complete();
      },
      onError: (message) {
        if (generation == _generation && !isClosed) {
          loading = false;
          firstLoad = false;
          if (reset || calls.isEmpty) error = message;
          update();
        }
        if (!completer.isCompleted) completer.complete();
      },
    );
    return completer.future;
  }

  /// Calls the other person again with the same call type (only works while
  /// the chat room is still accepted; CallManager says so otherwise).
  void callBack(CallLog log) {
    final other = log.otherParty(myUserId);
    final id = other?.id;
    if (id == null || id.isEmpty) return;
    CallManager.shared.startCallWithUser(
      User(id: id, fullName: other?.fullName, profile: other?.profile),
      callType: log.isVideo ? 'video' : 'audio',
    );
  }

  @override
  void onClose() {
    scrollController.removeListener(_onScroll);
    scrollController.dispose();
    super.onClose();
  }
}
