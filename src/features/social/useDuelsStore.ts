import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import type { QuizQuestion } from "../chapter-1-content/types";
import type { AnswerFeedback, DuelMatch, DuelOpponent, DuelRecord, DuelStatus } from "./types";
import { chapter1Data } from "../chapter-1-content/chapter1Data";
import { chapter2Data } from "../chapter-2-content/chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";
import {
  MOCK_OPPONENTS,
  DUEL_DURATION_SEC,
  DUEL_WIN_COINS,
  DUEL_LOSS_COINS,
  DUEL_DRAW_COINS,
  DUEL_WIN_GEMS,
} from "./duelData";
import { useEconomyStore } from "../economy/useEconomyStore";

// ---------------------------------------------------------------------------
// Question pool
// ---------------------------------------------------------------------------

function getAllQuizQuestions(): QuizQuestion[] {
  const chapters = [chapter1Data, chapter2Data, chapter3Data, chapter4Data, chapter5Data];
  const questions: QuizQuestion[] = [];
  for (const ch of chapters) {
    for (const mod of ch.modules) {
      questions.push(...mod.quizzes);
    }
  }
  return questions;
}

function getShuffledQuestions(): QuizQuestion[] {
  const pool = getAllQuizQuestions();
  // Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickRandomOpponent(): DuelOpponent {
  return MOCK_OPPONENTS[Math.floor(Math.random() * MOCK_OPPONENTS.length)];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface DuelsState {
  record: DuelRecord;
  currentMatch: DuelMatch | null;
  status: DuelStatus;

  startMatchmaking: () => void;
  startMatch: () => void;
  answerQuestion: (selectedIndex: number) => void;
  clearFeedback: () => void;
  tickTimer: () => void;
  finishMatch: () => void;
  resetMatch: () => void;
}

export const useDuelsStore = create<DuelsState>()(
  persist(
    (set, get) => ({
      record: { wins: 0, losses: 0, draws: 0 },
      currentMatch: null,
      status: "idle" as DuelStatus,

      startMatchmaking: () => {
        set({ status: "searching" });
      },

      startMatch: () => {
        const questions = getShuffledQuestions();
        const opponent = pickRandomOpponent();
        const match: DuelMatch = {
          id: `duel-${Date.now()}`,
          opponent,
          questions,
          playerScore: 0,
          opponentScore: 0,
          currentQuestionIndex: 0,
          timeRemaining: DUEL_DURATION_SEC,
          status: "playing",
          streak: 0,
          bestStreak: 0,
          totalAnswered: 0,
          answerFeedback: null,
        };
        set({ currentMatch: match, status: "playing" });
      },

      answerQuestion: (selectedIndex: number) => {
        const { currentMatch } = get();
        if (!currentMatch || currentMatch.status !== "playing") return;
        if (currentMatch.answerFeedback) return; // already showing feedback

        const question = currentMatch.questions[currentMatch.currentQuestionIndex];
        if (!question) return;

        const isCorrect = selectedIndex === question.correctAnswer;
        const opponentCorrect = Math.random() > 0.45; // ~55% mock opponent accuracy
        const newStreak = isCorrect ? currentMatch.streak + 1 : 0;

        const feedback: AnswerFeedback = {
          isCorrect,
          selectedIndex,
          correctIndex: question.correctAnswer,
        };

        set({
          currentMatch: {
            ...currentMatch,
            playerScore: currentMatch.playerScore + (isCorrect ? 1 : 0),
            opponentScore: currentMatch.opponentScore + (opponentCorrect ? 1 : 0),
            streak: newStreak,
            bestStreak: Math.max(currentMatch.bestStreak, newStreak),
            totalAnswered: currentMatch.totalAnswered + 1,
            answerFeedback: feedback,
          },
        });
      },

      clearFeedback: () => {
        const { currentMatch } = get();
        if (!currentMatch) return;

        const nextIndex = currentMatch.currentQuestionIndex + 1;
        // If we run out of questions in the pool, wrap around (shuffle again)
        const wrappedIndex = nextIndex >= currentMatch.questions.length ? 0 : nextIndex;

        set({
          currentMatch: {
            ...currentMatch,
            currentQuestionIndex: wrappedIndex,
            answerFeedback: null,
          },
        });
      },

      tickTimer: () => {
        const { currentMatch } = get();
        if (!currentMatch || currentMatch.status !== "playing") return;

        const newTime = currentMatch.timeRemaining - 1;
        if (newTime <= 0) {
          set({
            currentMatch: { ...currentMatch, timeRemaining: 0, status: "finished" },
          });
          get().finishMatch();
          return;
        }

        set({
          currentMatch: { ...currentMatch, timeRemaining: newTime },
        });
      },

      finishMatch: () => {
        const { currentMatch, record } = get();
        if (!currentMatch) return;

        const playerWon = currentMatch.playerScore > currentMatch.opponentScore;
        const isDraw = currentMatch.playerScore === currentMatch.opponentScore;

        const newRecord: DuelRecord = {
          wins: record.wins + (playerWon ? 1 : 0),
          losses: record.losses + (!playerWon && !isDraw ? 1 : 0),
          draws: record.draws + (isDraw ? 1 : 0),
        };

        set({ record: newRecord, status: "finished" });

        // Award economy tokens
        const rewardCoins = playerWon ? DUEL_WIN_COINS : isDraw ? DUEL_DRAW_COINS : DUEL_LOSS_COINS;
        useEconomyStore.getState().addCoins(rewardCoins);

        // Award gems on win only
        if (playerWon) {
          useEconomyStore.getState().addGems(DUEL_WIN_GEMS);
        }
      },

      resetMatch: () => {
        set({ currentMatch: null, status: "idle" });
      },
    }),
    {
      name: "duels-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        record: state.record,
      }),
    }
  )
);
