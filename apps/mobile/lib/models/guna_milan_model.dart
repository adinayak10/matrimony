import 'package:banjaramatch/models/json_parse.dart';

/// `POST /api/compatibility/guna-milan {user_id}` data.
class GunaMilan {
  GunaMilan({
    this.available = false,
    this.totalPoints = 0,
    this.maxPoints = 0,
    this.percentage,
    this.verdict,
    this.note,
    this.breakdown = const [],
    this.manglikStatus,
  });

  /// False when either profile lacks rashi/nakshatra (show the "horoscope missing" state).
  bool available;
  int totalPoints;
  int maxPoints;
  int? percentage;

  /// e.g. "Good match"; null when not available.
  String? verdict;
  String? note;
  List<KootaScore> breakdown;
  ManglikPair? manglikStatus;

  factory GunaMilan.fromJson(dynamic json) {
    final m = jsonMap(json);
    // `breakdown` is the contract name; older API builds only send `kootas`.
    final rows = m['breakdown'] is List ? m['breakdown'] : m['kootas'];
    return GunaMilan(
      available: jsonBool(m['available']) ?? false,
      totalPoints: jsonInt(m['totalPoints']) ?? 0,
      maxPoints: jsonInt(m['maxPoints']) ?? 0,
      percentage: jsonInt(m['percentage']),
      verdict: jsonString(m['verdict']),
      note: jsonString(m['note']),
      breakdown: jsonList(rows).whereType<Map>().map((e) => KootaScore.fromJson(e)).toList(),
      manglikStatus: m['manglikStatus'] is Map ? ManglikPair.fromJson(m['manglikStatus']) : null,
    );
  }

  /// 0.0-1.0 for progress rings.
  double get ratio => maxPoints <= 0 ? 0 : (totalPoints / maxPoints).clamp(0, 1).toDouble();
}

class KootaScore {
  KootaScore({this.koota, this.points = 0, this.max = 0, this.label});

  String? koota;
  int points;
  int max;
  String? label;

  factory KootaScore.fromJson(dynamic json) {
    final m = jsonMap(json);
    return KootaScore(
      koota: jsonString(m['koota'] ?? m['name']),
      points: jsonInt(m['points']) ?? 0,
      max: jsonInt(m['max']) ?? 0,
      label: jsonString(m['label']),
    );
  }

  double get ratio => max <= 0 ? 0 : (points / max).clamp(0, 1).toDouble();
}

/// Manglik status of the viewer and the other profile (Yes/No/Partial/Not specified).
class ManglikPair {
  ManglikPair({this.viewer, this.match});

  String? viewer;
  String? match;

  factory ManglikPair.fromJson(dynamic json) {
    final m = jsonMap(json);
    return ManglikPair(viewer: jsonString(m['viewer']), match: jsonString(m['match']));
  }
}
