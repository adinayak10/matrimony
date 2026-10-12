class ModelDropdownCommonList {
  bool? status;
  String? message;
  List<CommonItem>? data;

  ModelDropdownCommonList({this.status, this.message, this.data});

  ModelDropdownCommonList.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    if (json['data'] != null) {
      data = <CommonItem>[];
      json['data'].forEach((v) {
        data!.add(new CommonItem.fromJson(v));
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

class CommonItem {
  String? sId;
  String? name;
  int? iV;
  String? createdAt;
  String? updatedAt;

  CommonItem({this.sId, this.name, this.iV, this.createdAt, this.updatedAt});

  CommonItem.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    name = json['name'];
    iV = json['__v'];
    createdAt = json['createdAt'];
    updatedAt = json['updatedAt'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    data['name'] = this.name;
    data['__v'] = this.iV;
    data['createdAt'] = this.createdAt;
    data['updatedAt'] = this.updatedAt;
    return data;
  }
}
