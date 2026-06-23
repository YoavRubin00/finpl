import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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

// Scattered ✦ accents — same premium language as ModuleSharkCallCard, so this
// report card reads as its light-blue twin.
const STAR_DECOR = [
  { top: 8, left: 14, size: 7 },
  { top: 17, left: 74, size: 9 },
  { top: 9, left: 150, size: 7 },
  { top: 22, left: 214, size: 10 },
];

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
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="דוח סיכום שיעור" style={({ pressed }) => pressed && styles.cardPressed}>
        <LinearGradient colors={['#38bdf8', '#0ea5e9', '#0284c7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          {STAR_DECOR.map((s, i) => (
            <Text
              key={i}
              style={[styles.star, { top: s.top, left: s.left, fontSize: s.size, color: i % 2 === 0 ? '#ffffff' : '#bae6fd' }]}
              accessible={false}
            >✦</Text>
          ))}
          <View style={styles.avatarWrap}>
            <ExpoImage source={SHARK_CALL_IDLE} style={styles.sharkAvatar} contentFit="contain" accessible={false} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[RTL, styles.kicker]} numberOfLines={1}>סיכום אישי</Text>
            <Text style={[RTL, styles.title]} numberOfLines={1}>דוח סיכום שיעור</Text>
            <Text style={[RTL, styles.subtitle]} numberOfLines={1}>{subtitle}</Text>
          </View>
          {generating ? (
            <ActivityIndicator color="#ffffff" />
          ) : stored && score !== null ? (
            <View style={styles.scoreChip}>
              <Text style={styles.scoreNum}>{score}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          ) : (
            <View style={styles.ctaChip}>
              <Text style={styles.ctaText}>{ctaText}</Text>
              <ChevronLeft size={16} color="#0369a1" strokeWidth={2.8} />
            </View>
          )}
        </LinearGradient>
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#0369a1',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  star: { position: 'absolute', opacity: 0.6 },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  sharkAvatar: { width: 44, height: 44 },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#e0f2fe', textAlign: 'right', textTransform: 'uppercase' },
  title: { color: '#ffffff', fontSize: 16, fontWeight: '900', textAlign: 'right', marginTop: 1 },
  subtitle: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  scoreChip: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  scoreNum: { color: '#0369a1', fontSize: 18, fontWeight: '900' },
  scoreMax: { color: 'rgba(3,105,161,0.7)', fontSize: 11, fontWeight: '800' },
  ctaChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  ctaText: { color: '#0369a1', fontSize: 14, fontWeight: '900' },
  modalSafe: { flex: 1, backgroundColor: '#0b1735' },
});
