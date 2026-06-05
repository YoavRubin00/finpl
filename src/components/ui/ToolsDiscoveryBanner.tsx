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
 * Rotation: SUGGESTIONS[dayOfYear % 3] — same suggestion all day, rotates
 * across days so a user that ignores today's banner sees a different tool
 * tomorrow.
 */
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useNotificationStore } from "../../features/notifications/useNotificationStore";
import { useBannerCooldownStore } from "../../features/notifications/useBannerCooldownStore";
import { useToolsDiscoveryStore } from "../../features/notifications/useToolsDiscoveryStore";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { NotificationBanner } from "./NotificationBanner";
import { FINN_STANDARD } from "../../features/retention-loops/finnMascotConfig";
import { track } from "../../lib/analytics/events";

interface Suggestion {
  toolKey: string;
  route: string;
  message: string;
}

const SUGGESTIONS: Suggestion[] = [
  { toolKey: "fire", route: "/fire-calculator", message: "מתי תוכל להפסיק לעבוד? תחשב עכשיו" },
  { toolKey: "compound", route: "/compound-calculator", message: "תראה איך 100₪ הופכים ל-10,000₪" },
  { toolKey: "payslip", route: "/payslip-analyzer", message: "נתח את התלוש שלך עם AI" },
];

const PRESENCE_DELAY_MS = 5_000;

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

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

  const suggestion = SUGGESTIONS[dayOfYear() % SUGGESTIONS.length]!;

  const eligible =
    hasCompletedOnboarding &&
    hasSeenWalkthrough &&
    !isDismissedToday();

  const [visible, setVisible] = useState(false);

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
      const slotDelay = permissionBannerActive
        ? Math.max(PRESENCE_DELAY_MS, useBannerCooldownStore.getState().msUntilNextSlot())
        : useBannerCooldownStore.getState().msUntilNextSlot();

      const slotTimer = setTimeout(() => {
        setVisible(true);
        useBannerCooldownStore.getState().markShown();
      }, slotDelay);

      return () => clearTimeout(slotTimer);
    }, PRESENCE_DELAY_MS);

    return () => clearTimeout(presenceTimer);
  }, [eligible, permissionBannerActive]);

  const handleOpen = () => {
    track({
      name: "tool_opened",
      props: { tool_key: suggestion.toolKey },
    });
    markDismissed();
    setVisible(false);
    router.push(suggestion.route as never);
  };

  const handleDismiss = () => {
    markDismissed();
    setVisible(false);
  };

  return (
    <NotificationBanner
      visible={visible}
      message={suggestion.message}
      actionLabel="לכלי"
      onAction={handleOpen}
      onDismiss={handleDismiss}
      duration={0}
      imageSource={FINN_STANDARD}
    />
  );
}
