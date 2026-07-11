// Guest value-action register gate — POLICY (Yoav 2026-07-03): an unregistered
// user must hit a signup gate after EVERY completed value action (learning,
// social, tools — full scope), with a short 2-minute cooldown so a fast streak
// of actions doesn't stack modals. One central util + one root-mounted host;
// call sites just fire requestGuestGate('<trigger>') at their completion
// moment. Reuses the existing ModuleEndSignupGate modal (no new UI), with
// generic copy + analytics source 'value_action' so funnels slice it apart
// from the module-end gate. Logged in docs/DECISION-LOG.md; owner: ים.

import React from 'react';
import { create } from 'zustand';

import { useAuthStore } from './useAuthStore';
import { ModuleEndSignupGate } from './ModuleEndSignupGate';
import { captureEvent } from '../../lib/posthog';

/**
 * DISABLED (Yoav 2026-07-10): the "gate after EVERY value action" wall (added
 * 3.7) was too aggressive on day-0 — a fresh guest hit a signup modal after
 * every vote / tool / news / prediction, and activation slid 46% (30.6) → 22%.
 * We keep ONLY the two gates that existed on 30.6: the end-of-onboarding gate
 * (SignupGateStep) and the module-chest gate (moduleEndGateShown /
 * ModuleEndSignupGate) — both are SEPARATE paths, untouched. This kill leaves
 * the machinery + call sites intact (they just no-op) so it can be re-enabled
 * by flipping this flag if we ever want a gentler, post-activation version.
 */
const VALUE_ACTION_GATE_ENABLED = false;

/** Don't show two value-gates within this window (rapid action streaks). */
const COOLDOWN_MS = 2 * 60 * 1000;

interface GuestValueGateState {
  /** The trigger currently displaying the gate, or null when hidden. */
  visibleTrigger: string | null;
  /** Last time a gate OPENED (drives the cooldown). Session-scoped on purpose:
   *  a fresh app open after a while is a fine moment to gate again. */
  lastShownAt: number | null;
  dismiss: () => void;
}

export const useGuestValueGateStore = create<GuestValueGateState>()((set) => ({
  visibleTrigger: null,
  lastShownAt: null,
  dismiss: () => set({ visibleTrigger: null }),
}));

/**
 * Fire-and-forget from any value-action completion point. No-ops (returns
 * false) for registered users, while a gate is already up, or inside the
 * cooldown window — callers never need their own guards.
 */
export function requestGuestGate(trigger: string, opts?: { force?: boolean }): boolean {
  try {
    // `force` (Yoav 11.7): actions that GENUINELY REQUIRE an account (server
    // writes — rating / liking / commenting / sharing a portfolio) must still
    // surface the register gate even while the aggressive after-every-value
    // wall is disabled. Without it, killing the wall turned those buttons
    // into silent no-ops for guests ("הדירוגים לא עובד לי"). force bypasses
    // the kill-flag AND the cooldown (a required-auth ask must never dead-end),
    // but never double-stacks over an open gate.
    const force = opts?.force === true;
    if (!VALUE_ACTION_GATE_ENABLED && !force) return false; // Yoav 2026-07-10 — see note above
    if (!useAuthStore.getState().isGuest) return false;
    const { visibleTrigger, lastShownAt } = useGuestValueGateStore.getState();
    if (visibleTrigger !== null) return false;
    if (!force && lastShownAt !== null && Date.now() - lastShownAt < COOLDOWN_MS) return false;
    useGuestValueGateStore.setState({ visibleTrigger: trigger, lastShownAt: Date.now() });
    try { captureEvent('guest_gate_shown', { trigger }); } catch { /* non-fatal */ }
    return true;
  } catch {
    // The gate must never break the value action that triggered it.
    return false;
  }
}

/**
 * Root-mounted host (app/_layout.tsx). Renders the shared register modal for
 * whatever trigger last requested a gate.
 */
export function GuestValueGateHost(): React.ReactElement | null {
  const trigger = useGuestValueGateStore((s) => s.visibleTrigger);
  const dismiss = useGuestValueGateStore((s) => s.dismiss);
  if (!trigger) return null;
  return (
    <ModuleEndSignupGate
      visible
      moduleId={trigger}
      source="value_action"
      title="שנייה לפני שממשיכים 🎉"
      subtitle="הירשמו כדי לשמור את ההתקדמות והמטבעות שצברתם — בכל מכשיר"
      onClose={dismiss}
    />
  );
}
