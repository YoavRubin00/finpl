// Gating for the in-app "rate FinPlay in the store" prompt (Yoav 2026-06-21).
// Tasteful by design — Yoav has killed nagging features before (the daily-goal
// ring), so this fires ONLY for proven-active, registered users, at most a few
// times, with a long cooldown, and never again once handled.
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useAuthStore } from '../auth/useAuthStore';
import { useCompletedModulesStore } from '../economy/useCompletedModulesStore';

/** Modules completed before a user counts as "active" enough to ask. */
const MIN_COMPLETED_MODULES = 5;
/** Wait this long after a prompt before re-asking (user tapped "אחר כך"). */
const COOLDOWN_MS = 45 * 24 * 60 * 60 * 1000; // 45 days
/** Hard cap on total asks across the user's lifetime. */
const MAX_PROMPTS = 3;

/**
 * True only when ALL hold: not already handled, under the lifetime cap, past
 * the cooldown, a registered (non-guest) user who finished onboarding, and
 * engaged (>= MIN_COMPLETED_MODULES). Reads stores via getState() so it can be
 * called imperatively from an event handler (not a hook).
 */
export function shouldShowRatePrompt(): boolean {
  const t = useTutorialStore.getState();
  if (t.ratePromptHandled) return false;
  if (t.ratePromptCount >= MAX_PROMPTS) return false;
  if (t.lastRatePromptAt && Date.now() - t.lastRatePromptAt < COOLDOWN_MS) return false;

  const auth = useAuthStore.getState();
  if (auth.isGuest || !auth.hasCompletedOnboarding) return false;

  if (useCompletedModulesStore.getState().completedIds.length < MIN_COMPLETED_MODULES) return false;

  return true;
}
