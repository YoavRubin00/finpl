/**
 * SIM: ציר הזמן של המשברים, Crisis Timeline
 * Hook: manage crisis navigation, predictions, and scoring.
 */

import { useState, useCallback, useMemo } from 'react';

import type { TimelinePrediction, TimelineGrade } from './crisisTimelineTypes';
import { CRISIS_EVENTS, calculateAccuracy, calculateTimelineGrade } from './crisisTimelineData';

interface CrisisTimelineState {
  currentEventIndex: number;
  predictions: TimelinePrediction[];
  showingReveal: boolean;  // true after prediction submitted, before advancing
  isComplete: boolean;
}

export interface CrisisTimelineResult {
  grade: TimelineGrade;
  totalScore: number;      // 0-100 average
  predictions: TimelinePrediction[];
  bestPrediction: TimelinePrediction | undefined;
  worstPrediction: TimelinePrediction | undefined;
}

function createInitialState(): CrisisTimelineState {
  return {
    currentEventIndex: 0,
    predictions: [],
    showingReveal: false,
    isComplete: false,
  };
}

export function useCrisisTimeline() {
  const [state, setState] = useState<CrisisTimelineState>(createInitialState);

  const totalEvents = CRISIS_EVENTS.length;
  const currentEvent = CRISIS_EVENTS[state.currentEventIndex] ?? null;

  // Submit a prediction for current event
  const submitPrediction = useCallback((eventId: string, months: number) => {
    setState((prev) => {
      if (prev.isComplete || prev.showingReveal) return prev;

      const event = CRISIS_EVENTS.find((e) => e.id === eventId);
      if (!event) return prev;

      const accuracy = calculateAccuracy(months, event.recoveryMonths);
      const prediction: TimelinePrediction = {
        eventId,
        predictedRecovery: months,
        actual: event.recoveryMonths,
        accuracy,
      };

      return {
        ...prev,
        predictions: [...prev.predictions, prediction],
        showingReveal: true,
      };
    });
  }, []);

  // Advance to next event
  const advance = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete || !prev.showingReveal) return prev;

      const nextIndex = prev.currentEventIndex + 1;
      if (nextIndex >= totalEvents) {
        return { ...prev, isComplete: true, showingReveal: false };
      }

      return {
        ...prev,
        currentEventIndex: nextIndex,
        showingReveal: false,
      };
    });
  }, [totalEvents]);

  // Calculate final result
  const calculateResult = useCallback((): CrisisTimelineResult | null => {
    if (!state.isComplete || state.predictions.length === 0) return null;

    const totalScore = Math.round(
      state.predictions.reduce((sum, p) => sum + p.accuracy, 0) / state.predictions.length,
    );

    const sorted = [...state.predictions].sort((a, b) => b.accuracy - a.accuracy);

    return {
      grade: calculateTimelineGrade(totalScore),
      totalScore,
      predictions: state.predictions,
      bestPrediction: sorted[0],
      worstPrediction: sorted[sorted.length - 1],
    };
  }, [state.isComplete, state.predictions]);

  // Latest prediction (for reveal screen)
  const latestPrediction = useMemo(() => {
    if (state.predictions.length === 0) return null;
    return state.predictions[state.predictions.length - 1];
  }, [state.predictions]);

  // Reset
  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    currentEvent,
    totalEvents,
    latestPrediction,
    submitPrediction,
    advance,
    calculateResult,
    reset,
  };
}
