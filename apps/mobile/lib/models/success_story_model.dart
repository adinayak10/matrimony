import 'package:banjaramatch/models/json_parse.dart';

/// Success story row (public list, `fetchMySuccessStories`, `submitSuccessStory`).
class SuccessStory {
  SuccessStory({
    this.id,
    this.groomName = '',
    this.brideName = '',
    this.story = '',
    this.photo,
    this.weddingDate,
    this.city = '',
    this.isFeatured = false,
    this.publishedAt,
    this.status,
    this.rejectionReason,
    this.createdAt,
  });

  String? id;
  String groomName;
  String brideName;
  String story;

  /// Relative upload path or absolute URL (use `addBaseURL()` / MyCachedImage).
  String? photo;
  DateTime? weddingDate;
  String city;
  bool isFeatured;
  DateTime? publishedAt;

  /// Only on "mine" rows: pending | approved | published | rejected.
  String? status;
  String? rejectionReason;
  DateTime? createdAt;

  factory SuccessStory.fromJson(dynamic json) {
    final m = jsonMap(json);
    return SuccessStory(
      id: jsonId(m['_id']),
      groomName: jsonString(m['groomName']) ?? '',
      brideName: jsonString(m['brideName']) ?? '',
      story: jsonString(m['story']) ?? '',
      photo: jsonString(m['photo']),
      weddingDate: jsonDate(m['weddingDate']),
      city: jsonString(m['city']) ?? '',
      isFeatured: jsonBool(m['isFeatured']) ?? false,
      publishedAt: jsonDate(m['publishedAt']),
      status: jsonString(m['status']),
      rejectionReason: jsonString(m['rejectionReason']),
      createdAt: jsonDate(m['createdAt']),
    );
  }

  /// "Groom & Bride"
  String get coupleNames => [groomName, brideName].where((e) => e.isNotEmpty).join(' & ');

  static List<SuccessStory> listFrom(dynamic data) =>
      jsonList(data).whereType<Map>().map((e) => SuccessStory.fromJson(e)).toList();
}

/// One page of the public success-story list.
class SuccessStoryPage {
  SuccessStoryPage({this.stories = const [], this.total = 0, this.page = 1, this.limit = 12});

  List<SuccessStory> stories;
  int total;
  int page;
  int limit;

  bool get hasMore => page * limit < total;
}
