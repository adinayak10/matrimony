import 'package:banjaramatch/models/json_parse.dart';

/// Call history row from `GET /api/calls/history`.
class CallLog {
  CallLog({
    this.id,
    this.caller,
    this.callee,
    this.chatRoomId,
    this.channelName,
    this.callType = 'audio',
    this.status,
    this.direction,
    this.durationSeconds = 0,
    this.startedAt,
    this.answeredAt,
    this.endedAt,
    this.createdAt,
  });

  String? id;
  CallParty? caller;
  CallParty? callee;
  String? chatRoomId;
  String? channelName;

  /// audio | video
  String callType;

  /// ringing | accepted | rejected | ended | missed
  String? status;

  /// outgoing | incoming (from the API; computed by [isOutgoing] when absent)
  String? direction;
  int durationSeconds;
  DateTime? startedAt;
  DateTime? answeredAt;
  DateTime? endedAt;
  DateTime? createdAt;

  factory CallLog.fromJson(dynamic json) {
    final m = jsonMap(json);
    return CallLog(
      id: jsonId(m['_id']),
      caller: m['caller'] != null ? CallParty.fromJson(m['caller']) : null,
      callee: m['callee'] != null ? CallParty.fromJson(m['callee']) : null,
      chatRoomId: jsonId(m['chatRoom']),
      channelName: jsonString(m['channelName']),
      callType: jsonString(m['callType']) ?? 'audio',
      status: jsonString(m['status']),
      direction: jsonString(m['direction']),
      durationSeconds: jsonInt(m['durationSeconds']) ?? 0,
      startedAt: jsonDate(m['startedAt']),
      answeredAt: jsonDate(m['answeredAt']),
      endedAt: jsonDate(m['endedAt']),
      createdAt: jsonDate(m['createdAt']),
    );
  }

  bool get isVideo => callType == 'video';

  bool get isMissed => status == 'missed';

  bool isOutgoing(String myUserId) {
    if (direction != null) return direction == 'outgoing';
    return caller?.id == myUserId;
  }

  /// The person on the other end of the call.
  CallParty? otherParty(String myUserId) => isOutgoing(myUserId) ? callee : caller;

  static List<CallLog> listFrom(dynamic data) => jsonList(data).whereType<Map>().map((e) => CallLog.fromJson(e)).toList();
}

/// Populated caller/callee (`full_name`, `profile`); may also be a bare id.
class CallParty {
  CallParty({this.id, this.fullName, this.profile});

  String? id;
  String? fullName;
  String? profile;

  factory CallParty.fromJson(dynamic json) {
    if (json is! Map) return CallParty(id: jsonString(json));
    final m = jsonMap(json);
    return CallParty(
      id: jsonId(m['_id']),
      fullName: jsonString(m['full_name'] ?? m['fullName']),
      profile: jsonString(m['profile']),
    );
  }
}

/// One page of call history.
class CallHistoryPage {
  CallHistoryPage({this.calls = const [], this.total = 0, this.page = 1, this.limit = 20});

  List<CallLog> calls;
  int total;
  int page;
  int limit;

  bool get hasMore => total > 0 ? page * limit < total : calls.length >= limit;
}
