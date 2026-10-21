import 'package:banjaramatch/models/json_parse.dart';

/// `POST /api/fetchVerificationStatus` data.
class VerificationStatus {
  VerificationStatus({this.isVerified = false, this.verifiedAt, this.canSubmit = true, this.latest});

  /// API sends `is_verified` as 0/1.
  bool isVerified;
  DateTime? verifiedAt;
  bool canSubmit;
  VerificationRequest? latest;

  factory VerificationStatus.fromJson(dynamic json) {
    final m = jsonMap(json);
    return VerificationStatus(
      isVerified: jsonBool(m['is_verified']) ?? false,
      verifiedAt: jsonDate(m['verifiedAt']),
      canSubmit: jsonBool(m['canSubmit']) ?? true,
      latest: m['latest'] is Map ? VerificationRequest.fromJson(m['latest']) : null,
    );
  }

  /// One of `verified`, `pending`, `rejected`, `none` (drives the status UI).
  String get state {
    if (isVerified) return 'verified';
    final s = latest?.status;
    if (s == 'pending') return 'pending';
    if (s == 'rejected') return 'rejected';
    return 'none';
  }
}

/// Latest verification request (`latest` in the status payload).
class VerificationRequest {
  VerificationRequest({this.id, this.status, this.documentType, this.reason, this.submittedAt, this.reviewedAt});

  String? id;

  /// pending | approved | rejected
  String? status;
  String? documentType;

  /// Only set when rejected.
  String? reason;
  DateTime? submittedAt;
  DateTime? reviewedAt;

  factory VerificationRequest.fromJson(dynamic json) {
    final m = jsonMap(json);
    return VerificationRequest(
      id: jsonId(m['_id']),
      status: jsonString(m['status']),
      documentType: jsonString(m['documentType']),
      reason: jsonString(m['reason']),
      submittedAt: jsonDate(m['submittedAt']),
      reviewedAt: jsonDate(m['reviewedAt']),
    );
  }
}
