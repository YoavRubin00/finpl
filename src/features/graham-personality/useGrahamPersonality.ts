/**
 * Graham Investor Personality Test, session-only React hook.
 * NOT a Zustand store, state lives only for the duration of the test.
 */
import { useState, useCallback, useMemo } from 'react';
import type { InvestorProfile } from './personalityTypes';
import { PERSONALITY_QUESTIONS, TOTAL_QUESTIONS, INVESTOR_PROFILES } from './personalityData';

interface GrahamPersonalityState {
  currentQuestion: number;
  answers: number[];
  isComplete: boolean;
  selectAnswer: (optionIndex: number) => void;
  goBack: () => void;
  getResult: () => InvestorProfile;
  reset: () => void;
}

export function useGrahamPersonality(): GrahamPersonalityState {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const isComplete = answers.length >= TOTAL_QUESTIONS;

  const selectAnswer = useCallback(
    (optionIndex: number) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentQuestion] = optionIndex;
        return next;
      });
      if (currentQuestion < TOTAL_QUESTIONS - 1) {
        setCurrentQuestion((prev) => prev + 1);
      } else {
        // Mark as complete by letting answers length reach TOTAL_QUESTIONS
        setCurrentQuestion(TOTAL_QUESTIONS - 1);
      }
    },
    [currentQuestion],
  );

  const goBack = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  }, [currentQuestion]);

  const getResult = useCallback((): InvestorProfile => {
    // Sum scores: [defensive, enterprising, speculator, rational]
    const totals = [0, 0, 0, 0];
    answers.forEach((optIdx, qIdx) => {
      const question = PERSONALITY_QUESTIONS[qIdx];
      if (question && optIdx !== undefined) {
        const option = question.options[optIdx];
        if (option) {
          option.scores.forEach((s, i) => {
            totals[i] += s;
          });
        }
      }
    });

    // Find profile with highest score
    let maxIdx = 0;
    let maxScore = totals[0];
    totals.forEach((score, idx) => {
      if (score > maxScore) {
        maxScore = score;
        maxIdx = idx;
      }
    });

    const profileIds: Array<'defensive' | 'enterprising' | 'speculator' | 'rational'> = [
      'defensive',
      'enterprising',
      'speculator',
      'rational',
    ];
    return INVESTOR_PROFILES[profileIds[maxIdx]];
  }, [answers]);

  const reset = useCallback(() => {
    setCurrentQuestion(0);
    setAnswers([]);
  }, []);

  return useMemo(
    () => ({
      currentQuestion,
      answers,
      isComplete,
      selectAnswer,
      goBack,
      getResult,
      reset,
    }),
    [currentQuestion, answers, isComplete, selectAnswer, goBack, getResult, reset],
  );
}
