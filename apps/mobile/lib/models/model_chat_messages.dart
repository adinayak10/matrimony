import 'package:banjaramatch/models/chat.dart';

class ModelUserRoomChatList {
  bool? status;
  String? message;
  Data? data;

  ModelUserRoomChatList({this.status, this.message, this.data});

  ModelUserRoomChatList.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    data = json['data'] != null ? new Data.fromJson(json['data']) : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    data['message'] = this.message;
    if (this.data != null) {
      data['data'] = this.data!.toJson();
    }
    return data;
  }
}

class Data {
  List<ChatMessage>? messages;
  int? currentPage;
  int? totalPages;
  int? totalCount;

  Data({this.messages, this.currentPage, this.totalPages, this.totalCount});

  Data.fromJson(Map<String, dynamic> json) {
    if (json['messages'] != null) {
      messages = <ChatMessage>[];
      json['messages'].forEach((v) {
        messages!.add(new ChatMessage.fromJson(v));
      });
    }
    currentPage = json['currentPage'];
    totalPages = json['totalPages'];
    totalCount = json['totalCount'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    if (this.messages != null) {
      data['messages'] = this.messages!.map((v) => v.toJson()).toList();
    }
    data['currentPage'] = this.currentPage;
    data['totalPages'] = this.totalPages;
    data['totalCount'] = this.totalCount;
    return data;
  }
}

class Sender {
  String? sId;
  String? profile;
  String? fullName;

  Sender({this.sId, this.profile, this.fullName});

  Sender.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    profile = json['profile'];
    fullName = json['full_name'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    data['profile'] = this.profile;
    data['full_name'] = this.fullName;
    return data;
  }
}
