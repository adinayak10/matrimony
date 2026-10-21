// Matching-depth strings (horoscope, Guna Milan, saved searches, success
// stories, announcements) for the 1.1.0 feature expansion. Owner: Mobile-C.
//
// Rules: every key VALUE starts with "match_" (non-Hindi language maps are
// `const`; equal keys would not compile). Add each key to matchStringsEn and,
// when available, to matchStringsHi (Hindi falls back to English per key).
// Use with GetX: `MatchKeys.gunaMilan.tr`.

abstract class MatchKeys {
  static const horoscope = 'match_horoscope';
  static const gunaMilan = 'match_gunaMilan';
  static const savedSearches = 'match_savedSearches';
  static const successStories = 'match_successStories';
}

const Map<String, String> matchStringsEn = {
  MatchKeys.horoscope: 'Horoscope',
  MatchKeys.gunaMilan: 'Kundli match',
  MatchKeys.savedSearches: 'Saved searches',
  MatchKeys.successStories: 'Success stories',
};

const Map<String, String> matchStringsHi = {
  MatchKeys.horoscope: 'कुंडली विवरण',
  MatchKeys.gunaMilan: 'कुंडली मिलान',
  MatchKeys.savedSearches: 'सहेजी गई खोजें',
  MatchKeys.successStories: 'सफल जोड़ियाँ',
};
