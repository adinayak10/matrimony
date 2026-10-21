import 'package:banjaramatch/common/api_service/api_service.dart';
import 'package:banjaramatch/models/call_log_model.dart';
import 'package:banjaramatch/models/call_session.dart';
import 'package:banjaramatch/models/json_parse.dart';
import 'package:banjaramatch/utilities/web_service.dart';

class CallService {
  static var shared = CallService();

  /// `POST /api/calls/token {channelName, user_id}` → appId, channelName, token, uid.
  /// The API mints tokens only for a `ringing|accepted` call between accepted
  /// connections, so call this after `call_accepted` (caller) or after emitting
  /// `call_accept` (callee). [peerUserId] is the other person on the call.
  /// 503 (Agora not configured) / 403 go to [onError] with the server message.
  void fetchToken({
    required String channelName,
    required String peerUserId,
    required Function(CallToken token) completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.call(
      url: WebService.callToken,
      param: {'channelName': channelName, 'user_id': peerUserId},
      completion: (response) {
        if (jsonOk(response) && response is Map && response['data'] is Map) {
          final token = CallToken.fromJson(response['data']);
          if (token.isValid) {
            completion(token);
            return;
          }
        }
        onError?.call(jsonMessage(response));
      },
    );
  }

  /// `GET /api/calls/history?page&limit` (both directions, newest first).
  void fetchHistory({
    int page = 1,
    int limit = 20,
    required Function(CallHistoryPage page) completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.callGet(
      url: WebService.callHistory,
      query: {'page': page, 'limit': limit},
      completion: (response) {
        if (jsonOk(response) && response is Map) {
          completion(CallHistoryPage(
            calls: CallLog.listFrom(response['data']),
            total: jsonInt(response['total']) ?? 0,
            page: jsonInt(response['page']) ?? page,
            limit: jsonInt(response['limit']) ?? limit,
          ));
        } else {
          onError?.call(jsonMessage(response));
        }
      },
    );
  }
}
