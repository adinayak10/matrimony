import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/compatibility_service.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/localization/features/match_strings.dart';
import 'package:banjaramatch/models/guna_milan_model.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/common/empty_state.dart';
import 'package:banjaramatch/screens/common/section_card.dart';
import 'package:banjaramatch/screens/common/status_chip.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/horoscope_screen/horoscope_screen.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/horoscope_constants.dart';

/// Kundli (Guna Milan) result between the signed-in member and [userId].
///
/// The API currently scores a simplified subset of kootas (Rashi + Gana, so
/// `maxPoints` is 8, not 36): every row and the total are rendered exactly as
/// returned, nothing is assumed about the full Ashtakoot table.
class GunaMilanScreen extends StatelessWidget {
  const GunaMilanScreen({super.key, required this.userId, this.user});

  final String userId;

  /// The other profile when the caller already has it (names, rashi, nakshatra).
  final User? user;

  @override
  Widget build(BuildContext context) {
    final tag = 'guna_milan_$userId';
    return GetBuilder<GunaMilanController>(
      init: GunaMilanController(userId: userId, other: user),
      tag: tag,
      builder: (controller) {
        return Scaffold(
          backgroundColor: cBackground,
          body: Column(
            children: [
              TopBarForInView(title: MatchKeys.gunaMilan),
              Expanded(child: _body(controller)),
            ],
          ),
        );
      },
    );
  }

  Widget _body(GunaMilanController controller) {
    if (controller.isFetching) {
      return const Center(child: CircularProgressIndicator(color: cPrimary));
    }
    final result = controller.result;
    if (result == null) {
      return EmptyState(
        icon: Icons.cloud_off_rounded,
        title: AppKeys.somethingWentWrong.tr,
        message: controller.errorMessage ?? '',
        onAction: controller.fetch,
      );
    }
    if (!result.available) {
      return ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          EmptyState(
            icon: Icons.auto_awesome_outlined,
            title: MatchKeys.gunaMissingTitle.tr,
            message: controller.missingMessage(),
            actionLabel: controller.viewerHasHoroscope ? null : MatchKeys.addYourHoroscope.tr,
            onAction: controller.viewerHasHoroscope ? null : controller.openMyHoroscope,
          ),
          _birthDetailsCard(controller),
        ],
      );
    }
    return RefreshIndicator(
      color: cPrimary,
      onRefresh: () async => controller.fetch(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(top: 8, bottom: 24),
        children: [
          _scoreCard(controller, result),
          if (result.breakdown.isNotEmpty)
            SectionCard(
              title: MatchKeys.kootaBreakdown.tr,
              icon: Icons.stacked_bar_chart_rounded,
              child: Column(
                children: [
                  for (var i = 0; i < result.breakdown.length; i++) ...[
                    if (i > 0) const Divider(height: 24),
                    _kootaRow(result.breakdown[i]),
                  ],
                ],
              ),
            ),
          _birthDetailsCard(controller),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            child: Text(
              [if ((result.note ?? '').isNotEmpty) result.note!, MatchKeys.gunaDisclaimer.tr].join('\n'),
              textAlign: TextAlign.center,
              style: MyTextStyle.gilroyRegular(size: 12, color: cLightText),
            ),
          ),
        ],
      ),
    );
  }

  Widget _scoreCard(GunaMilanController controller, GunaMilan result) {
    final color = _colorFor(result.ratio);
    return SectionCard(
      child: Column(
        children: [
          SizedBox(
            width: 140,
            height: 140,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 140,
                  height: 140,
                  child: CircularProgressIndicator(
                    value: result.ratio,
                    strokeWidth: 12,
                    backgroundColor: color.withOpacity(0.12),
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${result.totalPoints}/${result.maxPoints}',
                      style: MyTextStyle.gilroyBold(size: 30, color: cDarkText),
                    ),
                    if (result.percentage != null)
                      Text('${result.percentage}%', style: MyTextStyle.gilroySemiBold(size: 14, color: color)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text(MatchKeys.gunaScore.tr, style: MyTextStyle.gilroySemiBold(size: 15, color: cDarkText)),
          const SizedBox(height: 4),
          Text(
            MatchKeys.gunaPoints.trParams({'points': '${result.totalPoints}', 'max': '${result.maxPoints}'}),
            style: MyTextStyle.gilroyRegular(size: 13, color: cLightText),
          ),
          if ((result.verdict ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            StatusChip(label: result.verdict!, color: color, icon: Icons.favorite_rounded),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _personBadge(MatchKeys.you.tr, controller.me)),
              const Icon(Icons.favorite_rounded, color: cAccent, size: 20),
              Expanded(child: _personBadge(controller.otherName, controller.other)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _personBadge(String name, User? user) {
    final rashi = (user?.horoscope?.rashi ?? '').trim();
    return Column(
      children: [
        Text(name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: MyTextStyle.gilroyBold(size: 14, color: cDarkText)),
        const SizedBox(height: 2),
        Text(
          rashi.isEmpty ? '-' : HoroscopeConstants.rashiLabel(rashi),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: MyTextStyle.gilroyRegular(size: 12, color: cLightText),
        ),
      ],
    );
  }

  Widget _kootaRow(KootaScore koota) {
    final color = _colorFor(koota.ratio);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(koota.koota ?? '-', style: MyTextStyle.gilroySemiBold(size: 14, color: cDarkText)),
            ),
            Text('${koota.points}/${koota.max}', style: MyTextStyle.gilroyBold(size: 14, color: color)),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: koota.ratio,
            minHeight: 8,
            backgroundColor: color.withOpacity(0.12),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
        if ((koota.label ?? '').isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(koota.label!, style: MyTextStyle.gilroyRegular(size: 12, color: cLightText)),
        ],
      ],
    );
  }

  /// Me-vs-them rashi / nakshatra / manglik table.
  Widget _birthDetailsCard(GunaMilanController controller) {
    final manglik = controller.result?.manglikStatus;
    return SectionCard(
      title: MatchKeys.birthDetails.tr,
      icon: Icons.auto_awesome_outlined,
      child: Column(
        children: [
          _compareRow('', MatchKeys.you.tr, controller.otherName, header: true),
          const Divider(height: 18),
          _compareRow(
            MatchKeys.rashi.tr,
            _rashi(controller.me?.horoscope?.rashi),
            _rashi(controller.other?.horoscope?.rashi),
          ),
          const SizedBox(height: 10),
          _compareRow(
            MatchKeys.nakshatra.tr,
            _plain(controller.me?.horoscope?.nakshatra),
            _plain(controller.other?.horoscope?.nakshatra),
          ),
          const SizedBox(height: 10),
          _compareRow(
            MatchKeys.manglikStatus.tr,
            manglikLabel(manglik?.viewer ?? controller.me?.manglikStatus),
            manglikLabel(manglik?.match ?? controller.other?.manglikStatus),
          ),
        ],
      ),
    );
  }

  Widget _compareRow(String label, String mine, String theirs, {bool header = false}) {
    final style = header
        ? MyTextStyle.gilroyBold(size: 13, color: cDarkText)
        : MyTextStyle.gilroySemiBold(size: 13, color: cDarkText);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 4,
          child: Text(label, style: MyTextStyle.gilroyMedium(size: 12, color: cLightText)),
        ),
        Expanded(
          flex: 5,
          child: Text(mine, maxLines: 2, overflow: TextOverflow.ellipsis, style: style),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 5,
          child: Text(theirs, maxLines: 2, overflow: TextOverflow.ellipsis, style: style),
        ),
      ],
    );
  }

  static String _rashi(String? v) => (v ?? '').trim().isEmpty ? '-' : HoroscopeConstants.rashiLabel(v);

  static String _plain(String? v) => (v ?? '').trim().isEmpty ? '-' : v!.trim();

  static Color _colorFor(double ratio) {
    if (ratio >= 0.75) return cGreen;
    if (ratio >= 0.5) return const Color(0xFFF59E0B);
    return cPrimary;
  }
}

class GunaMilanController extends BaseController {
  GunaMilanController({required this.userId, this.other});

  final String userId;
  User? other;
  User? me;
  GunaMilan? result;
  bool isFetching = true;
  String? errorMessage;

  bool get viewerHasHoroscope => !(me?.horoscope?.isEmpty ?? true);

  bool get otherHasHoroscope => !(other?.horoscope?.isEmpty ?? true);

  String get otherName {
    final name = (other?.fullName ?? '').trim();
    return name.isEmpty ? MatchKeys.thisProfile.tr : name.split(' ').first;
  }

  @override
  void onInit() {
    super.onInit();
    me = SessionManager.shared.getUser();
  }

  @override
  void onReady() {
    super.onReady();
    fetch();
    if (other == null || other?.horoscope == null) {
      UserService.shared.fetchProfile(userId, (user) {
        other = user;
        update();
      });
    }
  }

  void fetch() {
    isFetching = true;
    errorMessage = null;
    update();
    CompatibilityService.shared.fetchGunaMilan(
      userId: userId,
      completion: (data) {
        result = data;
        isFetching = false;
        update();
      },
      onError: (message) {
        result = null;
        errorMessage = message;
        isFetching = false;
        update();
      },
    );
  }

  /// Explains which side is missing rashi / nakshatra.
  String missingMessage() {
    if (!viewerHasHoroscope) return MatchKeys.gunaMissingSelf.tr;
    if (other != null && !otherHasHoroscope) {
      return MatchKeys.gunaMissingOther.trParams({'name': otherName});
    }
    return MatchKeys.gunaMissingGeneric.tr;
  }

  Future<void> openMyHoroscope() async {
    final saved = await Navigate.to(const HoroscopeScreen());
    if (saved == true) {
      me = SessionManager.shared.getUser();
      fetch();
    }
  }
}
