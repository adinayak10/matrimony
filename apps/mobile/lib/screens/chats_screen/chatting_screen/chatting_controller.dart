// ✅ Rewritten ChattingController using Socket.IO & REST API instead of Firebase

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/models/chat.dart';
import 'package:banjaramatch/models/model_chat_messages.dart';
import 'package:banjaramatch/models/model_chat_room_list.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/chats_screen/chatting_screen/block_user_controller.dart';
import 'package:banjaramatch/screens/chats_screen/socketservice.dart';
import 'package:banjaramatch/utilities/web_service.dart';

import '../../../common/api_service/api_service.dart';

class ChattingController extends BlockUserController {
  ScrollController scrollController = ScrollController();
  TextEditingController messageTextController = TextEditingController();
  List<ChatMessage> messages = [];
  ChatUserRoom? chatUserRoom;
  ChatUserRoom? myChatRoom;
  User? user;
  bool isTyping = false;
  User? myUser = SessionManager.shared.getUser();

  bool isFirstTime = true;
  int page = 1;
  final int limit = 20;
  bool hasMore = true;
  ChatRoom? chatRoom;

  ChattingController({this.user, ChatUserRoom? chatUserRoom, this.chatRoom}) {
    if (chatUserRoom != null) {
      this.chatUserRoom = chatUserRoom;
    } else if (user != null) {
      this.chatUserRoom = ChatUserRoom(
        conversationId: user?.id,
        title: user?.fullName ?? '',
        profileImage: user?.profile ?? '',
        userIdOrRoomId: user?.id,
        type: 1,
      );
    }
    SessionManager.shared.setStoredConversation(chatRoom!.roomId ?? '');
  }

  @override
  void onInit() {
    super.onInit();
    // Add listener for typing
    messageTextController.addListener(_handleTyping);

    scrollController.addListener(() {
      if (scrollController.offset >= scrollController.position.maxScrollExtent - 100 && hasMore && !isLoading.value) {
        fetchMessages();
      }
    });

    setupSocketListeners();
    fetchInitialData();
  }

  void _handleTyping() {
    final text = messageTextController.text;
    if (text.isNotEmpty && user != null) {
      SocketService.shared.emitTyping(user!.id!, myUser!.id!);

      // Optional: Emit stop_typing if needed with delay
      _debounceStopTyping();
    }
  }

  Timer? _typingTimer;

  void _debounceStopTyping() {
    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 2), () {
      if (user != null) {
        SocketService.shared.emitStopTyping(user!.id!, myUser!.id!);
      }
    });
  }

  void setupSocketListeners() {
    final currentUserId = SessionManager.shared.getUserID();

    /// ✅ Message successfully sent (ack from server with real _id)
    SocketService.shared.onMessageSent((data) {
      print("✉️ Message Sent (ACK from server): $data");

      final msg = ChatMessage.fromJson(data);

      // Only add if it's not already present (avoid duplicates)
      final alreadyExists = messages.any((m) => m.sId == msg.sId);
      if (!alreadyExists) {
        messages.insert(0, msg);
        update();
      }
    });

    /// 📩 New message received
    SocketService.shared.onReceiveMessage((data) {
      print("📩 Received Message: $data");

      final msg = ChatMessage.fromJson(data);

      // ✅ Add to top of list if not already added
      final alreadyExists = messages.any((m) => m.sId == msg.sId);
      if (!alreadyExists) {
        messages.insert(0, msg);
        update();
      }

      // ✅ If user is in the same room, immediately mark seen
      if (msg.room == SessionManager.shared.getStoredConversation()) {
        print("👁 User is already viewing this chat");
        SocketService.shared.markMessagesSeen(chatRoom!.roomId ?? '', myUser?.id ?? '');
      }
    });

    /// ⌨️ Typing status
    SocketService.shared.onTyping((data) {
      print("✍️ Typing...");
      isTyping = true;
      update();
    });

    /// ✋ Typing stopped
    SocketService.shared.onStopTyping((data) {
      print("🛑 Stopped Typing");
      isTyping = false;
      update();
    });

    /// 👁 Message seen by other user
    SocketService.shared.onMessageSeen((data) {
      print("✅ Seen Data: $data");

      final messageId = data['messageId'];
      if (messageId == null) return;

      final idx = messages.indexWhere((m) => m.sId == messageId);
      if (idx != -1 && messages[idx].status != 'seen') {
        messages[idx].status = 'seen';
        update();
      }
    });

    /// 📦 Message delivered (but not seen)
    SocketService.shared.onMessageDelivered((data) {
      print("📦 Delivered Data: $data");

      final messageId = data['messageId'];
      if (messageId == null) return;

      final idx = messages.indexWhere((m) => m.sId == messageId);
      if (idx != -1 && messages[idx].status == 'sent') {
        messages[idx].status = 'delivered';
        update(); // Refresh the chat bubble
      }
    });

    /// ✅ Chat Accepted
    SocketService.shared.onChatAccepted((data) {
      print("✅ Chat Accepted");
      chatRoom?.status = "accepted";
      update();
    });

    /// ❌ Chat Declined
    SocketService.shared.onChatDeclined((data) {
      print("❌ Chat Declined");
      chatRoom?.status = "declined";
      update();
    });
  }

  void fetchInitialData() async {
    UserService.shared.fetchProfile(chatRoom!.userId!, (user) {
      this.user = user;
      fetchMessages();
      update();
    });
  }

  void sendMsg({MessageType type = MessageType.text}) {
    final text = messageTextController.text.trim();
    if (text.isEmpty || user == null) return;

    final timestamp = DateTime.now();

    // 1. Emit via socket
    SocketService.shared.sendMessage(
      senderId: myUser!.id!,
      receiverId: user!.id!,
      content: text,
      type: type.name,
    );

    // 2. Construct a temporary local message
    final localMessage = ChatMessage(
      sId: timestamp.microsecondsSinceEpoch.toString(),
      // Temporary unique ID
      room: chatRoom!.roomId,
      sender: Sender(
        sId: myUser?.id,
        fullName: myUser?.fullName,
        profile: myUser?.profile,
      ),
      content: text,
      msgType: type.value,
      status: 'sent',
      // or use 'pending' if tracking delivery
      createdAt: timestamp.toIso8601String(),
    );

    // 3. Insert at beginning for UI display (latest at top)
    // messages.insert(0, localMessage);
    update();

    // 4. Clear input
    messageTextController.clear();
  }

  /// Sends an uploaded chat image (URL from `UserService.uploadFile`), then the
  /// caption typed in the picker sheet (if any) as a normal text message.
  void sendImage(String url) {
    if (url.isEmpty || user == null || myUser == null) return;
    SocketService.shared.sendMessage(
      senderId: myUser!.id!,
      receiverId: user!.id!,
      content: url,
      type: MessageType.image.value,
    );
    if (messageTextController.text.trim().isNotEmpty) {
      sendMsg();
    }
  }

  void fetchMessages() async {
    isLoading.value = true;
    update();
    print('/////////////////////////////////');
    print(jsonEncode(chatUserRoom));

    ApiService.shared.call(
      url: '${WebService.fetchMessages}',
      param: {
        'roomId': chatRoom!.roomId!,
        'page': page,
        'limit': limit,
      },
      completion: (response) {
        final List<ChatMessage> newMessages = ModelUserRoomChatList.fromJson(response).data!.messages!;

        if (newMessages.length < limit) {
          hasMore = false;
        } else {
          page++;
        }

        messages.addAll(newMessages);
        messages.sort((a, b) => (b.iV.toString() ?? '').compareTo((a.iV.toString() ?? '')));
        isLoading.value = false;
        isFirstTime = false;
        update();
      },
    );

    markAsRead();
  }

  void markAsRead() {
    print("aksdjlsajdlkadsajsdas");
    SocketService.shared.markMessagesSeen(chatRoom!.roomId ?? '', myUser?.id ?? '');
  }

  void rejectMessageRequest() {
    // Get.bottomSheet(ConfirmationSheet(
    //   desc: "Reject chat request?",
    //   buttonTitle: "Reject",
    //   onTap: () {
    //     ApiService.shared.call(
    //       url: '${AppConst.baseUrl}/api/rooms/deleteChat',
    //       param: {
    //         'roomId': chatRoom!.roomId,
    //       },
    //       completion: (_) {
    //         Get.back();
    //       },
    //     );
    //   },
    // ));

    SocketService.shared.declineChat(chatRoom!.roomId ?? '');
    chatRoom?.status = "declined";

    update();
  }

  void acceptMessageRequest() {
    SocketService.shared.acceptChat(chatRoom!.roomId ?? '');
    chatRoom?.status = "accepted";

    update();
  }

  void stopNotification() {
    SessionManager.shared.setStoredConversation(chatRoom!.roomId ?? '');
  }

  void startNotification() {
    SessionManager.shared.setStoredConversation('');
  }

  @override
  void onClose() {
    _typingTimer?.cancel();
    messageTextController.removeListener(_handleTyping);
    startNotification();
    markAsRead();
    super.onClose();
  }
}
