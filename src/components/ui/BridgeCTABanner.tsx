/**
 * BridgeCTABanner — Duolingo-style top banner that nudges the user to the
 * Bridge (the real-world benefits surface — "הגשר להטבות"). Thin wrapper around
 * the shared NotificationBanner base, mirroring ToolsDiscoveryBanner so it
 * positions + coordinates (slot cooldown) identically with the other top
 * banners and never overlaps them.
 *
 * Yoav 2026-06-16: a rotating "→ לגשר" CTA that leads to the bridge page, in
 * the same template as everything else so the bridge button stays uniform.
 *
 * Gates (all must pass before render):
 *  1. Onboarding + walkthrough done + first module completed — same as
 *     ToolsDiscoveryBanner (don't push a redeem-CTA before the user tasted value).
 *  2. NOT dismissed today (calendar-day; resets at midnight local).
 *  3. ≥ 5s on this mount, then the global banner-cooldown slot (no overlap).
 *
 * Rotation: MESSAGES[dayOfYear % 3] — same copy all day, rotates across days
 * so a user who ignores today's nudge sees a different angle tomorrow.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useBannerCooldownStore } from "../../features/notifications/useBannerCooldownStore";
import { useBridgeBannerStore } from "../../features/notifications/useBridgeBannerStore";
import { useNudgeQueueStore } from "../../stores/useNudgeQueueStore";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useCompletedModulesStore } from "../../features/economy/useCompletedModulesStore";
import { NotificationBanner } from "./NotificationBanner";
import { FINN_HAPPY } from "../../features/retention-loops/finnMascotConfig";
import { captureEvent } from "../../lib/posthog";

const MESSAGES: string[] = [
  "המטבעות שצברתם שווים הטבות אמיתיות — בואו לגשר",
  "מהלמידה לעולם האמיתי: ממשו את המטבעות בגשר",
  "הטבות אמיתיות מפרטנרים מחכות לכם בגשר",
];

const PRESENCE_DELAY_MS = 5_000;

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function BridgeCTABanner() {
  const router = useRouter();
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const isDismissedToday = useBridgeBannerStore((s) => s.isDismissedToday);
  const markDismissed = useBridgeBannerStore((s) => s.markDismissed);

  // Same value-first gate as ToolsDiscoveryBanner — no redeem CTA before the
  // user finished their first module.
  const hasCompletedFirstModule = useCompletedModulesStore((s) =>
    s.completedIds.includes("mod-0-1"),
  );

  const variantIndex = dayOfYear() % MESSAGES.length;
  const message = MESSAGES[variantIndex]!;

  const eligible =
    hasCompletedOnboarding &&
    hasSeenWalkthrough &&
    hasCompletedFirstModule &&
    !isDismissedToday();

  const [visible, setVisible] = useState(false);
  const trackedShownRef = useRef(false);

  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }

    // 1) 5s presence before becoming a candidate (avoid flashing on transit).
    // 2) Then wait for the shared banner-cooldown slot so we never overlap the
    //    notification / tools banners.
    const presenceTimer = setTimeout(() => {
      const bannerSlot = useBannerCooldownStore.getState().msUntilNextSlot();
      // Wait out the GLOBAL popup stage too (Yoav 2026-07-08) so the bridge
      // banner never stacks on the streak popup / buy-asset splash on launch.
      const seqDelay = Math.max(0, useNudgeQueueStore.getState().popupBusyUntil - Date.now());
      const slotDelay = Math.max(bannerSlot, seqDelay);
      const slotTimer = setTimeout(() => {
        setVisible(true);
        useBannerCooldownStore.getState().markShown();
        useNudgeQueueStore.getState().takePopupSlot();
        if (!trackedShownRef.current) {
          trackedShownRef.current = true;
          captureEvent("bridge_cta_banner_shown", { source: "home", variant_index: variantIndex });
        }
      }, slotDelay);

      return () => clearTimeout(slotTimer);
    }, PRESENCE_DELAY_MS);

    return () => clearTimeout(presenceTimer);
  }, [eligible, variantIndex]);

  const handleOpen = () => {
    captureEvent("bridge_cta_banner_tapped", { source: "home", variant_index: variantIndex });
    markDismissed();
    setVisible(false);
    router.push("/bridge" as never);
  };

  const handleDismiss = () => {
    captureEvent("bridge_cta_banner_dismissed", { source: "home", variant_index: variantIndex });
    markDismissed();
    setVisible(false);
  };

  return (
    <NotificationBanner
      visible={visible}
      message={message}
      actionLabel="לגשר"
      onAction={handleOpen}
      onDismiss={handleDismiss}
      duration={0}
      imageSource={FINN_HAPPY}
    />
  );
}
