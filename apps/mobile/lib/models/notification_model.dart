import 'package:banjaramatch/models/registration.dart';

class NotificationModel {
  NotificationModel({
    this.status,
    this.message,
    this.data,
  });

  NotificationModel.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    if (json['data'] != null) {
      data = [];
      json['data'].forEach((v) {
        data?.add(PlatformNotification.fromJson(v));
      });
    }
  }

  bool? status;
  String? message;
  List<PlatformNotification>? data;

  NotificationModel copyWith({
    bool? status,
    String? message,
    List<PlatformNotification>? data,
  }) =>
      NotificationModel(
        status: status ?? this.status,
        message: message ?? this.message,
        data: data ?? this.data,
      );

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['status'] = status;
    map['message'] = message;
    if (data != null) {
      map['data'] = data?.map((v) => v.toJson()).toList();
    }
    return map;
  }
}

class PlatformNotification {
  PlatformNotification({
    this.id,
    this.type,
    this.title,
    this.description,
    this.createdAt,
    this.updatedAt,
    this.fromUser,
    this.toUser,
    this.data,
    this.isRead,
  });

  String? id;
  String? type;
  String? title;
  String? description;
  String? createdAt;
  String? updatedAt;
  User? fromUser;
  String? toUser;
  User? data;
  bool? isRead;

  PlatformNotification.fromJson(dynamic json) {
    id = json['_id'];
    type = json['type'];
    title = json['type']?.replaceAll('_', ' ').capitalizeFirst;
    description = json['content'];
    createdAt = json['createdAt'];
    updatedAt = json['updatedAt'];
    toUser = json['toUser'];
    isRead = json['isRead'];
    fromUser = json['fromUser'] != null ? User.fromJson(json['fromUser']) : null;
    data = json['data'] != null ? User.fromJson(json['data']) : null;
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['_id'] = id;
    map['type'] = type;
    map['title'] = title;
    map['content'] = description;
    map['createdAt'] = createdAt;
    map['updatedAt'] = updatedAt;
    map['toUser'] = toUser;
    map['isRead'] = isRead;
    if (fromUser != null) map['fromUser'] = fromUser!.toJson();
    if (data != null) map['data'] = data!.toJson();
    return map;
  }
}
