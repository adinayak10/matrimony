import 'package:banjaramatch/models/setting_model.dart';

class ModelIncomeRangeList {
  bool? status;
  List<IncomeRange>? data;

  ModelIncomeRangeList({this.status, this.data});

  ModelIncomeRangeList.fromJson(Map<String, dynamic> json) {
    status = json['status'];
    if (json['data'] != null) {
      data = <IncomeRange>[];
      json['data'].forEach((v) {
        data!.add(new IncomeRange.fromJson(v));
      });
    }
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    if (this.data != null) {
      data['data'] = this.data!.map((v) => v.toJson()).toList();
    }
    return data;
  }
}
