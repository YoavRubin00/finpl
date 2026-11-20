/**
 * Module-first first-run experiment (`onboarding_module_first`): CANCELLED.
 *
 * Killed 2026-07-07 (v1 onboarding completion 8% vs 57% for control, see
 * DECISION-LOG) and removed 2026-11-20 together with the other onboarding
 * experiments ("cancel the experiments, go with the short option"). Every new
 * user now gets the one short flow: welcome + goal question → age → signup
 * gate → welcome chest → mod-0-1. No arm is drawn, no
 * `bandit_variant_assigned` / person property is written for it, and the
 * experiment is gone from banditConfig.
 *
 * What is left here are inert stubs, ONLY because two files this pass does not
 * edit still import them:
 *   - app/_layout.tsx: calls ensureFirstRunAssignment() at boot and reads
 *     MODULE_FIRST_ENABLED in its redirect guard (the module-first branch is
 *     dead because the constant is false).
 *   - src/features/chapter-1-content/LessonFlowScreen.tsx (lesson engine,
 *     edited by others): three isModuleFirstArm() checks, all false.
 * Delete this file together with those call sites when the files are free.
 *
 * Users who were assigned the arm before: their persisted
 * useTutorialStore.firstRunArm / firstRunStage are cleared on rehydrate
 * (useTutorialStore), and since isModuleFirstArm() is false they have been in
 * the normal flow since July anyway.
 */

/** Always false: the module-first flow no longer exists. */
export const MODULE_FIRST_ENABLED = false as const;

/** Always false: no user is in the module-first arm any more. */
export function isModuleFirstArm(): boolean {
  return false;
}

/** No-op: nothing is assigned at boot any more (kept for app/_layout.tsx). */
export function ensureFirstRunAssignment(): void {
  /* intentionally empty */
}
