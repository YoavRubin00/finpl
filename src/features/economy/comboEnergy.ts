/**
 * In-lesson combo → energy charging. The existing consecutive-correct streak in
 * LessonFlowScreen already grants a `streak_bonus` XP at completion; this module
 * adds the ENERGY-battery sync (Yoav 2026-06-17 "be in sync with the energy
 * battery"): a clean streak charges the purple energy units via the reserved
 * `grantEnergy('combo', …)` source (see useHeartsStore — `'combo'` was already
 * a reserved energy source).
 *
 * Calibration is data-backed (PostHog 2026-06): lessons hold only ~4 graded quiz
 * questions (max question_index = 3) at a 98% correct rate, so combos top out
 * around 3-4 and energy is rarely spent — a charge every 3 correct with a small
 * daily cap can't dent the out-of-energy paywall (אודרי-safe).
 */

/** Grant energy every N consecutive correct answers. */
export const COMBO_ENERGY_EVERY = 3;
/** Energy units granted per charge. */
export const COMBO_ENERGY_AMOUNT = 1;
/** Per-day cap on combo-sourced energy (≈30% of MAX 20). Passed to
 *  grantEnergy's dailyCap so combos can't farm past the paywall. */
export const COMBO_ENERGY_DAILY_CAP = 6;

/** True when this streak length lands on an energy-charge milestone. */
export function isComboEnergyMilestone(combo: number): boolean {
  return combo > 0 && combo % COMBO_ENERGY_EVERY === 0;
}