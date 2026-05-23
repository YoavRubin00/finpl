import { useCallback, useEffect } from 'react';
import { useSharkVoiceStore } from '../useSharkVoiceStore';

/**
 * Native stub. `@elevenlabs/client` is a web-only SDK whose top-level code
 * reads `navigator.userAgent.includes(...)` — that crashes on Android/iOS
 * where `navigator` is undefined. Metro resolves
 * `useElevenLabsConversation` to this file on native builds (via the
 * platform-extension convention), and to `useElevenLabsConversation.web.ts`
 * on web, so the SDK never ends up in the native bundle at all.
 */
export function useElevenLabsConversation() {
  const setError = useSharkVoiceStore((s) => s.setError);
  const setStatus = useSharkVoiceStore((s) => s.setStatus);

  const connect = useCallback(async () => {
    setError('שיחת הקול זמינה כרגע רק בגרסת ה-Web. בקרוב גם במובייל.');
  }, [setError]);

  const disconnect = useCallback(async () => {
    setStatus('idle');
  }, [setStatus]);

  const toggleMute = useCallback((_muted: boolean) => {
    // no-op on native
  }, []);

  useEffect(() => {
    return () => { setStatus('idle'); };
  }, [setStatus]);

  return { connect, disconnect, toggleMute };
}
