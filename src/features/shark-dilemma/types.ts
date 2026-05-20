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
  // --- Video-first shape (pause-in-place) ---
  /**
   * When set, the dilemma plays as a Captain Shark video that pauses
   * mid-clip to show the dilemma overlay; after the user picks, the
   * video resumes to a freeze-frame, then a feedback reveal animates in.
   * Routed by LessonFlowScreen to <VideoSharkDilemmaCard> instead of
   * the static <SharkDilemmaCard>. Only meaningful for single-slide dilemmas
   * (the branching shape is handled by the legacy card).
   */
  videoUri?: string;
  /** Seconds at which the video auto-pauses to reveal the dilemma. Default 2.5. */
  videoPauseAtSec?: number;
}

/** Aggregate of choices made through one playthrough. */
export interface DilemmaResult {
  path: { slideId: string; choiceId: "a" | "b"; isWise: boolean }[];
  totalScore: number;
  wiseCount: number;
  unwiseCount: number;
}
