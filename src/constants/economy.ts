/**
 * Single source of truth for all economy constants.
 * Values must stay in sync with PRD.md section 4.2.
 */

/**
 * XP required to reach each level.
 * Index = level number (0–5). Higher thresholds to decouple from learning stages.
 * Levels are earned through engagement (streaks, daily login, feed, lessons).
 */
export const LEVEL_THRESHOLDS = [0, 400, 1000, 2000, 4000, 7000] as const;

/**
 * Maps each level (0–5) to its pyramid layer (1–5).
 * Level 0 → Layer 1 (Survival), ..., Level 4+ → Layer 5 (Freedom).
 * PRD section 4.2.
 */
export const LEVEL_TO_PYRAMID_LAYER = [1, 2, 3, 4, 5, 5] as const;

/** XP awarded for completing onboarding. PRD-7. */
export const ONBOARDING_XP = 100;

/** XP awarded for completing the daily task. */
export const DAILY_TASK_XP = 20;

/** Coins awarded for completing the daily task. */
export const DAILY_TASK_COINS = 300;

/**
 * Base XP multiplier for streak bonuses.
 * Formula: STREAK_BONUS_BASE_XP × current streak count.
 * PRD section 4.1.1.
 */
export const STREAK_BONUS_BASE_XP = 10;

/** XP awarded for opening the app (once per day). */
export const LOGIN_BONUS_XP = 15;

/** XP awarded for viewing a wisdom flash. */
export const WISDOM_VIEWED_XP = 5;

/** XP awarded for correct macro event guess. */
export const MACRO_EVENT_CORRECT_XP = 15;

/** XP awarded for winning a duel. */
export const DUEL_WIN_XP = 25;

/** Bonus XP at 7-day streak milestone. */
export const STREAK_7_BONUS_XP = 50;

/** Bonus XP at 30-day streak milestone (recurring every 30 days). */
export const STREAK_30_BONUS_XP = 200;
