import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/features/match_strings.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/common/section_card.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/horoscope_constants.dart';

/// Translated label for an API manglik value (Yes/No/Partial/Not specified).
String manglikLabel(String? value) {
  switch (value) {
    case 'Yes':
      return MatchKeys.manglikYes.tr;
    case 'No':
      return MatchKeys.manglikNo.tr;
    case 'Partial':
      return MatchKeys.manglikPartial.tr;
    case null:
    case '':
    case 'Not specified':
      return MatchKeys.manglikNotSpecified.tr;
    default:
      return value;
  }
}

/// Edits the signed-in member's horoscope (birth time/place, rashi, nakshatra),
/// manglik status and the "horoscope match required" flag. Pops with `true`
/// after a successful save.
class HoroscopeScreen extends StatelessWidget {
  const HoroscopeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GetBuilder<HoroscopeController>(
      init: HoroscopeController(),
      tag: 'horoscope_edit',
      builder: (controller) {
        return Scaffold(
          backgroundColor: cBackground,
          body: Column(
            children: [
              TopBarForInView(title: MatchKeys.horoscope),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.only(top: 8, bottom: 24),
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                      child: Text(
                        MatchKeys.horoscopeIntro.tr,
                        style: MyTextStyle.gilroyRegular(size: 13, color: cLightText),
                      ),
                    ),
                    SectionCard(
                      title: MatchKeys.birthDetails.tr,
                      icon: Icons.auto_awesome_outlined,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label(MatchKeys.birthTime.tr),
                          _birthTimeField(context, controller),
                          const SizedBox(height: 14),
                          _label(MatchKeys.birthPlace.tr),
                          _box(
                            TextField(
                              controller: controller.birthPlaceController,
                              maxLength: 120,
                              textCapitalization: TextCapitalization.words,
                              style: MyTextStyle.gilroyRegular(color: cDarkText),
                              decoration: InputDecoration(
                                hintText: MatchKeys.birthPlaceHint.tr,
                                hintStyle: MyTextStyle.gilroyRegular(color: cLightText),
                                border: InputBorder.none,
                                counterText: '',
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          _label(MatchKeys.rashi.tr),
                          _dropdown(
                            value: controller.rashi,
                            items: HoroscopeConstants.rashis,
                            labelFor: HoroscopeConstants.rashiLabel,
                            onChanged: controller.setRashi,
                          ),
                          const SizedBox(height: 14),
                          _label(MatchKeys.nakshatra.tr),
                          _dropdown(
                            value: controller.nakshatra,
                            items: HoroscopeConstants.nakshatras,
                            labelFor: (v) => v,
                            onChanged: controller.setNakshatra,
                          ),
                        ],
                      ),
                    ),
                    SectionCard(
                      title: MatchKeys.manglikStatus.tr,
                      icon: Icons.brightness_5_outlined,
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: HoroscopeConstants.manglikStatuses.map((value) {
                          final selected = controller.manglik == value;
                          return ChoiceChip(
                            label: Text(
                              manglikLabel(value),
                              style: MyTextStyle.gilroySemiBold(size: 13, color: selected ? cOnPrimary : cDarkText),
                            ),
                            selected: selected,
                            selectedColor: cPrimary,
                            backgroundColor: cLightBg,
                            onSelected: (_) => controller.setManglik(value),
                          );
                        }).toList(),
                      ),
                    ),
                    SectionCard(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: Material(type: MaterialType.transparency, child: SwitchListTile(
                        value: controller.horoscopeRequired,
                        activeColor: cPrimary,
                        onChanged: controller.setHoroscopeRequired,
                        title: Text(MatchKeys.horoscopeRequired.tr,
                            style: MyTextStyle.gilroySemiBold(size: 14, color: cDarkText)),
                        subtitle: Text(MatchKeys.horoscopeRequiredHint.tr,
                            style: MyTextStyle.gilroyRegular(size: 12, color: cLightText)),
                      )),
                    ),
                  ],
                ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: controller.isSaving ? null : controller.save,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: cPrimary,
                        foregroundColor: cOnPrimary,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: controller.isSaving
                          ? const SizedBox(
                              width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: cOnPrimary))
                          : Text(MatchKeys.save.tr, style: MyTextStyle.gilroyBold(size: 16, color: cOnPrimary)),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: MyTextStyle.gilroySemiBold(size: 14, color: cDarkText)),
    );
  }

  Widget _box(Widget child) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(color: cLightBg, borderRadius: BorderRadius.circular(10)),
      child: child,
    );
  }

  Widget _birthTimeField(BuildContext context, HoroscopeController controller) {
    final hasTime = controller.birthTime.isNotEmpty;
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () => controller.pickBirthTime(context),
      child: _box(
        SizedBox(
          height: 48,
          child: Row(
            children: [
              const Icon(Icons.schedule_rounded, size: 20, color: cLightText),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  hasTime ? controller.birthTime : MatchKeys.birthTimeHint.tr,
                  style: MyTextStyle.gilroyRegular(color: hasTime ? cDarkText : cLightText),
                ),
              ),
              if (hasTime)
                GestureDetector(
                  onTap: controller.clearBirthTime,
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Text(MatchKeys.clear.tr, style: MyTextStyle.gilroySemiBold(size: 13, color: cPrimary)),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dropdown({
    required String? value,
    required List<String> items,
    required String Function(String) labelFor,
    required ValueChanged<String?> onChanged,
  }) {
    return _box(
      DropdownButton<String>(
        value: value,
        isExpanded: true,
        underline: const SizedBox(),
        hint: Text(MatchKeys.select.tr, style: MyTextStyle.gilroyRegular(color: cLightText)),
        icon: const Icon(Icons.keyboard_arrow_down_rounded),
        items: [
          DropdownMenuItem<String>(
            value: '',
            child: Text(MatchKeys.notSpecified.tr, style: MyTextStyle.gilroyRegular(color: cLightText)),
          ),
          ...items.map(
            (item) => DropdownMenuItem<String>(
              value: item,
              child: Text(labelFor(item), style: MyTextStyle.gilroyRegular(color: cDarkText)),
            ),
          ),
        ],
        onChanged: onChanged,
      ),
    );
  }
}

class HoroscopeController extends BaseController {
  final TextEditingController birthPlaceController = TextEditingController();

  /// "HH:mm" (24 h, like the website) or '' when not set.
  String birthTime = '';

  /// API value or null (not set). '' from the dropdown also means "not set".
  String? rashi;
  String? nakshatra;
  String manglik = HoroscopeConstants.manglikNotSpecified;
  bool horoscopeRequired = false;
  bool isSaving = false;

  @override
  void onInit() {
    super.onInit();
    final User? me = SessionManager.shared.getUser();
    final Horoscope? h = me?.horoscope;
    birthTime = (h?.birthTime ?? '').trim();
    birthPlaceController.text = (h?.birthPlace ?? '').trim();
    // Older/foreign values that are not in the API lists would crash the dropdown.
    rashi = HoroscopeConstants.validOrNull(h?.rashi, HoroscopeConstants.rashis);
    nakshatra = HoroscopeConstants.validOrNull(h?.nakshatra, HoroscopeConstants.nakshatras);
    manglik = HoroscopeConstants.validOrNull(me?.manglikStatus, HoroscopeConstants.manglikStatuses) ??
        HoroscopeConstants.manglikNotSpecified;
    horoscopeRequired = me?.horoscopeRequired ?? false;
  }

  @override
  void onClose() {
    birthPlaceController.dispose();
    super.onClose();
  }

  void setRashi(String? value) {
    rashi = (value == null || value.isEmpty) ? null : value;
    update();
  }

  void setNakshatra(String? value) {
    nakshatra = (value == null || value.isEmpty) ? null : value;
    update();
  }

  void setManglik(String value) {
    manglik = value;
    update();
  }

  void setHoroscopeRequired(bool value) {
    horoscopeRequired = value;
    update();
  }

  void clearBirthTime() {
    birthTime = '';
    update();
  }

  TimeOfDay? _parseTime(String value) {
    final match = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(value);
    if (match == null) return null;
    final h = int.tryParse(match.group(1)!);
    final m = int.tryParse(match.group(2)!);
    if (h == null || m == null || h > 23 || m > 59) return null;
    return TimeOfDay(hour: h, minute: m);
  }

  Future<void> pickBirthTime(BuildContext context) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _parseTime(birthTime) ?? const TimeOfDay(hour: 6, minute: 0),
    );
    if (picked == null) return;
    birthTime = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    update();
  }

  void save() {
    if (isSaving) return;
    isSaving = true;
    update();
    UserService.shared.updateHoroscope(
      horoscope: Horoscope(
        birthTime: birthTime,
        birthPlace: birthPlaceController.text.trim(),
        rashi: rashi ?? '',
        nakshatra: nakshatra ?? '',
      ),
      manglikStatus: manglik,
      horoscopeRequired: horoscopeRequired,
      completion: (user) {
        isSaving = false;
        update();
        // Refresh my own profile screen if it is open.
        final myId = SessionManager.shared.getUserID();
        if (Get.isRegistered<ProfileController>(tag: myId)) {
          Get.find<ProfileController>(tag: myId).updateMyProfile();
        }
        Get.back(result: true);
        showSnackBar(MatchKeys.horoscopeSaved.tr, type: SnackBarType.success);
      },
      onError: (message) {
        isSaving = false;
        update();
        showSnackBar(message, type: SnackBarType.error);
      },
    );
  }
}
