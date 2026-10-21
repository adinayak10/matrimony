import 'package:banjaramatch/common/api_service/api_service.dart';
import 'package:banjaramatch/models/guna_milan_model.dart';
import 'package:banjaramatch/models/json_parse.dart';
import 'package:banjaramatch/utilities/web_service.dart';

class CompatibilityService {
  static var shared = CompatibilityService();

  /// `POST /api/compatibility/guna-milan {user_id}` (viewer = token user).
  /// A result with `available == false` is a success (horoscope missing);
  /// 403 BLOCKED / 404 / network errors go to [onError].
  void fetchGunaMilan({
    required String userId,
    required Function(GunaMilan result) completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.call(
      url: WebService.gunaMilan,
      param: {'user_id': userId},
      completion: (response) {
        if (jsonOk(response) && response is Map && response['data'] is Map) {
          completion(GunaMilan.fromJson(response['data']));
        } else {
          onError?.call(jsonMessage(response));
        }
      },
    );
  }
}
