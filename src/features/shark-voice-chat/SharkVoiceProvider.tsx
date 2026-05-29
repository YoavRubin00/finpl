import React from 'react';

/**
 * Web fallback — the web ElevenLabs SDK is imperative and doesn't need a
 * React context provider, so this is a pass-through. The native sibling
 * `SharkVoiceProvider.native.tsx` wraps the tree in the SDK's
 * `<ConversationProvider>` (required by `useConversation`).
 */
export function SharkVoiceProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  return <>{children}</>;
}
