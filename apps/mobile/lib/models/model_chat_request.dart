import 'model_chat_room_list.dart';

class ModelChatRequest {
  bool? status;
  String? message;
  List<ChatRoom>? data;

  ModelChatRequest({this.status, this.message, this.data});

  ModelChatRequest.fromJson(dynamic json) {
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
