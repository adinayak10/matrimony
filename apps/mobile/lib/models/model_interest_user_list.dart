import 'package:banjaramatch/models/registration.dart';

class ModelInterestedUserList {
  bool? status;
  String? message;
  int? currentPage;
  int? total;
  int? totalPages;
  List<UserInterest>? data;

  ModelInterestedUserList({this.status, this.message, this.currentPage, this.total, this.totalPages, this.data});

  ModelInterestedUserList.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    currentPage = json['currentPage'];
    total = json['total'];
    totalPages = json['totalPages'];
    if (json['data'] != null) {
      data = <UserInterest>[];
      json['data'].forEach((v) {
        data!.add(new UserInterest.fromJson(v));
      });
    }
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    data['message'] = this.message;
    data['currentPage'] = this.currentPage;
    data['total'] = this.total;
    data['totalPages'] = this.totalPages;
    if (this.data != null) {
      data['data'] = this.data!.map((v) => v.toJson()).toList();
    }
    return data;
  }
}

class UserInterest {
  String? sId;
  User? user;
  String? status;
  String? type;
  String? createdAt;
  String? updatedAt;

  UserInterest({this.sId, this.user, this.status, this.type, this.createdAt, this.updatedAt});

  UserInterest.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    user = json['user'] != null ? new User.fromJson(json['user']) : null;
    status = json['status'];
    type = json['type'];
    createdAt = json['createdAt'];
    updatedAt = json['updatedAt'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    if (this.user != null) {
      data['user'] = this.user!.toJson();
    }
    data['status'] = this.status;
    data['type'] = this.type;
    data['createdAt'] = this.createdAt;
    data['updatedAt'] = this.updatedAt;
    return data;
  }
}
