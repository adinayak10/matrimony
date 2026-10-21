import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/call_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/call_manager.dart';
import 'package:banjaramatch/localization/features/call_strings.dart';
import 'package:banjaramatch/models/call_session.dart';
import 'package:banjaramatch/screens/call_screen/call_widgets.dart';
import 'package:banjaramatch/screens/call_screen/in_call_screen.dart';
import 'package:banjaramatch/screens/chats_screen/socketservice.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Caller side while the call rings: sends `call_invite`, shows Calling… /
/// Ringing…, fetches the Agora token on `call_accepted` and hands over to
/// [InCallScreen]. Cancel → `call_end`.
class OutgoingCallController extends BaseController {
  OutgoingCallController({required this.session});

  final CallSession session;

  /// The route showing this screen (set by the screen on first build).
  Route<dynamic>? route;

  /// CallKeys.* key of the status line.
  String statusKey = CallKeys.calling;

  bool _done = false;
  bool _fetchingToken = false;
  Timer? _safetyTimer;

  @override
  void onInit() {
    super.onInit();
    final manager = CallManager.shared;
    if (!manager.isCurrent(session)) {
      _done = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _close());
      return;
    }
    manager.attachSignals(this, _onSignal);
    SocketService.shared.emitCallInvite(
      toUserId: session.peerUserId ?? '',
      roomId: session.roomId ?? '',
      callType: session.callType,
    );
    // The server times a ringing call out after 45 s (call_timeout); this
    // only covers a lost socket.
    _safetyTimer = Timer(const Duration(seconds: 60), () {
      _endWith(CallKeys.noAnswer.tr, hangUp: true);
    });
  }

  void _onSignal(String event, Map<String, dynamic> data) {
    if (_done) return;
    switch (event) {
      case 'call_ringing':
        statusKey = CallKeys.ringing;
        update();
        break;
      case 'call_accepted':
        _safetyTimer?.cancel();
        statusKey = CallKeys.connecting;
        update();
        _fetchToken();
        break;
      case 'call_rejected':
        _endWith(CallKeys.callDeclined.tr);
        break;
      case 'call_end':
        _endWith(CallKeys.callEnded.tr);
        break;
      case 'call_timeout':
        _endWith(CallKeys.noAnswer.tr);
        break;
      case 'call_failed':
        _endWith(CallManager.shared.failedReasonText(data));
        break;
    }
  }

  void _fetchToken() {
    if (_fetchingToken) return;
    final channelName = session.channelName;
    if (channelName == null || channelName.isEmpty) {
      _endWith(CallKeys.failed.tr, hangUp: true);
      return;
    }
    _fetchingToken = true;
    CallService.shared.fetchToken(
      channelName: channelName,
      peerUserId: session.peerUserId ?? '',
      completion: (token) {
        if (_done || !CallManager.shared.isCurrent(session)) return;
        session.token = token;
        _done = true;
        _safetyTimer?.cancel();
        CallManager.shared.replaceCallRoute(route, InCallScreen(session: session));
      },
      onError: (message) {
        _endWith(CallManager.shared.tokenErrorText(message), hangUp: true);
      },
    );
  }

  /// Cancel button / back gesture.
  void cancel() {
    if (_done) return;
    _done = true;
    _safetyTimer?.cancel();
    CallManager.shared.hangUp(session);
    _close();
  }

  void _endWith(String message, {bool hangUp = false}) {
    if (_done) return;
    _done = true;
    _safetyTimer?.cancel();
    if (hangUp) {
      CallManager.shared.hangUp(session);
    } else {
      CallManager.shared.finish(session);
    }
    CallManager.shared.showMessage(message);
    _close();
  }

  void _close() {
    if (isClosed) return;
    CallManager.shared.closeCallRoute(route);
  }

  @override
  void onClose() {
    _safetyTimer?.cancel();
    CallManager.shared.detachSignals(this);
    if (!_done && CallManager.shared.isCurrent(session)) {
      _done = true;
      CallManager.shared.hangUp(session);
    }
    super.onClose();
  }
}

class OutgoingCallScreen extends StatelessWidget {
  OutgoingCallScreen({super.key, required this.session}) : tag = 'call_out_${DateTime.now().microsecondsSinceEpoch}';

  final CallSession session;

  /// Unique GetX tag so a new call never reuses a controller that is still
  /// being disposed.
  final String tag;

  @override
  Widget build(BuildContext context) {
    final name = (session.peerName ?? '').trim().isEmpty ? CallKeys.unknownMember.tr : session.peerName!.trim();
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (Get.isRegistered<OutgoingCallController>(tag: tag)) {
          Get.find<OutgoingCallController>(tag: tag).cancel();
        }
      },
      child: Scaffold(
        backgroundColor: cCallBackground,
        body: GetBuilder<OutgoingCallController>(
          init: OutgoingCallController(session: session),
          tag: tag,
          builder: (controller) {
            controller.route ??= ModalRoute.of(context);
            return SafeArea(
              child: SizedBox(
                width: double.infinity,
                child: Column(
                  children: [
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(session.isVideo ? Icons.videocam_rounded : Icons.call_rounded,
                            color: cWhite.withOpacity(0.7), size: 18),
                        const SizedBox(width: 6),
                        Text(
                          session.isVideo ? CallKeys.videoCall.tr : CallKeys.voiceCall.tr,
                          style: TextStyle(color: cWhite.withOpacity(0.7), fontSize: 14),
                        ),
                      ],
                    ),
                    const Spacer(flex: 2),
                    CallAvatar(imageUrl: session.peerProfile, name: name, size: 130),
                    const SizedBox(height: 24),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: CallTitle(name: name, status: controller.statusKey.tr),
                    ),
                    const Spacer(flex: 3),
                    CallRoundButton(
                      icon: Icons.call_end_rounded,
                      background: cRed,
                      size: 72,
                      label: CallKeys.cancel.tr,
                      onTap: controller.cancel,
                    ),
                    const SizedBox(height: 48),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
