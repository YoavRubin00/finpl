/**
 * Finn Mascot, Configuration
 *
 * Dual system:
 *   Lottie animations, for animated/looping contexts (feed, chat, typing)
 *   WebP images, for static/contextual displays (tips, quiz reactions, greeting)
 *
 * WebP variants:
 *   fin-hello hand.webp, greeting / onboarding
 *   fin-happy.webp, celebrating / correct answer
 *   fin-empathic.webp, empathy / wrong answer
 *   fin-standard.webp, idle / standard
 *   fin-fire-1.webp, streak fire / urgency (at-risk banner, calendar, header)
 *   fin-talking-1.webp, speaking to user (intro cards, chat typing)
 *   fin-tablet-1.webp, taking notes (onboarding Q&A acknowledgement)
 *   fin-dancing-1.webp, celebration / victory moments (milestones, summaries)
 */
import type { AnimationObject } from "lottie-react-native";
import type { ImageSource } from "expo-image";

export type FinnAnimationState =
  | "idle"
  | "celebrate"
  | "empathy"
  | "thinking"
  | "detective"
  | "vs"
  | "fire"
  | "talking"
  | "tablet"
  | "dancing";

// ── Lottie (animated, looping) ──────────────────────────────────────────────

/** Standard idle / presence animation */
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const FINN_SOURCE_STANDARD = require("../../../assets/lottie/fin-standard.json") as unknown as AnimationObject;

/** Celebration / success animation, lazy-loaded */
let _excitedCache: AnimationObject | null = null;
export function FINN_SOURCE_EXCITED(): AnimationObject {
  if (!_excitedCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _excitedCache = require("../../../assets/lottie/fin-excited.json") as unknown as AnimationObject;
  }
  return _excitedCache;
}

/** Backward-compatible alias, Lottie standard */
export const FINN_LOTTIE_SOURCE = FINN_SOURCE_STANDARD;

/** Maps state to Lottie source (for animated contexts) */
export function getFinnSource(state: FinnAnimationState): AnimationObject {
  return state === "celebrate" ? FINN_SOURCE_EXCITED() : FINN_SOURCE_STANDARD;
}

// ── WebP Images (static, contextual) ────────────────────────────────────────

export const FINN_HELLO: ImageSource = require("../../../assets/webp/fin-hello.webp");
export const FINN_HAPPY: ImageSource = require("../../../assets/webp/fin-happy.webp");
export const FINN_EMPATHIC: ImageSource = require("../../../assets/webp/fin-empathic.webp");
export const FINN_STANDARD: ImageSource = require("../../../assets/webp/fin-standard.webp");

// New variants, see header comment for usage guidance.
export const FINN_FIRE: ImageSource = require("../../../assets/webp/fin-fire-1.webp");
export const FINN_TALKING: ImageSource = require("../../../assets/webp/fin-talking-1.webp");
export const FINN_TABLET: ImageSource = require("../../../assets/webp/fin-tablet-1.webp");
export const FINN_DANCING: ImageSource = require("../../../assets/webp/fin-dancing-1.webp");

/** Maps state to WebP image source (for static contexts) */
export function getFinnImage(state: FinnAnimationState): ImageSource {
  switch (state) {
    case "celebrate": return FINN_HAPPY;
    case "empathy": return FINN_EMPATHIC;
    case "thinking": return FINN_STANDARD;
    case "detective": return FINN_STANDARD;
    case "vs": return FINN_HAPPY;
    case "fire": return FINN_FIRE;
    case "talking": return FINN_TALKING;
    case "tablet": return FINN_TABLET;
    case "dancing": return FINN_DANCING;
    default: return FINN_STANDARD;
  }
}
