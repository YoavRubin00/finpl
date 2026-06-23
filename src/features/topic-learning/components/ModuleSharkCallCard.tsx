import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
// Scattered ✦ accents — same premium language as ProUpsellCard (Profile).
const STAR_DECOR = [
  { top: 8, left: 14, size: 7 },
  { top: 17, left: 74, size: 9 },
  { top: 9, left: 150, size: 7 },
  { top: 22, left: 214, size: 10 },
];

// The live-call screen pulls the native ElevenLabs/WebRTC SDK at module load.
// Defer that native import to call-time via a render-time require() — the same
// proven pattern as app/shark-voice.tsx. React.lazy's dynamic import resolved to
// `undefined` in the production Hermes bundle ("Lazy element type must resolve to
// a class or function" crash) the first time a call was actually started. On
// flag=false (OTA) bundles the card returns null before CallScreenHost ever
// renders, so the native module is never evaluated there.
function CallScreenHost(props: { moduleId: string; moduleTitle: string; onComplete: () => void }): React.ReactElement {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ModuleComprehensionCallScreen } =
    require('../../shark-voice-chat/ModuleComprehensionCallScreen') as typeof import('../../shark-voice-chat/ModuleComprehensionCallScreen');
  return <ModuleComprehensionCallScreen {...props} />;
}

interface Props {
  moduleId: string;
  moduleTitle: string;
}

type Phase = 'closed' | 'consent' | 'call' | 'report';

/**
 * "שיחה עם שארק" card pinned beside the report card at the bottom of
 * a module's topic-tree accordion. The live call is the expensive ElevenLabs
 * part, so it's Pro-only — with ONE free trial the user can spend on ANY module
 * of their choice. The ~45s call ends → its transcript flows into the
 * (already-built) comprehension report, which is shown right after in the same
 * modal.
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

  // The free voice check is ONE per non-Pro user, on ANY module of their choice.
  // Once used, every module's card flips to the GO PRO upsell.
  const eligible = isPro || !hasUsedFreeSharkCall;

  // Consume the single free trial (any module; Pro is unlimited), then open
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
        accessibilityLabel={eligible ? 'שיחה עם שארק' : 'שדרגו ל-PRO לשיחה עם שארק'}
        style={({ pressed }) => pressed && styles.cardPressed}
      >
        <LinearGradient
          colors={['#0a2540', '#164e63', '#0a2540']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {STAR_DECOR.map((s, i) => (
            <Text
              key={i}
              style={[styles.star, { top: s.top, left: s.left, fontSize: s.size, color: i % 2 === 0 ? '#facc15' : '#67e8f9' }]}
              accessible={false}
            >✦</Text>
          ))}
          <View style={styles.iconWrap}>
            <ExpoImage source={SHARK_TALKING} style={{ width: 46, height: 46 }} contentFit="contain" accessible={false} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[RTL, styles.kicker, { color: eligible ? '#67e8f9' : '#facc15' }]} numberOfLines={1}>
              {eligible ? 'בדיקת הבנה קולית' : 'פיצ׳ר PRO'}
            </Text>
            <Text style={[RTL, styles.title]} numberOfLines={1}>שיחה עם שארק</Text>
            <Text style={[RTL, styles.subtitle]} numberOfLines={1}>
              {eligible ? 'שארק שואל, אתה עונה' : 'שארק יבדוק אם הבנת את החומר'}
            </Text>
          </View>
          {eligible ? (
            <View style={styles.ctaChip}>
              <Text style={styles.ctaText}>התחל</Text>
              <ChevronLeft size={16} color="#0a2540" strokeWidth={2.8} />
            </View>
          ) : (
            <View style={styles.proChip}>
              <LottieView source={PRO_LOTTIE} autoPlay loop style={{ width: 22, height: 22 }} />
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>

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
    padding: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.35)',
    shadowColor: '#0a2540',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  star: { position: 'absolute', opacity: 0.6 },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(14,116,144,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.5)',
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textAlign: 'right', textTransform: 'uppercase' },
  title: { color: '#ffffff', fontSize: 16, fontWeight: '900', textAlign: 'right', marginTop: 1 },
  subtitle: { color: 'rgba(103,232,249,0.85)', fontSize: 12, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  ctaChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#facc15',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  ctaText: { color: '#0a2540', fontSize: 14, fontWeight: '900' },
  proChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(250,204,21,0.15)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(250,204,21,0.5)',
  },
  proText: { color: '#facc15', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  modalSafe: { flex: 1, backgroundColor: '#0b1735' },
});
