// ignore_for_file: unnecessary_getters_setters

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:banjaramatch/models/registration.dart';

import 'model_chat_messages.dart';

class ChatUserRoom {
  bool? _iBlocked;
  bool? _iAmBlocked;
  String? _conversationId;
  String? _deletedId;
  bool? _isDeleted;
  bool? _isMute;
  String? _lastMsg;
  int? _newMsgCount;
  String? _title;
  String? _profileImage;
  int? _type;
  String? _userIdOrRoomId;
  DateTime? _time;
  List<String>? _usersIds;
  Map<String, String>? _deleteChatIds;
  Map<String, num>? _unreadCounts;

  ChatUserRoom(
      {String? conversationId,
      bool? iAmBlocked,
      bool? iBlocked,
      String? deletedId,
      bool? isDeleted,
      bool? isMute,
      String? lastMsg,
      int? newMsgCount,
      DateTime? time,
      String? title,
      String? profileImage,
      String? userIdOrRoomId,
      List<String>? usersIds,
      int? type,
      Map<String, String>? deleteChatIds,
      Map<String, num>? unreadCounts}) {
    _title = title;
    _conversationId = conversationId;
    _iAmBlocked = iAmBlocked;
    _iBlocked = iBlocked;
    _deletedId = deletedId;
    _isDeleted = isDeleted;
    _isMute = isMute;
    _lastMsg = lastMsg;
    _newMsgCount = newMsgCount;
    _time = time;
    _profileImage = profileImage;
    _type = type;
    _userIdOrRoomId = userIdOrRoomId;
    _usersIds = usersIds;
    _deleteChatIds = deleteChatIds;
    _unreadCounts = unreadCounts;
  }

  factory ChatUserRoom.fromFireStore(
    DocumentSnapshot<Map<String, dynamic>> snapshot,
    SnapshotOptions? options,
  ) {
    final data = snapshot.data();
    return ChatUserRoom(
        conversationId: data?['conversationId'],
        iAmBlocked: data?['iAmBlocked'],
        iBlocked: data?['iBlocked'],
        deletedId: data?['deletedId'],
        isDeleted: data?['isDeleted'],
        isMute: data?['isMute'],
        lastMsg: data?['lastMsg'],
        newMsgCount: data?['newMsgCount'],
        time: (data?['time'] as Timestamp?)?.toDate(),
        type: data?['type'],
        title: data?['title'],
        profileImage: data?['profileImage'],
        userIdOrRoomId: data?['userIdOrRoomId'],
        usersIds: data?['usersIds'].cast<num>(),
        deleteChatIds: data?['deleteChatIds'],
        unreadCounts: data?['unreadCounts']);
  }

  String? get conversationId => _conversationId;

  List<String>? get usersIds => _usersIds;

  set usersIds(List<String>? value) {
    _usersIds = value;
  }

  bool? get iAmBlocked => _iAmBlocked;

  Map<String, dynamic> toFireStore() {
    return {
      if (conversationId != null) "conversationId": _conversationId,
      if (iAmBlocked != null) "iAmBlocked": _iAmBlocked,
      if (iBlocked != null) "iBlocked": _iBlocked,
      if (deletedId != null) "deletedId": _deletedId,
      if (isDeleted != null) "isDeleted": _isDeleted,
      if (isMute != null) "isMute": _isMute,
      if (lastMsg != null) "lastMsg": _lastMsg,
      if (newMsgCount != null) "newMsgCount": _newMsgCount,
      if (time != null) "time": _time,
      if (type != null) "type": _type,
      if (title != null) "title": _title,
      if (profileImage != null) "profileImage": _profileImage,
      if (userIdOrRoomId != null) "userIdOrRoomId": _userIdOrRoomId,
      if (usersIds != null) "usersIds": _usersIds,
      if (deleteChatIds != null) "deleteChatIds": _deleteChatIds,
      if (unreadCounts != null) "unreadCounts": _unreadCounts
    };
  }

  ChatUserRoom.fromJson(Map<String, dynamic> json) {
    _conversationId = json["conversationId"];
    _iAmBlocked = json["iAmBlocked"];
    _iBlocked = json["iBlocked"];
    _deletedId = json["deletedId"];
    _isDeleted = json["isDeleted"];
    _isMute = json["isMute"];
    _lastMsg = json["lastMsg"];
    _newMsgCount = json["newMsgCount"];
    _time = (json['time'] as Timestamp?)?.toDate();
    _type = json["type"];
    _title = json["title"];
    _profileImage = json["profileImage"];
    _userIdOrRoomId = json["userIdOrRoomId"];
    // ignore: prefer_null_aware_operators
    _usersIds = json['usersIds'] == null ? null : json['usersIds'].cast<num>();
    _deleteChatIds = json['deleteChatIds'] == null ? null : json['deleteChatIds'].cast<String, String>();

    _unreadCounts =
        // ignore: prefer_null_aware_operators
        json['unreadCounts'] == null ? null : json['unreadCounts'].cast<String, num>();
  }

  Map<String, Object?> toJson() {
    return {
      "conversationId": _conversationId,
      "iAmBlocked": _iAmBlocked,
      "iBlocked": _iBlocked,
      "deletedId": _deletedId,
      "isDeleted": _isDeleted,
      "isMute": _isMute,
      "lastMsg": _lastMsg,
      "newMsgCount": _newMsgCount,
      "time": _time,
      "title": _title,
      "profileImage": _profileImage,
      "type": _type,
      "userIdOrRoomId": _userIdOrRoomId,
      "usersIds": _usersIds,
      'deleteChatIds': deleteChatIds,
      'unreadCounts': unreadCounts,
    };
  }

  void setConversationId(String? con) {
    _conversationId = con;
  }

  bool? get iBlocked => _iBlocked;

  String? get deletedId => _deletedId;

  bool? get isDeleted => _isDeleted;

  bool? get isMute => _isMute;

  String? get lastMsg => _lastMsg;

  int? get newMsgCount => _newMsgCount;

  String? get title => _title;

  String? get profileImage => _profileImage;

  Map<String, num>? get unreadCounts => _unreadCounts;

  Map<String, String>? get deleteChatIds => _deleteChatIds;

  /// 0 = RequestChat
  /// 1 = UserChat
  /// 2 = RoomChat
  int? get type => _type;

  String? get userIdOrRoomId => _userIdOrRoomId;

  DateTime? get time => _time;

  set type(int? value) {
    _type = value;
  }

  set time(DateTime? value) {
    _time = value;
  }

  set lastMsg(String? value) {
    _lastMsg = value;
  }

  set newMsgCount(int? value) {
    _newMsgCount = value;
  }

  set iAmBlocked(bool? value) {
    _iAmBlocked = value;
  }

  set iBlocked(bool? value) {
    _iBlocked = value;
  }

  set isDeleted(bool? value) {
    _isDeleted = value;
  }

  set unreadCounts(Map<String, num>? value) {
    _unreadCounts = value;
  }

  set deleteChatIds(Map<String, String>? value) {
    _deleteChatIds = value;
  }
}

class ChatUser {
  String? _userid;
  String? _fullName;
  String? _image;
  bool? _isVerified;

  ChatUser({
    String? fullName,
    String? image,
    bool? isVerified,
    String? userid,
  }) {
    _fullName = fullName;
    _image = image;
    _isVerified = isVerified;
    _userid = userid;
  }

  Map<String, dynamic> toJson() {
    return {
      "fullName": _fullName,
      "image": _image,
      "isVerified": _isVerified,
      "userid": _userid,
    };
  }

  ChatUser.fromJson(Map<String, dynamic> json) {
    _fullName = json["fullName"];
    _image = json["image"];
    _isVerified = json["isVerified"];
    _userid = json["userid"];
  }

  bool? get isVerified => _isVerified;

  String? get image => _image;

  String? get fullName => _fullName;

  String? get userid => _userid;
}

class ChatMessage {
  String? sId;
  String? room;
  Sender? sender;
  String? receiver;
  String? content;
  String? status;
  String? msgType;
  bool? isRead;
  List<String>? deletedIds;
  String? thumbnail;
  String? createdAt;
  String? updatedAt;
  String? timestamp;
  int? iV;

  ChatMessage(
      {this.sId,
      this.room,
      this.sender,
      this.receiver,
      this.content,
      this.status,
      this.isRead,
      this.thumbnail,
      this.deletedIds,
      this.msgType,
      this.createdAt,
      this.timestamp,
      this.updatedAt,
      this.iV});

  ChatMessage.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    room = json['room'];
    sender = json['sender'] != null ? new Sender.fromJson(json['sender']) : null;
    receiver = json['receiver'];
    content = json['content'];
    status = json['status'];
    isRead = json['isRead'];
    createdAt = json['createdAt'];
    updatedAt = json['updatedAt'];
    msgType = json['msgType'];
    timestamp = json['timestamp'];

    iV = json['__v'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    data['room'] = this.room;
    if (this.sender != null) {
      data['sender'] = this.sender!.toJson();
    }
    data['receiver'] = this.receiver;
    data['content'] = this.content;
    data['status'] = this.status;
    data['isRead'] = this.isRead;
    data['createdAt'] = this.createdAt;
    data['updatedAt'] = this.updatedAt;
    data['timestamp'] = this.timestamp;

    data['msgType'] = this.msgType;
    data['__v'] = this.iV;
    return data;
  }
}

extension ChatUserExt on User {
  ChatUser toChatUser() {
    return ChatUser(fullName: fullName, image: profile, isVerified: isVerified == 1, userid: id);
  }
}
