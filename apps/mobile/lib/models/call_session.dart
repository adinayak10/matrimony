import 'package:banjaramatch/models/json_parse.dart';

/// A live call as seen by this device (built from socket payloads).
///
/// Server events: `call_ringing {callId, roomId, channelName, callType}` (to the
/// caller), `call_incoming {callId, roomId, channelName, callType, fromUserId,
/// fromUserName, fromUserProfile}` (to the callee), `call_accepted {callId,
/// channelName}`. FCM `type:'call'` data carries the same keys as call_incoming.
class CallSession {
  CallSession({
    this.callId,
    this.roomId,
    this.channelName,
    this.callType = 'audio',
    this.peerUserId,
    this.peerName,
    this.peerProfile,
    this.isCaller = false,
    this.token,
  });

  String? callId;
  String? roomId;
  String? channelName;

  /// audio | video
  String callType;
  String? peerUserId;
  String? peerName;
  String? peerProfile;

  /// True on the device that started the call.
  bool isCaller;

  /// Set once `CallService.fetchToken` succeeds (only after accept).
  CallToken? token;

  bool get isVideo => callType == 'video';

  /// From `call_incoming` (socket) or FCM data with `type:'call'`.
  factory CallSession.fromIncoming(dynamic data) {
    final m = jsonMap(data);
    return CallSession(
      callId: jsonId(m['callId']),
      roomId: jsonId(m['roomId']),
      channelName: jsonString(m['channelName']),
      callType: jsonString(m['callType']) ?? 'audio',
      peerUserId: jsonId(m['fromUserId']),
      peerName: jsonString(m['fromUserName']),
      peerProfile: jsonString(m['fromUserProfile']),
      isCaller: false,
    );
  }

  /// Merges `call_ringing` / `call_accepted` payloads into this session.
  void applyServerEvent(dynamic data) {
    final m = jsonMap(data);
    callId = jsonId(m['callId']) ?? callId;
    roomId = jsonId(m['roomId']) ?? roomId;
    channelName = jsonString(m['channelName']) ?? channelName;
    callType = jsonString(m['callType']) ?? callType;
  }

  /// True when a socket payload refers to this call (or carries no id).
  bool matches(dynamic data) {
    final id = jsonId(jsonMap(data)['callId']);
    return id == null || callId == null || id == callId;
  }
}

/// `POST /api/calls/token` data.
class CallToken {
  CallToken({required this.appId, required this.channelName, required this.token, this.uid = 0, this.expiresAt});

  String appId;
  String channelName;
  String token;
  int uid;
  DateTime? expiresAt;

  factory CallToken.fromJson(dynamic json) {
    final m = jsonMap(json);
    return CallToken(
      appId: jsonString(m['appId']) ?? '',
      channelName: jsonString(m['channelName']) ?? '',
      token: jsonString(m['token']) ?? '',
      uid: jsonInt(m['uid']) ?? 0,
      expiresAt: jsonDate(m['expiresAt']),
    );
  }

  bool get isValid => appId.isNotEmpty && token.isNotEmpty && channelName.isNotEmpty;
}
