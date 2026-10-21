import 'package:banjaramatch/models/json_parse.dart';

/// Saved search row (`fetchSavedSearches`, `createSavedSearch`, `updateSavedSearch`).
///
/// [filters] keys follow the contract: `age_range, height_range, marital_status[],
/// caste[], gotra[], qualification[], profession[], incomeRange, isVerify,
/// recentlyActive`.
class SavedSearch {
  SavedSearch({
    this.id,
    this.name = '',
    Map<String, dynamic>? filters,
    this.alertEnabled = false,
    this.lastNotifiedAt,
    this.lastRunAt,
    this.createdAt,
    this.updatedAt,
  }) : filters = filters ?? <String, dynamic>{};

  String? id;
  String name;
  Map<String, dynamic> filters;
  bool alertEnabled;
  DateTime? lastNotifiedAt;
  DateTime? lastRunAt;
  DateTime? createdAt;
  DateTime? updatedAt;

  /// Maximum saved searches per member (API returns 409 LIMIT_REACHED above it).
  static const int maxPerUser = 10;

  factory SavedSearch.fromJson(dynamic json) {
    final m = jsonMap(json);
    return SavedSearch(
      id: jsonId(m['_id']),
      name: jsonString(m['name']) ?? '',
      filters: jsonMap(m['filters']),
      alertEnabled: jsonBool(m['alertEnabled']) ?? false,
      lastNotifiedAt: jsonDate(m['lastNotifiedAt']),
      lastRunAt: jsonDate(m['lastRunAt']),
      createdAt: jsonDate(m['createdAt']),
      updatedAt: jsonDate(m['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'filters': filters,
        'alertEnabled': alertEnabled,
      };

  static List<SavedSearch> listFrom(dynamic data) =>
      jsonList(data).whereType<Map>().map((e) => SavedSearch.fromJson(e)).toList();
}
