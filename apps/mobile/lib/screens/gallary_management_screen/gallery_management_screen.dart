import 'dart:io';

import 'package:dotted_border/dotted_border.dart';
import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:reorderables/reorderables.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/extra_views/buttons.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/lifestyle_step_screen.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../../common/extensions/font_extension.dart';
import '../../common/managers/navigation.dart';
import 'gallery_management_controller.dart';

class GalleryManagementScreen extends StatelessWidget {
  final String userId;

  GalleryManagementScreen({Key? key, required this.userId}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(GalleryManagementController(userId), tag: userId);
    final bool isMyProfile = controller.userID == SessionManager.shared.getUserID();

    print("sdfkluhsliguhfsg" + isMyProfile.toString());
    return Scaffold(
      body: Column(
        children: [
          TopBarForInView(title: isMyProfile ? "Manage Gallery" : "Gallery"),
          GetBuilder(
              init: controller,
              builder: (controller) {
                return Expanded(
                  child: SingleChildScrollView(
                    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                    child: Container(
                      padding: const EdgeInsets.all(15),
                      child: Column(
                        children: [
                          isMyProfile
                              ? SizedBox(
                                  height: 290,
                                  child: Stack(
                                    // alignment: Alignment.bottomCenter,
                                    children: [
                                      backGroundImage(controller: controller, boxSize: Get.width / 1.5, radius: 25),
                                      GestureDetector(
                                        onTap: () {
                                          controller.pickBGImage();
                                        },
                                        child: Container(
                                          width: double.infinity,
                                          height: 226,
                                          decoration: ShapeDecoration(
                                            gradient: LinearGradient(colors: [
                                              cBlack.withOpacity(0.5),
                                              Colors.transparent,
                                            ], begin: Alignment.bottomCenter, end: Alignment.topCenter),
                                            shape: const SmoothRectangleBorder(
                                                borderRadius: SmoothBorderRadius.all(
                                                    SmoothRadius(cornerRadius: 25, cornerSmoothing: cornerSmoothing))),
                                          ),
                                        ),
                                      ),
                                      Align(
                                        alignment: Alignment.bottomCenter,
                                        child: Container(
                                          decoration: ShapeDecoration(
                                              shape: const SmoothRectangleBorder(
                                                  borderRadius: SmoothBorderRadius.all(SmoothRadius(
                                                      cornerRadius: 25, cornerSmoothing: cornerSmoothing))),
                                              shadows: [
                                                BoxShadow(
                                                  color: Colors.black.withOpacity(0.1),
                                                  blurRadius: 5,
                                                  offset: const Offset(0, 4), // Shadow position
                                                )
                                              ]),
                                          child: ProfileImagePicker(
                                            dotColor: Colors.transparent,
                                            imageURL: SessionManager.shared.getUser()?.profile,
                                            controller: controller,
                                            boxSize: 140,
                                            radius: 25,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              : Container(),
                          SizedBox(
                            height: 20,
                          ),
                          isMyProfile ? _buildPhotoGallerySection(isMyProfile) : _buildGalleryViewer(controller),
                          SizedBox(
                            height: 20,
                          ),
                          isMyProfile ? _buildPrivacySettings(controller) : Container(),
                          isMyProfile
                              ? SafeArea(
                                  top: false,
                                  child: CommonButton(text: LKeys.update, onTap: controller.onSubmit),
                                )
                              : Container(),
                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ),
                );
              }),
        ],
      ),
    );
  }

  Widget _buildPrivacySettings(GalleryManagementController controller) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8),
      padding: const EdgeInsets.all(20),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.purple.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.security_outlined,
                  color: Colors.purple.shade600,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Gallery Privacy',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade800,
                      ),
                    ),
                    Text(
                      'Control who can view your photos',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          GetBuilder<GalleryManagementController>(
            builder: (c) {
              final user = SessionManager.shared.getUser();
              final currentVisibility = user?.settings?.profilePicVisibility ?? 'everyone';
              return Column(
                children: [
                  _buildPrivacyOption(
                    icon: Icons.public,
                    title: 'Public',
                    description: 'Everyone can view your photos',
                    value: 'everyone',
                    groupValue: currentVisibility,
                    onTap: () => c.updatePrivacySetting('profilePicVisibility', 'everyone'),
                  ),
                  const SizedBox(height: 12),
                  _buildPrivacyOption(
                    icon: Icons.people,
                    title: 'Connected Only',
                    description: 'Only accepted connections can view',
                    value: 'onlyAccepted',
                    groupValue: currentVisibility,
                    onTap: () => c.updatePrivacySetting('profilePicVisibility', 'onlyAccepted'),
                  ),
                  const SizedBox(height: 12),
                  _buildPrivacyOption(
                    icon: Icons.lock,
                    title: 'Private',
                    description: 'Only you can view your photos',
                    value: 'nobody',
                    groupValue: currentVisibility,
                    onTap: () => c.updatePrivacySetting('profilePicVisibility', 'nobody'),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPrivacyOption({
    required IconData icon,
    required String title,
    required String description,
    required String value,
    required String groupValue,
    required VoidCallback onTap,
  }) {
    final isSelected = value == groupValue;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? cPrimary.withOpacity(0.08) : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? cPrimary : Colors.grey.shade200,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? cPrimary : Colors.grey.shade600,
              size: 22,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? cPrimary : Colors.grey.shade800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle,
                color: cPrimary,
                size: 20,
              )
            else
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.grey.shade300, width: 2),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget lifestyleSection({required bool isLifestyleAdded}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cPrimary.withOpacity(0.04),
        border: Border.all(color: cPrimary.withOpacity(0.12)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.self_improvement_rounded, size: 30, color: cPrimary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isLifestyleAdded ? "Lifestyle Added" : "Your Lifestyle Choices",
                  style: MyTextStyle.gilroyBold(size: 14, color: cDarkText),
                ),
                const SizedBox(height: 4),
                Text(
                  isLifestyleAdded
                      ? "You've shared your preferences like diet, smoking, drinking, and values."
                      : "Add your lifestyle habits like diet, smoking, drinking, and values. This helps others understand your way of life.",
                  style: MyTextStyle.gilroyRegular(size: 13, color: cLightText),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          TextButton.icon(
            onPressed: () => Navigate.to(const LifestyleStepScreen()),
            style: TextButton.styleFrom(
              backgroundColor: isLifestyleAdded ? Colors.orange.withOpacity(0.08) : cPrimary.withOpacity(0.08),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            ),
            icon: Icon(
              isLifestyleAdded ? Icons.edit : Icons.add,
              size: 18,
              color: isLifestyleAdded ? Colors.orange : cPrimary,
            ),
            label: Text(
              isLifestyleAdded ? "Edit" : "Add Now",
              style: MyTextStyle.gilroyBold(
                size: 13,
                color: isLifestyleAdded ? Colors.orange : cPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget backGroundImage({required GalleryManagementController controller, double? boxSize, required double radius}) {
    var imageURL = SessionManager.shared.getUser()?.backgroundImage;
    return Padding(
        padding: const EdgeInsets.only(top: 6),
        child: GetBuilder(
          init: controller,
          builder: (controller) {
            var isEdit = imageURL != null || controller.backgroundImageFile != null;
            return ClipSmoothRect(
              radius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: radius - 2, cornerSmoothing: cornerSmoothing)),
              child: Container(
                  width: double.infinity,
                  height: 220,
                  decoration: ShapeDecoration(
                    shape: SmoothRectangleBorder(
                        borderRadius: SmoothBorderRadius.all(
                            SmoothRadius(cornerRadius: radius, cornerSmoothing: cornerSmoothing))),
                    color: cLightBg,
                  ),
                  child: Stack(
                    alignment: Alignment.topRight,
                    children: [
                      Stack(
                        fit: StackFit.expand,
                        children: [
                          (imageURL != null && controller.backgroundImageFile == null)
                              ? MyCachedImage(imageUrl: imageURL)
                              : Container(),
                          controller.backgroundImageFile == null
                              ? Container()
                              : Image.file(
                                  File(controller.backgroundImageFile?.path ?? ''),
                                  fit: BoxFit.cover,
                                ),
                        ],
                      ),
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: CircleAvatar(
                          backgroundColor: cBlack.withOpacity(0.3),
                          radius: 20,
                          child: Icon(
                            isEdit ? Icons.mode_edit_sharp : Icons.add_circle,
                            color: cWhite,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                  )),
            );
          },
        ));
  }

  Widget _buildPhotoGallerySection(bool isMyProfile) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
      padding: const EdgeInsets.all(20),
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
      child: GetBuilder<GalleryManagementController>(
        builder: (c) {
          final hasPhotos = c.galleryPhotos.isNotEmpty;
          final photoCount = c.galleryPhotos.length;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Section
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.pink.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.photo_library_outlined,
                      color: Colors.pink.shade500,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Photo Gallery',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade800,
                          ),
                        ),
                        Text(
                          hasPhotos
                              ? '$photoCount ${photoCount == 1 ? 'photo' : 'photos'}'
                              : isMyProfile
                                  ? 'Add your first photo'
                                  : 'No photos shared',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Content Section
              if (hasPhotos) ...[
                // Photo Grid with ReorderableWrap for self profile
                if (isMyProfile)
                  ReorderableWrap(
                    spacing: 12,
                    runSpacing: 12,
                    needsLongPressDraggable: true,
                    onReorder: (oldIndex, newIndex) {
                      // ✅ Step 1: Modify the actual list locally
                      final movedItem = c.galleryPhotos.removeAt(oldIndex);
                      c.galleryPhotos.insert(newIndex, movedItem);

                      // ✅ Step 2: Trigger UI update
                      c.update();

                      // ✅ Step 3: Send new order to API
                      final reorderedIds = c.galleryPhotos.map((e) => e.sId!).toList();
                      c.reorderPhotos(reorderedIds);
                    },
                    children: c.galleryPhotos.map((photo) {
                      return _buildPhotoItem(photo, isMyProfile, c, key: ValueKey(photo.sId));
                    }).toList(),
                  )
                else
                  // Simple grid for other profiles
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: c.galleryPhotos.map((photo) {
                      return _buildPhotoItem(photo, isMyProfile, c);
                    }).toList(),
                  ),

                // Add more photos section for self profile
                if (isMyProfile) ...[
                  const SizedBox(height: 16),
                  _buildAddMorePhotosSection(c),
                ],
              ] else ...[
                // Empty State
                _buildEmptyState(isMyProfile, c),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _buildPhotoItem(dynamic photo, bool isMyProfile, GalleryManagementController c, {Key? key}) {
    return Container(
      key: key,
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          ClipSmoothRect(
            radius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 20, cornerSmoothing: cornerSmoothing)),
            // borderRadius: BorderRadius.circular(12),
            child: MyCachedImage(
              imageUrl: photo.imageUrl,
              width: 100,
              height: 100,
            ),
          ),

          // Profile badge
          if (photo.isProfile == true)
            Positioned(
              top: 6,
              left: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green.shade600,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.star, size: 10, color: Colors.white),
                    SizedBox(width: 2),
                    Text(
                      'Profile',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Management options for self profile
          if (isMyProfile) ...[
            // Delete button
            Positioned(
              top: 6,
              right: 6,
              child: GestureDetector(
                onTap: () {
                  c.deletePhoto(photo.sId!);
                },
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.red.shade500,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.close, size: 14, color: Colors.white),
                ),
              ),
            ),

            // Set as profile button
            if (photo.isProfile != true)
              Positioned(
                bottom: 6,
                left: 6,
                right: 6,
                child: GestureDetector(
                  onTap: () => c.setAsMainProfilePhoto(photo.sId!),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Set as Profile',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildAddMorePhotosSection(GalleryManagementController c) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(Icons.add_photo_alternate, color: Colors.pink.shade500, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Add More Photos',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade700,
                  ),
                ),
              ),
              GestureDetector(
                onTap: () => c.pickImage(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.pink.shade500,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text(
                    'Add Photos',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Share more moments! Add up to 20 photos to showcase your personality.',
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade600,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isMyProfile, GalleryManagementController c) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isMyProfile ? Icons.add_photo_alternate : Icons.photo_library_outlined,
              size: 40,
              color: Colors.grey.shade400,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            isMyProfile ? 'No photos yet' : 'No photos to show',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isMyProfile
                ? 'Add your first photo to make your profile more attractive!'
                : 'This user hasn\'t shared any photos yet.',
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade500,
              height: 1.4,
            ),
            textAlign: TextAlign.center,
          ),
          if (isMyProfile) ...[
            const SizedBox(height: 20),
            GestureDetector(
              onTap: () => c.pickImage(),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.pink.shade500,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.pink.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.add_a_photo, color: Colors.white, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'Add Your First Photo',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Tip: Choose a clear, well-lit photo where you\'re the main subject',
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey.shade500,
                fontStyle: FontStyle.italic,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildProtectedGalleryView() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.grey.shade100,
            Colors.grey.shade200,
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.grey.shade300, Colors.grey.shade400],
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.lock_outline_rounded,
              size: 40,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Gallery Protected',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade800,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'This user has set their photo gallery to private. Only they can view their photos.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.shade200),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue.shade600, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Connect with them to potentially view their gallery in the future.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.blue.shade800,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGalleryViewer(GalleryManagementController c) {
    return Column(
      children: [
        // Main Photo Display
        Container(
          height: 500,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.15),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: PageView.builder(
            controller: c.pageController,
            onPageChanged: (index) {
              c.currentPhotoIndex = index;
              c.update();
            },
            itemCount: c.galleryPhotos.length,
            itemBuilder: (context, index) {
              final photo = c.galleryPhotos[index];
              return Hero(
                tag: 'photo_${photo.sId}_$index',
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      MyCachedImage(
                        imageUrl: photo.imageUrl,
                        width: double.infinity,
                        height: 350,
                      ),
                      // Gradient overlay
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
                      // Profile badge
                      if (photo.isProfile == true)
                        Positioned(
                          top: 16,
                          left: 16,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Colors.green.shade400, Colors.green.shade600],
                              ),
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.2),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Icon(Icons.star_rounded, size: 16, color: Colors.white),
                                SizedBox(width: 6),
                                Text(
                                  'Profile Photo',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      // Photo counter
                      Positioned(
                        bottom: 16,
                        right: 16,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.6),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            '${index + 1} of ${c.galleryPhotos.length}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 20),

        // Page Indicators
        if (c.galleryPhotos.length > 1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              c.galleryPhotos.length,
              (index) => AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: c.currentPhotoIndex == index ? 28 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: c.currentPhotoIndex == index ? Colors.pink.shade500 : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ),

        const SizedBox(height: 20),

        // Thumbnail Row
        if (c.galleryPhotos.length > 1)
          SizedBox(
            height: 60,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: c.galleryPhotos.length,
              itemBuilder: (context, index) {
                final photo = c.galleryPhotos[index];
                final isSelected = c.currentPhotoIndex == index;

                return GestureDetector(
                  onTap: () {
                    c.pageController.animateToPage(
                      index,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    margin: const EdgeInsets.only(right: 12),
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? Colors.pink.shade500 : Colors.transparent,
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(isSelected ? 0.2 : 0.1),
                          blurRadius: isSelected ? 8 : 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: MyCachedImage(
                        imageUrl: photo.imageUrl,
                        width: 60,
                        height: 60,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}

class ProfileImagePicker extends StatelessWidget {
  final String? imageURL;
  final double? boxSize;
  final GalleryManagementController controller;
  final double radius;
  final Color dotColor;
  final Function()? onTap;

  const ProfileImagePicker(
      {Key? key,
      this.boxSize,
      required this.controller,
      this.radius = 60,
      this.onTap,
      this.imageURL,
      this.dotColor = cLightText})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GetBuilder<GalleryManagementController>(
      init: controller,
      builder: (controller) {
        var isEdit = imageURL != null || controller.file != null;
        return GestureDetector(
            onTap: () {
              if (onTap != null) {
                onTap!();
              } else {
                controller.pickProfileImage();
              }
            },
            child: DottedBorder(
              options: RectDottedBorderOptions(
                color: dotColor,
                dashPattern: const [3, 2],
                //  borderRadius: BorderRadius.circular(radius),
              ),
              child: ClipSmoothRect(
                radius: SmoothBorderRadius.all(
                  SmoothRadius(
                    cornerRadius: radius,
                    cornerSmoothing: cornerSmoothing,
                  ),
                ),
                child: Container(
                  width: boxSize ?? (MediaQuery.of(context).size.width / 1.5),
                  height: boxSize ?? (MediaQuery.of(context).size.width / 1.5),
                  decoration: ShapeDecoration(
                    shape: SmoothRectangleBorder(
                      borderRadius: SmoothBorderRadius.all(
                        SmoothRadius(
                          cornerRadius: radius,
                          cornerSmoothing: cornerSmoothing,
                        ),
                      ),
                    ),
                    color: cLightBg,
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    alignment: Alignment.center,
                    children: [
                      if (imageURL != null && controller.file == null) MyCachedImage(imageUrl: imageURL ?? ''),
                      if (controller.imagePath.isNotEmpty)
                        Image.file(
                          File(controller.imagePath),
                          fit: BoxFit.cover,
                        ),
                      Center(
                        child: CircleAvatar(
                          backgroundColor: cBlack.withOpacity(0.3),
                          radius: 20,
                          child: Icon(
                            isEdit ? Icons.mode_edit_sharp : Icons.add_circle,
                            color: cWhite,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ));
      },
    );
  }
}
