class PreferenceFitModel {
  bool? status;
  String? message;
  List<MatchList>? matchList;
  List<Common>? common;

  PreferenceFitModel({this.status, this.message, this.matchList, this.common});

  PreferenceFitModel.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    if (json['matchList'] != null) {
      matchList = <MatchList>[];
      json['matchList'].forEach((v) {
        matchList!.add(new MatchList.fromJson(v));
      });
    }
    if (json['common'] != null) {
      common = <Common>[];
      json['common'].forEach((v) {
        common!.add(new Common.fromJson(v));
      });
    }
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    data['message'] = this.message;
    if (this.matchList != null) {
      data['matchList'] = this.matchList!.map((v) => v.toJson()).toList();
    }
    if (this.common != null) {
      data['common'] = this.common!.map((v) => v.toJson()).toList();
    }
    return data;
  }
}

class MatchList {
  String? label;
  dynamic viewerValue;
  String? expectedValue;
  bool? isFit;

  MatchList({this.label, this.viewerValue, this.expectedValue, this.isFit});

  MatchList.fromJson(Map<String, dynamic> json) {
    label = json['label'];
    viewerValue = json['viewerValue'];
    expectedValue = json['expectedValue'];
    isFit = json['isFit'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['label'] = this.label;
    data['viewerValue'] = this.viewerValue;
    data['expectedValue'] = this.expectedValue;
    data['isFit'] = this.isFit;
    return data;
  }
}

class Common {
  String? label;
  List<String>? value;

  Common({this.label, this.value});

  Common.fromJson(Map<String, dynamic> json) {
    label = json['label'];
    value = json['value'].cast<String>();
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['label'] = this.label;
    data['value'] = this.value;
    return data;
  }
}
