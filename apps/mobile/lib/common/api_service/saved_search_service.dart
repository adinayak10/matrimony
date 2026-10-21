import 'package:banjaramatch/common/api_service/api_service.dart';
import 'package:banjaramatch/models/json_parse.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/models/saved_search_model.dart';
import 'package:banjaramatch/models/users_model.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/web_service.dart';

/// Saved searches (max [SavedSearch.maxPerUser] per member).
class SavedSearchService {
  static var shared = SavedSearchService();

  /// `POST /api/fetchSavedSearches {}`.
  void list({
    required Function(List<SavedSearch> searches) completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.call(
      url: WebService.fetchSavedSearches,
      param: {},
      completion: (response) {
        if (jsonOk(response) && response is Map) {
          completion(SavedSearch.listFrom(response['data']));
        } else {
          onError?.call(jsonMessage(response));
        }
      },
    );
  }

  /// `POST /api/createSavedSearch {name, filters, alertEnabled}`; 409 LIMIT_REACHED → [onError].
  void create({
    required String name,
    required Map<String, dynamic> filters,
    bool alertEnabled = false,
    required Function(SavedSearch search) completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.call(
      url: WebService.createSavedSearch,
      param: {'name': name, 'filters': filters, 'alertEnabled': alertEnabled},
      completion: (response) => _row(response, completion, onError),
    );
  }

  /// `POST /api/updateSavedSearch {id, name?, filters?, alertEnabled?}` (only given keys change).
  void update({
    required String id,
    String? name,
    Map<String, dynamic>? filters,
    bool? alertEnabled,
    required Function(SavedSearch search) completion,
    Function(String message)? onError,
  }) {
    final param = <String, dynamic>{'id': id};
    if (name != null) param['name'] = name;
    if (filters != null) param['filters'] = filters;
    if (alertEnabled != null) param['alertEnabled'] = alertEnabled;
    ApiService.shared.call(
      url: WebService.updateSavedSearch,
      param: param,
      completion: (response) => _row(response, completion, onError),
    );
  }

  /// `POST /api/deleteSavedSearch {id}`.
  void delete({
    required String id,
    required Function() completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.call(
      url: WebService.deleteSavedSearch,
      param: {'id': id},
      completion: (response) {
        if (jsonOk(response)) {
          completion();
        } else {
          onError?.call(jsonMessage(response));
        }
      },
    );
  }

  /// `POST /api/runSavedSearch {id, page, limit}` → same card envelope as searchProfiles.
  /// Always calls [completion] (empty list on failure; [onError] also gets the message).
  void run({
    required String id,
    int page = 1,
    int? limit,
    required Function(List<User> users) completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.call(
      url: WebService.runSavedSearch,
      param: {'id': id, 'page': page, 'limit': limit ?? Limits.pagination},
      completion: (response) {
        if (!jsonOk(response)) onError?.call(jsonMessage(response));
        completion(UsersModel.fromJson(response).data ?? []);
      },
    );
  }

  void _row(Object response, Function(SavedSearch) completion, Function(String message)? onError) {
    if (jsonOk(response) && response is Map && response['data'] is Map) {
      completion(SavedSearch.fromJson(response['data']));
    } else {
      onError?.call(jsonMessage(response));
    }
  }
}
