import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/contact_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/screens/common/section_card.dart';
import 'package:banjaramatch/screens/faq_screen/faq_screen.dart';
import 'package:banjaramatch/screens/setting_screen/feature_app_bar.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Help & contact form (`POST /api/contact/submit`, source `app`).
class ContactController extends BaseController {
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final phoneController = TextEditingController();
  final messageController = TextEditingController();

  bool isSending = false;
  bool sent = false;
  String sentMessage = '';

  static final RegExp _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  @override
  void onInit() {
    super.onInit();
    final user = SessionManager.shared.getUser();
    nameController.text = (user?.fullName ?? '').trim();
    emailController.text = (user?.email ?? '').trim();
    final digits = (user?.phone ?? '').replaceAll(RegExp(r'\D'), '');
    phoneController.text = digits.length > 10 ? digits.substring(digits.length - 10) : digits;
  }

  @override
  void onClose() {
    nameController.dispose();
    emailController.dispose();
    phoneController.dispose();
    messageController.dispose();
    super.onClose();
  }

  void send() {
    final name = nameController.text.trim();
    final email = emailController.text.trim();
    final phone = phoneController.text.replaceAll(RegExp(r'\D'), '');
    final message = messageController.text.trim();
    if (name.length < 2) {
      showSnackBar(AppKeys.contactNameRequired.tr, type: SnackBarType.error);
      return;
    }
    if (!_emailPattern.hasMatch(email)) {
      showSnackBar(AppKeys.contactEmailInvalid.tr, type: SnackBarType.error);
      return;
    }
    if (phone.length != 10) {
      showSnackBar(AppKeys.contactPhoneInvalid.tr, type: SnackBarType.error);
      return;
    }
    if (message.length < 10) {
      showSnackBar(AppKeys.contactMessageShort.tr, type: SnackBarType.error);
      return;
    }
    if (isSending) return;
    isSending = true;
    update();
    ContactService.shared.submit(
      name: name,
      email: email,
      phone: phone,
      message: message,
      completion: (serverMessage) {
        isSending = false;
        sent = true;
        sentMessage = serverMessage;
        messageController.clear();
        update();
      },
      onError: (error) {
        isSending = false;
        update();
        showSnackBar(error, type: SnackBarType.error);
      },
    );
  }

  void writeAnother() {
    sent = false;
    update();
  }
}

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final String _tag = 'contact_${DateTime.now().microsecondsSinceEpoch}';
  late final ContactController controller = Get.put(ContactController(), tag: _tag);

  @override
  void dispose() {
    Get.delete<ContactController>(tag: _tag);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cBackground,
      appBar: featureAppBar(AppKeys.contactTitle.tr),
      body: GetBuilder<ContactController>(
        tag: _tag,
        builder: (c) {
          return ListView(
            padding: const EdgeInsets.only(top: 8, bottom: 32),
            children: [
              SectionCard(
                icon: Icons.help_outline_rounded,
                title: AppKeys.contactFaqTitle.tr,
                subtitle: AppKeys.contactFaqSubtitle.tr,
                trailing: const Icon(Icons.chevron_right_rounded, color: cLightText),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Get.to(() => const FAQsScreen()),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: cPrimary,
                      side: const BorderSide(color: cPrimary),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(AppKeys.contactOpenFaq.tr, style: MyTextStyle.gilroySemiBold(size: 14, color: cPrimary)),
                  ),
                ),
              ),
              if (c.sent) _sentCard(c) else _form(c),
            ],
          );
        },
      ),
    );
  }

  Widget _sentCard(ContactController c) {
    return SectionCard(
      child: Column(
        children: [
          const Icon(Icons.mark_email_read_rounded, color: cGreen, size: 44),
          const SizedBox(height: 12),
          Text(AppKeys.contactSentTitle.tr, style: MyTextStyle.gilroyBold(size: 17, color: cDarkText)),
          const SizedBox(height: 6),
          Text(
            c.sentMessage.isNotEmpty ? c.sentMessage : AppKeys.contactSentMessage.tr,
            textAlign: TextAlign.center,
            style: MyTextStyle.gilroyRegular(size: 14, color: cLightText),
          ),
          const SizedBox(height: 14),
          TextButton(
            onPressed: c.writeAnother,
            child: Text(AppKeys.contactWriteAnother.tr, style: MyTextStyle.gilroySemiBold(size: 14, color: cPrimary)),
          ),
        ],
      ),
    );
  }

  Widget _form(ContactController c) {
    return SectionCard(
      icon: Icons.mail_outline_rounded,
      title: AppKeys.contactFormTitle.tr,
      subtitle: AppKeys.contactFormSubtitle.tr,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _field(c.nameController, AppKeys.contactName.tr, TextInputType.name),
          _field(c.emailController, AppKeys.contactEmail.tr, TextInputType.emailAddress),
          _field(
            c.phoneController,
            AppKeys.contactPhone.tr,
            TextInputType.phone,
            formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
          ),
          _field(c.messageController, AppKeys.contactMessage.tr, TextInputType.multiline, maxLines: 5),
          const SizedBox(height: 6),
          c.isSending
              ? const Center(child: CircularProgressIndicator(color: cPrimary))
              : ElevatedButton(
                  onPressed: c.send,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: cPrimary,
                    foregroundColor: cOnPrimary,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(AppKeys.contactSend.tr, style: MyTextStyle.gilroySemiBold(size: 15, color: cOnPrimary)),
                ),
        ],
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label,
    TextInputType type, {
    int maxLines = 1,
    List<TextInputFormatter>? formatters,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: controller,
        keyboardType: type,
        maxLines: maxLines,
        inputFormatters: formatters,
        style: MyTextStyle.gilroyRegular(size: 15, color: cDarkText),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: MyTextStyle.gilroyRegular(color: cLightText),
          alignLabelWithHint: maxLines > 1,
          filled: true,
          fillColor: cLightBg,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        ),
      ),
    );
  }
}
