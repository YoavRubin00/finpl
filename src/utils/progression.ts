import type { PyramidLayer, PyramidStatus } from "../types/economy";
import {
  LEVEL_THRESHOLDS,
  LEVEL_TO_PYRAMID_LAYER,
} from "../constants/economy";

/** PRD section 4.2 — canonical layer names. */
const LAYER_NAMES: Record<PyramidLayer, string> = {
  0: "Entry to Financial World",
  1: "Survival & Control",
  2: "Safety & Protection",
  3: "Stability & Habits",
  4: "Growth",
  5: "Freedom",
};

export function getLevelFromXP(xp: number): number {
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Returns the pyramid layer (1–5) for a given XP total.
 * PRD section 4.2: Level 0 → Layer 1, Level 1 → Layer 2, ..., Level 4+ → Layer 5.
 */
export function getPyramidLayer(xp: number): PyramidLayer {
  const level = getLevelFromXP(xp);
  return LEVEL_TO_PYRAMID_LAYER[level] as PyramidLayer;
}

export function getXPToNextLevel(xp: number): number {
  const level = getLevelFromXP(xp);
  // Use bounds check — LEVEL_THRESHOLDS is a const tuple, so its element type
  // never includes undefined; comparing to undefined would be TS2367.
  if (level >= LEVEL_THRESHOLDS.length - 1) return 0; // max level reached
  return (LEVEL_THRESHOLDS as readonly number[])[level + 1]! - xp;
}

/** Returns a 0–1 progress ratio within the current level band. */
export function getLevelProgress(xp: number): number {
  const level = getLevelFromXP(xp);
  if (level >= LEVEL_THRESHOLDS.length - 1) return 1; // max level, full bar
  const thresholds = LEVEL_THRESHOLDS as readonly number[];
  const currentThreshold = thresholds[level]!;
  const nextThreshold = thresholds[level + 1]!;
  return (xp - currentThreshold) / (nextThreshold - currentThreshold);
}

/**
 * Primary derived selector used by UI components and the store.
 * Returns all pyramid-related state derived purely from xp.
 * PRD section 4.2.
 */
export function getPyramidStatus(xp: number): PyramidStatus {
  const level = getLevelFromXP(xp);
  const layer = getPyramidLayer(xp);
  return {
    level,
    layer,
    layerName: LAYER_NAMES[layer],
    xpToNextLevel: getXPToNextLevel(xp),
    progressToNextLevel: getLevelProgress(xp),
  };
}
