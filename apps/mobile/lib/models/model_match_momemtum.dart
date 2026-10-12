class ModelMatchMomemtum {
  bool? status;
  String? message;
  MatchMomentum? data;

  ModelMatchMomemtum({this.status, this.message, this.data});

  ModelMatchMomemtum.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    data = json['data'] != null ? new MatchMomentum.fromJson(json['data']) : null;
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

class MatchMomentum {
  int? momentumScore;
  int? percentile;
  String? label;
  Chart? chart;

  MatchMomentum({this.momentumScore, this.percentile, this.label, this.chart});

  MatchMomentum.fromJson(Map<String, dynamic> json) {
    momentumScore = json['momentumScore'];
    percentile = json['percentile'];
    label = json['label'];
    chart = json['chart'] != null ? new Chart.fromJson(json['chart']) : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['momentumScore'] = this.momentumScore;
    data['percentile'] = this.percentile;
    data['label'] = this.label;
    if (this.chart != null) {
      data['chart'] = this.chart!.toJson();
    }
    return data;
  }
}

class Chart {
  int? views;
  int? interests;
  int? replies;
  int? shortlists;

  Chart({this.views, this.interests, this.replies, this.shortlists});

  Chart.fromJson(Map<String, dynamic> json) {
    views = json['views'];
    interests = json['interests'];
    replies = json['replies'];
    shortlists = json['shortlists'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['views'] = this.views;
    data['interests'] = this.interests;
    data['replies'] = this.replies;
    data['shortlists'] = this.shortlists;
    return data;
  }
}
