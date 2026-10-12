import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:one_context/one_context.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/screens/extra_views/buttons.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';
import 'package:banjaramatch/screens/user_profile_action_button.dart';
import 'package:banjaramatch/utilities/const.dart';

import '../common/extensions/font_extension.dart';
import 'extra_views/logo_tag.dart';
import 'navigation_button.dart';

class UserPublicProfile extends StatelessWidget {
  final String userId;

  var isAuthUser = false;

  UserPublicProfile({Key? key, required this.userId}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final ProfileController controller = ProfileController(userId);

    isAuthUser = controller.isAuthUser;
    return Scaffold(
      backgroundColor: cBG,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            color: cBG,
            padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 20),
            child: const SafeArea(
              bottom: false,
              child: LogoTag(),
            ),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: GetBuilder<ProfileController>(
              init: controller,
              builder: (controller) {
                if (controller.isFetching) {
                  return const Center(child: CircularProgressIndicator());
                }

                return Column(
                  children: [
                    TopBarForOnBoarding(
                      titleStart: isAuthUser ? 'Profile' : 'Discover',
                      titleEnd: isAuthUser ? 'Your Info' : 'Public Info',
                      desc: '',
                    ),
                    const Spacer(),
                    isAuthUser ? buildProfileCard(controller) : buildGallerySection(controller),
                    const Spacer(),
                    CommonButton(
                      text: isAuthUser ? 'Edit Profile' : 'Send Request',
                      onTap: () {
                        // isAuthUser ? controller.editProfile : controller.sendProfileRequest
                        //
                      },
                    ),
                    const SizedBox(height: 40),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget buildProfileCard(ProfileController controller) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 40),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cBlack,
        borderRadius: BorderRadius.circular(25),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: MyCachedImage(
                  imageUrl: controller.user?.profile ?? '',
                  width: 70,
                  height: 70,
                ),
              ),
              const SizedBox(width: 15),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    controller.user?.name ?? '',
                    style: MyTextStyle.gilroyBold(color: cWhite, size: 17),
                  ),
                  Text(
                    "@${controller.user?.fullName ?? ''}",
                    style: MyTextStyle.gilroyLight(color: cPrimary),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            controller.user?.bio ?? '',
            style: MyTextStyle.gilroyLight(color: cWhite, size: 18),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget buildGallerySection(ProfileController controller) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: GridView.builder(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          //  itemCount: controller.galleryImages.length,
          itemCount: 0,
          itemBuilder: (context, index) {
            return GestureDetector(
              onTap: () => {
                //  controller.viewImageFullScreen(index)
              },
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: MyCachedImage(
                  imageUrl: "",
                  // imageUrl: controller.galleryImages[index],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  // Widget buildListView(BuildContext context) {
  //   final profileData = [
  //     MyProfileListData(
  //       title2: "About",
  //       subtitle2: "On Behalf \${state.onbehalf?.name}",
  //       icon2: 'assets/icon/icon_left_qoute.png',
  //       pp2: const PP_Information(),
  //     ),
  //     MyProfileListData(
  //       title2: "Basic Information",
  //       icon2: 'assets/icon/icon_basicInfo.png',
  //       pp2: const PP_BasicInformation(),
  //     ),
  //     MyProfileListData(
  //       title2: "Contact Details",
  //       icon2: 'assets/icon/icon_contactDetails.png',
  //       pp2: PP_UserContactDetails(userid: userId),
  //     ),
  //     MyProfileListData(
  //       title2: "Present Address",
  //       icon2: 'assets/icon/icon_presentAddress.png',
  //       pp2: const PP_PresentAddress(),
  //     ),
  //     MyProfileListData(
  //       title2: "Education Details",
  //       icon2: 'assets/icon/icon_educationCareer.png',
  //       pp2: const PP_EducationInfo(),
  //     ),
  //     MyProfileListData(
  //       title2: "Career Details",
  //       icon2: 'assets/icon/icon_educationCareer.png',
  //       pp2: const PP_CareerInfo(),
  //     ),
  //     MyProfileListData(
  //       title2: "Physical Attributes",
  //       icon2: 'assets/icon/icon_physicalAttri.png',
  //       pp2: const PP_PhysicalAttributes(),
  //     ),
  //     MyProfileListData(
  //       title2: "Language",
  //       icon2: 'assets/icon/icon_language.png',
  //       pp2: const PP_Language(),
  //     ),
  //     MyProfileListData(
  //       title2: "Hobbies & Interest",
  //       icon2: 'assets/icon/icon_hobbiesInterest.png',
  //       pp2: const PP_HobbiesInterest(),
  //     ),
  //     MyProfileListData(
  //       title2: "Personal Attitude & Behavior",
  //       icon2: 'assets/icon/icon_personalAttitude.png',
  //       pp2: const PP_PersonalAttitude(),
  //     ),
  //     MyProfileListData(
  //       title2: "Residency Information",
  //       icon2: 'assets/icon/icon_residency.png',
  //       pp2: const PP_ResidencyInfo(),
  //     ),
  //     MyProfileListData(
  //       title2: "Spiritual & Social Background",
  //       icon2: 'assets/icon/icon_spiritualSocial.png',
  //       pp2: const PP_SpiritualSocial(),
  //     ),
  //     MyProfileListData(
  //       title2: "Life Style",
  //       icon2: 'assets/icon/icon_lifeStyle.png',
  //       pp2: const PP_LifeStyle(),
  //     ),
  //     MyProfileListData(
  //       title2: "Astronomic Information",
  //       icon2: 'assets/icon/icon_astronomy.png',
  //       pp2: const PP_AstronomicInfo(),
  //     ),
  //     MyProfileListData(
  //       title2: "Permanent Address",
  //       icon2: 'assets/icon/icon_permanentAddress.png',
  //       pp2: const PP_PermanentAddress(),
  //     ),
  //     MyProfileListData(
  //       title2: "Family Information",
  //       icon2: 'assets/icon/icon_family.png',
  //       pp2: const PP_FamilyInfo(),
  //     ),
  //   ];
  //
  //   return SingleChildScrollView(
  //     child: Padding(
  //       padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
  //       child: ListView.builder(
  //         padding: const EdgeInsets.only(top: 10.0, bottom: 10.0),
  //         shrinkWrap: true,
  //         physics: const NeverScrollableScrollPhysics(),
  //         itemCount: profileData.length,
  //         itemBuilder: (context, index) {
  //           return Column(
  //             children: [
  //               profileData[index].getExpandableWidget(context),
  //               if (index != profileData.length - 1) const SizedBox(height: 20),
  //             ],
  //           );
  //         },
  //       ),
  //     ),
  //   );
  // }

  void showReportDialog(
      BuildContext context, TextEditingController reportController, Function(String reason) onReport) {
    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: Text(
            "Common Report Member",
          ),
          content: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "Common Repot Reason",
              ),
              TextField(
                maxLines: 5,
                controller: reportController,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.blueGrey,
                  border: InputBorder.none,
                  hintText: "Common Report Readson",
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              child: Text(
                "Cancel",
              ),
              onPressed: () {
                Navigator.of(dialogContext).pop();
              },
            ),
            TextButton(
              child: Text(
                "Report",
              ),
              onPressed: () {
                onReport(reportController.text);
                Navigator.of(dialogContext).pop();
                reportController.clear();
              },
            ),
          ],
        );
      },
    );
  }

  Widget buildContainerGradientX(
      BuildContext mainContext, ProfileController controller, bool isAuthUser, Function() expressLove) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment(0.8, 1),
          colors: [
            Colors.cyan,
            Colors.deepOrangeAccent,
          ],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(32.0),
          bottomRight: Radius.circular(32.0),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 22.0, vertical: 10.0),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      InkWell(
                        onTap: () => Navigator.pop(mainContext),
                        child: Image.asset(
                          'assets/icon/icon_pop_white.png',
                          height: 20,
                          width: 20,
                        ),
                      ),
                      const SizedBox(width: 10),
                      if (controller.user!.profilePicRequest == true)
                        showProfileLockIcon(controller)
                      else
                        SizedBox(
                          width: 50,
                          height: 50,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(25),
                            child: MyCachedImage(
                              imageUrl: controller.user?.backgroundImage ?? '',
                              width: Get.width,
                              height: 170 + Get.mediaQuery.viewInsets.top,
                            ),
                          ),
                        ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            controller.user!.name ?? '',
                          ),
                          Row(
                            children: [
                              Text("Member ID "),
                              Text(
                                controller.user!.code ?? '--',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  if (!isAuthUser)
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white, width: 1),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        iconSize: 40,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () {},
                        icon: SizedBox(
                          height: 18,
                          width: 18,
                          child: controller.isFetching == true
                              ? const CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 1,
                                )
                              : Image.asset('assets/icon/icon_love.png'),
                        ),
                      ),
                    ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${controller.user?.age ?? ''} yrs, ${controller.user?.height ?? ''} ft, ${controller.user?.maritalStatus ?? ''}",
                      ),
                      Text(
                        "${controller.user?.religionId ?? ''} ${controller.user?.caste?.name ?? ''}",
                      ),
                    ],
                  ),
                  if (!isAuthUser && controller.user?.profilematch != 0)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          "Public Profile",
                        ),
                        Text(
                          "${controller.user?.profilematch ?? 0} %",
                        ),
                      ],
                    ),
                ],
              ),
              const SizedBox(height: 20),
              TabBar(
                isScrollable: true,
                indicatorColor: Colors.transparent,
                tabs: [
                  const Tab(child: NavigationButton(text: 'Full profile')),
                  if (true) const Tab(child: NavigationButton(text: 'Partner Preferences')),
                  const Tab(child: NavigationButton(text: 'Gallery')),
                ],
              ),
              const SizedBox(height: 18),
              if (!isAuthUser)
                Column(
                  children: [
                    const SizedBox(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        UserProfileActionButton(
                          onTap: () => {
                            // showReportDialog(
                            //   mainContext,
                            //   TextEditingController(),
                            //       (reason) => store.dispatch(reportMiddleware(userId: widget.userId, reason: reason)),
                            // )
                          },
                          text: controller.user?.reportStatus == true ? "Reported" : "Report",
                          icon: 'icon_report.png',
                        ),
                        UserProfileActionButton(
                          onTap: () => {
                            // store.dispatch(addShortlistMiddleware(userId: widget.userId))
                          },
                          text: controller.user?.isShortListed == true ? "Shortlisted" : "Shortlist",
                          icon: 'icon_shortlist_black.png',
                        ),
                        UserProfileActionButton(
                          onTap: () => {
                            //  store.dispatch(addIgnoreMiddleware(userId: widget.userId, from: 'userprofile'))
                          },
                          text: "Ignore User",
                          icon: 'icon_ignore_users.png',
                        ),
                      ],
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget buildContainerGradient(mainContext, ProfileController controller) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: const Alignment(0.8, 1),
          colors: [
            Colors.cyan,
            Colors.blueAccent,
          ],
        ),
        // border radius and stuff
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(32.0),
          bottomRight: Radius.circular(32.0),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(right: 22.0, left: 22.0, top: 10, bottom: 10),
          child: Column(
            children: [
              /// image name email and other more vertz field
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      InkWell(
                        onTap: () => Navigator.pop(mainContext),
                        child: Image.asset(
                          'assets/icon/icon_pop_white.png',
                          height: 20,
                          width: 20,
                        ),
                      ),
                      const SizedBox(
                        width: 10,
                      ),
                      if (controller.user != null && controller.user!.shortlistStateLoading!)
                        showProfileLockIcon(controller)
                      else
                        SizedBox(
                          width: 50,
                          height: 50,
                          child: MyCachedImage(
                            imageUrl: controller.user?.backgroundImage ?? '',
                            width: Get.width,
                            height: 50 + Get.mediaQuery.viewInsets.top,
                          ),
                        ),
                      const SizedBox(
                        width: 10,
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            controller.user!.name ?? '',
                          ),
                          Row(
                            children: [
                              Text(
                                "Member ID ",
                              ),
                              Text(
                                controller.user?.code ?? '--',
                              ),
                            ],
                          )
                        ],
                      ),
                    ],
                  ),
                  if (!isAuthUser)
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white, width: 1),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        iconSize: 40,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => () {},
                        icon: SizedBox(
                          height: 18,
                          width: 18,
                          child: controller.isFetching
                              ? const CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 1,
                                )
                              : Image.asset(
                                  'assets/icon/icon_love.png',
                                ),
                        ),
                      ),
                    )
                ],
              ),

              /// remaining boxes in are below
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${controller.user?.age ?? ''} yrs, ${controller.user?.height ?? ''} ft, ${controller.user?.maritalStatus ?? ''}",
                      ),
                      // Text(
                      //   "${controller.user!.spiritual == null ? '' : controller.user
                      //       ?.religionId + " " ?? ""} ${controller.user.spiritual == null
                      //       ? ''
                      //       : controller
                      //       .user?.casteId ?? ""}",
                      //
                      //
                      // ),
                    ],
                  ),
                  if (!isAuthUser && controller.user?.profilematch != null)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          "Public Profile",
                        ),
                        Text("${controller.user?.profilematch ?? 0} %")
                      ],
                    )
                ],
              ),
              SizedBox(
                height: 20,
              ),

              TabBar(
                isScrollable: true,
                indicatorColor: Colors.transparent,
                tabs: [
                  const Tab(
                    child: NavigationButton(
                      text: 'Full profile',
                    ),
                  ),
                  if (true)
                    const Tab(
                      child: NavigationButton(
                        text: 'Partner Preferences',
                      ),
                    ),
                  const Tab(
                    child: NavigationButton(
                      text: 'Gallery',
                    ),
                  ),
                ],
              ),
              SizedBox(
                height: 20,
              ),
              if (!isAuthUser)
                Column(
                  children: [
                    const SizedBox(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        UserProfileActionButton(
                          onTap: () => {
                            // showReportDialog(
                            //   mainContext,
                            //   TextEditingController(),
                            //       (reason) => store.dispatch(reportMiddleware(userId: userId, reason: reason)),
                            // )
                          },
                          text: controller.user?.reportStatus == true ? "Reported" : "Report",
                          icon: 'icon_report.png',
                        ),
                        UserProfileActionButton(
                          onTap: () => {},
                          text: controller.user?.isShortListed == true ? "Shortlisted" : "Shortlist",
                          icon: 'icon_shortlist_black.png',
                        ),
                        UserProfileActionButton(
                          onTap: () => {},
                          text: "Ignore User",
                          icon: 'icon_ignore_users.png',
                        ),
                      ],
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  galleryViewPermission(ProfileController controller) {
    controller.user!.packageExpire == "Expired" || controller.user!.remainingProfileImageView == 0
        ? Container(
            child: Text('Please Upgrade your Package'),
          )
        : OneContext().showDialog<void>(
            builder: (BuildContext context) {
              return AlertDialog(
                title: Text(
                  'Profile Picture View',
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Divider(
                      thickness: 1,
                    ),
                    Text(
                      "Remaining Profile Picture View: ${controller.user?.remainingProfileImageView} times",
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(
                      height: 5,
                    ),
                    const Text(
                      "N.B. Requesting to See This Member Profile Picture Will Cost 1 From Remaining Profile Picture View.",
                      style: TextStyle(color: Colors.redAccent, fontSize: 10),
                      textAlign: TextAlign.center,
                    ),
                    const Divider(
                      thickness: 1,
                    ),
                  ],
                ),
                actions: <Widget>[
                  TextButton(
                    style: TextButton.styleFrom(
                      textStyle: Theme.of(context).textTheme.labelLarge,
                      backgroundColor: Colors.blueAccent,
                    ),
                    child: const Text(
                      'Close',
                      style: TextStyle(color: Colors.black),
                    ),
                    onPressed: () {
                      Navigator.of(context).pop();
                    },
                  ),
                  TextButton(
                    style: TextButton.styleFrom(
                      textStyle: Theme.of(context).textTheme.labelLarge,
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(4),
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment(0.8, 1),
                            colors: [
                              Colors.cyan,
                              Colors.deepOrangeAccent,
                            ],
                          )),
                      child: const Text(
                        'Confirm',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                    onPressed: () {
                      // pleaseWaitDialog();
                      // store.dispatch(
                      //   sendProfilePictureViewRequestAction(
                      //     id: widget.userId,
                      //   ),
                      // );
                      // Navigator.of(context).pop();
                    },
                  ),
                ],
              );
            },
          );
  }

  Widget showProfileLockIcon(ProfileController controller) {
    return InkWell(
      onTap: () {
        if (!isAuthUser) {
          galleryViewPermission(controller);
        }
      },
      child: Stack(
        children: [
          CircleAvatar(
            radius: 25,
            foregroundImage: CachedNetworkImageProvider(controller.user!.imageUrl!),
          ),
          controller.user!.profileViewRequestStatus!
              ? Container()
              : Positioned.fill(
                  child: Align(
                    alignment: Alignment.center,
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(25),
                        color: Colors.grey,
                      ),
                      padding: const EdgeInsets.all(15),
                      height: 50,
                      width: 50,
                      child: Image.asset(
                        'assets/icon/icon_lock.png',
                        height: 25,
                        width: 25,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                )
        ],
      ),
    );
  }
}
