class ModelCasteGotraList {
  bool? status;
  String? message;
  List<CasteGotra>? data;

  ModelCasteGotraList({this.status, this.message, this.data});

  ModelCasteGotraList.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    if (json['data'] != null) {
      data = <CasteGotra>[];
      json['data'].forEach((v) {
        data!.add(new CasteGotra.fromJson(v));
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

class CasteGotra {
  String? sId;
  String? name;
  String? createdAt;
  String? updatedAt;
  int? iV;

  CasteGotra({this.sId, this.name, this.createdAt, this.updatedAt, this.iV});

  CasteGotra.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    name = json['name'];
    createdAt = json['createdAt'];
    updatedAt = json['updatedAt'];
    iV = json['__v'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    data['name'] = this.name;
    data['createdAt'] = this.createdAt;
    data['updatedAt'] = this.updatedAt;
    data['__v'] = this.iV;
    return data;
  }
}
