import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/screens/splash_screen/splash_controller.dart';
import 'package:video_player/video_player.dart';

class SplashScreenView extends StatefulWidget {
  const SplashScreenView({Key? key}) : super(key: key);

  @override
  State<SplashScreenView> createState() => _SplashScreenViewState();
}

class _SplashScreenViewState extends State<SplashScreenView> {
  late VideoPlayerController _videoController;
  late SplashController _splashController;

  /// The video listener keeps firing after the end; leave the splash only once.
  bool _proceeded = false;

  void _proceed() {
    if (_proceeded || !mounted) return;
    _proceeded = true;
    _splashController.fetchSettings();
  }

  @override
  void initState() {
    super.initState();
    _splashController = Get.put(SplashController());
    _initializeVideo();
  }

  void _initializeVideo() async {
    // Get system brightness to determine which video to use
    final brightness = WidgetsBinding.instance.platformDispatcher.platformBrightness;
    final isDarkMode = brightness == Brightness.dark;
    
    // Dark video is 5 seconds, will play at 1.5x speed
    // Light video is 3 seconds, will play at 1.0x speed
    final videoPath = isDarkMode 
        ? 'assets/images/splash_video_black.mp4' 
        : 'assets/images/splash_video_white.mp4';
    final playbackSpeed = isDarkMode ? 1.5 : 1.0;
    
    _videoController = VideoPlayerController.asset(
      videoPath,
      videoPlayerOptions: VideoPlayerOptions(
        mixWithOthers: true,
        allowBackgroundPlayback: false,
      ),
    );
    
    try {
      await _videoController.initialize();
      if (mounted) {
        setState(() {});
        await _videoController.setVolume(0);
        await _videoController.setLooping(false);
        await _videoController.setPlaybackSpeed(playbackSpeed);
        await _videoController.play();

        // Listen for video completion and navigate to next screen
        _videoController.addListener(() {
          if (_videoController.value.position >= _videoController.value.duration &&
              _videoController.value.duration.inMilliseconds > 0) {
            _proceed();
          }
        });
      }
    } catch (e) {
      debugPrint('Error initializing video: $e');
      // If video fails, proceed to next screen after a short delay
      if (mounted) {
        Future.delayed(const Duration(seconds: 2), _proceed);
      }
    }
  }

  @override
  void dispose() {
    _videoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final brightness = MediaQuery.of(context).platformBrightness;
    final backgroundColor = brightness == Brightness.dark ? Colors.black : Colors.white;
    
    return Scaffold(
      backgroundColor: backgroundColor,
      body: Center(
        child: _videoController.value.isInitialized
            ? AspectRatio(
                aspectRatio: _videoController.value.aspectRatio,
                child: VideoPlayer(_videoController),
              )
            : CircularProgressIndicator(
                color: brightness == Brightness.dark ? Colors.white : Colors.black,
              ),
      ),
    );
  }
}

