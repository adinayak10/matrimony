import 'dart:io';

import 'package:dotted_border/dotted_border.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/screens/common/empty_state.dart';
import 'package:banjaramatch/screens/common/section_card.dart';
import 'package:banjaramatch/screens/common/status_chip.dart';
import 'package:banjaramatch/screens/setting_screen/feature_app_bar.dart';
import 'package:banjaramatch/screens/verification_screen/verification_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Get the blue tick: status card + document/selfie submission.
class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  final String _tag = 'verification_${DateTime.now().microsecondsSinceEpoch}';
  late final VerificationController controller = Get.put(VerificationController(), tag: _tag);

  @override
  void dispose() {
    Get.delete<VerificationController>(tag: _tag);
    super.dispose();
  }

  static String _date(DateTime? date) => date == null ? '' : DateFormat('d MMM yyyy').format(date);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cBackground,
      appBar: featureAppBar(AppKeys.verifyTitle.tr),
      body: GetBuilder<VerificationController>(
        tag: _tag,
        init: controller,
        builder: (c) {
          if (c.isFetching && c.status == null) {
            return const Center(child: CircularProgressIndicator(color: cPrimary));
          }
          if (c.status == null) {
            return EmptyState(
              icon: Icons.cloud_off_rounded,
              title: AppKeys.somethingWentWrong.tr,
              message: c.fetchError ?? '',
              onAction: c.fetchStatus,
            );
          }
          return RefreshIndicator(
            color: cPrimary,
            onRefresh: () async => c.fetchStatus(),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(top: 8, bottom: 32),
              children: [
                _statusCard(c),
                if (c.showForm) ..._form(context, c),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _statusCard(VerificationController c) {
    final status = c.status!;
    final latest = status.latest;
    late final IconData icon;
    late final Color color;
    late final String title;
    late final String message;
    switch (c.state) {
      case 'verified':
        icon = Icons.verified_rounded;
        color = cBlueTick;
        title = AppKeys.verifyVerifiedTitle.tr;
        message = status.verifiedAt != null
            ? AppKeys.verifyVerifiedOn.trParams({'date': _date(status.verifiedAt)})
            : AppKeys.verifyVerifiedMessage.tr;
        break;
      case 'pending':
        icon = Icons.hourglass_top_rounded;
        color = const Color(0xFFF59E0B);
        title = AppKeys.verifyPendingTitle.tr;
        message = latest?.submittedAt != null
            ? AppKeys.verifyPendingSince.trParams({'date': _date(latest?.submittedAt)})
            : AppKeys.verifyPendingMessage.tr;
        break;
      case 'rejected':
        icon = Icons.error_outline_rounded;
        color = cError;
        title = AppKeys.verifyRejectedTitle.tr;
        final reason = (latest?.reason ?? '').trim();
        message = reason.isNotEmpty
            ? AppKeys.verifyRejectedReason.trParams({'reason': reason})
            : AppKeys.verifyRejectedMessage.tr;
        break;
      default:
        icon = Icons.shield_outlined;
        color = cPrimary;
        title = AppKeys.verifyNoneTitle.tr;
        message = AppKeys.verifyNoneMessage.tr;
    }

    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: color.withOpacity(0.12), shape: BoxShape.circle),
                child: Icon(icon, color: color, size: 26),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(title, style: MyTextStyle.gilroyBold(size: 17, color: cDarkText)),
              ),
              StatusChip.forStatus(c.state),
            ],
          ),
          const SizedBox(height: 12),
          Text(message, style: MyTextStyle.gilroyRegular(size: 14, color: cDarkText.withOpacity(0.75))),
          if (c.state == 'rejected' && c.canSubmit && !c.showFormAfterRejection) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: _primaryButton(AppKeys.verifySubmitAgain.tr, c.startResubmit),
            ),
          ],
          if (c.state == 'none' || c.showForm) ...[
            const SizedBox(height: 12),
            _benefit(Icons.verified_user_outlined, AppKeys.verifyBenefitTrust.tr),
            _benefit(Icons.lock_outline_rounded, AppKeys.verifyBenefitPrivate.tr),
          ],
        ],
      ),
    );
  }

  Widget _benefit(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: cGreen),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: MyTextStyle.gilroyMedium(size: 12, color: cLightText))),
        ],
      ),
    );
  }

  List<Widget> _form(BuildContext context, VerificationController c) {
    return [
      SectionCard(
        title: AppKeys.verifyDetailsTitle.tr,
        icon: Icons.badge_outlined,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _label(AppKeys.verifyFullName.tr),
            TextField(
              controller: c.fullNameController,
              textCapitalization: TextCapitalization.words,
              style: MyTextStyle.gilroyRegular(size: 15, color: cDarkText),
              decoration: _inputDecoration(AppKeys.verifyFullNameHint.tr),
            ),
            const SizedBox(height: 14),
            _label(AppKeys.verifyDocumentType.tr),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(color: cLightBg, borderRadius: BorderRadius.circular(12)),
              child: DropdownButton<String>(
                value: c.documentTypes.contains(c.selectedDocumentType) ? c.selectedDocumentType : null,
                isExpanded: true,
                underline: const SizedBox(),
                hint: Text(AppKeys.verifyDocumentTypeHint.tr, style: MyTextStyle.gilroyRegular(color: cLightText)),
                icon: const Icon(Icons.keyboard_arrow_down_rounded),
                items: c.documentTypes
                    .map((type) => DropdownMenuItem<String>(
                          value: type,
                          child: Text(type, style: MyTextStyle.gilroyRegular(color: cDarkText)),
                        ))
                    .toList(),
                onChanged: c.selectDocumentType,
              ),
            ),
          ],
        ),
      ),
      SectionCard(
        title: AppKeys.verifyDocumentPhotos.tr,
        subtitle: AppKeys.verifyDocumentPhotosHint.tr,
        icon: Icons.description_outlined,
        child: Row(
          children: [
            for (var i = 0; i < VerificationController.maxDocuments; i++) ...[
              if (i > 0) const SizedBox(width: 12),
              Expanded(
                child: i < c.documents.length
                    ? _preview(c.documents[i], () => c.removeDocument(i))
                    : _pickerBox(
                        icon: Icons.add_a_photo_outlined,
                        label: i == 0 ? AppKeys.verifyAddFront.tr : AppKeys.verifyAddBack.tr,
                        enabled: i == c.documents.length,
                        onTap: () => _chooseSource(context, c),
                      ),
              ),
            ],
          ],
        ),
      ),
      SectionCard(
        title: AppKeys.verifySelfie.tr,
        subtitle: AppKeys.verifySelfieHint.tr,
        icon: Icons.face_retouching_natural_outlined,
        child: Row(
          children: [
            Expanded(
              child: c.selfie != null
                  ? _preview(c.selfie!, c.removeSelfie)
                  : _pickerBox(
                      icon: Icons.camera_front_outlined,
                      label: AppKeys.verifyTakeSelfie.tr,
                      enabled: true,
                      onTap: c.pickSelfie,
                    ),
            ),
            const SizedBox(width: 12),
            const Expanded(child: SizedBox()),
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
        child: Text(
          AppKeys.verifyPrivacyNote.tr,
          style: MyTextStyle.gilroyRegular(size: 12, color: cLightText),
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        child: c.isSubmitting
            ? const Center(child: CircularProgressIndicator(color: cPrimary))
            : _primaryButton(AppKeys.verifySubmit.tr, c.isReadyToSubmit ? c.submit : null),
      ),
    ];
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: MyTextStyle.gilroySemiBold(size: 13, color: cDarkText)),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: MyTextStyle.gilroyRegular(color: cLightText),
      filled: true,
      fillColor: cLightBg,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
    );
  }

  Widget _primaryButton(String label, VoidCallback? onTap) {
    return ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: cPrimary,
        disabledBackgroundColor: cPrimary.withOpacity(0.35),
        foregroundColor: cOnPrimary,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      child: Text(label, style: MyTextStyle.gilroySemiBold(size: 15, color: cOnPrimary)),
    );
  }

  Widget _pickerBox({
    required IconData icon,
    required String label,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    return Opacity(
      opacity: enabled ? 1 : 0.45,
      child: GestureDetector(
        onTap: enabled ? onTap : null,
        child: DottedBorder(
          options: RectDottedBorderOptions(
            color: cPrimary.withOpacity(0.6),
            dashPattern: const [6, 4],
          ),
          child: Container(
            height: 120,
            width: double.infinity,
            color: cPrimary.withOpacity(0.04),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: cPrimary, size: 28),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: MyTextStyle.gilroySemiBold(size: 12, color: cPrimary),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _preview(XFile file, VoidCallback onRemove) {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.file(File(file.path), height: 120, width: double.infinity, fit: BoxFit.cover),
        ),
        Positioned(
          top: 6,
          right: 6,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: Colors.black.withOpacity(0.55), shape: BoxShape.circle),
              child: const Icon(Icons.close_rounded, color: Colors.white, size: 16),
            ),
          ),
        ),
      ],
    );
  }

  void _chooseSource(BuildContext context, VerificationController c) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: cWhite,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined, color: cPrimary),
                title: Text(AppKeys.verifyCamera.tr, style: MyTextStyle.gilroySemiBold(size: 15, color: cDarkText)),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  c.pickDocument(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: cPrimary),
                title: Text(AppKeys.verifyGallery.tr, style: MyTextStyle.gilroySemiBold(size: 15, color: cDarkText)),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  c.pickDocument(ImageSource.gallery);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }
}
