import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useEconomyStore } from "../features/economy/useEconomyStore";
import { StreakCelebrationScreen } from "../features/streak/StreakCelebrationScreen";
import { useNudgeQueueStore } from "../stores/useNudgeQueueStore";

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
    const unsub = useEconomyStore.subscribe((state, prevState) => {
      if (prevStreak.current === null) {
        prevStreak.current = prevState.streak;
        return;
      }

      // Streak increased — show celebration after a short delay
      if (state.streak > prevStreak.current && state.streak > 0) {
        setCelebrationStreak(state.streak);
        setTimeout(() => {
          setVisible(true);
          useNudgeQueueStore.getState().markStreakShown();
        }, 2000);
      }

      prevStreak.current = state.streak;
    });

    return unsub;
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
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
