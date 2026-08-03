import { useEffect, useRef, useState } from "react";
import { useMarketUnlockStore } from "./useMarketUnlockStore";
import { MarketUnlockMoment } from "./MarketUnlockMoment";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useNudgeQueueStore } from "../../stores/useNudgeQueueStore";

interface Props {
  /** Host-side guards: onboarding done, walkthrough not active, on the learn tab. */
  eligible: boolean;
  /** Navigate to chapter-4 / mod-4-19 — the host passes its existing jump path. */
  onEnter: () => void;
}

/**
 * One-time "שוק ההון נפתח לכם" takeover (Yoav 2026-08-03: chapter 4 opens for
 * EVERY user, proactively). Two jobs:
 *
 * 1. AUTO-UNLOCK — flips useTutorialStore.investChapterJumpUnlocked the moment
 *    an eligible user lands here, independent of the moment being watched.
 *    Rationale: the passive fast-track pill (8.7) got ZERO taps in a week
 *    (481a2b86) — waiting for user-initiated unlock is proven dead.
 * 2. THE MOMENT — plays once (persisted), through the global popup slot so it
 *    never stacks on the streak celebration / day-2 grant / promo modal.
 */
const PRESENCE_DELAY_MS = 2_000;

export function MarketUnlockGate({ eligible, onEnter }: Props) {
  const momentSeen = useMarketUnlockStore((s) => s.momentSeen);
  const markSeen = useMarketUnlockStore((s) => s.markSeen);
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!eligible || momentSeen || shownRef.current) return;

    // Unlock unconditionally and immediately — the map shows chapter 4 open
    // even if the user dismisses (or never sees) the moment.
    try { useTutorialStore.getState().unlockInvestChapterJump(); } catch { /* non-fatal */ }

    let slotTimer: ReturnType<typeof setTimeout> | undefined;
    const presenceTimer = setTimeout(() => {
      const seqDelay = Math.max(0, useNudgeQueueStore.getState().popupBusyUntil - Date.now());
      slotTimer = setTimeout(() => {
        if (shownRef.current) return;
        shownRef.current = true;
        useNudgeQueueStore.getState().takePopupSlot();
        // Seen at SHOW time — a force-kill mid-moment must not replay it.
        markSeen();
        setVisible(true);
      }, seqDelay);
    }, PRESENCE_DELAY_MS);

    return () => {
      clearTimeout(presenceTimer);
      if (slotTimer) clearTimeout(slotTimer);
    };
  }, [eligible, momentSeen, markSeen]);

  if (!visible) return null;

  return (
    <MarketUnlockMoment
      visible={visible}
      onEnter={() => {
        setVisible(false);
        onEnter();
      }}
      onDismiss={() => setVisible(false)}
    />
  );
}
