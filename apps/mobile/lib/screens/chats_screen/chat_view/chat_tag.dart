import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/screens/chats_screen/chatting_screen/chatting_controller.dart';
import 'package:banjaramatch/screens/chats_screen/chatting_screen/content_full_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../../../models/chat.dart';

class ChatTag extends StatelessWidget {
  final ChattingController controller;
  final int index;
  final ChatMessage message;
  final bool isFromRoom;

  const ChatTag(
      {Key? key, required this.index, required this.message, this.isFromRoom = false, required this.controller})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    var isMyMsg = message.sender?.sId.toString() == SessionManager.shared.getUserID();
    var msgType = MessageType.parse(message.msgType);
    return Row(
      mainAxisAlignment: isMyMsg ? MainAxisAlignment.end : MainAxisAlignment.start,
      children: [
        isMyMsg ? const Spacer() : Container(),
        Column(
          crossAxisAlignment: isMyMsg ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Container(
              constraints: BoxConstraints(maxWidth: Get.width * 0.6),
              padding: EdgeInsets.only(
                  top: msgType == MessageType.text ? 10 : 5,
                  bottom: msgType == MessageType.text
                      ? message.content == ""
                          ? 5
                          : 10
                      : 5,
                  right: 10,
                  left: 10),
              margin: const EdgeInsets.symmetric(vertical: 3),
              decoration: ShapeDecoration(
                color: isMyMsg ? cBlack : cLightText.withOpacity(0.15),
                shape: const SmoothRectangleBorder(
                    borderRadius:
                        SmoothBorderRadius.all(SmoothRadius(cornerRadius: 8, cornerSmoothing: cornerSmoothing))),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  msgType == MessageType.text
                      ? Text(
                          message.content ?? '',
                          style: MyTextStyle.gilroyRegular(color: isMyMsg ? cWhite : cBlack, size: 16),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 5),
                            ClipSmoothRect(
                              radius: const SmoothBorderRadius.all(
                                  SmoothRadius(cornerRadius: 5, cornerSmoothing: cornerSmoothing)),
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  GestureDetector(
                                    onTap: () {
                                      Get.bottomSheet(ContentFullScreen(message: message),
                                          ignoreSafeArea: false, isScrollControlled: true);
                                    },
                                    child: MyCachedImage(
                                      imageUrl: msgType == MessageType.video ? message.thumbnail : message.content,
                                      width: Get.width * 0.6,
                                      height: Get.width * 0.6,
                                    ),
                                  ),
                                  msgType == MessageType.video
                                      ? const CircleAvatar(
                                          radius: 13,
                                          backgroundColor: cPrimary,
                                          foregroundColor: cBlack,
                                          child: Icon(Icons.play_arrow_rounded, size: 20),
                                        )
                                      : Container(width: 0),
                                ],
                              ),
                            ),
                            // media messages carry the file URL in `content`; the caption is sent as a separate text message
                            const SizedBox(height: 2),
                          ],
                        ),
                ],
              ),
            ),
            Text(
              _formatTime(message.createdAt),
              style: MyTextStyle.gilroyRegular(size: 12, color: cLightText),
            ),

            // Status text for my messages
            if (isMyMsg)
              Padding(
                padding: const EdgeInsets.only(top: 2, right: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _getStatusIcon(message.status ?? 'sent'),
                      size: 14,
                      color: _getStatusColor(message.status ?? 'sent'),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _getStatusLabel(message.status ?? 'sent'),
                      style: MyTextStyle.gilroyRegular(size: 11, color: cLightText),
                    ),
                  ],
                ),
              ),

            const SizedBox(
              height: 4,
            )
          ],
        ),
        !isMyMsg ? const Spacer() : Container(),
      ],
    );
  }

  /// "10:04 PM" for today, "18 Oct, 10:04 PM" otherwise (local time).
  static String _formatTime(String? createdAt) {
    final date = DateTime.tryParse(createdAt ?? '')?.toLocal();
    if (date == null) return '';
    final now = DateTime.now();
    final sameDay = date.year == now.year && date.month == now.month && date.day == now.day;
    return sameDay ? DateFormat('h:mm a').format(date) : DateFormat('d MMM, h:mm a').format(date);
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'seen':
        return 'Seen';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Sent';
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'seen':
        return Icons.done_all;
      case 'delivered':
        return Icons.done_all;
      default:
        return Icons.check;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'seen':
        return Colors.blueAccent;
      case 'delivered':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }
}

class ChatButton extends StatelessWidget {
  final String title;
  final Color color;
  final Function()? onTap;

  const ChatButton({Key? key, required this.title, required this.color, this.onTap}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 30),
        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(100)),
        child: Text(
          title.tr,
          style: MyTextStyle.gilroySemiBold(color: color),
        ),
      ),
    );
  }
}
