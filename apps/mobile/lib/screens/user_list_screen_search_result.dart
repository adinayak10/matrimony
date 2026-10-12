import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/user_profile_big_item.dart';
import 'package:banjaramatch/screens/users_list_controller.dart';

class UsersListSearchResult extends StatelessWidget {
  final String tag;

  const UsersListSearchResult({Key? key, required this.tag}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          const TopBarForInView(title: "Search Results"),
          Expanded(
            child: GetBuilder<UsersListController>(
              tag: tag, // ✅ makes sure we use the controller registered with this tag
              builder: (controller) {
                if (controller.isLoading.value) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (controller.usersList.isEmpty) {
                  return const Center(child: Text('No profiles found'));
                }

                return ListView.builder(
                  padding: const EdgeInsets.only(bottom: 16),
                  itemCount: controller.usersList.length,
                  itemBuilder: (context, index) {
                    final profile = controller.usersList[index];
                    return BigUserCardItem(
                      profile: profile,
                      controller: controller,
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class TabData {
  final String label;
  final IconData icon;
  final Color color;
  final String videoAsset;

  TabData(this.label, this.icon, this.color, this.videoAsset);
}
