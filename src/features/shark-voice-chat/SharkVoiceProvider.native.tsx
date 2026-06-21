import React from 'react';
import { ConversationProvider } from '@elevenlabs/react-native';

/**
 * Mounts the ElevenLabs RN SDK's React context so `useConversation` works
 * inside the tree. Required wrapper for any screen that drives a native
 * voice session.
 */
export function SharkVoiceProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  return <ConversationProvider>{children}</ConversationProvider>;
}
