/**
 * Shared tokens for the "living lesson" experience (Yoav 1.8).
 * Dark, premium, game-feel — replaces the PNG-infographic flashcards.
 * Palette matches the dark-mode accents already used elsewhere in the app
 * (e.g. GlossaryTooltip's dark variant: navy bg + amber accent) so the new
 * experience reads as FinPlay, not a bolted-on UI kit.
 */
import type { WithSpringConfig, WithTimingConfig } from "react-native-reanimated";
import { Easing } from "react-native-reanimated";

export const LL_COLORS = {
  /** Deepest background — the living-flashcard's own canvas. */
  bgDeep: "#0c1426",
  /** Panel / visual-host background, one step up from bgDeep. */
  bgPanel: "#101b33",
  /** Slightly lighter card surface (visual chrome, chips). */
  bgCard: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(56,189,248,0.35)",
  textPrimary: "#f1f5f9",
  textSecondary: "rgba(226,232,240,0.68)",
  textMuted: "rgba(226,232,240,0.45)",
  /** Brand cyan — glossary links, primary bars/lines (matches renderBoldText's [[term]] color). */
  brandCyan: "#0ea5e9",
  brandCyanBright: "#38bdf8",
  /** Amber/gold — **emphasis** words. Matches the dark-mode glossary pill accent. */
  emphasis: "#facc15",
  emphasisDeep: "#eab308",
  success: "#22c55e",
} as const;

export const RTL_STYLE = {
  writingDirection: "rtl" as const,
  textAlign: "right" as const,
};

export const RTL_ROW = {
  flexDirection: "row-reverse" as const,
};

// ---------------------------------------------------------------------------
// Motion presets — "מרהיב אבל מהיר": visible physics, never sluggish.
// ---------------------------------------------------------------------------

/** Segment entrance: fade + rise + scale, tiny settle-bounce. */
export const SEGMENT_SPRING: WithSpringConfig = {
  damping: 14,
  stiffness: 180,
  mass: 0.9,
};

/** Visual-card entrance: a touch bouncier than text, it's the "reward" beat. */
export const VISUAL_SPRING: WithSpringConfig = {
  damping: 12,
  stiffness: 170,
  mass: 0.9,
};

/** Bars / fills racing to their value — visible overshoot then settle. */
export const RACE_SPRING: WithSpringConfig = {
  damping: 11,
  stiffness: 140,
  mass: 0.9,
};

/** Line-draw progress — soft overshoot past 100% then a quick settle back. */
export const DRAW_SPRING: WithSpringConfig = {
  damping: 9,
  stiffness: 90,
  mass: 0.6,
};

/** Coin/step stacking — punchy little bounce per step. */
export const STACK_SPRING: WithSpringConfig = {
  damping: 10,
  stiffness: 220,
  mass: 0.8,
};

/** Bold-word pop-in. */
export const EMPHASIS_SPRING: WithSpringConfig = {
  damping: 12,
  stiffness: 260,
  mass: 0.6,
};

export const COUNTER_TIMING = (durationMs: number): WithTimingConfig => ({
  duration: durationMs,
  easing: Easing.inOut(Easing.cubic),
});

/** Micro-delay between consecutive **bold** words revealed in one segment. */
export const EMPHASIS_STAGGER_MS = 70;

/** Delay before a segment's visual starts animating, after its text lands. */
export const VISUAL_DELAY_MS = 150;

/** Stagger between list-like sub-items inside a visual (bars, milestones, coins). */
export const ITEM_STAGGER_MS = 90;
