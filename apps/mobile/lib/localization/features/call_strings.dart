// Voice/video call strings (Agora) for the 1.1.0 feature expansion. Owner: Mobile-D.
//
// Rules: every key VALUE starts with "call_" (non-Hindi language maps are
// `const`; equal keys would not compile). Add each key to callStringsEn and,
// when available, to callStringsHi (Hindi falls back to English per key).
// Use with GetX: `CallKeys.voiceCall.tr`.

abstract class CallKeys {
  static const voiceCall = 'call_voiceCall';
  static const videoCall = 'call_videoCall';
  static const callHistory = 'call_callHistory';
}

const Map<String, String> callStringsEn = {
  CallKeys.voiceCall: 'Voice call',
  CallKeys.videoCall: 'Video call',
  CallKeys.callHistory: 'Call history',
};

const Map<String, String> callStringsHi = {
  CallKeys.voiceCall: 'वॉइस कॉल',
  CallKeys.videoCall: 'वीडियो कॉल',
  CallKeys.callHistory: 'कॉल इतिहास',
};
