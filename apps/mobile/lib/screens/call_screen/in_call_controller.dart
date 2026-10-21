import 'dart:async';

import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/call_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/call_manager.dart';
import 'package:banjaramatch/localization/features/call_strings.dart';
import 'package:banjaramatch/models/call_session.dart';

/// Live call: owns the Agora [RtcEngine] (init → join → leave → release),
/// mute / speaker / camera controls and the call timer. Ends on the hang-up
/// button, `call_end` / `call_timeout` from the server, or the remote user
/// leaving the channel (`onUserOffline`).
class InCallController extends BaseController {
  InCallController({required this.session}) : speakerOn = session.isVideo;

  /// GetBuilder id of the timer text (ticks rebuild only that text, never
  /// the video views).
  static const String timerId = 'call_timer';

  final CallSession session;

  /// The route showing this screen (set by the screen on first build).
  Route<dynamic>? route;

  RtcEngine? engine;

  /// Local camera preview (video calls) and the remote user's video.
  VideoViewController? localView;
  VideoViewController? remoteView;

  bool joined = false;
  int? remoteUid;
  bool muted = false;
  bool speakerOn;
  bool cameraOff = false;

  /// Seconds since the other person joined the channel.
  int seconds = 0;

  bool _done = false;
  bool _closed = false;
  bool _renewing = false;
  Timer? _ticker;
  Timer? _connectTimer;

  bool get isVideo => session.isVideo;

  String get channelName => session.token?.channelName ?? session.channelName ?? '';

  /// mm:ss (h:mm:ss after an hour).
  String get durationText {
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    final mm = m.toString().padLeft(2, '0');
    final ss = s.toString().padLeft(2, '0');
    return h > 0 ? '$h:$mm:$ss' : '$mm:$ss';
  }

  /// Timer once connected, otherwise Connecting… / Waiting….
  String get statusText {
    if (remoteUid != null) return durationText;
    return joined ? CallKeys.waitingForOther.tr : CallKeys.connecting.tr;
  }

  @override
  void onInit() {
    super.onInit();
    final manager = CallManager.shared;
    final token = session.token;
    if (!manager.isCurrent(session) || token == null || !token.isValid) {
      final wasCurrent = manager.isCurrent(session);
      _done = true;
      if (wasCurrent) manager.hangUp(session);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        manager.showMessage(wasCurrent ? CallKeys.failed.tr : CallKeys.callEnded.tr);
        _close();
      });
      return;
    }
    manager.attachSignals(this, _onSignal);
    // The other side has 40 s to show up in the channel.
    _connectTimer = Timer(const Duration(seconds: 40), () {
      if (remoteUid == null) _endWith(CallKeys.failed.tr, hangUp: true);
    });
    _initEngine();
  }

  Future<void> _initEngine() async {
    final token = session.token!;
    RtcEngine? created;
    try {
      final e = createAgoraRtcEngine();
      created = e;
      await e.initialize(RtcEngineContext(
        appId: token.appId,
        channelProfile: ChannelProfileType.channelProfileCommunication,
      ));
      if (_closed) {
        await _releaseEngine(e);
        return;
      }
      e.registerEventHandler(RtcEngineEventHandler(
        onJoinChannelSuccess: (connection, elapsed) {
          if (_closed) return;
          joined = true;
          _quietly(engine?.setEnableSpeakerphone(speakerOn));
          if (muted) _quietly(engine?.muteLocalAudioStream(true));
          if (cameraOff) {
            _quietly(engine?.muteLocalVideoStream(true));
            _quietly(engine?.enableLocalVideo(false));
          }
          update();
        },
        onUserJoined: (connection, uid, elapsed) {
          if (_closed || _done) return;
          remoteUid = uid;
          _connectTimer?.cancel();
          final current = engine;
          if (isVideo && current != null) {
            remoteView = VideoViewController.remote(
              rtcEngine: current,
              canvas: VideoCanvas(uid: uid),
              connection: RtcConnection(channelId: channelName),
            );
          }
          _ticker ??= Timer.periodic(const Duration(seconds: 1), (_) {
            seconds++;
            update([timerId]);
          });
          update();
        },
        onUserOffline: (connection, uid, reason) {
          if (_closed || _done) return;
          if (remoteUid == null || uid == remoteUid) {
            _endWith(CallKeys.callEnded.tr, hangUp: true);
          }
        },
        onError: (err, msg) {
          debugPrint('[Call] Agora error $err $msg');
        },
        onTokenPrivilegeWillExpire: (connection, expiringToken) {
          _renewToken();
        },
      ));
      if (isVideo) {
        await e.enableVideo();
        await e.startPreview();
      }
      if (_closed) {
        await _releaseEngine(e);
        return;
      }
      engine = e;
      if (isVideo) {
        localView = VideoViewController(rtcEngine: e, canvas: VideoCanvas(uid: 0));
      }
      update();
      await e.joinChannel(
        token: token.token,
        channelId: token.channelName,
        uid: token.uid,
        options: ChannelMediaOptions(
          clientRoleType: ClientRoleType.clientRoleBroadcaster,
          channelProfile: ChannelProfileType.channelProfileCommunication,
        ),
      );
    } catch (err) {
      debugPrint('[Call] engine start failed: $err');
      if (created != null && !identical(created, engine)) {
        await _releaseEngine(created);
      }
      _endWith(CallKeys.failed.tr, hangUp: true);
    }
  }

  /// Tokens live 1 h; the API mints a new one while the call is accepted.
  void _renewToken() {
    if (_renewing || _done) return;
    final channel = channelName;
    if (channel.isEmpty) return;
    _renewing = true;
    CallService.shared.fetchToken(
      channelName: channel,
      peerUserId: session.peerUserId ?? '',
      completion: (token) {
        _renewing = false;
        if (_closed) return;
        session.token = token;
        _quietly(engine?.renewToken(token.token));
      },
      onError: (message) {
        _renewing = false;
        debugPrint('[Call] token renew failed: $message');
      },
    );
  }

  void _onSignal(String event, Map<String, dynamic> data) {
    if (_done) return;
    if (event == 'call_end' || event == 'call_timeout') {
      _endWith(CallKeys.callEnded.tr);
    }
  }

  // ─── Controls ────────────────────────────────────────────────────────────

  void toggleMute() {
    muted = !muted;
    _quietly(engine?.muteLocalAudioStream(muted));
    update();
  }

  void toggleSpeaker() {
    speakerOn = !speakerOn;
    if (joined) _quietly(engine?.setEnableSpeakerphone(speakerOn));
    update();
  }

  void switchCamera() {
    if (cameraOff) return;
    _quietly(engine?.switchCamera());
  }

  void toggleCamera() {
    cameraOff = !cameraOff;
    // Stop sending AND stop capturing, so the camera light goes off too.
    _quietly(engine?.muteLocalVideoStream(cameraOff));
    _quietly(engine?.enableLocalVideo(!cameraOff));
    update();
  }

  /// Red hang-up button.
  void endCall() => _endWith(null, hangUp: true);

  // ─── Teardown ────────────────────────────────────────────────────────────

  void _endWith(String? message, {bool hangUp = false}) {
    if (_done) return;
    _done = true;
    _ticker?.cancel();
    _connectTimer?.cancel();
    final manager = CallManager.shared;
    if (hangUp) {
      manager.hangUp(session);
    } else {
      manager.finish(session);
    }
    // Leave right away so the other side sees us go; release() runs in
    // onClose once the video views are gone.
    _quietly(engine?.leaveChannel());
    if (message != null) manager.showMessage(message);
    _close();
  }

  void _close() {
    if (isClosed) return;
    CallManager.shared.closeCallRoute(route);
  }

  /// Fire-and-forget engine call; async Agora errors are logged, never thrown.
  void _quietly(Future<void>? future) {
    future?.catchError((Object error) {
      debugPrint('[Call] Agora call failed: $error');
    });
  }

  Future<void> _releaseEngine(RtcEngine e) async {
    try {
      await e.leaveChannel();
    } catch (_) {}
    try {
      await e.release();
    } catch (_) {}
  }

  @override
  void onClose() {
    _closed = true;
    _ticker?.cancel();
    _connectTimer?.cancel();
    final manager = CallManager.shared;
    manager.detachSignals(this);
    if (!_done && manager.isCurrent(session)) {
      _done = true;
      manager.hangUp(session);
    }
    final e = engine;
    engine = null;
    localView = null;
    remoteView = null;
    if (e != null) _releaseEngine(e);
    super.onClose();
  }
}
