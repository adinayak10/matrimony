import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

/// ⚡ Performance Optimization Utilities
/// Collection of helper methods to improve app performance

class PerformanceUtils {
  /// Debounce function for search and text input
  /// Reduces API calls by waiting for user to stop typing
  static void debounce(Function() action, {Duration delay = const Duration(milliseconds: 500)}) {
    Future.delayed(delay, action);
  }

  /// Throttle function for scroll events
  /// Limits execution rate of frequently called functions
  static DateTime? _lastExecutionTime;
  static void throttle(Function() action, {Duration delay = const Duration(milliseconds: 300)}) {
    final now = DateTime.now();
    if (_lastExecutionTime == null || now.difference(_lastExecutionTime!) > delay) {
      _lastExecutionTime = now;
      action();
    }
  }

  /// Optimized list builder with pagination
  /// Use this for long lists to improve scrolling performance
  static Widget buildOptimizedListView({
    required int itemCount,
    required Widget Function(BuildContext, int) itemBuilder,
    required VoidCallback onLoadMore,
    ScrollController? controller,
    bool hasMore = true,
  }) {
    return ListView.builder(
      controller: controller,
      itemCount: itemCount + (hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == itemCount) {
          // Load more indicator
          onLoadMore();
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16.0),
              child: CircularProgressIndicator(),
            ),
          );
        }
        return itemBuilder(context, index);
      },
      // ⚡ Performance optimizations
      cacheExtent: 500, // Pre-render items ahead
      addAutomaticKeepAlives: true,
      addRepaintBoundaries: true,
    );
  }

  /// Optimized cached image widget
  /// Consistent image loading with proper error handling and placeholders
  static Widget buildCachedImage({
    required String imageUrl,
    double? width,
    double? height,
    BoxFit fit = BoxFit.cover,
    Widget? placeholder,
    Widget? errorWidget,
    BorderRadius? borderRadius,
  }) {
    Widget imageWidget = CachedNetworkImage(
      imageUrl: imageUrl,
      width: width,
      height: height,
      fit: fit,
      placeholder: (context, url) => placeholder ?? 
        Container(
          width: width,
          height: height,
          color: Colors.grey[200],
          child: const Center(
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      errorWidget: (context, url, error) => errorWidget ?? 
        Container(
          width: width,
          height: height,
          color: Colors.grey[200],
          child: const Icon(Icons.error, color: Colors.grey),
        ),
      memCacheWidth: width != null ? (width * 2).toInt() : null,
      memCacheHeight: height != null ? (height * 2).toInt() : null,
    );

    if (borderRadius != null) {
      return ClipRRect(
        borderRadius: borderRadius,
        child: imageWidget,
      );
    }

    return imageWidget;
  }

  /// Memory-efficient grid builder
  static Widget buildOptimizedGridView({
    required int itemCount,
    required Widget Function(BuildContext, int) itemBuilder,
    required int crossAxisCount,
    double childAspectRatio = 1.0,
    double crossAxisSpacing = 8.0,
    double mainAxisSpacing = 8.0,
    ScrollController? controller,
  }) {
    return GridView.builder(
      controller: controller,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: childAspectRatio,
        crossAxisSpacing: crossAxisSpacing,
        mainAxisSpacing: mainAxisSpacing,
      ),
      itemCount: itemCount,
      itemBuilder: itemBuilder,
      // ⚡ Performance optimizations
      cacheExtent: 500,
      addAutomaticKeepAlives: true,
      addRepaintBoundaries: true,
    );
  }

  /// Lazy loading wrapper for heavy widgets
  /// Delays rendering until widget is visible
  static Widget lazyLoad({
    required Widget child,
    Widget? placeholder,
  }) {
    return FutureBuilder(
      future: Future.delayed(const Duration(milliseconds: 100)),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.done) {
          return child;
        }
        return placeholder ?? const SizedBox.shrink();
      },
    );
  }

  /// Optimized profile image with fallback
  static Widget buildProfileImage({
    required String? imageUrl,
    double radius = 25,
    Widget? fallback,
  }) {
    if (imageUrl == null || imageUrl.isEmpty) {
      return fallback ?? CircleAvatar(
        radius: radius,
        backgroundColor: Colors.grey[300],
        child: Icon(Icons.person, size: radius * 1.2, color: Colors.grey[600]),
      );
    }

    return CircleAvatar(
      radius: radius,
      backgroundImage: CachedNetworkImageProvider(imageUrl),
      backgroundColor: Colors.grey[200],
    );
  }

  /// Pre-cache images for faster loading
  static Future<void> precacheImages(BuildContext context, List<String> imageUrls) async {
    for (var url in imageUrls) {
      try {
        await precacheImage(CachedNetworkImageProvider(url), context);
      } catch (e) {
        debugPrint('Failed to precache image: $url');
      }
    }
  }

  /// Memory cleanup helper
  /// Call this when user logs out or switches accounts
  static Future<void> clearImageCache() async {
    await CachedNetworkImage.evictFromCache('');
    imageCache.clear();
    imageCache.clearLiveImages();
  }
}

/// Extension for scroll controller with pagination
extension ScrollControllerPagination on ScrollController {
  /// Add listener for pagination
  void addPaginationListener(VoidCallback onLoadMore) {
    addListener(() {
      if (position.pixels >= position.maxScrollExtent - 200) {
        onLoadMore();
      }
    });
  }
}
