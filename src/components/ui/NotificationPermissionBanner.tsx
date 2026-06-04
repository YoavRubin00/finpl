/**
 * NotificationPermissionBanner, Duolingo-style permission request banner.
 * Shows when permission is not granted and user hasn't dismissed it this session.
 *
 * Hard-gated to post-onboarding/walkthrough, and throttled via the global
 * top-banner cooldown so it never overlaps the AI insight or upgrade nudge.
 */
import { useEffect, useState } from "react";
import { useNotificationStore } from "../../features/notifications/useNotificationStore";
import { useBannerCooldownStore } from "../../features/notifications/useBannerCooldownStore";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { NotificationBanner } from "./NotificationBanner";
import { FINN_STANDARD } from "../../features/retention-loops/finnMascotConfig";

export function NotificationPermissionBanner() {
  const permissionGranted = useNotificationStore((s) => s.permissionGranted);
  const bannerDismissed = useNotificationStore((s) => s.bannerDismissed);
  const requestPermission = useNotificationStore((s) => s.requestPermission);
  const dismissBanner = useNotificationStore((s) => s.dismissBanner);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);

  // Reconcile the cached permission flag with the real OS state on mount. A
  // stale permissionGranted=true (granted in a past test/session, or never
  // synced after an OS-level revoke) would otherwise suppress this banner
  // forever — the most common reason the post-walkthrough prompt "never shows".
  useEffect(() => {
    void useNotificationStore.getState().syncPermissionStatus();
  }, []);

  const eligible =
    !permissionGranted &&
    !bannerDismissed &&
    hasCompletedOnboarding &&
    hasSeenWalkthrough;

  // Defer rendering until the global cooldown is clear, then mark shown so
  // the next banner waits its 10s slot.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }
    const delay = useBannerCooldownStore.getState().msUntilNextSlot();
    const t = setTimeout(() => {
      setVisible(true);
      useBannerCooldownStore.getState().markShown();
    }, delay);
    return () => clearTimeout(t);
  }, [eligible]);

  const handleAllow = async () => {
    await requestPermission();
    // Finn scheduler (useFinnNotificationScheduler) handles all scheduling, 1/day max
  };

  return (
    <NotificationBanner
      visible={visible}
      message="אתם מפספסים התראות ממני"
      actionLabel="אשר"
      onAction={handleAllow}
      onDismiss={dismissBanner}
      duration={0}
      imageSource={FINN_STANDARD}
    />
  );
}
