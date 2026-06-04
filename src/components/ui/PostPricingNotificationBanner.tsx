/**
 * PostPricingNotificationBanner — a one-shot push-permission prompt shown
 * in the narrow window after a free user finishes mod-0-1, opens /pricing,
 * and lands back on the learn screen without yet starting mod-0-2.
 *
 * Why this moment: monetary intent just peaked, and the user is about to
 * decide whether to come back tomorrow. A push-permission ask here doubles
 * as a re-engagement hook (Finn can ping them about new modules + PRO
 * offers) without competing with another commitment ask.
 *
 * If conditions miss, the generic NotificationPermissionBanner picks up
 * the slack later with weaker, more generic copy. The generic banner
 * defers to this one while these conditions hold so the two never overlap.
 */
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNotificationStore } from "../../features/notifications/useNotificationStore";
import { useBannerCooldownStore } from "../../features/notifications/useBannerCooldownStore";
import { useMonetizationIntentStore } from "../../features/monetization/useMonetizationIntentStore";
import { useCompletedModulesStore } from "../../features/economy/useCompletedModulesStore";
import { NotificationBanner } from "./NotificationBanner";
import { FINN_STANDARD } from "../../features/retention-loops/finnMascotConfig";
import { captureEvent } from "../../lib/posthog";

const DISMISSED_KEY = "post_pricing_notif_banner_dismissed_v1";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Exported so the generic NotificationPermissionBanner can defer to this
 * one when both would otherwise compete for the same slot.
 */
export function usePostPricingBannerEligible(): boolean {
  const permissionGranted = useNotificationStore((s) => s.permissionGranted);
  const completedIds = useCompletedModulesStore((s) => s.completedIds);
  const pricingVisits = useMonetizationIntentStore((s) => s.pricingVisitTimestamps.length);
  const hasMod01 = completedIds.includes("mod-0-1");
  const hasMod02 = completedIds.includes("mod-0-2");
  return !permissionGranted && hasMod01 && !hasMod02 && pricingVisits > 0;
}

export function PostPricingNotificationBanner() {
  const eligible = usePostPricingBannerEligible();
  const requestPermission = useNotificationStore((s) => s.requestPermission);

  const [dismissedToday, setDismissedToday] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((val) => setDismissedToday(val === todayISO()))
      .catch(() => setDismissedToday(false));
  }, []);

  // Reconcile OS permission state. A stale permissionGranted=true (granted
  // in a past test session then revoked at the OS level, or never synced)
  // would otherwise suppress this banner forever — same edge case the
  // generic banner handles.
  useEffect(() => {
    void useNotificationStore.getState().syncPermissionStatus();
  }, []);

  const shouldShow = eligible && dismissedToday === false;

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!shouldShow) {
      setVisible(false);
      return;
    }
    const delay = useBannerCooldownStore.getState().msUntilNextSlot();
    const t = setTimeout(() => {
      setVisible(true);
      useBannerCooldownStore.getState().markShown();
      captureEvent("post_pricing_notif_banner_shown", {
        pricing_visits: useMonetizationIntentStore.getState().pricingVisitTimestamps.length,
      });
    }, delay);
    return () => clearTimeout(t);
  }, [shouldShow]);

  const handleAllow = async () => {
    captureEvent("post_pricing_notif_banner_allow_clicked");
    await requestPermission();
    // permissionGranted flips true → eligible flips false → banner auto-hides.
  };

  const handleDismiss = async () => {
    captureEvent("post_pricing_notif_banner_dismissed");
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, todayISO());
    } catch {
      /* non-fatal */
    }
    setDismissedToday(true);
  };

  return (
    <NotificationBanner
      visible={visible}
      message="אישרו התראות כדי לקבל עדכון כשפרק חדש או הצעת PRO זמינים"
      actionLabel="אישור"
      onAction={handleAllow}
      onDismiss={handleDismiss}
      duration={0}
      imageSource={FINN_STANDARD}
    />
  );
}
