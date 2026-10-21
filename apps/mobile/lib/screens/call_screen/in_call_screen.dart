import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/localization/features/call_strings.dart';
import 'package:banjaramatch/models/call_session.dart';
import 'package:banjaramatch/screens/call_screen/call_widgets.dart';
import 'package:banjaramatch/screens/call_screen/in_call_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Live voice/video call. Video: remote full screen + local picture-in-picture.
/// Voice: avatar + timer. Controls: mute, speaker, flip/camera off (video), end.
class InCallScreen extends StatelessWidget {
  InCallScreen({super.key, required this.session}) : tag = 'call_live_${DateTime.now().microsecondsSinceEpoch}';

  final CallSession session;

  /// Unique GetX tag (see OutgoingCallScreen.tag).
  final String tag;

  String get _name =>
      (session.peerName ?? '').trim().isEmpty ? CallKeys.unknownMember.tr : session.peerName!.trim();

  @override
  Widget build(BuildContext context) {
    return PopScope(
      // Hang up with the red button; back must not silently drop the call.
      canPop: false,
      child: Scaffold(
        backgroundColor: cCallBackground,
        body: GetBuilder<InCallController>(
          init: InCallController(session: session),
          tag: tag,
          builder: (controller) {
            controller.route ??= ModalRoute.of(context);
            return controller.isVideo ? _videoBody(context, controller) : _audioBody(controller);
          },
        ),
      ),
    );
  }

  Widget _statusText(InCallController controller, {double size = 16}) {
    return GetBuilder<InCallController>(
      id: InCallController.timerId,
      tag: tag,
      builder: (c) => Text(
        c.statusText,
        textAlign: TextAlign.center,
        style: MyTextStyle.gilroyMedium(size: size, color: cWhite.withOpacity(0.85)),
      ),
    );
  }

  Widget _audioBody(InCallController controller) {
    return SafeArea(
      child: SizedBox(
        width: double.infinity,
        child: Column(
          children: [
            const Spacer(flex: 2),
            CallAvatar(imageUrl: session.peerProfile, name: _name, size: 130),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                _name,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: MyTextStyle.gilroyBold(size: 26, color: cWhite),
              ),
            ),
            const SizedBox(height: 8),
            _statusText(controller),
            const Spacer(flex: 3),
            _controls(controller),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _videoBody(BuildContext context, InCallController controller) {
    final remote = controller.remoteView;
    final local = controller.localView;
    final topInset = MediaQuery.of(context).padding.top;
    return Stack(
      fit: StackFit.expand,
      children: [
        // Remote video (or the avatar until the other person's video arrives).
        remote != null
            ? AgoraVideoView(controller: remote)
            : Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CallAvatar(imageUrl: session.peerProfile, name: _name, size: 120),
                    const SizedBox(height: 20),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        _name,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: MyTextStyle.gilroyBold(size: 24, color: cWhite),
                      ),
                    ),
                    const SizedBox(height: 8),
                    _statusText(controller),
                  ],
                ),
              ),
        // Name + timer over the remote video.
        if (remote != null)
          Positioned(
            top: topInset + 16,
            left: 16,
            right: 150,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: MyTextStyle.gilroyBold(size: 18, color: cWhite)
                      .copyWith(shadows: const [Shadow(blurRadius: 6, color: Colors.black54)]),
                ),
                const SizedBox(height: 4),
                _statusText(controller, size: 14),
              ],
            ),
          ),
        // Local picture-in-picture.
        Positioned(
          top: topInset + 16,
          right: 16,
          width: 110,
          height: 160,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Container(
              color: cDarkBG,
              child: (local != null && !controller.cameraOff)
                  ? AgoraVideoView(controller: local)
                  : Center(child: Icon(Icons.videocam_off_rounded, color: cWhite.withOpacity(0.7), size: 32)),
            ),
          ),
        ),
        // Controls.
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Container(
            padding: const EdgeInsets.only(top: 24),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Colors.black54],
              ),
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: _controls(controller),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _controls(InCallController controller) {
    final buttons = <Widget>[
      CallRoundButton(
        icon: controller.muted ? Icons.mic_off_rounded : Icons.mic_rounded,
        label: controller.muted ? CallKeys.unmute.tr : CallKeys.mute.tr,
        active: controller.muted,
        size: 56,
        onTap: controller.toggleMute,
      ),
      CallRoundButton(
        icon: controller.speakerOn ? Icons.volume_up_rounded : Icons.volume_down_rounded,
        label: CallKeys.speaker.tr,
        active: controller.speakerOn,
        size: 56,
        onTap: controller.toggleSpeaker,
      ),
      if (controller.isVideo)
        CallRoundButton(
          icon: Icons.cameraswitch_rounded,
          label: CallKeys.flipCamera.tr,
          size: 56,
          onTap: controller.cameraOff ? null : controller.switchCamera,
        ),
      if (controller.isVideo)
        CallRoundButton(
          icon: controller.cameraOff ? Icons.videocam_off_rounded : Icons.videocam_rounded,
          label: controller.cameraOff ? CallKeys.cameraOn.tr : CallKeys.cameraOff.tr,
          active: controller.cameraOff,
          size: 56,
          onTap: controller.toggleCamera,
        ),
      CallRoundButton(
        icon: Icons.call_end_rounded,
        label: CallKeys.end.tr,
        background: cRed,
        size: 56,
        onTap: controller.endCall,
      ),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: buttons.map((b) => Flexible(child: b)).toList(),
      ),
    );
  }
}
