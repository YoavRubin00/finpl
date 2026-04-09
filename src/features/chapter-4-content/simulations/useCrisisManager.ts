/**
 * SIM 4-27: מנהל המשבר (Crisis Manager) — Module 4-27
 * Hook: navigate 5 historical crises — sell / hold / buy → compare to hold strategy.
 */

import { useState, useCallback, useMemo } from 'react';

import type {
  PlayerAction,
  CrisisRound,
  CrisisState,
  CrisisScore,
} from './crisisManagerTypes';
import { crisisManagerConfig, TOTAL_EVENTS } from './crisisManagerData';

// ── Helpers ─────────────────────────────────────────────────────────────

function computeGrade(
  finalBalance: number,
  holdBalance: number,
): { grade: 'S' | 'A' | 'B' | 'C' | 'F'; gradeLabel: string } {
  if (finalBalance > holdBalance * 1.1) return { grade: 'S', gradeLabel: 'מצוין!' };
  if (finalBalance > holdBalance) return { grade: 'A', gradeLabel: 'מצוין' };
  if (finalBalance > holdBalance * 0.8) return { grade: 'B', gradeLabel: 'טוב' };
  if (finalBalance > holdBalance * 0.6) return { grade: 'C', gradeLabel: 'אפשר יותר' };
  return { grade: 'F', gradeLabel: 'אפשר יותר' };
}

/**
 * Calculate balance after a crisis given a player action.
 * - Sell: lock in the drop loss, miss the recovery entirely.
 * - Hold: take the drop, then recover with postRecoveryGainPercent.
 * - Buy: take the drop, then get 2× the postRecoveryGainPercent (doubled down at bottom).
 */
function applyAction(
  balance: number,
  dropPercent: number,
  recoveryGainPercent: number,
  action: PlayerAction,
): number {
  const afterDrop = balance * (1 - dropPercent / 100);

  switch (action) {
    case 'sell':
      // Sold at the bottom — locked in loss, missed recovery
      return afterDrop;
    case 'hold':
      // Took the hit, recovered normally
      return afterDrop * (1 + recoveryGainPercent / 100);
    case 'buy':
      // Bought more at the bottom — 2× recovery gain
      return afterDrop * (1 + (2 * recoveryGainPercent) / 100);
  }
}

/** Hold strategy always holds through every crisis. */
function applyHold(
  balance: number,
  dropPercent: number,
  recoveryGainPercent: number,
): number {
  return balance * (1 - dropPercent / 100) * (1 + recoveryGainPercent / 100);
}

// ── Initial state ──────────────────────────────────────────────────────

function createInitialState(): CrisisState {
  return {
    currentEventIndex: 0,
    playerBalance: crisisManagerConfig.initialBalance,
    holdBalance: crisisManagerConfig.initialBalance,
    rounds: [],
    showingResult: false,
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useCrisisManager() {
  const [state, setState] = useState<CrisisState>(createInitialState);

  const { events } = crisisManagerConfig;

  // ── Current event ─────────────────────────────────────────────────

  const currentEvent = events[state.currentEventIndex] ?? null;

  // ── Submit action ─────────────────────────────────────────────────

  const submitAction = useCallback(
    (action: PlayerAction) => {
      setState((prev) => {
        if (prev.showingResult || prev.isComplete) return prev;

        const event = events[prev.currentEventIndex];
        if (!event) return prev;

        const newPlayerBalance = applyAction(
          prev.playerBalance,
          event.marketDropPercent,
          event.postRecoveryGainPercent,
          action,
        );

        const newHoldBalance = applyHold(
          prev.holdBalance,
          event.marketDropPercent,
          event.postRecoveryGainPercent,
        );

        const round: CrisisRound = {
          event,
          action,
          playerBalanceAfter: Math.round(newPlayerBalance),
          holdBalanceAfter: Math.round(newHoldBalance),
        };

        return {
          ...prev,
          playerBalance: Math.round(newPlayerBalance),
          holdBalance: Math.round(newHoldBalance),
          rounds: [...prev.rounds, round],
          showingResult: true,
        };
      });
    },
    [events],
  );

  // ── Advance to next event ─────────────────────────────────────────

  const nextEvent = useCallback(() => {
    setState((prev) => {
      if (!prev.showingResult) return prev;

      const nextIndex = prev.currentEventIndex + 1;
      const isComplete = nextIndex >= TOTAL_EVENTS;

      return {
        ...prev,
        currentEventIndex: isComplete ? prev.currentEventIndex : nextIndex,
        showingResult: false,
        isComplete,
      };
    });
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  // ── Score ─────────────────────────────────────────────────────────

  const score: CrisisScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const finalBalance = state.playerBalance;
    const holdStrategyBalance = state.holdBalance;
    const difference = finalBalance - holdStrategyBalance;
    const beatHoldStrategy = finalBalance > holdStrategyBalance;

    const gradeInfo = computeGrade(finalBalance, holdStrategyBalance);

    return {
      finalBalance,
      holdStrategyBalance,
      difference,
      beatHoldStrategy,
      ...gradeInfo,
    };
  }, [state.isComplete, state.playerBalance, state.holdBalance]);

  // ── Derived: last round result for feedback display ───────────────

  const lastRound: CrisisRound | null = useMemo(() => {
    if (!state.showingResult || state.rounds.length === 0) return null;
    return state.rounds[state.rounds.length - 1] ?? null;
  }, [state.showingResult, state.rounds]);

  return {
    state,
    config: crisisManagerConfig,
    currentEvent,
    lastRound,
    score,
    submitAction,
    nextEvent,
    reset,
  };
}
