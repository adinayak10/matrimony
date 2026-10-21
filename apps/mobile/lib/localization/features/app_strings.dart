// App-wide strings for the 1.1.0 feature expansion (owner: Mobile-B; the
// foundation agent added the shared-widget keys below).
//
// Rules (keep every language file compiling):
// * every key VALUE starts with "app_" so it can never collide with LKeys or
//   the match_/call_ feature files (non-Hindi language maps are `const`, and a
//   const map with two equal keys does not compile);
// * add each key to appStringsEn; add a Hindi translation to appStringsHi when
//   you have one (Hindi spreads En first, so missing Hindi keys fall back to English);
// * other languages get English automatically through the spread.
// Use with GetX: `AppKeys.retry.tr`, `AppKeys.percentMatch.trParams({'percent': '87'})`.

abstract class AppKeys {
  // shared widgets (foundation)
  static const emptyTitle = 'app_emptyTitle';
  static const emptyMessage = 'app_emptyMessage';
  static const retry = 'app_retry';
  static const seeAll = 'app_seeAll';
  static const loadingMore = 'app_loadingMore';
  static const somethingWentWrong = 'app_somethingWentWrong';
  static const uploadFailed = 'app_uploadFailed';

  /// "@percent% match" — use `.trParams({'percent': '87'})`.
  static const percentMatch = 'app_percentMatch';

  // status chips (StatusChip.forStatus)
  static const statusNone = 'app_statusNone';
  static const statusPending = 'app_statusPending';
  static const statusApproved = 'app_statusApproved';
  static const statusPublished = 'app_statusPublished';
  static const statusRejected = 'app_statusRejected';
  static const statusVerified = 'app_statusVerified';
}

const Map<String, String> appStringsEn = {
  AppKeys.emptyTitle: 'Nothing here yet',
  AppKeys.emptyMessage: 'Check back a little later.',
  AppKeys.retry: 'Try again',
  AppKeys.seeAll: 'See all',
  AppKeys.loadingMore: 'Loading more…',
  AppKeys.somethingWentWrong: 'Something went wrong. Please try again.',
  AppKeys.uploadFailed: 'Upload failed. Please try again.',
  AppKeys.percentMatch: '@percent% match',
  AppKeys.statusNone: 'Not submitted',
  AppKeys.statusPending: 'Under review',
  AppKeys.statusApproved: 'Approved',
  AppKeys.statusPublished: 'Published',
  AppKeys.statusRejected: 'Rejected',
  AppKeys.statusVerified: 'Verified',
};

const Map<String, String> appStringsHi = {
  AppKeys.emptyTitle: 'अभी यहाँ कुछ नहीं है',
  AppKeys.emptyMessage: 'थोड़ी देर बाद फिर देखें।',
  AppKeys.retry: 'फिर से कोशिश करें',
  AppKeys.seeAll: 'सभी देखें',
  AppKeys.loadingMore: 'और लोड हो रहा है…',
  AppKeys.somethingWentWrong: 'कुछ गलत हो गया। कृपया फिर से कोशिश करें।',
  AppKeys.uploadFailed: 'अपलोड नहीं हो सका। कृपया फिर से कोशिश करें।',
  AppKeys.percentMatch: '@percent% मेल',
  AppKeys.statusNone: 'जमा नहीं किया',
  AppKeys.statusPending: 'समीक्षा में',
  AppKeys.statusApproved: 'स्वीकृत',
  AppKeys.statusPublished: 'प्रकाशित',
  AppKeys.statusRejected: 'अस्वीकृत',
  AppKeys.statusVerified: 'सत्यापित',
};
