import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEconomyUIStore } from "../features/economy/useEconomyUIStore";
import { queryClient } from "../lib/queryClient";
import { streakQueryKey } from "../features/economy/useStreak";
import type { StreakState } from "../lib/api/streak";
import { StreakCelebrationScreen } from "../features/streak/StreakCelebrationScreen";
import { useNudgeQueueStore } from "../stores/useNudgeQueueStore";
import { useTutorialStore } from "../stores/useTutorialStore";

const DAILY_STREAK_NUDGE_KEY = "@finplay/streak-nudge-shown-date";
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
  const prevStreak = useRef<number | null>(null);

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

  // Detect streak increases by subscribing to UIStore activeDates changes.
  // When completeDailyTask or awardLoginBonus fires, lastDailyTaskDate /
  // activeDates update. We derive the new streak from the query cache.
  useEffect(() => {
    const getStreak = () => {
      const s = queryClient.getQueryData<StreakState | null>(streakQueryKey);
      return s?.currentStreak ?? 0;
    };
    prevStreak.current = getStreak();

    const unsub = useEconomyUIStore.subscribe((state, prevState) => {
      if (state.activeDates === prevState.activeDates) return;
      const currentStreak = getStreak();
      if (prevStreak.current === null) {
        prevStreak.current = currentStreak;
        return;
      }
      // Streak increased — show celebration after a short delay
      if (currentStreak > (prevStreak.current ?? 0) && currentStreak > 0) {
        setCelebrationStreak(currentStreak);
        setTimeout(() => {
          setVisible(true);
          useNudgeQueueStore.getState().markStreakShown();
        }, 600);
      }
      prevStreak.current = currentStreak;
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
        // Re-check at fire time: user might have completed a lesson in the
        // 5s window, which would make the nudge stale.
        const freshLastTask = useEconomyUIStore.getState().lastDailyTaskDate;
        if (freshLastTask === today) return;
        AsyncStorage.setItem(DAILY_STREAK_NUDGE_KEY, today).catch(() => {});
        const freshStreakState = queryClient.getQueryData<StreakState | null>(streakQueryKey);
        const freshStreak = freshStreakState?.currentStreak ?? 0;
        setCelebrationStreak(freshStreak);
        setVisible(true);
        useNudgeQueueStore.getState().markStreakShown();
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
