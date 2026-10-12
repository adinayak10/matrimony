import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/cupertino.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/extensions/int_extension.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/screens/extra_views/back_button.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../../../models/model_chat_room_list.dart';

class ChatCard extends StatelessWidget {
  final ChatRoom chatUserRoom;

  const ChatCard({Key? key, required this.chatUserRoom}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      // decoration: const ShapeDecoration(
      //     shape: SmoothRectangleBorder(
      //         borderRadius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 8, cornerSmoothing: cornerSmoothing))),
      //     color: cLightBg),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
      margin: const EdgeInsets.symmetric(vertical: 5, horizontal: 10),
      child: Row(
        children: [
          ClipSmoothRect(
            radius: const SmoothBorderRadius.all(SmoothRadius(cornerRadius: 15, cornerSmoothing: cornerSmoothing)),
            child: MyCachedProfileImage(
              imageUrl: chatUserRoom.profile,
              fullName: chatUserRoom.fullName,
              width: 60,
              height: 60,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        chatUserRoom.fullName ?? '',
                        style: MyTextStyle.gilroyBold(size: 16),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 2),
                    const VerifyIcon()
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  chatUserRoom.lastMessage?.content! ?? '',
                  style: MyTextStyle.gilroyLight(size: 14, color: cLightText),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                )
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                chatUserRoom.lastMessage?.timestamp ?? '',
                style: MyTextStyle.gilroyLight(size: 14, color: cLightText),
              ),
              Opacity(
                opacity: chatUserRoom.unreadMessagesCount != 0 ? 1 : 0,
                child: Container(
                  padding: const EdgeInsets.only(top: 10, bottom: 8, left: 8, right: 8),
                  decoration: const BoxDecoration(shape: BoxShape.circle, color: cGreen),
                  child: Text(
                    (chatUserRoom.unreadMessagesCount == -1
                        ? ""
                        : chatUserRoom.unreadMessagesCount?.makeToString() ?? ''),
                    style: MyTextStyle.gilroyBold(size: 14, color: cWhite),
                  ),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }
}
