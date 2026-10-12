import 'model_chat_messages.dart';
import 'model_chat_room_list.dart';

class ModelFetchRoomId {
  bool? status;
  String? message;
  ChatRoom? room;

  ModelFetchRoomId({this.status, this.message, this.room});

  ModelFetchRoomId.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    room = json['room'] != null ? new ChatRoom.fromJson(json['room']) : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    data['message'] = this.message;
    if (this.room != null) {
      data['room'] = this.room!.toJson();
    }
    return data;
  }
}

class LastMessage {
  String? id;
  String? content;
  String? status;
  String? timestamp;
  Sender? sender;

  LastMessage({this.id, this.content, this.status, this.timestamp, this.sender});

  LastMessage.fromJson(dynamic json) {
    id = json['id'];
    content = json['content'];
    status = json['status'];
    timestamp = json['timestamp'];
    sender = json['sender'] != null ? new Sender.fromJson(json['sender']) : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['id'] = this.id;
    data['content'] = this.content;
    data['status'] = this.status;
    data['timestamp'] = this.timestamp;
    if (this.sender != null) {
      data['sender'] = this.sender!.toJson();
    }
    return data;
  }
}
