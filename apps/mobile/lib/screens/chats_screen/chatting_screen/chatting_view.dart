import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/extensions/image_extension.dart';
import 'package:banjaramatch/common/widgets/functions.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/chat.dart';
import 'package:banjaramatch/models/model_chat_room_list.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/chats_screen/chat_view/chat_tag.dart';
import 'package:banjaramatch/screens/chats_screen/chatting_screen/chatting_controller.dart';
import 'package:banjaramatch/screens/chats_screen/chatting_screen/image_video_chat_picker.dart';
import 'package:banjaramatch/screens/extra_views/back_button.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

class ChattingView extends StatelessWidget {
  final User? user;
  final ChatUserRoom? chatUserRoom;
  final ChatRoom? chatRoom;

  const ChattingView({Key? key, this.user, this.chatUserRoom, this.chatRoom}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Functions.changStatusBar(StatusBarStyle.white);
    ChattingController controller =
        ChattingController(user: user, chatUserRoom: chatUserRoom, chatRoom: chatRoom);
    return Scaffold(
      backgroundColor: cWhite,
      body: PopScope(
        canPop: true,
        child: GetBuilder(
            init: controller,
            builder: (context) {
              return Column(
                children: [
                  top(controller),
                  Expanded(
                    child: ListView.builder(
                      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                      reverse: true,
                      itemCount: controller.messages.length,
                      padding: const EdgeInsets.all(10),
                      controller: controller.scrollController,
                      itemBuilder: (context, index) {
                        return ChatTag(
                          controller: controller,
                          index: index,
                          message: controller.messages[index],
                          isFromRoom: controller.chatUserRoom?.type == 2,
                        );
                      },
                    ),
                  ),
                  (controller.chatUserRoom?.iAmBlocked ?? false)
                      ? Container(
                          padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 12),
                          margin: const EdgeInsets.only(bottom: 10, right: 10, left: 10),
                          decoration: const ShapeDecoration(
                            color: cLightBg,
                            shape: SmoothRectangleBorder(
                                borderRadius: SmoothBorderRadius.all(
                                    SmoothRadius(cornerRadius: 5, cornerSmoothing: cornerSmoothing))),
                          ),
                          child: Text(
                            LKeys.youAreBlocked.tr,
                            style: MyTextStyle.gilroyRegular(color: cLightText),
                            textAlign: TextAlign.center,
                          ),
                        )
                      : Container(),
                  controller.chatRoom?.status == "pending" ? requestBottom(controller) : bottom(controller),
                ],
              );
            }),
      ),
    );
  }

  Widget bottom(ChattingController controller) {
    return Container(
      padding: const EdgeInsets.all(7),
      color: cLightBg,
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                decoration: ShapeDecoration(
                    color: cLightText.withOpacity(0.15),
                    shape: const SmoothRectangleBorder(
                        borderRadius:
                            SmoothBorderRadius.all(SmoothRadius(cornerRadius: 20, cornerSmoothing: cornerSmoothing)))),
                padding: const EdgeInsets.only(left: 15, top: 2, right: 2, bottom: 2),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          child: TextField(
                            controller: controller.messageTextController,
                            maxLines: 5,
                            minLines: 1,
                            textCapitalization: TextCapitalization.sentences,
                            decoration: InputDecoration(
                                hintText: LKeys.writeHere.tr,
                                hintStyle: MyTextStyle.gilroyRegular(color: cLightText.withOpacity(0.6)),
                                border: InputBorder.none,
                                counterText: '',
                                isDense: true,
                                contentPadding: const EdgeInsets.all(0)),
                            cursorColor: cPrimary,
                            style: MyTextStyle.gilroyRegular(color: cLightText),
                            textInputAction: TextInputAction.newline,
                          )),
                    ),
                    GestureDetector(onTap: controller.sendMsg, child: const SendBtn())
                  ],
                ),
              ),
            ),
            const SizedBox(width: 5),
            Container(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  contentButton(
                      iconData: Icons.add_circle_rounded, source: ImageSource.gallery, controller: controller),
                  const SizedBox(width: 5),
                  contentButton(iconData: Icons.camera_alt_rounded, source: ImageSource.camera, controller: controller),
                  const SizedBox(width: 5),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget contentButton(
      {required IconData iconData, required ImageSource source, required ChattingController controller}) {
    return GestureDetector(
      onTap: () {
        if (controller.chatUserRoom?.iAmBlocked == true) {
          return;
        }
        if (controller.chatUserRoom?.iBlocked == true) {
          controller.unblockUser(controller.user, () {});
          return;
        }
        Get.bottomSheet(ImageVideoChatPicker(
          controller: controller,
          imageSource: source,
        ));
      },
      child: Icon(
        iconData,
        color: cLightText,
        size: 28,
      ),
    );
  }

  Widget requestBottom(ChattingController controller) {
    return Container(
      padding: const EdgeInsets.all(15),
      color: cLightBg,
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            Text(
              '${controller.user?.fullName ?? ''} ${LKeys.requestDesc.tr}',
              style: MyTextStyle.gilroyLight(color: cDarkText, size: 14),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                ChatButton(
                    title: controller.chatUserRoom?.iBlocked ?? false ? LKeys.unBlock.tr : LKeys.block.tr,
                    color: cBlack,
                    onTap: () {
                      if (controller.chatUserRoom?.iBlocked ?? false) {
                        controller.unblockUser(controller.user, () {
                          controller.chatUserRoom?.iBlocked = false;
                        });
                      } else {
                        controller.blockUser(controller.user, () {
                          controller.chatUserRoom?.iBlocked = true;
                        });
                      }
                      controller.update();
                    }),
                ChatButton(
                  title: LKeys.reject,
                  color: cRed,
                  onTap: controller.rejectMessageRequest,
                ),
                ChatButton(
                  title: LKeys.accept,
                  color: cGreen,
                  onTap: controller.acceptMessageRequest,
                ),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget top(ChattingController controller) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
      color: cDarkBG,
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            GestureDetector(
              child: const Icon(
                Icons.chevron_left_rounded,
                color: cWhite,
                size: 35,
              ),
              onTap: () {
                Get.back();
              },
            ),
            const SizedBox(width: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(100),
              child: MyCachedProfileImage(
                fullName: controller.chatRoom?.fullName,
                imageUrl: controller.chatRoom?.profile,
                width: 40,
                height: 40,
              ),
            ),
            const SizedBox(width: 10),
            GestureDetector(
              onTap: () {
                Get.to(ProfileScreen(userId: chatRoom?.userId ?? ""));
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        controller.chatRoom?.fullName ?? '',
                        style: MyTextStyle.gilroyBold(size: 18, color: cWhite),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(width: 1),
                      VerifyIcon(user: controller.user)
                    ],
                  ),
                  Row(
                    children: [
                      Text(
                        "${controller.chatRoom?.isOnline == true ? "Online" : "last ago"}",
                        style: MyTextStyle.gilroyLight(size: 15, color: cGreen),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  )
                ],
              ),
            ),
            controller.isTyping
                ? Text(
                    "Typing...",
                    style: MyTextStyle.gilroyLight(color: cWhite, size: 12),
                  )
                : Container(),
            Spacer(),
            // controller.chatUserRoom?.type == 2
            //     ? RoomMenu(controller: controller)
            //     : Menu(
            //         items: [
            //           PopupMenuItem(
            //             textStyle: MyTextStyle.gilroyMedium(),
            //             child: Text(
            //               LKeys.report.tr,
            //             ),
            //             onTap: () {
            //               Future.delayed(const Duration(milliseconds: 1), () {
            //                 Get.bottomSheet(ReportSheet(user: controller.user), isScrollControlled: true);
            //               });
            //             },
            //           ),
            //           PopupMenuItem(
            //             textStyle: MyTextStyle.gilroyMedium(),
            //             child: Text(controller.chatUserRoom?.iBlocked ?? false ? LKeys.unBlock.tr : LKeys.block.tr),
            //             onTap: () {
            //               if (controller.chatUserRoom?.iBlocked ?? false) {
            //                 controller.unblockUser(controller.user, () {
            //                   controller.chatUserRoom?.iBlocked = false;
            //                 });
            //               } else {
            //                 controller.blockUser(controller.user, () {
            //                   controller.chatUserRoom?.iBlocked = true;
            //                 });
            //               }
            //               controller.update();
            //             },
            //           ),
            //         ],
            //         color: cPrimary,
            //       )
          ],
        ),
      ),
    );
  }
}

class SendBtn extends StatelessWidget {
  const SendBtn({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      backgroundColor: cPrimary,
      foregroundColor: cBlack,
      radius: 16,
      child: Container(
        padding: const EdgeInsets.only(left: 2),
        child: Image.asset(
          MyImages.send,
          height: 20,
          width: 20,
        ),
      ),
    );
  }
}
