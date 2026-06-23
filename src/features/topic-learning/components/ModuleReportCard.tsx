import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import { useIsPro } from '../../subscription/useSubscription';
import { useUsageStore } from '../../subscription/useUsageStore';
import { useUpgradeModalStore } from '../../../stores/useUpgradeModalStore';
import { useModuleComprehensionStore } from '../../shark-voice-chat/useModuleComprehensionStore';
import { ModuleComprehensionReportScreen } from '../../shark-voice-chat/ModuleComprehensionReportScreen';
import { SHARK_CALL_IDLE } from '../../retention-loops/finnMascotConfig';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  moduleId: string;
  moduleTitle: string;
}

/**
 * "דוח סיכום שיעור" card pinned at the BOTTOM of a module's topic-tree
 * accordion. It serves two purposes at once:
 *   1. The end-of-lesson OFFER — appears right after the chest opens.
 *   2. The persistent RE-READ entry — stays there on every module re-tap.
 *
 * Gating is the weekly `lesson-report` quota (Free = 1/week, Pro = ∞):
 *   - report already generated → open it (no quota cost).
 *   - no report + has weekly quota → consume + open (the screen generates).
 *   - no report + quota spent (Free) → Pro upsell.
 *
 * Renders nothing for a module with neither a captured input-snapshot nor a
 * report (e.g. modules completed before this feature shipped — their
 * session-only learning data is already gone, so there's nothing to grade).
 */
export function ModuleReportCard({ moduleId, moduleTitle }: Props): React.ReactElement | null {
  const isPro = useIsPro();
  const stored = useModuleComprehensionStore((s) => s.reportsByModuleId[moduleId]);
  const inputs = useModuleComprehensionStore((s) => s.inputsByModuleId[moduleId]);
  const generating = useModuleComprehensionStore((s) => s.generatingModuleId === moduleId);

  const [open, setOpen] = useState(false);

  // The module summary report needs NO native module (just an AI backend call),
  // so it ships to production via OTA — unlike the live voice call, which stays
  // gated behind LIVE_VOICE_AVAILABLE (Yoav 2026-06-22).
  // Nothing to show until we have a snapshot to grade (or an existing report).
  if (!stored && !inputs) return null;

  const onPress = () => {
    tapHaptic();
    if (stored) {
      setOpen(true);
      return;
    }
    // Need to generate — gate on the weekly quota.
    const allowed = useUsageStore.getState().canUse('lesson-report', isPro);
    if (!allowed) {
      useUpgradeModalStore.getState().show('lesson-report');
      return;
    }
    if (!isPro) useUsageStore.getState().incrementUsage('lesson-report');
    setOpen(true); // the report screen kicks off generation on mount
  };

  const score = stored?.report.understandingScore ?? null;
  const subtitle = stored
    ? 'הסיכום האישי שלך מוכן · לחץ לצפייה'
    : generating
      ? 'מכין דוח…'
      : isPro
        ? 'סיכום אישי של איך הלך לך בשיעור'
        : 'דוח שבועי · קבל את הסיכום שלך';
  const ctaText = stored ? 'צפה בדוח' : 'קבל דוח';

  return (
    <Animated.View entering={FadeInDown.duration(320)}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="דוח סיכום שיעור" style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.avatarWrap}>
          <ExpoImage source={SHARK_CALL_IDLE} style={styles.sharkAvatar} contentFit="contain" accessible={false} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[RTL, styles.title]} numberOfLines={1}>דוח סיכום שיעור</Text>
          <Text style={[RTL, styles.subtitle]} numberOfLines={1}>{subtitle}</Text>
        </View>
        {generating ? (
          <ActivityIndicator color="#0369a1" />
        ) : stored && score !== null ? (
          <View style={styles.scoreChip}>
            <Text style={styles.scoreNum}>{score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        ) : (
          <View style={styles.ctaChip}>
            <Text style={styles.ctaText}>{ctaText}</Text>
            <ChevronLeft size={16} color="#ffffff" strokeWidth={2.8} />
          </View>
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <ModuleComprehensionReportScreen
            moduleId={moduleId}
            moduleTitle={moduleTitle}
            onDone={() => setOpen(false)}
          />
        </SafeAreaView>
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
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#bfdbfe',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    shadowColor: '#0369a1',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(3,105,161,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
  },
  sharkAvatar: { width: 44, height: 44 },
  title: { color: '#0c4a6e', fontSize: 16, fontWeight: '900', textAlign: 'right' },
  subtitle: { color: '#0369a1', fontSize: 12, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  scoreChip: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 1,
    backgroundColor: '#0369a1',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  scoreNum: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  scoreMax: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800' },
  ctaChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#0369a1',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  ctaText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  modalSafe: { flex: 1, backgroundColor: '#0b1735' },
});
