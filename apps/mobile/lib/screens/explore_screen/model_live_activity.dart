// live_activity_model.dart
class LiveActivityResponse {
  final bool status;
  final String message;
  final List<LiveActivity> data;

  LiveActivityResponse({
    required this.status,
    required this.message,
    required this.data,
  });

  factory LiveActivityResponse.fromJson(dynamic json) {
    return LiveActivityResponse(
      status: json['status'] ?? false,
      message: json['message'] ?? '',
      data: json['data'] != null ? List<LiveActivity>.from(json['data'].map((x) => LiveActivity.fromJson(x))) : [],
    );
  }

  Map<String, dynamic> toJson() => {
        'status': status,
        'message': message,
        'data': data.map((x) => x.toJson()).toList(),
      };
}

class LiveActivity {
  final String userId; // new: ID of the user performing the activity
  final String title;
  final String timeAgo;
  final String icon; // e.g., "person_add", "favorite", "visibility", "message"
  final String? type; // optional: "joined", "match", "view", "message"

  LiveActivity({
    required this.userId,
    required this.title,
    required this.timeAgo,
    required this.icon,
    this.type,
  });

  factory LiveActivity.fromJson(Map<String, dynamic> json) {
    return LiveActivity(
      userId: json['userId'] ?? '',
      title: json['title'] ?? '',
      timeAgo: json['timeAgo'] ?? '',
      icon: json['icon'] ?? '',
      type: json['type'],
    );
  }

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'title': title,
        'timeAgo': timeAgo,
        'icon': icon,
        if (type != null) 'type': type,
      };
}
