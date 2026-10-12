class UserNotificationModel {
  bool? status;
  String? message;
  List<UserNotification>? data;
  int? total;
  int? currentPage;
  int? totalPages;

  UserNotificationModel({this.status, this.message, this.data, this.total, this.currentPage, this.totalPages});

  UserNotificationModel.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    if (json['data'] != null) {
      data = <UserNotification>[];
      json['data'].forEach((v) {
        data!.add(new UserNotification.fromJson(v));
      });
    }
    total = json['total'];
    currentPage = json['currentPage'];
    totalPages = json['totalPages'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    data['message'] = this.message;

    data['total'] = this.total;
    data['currentPage'] = this.currentPage;
    data['totalPages'] = this.totalPages;
    return data;
  }
}

class UserNotification {
  String? sId;
  String? type;
  FromUser? fromUser;
  String? toUser;
  String? content;

  bool? isRead;
  String? createdAt;
  int? iV;

  UserNotification(
      {this.sId, this.type, this.fromUser, this.toUser, this.content, this.isRead, this.createdAt, this.iV});

  UserNotification.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    type = json['type'];
    fromUser = json['fromUser'] != null ? new FromUser.fromJson(json['fromUser']) : null;
    toUser = json['toUser'];
    content = json['content'];

    isRead = json['isRead'];
    createdAt = json['createdAt'];
    iV = json['__v'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    data['type'] = this.type;
    if (this.fromUser != null) {
      data['fromUser'] = this.fromUser!.toJson();
    }
    data['toUser'] = this.toUser;
    data['content'] = this.content;

    data['isRead'] = this.isRead;
    data['createdAt'] = this.createdAt;
    data['__v'] = this.iV;
    return data;
  }
}

class FromUser {
  String? sId;
  String? profile;
  String? fullName;

  FromUser({this.sId, this.profile, this.fullName});

  FromUser.fromJson(Map<String, dynamic> json) {
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
