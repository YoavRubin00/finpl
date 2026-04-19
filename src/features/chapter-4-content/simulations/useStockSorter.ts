/**
 * SIM 4-29: מיון המניות (Stock Sorter), Module 4-29
 * Hook: present stock cards → user picks category → grade.
 */

import { useState, useCallback, useMemo } from 'react';

import type {
  StockSorterState,
  StockSorterScore,
} from './stockSorterTypes';
import { stockSorterConfig, TOTAL_QUESTIONS } from './stockSorterData';

// ── Helpers ─────────────────────────────────────────────────────────────

/** Grade based on correct answers out of 8 questions. */
function computeGrade(
  correctCount: number,
): { grade: 'S' | 'A' | 'B' | 'C' | 'F'; gradeLabel: string } {
  if (correctCount >= 8) return { grade: 'S', gradeLabel: 'מצוין!' };
  if (correctCount >= 7) return { grade: 'A', gradeLabel: 'מצוין' };
  if (correctCount >= 5) return { grade: 'B', gradeLabel: 'טוב' };
  if (correctCount >= 3) return { grade: 'C', gradeLabel: 'אפשר יותר' };
  return { grade: 'F', gradeLabel: 'אפשר יותר' };
}

// ── Initial state ──────────────────────────────────────────────────────

function createInitialState(): StockSorterState {
  return {
    currentQuestionIndex: 0,
    answers: Array.from<string | null>({ length: TOTAL_QUESTIONS }).fill(null),
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useStockSorter() {
  const [state, setState] = useState<StockSorterState>(createInitialState);

  const { questions } = stockSorterConfig;

  // ── Current question ─────────────────────────────────────────────

  const currentQuestion = questions[state.currentQuestionIndex] ?? null;

  // ── Whether showing feedback (answer was just submitted) ────────

  const [showingFeedback, setShowingFeedback] = useState(false);

  // ── Submit answer ───────────────────────────────────────────────

  const submitAnswer = useCallback(
    (answer: string) => {
      setState((prev) => {
        if (showingFeedback || prev.isComplete) return prev;

        const updatedAnswers = [...prev.answers];
        updatedAnswers[prev.currentQuestionIndex] = answer;

        return {
          ...prev,
          answers: updatedAnswers,
        };
      });
      setShowingFeedback(true);
    },
    [showingFeedback],
  );

  // ── Advance to next question ────────────────────────────────────

  const nextQuestion = useCallback(() => {
    if (!showingFeedback) return;

    setState((prev) => {
      const nextIndex = prev.currentQuestionIndex + 1;
      const isComplete = nextIndex >= TOTAL_QUESTIONS;

      return {
        ...prev,
        currentQuestionIndex: isComplete ? prev.currentQuestionIndex : nextIndex,
        isComplete,
      };
    });
    setShowingFeedback(false);
  }, [showingFeedback]);

  // ── Reset ───────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState(createInitialState());
    setShowingFeedback(false);
  }, []);

  // ── Score ───────────────────────────────────────────────────────

  const score: StockSorterScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    let correctCount = 0;

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      const question = questions[i];
      const playerAnswer = state.answers[i];

      if (playerAnswer === question.correctAnswer) {
        correctCount++;
      }
    }

    const accuracy = Math.round((correctCount / TOTAL_QUESTIONS) * 100);
    const gradeInfo = computeGrade(correctCount);

    return {
      correctCount,
      totalQuestions: TOTAL_QUESTIONS,
      accuracy,
      ...gradeInfo,
    };
  }, [state.isComplete, state.answers, questions]);

  // ── Derived: was current answer correct? ────────────────────────

  const currentAnswerCorrect: boolean | null = useMemo(() => {
    if (!showingFeedback || !currentQuestion) return null;
    return state.answers[state.currentQuestionIndex] === currentQuestion.correctAnswer;
  }, [showingFeedback, state.currentQuestionIndex, state.answers, currentQuestion]);

  return {
    state,
    config: stockSorterConfig,
    currentQuestion,
    showingFeedback,
    currentAnswerCorrect,
    score,
    submitAnswer,
    nextQuestion,
    reset,
  };
}
