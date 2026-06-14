/**
 * Path Scenes — decorative looping Shark+Daisy animations rendered in the
 * LEFT/RIGHT margins beside the sub-module (topic-tree) path, Duolingo-style.
 *
 * Each flagship module shows EXACTLY 2 loops (one per side): a module-THEMED
 * loop + a GENERIC celebratory loop. Non-flagship topic-tree modules fall back
 * to a generic pair.
 *
 * Produced 2026-06-10 by the `finplay-mascot-webp` skill: Higgsfield reference
 * Elements (shark-finn-v2 + daisy-finplay, built from the existing fin-*.webp /
 * daisy/*.webp) → green-screen video → ffmpeg chroma-key → 240px transparent
 * animated WebP (palindrome loop). Same visual language as the existing pack.
 *
 * Decorative only: rendered accessible={false}, pointerEvents="none", suppressed
 * under useReducedMotion(). See ModuleTopicLayout.tsx.
 */
import type { ImageSource } from "expo-image";

export interface PathScene {
  /** Stable id, also the React key. */
  id: string;
  /** Looping transparent animated WebP. */
  source: ImageSource;
  /** Hebrew description — documentation only (element is accessible={false}). */
  label: string;
}

// ── Generic (reusable) celebratory loops ──────────────────────────────
// All re-processed 2026-06-10 (`-v2`): full-frame transparent pad instead of a
// square crop, so NO character is ever clipped (Yoav: "כל הוובפים חתוכים").
// The `-v2` filenames also bust Metro's stale asset cache.
//
// Iter 4 (2026-06-10): `shark-coins-v2` + `shark-daisy-chart-v2` had black
// letterbox bars BAKED INTO THE WEBP frames (not just a render artifact —
// verified by extracting frame 0 and seeing the black columns directly).
// They were re-cropped in-place via ffmpeg `crop=` so the bars are gone
// before metro touches them (no in-app cropping or contentFit trick needed).
const GENERIC = {
  highfive: { id: "g-highfive", label: "קפטן שארק ודייזי נותנים כיף", source: require("../../../assets/webp/path-scenes/shark-daisy-highfive-v2.webp") },
  coins: { id: "g-coins", label: "קפטן שארק סופר מטבעות זהב", source: require("../../../assets/webp/path-scenes/shark-coins-v2.webp") },
  chart: { id: "g-chart", label: "קפטן שארק ודייזי וגרף עולה", source: require("../../../assets/webp/path-scenes/shark-daisy-chart-v2.webp") },
  cheer: { id: "g-cheer", label: "דייזי מעודדת את קפטן שארק", source: require("../../../assets/webp/path-scenes/daisy-cheer-shark-v2.webp") },
} satisfies Record<string, PathScene>;

// ── Module-themed loops (1 per flagship module) ───────────────────────
const THEMED = {
  // m1-1-coin-growth-v2.webp shipped with BOTH characters cropped at the frame
  // edges (Captain Shark cut through the middle, Daisy clipped) — Yoav
  // 2026-06-15. Swapped to the whole, well-padded shark-coins loop (coin-themed,
  // fits compound interest) so nothing is cut. Restore a bespoke growing-pile
  // asset here once it's regenerated with ≥15% padding (finplay-mascot-webp).
  "mod-1-1": { id: "t-1-1", label: "קפטן שארק עם מטבע — ריבית דריבית", source: require("../../../assets/webp/path-scenes/shark-coins-v2.webp") },
  "mod-1-9": { id: "t-1-9", label: "מטרייה וצנצנת חיסכון — קרן חירום", source: require("../../../assets/webp/path-scenes/m1-9-emergency-umbrella-v2.webp") },
  "mod-3-15": { id: "t-3-15", label: "מחירים עולים — אינפלציה", source: require("../../../assets/webp/path-scenes/m3-15-inflation-prices-v2.webp") },
  "mod-4-19": { id: "t-4-19", label: "גרף נרות עולה — שוק ההון", source: require("../../../assets/webp/path-scenes/m4-19-market-rising-v2.webp") },
  "mod-5-25": { id: "t-5-25", label: "ערסל על החוף — חופש כלכלי", source: require("../../../assets/webp/path-scenes/m5-25-freedom-hammock-v2.webp") },
} satisfies Record<string, PathScene>;

/**
 * Per-module pair: [themed, generic]. The themed loop sits on one gutter, the
 * generic on the opposite gutter. Exactly 2 per module — never more.
 *
 * The generic is deliberately a DIFFERENT *kind* of scene than the themed one
 * (Yoav 2026-06-10: "2 סוגים של וובפים ולא 2 זהים"): every themed loop is
 * object-led (coins / umbrella / price-tag / chart / hammock), so each is
 * paired with a pure character-celebration generic (high-five or cheer) for
 * visual contrast. NOTE: mod-4-19 was previously paired with GENERIC.chart —
 * two chart scenes — which read as "the same type"; now paired with cheer.
 */
export const MODULE_SCENES: Record<string, readonly [PathScene, PathScene]> = {
  "mod-1-1": [THEMED["mod-1-1"], GENERIC.highfive],
  "mod-1-9": [THEMED["mod-1-9"], GENERIC.cheer],
  "mod-3-15": [THEMED["mod-3-15"], GENERIC.highfive],
  "mod-4-19": [THEMED["mod-4-19"], GENERIC.cheer],
  "mod-5-25": [THEMED["mod-5-25"], GENERIC.highfive],
};

/** Generic fallback pair for any topic-tree module without a themed entry —
 *  two distinct kinds (money-flip + rising-chart), never two identical. */
const FALLBACK_PAIR: readonly [PathScene, PathScene] = [GENERIC.coins, GENERIC.chart];

/** The exactly-2 scenes to show beside a module's sub-module path. */
export function scenesForModule(moduleId: string | undefined): readonly [PathScene, PathScene] {
  return (moduleId && MODULE_SCENES[moduleId]) || FALLBACK_PAIR;
}
