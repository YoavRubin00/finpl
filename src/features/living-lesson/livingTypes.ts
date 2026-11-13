import type { FlashcardSegment, FlashcardVisual } from "../chapter-1-content/types";
import type { ErosionVisualSpec, FlowVisualSpec } from "./visuals/flow/flowTypes";

/**
 * Every visual a living segment can carry: the primitives the lesson data
 * already uses (`FlashcardVisual`) plus the living diagrams, which live in
 * this feature and attach through the registry (lessonVisuals.ts) so the
 * lesson data files stay untouched.
 */
export type LivingVisual = FlashcardVisual | FlowVisualSpec | ErosionVisualSpec;

export interface LivingSegment extends Omit<FlashcardSegment, "visual"> {
  visual?: LivingVisual;
}
