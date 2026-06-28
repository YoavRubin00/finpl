import React, { type ComponentType } from 'react';
import { Platform, View, Text } from 'react-native';
// Type-only import: `@elevenlabs/react-native` pulls the native LiveKit/WebRTC
// SDK, whose module factory throws at EVALUATION in the production Hermes
// bundle — Metro then resolves `require('@elevenlabs/react-native')` to
// `undefined`, and destructuring `ConversationProvider` off it crashed the
// call screen (PostHog: TypeError "Cannot read property 'ConversationProvider'
// of undefined", Android only — web is immune, it uses @elevenlabs/client).
// Load the runtime via require() inside the body so the SDK only evaluates at
// call time, AND guard the result so a failed load degrades gracefully instead
// of resetting the app.
import type { ConversationProviderProps } from '@elevenlabs/react-native';
import { captureEvent } from '../../lib/posthog';
import { captureException } from '../../lib/sentry';

// One-shot diagnostic: when the SDK fails to load, find out WHICH layer throws
// (Metro swallows the real eval error, leaving only the downstream "undefined").
// Each require is isolated so we capture the first real failure + its message,
// and ship it to PostHog (`shark_voice_sdk_probe`). Runs once per session.
let probed = false;
function probeSdkOnce(): void {
  if (probed) return;
  probed = true;
  const r: Record<string, string> = {};
  const step = (key: string, fn: () => void) => {
    try {
      fn();
      r[key] = 'ok';
    } catch (e) {
      r[key] = String((e as Error)?.message ?? e).slice(0, 220);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  step('webrtc', () => { require('@livekit/react-native-webrtc'); });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  step('livekit', () => { require('@livekit/react-native'); });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  step('registerGlobals', () => { (require('@livekit/react-native') as { registerGlobals: () => void }).registerGlobals(); });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  step('elevenClientInternal', () => { require('@elevenlabs/client/internal'); });
  step('elevenRN', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@elevenlabs/react-native') as { ConversationProvider?: unknown } | undefined;
    if (!m) throw new Error('require returned undefined');
    if (!m.ConversationProvider) throw new Error('loaded but ConversationProvider missing');
  });
  try {
    captureEvent('shark_voice_sdk_probe', { platform: Platform.OS, ...r });
  } catch { /* non-fatal */ }
}

/**
 * Mounts the ElevenLabs RN SDK's React context so `useConversation` works
 * inside the tree. Required wrapper for any screen that drives a native
 * voice session. If the SDK can't be loaded on this device/build, renders a
 * graceful fallback instead of crashing the app, and reports the root cause.
 */
export function SharkVoiceProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  let ConversationProvider: ComponentType<ConversationProviderProps> | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@elevenlabs/react-native') as
      | { ConversationProvider?: ComponentType<ConversationProviderProps> }
      | undefined;
    ConversationProvider = mod?.ConversationProvider;
  } catch (e) {
    if (e instanceof Error) captureException(e, { feature: 'shark-voice', step: 'sdk-require' });
  }

  if (!ConversationProvider) {
    probeSdkOnce();
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0c1426' }}>
        <Text style={{ color: '#e2e8f0', fontSize: 16, fontWeight: '600', textAlign: 'center', writingDirection: 'rtl' }}>
          שיחת הקול אינה זמינה כרגע במכשיר הזה.
        </Text>
      </View>
    );
  }

  return <ConversationProvider>{children}</ConversationProvider>;
}
