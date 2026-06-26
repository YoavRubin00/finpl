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
  // This thin top banner is now the SINGLE notification ask — the prominent
  // centered modal was retired (Yoav 2026-06-22: "באנר עליון דק"). It serves as
  // both the first ask (right after the mod-0-1 chest, on the map between 0-1
  // and 0-1b) and the recurring 14-day re-ask after a dismissal. notifPromptShown
  // is no longer an entry gate; it's stamped when the banner shows so the rest
  // of the app still knows the ask happened.
  // Unlock the prompt at the user's FIRST guaranteed win — the welcome "first
  // chest" (PostWalkthroughFirstChest), which every new user opens right after
  // the walkthrough. This used to be gated SOLELY on completing mod-0-1, but
  // ~half of new users drop DURING mod-0-1 and so were NEVER asked for push →
  // never got the streak comeback reminder → low D1 (Yoav 2026-06-26). We OR the
  // welcome-chest flag with mod-0-1 completion so existing users (who predate the
  // welcome chest) still qualify via completion. Still "after value" — the welcome
  // chest is a reward moment — so we don't trip the early-ask permanent-deny on iOS.
  const firstChestOpened = useTutorialStore((s) => s.firstChestOpened);
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
    (firstChestOpened || hasCompletedFirstModule);

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
      // Stamp the shared flag so the rest of the app knows the ask happened.
      useTutorialStore.getState().markNotifPromptShown();
      if (!trackedShownRef.current) {
        trackedShownRef.current = true;
        track({ name: 'notification_banner_shown', props: { source: 'permission' } });
      }
    }, delay);
    return () => clearTimeout(t);
  }, [eligible]);

  const handleAllow = async () => {
    track({ name: 'notification_banner_action', props: { source: 'permission' } });
    await requestPermission('permission');
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
