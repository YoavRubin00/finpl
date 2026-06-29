import React, { useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tapHaptic } from '../../../utils/haptics';
import { useIsPro } from '../../subscription/useSubscription';
import { useTutorialStore } from '../../../stores/useTutorialStore';
import { ModuleComprehensionReportScreen } from '../../shark-voice-chat/ModuleComprehensionReportScreen';
import { SharkVoicePrivacyConsentModal } from '../../shark-voice-chat/components/SharkVoicePrivacyConsentModal';
import { LIVE_VOICE_AVAILABLE } from '../../shark-voice-chat/liveVoiceConfig';

type Phase = 'closed' | 'consent' | 'call' | 'report';

// The live-call screen pulls the native ElevenLabs/WebRTC SDK at module load.
// Defer that native import to call-time via a render-time require() — the same
// proven pattern as app/shark-voice.tsx. React.lazy's dynamic import resolved to
// `undefined` in the production Hermes bundle ("Lazy element type must resolve to
// a class or function" crash) the first time a call was actually started. On
// flag=false (OTA) bundles `available` is false so this never renders.
function CallScreenHost(props: { moduleId: string; moduleTitle: string; onComplete: () => void }): React.ReactElement {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ModuleComprehensionCallScreen } =
    require('../../shark-voice-chat/ModuleComprehensionCallScreen') as typeof import('../../shark-voice-chat/ModuleComprehensionCallScreen');
  return <ModuleComprehensionCallScreen {...props} />;
}

export interface ModuleSharkCall {
  /** Live-voice SDK present in this binary (OTA-safety gate). */
  available: boolean;
  /** Pro, or the one free trial is still unused. */
  eligible: boolean;
  /** Launch the flow: pricing upsell when not eligible, else consent (first
   *  time only) → live call → comprehension report. */
  openCall: () => void;
  /** The call/report fullScreen Modal + the one-time privacy-consent modal.
   *  Render this ONCE wherever the launcher lives. Null on flag=false bundles. */
  modals: React.ReactElement | null;
}

/**
 * Shared launcher for the module comprehension "שיחה עם שארק" live call.
 * Owns the phase machine, Pro/free-trial eligibility, the one-time privacy
 * consent, and the call→report Modal — so BOTH the on-map call card
 * (ModuleSharkCallCard) and the chest-completion button (ChestCelebrationModal
 * via TopicTreeAccordion) drive the exact same flow without duplicating it.
 */
export function useModuleSharkCall(moduleId: string, moduleTitle: string): ModuleSharkCall {
  const isPro = useIsPro();
  const hasUsedFreeSharkCall = useTutorialStore((s) => s.hasUsedFreeSharkCall);
  const markFreeSharkCallUsed = useTutorialStore((s) => s.markFreeSharkCallUsed);
  const hasAcceptedSharkVoicePrivacy = useTutorialStore((s) => s.hasAcceptedSharkVoicePrivacy);
  const markSharkVoicePrivacyAccepted = useTutorialStore((s) => s.markSharkVoicePrivacyAccepted);

  const [phase, setPhase] = useState<Phase>('closed');

  // The free voice check is ONE per non-Pro user, on ANY module of their choice.
  const eligible = isPro || !hasUsedFreeSharkCall;
  const available = LIVE_VOICE_AVAILABLE;

  // Consume the single free trial (any module; Pro is unlimited), then open the
  // live call. Called either directly (already-consented) or from consent.
  const startCall = () => {
    if (!isPro) markFreeSharkCallUsed();
    setPhase('call');
  };

  const openCall = () => {
    tapHaptic();
    if (!available) return;
    if (!eligible) {
      // Not Pro (and no free trial left) → straight to the Pro conversion screen.
      router.push('/pricing?source=pro_gate_shark-voice' as never);
      return;
    }
    // First-ever call → one-time voice-privacy consent before connecting.
    if (!hasAcceptedSharkVoicePrivacy) {
      setPhase('consent');
      return;
    }
    startCall();
  };

  const modals = !available ? null : (
    <>
      <Modal
        visible={phase === 'call' || phase === 'report'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPhase('closed')}
      >
        {phase === 'call' ? (
          <CallScreenHost
            moduleId={moduleId}
            moduleTitle={moduleTitle}
            onComplete={() => setPhase('report')}
          />
        ) : phase === 'report' ? (
          <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
            <ModuleComprehensionReportScreen
              moduleId={moduleId}
              moduleTitle={moduleTitle}
              onDone={() => setPhase('closed')}
            />
          </SafeAreaView>
        ) : null}
      </Modal>

      <SharkVoicePrivacyConsentModal
        visible={phase === 'consent'}
        onAccept={() => {
          markSharkVoicePrivacyAccepted();
          startCall();
        }}
        onDecline={() => setPhase('closed')}
      />
    </>
  );

  return { available, eligible, openCall, modals };
}

const styles = StyleSheet.create({
  modalSafe: { flex: 1, backgroundColor: '#0b1735' },
});
