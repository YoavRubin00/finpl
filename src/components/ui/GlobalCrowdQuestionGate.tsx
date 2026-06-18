/**
 * GlobalCrowdQuestionGate — pops Bar's binary "wisdom of crowds" (VS) question
 * to active users on the HOME tab, once per day, never inside a lesson. Mirrors
 * the DailyBridgeNudgeModal gate (auth + activity + daily throttle + 30s poll +
 * min-session-age) but hosts the existing CrowdQuestionCard, so voting → DB →
 * live percentages all work unchanged. Questions come from Bar's cloud set
 * (loadCloudPolls) with a local fallback.
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrowdQuestionCard } from '../../features/crowd-question';
import { useCrowdQuestionStore } from '../../features/crowd-question/useCrowdQuestionStore';
import { loadCloudPolls } from '../../features/crowd-question/crowdQuestionsApi';
import { useNudgeQueueStore } from '../../stores/useNudgeQueueStore';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { useEconomyUIStore } from '../../features/economy/useEconomyUIStore';
import { tapHaptic } from '../../utils/haptics';

export function GlobalCrowdQuestionGate() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const [visible, setVisible] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const isGuest = useAuthStore((s) => s.isGuest);
  const activeDates = useEconomyUIStore((s) => s.activeDates);
  const lastCrowdPopupDateISO = useNudgeQueueStore((s) => s.lastCrowdPopupDateISO);
  const setLastCrowdPopupDateISO = useNudgeQueueStore((s) => s.setLastCrowdPopupDateISO);
  const hasVotedToday = useCrowdQuestionStore((s) => s.hasVotedToday);

  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    if (!isAuthenticated || !hasCompletedOnboarding || isGuest) return;
    if ((activeDates?.length ?? 0) < 2) return; // active users only
    const today = new Date().toISOString().slice(0, 10);
    if (lastCrowdPopupDateISO === today) return; // once per day

    const MIN_SESSION_MS = 90 * 1000; // let the user settle before interrupting

    // Warm Bar's cloud questions so the popup shows live content (also primes
    // the in-pearl card). Fire-and-forget.
    loadCloudPolls().catch(() => {});

    let interval: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (interval !== null) { clearInterval(interval); interval = null; }
    };

    // Home tab = the DuoLearn map, mounted at (tabs)/index and (tabs)/learn.
    const isOnHome = () => {
      const seg = segmentsRef.current as string[];
      if (seg[0] !== '(tabs)') return false;
      const sub = seg[1];
      return sub === undefined || sub === 'index' || sub === 'learn';
    };

    const tryShow = () => {
      if (shownRef.current) { stop(); return; }
      const s = useNudgeQueueStore.getState();
      if (s.inLesson) return; // never inside a lesson/activity
      if (hasVotedToday()) { stop(); return; } // already engaged — nothing to ask
      if (!isOnHome()) return;
      if (Date.now() - s.sessionStartedAt < MIN_SESSION_MS) return;
      shownRef.current = true;
      setVisible(true);
      stop();
    };

    const initial = setTimeout(tryShow, 4000);
    interval = setInterval(tryShow, 30_000);
    return () => { clearTimeout(initial); stop(); };
  }, [isAuthenticated, hasCompletedOnboarding, isGuest, activeDates, lastCrowdPopupDateISO, hasVotedToday]);

  function close() {
    const today = new Date().toISOString().slice(0, 10);
    setLastCrowdPopupDateISO(today); // consume today's slot whether voted or dismissed
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { tapHaptic(); close(); }}
    >
      <View style={[styles.overlay, { paddingTop: insets.top + 6 }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => { tapHaptic(); close(); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="סגור"
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.cardHost}>
          <CrowdQuestionCard isActive onContinue={() => { tapHaptic(); close(); }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3,7,18,0.92)',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 18,
    paddingBottom: 2,
  },
  closeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  cardHost: {
    flex: 1,
    width: '100%',
  },
});
