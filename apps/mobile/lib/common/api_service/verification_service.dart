import 'package:banjaramatch/common/api_service/api_service.dart';
import 'package:banjaramatch/models/json_parse.dart';
import 'package:banjaramatch/models/verification_status_model.dart';
import 'package:banjaramatch/utilities/web_service.dart';

/// Profile verification status. Submitting is `UserService.shared.submitVerification`.
class VerificationService {
  static var shared = VerificationService();

  /// `POST /api/fetchVerificationStatus {}`.
  void fetchStatus({
    required Function(VerificationStatus status) completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.call(
      url: WebService.fetchVerificationStatus,
      param: {},
      completion: (response) {
        if (jsonOk(response) && response is Map && response['data'] is Map) {
          completion(VerificationStatus.fromJson(response['data']));
        } else {
          onError?.call(jsonMessage(response));
        }
      },
    );
  }
}
