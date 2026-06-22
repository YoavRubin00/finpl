import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import { useIsPro } from '../../subscription/useSubscription';
import { useUsageStore } from '../../subscription/useUsageStore';
import { useUpgradeModalStore } from '../../../stores/useUpgradeModalStore';
import { useModuleComprehensionStore } from '../../shark-voice-chat/useModuleComprehensionStore';
import { ModuleComprehensionReportScreen } from '../../shark-voice-chat/ModuleComprehensionReportScreen';

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
    ? `הבנה: ${score}/100 · לחץ לצפייה`
    : generating
      ? 'מכין דוח…'
      : isPro
        ? 'סיכום אישי של איך הלך לך בשיעור'
        : 'דוח שבועי · קבל את הסיכום שלך';
  const ctaText = stored ? 'צפה בדוח' : 'קבל דוח';

  return (
    <Animated.View entering={FadeInDown.duration(320)}>
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.avatarWrap}>
          <Text style={styles.reportEmoji}>📋</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[RTL, styles.title]} numberOfLines={1}>דוח סיכום שיעור</Text>
          <Text style={[RTL, styles.subtitle]} numberOfLines={1}>{subtitle}</Text>
        </View>
        {generating ? (
          <ActivityIndicator color="#0369a1" />
        ) : (
          <View style={styles.ctaChip}>
            <Text style={styles.ctaText}>{ctaText}</Text>
            <ChevronLeft size={16} color="#0c4a6e" strokeWidth={2.6} />
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
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#bfdbfe',
    borderWidth: 1,
    borderColor: '#38bdf8',
    shadowColor: '#0369a1',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0ea5e9',
  },
  reportEmoji: { fontSize: 26 },
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
    borderColor: '#7dd3fc',
  },
  ctaText: { color: '#0c4a6e', fontSize: 13, fontWeight: '800' },
  modalSafe: { flex: 1, backgroundColor: '#0b1735' },
});
