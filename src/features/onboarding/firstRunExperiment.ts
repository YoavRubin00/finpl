/**
 * Module-first first-run experiment (`onboarding_module_first`, Yoav 5.7.26).
 *
 * Screen-1 of onboarding is the funnel's biggest leak (−18.6%) — users bail on
 * profiling friction before seeing any value. The treatment inverts the first
 * run: one-tap hook → mod-0-1 (value first) → profiling → tour LAST.
 *
 * WHY NOT useBandit(): the hook re-rolls per component instance and never
 * persists the selection — a first-run experiment must decide the arm ONCE
 * (before the first screen paints) and hold it across app-kills. So the arm is
 * drawn here at boot, persisted in useTutorialStore.firstRunArm
 * (tutorial-store-v13), and every orchestration point reads the persisted
 * value through isModuleFirstArm().
 *
 * Orchestration map (v1 = module_first):
 *   1. app/_layout.tsx boot gate  → ensureFirstRunAssignment() before routes render
 *   2. ProfilingFlow              → renders ModuleFirstHook instead of IntroStep
 *   3. hook tap                   → enterGuestMode + stage 'module' + /lesson/mod-0-1
 *   4. _layout redirect guard     → allows ONLY /lesson/mod-0-1 pre-onboarding; resumes into it
 *   5. LessonFlowScreen exits     → hand off to /(auth)/onboarding (stage 'profiling')
 *   6. ProfilingFlow (guest)      → starts at 'dream' as usual → enterFirstModule → tour
 *
 * KILL SWITCHES (in escalation order):
 *   - banditConfig allocation v1 → 0  (stops NEW assignments only)
 *   - banditConfig pinned control     (same, explicit)
 *   - MODULE_FIRST_ENABLED = false    (ALSO rescues in-flight v1 users: every
 *     orchestration read flips to control on the next render; a stranded guest
 *     falls back into the classic onboarding flow)
 */
import { track } from '../../lib/analytics/events';
import { setPersonProperties } from '../../lib/posthog';
import { useBanditStore } from '../bandit/useBanditStore';
import { EXPERIMENT_CONFIGS } from '../bandit/banditConfig';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useAuthStore } from '../auth/useAuthStore';

export const FIRST_RUN_EXPERIMENT_ID = 'onboarding_module_first' as const;

/** Hard kill for the module-first flow, INCLUDING in-flight users.
 *
 *  KILLED 2026-07-07 (Yoav: "הניסוי לא עובד") — production data from the
 *  1.4.3 rollout (4-6.7) smashed the pre-committed guardrail (v1 must hold
 *  ≥85% of v0's onboarding completion): v1 assigned=12 → onboarding_completed
 *  = 1 (8%) vs v0 30 → 17 (57%). Funnel autopsy: ~33% of v1 died at the hook
 *  screen without ever firing lesson_started; of the 8 who entered mod-0-1,
 *  only 2 reached any chest — value-first WITHOUT profiling investment
 *  produced drive-by tourists, not activated users (no crash signal; the
 *  flow worked, the design didn't). Flipping this to false rescues in-flight
 *  v1 guests into the classic flow on next render. NOTE: new installs run
 *  the EMBEDDED 1.4.3 bundle on their first session, so ~20% of new users
 *  stay exposed until the next native build ships with this kill baked in. */
export const MODULE_FIRST_ENABLED = false;

const VARIANT_BY_ARM = {
  control: 'onboarding_module_first_v0',
  module_first: 'onboarding_module_first_v1',
} as const;

export type FirstRunArm = keyof typeof VARIANT_BY_ARM;

/** Bandit variant id for the persisted arm — for recordConversion call sites. */
export function firstRunVariantId(arm: FirstRunArm): string {
  return VARIANT_BY_ARM[arm];
}

/**
 * TRUE only when this install is an in-flight module-first (v1) user and the
 * experiment is enabled. Single source of truth for every orchestration
 * branch — flipping MODULE_FIRST_ENABLED to false reverts them all at once.
 */
export function isModuleFirstArm(): boolean {
  if (!MODULE_FIRST_ENABLED) return false;
  return useTutorialStore.getState().firstRunArm === 'module_first';
}

/**
 * Assign the first-run arm exactly once per install, at boot.
 *
 * Must run BEFORE routes render (called from _layout's boot gate, ahead of
 * setBootComplete) so ProfilingFlow never paints a frame with an undecided
 * arm — a v1 user briefly mounting IntroStep would pollute the pinned
 * onboarding_welcome_hook experiment with a spurious impression.
 *
 * Existing installs are excluded by the predicate below and keep
 * firstRunArm=null forever → zero blast radius on the installed base.
 */
export function ensureFirstRunAssignment(): void {
  try {
    const tutorial = useTutorialStore.getState();
    // Idempotent: the arm never re-rolls (kills, relaunches, updates).
    if (tutorial.firstRunArm !== null) return;

    // First-run predicate: anyone already authenticated (incl. guests) or past
    // onboarding is NOT a first-run user — leave them unassigned (= control).
    const auth = useAuthStore.getState();
    if (auth.isAuthenticated || auth.hasCompletedOnboarding) return;

    if (!MODULE_FIRST_ENABLED) return;

    const variantId = useBanditStore.getState().selectVariant(FIRST_RUN_EXPERIMENT_ID);
    const arm: FirstRunArm = variantId === VARIANT_BY_ARM.module_first ? 'module_first' : 'control';
    tutorial.setFirstRunArm(arm);
    tutorial.setFirstRunStage('hook');

    // Mirror useBandit's exposure wiring exactly (useBandit.ts) so the Hog
    // dashboards slice this experiment like every other one.
    useBanditStore.getState().recordImpression(FIRST_RUN_EXPERIMENT_ID, variantId);
    const cfg = EXPERIMENT_CONFIGS[FIRST_RUN_EXPERIMENT_ID];
    const variantLabel = cfg?.variants.find((v) => v.id === variantId)?.label;
    track({
      name: 'bandit_variant_assigned',
      props: {
        experiment_id: FIRST_RUN_EXPERIMENT_ID,
        variant_id: variantId,
        variant_label: variantLabel,
        uniform_sampling: false,
        pinned: false,
      },
    });
    setPersonProperties({ [`bandit_variant__${FIRST_RUN_EXPERIMENT_ID}`]: variantId });
  } catch {
    // Non-fatal by design: any failure leaves firstRunArm=null → the user
    // gets the classic control flow. The experiment must never block boot.
  }
}
