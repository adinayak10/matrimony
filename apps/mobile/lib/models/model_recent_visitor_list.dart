import 'package:banjaramatch/models/registration.dart';

class ModelRecentUserList {
  bool? status;
  String? message;
  String? type;
  int? page;
  int? limit;
  int? total;
  List<User>? data;

  ModelRecentUserList({this.status, this.message, this.type, this.page, this.limit, this.total, this.data});

  ModelRecentUserList.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    type = json['type'];
    page = json['page'];
    limit = json['limit'];
    total = json['total'];
    if (json['data'] != null) {
      data = <User>[];
      json['data'].forEach((v) {
        data!.add(new User.fromJson(v));
      });
    }
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    data['message'] = this.message;
    data['type'] = this.type;
    data['page'] = this.page;
    data['limit'] = this.limit;
    data['total'] = this.total;
    if (this.data != null) {
      data['data'] = this.data!.map((v) => v.toJson()).toList();
    }
    return data;
  }
}
