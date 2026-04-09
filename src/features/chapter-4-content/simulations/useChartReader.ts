/**
 * SIM 4-28: קורא הגרפים (Chart Reader) — Module 4-28
 * Hook: present candlestick charts → user picks buy/sell/hold → grade.
 */

import { useState, useCallback, useMemo } from 'react';

import type {
  ChartAction,
  ChartReaderState,
  ChartReaderScore,
} from './chartReaderTypes';
import { chartReaderConfig, TOTAL_ROUNDS } from './chartReaderData';

// ── Helpers ─────────────────────────────────────────────────────────────

/** Grade based on correct answers out of total rounds. */
function computeGrade(
  correctCount: number,
): { grade: 'S' | 'A' | 'B' | 'C' | 'F'; gradeLabel: string } {
  if (correctCount >= 4) return { grade: 'S', gradeLabel: 'מצוין!' };
  if (correctCount >= 3) return { grade: 'A', gradeLabel: 'מצוין' };
  if (correctCount >= 2) return { grade: 'B', gradeLabel: 'טוב' };
  if (correctCount >= 1) return { grade: 'C', gradeLabel: 'אפשר יותר' };
  return { grade: 'F', gradeLabel: 'אפשר יותר' };
}

// ── Initial state ──────────────────────────────────────────────────────

function createInitialState(): ChartReaderState {
  return {
    currentRoundIndex: 0,
    playerActions: Array.from<ChartAction | null>({ length: TOTAL_ROUNDS }).fill(null),
    showingReveal: false,
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useChartReader() {
  const [state, setState] = useState<ChartReaderState>(createInitialState);

  const { rounds } = chartReaderConfig;

  // ── Current round ─────────────────────────────────────────────────

  const currentRound = rounds[state.currentRoundIndex] ?? null;

  // ── Submit action ─────────────────────────────────────────────────

  const submitAction = useCallback(
    (action: ChartAction) => {
      setState((prev) => {
        if (prev.showingReveal || prev.isComplete) return prev;

        const updatedActions = [...prev.playerActions];
        updatedActions[prev.currentRoundIndex] = action;

        return {
          ...prev,
          playerActions: updatedActions,
          showingReveal: true,
        };
      });
    },
    [],
  );

  // ── Advance to next round ─────────────────────────────────────────

  const nextRound = useCallback(() => {
    setState((prev) => {
      if (!prev.showingReveal) return prev;

      const nextIndex = prev.currentRoundIndex + 1;
      const isComplete = nextIndex >= TOTAL_ROUNDS;

      return {
        ...prev,
        currentRoundIndex: isComplete ? prev.currentRoundIndex : nextIndex,
        showingReveal: false,
        isComplete,
      };
    });
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  // ── Score ─────────────────────────────────────────────────────────

  const score: ChartReaderScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    let correctCount = 0;

    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      const round = rounds[i];
      const playerAction = state.playerActions[i];

      if (playerAction === round.correctAction) {
        correctCount++;
      }
    }

    const gradeInfo = computeGrade(correctCount);

    return {
      correctCount,
      totalRounds: TOTAL_ROUNDS,
      ...gradeInfo,
    };
  }, [state.isComplete, state.playerActions, rounds]);

  // ── Derived: was current action correct? ──────────────────────────

  const currentActionCorrect: boolean | null = useMemo(() => {
    if (!state.showingReveal || !currentRound) return null;
    return state.playerActions[state.currentRoundIndex] === currentRound.correctAction;
  }, [state.showingReveal, state.currentRoundIndex, state.playerActions, currentRound]);

  return {
    state,
    config: chartReaderConfig,
    currentRound,
    currentActionCorrect,
    score,
    submitAction,
    nextRound,
    reset,
  };
}
