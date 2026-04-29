export interface DilemmaOption {
  id: "a" | "b";
  label: string;
  /** Shark's feedback shown after this option is chosen */
  feedback: string;
  /** true = this is the financially wiser choice */
  isWise: boolean;
  /** Score delta this choice contributes. Defaults to isWise ? +1 : -1 */
  scoreImpact?: number;
}

/** A single step inside a branching dilemma. */
export interface DilemmaSlide {
  /** Unique within the parent dilemma. Referenced by `branches`. */
  id: string;
  scenario: string;
  options: [DilemmaOption, DilemmaOption];
  /**
   * Per-choice next-slide. Missing key = that choice ends the story.
   * Example: { b: "s2" } — choosing 'a' is terminal, choosing 'b' goes to s2.
   */
  branches?: Partial<Record<"a" | "b", string>>;
}

export interface SharkDilemma {
  moduleId: string;
  // --- Legacy single-slide shape (still supported) ---
  /** Scenario text shown inside the speech bubble */
  scenario?: string;
  options?: [DilemmaOption, DilemmaOption];
  // --- Branching multi-slide shape ---
  /** When present, the card runs as a branching story. */
  slides?: DilemmaSlide[];
  /** Defaults to slides[0].id when slides is set. */
  startSlideId?: string;
}

/** Aggregate of choices made through one playthrough. */
export interface DilemmaResult {
  path: { slideId: string; choiceId: "a" | "b"; isWise: boolean }[];
  totalScore: number;
  wiseCount: number;
  unwiseCount: number;
}
