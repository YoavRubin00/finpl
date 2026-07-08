/**
 * ToolsDiscoveryBanner — Duolingo-style top banner that nudges the user to
 * try a financial tool (FIRE calc / Compound / Payslip analyzer). Mirrors
 * the NotificationPermissionBanner pattern: a thin wrapper around the shared
 * NotificationBanner base. NO new visual component.
 *
 * Why: PostHog (2026-06-05) shows only 2.5% of WAU touch a tool. The tools
 * exist but have zero discovery surface in the learning flow.
 *
 * Gates (all must pass before render):
 *  1. Onboarding + walkthrough done — same as NotificationPermissionBanner.
 *  2. NOT dismissed today (calendar-day; resets at midnight local).
 *  3. User has been on this mount for ≥ 5 seconds (avoid flashing on transit).
 *  4. Global top-banner cooldown (10s) — yields slot to higher-priority banners
 *     like NotificationPermissionBanner / StreakAtRisk so they never overlap.
 *
 * Rotation: toolOfTheDay() — the SHARED engine (all 7 tools, dayOfYear % 7),
 * so the same tool surfaces here, in the in-lesson SharkToolCTA, and in the
 * daily push on any given day. A user that ignores today's banner sees a
 * different tool tomorrow, and the full set cycles roughly weekly.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useNotificationStore } from "../../features/notifications/useNotificationStore";
import { useBannerCooldownStore } from "../../features/notifications/useBannerCooldownStore";
import { useNudgeQueueStore } from "../../stores/useNudgeQueueStore";
import { useToolsDiscoveryStore } from "../../features/notifications/useToolsDiscoveryStore";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useCompletedModulesStore } from "../../features/economy/useCompletedModulesStore";
import { NotificationBanner } from "./NotificationBanner";
import { FINN_STANDARD } from "../../features/retention-loops/finnMascotConfig";
import { track } from "../../lib/analytics/events";
import { toolOfTheDay } from "../../features/financial-tools/toolOfTheDay";

const PRESENCE_DELAY_MS = 5_000;

export function ToolsDiscoveryBanner() {
  const router = useRouter();
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const permissionBannerActive = useNotificationStore(
    // If the permission banner is still eligible to show, defer entirely to it
    // for the first 10s window — we don't want to steal its slot via cooldown.
    (s) => !s.permissionGranted && !s.bannerDismissed,
  );

  const isDismissedToday = useToolsDiscoveryStore((s) => s.isDismissedToday);
  const markDismissed = useToolsDiscoveryStore((s) => s.markDismissed);

  // Same gate as NotificationPermissionBanner — don't push a tool CTA at a
  // user who hasn't tasted the core product yet (would feel like an upsell
  // before they understood the value). Aligned 2026-06-05.
  const hasCompletedFirstModule = useCompletedModulesStore((s) =>
    s.completedIds.includes('mod-0-1'),
  );

  const suggestion = toolOfTheDay();

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

    // 1) Wait 5 seconds on this mount before considering ourselves a candidate.
    //    Avoids a flash when the user is just passing through DuoLearnScreen.
    // 2) After 5s, wait for the global banner-cooldown slot (10s gap from any
    //    other banner that just showed). Then mark shown and render.
    const presenceTimer = setTimeout(() => {
      // If the permission banner is still actively trying to show, let it go
      // first — it's a higher-priority CTA.
      const bannerSlot = permissionBannerActive
        ? Math.max(PRESENCE_DELAY_MS, useBannerCooldownStore.getState().msUntilNextSlot())
        : useBannerCooldownStore.getState().msUntilNextSlot();
      // Also wait out the GLOBAL popup stage (Yoav 2026-07-08) so this banner
      // never stacks on the streak popup / buy-asset splash on return-to-game.
      const seqDelay = Math.max(0, useNudgeQueueStore.getState().popupBusyUntil - Date.now());
      const slotDelay = Math.max(bannerSlot, seqDelay);

      const slotTimer = setTimeout(() => {
        setVisible(true);
        useBannerCooldownStore.getState().markShown();
        useNudgeQueueStore.getState().takePopupSlot();
        if (!trackedShownRef.current) {
          trackedShownRef.current = true;
          track({
            name: 'notification_banner_shown',
            props: { source: 'tools_discovery', tool_key: suggestion.toolKey },
          });
        }
      }, slotDelay);

      return () => clearTimeout(slotTimer);
    }, PRESENCE_DELAY_MS);

    return () => clearTimeout(presenceTimer);
  }, [eligible, permissionBannerActive, suggestion.toolKey]);

  const handleOpen = () => {
    track({
      name: 'notification_banner_action',
      props: { source: 'tools_discovery', tool_key: suggestion.toolKey },
    });
    track({
      name: 'tool_opened',
      props: { tool_key: suggestion.toolKey },
    });
    markDismissed();
    setVisible(false);
    router.push(suggestion.route as never);
  };

  const handleDismiss = () => {
    track({
      name: 'notification_banner_dismissed',
      props: { source: 'tools_discovery', tool_key: suggestion.toolKey },
    });
    markDismissed();
    setVisible(false);
  };

  return (
    <NotificationBanner
      visible={visible}
      message={suggestion.title}
      actionLabel="לכלי"
      onAction={handleOpen}
      onDismiss={handleDismiss}
      duration={0}
      imageSource={FINN_STANDARD}
    />
  );
}
