class UserOnlinePatternModel {
  bool? status;
  String? message;
  OnlinePattern? data;

  UserOnlinePatternModel({this.status, this.message, this.data});

  UserOnlinePatternModel.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    data = json['data'] != null ? new OnlinePattern.fromJson(json['data']) : null;
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

class OnlinePattern {
  String? pattern;

  OnlinePattern({this.pattern});

  OnlinePattern.fromJson(Map<String, dynamic> json) {
    pattern = json['pattern'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['pattern'] = this.pattern;
    return data;
  }
}
