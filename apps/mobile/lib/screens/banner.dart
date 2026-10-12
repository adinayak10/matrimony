class ModelBannerList {
  bool? status;
  String? message;
  List<AppBanner>? data;

  ModelBannerList({this.status, this.message, this.data});

  ModelBannerList.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    if (json['data'] != null) {
      data = <AppBanner>[];
      json['data'].forEach((v) {
        data!.add(new AppBanner.fromJson(v));
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

class AppBanner {
  String? sId;
  String? title;
  String? imageUrl;
  String? link;
  String? createdAt;
  int? iV;

  AppBanner({this.sId, this.title, this.imageUrl, this.link, this.createdAt, this.iV});

  AppBanner.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    title = json['title'];
    imageUrl = json['imageUrl'];
    link = json['link'];
    createdAt = json['createdAt'];
    iV = json['__v'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    data['title'] = this.title;
    data['imageUrl'] = this.imageUrl;
    data['link'] = this.link;
    data['createdAt'] = this.createdAt;
    data['__v'] = this.iV;
    return data;
  }
}
