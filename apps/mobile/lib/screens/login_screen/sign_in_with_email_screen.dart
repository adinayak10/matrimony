import 'package:figma_squircle/figma_squircle.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:banjaramatch/common/api_service/notification_service.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/extensions/string_extension.dart';
import 'package:banjaramatch/common/managers/firebase_notification_manager.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/languages.dart';
import 'package:banjaramatch/screens/block_by_admin_screen/block_by_admin_screen.dart';
import 'package:banjaramatch/screens/extra_views/logo_tag.dart';
import 'package:banjaramatch/screens/interests_screen/interests_screen.dart';
import 'package:banjaramatch/screens/profile_screen/profile_controller.dart';
import 'package:banjaramatch/screens/tabbar/tabbar_screen.dart';
import 'package:banjaramatch/screens/username_screen/username_screen.dart';
import 'package:banjaramatch/utilities/const.dart';
import 'package:banjaramatch/utilities/update_checker.dart';

import '../OnboardingWrapperScreen.dart';
import '../chats_screen/socketservice.dart';
import '../common_widget.dart';

class SignInWithEmailScreen extends StatefulWidget {
  final Function(String? fullName, String identity) onSubmit;

  const SignInWithEmailScreen({Key? key, required this.onSubmit}) : super(key: key);

  @override
  State<SignInWithEmailScreen> createState() => _SignInWithEmailScreenState();
}

class _SignInWithEmailScreenState extends State<SignInWithEmailScreen> with SingleTickerProviderStateMixin {
  TextEditingController emailController = TextEditingController();
  TextEditingController fullNameController = TextEditingController();
  TextEditingController passwordController = TextEditingController();
  TextEditingController confirmPasswordController = TextEditingController();

  EmailSignInType type = EmailSignInType.signIn;
  BaseController baseController = BaseController();
  var height = Get.height / 40;

  @override
  void initState() {
    emailController.addListener(refresh);
    fullNameController.addListener(refresh);
    passwordController.addListener(refresh);
    confirmPasswordController.addListener(refresh);
    super.initState();
  }

  void refresh() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ClipSmoothRect(
        radius: const SmoothBorderRadius.only(
            topRight: SmoothRadius(cornerRadius: 12, cornerSmoothing: cornerSmoothing),
            topLeft: SmoothRadius(cornerRadius: 12, cornerSmoothing: cornerSmoothing)),
        child: Container(
          color: Colors.white,
          child: Column(
            children: [
              Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: GestureDetector(
                      child: const Icon(
                        Icons.close_rounded,
                        color: cBlack,
                        size: 30,
                      ),
                      onTap: () {
                        Get.back();
                      },
                    ),
                  ),
                  const Spacer()
                ],
              ),
              Expanded(
                  child: SingleChildScrollView(
                child: Column(
                  children: [
                    const SizedBox(height: 40),
                    const LogoTag(width: 300),
                    const SizedBox(height: 40),
                    getTitle().toTextTR(MyTextStyle.gilroyBold(size: 23)),
                    const SizedBox(height: 20),
                    view(),
                    const SizedBox(height: 20),
                  ],
                ),
              )),
            ],
          ),
        ),
      ),
    );
  }

  Widget view() {
    switch (type) {
      case EmailSignInType.signIn:
        return signView();
      case EmailSignInType.signUp:
        return signUpView();
      case EmailSignInType.forgot:
        return forgotView();
    }
  }

  String getTitle() {
    switch (type) {
      case EmailSignInType.signIn:
        return LKeys.signInWithEmail;
      case EmailSignInType.signUp:
        return LKeys.register;
      case EmailSignInType.forgot:
        return LKeys.forgotPassword;
    }
  }

  Widget signView() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        children: [
          MyTextField(controller: emailController, placeHolder: LKeys.email),
          const SizedBox(height: 12),
          SecureTextField(
            controller: passwordController,
            placeHolder: LKeys.password,
          ),
          EmailButton(
              text: LKeys.continue_.tr,
              isDisable: emailController.text.isEmpty || passwordController.text.isEmpty,
              onTap: () async {
                if (baseController.isLoading.value) {
                  return;
                }

                baseController.startLoading();

                try {
                  // Step 1: Sign in with Firebase Authentication
                  final credential = await FirebaseAuth.instance.signInWithEmailAndPassword(
                    email: emailController.text.trim(),
                    password: passwordController.text,
                  );

                  final firebaseUser = credential.user;
                  if (firebaseUser == null) {
                    baseController.stopLoading();
                    baseController.showSnackBar('Authentication failed', type: SnackBarType.error);
                    return;
                  }

                  // Step 2: Get Firebase ID token and UID
                  final firebaseToken = await firebaseUser.getIdToken();
                  final firebaseUid = firebaseUser.uid;

                  // Step 3: Authenticate with backend using Firebase credentials (auto-handles login/register)
                  FirebaseNotificationManager.shared.getNotificationToken((deviceToken) {
                    UserService.shared.firebaseEmailRegister(
                      fullName: firebaseUser.displayName ?? emailController.text.split('@')[0],
                      email: emailController.text.trim(),
                      firebaseUid: firebaseUid,
                      firebaseToken: firebaseToken ?? '',
                      deviceToken: deviceToken,
                      deviceType: GetPlatform.isIOS ? 1 : 0,
                      completion: (response) {
                        baseController.stopLoading();

                        if (response.status == true) {
                          SessionManager.shared.setLogin(true);
                          var user = response.data;

                          if (SessionManager.shared.isLogin()) {
                            SessionManager.shared.setToken(response.token!);
                            SocketService.shared.startCommonListening();
                          }

                          // Update ProfileController with the logged-in user
                          try {
                            final profileController = Get.find<ProfileController>();
                            profileController.user = user;
                            // Fetch complete profile to get profileCompletion and other data
                            if (user?.id != null) {
                              UserService.shared.fetchMyProfile(
                                userID: user!.id!,
                                completion: (fetchedUser) {
                                  profileController.user = fetchedUser;
                                  SessionManager.shared.setUser(fetchedUser);
                                  profileController.update();
                                },
                              );
                            } else {
                              profileController.update();
                            }
                          } catch (e) {
                            print('ProfileController not found: $e');
                          }

                          Purchases.logIn('${user?.id ?? 0}');

                          if (user?.isPushNotifications == 1) {
                            FirebaseNotificationManager.shared.subscribeToTopic(notificationTopic);
                            NotificationService.shared.subscribeToAllMyRoom();
                          }

                          Widget w = TabBarScreen();
                        if (user?.isBlock == 1) {
                          w = const BlockedByAdminScreen();
                        } else if (user?.fullName == null) {
                          w = const UserNameScreen();
                        } else if (user?.gender == "Not specified") {
                          w = OnboardingWrapperScreen(startPage: 0);
                        } else if (user?.location == null) {
                          w = OnboardingWrapperScreen(startPage: 1);
                        } else if (user?.interest == null || user!.interest!.isEmpty) {
                          w = InterestScreen();
                        }

                          Get.offAll(() => w);
                          UpdateChecker.shared.checkForUpdates();
                        } else {
                          baseController.showSnackBar(response.message ?? 'Login failed', type: SnackBarType.error);
                        }
                      },
                    );
                  });
                } on FirebaseAuthException catch (e) {
                  baseController.stopLoading();
                  String errorMessage = 'Login failed';
                  if (e.code == 'user-not-found') {
                    errorMessage = 'No user found with this email';
                  } else if (e.code == 'wrong-password') {
                    errorMessage = 'Incorrect password';
                  } else if (e.code == 'invalid-email') {
                    errorMessage = 'Invalid email address';
                  } else if (e.code == 'user-disabled') {
                    errorMessage = 'This account has been disabled';
                  } else {
                    errorMessage = e.message ?? 'Login failed';
                  }
                  baseController.showSnackBar(errorMessage, type: SnackBarType.error);
                } catch (e) {
                  baseController.stopLoading();
                  baseController.showSnackBar('An error occurred: ${e.toString()}', type: SnackBarType.error);
                }
              }),
          Row(
            children: [
              LKeys.doNtHaveAnAccount.toTextTR(MyTextStyle.gilroyLight(color: cLightText, size: 14)),
              const SizedBox(width: 5),
              GestureDetector(
                onTap: showSignUp,
                child: LKeys.signUp.toTextTR(MyTextStyle.gilroySemiBold(color: cBlack, size: 14)),
              ),
              const Spacer(),
              GestureDetector(
                onTap: showForgot,
                child: LKeys.forgotPassword.toTextTR(MyTextStyle.gilroySemiBold(color: cBlack, size: 14)),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget forgotView() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        children: [
          LKeys.forgotPasswordDisc.toTextTR(
            MyTextStyle.gilroyLight(color: cLightText, size: 14),
          ),
          const SizedBox(height: 10),
          MyTextField(controller: emailController, placeHolder: LKeys.email),
          EmailButton(
              text: LKeys.reset.tr,
              isDisable: emailController.text.isEmpty,
              onTap: () async {
                //baseController.startLoading();
                try {
                  await FirebaseAuth.instance.sendPasswordResetEmail(email: emailController.text);
                  baseController.stopLoading();
                  baseController.showSnackBar(LKeys.linkSendToReset.tr, type: SnackBarType.success);
                  setState(() {
                    type = EmailSignInType.signIn;
                  });
                } on FirebaseAuthException catch (e) {
                  baseController.stopLoading();
                  baseController.showSnackBar(e.message ?? '', type: SnackBarType.error);
                } catch (e) {
                  print(e);
                  baseController.stopLoading();
                }
              }),
          Row(
            children: [
              LKeys.doNtHaveAnAccount.toTextTR(MyTextStyle.gilroyLight(color: cLightText, size: 14)),
              const SizedBox(width: 5),
              GestureDetector(
                onTap: showSignUp,
                child: LKeys.signUp.toTextTR(MyTextStyle.gilroySemiBold(color: cBlack, size: 14)),
              ),
              const Spacer(),
              GestureDetector(
                onTap: showForgot,
                child: LKeys.forgotPassword.toTextTR(MyTextStyle.gilroySemiBold(color: cBlack, size: 14)),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget signUpView() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        children: [
          MyTextField(controller: emailController, placeHolder: LKeys.email),
          const SizedBox(height: 12),
          MyTextField(controller: fullNameController, placeHolder: LKeys.fullName),
          const SizedBox(height: 12),
          SecureTextField(
            controller: passwordController,
            placeHolder: LKeys.password,
          ),
          const SizedBox(height: 12),
          SecureTextField(
            controller: confirmPasswordController,
            placeHolder: LKeys.confirmPassword,
          ),
          EmailButton(
            text: LKeys.register.tr,
            isDisable: fullNameController.text.isEmpty ||
                emailController.text.isEmpty ||
                passwordController.text.isEmpty ||
                confirmPasswordController.text.isEmpty,
            onTap: () async {
              if (baseController.isLoading.value) {
                return;
              }

              if (passwordController.text != confirmPasswordController.text) {
                baseController.showSnackBar(LKeys.passwordMismatched.tr, type: SnackBarType.error);
                return;
              }

              if (passwordController.text.length < 6) {
                baseController.showSnackBar('Password must be at least 6 characters', type: SnackBarType.error);
                return;
              }

              baseController.startLoading();

              try {
                // Step 1: Create user in Firebase Authentication
                final credential = await FirebaseAuth.instance.createUserWithEmailAndPassword(
                  email: emailController.text.trim(),
                  password: passwordController.text,
                );

                final firebaseUser = credential.user;
                if (firebaseUser == null) {
                  baseController.stopLoading();
                  baseController.showSnackBar('Registration failed', type: SnackBarType.error);
                  return;
                }

                // Step 2: Get Firebase ID token and UID
                final firebaseToken = await firebaseUser.getIdToken();
                final firebaseUid = firebaseUser.uid;

                // Step 3: Register with backend using Firebase credentials
                FirebaseNotificationManager.shared.getNotificationToken((deviceToken) {
                  UserService.shared.firebaseEmailRegister(
                    fullName: fullNameController.text,
                    email: emailController.text.trim(),
                    firebaseUid: firebaseUid,
                    firebaseToken: firebaseToken ?? '',
                    deviceToken: deviceToken,
                    deviceType: GetPlatform.isIOS ? 1 : 0,
                    completion: (response) {
                      baseController.stopLoading();

                      if (response.status == true) {
                        // Backend auto-handles both registration and login, navigate to app
                        SessionManager.shared.setLogin(true);
                        var user = response.data;

                        if (SessionManager.shared.isLogin()) {
                          SessionManager.shared.setToken(response.token!);
                          SocketService.shared.startCommonListening();
                        }

                        // Update ProfileController
                        try {
                          final profileController = Get.find<ProfileController>();
                          profileController.user = user;
                          if (user?.id != null) {
                            UserService.shared.fetchMyProfile(
                              userID: user!.id!,
                              completion: (fetchedUser) {
                                profileController.user = fetchedUser;
                                SessionManager.shared.setUser(fetchedUser);
                                profileController.update();
                              },
                            );
                          } else {
                            profileController.update();
                          }
                        } catch (e) {
                          print('ProfileController not found: $e');
                        }

                        Purchases.logIn('${user?.id ?? 0}');

                        if (user?.isPushNotifications == 1) {
                          FirebaseNotificationManager.shared.subscribeToTopic(notificationTopic);
                          NotificationService.shared.subscribeToAllMyRoom();
                        }

                        Widget w = TabBarScreen();
                        if (user?.isBlock == 1) {
                          w = const BlockedByAdminScreen();
                        } else if (user?.fullName == null) {
                          w = const UserNameScreen();
                        } else if (user?.gender == "Not specified") {
                          w = OnboardingWrapperScreen(startPage: 0);
                        } else if (user?.location == null) {
                          w = OnboardingWrapperScreen(startPage: 1);
                        } else if (user?.interest == null || user!.interest!.isEmpty) {
                          w = InterestScreen();
                        }

                        Get.offAll(() => w);
                        UpdateChecker.shared.checkForUpdates();
                      } else {
                        baseController.showSnackBar(response.message ?? 'Registration failed', type: SnackBarType.error);
                      }
                    },
                  );
                });
              } on FirebaseAuthException catch (e) {
                baseController.stopLoading();
                String errorMessage = 'Registration failed';
                if (e.code == 'weak-password') {
                  errorMessage = 'Password is too weak';
                } else if (e.code == 'email-already-in-use') {
                  errorMessage = 'An account already exists with this email';
                } else if (e.code == 'invalid-email') {
                  errorMessage = 'Invalid email address';
                } else {
                  errorMessage = e.message ?? 'Registration failed';
                }
                baseController.showSnackBar(errorMessage, type: SnackBarType.error);
              } catch (e) {
                baseController.stopLoading();
                baseController.showSnackBar('An error occurred: ${e.toString()}', type: SnackBarType.error);
              }
            },
          ),
          Row(
            children: [
              LKeys.iHaveAnAccount.toTextTR(MyTextStyle.gilroyLight(color: cLightText, size: 14)),
              const SizedBox(width: 5),
              GestureDetector(
                onTap: showSignIn,
                child: LKeys.signIn.toTextTR(MyTextStyle.gilroySemiBold(color: cBlack, size: 14)),
              ),
              const Spacer(),
              // GestureDetector(
              //   onTap: showForgot,
              //   child: LKeys.forgotPassword.toTextTR(MyTextStyle.gilroySemiBold(color: cBlack, size: 14)),
              // ),
            ],
          )
        ],
      ),
    );
  }

  void showSignIn() {
    setState(() {
      type = EmailSignInType.signIn;
    });
  }

  void showSignUp() {
    setState(() {
      type = EmailSignInType.signUp;
    });
  }

  void showForgot() {
    setState(() {
      type = EmailSignInType.forgot;
    });
  }
}

class EmailButton extends StatelessWidget {
  final String text;
  final bool isDisable;
  final Function() onTap;

  const EmailButton({Key? key, required this.text, required this.onTap, required this.isDisable}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
        onTap: () {
          if (!isDisable) {
            onTap();
          }
        },
        child: Container(
          decoration: BoxDecoration(
            color: isDisable ? cLightText.withOpacity(0.4) : cPrimary,
            borderRadius: BorderRadius.circular(12),
            // boxShadow: kMyBoxShadow,
          ),
          padding: const EdgeInsets.symmetric(vertical: 15),
          margin: const EdgeInsets.only(bottom: 15, top: 15),
          alignment: Alignment.center,
          width: double.infinity,
          child: Text(
            text.tr,
            style: MyTextStyle.gilroySemiBold(color: cOnPrimary),
          ),
        ));
  }
}

enum EmailSignInType { signIn, signUp, forgot }

class SecureTextField extends StatefulWidget {
  final String placeHolder;
  final TextEditingController controller;

  const SecureTextField({Key? key, required this.placeHolder, required this.controller}) : super(key: key);

  @override
  State<SecureTextField> createState() => _SecureTextFieldState();
}

class _SecureTextFieldState extends State<SecureTextField> {
  bool isShowPassword = true;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        MyTextField(
          controller: widget.controller,
          placeHolder: widget.placeHolder,
          obscureText: isShowPassword,
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          height: 45,
          child: Row(
            children: [
              const Spacer(),
              GestureDetector(
                onTap: () {
                  setState(() {
                    isShowPassword = !isShowPassword;
                  });
                },
                child: Icon(
                  isShowPassword ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                  color: cLightText,
                ),
              )
            ],
          ),
        )
      ],
    );
  }
}
