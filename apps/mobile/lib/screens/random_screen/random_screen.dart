// import 'package:figma_squircle/figma_squircle.dart';
// import 'package:flutter/material.dart';
// import 'package:get/get.dart';
// import 'package:banjaramatch/common/managers/session_manager.dart';
// import 'package:banjaramatch/common/widgets/my_cached_image.dart';
// import 'package:banjaramatch/models/registration.dart';
// import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
// import 'package:banjaramatch/screens/random_screen/random_screen_controller.dart';
// import 'package:banjaramatch/utilities/const.dart';
//
// class RandomScreen extends StatefulWidget {
//   const RandomScreen({Key? key}) : super(key: key);
//
//   @override
//   State<RandomScreen> createState() => _RandomScreenState();
// }
//
// class _RandomScreenState extends State<RandomScreen> with TickerProviderStateMixin {
//   late AnimationController _pulseController;
//   late AnimationController _cardController;
//   late Animation<double> _pulseAnimation;
//   late Animation<double> _cardAnimation;
//
//   @override
//   void initState() {
//     super.initState();
//     _pulseController = AnimationController(
//       duration: const Duration(seconds: 2),
//       vsync: this,
//     )..repeat(reverse: true);
//
//     _cardController = AnimationController(
//       duration: const Duration(milliseconds: 600),
//       vsync: this,
//     );
//
//     _pulseAnimation = Tween<double>(begin: 0.9, end: 1.1).animate(
//       CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
//     );
//
//     _cardAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
//       CurvedAnimation(parent: _cardController, curve: Curves.bounceOut),
//     );
//   }
//
//   @override
//   void dispose() {
//     _pulseController.dispose();
//     _cardController.dispose();
//     super.dispose();
//   }
//
//   @override
//   Widget build(BuildContext context) {
//     final RandomScreenController controller = RandomScreenController();
//
//     return Scaffold(
//       body: Container(
//         decoration: const BoxDecoration(
//           gradient: LinearGradient(
//             begin: Alignment.topCenter,
//             end: Alignment.bottomCenter,
//             colors: [
//               Color(0xFFFFF3E0), // Warm cream
//               Color(0xFFFFE0B2), // Light orange
//               Color(0xFFFFF8E1), // Very light yellow
//             ],
//           ),
//         ),
//         child: SafeArea(
//           child: Column(
//             children: [
//               _buildHeader(),
//               Expanded(
//                 child: GetBuilder<RandomScreenController>(
//                   init: controller,
//                   builder: (controller) {
//                     var isProfile = controller.user != null;
//                     if (isProfile && _cardController.status == AnimationStatus.dismissed) {
//                       _cardController.forward();
//                     }
//
//                     return Column(
//                       children: [
//                         _buildStatusSection(isProfile),
//                         const SizedBox(height: 30),
//                         Expanded(
//                           child: isProfile
//                               ? AnimatedBuilder(
//                                   animation: _cardAnimation,
//                                   builder: (context, child) {
//                                     return Transform.scale(
//                                       scale: _cardAnimation.value,
//                                       child: _buildProfileCard(controller),
//                                     );
//                                   },
//                                 )
//                               : _buildSearchingState(),
//                         ),
//                         _buildBottomActions(controller, isProfile),
//                       ],
//                     );
//                   },
//                 ),
//               ),
//             ],
//           ),
//         ),
//       ),
//     );
//   }
//
//   Widget _buildHeader() {
//     return Container(
//       padding: const EdgeInsets.all(20),
//       decoration: BoxDecoration(
//         gradient: LinearGradient(
//           colors: [
//             Colors.orange.shade700,
//             Colors.deepOrange.shade600,
//             Colors.red.shade400,
//           ],
//         ),
//         borderRadius: const BorderRadius.only(
//           bottomLeft: Radius.circular(30),
//           bottomRight: Radius.circular(30),
//         ),
//         boxShadow: [
//           BoxShadow(
//             color: Colors.orange.withOpacity(0.3),
//             blurRadius: 10,
//             offset: const Offset(0, 5),
//           ),
//         ],
//       ),
//       child: Row(
//         children: [
//           GestureDetector(
//             onTap: () => Get.back(),
//             child: Container(
//               padding: const EdgeInsets.all(10),
//               decoration: BoxDecoration(
//                 color: Colors.white.withOpacity(0.2),
//                 borderRadius: BorderRadius.circular(15),
//               ),
//               child: const Icon(
//                 Icons.arrow_back_ios_new,
//                 color: Colors.white,
//                 size: 20,
//               ),
//             ),
//           ),
//           const Spacer(),
//           Column(
//             children: [
//               Row(
//                 mainAxisSize: MainAxisSize.min,
//                 children: [
//                   Icon(
//                     Icons.search,
//                     color: Colors.white,
//                     size: 24,
//                   ),
//                   const SizedBox(width: 8),
//                   const Text(
//                     "खोजें अपना जीवनसाथी",
//                     style: TextStyle(
//                       color: Colors.white,
//                       fontSize: 20,
//                       fontWeight: FontWeight.bold,
//                     ),
//                   ),
//                 ],
//               ),
//               const SizedBox(height: 4),
//               Text(
//                 "Find Your Perfect Match",
//                 style: TextStyle(
//                   color: Colors.white.withOpacity(0.9),
//                   fontSize: 14,
//                   fontStyle: FontStyle.italic,
//                 ),
//               ),
//             ],
//           ),
//           const Spacer(),
//           Container(
//             padding: const EdgeInsets.all(10),
//             decoration: BoxDecoration(
//               color: Colors.pink.shade100.withOpacity(0.3),
//               borderRadius: BorderRadius.circular(15),
//             ),
//             child: Icon(
//               Icons.favorite,
//               color: Colors.pink.shade100,
//               size: 20,
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   Widget _buildStatusSection(bool isProfile) {
//     return Container(
//       margin: const EdgeInsets.symmetric(horizontal: 20),
//       padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 25),
//       decoration: BoxDecoration(
//         gradient: LinearGradient(
//           colors: isProfile
//               ? [Colors.green.shade400, Colors.teal.shade400]
//               : [Colors.orange.shade400, Colors.pink.shade400],
//         ),
//         borderRadius: BorderRadius.circular(25),
//         boxShadow: [
//           BoxShadow(
//             color: (isProfile ? Colors.green : Colors.orange).withOpacity(0.3),
//             blurRadius: 15,
//             offset: const Offset(0, 5),
//           ),
//         ],
//       ),
//       child: Row(
//         mainAxisAlignment: MainAxisAlignment.center,
//         children: [
//           Container(
//             padding: const EdgeInsets.all(8),
//             decoration: const BoxDecoration(
//               color: Colors.white,
//               shape: BoxShape.circle,
//             ),
//             child: Icon(
//               isProfile ? Icons.person_search : Icons.refresh,
//               color: isProfile ? Colors.green.shade600 : Colors.orange.shade600,
//               size: 20,
//             ),
//           ),
//           const SizedBox(width: 12),
//           Column(
//             crossAxisAlignment: CrossAxisAlignment.start,
//             children: [
//               Text(
//                 isProfile ? "मैच मिला! 🎉" : "खोज रहे हैं...",
//                 style: const TextStyle(
//                   color: Colors.white,
//                   fontSize: 18,
//                   fontWeight: FontWeight.bold,
//                 ),
//               ),
//               Text(
//                 isProfile ? "Perfect match found for you" : "Finding your soulmate",
//                 style: TextStyle(
//                   color: Colors.white.withOpacity(0.9),
//                   fontSize: 12,
//                 ),
//               ),
//             ],
//           ),
//         ],
//       ),
//     );
//   }
//
//   Widget _buildSearchingState() {
//     return Column(
//       mainAxisAlignment: MainAxisAlignment.center,
//       children: [
//         // Animated search indicator
//         AnimatedBuilder(
//           animation: _pulseAnimation,
//           builder: (context, child) {
//             return Transform.scale(
//               scale: _pulseAnimation.value,
//               child: Container(
//                 width: 180,
//                 height: 180,
//                 decoration: BoxDecoration(
//                   shape: BoxShape.circle,
//                   gradient: LinearGradient(
//                     colors: [
//                       Colors.orange.shade400,
//                       Colors.pink.shade400,
//                       Colors.red.shade300,
//                     ],
//                   ),
//                   boxShadow: [
//                     BoxShadow(
//                       color: Colors.orange.withOpacity(0.4),
//                       blurRadius: 30,
//                       spreadRadius: 10,
//                     ),
//                   ],
//                 ),
//                 child: Stack(
//                   alignment: Alignment.center,
//                   children: [
//                     // Rotating border
//                     Container(
//                       width: 160,
//                       height: 160,
//                       decoration: BoxDecoration(
//                         shape: BoxShape.circle,
//                         border: Border.all(
//                           color: Colors.white.withOpacity(0.5),
//                           width: 3,
//                         ),
//                       ),
//                     ),
//                     // User profile image
//                     Container(
//                       width: 140,
//                       height: 140,
//                       decoration: BoxDecoration(
//                         shape: BoxShape.circle,
//                         color: Colors.white,
//                         border: Border.all(
//                           color: Colors.orange.shade200,
//                           width: 4,
//                         ),
//                       ),
//                       child: ClipOval(
//                         child: MyCachedImage(
//                           imageUrl: SessionManager.shared.getUser()?.profile,
//                           width: 130,
//                           height: 130,
//                         ),
//                       ),
//                     ),
//                   ],
//                 ),
//               ),
//             );
//           },
//         ),
//
//         const SizedBox(height: 40),
//
//         // Floating decorative elements
//         Row(
//           mainAxisAlignment: MainAxisAlignment.spaceEvenly,
//           children: [
//             _buildFloatingIcon(Icons.favorite, Colors.pink.shade400),
//             _buildFloatingIcon(Icons.star, Colors.amber.shade400),
//             _buildFloatingIcon(Icons.celebration, Colors.purple.shade400),
//           ],
//         ),
//
//         const SizedBox(height: 30),
//
//         // Encouraging message
//         Container(
//           margin: const EdgeInsets.symmetric(horizontal: 30),
//           padding: const EdgeInsets.all(20),
//           decoration: BoxDecoration(
//             color: Colors.white.withOpacity(0.9),
//             borderRadius: BorderRadius.circular(20),
//             boxShadow: [
//               BoxShadow(
//                 color: Colors.grey.withOpacity(0.2),
//                 blurRadius: 10,
//                 offset: const Offset(0, 5),
//               ),
//             ],
//           ),
//           child: Column(
//             children: [
//               Text(
//                 "🌟 शर्माते हैं? कोई बात नहीं!",
//                 style: TextStyle(
//                   color: Colors.orange.shade700,
//                   fontSize: 18,
//                   fontWeight: FontWeight.bold,
//                 ),
//                 textAlign: TextAlign.center,
//               ),
//               const SizedBox(height: 8),
//               Text(
//                 "हमारा Anonymous Matching आपकी पहचान को गुप्त रखता है। आराम से अपना Perfect Match ढूंढें!",
//                 style: TextStyle(
//                   color: Colors.grey.shade700,
//                   fontSize: 14,
//                   height: 1.4,
//                 ),
//                 textAlign: TextAlign.center,
//               ),
//             ],
//           ),
//         ),
//       ],
//     );
//   }
//
//   Widget _buildFloatingIcon(IconData icon, Color color) {
//     return AnimatedBuilder(
//       animation: _pulseController,
//       builder: (context, child) {
//         return Transform.translate(
//           offset: Offset(
//             0,
//             15 * (0.5 - _pulseController.value),
//           ),
//           child: Container(
//             padding: const EdgeInsets.all(12),
//             decoration: BoxDecoration(
//               color: color.withOpacity(0.2),
//               shape: BoxShape.circle,
//               border: Border.all(color: color, width: 2),
//             ),
//             child: Icon(icon, color: color, size: 25),
//           ),
//         );
//       },
//     );
//   }
//
//   Widget _buildProfileCard(RandomScreenController controller) {
//     return Container(
//       margin: const EdgeInsets.symmetric(horizontal: 20),
//       decoration: ShapeDecoration(
//         color: Colors.white,
//         shape: SmoothRectangleBorder(
//           borderRadius: SmoothBorderRadius(cornerRadius: 25, cornerSmoothing: cornerSmoothing),
//         ),
//         shadows: [
//           BoxShadow(
//             color: Colors.grey.withOpacity(0.3),
//             blurRadius: 20,
//             spreadRadius: 5,
//             offset: const Offset(0, 10),
//           ),
//         ],
//       ),
//       child: Stack(
//         children: [
//           // Decorative corner pattern
//           Positioned(
//             top: 0,
//             right: 0,
//             child: Container(
//               width: 100,
//               height: 100,
//               decoration: BoxDecoration(
//                 gradient: LinearGradient(
//                   colors: [
//                     Colors.orange.shade200.withOpacity(0.3),
//                     Colors.transparent,
//                   ],
//                 ),
//                 borderRadius: const BorderRadius.only(
//                   topRight: Radius.circular(25),
//                   bottomLeft: Radius.circular(50),
//                 ),
//               ),
//             ),
//           ),
//
//           Padding(
//             padding: const EdgeInsets.all(25),
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 // Anonymous badge
//                 Row(
//                   children: [
//                     Container(
//                       padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 8),
//                       decoration: BoxDecoration(
//                         gradient: LinearGradient(
//                           colors: [Colors.green.shade400, Colors.teal.shade400],
//                         ),
//                         borderRadius: BorderRadius.circular(20),
//                       ),
//                       child: Row(
//                         mainAxisSize: MainAxisSize.min,
//                         children: [
//                           const Icon(Icons.security, color: Colors.white, size: 16),
//                           const SizedBox(width: 6),
//                           const Text(
//                             "गुप्त मैचिंग",
//                             style: TextStyle(
//                               color: Colors.white,
//                               fontSize: 12,
//                               fontWeight: FontWeight.w600,
//                             ),
//                           ),
//                         ],
//                       ),
//                     ),
//                     const Spacer(),
//                     Icon(Icons.verified, color: Colors.blue.shade500, size: 24),
//                   ],
//                 ),
//
//                 const SizedBox(height: 20),
//
//                 // Profile section
//                 Row(
//                   children: [
//                     Container(
//                       padding: const EdgeInsets.all(4),
//                       decoration: BoxDecoration(
//                         shape: BoxShape.circle,
//                         gradient: LinearGradient(
//                           colors: [Colors.orange.shade300, Colors.pink.shade300],
//                         ),
//                       ),
//                       child: ClipSmoothRect(
//                         radius:
//                             SmoothBorderRadius.all(SmoothRadius(cornerRadius: 40, cornerSmoothing: cornerSmoothing)),
//                         child: MyCachedProfileImage(
//                           imageUrl: controller.user?.profile,
//                           width: 80,
//                           height: 80,
//                           fullName: controller.user?.fullName,
//                         ),
//                       ),
//                     ),
//                     const SizedBox(width: 20),
//                     Expanded(
//                       child: Column(
//                         crossAxisAlignment: CrossAxisAlignment.start,
//                         children: [
//                           Text(
//                             controller.user?.fullName ?? "Priya Sharma",
//                             style: TextStyle(
//                               color: Colors.grey.shade800,
//                               fontSize: 22,
//                               fontWeight: FontWeight.bold,
//                             ),
//                           ),
//                           const SizedBox(height: 4),
//                           Text(
//                             "@${controller.user?.username ?? 'priya_sharma'}",
//                             style: TextStyle(
//                               color: Colors.orange.shade600,
//                               fontSize: 14,
//                               fontWeight: FontWeight.w500,
//                             ),
//                           ),
//                           const SizedBox(height: 8),
//                           // Basic info chips
//                           Wrap(
//                             spacing: 8,
//                             children: [
//                               _buildInfoChip("25 साल", Icons.cake, Colors.pink.shade400),
//                               _buildInfoChip("दिल्ली", Icons.location_on, Colors.blue.shade400),
//                             ],
//                           ),
//                         ],
//                       ),
//                     ),
//                   ],
//                 ),
//
//                 const SizedBox(height: 25),
//
//                 // Bio section
//                 Container(
//                   padding: const EdgeInsets.all(15),
//                   decoration: BoxDecoration(
//                     color: Colors.orange.shade50,
//                     borderRadius: BorderRadius.circular(15),
//                   ),
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       Row(
//                         children: [
//                           Icon(Icons.person, color: Colors.orange.shade600, size: 18),
//                           const SizedBox(width: 8),
//                           Text(
//                             "About Me",
//                             style: TextStyle(
//                               color: Colors.orange.shade700,
//                               fontSize: 16,
//                               fontWeight: FontWeight.w600,
//                             ),
//                           ),
//                         ],
//                       ),
//                       const SizedBox(height: 10),
//                       Text(
//                         controller.user?.bio ??
//                             'Software Engineer से है। अच्छे संस्कार और पारिवारिक मूल्यों को मानती हूं। यात्रा, पढ़ना और खाना बनाना पसंद है।',
//                         style: TextStyle(
//                           color: Colors.grey.shade700,
//                           fontSize: 14,
//                           height: 1.5,
//                         ),
//                         maxLines: 3,
//                         overflow: TextOverflow.ellipsis,
//                       ),
//                     ],
//                   ),
//                 ),
//
//                 const SizedBox(height: 20),
//
//                 // Interests
//                 Text(
//                   "रुचियां",
//                   style: TextStyle(
//                     color: Colors.grey.shade800,
//                     fontSize: 16,
//                     fontWeight: FontWeight.w600,
//                   ),
//                 ),
//                 const SizedBox(height: 10),
//                 Wrap(
//                   spacing: 10,
//                   runSpacing: 8,
//                   children: (controller.user?.getInterestsStringList() ??
//                           ['संगीत', 'यात्रा', 'खाना बनाना', 'पढ़ना', 'नृत्य', 'फिल्में'])
//                       .map((interest) {
//                     final colors = [
//                       [Colors.pink.shade300, Colors.purple.shade300],
//                       [Colors.blue.shade300, Colors.teal.shade300],
//                       [Colors.orange.shade300, Colors.red.shade300],
//                       [Colors.green.shade300, Colors.lime.shade300],
//                     ];
//                     final colorPair = colors[interest.hashCode % colors.length];
//
//                     return Container(
//                       padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 8),
//                       decoration: BoxDecoration(
//                         gradient: LinearGradient(colors: colorPair),
//                         borderRadius: BorderRadius.circular(20),
//                       ),
//                       child: Text(
//                         interest,
//                         style: const TextStyle(
//                           color: Colors.white,
//                           fontSize: 12,
//                           fontWeight: FontWeight.w500,
//                         ),
//                       ),
//                     );
//                   }).toList(),
//                 ),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   Widget _buildInfoChip(String text, IconData icon, Color color) {
//     return Container(
//       padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
//       decoration: BoxDecoration(
//         color: color.withOpacity(0.1),
//         borderRadius: BorderRadius.circular(15),
//         border: Border.all(color: color.withOpacity(0.3)),
//       ),
//       child: Row(
//         mainAxisSize: MainAxisSize.min,
//         children: [
//           Icon(icon, size: 14, color: color),
//           const SizedBox(width: 4),
//           Text(
//             text,
//             style: TextStyle(
//               color: color,
//               fontSize: 12,
//               fontWeight: FontWeight.w500,
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   Widget _buildBottomActions(RandomScreenController controller, bool isProfile) {
//     return Container(
//       padding: const EdgeInsets.all(25),
//       child: Column(
//         children: [
//           if (isProfile) ...[
//             // Action buttons for profile
//             Row(
//               children: [
//                 Expanded(
//                   child: _buildActionButton(
//                     text: "Next Profile",
//                     icon: Icons.skip_next,
//                     gradient: [Colors.grey.shade400, Colors.grey.shade500],
//                     onTap: () {
//                       _cardController.reset();
//                       controller.next(); // Add this method to controller
//                     },
//                   ),
//                 ),
//                 const SizedBox(width: 15),
//                 Expanded(
//                   child: _buildActionButton(
//                     text: "View Profile",
//                     icon: Icons.visibility,
//                     gradient: [Colors.blue.shade400, Colors.blue.shade600],
//                     onTap: () {
//                       Get.to(() => ProfileScreen(
//                             userId: controller.user?.id ?? "0",
//                           ));
//                     },
//                   ),
//                 ),
//                 const SizedBox(width: 15),
//                 Expanded(
//                   child: _buildActionButton(
//                     text: "Connect",
//                     icon: Icons.favorite,
//                     gradient: [Colors.pink.shade400, Colors.red.shade500],
//                     onTap: controller.next,
//                   ),
//                 ),
//               ],
//             ),
//           ] else ...[
//             // Skip button while searching
//             _buildActionButton(
//               text: "Skip & Find Another",
//               icon: Icons.refresh,
//               gradient: [Colors.orange.shade400, Colors.pink.shade400],
//               onTap: () => controller.next(),
//             ),
//           ],
//
//           const SizedBox(height: 15),
//
//           // Privacy assurance
//           Container(
//             padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
//             decoration: BoxDecoration(
//               color: Colors.green.shade50,
//               borderRadius: BorderRadius.circular(20),
//               border: Border.all(color: Colors.green.shade200),
//             ),
//             child: Row(
//               mainAxisAlignment: MainAxisAlignment.center,
//               children: [
//                 Icon(Icons.shield, color: Colors.green.shade600, size: 18),
//                 const SizedBox(width: 8),
//                 Text(
//                   "100% सुरक्षित और गोपनीय",
//                   style: TextStyle(
//                     color: Colors.green.shade700,
//                     fontSize: 14,
//                     fontWeight: FontWeight.w600,
//                   ),
//                 ),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   Widget _buildActionButton({
//     required String text,
//     required IconData icon,
//     required List<Color> gradient,
//     required VoidCallback onTap,
//   }) {
//     return GestureDetector(
//       onTap: onTap,
//       child: Container(
//         height: 50,
//         decoration: BoxDecoration(
//           gradient: LinearGradient(colors: gradient),
//           borderRadius: BorderRadius.circular(25),
//           boxShadow: [
//             BoxShadow(
//               color: gradient.first.withOpacity(0.3),
//               blurRadius: 10,
//               offset: const Offset(0, 5),
//             ),
//           ],
//         ),
//         child: Row(
//           mainAxisAlignment: MainAxisAlignment.center,
//           children: [
//             Icon(icon, color: Colors.white, size: 18),
//             const SizedBox(width: 8),
//             Text(
//               text,
//               style: const TextStyle(
//                 color: Colors.white,
//                 fontSize: 14,
//                 fontWeight: FontWeight.w600,
//               ),
//             ),
//           ],
//         ),
//       ),
//     );
//   }
// }

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';
import 'package:banjaramatch/screens/random_screen/random_screen_controller.dart';
import 'package:banjaramatch/utilities/const.dart';

class RandomScreen extends StatefulWidget {
  const RandomScreen({Key? key}) : super(key: key);

  @override
  State<RandomScreen> createState() => _RandomScreenState();
}

class _RandomScreenState extends State<RandomScreen> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _cardController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _cardAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat(reverse: true);

    _cardController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _cardAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _cardController, curve: Curves.elasticOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _cardController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final RandomScreenController controller = RandomScreenController();

    return Scaffold(
      backgroundColor: const Color(0xFFFAFBFC),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: GetBuilder<RandomScreenController>(
                init: controller,
                builder: (controller) {
                  var isProfile = controller.user != null;
                  if (isProfile && _cardController.status == AnimationStatus.dismissed) {
                    _cardController.forward();
                  }

                  return Column(
                    children: [
                      const SizedBox(height: 20),
                      _buildStatusSection(isProfile),
                      const SizedBox(height: 30),
                      Expanded(
                        child: isProfile
                            ? AnimatedBuilder(
                                animation: _cardAnimation,
                                builder: (context, child) {
                                  return Transform.scale(
                                    scale: _cardAnimation.value,
                                    child: _buildProfileCard(controller),
                                  );
                                },
                              )
                            : _buildSearchingState(),
                      ),
                      _buildBottomActions(controller, isProfile),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Get.back(),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8F9FA),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.arrow_back_ios_new,
                color: Color(0xFF6B7280),
                size: 18,
              ),
            ),
          ),
          const Spacer(),
          Column(
            children: [
              const Text(
                "Find Your Match",
                style: TextStyle(
                  color: Color(0xFF1F2937),
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                "Discover someone special",
                style: TextStyle(
                  color: Colors.grey.shade500,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFFDF2F8),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.favorite_outline,
              color: Color(0xFFEC4899),
              size: 18,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusSection(bool isProfile) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      decoration: BoxDecoration(
        color: isProfile ? const Color(0xFFF0FDF4) : const Color(0xFFFEF3F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isProfile ? const Color(0xFFBBF7D0) : const Color(0xFFFED7CC),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isProfile ? const Color(0xFF22C55E) : const Color(0xFFEC4899),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              isProfile ? Icons.check : Icons.search,
              color: Colors.white,
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isProfile ? "Perfect Match Found!" : "Searching for you...",
                  style: TextStyle(
                    color: isProfile ? const Color(0xFF166534) : const Color(0xFFA21CAF),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  isProfile ? "Someone special is here" : "Finding your ideal partner",
                  style: TextStyle(
                    color: isProfile ? const Color(0xFF16A34A) : const Color(0xFFEC4899),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchingState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Searching animation
        AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: _pulseAnimation.value,
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFEC4899).withOpacity(0.1),
                      blurRadius: 40,
                      spreadRadius: 10,
                    ),
                    const BoxShadow(
                      color: Color(0x0D000000),
                      blurRadius: 20,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 130,
                      height: 130,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFFEC4899).withOpacity(0.2),
                          width: 2,
                        ),
                      ),
                    ),
                    Container(
                      width: 110,
                      height: 110,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xFFF8F9FA),
                      ),
                      child: ClipOval(
                        child: MyCachedImage(
                          imageUrl: SessionManager.shared.getUser()?.profile,
                          width: 110,
                          height: 110,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),

        const SizedBox(height: 40),

        // Floating elements
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildFloatingElement(Icons.favorite_outline, const Color(0xFFEC4899)),
            const SizedBox(width: 30),
            _buildFloatingElement(Icons.star_outline, const Color(0xFFF59E0B)),
            const SizedBox(width: 30),
            _buildFloatingElement(Icons.favorite_outline, const Color(0xFF8B5CF6)),
          ],
        ),

        const SizedBox(height: 40),

        // Encouraging message
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 30),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  color: Color(0xFFFDF2F8),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.psychology_outlined,
                  color: Color(0xFFEC4899),
                  size: 24,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                "Take Your Time",
                style: TextStyle(
                  color: Color(0xFF1F2937),
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                "We understand finding the right person can feel overwhelming. Our anonymous matching helps you connect comfortably at your own pace.",
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 14,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFloatingElement(IconData icon, Color color) {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(
            0,
            10 * (0.5 - _pulseController.value),
          ),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
        );
      },
    );
  }

  Widget _buildProfileCard(RandomScreenController controller) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: ShapeDecoration(
        color: Colors.white,
        shape: SmoothRectangleBorder(
          borderRadius: SmoothBorderRadius(cornerRadius: 24, cornerSmoothing: cornerSmoothing),
        ),
        shadows: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 25,
            spreadRadius: 0,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Privacy badge
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.shield_outlined, color: Color(0xFF22C55E), size: 14),
                      const SizedBox(width: 6),
                      const Text(
                        "Anonymous Match",
                        style: TextStyle(
                          color: Color(0xFF166534),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEFF6FF),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.verified,
                    color: Color(0xFF3B82F6),
                    size: 16,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Profile section
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFEC4899).withOpacity(0.3), width: 2),
                  ),
                  child: ClipSmoothRect(
                    radius: SmoothBorderRadius.all(SmoothRadius(cornerRadius: 40, cornerSmoothing: cornerSmoothing)),
                    child: MyCachedProfileImage(
                      imageUrl: controller.user?.profile,
                      width: 80,
                      height: 80,
                      fullName: controller.user?.fullName,
                    ),
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        controller.user?.fullName ?? "Sarah Johnson",
                        style: const TextStyle(
                          color: Color(0xFF1F2937),
                          fontSize: 22,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "@${controller.user?.fullName ?? 'sarah_j'}",
                        style: const TextStyle(
                          color: Color(0xFFEC4899),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          _buildInfoPill("28 years", Icons.cake_outlined, const Color(0xFF8B5CF6)),
                          const SizedBox(width: 8),
                          _buildInfoPill("New York", Icons.location_on_outlined, const Color(0xFF06B6D4)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // About section
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8F9FA),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.person_outline, color: Color(0xFF6B7280), size: 16),
                      const SizedBox(width: 8),
                      Text(
                        "About",
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    controller.user?.bio ??
                        'Marketing professional who loves exploring new places, trying different cuisines, and spending quality time with family. Looking for someone who shares similar values and enjoys meaningful conversations.',
                    style: const TextStyle(
                      color: Color(0xFF374151),
                      fontSize: 14,
                      height: 1.5,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Interests
            Row(
              children: [
                const Icon(Icons.favorite_outline, color: Color(0xFF6B7280), size: 16),
                const SizedBox(width: 8),
                Text(
                  "Interests",
                  style: TextStyle(
                    color: Colors.grey.shade700,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: (controller.user?.getInterestsStringList() ??
                      ['Travel', 'Cooking', 'Reading', 'Photography', 'Yoga', 'Movies'])
                  .map((interest) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: Text(
                    interest,
                    style: const TextStyle(
                      color: Color(0xFF374151),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoPill(String text, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomActions(RandomScreenController controller, bool isProfile) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          if (isProfile) ...[
            // Profile actions
            Row(
              children: [
                Expanded(
                  child: _buildActionButton(
                    text: "Skip",
                    icon: Icons.skip_next_outlined,
                    isSecondary: true,
                    onTap: () {
                      _cardController.reset();
                      controller.next();
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildActionButton(
                    text: "View Profile",
                    icon: Icons.visibility_outlined,
                    isSecondary: true,
                    onTap: () {
                      Get.to(() => ProfileScreen(
                            userId: controller.user?.id ?? "0",
                          ));
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildActionButton(
                    text: "Connect",
                    icon: Icons.favorite_outline,
                    isSecondary: false,
                    onTap: controller.next,
                  ),
                ),
              ],
            ),
          ] else ...[
            // Searching state action
            _buildActionButton(
              text: "Find Another Match",
              icon: Icons.refresh,
              isSecondary: false,
              onTap: () => controller.next(),
            ),
          ],

          const SizedBox(height: 16),

          // Privacy note
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.security, color: Color(0xFF22C55E), size: 16),
                const SizedBox(width: 8),
                Text(
                  "Your privacy is completely protected",
                  style: TextStyle(
                    color: Colors.green.shade700,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required String text,
    required IconData icon,
    required bool isSecondary,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: isSecondary ? const Color(0xFFF8F9FA) : const Color(0xFFEC4899),
          borderRadius: BorderRadius.circular(12),
          border: isSecondary ? Border.all(color: const Color(0xFFE5E7EB)) : null,
          boxShadow: isSecondary
              ? null
              : [
                  BoxShadow(
                    color: const Color(0xFFEC4899).withOpacity(0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: isSecondary ? const Color(0xFF6B7280) : Colors.white, size: 16),
            const SizedBox(width: 8),
            Text(
              text,
              style: TextStyle(
                color: isSecondary ? const Color(0xFF374151) : Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
