import 'package:banjaramatch/models/chat.dart';

class ModelChatRoomList {
  bool? status;
  String? message;
  List<ChatRoom>? data;

  ModelChatRoomList({this.status, this.message, this.data});

  ModelChatRoomList.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    if (json['data'] != null) {
      data = <ChatRoom>[];
      json['data'].forEach((v) {
        data!.add(new ChatRoom.fromJson(v));
      });
    }
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    data['message'] = this.message;
    if (this.data != null) {
      data['data'] = this.data!.map((v) => v.toJson()).toList();
    }
    return data;
  }
}

class ChatRoom {
  // Room metadata
  String? roomId;
  List<String>? participants;
  String? status;
  bool? isGroup;
  String? createdAt;
  String? updatedAt;
  int? iV;

  // User info (other participant)
  String? userId;
  String? fullName;
  String? email;
  String? profile;
  bool? isOnline;
  String? lastSeen;

  // Message info
  ChatMessage? lastMessage;
  int? unreadMessagesCount;

  ChatRoom({
    this.roomId,
    this.participants,
    this.status,
    this.isGroup,
    this.createdAt,
    this.updatedAt,
    this.iV,
    this.userId,
    this.fullName,
    this.email,
    this.profile,
    this.isOnline,
    this.lastSeen,
    this.lastMessage,
    this.unreadMessagesCount,
  });

  ChatRoom.fromJson(Map<String, dynamic> json) {
    roomId = json['_id'] ?? json['roomId'];
    participants = json['participants'] != null ? List<String>.from(json['participants']) : [];
    status = json['status'];
    isGroup = json['isGroup'];
    createdAt = json['createdAt'];
    updatedAt = json['updatedAt'];
    iV = json['__v'];

    userId = json['user']?['id'] ?? json['userId'];
    fullName = json['user']?['full_name'] ?? json['fullName'];
    email = json['user']?['email'];
    profile = json['user']?['profile'];
    isOnline = json['user']?['isOnline'];
    lastSeen = json['user']?['lastSeen'];

    lastMessage = json['lastMessage'] != null ? ChatMessage.fromJson(json['lastMessage']) : null;
    unreadMessagesCount = json['unreadMessagesCount'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {};

    data['_id'] = roomId;
    data['participants'] = participants;
    data['status'] = status;
    data['isGroup'] = isGroup;
    data['createdAt'] = createdAt;
    data['updatedAt'] = updatedAt;
    data['__v'] = iV;

    data['user'] = {
      'id': userId,
      'full_name': fullName,
      'email': email,
      'profile': profile,
      'isOnline': isOnline,
      'lastSeen': lastSeen,
    };

    if (lastMessage != null) {
      data['lastMessage'] = lastMessage!.toJson();
    }

    data['unreadMessagesCount'] = unreadMessagesCount;
    return data;
  }
}
