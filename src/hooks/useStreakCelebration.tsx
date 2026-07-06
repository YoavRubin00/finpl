import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEconomyUIStore, deriveStreakFromDates } from "../features/economy/useEconomyUIStore";
import { queryClient } from "../lib/queryClient";
import { streakQueryKey } from "../features/economy/useStreak";
import type { StreakState } from "../lib/api/streak";
import { StreakCelebrationScreen } from "../features/streak/StreakCelebrationScreen";
import { useNudgeQueueStore } from "../stores/useNudgeQueueStore";
import { useTutorialStore } from "../stores/useTutorialStore";

/** Exported so same-day landing rituals (TomorrowChestReadyHost) can stamp
 *  today and suppress this nudge — one landing popup, not two. Value format
 *  is the UTC "YYYY-MM-DD" this file has always written. */
export const DAILY_STREAK_NUDGE_KEY = "@finplay/streak-nudge-shown-date";
const DAILY_STREAK_NUDGE_DELAY_MS = 5000;

interface StreakCelebrationContextValue {
  /** Manually show streak celebration (e.g., for testing). */
  showStreakCelebration: () => void;
}

const StreakCelebrationContext = createContext<StreakCelebrationContextValue>({
  showStreakCelebration: () => {},
});

export function StreakCelebrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);

  const showStreakCelebration = useCallback(() => {
    const streakState = queryClient.getQueryData<StreakState | null>(streakQueryKey);
    const streak = streakState?.currentStreak ?? 0;
    setCelebrationStreak(streak);
    // 2 s delay so the popup lands softly after the app finishes mounting,
    // rather than slamming on top of the splash/home render.
    setTimeout(() => {
      setVisible(true);
      useNudgeQueueStore.getState().markStreakShown();
    }, 2000);
  }, []);

  // Detect streak increases by subscribing to UIStore activeDates changes
  // (completeDailyTask / awardLoginBonus add today to activeDates).
  //
  // We derive the streak DIRECTLY from the activeDates we're handed — the
  // documented local source of truth — instead of reading the React Query
  // cache. The cache is updated asynchronously by three different writers:
  // the server tick (async round-trip), completeDailyTask's mirror (which runs
  // AFTER its set(), so the cache is stale at the instant activeDates changes),
  // and awardLoginBonus (which never mirrors at all). So reading the cache here
  // silently suppressed the popup whenever an in-app activity (e.g. the daily
  // news challenge) was the first streak credit of the day and the server tick
  // hadn't returned yet — comparing the stale cache against itself yields no
  // increase (Yoav 2026-06-22: "ביצעתי אקטואליה והרצף לא קפץ"). Deriving from
  // the (state, prevState) activeDates makes the trigger timing-independent.
  useEffect(() => {
    const unsub = useEconomyUIStore.subscribe((state, prevState) => {
      if (state.activeDates === prevState.activeDates) return;
      const current = deriveStreakFromDates(state.activeDates, state.frozenDates);
      const prev = deriveStreakFromDates(prevState.activeDates, prevState.frozenDates);
      // Streak increased — show celebration after a short delay.
      if (current > prev && current > 0) {
        // For DISPLAY, prefer the server/authoritative streak if it's at least
        // as high (cross-device), else the freshly-derived local value.
        const cached =
          queryClient.getQueryData<StreakState | null>(streakQueryKey)?.currentStreak ?? 0;
        setCelebrationStreak(Math.max(current, cached));
        setTimeout(() => {
          setVisible(true);
          useNudgeQueueStore.getState().markStreakShown();
        }, 600);
      }
    });

    return unsub;
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  // Daily entry nudge — pops the streak popup ~5s after the app launches IF:
  //   • the user has a live streak (> 0)
  //   • today's daily task is NOT yet complete (so the nudge has a purpose)
  //   • we haven't already shown it today
  //   • the first-run walkthrough is done (don't bury new users)
  // Anchored to the provider (mounted in app/_layout) so it doesn't depend on
  // which tab the user lands on.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    (async () => {
      const streakState = queryClient.getQueryData<StreakState | null>(streakQueryKey);
      const streak = streakState?.currentStreak ?? 0;
      const lastDailyTaskDate = useEconomyUIStore.getState().lastDailyTaskDate;
      if (streak <= 0) return;
      const today = new Date().toISOString().slice(0, 10);
      if (lastDailyTaskDate === today) return; // already completed today
      if (!useTutorialStore.getState().hasSeenAppWalkthrough) return;
      const lastShown = await AsyncStorage.getItem(DAILY_STREAK_NUDGE_KEY);
      if (lastShown === today) return;

      if (cancelled) return;
      timer = setTimeout(() => {
        void (async () => {
          // Re-check at fire time: user might have completed a lesson in the
          // 5s window, which would make the nudge stale.
          const freshLastTask = useEconomyUIStore.getState().lastDailyTaskDate;
          if (freshLastTask === today) return;
          // Re-read the shown-date too — a landing ritual (e.g. the
          // tomorrow-chest ceremony) may have stamped today AFTER our mount
          // read, claiming the day's single landing popup.
          const freshLastShown = await AsyncStorage.getItem(DAILY_STREAK_NUDGE_KEY).catch(() => null);
          if (freshLastShown === today || cancelled) return;
          AsyncStorage.setItem(DAILY_STREAK_NUDGE_KEY, today).catch(() => {});
          const freshStreakState = queryClient.getQueryData<StreakState | null>(streakQueryKey);
          const freshStreak = freshStreakState?.currentStreak ?? 0;
          setCelebrationStreak(freshStreak);
          setVisible(true);
          useNudgeQueueStore.getState().markStreakShown();
        })();
      }, DAILY_STREAK_NUDGE_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <StreakCelebrationContext.Provider value={{ showStreakCelebration }}>
      {children}
      {visible && (
        <StreakCelebrationScreen
          streak={celebrationStreak}
          onDismiss={handleDismiss}
        />
      )}
    </StreakCelebrationContext.Provider>
  );
}

export function useStreakCelebration() {
  return useContext(StreakCelebrationContext);
}
