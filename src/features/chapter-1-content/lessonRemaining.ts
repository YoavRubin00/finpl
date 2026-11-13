// src/features/chapter-1-content/lessonRemaining.ts
//
// "What is still ahead in this lesson" — one source for the exit sheet copy
// ("נשארו 2 שאלות, בערך 40 שניות") and for the lesson_exited_early props, so
// the number the user reads and the number PostHog gets can never disagree.
// Pure functions, no React.

import type { Module } from './types';
import type { TopicKind } from '../topic-learning/types';

/** Rough reading / answering times. Deliberately a little optimistic: the
 *  estimate is shown at the moment the user considers leaving. */
const SECONDS_PER_CARD = 12;
const SECONDS_PER_QUESTION = 15;

export interface LessonRemaining {
  cardsLeft: number;
  questionsLeft: number;
  seconds: number;
}

export interface LessonPosition {
  /** 0-based position inside the current phase (card / question index). */
  index: number;
  /** Number of items in the current phase (0 when the phase has no steps). */
  total: number;
}

interface RemainingInput {
  mod: Module;
  /** Chip kinds in the order the lesson plays them (resolveTopics order). */
  chipOrder: TopicKind[];
  /** Chip the user is on right now; undefined for hero / video (before intro). */
  currentKind: TopicKind | undefined;
  flashcardIndex: number;
  quizIndex: number;
  /** Questions asked in the quiz phase (quick-check questions already removed). */
  quizPhaseTotal: number;
  /** Quick-check questions still ahead inside the cards phase. */
  quickChecksAhead: number;
}

export function estimateRemaining({
  mod,
  chipOrder,
  currentKind,
  flashcardIndex,
  quizIndex,
  quizPhaseTotal,
  quickChecksAhead,
}: RemainingInput): LessonRemaining {
  // hero / video sit before the first chip → everything is still ahead.
  const currentPos = currentKind ? chipOrder.indexOf(currentKind) : -1;
  const isAhead = (kind: TopicKind): boolean => {
    const pos = chipOrder.indexOf(kind);
    return pos >= 0 && pos > currentPos;
  };

  const cardsTotal = mod.flashcards.length;
  let cardsLeft = 0;
  let questionsLeft = 0;

  if (currentKind === 'cards') {
    cardsLeft = Math.max(0, cardsTotal - flashcardIndex);
    questionsLeft += quickChecksAhead;
  } else if (isAhead('cards')) {
    cardsLeft = cardsTotal;
    questionsLeft += quickChecksAhead;
  }

  if (currentKind === 'quiz') {
    questionsLeft += Math.max(0, quizPhaseTotal - quizIndex);
  } else if (isAhead('quiz')) {
    questionsLeft += quizPhaseTotal;
  }

  return {
    cardsLeft,
    questionsLeft,
    seconds: cardsLeft * SECONDS_PER_CARD + questionsLeft * SECONDS_PER_QUESTION,
  };
}

function cardsHe(n: number): string {
  return n === 1 ? 'כרטיסייה אחת' : `${n} כרטיסיות`;
}

function questionsHe(n: number): string {
  return n === 1 ? 'שאלה אחת' : `${n} שאלות`;
}

function durationHe(seconds: number): string {
  if (seconds < 55) return `בערך ${Math.max(20, Math.round(seconds / 10) * 10)} שניות`;
  if (seconds < 90) return 'בערך דקה';
  return `בערך ${Math.round(seconds / 60)} דקות`;
}

/**
 * System voice (docs/BRAND.md): short, concrete, no guilt. Returns null when
 * there is nothing countable ahead (sim / game / dilemma), so the caller can
 * fall back to its generic line.
 *   "נשארו 2 כרטיסיות ו-3 שאלות, בערך דקה."
 *   "נשארה שאלה אחת, בערך 20 שניות."
 */
export function formatRemainingHe({ cardsLeft, questionsLeft, seconds }: LessonRemaining): string | null {
  const parts: string[] = [];
  if (cardsLeft > 0) parts.push(cardsHe(cardsLeft));
  if (questionsLeft > 0) parts.push(questionsHe(questionsLeft));
  if (parts.length === 0) return null;
  const single = parts.length === 1 && cardsLeft + questionsLeft === 1;
  // "ו" attaches directly to a word ("ושאלה אחת") and takes a hyphen before a digit ("ו-3 שאלות").
  const joined = parts.length === 2
    ? `${parts[0]} ${questionsLeft === 1 ? 'ו' : 'ו-'}${parts[1]}`
    : parts[0];
  return `${single ? 'נשארה' : 'נשארו'} ${joined}, ${durationHe(seconds)}.`;
}
