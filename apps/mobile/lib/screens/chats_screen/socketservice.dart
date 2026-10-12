import 'package:get/get.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../../common/managers/session_manager.dart';
import '../../main.dart';
import '../../models/chat.dart';
import '../../utilities/const.dart';
import '../tabbar/tabbar_controller.dart';

class SocketService {
  static final SocketService shared = SocketService._internal();

  late IO.Socket socket;
  bool _hasSocket = false;

  //final String baseUrl = 'http://192.168.1.9:4000'; // ⛳ Your backend URL
  final String baseUrl = apiHost; // ⛳ Your backend URL (see utilities/const.dart)

  SocketService._internal();

  /// 🔌 Connects the socket and registers common events
  void connectSocket() {
    final userId = SessionManager.shared.getUserID();
    final token = SessionManager.shared.getToken();

    // forceNew below opens a fresh connection each time; close the previous
    // one first so an old (possibly other-user) socket never stays open.
    if (_hasSocket) {
      try {
        socket.dispose();
      } catch (_) {}
    }

    socket = IO.io(baseUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
      // Always build a fresh connection so a re-login after logout does not
      // reuse a cached socket that still carries the previous user's token.
      'forceNew': true,
      // JWT in the handshake: the server reads socket.handshake.auth.token.
      // The bare 'join' emit below stays for the server's sunset window.
      if (token.isNotEmpty) 'auth': {'token': token},
    });

    _hasSocket = true;

    socket.onConnect((_) {
      print('🔌 Socket connected');
      socket.emit('join', userId);
    });

    socket.onDisconnect((_) => print('❌ Socket disconnected'));
  }

  /// 🔁 Initializes all reusable socket listeners
  void startCommonListening() {
    connectSocket();
    register(SessionManager.shared.getUserID());

    final tabController = Get.find<TabBarController>();

    requestAllBadgeCounts();

    socket.on('notification_count', (data) {
      final count = data['total'] ?? 0;
      print("🔔 notification_count: $count");
      tabController.updateNotificationCount(count);
    });

    socket.on('new_match_request', (data) {
      final count = data['total'] ?? 0;
      print("❤️ new_match_request: $count");
      tabController.updateMatchRequestCount(count);
    });

    // socket.on('chat_update', (data) {
    //   final count = data['total'] ?? 0;
    //   print("💬 chat_update: $count");
    //   tabController.updateUnreadChatCount(count);
    // });

    socket.on('unread_chatroom_count_update', (data) {
      final count = data['total'] ?? 0;
      print("💬 chat_update: $count");
      tabController.updateUnreadChatRoomCount(count);
    });

    onReceiveMessage((data) {
      final message = ChatMessage.fromJson(data);

      if (message.room == SessionManager.shared.getStoredConversation()) {
        print("📥 Message received in active room");
        return;
      }

      showLocalNotification(
        title: message.sender?.fullName ?? "New Message",
        body: message.content ?? "You received a new message",
        payload: "${message.sender?.sId}|${message.sender?.fullName ?? ''}",
      );
    });
  }

  /// 📩 Request all badge counts (notifications, match, unread chat)
  void requestAllBadgeCounts() {
    final userId = SessionManager.shared.getUserID();
    socket.emit('get_notification_count', userId);
    socket.emit('get_match_request_count', userId);
    socket.emit('get_unread_chatroom_count', userId);
  }

  void register(String userId) => socket.emit('join', userId);

  void sendMessage({
    required String senderId,
    required String receiverId,
    required String content,
    String type = 'text',
  }) {
    socket.emit('send_message', {
      'senderId': senderId,
      'receiverId': receiverId,
      'content': content,
      'type': type,
    });
  }

  void onReceiveMessage(Function(dynamic) callback) {
    socket.on('receive_message', callback);
  }

  void onMessageDelivered(Function(dynamic) callback) {
    socket.on('message_delivered', callback);
  }

  void onMessageSeen(Function(dynamic) callback) {
    socket.on('message_seen', callback);
  }

  void onMessageSent(Function(dynamic) callback) {
    socket.on('message_sent', callback);
  }

  void markMessagesSeen(String roomId, String receiverId) {
    socket.emit('mark_seen', {
      'roomId': roomId,
      'receiverId': receiverId,
    });
  }

  void emitTyping(String toUserId, String fromUserId) {
    socket.emit('typing', {
      'toUserId': toUserId,
      'fromUserId': fromUserId,
    });
  }

  void emitStopTyping(String toUserId, String fromUserId) {
    socket.emit('stop_typing', {
      'toUserId': toUserId,
      'fromUserId': fromUserId,
    });
  }

  void onTyping(Function(dynamic) callback) {
    socket.on('user_typing', callback);
  }

  void onStopTyping(Function(dynamic) callback) {
    socket.on('user_stop_typing', callback);
  }

  void onUserOnline(Function(dynamic) callback) {
    socket.on('user_online', callback);
  }

  void onUserOffline(Function(dynamic) callback) {
    socket.on('user_offline', callback);
  }

  void acceptChat(String roomId) {
    socket.emit('accept_chat', {'roomId': roomId});
  }

  void rejectChat(String roomId) {
    socket.emit('reject_chat', {'roomId': roomId});
  }

  void declineChat(String roomId) {
    socket.emit('decline_chat', {'roomId': roomId});
  }

  void onChatAccepted(Function(dynamic) callback) {
    socket.on('chat_accepted', callback);
  }

  void onChatDeclined(Function(dynamic) callback) {
    socket.on('chat_declined', callback);
  }

  void disconnect() {
    socket.disconnect();
    print("🔌 Socket manually disconnected");
  }
}
