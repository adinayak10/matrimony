/// Defensive JSON readers shared by the 1.1.0 models. The API only ever
/// gains fields, so every reader tolerates null, wrong types and old builds.

String? jsonString(dynamic v) {
  if (v == null) return null;
  if (v is String) return v;
  return v.toString();
}

/// Reads a Mongo id that may arrive as a plain string or a populated object.
String? jsonId(dynamic v) {
  if (v == null) return null;
  if (v is Map) return jsonString(v['_id'] ?? v['id']);
  return jsonString(v);
}

int? jsonInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.round();
  if (v is String) return num.tryParse(v)?.round();
  return null;
}

bool? jsonBool(dynamic v) {
  if (v == null) return null;
  if (v is bool) return v;
  if (v is num) return v != 0;
  if (v is String) return v == 'true' || v == '1';
  return null;
}

/// ISO-8601 string or epoch milliseconds/seconds -> local DateTime.
DateTime? jsonDate(dynamic v) {
  if (v == null) return null;
  if (v is DateTime) return v.toLocal();
  if (v is int) {
    // values below 10^11 are epoch seconds (e.g. Agora expiresAt)
    return DateTime.fromMillisecondsSinceEpoch(v < 100000000000 ? v * 1000 : v).toLocal();
  }
  if (v is String && v.isNotEmpty) return DateTime.tryParse(v)?.toLocal();
  return null;
}

Map<String, dynamic> jsonMap(dynamic v) {
  if (v is Map<String, dynamic>) return v;
  if (v is Map) return v.map((key, value) => MapEntry(key.toString(), value));
  return <String, dynamic>{};
}

List<dynamic> jsonList(dynamic v) {
  if (v is List) return v;
  return const [];
}

List<String> jsonStringList(dynamic v) {
  return jsonList(v).where((e) => e != null).map((e) => e.toString()).toList();
}

/// `status == true` in the user-route envelope (contact form uses `success`).
bool jsonOk(dynamic response) {
  if (response is! Map) return false;
  return response['status'] == true || response['success'] == true;
}

/// Server message from an envelope, or [fallback].
String jsonMessage(dynamic response, [String fallback = 'Something went wrong. Please try again.']) {
  if (response is Map && response['message'] is String && (response['message'] as String).isNotEmpty) {
    return response['message'] as String;
  }
  return fallback;
}
