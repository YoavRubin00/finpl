import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  PanicIndexState,
  PanicIndexScore,
  PanicIndexGrade,
} from './panicIndexTypes';
import { panicIndexConfig } from './panicIndexData';

const AUTO_ADVANCE_SPEED = 3000; // ms per event during auto-play

// ── Helpers ─────────────────────────────────────────────────────────────

/** Calculate portfolio value at a given event index (cumulative multiplication) */
function calcPortfolioAtEvent(eventIndex: number): number {
  let value = panicIndexConfig.initialInvestment;
  for (let i = 0; i <= eventIndex; i++) {
    value *= 1 + panicIndexConfig.events[i].marketChange;
  }
  return Math.round(value);
}

/** Calculate the full-journey final value (held through all events) */
function calcFullJourneyValue(): number {
  return calcPortfolioAtEvent(panicIndexConfig.events.length - 1);
}

function createInitialState(): PanicIndexState {
  return {
    currentEventIndex: -1, // -1 = not started yet
    portfolioValue: panicIndexConfig.initialInvestment,
    hasSold: false,
    soldAtValue: null,
    holdStreak: 0,
    panicMoments: 0,
    isComplete: false,
    isPlaying: false,
  };
}

/** Grade based on hold behavior and panic moments */
function computeGrade(hasSold: boolean, soldEventIndex: number, panicMoments: number): {
  grade: PanicIndexGrade;
  gradeLabel: string;
} {
  if (!hasSold) {
    // Held through everything
    if (panicMoments === 0) return { grade: 'S', gradeLabel: 'אלוף הקור רוח!' };
    if (panicMoments <= 2) return { grade: 'A', gradeLabel: 'מצוין!' };
    return { grade: 'B', gradeLabel: 'טוב מאוד' };
  }
  // Sold — grade based on when
  const totalEvents = panicIndexConfig.events.length;
  const ratio = soldEventIndex / totalEvents;
  if (ratio >= 0.75) return { grade: 'C', gradeLabel: 'כמעט...' };
  return { grade: 'F', gradeLabel: 'פאניקה ניצחה' };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function usePanicIndex() {
  const [state, setState] = useState<PanicIndexState>(createInitialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Advance to the next event */
  const advanceEvent = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;

      const nextIndex = prev.currentEventIndex + 1;
      const totalEvents = panicIndexConfig.events.length;

      // If already at last event, mark complete
      if (nextIndex >= totalEvents) {
        return {
          ...prev,
          isComplete: true,
          isPlaying: false,
        };
      }

      const newPortfolioValue = prev.hasSold
        ? prev.portfolioValue // frozen if sold
        : calcPortfolioAtEvent(nextIndex);

      const isLastEvent = nextIndex >= totalEvents - 1;

      return {
        ...prev,
        currentEventIndex: nextIndex,
        portfolioValue: newPortfolioValue,
        holdStreak: prev.hasSold ? prev.holdStreak : prev.holdStreak + 1,
        isComplete: isLastEvent,
        isPlaying: isLastEvent ? false : prev.isPlaying,
      };
    });
  }, []);

  /** Player chooses to SELL — lock in current portfolio value */
  const sell = useCallback(() => {
    setState((prev) => {
      if (prev.hasSold || prev.isComplete || prev.currentEventIndex < 0) return prev;
      return {
        ...prev,
        hasSold: true,
        soldAtValue: prev.portfolioValue,
      };
    });
  }, []);

  /** Record a "panic moment" — player tapped sell button but didn't confirm */
  const recordPanicMoment = useCallback(() => {
    setState((prev) => {
      if (prev.hasSold || prev.isComplete) return prev;
      return {
        ...prev,
        panicMoments: prev.panicMoments + 1,
      };
    });
  }, []);

  /** Start auto-advance playback */
  const startPlaying = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;
      return { ...prev, isPlaying: true };
    });
  }, []);

  /** Pause auto-advance */
  const stopPlaying = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  /** Reset to initial state */
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(createInitialState());
  }, []);

  // ── Auto-advance interval management ──────────────────────────────────
  useEffect(() => {
    if (state.isPlaying) {
      intervalRef.current = setInterval(advanceEvent, AUTO_ADVANCE_SPEED);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isPlaying, advanceEvent]);

  // ── Computed: current event ───────────────────────────────────────────
  const currentEvent =
    state.currentEventIndex >= 0 && state.currentEventIndex < panicIndexConfig.events.length
      ? panicIndexConfig.events[state.currentEventIndex]
      : null;

  // ── Computed: what the portfolio would be if player held (for spectator mode) ──
  const holdValue =
    state.currentEventIndex >= 0
      ? calcPortfolioAtEvent(state.currentEventIndex)
      : panicIndexConfig.initialInvestment;

  // ── Score ─────────────────────────────────────────────────────────────
  const score: PanicIndexScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const potentialValue = calcFullJourneyValue();
    const finalValue = state.hasSold ? (state.soldAtValue ?? 0) : potentialValue;
    const holdDuration = state.hasSold
      ? state.holdStreak
      : panicIndexConfig.events.length;

    // Panic resistance: 100 if held with 0 panic moments, decreases with moments/selling
    let panicResistance: number;
    if (!state.hasSold) {
      // Max 100, subtract 10 per panic moment, min 50 if held
      panicResistance = Math.max(50, 100 - state.panicMoments * 10);
    } else {
      // Sold: resistance based on how far they got (0-49 range)
      panicResistance = Math.round((holdDuration / panicIndexConfig.events.length) * 49);
    }

    const soldEventIndex = state.hasSold ? state.holdStreak : -1;
    const { grade, gradeLabel } = computeGrade(state.hasSold, soldEventIndex, state.panicMoments);

    return {
      grade,
      gradeLabel,
      finalValue,
      holdDuration,
      panicResistance,
      potentialValue,
    };
  }, [state.isComplete, state.hasSold, state.soldAtValue, state.holdStreak, state.panicMoments]);

  return {
    state,
    config: panicIndexConfig,
    currentEvent,
    holdValue,
    advanceEvent,
    sell,
    recordPanicMoment,
    startPlaying,
    stopPlaying,
    reset,
    score,
  };
}
