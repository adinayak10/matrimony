import 'package:banjaramatch/models/json_parse.dart';

/// Platform announcement row from `POST /api/fetchPlatformNotification`
/// (shaped like a notification: `content` is the body).
class Announcement {
  Announcement({this.id, this.type, this.title, this.content, this.linkUrl, this.createdAt, this.updatedAt, this.isRead = true});

  String? id;

  /// announcement | update | maintenance | event
  String? type;
  String? title;
  String? content;
  String? linkUrl;
  DateTime? createdAt;
  DateTime? updatedAt;
  bool isRead;

  factory Announcement.fromJson(dynamic json) {
    final m = jsonMap(json);
    return Announcement(
      id: jsonId(m['_id']),
      type: jsonString(m['type']),
      title: jsonString(m['title']),
      content: jsonString(m['content'] ?? m['body']),
      linkUrl: jsonString(m['linkUrl']),
      createdAt: jsonDate(m['createdAt']),
      updatedAt: jsonDate(m['updatedAt']),
      isRead: jsonBool(m['isRead']) ?? true,
    );
  }

  /// Only http(s) or site-relative links may be opened.
  bool get hasSafeLink {
    final url = (linkUrl ?? '').trim();
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
  }

  static List<Announcement> listFrom(dynamic data) =>
      jsonList(data).whereType<Map>().map((e) => Announcement.fromJson(e)).toList();
}
