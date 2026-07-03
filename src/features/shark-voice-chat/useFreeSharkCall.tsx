import React, { useState } from 'react';
import { Modal } from 'react-native';
import { router } from 'expo-router';
import { tapHaptic } from '../../utils/haptics';
import { useIsPro } from '../subscription/useSubscription';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { SharkVoicePrivacyConsentModal } from './components/SharkVoicePrivacyConsentModal';
import { LIVE_VOICE_AVAILABLE } from './liveVoiceConfig';
import { captureEvent } from '../../lib/posthog';

type Phase = 'closed' | 'consent' | 'call';

// Defer the native ElevenLabs/WebRTC import to call-time via a render-time
// require() — the proven pattern from useModuleSharkCall (React.lazy resolved
// to undefined in the production Hermes bundle and crashed the first call).
function FreeChatCallHost(props: { onComplete: () => void }): React.ReactElement {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FreeChatCallScreen } =
    require('./FreeChatCallScreen') as typeof import('./FreeChatCallScreen');
  return <FreeChatCallScreen {...props} />;
}

export interface FreeSharkCall {
  /** Live-voice SDK present in this binary (OTA-safety gate). */
  available: boolean;
  /** PRO ONLY (Yoav 2026-07-03) — no free trial on the chat call; non-Pro
   *  taps route to the pricing screen. */
  isPro: boolean;
  /** Launch: pricing upsell when not Pro, else consent (first time) → call. */
  openCall: () => void;
  /** The call Modal + one-time privacy consent. Render ONCE at the launcher. */
  modals: React.ReactElement | null;
}

/**
 * Launcher for the CHAT tab's free-form live Captain Shark call — same phase
 * machine as useModuleSharkCall minus the report phase and minus the free
 * trial: this surface is a Pro perk (and a conversion moment for everyone
 * else).
 */
export function useFreeSharkCall(): FreeSharkCall {
  const isPro = useIsPro();
  const hasAcceptedSharkVoicePrivacy = useTutorialStore((s) => s.hasAcceptedSharkVoicePrivacy);
  const markSharkVoicePrivacyAccepted = useTutorialStore((s) => s.markSharkVoicePrivacyAccepted);

  const [phase, setPhase] = useState<Phase>('closed');
  const available = LIVE_VOICE_AVAILABLE;

  const openCall = (): void => {
    tapHaptic();
    if (!available) return;
    try { captureEvent('chat_live_call_tapped', { is_pro: isPro }); } catch { /* non-fatal */ }
    if (!isPro) {
      router.push('/pricing?source=pro_gate_chat-live-call' as never);
      return;
    }
    if (!hasAcceptedSharkVoicePrivacy) {
      setPhase('consent');
      return;
    }
    setPhase('call');
  };

  const modals = !available ? null : (
    <>
      <Modal
        visible={phase === 'call'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPhase('closed')}
      >
        {phase === 'call' ? (
          <FreeChatCallHost onComplete={() => setPhase('closed')} />
        ) : null}
      </Modal>

      <SharkVoicePrivacyConsentModal
        visible={phase === 'consent'}
        onAccept={() => {
          markSharkVoicePrivacyAccepted();
          setPhase('call');
        }}
        onDecline={() => setPhase('closed')}
      />
    </>
  );

  return { available, isPro, openCall, modals };
}
