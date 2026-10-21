import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/api_service/verification_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/models/verification_status_model.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';

/// Profile verification: status (none / pending / rejected + reason /
/// verified) and the submit form (document type, 1-2 document photos, selfie).
class VerificationController extends BaseController {
  static const int maxDocuments = 2;

  /// Used when the server settings carry no document types.
  static const List<String> fallbackDocumentTypes = [
    'Aadhaar Card',
    'PAN Card',
    'Passport',
    'Driving Licence',
    'Voter ID',
  ];

  final ImagePicker _picker = ImagePicker();
  final TextEditingController fullNameController = TextEditingController();

  VerificationStatus? status;
  bool isFetching = true;
  String? fetchError;
  bool isSubmitting = false;

  /// True after "Submit again" on a rejected request.
  bool showFormAfterRejection = false;

  late final List<String> documentTypes = _loadDocumentTypes();
  String? selectedDocumentType;
  final List<XFile> documents = [];
  XFile? selfie;

  /// none | pending | rejected | verified
  String get state => status?.state ?? 'none';

  bool get canSubmit => status?.canSubmit ?? true;

  /// The form is visible for new requests and after "Submit again".
  bool get showForm {
    if (status == null) return false;
    if (state == 'verified' || state == 'pending') return false;
    if (!canSubmit) return false;
    if (state == 'rejected') return showFormAfterRejection;
    return true;
  }

  bool get isReadyToSubmit =>
      fullNameController.text.trim().length >= 2 &&
      (selectedDocumentType ?? '').isNotEmpty &&
      documents.isNotEmpty &&
      selfie != null &&
      !isSubmitting;

  @override
  void onInit() {
    super.onInit();
    fullNameController.text = (SessionManager.shared.getUser()?.fullName ?? '').trim();
    fullNameController.addListener(update);
    fetchStatus();
  }

  @override
  void onClose() {
    fullNameController.removeListener(update);
    fullNameController.dispose();
    super.onClose();
  }

  List<String> _loadDocumentTypes() {
    final titles = (SessionManager.shared.getSettings()?.documentType ?? [])
        .map((type) => (type.title ?? '').trim())
        .where((title) => title.isNotEmpty)
        .toSet()
        .toList();
    return titles.isEmpty ? List<String>.from(fallbackDocumentTypes) : titles;
  }

  void fetchStatus() {
    isFetching = true;
    fetchError = null;
    update();
    VerificationService.shared.fetchStatus(
      completion: (result) {
        status = result;
        isFetching = false;
        _syncLocalBadge(result);
        update();
      },
      onError: (message) {
        isFetching = false;
        fetchError = message;
        update();
      },
    );
  }

  /// Mirrors the server's verified flag into the stored user so the badge
  /// shows without a re-login (never sets it locally on submit).
  void _syncLocalBadge(VerificationStatus result) {
    final user = SessionManager.shared.getUser();
    if (user == null) return;
    if ((user.isVerified == 1) == result.isVerified) return;
    user.isVerified = result.isVerified ? 1 : 0;
    SessionManager.shared.setUser(user);
    final uid = SessionManager.shared.getUserID();
    if (Get.isRegistered<ProfileController>(tag: uid)) {
      Get.find<ProfileController>(tag: uid).updateMyProfile();
    }
  }

  void selectDocumentType(String? value) {
    selectedDocumentType = value;
    update();
  }

  void startResubmit() {
    showFormAfterRejection = true;
    update();
  }

  Future<void> pickDocument(ImageSource source) async {
    if (documents.length >= maxDocuments) return;
    try {
      final file = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: 1800);
      if (file != null) {
        documents.add(file);
        update();
      }
    } catch (e) {
      print('pickDocument failed: $e');
      showSnackBar(AppKeys.verifyPickFailed.tr, type: SnackBarType.error);
    }
  }

  void removeDocument(int index) {
    if (index < 0 || index >= documents.length) return;
    documents.removeAt(index);
    update();
  }

  Future<void> pickSelfie() async {
    try {
      final file = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        imageQuality: 80,
        maxWidth: 1400,
      );
      if (file != null) {
        selfie = file;
        update();
      }
    } catch (e) {
      print('pickSelfie failed: $e');
      showSnackBar(AppKeys.verifyPickFailed.tr, type: SnackBarType.error);
    }
  }

  void removeSelfie() {
    selfie = null;
    update();
  }

  void submit() {
    final fullName = fullNameController.text.trim();
    if (fullName.length < 2) {
      showSnackBar(AppKeys.verifyNameRequired.tr, type: SnackBarType.error);
      return;
    }
    if ((selectedDocumentType ?? '').isEmpty) {
      showSnackBar(AppKeys.verifyTypeRequired.tr, type: SnackBarType.error);
      return;
    }
    if (documents.isEmpty) {
      showSnackBar(AppKeys.verifyDocumentRequired.tr, type: SnackBarType.error);
      return;
    }
    final photo = selfie;
    if (photo == null) {
      showSnackBar(AppKeys.verifySelfieRequired.tr, type: SnackBarType.error);
      return;
    }
    if (isSubmitting) return;
    isSubmitting = true;
    update();
    UserService.shared.submitVerification(
      fullName: fullName,
      documentType: selectedDocumentType!,
      documents: List<XFile>.from(documents),
      selfie: photo,
      completion: () {
        isSubmitting = false;
        showFormAfterRejection = false;
        documents.clear();
        selfie = null;
        showSnackBar(AppKeys.verifySubmitted.tr, type: SnackBarType.success);
        fetchStatus();
      },
      onError: (message) {
        isSubmitting = false;
        update();
        showSnackBar(message, type: SnackBarType.error);
        // 409 PENDING_EXISTS / 400 ALREADY_VERIFIED: show the real state.
        fetchStatus();
      },
    );
  }
}
