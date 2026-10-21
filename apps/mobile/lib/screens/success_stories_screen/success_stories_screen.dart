import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:banjaramatch/common/api_service/success_story_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/localization/features/match_strings.dart';
import 'package:banjaramatch/models/success_story_model.dart';
import 'package:banjaramatch/screens/common/empty_state.dart';
import 'package:banjaramatch/screens/common/segment_bar.dart';
import 'package:banjaramatch/screens/common/status_chip.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/success_stories_screen/submit_success_story_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Absolute URL for a story photo (API stores `uploads/...`; admin may paste a full URL).
String successStoryPhotoUrl(String photo) {
  final p = photo.trim();
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  return (p.startsWith('/') ? p.substring(1) : p).addBaseURL();
}

/// Community (published) and Mine (my submissions with status) success stories.
/// No sample content: both lists start with an empty state.
class SuccessStoriesScreen extends StatelessWidget {
  const SuccessStoriesScreen({super.key, this.initialSegment = 0});

  /// 0 = Community, 1 = My stories.
  final int initialSegment;

  @override
  Widget build(BuildContext context) {
    return GetBuilder<SuccessStoriesController>(
      init: SuccessStoriesController(initialSegment: initialSegment),
      tag: 'success_stories',
      builder: (controller) {
        return Scaffold(
          backgroundColor: cBackground,
          floatingActionButton: FloatingActionButton.extended(
            onPressed: controller.openSubmit,
            backgroundColor: cPrimary,
            foregroundColor: cOnPrimary,
            icon: const Icon(Icons.favorite_rounded),
            label: Text(MatchKeys.shareStory.tr, style: MyTextStyle.gilroySemiBold(size: 14, color: cOnPrimary)),
          ),
          body: Column(
            children: [
              TopBarForInView(title: MatchKeys.successStories),
              const SizedBox(height: 12),
              SoftSegmentBar(
                items: [
                  SegmentItem(label: MatchKeys.community.tr, icon: Icons.people_alt_outlined),
                  SegmentItem(label: MatchKeys.myStories.tr, icon: Icons.person_outline_rounded),
                ],
                selectedIndex: controller.segment,
                onChanged: controller.changeSegment,
              ),
              const SizedBox(height: 8),
              Expanded(
                child: controller.segment == 0 ? _community(controller) : _mine(controller),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _community(SuccessStoriesController controller) {
    if (controller.community.isEmpty) {
      if (controller.isCommunityLoading) {
        return const Center(child: CircularProgressIndicator(color: cPrimary));
      }
      if (controller.communityError != null) {
        return EmptyState(
          icon: Icons.cloud_off_rounded,
          title: AppKeys.somethingWentWrong.tr,
          message: controller.communityError!,
          onAction: controller.refreshCommunity,
        );
      }
      return RefreshIndicator(
        color: cPrimary,
        onRefresh: () async => controller.refreshCommunity(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            EmptyState(
              icon: Icons.favorite_border_rounded,
              title: MatchKeys.noStoriesTitle.tr,
              message: MatchKeys.noStoriesMsg.tr,
              actionLabel: MatchKeys.shareStory.tr,
              onAction: controller.openSubmit,
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      color: cPrimary,
      onRefresh: () async => controller.refreshCommunity(),
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.pixels >= n.metrics.maxScrollExtent - 300) controller.loadMoreCommunity();
          return false;
        },
        child: ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(top: 4, bottom: 96),
          itemCount: controller.community.length + (controller.communityHasMore ? 1 : 0),
          itemBuilder: (context, index) {
            if (index >= controller.community.length) {
              return const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator(color: cPrimary)),
              );
            }
            return SuccessStoryCard(story: controller.community[index]);
          },
        ),
      ),
    );
  }

  Widget _mine(SuccessStoriesController controller) {
    if (controller.mine.isEmpty) {
      if (controller.isMineLoading) {
        return const Center(child: CircularProgressIndicator(color: cPrimary));
      }
      if (controller.mineError != null) {
        return EmptyState(
          icon: Icons.cloud_off_rounded,
          title: AppKeys.somethingWentWrong.tr,
          message: controller.mineError!,
          onAction: controller.fetchMine,
        );
      }
      return RefreshIndicator(
        color: cPrimary,
        onRefresh: () async => controller.fetchMine(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            EmptyState(
              icon: Icons.edit_note_rounded,
              title: MatchKeys.noMyStoriesTitle.tr,
              message: MatchKeys.noMyStoriesMsg.tr,
              actionLabel: MatchKeys.shareStory.tr,
              onAction: controller.openSubmit,
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      color: cPrimary,
      onRefresh: () async => controller.fetchMine(),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(top: 4, bottom: 96),
        itemCount: controller.mine.length,
        itemBuilder: (context, index) => SuccessStoryCard(story: controller.mine[index], showStatus: true),
      ),
    );
  }
}

/// Story card: photo, couple names, wedding date + city, expandable story,
/// and (on "My stories") the review status with the rejection reason.
class SuccessStoryCard extends StatefulWidget {
  const SuccessStoryCard({super.key, required this.story, this.showStatus = false});

  final SuccessStory story;
  final bool showStatus;

  @override
  State<SuccessStoryCard> createState() => _SuccessStoryCardState();
}

class _SuccessStoryCardState extends State<SuccessStoryCard> {
  static const int _collapsedLines = 4;
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final story = widget.story;
    final photo = (story.photo ?? '').trim();
    final meta = <String>[
      if (story.weddingDate != null)
        MatchKeys.marriedOn.trParams({'date': DateFormat('d MMM yyyy').format(story.weddingDate!)}),
      if (story.city.isNotEmpty) story.city,
    ].join(' · ');
    final reason = (story.rejectionReason ?? '').trim();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: cCard,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (photo.isNotEmpty)
            AspectRatio(
              aspectRatio: 16 / 10,
              child: CachedNetworkImage(
                imageUrl: successStoryPhotoUrl(photo),
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(color: cLightBg),
                errorWidget: (context, url, error) => Container(
                  color: cLightBg,
                  child: const Icon(Icons.favorite_rounded, color: cBorder, size: 48),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        story.coupleNames,
                        style: MyTextStyle.gilroyBold(size: 17, color: cDarkText),
                      ),
                    ),
                    if (story.isFeatured)
                      StatusChip(label: MatchKeys.featured.tr, color: cGold, icon: Icons.star_rounded),
                  ],
                ),
                if (meta.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(meta, style: MyTextStyle.gilroyMedium(size: 12, color: cLightText)),
                ],
                if (widget.showStatus && (story.status ?? '').isNotEmpty) ...[
                  const SizedBox(height: 8),
                  StatusChip.forStatus(story.status),
                  if (story.status == 'rejected' && reason.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      MatchKeys.rejectionReason.trParams({'reason': reason}),
                      style: MyTextStyle.gilroyMedium(size: 12, color: cError),
                    ),
                  ],
                ],
                const SizedBox(height: 10),
                LayoutBuilder(
                  builder: (context, constraints) {
                    final style = MyTextStyle.gilroyRegular(size: 14, color: cDarkText.withOpacity(0.85));
                    final painter = TextPainter(
                      text: TextSpan(text: story.story, style: style),
                      maxLines: _collapsedLines,
                      textDirection: Directionality.of(context),
                    )..layout(maxWidth: constraints.maxWidth);
                    final overflows = painter.didExceedMaxLines;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          story.story,
                          style: style.copyWith(height: 1.45),
                          maxLines: _expanded ? null : _collapsedLines,
                          overflow: _expanded ? TextOverflow.visible : TextOverflow.ellipsis,
                        ),
                        if (overflows)
                          GestureDetector(
                            onTap: () => setState(() => _expanded = !_expanded),
                            child: Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(
                                _expanded ? MatchKeys.showLess.tr : MatchKeys.readMore.tr,
                                style: MyTextStyle.gilroySemiBold(size: 13, color: cPrimary),
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class SuccessStoriesController extends BaseController {
  SuccessStoriesController({int initialSegment = 0}) : segment = initialSegment == 1 ? 1 : 0;

  static const int _pageSize = 12;

  int segment;

  List<SuccessStory> community = [];
  int _communityPage = 0;
  bool communityHasMore = true;
  bool isCommunityLoading = false;
  String? communityError;

  List<SuccessStory> mine = [];
  bool isMineLoading = false;
  bool _mineLoaded = false;
  String? mineError;

  @override
  void onReady() {
    super.onReady();
    loadMoreCommunity();
    fetchMine();
  }

  void changeSegment(int index) {
    segment = index;
    update();
    if (index == 1 && !_mineLoaded && !isMineLoading) fetchMine();
  }

  void refreshCommunity() {
    community = [];
    _communityPage = 0;
    communityHasMore = true;
    communityError = null;
    isCommunityLoading = false;
    loadMoreCommunity();
  }

  void loadMoreCommunity() {
    if (isCommunityLoading || !communityHasMore) return;
    isCommunityLoading = true;
    communityError = null;
    update();
    final nextPage = _communityPage + 1;
    SuccessStoryService.shared.fetchPublic(
      page: nextPage,
      limit: _pageSize,
      completion: (page) {
        _communityPage = nextPage;
        final known = community.map((e) => e.id).toSet();
        community.addAll(page.stories.where((s) => !known.contains(s.id)));
        communityHasMore = page.hasMore && page.stories.isNotEmpty;
        isCommunityLoading = false;
        update();
      },
      onError: (message) {
        communityError = message;
        communityHasMore = false;
        isCommunityLoading = false;
        update();
      },
    );
  }

  void fetchMine() {
    isMineLoading = true;
    mineError = null;
    update();
    SuccessStoryService.shared.fetchMine(
      completion: (stories) {
        mine = stories;
        _mineLoaded = true;
        isMineLoading = false;
        update();
      },
      onError: (message) {
        mineError = message;
        isMineLoading = false;
        update();
      },
    );
  }

  Future<void> openSubmit() async {
    final submitted = await Navigate.to(const SubmitSuccessStoryScreen());
    if (submitted == true) {
      segment = 1;
      fetchMine();
    }
  }
}
