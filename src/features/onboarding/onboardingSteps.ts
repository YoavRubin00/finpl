// Stable step ids for the onboarding funnel events (`onboarding_step_viewed`,
// `onboarding_step_completed`). Activation pass 2026-11-20: the completion
// event only carried `step_name`, with no position, so PostHog could not order
// the steps or show where people leave. Every step event now carries
// `step` (stable id), `step_index` and `total_steps` from the lists below.
//
// `step_index` is the position in the CANONICAL order for the mode. Keep the
// ids stable; add new steps at the position they appear, and never reuse an id
// for a different screen.
//
// Order history (for reading older PostHog data):
//   2026-11-20 a: intro(0) dream(1) goal(2) age(3) signup-gate(4) first-chest(5), total 6
//   2026-11-20 b: intro(0) age(1) signup-gate(2) first-chest(3), total 4 (this file)
//     One flow for every new user, onboarding experiments cancelled. The dream
//     question is gone and the goal question moved onto the welcome screen, so
//     'intro' now carries the goal answer (profile.financialGoal). A signed-in
//     account that skips the gate goes intro → age → first-chest.

/** New-user onboarding, first launch → first lesson. 'intro' is the welcome
 *  screen with the goal question; 'first-chest' is the welcome chest
 *  (PostWalkthroughFirstChest), the last screen before mod-0-1. */
export const ONBOARDING_STEP_ORDER = [
  "intro",
  "age",
  "signup-gate",
  "first-chest",
] as const;

/** Profile redo (ProfileScreen → ProfilingFlow mode="redo"). 'knowledge' and
 *  'daily-goal' are only reached by editing a row of the summary. */
export const REDO_STEP_ORDER = [
  "goal",
  "age",
  "profile-summary",
  "knowledge",
  "daily-goal",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_ORDER)[number];
export type OnboardingMode = "new" | "redo";

export interface OnboardingStepProps {
  step: string;
  step_index: number;
  total_steps: number;
}

/** Step position props for the funnel events. A step that is not in the
 *  mode's list (a transient internal state) gets step_index -1. */
export function onboardingStepProps(step: string, mode: OnboardingMode = "new"): OnboardingStepProps {
  const order: readonly string[] = mode === "redo" ? REDO_STEP_ORDER : ONBOARDING_STEP_ORDER;
  return { step, step_index: order.indexOf(step), total_steps: order.length };
}

/** True for the steps that are real screens in this mode (gets a viewed event). */
export function isTrackedOnboardingStep(step: string, mode: OnboardingMode = "new"): boolean {
  const order: readonly string[] = mode === "redo" ? REDO_STEP_ORDER : ONBOARDING_STEP_ORDER;
  return order.includes(step);
}
