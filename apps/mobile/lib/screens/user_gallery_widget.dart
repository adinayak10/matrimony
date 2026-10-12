import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:reorderables/reorderables.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';

class ProfilePhotoGallery extends StatelessWidget {
  final ProfileController controller = Get.put(ProfileController(SessionManager.shared.getUserID()));

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 400,
      child: Scaffold(
        floatingActionButton: FloatingActionButton(
          child: const Icon(Icons.add_a_photo),
          onPressed: () => controller.pickImage(),
        ),
        body: GetBuilder<ProfileController>(
          builder: (c) {
            if (c.isFetching) {
              return const Center(child: CircularProgressIndicator());
            }

            return Column(
              children: [
                TopBarForInView(title: "Manage Gallery"),
                SingleChildScrollView(
                  padding: const EdgeInsets.all(12),
                  child: ReorderableWrap(
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
                      return Stack(
                        key: ValueKey(photo.sId), // Important for ReorderableWrap
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: MyCachedImage(
                              imageUrl: photo.imageUrl,
                              width: 100,
                              height: 100,
                            ),
                          ),
                          Positioned(
                            top: 4,
                            right: 4,
                            child: GestureDetector(
                              onTap: () => c.deletePhoto(photo.sId!),
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(
                                  color: Colors.black54,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, size: 18, color: Colors.white),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 4,
                            left: 4,
                            child: GestureDetector(
                              onTap: () {
                                if (photo.isProfile != true) {
                                  //  c.setAsMainProfilePhoto(photo.sId!);
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: photo.isProfile == true ? Colors.green : Colors.orange,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  photo.isProfile == true ? "Profile" : "Set as Profilef",
                                  style: const TextStyle(color: Colors.white, fontSize: 10),
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
