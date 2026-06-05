/**
 * NotificationPermissionBanner, Duolingo-style permission request banner.
 * Shows when permission is not granted and user hasn't dismissed it recently.
 *
 * Hard-gated to post-onboarding/walkthrough, and throttled via the global
 * top-banner cooldown so it never overlaps the AI insight or upgrade nudge.
 *
 * Re-show policy: previously `bannerDismissed: true` persisted FOREVER —
 * a user that hit X once would never see the banner again. 2026-06-05:
 * dismissals now expire after 14 days so users that change their mind
 * about notifications get another prompt. Legacy users with the old flag
 * set re-see the banner immediately on this build (since `bannerDismissedAt`
 * is null for them — treated as "long ago"). PostHog instrumentation added
 * the same day so we can finally measure shown/action/dismiss rates.
 */
import { useEffect, useRef, useState } from "react";
import { useNotificationStore } from "../../features/notifications/useNotificationStore";
import { useBannerCooldownStore } from "../../features/notifications/useBannerCooldownStore";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useCompletedModulesStore } from "../../features/economy/useCompletedModulesStore";
import { NotificationBanner } from "./NotificationBanner";
import { FINN_STANDARD } from "../../features/retention-loops/finnMascotConfig";
import { track } from "../../lib/analytics/events";

const RESHOW_AFTER_DAYS = 14;

function daysSince(iso: string | null): number {
  if (!iso) return Infinity;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

export function NotificationPermissionBanner() {
  const permissionGranted = useNotificationStore((s) => s.permissionGranted);
  const bannerDismissed = useNotificationStore((s) => s.bannerDismissed);
  const bannerDismissedAt = useNotificationStore((s) => s.bannerDismissedAt);
  const requestPermission = useNotificationStore((s) => s.requestPermission);
  const dismissBanner = useNotificationStore((s) => s.dismissBanner);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  // Hold the prompt back until the user has actually completed the first
  // module (mod-0-1) — same gate as the Tools Discovery banner. Asking for
  // notification permission before the user gets any value is the textbook
  // way to get permanently denied. Aligned 2026-06-05.
  const hasCompletedFirstModule = useCompletedModulesStore((s) =>
    s.completedIds.includes('mod-0-1'),
  );

  // Reconcile the cached permission flag with the real OS state on mount. A
  // stale permissionGranted=true (granted in a past test/session, or never
  // synced after an OS-level revoke) would otherwise suppress this banner
  // forever — the most common reason the post-walkthrough prompt "never shows".
  useEffect(() => {
    void useNotificationStore.getState().syncPermissionStatus();
  }, []);

  const recentlyDismissed = bannerDismissed && daysSince(bannerDismissedAt) <= RESHOW_AFTER_DAYS;

  const eligible =
    !permissionGranted &&
    !recentlyDismissed &&
    hasCompletedOnboarding &&
    hasSeenWalkthrough &&
    hasCompletedFirstModule;

  // Defer rendering until the global cooldown is clear, then mark shown so
  // the next banner waits its 10s slot.
  const [visible, setVisible] = useState(false);
  // Guard so the `shown` event fires once per mount, not on every render.
  const trackedShownRef = useRef(false);
  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }
    const delay = useBannerCooldownStore.getState().msUntilNextSlot();
    const t = setTimeout(() => {
      setVisible(true);
      useBannerCooldownStore.getState().markShown();
      if (!trackedShownRef.current) {
        trackedShownRef.current = true;
        track({ name: 'notification_banner_shown', props: { source: 'permission' } });
      }
    }, delay);
    return () => clearTimeout(t);
  }, [eligible]);

  const handleAllow = async () => {
    track({ name: 'notification_banner_action', props: { source: 'permission' } });
    await requestPermission();
    // Finn scheduler (useFinnNotificationScheduler) handles all scheduling, 1/day max
  };

  const handleDismiss = () => {
    track({ name: 'notification_banner_dismissed', props: { source: 'permission' } });
    dismissBanner();
  };

  return (
    <NotificationBanner
      visible={visible}
      message="אתם מפספסים התראות ממני"
      actionLabel="אשר"
      onAction={handleAllow}
      onDismiss={handleDismiss}
      duration={0}
      imageSource={FINN_STANDARD}
    />
  );
}
