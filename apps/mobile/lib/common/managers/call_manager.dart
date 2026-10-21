import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/features/call_strings.dart';
import 'package:banjaramatch/models/call_session.dart';
import 'package:banjaramatch/models/model_chat_room_list.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/call_screen/incoming_call_screen.dart';
import 'package:banjaramatch/screens/call_screen/outgoing_call_screen.dart';
import 'package:banjaramatch/screens/chats_screen/socketservice.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Signature of the per-call socket event handler a call screen attaches.
/// [event] is one of [SocketService.callEvents]; [data] is the payload map.
typedef CallSignalHandler = void Function(String event, Map<String, dynamic> data);

/// App-wide owner of the (single) live call.
///
/// Flow (server: apps/api/socket.js):
/// * caller: [startCall] → permissions → `call_invite` (sent by the outgoing
///   screen) → `call_ringing` → `call_accepted` → token → `InCallScreen`.
/// * callee: `call_incoming` ([bindIncoming]) or an FCM `type:'call'` push
///   ([handlePushCall]) → [IncomingCallScreen] → `call_accept` → token → in-call.
///
/// The per-call socket listeners are registered here once per session and
/// forwarded to whichever call screen is attached ([attachSignals]); screens
/// never remove socket listeners themselves, so the outgoing → in-call
/// hand-over cannot drop the in-call handlers.
class CallManager {
  static final CallManager shared = CallManager._internal();

  CallManager._internal();

  static const String routeOutgoing = '/call_outgoing';
  static const String routeIncoming = '/call_incoming';
  static const String routeInCall = '/call_in_progress';

  CallSession? _active;
  DateTime _activeSince = DateTime.now();

  Object? _signalOwner;
  CallSignalHandler? _signalHandler;

  /// The socket instance the per-call listeners were registered on
  /// (SocketService recreates the socket on every connect).
  Object? _boundSocket;

  /// Caller hung up before `call_ringing` delivered the callId: end it as
  /// soon as the id arrives.
  bool _cancelBeforeRinging = false;

  /// [startCall] is between its first check and opening the outgoing screen.
  bool _starting = false;

  /// The live call, if any.
  CallSession? get activeSession => _active;

  bool get isInCall => _active != null;

  /// True while [session] is the live call.
  bool isCurrent(CallSession session) => identical(_active, session);

  // ─── Public API ──────────────────────────────────────────────────────────

  /// Registers the app-wide `call_incoming` listener. Called from
  /// `SocketService.startCommonListening()` right after the socket connects.
  void bindIncoming() {
    SocketService.shared.onCallIncoming((data) => _onIncoming(jsonMapOf(data)));
    // A session that is ringing while the socket was recreated keeps its
    // per-call listeners.
    if (_active != null) _ensureCallEventsBound(force: true);
  }

  /// Starts a call to the other participant of an ACCEPTED chat room.
  /// [callType] is `audio` or `video`.
  Future<void> startCall({required ChatRoom room, required String callType}) async {
    if (_starting) return; // double tap while permissions are pending
    _starting = true;
    try {
      await _startCall(room, callType);
    } finally {
      _starting = false;
    }
  }

  Future<void> _startCall(ChatRoom room, String callType) async {
    final type = callType == 'video' ? 'video' : 'audio';
    if (_hasLiveSession() || _cancelBeforeRinging) {
      showMessage(CallKeys.alreadyInCall.tr);
      return;
    }
    if (room.status != null && room.status != 'accepted') {
      showMessage(CallKeys.notConnected.tr);
      return;
    }
    final myId = SessionManager.shared.getUserID();
    String? peerId = room.userId;
    if (peerId == null || peerId.isEmpty) {
      final others = (room.participants ?? const <String>[]).where((p) => p.isNotEmpty && p != myId).toList();
      peerId = others.isNotEmpty ? others.first : null;
    }
    final roomId = room.roomId;
    if (peerId == null || peerId.isEmpty || roomId == null || roomId.isEmpty) {
      showMessage(CallKeys.notConnected.tr);
      return;
    }

    if (!await ensurePermissions(type)) return;
    if (!await waitForSocket()) {
      showMessage(CallKeys.noInternet.tr);
      return;
    }
    // Permission dialogs are async: re-check that no call arrived meanwhile.
    if (_hasLiveSession() || _cancelBeforeRinging) {
      showMessage(CallKeys.alreadyInCall.tr);
      return;
    }

    final session = CallSession(
      roomId: roomId,
      callType: type,
      peerUserId: peerId,
      peerName: room.fullName,
      peerProfile: room.profile,
      isCaller: true,
    );
    _setActive(session);
    _ensureCallEventsBound(force: true);
    final page = OutgoingCallScreen(session: session);
    Get.to(() => page, routeName: routeOutgoing, preventDuplicates: false);
  }

  /// Calls [user] (e.g. from call history): looks up the chat room with
  /// `UserService.fetchChatRoom` and calls [startCall] when it is accepted.
  Future<void> startCallWithUser(User user, {required String callType}) async {
    final userId = user.id;
    if (userId == null || userId.isEmpty) {
      showMessage(CallKeys.failed.tr);
      return;
    }
    if (_hasLiveSession()) {
      showMessage(CallKeys.alreadyInCall.tr);
      return;
    }
    final completer = Completer<ChatRoom?>();
    UserService.shared.fetchChatRoom(userId, (room) {
      if (!completer.isCompleted) completer.complete(room);
    });
    // fetchChatRoom only calls back on success (and not when no room exists).
    final room = await completer.future.timeout(const Duration(seconds: 12), onTimeout: () => null);
    if (room == null || room.status != 'accepted') {
      showMessage(CallKeys.notConnected.tr);
      return;
    }
    if (room.userId == null || room.userId!.isEmpty) room.userId = userId;
    if (room.fullName == null || room.fullName!.isEmpty) room.fullName = user.fullName;
    if (room.profile == null || room.profile!.isEmpty) room.profile = user.profile;
    await startCall(room: room, callType: callType);
  }

  /// FCM data push with `type:'call'` (same keys as `call_incoming`), routed
  /// here by the notification router (foreground message or tap).
  void handlePushCall(Map<String, dynamic> data) {
    if (SessionManager.shared.getUserID().isEmpty) return;
    final clean = <String, dynamic>{};
    data.forEach((key, value) {
      if (value == null) return;
      final text = value.toString();
      if (text.isEmpty || text == 'null') return;
      clean[key] = value;
    });
    if (clean['callId'] == null) return;
    _onIncoming(clean);
  }

  // ─── Session bookkeeping (used by the call screens) ──────────────────────

  /// The screen that currently handles per-call socket events.
  void attachSignals(Object owner, CallSignalHandler handler) {
    _signalOwner = owner;
    _signalHandler = handler;
    _ensureCallEventsBound();
  }

  void detachSignals(Object owner) {
    if (!identical(_signalOwner, owner)) return;
    _signalOwner = null;
    _signalHandler = null;
  }

  /// Ends [session] locally (no socket emit) and drops the per-call listeners.
  void finish(CallSession session) {
    if (!identical(_active, session)) return;
    _active = null;
    _signalOwner = null;
    _signalHandler = null;
    if (!_cancelBeforeRinging) {
      SocketService.shared.offCallEvents();
      _boundSocket = null;
    }
  }

  /// Hangs up / cancels [session]: emits `call_end` (or defers it until the
  /// callId arrives) and finishes the session.
  void hangUp(CallSession session) {
    if (!identical(_active, session)) return;
    final callId = session.callId;
    if (callId != null && callId.isNotEmpty) {
      SocketService.shared.emitCallEnd(callId);
    } else if (session.isCaller) {
      // Still waiting for call_ringing: keep listening for it to cancel.
      _cancelBeforeRinging = true;
      _ensureCallEventsBound();
      Future.delayed(const Duration(seconds: 15), () {
        if (_cancelBeforeRinging && _active == null) {
          _cancelBeforeRinging = false;
          SocketService.shared.offCallEvents();
          _boundSocket = null;
        }
      });
    }
    finish(session);
  }

  /// Declines an incoming [session] (`call_reject`).
  void decline(CallSession session) {
    if (!identical(_active, session)) return;
    final callId = session.callId;
    if (callId != null && callId.isNotEmpty) SocketService.shared.emitCallReject(callId);
    finish(session);
  }

  /// (Re)registers the per-call listeners when the socket exists. Call before
  /// emitting `call_accept` so a socket created after a cold push is covered.
  void ensureCallEventsBound() => _ensureCallEventsBound();

  // ─── Navigation helpers for the call screens ─────────────────────────────

  /// Replaces the call screen [current] with [page] (outgoing/incoming → in-call).
  void replaceCallRoute(Route<dynamic>? current, Widget page) {
    if (current != null && current.isActive && !current.isCurrent) {
      Get.to(() => page, routeName: routeInCall, preventDuplicates: false);
      current.navigator?.removeRoute(current);
    } else {
      Get.off(() => page, routeName: routeInCall, preventDuplicates: false);
    }
  }

  /// Closes the call screen [route] wherever it is in the stack.
  void closeCallRoute(Route<dynamic>? route) {
    if (route == null) {
      Get.back();
      return;
    }
    if (!route.isActive) return;
    if (route.isCurrent) {
      route.navigator?.pop();
    } else {
      route.navigator?.removeRoute(route);
    }
  }

  // ─── Permissions / connectivity ──────────────────────────────────────────

  /// Microphone (+ camera for video). Shows a snackbar with a Settings action
  /// when denied. Returns true when everything is granted.
  Future<bool> ensurePermissions(String callType) async {
    final isVideo = callType == 'video';
    final permissions = <Permission>[Permission.microphone, if (isVideo) Permission.camera];
    try {
      final statuses = await permissions.request();
      final granted = permissions.every((p) => statuses[p]?.isGranted ?? false);
      if (granted) return true;
    } catch (e) {
      debugPrint('[Call] permission request failed: $e');
    }
    showMessage(isVideo ? CallKeys.cameraPermission.tr : CallKeys.micPermission.tr, settingsAction: true);
    return false;
  }

  /// Waits (up to [timeout]) until the signalling socket is connected.
  Future<bool> waitForSocket({Duration timeout = const Duration(seconds: 10)}) async {
    final deadline = DateTime.now().add(timeout);
    while (!SocketService.shared.isConnected) {
      if (DateTime.now().isAfter(deadline)) return false;
      await Future.delayed(const Duration(milliseconds: 250));
    }
    return true;
  }

  /// Snackbar on the root messenger (optionally with an "open settings" action).
  void showMessage(String text, {bool settingsAction = false, bool error = true}) {
    final context = Get.context;
    if (context == null) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(text, style: MyTextStyle.gilroySemiBold(size: 15, color: cWhite)),
        backgroundColor: error ? cBlack : cGreen,
        duration: Duration(milliseconds: settingsAction ? 5000 : 3000),
        behavior: SnackBarBehavior.fixed,
        action: settingsAction
            ? SnackBarAction(
                label: CallKeys.openSettings.tr,
                textColor: cPulsing,
                onPressed: () {
                  openAppSettings();
                },
              )
            : null,
      ),
    );
  }

  /// Friendly text for a token error (503 = Agora not configured).
  String tokenErrorText(String serverMessage) {
    final lower = serverMessage.toLowerCase();
    if (lower.contains('not configured')) return CallKeys.unavailable.tr;
    if (lower.contains('accepted connections')) return CallKeys.notConnected.tr;
    if (lower.contains('internet') || lower.contains('timeout')) return CallKeys.noInternet.tr;
    return CallKeys.failed.tr;
  }

  /// Text for a `call_failed {reason}` payload.
  String failedReasonText(Map<String, dynamic> data) {
    switch (data['reason']?.toString()) {
      case 'busy':
        return CallKeys.busy.tr;
      case 'offline':
        return CallKeys.offline.tr;
      case 'not_connected':
        return CallKeys.notConnected.tr;
    }
    return CallKeys.failed.tr;
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  static Map<String, dynamic> jsonMapOf(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return data.map((key, value) => MapEntry(key.toString(), value));
    return <String, dynamic>{};
  }

  void _setActive(CallSession session) {
    _active = session;
    _activeSince = DateTime.now();
    _signalOwner = null;
    _signalHandler = null;
  }

  /// A session with no screen attached for a while is a leftover (e.g. its
  /// screen never opened); it must not block new calls forever.
  bool _hasLiveSession() {
    final active = _active;
    if (active == null) return false;
    if (_signalOwner == null && DateTime.now().difference(_activeSince) > const Duration(seconds: 5)) {
      _active = null;
      return false;
    }
    return true;
  }

  void _onIncoming(Map<String, dynamic> data) {
    final session = CallSession.fromIncoming(data);
    final callId = session.callId;
    if (callId == null || callId.isEmpty) return;
    final active = _active;
    if (active != null && active.callId == callId) return; // socket + push duplicate
    if (_hasLiveSession()) {
      // Only one call at a time: tell the server we cannot take this one.
      SocketService.shared.emitCallReject(callId);
      return;
    }
    _setActive(session);
    _ensureCallEventsBound(force: true);
    final page = IncomingCallScreen(session: session);
    Get.to(() => page, routeName: routeIncoming, preventDuplicates: false);
  }

  void _ensureCallEventsBound({bool force = false}) {
    final socketService = SocketService.shared;
    if (!socketService.hasSocket) return;
    final socket = socketService.socket;
    if (!force && identical(socket, _boundSocket)) return;
    _boundSocket = socket;
    socketService.onCallRinging((data) => _dispatch('call_ringing', data));
    socketService.onCallAccepted((data) => _dispatch('call_accepted', data));
    socketService.onCallRejected((data) => _dispatch('call_rejected', data));
    socketService.onCallEnd((data) => _dispatch('call_end', data));
    socketService.onCallTimeout((data) => _dispatch('call_timeout', data));
    socketService.onCallFailed((data) => _dispatch('call_failed', data));
  }

  void _dispatch(String event, dynamic raw) {
    final data = jsonMapOf(raw);

    if (event == 'call_ringing' && _cancelBeforeRinging) {
      // The call cancelled before its id arrived finally got one: end it on
      // the server. (startCall refuses new calls while this is pending, so
      // this ringing cannot belong to another call.)
      _cancelBeforeRinging = false;
      final id = data['callId']?.toString();
      if (id != null && id.isNotEmpty) SocketService.shared.emitCallEnd(id);
      if (_active == null) {
        SocketService.shared.offCallEvents();
        _boundSocket = null;
      }
      return;
    }

    final session = _active;
    if (session == null) return;
    if (!session.matches(data)) return;
    if (event == 'call_ringing' || event == 'call_accepted') {
      session.applyServerEvent(data);
    }
    final handler = _signalHandler;
    if (handler != null) {
      handler(event, data);
      return;
    }
    // No screen attached (hand-over between screens): terminal events still
    // end the session; the next screen sees it is no longer current and closes.
    if (event == 'call_end' || event == 'call_timeout' || event == 'call_rejected' || event == 'call_failed') {
      finish(session);
    }
  }
}
