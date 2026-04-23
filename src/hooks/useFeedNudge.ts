import { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useDailyChallengesStore } from "../features/daily-challenges/use-daily-challenges-store";

interface Nudge {
  message: string;
  route: string;
}

const NUDGE_DELAY_MS = 60_000;
const COOLDOWN_MS = 30000;

/**
 * Determines which feed engagement nudge to show on the learn screen.
 * Returns the highest-priority nudge the user hasn't completed today,
 * with built-in delay and cooldown.
 */
export function useFeedNudge() {
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const lastShownAt = useRef(0);

  const dilemmaAnswered = useDailyChallengesStore((s) => s.hasDilemmaAnsweredToday());

  const checkNudge = useCallback(() => {
    // Cooldown check
    if (Date.now() - lastShownAt.current < COOLDOWN_MS) return;

    // Priority 1: Daily challenge — navigate to the feed where daily dilemma appears
    if (!dilemmaAnswered) {
      setNudge({
        message: "לא ביצעת את האתגר היומי! 🎯",
        route: "/(tabs)/learn",
      });
      lastShownAt.current = Date.now();
      setDismissed(false);
      return;
    }

    // No nudge needed
    setNudge(null);
  }, [dilemmaAnswered]);

  // Check on tab focus with delay
  useFocusEffect(
    useCallback(() => {
      setDismissed(false);
      const timer = setTimeout(checkNudge, NUDGE_DELAY_MS);
      return () => clearTimeout(timer);
    }, [checkNudge]),
  );

  // Re-check when dilemma state changes
  useEffect(() => {
    if (dilemmaAnswered && nudge?.route === "/daily-challenge") {
      setNudge(null);
    }
  }, [dilemmaAnswered, nudge?.route]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setNudge(null);
  }, []);

  return {
    nudge: dismissed ? null : nudge,
    dismiss,
  };
}
