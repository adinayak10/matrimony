import 'package:get/get.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../../common/managers/call_manager.dart';
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
    CallManager.shared.bindIncoming();

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
    if (!_hasSocket) return; // not connected yet (startCommonListening asks once connected)
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

  // ─── Calls (Agora signalling; server: socket.js call_* handlers) ──────────

  /// Socket events the call screens listen to (per call).
  static const List<String> callEvents = [
    'call_ringing',
    'call_accepted',
    'call_rejected',
    'call_end',
    'call_timeout',
    'call_failed',
  ];

  /// Event for an incoming call; bound app-wide (CallManager.bindIncoming).
  static const String callIncomingEvent = 'call_incoming';

  /// True once [connectSocket] has created a socket (emits are dropped before that).
  bool get hasSocket => _hasSocket;

  bool get isConnected => _hasSocket && socket.connected;

  /// Starts a call: `call_invite {toUserId, roomId, callType}` (callType audio|video).
  /// The server answers the caller with `call_ringing` or `call_failed`.
  void emitCallInvite({required String toUserId, required String roomId, required String callType}) {
    if (!_hasSocket) return;
    socket.emit('call_invite', {'toUserId': toUserId, 'roomId': roomId, 'callType': callType});
  }

  void emitCallAccept(String callId) {
    if (!_hasSocket) return;
    socket.emit('call_accept', {'callId': callId});
  }

  void emitCallReject(String callId) {
    if (!_hasSocket) return;
    socket.emit('call_reject', {'callId': callId});
  }

  void emitCallEnd(String callId) {
    if (!_hasSocket) return;
    socket.emit('call_end', {'callId': callId});
  }

  /// Each `onCall*` helper REPLACES any previous handler for that event, so
  /// screens can re-register safely without stacking duplicate callbacks.
  void _onCall(String event, Function(dynamic) callback) {
    if (!_hasSocket) return;
    socket.off(event);
    socket.on(event, callback);
  }

  /// `{callId, roomId, channelName, callType}` — sent to the caller once the invite is accepted by the server.
  void onCallRinging(Function(dynamic) callback) => _onCall('call_ringing', callback);

  /// `{callId, roomId, channelName, callType, fromUserId, fromUserName, fromUserProfile}`.
  void onCallIncoming(Function(dynamic) callback) => _onCall(callIncomingEvent, callback);

  /// `{callId, channelName}` — to the caller when the callee accepts.
  void onCallAccepted(Function(dynamic) callback) => _onCall('call_accepted', callback);

  /// `{callId}`
  void onCallRejected(Function(dynamic) callback) => _onCall('call_rejected', callback);

  /// `{callId}` — the other side hung up.
  void onCallEnd(Function(dynamic) callback) => _onCall('call_end', callback);

  /// `{callId}` — nobody answered within 45 s (sent to both sides).
  void onCallTimeout(Function(dynamic) callback) => _onCall('call_timeout', callback);

  /// `{reason}` — busy | offline | not_connected (older servers send a sentence).
  void onCallFailed(Function(dynamic) callback) => _onCall('call_failed', callback);

  /// Removes the per-call listeners ([callEvents]). The app-wide
  /// `call_incoming` listener is kept unless [includeIncoming] is true.
  /// Never touches `receive_message` or any chat listener.
  void offCallEvents({bool includeIncoming = false}) {
    if (!_hasSocket) return;
    for (final event in callEvents) {
      socket.off(event);
    }
    if (includeIncoming) socket.off(callIncomingEvent);
  }
}
