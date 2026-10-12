import 'dart:convert';
import 'package:get_storage/get_storage.dart';

/// ⚡ Cache Manager for API Response Caching
/// Improves app performance by reducing redundant API calls
class CacheManager {
  static final CacheManager shared = CacheManager._internal();
  late GetStorage _storage;

  CacheManager._internal();

  /// Initialize cache storage
  Future<void> init() async {
    await GetStorage.init('api_cache');
    _storage = GetStorage('api_cache');
  }

  /// Cache duration constants
  static const Duration _shortCache = Duration(minutes: 5);  // For frequently changing data
  static const Duration _mediumCache = Duration(minutes: 30); // For moderately stable data
  static const Duration _longCache = Duration(hours: 24);     // For static data

  /// Get cache duration based on cache type
  Duration _getCacheDuration(CacheType type) {
    switch (type) {
      case CacheType.shortTerm:
        return _shortCache;
      case CacheType.mediumTerm:
        return _mediumCache;
      case CacheType.longTerm:
        return _longCache;
    }
  }

  /// Save data to cache with expiry
  void save(String key, dynamic data, {CacheType cacheType = CacheType.mediumTerm}) {
    final cacheData = {
      'data': data,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'expiryDuration': _getCacheDuration(cacheType).inMilliseconds,
    };
    _storage.write(key, jsonEncode(cacheData));
  }

  /// Get data from cache if not expired
  dynamic get(String key) {
    final cachedString = _storage.read(key);
    if (cachedString == null) return null;

    try {
      final cacheData = jsonDecode(cachedString);
      final timestamp = cacheData['timestamp'] as int;
      final expiryDuration = cacheData['expiryDuration'] as int;
      final now = DateTime.now().millisecondsSinceEpoch;

      // Check if cache is expired
      if (now - timestamp > expiryDuration) {
        _storage.remove(key);
        return null;
      }

      return cacheData['data'];
    } catch (e) {
      print('Error reading cache: $e');
      _storage.remove(key);
      return null;
    }
  }

  /// Check if cache exists and is valid
  bool hasValidCache(String key) {
    return get(key) != null;
  }

  /// Clear specific cache
  void clear(String key) {
    _storage.remove(key);
  }

  /// Clear all cache
  void clearAll() {
    _storage.erase();
  }

  /// Clear expired cache entries
  void clearExpired() {
    final keys = _storage.getKeys();
    for (var key in keys) {
      get(key); // This will automatically remove expired entries
    }
  }

  /// Generate cache key for API calls
  static String generateKey(String endpoint, Map<String, dynamic>? params) {
    if (params == null || params.isEmpty) {
      return endpoint;
    }
    final sortedParams = Map.fromEntries(
      params.entries.toList()..sort((a, b) => a.key.compareTo(b.key)),
    );
    return '$endpoint:${jsonEncode(sortedParams)}';
  }
}

/// Cache duration types
enum CacheType {
  shortTerm,  // 5 minutes - for user lists, search results
  mediumTerm, // 30 minutes - for profile data, preferences
  longTerm,   // 24 hours - for static data (castes, gotras, interests)
}

/// Cache keys constants
class CacheKeys {
  // Static data (long-term cache)
  static const String interests = 'interests_list';
  static const String castes = 'castes_list';
  static const String gotras = 'gotras_list';
  static const String qualifications = 'qualifications_list';
  static const String professions = 'professions_list';
  static const String incomeRanges = 'income_ranges_list';
  static const String countries = 'countries_list';
  
  // User data (medium-term cache)
  static String userProfile(String userId) => 'user_profile_$userId';
  static String userPhotos(String userId) => 'user_photos_$userId';
  
  // Feed data (short-term cache)
  static const String trendingProfiles = 'trending_profiles';
  static const String dailyMatches = 'daily_matches';
  static const String nearbyMatches = 'nearby_matches';
}
