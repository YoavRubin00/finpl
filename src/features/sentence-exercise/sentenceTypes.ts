// Types for the Interactive Recall phase, a Duolingo-style consolidation step
// that sits between flashcards and quizzes. Two prompt shapes share the engine:
// fill-blank (template with slots + word bank) and timeline-order (reorder cards).

export type RecallExerciseType = "fill-blank" | "timeline-order";

export interface FinnReactions {
  /** Rotated randomly on correct answer */
  correct: string[];
  /** Shown after the 1st wrong attempt on a prompt */
  empathicFirst: string;
  /** Revealed after the 2nd wrong attempt, more specific nudge */
  hintAfterTwoWrongs: string;
}

// ── Fill-Blank ───────────────────────────────────────────────────────────────

export interface FillBlankSlot {
  slotId: string;
  correctChoiceId: string;
  /** Shown after the slot is filled correctly, reinforcement copy */
  explanation: string;
}

export interface FillBlankChoice {
  id: string;
  text: string;
}

export interface FillBlankPrompt {
  type: "fill-blank";
  id: string;
  /** Sentence with {{slotId}} placeholders, tokenized at render time */
  template: string;
  slots: FillBlankSlot[];
  /** Shared word bank for all slots in this prompt (distractors included) */
  choices: FillBlankChoice[];
  finn: FinnReactions;
  difficulty: "easy" | "medium" | "hard";
}

// ── Timeline-Order ───────────────────────────────────────────────────────────

export interface TimelineOrderItem {
  id: string;
  label: string;
  /** 0-based position in the correct sequence */
  correctOrder: number;
  /**
   * Optional year/sequence number shown as a blank while sorting.
   * Revealed in blue after the user submits the correct order.
   */
  yearNumber?: string;
}

export interface TimelineOrderPrompt {
  type: "timeline-order";
  id: string;
  /** User-facing instruction text, e.g. "סדר את השנים לפי גודל החיסכון" */
  instruction: string;
  items: TimelineOrderItem[];
  finn: FinnReactions;
  difficulty: "easy" | "medium" | "hard";
}

// ── Composition ──────────────────────────────────────────────────────────────

export type RecallPrompt = FillBlankPrompt | TimelineOrderPrompt;

export interface InteractiveRecallSet {
  moduleId: string;
  title: string;
  intro: string;
  prompts: RecallPrompt[];
}

export type FinnMood =
  | "standard"
  | "happy"
  | "empathic"
  | "fire"
  | "dancing"
  | "talking";

export interface InteractiveRecallState {
  currentIndex: number;
  /** Wrong-attempt counter keyed by prompt.id */
  wrongCount: Record<string, number>;
  /**
   * Per-prompt placement state:
   *   fill-blank: Record<slotId, choiceId | null>
   *   timeline-order: string[] (itemIds in user-chosen order)
   */
  placement: Record<string, Record<string, string | null> | string[]>;
  /** Consecutive first-try-correct answers across the session */
  streak: number;
  totalXp: number;
  totalCoins: number;
  finnMood: FinnMood;
  /** Speech bubble text currently shown above Finn */
  finnMessage: string;
  isComplete: boolean;
}