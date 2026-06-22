import React, { useState, Suspense } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import LottieView from 'lottie-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { tapHaptic } from '../../../utils/haptics';
import { useIsPro } from '../../subscription/useSubscription';
import { useTutorialStore } from '../../../stores/useTutorialStore';
import { ModuleComprehensionReportScreen } from '../../shark-voice-chat/ModuleComprehensionReportScreen';
import { SharkVoicePrivacyConsentModal } from '../../shark-voice-chat/components/SharkVoicePrivacyConsentModal';
import { LIVE_VOICE_AVAILABLE } from '../../shark-voice-chat/liveVoiceConfig';

const RTL = { writingDirection: 'rtl' as const };
const PRO_LOTTIE = require('../../../../assets/lottie/Pro Animation 3rd.json');
const SHARK_TALKING = require('../../../../assets/webp/shark-call-talking-1.webp');

// The live-call screen pulls the native ElevenLabs/WebRTC SDK at module load.
// Lazy-load it so this always-mounted card never evaluates that native import
// until the user actually starts a call — keeps the accordion crash-safe (and
// OTA-safe) on binaries built without the native module.
const ModuleComprehensionCallScreen = React.lazy(() =>
  import('../../shark-voice-chat/ModuleComprehensionCallScreen').then((m) => ({
    default: m.ModuleComprehensionCallScreen,
  })),
);

interface Props {
  moduleId: string;
  moduleTitle: string;
}

type Phase = 'closed' | 'consent' | 'call' | 'report';

/**
 * "שיחה עם שארק · 45 שניות" card pinned beside the report card at the bottom of
 * a module's topic-tree accordion. The live call is the expensive ElevenLabs
 * part, so it's Pro-only — with ONE free trial on mod-0-2. The 45s call ends →
 * its transcript flows into the (already-built) comprehension report, which is
 * shown right after in the same modal.
 *
 * Non-eligible free users still see the card as a GO PRO upsell (Lottie).
 */
export function ModuleSharkCallCard({ moduleId, moduleTitle }: Props): React.ReactElement | null {
  const isPro = useIsPro();
  const hasUsedFreeSharkCall = useTutorialStore((s) => s.hasUsedFreeSharkCall);
  const markFreeSharkCallUsed = useTutorialStore((s) => s.markFreeSharkCallUsed);
  const hasAcceptedSharkVoicePrivacy = useTutorialStore((s) => s.hasAcceptedSharkVoicePrivacy);
  const markSharkVoicePrivacyAccepted = useTutorialStore((s) => s.markSharkVoicePrivacyAccepted);

  const [phase, setPhase] = useState<Phase>('closed');

  const eligible = isPro || (moduleId === 'mod-0-2' && !hasUsedFreeSharkCall);

  // Consume the single free trial (mod-0-2 only; Pro is unlimited), then open
  // the live call. Called either directly (already-consented) or from consent.
  const startCall = () => {
    if (!isPro) markFreeSharkCallUsed();
    setPhase('call');
  };

  const onPress = () => {
    tapHaptic();
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

  // OTA-safety: on a binary without the native live-voice SDK this flag is
  // false → hide the call card entirely so its lazy native import never runs.
  if (!LIVE_VOICE_AVAILABLE) return null;

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(320)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.iconWrap}>
          <ExpoImage source={SHARK_TALKING} style={{ width: 44, height: 44 }} contentFit="contain" accessible={false} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[RTL, styles.title]} numberOfLines={1}>שיחה עם שארק</Text>
          <Text style={[RTL, styles.subtitle]} numberOfLines={1}>
            {eligible ? 'בדיקת הבנה קולית — שארק שואל, אתה עונה' : 'פיצ׳ר Pro · שארק יבדוק האם הבנתם את מה שלמדתם'}
          </Text>
        </View>
        {eligible ? (
          <View style={styles.ctaChip}>
            <Text style={styles.ctaText}>התחל</Text>
            <ChevronLeft size={16} color="#0c4a6e" strokeWidth={2.6} />
          </View>
        ) : (
          <View style={styles.proChip}>
            <LottieView source={PRO_LOTTIE} autoPlay loop style={{ width: 26, height: 26 }} />
            <Text style={styles.proText}>GO PRO</Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={phase === 'call' || phase === 'report'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPhase('closed')}
      >
        {phase === 'call' ? (
          <Suspense
            fallback={
              <View style={[styles.modalSafe, styles.modalLoading]}>
                <ActivityIndicator size="large" color="#67e8f9" />
              </View>
            }
          >
            <ModuleComprehensionCallScreen
              moduleId={moduleId}
              moduleTitle={moduleTitle}
              onComplete={() => setPhase('report')}
            />
          </Suspense>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#cffafe',
    borderWidth: 1,
    borderColor: '#22d3ee',
    shadowColor: '#0369a1',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#22d3ee',
  },
  title: { color: '#0c4a6e', fontSize: 15, fontWeight: '900' },
  subtitle: { color: '#0369a1', fontSize: 12, fontWeight: '700', marginTop: 2 },
  ctaChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#67e8f9',
  },
  ctaText: { color: '#0c4a6e', fontSize: 13, fontWeight: '800' },
  proChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0c4a6e',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  proText: { color: '#fde68a', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  modalSafe: { flex: 1, backgroundColor: '#0b1735' },
  modalLoading: { alignItems: 'center', justifyContent: 'center' },
});
