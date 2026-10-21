import 'package:image_picker/image_picker.dart';
import 'package:banjaramatch/common/api_service/api_service.dart';
import 'package:banjaramatch/models/json_parse.dart';
import 'package:banjaramatch/models/success_story_model.dart';
import 'package:banjaramatch/utilities/web_service.dart';

class SuccessStoryService {
  static var shared = SuccessStoryService();

  /// Public, published stories: `GET /api/success-stories?page&limit(&featured=1)`.
  void fetchPublic({
    int page = 1,
    int limit = 12,
    bool featuredOnly = false,
    required Function(SuccessStoryPage page) completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.callGet(
      url: WebService.successStories,
      query: {'page': page, 'limit': limit, if (featuredOnly) 'featured': 1},
      completion: (response) {
        if (jsonOk(response) && response is Map) {
          completion(SuccessStoryPage(
            stories: SuccessStory.listFrom(response['data']),
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

  /// My submissions with status: `POST /api/fetchMySuccessStories {}`.
  void fetchMine({
    required Function(List<SuccessStory> stories) completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.call(
      url: WebService.fetchMySuccessStories,
      param: {},
      completion: (response) {
        if (jsonOk(response) && response is Map) {
          completion(SuccessStory.listFrom(response['data']));
        } else {
          onError?.call(jsonMessage(response));
        }
      },
    );
  }

  /// `POST /api/submitSuccessStory` (multipart). [weddingDate] is sent as
  /// `YYYY-MM-DD`; [partnerUserId] must be an accepted connection.
  /// 429 DAILY_CAP and validation errors go to [onError] with the server message.
  void submit({
    required String groomName,
    required String brideName,
    required String story,
    DateTime? weddingDate,
    String? city,
    String? partnerUserId,
    XFile? photo,
    required Function(SuccessStory story) completion,
    Function(String message)? onError,
  }) {
    final param = <String, dynamic>{
      'groom_name': groomName,
      'bride_name': brideName,
      'story': story,
    };
    if (weddingDate != null) {
      param['wedding_date'] = weddingDate.toIso8601String().substring(0, 10);
    }
    if (city != null && city.isNotEmpty) param['city'] = city;
    if (partnerUserId != null && partnerUserId.isNotEmpty) param['partner_user_id'] = partnerUserId;

    ApiService.shared.multiPartCallApi(
      url: WebService.submitSuccessStory,
      param: param,
      filesMap: {
        'photo': [photo]
      },
      completion: (response) {
        if (jsonOk(response) && response is Map && response['data'] is Map) {
          completion(SuccessStory.fromJson(response['data']));
        } else {
          onError?.call(jsonMessage(response));
        }
      },
      onError: (message) => onError?.call(message),
    );
  }
}
