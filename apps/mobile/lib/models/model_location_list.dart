class ModelLocationList {
  bool? status;
  List<LocationData>? data;
  int? total;

  ModelLocationList({this.status, this.data, this.total});

  ModelLocationList.fromJson(dynamic json) {
    status = json['status'];
    if (json['data'] != null) {
      data = <LocationData>[];
      json['data'].forEach((v) {
        data!.add(new LocationData.fromJson(v));
      });
    }
    total = json['total'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    if (this.data != null) {
      data['data'] = this.data!.map((v) => v.toJson()).toList();
    }
    data['total'] = this.total;
    return data;
  }
}

class LocationData {
  String? sId;
  String? name;
  String? isoCode;
  int? iV;

  LocationData({this.sId, this.name, this.isoCode, this.iV});

  LocationData.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    name = json['name'];
    isoCode = json['isoCode'];
    iV = json['__v'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    data['name'] = this.name;
    data['isoCode'] = this.isoCode;
    data['__v'] = this.iV;
    return data;
  }
}
