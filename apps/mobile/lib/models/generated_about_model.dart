class GeneratedAboutModel {
  bool? status;
  String? message;
  About? data;

  GeneratedAboutModel({this.status, this.message, this.data});

  GeneratedAboutModel.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    data = json['data'] != null ? new About.fromJson(json['data']) : null;
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

class About {
  String? about;

  About({this.about});

  About.fromJson(Map<String, dynamic> json) {
    about = json['about'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['about'] = this.about;
    return data;
  }
}
