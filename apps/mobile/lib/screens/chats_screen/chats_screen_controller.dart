import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/cupertino_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/chat.dart';
import 'package:banjaramatch/models/model_chat_request.dart';
import 'package:banjaramatch/screens/chats_screen/socketservice.dart';
import 'package:banjaramatch/screens/sheets/confirmation_sheet.dart';

import '../../common/api_service/api_service.dart';
import '../../models/model_chat_room_list.dart';
import '../../models/registration.dart' show User;
import '../../utilities/web_service.dart';

class ChatsScreensController extends CupertinoController {
  List<ChatRoom> requestChats = [];
  List<ChatRoom> activeChats = [];
  List<User> onlineUsers = [];

  TextEditingController textEditingController = TextEditingController();
  final myUser = SessionManager.shared.getUser();

  @override
  void onReady() {
    super.onReady();

    fetchChats();
    fetchOnlineUsers();

    // 🔔 Listen for new messages
    SocketService.shared.onReceiveMessage((data) {
      final message = ChatMessage.fromJson(data);
      if (message.room == SessionManager.shared.getStoredConversation()) {
        print("In same chat");
        return;
      }
      _handleIncomingMessage(data);
    });
  }

  void markRoomAsSeen(String roomId) {
    final index = activeChats.indexWhere((chat) => chat.roomId == roomId);
    if (index != -1) {
      activeChats[index].unreadMessagesCount = 0;
      update();
    }
  }

  void _handleIncomingMessage(dynamic data) {
    final roomId = data['room'];
    final receiverId = data['receiver'];
    final currentUserId = SessionManager.shared.getUserID();

    if (receiverId != currentUserId) return;

    final index = activeChats.indexWhere((chat) => chat.roomId == roomId);
    if (index != -1) {
      // ✅ Chat exists – increment count
      activeChats[index].unreadMessagesCount = (activeChats[index].unreadMessagesCount ?? 0) + 1;
      activeChats[index].lastMessage = ChatMessage.fromJson(data);
    } else {
      // ❓ Optionally fetch room if not present
      fetchActiveChats();
    }

    update();
  }

  Future<void> fetchChats() async {
    print("..........................");
    await fetchRequestChats();
    await fetchActiveChats();
  }

  Future<void> fetchRequestChats() async {
    ApiService.shared.call(
      url: WebService.chatRequestList,
      param: {'my_user_id': SessionManager.shared.getUserID()},
      completion: (response) {
        final res = ModelChatRequest.fromJson(response);
        if (res.status == true) {
          requestChats = res.data!;
          update();
        }
      },
    );
  }

  Future<void> fetchActiveChats() async {
    ApiService.shared.call(
      url: WebService.chatUserList,
      param: {'my_user_id': SessionManager.shared.getUserID()},
      completion: (response) {
        final res = ModelChatRoomList.fromJson(response);
        if (res.status == true) {
          activeChats = res.data!;
          update();
        }
      },
    );
  }

  Future<void> fetchOnlineUsers() async {
    UserService.shared.fetchProfiles(
      filters: {"isOnline": true},
      completion: (users) {
        onlineUsers.clear();
        onlineUsers = users;
        update();
      },
      page: 1,
    );
  }

  void acceptChat(String roomId) {
    SocketService.shared.acceptChat(roomId);
    fetchChats();
  }

  void declineChat(String roomId) {
    SocketService.shared.declineChat(roomId);
    fetchChats();
  }

  void clearChat(ChatUserRoom chatUserRoom) {
    Get.bottomSheet(
      ConfirmationSheet(
        desc: LKeys.chatRoomDesc,
        buttonTitle: LKeys.clearChat,
        onTap: () async {
          ApiService.shared.call(
            url: "WebService",
            param: {
              'room_id': chatUserRoom.conversationId,
              'user_id': myUser!.id,
            },
            completion: (_) => fetchChats(),
          );
        },
      ),
    );
  }

  void deleteChat(ChatRoom chatUserRoom) {
    Get.bottomSheet(
      ConfirmationSheet(
        desc: LKeys.deleteChatDesc,
        buttonTitle: LKeys.delete,
        onTap: () async {
          ApiService.shared.call(
            url: WebService.deleteRoom,
            param: {
              'room_id': chatUserRoom.roomId,
              'user_id': chatUserRoom.participants?[1],
              'my_user_id': chatUserRoom.participants?[0],
            },
            completion: (_) => {fetchChats()},
          );
        },
      ),
    );
  }

  @override
  void onClose() {
    textEditingController.dispose();
    super.onClose();
  }
}
