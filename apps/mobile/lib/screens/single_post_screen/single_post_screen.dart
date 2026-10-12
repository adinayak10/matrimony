// import 'package:flutter/material.dart';
// import 'package:get/get_state_manager/src/simple/get_state.dart';
// import 'package:banjaramatch/common/widgets/no_data_found.dart';
// import 'package:banjaramatch/localization/languages.dart';
// import 'package:banjaramatch/screens/extra_views/top_bar.dart';
// import 'package:banjaramatch/screens/feed_screen/feed_screen.dart';
// import 'package:banjaramatch/screens/single_post_screen/single_post_controller.dart';
//
// class SinglePostScreen extends StatelessWidget {
//   final String postId;
//
//   const SinglePostScreen({Key? key, required this.postId}) : super(key: key);
//
//   @override
//   Widget build(BuildContext context) {
//     var controller = SinglePostController(postId);
//     return Scaffold(
//       body: Column(
//         children: [
//           const TopBarForInView(title: LKeys.post),
//           GetBuilder(
//             init: controller,
//             tag: '$postId',
//             builder: (controller) {
//               return Expanded(
//                   child: controller.posts.isEmpty
//                       ? NoDataFound(controller: controller)
//                       : FeedsView(controller: controller, id: 'feed_$postId'));
//             },
//           )
//         ],
//       ),
//     );
//   }
// }
