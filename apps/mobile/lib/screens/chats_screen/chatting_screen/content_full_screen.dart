import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:photo_view/photo_view.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/models/chat.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:video_player/video_player.dart';

class ContentFullScreen extends StatefulWidget {
  final ChatMessage message;
  final VideoPlayerController? playerController;

  const ContentFullScreen({super.key, required this.message, this.playerController});

  @override
  State<ContentFullScreen> createState() => _ContentFullScreenState();
}

class _ContentFullScreenState extends State<ContentFullScreen> {
  VideoPlayerController? controller;

  @override
  void initState() {
    var msgType = MessageType.parse(widget.message.msgType);
    if (msgType == MessageType.video) {
      if (widget.playerController == null) {
        controller = VideoPlayerController.networkUrl(Uri.parse(widget.message.content?.addBaseURL() ?? ''))
          ..initialize().then((value) {
            controller?.play();
            setState(() {});
          });
      } else {
        controller = widget.playerController;
      }
    }
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    var msgType = MessageType.parse(widget.message.msgType);
    return Container(
      color: cBlack,
      child: SafeArea(
        top: true,
        child: Stack(
          fit: StackFit.passthrough,
          children: [
            Center(
              child: msgType == MessageType.video && controller != null
                  ? Stack(
                      alignment: Alignment.center,
                      children: [
                        GestureDetector(
                          onTap: () {
                            if (controller!.value.isPlaying) {
                              controller?.pause();
                            } else {
                              controller?.play();
                            }
                          },
                          child: controller != null
                              ? AspectRatio(aspectRatio: controller!.value.aspectRatio, child: VideoPlayer(controller!))
                              : null,
                        ),
                        ValueListenableBuilder(
                          valueListenable: controller!,
                          builder: (context, VideoPlayerValue value, child) {
                            return Column(
                              children: [
                                const SizedBox(height: 50),
                                const Spacer(),
                                value.isPlaying == true
                                    ? Container()
                                    : GestureDetector(
                                        onTap: () {
                                          if (value.isPlaying) {
                                            controller?.pause();
                                          } else {
                                            controller?.play();
                                          }
                                        },
                                        child: CircleAvatar(
                                          backgroundColor: cBlack.withOpacity(0.4),
                                          foregroundColor: cWhite,
                                          child: const Icon(
                                            Icons.play_arrow_rounded,
                                            size: 30,
                                          ),
                                        ),
                                      ),
                                const Spacer(),
                                VideoSlider(controller: controller, onChange: onChange),
                              ],
                            );
                          },
                        )
                      ],
                    )
                  : PhotoView(
                      disableGestures: false,
                      minScale: PhotoViewComputedScale.contained * 1,
                      maxScale: PhotoViewComputedScale.covered * 2,
                      backgroundDecoration: const BoxDecoration(color: cBlack),
                      imageProvider: NetworkImage(widget.message.content?.addBaseURL() ?? ''),
                    ),
            ),
            Container(
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      Get.back();
                    },
                    child: CircleAvatar(
                      backgroundColor: cLightBg.withOpacity(0.1),
                      child: const Icon(
                        Icons.close_rounded,
                        color: cLightText,
                      ),
                    ),
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void onChange(double value) {
    controller?.seekTo(Duration(milliseconds: value.toInt()));
  }

  @override
  void dispose() {
    if (widget.playerController == null) {
      controller?.dispose();
    }
    super.dispose();
  }
}

String _formatDuration(Duration d) {
  String twoDigits(int n) => n.toString().padLeft(2, "0");
  final minutes = twoDigits(d.inMinutes.remainder(60));
  final seconds = twoDigits(d.inSeconds.remainder(60));
  return d.inHours == 0 ? "$minutes:$seconds" : "${twoDigits(d.inHours)}:$minutes:$seconds";
}

class VideoSlider extends StatelessWidget {
  final VideoPlayerController? controller;
  final Function(double) onChange;

  const VideoSlider({Key? key, required this.controller, required this.onChange}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final position = controller?.value.position;
    final duration = controller?.value.duration;
    return Container(
      decoration: ShapeDecoration(
        shape: const SmoothRectangleBorder(
            borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 5, cornerSmoothing: cornerSmoothing))),
        color: cBlack.withOpacity(0.4),
      ),
      margin: const EdgeInsets.all(10),
      padding: const EdgeInsets.all(7),
      child: Row(
        children: [
          Text(
            position == null ? "" : _formatDuration(position),
            style: MyTextStyle.gilroyRegular(color: cWhite, size: 14),
          ),
          const SizedBox(width: 5),
          Expanded(
            child: SliderTheme(
              data: const SliderThemeData().copyWith(trackHeight: 1, overlayShape: SliderComponentShape.noThumb),
              child: Slider(
                label: "",
                thumbColor: cPrimary,
                activeColor: cWhite,
                inactiveColor: cWhite.withOpacity(0.4),
                value: position?.inMilliseconds.toDouble() ?? 0,
                max: duration?.inMilliseconds.toDouble() ?? 0,
                onChanged: (value) {
                  onChange(value);
                },
              ),
            ),
          ),
          Text(
            duration == null ? "" : _formatDuration(duration),
            style: MyTextStyle.gilroyRegular(color: cWhite, size: 14),
          ),
        ],
      ),
    );
  }
}
