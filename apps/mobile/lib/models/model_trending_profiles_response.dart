class ModelTrendingProfileListResponse {
  bool? status;
  String? message;
  List<Result>? result;

  ModelTrendingProfileListResponse({this.status, this.message, this.result});

  ModelTrendingProfileListResponse.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    if (json['result'] != null) {
      result = <Result>[];
      json['result'].forEach((v) {
        result!.add(new Result.fromJson(v));
      });
    }
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    data['message'] = this.message;
    if (this.result != null) {
      data['result'] = this.result!.map((v) => v.toJson()).toList();
    }
    return data;
  }
}

class Result {
  String? label;
  TrendingUser? user;
  List<String>? gradient;
  List<String>? bgGradient;

  Result({this.label, this.user, this.gradient, this.bgGradient});

  Result.fromJson(Map<String, dynamic> json) {
    label = json['label'];
    user = json['user'] != null ? new TrendingUser.fromJson(json['user']) : null;
    gradient = json['gradient'].cast<String>();
    bgGradient = json['bgGradient'].cast<String>();
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['label'] = this.label;
    if (this.user != null) {
      data['user'] = this.user!.toJson();
    }
    data['gradient'] = this.gradient;
    data['bgGradient'] = this.bgGradient;
    return data;
  }
}

class TrendingUser {
  String? id;
  String? name;
  String? dob;
  String? profession;
  String? location;
  String? profile;
  int? views;
  bool? verified;
  bool? isOnline;
  bool? isShortListed;

  TrendingUser({this.id, this.name, this.dob, this.profession, this.location, this.views, this.verified, this.profile, this.isOnline, this.isShortListed});

  TrendingUser.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    name = json['name'];
    dob = json['dob'];
    profession = json['profession'];
    location = json['location'];
    views = json['views'];
    verified = json['verified'];
    profile = json['profile'];
    isOnline = json['isOnline'];
    isShortListed = json['isShortListed'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['id'] = this.id;
    data['name'] = this.name;
    data['dob'] = this.dob;
    data['profession'] = this.profession;
    data['location'] = this.location;
    data['views'] = this.views;
    data['verified'] = this.verified;
    data['profile'] = this.profile;
    data['isOnline'] = this.isOnline;
    data['isShortListed'] = this.isShortListed;
    return data;
  }
}
