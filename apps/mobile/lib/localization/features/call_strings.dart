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

  // Call screens
  static const calling = 'call_calling';
  static const ringing = 'call_ringing';
  static const connecting = 'call_connecting';
  static const incomingVoiceCall = 'call_incomingVoiceCall';
  static const incomingVideoCall = 'call_incomingVideoCall';
  static const accept = 'call_accept';
  static const decline = 'call_decline';
  static const cancel = 'call_cancel';
  static const end = 'call_end';
  static const mute = 'call_mute';
  static const unmute = 'call_unmute';
  static const speaker = 'call_speaker';
  static const flipCamera = 'call_flipCamera';
  static const cameraOff = 'call_cameraOff';
  static const cameraOn = 'call_cameraOn';
  static const waitingForOther = 'call_waitingForOther';

  // Outcomes / errors
  static const callEnded = 'call_callEnded';
  static const callDeclined = 'call_callDeclined';
  static const noAnswer = 'call_noAnswer';
  static const missedCall = 'call_missedCall';
  static const busy = 'call_busy';
  static const offline = 'call_offline';
  static const notConnected = 'call_notConnected';
  static const unavailable = 'call_unavailable';
  static const failed = 'call_failed';
  static const noInternet = 'call_noInternet';
  static const alreadyInCall = 'call_alreadyInCall';
  static const micPermission = 'call_micPermission';
  static const cameraPermission = 'call_cameraPermission';
  static const openSettings = 'call_openSettings';

  // Call history
  static const outgoing = 'call_outgoing';
  static const incoming = 'call_incoming';
  static const missed = 'call_missed';
  static const declined = 'call_declined';
  static const callBack = 'call_callBack';
  static const noCallsTitle = 'call_noCallsTitle';
  static const noCallsMessage = 'call_noCallsMessage';
  static const unknownMember = 'call_unknownMember';
}

const Map<String, String> callStringsEn = {
  CallKeys.voiceCall: 'Voice call',
  CallKeys.videoCall: 'Video call',
  CallKeys.callHistory: 'Call history',
  CallKeys.calling: 'Calling…',
  CallKeys.ringing: 'Ringing…',
  CallKeys.connecting: 'Connecting…',
  CallKeys.incomingVoiceCall: 'Incoming voice call',
  CallKeys.incomingVideoCall: 'Incoming video call',
  CallKeys.accept: 'Accept',
  CallKeys.decline: 'Decline',
  CallKeys.cancel: 'Cancel',
  CallKeys.end: 'End',
  CallKeys.mute: 'Mute',
  CallKeys.unmute: 'Unmute',
  CallKeys.speaker: 'Speaker',
  CallKeys.flipCamera: 'Flip',
  CallKeys.cameraOff: 'Camera off',
  CallKeys.cameraOn: 'Camera on',
  CallKeys.waitingForOther: 'Waiting for the other person to join…',
  CallKeys.callEnded: 'Call ended',
  CallKeys.callDeclined: 'Call declined',
  CallKeys.noAnswer: 'No answer',
  CallKeys.missedCall: 'Missed call',
  CallKeys.busy: 'This member is on another call',
  CallKeys.offline: 'This member is not reachable right now. Please try again later.',
  CallKeys.notConnected: 'Calls are only available between accepted connections',
  CallKeys.unavailable: 'Calls are not available right now. Please try again later.',
  CallKeys.failed: 'Could not connect the call. Please try again.',
  CallKeys.noInternet: 'You are offline. Check your internet connection and try again.',
  CallKeys.alreadyInCall: 'You are already on a call',
  CallKeys.micPermission: 'Allow microphone access to make and receive calls',
  CallKeys.cameraPermission: 'Allow camera and microphone access for video calls',
  CallKeys.openSettings: 'Settings',
  CallKeys.outgoing: 'Outgoing',
  CallKeys.incoming: 'Incoming',
  CallKeys.missed: 'Missed',
  CallKeys.declined: 'Declined',
  CallKeys.callBack: 'Call back',
  CallKeys.noCallsTitle: 'No calls yet',
  CallKeys.noCallsMessage: 'Voice and video calls with your connections will show up here.',
  CallKeys.unknownMember: 'Member',
};

const Map<String, String> callStringsHi = {
  CallKeys.voiceCall: 'वॉइस कॉल',
  CallKeys.videoCall: 'वीडियो कॉल',
  CallKeys.callHistory: 'कॉल इतिहास',
  CallKeys.calling: 'कॉल किया जा रहा है…',
  CallKeys.ringing: 'घंटी बज रही है…',
  CallKeys.connecting: 'कनेक्ट हो रहा है…',
  CallKeys.incomingVoiceCall: 'आने वाली वॉइस कॉल',
  CallKeys.incomingVideoCall: 'आने वाली वीडियो कॉल',
  CallKeys.accept: 'स्वीकार करें',
  CallKeys.decline: 'अस्वीकार करें',
  CallKeys.cancel: 'रद्द करें',
  CallKeys.end: 'समाप्त',
  CallKeys.mute: 'म्यूट',
  CallKeys.unmute: 'अनम्यूट',
  CallKeys.speaker: 'स्पीकर',
  CallKeys.flipCamera: 'कैमरा बदलें',
  CallKeys.cameraOff: 'कैमरा बंद',
  CallKeys.cameraOn: 'कैमरा चालू',
  CallKeys.waitingForOther: 'दूसरे व्यक्ति के जुड़ने की प्रतीक्षा…',
  CallKeys.callEnded: 'कॉल समाप्त',
  CallKeys.callDeclined: 'कॉल अस्वीकार की गई',
  CallKeys.noAnswer: 'कोई जवाब नहीं',
  CallKeys.missedCall: 'मिस्ड कॉल',
  CallKeys.busy: 'यह सदस्य दूसरी कॉल पर है',
  CallKeys.offline: 'यह सदस्य अभी उपलब्ध नहीं है। कृपया बाद में प्रयास करें।',
  CallKeys.notConnected: 'कॉल केवल स्वीकृत कनेक्शन के बीच ही हो सकती है',
  CallKeys.unavailable: 'कॉल अभी उपलब्ध नहीं है। कृपया बाद में प्रयास करें।',
  CallKeys.failed: 'कॉल कनेक्ट नहीं हो सकी। कृपया फिर से प्रयास करें।',
  CallKeys.noInternet: 'आप ऑफ़लाइन हैं। अपना इंटरनेट कनेक्शन जांचें और फिर से प्रयास करें।',
  CallKeys.alreadyInCall: 'आप पहले से एक कॉल पर हैं',
  CallKeys.micPermission: 'कॉल करने और प्राप्त करने के लिए माइक्रोफ़ोन की अनुमति दें',
  CallKeys.cameraPermission: 'वीडियो कॉल के लिए कैमरा और माइक्रोफ़ोन की अनुमति दें',
  CallKeys.openSettings: 'सेटिंग्स',
  CallKeys.outgoing: 'आउटगोइंग',
  CallKeys.incoming: 'इनकमिंग',
  CallKeys.missed: 'मिस्ड',
  CallKeys.declined: 'अस्वीकृत',
  CallKeys.callBack: 'वापस कॉल करें',
  CallKeys.noCallsTitle: 'अभी तक कोई कॉल नहीं',
  CallKeys.noCallsMessage: 'आपके कनेक्शन के साथ वॉइस और वीडियो कॉल यहां दिखेंगी।',
  CallKeys.unknownMember: 'सदस्य',
};
