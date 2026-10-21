import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/managers/navigation.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/widgets/functions.dart';
import 'package:banjaramatch/common/widgets/menu.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/localization/features/match_strings.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/chats_screen/chatting_screen/chatting_view.dart';
import 'package:banjaramatch/screens/extra_views/back_button.dart';
import 'package:banjaramatch/screens/guna_milan_screen/guna_milan_screen.dart';
import 'package:banjaramatch/screens/horoscope_screen/horoscope_screen.dart';
import 'package:banjaramatch/screens/personal_info_controller.dart';
import 'package:banjaramatch/screens/personal_info_screen.dart';
import 'package:banjaramatch/screens/preference_fit_model.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';
import 'package:banjaramatch/screens/profile_screen/preference_fit_widget.dart';
import 'package:banjaramatch/screens/report_screen/report_sheet.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/horoscope_constants.dart';

import '../eduction_profession_screen.dart';
import '../family_details_screen.dart';
import '../gallary_management_screen/gallery_management_screen.dart';
import '../lifestyle_step_screen.dart';
import '../localtion_language_screen/lcoation_language_screen.dart';
import '../member_card.dart';

class ProfileScreen extends StatelessWidget {
  final String userId;

  const ProfileScreen({Key? key, this.isFromTabBar = false, required this.userId}) : super(key: key);
  final bool isFromTabBar;

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(ProfileController(userId), tag: userId);
    controller.fetchFitCompareApi();
    final bool isMyProfile = controller.userID == SessionManager.shared.getUserID();
    Functions.changStatusBar(StatusBarStyle.white);

    return GetBuilder<ProfileController>(
      tag: userId,
      builder: (controller) {
        if (controller.isLoading.value) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: cPrimary),
                  SizedBox(height: 16),
                  Text("Loading profile...", style: MyTextStyle.gilroyMedium(size: 16, color: cLightText)),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          backgroundColor: cBackground,
          body: RefreshIndicator(
            onRefresh: () async {
              controller.updateMyProfile();
            },
            child: Stack(
              alignment: Alignment.bottomRight,
              children: [
                CustomScrollView(
                  controller: controller.scrollController,
                  slivers: <Widget>[
                    _buildSliverAppBar(controller, isMyProfile),
                    SliverToBoxAdapter(
                      child: Column(
                        children: [
                          _buildProfileHeader(controller),

                          SizedBox(height: 8),
                          _buildInfoSections(controller),
                          SizedBox(height: 100), // Space for floating buttons
                        ],
                      ),
                    ),
                  ],
                ),
                // Floating Action Buttons
                if (!controller.isSelf) _buildQuickActionBar(controller.user!, controller, 1),
                //  if (!controller.isSelf) _buildFloatingActionButtons(controller.user!, controller, context),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildProfileHeader(ProfileController controller) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          // Profile Picture
          Stack(
            children: [
              GestureDetector(
                onTap: () {
                  Get.to(GalleryManagementScreen(userId: userId));
                },
                child: Container(
                  width: 130,
                  height: 130,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [Colors.pink.shade200, Colors.purple.shade200],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.pink.withOpacity(0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(4),
                  child: ClipOval(
                    child: MyCachedImage(
                      imageUrl: controller.user?.profile ?? '',
                      width: 122,
                      height: 122,
                    ),
                  ),
                ),
              ),
              // Online indicator
              Positioned(
                bottom: 5,
                right: 5,
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: controller.user?.isOnline == true ? Colors.green : Colors.yellow,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Name and verification
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: Text(
                  '${controller?.user?.fullName}',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade800,
                  ),
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (controller.user?.isVerified == 1) ...[
                const SizedBox(width: 8),
                Icon(Icons.verified, color: Colors.blue.shade500, size: 20),
              ],
            ],
          ),
          // The API defaults profileCreatedBy to 'self'; only family-managed profiles get the chip.
          if (!['', 'self'].contains((controller.user?.profileCreatedBy ?? '').trim().toLowerCase())) ...[
            const SizedBox(height: 8),
            _buildManagedByChip(controller.user!.profileCreatedBy!),
          ],
          const SizedBox(height: 8),

          // Age, location, height
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: _buildQuickInfo(Icons.cake, "${calculateAge(controller.user?.dob)} yrs"),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: _buildQuickInfo(Icons.location_on, '${controller?.user?.location?.city?.name}'),
              ),
              const SizedBox(width: 8),
              Flexible(
                child:
                    _buildQuickInfo(Icons.height, '${HeightConverter().cmToImperialString(controller?.user?.height)}'),
              ),
            ],
          ),

          // Bio (if exists)
          const SizedBox(height: 16),
          Text(
            '${controller?.user?.bio}',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickInfo(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: Colors.pink.shade400),
        const SizedBox(width: 4),
        Text(
          text,
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildSliverAppBar(ProfileController controller, bool isMyProfile) {
    return GetBuilder<ProfileController>(
      id: controller.scrollID,
      tag: controller.scrollID,
      init: controller,
      builder: (controller) {
        var temp = (controller.currentExtent * 0.28);
        var size = temp < 35.0 ? 35.0 : temp;
        var o = (-1 * (size - 70)) * 0.02857143;
        var opacity = 1 - (o > 1.0 ? 1.0 : o);

        return SliverAppBar(
          pinned: true,
          backgroundColor: Colors.transparent,
          expandedHeight: controller.maxExtent,
          collapsedHeight: 70,
          stretch: true,
          shadowColor: Colors.transparent,
          leadingWidth: 0,
          automaticallyImplyLeading: false,
          flexibleSpace: FlexibleSpaceBar(
            expandedTitleScale: 1,
            titlePadding: const EdgeInsets.all(0),
            collapseMode: CollapseMode.pin,
            title: Stack(
              children: [
                GestureDetector(
                    onTap: () {
                      Get.to(GalleryManagementScreen(userId: userId));
                    },
                    child: _buildHeaderBackground(controller, opacity)),
                _buildHeaderContent(controller, opacity, isMyProfile),

                // 🔹 Show only when expanded (opacity > 0)
                // 🔹 Only show when not fully collapsed
                if (controller.currentExtent > 100)
                  Positioned(
                    right: 16,
                    bottom: 16,
                    child: GestureDetector(
                      onTap: () {
                        print("ailkodslaiksdas" + userId);
                        Get.to(GalleryManagementScreen(userId: userId));
                      },
                      child: Row(
                        children: [
                          isMyProfile
                              ? Container(
                                  child: Text("Manage Photos"),
                                )
                              : Container(
                                  child: Text("View Photos"),
                                )
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            stretchModes: const [StretchMode.zoomBackground],
            background: Stack(
              fit: StackFit.expand,
              children: [
                MyCachedImage(
                  imageUrl: controller.user?.backgroundImage ?? '',
                  height: 250 + Get.mediaQuery.viewInsets.top,
                ),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withOpacity(0.3),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeaderBackground(ProfileController controller, double opacity) {
    return Stack(
      alignment: Alignment.bottomCenter,
      children: [
        Stack(
          fit: StackFit.expand,
          children: [
            MyCachedImage(
              imageUrl: controller.user?.profile ?? '',
              width: Get.width,
              height: 200 + Get.mediaQuery.viewInsets.top,
            ),
            ClipRRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: (1 - opacity) * 15, sigmaY: (1 - opacity) * 15),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withOpacity((1 - opacity) * 0.5),
                        Colors.black.withOpacity((1 - opacity) * 0.8),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        _buildCollapsedNamePlate(controller, opacity),
      ],
    );
  }

  Widget _buildHeaderContent(ProfileController controller, double opacity, bool isMyProfile) {
    return Stack(
      children: [
        _buildTopNavigation(controller, isMyProfile),
      ],
    );
  }

  Widget _buildTopNavigation(ProfileController controller, bool isMyProfile) {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.only(top: 18, right: 15, left: 7),
        child: Row(
          children: [
            !isFromTabBar ? _buildBackButton() : const SizedBox(width: 30, height: 30),
            const Spacer(),
            _buildTopRightActions(controller, isMyProfile),
          ],
        ),
      ),
    );
  }

  Widget _buildTopRightActions(ProfileController controller, bool isMyProfile) {
    return Row(
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.3),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            onPressed: controller.shareProfile,
            icon: const Icon(Icons.share, color: cWhite, size: 20),
          ),
        ),
        SizedBox(width: 8),
        if (isMyProfile)
          Container(
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.3),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              onPressed: () {
                Navigate.to(GalleryManagementScreen(
                  userId: userId,
                ))?.then((value) {
                  controller.updateMyProfile();
                });
              },
              icon: const Icon(Icons.edit, color: cWhite, size: 20),
            ),
          )
        else
          _buildProfileMenu(controller),
      ],
    );
  }

  Widget _buildBackButton() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.3),
        shape: BoxShape.circle,
      ),
      child: IconButton(
        onPressed: () => Get.back(),
        icon: const Icon(Icons.arrow_back_ios_new, color: cWhite, size: 20),
      ),
    );
  }

  Widget _buildCollapsedNamePlate(ProfileController controller, double opacity) {
    if (opacity > 0.5) return Container();

    return Padding(
      padding: EdgeInsets.only(left: isFromTabBar ? 15 : 45, bottom: 12),
      child: Row(
        children: [
          Text(
            controller.user?.fullName ?? '',
            style: MyTextStyle.gilroyBold(color: cWhite, size: 18),
          ),
          SizedBox(width: 8),
          VerifyIcon(user: controller.user),
        ],
      ),
    );
  }

  Widget _buildQuickActionBar(User profile, ProfileController controller, double opacity) {
    return Positioned(
      bottom: 20,
      left: 20,
      right: 20,
      child: Opacity(
        opacity: opacity,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.9),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              //   _buildQuickAction(Icons.favorite_outline, 'Like', Colors.pink),
              // _buildQuickAction(Icons.bookmark_outline, 'Save', Colors.orange),
              // _buildQuickAction(Icons.chat_bubble_outline, 'Chat', Colors.blue),
              // _buildQuickAction(Icons.share_outlined, 'Share', Colors.green),
              _buildActionButton(
                onTap: () => _handleInterestAction(profile, controller),
                icon: _getInterestIcon(profile),
                label: _getInterestLabel(profile),
                color: _getInterestColor(profile),
                isActive: _isInterestActive(profile),
              ),
              _buildActionButton(
                onTap: () => _handleShortlistAction(profile, controller),
                icon: profile.isShortListed == true ? Icons.bookmark : Icons.bookmark_outline,
                label: profile.isShortListed == true ? "Shortlisted" : "Shortlist",
                color: Colors.amber,
                isActive: profile.isShortListed == true,
              ),
              _buildActionButton(
                onTap: () => _handleChatAction(profile, controller),
                icon: Icons.chat_bubble_outline,
                label: "Chat",
                color: Colors.blue,
                isActive: false,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickAction(IconData icon, String label, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: MyTextStyle.gilroyMedium(
            color: Colors.grey.shade700,
            size: 10,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoSections(ProfileController controller) {
    return Column(
      children: [
        _buildPersonalInfoSection(controller),
        SizedBox(height: 8),
        _buildHoroscopeSection(controller),
        SizedBox(height: 8),
        _buildLocationLanguageSection(controller),
        SizedBox(height: 8),
        _buildCareerSection(controller),
        SizedBox(height: 8),
        _buildContactSection(controller),
        SizedBox(height: 8),
        _buildFamilySection(controller),
        SizedBox(height: 8),
        _buildLifestyleSection(controller),
        if (!controller.isSelf) ...[
          // SizedBox(height: 8),
          // _buildCompatibilitySection(controller),
          SizedBox(height: 8),
          if (controller.preferenceFitModel != null) _buildPreferenceFitSection(controller),
        ],
      ],
    );
  }

  Widget _buildPersonalInfoSection(ProfileController controller) {
    return _buildInfoCard(
      title: "Personal Information",
      icon: Icons.person_outline,
      isEditable: controller.isSelf,
      onEdit: () => Navigate.to(PersonalInfoScreen(onNext: () {})),
      child: Column(
        children: [
          _buildInfoRow(
            'Date of Birth',
            controller.user?.dob != null
                ? DateFormat('dd MMM yyyy').format(DateTime.parse(controller.user!.dob.toString()).toLocal())
                : '-',
            Icons.cake_outlined,
          ),
          _buildInfoRow(
              'Height', HeightConverter().cmToImperialString(controller.user?.height) ?? '-', Icons.height_outlined),
          _buildInfoRow(MatchKeys.bloodGroup.tr, _orDash(controller.user?.bloodGroup), Icons.bloodtype_outlined),
          _buildInfoRow('Marital Status', controller.user?.maritalStatus ?? '-', Icons.favorite_border),
          _buildInfoRow('Caste', controller.user?.caste?.name ?? '-', Icons.group_outlined),
          _buildInfoRow('Gotra', controller.user?.gotra?.name ?? '-', Icons.family_restroom_outlined),
        ],
      ),
    );
  }

  static String _orDash(String? value) {
    final v = (value ?? '').trim();
    return v.isEmpty ? '-' : v;
  }

  /// "Profile managed by Parent" (API stores lowercase; 'self' gets no chip).
  Widget _buildManagedByChip(String createdBy) {
    final value = createdBy.trim().toLowerCase();
    String who;
    switch (value) {
      case 'parent':
        who = MatchKeys.createdByParent.tr;
        break;
      case 'sibling':
        who = MatchKeys.createdBySibling.tr;
        break;
      case 'relative':
        who = MatchKeys.createdByRelative.tr;
        break;
      case 'friend':
        who = MatchKeys.createdByFriend.tr;
        break;
      default:
        who = createdBy.trim();
    }
    final text = MatchKeys.managedBy.trParams({'who': who});
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: cPrimary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cPrimary.withOpacity(0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.supervisor_account_outlined, size: 14, color: cPrimary),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: MyTextStyle.gilroySemiBold(size: 12, color: cPrimary),
            ),
          ),
        ],
      ),
    );
  }

  /// Horoscope details; self can edit (→ HoroscopeScreen), others get "Check Kundli match".
  Widget _buildHoroscopeSection(ProfileController controller) {
    final user = controller.user;
    final horoscope = user?.horoscope;
    final rashi = (horoscope?.rashi ?? '').trim();
    final manglik = (user?.manglikStatus ?? '').trim();
    final requiredFlag = user?.horoscopeRequired;
    final isEmpty = horoscope == null || horoscope.isEmpty;
    return _buildInfoCard(
      title: MatchKeys.horoscope.tr,
      icon: Icons.auto_awesome_outlined,
      isEditable: controller.isSelf,
      onEdit: () => Navigate.to(const HoroscopeScreen()),
      child: Column(
        children: [
          _buildInfoRow(
            MatchKeys.rashi.tr,
            rashi.isEmpty ? '-' : HoroscopeConstants.rashiLabel(rashi),
            Icons.brightness_3_outlined,
          ),
          _buildInfoRow(MatchKeys.nakshatra.tr, _orDash(horoscope?.nakshatra), Icons.star_border_rounded),
          _buildInfoRow(MatchKeys.birthTime.tr, _orDash(horoscope?.birthTime), Icons.schedule_outlined),
          _buildInfoRow(MatchKeys.birthPlace.tr, _orDash(horoscope?.birthPlace), Icons.place_outlined),
          _buildInfoRow(
            MatchKeys.manglikStatus.tr,
            manglik.isEmpty ? '-' : manglikLabel(manglik),
            Icons.brightness_5_outlined,
          ),
          _buildInfoRow(
            MatchKeys.horoscopeMatch.tr,
            requiredFlag == null ? '-' : (requiredFlag ? MatchKeys.required.tr : MatchKeys.notRequired.tr),
            Icons.handshake_outlined,
          ),
          if (!controller.isSelf || isEmpty) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => controller.isSelf
                    ? Navigate.to(const HoroscopeScreen())
                    : Navigate.to(GunaMilanScreen(userId: controller.userID, user: controller.user)),
                icon: Icon(controller.isSelf ? Icons.add_rounded : Icons.auto_awesome, size: 18),
                label: Text(
                  controller.isSelf ? MatchKeys.addHoroscope.tr : MatchKeys.checkKundli.tr,
                  style: MyTextStyle.gilroySemiBold(size: 14, color: cOnPrimary),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: cPrimary,
                  foregroundColor: cOnPrimary,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLocationLanguageSection(ProfileController controller) {
    final user = controller.user!;
    return _buildInfoCard(
      title: "Location & Languages",
      icon: Icons.location_on_outlined,
      isEditable: controller.isSelf,
      onEdit: () => Navigate.to(LocationLanguageScreen(onNext: () {})),
      child: Column(
        children: [
          _buildInfoRow('Country', user.location?.country?.name ?? '-', Icons.public),
          _buildInfoRow('State', user.location?.state?.name ?? '-', Icons.location_city),
          _buildInfoRow('City', user.location?.city?.name ?? '-', Icons.location_on),
        ],
      ),
    );
  }

  Widget _buildCareerSection(ProfileController controller) {
    return _buildInfoCard(
      title: "Career Details",
      icon: Icons.work_outline,
      isEditable: controller.isSelf,
      onEdit: () => Navigate.to(EducationCareerScreen(onNext: () {})),
      child: Column(
        children: [
          _buildInfoRow('Education', controller.user?.qualification?.name ?? '-', Icons.school_outlined),
          _buildInfoRow('Occupation', controller.user?.profession?.name ?? '-', Icons.business_center_outlined),
          _buildInfoRow('Annual Income', controller.user?.incomeRange?.name ?? '-', Icons.currency_rupee_outlined),
        ],
      ),
    );
  }

  Widget _buildContactSection(ProfileController controller) {
    final user = controller.user;
    print(":akldjslkasdas");
    print(jsonEncode(user));
    final isSelf = controller.isSelf;
    final settings = user?.settings;

    return _buildInfoCard(
      title: "Contact Information",
      icon: Icons.contact_mail_outlined,
      isEditable: controller.isSelf,
      onEdit: () {},
      // Add your contact edit screen
      child: Column(
        children: [
          if (isSelf || settings?.mobileVisibility == 'public')
            _buildContactRow(
              label: "Mobile",
              value: user?.phone ?? "-",
              icon: Icons.phone,
              isSelf: isSelf,
              isPublic: settings?.mobileVisibility == 'public',
              onToggle: isSelf
                  ? (val) => controller.updateContactPrivacy('mobileVisibility', val ? 'public' : 'private')
                  : null,
            )
          else
            _buildLockedContact("Mobile", Icons.phone),
          const SizedBox(height: 12),
          if (isSelf || settings?.emailVisibility == 'public')
            _buildContactRow(
              label: "Email",
              value: user?.email ?? "-",
              icon: Icons.email,
              isSelf: isSelf,
              isPublic: settings?.emailVisibility == 'public',
              onToggle: isSelf
                  ? (val) => controller.updateContactPrivacy('emailVisibility', val ? 'public' : 'private')
                  : null,
            )
          else
            _buildLockedContact("Email", Icons.email),
        ],
      ),
    );
  }

  Widget _buildContactRow({
    required String label,
    required String value,
    required IconData icon,
    required bool isSelf,
    bool isPublic = false,
    Function(bool)? onToggle,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: cPrimary),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      value,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade800,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelf)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isPublic ? Colors.green.shade50 : Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isPublic ? Colors.green.shade200 : Colors.orange.shade200,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isPublic ? Icons.public : Icons.lock_outline,
                        size: 14,
                        color: isPublic ? Colors.green.shade700 : Colors.orange.shade700,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isPublic ? 'Public' : 'Private',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isPublic ? Colors.green.shade700 : Colors.orange.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          if (isSelf) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Text(
                    isPublic ? 'Visible to everyone' : 'Only visible to you',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ),
                Transform.scale(
                  scale: 0.8,
                  child: Switch(
                    value: isPublic,
                    onChanged: onToggle,
                    activeColor: Colors.green.shade600,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLockedContact(String label, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade400),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Private',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade500,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.lock_outline,
            size: 18,
            color: Colors.grey.shade400,
          ),
        ],
      ),
    );
  }

  Widget _buildFamilySection(ProfileController controller) {
    final user = controller.user;
    final father = user?.family?.father;
    final mother = user?.family?.mother;

    return _buildInfoCard(
      title: "Family Overview",
      icon: Icons.family_restroom,
      isEditable: controller.isSelf,
      onEdit: () => Navigate.to(FamilyDetailsScreen(onNext: () {})),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFamilyIntro(user),
          SizedBox(height: 16),
          _buildParentInfo("Father", father),
          _buildParentInfo("Mother", mother),
          SizedBox(height: 16),
          _buildSiblingInfo(user),
          SizedBox(height: 16),
          _buildFamilyLocation(user),
        ],
      ),
    );
  }

  Widget _buildInfoCard({
    required String title,
    required IconData icon,
    required Widget child,
    bool isEditable = false,
    VoidCallback? onEdit,
  }) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cWhite,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: cPrimary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: cPrimary, size: 20),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Text(title, style: MyTextStyle.gilroyBold(size: 16, color: cDarkText)),
              ),
              if (isEditable)
                Container(
                  decoration: BoxDecoration(
                    color: cPrimary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: IconButton(
                    onPressed: onEdit,
                    icon: Icon(Icons.edit, color: cPrimary, size: 18),
                    constraints: BoxConstraints(minWidth: 36, minHeight: 36),
                  ),
                ),
            ],
          ),
          SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon) {
    return Container(
      // margin: const EdgeInsets.only(bottom: 16),
      // padding: const EdgeInsets.all(16),
      // decoration: BoxDecoration(
      //   color: Colors.grey.shade50,
      //   borderRadius: BorderRadius.circular(16),
      //   border: Border.all(color: Colors.grey.shade200),
      // ),
      child: Row(
        children: [
          // Icon
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: Colors.pink.shade400),
          ),
          const SizedBox(width: 12),

          // Label (take half width)
          Expanded(
            flex: 1,
            child: Text(
              label,
              style: MyTextStyle.gilroyMedium(size: 12, color: Colors.grey.shade600),
            ),
          ),

          // Divider (vertical line)
          Container(
            height: 20,
            width: 1,
            color: Colors.grey.shade300,
            margin: const EdgeInsets.symmetric(horizontal: 12),
          ),

          // Value (take half width)
          Expanded(
            flex: 1,
            child: Text(
              value.isNotEmpty ? value : 'Not specified',
              style: MyTextStyle.gilroySemiBold(size: 12, color: Colors.grey.shade800),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFamilyIntro(dynamic user) {
    final type = user?.family?.familyType;
    final status = user?.family?.familyStatus;

    if (type == null && status == null) {
      return Container(
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: cBackground,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(Icons.info_outline, color: cLightText, size: 16),
            SizedBox(width: 8),
            Text("Family details not specified", style: MyTextStyle.gilroyRegular(color: cLightText, size: 14)),
          ],
        ),
      );
    }

    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cPrimary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: cPrimary.withOpacity(0.2)),
      ),
      child: RichText(
        text: TextSpan(
          style: MyTextStyle.gilroyRegular(size: 14, color: cDarkText),
          children: [
            TextSpan(text: "We're "),
            if (status != null)
              TextSpan(
                text: "a $status family",
                style: MyTextStyle.gilroyBold(size: 14, color: cPrimary),
              ),
            if (type != null && status != null) TextSpan(text: " living in a "),
            if (type != null)
              TextSpan(
                text: "$type setup",
                style: MyTextStyle.gilroyBold(size: 14, color: cPrimary),
              ),
            TextSpan(text: "."),
          ],
        ),
      ),
    );
  }

  Widget _buildParentInfo(String role, dynamic parent) {
    if (parent?.isAlive == false) {
      return Container(
        margin: EdgeInsets.only(bottom: 8),
        padding: EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.red.withOpacity(0.05),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.red.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Icon(Icons.favorite, color: Colors.red, size: 16),
            SizedBox(width: 8),
            Text(
              "$role is no more with us 🙏",
              style: MyTextStyle.gilroyMedium(color: Colors.red, size: 14),
            ),
          ],
        ),
      );
    }

    final profession = parent?.profession;
    return _buildInfoRow(role, profession ?? "Profession not specified", Icons.work);
  }

  Widget _buildNameAndVerification(ProfileController controller) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      controller.user?.fullName ?? '',
                      style: MyTextStyle.gilroyBlack(color: Colors.grey.shade800, size: 28),
                    ),
                  ),
                  const SizedBox(width: 8),
                  VerifyIcon(user: controller.user),
                ],
              ),
            ],
          ),
        ),
        _buildOnlineIndicator(),
      ],
    );
  }

  Widget _buildOnlineIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.green.shade400, Colors.green.shade300],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.green.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            'Online',
            style: MyTextStyle.gilroyMedium(color: Colors.white, size: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildBasicInfo(ProfileController controller) {
    final age = controller.user?.age ?? 0;
    final location = controller.user?.location?.city?.name ?? '';
    final height = HeightConverter().cmToImperialString(controller.user?.height) ?? '';

    final infoItems = [
      if (age > 0) {'icon': Icons.cake_outlined, 'text': '$age years'},
      if (location.isNotEmpty) {'icon': Icons.location_on_outlined, 'text': location},
      if (height.isNotEmpty) {'icon': Icons.height_outlined, 'text': height},
    ];

    return Wrap(
      spacing: 12,
      runSpacing: 8,
      children: infoItems
          .map((item) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      item['icon'] as IconData,
                      color: Colors.pink.shade400,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      item['text'] as String,
                      style: MyTextStyle.gilroyMedium(
                        color: Colors.grey.shade700,
                        size: 13,
                      ),
                    ),
                  ],
                ),
              ))
          .toList(),
    );
  }

  Widget _buildExpandableBio(ProfileController controller) {
    final bio = controller.user!.bio!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Row(
          children: [
            Flexible(
              child: Text(
                bio,
                style: MyTextStyle.gilroyRegular(color: Colors.grey.shade800, size: 14),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSiblingInfo(dynamic user) {
    final brothers = user?.family?.brothers?.total ?? 0;
    final sisters = user?.family?.sisters?.total ?? 0;

    String siblingText;
    if (brothers == 0 && sisters == 0) {
      siblingText = "No siblings";
    } else {
      List<String> parts = [];
      if (brothers > 0) parts.add("$brothers ${brothers == 1 ? 'brother' : 'brothers'}");
      if (sisters > 0) parts.add("$sisters ${sisters == 1 ? 'sister' : 'sisters'}");
      siblingText = parts.join(" and ");
    }

    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cBackground,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.people_outline, color: cPrimary, size: 18),
          SizedBox(width: 10),
          Text("Siblings: $siblingText", style: MyTextStyle.gilroyRegular(color: cDarkText, size: 14)),
        ],
      ),
    );
  }

  Widget _buildFamilyLocation(dynamic user) {
    final city = user?.family?.basedOut?.city?.name;
    final state = user?.family?.basedOut?.state?.name;
    final country = user?.family?.basedOut?.country?.name;

    final locationList = [city, state, country].where((e) => e != null && e.isNotEmpty).toList();
    final locationText = locationList.isNotEmpty ? locationList.join(', ') : "Location not specified";

    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cBackground,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.home_outlined, color: cPrimary, size: 18),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              "Family based in: $locationText",
              style: MyTextStyle.gilroyRegular(color: cDarkText, size: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompatibilitySection(ProfileController controller) {
    if (controller.isSelf) return Container();

    final compatibilityScore = 85; // Replace with actual score

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [cPrimary.withOpacity(0.9), cPrimary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: cPrimary.withOpacity(0.3),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.favorite, color: cWhite, size: 20),
                    SizedBox(width: 8),
                    Text(
                      "Compatibility Score",
                      style: MyTextStyle.gilroyBold(color: cWhite, size: 18),
                    ),
                  ],
                ),
                SizedBox(height: 12),
                Row(
                  children: [
                    Text(
                      "$compatibilityScore%",
                      style: MyTextStyle.gilroyBlack(color: cWhite, size: 36),
                    ),
                    SizedBox(width: 12),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        "Excellent",
                        style: MyTextStyle.gilroyBold(color: cWhite, size: 12),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8),
                Text(
                  "You both have great potential together!",
                  style: MyTextStyle.gilroyRegular(color: cWhite.withOpacity(0.9), size: 14),
                ),
              ],
            ),
          ),
          Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              color: cWhite.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Stack(
              children: [
                Center(
                  child: SizedBox(
                    width: 70,
                    height: 70,
                    child: CircularProgressIndicator(
                      value: compatibilityScore / 100,
                      strokeWidth: 6,
                      backgroundColor: cWhite.withOpacity(0.3),
                      valueColor: AlwaysStoppedAnimation<Color>(cWhite),
                    ),
                  ),
                ),
                Center(
                  child: Icon(Icons.people, color: cWhite, size: 28),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreferenceFitSection(ProfileController controller) {
    return PreferenceFitWidget(
      fitList: controller.preferenceFitModel!.matchList!,
      commonList: controller.preferenceFitModel!.common!,
      user: controller.user!,
    );
  }

  Widget _buildActionButton({
    required VoidCallback onTap,
    required IconData icon,
    required String label,
    required Color color,
    required bool isActive,
  }) {
    return Expanded(
      child: GestureDetector(
          onTap: onTap,
          child: Column(
            children: [
              AnimatedContainer(
                duration: Duration(milliseconds: 200),
                padding: EdgeInsets.symmetric(vertical: 0, horizontal: 0),
                margin: EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: isActive ? color.withOpacity(0.1) : Colors.transparent,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isActive ? color.withOpacity(0.3) : Colors.transparent,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isActive ? color.withOpacity(0) : color.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(icon, color: color, size: 18),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 8),
              Text(
                label,
                style: MyTextStyle.gilroyMedium(
                  size: 12,
                  color: isActive ? color : Colors.grey.shade600,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          )),
    );
  }

  void _handleInterestAction(User profile, ProfileController controller) {
    if (profile.isFriend == true) {
      controller.unFriendUser(profile);
    } else if (profile.isRejectedByOtherUser == true || profile.isRejected == true) {
      return; // No action for rejected states
    } else if (profile.isCanceled == true) {
      controller.sendInterest(profile);
    } else if (profile.isRequestReceived == true) {
      controller.acceptFriendRequest(profile);
    } else if (profile.isRequestSent == true) {
      controller.cancelInterest(profile);
    } else {
      controller.sendInterest(profile);
    }
  }

  void _handleShortlistAction(User profile, ProfileController controller) {
    // Add shortlist functionality

    controller.shortList(profile);
    _showActionFeedback(
      profile.isShortListed == true ? "Removed from shortlist" : "Added to shortlist",
      Colors.amber,
    );
  }

  void _handleChatAction(User profile, ProfileController controller) {
    // Add chat functionality

    if (profile?.chatRoom == null) {
      _showActionFeedback("You are not Connected", Colors.red);

      return;
    }

    Get.to(ChattingView(
      chatRoom: profile.chatRoom,
    ));
  }

  String _getInterestLabel(User profile) {
    if (profile.isFriend == true) return "Connected";
    if (profile.isRejectedByOtherUser == true || profile.isRejected == true) return "Rejected";
    if (profile.isRequestReceived == true) return "Accept";
    if (profile.isRequestSent == true) return "Pending";
    return "Interest";
  }

  IconData _getInterestIcon(User profile) {
    if (profile.isFriend == true) return Icons.check_circle;
    if (profile.isRejectedByOtherUser == true || profile.isRejected == true) return Icons.block;
    if (profile.isRequestReceived == true) return Icons.thumb_up_outlined;
    if (profile.isRequestSent == true) return Icons.hourglass_empty;
    return Icons.favorite_outline;
  }

  Color _getInterestColor(User profile) {
    if (profile.isFriend == true) return Colors.green;
    if (profile.isRejectedByOtherUser == true || profile.isRejected == true) return Colors.red;
    if (profile.isRequestReceived == true) return Colors.blue;
    if (profile.isRequestSent == true) return Colors.orange;
    return Colors.pink;
  }

  bool _isInterestActive(User profile) {
    return profile.isFriend == true || profile.isRequestReceived == true || profile.isRequestSent == true;
  }

  void _showActionFeedback(String message, Color color) {
    Get.snackbar(
      '',
      message,
      backgroundColor: color,
      colorText: Colors.white,
      duration: Duration(seconds: 2),
      margin: EdgeInsets.all(16),
      borderRadius: 12,
      snackPosition: SnackPosition.TOP,
    );
  }

  Widget _buildProfileMenu(ProfileController controller) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.3),
        shape: BoxShape.circle,
      ),
      child: Menu(
        items: [
          PopupMenuItem(
            onTap: controller.shareProfile,
            child: Row(
              children: [
                Icon(Icons.share, color: cDarkText, size: 18),
                SizedBox(width: 12),
                Text(LKeys.share.tr, style: MyTextStyle.gilroyMedium()),
              ],
            ),
          ),
          PopupMenuItem(
            onTap: () {
              Future.delayed(Duration(milliseconds: 1), () {
                Get.bottomSheet(
                  ReportSheet(user: controller.user),
                  isScrollControlled: true,
                );
              });
            },
            child: Row(
              children: [
                Icon(Icons.report, color: Colors.orange, size: 18),
                SizedBox(width: 12),
                Text(LKeys.report.tr, style: MyTextStyle.gilroyMedium()),
              ],
            ),
          ),
          PopupMenuItem(
            onTap: () {
              if (controller.user?.isBlockedByMe() ?? false) {
                controller.unblockUser(controller.user, () {
                  controller.updateEverything();
                });
              } else {
                controller.blockUser(controller.user, () {
                  controller.isFollowLoading = false;
                  controller.user?.followingStatus = 0;
                  controller.user?.followers = (controller.user?.followers ?? 0) - 1;
                  controller.updateEverything();
                });
              }
            },
            child: Row(
              children: [
                Icon(
                  controller.user?.isBlockedByMe() ?? false ? Icons.person_add : Icons.block,
                  color: Colors.red,
                  size: 18,
                ),
                SizedBox(width: 12),
                Text(
                  controller.user?.isBlockedByMe() ?? false ? LKeys.unBlock.tr : LKeys.block.tr,
                  style: MyTextStyle.gilroyMedium(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Enhanced Preference Fit Widget
class EnhancedPreferenceFitWidget extends StatelessWidget {
  final List<MatchList> fitList;
  final List<Common> commonList;

  const EnhancedPreferenceFitWidget({
    Key? key,
    required this.fitList,
    required this.commonList,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cWhite,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: cPrimary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.psychology, color: cPrimary, size: 20),
              ),
              SizedBox(width: 12),
              Text("Preference Analysis", style: MyTextStyle.gilroyBold(size: 18, color: cDarkText)),
            ],
          ),
          SizedBox(height: 20),

          // Preference Fit Section
          if (fitList.isNotEmpty) ...[
            _buildSectionHeader("Preference Compatibility", Icons.tune),
            SizedBox(height: 12),
            ...fitList.map(_buildFitRow).toList(),
          ],

          // Common Interests Section
          if (commonList.isNotEmpty) ...[
            SizedBox(height: 24),
            _buildSectionHeader("What You Both Share", Icons.favorite),
            SizedBox(height: 12),
            ...commonList.map(_buildCommonRow).toList(),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: cPrimary, size: 18),
        SizedBox(width: 8),
        Text(title, style: MyTextStyle.gilroyBold(size: 16, color: cDarkText)),
      ],
    );
  }

  Widget _buildFitRow(MatchList item) {
    final isFit = item.isFit ?? false;
    return Container(
      margin: EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isFit ? Colors.green.withOpacity(0.05) : Colors.red.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isFit ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: isFit ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isFit ? Icons.check : Icons.close,
              color: isFit ? Colors.green : Colors.red,
              size: 16,
            ),
          ),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.label ?? '',
                  style: MyTextStyle.gilroyBold(size: 14, color: cDarkText),
                ),
                SizedBox(height: 4),
                Text(
                  item.expectedValue ?? '-',
                  style: MyTextStyle.gilroyRegular(size: 12, color: cLightText),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommonRow(Common item) {
    return Container(
      margin: EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cPrimary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cPrimary.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: cPrimary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.favorite, color: cPrimary, size: 16),
          ),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.label ?? '',
                  style: MyTextStyle.gilroyBold(size: 14, color: cDarkText),
                ),
                SizedBox(height: 4),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: (item.value ?? [])
                      .map(
                        (value) => Container(
                          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: cPrimary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            value,
                            style: MyTextStyle.gilroyMedium(color: cPrimary, size: 11),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

Widget _buildLifestyleSection(ProfileController controller) {
  return _buildSectionCard(
    title: "Lifestyle",
    subtitle: "Daily habits & personal choices",
    icon: Icons.favorite_rounded,
    gradientColors: [const Color(0xFFFDFBFB), const Color(0xFFE6EBF5)],
    accentColor: const Color(0xFFEC6F66),
    // warm coral accent
    onEdit: controller.isSelf ? () => Navigate.to(const LifestyleStepScreen()) : null,
    children: [
      _buildLifestyleGrid(controller),
    ],
  );
}

Widget _buildSectionCard({
  required String title,
  required List<Widget> children,
  required List<Color> gradientColors,
  required Color accentColor,
  String? subtitle,
  IconData? icon,
  VoidCallback? onEdit,
}) {
  return Container(
    margin: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: LinearGradient(
        colors: gradientColors,
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(24),
      boxShadow: [
        BoxShadow(
          color: accentColor.withOpacity(0.08),
          blurRadius: 12,
          offset: const Offset(0, 6),
        ),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (icon != null)
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [accentColor.withOpacity(0.2), accentColor.withOpacity(0.05)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: accentColor, size: 22),
              ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: MyTextStyle.gilroyBold(
                      color: Colors.black87,
                      size: 18,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle,
                      style: MyTextStyle.gilroyLight(
                        color: Colors.grey.shade600,
                        size: 12,
                      ),
                    ),
                ],
              ),
            ),
            if (onEdit != null)
              IconButton(
                onPressed: onEdit,
                icon: Icon(Icons.edit_note_rounded, color: accentColor, size: 24),
              ),
          ],
        ),
        const SizedBox(height: 18),
        ...children,
      ],
    ),
  );
}

Widget _buildLifestyleGrid(ProfileController controller) {
  final user = controller.user;
  final lifestyleItems = [
    {"icon": Icons.restaurant_menu_rounded, "label": "Diet", "value": user?.diet ?? "Not specified"},
    {"icon": Icons.smoking_rooms, "label": "Smoking", "value": user?.smoke ?? "Not specified"},
    {"icon": Icons.local_bar, "label": "Drinking", "value": user?.drink ?? "Not specified"},
    {"icon": Icons.home_rounded, "label": "Lives with Family", "value": user?.livingWithFamily == true ? "Yes" : "No"},
    {
      "icon": Icons.self_improvement_rounded,
      "label": "Spiritual Belief",
      "value": user?.spiritualBelief ?? "Not specified"
    },
  ];

  return GridView.builder(
    shrinkWrap: true,
    padding: EdgeInsets.zero,
    // 🔥 removes default top padding
    physics: const NeverScrollableScrollPhysics(),
    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: 2,
      mainAxisSpacing: 14,
      crossAxisSpacing: 14,
      childAspectRatio: 2.4,
    ),
    itemCount: lifestyleItems.length,
    itemBuilder: (context, index) {
      final item = lifestyleItems[index];
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.pink.shade50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                item["icon"] as IconData,
                color: const Color(0xFFEC6F66),
                size: 20,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    item["label"] as String,
                    style: MyTextStyle.gilroyRegular(
                      color: Colors.grey.shade600,
                      size: 11,
                    ),
                  ),
                  Text(
                    item["value"] as String,
                    style: MyTextStyle.gilroyBold(
                      color: Colors.black87,
                      size: 13,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    },
  );
}
