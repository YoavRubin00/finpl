import React from 'react';
import { LIVE_VOICE_AVAILABLE } from '../src/features/shark-voice-chat/liveVoiceConfig';

// Lazy `require` (not a top-level import) so the native live-voice SDK
// (@elevenlabs/react-native → LiveKit/WebRTC) is NEVER evaluated in an OTA
// build that lacks it — the flag is false there. Nothing in-app navigates to
// this route today, so the null branch is belt-and-suspenders.
export default function SharkVoiceRoute(): React.ReactElement | null {
  if (!LIVE_VOICE_AVAILABLE) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SharkVoiceCallScreen } = require('../src/features/shark-voice-chat/SharkVoiceCallScreen');
  return <SharkVoiceCallScreen />;
}
