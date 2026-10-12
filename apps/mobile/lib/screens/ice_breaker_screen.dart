/*
=============================================================================
AI-POWERED MINDSET COMPATIBILITY ANALYZER - FUTURISTIC MATRIMONIAL GAME
=============================================================================

🤖 WHAT THIS GAME IS ABOUT:
---------------------------
This is an advanced AI-powered compatibility assessment system designed for
modern matrimonial connections. Unlike traditional dating, this game:

✨ ANALYZES YOUR MINDSET: Uses AI to understand your psychological patterns,
   values, and relationship preferences through carefully crafted questions.

🧠 INTELLIGENT MATCHING: Our neural network processes thousands of data points
   to find someone whose mindset truly complements yours.

🔮 PREDICTIVE COMPATIBILITY: Goes beyond surface-level matching to predict
   long-term relationship success based on psychological compatibility.

🎯 ANONYMOUS DISCOVERY: Connect authentically without bias - reveal identities
   only after confirming deep compatibility.

💡 REAL-TIME ADAPTATION: AI learns from your responses and adapts questions
   to dive deeper into your unique personality profile.

🔬 SCIENCE-BACKED: Based on relationship psychology research and machine
   learning algorithms trained on successful long-term partnerships.

GAME FLOW: AI Scanning → Mindset Analysis → Neural Matching → Identity Reveal
=============================================================================
*/

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/screens/profile_screen/profile_screen.dart';

import 'chats_screen/socketservice.dart';

class IceBreakerScreen extends StatefulWidget {
  const IceBreakerScreen({Key? key}) : super(key: key);

  @override
  State<IceBreakerScreen> createState() => _IceBreakerScreenState();
}

class _IceBreakerScreenState extends State<IceBreakerScreen> with TickerProviderStateMixin {
  // Animation Controllers
  late AnimationController _scanController;
  late AnimationController _pulseController;
  late AnimationController _questionController;
  late AnimationController _progressController;
  late AnimationController _neuralController;
  late AnimationController _glowController;

  // Animations
  late Animation<double> _scanAnimation;
  late Animation<double> _pulseAnimation;
  late Animation<double> _questionAnimation;
  late Animation<double> _progressAnimation;
  late Animation<double> _neuralAnimation;
  late Animation<double> _glowAnimation;

  // Game States
  String gameState = 'scanning'; // scanning → analyzing → matching → playing → results → completed
  String? gameId;
  String? partnerId;
  Map<String, dynamic>? partnerInfo;
  List<Map<String, dynamic>> questions = [];
  int currentQuestionIndex = 0;
  Map<String, String> myAnswers = {};
  Map<String, String> partnerAnswers = {};
  int matchScore = 0;
  bool canRevealIdentity = false;
  int timeRemaining = 30;
  int queuePosition = 0;

  // AI Analysis variables
  List<String> aiAnalysisTexts = [
    "Scanning your mindset patterns...",
    "Analyzing psychological preferences...",
    "Processing compatibility vectors...",
    "Mapping relationship values...",
    "Calibrating neural networks...",
  ];
  int currentAnalysisIndex = 0;
  double analysisProgress = 0.0;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _setupSocketListeners();
    _startAIAnalysis();
  }

  @override
  void dispose() {
    // ⚡ Properly dispose all animation controllers to prevent memory leaks
    _scanController.dispose();
    _pulseController.dispose();
    _questionController.dispose();
    _progressController.dispose();
    _neuralController.dispose();
    _glowController.dispose();
    
    // ⚡ Remove socket listeners to prevent memory leaks
    SocketService.shared.socket.off('icebreaker:game_found');
    SocketService.shared.socket.off('icebreaker:question');
    SocketService.shared.socket.off('icebreaker:partner_answered');
    SocketService.shared.socket.off('icebreaker:results');
    SocketService.shared.socket.off('icebreaker:partner_revealed');
    SocketService.shared.socket.off('icebreaker:queue_position');
    
    super.dispose();
  }

  void _initializeAnimations() {
    _scanController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat();

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);

    _questionController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _progressController = AnimationController(
      duration: const Duration(seconds: 30),
      vsync: this,
    );

    _neuralController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();

    _glowController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);

    // Animation definitions
    _scanAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _scanController, curve: Curves.easeInOut),
    );

    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _questionAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _questionController, curve: Curves.easeOutBack),
    );

    _progressAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _progressController, curve: Curves.linear),
    );

    _neuralAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _neuralController, curve: Curves.easeInOut),
    );

    _glowAnimation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _glowController, curve: Curves.easeInOut),
    );
  }

  void _startAIAnalysis() {
    // Simulate AI analysis phases
    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      _updateAnalysisProgress();
    });
  }

  void _updateAnalysisProgress() {
    if (!mounted || gameState != 'scanning') return;

    setState(() {
      analysisProgress += 0.2;
      if (analysisProgress <= 1.0) {
        currentAnalysisIndex = (analysisProgress * aiAnalysisTexts.length).floor().clamp(0, aiAnalysisTexts.length - 1);
      }
    });

    if (analysisProgress >= 1.0) {
      Future.delayed(const Duration(milliseconds: 800), () {
        if (mounted) {
          setState(() {
            gameState = 'matching';
          });
          _joinGameQueue();
        }
      });
    } else {
      Future.delayed(const Duration(milliseconds: 800), _updateAnalysisProgress);
    }
  }

  void _setupSocketListeners() {
    final socket = SocketService.shared.socket;

    socket.on('game_found', (data) {
      if (!mounted) return;
      setState(() {
        gameState = 'waiting';
        gameId = data['gameId'];
        partnerId = data['partnerId'];
        questions = List<Map<String, dynamic>>.from(data['questions']);
      });
      _questionController.forward();
    });

    socket.on('game_started', (data) {
      if (!mounted) return;
      setState(() {
        gameState = 'playing';
        currentQuestionIndex = 0;
      });
      _startQuestionTimer();
    });

    socket.on('partner_answered', (data) {
      if (!mounted) return;
      setState(() {
        if (data['questionId'] != null) {
          partnerAnswers[data['questionId']] = 'answered';
        }
      });
    });

    socket.on('next_question', (data) {
      if (!mounted) return;
      if (currentQuestionIndex < questions.length - 1) {
        setState(() {
          currentQuestionIndex = data['questionIndex'] ?? (currentQuestionIndex + 1);
        });
        _startQuestionTimer();
      }
    });

    socket.on('game_results', (data) {
      if (!mounted) return;
      setState(() {
        gameState = 'results';
        matchScore = data['matchScore'] ?? 0;
        canRevealIdentity = data['canRevealIdentity'] ?? false;
        if (data['partnerInfo'] != null) {
          partnerInfo = data['partnerInfo'];
        }
      });
    });

    socket.on('partner_revealed', (data) {
      if (!mounted) return;
      setState(() {
        partnerInfo = data['partnerInfo'];
      });
    });

    socket.on('partner_disconnected', (data) {
      if (!mounted) return;
      Get.snackbar(
        'Neural Link Disrupted',
        'Partner disconnected from the system',
        snackPosition: SnackPosition.TOP,
        backgroundColor: const Color(0xFF64748B),
        colorText: Colors.white,
        borderRadius: 12,
        margin: const EdgeInsets.all(16),
      );
      _resetGame();
    });

    socket.on('queue_joined', (data) {
      if (!mounted) return;
      setState(() {
        queuePosition = data['position'] ?? 0;
      });
    });

    socket.on('error', (data) {
      if (!mounted) return;
      Get.snackbar(
        'System Error',
        data['message'] ?? 'Neural network error occurred',
        snackPosition: SnackPosition.TOP,
        backgroundColor: const Color(0xFFEF4444),
        colorText: Colors.white,
        borderRadius: 12,
        margin: const EdgeInsets.all(16),
      );
    });
  }

  void _joinGameQueue() {
    final user = SessionManager.shared.getUser();
    final socket = SocketService.shared.socket;

    socket.emit('join_icebreaker_queue', {'userId': user?.id, 'preferences': {}});
  }

  void _startQuestionTimer() {
    setState(() {
      timeRemaining = 30;
    });
    _progressController.reset();
    _progressController.forward();
    _questionController.reset();
    _questionController.forward();
  }

  void _submitAnswer(String answer) {
    if (gameState != 'playing' || currentQuestionIndex >= questions.length) return;

    final questionId = questions[currentQuestionIndex]['id'];
    setState(() {
      myAnswers[questionId] = answer;
    });

    final socket = SocketService.shared.socket;
    socket.emit('submit_answer', {
      'gameId': gameId,
      'questionId': questionId,
      'answer': answer,
    });
  }

  void _revealIdentity() {
    final socket = SocketService.shared.socket;
    socket.emit('reveal_identity', {'gameId': gameId});
  }

  void _viewPartnerProfile() {
    if (partnerInfo != null) {
      Get.to(() => ProfileScreen(userId: partnerInfo!['id']));
    }
  }

  void _playAgain() {
    _resetGame();
    setState(() {
      gameState = 'scanning';
      analysisProgress = 0.0;
      currentAnalysisIndex = 0;
    });
    _startAIAnalysis();
  }

  void _resetGame() {
    setState(() {
      gameState = 'scanning';
      gameId = null;
      partnerId = null;
      partnerInfo = null;
      questions.clear();
      currentQuestionIndex = 0;
      myAnswers.clear();
      partnerAnswers.clear();
      matchScore = 0;
      canRevealIdentity = false;
    });
  }

  void _leaveQueue() {
    final socket = SocketService.shared.socket;
    socket.emit('leave_icebreaker_queue');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0A0E1A), // Deep space blue
              Color(0xFF1A1F2E), // Darker blue
              Color(0xFF2D1B69), // Deep purple
              Color(0xFF0A0E1A), // Back to deep blue
            ],
            stops: [0.0, 0.3, 0.7, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildFuturisticHeader(),
              Expanded(
                child: _buildGameContent(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFuturisticHeader() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.8),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF3B82F6).withOpacity(0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF3B82F6).withOpacity(0.1),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: () {
                  if (gameState == 'matching') _leaveQueue();
                  Get.back();
                },
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF374151).withOpacity(0.5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF6B7280).withOpacity(0.3),
                    ),
                  ),
                  child: const Icon(
                    Icons.arrow_back_ios_new,
                    color: Color(0xFF9CA3AF),
                    size: 16,
                  ),
                ),
              ),
              const Spacer(),
              Column(
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedBuilder(
                        animation: _glowAnimation,
                        builder: (context, child) {
                          return Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              gradient: RadialGradient(
                                colors: [
                                  Color(0xFF3B82F6).withOpacity(_glowAnimation.value),
                                  Colors.transparent,
                                ],
                              ),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.psychology,
                              color: Color(0xFF60A5FA),
                              size: 18,
                            ),
                          );
                        },
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        "Neural Compatibility",
                        style: TextStyle(
                          color: Color(0xFFF8FAFC),
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF3B82F6).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: const Color(0xFF60A5FA).withOpacity(0.3),
                      ),
                    ),
                    child: const Text(
                      "AI-Powered Mindset Analysis",
                      style: TextStyle(
                        color: Color(0xFF93C5FD),
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              if (gameState == 'playing' && questions.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF3B82F6).withOpacity(0.5),
                        blurRadius: 8,
                        spreadRadius: 0,
                      ),
                    ],
                  ),
                  child: Text(
                    "${currentQuestionIndex + 1}/${questions.length}",
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
            ],
          ),
          if (gameState == 'playing' && questions.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFF374151),
                borderRadius: BorderRadius.circular(2),
              ),
              child: AnimatedBuilder(
                animation: _progressAnimation,
                builder: (context, child) {
                  return FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: _progressAnimation.value,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                        ),
                        borderRadius: BorderRadius.circular(2),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF3B82F6).withOpacity(0.5),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildGameContent() {
    switch (gameState) {
      case 'scanning':
        return _buildAIScanningState();
      case 'matching':
        return _buildNeuralMatchingState();
      case 'waiting':
        return _buildWaitingState();
      case 'playing':
        return _buildPlayingState();
      case 'results':
        return _buildResultsState();
      case 'completed':
        return _buildCompletedState();
      default:
        return _buildAIScanningState();
    }
  }

  Widget _buildAIScanningState() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // AI Scanning Visualization
          Stack(
            alignment: Alignment.center,
            children: [
              // Outer scanning rings
              ...List.generate(3, (index) {
                return AnimatedBuilder(
                  animation: _scanAnimation,
                  builder: (context, child) {
                    final delay = index * 0.3;
                    final animValue = (_scanAnimation.value + delay) % 1.0;
                    return Transform.scale(
                      scale: 1.0 + animValue * 0.3,
                      child: Container(
                        width: 200.0 + index * 30,
                        height: 200.0 + index * 30,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Color(0xFF3B82F6).withOpacity(1.0 - animValue),
                            width: 2,
                          ),
                        ),
                      ),
                    );
                  },
                );
              }),
              // Central scanning core
              AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _pulseAnimation.value,
                    child: Container(
                      width: 160,
                      height: 160,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            const Color(0xFF3B82F6).withOpacity(0.8),
                            const Color(0xFF1E40AF).withOpacity(0.4),
                            Colors.transparent,
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF3B82F6).withOpacity(0.5),
                            blurRadius: 30,
                            spreadRadius: 10,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.psychology,
                        size: 50,
                        color: Color(0xFF93C5FD),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 50),

          // AI Analysis Status
          Container(
            padding: const EdgeInsets.all(24),
            margin: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.8),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: const Color(0xFF3B82F6).withOpacity(0.3),
              ),
            ),
            child: Column(
              children: [
                const Text(
                  "AI Mindset Analysis",
                  style: TextStyle(
                    color: Color(0xFFF8FAFC),
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 16),

                // Progress bar
                Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: const Color(0xFF374151),
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: analysisProgress,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF3B82F6), Color(0xFF06B6D4)],
                        ),
                        borderRadius: BorderRadius.circular(3),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF3B82F6).withOpacity(0.5),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 500),
                  child: Text(
                    aiAnalysisTexts[currentAnalysisIndex],
                    key: ValueKey(currentAnalysisIndex),
                    style: const TextStyle(
                      color: Color(0xFF93C5FD),
                      fontSize: 14,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "${(analysisProgress * 100).round()}% Complete",
                  style: const TextStyle(
                    color: Color(0xFF60A5FA),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 30),

          // What AI is analyzing
          Container(
            padding: const EdgeInsets.all(20),
            margin: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A).withOpacity(0.6),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFF1E293B).withOpacity(0.5),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Neural Network Analysis:",
                  style: TextStyle(
                    color: Color(0xFFF1F5F9),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                _buildAnalysisItem("Emotional Intelligence Patterns", analysisProgress > 0.2),
                _buildAnalysisItem("Relationship Value System", analysisProgress > 0.4),
                _buildAnalysisItem("Communication Style Mapping", analysisProgress > 0.6),
                _buildAnalysisItem("Compatibility Vector Generation", analysisProgress > 0.8),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnalysisItem(String text, bool isActive) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive ? const Color(0xFF10B981) : const Color(0xFF374151),
              boxShadow: isActive
                  ? [
                      BoxShadow(
                        color: const Color(0xFF10B981).withOpacity(0.5),
                        blurRadius: 4,
                      ),
                    ]
                  : null,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            text,
            style: TextStyle(
              color: isActive ? const Color(0xFF93C5FD) : const Color(0xFF6B7280),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNeuralMatchingState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Neural Network Visualization
        Stack(
          alignment: Alignment.center,
          children: [
            // Animated neural connections
            AnimatedBuilder(
              animation: _neuralAnimation,
              builder: (context, child) {
                return CustomPaint(
                  size: const Size(300, 300),
                  painter: NeuralNetworkPainter(
                    animationValue: _neuralAnimation.value,
                    glowValue: _glowAnimation.value,
                  ),
                );
              },
            ),
            // Central processing unit
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF06B6D4),
                    const Color(0xFF0891B2),
                    const Color(0xFF0E7490),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF06B6D4).withOpacity(0.6),
                    blurRadius: 20,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: const Icon(
                Icons.hub_rounded,
                size: 40,
                color: Colors.white,
              ),
            ),
          ],
        ),
        const SizedBox(height: 40),

        Container(
          margin: const EdgeInsets.all(20),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withOpacity(0.8),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFF06B6D4).withOpacity(0.3),
            ),
          ),
          child: Column(
            children: [
              const Text(
                "Neural Matching in Progress",
                style: TextStyle(
                  color: Color(0xFFF8FAFC),
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                "Our AI is processing thousands of compatibility factors to find someone whose mindset complements yours perfectly.",
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 13,
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              if (queuePosition > 0) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF06B6D4).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF06B6D4).withOpacity(0.3),
                    ),
                  ),
                  child: Text(
                    "Queue Position: #$queuePosition",
                    style: const TextStyle(
                      color: Color(0xFF67E8F9),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 30),
        SizedBox(
          width: 200,
          height: 44,
          child: TextButton(
            onPressed: () {
              _leaveQueue();
              Get.back();
            },
            style: TextButton.styleFrom(
              backgroundColor: const Color(0xFF374151).withOpacity(0.8),
              foregroundColor: const Color(0xFF9CA3AF),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(
                  color: Color(0xFF4B5563),
                ),
              ),
            ),
            child: const Text(
              "Cancel Analysis",
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWaitingState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 160,
          height: 160,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [
                const Color(0xFF10B981).withOpacity(0.8),
                const Color(0xFF059669).withOpacity(0.4),
                Colors.transparent,
              ],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF10B981).withOpacity(0.5),
                blurRadius: 30,
                spreadRadius: 10,
              ),
            ],
          ),
          child: const Icon(
            Icons.link,
            size: 60,
            color: Color(0xFF6EE7B7),
          ),
        ),
        const SizedBox(height: 32),
        Container(
          margin: const EdgeInsets.all(20),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withOpacity(0.8),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFF10B981).withOpacity(0.3),
            ),
          ),
          child: Column(
            children: [
              const Text(
                "Neural Link Established!",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFFF8FAFC),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                "Perfect compatibility match found. Initializing mindset analysis protocol...",
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 13,
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPlayingState() {
    if (questions.isEmpty || currentQuestionIndex >= questions.length) {
      return const Center(
        child: CircularProgressIndicator(
          color: Color(0xFF3B82F6),
          strokeWidth: 2,
        ),
      );
    }

    final question = questions[currentQuestionIndex];

    return AnimatedBuilder(
      animation: _questionAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _questionAnimation.value,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const SizedBox(height: 20),

                // Question Container
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B).withOpacity(0.9),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: const Color(0xFF3B82F6).withOpacity(0.3),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF3B82F6).withOpacity(0.1),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          gradient: RadialGradient(
                            colors: [
                              const Color(0xFF3B82F6).withOpacity(0.3),
                              Colors.transparent,
                            ],
                          ),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.psychology_rounded,
                          color: Color(0xFF60A5FA),
                          size: 24,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        "Mindset Analysis",
                        style: TextStyle(
                          color: const Color(0xFF60A5FA),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        question['question'],
                        style: const TextStyle(
                          color: Color(0xFFF8FAFC),
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      ...List.generate(
                        question['options'].length,
                        (index) => _buildFuturisticOptionButton(
                          question['options'][index],
                          question['id'],
                          index,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                _buildAnswerStatus(),
                const SizedBox(height: 20),
                _buildAIInsight(),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildFuturisticOptionButton(String option, String questionId, int index) {
    final isSelected = myAnswers[questionId] == option;
    final colors = [
      const Color(0xFF3B82F6),
      const Color(0xFF10B981),
      const Color(0xFF8B5CF6),
      const Color(0xFFF59E0B),
    ];
    final selectedColor = colors[index % colors.length];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () => _submitAnswer(option),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected ? selectedColor.withOpacity(0.2) : const Color(0xFF0F172A).withOpacity(0.6),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? selectedColor : const Color(0xFF374151).withOpacity(0.5),
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: selectedColor.withOpacity(0.3),
                      blurRadius: 8,
                      spreadRadius: 1,
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSelected ? selectedColor : Colors.transparent,
                  border: Border.all(
                    color: isSelected ? selectedColor : const Color(0xFF6B7280),
                    width: 2,
                  ),
                ),
                child: isSelected
                    ? const Icon(
                        Icons.check,
                        size: 12,
                        color: Colors.white,
                      )
                    : null,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  option,
                  style: TextStyle(
                    color: isSelected ? selectedColor : const Color(0xFFD1D5DB),
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAnswerStatus() {
    final question = questions[currentQuestionIndex];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withOpacity(0.8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF1E293B).withOpacity(0.5),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildStatusIndicator(
            "Your Neural Pattern",
            myAnswers.containsKey(question['id']),
            const Color(0xFF3B82F6),
            Icons.account_circle_outlined,
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF06B6D4), Color(0xFF0891B2)],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              "SYNC",
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.white,
                fontSize: 10,
                letterSpacing: 1,
              ),
            ),
          ),
          _buildStatusIndicator(
            "Partner's Signal",
            partnerAnswers.containsKey(question['id']),
            const Color(0xFF8B5CF6),
            Icons.hub_rounded,
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIndicator(String label, bool isActive, Color color, IconData icon) {
    return Column(
      children: [
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isActive ? color.withOpacity(0.2) : const Color(0xFF374151).withOpacity(0.3),
            border: Border.all(
              color: isActive ? color : const Color(0xFF4B5563),
              width: 2,
            ),
            boxShadow: isActive
                ? [
                    BoxShadow(
                      color: color.withOpacity(0.3),
                      blurRadius: 8,
                      spreadRadius: 1,
                    ),
                  ]
                : null,
          ),
          child: Icon(
            isActive ? Icons.radio_button_checked : icon,
            color: isActive ? color : const Color(0xFF6B7280),
            size: 20,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: isActive ? color : const Color(0xFF6B7280),
            fontWeight: FontWeight.w500,
            fontSize: 10,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildAIInsight() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF065F46).withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF10B981).withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.auto_awesome,
            color: const Color(0xFF34D399),
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              "AI analyzes micro-patterns in your responses to build a comprehensive compatibility profile.",
              style: TextStyle(
                color: const Color(0xFF6EE7B7),
                fontSize: 12,
                fontWeight: FontWeight.w400,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResultsState() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const SizedBox(height: 20),

          // Main Results Container
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.9),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: const Color(0xFF3B82F6).withOpacity(0.3),
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF3B82F6).withOpacity(0.1),
                  blurRadius: 25,
                  spreadRadius: 3,
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.psychology_rounded, color: const Color(0xFF60A5FA), size: 24),
                    const SizedBox(width: 10),
                    const Text(
                      "Neural Compatibility Analysis",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFF8FAFC),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                // Compatibility Score Visualization
                Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 120,
                      height: 120,
                      child: CircularProgressIndicator(
                        value: matchScore / 100,
                        strokeWidth: 8,
                        backgroundColor: const Color(0xFF374151),
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getScoreColor(matchScore),
                        ),
                      ),
                    ),
                    Column(
                      children: [
                        Text(
                          "$matchScore%",
                          style: TextStyle(
                            color: _getScoreColor(matchScore),
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Text(
                          "Neural Sync",
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: _getScoreColor(matchScore).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _getScoreColor(matchScore).withOpacity(0.3),
                    ),
                  ),
                  child: Text(
                    _getAIMatchMessage(matchScore),
                    style: const TextStyle(
                      color: Color(0xFFD1D5DB),
                      fontSize: 13,
                      height: 1.4,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),

                if (canRevealIdentity && partnerInfo == null) ...[
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _revealIdentity,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF3B82F6),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        shadowColor: const Color(0xFF3B82F6).withOpacity(0.5),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.visibility_rounded, size: 18),
                          const SizedBox(width: 8),
                          const Text(
                            "Reveal Neural Identity",
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],

                if (partnerInfo != null) ...[
                  const SizedBox(height: 24),
                  _buildPartnerReveal(),
                ],
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: TextButton(
                    onPressed: _playAgain,
                    style: TextButton.styleFrom(
                      backgroundColor: const Color(0xFF374151).withOpacity(0.8),
                      foregroundColor: const Color(0xFF9CA3AF),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(
                          color: Color(0xFF4B5563),
                        ),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.refresh_rounded, size: 18),
                        const SizedBox(width: 8),
                        const Text(
                          "New Analysis",
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => Get.back(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF64748B),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      "Exit System",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPartnerReveal() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF065F46).withOpacity(0.3),
            const Color(0xFF047857).withOpacity(0.2),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF10B981).withOpacity(0.3),
        ),
      ),
      child: Column(
        children: [
          Stack(
            children: [
              ClipOval(
                child: MyCachedImage(
                  imageUrl: partnerInfo!['profile'],
                  width: 80,
                  height: 80,
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Icon(
                    Icons.verified_rounded,
                    color: Colors.white,
                    size: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            partnerInfo!['name'],
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Color(0xFFF8FAFC),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            "${partnerInfo!['age']} years • ${partnerInfo!['city']}",
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 40,
            child: ElevatedButton(
              onPressed: _viewPartnerProfile,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text(
                "Access Full Neural Profile",
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompletedState() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              gradient: RadialGradient(
                colors: [
                  const Color(0xFFF59E0B).withOpacity(0.6),
                  const Color(0xFFD97706).withOpacity(0.4),
                ],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFF59E0B).withOpacity(0.4),
                  blurRadius: 20,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: const Icon(
              Icons.celebration_rounded,
              size: 60,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 28),
          const Text(
            "Neural Analysis Complete",
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Color(0xFFF8FAFC),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            "Thank you for participating in our AI-powered compatibility assessment. Continue exploring meaningful connections through advanced neural matching.",
            style: TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 13,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () => Get.back(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                "Return to Neural Hub",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getScoreColor(int score) {
    if (score >= 80) return const Color(0xFF10B981);
    if (score >= 60) return const Color(0xFFF59E0B);
    return const Color(0xFFEF4444);
  }

  String _getAIMatchMessage(int score) {
    if (score >= 90) {
      return "Exceptional neural synchronization detected. Your mindset patterns show remarkable alignment across all psychological vectors.";
    } else if (score >= 80) {
      return "High compatibility index achieved. Strong neural resonance indicates excellent long-term relationship potential.";
    } else if (score >= 70) {
      return "Good mindset compatibility with complementary psychological patterns. Differences could enhance mutual growth.";
    } else if (score >= 60) {
      return "Moderate compatibility with interesting cognitive contrasts. Diverse perspectives offer unique connection opportunities.";
    } else {
      return "Distinct neural patterns detected. Sometimes contrasting mindsets create the most dynamic and growth-oriented partnerships.";
    }
  }
}

// Custom painter for neural network visualization
class NeuralNetworkPainter extends CustomPainter {
  final double animationValue;
  final double glowValue;

  NeuralNetworkPainter({
    required this.animationValue,
    required this.glowValue,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Color(0xFF06B6D4).withOpacity(0.6 + glowValue * 0.4)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.3;

    // Draw neural connections
    for (int i = 0; i < 8; i++) {
      final angle = (i * 45 + animationValue * 360) * (3.14159 / 180);
      final startPoint = Offset(
        center.dx + radius * 0.5 * math.cos(angle),
        center.dy + radius * 0.5 * math.sin(angle),
      );
      final endPoint = Offset(
        center.dx + radius * math.cos(angle),
        center.dy + radius * math.sin(angle),
      );

      canvas.drawLine(startPoint, endPoint, paint);

      // Draw neural nodes
      canvas.drawCircle(
          endPoint,
          4,
          Paint()
            ..color = Color(0xFF67E8F9).withOpacity(glowValue)
            ..style = PaintingStyle.fill);
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => true;
}
