import type { QuizQuestion } from "../chapter-1-content/types";

export type DuelStatus = "idle" | "searching" | "ready" | "playing" | "finished";

export interface DuelOpponent {
  id: string;
  name: string;
  avatar: string;
  level: number;
}

export type AnswerFeedback = {
  isCorrect: boolean;
  selectedIndex: number;
  correctIndex: number;
} | null;

export interface DuelMatch {
  id: string;
  opponent: DuelOpponent;
  questions: QuizQuestion[];
  playerScore: number;
  opponentScore: number;
  currentQuestionIndex: number;
  timeRemaining: number;
  status: DuelStatus;
  streak: number;
  bestStreak: number;
  totalAnswered: number;
  answerFeedback: AnswerFeedback;
}

export interface DuelRecord {
  wins: number;
  losses: number;
  draws: number;
}
