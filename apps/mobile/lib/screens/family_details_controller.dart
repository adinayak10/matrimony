import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';

import '../common/api_service/api_service.dart';
import '../common/api_service/user_service.dart';
import '../common/managers/session_manager.dart';
import '../models/model_location_list.dart';
import '../models/setting_model.dart';
import '../utilities/web_service.dart';

class FamilyDetailsController extends BaseController {
  // Dropdown Selections
  String? selectedFatherProfession;
  String? selectedMotherProfession;
  String? selectedFamilyType;
  String? selectedFamilyStatus;
  IncomeRange? selectedFamilyIncome;

  // Flags
  bool isFatherAlive = true;
  bool isMotherAlive = true;

  // Sibling Info
  final totalBrothers = TextEditingController();
  final totalSisters = TextEditingController();

  // Dropdown Options
  List<String> professionOptions = [];
  List<String> familyTypes = [];
  List<String> familyStatusList = [];
  List<IncomeRange> incomeOptions = [];

  // Location
  LocationData? selectedCountry;
  LocationData? selectedState;
  LocationData? selectedCity;
  List<LocationData> countryOptions = [];
  List<LocationData> stateOptions = [];
  List<LocationData> cityOptions = [];

  bool isNewUser = false;

  @override
  void onInit() {
    super.onInit();
    determineIfNewUser();
    loadSettingsFromSession();
    fetchCountries().then((_) {
      if (!isNewUser) {
        prefillFromLocal();
      }
    });
  }

  void determineIfNewUser() {
    final user = SessionManager.shared.getUser();
    isNewUser = user?.location?.city == null;
  }

  void loadSettingsFromSession() {
    final settings = SessionManager.shared.getSettings();
    if (settings == null) return;

    professionOptions = settings.occupations ?? [];
    familyTypes = settings.familyTypes ?? [];
    familyStatusList = settings.familyStatuses ?? [];
    incomeOptions = settings.incomeRanges ?? [];
    update();
  }

  Future<void> fetchCountries() async {
    final response = await ApiService.shared.callAsync(
      url: WebService.fetchCountryList,
      param: {"my_user_id": SessionManager.shared.getUserID()},
    );

    final res = ModelLocationList.fromJson(response);
    if (res.status == true && res.data != null) {
      countryOptions = res.data!;
    }

    update();
  }

  void prefillFromLocal() async {
    final user = SessionManager.shared.getUser();
    if (user == null || user.family == null) return;

    selectedFatherProfession = user.family?.father?.profession;
    isFatherAlive = user.family?.father?.isAlive ?? true;

    selectedMotherProfession = user.family?.mother?.profession;
    isMotherAlive = user.family?.mother?.isAlive ?? true;

    selectedFamilyType = user.family?.familyType;
    selectedFamilyStatus = user.family?.familyStatus;

    // selectedFamilyIncome = incomeOptions.firstWhereOrNull((i) => i.id == user.family?.familyIncome);

    final countryId = user.family?.basedOut?.country?.sId;
    final stateId = user.family?.basedOut?.state?.sId;
    final cityId = user.family?.basedOut?.city?.sId;

    if (countryId != null) {
      selectedCountry = countryOptions.firstWhereOrNull((c) => c.sId == countryId);
      await fetchStatesAsync(countryId);
    }

    if (stateId != null) {
      selectedState = stateOptions.firstWhereOrNull((s) => s.sId == stateId);
      await fetchCitiesAsync(stateId);
    }

    if (cityId != null) {
      selectedCity = cityOptions.firstWhereOrNull((c) => c.sId == cityId);
    }

    totalBrothers.text = "${user.family?.brothers?.total ?? 0}";
    totalSisters.text = "${user.family?.sisters?.total ?? 0}";

    update();
  }

  Future<void> fetchStatesAsync(String countryId) async {
    final response = await ApiService.shared.callAsync(
      url: WebService.fetchStateList,
      param: {"my_user_id": SessionManager.shared.getUserID(), "country": countryId},
    );

    final res = ModelLocationList.fromJson(response);
    if (res.status == true && res.data != null) {
      stateOptions = res.data!;
    }
    update();
  }

  Future<void> fetchCitiesAsync(String stateId) async {
    final response = await ApiService.shared.callAsync(
      url: WebService.fetchCityList,
      param: {"my_user_id": SessionManager.shared.getUserID(), "state": stateId},
    );

    final res = ModelLocationList.fromJson(response);
    if (res.status == true && res.data != null) {
      cityOptions = res.data!;
    }
    update();
  }

  void fetchStates(String countryId) {
    selectedState = null;
    selectedCity = null;
    stateOptions.clear();
    cityOptions.clear();
    update();

    fetchStatesAsync(countryId);
  }

  void fetchCities(String stateId) {
    selectedCity = null;
    cityOptions.clear();
    update();

    fetchCitiesAsync(stateId);
  }

  void submitFamilyDetails() {
    startLoading();
    
    final data = {
      "user_id": Get.find<ProfileController>().user?.id,
      "family": {
        'father': {'profession': selectedFatherProfession, 'isAlive': isFatherAlive},
        'mother': {'profession': selectedMotherProfession, 'isAlive': isMotherAlive},
        'familyType': selectedFamilyType,
        'familyStatus': selectedFamilyStatus,
        'incomeRange': selectedFamilyIncome?.id,
        'basedOut': {
          'country': selectedCountry?.sId,
          'state': selectedState?.sId,
          'city': selectedCity?.sId,
        },
        'brothers': {'total': int.tryParse(totalBrothers.text) ?? 0},
        'sisters': {'total': int.tryParse(totalSisters.text) ?? 0},
      },
    };

    final cleanData = Map<String, Object>.fromEntries(
      data.entries.where((e) => e.value != null).map((e) => MapEntry(e.key, e.value as Object)),
    );

    UserService.shared.editProfile(
      family: cleanData,
      completion: (user) async {
        print('✅ Family details API completed');
        
        try {
          final profileController = Get.find<ProfileController>(tag: SessionManager.shared.getUserID());
          profileController.user = user;
          profileController.updateMyProfile();
          print('✅ Profile controller updated');
        } catch (e) {
          print('ProfileController not found: $e');
        }
        
        // Close the loading dialog
        print('🔄 Calling stopLoading...');
        stopLoading();
        print('✅ stopLoading called');
        
        // Small delay to ensure dialog closes
        await Future.delayed(const Duration(milliseconds: 150));
        
        // Navigate back
        if (!isNewUser) {
          print('🔙 Calling Get.back() for navigation');
          Get.back();
          print('✅ Navigation completed');
        }
      },
    );
  }
}

class AIPulseLoader extends StatelessWidget {
  const AIPulseLoader({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: [Colors.purpleAccent, Colors.blueAccent],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ).createShader(bounds),
            child: const Icon(Icons.auto_awesome, size: 60, color: Colors.white),
          ),
          const SizedBox(height: 20),
          const Text(
            "AI is crafting your profile story...",
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          const _GlowingDots(),
        ],
      ),
    );
  }
}

class _GlowingDots extends StatefulWidget {
  const _GlowingDots();

  @override
  State<_GlowingDots> createState() => _GlowingDotsState();
}

class _GlowingDotsState extends State<_GlowingDots> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _dot1;
  late Animation<double> _dot2;
  late Animation<double> _dot3;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(duration: const Duration(seconds: 2), vsync: this)..repeat();

    _dot1 = Tween<double>(begin: 0.2, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.4, curve: Curves.easeInOut)),
    );
    _dot2 = Tween<double>(begin: 0.2, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.2, 0.6, curve: Curves.easeInOut)),
    );
    _dot3 = Tween<double>(begin: 0.2, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.4, 1.0, curve: Curves.easeInOut)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) => Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildDot(_dot1.value),
          const SizedBox(width: 10),
          _buildDot(_dot2.value),
          const SizedBox(width: 10),
          _buildDot(_dot3.value),
        ],
      ),
    );
  }

  Widget _buildDot(double opacity) {
    return Opacity(
      opacity: opacity,
      child: Container(
        width: 10,
        height: 10,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.blueAccent,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
