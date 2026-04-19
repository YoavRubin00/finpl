/**
 * SIM 4-25: בלש הדוחות (Statement Detective), Module 4-25
 * Hook: present financial snippets → user votes invest/avoid → grade.
 */

import { useState, useCallback, useMemo } from 'react';

import type {
  Verdict,
  DetectiveState,
  DetectiveScore,
} from './statementDetectiveTypes';
import { statementDetectiveConfig, TOTAL_ROUNDS } from './statementDetectiveData';

// ── Helpers ─────────────────────────────────────────────────────────────

/** Grade based on correct answers out of total rounds. */
function computeGrade(
  correctCount: number,
): { grade: 'S' | 'A' | 'B' | 'C' | 'F'; gradeLabel: string } {
  if (correctCount >= 5) return { grade: 'S', gradeLabel: 'מצוין!' };
  if (correctCount >= 4) return { grade: 'A', gradeLabel: 'מצוין' };
  if (correctCount >= 3) return { grade: 'B', gradeLabel: 'טוב' };
  if (correctCount >= 2) return { grade: 'C', gradeLabel: 'אפשר יותר' };
  return { grade: 'F', gradeLabel: 'אפשר יותר' };
}

// ── Initial state ──────────────────────────────────────────────────────

function createInitialState(): DetectiveState {
  return {
    currentRoundIndex: 0,
    playerVerdicts: Array.from<Verdict | null>({ length: TOTAL_ROUNDS }).fill(null),
    showingFeedback: false,
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useStatementDetective() {
  const [state, setState] = useState<DetectiveState>(createInitialState);

  const { rounds } = statementDetectiveConfig;

  // ── Current round ─────────────────────────────────────────────────

  const currentRound = rounds[state.currentRoundIndex] ?? null;

  // ── Submit verdict ────────────────────────────────────────────────

  const submitVerdict = useCallback(
    (verdict: Verdict) => {
      setState((prev) => {
        if (prev.showingFeedback || prev.isComplete) return prev;

        const updatedVerdicts = [...prev.playerVerdicts];
        updatedVerdicts[prev.currentRoundIndex] = verdict;

        return {
          ...prev,
          playerVerdicts: updatedVerdicts,
          showingFeedback: true,
        };
      });
    },
    [],
  );

  // ── Advance to next round ─────────────────────────────────────────

  const nextRound = useCallback(() => {
    setState((prev) => {
      if (!prev.showingFeedback) return prev;

      const nextIndex = prev.currentRoundIndex + 1;
      const isComplete = nextIndex >= TOTAL_ROUNDS;

      return {
        ...prev,
        currentRoundIndex: isComplete ? prev.currentRoundIndex : nextIndex,
        showingFeedback: false,
        isComplete,
      };
    });
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  // ── Score ─────────────────────────────────────────────────────────

  const score: DetectiveScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    let correctCount = 0;
    const missedRedFlags: string[] = [];

    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      const round = rounds[i];
      const playerVerdict = state.playerVerdicts[i];

      if (playerVerdict === round.correctVerdict) {
        correctCount++;
      } else {
        // Collect red flags from rounds the user got wrong
        for (const flag of round.snippet.redFlags) {
          missedRedFlags.push(flag);
        }
      }
    }

    const gradeInfo = computeGrade(correctCount);

    return {
      correctCount,
      totalRounds: TOTAL_ROUNDS,
      missedRedFlags,
      ...gradeInfo,
    };
  }, [state.isComplete, state.playerVerdicts, rounds]);

  // ── Derived: was current verdict correct? ─────────────────────────

  const currentVerdictCorrect: boolean | null = useMemo(() => {
    if (!state.showingFeedback || !currentRound) return null;
    return state.playerVerdicts[state.currentRoundIndex] === currentRound.correctVerdict;
  }, [state.showingFeedback, state.currentRoundIndex, state.playerVerdicts, currentRound]);

  return {
    state,
    config: statementDetectiveConfig,
    currentRound,
    currentVerdictCorrect,
    score,
    submitVerdict,
    nextRound,
    reset,
  };
}
