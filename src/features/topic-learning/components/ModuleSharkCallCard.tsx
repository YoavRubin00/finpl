import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Phone, ChevronLeft } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import { useIsPro } from '../../subscription/useSubscription';
import { useUpgradeModalStore } from '../../../stores/useUpgradeModalStore';
import { useTutorialStore } from '../../../stores/useTutorialStore';
import { ModuleComprehensionCallScreen } from '../../shark-voice-chat/ModuleComprehensionCallScreen';
import { ModuleComprehensionReportScreen } from '../../shark-voice-chat/ModuleComprehensionReportScreen';

const RTL = { writingDirection: 'rtl' as const };
const PRO_LOTTIE = require('../../../../assets/lottie/Pro Animation 3rd.json');

interface Props {
  moduleId: string;
  moduleTitle: string;
}

type Phase = 'closed' | 'call' | 'report';

/**
 * "שיחה עם שארק · 45 שניות" card pinned beside the report card at the bottom of
 * a module's topic-tree accordion. The live call is the expensive ElevenLabs
 * part, so it's Pro-only — with ONE free trial on mod-0-2. The 45s call ends →
 * its transcript flows into the (already-built) comprehension report, which is
 * shown right after in the same modal.
 *
 * Non-eligible free users still see the card as a GO PRO upsell (Lottie).
 */
export function ModuleSharkCallCard({ moduleId, moduleTitle }: Props): React.ReactElement {
  const isPro = useIsPro();
  const hasUsedFreeSharkCall = useTutorialStore((s) => s.hasUsedFreeSharkCall);
  const markFreeSharkCallUsed = useTutorialStore((s) => s.markFreeSharkCallUsed);

  const [phase, setPhase] = useState<Phase>('closed');

  const eligible = isPro || (moduleId === 'mod-0-2' && !hasUsedFreeSharkCall);

  const onPress = () => {
    tapHaptic();
    if (!eligible) {
      useUpgradeModalStore.getState().show('shark-voice');
      return;
    }
    // Consume the single free trial on start (mod-0-2 only; Pro is unlimited).
    if (!isPro) markFreeSharkCallUsed();
    setPhase('call');
  };

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(320)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.iconWrap}>
          <Phone size={22} color="#0c4a6e" strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[RTL, styles.title]} numberOfLines={1}>שיחה עם שארק · 45 שניות</Text>
          <Text style={[RTL, styles.subtitle]} numberOfLines={1}>
            {eligible ? 'בדיקת הבנה קולית — שארק שואל, אתה עונה' : 'פיצ׳ר Pro · נסה שיחה חיה עם שארק'}
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
        visible={phase !== 'closed'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPhase('closed')}
      >
        {phase === 'call' ? (
          <ModuleComprehensionCallScreen
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
});
