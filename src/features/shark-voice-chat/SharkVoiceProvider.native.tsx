import React, { type ComponentType } from 'react';
// Type-only import: `@elevenlabs/react-native` pulls the native LiveKit/WebRTC
// SDK, whose module factory throws at EVALUATION in the production Hermes
// bundle. A static `import` here poisons the whole call-screen module graph —
// `require('ModuleComprehensionCallScreen')` then resolves to `undefined`
// (the prod crash). Load the runtime via require() inside the body so the SDK
// only evaluates when the provider actually mounts (i.e. at call time), never
// at module load. Same idiom as useElevenLabsConversation.web.ts.
import type { ConversationProviderProps } from '@elevenlabs/react-native';

/**
 * Mounts the ElevenLabs RN SDK's React context so `useConversation` works
 * inside the tree. Required wrapper for any screen that drives a native
 * voice session.
 */
export function SharkVoiceProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ConversationProvider } = require('@elevenlabs/react-native') as {
    ConversationProvider: ComponentType<ConversationProviderProps>;
  };
  return <ConversationProvider>{children}</ConversationProvider>;
}
