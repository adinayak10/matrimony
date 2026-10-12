class MarrigeIntentModel {
  bool? status;
  String? message;
  MarrigeIntent? data;

  MarrigeIntentModel({this.status, this.message, this.data});

  MarrigeIntentModel.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    data = json['data'] != null ? new MarrigeIntent.fromJson(json['data']) : null;
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

class MarrigeIntent {
  String? userId;
  int? sentCount;
  int? acceptedCount;
  int? shortlistCount;
  int? viewsMade;
  int? viewsReceived;
  int? rejectedCount;
  String? rejectionRate;
  int? totalTimeSpent;
  int? profileStrength;
  int? daysRecentlyActive;
  int? score;
  String? status;

  MarrigeIntent(
      {this.userId,
      this.sentCount,
      this.acceptedCount,
      this.shortlistCount,
      this.viewsMade,
      this.viewsReceived,
      this.rejectedCount,
      this.rejectionRate,
      this.totalTimeSpent,
      this.profileStrength,
      this.daysRecentlyActive,
      this.score,
      this.status});

  MarrigeIntent.fromJson(Map<String, dynamic> json) {
    userId = json['userId'];
    sentCount = json['sentCount'];
    acceptedCount = json['acceptedCount'];
    shortlistCount = json['shortlistCount'];
    viewsMade = json['viewsMade'];
    viewsReceived = json['viewsReceived'];
    rejectedCount = json['rejectedCount'];
    rejectionRate = json['rejectionRate'];
    totalTimeSpent = json['totalTimeSpent'];
    profileStrength = json['profileStrength'];
    daysRecentlyActive = json['daysRecentlyActive'];
    score = json['score'];
    status = json['status'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['userId'] = this.userId;
    data['sentCount'] = this.sentCount;
    data['acceptedCount'] = this.acceptedCount;
    data['shortlistCount'] = this.shortlistCount;
    data['viewsMade'] = this.viewsMade;
    data['viewsReceived'] = this.viewsReceived;
    data['rejectedCount'] = this.rejectedCount;
    data['rejectionRate'] = this.rejectionRate;
    data['totalTimeSpent'] = this.totalTimeSpent;
    data['profileStrength'] = this.profileStrength;
    data['daysRecentlyActive'] = this.daysRecentlyActive;
    data['score'] = this.score;
    data['status'] = this.status;
    return data;
  }
}
