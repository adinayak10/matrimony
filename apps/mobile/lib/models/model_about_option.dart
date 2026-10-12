class AboutOptionModel {
  bool? status;
  String? message;
  AboutOption? data;

  AboutOptionModel({this.status, this.message, this.data});

  AboutOptionModel.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    data = json['data'] != null ? new AboutOption.fromJson(json['data']) : null;
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

class AboutOption {
  List<String>? tone;
  List<String>? trait;
  List<String>? hobby;
  List<String>? goal;

  AboutOption({this.tone, this.trait, this.hobby, this.goal});

  AboutOption.fromJson(Map<String, dynamic> json) {
    tone = json['tone'].cast<String>();
    trait = json['trait'].cast<String>();
    hobby = json['hobby'].cast<String>();
    goal = json['goal'].cast<String>();
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['tone'] = this.tone;
    data['trait'] = this.trait;
    data['hobby'] = this.hobby;
    data['goal'] = this.goal;
    return data;
  }
}
