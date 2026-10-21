import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/paged_user_list_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/common/empty_state.dart';
import 'package:banjaramatch/screens/common/profile_tile_row.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/setting_screen/feature_app_bar.dart';
import 'package:banjaramatch/screens/setting_screen/privacy_settings_screen.dart';
import 'package:banjaramatch/screens/visitors_screen/user_list_support.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/params.dart';
import 'package:banjaramatch/utilities/web_service.dart';

enum NearbyState { checking, serviceOff, denied, deniedForever, locationFailed, ready }

/// Location permission → `updateCoordinates` → `fetchNearbyMatches` (paged,
/// radius in km). Members who switched off "Show my location" never appear.
class NearbyController extends PagedUserListController {
  static const List<int> radii = [10, 25, 50, 100, 250];

  int radiusKm = 50;
  NearbyState state = NearbyState.checking;

  @override
  bool get loadOnInit => false;

  @override
  void onReady() {
    super.onReady();
    start();
  }

  /// My own privacy flag: when false, others cannot see me in Nearby.
  bool get myLocationHidden => SessionManager.shared.getUser()?.settings?.showLocation == false;

  Future<void> start() async {
    state = NearbyState.checking;
    update();
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        state = NearbyState.serviceOff;
        update();
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever) {
        state = NearbyState.deniedForever;
        update();
        return;
      }
      if (permission != LocationPermission.whileInUse && permission != LocationPermission.always) {
        state = NearbyState.denied;
        update();
        return;
      }

      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 20),
          ),
        );
      } catch (e) {
        print('Nearby: current position failed: $e');
        position = await Geolocator.getLastKnownPosition();
      }
      if (position == null) {
        state = NearbyState.locationFailed;
        update();
        return;
      }

      UserService.shared.updateCoordinates(
        lat: position.latitude,
        lng: position.longitude,
        completion: (_) => _showList(),
        // A failed save still lets the server use previously stored coordinates.
        onError: (_) => _showList(),
      );
    } catch (e) {
      print('Nearby: location flow failed: $e');
      state = NearbyState.locationFailed;
      update();
    }
  }

  void _showList() {
    state = NearbyState.ready;
    loadFirst();
  }

  void changeRadius(int km) {
    if (km == radiusKm) return;
    radiusKm = km;
    if (state == NearbyState.ready) {
      loadFirst();
    } else {
      update();
    }
  }

  Future<void> openSettings() async {
    if (state == NearbyState.serviceOff) {
      await Geolocator.openLocationSettings();
    } else {
      await Geolocator.openAppSettings();
    }
  }

  @override
  void fetchPage(int page, void Function(List<User> users) done) {
    requestUserRows(
      WebService.fetchNearbyMatches,
      {
        Param.myUserId: SessionManager.shared.getUserID(),
        'page': page,
        Param.limit: pageSize,
        'radiusKm': radiusKm,
      },
      done,
    );
  }
}

class NearbyScreen extends StatefulWidget {
  const NearbyScreen({super.key});

  @override
  State<NearbyScreen> createState() => _NearbyScreenState();
}

class _NearbyScreenState extends State<NearbyScreen> {
  final String _tag = 'nearby_${DateTime.now().microsecondsSinceEpoch}';
  late final NearbyController controller = Get.put(NearbyController(), tag: _tag);

  @override
  void dispose() {
    Get.delete<NearbyController>(tag: _tag);
    super.dispose();
  }

  static String? distanceLine(User user) {
    final d = user.distanceKm;
    if (d == null) return null;
    final text = d < 1 ? '<1' : (d < 10 ? d.toStringAsFixed(1) : d.round().toString());
    return AppKeys.nearbyDistance.trParams({'km': text});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cBackground,
      appBar: featureAppBar(AppKeys.nearbyTitle.tr),
      body: GetBuilder<NearbyController>(
        tag: _tag,
        builder: (c) {
          return Column(
            children: [
              _radiusBar(c),
              if (c.myLocationHidden) _hiddenHint(),
              Expanded(child: _body(c)),
            ],
          );
        },
      ),
    );
  }

  Widget _radiusBar(NearbyController c) {
    return SizedBox(
      height: 56,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        children: NearbyController.radii.map((km) {
          final selected = km == c.radiusKm;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(
                AppKeys.nearbyRadius.trParams({'km': '$km'}),
                style: MyTextStyle.gilroySemiBold(size: 13, color: selected ? cWhite : cDarkText),
              ),
              selected: selected,
              selectedColor: cPrimary,
              backgroundColor: cWhite,
              showCheckmark: false,
              onSelected: (_) => c.changeRadius(km),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _hiddenHint() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7E6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_off_rounded, color: Color(0xFFF59E0B), size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              AppKeys.nearbyHiddenHint.tr,
              style: MyTextStyle.gilroyMedium(size: 12, color: cDarkText),
            ),
          ),
          TextButton(
            onPressed: () => Get.to(() => const PrivacySettingsScreen()),
            child: Text(AppKeys.nearbyChange.tr, style: MyTextStyle.gilroySemiBold(size: 13, color: cPrimary)),
          ),
        ],
      ),
    );
  }

  Widget _body(NearbyController c) {
    switch (c.state) {
      case NearbyState.checking:
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: cPrimary),
              const SizedBox(height: 14),
              Text(AppKeys.nearbyLocating.tr, style: MyTextStyle.gilroyMedium(size: 14, color: cLightText)),
            ],
          ),
        );
      case NearbyState.serviceOff:
        return EmptyState(
          icon: Icons.location_disabled_rounded,
          title: AppKeys.nearbyServiceOffTitle.tr,
          message: AppKeys.nearbyServiceOffMessage.tr,
          actionLabel: AppKeys.nearbyOpenSettings.tr,
          onAction: () async {
            await c.openSettings();
            c.start();
          },
        );
      case NearbyState.denied:
        return EmptyState(
          icon: Icons.location_searching_rounded,
          title: AppKeys.nearbyPermissionTitle.tr,
          message: AppKeys.nearbyPermissionMessage.tr,
          actionLabel: AppKeys.nearbyAllow.tr,
          onAction: c.start,
        );
      case NearbyState.deniedForever:
        return EmptyState(
          icon: Icons.location_off_rounded,
          title: AppKeys.nearbyPermissionTitle.tr,
          message: AppKeys.nearbyDeniedForeverMessage.tr,
          actionLabel: AppKeys.nearbyOpenSettings.tr,
          onAction: () async {
            await c.openSettings();
            c.start();
          },
        );
      case NearbyState.locationFailed:
        return EmptyState(
          icon: Icons.wrong_location_rounded,
          title: AppKeys.nearbyLocationFailedTitle.tr,
          message: AppKeys.nearbyLocationFailedMessage.tr,
          onAction: c.start,
        );
      case NearbyState.ready:
        return PagedUserListBody(
          controller: c,
          empty: EmptyState(
            icon: Icons.near_me_rounded,
            title: AppKeys.nearbyEmptyTitle.tr,
            message: AppKeys.nearbyEmptyMessage.tr,
          ),
          itemBuilder: (context, user) => ProfileTileRow(
            user: user,
            subtitle: distanceLine(user),
            onTap: () {
              final id = user.id;
              if (id != null) Get.to(() => ProfileScreen(userId: id));
            },
          ),
        );
    }
  }
}
