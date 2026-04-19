/**
 * SIM 4-29: מיון המניות (Stock Sorter), Module 4-29
 * Types for the stock classification sorting simulation.
 */

export interface StockCard {
  id: string;
  name: string;
  emoji: string;
  ticker: string;
  marketCapB: number;
  peRatio: number;
  dividendYield: number;
  sector: string;
  isGrowth: boolean;
  isCyclical: boolean;
  capSize: 'large' | 'mid' | 'small';
  explanationHe: string;
}

export type QuestionType = 'growth_value' | 'cyclical_defensive' | 'cap_size';

export interface SortQuestion {
  card: StockCard;
  questionType: QuestionType;
  correctAnswer: string;
}

export interface StockSorterConfig {
  questions: SortQuestion[];
}

export interface StockSorterState {
  currentQuestionIndex: number;
  answers: (string | null)[];
  isComplete: boolean;
}

export interface StockSorterScore {
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  gradeLabel: string;
}
