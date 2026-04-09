import { useState, useCallback, useMemo } from 'react';

import type {
  CreditOption,
  CreditEvent,
  CreditScoreState,
  CreditScoreScore,
  CreditScoreGrade,
  CreditScoreTrend,
  ChoiceRecord,
} from './creditScoreTypes';
import { creditScoreConfig } from './creditScoreData';

const INITIAL_STATE: CreditScoreState = {
  currentScore: creditScoreConfig.startingScore,
  round: 0,
  correctChoices: 0,
  history: [],
  isComplete: false,
};

const MIN_SCORE = 300;
const MAX_SCORE = 1000;

function clampScore(score: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
}

function computeGrade(finalScore: number): { grade: CreditScoreGrade; gradeLabel: string } {
  if (finalScore >= 850) return { grade: 'S', gradeLabel: 'מצוין' };
  if (finalScore >= 750) return { grade: 'A', gradeLabel: 'טוב מאוד' };
  if (finalScore >= 650) return { grade: 'B', gradeLabel: 'סביר' };
  if (finalScore >= 500) return { grade: 'C', gradeLabel: 'נמוך' };
  return { grade: 'F', gradeLabel: 'בסיכון' };
}

function computeTrend(startScore: number, finalScore: number): CreditScoreTrend {
  const diff = finalScore - startScore;
  if (diff > 10) return 'improved';
  if (diff < -10) return 'declined';
  return 'stable';
}

export function useCreditScore() {
  const [state, setState] = useState<CreditScoreState>(INITIAL_STATE);

  const currentEvent: CreditEvent | null = useMemo(() => {
    if (state.isComplete || state.round >= creditScoreConfig.totalRounds) return null;
    return creditScoreConfig.events[state.round] ?? null;
  }, [state.round, state.isComplete]);

  const peakScore = useMemo(() => {
    const allScores = [creditScoreConfig.startingScore, ...state.history.map((h) => h.scoreAfter)];
    return Math.max(...allScores);
  }, [state.history]);

  const lowestScore = useMemo(() => {
    const allScores = [creditScoreConfig.startingScore, ...state.history.map((h) => h.scoreAfter)];
    return Math.min(...allScores);
  }, [state.history]);

  const handleChoice = useCallback((option: CreditOption) => {
    setState((prev) => {
      if (prev.isComplete) return prev;

      const newScore = clampScore(prev.currentScore + option.scoreImpact);
      const record: ChoiceRecord = {
        eventId: creditScoreConfig.events[prev.round]?.id ?? '',
        optionId: option.id,
        impact: option.scoreImpact,
        scoreAfter: newScore,
      };

      const nextRound = prev.round + 1;
      const isComplete = nextRound >= creditScoreConfig.totalRounds;

      return {
        currentScore: newScore,
        round: nextRound,
        correctChoices: prev.correctChoices + (option.isCorrect ? 1 : 0),
        history: [...prev.history, record],
        isComplete,
      };
    });
  }, []);

  const score: CreditScoreScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const finalScore = state.currentScore;
    const { grade, gradeLabel } = computeGrade(finalScore);
    const trend = computeTrend(creditScoreConfig.startingScore, finalScore);

    return {
      finalScore,
      grade,
      gradeLabel,
      trend,
      peakScore,
      lowestScore,
    };
  }, [state.isComplete, state.currentScore, peakScore, lowestScore]);

  const resetGame = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    currentEvent,
    peakScore,
    lowestScore,
    handleChoice,
    score,
    resetGame,
  };
}
