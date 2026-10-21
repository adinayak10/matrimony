import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:banjaramatch/common/api_service/success_story_service.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/localization/features/match_strings.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/common/section_card.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Share a success story: partner from accepted connections (optional) or
/// free names, story (30-5000 chars), wedding date, city, optional photo.
/// Pops with `true` once the story is submitted (it then waits for review).
class SubmitSuccessStoryScreen extends StatelessWidget {
  const SubmitSuccessStoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GetBuilder<SubmitSuccessStoryController>(
      init: SubmitSuccessStoryController(),
      tag: 'submit_success_story',
      builder: (controller) {
        return Scaffold(
          backgroundColor: cBackground,
          body: Column(
            children: [
              TopBarForInView(title: MatchKeys.shareStory),
              Expanded(
                child: GestureDetector(
                  onTap: () => FocusScope.of(context).unfocus(),
                  child: ListView(
                    padding: const EdgeInsets.only(top: 8, bottom: 24),
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                        child: Text(MatchKeys.reviewNote.tr,
                            style: MyTextStyle.gilroyRegular(size: 13, color: cLightText)),
                      ),
                      _partnerCard(controller),
                      SectionCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _label(MatchKeys.groomName.tr),
                            _field(controller.groomController, maxLength: 80),
                            const SizedBox(height: 14),
                            _label(MatchKeys.brideName.tr),
                            _field(controller.brideController, maxLength: 80),
                            const SizedBox(height: 14),
                            _label(MatchKeys.story.tr),
                            _field(
                              controller.storyController,
                              maxLength: SubmitSuccessStoryController.maxStory,
                              hint: MatchKeys.storyHint.tr,
                              minLines: 6,
                              maxLines: 12,
                              onChanged: (_) => controller.update(),
                              capitalization: TextCapitalization.sentences,
                            ),
                            Align(
                              alignment: Alignment.centerRight,
                              child: Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  MatchKeys.storyCount.trParams({
                                    'count': '${controller.storyLength}',
                                    'max': '${SubmitSuccessStoryController.maxStory}',
                                  }),
                                  style: MyTextStyle.gilroyMedium(
                                    size: 12,
                                    color: controller.storyLength < SubmitSuccessStoryController.minStory
                                        ? cLightText
                                        : cGreen,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SectionCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _label('${MatchKeys.weddingDate.tr} (${MatchKeys.optional.tr})'),
                            _dateField(context, controller),
                            const SizedBox(height: 14),
                            _label('${MatchKeys.city.tr} (${MatchKeys.optional.tr})'),
                            _field(controller.cityController, maxLength: 80),
                            const SizedBox(height: 14),
                            _label('${MatchKeys.photo.tr} (${MatchKeys.optional.tr})'),
                            _photoPicker(controller),
                          ],
                        ),
                      ),
                    ],
                  ),
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
                      onPressed: controller.isSubmitting ? null : controller.submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: cPrimary,
                        foregroundColor: cOnPrimary,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: controller.isSubmitting
                          ? const SizedBox(
                              width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: cOnPrimary))
                          : Text(MatchKeys.submitStory.tr, style: MyTextStyle.gilroyBold(size: 16, color: cOnPrimary)),
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

  Widget _partnerCard(SubmitSuccessStoryController controller) {
    final partner = controller.partner;
    return SectionCard(
      title: MatchKeys.partner.tr,
      subtitle: MatchKeys.partnerHint.tr,
      icon: Icons.favorite_outline_rounded,
      child: partner == null
          ? SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: controller.openPartnerPicker,
                icon: const Icon(Icons.people_alt_outlined, size: 18),
                label: Text(MatchKeys.choosePartner.tr, style: MyTextStyle.gilroySemiBold(size: 14, color: cPrimary)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: cPrimary,
                  side: const BorderSide(color: cBorder),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            )
          : Row(
              children: [
                ClipOval(
                  child: MyCachedProfileImage(
                    imageUrl: partner.profile,
                    fullName: partner.fullName,
                    width: 44,
                    height: 44,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    partner.fullName ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: MyTextStyle.gilroyBold(size: 15, color: cDarkText),
                  ),
                ),
                IconButton(
                  onPressed: controller.clearPartner,
                  icon: const Icon(Icons.close_rounded, color: cLightText),
                ),
              ],
            ),
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: MyTextStyle.gilroySemiBold(size: 14, color: cDarkText)),
    );
  }

  Widget _field(
    TextEditingController controller, {
    required int maxLength,
    String? hint,
    int minLines = 1,
    int maxLines = 1,
    ValueChanged<String>? onChanged,
    TextCapitalization capitalization = TextCapitalization.words,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      decoration: BoxDecoration(color: cLightBg, borderRadius: BorderRadius.circular(10)),
      child: TextField(
        controller: controller,
        maxLength: maxLength,
        minLines: minLines,
        maxLines: maxLines,
        onChanged: onChanged,
        textCapitalization: capitalization,
        style: MyTextStyle.gilroyRegular(color: cDarkText),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: MyTextStyle.gilroyRegular(color: cLightText),
          border: InputBorder.none,
          counterText: '',
        ),
      ),
    );
  }

  Widget _dateField(BuildContext context, SubmitSuccessStoryController controller) {
    final date = controller.weddingDate;
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () => controller.pickWeddingDate(context),
      child: Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(color: cLightBg, borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            const Icon(Icons.event_rounded, size: 20, color: cLightText),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                date != null ? DateFormat('d MMM yyyy').format(date) : MatchKeys.select.tr,
                style: MyTextStyle.gilroyRegular(color: date != null ? cDarkText : cLightText),
              ),
            ),
            if (date != null)
              GestureDetector(
                onTap: controller.clearWeddingDate,
                child: Text(MatchKeys.clear.tr, style: MyTextStyle.gilroySemiBold(size: 13, color: cPrimary)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _photoPicker(SubmitSuccessStoryController controller) {
    final photo = controller.photo;
    if (photo == null) {
      return InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: controller.pickPhoto,
        child: Container(
          height: 110,
          width: double.infinity,
          decoration: BoxDecoration(
            color: cLightBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: cBorder),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.add_photo_alternate_outlined, color: cPrimary, size: 30),
              const SizedBox(height: 6),
              Text(MatchKeys.addPhoto.tr, style: MyTextStyle.gilroySemiBold(size: 13, color: cPrimary)),
            ],
          ),
        ),
      );
    }
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: AspectRatio(
            aspectRatio: 16 / 10,
            child: Image.file(File(photo.path), fit: BoxFit.cover, width: double.infinity),
          ),
        ),
        Positioned(
          top: 8,
          right: 8,
          child: Row(
            children: [
              _photoAction(Icons.edit_rounded, controller.pickPhoto),
              const SizedBox(width: 8),
              _photoAction(Icons.delete_outline_rounded, controller.removePhoto),
            ],
          ),
        ),
      ],
    );
  }

  Widget _photoAction(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: Colors.black.withOpacity(0.5), shape: BoxShape.circle),
        child: Icon(icon, color: cWhite, size: 18),
      ),
    );
  }
}

class SubmitSuccessStoryController extends BaseController {
  static const int minStory = 30;
  static const int maxStory = 5000;

  final TextEditingController groomController = TextEditingController();
  final TextEditingController brideController = TextEditingController();
  final TextEditingController storyController = TextEditingController();
  final TextEditingController cityController = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  /// Accepted connection named as the partner (optional).
  User? partner;
  DateTime? weddingDate;
  XFile? photo;
  bool isSubmitting = false;

  List<User> _connections = [];
  bool _connectionsLoaded = false;

  int get storyLength => storyController.text.trim().length;

  @override
  void onClose() {
    groomController.dispose();
    brideController.dispose();
    storyController.dispose();
    cityController.dispose();
    super.onClose();
  }

  void openPartnerPicker() {
    if (_connectionsLoaded) {
      _showPartnerSheet();
      return;
    }
    startLoading();
    // One generous page: the API's `start` is an offset-like value, so paging
    // with page numbers would overlap; 100 accepted connections is plenty here.
    UserService.shared.fetchConnections(
      page: 1,
      limit: 100,
      completion: (rows) {
        stopLoading();
        final seen = <String>{};
        _connections = rows
            .map((e) => e.user)
            .whereType<User>()
            .where((u) => u.id != null && seen.add(u.id!))
            .toList();
        _connectionsLoaded = true;
        _showPartnerSheet();
      },
    );
  }

  void _showPartnerSheet() {
    Get.bottomSheet(
      Container(
        constraints: BoxConstraints(maxHeight: Get.height * 0.7),
        decoration: const BoxDecoration(
          color: cWhite,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: cLightBg, borderRadius: BorderRadius.circular(2)),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(MatchKeys.choosePartner.tr, style: MyTextStyle.gilroyBold(size: 18, color: cDarkText)),
              ),
              if (_connections.isEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                  child: Text(
                    MatchKeys.noConnections.tr,
                    textAlign: TextAlign.center,
                    style: MyTextStyle.gilroyRegular(size: 14, color: cLightText),
                  ),
                )
              else
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: _connections.length,
                    itemBuilder: (context, index) {
                      final user = _connections[index];
                      return ListTile(
                        leading: ClipOval(
                          child: MyCachedProfileImage(
                            imageUrl: user.profile,
                            fullName: user.fullName,
                            width: 42,
                            height: 42,
                          ),
                        ),
                        title: Text(user.fullName ?? '', style: MyTextStyle.gilroySemiBold(size: 15, color: cDarkText)),
                        subtitle: (user.location?.city?.name ?? '').isEmpty
                            ? null
                            : Text(user.location!.city!.name!,
                                style: MyTextStyle.gilroyRegular(size: 12, color: cLightText)),
                        onTap: () {
                          Get.back();
                          choosePartner(user);
                        },
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
      isScrollControlled: true,
    );
  }

  /// Sets the partner and fills the empty name fields (groom/bride by gender).
  void choosePartner(User user) {
    partner = user;
    final me = SessionManager.shared.getUser();
    final myName = (me?.fullName ?? '').trim();
    final partnerName = (user.fullName ?? '').trim();
    final iAmBride = (me?.gender ?? '').toLowerCase() == 'female' || (user.gender ?? '').toLowerCase() == 'male';
    final groom = iAmBride ? partnerName : myName;
    final bride = iAmBride ? myName : partnerName;
    if (groomController.text.trim().isEmpty && groom.isNotEmpty) groomController.text = groom;
    if (brideController.text.trim().isEmpty && bride.isNotEmpty) brideController.text = bride;
    update();
  }

  void clearPartner() {
    partner = null;
    update();
  }

  Future<void> pickWeddingDate(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: weddingDate ?? now,
      firstDate: DateTime(1950),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked == null) return;
    weddingDate = picked;
    update();
  }

  void clearWeddingDate() {
    weddingDate = null;
    update();
  }

  Future<void> pickPhoto() async {
    try {
      final image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );
      if (image == null) return;
      photo = image;
      update();
    } catch (_) {
      showSnackBar(AppKeys.somethingWentWrong.tr, type: SnackBarType.error);
    }
  }

  void removePhoto() {
    photo = null;
    update();
  }

  /// Client-side validation mirroring the API; returns the first error or null.
  String? _validate() {
    if (groomController.text.trim().isEmpty) return MatchKeys.groomRequired.tr;
    if (brideController.text.trim().isEmpty) return MatchKeys.brideRequired.tr;
    final length = storyLength;
    if (length < minStory) return MatchKeys.storyTooShort.trParams({'min': '$minStory'});
    if (length > maxStory) return MatchKeys.storyTooLong.trParams({'max': '$maxStory'});
    return null;
  }

  void submit() {
    if (isSubmitting) return;
    final error = _validate();
    if (error != null) {
      showSnackBar(error, type: SnackBarType.error);
      return;
    }
    isSubmitting = true;
    update();
    SuccessStoryService.shared.submit(
      groomName: groomController.text.trim(),
      brideName: brideController.text.trim(),
      story: storyController.text.trim(),
      weddingDate: weddingDate,
      city: cityController.text.trim(),
      partnerUserId: partner?.id,
      photo: photo,
      completion: (story) {
        isSubmitting = false;
        update();
        Get.back(result: true);
        showSnackBar(MatchKeys.storySubmitted.tr, type: SnackBarType.success);
      },
      onError: (message) {
        isSubmitting = false;
        update();
        // 400 NOT_CONNECTED, 429 DAILY_CAP and validation errors carry a readable server message.
        showSnackBar(message, type: SnackBarType.error);
      },
    );
  }
}
