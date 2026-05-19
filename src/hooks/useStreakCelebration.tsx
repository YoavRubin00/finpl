import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEconomyStore } from "../features/economy/useEconomyStore";
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
    const streak = useEconomyStore.getState().streak;
    setCelebrationStreak(streak);
    // 2 s delay so the popup lands softly after the app finishes mounting,
    // rather than slamming on top of the splash/home render.
    setTimeout(() => {
      setVisible(true);
      useNudgeQueueStore.getState().markStreakShown();
    }, 2000);
  }, []);

  // Detect streak increases via store subscription
  useEffect(() => {
    // Seed with the current streak on mount so the FIRST state change after
    // the provider mounts is checked. Earlier impl initialised prevStreak
    // to null and consumed the first subscribe call just to set it, which
    // meant the very first streak bump of the session never fired the
    // celebration — users reported the popup "never showing up".
    prevStreak.current = useEconomyStore.getState().streak;

    const unsub = useEconomyStore.subscribe((state) => {
      if (prevStreak.current === null) {
        prevStreak.current = state.streak;
        return;
      }

      // Streak increased — show celebration after a short delay
      if (state.streak > prevStreak.current && state.streak > 0) {
        setCelebrationStreak(state.streak);
        setTimeout(() => {
          setVisible(true);
          useNudgeQueueStore.getState().markStreakShown();
        }, 600);
      }

      prevStreak.current = state.streak;
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
      const { streak, lastDailyTaskDate } = useEconomyStore.getState();
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
        const fresh = useEconomyStore.getState();
        if (fresh.lastDailyTaskDate === today) return;
        AsyncStorage.setItem(DAILY_STREAK_NUDGE_KEY, today).catch(() => {});
        setCelebrationStreak(fresh.streak);
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
