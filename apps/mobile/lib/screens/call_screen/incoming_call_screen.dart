import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

/// Callee side while the call rings (from `call_incoming` or a call push).
/// Accept → permissions → `call_accept` → token → [InCallScreen];
/// Decline → `call_reject`. Pulses haptics instead of a ringtone.
class IncomingCallController extends BaseController {
  IncomingCallController({required this.session});

  final CallSession session;

  /// The route showing this screen (set by the screen on first build).
  Route<dynamic>? route;

  /// True while permissions / socket / token are being sorted out.
  bool accepting = false;

  bool _done = false;
  Timer? _pulseTimer;
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
    _startPulse();
    // Server: call_timeout after 45 s of ringing. Covers a lost socket / a
    // push opened after the call was already over.
    _safetyTimer = Timer(const Duration(seconds: 60), () {
      _endWith(CallKeys.missedCall.tr);
    });
  }

  void _startPulse() {
    _pulseTimer?.cancel();
    HapticFeedback.heavyImpact();
    _pulseTimer = Timer.periodic(const Duration(milliseconds: 1400), (_) {
      HapticFeedback.heavyImpact();
      Future.delayed(const Duration(milliseconds: 180), HapticFeedback.mediumImpact);
      // After a cold start from a push the socket may appear later.
      CallManager.shared.ensureCallEventsBound();
    });
  }

  void _stopPulse() {
    _pulseTimer?.cancel();
    _pulseTimer = null;
  }

  void _onSignal(String event, Map<String, dynamic> data) {
    if (_done) return;
    switch (event) {
      case 'call_end':
      case 'call_timeout':
        _endWith(CallKeys.missedCall.tr);
        break;
    }
  }

  Future<void> accept() async {
    if (_done || accepting) return;
    accepting = true;
    _stopPulse();
    update();

    final manager = CallManager.shared;
    final granted = await manager.ensurePermissions(session.callType);
    if (_done) return;
    if (!granted) {
      accepting = false;
      _startPulse();
      update();
      return;
    }
    if (!await manager.waitForSocket()) {
      if (_done) return;
      manager.showMessage(CallKeys.noInternet.tr);
      accepting = false;
      _startPulse();
      update();
      return;
    }
    if (_done) return;
    if (!manager.isCurrent(session)) {
      _done = true;
      _close();
      return;
    }
    final callId = session.callId;
    final channelName = session.channelName;
    if (callId == null || callId.isEmpty || channelName == null || channelName.isEmpty) {
      _endWith(CallKeys.failed.tr, hangUp: true);
      return;
    }

    manager.ensureCallEventsBound();
    SocketService.shared.emitCallAccept(callId);
    // The API mints tokens for ringing|accepted calls, so this is valid right
    // after emitting call_accept.
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

  void decline() {
    if (_done) return;
    _done = true;
    _stopPulse();
    _safetyTimer?.cancel();
    CallManager.shared.decline(session);
    _close();
  }

  void _endWith(String message, {bool hangUp = false}) {
    if (_done) return;
    _done = true;
    _stopPulse();
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
    _stopPulse();
    _safetyTimer?.cancel();
    CallManager.shared.detachSignals(this);
    if (!_done && CallManager.shared.isCurrent(session)) {
      _done = true;
      CallManager.shared.decline(session);
    }
    super.onClose();
  }
}

class IncomingCallScreen extends StatelessWidget {
  IncomingCallScreen({super.key, required this.session})
      : tag = 'call_in_${session.callId ?? ''}_${DateTime.now().microsecondsSinceEpoch}';

  final CallSession session;

  /// Unique GetX tag (see OutgoingCallScreen.tag).
  final String tag;

  @override
  Widget build(BuildContext context) {
    final name = (session.peerName ?? '').trim().isEmpty ? CallKeys.unknownMember.tr : session.peerName!.trim();
    return PopScope(
      // The member has to accept or decline; back does nothing.
      canPop: false,
      child: Scaffold(
        backgroundColor: cCallBackground,
        body: GetBuilder<IncomingCallController>(
          init: IncomingCallController(session: session),
          tag: tag,
          builder: (controller) {
            controller.route ??= ModalRoute.of(context);
            return SafeArea(
              child: SizedBox(
                width: double.infinity,
                child: Column(
                  children: [
                    const Spacer(flex: 2),
                    CallAvatar(imageUrl: session.peerProfile, name: name, size: 130),
                    const SizedBox(height: 24),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: CallTitle(
                        name: name,
                        status: controller.accepting
                            ? CallKeys.connecting.tr
                            : (session.isVideo ? CallKeys.incomingVideoCall.tr : CallKeys.incomingVoiceCall.tr),
                      ),
                    ),
                    const Spacer(flex: 3),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 48),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          CallRoundButton(
                            icon: Icons.call_end_rounded,
                            background: cRed,
                            size: 72,
                            label: CallKeys.decline.tr,
                            onTap: controller.decline,
                          ),
                          controller.accepting
                              ? const SizedBox(
                                  width: 72,
                                  height: 72,
                                  child: Padding(
                                    padding: EdgeInsets.all(18),
                                    child: CircularProgressIndicator(color: cWhite, strokeWidth: 3),
                                  ),
                                )
                              : CallRoundButton(
                                  icon: session.isVideo ? Icons.videocam_rounded : Icons.call_rounded,
                                  background: cGreen,
                                  size: 72,
                                  label: CallKeys.accept.tr,
                                  onTap: controller.accept,
                                ),
                        ],
                      ),
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
